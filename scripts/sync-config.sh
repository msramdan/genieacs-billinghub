#!/usr/bin/env bash
# ============================================================
# BillingHub ACS — Sync config identik (tanpa hapus device)
# Satu-satunya perbedaan antar server: BH_ACS_HOST (domain ACS)
#
# Usage:
#   sudo BH_ACS_HOST=acs.example.com \
#        BH_ACS_USER=admin BH_ACS_PASS='...' BH_UI_PASS='...' \
#        bash scripts/sync-config.sh
#
# Env wajib: BH_ACS_HOST, BH_ACS_USER, BH_ACS_PASS, BH_UI_PASS
# Env opsional: BH_ACS_PORT (default 7547)
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export BILLINGHUB_ROOT="$ROOT"

BH_ACS_HOST="${BH_ACS_HOST:-}"
BH_ACS_PORT="${BH_ACS_PORT:-7547}"
BH_ACS_USER="${BH_ACS_USER:?Set BH_ACS_USER}"
BH_ACS_PASS="${BH_ACS_PASS:?Set BH_ACS_PASS}"
BH_UI_PASS="${BH_UI_PASS:?Set BH_UI_PASS}"

if [[ -z "$BH_ACS_HOST" ]]; then
  echo "Set BH_ACS_HOST (domain/IP ACS server ini), contoh:" >&2
  echo "  sudo BH_ACS_HOST=acs.example.com BH_ACS_USER=... BH_ACS_PASS=... BH_UI_PASS=... bash scripts/sync-config.sh" >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Jalankan dengan sudo" >&2
  exit 1
fi

cd "$ROOT"
find . -name '*.sh' -o -name '*.js' -o -name '*.mongosh.js' | xargs sed -i 's/\r$//' 2>/dev/null || true

echo "================================================================"
echo " BillingHub sync-config"
echo " Server ACS : http://${BH_ACS_HOST}:${BH_ACS_PORT}"
echo " Repo       : $ROOT"
echo "================================================================"

echo "=== [1/7] UI tema BillingHub ==="
bash "$ROOT/scripts/deploy-ui-theme.sh"

echo "=== [2/7] Import VP, provisions, presets, config (devices TIDAK dihapus) ==="
bash "$ROOT/scripts/restore-db.sh"

echo "=== [3/7] Provisions & VP dari db/provisions + db/virtualParameters ==="
mongosh genieacs --quiet "$ROOT/scripts/sync-provisions-from-repo.mongosh.js"

echo "=== [4/7] Patch inform -> domain server ==="
bash "$ROOT/scripts/patch-inform.sh" "$BH_ACS_HOST" "$BH_ACS_PORT" "$BH_ACS_USER" "$BH_ACS_PASS"

echo "=== [5/7] Password admin UI ==="
bash "$ROOT/scripts/set-admin-password.sh" "$BH_UI_PASS"

echo "=== [6/7] Fix capability ping UI (genieacs user) ==="
bash "$ROOT/scripts/fix-ping-capability.sh"

echo "=== [7/7] Restart GenieACS ==="
systemctl restart genieacs-{cwmp,fs,ui,nbi}
sleep 3

DEVICES=$(mongosh genieacs --quiet --eval 'print(db.devices.countDocuments())')
VP=$(mongosh genieacs --quiet --eval 'print(db.virtualParameters.countDocuments())')
CFG=$(mongosh genieacs --quiet --eval 'print(db.config.countDocuments())')
RX_COL=$(mongosh genieacs --quiet --eval 'print(db.config.findOne({_id:"ui.index.7.parameter"}).value)')

echo ""
echo "================================================================"
echo " SYNC SELESAI — $BH_ACS_HOST"
echo "  devices=$DEVICES (utuh)"
echo "  virtualParameters=$VP"
echo "  config=$CFG"
echo "  ui.index.7 (RX)=$RX_COL"
echo "  UI admin: admin / ****"
echo "  TR-069  : $BH_ACS_USER / ****"
echo "================================================================"
