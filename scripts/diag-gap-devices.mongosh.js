const ids = [
  "A4F33B-M22X%20XPON-ZICG296A055",
  "1C25E1-MQ220-CIOT107C1AD8",
];
for (const id of ids) {
  const d = db.devices.findOne({ _id: id });
  if (!d) { print("NOT FOUND:", id); continue; }
  const vp = d.VirtualParameters || {};
  const un = vp.pppoeUsername2?._value || vp.pppoeUsername?._value || id;
  print("\n=== " + un + " ===");
  print("id:", id);
  print("ProductClass:", d.DeviceID?.ProductClass?._value || "(empty)");
  print("Manufacturer:", d.DeviceID?.Manufacturer?._value || "(empty)");
  print("VP RX:", vp.RXPower?._value ?? "(empty)", "| age:", vp.RXPower?._timestamp ? Math.round((Date.now()-vp.RXPower._timestamp)/60000)+"m" : "-");
  print("VP Temp:", vp.gettemp?._value ?? "(empty)");
  print("VP PON:", vp.getponmode?._value ?? "(empty)");
  print("Last inform:", d._lastInform ? Math.round((Date.now()-d._lastInform)/60000)+"m ago" : "-");
  const faults = db.faults.find({ device: id, code: /too_many_rpcs/ }).limit(2).toArray();
  print("too_many_rpcs:", faults.length ? faults.map(f=>new Date(f.timestamp).toISOString()).join(", ") : "none");
}

print("\n=== VP script sizes ===");
["RXPower","gettemp","getponmode"].forEach(n => {
  const v = db.virtualParameters.findOne({_id:n});
  print(n + ":", v ? (v.script||"").length + " chars" : "MISSING");
});
