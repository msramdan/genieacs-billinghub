// PPPoE Password — writable, reads all WAN slots
let pw = "";

if (args[1].value) {
  pw = args[1].value[0];
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Password", null, {
    value: pw,
  });
} else {
  let keys = [
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Password",
  ];
  pw = getParameterValue(keys);
}

return { writable: true, value: [pw, "xsd:string"] };

function getParameterValue(keys) {
  for (let key of keys) {
    if (key.includes("WANPPPConnection.1.Password")) {
      let connectionTypeKey = key.replace("Password", "ConnectionType");
      let connectionType = declare(connectionTypeKey, { value: Date.now() });
      if (connectionType.size && connectionType.value[0] === "PPPoE_Bridged") {
        continue;
      }
    }
    let d = declare(key, { path: Date.now() - 120 * 1000, value: Date.now() });
    for (let item of d) {
      if (item.value && item.value[0]) return item.value[0];
    }
  }
  return "";
}
