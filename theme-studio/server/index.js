const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { testConnection, deploy } = require("./ssh-deploy");
const { testMikrotik } = require("./mikrotik");
const { PRESETS, shade } = require("./theme-engine");
const auth = require("./auth");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

const ROOT = path.resolve(__dirname, "..", "..");
const LOCAL_CSS = path.join(ROOT, "genieacs", "public", "app.css");

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    localCss: fs.existsSync(LOCAL_CSS),
    rollbackTag: "pre-theme-studio",
    authEnabled: auth.enabled,
  });
});

app.get("/api/me", (req, res) => {
  res.json({
    ok: true,
    authEnabled: auth.enabled,
    authenticated: auth.isAuthed(req),
    user: auth.enabled && auth.isAuthed(req) ? auth.AUTH_USER : null,
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const result = auth.login(username, password);
  if (!result.ok) {
    return res.status(401).json(result);
  }
  if (!result.authDisabled) auth.setSessionCookie(res);
  res.json({ ok: true, user: auth.AUTH_USER || username || "admin" });
});

app.post("/api/logout", (_req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.use("/api", (req, res, next) => {
  if (req.path === "/health" || req.path === "/me" || req.path === "/login" || req.path === "/logout") {
    return next();
  }
  return auth.requireAuth(req, res, next);
});

app.get("/api/presets", (_req, res) => {
  res.json({ presets: Object.values(PRESETS) });
});

app.post("/api/test-connection", async (req, res) => {
  try {
    const { host, port, username, password } = req.body || {};
    if (!host || !username || !password) {
      return res.status(400).json({ ok: false, error: "IP, username, dan password wajib diisi" });
    }
    const result = await testConnection({ host, port: port || 22, username, password });
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

app.post("/api/test-mikrotik", async (req, res) => {
  try {
    const { host, port, username, password } = req.body || {};
    if (!host || !username || !password) {
      return res.status(400).json({ ok: false, error: "Host, username, dan password MikroTik wajib" });
    }
    const result = await testMikrotik({
      host,
      port: port || 8728,
      username,
      password,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || String(err) });
  }
});

function resolveTheme(presetId, customAccent) {
  let theme = PRESETS[presetId] || PRESETS.teal;
  if (customAccent && /^#[0-9a-fA-F]{6}$/.test(customAccent)) {
    theme = {
      id: "custom",
      name: "Custom",
      accent: customAccent,
      accentHover: shade(customAccent, -18),
    };
  }
  return theme;
}

app.post("/api/deploy", upload.single("logo"), async (req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const send = (obj) => {
    res.write(JSON.stringify(obj) + "\n");
  };

  try {
    const host = req.body.host;
    const port = req.body.port || 22;
    const username = req.body.username;
    const password = req.body.password;
    const presetId = req.body.presetId || "teal";
    const customAccent = req.body.customAccent;
    const mode = req.body.mode || "install";
    const enableL2tp = req.body.enableL2tp === "1" || req.body.enableL2tp === "true";
    const modemSubnets = req.body.modemSubnets || "10.10.10.0/24";

    let mikrotik = null;
    if (enableL2tp && req.body.mtHost) {
      mikrotik = {
        host: req.body.mtHost,
        port: req.body.mtPort || 8728,
        username: req.body.mtUsername,
        password: req.body.mtPassword,
      };
    }

    if (!host || !username || !password) {
      send({ type: "error", error: "Akses server wajib diisi" });
      return res.end();
    }

    if (!fs.existsSync(LOCAL_CSS)) {
      send({
        type: "error",
        error: "File tema lokal tidak ditemukan. Jalankan ACS Studio dari folder repo.",
      });
      return res.end();
    }

    const theme = resolveTheme(presetId, customAccent);
    const cssSource = fs.readFileSync(LOCAL_CSS, "utf8");
    const logoBuffer = req.file ? req.file.buffer : null;

    send({
      type: "log",
      line: mode === "install" ? "Mode: install ACS di server kosong" : "Mode: update logo & warna",
    });
    if (enableL2tp) send({ type: "log", line: "L2TP Summon: ya" });
    send({ type: "log", line: `Warna: ${theme.name} · ${theme.accent}` });
    send({
      type: "log",
      line: logoBuffer ? `Logo: ${req.file.originalname}` : "Logo: default BillingHub",
    });

    const result = await deploy(
      { host, port, username, password },
      {
        mode,
        logoBuffer,
        theme,
        cssSource,
        enableL2tp,
        modemSubnets,
        mikrotik,
        onLog: (line) => send({ type: "log", line }),
      }
    );

    send({
      type: "done",
      ok: true,
      mode: result.mode,
      theme,
      steps: result.steps,
      paths: result.paths,
      access: result.access,
    });
  } catch (err) {
    send({ type: "error", error: err.message || String(err) });
  } finally {
    res.end();
  }
});

const dist = path.join(__dirname, "..", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = process.env.PORT || 5174;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`ACS Studio API         → http://0.0.0.0:${PORT}`);
  console.log(`Auth                  → ${auth.enabled ? "ON (env AUTH_USER/AUTH_PASS)" : "OFF"}`);
  console.log(`Rollback git tag       → pre-theme-studio`);
});
