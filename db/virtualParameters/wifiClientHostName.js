// Host Name for Wifi Connected row — vendor AD fields, then LAN Hosts lookup by IP/MAC
let name = "";
let base = String(args[0] || "").replace(/\.VirtualParameters\.wifiClientHostName.*$/, "");

if (base) {
  for (let f of [
    "X_ZTE-COM_AssociatedDeviceName",
    "X_HW_AssociatedDevicedescriptions",
    "X_CT-COM_AssociatedDeviceName",
    "HostName",
    "AssociatedDeviceName",
  ]) {
    let v = declare(base + "." + f, { value: 1 });
    if (v.size && v.value[0]) {
      name = v.value[0];
      break;
    }
  }
}

if (!name && base) {
  let ipD = declare(base + ".AssociatedDeviceIPAddress", { value: 1 });
  let macD = declare(base + ".AssociatedDeviceMACAddress", { value: 1 });
  let ipVal = ipD.size && ipD.value[0] ? String(ipD.value[0]) : "";
  let macVal =
    macD.size && macD.value[0] ? String(macD.value[0]).toUpperCase().replace(/[^A-F0-9]/g, "") : "";

  let ips = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress", { value: 1 });
  let macs = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress", { value: 1 });
  let names = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName", { value: 1 });
  let layers = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.Layer2Interface", { value: 1 });
  let vendors = declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.VendorClassID", { value: 1 });

  for (let i = 0; i < ips.size; i++) {
    const hIp = ips.value[i] ? String(ips.value[i]) : "";
    const hMac = macs.value[i]
      ? String(macs.value[i]).toUpperCase().replace(/[^A-F0-9]/g, "")
      : "";
    const hName = names.value[i] ? String(names.value[i]) : "";
    const hLayer = layers.value[i] ? String(layers.value[i]) : "";
    const hVendor = vendors.value[i] ? String(vendors.value[i]) : "";
    const label = hName || hLayer || hVendor;
    if (!label) continue;
    if (ipVal && hIp === ipVal) {
      name = label;
      break;
    }
    if (macVal && hMac === macVal) {
      name = label;
      break;
    }
  }
}

return { writable: false, value: [name, "xsd:string"] };
