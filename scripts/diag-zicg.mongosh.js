const d = db.devices.findOne({ _id: /ZICG296A055/ });
if (!d) { print("NOT FOUND"); quit(1); }
print("_id:", d._id);
print("Registered:", d.Events?.Registered?._value);
const vp = d.VirtualParameters || {};
print("Username:", vp.pppoeUsername2?._value || vp.pppoeUsername?._value || "-");
print("VP RX/Temp/PON:", vp.RXPower?._value, vp.gettemp?._value, vp.getponmode?._value);
print("Has IGD:", !!d.InternetGatewayDevice);
print("Has DeviceID:", !!d.DeviceID, d.DeviceID?.ProductClass?._value, d.DeviceID?.Manufacturer?._value);

const faults = db.faults.find({ device: d._id }).sort({ timestamp: -1 }).limit(8).toArray();
print("\nFaults (" + faults.length + "):");
faults.forEach((f) => print(" ", f.code, f.message || "", new Date(f.timestamp).toISOString()));

const tasks = db.tasks.find({ device: d._id }).sort({ timestamp: -1 }).limit(8).toArray();
print("\nRecent tasks:");
tasks.forEach((t) => print(" ", t.name || t.parameter, t.status || t.code || "-"));
