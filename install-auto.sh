#!/usr/bin/env bash
# Non-interactive install — dipakai saat deploy otomatis
# Env: BH_ACS_HOST, BH_ACS_PORT, BH_ACS_USER, BH_ACS_PASS, BH_UI_PASS, BH_ZEROTIER
export BH_ACS_HOST="${BH_ACS_HOST:-$(hostname -I | awk '{print $1}')}"
export BH_ACS_PORT="${BH_ACS_PORT:-7547}"
export BH_ACS_USER="${BH_ACS_USER:-msn}"
export BH_ACS_PASS="${BH_ACS_PASS:-msn}"
export BH_UI_PASS="${BH_UI_PASS:-bilhub90}"
export BH_ZEROTIER="${BH_ZEROTIER:-n}"

exec "$(dirname "$0")/install.sh" <<EOF
${BH_ACS_HOST}
${BH_ACS_PORT}
${BH_ACS_USER}
${BH_ACS_PASS}
${BH_UI_PASS}
${BH_ZEROTIER}
y
EOF
