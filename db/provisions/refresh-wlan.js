// refresh-wlan — light phased refresh (stay under ~64 RPCs per inform session)
const update = Date.now(120000);
const slow = Date.now(300000);
const phase = Math.floor(Date.now() / 120000) % 6;

function totalAssoc(wlan) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + ".TotalAssociations",
    { value: 1 }
  );
  return d.size && d.value[0] ? Number(d.value[0]) : 0;
}

function refreshAdSlots(wlan, maxSlot) {
  const n = Math.min(Math.max(maxSlot, totalAssoc(wlan), 1), 8);
  for (let i = 1; i <= n; i++) {
    const base =
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + ".AssociatedDevice." + i;
    declare(base + ".AssociatedDeviceIPAddress", { path: update, value: update });
    declare(base + ".AssociatedDeviceMACAddress", { path: update, value: update });
  }
}

declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDeviceNumberOfEntries", {
  value: 1,
});
declare("InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries", { value: 1 });

if (phase === 0) {
  refreshAdSlots(1, 8);
} else if (phase === 1) {
  refreshAdSlots(2, 8);
} else if (phase === 2) {
  for (let i = 1; i <= 16; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".IPAddress", {
      path: update,
      value: update,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".MACAddress", {
      path: update,
      value: update,
    });
  }
} else if (phase === 3) {
  for (let i = 1; i <= 16; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".HostName", {
      path: slow,
      value: slow,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".InterfaceType", {
      path: slow,
      value: slow,
    });
  }
} else if (phase === 4) {
  refreshAdSlots(3, 8);
  refreshAdSlots(4, 8);
} else {
  declare(
    "InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.TotalAssociations",
    { path: update, value: update }
  );
}
