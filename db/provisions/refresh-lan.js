// refresh-lan — safe phased GPV (no Host.* wildcard — causes too_many_rpcs)
const refresh = { value: Date.now(300000) };
const phase = Math.floor(Date.now() / 300000) % 5;

const clients = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalAssociations", {
  value: 1,
}).value[0];

if (Number(clients) > 0) {
  if (phase === 0) {
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.*.AssociatedDeviceIPAddress",
      refresh
    );
  } else if (phase === 1) {
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.*.AssociatedDeviceMACAddress",
      refresh
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.*.X_ZTE-COM_AssociatedDeviceName",
      refresh
    );
  } else {
    // Host table — fixed slots only (max 4 hosts × 3 params = 12 RPC)
    const start = (phase - 2) * 4 + 1;
    for (let i = start; i < start + 4; i++) {
      declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".HostName", refresh);
      declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".IPAddress", refresh);
      declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".MACAddress", refresh);
    }
  }
}

for (let wlan of [2, 5]) {
  const n = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + ".TotalAssociations",
    { value: 1 }
  ).value[0];
  if (Number(n) > 0 && phase === wlan) {
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." +
        wlan +
        ".AssociatedDevice.*.AssociatedDeviceIPAddress",
      refresh
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." +
        wlan +
        ".AssociatedDevice.*.AssociatedDeviceMACAddress",
      refresh
    );
  }
}
