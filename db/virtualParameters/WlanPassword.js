// WLAN Password — multi-vendor, all SSID indices (ZTE/Huawei/FH/CMCC/TR-181)
let m = "";

function setPassword(value) {
  for (let i = 1; i <= 8; i++) {
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.KeyPassphrase",
      null,
      { value: value }
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".KeyPassphrase",
      null,
      { value: value }
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.PreSharedKey",
      null,
      { value: value }
    );
    declare("Device.WiFi.AccessPoint." + i + ".Security.KeyPassphrase", null, { value: value });
    declare("Device.WiFi.AccessPoint." + i + ".Security.PreSharedKey", null, { value: value });
  }
}

if (args[1].value) {
  m = args[1].value[0];
  setPassword(m);
} else {
  let wildcards = [
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.PreSharedKey.1.KeyPassphrase",
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.KeyPassphrase",
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.PreSharedKey.1.PreSharedKey",
    "Device.WiFi.AccessPoint.*.Security.KeyPassphrase",
    "Device.WiFi.AccessPoint.*.Security.PreSharedKey",
  ];

  for (let wp of wildcards) {
    for (let item of declare(wp, { value: Date.now() })) {
      if (item.value && item.value[0]) {
        m = item.value[0];
        break;
      }
    }
    if (m) break;
  }

  if (!m) {
    let paths = [];
    for (let i = 1; i <= 8; i++) {
      paths.push(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.KeyPassphrase"
      );
      paths.push(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".KeyPassphrase"
      );
      paths.push(
        "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.PreSharedKey"
      );
      paths.push("Device.WiFi.AccessPoint." + i + ".Security.KeyPassphrase");
      paths.push("Device.WiFi.AccessPoint." + i + ".Security.PreSharedKey");
    }

    for (let p of paths) {
      let v = declare(p, { value: Date.now() });
      if (v.size && v.value[0]) {
        m = v.value[0];
        break;
      }
    }
  }
}

return { writable: true, value: [m, "xsd:string"] };
