// Provision: inform — BillingHub ACS bootstrap
// ACS URL & credentials are replaced by install.sh (__ACS_URL__, __ACS_USER__, __ACS_PASS__)

const url = "__ACS_URL__";
const informInterval = 200;

const daily = Date.now(86400000);
const update = Date.now(60000);

const AcsUser = "__ACS_USER__";
const AcsPass = "__ACS_PASS__";
const ConnReqUser = "__ACS_USER__";
const ConnReqPass = "__ACS_PASS__";

const brand = declare("DeviceID.Manufacturer", { value: daily }).value[0];

if (brand !== "MikroTik") {
  declare("InternetGatewayDevice.ManagementServer.URL", { value: daily }, { value: url });
  declare("InternetGatewayDevice.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("InternetGatewayDevice.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare(
    "InternetGatewayDevice.ManagementServer.ConnectionRequestUsername",
    { value: update },
    { value: ConnReqUser }
  );
  declare(
    "InternetGatewayDevice.ManagementServer.ConnectionRequestPassword",
    { value: update },
    { value: ConnReqPass }
  );
  declare("InternetGatewayDevice.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare(
    "InternetGatewayDevice.ManagementServer.PeriodicInformInterval",
    { value: daily },
    { value: informInterval }
  );
  // Refresh connection request URL on every inform
  declare("InternetGatewayDevice.ManagementServer.ConnectionRequestURL", { value: update });
  declare("InternetGatewayDevice.ManagementServer.UDPConnectionRequestAddress", { value: update });
} else {
  declare("Device.ManagementServer.URL", { value: daily }, { value: url });
  declare("Device.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("Device.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare(
    "Device.ManagementServer.ConnectionRequestUsername",
    { value: daily },
    { value: ConnReqUser }
  );
  declare(
    "Device.ManagementServer.ConnectionRequestPassword",
    { value: daily },
    { value: ConnReqPass }
  );
  declare("Device.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare("Device.ManagementServer.PeriodicInformInterval", { value: daily }, { value: informInterval });
  declare("Device.ManagementServer.ConnectionRequestURL", { value: update });
}
