#!/usr/bin/env bash
# Set UI + TR-069 credentials seragam (admin / bilhub90)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${BH_ACS_HOST:?Set BH_ACS_HOST}"
USER="${BH_ACS_USER:-admin}"
PASS="${BH_ACS_PASS:-bilhub90}"
UI="${BH_UI_PASS:-bilhub90}"
PORT="${BH_ACS_PORT:-7547}"

cd "$ROOT"
bash "$ROOT/scripts/set-admin-password.sh" "$UI"
bash "$ROOT/scripts/patch-inform.sh" "$HOST" "$PORT" "$USER" "$PASS"
systemctl restart genieacs-cwmp genieacs-ui
sleep 2
echo "OK: $HOST — UI admin/$UI, TR-069 $USER/$PASS"
