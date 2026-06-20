// WLAN Password — preserve ACS-set values (CPE often returns blank per TR-069)
let m = "";

function cleanPassword(v) {
  if (v == null || v === undefined) return "";
  const s = String(v).trim();
  if (!s || s === "(write-only)" || s === "blank" || s === "(hidden)") return "";
  return s;
}

function setPassword(value) {
  const pw = cleanPassword(value);
  if (!pw) return;
  for (let i = 1; i <= 8; i++) {
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.KeyPassphrase",
      null,
      { value: pw }
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".KeyPassphrase",
      null,
      { value: pw }
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.PreSharedKey",
      null,
      { value: pw }
    );
    declare("Device.WiFi.AccessPoint." + i + ".Security.KeyPassphrase", null, { value: pw });
    declare("Device.WiFi.AccessPoint." + i + ".Security.PreSharedKey", null, { value: pw });
  }
}

function readCached() {
  const wildcards = [
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.PreSharedKey.1.KeyPassphrase",
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.KeyPassphrase",
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.PreSharedKey.1.PreSharedKey",
    "Device.WiFi.AccessPoint.*.Security.KeyPassphrase",
    "Device.WiFi.AccessPoint.*.Security.PreSharedKey",
  ];

  for (const wp of wildcards) {
    const d = declare(wp, { value: 1 });
    for (const item of d) {
      const pw = cleanPassword(item.value && item.value[0]);
      if (pw) return pw;
    }
  }

  for (let i = 1; i <= 8; i++) {
    const paths = [
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.KeyPassphrase",
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".KeyPassphrase",
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".PreSharedKey.1.PreSharedKey",
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".X_CT-COM_WPSKeyWord",
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + i + ".X_ZTE-COM_Password",
      "Device.WiFi.AccessPoint." + i + ".Security.KeyPassphrase",
      "Device.WiFi.AccessPoint." + i + ".Security.PreSharedKey",
    ];
    for (const p of paths) {
      const v = declare(p, { value: 1 });
      const pw = cleanPassword(v.size && v.value[0]);
      if (pw) return pw;
    }
  }
  return "";
}

// User SET via ACS UI / task
if (args[1].value) {
  m = cleanPassword(args[1].value[0]);
  if (m) setPassword(m);
} else {
  m = readCached();
}

return { writable: true, value: [m, "xsd:string"] };
