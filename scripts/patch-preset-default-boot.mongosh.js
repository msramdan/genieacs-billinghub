// default provision runs only on boot — avoid too_many_rpcs when combined with inform on every periodic
db.presets.updateOne(
  { _id: "default" },
  {
    $set: {
      weight: 0,
      channel: "default",
      precondition: "",
      events: { "0 BOOTSTRAP": true, "1 BOOT": true },
      configurations: [{ type: "provision", name: "default", args: null }],
    },
  }
);
print("OK default preset -> BOOT only");

// inform runs every session (periodic inform)
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
  }
);
print("OK inform preset -> every inform");

db.config.updateOne({ _id: "cwmp.gpvBatchSize" }, { $set: { value: "128" } }, { upsert: true });
print("OK cwmp.gpvBatchSize=128");

const fs = require("fs");
const informPath = process.env.INFORM_PATH || "/tmp/inform.patched.js";
if (fs.existsSync(informPath)) {
  db.provisions.updateOne({ _id: "inform" }, { $set: { script: fs.readFileSync(informPath, "utf8") } });
  print("OK inform script updated");
}

db.faults.deleteMany({});
print("Cleared all faults:", db.faults.countDocuments());

db.cache.deleteMany({ _id: { $in: ["cwmp-local-cache-hash", "ui-local-cache-hash"] } });
print("OK cache cleared");
