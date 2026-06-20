// Display MAC — skip invalid all-zero, prefer routed WAN
let m = "";

function okMac(v) {
  if (!v) return false;
  v = String(v).trim().toLowerCase();
  return v !== "" && v !== "00:00:00:00:00:00" && v !== "0:0:0:0:0:0";
}

if (args[1].value) {
  m = args[1].value[0];
} else {
  let keys = [
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.MACAddress",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.MACAddress",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.MACAddress",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.MACAddress",
    "InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MACAddress",
    "InternetGatewayDevice.DeviceInfo.X_CU_SerialNumber",
  ];

  for (let key of keys) {
    if (key.includes("WANPPPConnection.1.MACAddress")) {
      let ct = declare(key.replace("MACAddress", "ConnectionType"), { value: Date.now() });
      if (ct.size && ct.value[0] === "PPPoE_Bridged") continue;
    }
    let d = declare(key, { value: Date.now() });
    for (let item of d) {
      if (okMac(item.value && item.value[0])) {
        m = item.value[0];
        break;
      }
    }
    if (m) break;
  }
}

return { writable: false, value: [m, "xsd:string"] };
