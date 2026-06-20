// Connected clients for primary SSID — same slot logic as getSSID / SSID-LIST row 1
let count = 0;

function readAssoc(slot) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".TotalAssociations",
    { value: 1 }
  );
  return d.size && d.value[0] != null ? Number(d.value[0]) : 0;
}

function readSsid(slot) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".SSID",
    { value: 1 }
  );
  return d.size && d.value[0] ? String(d.value[0]) : "";
}

function readEnable(slot) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".Enable",
    { value: 1 }
  );
  if (!d.size) return null;
  const v = d.value[0];
  return v === true || v === 1 || v === "1" || v === "true";
}

let slot = 1;
const s1 = readSsid(1);
const en1 = readEnable(1);
if (s1 && en1 !== false) {
  slot = 1;
} else {
  let best = 1;
  let bestAssoc = -1;
  for (let i = 1; i <= 8; i++) {
    const name = readSsid(i);
    if (!name) continue;
    const en = readEnable(i);
    if (en === false) continue;
    const assoc = readAssoc(i);
    if (assoc > bestAssoc) {
      bestAssoc = assoc;
      best = i;
    }
  }
  slot = best;
}

count = readAssoc(slot);
return { writable: false, value: count };
