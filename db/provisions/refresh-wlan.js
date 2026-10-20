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

// FiberHome SSID-LIST column (ui.device.8) reads it — keep fetching as before
declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDeviceNumberOfEntries", {
  value: 1,
});
declare("InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries", { value: update });

// Every Inform: WiFi counter + client list + LAN Hosts together, so "Connected",
// Wifi Connected rows and Host Name (matched from Hosts by MAC) come from the same moment.
// Wildcards, not slots 1..8: instance ids are sparse/high on some ONTs (ZICG AD.9, GM220 Host.19);
// path refresh also drops clients that left. ~6 RPCs on top of the SSID attrs above.
const assoc = declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.*.TotalAssociations", {
  value: update,
});
for (const p of assoc) {
  const slot = p.path.split(".")[4];
  const n = p.value && p.value[0] != null ? Number(p.value[0]) : 0;
  const ad = "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".AssociatedDevice.*";
  // refresh when clients are connected, or to clear rows cached from before they left
  if (n > 0 || declare(ad, { path: 1 }).size) {
    declare(ad + ".AssociatedDeviceMACAddress", { path: update, value: update });
    declare(ad + ".AssociatedDeviceIPAddress", { path: update, value: update });
  }
}
for (const a of ["IPAddress", "MACAddress", "Active", "InterfaceType"]) {
  declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*." + a, { path: update, value: update });
}
declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName", { path: slow, value: slow });

// Rotate the rest (new WLAN instances, optional AD name leaf)
if (phase === 0 || phase === 1) {
  declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + wlan + ".AssociatedDevice.*.AssociatedDeviceHostName",
    { path: slow, value: slow }
  );
} else if (phase === 6 || phase === 7) {
  declare("InternetGatewayDevice.LANDevice.*.WLANConfiguration.*.TotalAssociations", {
    path: update,
    value: update,
  });
}
