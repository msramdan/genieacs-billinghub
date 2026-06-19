// MAC Address — multi-vendor
let m = "";

let paths = [
  "InternetGatewayDevice.LANDevice.1.LANHostConfigManagement.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.MACAddress",
  "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.MACAddress",
  "InternetGatewayDevice.DeviceInfo.X_CU_SerialNumber",
  "Device.Ethernet.Interface.1.MACAddress",
  "Device.DeviceInfo.SerialNumber",
];

for (let p of paths) {
  let d = declare(p, { value: Date.now() });
  if (d.size && d.value[0]) {
    m = d.value[0];
    break;
  }
}

return { writable: false, value: [m, "xsd:string"] };
