// IP for Wifi Connected — AD IP, fallback lookup LAN Hosts by MAC
let ip = "";
let base = String(args[0] || "").replace(/\.VirtualParameters\.wifiClientIP.*$/, "");

if (base) {
  let ipD = declare(base + ".AssociatedDeviceIPAddress", { value: 1 });
  if (ipD.size && ipD.value[0]) ip = ipD.value[0];
}

if (!ip && base) {
  let macD = declare(base + ".AssociatedDeviceMACAddress", { value: 1 });
  let macVal =
    macD.size && macD.value[0] ? String(macD.value[0]).toUpperCase().replace(/[^A-F0-9]/g, "") : "";
  if (macVal) {
    let ips = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress", { value: 1 });
    let macs = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress", { value: 1 });
    for (let i = 0; i < macs.size; i++) {
      const hMac = macs.value[i]
        ? String(macs.value[i]).toUpperCase().replace(/[^A-F0-9]/g, "")
        : "";
      if (hMac === macVal && ips.value[i]) {
        ip = ips.value[i];
        break;
      }
    }
  }
}

return { writable: false, value: [ip, "xsd:string"] };
