#!/usr/bin/env bash
# Restore provisions + presets dari export, lalu patch inform dengan ACS URL
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
NC='\033[0m'

ACS_HOST="${1:-$(hostname -I | awk '{print $1}')}"
ACS_PORT="${2:-7547}"
ACS_USER="${3:-msn}"
ACS_PASS="${4:-msn}"

echo -e "${GREEN}[BillingHub ACS]${NC} Restore provisions & presets..."
export BILLINGHUB_ROOT="$ROOT_DIR"
mongosh genieacs --quiet "$SCRIPT_DIR/restore-provisions.mongosh.js"

echo -e "${GREEN}[BillingHub ACS]${NC} Patch provision inform..."
bash "$SCRIPT_DIR/patch-inform.sh" "$ACS_HOST" "$ACS_PORT" "$ACS_USER" "$ACS_PASS"

echo -e "${GREEN}[BillingHub ACS]${NC} Restart GenieACS..."
systemctl restart genieacs-{cwmp,fs,ui,nbi} 2>/dev/null || sudo systemctl restart genieacs-{cwmp,fs,ui,nbi}

echo -e "${GREEN}[BillingHub ACS]${NC} Provisions restored (bootstrap, default, inform)."
