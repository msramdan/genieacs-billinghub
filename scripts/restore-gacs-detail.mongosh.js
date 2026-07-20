// Restore GACS/beryindo device detail UI + default provision (same as GACS-Ubuntu-22.04 mongorestore)
// UI_DEVICE_JSON=/tmp/ui-device-all-export.json DEFAULT_JS=/tmp/default-provision.js INFORM_JS=/tmp/inform-minimal.patched.js
// mongosh genieacs --quiet /tmp/restore-gacs-detail.mongosh.js

const fs = require("fs");

const ACS_URL = process.env.ACS_URL || "http://127.0.0.1:7547";
const ACS_USER = process.env.ACS_USER || "";
const ACS_PASS = process.env.ACS_PASS || "";
if (!ACS_USER || !ACS_PASS) {
  throw new Error("Set ACS_URL, ACS_USER, ACS_PASS env before running");
}
function upsert(id, value) {
  db.config.updateOne({ _id: id }, { $set: { value } }, { upsert: true });
}

// 1. Remove broken custom keys on ui.device (keep ui.index.* intact)
const removed = db.config.deleteMany({ _id: /^ui\.device\./ });
print("Removed old ui.device keys:", removed.deletedCount);

const uiPath = process.env.UI_DEVICE_JSON || "/tmp/ui-device-all-export.json";
if (!fs.existsSync(uiPath)) {
  print("ERROR: missing", uiPath);
  quit(1);
}
const uiRows = JSON.parse(fs.readFileSync(uiPath, "utf8"));
let n = 0;
for (const row of uiRows) {
  db.config.insertOne({ _id: row._id, value: row.value });
  n++;
}
print("OK restored ui.device from GACS/beryindo:", n, "keys");

// 2. Restore beryindo default provision (Hosts + AssociatedDevice refresh)
const defPath = process.env.DEFAULT_JS || "/tmp/default-provision.js";
if (fs.existsSync(defPath)) {
  db.provisions.updateOne(
    { _id: "default" },
    { $set: { script: fs.readFileSync(defPath, "utf8") } }
  );
  print("OK default provision restored");
} else {
  print("WARN: default provision not found");
}

// 3. Minimal inform — ACS bootstrap only (VPs refreshed by default provision like GACS)
const informPath = process.env.INFORM_JS || "/tmp/inform-minimal.patched.js";
if (fs.existsSync(informPath)) {
  db.provisions.updateOne({ _id: "inform" }, { $set: { script: fs.readFileSync(informPath, "utf8") } });
  print("OK inform provision");
} else {
  print("WARN: inform not found");
}

// 4. GACS presets (no refresh-lan)
db.provisions.deleteOne({ _id: "refresh-lan" });
db.presets.deleteOne({ _id: "refresh-lan" });
[
  {
    _id: "bootstrap",
    weight: 0,
    channel: "bootstrap",
    events: { "0 BOOTSTRAP": true },
    precondition: "",
    configurations: [{ type: "provision", name: "bootstrap", args: null }],
  },
  {
    _id: "default",
    weight: 0,
    channel: "default",
    precondition: "",
    events: {},
    configurations: [{ type: "provision", name: "default", args: null }],
  },
  {
    _id: "inform",
    weight: 0,
    channel: "inform",
    precondition: "",
    events: {},
    configurations: [{ type: "provision", name: "inform", args: null }],
  },
].forEach((p) => {
  db.presets.updateOne({ _id: p._id }, { $set: p }, { upsert: true });
});
print("OK presets (GACS standard)");

// 5. CWMP limits (default provision has ~134 declares)
upsert("cwmp.maxCommitIterations", "256");
upsert("cwmp.gpvBatchSize", "64");
print("OK cwmp limits");

// 6. Password fallbacks only (non-breaking, matches BillingHub)
const WLAN_PW =
  "COALESCE(PreSharedKey.1.KeyPassphrase, KeyPassphrase, PreSharedKey.1.PreSharedKey, VirtualParameters.WlanPassword)";
let pw = 0;
db.config.find({ _id: /\.parameter$/, value: /^KeyPassphrase$|^PreSharedKey\.1\.KeyPassphrase$/ }).forEach((doc) => {
  db.config.updateOne({ _id: doc._id }, { $set: { value: WLAN_PW } });
  pw++;
});
print("OK password COALESCE patches:", pw);

// 7. Wifi Connected Host Name — beryindo vendor fields + LAN HOST fallback via COALESCE only
const HOST =
  "COALESCE(X_ZTE-COM_AssociatedDeviceName, X_HW_AssociatedDevicedescriptions, X_CT-COM_AssociatedDeviceName, HostName)";
db.config.find({ _id: /childParameters\.0\.parameter$/, value: /AssociatedDeviceName|X_ZTE-COM_AssociatedDeviceName/ }).forEach((doc) => {
  db.config.updateOne({ _id: doc._id }, { $set: { value: HOST } });
});

// 8. LAN HOST hostname fallback
upsert("ui.device.16.childParameters.0.parameter", "COALESCE(HostName, Layer2Interface, VendorClassID, Active)");

const fr = db.faults.deleteMany({ code: { $in: ["too_many_rpcs", "too_many_commits"] } });
print("Cleared faults:", fr.deletedCount);
db.cache.deleteMany({ _id: { $in: ["cwmp-local-cache-hash", "ui-local-cache-hash"] } });

print("\nSample ui.device.4 SSID col:", db.config.findOne({ _id: "ui.device.4.components.10.childParameters.1.parameter" })?.value);
print("Sample ui.device.14 SSID col:", db.config.findOne({ _id: "ui.device.14.components.2.components.0.childParameters.1.parameter" })?.value);
print("default declares:", (db.provisions.findOne({ _id: "default" })?.script?.match(/declare/g) || []).length);
print("DONE restore-gacs-detail");
