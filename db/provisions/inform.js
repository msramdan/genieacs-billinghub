// Provision: inform — BillingHub ACS bootstrap (slim — LAN refresh in refresh-lan preset)

const url = "__ACS_URL__";
const informInterval = 200;
const daily = Date.now(86400000);
const update = Date.now(60000);
const AcsUser = "__ACS_USER__";
const AcsPass = "__ACS_PASS__";

const brand = declare("DeviceID.Manufacturer", { value: daily }).value[0];

if (brand !== "MikroTik") {
  declare("InternetGatewayDevice.ManagementServer.URL", { value: daily }, { value: url });
  declare("InternetGatewayDevice.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("InternetGatewayDevice.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare("InternetGatewayDevice.ManagementServer.ConnectionRequestUsername", { value: update }, { value: AcsUser });
  declare("InternetGatewayDevice.ManagementServer.ConnectionRequestPassword", { value: update }, { value: AcsPass });
  declare("InternetGatewayDevice.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare("InternetGatewayDevice.ManagementServer.PeriodicInformInterval", { value: daily }, { value: informInterval });
  declare("InternetGatewayDevice.ManagementServer.ConnectionRequestURL", { value: daily });
} else {
  declare("Device.ManagementServer.URL", { value: daily }, { value: url });
  declare("Device.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("Device.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare("Device.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare("Device.ManagementServer.PeriodicInformInterval", { value: daily }, { value: informInterval });
}

// Virtual parameters — 3 per inform cycle (staggered)
const vpPhase = Math.floor(Date.now() / 120000) % 6;
const vpTick = { value: Date.now(120000) };

if (vpPhase === 0) {
  declare("VirtualParameters.pppoeUsername2", vpTick);
  declare("VirtualParameters.pppoeIP", vpTick);
} else if (vpPhase === 1) {
  declare("VirtualParameters.getSSID", vpTick);
  declare("VirtualParameters.activedevices", vpTick);
  declare("VirtualParameters.getdeviceuptime", vpTick);
} else if (vpPhase === 2) {
  declare("VirtualParameters.displayMac", vpTick);
  declare("VirtualParameters.getponmode", vpTick);
} else if (vpPhase === 3) {
  declare("VirtualParameters.getSerialNumber", vpTick);
  declare("VirtualParameters.pppoeUsername", vpTick);
  declare("VirtualParameters.pppoeMac", vpTick);
} else if (vpPhase === 4) {
  declare("VirtualParameters.getpppuptime", vpTick);
  declare("VirtualParameters.IPTR069", vpTick);
  declare("VirtualParameters.PonMac", vpTick);
} else {
  declare("VirtualParameters.pppoePassword", { path: vpTick, value: 1 });
  declare("InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", vpTick);
}

// Optical RX + temperature: every inform (CT-COM raw values need VP conversion)
declare("VirtualParameters.RXPower", { value: 1 });
declare("VirtualParameters.gettemp", { value: 1 });
