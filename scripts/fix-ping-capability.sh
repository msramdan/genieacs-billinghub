#!/usr/bin/env bash
# Fix UI "Pinging x.x.x.x: Error!" — GenieACS runs ping as user genieacs.
# Without CAP_NET_RAW, ICMP fails even when the ACS can reach the ONT as root.
set -euo pipefail

PING_BIN="$(command -v ping || true)"
if [[ -z "$PING_BIN" ]]; then
  echo "[!] ping binary not found — skip"
  exit 0
fi

# Prefer setcap (works without setuid)
if command -v setcap >/dev/null 2>&1; then
  setcap cap_net_raw+ep "$PING_BIN" 2>/dev/null \
    || setcap cap_net_raw+ep "$(readlink -f "$PING_BIN")" 2>/dev/null \
    || true
fi

# Fallback: setuid root (older distros / if setcap unavailable)
if ! getcap "$PING_BIN" 2>/dev/null | grep -q cap_net_raw; then
  REAL="$(readlink -f "$PING_BIN")"
  if ! getcap "$REAL" 2>/dev/null | grep -q cap_net_raw; then
    chmod u+s "$REAL" 2>/dev/null || true
  fi
fi

if getcap "$(readlink -f "$PING_BIN")" 2>/dev/null | grep -q cap_net_raw \
  || [[ -u "$(readlink -f "$PING_BIN")" ]]; then
  echo "[✓] ping capability OK ($(readlink -f "$PING_BIN"))"
else
  echo "[!] Could not set ping capability — UI ping may show Error"
fi
