// Stop CPE blank password from wiping ACS cache (GenieACS default uses value: 1)
// Loaded by apply-patches.mongosh.js

const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");
const vpDir = process.env.VP_DIR || path.join(root, "db", "virtualParameters");

const defProv = db.provisions.findOne({ _id: "default" });
if (!defProv || !defProv.script) {
  print("WARN: default provision missing");
} else {
  let script = defProv.script;

  // Remove import-db extra that forced hourly GPV on KeyPassphrase (returns blank)
  script = script.replace(
    /declare\("InternetGatewayDevice\.LANDevice\.1\.WLANConfiguration\.\*\.KeyPassphrase", \{path: hourly, value: hourly\}\);\n?/g,
    ""
  );

  const replacements = [
    [
      'declare("VirtualParameters.WlanPassword", {path: hourly, value: hourly});',
      'declare("VirtualParameters.WlanPassword", {path: hourly, value: 1});',
    ],
    [
      'declare("VirtualParameters.pppoePassword", {path: hourly, value: hourly});',
      'declare("VirtualParameters.pppoePassword", {path: hourly, value: 1});',
    ],
    [
      'declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.PreSharedKey.1.KeyPassphrase", {path: hourly, value: hourly});',
      'declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.PreSharedKey.1.KeyPassphrase", {path: hourly, value: 1});',
    ],
    [
      'declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.KeyPassphrase", {path: hourly, value: hourly});',
      'declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.KeyPassphrase", {path: hourly, value: 1});',
    ],
  ];

  let changed = 0;
  for (const [from, to] of replacements) {
    if (script.includes(from) && from !== to) {
      script = script.split(from).join(to);
      changed++;
    }
  }

  if (!script.includes("LANDevice.*.WLANConfiguration.*.KeyPassphrase")) {
    script = script.replace(
      'declare("VirtualParameters.WlanPassword", {path: hourly, value: 1});',
      'declare("VirtualParameters.WlanPassword", {path: hourly, value: 1});\n' +
        'declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.KeyPassphrase", {path: hourly, value: 1});'
    );
    changed++;
  }

  if (script !== defProv.script) {
    db.provisions.updateOne({ _id: "default" }, { $set: { script } });
    print("OK default provision password cache (" + changed + " rules)");
  } else {
    print("OK default provision password cache (already patched)");
  }
}

const informProv = db.provisions.findOne({ _id: "inform" });
if (informProv && informProv.script) {
  let script = informProv.script;
  const before = script;
  script = script.replace(/declare\("VirtualParameters\.WlanPassword", vpTick\);\n?/g, "");
  script = script.replace(
    'declare("VirtualParameters.pppoePassword", vpTick);',
    'declare("VirtualParameters.pppoePassword", { path: vpTick, value: 1 });'
  );
  if (script !== before) {
    db.provisions.updateOne({ _id: "inform" }, { $set: { script } });
    print("OK inform provision password cache");
  }
}

for (const id of ["WlanPassword", "pppoePassword"]) {
  const p = vpDir + "/" + id + ".js";
  if (fs.existsSync(p)) {
    db.virtualParameters.updateOne({ _id: id }, { $set: { script: fs.readFileSync(p, "utf8") } });
    print("OK VP", id);
  }
}

const stalePw = db.devices.updateMany(
  {
    "VirtualParameters.WlanPassword._value": {
      $in: ["(write-only)", "blank", "(hidden)"],
    },
  },
  { $unset: { "VirtualParameters.WlanPassword": "" } }
);
print("Cleared stale WlanPassword sentinel on", stalePw.modifiedCount, "devices");

db.cache.deleteMany({});
