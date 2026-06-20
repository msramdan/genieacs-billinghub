// Minimal inform: only ACS bootstrap + staggered LAN refresh (no VP refresh)
const url = "__ACS_URL__";
const informInterval = 200;
const daily = Date.now(86400000);
const AcsUser = "__ACS_USER__";
const AcsPass = "__ACS_PASS__";

const brand = declare("DeviceID.Manufacturer", { value: daily }).value[0];

if (brand !== "MikroTik") {
  declare("InternetGatewayDevice.ManagementServer.URL", { value: daily }, { value: url });
  declare("InternetGatewayDevice.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("InternetGatewayDevice.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare(
    "InternetGatewayDevice.ManagementServer.ConnectionRequestUsername",
    { value: daily },
    { value: AcsUser }
  );
  declare(
    "InternetGatewayDevice.ManagementServer.ConnectionRequestPassword",
    { value: daily },
    { value: AcsPass }
  );
  declare("InternetGatewayDevice.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare(
    "InternetGatewayDevice.ManagementServer.PeriodicInformInterval",
    { value: daily },
    { value: informInterval }
  );
}

// beryindo paths — one group per phase to avoid too_many_rpcs (255 limit)
declare(
  "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.*.AssociatedDeviceIPAddress",
  { value: Date.now(180000) }
);
declare(
  "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.AssociatedDevice.*.AssociatedDeviceMACAddress",
  { value: Date.now(210000) }
);
declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.HostName", { value: Date.now(240000) });
declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.IPAddress", { value: Date.now(270000) });
declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.MACAddress", { value: Date.now(300000) });
declare("InternetGatewayDevice.LANDevice.1.Hosts.Host.*.InterfaceType", { value: Date.now(330000) });
