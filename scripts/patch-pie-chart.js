#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const pub = path.join(__dirname, "..", "genieacs", "public");
const needle = 'return r.push(p("span.legend-total",';
const insert =
  'if(!s.length){s.push(p("path",{d:"M 0,-100 A 100,100 0 1,1 0,100 A 100,100 0 1,1 0,-100 Z",fill:"#334155",stroke:"#475569","stroke-width":1}));}';
const oldInsert =
  'if(!s.length){s.push(p("path",{d:"M 0,-100 A 100,100 0 1,1 0,100 A 100,100 0 1,1 0,-100 Z",fill:"#e8ecef",stroke:"#cbd5e1","stroke-width":1}));}';

for (const file of fs.readdirSync(pub).filter((f) => /^app.*\.js$/.test(f) && !f.endsWith(".map"))) {
  const fp = path.join(pub, file);
  let js = fs.readFileSync(fp, "utf8");
  if (!js.includes(needle)) {
    console.log("SKIP (no pie fn):", file);
    continue;
  }
  if (js.includes(insert)) {
    console.log("SKIP (done):", file);
    continue;
  }
  if (js.includes(oldInsert)) {
    js = js.replace(oldInsert, insert);
    fs.writeFileSync(fp, js);
    console.log("OK (updated placeholder):", file);
    continue;
  }
  js = js.replace(needle, insert + needle);
  fs.writeFileSync(fp, js);
  console.log("OK:", file);
}
