/**
 * Shared logic for Wifi Connected UI filters and client field resolution.
 * Used by patch scripts and unit tests (Node.js).
 */

const AD_SLOTS = 8;

function wlanBase(wlan) {
  return `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${wlan}`;
}

function adSlotBase(wlan, slot) {
  return `${wlanBase(wlan)}.AssociatedDevice.${slot}`;
}

/** ONT exposes AssociatedDevice data (IP or MAC in slots 1..N). */
function adHasDataFilter(wlan, slots = AD_SLOTS) {
  const parts = [];
  for (let i = 1; i <= slots; i++) {
    const b = adSlotBase(wlan, i);
    parts.push(`(${b}.AssociatedDeviceIPAddress IS NOT NULL)`);
    parts.push(`(${b}.AssociatedDeviceMACAddress IS NOT NULL)`);
  }
  return parts.join(" OR ");
}

/** No AssociatedDevice leaves in slots 1..N — use LAN Host as primary list. */
function adAllEmptyFilter(wlan, slots = AD_SLOTS) {
  const b = wlanBase(wlan);
  const parts = [];
  for (let i = 1; i <= slots; i++) {
    const s = adSlotBase(wlan, i);
    parts.push(
      `((${s}.AssociatedDeviceIPAddress IS NULL) AND (${s}.AssociatedDeviceMACAddress IS NULL))`
    );
  }
  return `(${b}.TotalAssociations > 0) AND (${parts.join(" AND ")})`;
}

/** Device visible when SSID / clients exist. */
function wifiSectionFilter(wlan) {
  const b = wlanBase(wlan);
  return `(${b}.SSID IS NOT NULL) OR (${b}.TotalAssociations > 0) OR (${b}.Enable)`;
}

/** Hosts.Host row still connected (Active missing = assume connected; DHCP leases report false). */
function hostActiveRowFilter() {
  return "(Active IS NULL) OR (Active = true) OR (Active = 'true') OR (Active = 1) OR (Active = '1')";
}

/** Per-row filter on Hosts.Host — active WiFi clients on LAN, exclude guest 10.x.x.x. */
function hostWifiRowFilter() {
  return (
    "((InterfaceType = '802.11') OR (InterfaceType IS NULL AND NOT (IPAddress LIKE '10.%')))" +
    ` AND (${hostActiveRowFilter()})`
  );
}

function adLooksIncompleteFilter(wlan) {
  const b = wlanBase(wlan);
  const s2 = adSlotBase(wlan, 2);
  const s2empty = `(${s2}.AssociatedDeviceIPAddress IS NULL) AND (${s2}.AssociatedDeviceMACAddress IS NULL)`;
  return `(${b}.TotalAssociations > 0) AND (${adHasDataFilter(wlan)}) AND ((${b}.TotalAssociations >= 2) AND (${s2empty}))`;
}

function normMac(mac) {
  return String(mac || "")
    .toUpperCase()
    .replace(/[^A-F0-9]/g, "");
}

function getVal(obj) {
  if (obj == null) return "";
  if (typeof obj === "object" && obj._value !== undefined) return obj._value;
  return obj;
}

function collectAdRows(wlanConfig) {
  const ad = wlanConfig?.AssociatedDevice || {};
  const rows = [];
  for (const k of Object.keys(ad).filter((x) => !x.startsWith("_"))) {
    const r = ad[k];
    const ip = getVal(r?.AssociatedDeviceIPAddress);
    const mac = getVal(r?.AssociatedDeviceMACAddress);
    if (ip || mac) rows.push({ slot: k, ip: String(ip || ""), mac: String(mac || "") });
  }
  return rows;
}

function collectHostRows(hostsObj) {
  const hosts = hostsObj || {};
  const rows = [];
  for (const k of Object.keys(hosts).filter((x) => !x.startsWith("_"))) {
    const r = hosts[k];
    const ip = String(getVal(r?.IPAddress) || "");
    const mac = String(getVal(r?.MACAddress) || "");
    const type = String(getVal(r?.InterfaceType) || "");
    const name = String(getVal(r?.HostName) || getVal(r?.Layer2Interface) || getVal(r?.VendorClassID) || "");
    const activeRaw = getVal(r?.Active);
    const active =
      activeRaw === "" ? null : activeRaw === true || activeRaw === 1 || activeRaw === "1" || activeRaw === "true";
    if (ip || mac) rows.push({ slot: k, ip, mac, type, name, active });
  }
  return rows;
}

function isWifiHostRow(row) {
  if (row.active === false) return false;
  if (row.type === "802.11") return true;
  if (!row.type && row.ip && !row.ip.startsWith("10.")) return true;
  return false;
}

function resolveWifiClientHostName(adRow, hostRows) {
  const fields = [
    adRow?.["X_ZTE-COM_AssociatedDeviceName"],
    adRow?.["X_HW_AssociatedDevicedescriptions"],
    adRow?.["X_CT-COM_AssociatedDeviceName"],
    adRow?.HostName,
    adRow?.AssociatedDeviceName,
  ];
  for (const f of fields) {
    const v = getVal(f);
    if (v) return String(v);
  }
  const ip = getVal(adRow?.AssociatedDeviceIPAddress);
  const mac = normMac(getVal(adRow?.AssociatedDeviceMACAddress));
  for (const h of hostRows) {
    const label = h.name;
    if (!label) continue;
    if (ip && h.ip === ip) return label;
    if (mac && normMac(h.mac) === mac) return label;
  }
  return "";
}

function resolveWifiClientIP(adRow, hostRows) {
  const ip = getVal(adRow?.AssociatedDeviceIPAddress);
  if (ip) return String(ip);
  const mac = normMac(getVal(adRow?.AssociatedDeviceMACAddress));
  if (!mac) return "";
  for (const h of hostRows) {
    if (normMac(h.mac) === mac && h.ip) return h.ip;
  }
  return "";
}

function resolveWifiClientMac(adRow, hostRows) {
  const mac = getVal(adRow?.AssociatedDeviceMACAddress);
  if (mac) return String(mac);
  const ip = getVal(adRow?.AssociatedDeviceIPAddress);
  if (!ip) return "";
  for (const h of hostRows) {
    if (h.ip === ip && h.mac) return h.mac;
  }
  return "";
}

/**
 * UI (browser) helper — embedded into GenieACS app bundles by scripts/patch-wifi-hostname.js,
 * so it must stay self-contained (no outer references).
 * Input: flat UI device map { "path": { value: [v, type], valueTimestamp } }.
 * Adds "<AssociatedDevice row>.X_BH_HostName" from Hosts.Host (match MAC, then IP) —
 * same lookup the BillingHub app does. Returns the original object when nothing to add.
 */
function bhAddWifiHostNames(device) {
  if (!device || typeof device !== "object") return device;
  var norm = function (v) {
    return String(v == null ? "" : v).toUpperCase().replace(/[^A-F0-9]/g, "");
  };
  var val = function (k) {
    var p = device[k];
    return p && p.value ? p.value[0] : null;
  };
  var hostRe = /^(.*\.Hosts\.Host\.\d+)\.(MACAddress|IPAddress)$/;
  var adRe = /^(.*\.WLANConfiguration\.\d+\.AssociatedDevice\.\d+)\.AssociatedDevice(MAC|IP)Address$/;
  var byMac = {};
  var byIp = {};
  var adRows = {};
  var hasHost = false;
  for (var k in device) {
    var m = hostRe.exec(k);
    if (m) {
      var name = val(m[1] + ".HostName");
      var v = val(k);
      if (!name || v == null || v === "") continue;
      var h = { name: String(name), ts: (device[m[1] + ".HostName"] || {}).valueTimestamp };
      if (m[2] === "MACAddress") {
        if (norm(v)) byMac[norm(v)] = h;
      } else {
        byIp[String(v)] = h;
      }
      hasHost = true;
      continue;
    }
    m = adRe.exec(k);
    if (m) adRows[m[1]] = true;
  }
  if (!hasHost) return device;
  var out = null;
  for (var row in adRows) {
    var mac = norm(val(row + ".AssociatedDeviceMACAddress"));
    var ip = val(row + ".AssociatedDeviceIPAddress");
    var hit = (mac && byMac[mac]) || (ip != null && ip !== "" && byIp[String(ip)]);
    if (!hit) continue;
    if (!out) out = Object.assign({}, device);
    out[row + ".X_BH_HostName"] = {
      value: [hit.name, "xsd:string"],
      valueTimestamp: hit.ts,
      writable: false,
      object: false,
    };
  }
  return out || device;
}

/** Which UI tables should show for a device snapshot. */
function analyzeWifiDisplay(device, wlan = 1) {
  const w = device?.InternetGatewayDevice?.LANDevice?.["1"]?.WLANConfiguration?.[String(wlan)];
  const totalAssoc = Number(getVal(w?.TotalAssociations) || 0);
  const adRows = collectAdRows(w);
  const allHosts = collectHostRows(device?.InternetGatewayDevice?.LANDevice?.["1"]?.Hosts?.Host);
  const wifiHosts = allHosts.filter(isWifiHostRow);

  return {
    totalAssociations: totalAssoc,
    adRowCount: adRows.length,
    lanHostCount: allHosts.length,
    wifiHostCount: wifiHosts.length,
    showAdTable: adRows.length > 0,
    showHostSupplement: totalAssoc > 0,
    showHostPrimary: totalAssoc > 0 && adRows.length === 0,
    expectedWifiListCount: adRows.length > 0 ? adRows.length : wifiHosts.length,
    isIncomplete: adRows.length > 0 && adRows.length < totalAssoc,
  };
}

module.exports = {
  AD_SLOTS,
  adHasDataFilter,
  adAllEmptyFilter,
  wifiSectionFilter,
  hostActiveRowFilter,
  hostWifiRowFilter,
  adLooksIncompleteFilter,
  collectAdRows,
  collectHostRows,
  isWifiHostRow,
  resolveWifiClientHostName,
  resolveWifiClientIP,
  resolveWifiClientMac,
  analyzeWifiDisplay,
  bhAddWifiHostNames,
};
