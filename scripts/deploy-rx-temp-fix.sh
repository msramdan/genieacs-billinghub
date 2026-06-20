#!/usr/bin/env bash
# Deploy RX/Temp fix: patch inform, refresh VP, summon all devices
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACS_HOST="${BH_ACS_HOST:-acs-kapita.billinghub.id}"
ACS_URL="http://${ACS_HOST}:7547"

cd "$ROOT"
sed -i 's/\r$//' scripts/*.sh scripts/*.mongosh.js db/provisions/*.js 2>/dev/null || true

echo "=== Patch inform provision ==="
sed -e "s|__ACS_URL__|${ACS_URL}|g" \
    -e "s|__ACS_USER__|msn|g" \
    -e "s|__ACS_PASS__|msn|g" \
    "$ROOT/db/provisions/inform.js" > /tmp/inform.billinghub.js
mongosh genieacs --quiet --eval "
const fs = require('fs');
db.provisions.updateOne(
  { _id: 'inform' },
  { \$set: { script: fs.readFileSync('/tmp/inform.billinghub.js', 'utf8') } }
);
print('OK inform updated');
"

echo "=== Apply RX/temp patches ==="
export BILLINGHUB_ROOT="$ROOT"
mongosh genieacs --quiet "$ROOT/scripts/patch-index-full-fallbacks.mongosh.js"
mongosh genieacs --quiet "$ROOT/scripts/patch-rx-temp-refresh.mongosh.js"

echo "=== Restart GenieACS ==="
sudo systemctl restart genieacs-cwmp genieacs-ui
sleep 3

echo "=== Connection request all devices ==="
python3 << 'PY'
import json, subprocess, urllib.parse, urllib.request

base = "http://127.0.0.1:7557"
auth = "msn:msn"
req = urllib.request.Request(base + "/devices/?projection=_id")
with urllib.request.urlopen(req) as r:
    devices = json.load(r)
count = 0
for d in devices:
    enc = urllib.parse.quote(d["_id"], safe="")
    cmd = [
        "curl", "-sf", "--max-time", "8", "-u", auth, "-X", "POST",
        f"{base}/devices/{enc}/tasks?connection_request",
        "-H", "Content-Type: application/json", "-d", "{}",
    ]
    if subprocess.call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        count += 1
print(f"OK connection_request sent to {count} devices")
PY
systemctl is-active genieacs-cwmp genieacs-ui
