#!/usr/bin/env node
// Patch GenieACS UI parameter-table: Wifi Connected Host Name from LAN Hosts (MAC/IP match).
// GenieACS expressions cannot join AssociatedDevice rows with Hosts.Host, so ONTs that send
// no name field in AssociatedDevice (ZICG/CIOT/CMCC) showed a blank Host Name. The bundle now
// passes the device through bhAddWifiHostNames (lib/wifi-connected-logic.js), which adds a
// client-side "<row>.X_BH_HostName"; patch-wifi-connected-v4 puts it last in the COALESCE.
const fs = require("fs");
const path = require("path");
const { bhAddWifiHostNames } = require("../lib/wifi-connected-logic");

const pub = process.argv[2] || path.join(__dirname, "..", "genieacs", "public");
const jsFiles = fs
  .readdirSync(pub)
  .filter((f) => /^app.*\.js$/.test(f) && !f.endsWith(".map"));

const MARK_START = "/*bh-wifi-hostname:start*/";
const MARK_END = "/*bh-wifi-hostname:end*/";
const HELPER =
  MARK_START +
  "window.__bhHostNames=(function(){var c=new WeakMap();var f=" +
  bhAddWifiHostNames.toString() +
  ";return function(d){if(!d||typeof d!==\"object\")return d;var r=c.get(d);" +
  "if(!r){try{r=f(d)}catch(x){r=d}c.set(d,r)}return r}})();" +
  MARK_END;

// parameter-table view: device -> device with X_BH_HostName (cached per device object)
const ANCHOR = /(e\.state\.parameters=Object\.values\(e\.attrs\.childParameters\)\},view:e=>\{let t=)e\.attrs\.device,/;
const PATCHED = "e.state.parameters=Object.values(e.attrs.childParameters)},view:e=>{let t=window.__bhHostNames(e.attrs.device),";

let patched = 0;
for (const file of jsFiles) {
  const fp = path.join(pub, file);
  let js = fs.readFileSync(fp, "utf8");
  const before = js;
  if (js.includes(MARK_START)) {
    // refresh helper body (idempotent re-run after lib change)
    js = js.slice(0, js.indexOf(MARK_START)) + HELPER + js.slice(js.indexOf(MARK_END) + MARK_END.length);
  } else if (ANCHOR.test(js)) {
    js = HELPER + js;
  } else {
    console.log("SKIP (no parameter-table):", file);
    continue;
  }
  if (!js.includes(PATCHED)) js = js.replace(ANCHOR, "$1window.__bhHostNames(e.attrs.device),");
  if (!js.includes(PATCHED)) {
    console.log("WARN anchor not patched:", file);
    continue;
  }
  if (js !== before) {
    fs.writeFileSync(fp, js);
    patched++;
    console.log("OK wifi-hostname:", file);
  } else {
    console.log("SKIP already patched:", file);
  }
}
console.log("wifi-hostname patch done (" + patched + " files).");
