// GenieACS MongoDB import — run: mongosh genieacs scripts/import-db.mongosh.js
// Set BILLINGHUB_ROOT env or run from repo root

const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1]), "..");

const exportDir = path.join(root, "db", "export");
const dbDir = path.join(root, "db");

function loadJson(rel) {
  const p = path.join(exportDir, rel);
  if (!fs.existsSync(p)) {
    print("SKIP (not found): " + rel);
    return null;
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function loadScript(rel) {
  const p = path.join(dbDir, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

const collections = [
  ["virtualParameters", "virtualParameters-all.json"],
  ["provisions", "provisions.json"],
  ["presets", "presets.json"],
  ["permissions", "permissions.json"],
  ["users", "users.json"],
  ["config", "config.json"],
];

for (const [coll, file] of collections) {
  const data = loadJson(file);
  if (!data) continue;
  db.getCollection(coll).drop();
  if (data.length > 0) {
    db.getCollection(coll).insertMany(data);
  }
  print("OK: " + coll + " (" + data.length + " docs)");
}

const vpOverrides = {
  IPTR069: "virtualParameters/IPTR069.js",
  WlanPassword: "virtualParameters/WlanPassword.js",
  MacAddress: "virtualParameters/MacAddress.js",
};

for (const [id, file] of Object.entries(vpOverrides)) {
  const script = loadScript(file);
  if (!script) continue;
  db.virtualParameters.updateOne({ _id: id }, { $set: { script } }, { upsert: true });
  print("PATCH VP: " + id);
}

// Patch default provision: add MacAddress + KeyPassphrase refresh
const defProv = db.provisions.findOne({ _id: "default" });
if (defProv && defProv.script) {
  let script = defProv.script;
  const extras = [
    'declare("VirtualParameters.MacAddress", {path: hourly, value: hourly});',
    'declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.KeyPassphrase", {path: hourly, value: hourly});',
    'declare("InternetGatewayDevice.ManagementServer.ConnectionRequestURL", {path: update, value: update});',
  ];
  for (const line of extras) {
    if (!script.includes(line)) {
      script = script.replace(
        'declare("VirtualParameters.WlanPassword", {path: hourly, value: hourly});',
        'declare("VirtualParameters.WlanPassword", {path: hourly, value: hourly});\n' + line
      );
    }
  }
  db.provisions.updateOne({ _id: "default" }, { $set: { script } });
  print("PATCH provision: default");
}

// Pastikan preset inform selalu ada (jangan sampai ter-delete)
db.presets.updateOne(
  { _id: "inform" },
  {
    $set: {
      weight: 0,
      channel: "inform",
      precondition: "",
      events: {},
      configurations: [{ type: "provision", name: "inform", args: null }],
    },
  },
  { upsert: true }
);
print("OK: preset inform");

const patchFile = path.join(dbDir, "patches", "config-patches.json");
if (fs.existsSync(patchFile)) {
  const patchData = JSON.parse(fs.readFileSync(patchFile, "utf8"));
  for (const patch of patchData) {
    db.config.updateOne({ _id: patch._id }, { $set: { value: patch.value } }, { upsert: true });
  }
  print("OK: config patches (" + patchData.length + ")");
}

const chartPatchFile = path.join(dbDir, "patches", "chart-colors-patches.json");
if (fs.existsSync(chartPatchFile)) {
  const chartData = JSON.parse(fs.readFileSync(chartPatchFile, "utf8"));
  for (const patch of chartData) {
    db.config.updateOne({ _id: patch._id }, { $set: { value: patch.value } }, { upsert: true });
  }
  print("OK: chart color patches (" + chartData.length + ")");
}

// Auto-patch remaining WLAN password fields on vendor tabs
const COALESCE_WLAN =
  "COALESCE(VirtualParameters.WlanPassword, PreSharedKey.1.KeyPassphrase, KeyPassphrase, PreSharedKey.1.PreSharedKey)";
let autoWlan = 0;
db.config.find({ value: /KeyPassphrase|PreSharedKey\.1\.PreSharedKey/ }).forEach((doc) => {
  const v = doc.value;
  if (typeof v !== "string") return;
  if (v.startsWith("COALESCE(") || v.startsWith("VirtualParameters.")) return;
  if (v.startsWith("InternetGatewayDevice.") || v.startsWith("Device.")) return;
  db.config.updateOne({ _id: doc._id }, { $set: { value: COALESCE_WLAN } });
  autoWlan++;
});
if (autoWlan > 0) print("OK: auto WLAN password patches (" + autoWlan + ")");

print("Import selesai.");
