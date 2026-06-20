#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "db/export/config.json"), "utf8"));
const provisions = JSON.parse(fs.readFileSync(path.join(root, "db/export/provisions.json"), "utf8"));

const uiDevice = config.filter((r) => r._id.startsWith("ui.device."));
fs.writeFileSync(path.join(__dirname, "ui-device-all-export.json"), JSON.stringify(uiDevice));
console.log("ui.device keys:", uiDevice.length);

const def = provisions.find((p) => p._id === "default");
fs.writeFileSync(path.join(__dirname, "default-provision.js"), def.script);
console.log("default provision:", def.script.length, "chars");
