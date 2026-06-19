#!/usr/bin/env node
// Patch genieacs-ui HTML: viewport meta + theme-toggle (LF-safe)
const fs = require("fs");
const path = require("path");

const uiBin = process.argv[2] || path.join(__dirname, "..", "genieacs", "bin", "genieacs-ui");
if (!fs.existsSync(uiBin)) {
  console.error("SKIP: genieacs-ui not found:", uiBin);
  process.exit(0);
}

let ui = fs.readFileSync(uiBin, "utf8");
const before = ui;

ui = ui.replace(/<meta[^>]*viewport[^>]*>/gi, "");

const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1">';
if (!ui.includes('content="width=device-width, initial-scale=1"')) {
  ui = ui.replace("<head>", `<head>\n      ${viewport}`);
}

const themeHead =
  '<script>(function(){try{var t=localStorage.getItem("bh-theme");if(t==="light")document.documentElement.setAttribute("data-bh-theme","light")}catch(e){}})();</script>';
if (!ui.includes("theme-toggle.js")) {
  ui = ui.replace(
    '<link rel="stylesheet" href="${Ls}">',
    `<link rel="stylesheet" href="\${Ls}">${themeHead}`
  );
  ui = ui.replace(
    '<script type="module" src="${Ms}"></script>',
    '<script src="theme-toggle.js"></script><script type="module" src="${Ms}"></script>'
  );
}

if (ui !== before) {
  fs.writeFileSync(uiBin, ui);
  console.log("OK genieacs-ui patched:", uiBin);
} else {
  console.log("SKIP genieacs-ui already patched");
}
