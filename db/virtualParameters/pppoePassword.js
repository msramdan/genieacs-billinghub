// PPPoE Password — preserve ACS-set values (CPE often returns blank per TR-069)
let pw = "";

if (args[1].value) {
  pw = args[1].value[0] != null ? String(args[1].value[0]) : "";
  declare("InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Password", null, {
    value: pw,
  });
} else {
  const keys = [
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.5.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password",
    "InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Password",
  ];
  pw = getParameterValue(keys);
}

return { writable: true, value: [pw, "xsd:string"] };

function getParameterValue(keys) {
  for (const key of keys) {
    if (key.includes("WANPPPConnection.1.Password")) {
      const connectionTypeKey = key.replace("Password", "ConnectionType");
      const connectionType = declare(connectionTypeKey, { value: 1 });
      if (connectionType.size && connectionType.value[0] === "PPPoE_Bridged") {
        continue;
      }
    }
    const d = declare(key, { value: 1 });
    for (const item of d) {
      if (item.value && item.value[0]) return String(item.value[0]);
    }
  }
  return "";
}
