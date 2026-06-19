const fs = require("fs");
const script = fs.readFileSync("/tmp/WlanPassword.js", "utf8");
db.virtualParameters.updateOne({ _id: "WlanPassword" }, { $set: { script } });
print("OK: WlanPassword updated");

const patches = JSON.parse(fs.readFileSync("/tmp/config-patches.json", "utf8"));
for (const p of patches) {
  db.config.updateOne({ _id: p._id }, { $set: { value: p.value } }, { upsert: true });
}
print("OK: config patches (" + patches.length + ")");

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
print("OK: auto WLAN patches (" + autoWlan + ")");
db.cache.deleteOne({ _id: "ui-local-cache-hash" });
