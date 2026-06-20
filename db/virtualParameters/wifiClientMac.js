// MAC for Wifi Connected — AD MAC, fallback lookup LAN Hosts by IP
let mac = "";
let base = String(args[0] || "").replace(/\.VirtualParameters\.wifiClientMac.*$/, "");

if (base) {
  let macD = declare(base + ".AssociatedDeviceMACAddress", { value: 1 });
  if (macD.size && macD.value[0]) mac = macD.value[0];
}

if (!mac && base) {
  let ipD = declare(base + ".AssociatedDeviceIPAddress", { value: 1 });
  let ipVal = ipD.size && ipD.value[0] ? String(ipD.value[0]) : "";
  if (ipVal) {
    let ips = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress", { value: 1 });
    let macs = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress", { value: 1 });
    for (let i = 0; i < ips.size; i++) {
      if (ips.value[i] === ipVal && macs.value[i]) {
        mac = macs.value[i];
        break;
      }
    }
  }
}

return { writable: false, value: [mac, "xsd:string"] };
