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

// Also clear error banner when user tries again
const OLD_CLICK =
  'onclick:t=>(t.target.disabled=!0,Io(e.state.username,e.state.password)';
const NEW_CLICK =
  'onclick:t=>(t.target.disabled=!0,' +
  'try{var b=document.querySelector("#content.page-login .bh-login-error");' +
  'if(b)b.remove()}catch(x){},' +
  'Io(e.state.username,e.state.password)';

let patched = 0;
for (const file of jsFiles) {
  const fp = path.join(pub, file);
  let js = fs.readFileSync(fp, "utf8");
  const before = js;
  if (js.includes(OLD)) js = js.split(OLD).join(NEW);
  if (js.includes(OLD_CLICK)) js = js.split(OLD_CLICK).join(NEW_CLICK);
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
