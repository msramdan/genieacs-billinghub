#!/usr/bin/env bash
# Deploy RX/Temp fix: patch inform, refresh VP, summon all devices
# Wajib: BH_ACS_HOST, BH_ACS_USER, BH_ACS_PASS
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACS_HOST="${BH_ACS_HOST:?Set BH_ACS_HOST}"
ACS_USER="${BH_ACS_USER:?Set BH_ACS_USER}"
ACS_PASS="${BH_ACS_PASS:?Set BH_ACS_PASS}"
ACS_PORT="${BH_ACS_PORT:-7547}"
ACS_URL="http://${ACS_HOST}:${ACS_PORT}"

cd "$ROOT"
sed -i 's/\r$//' scripts/*.sh scripts/*.mongosh.js db/provisions/*.js 2>/dev/null || true

echo "=== Patch inform provision ==="
sed -e "s|__ACS_URL__|${ACS_URL}|g" \
    -e "s|__ACS_USER__|${ACS_USER}|g" \
    -e "s|__ACS_PASS__|${ACS_PASS}|g" \
    "$ROOT/db/provisions/inform.js" > /tmp/inform.billinghub.js
mongosh genieacs --quiet --eval "
const fs = require('fs');
db.provisions.updateOne(
  { _id: 'inform' },
  { \$set: { script: fs.readFileSync('/tmp/inform.billinghub.js', 'utf8') } }
);
print('OK inform updated');
"

echo "=== Apply index RX/temp (VP-only) ==="
export BILLINGHUB_ROOT="$ROOT"
mongosh genieacs --quiet "$ROOT/scripts/patch-index-full-fallbacks.mongosh.js"

if [[ "${SKIP_VP_CLEAR:-}" != "1" ]]; then
  echo "=== Clear RX/temp VP cache ==="
  mongosh genieacs --quiet "$ROOT/scripts/patch-rx-temp-refresh.mongosh.js"
else
  echo "=== Skip VP cache clear (SKIP_VP_CLEAR=1) ==="
fi

echo "=== Clear too_many_rpcs faults ==="
mongosh genieacs --quiet --eval "print('faults cleared:', db.faults.deleteMany({ code: 'too_many_rpcs' }).deletedCount)"

echo "=== Restart GenieACS ==="
sudo systemctl restart genieacs-cwmp genieacs-ui
sleep 3

echo "=== Connection request all devices ==="
export NBI_USER="$ACS_USER"
export NBI_PASS="$ACS_PASS"
python3 << 'PY'
import base64
import json
import os
import subprocess
import urllib.parse
import urllib.request

user = os.environ["NBI_USER"]
password = os.environ["NBI_PASS"]
base = "http://127.0.0.1:7557"
auth = base64.b64encode(f"{user}:{password}".encode()).decode()
headers = {"Authorization": "Basic " + auth}
req = urllib.request.Request(base + "/devices/?projection=_id", headers=headers)
with urllib.request.urlopen(req, timeout=30) as r:
    devices = json.load(r)
count = 0
for d in devices:
    enc = urllib.parse.quote(d["_id"], safe="")
    cmd = [
        "curl", "-sf", "--max-time", "8", "-u", f"{user}:{password}", "-X", "POST",
        f"{base}/devices/{enc}/tasks?connection_request",
        "-H", "Content-Type: application/json", "-d", "{}",
    ]
    if subprocess.call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
        count += 1
print(f"OK connection_request sent to {count}/{len(devices)} devices")
PY
systemctl is-active genieacs-cwmp genieacs-ui
