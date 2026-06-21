#!/usr/bin/env bash
# Fix too_many_rpcs: light refresh-wlan + stagger RX/temp in inform
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export BILLINGHUB_ROOT="$ROOT"

ACS_HOST="${BH_ACS_HOST:-acs-annet.billinghub.id}"
ACS_PORT="${BH_ACS_PORT:-7547}"
ACS_USER="${BH_ACS_USER:-msn}"
ACS_PASS="${BH_ACS_PASS:-msn}"

if [[ $EUID -ne 0 ]]; then
  echo "Jalankan: sudo BH_ACS_HOST=... bash scripts/deploy-fix-rpc.sh" >&2
  exit 1
fi

cd "$ROOT"
find scripts db/provisions -name '*.sh' -o -name '*.js' | xargs sed -i 's/\r$//' 2>/dev/null || true

echo "=== Patch inform + refresh-wlan (RPC budget) ==="
bash "$ROOT/scripts/patch-inform.sh" "$ACS_HOST" "$ACS_PORT" "$ACS_USER" "$ACS_PASS"

mongosh genieacs --quiet --eval "
const fs = require('fs');
const rw = '$ROOT/db/provisions/refresh-wlan.js';
db.provisions.updateOne({ _id: 'refresh-wlan' }, { \$set: { script: fs.readFileSync(rw, 'utf8') } });
print('OK refresh-wlan -> light version');
"

mongosh genieacs --quiet "$ROOT/scripts/patch-preset-wlan-boot.mongosh.js"

systemctl restart genieacs-cwmp
sleep 2
systemctl is-active genieacs-cwmp
echo "OK: RPC fix deployed on $ACS_HOST"
