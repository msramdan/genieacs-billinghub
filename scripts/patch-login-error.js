#!/usr/bin/env node
// Patch GenieACS UI login: show visible error when username/password wrong.
// BillingHub login hides #header (where GenieACS toasts live), so failures looked silent.
const fs = require("fs");
const path = require("path");

const pub = path.join(__dirname, "..", "genieacs", "public");
const jsFiles = fs
  .readdirSync(pub)
  .filter((f) => /^app.*\.js$/.test(f) && !f.endsWith(".map"));

const OLD =
  '.catch(n=>{I("error",n.response||n.message),t.target.disabled=!1})';
const NEW =
  '.catch(n=>{var m=n.response||n.message||"Incorrect username or password";' +
  'I("error",m);' +
  'try{var box=document.querySelector("#content.page-login .bh-login-error");' +
  'if(!box){box=document.createElement("div");box.className="bh-login-error";' +
  'var form=document.querySelector("#content.page-login form");' +
  'if(form)form.insertBefore(box,form.firstChild)}' +
  'box.textContent=m;box.setAttribute("role","alert")}catch(x){}' +
  't.target.disabled=!1})';

// Also clear error banner when user tries again.
// Wrapped in an IIFE: a bare try{} inside the comma expression is a SyntaxError
// (older versions of this patch broke app.js / app-FOJWPRV7 / app-JZ65BHVX that way).
// Login fn name differs per bundle (Io, ko, …) — match any identifier.
const CLEAR =
  '(()=>{try{var b=document.querySelector("#content.page-login .bh-login-error");' +
  "if(b)b.remove()}catch(x){}})(),";
const BROKEN_CLEAR =
  'try{var b=document.querySelector("#content.page-login .bh-login-error");' +
  "if(b)b.remove()}catch(x){},";
const CLICK_RE = /onclick:t=>\(t\.target\.disabled=!0,([\w$]+\(e\.state\.username,e\.state\.password\))/;

let patched = 0;
for (const file of jsFiles) {
  const fp = path.join(pub, file);
  let js = fs.readFileSync(fp, "utf8");
  const before = js;
  if (js.includes(OLD)) js = js.split(OLD).join(NEW);
  if (js.includes(BROKEN_CLEAR) && !js.includes(CLEAR)) js = js.split(BROKEN_CLEAR).join(CLEAR);
  if (!js.includes(CLEAR)) js = js.replace(CLICK_RE, "onclick:t=>(t.target.disabled=!0," + CLEAR + "$1");
  if (js !== before) {
    fs.writeFileSync(fp, js);
    patched++;
    console.log("OK login-error:", file);
  } else if (js.includes("bh-login-error")) {
    console.log("SKIP already patched:", file);
  } else {
    console.log("WARN pattern not found:", file);
  }
}
console.log("login-error patch done (" + patched + " files).");
