// Clear stale RX/temp VP cache (after index columns fixed to VP-only)
print("=== patch-rx-temp-refresh ===");

const cleared = db.devices.updateMany(
  {},
  { $unset: { "VirtualParameters.RXPower": "", "VirtualParameters.gettemp": "" } }
);
print("Cleared RX/temp VP cache on", cleared.modifiedCount, "devices");

db.cache.deleteMany({});
print("=== patch-rx-temp-refresh done ===");
