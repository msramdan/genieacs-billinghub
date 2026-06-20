#!/usr/bin/env node
// Patch genieacs-ui HTML: viewport meta + theme-toggle (LF-safe)
// Supports GenieACS 1.2.13 (Ls/Ms) and 1.2.16+ (Ds/Ls)
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
  const cssPatterns = [
    '<link rel="stylesheet" href="${Ls}">',
    '<link rel="stylesheet" href="${Ds}">',
  ];
  const jsPatterns = [
    '<script type="module" src="${Ms}"></script>',
    '<script type="module" src="${Ls}"></script>',
  ];

  let cssPatched = false;
  for (const css of cssPatterns) {
    if (ui.includes(css)) {
      ui = ui.replace(css, `${css}${themeHead}`);
      cssPatched = true;
      break;
    }
  }

  let jsPatched = false;
  for (const js of jsPatterns) {
    if (ui.includes(js)) {
      ui = ui.replace(
        js,
        '<script src="theme-toggle.js"></script>' + js
      );
      jsPatched = true;
      break;
    }
  }

  if (!cssPatched || !jsPatched) {
    console.error("WARN: could not patch theme toggle — unknown genieacs-ui HTML template");
    console.error("  cssPatched:", cssPatched, "jsPatched:", jsPatched);
  }
}

if (ui !== before) {
  fs.writeFileSync(uiBin, ui);
  console.log("OK genieacs-ui patched:", uiBin);
} else if (ui.includes("theme-toggle.js")) {
  console.log("SKIP genieacs-ui already patched");
} else {
  console.log("SKIP genieacs-ui unchanged (template mismatch?)");
}
