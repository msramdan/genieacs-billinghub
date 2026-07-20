const { RouterOSAPI } = require("node-routeros");

function connectMt(opts) {
  const api = new RouterOSAPI({
    host: opts.host,
    user: opts.username,
    password: opts.password,
    port: Number(opts.port) || 8728,
    timeout: 15,
  });
  return api;
}

function isPrivateIp(ip) {
  if (!ip) return false;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const n = Number(m[1]);
    return n >= 16 && n <= 31;
  }
  return false;
}

function skipInterface(name) {
  const n = String(name || "").toLowerCase();
  return (
    !n ||
    n === "lo" ||
    n.startsWith("l2tp") ||
    n.includes("pppoe") ||
    n.includes("lte") ||
    n.includes("wwan") ||
    n.includes("sstp") ||
    n.includes("ovpn")
  );
}

function discoverNetworks(addressRows, dhcpRows) {
  const map = new Map();

  for (const row of addressRows || []) {
    const iface = row.interface || row["interface"] || "";
    if (skipInterface(iface)) continue;
    const addr = String(row.address || "");
    const [ip, cidrRaw] = addr.split("/");
    if (!ip || !isPrivateIp(ip)) continue;
    // skip our future L2TP tunnel range
    if (ip.startsWith("10.255.255.")) continue;
    const network = row.network || ip.replace(/\.\d+$/, ".0");
    const cidr = cidrRaw || "24";
    const subnet = `${network}/${cidr}`;
    if (!map.has(subnet)) {
      map.set(subnet, {
        subnet,
        interface: iface,
        address: addr,
        source: "address",
      });
    }
  }

  for (const row of dhcpRows || []) {
    const raw = String(row.address || row.network || "");
    if (!raw.includes("/")) continue;
    const [net, cidr] = raw.split("/");
    if (!isPrivateIp(net)) continue;
    if (net.startsWith("10.255.255.")) continue;
    const subnet = `${net}/${cidr || "24"}`;
    if (!map.has(subnet)) {
      map.set(subnet, {
        subnet,
        interface: row["dhcp-server"] || "",
        address: raw,
        source: "dhcp",
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.subnet.localeCompare(b.subnet));
}

async function testMikrotik(opts) {
  const api = connectMt(opts);
  try {
    await api.connect();
    const identity = await api.write("/system/identity/print");
    const resource = await api.write("/system/resource/print");
    let addresses = [];
    let dhcpNets = [];
    try {
      addresses = await api.write("/ip/address/print");
    } catch {
      addresses = [];
    }
    try {
      dhcpNets = await api.write("/ip/dhcp-server/network/print");
    } catch {
      dhcpNets = [];
    }

    const networks = discoverNetworks(addresses, dhcpNets);
    const name = (identity && identity[0] && identity[0].name) || "";
    const version = (resource && resource[0] && resource[0].version) || "";
    const board = (resource && resource[0] && resource[0]["board-name"]) || "";

    api.close();
    return {
      ok: true,
      identity: name,
      version,
      board,
      networks,
      message: `Berhasil terhubung ke MikroTik${name ? ` (${name})` : ""}${
        version ? ` · RouterOS ${version}` : ""
      }${networks.length ? ` · ${networks.length} jaringan terdeteksi` : ""}`,
    };
  } catch (err) {
    try {
      api.close();
    } catch {
      /* ignore */
    }
    throw new Error(
      err.message ||
        "Gagal terhubung ke MikroTik. Periksa host, port API, username, password, dan pastikan layanan API aktif."
    );
  }
}

async function setupMikrotikL2tp(opts) {
  const {
    host,
    port,
    username,
    password,
    acsIp,
    l2tpUser,
    l2tpPass,
    l2tpPsk,
    modemSubnets,
    l2tpName = "l2tp-acs",
  } = opts;

  const api = connectMt({ host, port, username, password });
  const notes = [];

  try {
    await api.connect();

    const existing = await api.write("/interface/l2tp-client/print", [
      `?name=${l2tpName}`,
    ]);
    for (const row of existing || []) {
      if (row[".id"]) {
        await api.write("/interface/l2tp-client/remove", [`=.id=${row[".id"]}`]);
        notes.push(`Mengganti koneksi L2TP lama (${l2tpName})`);
      }
    }

    await api.write("/interface/l2tp-client/add", [
      `=name=${l2tpName}`,
      `=connect-to=${acsIp}`,
      `=user=${l2tpUser}`,
      `=password=${l2tpPass}`,
      "=use-ipsec=yes",
      `=ipsec-secret=${l2tpPsk}`,
      "=add-default-route=no",
      "=use-peer-dns=no",
      "=profile=default-encryption",
      "=keepalive-timeout=60",
      "=max-mtu=1400",
      "=max-mru=1400",
      "=disabled=no",
      "=comment=BillingHub ACS L2TP",
    ]);
    notes.push(`Koneksi L2TP ke server ACS (${acsIp}) ditambahkan`);

    const nets = String(modemSubnets || "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const net of nets) {
      const comment = `bh-acs-l2tp-${net}`;
      try {
        const rules = await api.write("/ip/firewall/filter/print", [
          `?comment=${comment}`,
        ]);
        if (!rules || !rules.length) {
          await api.write("/ip/firewall/filter/add", [
            "=chain=forward",
            "=action=accept",
            `=in-interface=${l2tpName}`,
            `=dst-address=${net}`,
            `=comment=${comment}`,
          ]);
          notes.push(`Izinkan akses ke jaringan ${net}`);
        }
      } catch (e) {
        notes.push(`Peringatan aturan firewall ${net}: ${e.message}`);
      }
    }

    await new Promise((r) => setTimeout(r, 4000));
    const statusRows = await api.write("/interface/l2tp-client/print", [
      `?name=${l2tpName}`,
    ]);
    const st = statusRows && statusRows[0];
    const running = st && (st.running === true || st.running === "true");
    notes.push(
      running
        ? "Koneksi L2TP: terhubung"
        : "Koneksi L2TP: belum terhubung (periksa firewall UDP 500/4500/1701 di VPS)"
    );

    api.close();
    return { ok: true, running: Boolean(running), notes };
  } catch (err) {
    try {
      api.close();
    } catch {
      /* ignore */
    }
    throw new Error(err.message || "Gagal menyiapkan L2TP di MikroTik");
  }
}

module.exports = { testMikrotik, setupMikrotikL2tp, discoverNetworks };
