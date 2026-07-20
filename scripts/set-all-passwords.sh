#!/usr/bin/env bash
# Set UI + TR-069 credentials (wajib set via env — tanpa default password di repo)
# Usage:
#   sudo BH_ACS_HOST=acs.example.com BH_ACS_USER=admin BH_ACS_PASS='...' BH_UI_PASS='...' \
#     bash scripts/set-all-passwords.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${BH_ACS_HOST:?Set BH_ACS_HOST}"
USER="${BH_ACS_USER:?Set BH_ACS_USER}"
PASS="${BH_ACS_PASS:?Set BH_ACS_PASS}"
UI="${BH_UI_PASS:?Set BH_UI_PASS}"
PORT="${BH_ACS_PORT:-7547}"

cd "$ROOT"
bash "$ROOT/scripts/set-admin-password.sh" "$UI"
bash "$ROOT/scripts/patch-inform.sh" "$HOST" "$PORT" "$USER" "$PASS"
systemctl restart genieacs-cwmp genieacs-ui
sleep 2
echo "OK: $HOST — credentials updated (UI + TR-069)"
