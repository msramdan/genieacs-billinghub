// Move refresh-wlan off every inform — WiFi client refresh on boot only (VP activedevices still updates via inform)
db.presets.updateOne(
  { _id: "refresh-wlan" },
  {
    $set: {
      weight: 1,
      channel: "default",
      precondition: "",
      events: { "0 BOOTSTRAP": true, "1 BOOT": true },
      configurations: [{ type: "provision", name: "refresh-wlan", args: null }],
    },
  }
);
print("OK refresh-wlan preset -> BOOT only (not every inform)");

const n = db.faults.deleteMany({ code: { $in: ["too_many_rpcs", "too_many_commits"] } }).deletedCount;
print("Cleared faults:", n);
