#!/usr/bin/env bash
# Quick audit: logo, UI bundle, VP/config counts
set -euo pipefail

NPM="$(npm root -g)/genieacs/public"
echo "HOST=$(hostname -f 2>/dev/null || hostname)"
echo "NPM=$NPM"
echo "GENIEACS=$(genieacs-ui --version 2>/dev/null || node -e "console.log(require('$NPM/../package.json').version)" 2>/dev/null || echo unknown)"

if [[ -f "$NPM/logo.png" ]]; then
  echo "LOGO_NPM=$(md5sum "$NPM/logo.png" | awk '{print $1}') $(stat -c%s "$NPM/logo.png")bytes"
else
  echo "LOGO_NPM=MISSING"
fi

ROOT="${BILLINGHUB_ROOT:-}"
for p in "$ROOT/logo.png" "$ROOT/genieacs/public/logo.png"; do
  [[ -f "$p" ]] && echo "LOGO_REPO=$(md5sum "$p" | awk '{print $1}') $(stat -c%s "$p")bytes $p"
done

curl -s http://127.0.0.1:3000/ | grep -oE 'app-[A-Z0-9]+\.(css|js)' | sort -u | sed 's/^/BUNDLE:/'

JS=$(curl -s http://127.0.0.1:3000/ | grep -oE 'app-[A-Z0-9]+\.js' | head -1)
[[ -n "$JS" && -f "$NPM/$JS" ]] && {
  echo "JS_LOGO_PNG=$(grep -c 'logo.png' "$NPM/$JS" || true)"
  echo "JS_LOGO_SVG=$(grep -cE 'logo-[a-f0-9]+\.svg|"logo\.svg"' "$NPM/$JS" || true)"
}

mongosh genieacs --quiet <<'MONGO'
const o = {
  vp: db.virtualParameters.countDocuments(),
  cfg: db.config.countDocuments(),
  rx: db.config.findOne({_id:"ui.index.7.parameter"}),
  temp: db.config.findOne({_id:"ui.index.8.parameter"}),
  uptime: db.config.findOne({_id:"ui.index.9.parameter"}),
  overview: db.config.countDocuments({_id:/^ui\.overview\./})
};
print("DB " + JSON.stringify(o));
MONGO
