// List devices with missing VP values (RX, Temp, PON)
const all = db.devices.find({}).toArray();
const now = Date.now();
let online = 0, missRx = 0, missTemp = 0, missPon = 0;

print("Total devices: " + all.length);
print("\n--- Devices with gaps ---");
for (const d of all) {
  const vp = d.VirtualParameters || {};
  const rx = vp.RXPower?._value;
  const temp = vp.gettemp?._value;
  const pon = vp.getponmode?._value;
  const id = d._id;
  const pc = d.DeviceID?.ProductClass?._value || "?";
  const mfr = d.DeviceID?.Manufacturer?._value || "?";
  const lastMs = d._lastInform || 0;
  const ageMin = lastMs ? Math.round((now - lastMs) / 60000) : 9999;
  if (ageMin < 60) online++;

  const gaps = [];
  if (!rx || rx === "N/A") { missRx++; gaps.push("RX"); }
  if (!temp || temp === "N/A") { missTemp++; gaps.push("Temp"); }
  if (!pon) { missPon++; gaps.push("PON"); }
  if (gaps.length) {
    const un = vp.pppoeUsername2?._value || vp.pppoeUsername?._value || id.slice(0, 30);
    print(un + " | " + mfr + " " + pc + " | miss:" + gaps.join(",") + " | inform:" + ageMin + "m ago");
  }
}
print("\n--- Summary ---");
print("Informed <60m: " + online + "/" + all.length);
print("Missing RX: " + missRx + "/" + all.length);
print("Missing Temp: " + missTemp + "/" + all.length);
print("Missing PON: " + missPon + "/" + all.length);
print("too_many_rpcs faults: " + db.faults.countDocuments({ code: /too_many_rpcs/ }));
