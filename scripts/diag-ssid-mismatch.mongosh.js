const d = db.devices.findOne({ _id: /CIOT119C5780/ });
if (!d) { print("NOT FOUND"); quit(1); }
const vp = d.VirtualParameters || {};
print("VP getSSID:", vp.getSSID && vp.getSSID._value);
print("VP activedevices:", vp.activedevices && vp.activedevices._value);
const wlan = (((d.InternetGatewayDevice || {}).LANDevice || {})["1"] || {}).WLANConfiguration || {};
for (const k of Object.keys(wlan).filter(x => !x.startsWith("_")).sort()) {
  const x = wlan[k];
  if (!x || typeof x !== "object") continue;
  print(
    "WLAN." + k,
    "SSID=", x.SSID && x.SSID._value,
    "Enable=", x.Enable && x.Enable._value,
    "Assoc=", x.TotalAssociations && x.TotalAssociations._value
  );
}
print("UI WiFi SSID param:", (db.config.findOne({_id:"ui.device.1.components.0.parameters.23.parameter"})||{}).value);
