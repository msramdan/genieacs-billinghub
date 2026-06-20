/**
 * Full index column fallbacks — merged from beryindo VP paths + BillingHub slot 4/5 fixes.
 * Run on server: INFORM_PATH=/tmp/inform.patched.js mongosh genieacs --quiet patch-index-full-fallbacks.mongosh.js
 */
const fs = require("fs");

const W = "InternetGatewayDevice.WANDevice.1.WANConnectionDevice";
const PPP = (s, f) => W + "." + s + ".WANPPPConnection.1." + f;
const IPC = (s, f) => W + "." + s + ".WANIPConnection.1." + f;
const WLAN = (s, f) =>
  "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + s + "." + f;

function coalesce() {
  return "COALESCE(" + Array.prototype.join.call(arguments, ", ") + ")";
}

// Priority: slot 4/3/2/1/5 (ZICG M22X uses slot 4, F663 slot 3)
const PPP_USER = coalesce(
  "VirtualParameters.pppoeUsername2",
  "VirtualParameters.pppoeUsername",
  PPP(4, "Username"),
  PPP(3, "Username"),
  PPP(2, "Username"),
  PPP(1, "Username"),
  PPP(5, "Username"),
  "InternetGatewayDevice.X_CT-COM_UserInfo.UserName",
  "InternetGatewayDevice.X_CU_UserInfo.UserName",
  "InternetGatewayDevice.X_CMCC_UserInfo.UserName",
  "InternetGatewayDevice.DeviceInfo.X_HW_ServiceInfo.UserName",
  "DeviceID.SerialNumber"
);

const PPP_IP = coalesce(
  "VirtualParameters.pppoeIP",
  PPP(4, "ExternalIPAddress"),
  PPP(3, "ExternalIPAddress"),
  PPP(2, "ExternalIPAddress"),
  PPP(1, "ExternalIPAddress"),
  PPP(5, "ExternalIPAddress")
);

const TR069_IP = coalesce(
  "VirtualParameters.IPTR069",
  IPC(1, "ExternalIPAddress"),
  IPC(2, "ExternalIPAddress"),
  IPC(3, "ExternalIPAddress"),
  IPC(4, "ExternalIPAddress"),
  IPC(5, "ExternalIPAddress"),
  PPP(3, "ExternalIPAddress"),
  PPP(4, "ExternalIPAddress"),
  PPP(2, "ExternalIPAddress"),
  PPP(1, "ExternalIPAddress")
);

const SSID = coalesce(
  "VirtualParameters.getSSID",
  WLAN(1, "SSID"),
  WLAN(2, "SSID"),
  WLAN(3, "SSID"),
  WLAN(4, "SSID"),
  WLAN(5, "SSID"),
  WLAN(6, "SSID"),
  WLAN(7, "SSID"),
  WLAN(8, "SSID")
);

const ACTIVE = coalesce(
  "VirtualParameters.activedevices",
  WLAN(1, "TotalAssociations"),
  WLAN(2, "TotalAssociations"),
  WLAN(3, "TotalAssociations"),
  WLAN(4, "TotalAssociations"),
  WLAN(5, "TotalAssociations"),
  WLAN(6, "TotalAssociations"),
  WLAN(7, "TotalAssociations"),
  WLAN(8, "TotalAssociations"),
  WLAN(1, "WLAN_AssociatedDeviceNumberOfEntries"),
  WLAN(2, "WLAN_AssociatedDeviceNumberOfEntries")
);

const RX = coalesce(
  "VirtualParameters.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_CMCC_GponInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower",
  "InternetGatewayDevice.X_ALU_OntOpticalParam.RXPower"
);

const TEMP = coalesce(
  "VirtualParameters.gettemp",
  "InternetGatewayDevice.DeviceInfo.Temperature",
  "InternetGatewayDevice.DeviceInfo.X_CT-COM_Temperature",
  "InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANPONInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_CMCC_GponInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_FH_GponInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.1.X_CU_WANEPONInterfaceConfig.OpticalTransceiver.Temperature",
  "InternetGatewayDevice.WANDevice.1.X_CU_WANGPONInterfaceConfig.OpticalTransceiver.Temperature"
);

const UPTIME = coalesce(
  "VirtualParameters.getdeviceuptime",
  "VirtualParameters.getpppuptime",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  PPP(3, "Uptime"),
  PPP(4, "Uptime"),
  PPP(2, "Uptime"),
  PPP(1, "Uptime")
);

const PON = coalesce(
  "VirtualParameters.getponmode",
  "InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.WANAccessType",
  "InternetGatewayDevice.DeviceInfo.X_HW_UpPortMode"
);

const MAC = coalesce(
  "VirtualParameters.displayMac",
  "VirtualParameters.PonMac",
  "VirtualParameters.pppoeMac",
  PPP(4, "MACAddress"),
  PPP(3, "MACAddress"),
  PPP(2, "MACAddress"),
  PPP(1, "MACAddress"),
  PPP(5, "MACAddress"),
  "InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MACAddress",
  "InternetGatewayDevice.DeviceInfo.X_CU_SerialNumber"
);

const SN = coalesce(
  "VirtualParameters.getSerialNumber",
  "DeviceID.SerialNumber",
  "InternetGatewayDevice.DeviceInfo.X_HW_SerialNumber",
  "InternetGatewayDevice.DeviceInfo.SerialNumber"
);

const patches = [
  { _id: "ui.index.3.parameter", value: PON },
  { _id: "ui.index.4.parameter", value: PPP_USER },
  { _id: "ui.index.5.parameter", value: SSID },
  { _id: "ui.index.6.parameter", value: ACTIVE },
  { _id: "ui.index.7.parameter", value: RX },
  { _id: "ui.index.8.parameter", value: TEMP },
  { _id: "ui.index.9.parameter", value: UPTIME },
  { _id: "ui.index.10.parameter", value: PPP_IP },
  { _id: "ui.index.11.parameter", value: TR069_IP },
  { _id: "ui.index.12.parameter", value: SN },
  { _id: "ui.index.13.parameter", value: MAC },
  {
    _id: "ui.index.10.element.attributes.href",
    value: '"http://"||ENCODEURICOMPONENT(' + PPP_IP + ")",
  },
  {
    _id: "ui.index.11.element.attributes.href",
    value: '"http://"||ENCODEURICOMPONENT(' + TR069_IP + ")",
  },
  { _id: "ui.device.1.components.0.parameters.14.parameter", value: PPP_USER },
  { _id: "ui.device.1.components.0.parameters.16.parameter", value: PPP_IP },
  { _id: "ui.device.1.components.0.parameters.17.parameter", value: TR069_IP },
  { _id: "ui.device.1.components.0.parameters.23.parameter", value: SSID },
  { _id: "ui.device.1.components.0.parameters.22.parameter", value: "VirtualParameters.activedevices" },
  { _id: "ui.device.1.components.0.parameters.7.parameter", value: MAC },
];

for (const p of patches) {
  db.config.updateOne({ _id: p._id }, { $set: { value: p.value } }, { upsert: true });
  print("OK", p._id);
}

// Sync all beryindo virtual parameters from uploaded JSON
const vpJson = process.env.VP_JSON || "/tmp/virtualParameters-all.json";
if (fs.existsSync(vpJson)) {
  const vps = JSON.parse(fs.readFileSync(vpJson, "utf8"));
  for (const vp of vps) {
    db.virtualParameters.updateOne({ _id: vp._id }, { $set: { script: vp.script } }, { upsert: true });
  }
  print("OK virtualParameters:", vps.length);
} else {
  print("WARN VP JSON not found:", vpJson);
}

// Local VP overrides (BillingHub improvements) — skip getSSID (reverted; use beryindo export)
const vpSkip = new Set(["getSSID"]);
const vpDir = process.env.VP_DIR || "/tmp/vp";
if (fs.existsSync(vpDir)) {
  for (const file of fs.readdirSync(vpDir).filter((f) => f.endsWith(".js"))) {
    const id = file.replace(".js", "");
    if (vpSkip.has(id)) continue;
    db.virtualParameters.updateOne(
      { _id: id },
      { $set: { script: fs.readFileSync(vpDir + "/" + file, "utf8") } },
      { upsert: true }
    );
    print("OK VP override:", id);
  }
} else {
  print("SKIP VP dir:", vpDir);
}

const informPath = process.env.INFORM_PATH || "/tmp/inform.patched.js";
if (fs.existsSync(informPath)) {
  db.provisions.updateOne({ _id: "inform" }, { $set: { script: fs.readFileSync(informPath, "utf8") } });
  print("OK inform");
}

db.config.updateOne({ _id: "cwmp.maxCommitIterations" }, { $set: { value: "256" } }, { upsert: true });
db.config.updateOne({ _id: "cwmp.gpvBatchSize" }, { $set: { value: "128" } }, { upsert: true });

db.faults.deleteMany({});
db.cache.deleteMany({});

print("\n=== Device column audit ===");
db.devices.find({}).forEach((d) => {
  const id = d._id;
  const igd = d.InternetGatewayDevice || {};
  const wan = igd.WANDevice?.["1"]?.WANConnectionDevice || {};
  const getPpp = (s, f) => wan[s]?.WANPPPConnection?.["1"]?.[f]?._value || "";
  const wlan1 = igd.LANDevice?.["1"]?.WLANConfiguration?.["1"];
  const vp = d.VirtualParameters || {};

  const idVal =
    vp.pppoeUsername2?._value ||
    getPpp("4", "Username") ||
    getPpp("3", "Username") ||
    d.DeviceID?.SerialNumber?._value ||
    "-";
  const ipVal = vp.pppoeIP?._value || getPpp("4", "ExternalIPAddress") || getPpp("3", "ExternalIPAddress") || "-";
  const ssidVal = vp.getSSID?._value || wlan1?.SSID?._value || "-";
  const rxVal =
    vp.RXPower?._value ||
    igd.WANDevice?.["1"]?.["X_CT-COM_EponInterfaceConfig"]?.RXPower?._value ||
    "-";

  print(
    id.substring(0, 38).padEnd(38),
    "| ID:", String(idVal).substring(0, 22),
    "| IP:", ipVal,
    "| SSID:", String(ssidVal).substring(0, 18),
    "| RX:", rxVal
  );
});

print("\nDONE patch-index-full-fallbacks");
