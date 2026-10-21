// BillingHub post-import patches — multi-vendor, no device-specific config
// Run: BILLINGHUB_ROOT=/path mongosh genieacs --quiet scripts/apply-patches.mongosh.js
// (also loaded automatically at end of import-db.mongosh.js)

const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");

process.env.BILLINGHUB_ROOT = root;
process.env.VP_DIR = process.env.VP_DIR || path.join(root, "db", "virtualParameters");
process.env.REFRESH_WLAN =
  process.env.REFRESH_WLAN || path.join(root, "db", "provisions", "refresh-wlan.js");

const scriptsDir = path.join(root, "scripts");

print("=== BillingHub apply-patches ===");
print("Root:", root);

// Remove experimental VPs that broke UI on some vendors
const badVp = ["wlanDisplaySSID", "wlanDisplayEnable", "associatedHostName"];
const removed = db.virtualParameters.deleteMany({ _id: { $in: badVp } }).deletedCount;
if (removed) print("Removed bad VPs:", removed);

load(path.join(scriptsDir, "patch-index-full-fallbacks.mongosh.js"));
load(path.join(scriptsDir, "patch-wifi-connected-v4.mongosh.js"));
load(path.join(scriptsDir, "patch-provision-password-cache.mongosh.js"));
load(path.join(scriptsDir, "patch-preset-default-boot.mongosh.js"));

// refresh-wlan every Inform — phased script pulls one WLAN attrs set per session (SSID-LIST not blank)
db.presets.updateOne(
  { _id: "refresh-wlan" },
  {
    $set: {
      weight: 1,
      channel: "default",
      precondition: "",
      events: {},
      configurations: [{ type: "provision", name: "refresh-wlan", args: null }],
    },
  },
  { upsert: true }
);
print("OK preset refresh-wlan -> every inform (phased)");

const fsRefreshHosts = require("fs");
const refreshHosts = path.join(root, "db", "provisions", "refresh-hosts.js");
if (fsRefreshHosts.existsSync(refreshHosts)) {
  db.provisions.updateOne(
    { _id: "refresh-hosts" },
    { $set: { script: fsRefreshHosts.readFileSync(refreshHosts, "utf8") } },
    { upsert: true }
  );
  print("OK provision refresh-hosts");
}

// refresh-hosts every Inform, OWN channel — phantom Host instances on some ONTs (ZICG
// F663NV3a / M69X) loop GetParameterNames until too_many_rpcs; isolated, only this channel faults
db.presets.updateOne(
  { _id: "refresh-hosts" },
  {
    $set: {
      weight: 2,
      channel: "refresh-hosts",
      precondition: "",
      events: {},
      configurations: [{ type: "provision", name: "refresh-hosts", args: null }],
    },
  },
  { upsert: true }
);
print("OK preset: refresh-hosts (own channel)");

db.cache.deleteMany({});
print("=== apply-patches done ===");
