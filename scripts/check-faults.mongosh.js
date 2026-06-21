print("Total faults:", db.faults.countDocuments());
print("too_many_rpcs:", db.faults.countDocuments({ code: "too_many_rpcs" }));
const latest = db.faults.find().sort({ timestamp: -1 }).limit(3).toArray();
latest.forEach((f) => {
  print("Latest:", f.code, f.channel, new Date(f.timestamp).toISOString());
});
const after = db.faults.countDocuments({ timestamp: { $gt: new Date("2026-06-20T09:24:00Z") } });
print("Faults after deploy (09:24 UTC):", after);
