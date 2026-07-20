#!/usr/bin/env bash
# Non-interactive install — wajib set kredensial via env (tanpa default password di repo)
# Env wajib: BH_ACS_PASS, BH_UI_PASS
# Env opsional: BH_ACS_HOST, BH_ACS_PORT, BH_ACS_USER, BH_ZEROTIER
set -euo pipefail

export BH_ACS_HOST="${BH_ACS_HOST:-$(hostname -I | awk '{print $1}')}"
export BH_ACS_PORT="${BH_ACS_PORT:-7547}"
export BH_ACS_USER="${BH_ACS_USER:-admin}"
: "${BH_ACS_PASS:?Set BH_ACS_PASS}"
: "${BH_UI_PASS:?Set BH_UI_PASS}"
export BH_ACS_PASS BH_UI_PASS
export BH_ZEROTIER="${BH_ZEROTIER:-n}"
export BH_NONINTERACTIVE=1

exec "$(dirname "$0")/install.sh"
