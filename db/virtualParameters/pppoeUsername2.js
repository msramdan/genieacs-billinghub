// pppoe User (index page) — fallback when WAN PPPoE username is missing
let result = "";

if ("value" in args[1]) {
  result = args[1].value[0];
}

if (result === "") {
  let keys = [
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username",
    "InternetGatewayDevice.WANDevice.*.WANConnectionDevice.1.WANPPPConnection.2.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.2.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.2.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.2.Username",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.5.WANPPPConnection.1.Username",
    "InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANPPPConnection.*.Username",
  ];

  result = getParameterValue(keys);
}

if (result === "") {
  let altKeys = [
    "InternetGatewayDevice.X_CT-COM_UserInfo.UserName",
    "InternetGatewayDevice.X_CU_UserInfo.UserName",
    "InternetGatewayDevice.X_CMCC_UserInfo.ServiceName",
    "InternetGatewayDevice.X_CMCC_UserInfo.UserName",
    "InternetGatewayDevice.DeviceInfo.X_HW_ServiceInfo.UserName",
  ];

  result = getParameterValue(altKeys, true);
}

if (result === "") {
  let vp = declare("VirtualParameters.pppoeUsername", { value: Date.now() });
  if (vp.size && vp.value[0]) {
    result = vp.value[0];
  }
}

if (result === "") {
  let sn = declare("DeviceID.SerialNumber", { value: 1 });
  if (sn.value && sn.value[0]) {
    result = sn.value[0];
  }
}

if (result === "") {
  let oui = declare("DeviceID.OUI", { value: 1 }).value[0];
  let pc = declare("DeviceID.ProductClass", { value: 1 }).value[0];
  let serial = declare("DeviceID.SerialNumber", { value: 1 }).value[0];
  if (oui && pc && serial) {
    result = oui + "-" + pc + "-" + serial;
  }
}

return { writable: false, value: [result, "xsd:string"] };

function isGenericUsername(value) {
  if (!value) return true;
  let v = String(value).trim().toLowerCase();
  return v === "" || v === "default" || v === "admin" || v === "root" || v === "user";
}

function getParameterValue(keys, skipGeneric) {
  for (let key of keys) {
    if (key.includes("WANPPPConnection.1.Username")) {
      let connectionTypeKey = key.replace("Username", "ConnectionType");
      let connectionType = declare(connectionTypeKey, { value: Date.now() });
      if (connectionType.size && connectionType.value[0] === "PPPoE_Bridged") {
        continue;
      }
    }

    let d = declare(key, { path: Date.now() - 120 * 1000, value: Date.now() });

    for (let item of d) {
      if (!item.value || !item.value[0]) continue;
      if (skipGeneric && isGenericUsername(item.value[0])) continue;
      return item.value[0];
    }
  }

  return "";
}
