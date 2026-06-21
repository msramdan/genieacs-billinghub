const r = db.provisions.findOne({ _id: "refresh-wlan" });
print("refresh-wlan len:", r.script.length);
print("has max 8 slots:", r.script.indexOf("maxSlot, 8") >= 0 || r.script.indexOf(", 8)") >= 0);
print("snippet:", r.script.substring(0, 120));

const d = db.provisions.findOne({ _id: "default" });
print("default len:", d.script.length);

const inf = db.provisions.findOne({ _id: "inform" });
print("inform len:", inf.script.length);
print("inform has stagger RX:", inf.script.indexOf("RXPower") >= 0);
print("inform always RX at end:", /declare\("VirtualParameters\.RXPower".*\ndeclare\("VirtualParameters\.gettemp"/.test(inf.script));
