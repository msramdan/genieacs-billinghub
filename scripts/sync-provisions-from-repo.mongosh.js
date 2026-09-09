// Sync provisions from repo db/provisions/ (refresh-wlan, useradmin, etc.)
const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");

const provDir = path.join(root, "db", "provisions");
const files = [
  ["refresh-wlan", "refresh-wlan.js"],
  ["refresh-lan", "refresh-lan.js"],
  ["useradmin", "useradmin.js"],
];

for (const [id, file] of files) {
  const fp = path.join(provDir, file);
  if (!fs.existsSync(fp)) continue;
  const script = fs.readFileSync(fp, "utf8");
  db.provisions.updateOne({ _id: id }, { $set: { script } }, { upsert: true });
  print("OK provision:", id);
}

// Preset: auto-run useradmin on every session (ENABLED flag inside script)
db.presets.updateOne(
  { _id: "useradmin" },
  {
    $set: {
      weight: 0,
      channel: "useradmin",
      precondition: "",
      events: {},
      configurations: [{ type: "provision", name: "useradmin", args: null }],
    },
  },
  { upsert: true }
);
print("OK preset: useradmin");

// VP overrides from db/virtualParameters/
const vpDir = path.join(root, "db", "virtualParameters");
if (fs.existsSync(vpDir)) {
  for (const f of fs.readdirSync(vpDir)) {
    if (!f.endsWith(".js")) continue;
    const id = f.replace(/\.js$/, "");
    const script = fs.readFileSync(path.join(vpDir, f), "utf8");
    db.virtualParameters.updateOne({ _id: id }, { $set: { script } }, { upsert: true });
    print("OK VP file:", id);
  }
}

print("sync-provisions-from-repo done");
