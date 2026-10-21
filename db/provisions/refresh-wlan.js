// refresh-wlan — phased WLAN refresh so SSID-LIST is not blank after Summon alone.
// Runs every Inform (preset events={}). Stay under ~64 RPCs per session.
const update = Date.now(180000); // refresh attrs ~ every 3 minutes
const slow = Date.now(300000);
const phase = Math.floor(Date.now() / 120000) % 8;

// Core SSID-LIST columns: Security / Broadcast / Power / Channel / Auto / Password path
const wlanAttrs = [
  "Enable",
  "SSID",
  "BeaconType",
  "SSIDAdvertisementEnabled",
  "TransmitPower",
  "AutoChannelEnable",
  "Channel",
  "KeyPassphrase",
  "RadioEnabled",
  "TotalAssociations",
  "Status",
  "Standard",
  "X_HW_RFBand",
];

// One WLAN instance per Inform — after ~8 informs all 1..8 are filled
const wlan = (phase % 8) + 1;
for (const a of wlanAttrs) {
  declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + "." + a,
    { value: update }
  );
}
declare(
  "InternetGatewayDevice.LANDevice.1.WLANConfiguration." +
    wlan +
    ".PreSharedKey.1.KeyPassphrase",
  { value: update }
);

function totalAssoc(slot) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".TotalAssociations",
    { value: 1 }
  );
  return d.size && d.value[0] ? Number(d.value[0]) : 0;
}

function refreshAdSlots(slot, maxSlot) {
  const n = Math.min(Math.max(maxSlot, totalAssoc(slot), 1), 8);
  for (let i = 1; i <= n; i++) {
    const base =
      "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".AssociatedDevice." + i;
    declare(base + ".AssociatedDeviceIPAddress", { path: update, value: update });
    declare(base + ".AssociatedDeviceMACAddress", { path: update, value: update });
    declare(base + ".AssociatedDeviceHostName", { path: slow, value: slow });
  }
}

declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDeviceNumberOfEntries", {
  value: 1,
});
declare("InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries", { value: 1 });

// Rotate associated-device / hosts refresh (lighter than dumping all every time)
if (phase === 0 || phase === 1) {
  refreshAdSlots(wlan, 8);
} else if (phase === 2 || phase === 3) {
  for (let i = 1; i <= 12; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".IPAddress", {
      path: update,
      value: update,
    });
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".MACAddress", {
      path: update,
      value: update,
    });
  }
} else if (phase === 4 || phase === 5) {
  for (let i = 1; i <= 12; i++) {
    declare("InternetGatewayDevice.LANDevice.1.Hosts.Host." + i + ".HostName", {
      path: slow,
      value: slow,
    });
  }
} else {
  declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.TotalAssociations", {
    path: update,
    value: update,
  });
}
