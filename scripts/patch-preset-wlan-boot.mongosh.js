// Ensure refresh-wlan runs every Inform (phased light script — fills SSID-LIST without Summon)
db.presets.updateOne(
  { _id: "refresh-wlan" },
  {
    $set: {
      weight: 1,
      channel: "default",
      precondition: "",
      events: {},
      configurations: [{ type: "provision", name: "refresh-wlan", args: null }],
    },
  },
  { upsert: true }
);
print("OK refresh-wlan preset -> every inform (phased)");
