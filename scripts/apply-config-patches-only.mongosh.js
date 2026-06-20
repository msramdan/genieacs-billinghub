const fs = require("fs");
const path = require("path");
const root =
  process.env.BILLINGHUB_ROOT ||
  path.resolve(path.dirname(process.argv[1] || "."), "..");
const patchFile = path.join(root, "db", "patches", "config-patches.json");
const patchData = JSON.parse(fs.readFileSync(patchFile, "utf8"));
for (const patch of patchData) {
  db.config.updateOne({ _id: patch._id }, { $set: { value: patch.value } }, { upsert: true });
}
db.cache.deleteMany({});
print("OK config-patches (" + patchData.length + ")");
