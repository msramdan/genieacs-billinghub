#!/usr/bin/env bash
# Patch inform provision dengan ACS URL server
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

ACS_HOST="${1:-$(hostname -I | awk '{print $1}')}"
ACS_PORT="${2:-7547}"
ACS_USER="${3:?Usage: $0 <host> [port] <user> <pass>}"
ACS_PASS="${4:?Usage: $0 <host> [port] <user> <pass>}"

# Support full URL or host
if [[ "$ACS_HOST" == http* ]]; then
  ACS_URL="$ACS_HOST"
else
  ACS_URL="http://${ACS_HOST}:${ACS_PORT}"
fi

PATCHED="$ROOT_DIR/db/provisions/inform.patched.js"
sed \
  -e "s|__ACS_URL__|${ACS_URL}|g" \
  -e "s|__ACS_USER__|${ACS_USER}|g" \
  -e "s|__ACS_PASS__|${ACS_PASS}|g" \
  "$ROOT_DIR/db/provisions/inform.js" > "$PATCHED"

mongosh genieacs --quiet --eval "
const fs = require('fs');
const script = fs.readFileSync('$PATCHED', 'utf8');
db.provisions.updateOne({ _id: 'inform' }, { \$set: { script } }, { upsert: true });
db.presets.updateOne(
  { _id: 'inform' },
  { \$set: {
      weight: 0,
      channel: 'inform',
      precondition: '',
      events: {},
      configurations: [{ type: 'provision', name: 'inform', args: null }]
    }
  },
  { upsert: true }
);
db.cache.deleteMany({ _id: { \$in: ['cwmp-local-cache-hash', 'ui-local-cache-hash'] } });
print('Provision inform -> $ACS_URL');
"

rm -f "$PATCHED"
