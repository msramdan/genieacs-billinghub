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

/** Per-row filter on Hosts.Host — WiFi clients on LAN, exclude guest 10.x.x.x. */
function hostWifiRowFilter() {
  return "(InterfaceType = '802.11') OR (InterfaceType IS NULL AND NOT (IPAddress LIKE '10.%'))";
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
    if (ip || mac) rows.push({ slot: k, ip, mac, type, name });
  }
  return rows;
}

function isWifiHostRow(row) {
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
  hostWifiRowFilter,
  adLooksIncompleteFilter,
  collectAdRows,
  collectHostRows,
  isWifiHostRow,
  resolveWifiClientHostName,
  resolveWifiClientIP,
  resolveWifiClientMac,
  analyzeWifiDisplay,
};
