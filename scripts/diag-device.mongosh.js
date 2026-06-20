// Generic device diagnostic — no hardcoded IDs
// Usage: DEVICE_ID='SERIAL%2DMODEL-xxx' mongosh genieacs --quiet scripts/diag-device.mongosh.js
// Or:    mongosh genieacs --quiet scripts/diag-device.mongosh.js --eval "var DEVICE_ID='...'"

const id = process.env.DEVICE_ID || (typeof DEVICE_ID !== "undefined" ? DEVICE_ID : "");
if (!id) {
  print("Usage: DEVICE_ID='<encoded-device-id>' mongosh genieacs --quiet scripts/diag-device.mongosh.js");
  print("Tip: copy ID from UI URL after #!/devices/<ID>");
  quit(1);
}

const d = db.devices.findOne({ _id: id });
if (!d) {
  print("NOT FOUND:", id);
  quit(1);
}

print("DeviceID:", d.DeviceID?.Manufacturer?._value, d.DeviceID?.ProductClass?._value);
print("Serial:", d.DeviceID?.SerialNumber?._value);
print("Last Inform:", d._lastInform ? new Date(d._lastInform).toISOString() : "-");

const w1 = d?.InternetGatewayDevice?.LANDevice?.["1"]?.WLANConfiguration?.["1"];
print("\n--- WLAN 1 ---");
print("SSID:", w1?.SSID?._value || "-");
print("TotalAssociations:", w1?.TotalAssociations?._value ?? "-");

const ad = w1?.AssociatedDevice || {};
let adN = 0;
print("\n--- AssociatedDevice ---");
for (const k of Object.keys(ad).filter((x) => !x.startsWith("_")).sort((a, b) => Number(a) - Number(b))) {
  const r = ad[k];
  const ip = r?.AssociatedDeviceIPAddress?._value;
  const mac = r?.AssociatedDeviceMACAddress?._value;
  if (ip || mac) {
    adN++;
    print(" slot", k, "IP:", ip || "-", "MAC:", mac || "-");
  }
}
if (!adN) print(" (empty — ONT may use LAN Host only)");

const hosts = d?.InternetGatewayDevice?.LANDevice?.["1"]?.Hosts?.Host || {};
let hN = 0;
let wN = 0;
print("\n--- Hosts.Host (LAN DHCP) ---");
for (const k of Object.keys(hosts).filter((x) => !x.startsWith("_")).sort((a, b) => Number(a) - Number(b))) {
  const r = hosts[k];
  const ip = r?.IPAddress?._value;
  const mac = r?.MACAddress?._value;
  const type = r?.InterfaceType?._value || "";
  if (!ip && !mac) continue;
  hN++;
  const wifi = type === "802.11" || (!type && ip && !String(ip).startsWith("10."));
  if (wifi) wN++;
  print(
    " slot", k,
    "IP:", ip || "-",
    "MAC:", mac || "-",
    "Type:", type || "-",
    wifi ? "[wifi-lan]" : "[other]"
  );
}

print("\n--- Summary ---");
print("Connected (TotalAssociations):", w1?.TotalAssociations?._value ?? "-");
print("AD rows with data:", adN);
print("LAN Host rows:", hN, "| WiFi-like (excl guest 10.x):", wN);
if (w1?.TotalAssociations?._value > 0 && adN === 0) {
  print("=> Wifi Connected should use LAN Host fallback table");
} else if (w1?.TotalAssociations?._value > adN && adN > 0) {
  print("=> AD incomplete — supplemental LAN Host table should appear");
}

const faults = db.faults.find({ device: id }).limit(5).toArray();
if (faults.length) {
  print("\n--- Recent faults ---");
  faults.forEach((f) => print(" ", f.code || f.message, f.timestamp));
}
