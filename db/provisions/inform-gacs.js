// Minimal inform — GACS style: ACS bootstrap only (data fetch via default provision)
const url = "__ACS_URL__";
const informInterval = 200;
const daily = Date.now(86400000);
const update = Date.now(60000);
const AcsUser = "__ACS_USER__";
const AcsPass = "__ACS_PASS__";

let brand = "";
const mfr = declare("DeviceID.Manufacturer", { value: daily });
if (mfr.size && mfr.value[0]) brand = mfr.value[0];

if (brand !== "MikroTik") {
  declare("InternetGatewayDevice.ManagementServer.URL", { value: daily }, { value: url });
  declare("InternetGatewayDevice.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("InternetGatewayDevice.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare(
    "InternetGatewayDevice.ManagementServer.ConnectionRequestUsername",
    { value: update },
    { value: AcsUser }
  );
  declare(
    "InternetGatewayDevice.ManagementServer.ConnectionRequestPassword",
    { value: update },
    { value: AcsPass }
  );
  declare("InternetGatewayDevice.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare(
    "InternetGatewayDevice.ManagementServer.PeriodicInformInterval",
    { value: daily },
    { value: informInterval }
  );
  declare("InternetGatewayDevice.ManagementServer.ConnectionRequestURL", { value: daily });
} else {
  declare("Device.ManagementServer.URL", { value: daily }, { value: url });
  declare("Device.ManagementServer.Username", { value: daily }, { value: AcsUser });
  declare("Device.ManagementServer.Password", { value: daily }, { value: AcsPass });
  declare("Device.ManagementServer.PeriodicInformEnable", { value: daily }, { value: true });
  declare("Device.ManagementServer.PeriodicInformInterval", { value: daily }, { value: informInterval });
}
