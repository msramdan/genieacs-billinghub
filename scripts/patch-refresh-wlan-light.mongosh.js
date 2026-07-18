// Slim refresh-wlan + stagger RX/temp in inform — deploy after updating JS files in repo
const fs = require("fs");
const root = process.env.BILLINGHUB_ROOT || ".";
const rw = path.join(root, "db/provisions/refresh-wlan.js");
const inf = process.env.INFORM_PATH || path.join(root, "db/provisions/inform.js");

if (fs.existsSync(rw)) {
  db.provisions.updateOne({ _id: "refresh-wlan" }, { $set: { script: fs.readFileSync(rw, "utf8") } });
  print("OK refresh-wlan updated");
}
if (fs.existsSync(inf)) {
  db.provisions.updateOne({ _id: "inform" }, { $set: { script: fs.readFileSync(inf, "utf8") } });
  print("OK inform updated");
}

const cleared = db.faults.deleteMany({ code: { $in: ["too_many_rpcs", "too_many_commits"] } }).deletedCount;
print("Cleared faults:", cleared);
