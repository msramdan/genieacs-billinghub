#!/bin/bash
set -e
PUB=/usr/lib/node_modules/genieacs/public
cp /tmp/app.css "$PUB/app.css"
cp /tmp/app-7KDYOBUH.css "$PUB/app-7KDYOBUH.css"
cp /tmp/logo.png "$PUB/logo.png"
if [[ -f /tmp/app-BX5HV4M3.js ]]; then
  cp /tmp/app-BX5HV4M3.js "$PUB/app-BX5HV4M3.js"
fi
for f in "$PUB"/app*.js; do
  sed -i 's/logo-[a-f0-9]*\.svg/logo.png/g; s/"logo\.svg"/"logo.png"/g' "$f"
done
if [[ -f /tmp/chart-colors-patches.json ]]; then
  mongosh genieacs --quiet /tmp/patch-chart-colors.mongosh.js
fi
systemctl restart genieacs-ui
echo DONE
