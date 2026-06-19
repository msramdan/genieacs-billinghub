#!/usr/bin/env node
// Copy logo.png ke genieacs/public untuk UI GenieACS
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "logo.png");

if (!fs.existsSync(src)) {
  console.error("ERROR: logo.png not found di root project");
  process.exit(1);
}

const pub = path.join(root, "genieacs", "public");
fs.mkdirSync(pub, { recursive: true });
fs.copyFileSync(src, path.join(pub, "logo.png"));

console.log("OK: logo.png -> genieacs/public/logo.png");
