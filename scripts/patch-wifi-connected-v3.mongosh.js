// Wifi Connected v3 — multi-vendor, generic (no device IDs)
// Loaded by apply-patches.mongosh.js after import-db

const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");

function upsert(id, value) {
  db.config.updateOne({ _id: id }, { $set: { value } }, { upsert: true });
}

const AD_SLOTS = 8;

function wlanBase(wlan) {
  return `InternetGatewayDevice.LANDevice.1.WLANConfiguration.${wlan}`;
}

function adSlotBase(wlan, slot) {
  return `${wlanBase(wlan)}.AssociatedDevice.${slot}`;
}

function adHasDataFilter(wlan) {
  const parts = [];
  for (let i = 1; i <= AD_SLOTS; i++) {
    const b = adSlotBase(wlan, i);
    parts.push(`(${b}.AssociatedDeviceIPAddress IS NOT NULL)`);
    parts.push(`(${b}.AssociatedDeviceMACAddress IS NOT NULL)`);
  }
  return parts.join(" OR ");
}

function adAllEmptyFilter(wlan) {
  const b = wlanBase(wlan);
  const parts = [];
  for (let i = 1; i <= AD_SLOTS; i++) {
    const s = adSlotBase(wlan, i);
    parts.push(
      `((${s}.AssociatedDeviceIPAddress IS NULL) AND (${s}.AssociatedDeviceMACAddress IS NULL))`
    );
  }
  return `(${b}.TotalAssociations > 0) AND (${parts.join(" AND ")})`;
}

function adLooksIncompleteFilter(wlan) {
  const b = wlanBase(wlan);
  const s2 = adSlotBase(wlan, 2);
  const s2empty = `(${s2}.AssociatedDeviceIPAddress IS NULL) AND (${s2}.AssociatedDeviceMACAddress IS NULL)`;
  return `(${b}.TotalAssociations > 0) AND (${adHasDataFilter(wlan)}) AND ((${b}.TotalAssociations >= 2) AND (${s2empty}))`;
}

function hostWifiRowFilter() {
  return "(InterfaceType = '802.11') OR (InterfaceType IS NULL AND NOT (IPAddress LIKE '10.%'))";
}

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

for (const [tab, comps] of Object.entries(WIFI_COMPS)) {
  for (let wlan = 1; wlan <= 8; wlan++) {
    const comp = comps[wlan - 1];
    const prefix = `ui.device.${tab}.components.${comp}`;
    const wlanBasePath = wlanBase(wlan);
    const adParam = `${wlanBasePath}.AssociatedDevice`;

    upsert(
      `${prefix}.filter`,
      `(${wlanBasePath}.SSID IS NOT NULL) OR (${wlanBasePath}.TotalAssociations > 0) OR (${wlanBasePath}.Enable)`
    );

    // Table A — AssociatedDevice (data langsung dari chip WiFi ONT)
    upsert(`${prefix}.components.1.type`, "'parameter-table'");
    upsert(`${prefix}.components.1.parameter`, adParam);
    upsert(`${prefix}.components.1.filter`, adHasDataFilter(wlan));
    upsert(`${prefix}.components.1.childParameters.0.label`, "'Host Name'");
    upsert(`${prefix}.components.1.childParameters.0.parameter`, "VirtualParameters.wifiClientHostName");
    upsert(`${prefix}.components.1.childParameters.1.label`, "'IP Address'");
    upsert(`${prefix}.components.1.childParameters.1.parameter`, "VirtualParameters.wifiClientIP");
    upsert(`${prefix}.components.1.childParameters.2.label`, "'MAC Addr'");
    upsert(`${prefix}.components.1.childParameters.2.parameter`, "VirtualParameters.wifiClientMac");

    // Table B — primary via LAN Host when AD kosong (GM220/CMCC)
    upsert(`${prefix}.components.2.type`, "'container'");
    upsert(`${prefix}.components.2.filter`, adAllEmptyFilter(wlan));
    upsert(`${prefix}.components.2.components.0.type`, "'parameter-list'");
    upsert(
      `${prefix}.components.2.components.0.parameters.0.label`,
      "'Daftar WiFi (via LAN Host — ONT tidak kirim AssociatedDevice)'"
    );
    upsert(`${prefix}.components.2.components.0.parameters.0.element`, "'span.inform'");
    upsert(`${prefix}.components.2.components.1.type`, "'parameter-table'");
    upsert(`${prefix}.components.2.components.1.parameter`, "InternetGatewayDevice.LANDevice.1.Hosts.Host");
    upsert(`${prefix}.components.2.components.1.filter`, hostWifiRowFilter());
    upsert(`${prefix}.components.2.components.1.childParameters.0.label`, "'Host Name'");
    upsert(
      `${prefix}.components.2.components.1.childParameters.0.parameter`,
      "COALESCE(HostName, Layer2Interface, VendorClassID, Active)"
    );
    upsert(`${prefix}.components.2.components.1.childParameters.1.label`, "'IP Address'");
    upsert(`${prefix}.components.2.components.1.childParameters.1.parameter`, "IPAddress");
    upsert(`${prefix}.components.2.components.1.childParameters.2.label`, "'MAC Addr'");
    upsert(`${prefix}.components.2.components.1.childParameters.2.parameter`, "MACAddress");
    upsert(`${prefix}.components.2.components.1.childParameters.3.label`, "'Type'");
    upsert(`${prefix}.components.2.components.1.childParameters.3.parameter`, "InterfaceType");

    // Table C — supplemental when AD ada tapi tidak lengkap vs Connected count
    upsert(`${prefix}.components.3.type`, "'container'");
    upsert(`${prefix}.components.3.filter`, adLooksIncompleteFilter(wlan));
    upsert(`${prefix}.components.3.components.0.type`, "'parameter-list'");
    upsert(
      `${prefix}.components.3.components.0.parameters.0.label`,
      "'Daftar pelengkap WiFi (LAN Host / DHCP — bandingkan dengan angka Connected)'"
    );
    upsert(`${prefix}.components.3.components.0.parameters.0.element`, "'span.inform'");
    upsert(`${prefix}.components.3.components.1.type`, "'parameter-table'");
    upsert(`${prefix}.components.3.components.1.parameter`, "InternetGatewayDevice.LANDevice.1.Hosts.Host");
    upsert(`${prefix}.components.3.components.1.filter`, hostWifiRowFilter());
    upsert(`${prefix}.components.3.components.1.childParameters.0.label`, "'Host Name'");
    upsert(
      `${prefix}.components.3.components.1.childParameters.0.parameter`,
      "COALESCE(HostName, Layer2Interface, VendorClassID, Active)"
    );
    upsert(`${prefix}.components.3.components.1.childParameters.1.label`, "'IP Address'");
    upsert(`${prefix}.components.3.components.1.childParameters.1.parameter`, "IPAddress");
    upsert(`${prefix}.components.3.components.1.childParameters.2.label`, "'MAC Addr'");
    upsert(`${prefix}.components.3.components.1.childParameters.2.parameter`, "MACAddress");
    upsert(`${prefix}.components.3.components.1.childParameters.3.label`, "'Type'");
    upsert(`${prefix}.components.3.components.1.childParameters.3.parameter`, "InterfaceType");

    upsert(
      `${prefix}.components.0.parameters.0.components.0.parameters.0`,
      `${wlanBasePath}.AssociatedDevice.*.AssociatedDeviceIPAddress`
    );
  }
}

// LAN HOST — label lebih jelas (semua DHCP, bukan hanya WiFi SSID ini)
upsert("ui.device.15.parameters.0.label", "'Semua Perangkat DHCP (LAN + WiFi + Guest)'");
upsert("ui.device.16.childParameters.0.parameter", "COALESCE(HostName, Layer2Interface, VendorClassID, Active)");

const rw = process.env.REFRESH_WLAN || path.join(root, "db", "provisions", "refresh-wlan.js");
if (fs.existsSync(rw)) {
  db.provisions.updateOne({ _id: "refresh-wlan" }, { $set: { script: fs.readFileSync(rw, "utf8") } });
}

db.faults.deleteMany({});
db.cache.deleteMany({});

print("\n=== Wifi Connected patch ===");
const sample = db.config.findOne({ _id: "ui.device.4.components.11.components.1.filter" })?.value;
print("AD filter length:", sample ? sample.length : "missing");

print("DONE patch-wifi-connected-v3");
