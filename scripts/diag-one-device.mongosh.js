const d = db.devices.findOne({
  "VirtualParameters.pppoeUsername2._value": "Vlan-Relief",
});
if (!d) {
  print("NOT FOUND");
  quit(1);
}
print("_id:", d._id);
print("Mfr:", d.DeviceID?.Manufacturer?._value);
print("PC:", d.DeviceID?.ProductClass?._value);
const vp = d.VirtualParameters || {};
print("VP RX:", vp.RXPower?._value, "| ts:", vp.RXPower?._timestamp);
print("VP Temp:", vp.gettemp?._value, "| ts:", vp.gettemp?._timestamp);
print("VP PON:", vp.getponmode?._value);

const w = d.InternetGatewayDevice?.WANDevice?.["1"] || {};
const paths = [
  ["CT EPON", w.X_CT-COM_EponInterfaceConfig?.RXPower?._value],
  ["CT GPON", w.X_CT-COM_GponInterfaceConfig?.RXPower?._value],
  ["ZTE", w.X_ZTE-COM_WANPONInterfaceConfig?.RXPower?._value],
  ["HW GPON", w.X_GponInterafceConfig?.RXPower?._value],
  ["Optical", w.X_CMCC_EponInterfaceConfig?.RXPower?._value],
];
print("\nRaw RX paths:");
for (const [k, v] of paths) print(" ", k + ":", v ?? "-");

print("\nFaults:");
db.faults.find({ device: d._id }).sort({ timestamp: -1 }).limit(5).forEach((f) => {
  print(" ", f.code, new Date(f.timestamp).toISOString());
});

print("\nRecent tasks (RX/temp):");
db.tasks.find({ device: d._id, parameter: /RXPower|gettemp/ }).sort({ timestamp: -1 }).limit(5).forEach((t) => {
  print(" ", t.parameter, t.status || "-", new Date(t.timestamp).toISOString());
});
