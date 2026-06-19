// Restore provisions + presets from export (tanpa drop collection lain)
const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1]), "..");
const exportDir = path.join(root, "db", "export");
const dbDir = path.join(root, "db");

function loadJson(name) {
  const p = path.join(exportDir, name);
  if (!fs.existsSync(p)) {
    print("ERROR: not found " + name);
    quit(1);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const provisions = loadJson("provisions.json");
for (const doc of provisions) {
  db.provisions.replaceOne({ _id: doc._id }, doc, { upsert: true });
}
print("OK: provisions (" + provisions.length + ")");

const presets = loadJson("presets.json");
for (const doc of presets) {
  db.presets.replaceOne({ _id: doc._id }, doc, { upsert: true });
}
print("OK: presets (" + presets.length + ")");

// Patch default provision extras (MacAddress, KeyPassphrase, ConnectionRequestURL)
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

db.cache.deleteMany({ _id: { $in: ["cwmp-local-cache-hash", "ui-local-cache-hash"] } });
print("Restore provisions selesai.");
