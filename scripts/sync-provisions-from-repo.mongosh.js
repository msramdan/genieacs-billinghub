// Sync provisions from repo db/provisions/ (refresh-wlan, etc.)
const fs = require("fs");
const path = require("path");

const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");

const provDir = path.join(root, "db", "provisions");
const files = [
  ["refresh-wlan", "refresh-wlan.js"],
  ["refresh-lan", "refresh-lan.js"],
];

for (const [id, file] of files) {
  const fp = path.join(provDir, file);
  if (!fs.existsSync(fp)) continue;
  const script = fs.readFileSync(fp, "utf8");
  db.provisions.updateOne({ _id: id }, { $set: { script } }, { upsert: true });
  print("OK provision:", id);
}

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
