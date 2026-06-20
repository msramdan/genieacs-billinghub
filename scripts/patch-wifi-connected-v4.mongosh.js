// Wifi Connected v4 — AssociatedDevice only (GenieACS standard)
// LAN Host belongs in separate DHCP section, NOT duplicated under Wifi Connected
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

    // Remove v3 LAN Host tables (components 2 & 3) — caused 11 rows vs Connected 4
    const stale = db.config
      .find({ _id: { $regex: `^${esc}\\.components\\.(2|3)(\\.|$)` } })
      .toArray()
      .map((d) => d._id);
    if (stale.length) {
      db.config.deleteMany({ _id: { $in: stale } });
      removedKeys += stale.length;
    }

    upsert(`${prefix}.filter`, wifiSectionFilter(wlan));

    // Table 1 — AssociatedDevice ONLY (per GenieACS forum / beryindo)
    upsert(`${prefix}.components.1.type`, "'parameter-table'");
    upsert(`${prefix}.components.1.parameter`, adParam);
    db.config.deleteOne({ _id: `${prefix}.components.1.filter` });
    upsert(`${prefix}.components.1.childParameters.0.label`, "'Host Name'");
    upsert(
      `${prefix}.components.1.childParameters.0.parameter`,
      `COALESCE(VirtualParameters.wifiClientHostName, ${HOST_NAME})`
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

    // Table 2 — info only when ONT has counter but no AssociatedDevice (no fake DHCP list)
    upsert(`${prefix}.components.2.type`, "'container'");
    upsert(`${prefix}.components.2.filter`, adAllEmptyFilter(wlan));
    upsert(`${prefix}.components.2.components.0.type`, "'parameter-list'");
    upsert(
      `${prefix}.components.2.components.0.parameters.0.label`,
      "'Connected = counter WiFi ONT. Detail client tidak dikirim via AssociatedDevice — klik Summon untuk refresh.'"
    );
    upsert(`${prefix}.components.2.components.0.parameters.0.element`, "'span.inform'");

    // Summon — fetch all AD slots (forum: explicit declare when GPV skips unreported paths)
    upsert(
      `${prefix}.components.0.parameters.0.components.0.parameters.0`,
      `${wlanBasePath}.AssociatedDevice.*.AssociatedDeviceIPAddress`
    );
    upsert(
      `${prefix}.components.0.parameters.0.components.0.parameters.1`,
      `${wlanBasePath}.AssociatedDevice.*.AssociatedDeviceMACAddress`
    );
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
