// TR069 / Connection Request IP — BillingHub ACS
let result = "";

if ("value" in args[1]) {
  result = args[1].value[0];
}

function extractHostFromUrl(url) {
  if (!url) return "";
  let match = String(url).match(/https?:\/\/([^:/]+)/i);
  if (!match || !match[1]) return "";
  let host = match[1];
  if (host === "0.0.0.0" || host === "127.0.0.1") return "";
  return host;
}

function getParameterValue(keys) {
  for (let key of keys) {
    if (key.includes("ExternalIPAddress")) {
      let connectionTypeKey = key.replace("ExternalIPAddress", "ConnectionType");
      let connectionType = declare(connectionTypeKey, { value: Date.now() });
      if (connectionType.size && connectionType.value[0] === "bridge") {
        continue;
      }
    }

    let d = declare(key, { path: Date.now() - 120000, value: Date.now() });

    for (let item of d) {
      if (item.value && item.value[0] && item.value[0] !== "0.0.0.0") {
        return item.value[0];
      }
    }
  }
  return "";
}

if (!result || result === "0.0.0.0") {
  let crUrls = [
    "InternetGatewayDevice.ManagementServer.ConnectionRequestURL",
    "Device.ManagementServer.ConnectionRequestURL",
  ];
  for (let crKey of crUrls) {
    let cr = declare(crKey, { value: Date.now() });
    if (cr.size && cr.value[0]) {
      result = extractHostFromUrl(cr.value[0]);
      if (result) break;
    }
  }
}

if (!result || result === "0.0.0.0") {
  let keys = [
    "InternetGatewayDevice.WANDevice.*.WANConnectionDevice.*.WANIPConnection.*.ExternalIPAddress",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.2.ExternalIPAddress",
    "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANIPConnection.1.ExternalIPAddress",
    "Device.IP.Interface.1.IPv4Address.1.IPAddress",
  ];
  result = getParameterValue(keys);
}

if (!result || result === "0.0.0.0") {
  let ppp = declare("VirtualParameters.pppoeIP", { value: Date.now() });
  if (ppp.size && ppp.value[0]) {
    result = ppp.value[0];
  }
}

return { writable: false, value: [result, "xsd:string"] };
