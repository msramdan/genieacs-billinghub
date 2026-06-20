// Primary SSID — always read live from ONT (never return stale cached VP value)
let ssid = "";

function readSsid(slot) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".SSID",
    { value: 1 }
  );
  return d.size && d.value[0] ? String(d.value[0]) : "";
}

function readAssoc(slot) {
  const d = declare(
    "InternetGatewayDevice.LANDevice.1.WLANConfiguration." + slot + ".TotalAssociations",
    { value: 1 }
  );
  return d.size && d.value[0] ? Number(d.value[0]) : 0;
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

// SSID1 enabled — same source as SSID-LIST row 1
const s1 = readSsid(1);
const en1 = readEnable(1);
if (s1 && en1 !== false) {
  ssid = s1;
} else {
  // Pick enabled slot with most clients, else first non-empty SSID
  let best = "";
  let bestAssoc = -1;
  for (let i = 1; i <= 8; i++) {
    const name = readSsid(i);
    if (!name) continue;
    const en = readEnable(i);
    if (en === false) continue;
    const assoc = readAssoc(i);
    if (assoc > bestAssoc) {
      bestAssoc = assoc;
      best = name;
    }
  }
  ssid = best || s1;
  if (!ssid) {
    for (let i = 1; i <= 8; i++) {
      const name = readSsid(i);
      if (name) {
        ssid = name;
        break;
      }
    }
  }
}

return { writable: false, value: [ssid, "xsd:string"] };
