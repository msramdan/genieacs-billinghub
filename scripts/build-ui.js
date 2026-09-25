#!/usr/bin/env node
// Sync BillingHub theme CSS + patch logo refs in all JS bundles
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pub = path.join(root, "genieacs", "public");
const css = fs.readFileSync(path.join(pub, "app.css"), "utf8");

const cssTargets = fs
  .readdirSync(pub)
  .filter((f) => /^app-[A-Z0-9]+\.css$/.test(f));

if (!cssTargets.length) {
  console.warn("Tidak ada app-*.css bundle; tulis app.css saja.");
} else {
  for (const file of cssTargets) {
    fs.writeFileSync(path.join(pub, file), css);
    console.log("OK CSS:", file, "(" + css.length + " bytes)");
  }
}

const patchUi = path.join(__dirname, "patch-genieacs-ui-html.js");
if (fs.existsSync(patchUi)) {
  require("child_process").execFileSync("node", [patchUi], { stdio: "inherit" });
}

const patchLogin = path.join(__dirname, "patch-login-error.js");
if (fs.existsSync(patchLogin)) {
  require("child_process").execFileSync("node", [patchLogin], { stdio: "inherit" });
}

const jsFiles = fs.readdirSync(pub).filter((f) => /^app.*\.js$/.test(f) && !f.endsWith(".map"));
let jsPatched = 0;
for (const file of jsFiles) {
  const fp = path.join(pub, file);
  let js = fs.readFileSync(fp, "utf8");
  const before = js;
  js = js.replace(/logo-[a-f0-9]+\.svg/g, "logo.png");
  js = js.replace(/"logo\.svg"/g, '"logo.png"');
  js = js.replace(/,\s*\(0,[\w$.]+\.default\)\("span\.version","v"\+[\w$]+\)/g, "");
  js = js.replace(/,\s*p\("span\.version","v"\+[\w$]+\)/g, "");
  js = js.replace(/width:"(?:180|204)px",height:"(?:180|204)px",/g, "");
  if (js !== before) {
    fs.writeFileSync(fp, js);
    jsPatched++;
    console.log("OK JS logo -> logo.png:", file);
  }
}

console.log("UI build selesai (" + jsPatched + " JS files patched).");
