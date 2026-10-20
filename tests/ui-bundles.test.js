const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

// Patched GenieACS UI bundles must stay valid JS — a broken bundle = blank ACS UI on any
// server that serves it (patch-login-error once injected a bare try{} into an expression).
const pub = path.join(__dirname, "..", "genieacs", "public");
const bundles = fs.readdirSync(pub).filter((f) => /^app.*\.js$/.test(f));

describe("GenieACS UI bundles", () => {
  for (const file of bundles) {
    it(`${file} parses as an ES module`, () => {
      const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bh-ui-")), "bundle.mjs");
      fs.copyFileSync(path.join(pub, file), tmp);
      const r = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
      fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
      assert.equal(r.status, 0, (r.stderr || "").split("\n").find((l) => /Error/.test(l)));
    });
  }

  it("parameter-table bundles route the device through the Host Name helper", () => {
    for (const file of bundles) {
      const js = fs.readFileSync(path.join(pub, file), "utf8");
      if (!js.includes("e.state.parameters=Object.values(e.attrs.childParameters)")) continue;
      assert.ok(js.includes("let t=window.__bhHostNames(e.attrs.device),"), file);
    }
  });
});
