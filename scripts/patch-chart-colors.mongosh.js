const chartFile = "/tmp/chart-colors-patches.json";
const fs = require("fs");
if (!fs.existsSync(chartFile)) {
  print("ERROR: " + chartFile + " not found");
  quit(1);
}
const data = JSON.parse(fs.readFileSync(chartFile, "utf8"));
for (const patch of data) {
  db.config.updateOne({ _id: patch._id }, { $set: { value: patch.value } }, { upsert: true });
}
db.cache.deleteOne({ _id: "ui-local-cache-hash" });
print("OK: chart colors (" + data.length + ")");
