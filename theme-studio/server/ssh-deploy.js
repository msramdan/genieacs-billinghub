const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");

const REPO_GIT = "https://github.com/msramdan/genieacs-billinghub.git";
const REMOTE_DIR = "/opt/genieacs-billinghub";
const LOCAL_ROOT = path.resolve(__dirname, "..", "..");

function withSsh(creds, fn, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`SSH timeout (${Math.round(timeoutMs / 1000)}s)`));
    }, timeoutMs);

    conn
      .on("ready", () => {
        clearTimeout(timer);
        Promise.resolve()
          .then(() => fn(conn))
          .then((result) => {
            conn.end();
            resolve(result);
          })
          .catch((err) => {
            conn.end();
            reject(err);
          });
      })
      .on("error", (err) => {
        clearTimeout(timer);
        reject(err);
      })
      .connect({
        host: creds.host,
        port: Number(creds.port) || 22,
        username: creds.username,
        password: creds.password,
        readyTimeout: Math.min(timeoutMs, 30000),
        tryKeyboard: false,
      });
  });
}

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => resolve({ code, stdout, stderr }))
        .on("data", (d) => {
          stdout += d.toString();
        });
      stream.stderr.on("data", (d) => {
        stderr += d.toString();
      });
    });
  });
}

function execStream(conn, command, onLine) {
  return new Promise((resolve, reject) => {
    conn.exec(command, { pty: true }, (err, stream) => {
      if (err) return reject(err);
      let stdout = "";
      let stderr = "";
      let buf = "";
      const handle = (chunk, isErr) => {
        const text = chunk.toString();
        if (isErr) stderr += text;
        else stdout += text;
        buf += text;
        const parts = buf.split(/\r?\n/);
        buf = parts.pop() || "";
        for (const line of parts) {
          const clean = line.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").trimEnd();
          if (clean && onLine) onLine(clean);
        }
      };
      stream.on("data", (d) => handle(d, false));
      stream.stderr.on("data", (d) => handle(d, true));
      stream.on("close", (code) => {
        if (buf.trim() && onLine) {
          onLine(buf.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").trimEnd());
        }
        resolve({ code, stdout, stderr });
      });
    });
  });
}

function sftpWrite(conn, remotePath, buffer) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const ws = sftp.createWriteStream(remotePath);
      ws.on("close", () => resolve());
      ws.on("error", reject);
      ws.end(buffer);
    });
  });
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, `'\"'\"'`)}'`;
}

function makeSudo(creds, needSudo) {
  if (!needSudo) return { wrap: (cmd) => cmd };
  const pass = shellQuote(creds.password || "");
  return {
    wrap: (cmd) => `echo ${pass} | sudo -S -p '' bash -lc ${shellQuote(cmd)}`,
  };
}

function asRootWrap(creds) {
  if (creds.username === "root") return { wrap: (cmd) => cmd };
  return makeSudo(creds, true);
}

async function detectPaths(conn, creds = {}) {
  const pass = shellQuote(creds.password || "");
  const script = `
set +e
PASS=${pass}
as_root() {
  if [ "$(id -u)" -eq 0 ]; then bash -lc "$1"
  else echo "$PASS" | sudo -S -p '' bash -lc "$1" 2>/dev/null; fi
}
dir_ok() { [ -d "$1" ] && return 0; as_root "test -d '$1'" >/dev/null 2>&1; }

PUBLIC=""
NPM_USER=$(npm root -g 2>/dev/null || true)
NPM_ROOT=$(as_root 'npm root -g' | tr -d '\\r' | tail -1)
for NPM in "$NPM_USER" "$NPM_ROOT"; do
  [ -n "$NPM" ] || continue
  if dir_ok "$NPM/genieacs/public"; then PUBLIC="$NPM/genieacs/public"; break; fi
done
if [ -z "$PUBLIC" ]; then
  for d in /usr/lib/node_modules/genieacs/public /usr/local/lib/node_modules/genieacs/public; do
    if dir_ok "$d"; then PUBLIC="$d"; break; fi
  done
fi
if [ -z "$PUBLIC" ]; then
  WD=$(systemctl show -p WorkingDirectory --value genieacs-ui 2>/dev/null | tr -d '\\r')
  [ -n "$WD" ] && [ "$WD" != "/" ] && dir_ok "$WD/public" && PUBLIC="$WD/public"
fi
if [ -z "$PUBLIC" ]; then
  BIN=$(command -v genieacs-cwmp 2>/dev/null || true)
  [ -z "$BIN" ] && BIN=$(as_root 'command -v genieacs-cwmp' | tr -d '\\r' | tail -1)
  if [ -n "$BIN" ]; then
    REAL=$(readlink -f "$BIN" 2>/dev/null || echo "$BIN")
    CAND=$(dirname "$(dirname "$REAL")")/public
    dir_ok "$CAND" && PUBLIC="$CAND"
  fi
fi
if [ -z "$PUBLIC" ]; then
  FOUND=$(as_root "find /usr/lib /usr/local/lib /opt -type d -path '*/genieacs/public' 2>/dev/null | head -1" | tr -d '\\r' | tail -1)
  [ -n "$FOUND" ] && dir_ok "$FOUND" && PUBLIC="$FOUND"
fi
[ -n "$PUBLIC" ] && echo "PUBLIC=$PUBLIC"
echo "UI_STATUS=$(systemctl is-active genieacs-ui 2>/dev/null || echo unknown)"
echo "CWMP_STATUS=$(systemctl is-active genieacs-cwmp 2>/dev/null || echo unknown)"
`;
  const r = await exec(conn, script);
  const out = { publicDir: "", uiStatus: "", cwmpStatus: "" };
  for (const line of r.stdout.split(/\r?\n/)) {
    if (line.startsWith("PUBLIC=")) out.publicDir = line.slice(7).trim();
    if (line.startsWith("UI_STATUS=")) out.uiStatus = line.slice(10).trim();
    if (line.startsWith("CWMP_STATUS=")) out.cwmpStatus = line.slice(12).trim();
  }
  return out;
}

async function testConnection(creds) {
  return withSsh(creds, async (conn) => {
    const who = await exec(conn, "whoami; hostname; uname -s");
    const lines = who.stdout.trim().split(/\r?\n/);
    const paths = await detectPaths(conn, creds);
    const hasAcs = Boolean(paths.publicDir) || paths.cwmpStatus === "active";
    return {
      ok: true,
      whoami: lines[0] || "",
      hostname: lines[1] || "",
      os: lines[2] || "",
      genieacsUi: paths.uiStatus || "",
      publicDir: paths.publicDir || "",
      mode: hasAcs ? "theme" : "install",
      hasAcs,
    };
  });
}

function parseEnvText(text) {
  const env = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

async function collectAccess(conn, host, creds = {}) {
  const pass = shellQuote(creds.password || "");
  const info = await exec(
    conn,
    `
PASS=${pass}
as_root() {
  if [ "$(id -u)" -eq 0 ]; then bash -lc "$1"; else echo "$PASS" | sudo -S -p '' bash -lc "$1" 2>/dev/null; fi
}
HOST_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "HOST_IP=$HOST_IP"
for f in /opt/genieacs/acs-credentials.env /opt/genieacs/env; do
  if [ -f "$f" ]; then echo "ENVFILE=$f"; cat "$f"; break; fi
  if as_root "test -f '$f'"; then echo "ENVFILE=$f"; as_root "cat '$f'"; break; fi
done
`
  );
  const env = parseEnvText(info.stdout);
  const uiPort = "3000";
  const cwmpPort = env.BH_ACS_PORT || "7547";
  const nbiPort = "7557";
  const loginUser = env.BH_UI_USER || env.BH_ACS_USER || "admin";
  const loginPass = env.BH_UI_PASS || env.BH_ACS_PASS || "";
  const publicHost = env.BH_ACS_HOST || host;
  return {
    host: publicHost,
    hostnameIp: env.HOST_IP || "",
    ui: `http://${publicHost}:${uiPort}`,
    cwmp: `${publicHost}:${cwmpPort}`,
    nbi: `${publicHost}:${nbiPort}`,
    fs: `${publicHost}:7567`,
    loginUser: loginUser || "(belum tersedia)",
    loginPass: loginPass || "(belum tersedia)",
    hasCredentialsFile: Boolean(loginUser && loginPass),
  };
}

function buildLocalTar() {
  const tmp = path.join(os.tmpdir(), `bh-acs-${Date.now()}.tar.gz`);
  const excludes = [
    "--exclude=node_modules",
    "--exclude=theme-studio/node_modules",
    "--exclude=theme-studio/dist",
    "--exclude=.git",
    "--exclude=*.ppk",
  ];
  // Prefer tar (Git Bash / WSL / Windows tar)
  const args = ["-czf", tmp, ...excludes, "-C", LOCAL_ROOT, "."];
  const r = spawnSync("tar", args, { encoding: "utf8" });
  if (r.status !== 0 || !fs.existsSync(tmp)) {
    throw new Error(
      "Gagal paket file lokal. Pastikan perintah tar tersedia, atau server bisa akses GitHub."
    );
  }
  return tmp;
}

async function ensureRepo(conn, creds, log) {
  const root = asRootWrap(creds);
  log("Menyiapkan file installer…");

  // Sumber installer = mesin tempat ACS Studio berjalan (PC lokal ATAU VPS Docker).
  // Tidak mengandalkan clone GitHub di server target (sering lambat/hang).
  log("Mengemas installer dari mesin ACS Studio…");
  let tarPath;
  try {
    tarPath = buildLocalTar();
  } catch (e) {
    log("Gagal mengemas: " + (e.message || e));
    tarPath = null;
  }

  if (tarPath) {
    const remoteTar = `/tmp/bh-acs-${Date.now()}.tar.gz`;
    try {
      const buf = fs.readFileSync(tarPath);
      const mb = (buf.length / 1024 / 1024).toFixed(1);
      log(`Mengirim paket installer (${mb} MB) ke server tujuan…`);
      await sftpWrite(conn, remoteTar, buf);
      log("Mengekstrak di server tujuan…");
      const extract = await execStream(
        conn,
        root.wrap(
          [
            "set -e",
            `rm -rf ${REMOTE_DIR}`,
            `mkdir -p ${REMOTE_DIR}`,
            `tar -xzf ${remoteTar} -C ${REMOTE_DIR}`,
            `rm -f ${remoteTar}`,
            `chmod +x ${REMOTE_DIR}/install.sh ${REMOTE_DIR}/scripts/*.sh || true`,
            // Fix CRLF jika paket dari Windows
            `find ${REMOTE_DIR} -type f \\( -name '*.sh' -o -name 'install.sh' \\) -exec sed -i 's/\\r$//' {} + 2>/dev/null || true`,
            `test -f ${REMOTE_DIR}/install.sh`,
          ].join("\n")
        ),
        (line) => {
          if (line.length < 200) log(line);
        }
      );
      if (extract.code === 0) {
        log("Installer siap");
        return REMOTE_DIR;
      }
      log("Ekstrak gagal — mencoba cadangan dari GitHub…");
    } finally {
      try {
        fs.unlinkSync(tarPath);
      } catch {
        /* ignore */
      }
    }
  }

  log("Cadangan: clone GitHub (maks. 90 detik)…");
  const cloneCmd = [
    "set -e",
    "export DEBIAN_FRONTEND=noninteractive",
    "export GIT_TERMINAL_PROMPT=0",
    "command -v git >/dev/null 2>&1 || { apt-get update -y && apt-get install -y git; }",
    `rm -rf ${REMOTE_DIR}`,
    `timeout 90 git clone --depth 1 --progress ${REPO_GIT} ${REMOTE_DIR}`,
    `chmod +x ${REMOTE_DIR}/install.sh ${REMOTE_DIR}/scripts/*.sh || true`,
  ].join("\n");

  const cloned = await execStream(conn, root.wrap(cloneCmd), (line) => {
    if (line.length < 220) log(line);
  });

  if (cloned.code === 0) {
    log("Installer siap (cadangan GitHub)");
    return REMOTE_DIR;
  }

  throw new Error(
    "Gagal menyiapkan installer. Pastikan ACS Studio dijalankan dari folder repo lengkap, lalu coba lagi."
  );
}

async function applyThemeFiles(conn, creds, paths, { logoBuffer, theme, cssSource, log }) {
  const needSudo = creds.username !== "root";
  const sudo = makeSudo(creds, needSudo);
  const steps = [];

  if (logoBuffer && logoBuffer.length) {
    log(`Pasang logo (${Math.round(logoBuffer.length / 1024)} KB)…`);
    const tmpLogo = `/tmp/bh-logo-${Date.now()}.png`;
    await sftpWrite(conn, tmpLogo, logoBuffer);
    const copyLogo = await exec(
      conn,
      sudo.wrap(
        `cp "${tmpLogo}" "${paths.publicDir}/logo.png" && chmod 644 "${paths.publicDir}/logo.png" && rm -f "${tmpLogo}"`
      )
    );
    if (copyLogo.code !== 0) {
      throw new Error("Gagal pasang logo: " + (copyLogo.stderr || copyLogo.stdout));
    }
    steps.push("logo");
    log("Logo terpasang");
  }

  if (theme && cssSource) {
    log(`Pasang warna: ${theme.name || theme.id}`);
    const { applyThemeToCss } = require("./theme-engine");
    const themed = applyThemeToCss(cssSource, theme);
    const tmpCss = `/tmp/bh-app-${Date.now()}.css`;
    await sftpWrite(conn, tmpCss, Buffer.from(themed, "utf8"));
    const apply = await exec(
      conn,
      sudo.wrap(
        [
          `set -e`,
          `PUB="${paths.publicDir}"`,
          `TMP="${tmpCss}"`,
          `cp "$TMP" "$PUB/app.css"`,
          `for f in "$PUB"/app-*.css; do [ -f "$f" ] || continue; cp "$TMP" "$f"; done`,
          `rm -f "$TMP"`,
          `systemctl restart genieacs-ui`,
          `sleep 1`,
          `systemctl is-active genieacs-ui`,
        ].join("\n")
      )
    );
    if (apply.code !== 0) {
      throw new Error("Gagal pasang warna: " + (apply.stderr || apply.stdout));
    }
    steps.push("theme");
    log("Warna terpasang, layanan UI di-restart");
  }
  return steps;
}

async function installFresh(creds, opts) {
  const {
    logoBuffer,
    theme,
    cssSource,
    onLog,
    enableL2tp = false,
    modemSubnets = "10.10.10.0/24",
    mikrotik = null,
  } = opts;
  const log = (line) => onLog && onLog(line);
  const crypto = require("crypto");

  return withSsh(
    creds,
    async (conn) => {
      log("SSH terhubung");
      const existing = await detectPaths(conn, creds);
      if (existing.publicDir || existing.cwmpStatus === "active") {
        throw new Error(
          "Di server ini ACS sudah terpasang. Gunakan server baru yang belum memiliki ACS."
        );
      }

      const remoteDir = await ensureRepo(conn, creds, log);
      const root = asRootWrap(creds);
      const acsHost = creds.host;

      log("Mulai install ACS (bisa 5–15 menit)…");
      const installCmd = [
        "set -e",
        "export DEBIAN_FRONTEND=noninteractive",
        `cd ${remoteDir}`,
        `BH_NONINTERACTIVE=1 ACS_HOST=${shellQuote(acsHost)} ACS_PORT=7547 ACS_USER=admin ACS_PASS=changeme UI_ADMIN_PASS=changeme INSTALL_ZT=n bash install.sh`,
      ].join("\n");

      const installed = await execStream(conn, root.wrap(installCmd), (line) => {
        if (line.length < 280) log(line);
      });
      if (installed.code !== 0) {
        throw new Error(
          "Instalasi ACS gagal. Pastikan server masih baru (belum ada ACS) dan akun memiliki hak akses penuh."
        );
      }
      log("Install ACS selesai");

      log("Membuat username & password acak…");
      const credCmd = `cd ${remoteDir} && BH_ACS_HOST=${shellQuote(acsHost)} bash scripts/set-random-credentials.sh`;
      await execStream(conn, root.wrap(credCmd), (line) => {
        if (line.length < 200 && !/PASS=/.test(line)) log(line);
      });
      log("Password acak siap");

      log("Deteksi folder ACS…");
      let paths = await detectPaths(conn, creds);
      if (!paths.publicDir) {
        await exec(conn, "sleep 2");
        paths = await detectPaths(conn, creds);
      }
      if (!paths.publicDir) {
        throw new Error("Install selesai tapi folder ACS belum ketemu.");
      }

      const steps = await applyThemeFiles(conn, creds, paths, {
        logoBuffer,
        theme,
        cssSource,
        log,
      });

      let l2tpInfo = null;
      if (enableL2tp) {
        const l2tpUser = "acs-mt";
        const l2tpPass = crypto.randomBytes(8).toString("hex");
        const l2tpPsk = crypto.randomBytes(12).toString("hex");
        const subnets = modemSubnets || "10.10.10.0/24";

        log("Install L2TP server di VPS (untuk Summon)…");
        const l2tpCmd = [
          "set -e",
          `cd ${remoteDir}`,
          `BH_L2TP_PSK=${shellQuote(l2tpPsk)} BH_L2TP_USER=${shellQuote(l2tpUser)} BH_L2TP_PASS=${shellQuote(l2tpPass)} BH_MODEM_SUBNETS=${shellQuote(subnets)} bash scripts/setup-l2tp-summon.sh`,
        ].join("\n");
        const l2tpRun = await execStream(conn, root.wrap(l2tpCmd), (line) => {
          if (line.length < 220 && !/PSK|PASS=/.test(line)) log(line);
        });
        if (l2tpRun.code !== 0) {
          throw new Error("Penyiapan fitur Summon di server gagal. Periksa status proses di atas.");
        }
        log("L2TP server di VPS siap");
        l2tpInfo = {
          user: l2tpUser,
          pass: l2tpPass,
          psk: l2tpPsk,
          modemSubnets: subnets,
          acsIp: acsHost,
          localIp: "10.255.255.1",
          peerIp: "10.255.255.2",
        };
        steps.push("l2tp-server");

        if (mikrotik && mikrotik.host && mikrotik.username && mikrotik.password) {
          log("Setup L2TP client di MikroTik…");
          const { setupMikrotikL2tp } = require("./mikrotik");
          try {
            const mt = await setupMikrotikL2tp({
              ...mikrotik,
              acsIp: acsHost,
              l2tpUser,
              l2tpPass,
              l2tpPsk,
              modemSubnets: subnets,
            });
            for (const n of mt.notes || []) log(n);
            l2tpInfo.mikrotikOk = mt.ok;
            l2tpInfo.tunnelRunning = mt.running;
            steps.push("l2tp-mikrotik");
          } catch (e) {
            log("Peringatan MikroTik: " + e.message);
            l2tpInfo.mikrotikError = e.message;
          }
        } else {
          log("MikroTik dilewati — set L2TP client manual di router");
        }
      }

      log("Mengambil info akses…");
      const access = await collectAccess(conn, creds.host, creds);
      if (l2tpInfo) access.l2tp = l2tpInfo;
      log("Semua selesai");
      return { ok: true, mode: "install", paths, steps, access };
    },
    900000
  );
}

async function deployTheme(creds, { logoBuffer, theme, cssSource, onLog }) {
  const log = (line) => onLog && onLog(line);
  return withSsh(
    creds,
    async (conn) => {
      log("SSH terhubung");
      const paths = await detectPaths(conn, creds);
      if (!paths.publicDir) {
        throw new Error("ACS belum terpasang. Gunakan install untuk server kosong.");
      }
      const steps = await applyThemeFiles(conn, creds, paths, {
        logoBuffer,
        theme,
        cssSource,
        log,
      });
      const access = await collectAccess(conn, creds.host, creds);
      log("Selesai");
      return { ok: true, mode: "theme", paths, steps, access };
    },
    120000
  );
}

async function deploy(creds, opts) {
  const mode = opts.mode || "install";
  if (mode === "theme") return deployTheme(creds, opts);
  return installFresh(creds, opts);
}

module.exports = { testConnection, deployTheme, installFresh, deploy };
