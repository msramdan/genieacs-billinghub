// Mac Address PPPoE — all WAN slots, skip invalid MAC
let m = "";

function okMac(v) {
  if (!v) return false;
  v = String(v).trim().toLowerCase();
  return v !== "" && v !== "00:00:00:00:00:00";
}

let keys = [
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.MACAddress",
];

for (let key of keys) {
  let ct = declare(key.replace("MACAddress", "ConnectionType"), { value: Date.now() });
  if (ct.size && ct.value[0] === "PPPoE_Bridged") continue;
  let d = declare(key, { value: Date.now() });
  for (let p of d) {
    if (okMac(p.value && p.value[0])) {
      m = p.value[0];
      break;
    }
  }
  if (m) break;
}

return { writable: false, value: [m, "xsd:string"] };
