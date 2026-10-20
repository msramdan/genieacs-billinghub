// Wifi Connected v4 — AssociatedDevice first (GenieACS standard)
// Fallback only when ONT reports TotalAssociations > 0 but no AssociatedDevice rows:
// active WiFi rows from Hosts.Host (no separate DHCP section, no stale leases)
// Loaded by apply-patches.mongosh.js

const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");

function upsert(id, value) {
  db.config.updateOne({ _id: id }, { $set: { value } }, { upsert: true });
}

function wlanBase(wlan) {
  return `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${wlan}`;
}

function adSlotBase(wlan, slot) {
  return `${wlanBase(wlan)}.AssociatedDevice.${slot}`;
}

/** Device-level: show Wifi Connected block when SSID/client exists */
function wifiSectionFilter(wlan) {
  const b = wlanBase(wlan);
  return `(${b}.SSID IS NOT NULL) OR (${b}.TotalAssociations > 0) OR (${b}.Enable)`;
}

/** Device-level: ONT reports zero AssociatedDevice leaves (GM220/CMCC) */
function adAllEmptyFilter(wlan) {
  const parts = [];
  for (let i = 1; i <= 8; i++) {
    const s = adSlotBase(wlan, i);
    parts.push(
      `((${s}.AssociatedDeviceIPAddress IS NULL) AND (${s}.AssociatedDeviceMACAddress IS NULL))`
    );
  }
  const b = wlanBase(wlan);
  return `(${b}.TotalAssociations > 0) AND (${parts.join(" AND ")})`;
}

/** Row-level (Hosts.Host): active WiFi client — keep in sync with lib/wifi-connected-logic.js */
function hostWifiRowFilter() {
  return (
    "((InterfaceType = '802.11') OR (InterfaceType IS NULL AND NOT (IPAddress LIKE '10.%')))" +
    " AND ((Active IS NULL) OR (Active = true) OR (Active = 'true') OR (Active = 1) OR (Active = '1'))"
  );
}

const HOSTS = "InternetGatewayDevice.LANDevice.1.Hosts.Host";

const HOST_NAME =
  "COALESCE(X_ZTE-COM_AssociatedDeviceName, X_HW_AssociatedDevicedescriptions, X_CT-COM_AssociatedDeviceName, HostName, AssociatedDeviceName)";

const vpDir = process.env.VP_DIR || path.join(root, "db", "virtualParameters");
for (const id of ["wifiClientHostName", "wifiClientMac", "wifiClientIP"]) {
  const p = vpDir + "/" + id + ".js";
  if (fs.existsSync(p)) {
    db.virtualParameters.updateOne({ _id: id }, { $set: { script: fs.readFileSync(p, "utf8") } }, { upsert: true });
    print("OK VP", id);
  }
}

const WIFI_COMPS = {
  "3": [22, 23, 24, 25, 26, 27, 28, 29],
  "4": [11, 12, 13, 14, 15, 16, 17, 18],
  "8": [16, 17, 18, 19, 20, 21, 22, 23],
  "11": [16, 17, 18, 19, 20, 21, 22, 23],
  "12": [9, 10, 11, 12, 13, 14, 15, 16],
  "14": [3, 4, 5, 6, 7, 8, 9, 10],
};

let removedKeys = 0;

for (const [tab, comps] of Object.entries(WIFI_COMPS)) {
  for (let wlan = 1; wlan <= 8; wlan++) {
    const comp = comps[wlan - 1];
    const prefix = `ui.device.${tab}.components.${comp}`;
    const wlanBasePath = wlanBase(wlan);
    const adParam = `${wlanBasePath}.AssociatedDevice`;
    const esc = prefix.replace(/\./g, "\\.");

    // Reset components 1–3 (v5 nested layout / v3 LAN Host) then apply v4 flat structure
    for (const idx of [1, 2, 3]) {
      const staleComp = db.config
        .find({ _id: { $regex: `^${esc}\\.components\\.${idx}(\\.|$)` } })
        .toArray()
        .map((d) => d._id);
      if (staleComp.length) {
        db.config.deleteMany({ _id: { $in: staleComp } });
        removedKeys += staleComp.length;
      }
    }

    upsert(`${prefix}.filter`, wifiSectionFilter(wlan));

    // Table 1 — AssociatedDevice ONLY (per GenieACS forum / beryindo)
    upsert(`${prefix}.components.1.type`, "'parameter-table'");
    upsert(`${prefix}.components.1.parameter`, adParam);
    db.config.deleteOne({ _id: `${prefix}.components.1.filter` });
    upsert(`${prefix}.components.1.childParameters.0.label`, "'Host Name'");
    // X_BH_HostName = LAN Host name matched by MAC/IP, added client-side (patch-wifi-hostname.js)
    upsert(
      `${prefix}.components.1.childParameters.0.parameter`,
      HOST_NAME.replace(/\)$/, ", X_BH_HostName)")
    );
    upsert(`${prefix}.components.1.childParameters.1.label`, "'IP Address'");
    upsert(
      `${prefix}.components.1.childParameters.1.parameter`,
      "COALESCE(VirtualParameters.wifiClientIP, AssociatedDeviceIPAddress)"
    );
    upsert(`${prefix}.components.1.childParameters.2.label`, "'MAC Addr'");
    upsert(
      `${prefix}.components.1.childParameters.2.parameter`,
      "COALESCE(VirtualParameters.wifiClientMac, AssociatedDeviceMACAddress)"
    );

    // Table 2 — ONT has counter but no AssociatedDevice (GM220/CMCC): show ACTIVE WiFi rows
    // from Hosts.Host. Row filter drops LAN + stale DHCP leases (Active=false) — no fake clients.
    upsert(`${prefix}.components.2.type`, "'container'");
    upsert(`${prefix}.components.2.filter`, adAllEmptyFilter(wlan));
    upsert(`${prefix}.components.2.components.0.type`, "'parameter-list'");
    upsert(
      `${prefix}.components.2.components.0.parameters.0.label`,
      "'ONT tidak kirim AssociatedDevice — daftar dari LAN Host aktif (WiFi).'"
    );
    upsert(`${prefix}.components.2.components.0.parameters.0.element`, "'span.inform'");
    upsert(`${prefix}.components.2.components.1.type`, "'parameter-table'");
    upsert(`${prefix}.components.2.components.1.parameter`, HOSTS);
    upsert(`${prefix}.components.2.components.1.filter`, hostWifiRowFilter());
    upsert(`${prefix}.components.2.components.1.childParameters.0.label`, "'Host Name'");
    upsert(`${prefix}.components.2.components.1.childParameters.0.parameter`, "HostName");
    upsert(`${prefix}.components.2.components.1.childParameters.1.label`, "'IP Address'");
    upsert(`${prefix}.components.2.components.1.childParameters.1.parameter`, "IPAddress");
    upsert(`${prefix}.components.2.components.1.childParameters.2.label`, "'MAC Addr'");
    upsert(`${prefix}.components.2.components.1.childParameters.2.parameter`, "MACAddress");

    // Summon — fetch all AD slots (forum: explicit declare when GPV skips unreported paths)
    // + Hosts fields used by table 2 fallback
    const summon = `${prefix}.components.0.parameters.0.components.0.parameters`;
    const summonParams = [
      `${wlanBasePath}.AssociatedDevice.*.AssociatedDeviceIPAddress`,
      `${wlanBasePath}.AssociatedDevice.*.AssociatedDeviceMACAddress`,
      `${HOSTS}.*.HostName`,
      `${HOSTS}.*.IPAddress`,
      `${HOSTS}.*.MACAddress`,
      `${HOSTS}.*.InterfaceType`,
      `${HOSTS}.*.Active`,
    ];
    summonParams.forEach((p, i) => upsert(`${summon}.${i}`, p));
    for (let i = summonParams.length; i < 10; i++) db.config.deleteOne({ _id: `${summon}.${i}` });
  }
}

// LAN HOST — remove entirely (filter only works on container, not parameter-list/table)
const dhcpRemoved =
  db.config.deleteMany({ _id: /^ui\.device\.15(\.|$)/ }).deletedCount +
  db.config.deleteMany({ _id: /^ui\.device\.16(\.|$)/ }).deletedCount;
print("Removed LAN HOST UI keys:", dhcpRemoved);

const rw = process.env.REFRESH_WLAN || path.join(root, "db", "provisions", "refresh-wlan.js");
if (fs.existsSync(rw)) {
  db.provisions.updateOne({ _id: "refresh-wlan" }, { $set: { script: fs.readFileSync(rw, "utf8") } });
}

db.faults.deleteMany({});
db.cache.deleteMany({});

print("Removed stale UI keys:", removedKeys);
print("DONE patch-wifi-connected-v4");
