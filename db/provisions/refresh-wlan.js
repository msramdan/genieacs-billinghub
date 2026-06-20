// refresh-wlan — fetch AssociatedDevice slots explicitly (GenieACS forum #3135, #5074)
// ONT often omits AssociatedDevice from GetParameterNames; declare forces GetParameterValues
const update = Date.now(60000);
const minutes = Date.now(60000);
const phase = Math.floor(Date.now() / 120000) % 5;

function totalAssoc(wlan) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + ".TotalAssociations",
    { value: 1 }
  );
  return d.size && d.value[0] ? Number(d.value[0]) : 0;
}

function refreshAdSlots(wlan, maxSlot) {
  const n = Math.min(Math.max(maxSlot, totalAssoc(wlan), 1), 32);
  for (let i = 1; i <= n; i++) {
    const base =
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + ".AssociatedDevice." + i;
    declare(base + ".AssociatedDeviceIPAddress", { path: update, value: update });
    declare(base + ".AssociatedDeviceMACAddress", { path: update, value: update });
    declare(base + ".X_ZTE-COM_AssociatedDeviceName", { path: minutes, value: minutes });
    declare(base + ".X_HW_AssociatedDevicedescriptions", { path: minutes, value: minutes });
    declare(base + ".X_CT-COM_AssociatedDeviceName", { path: minutes, value: minutes });
  }
}

declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDeviceNumberOfEntries", {
  value: 1,
});
declare("InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries", { value: 1 });

if (phase === 0) {
  for (let wlan = 1; wlan <= 4; wlan++) {
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." +
        wlan +
        ".AssociatedDevice.*.AssociatedDeviceIPAddress",
      { path: update, value: update }
    );
    declare(
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." +
        wlan +
        ".AssociatedDevice.*.AssociatedDeviceMACAddress",
      { path: update, value: update }
    );
    refreshAdSlots(wlan, 16);
  }
} else if (phase === 1) {
  for (let wlan = 1; wlan <= 8; wlan++) {
    refreshAdSlots(wlan, 32);
  }
} else if (phase === 2) {
  for (let i = 1; i <= 32; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".IPAddress", {
      path: update,
      value: update,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".MACAddress", {
      path: update,
      value: update,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".HostName", {
      path: minutes,
      value: minutes,
    });
  }
} else if (phase === 3) {
  for (let i = 1; i <= 32; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".InterfaceType", {
      path: minutes,
      value: minutes,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".Active", {
      path: minutes,
      value: minutes,
    });
  }
} else {
  declare(
    "InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.TotalAssociations",
    { path: update, value: update }
  );
}
