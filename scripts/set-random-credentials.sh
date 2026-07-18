#!/usr/bin/env bash
# ============================================================
# Generate + apply random credentials (UI = CWMP/TR-069 = NBI)
# Jangan pakai default lemah (msn, admin/bilhub90).
#
# Usage:
#   sudo BH_ACS_HOST=157.10.160.9 bash scripts/set-random-credentials.sh
#
# Optional:
#   BH_ACS_PORT=7547
#   BH_CRED_FILE=/opt/genieacs/acs-credentials.env
# ============================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Jalankan dengan sudo" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${BH_ACS_HOST:?Set BH_ACS_HOST}"
PORT="${BH_ACS_PORT:-7547}"
CRED_FILE="${BH_CRED_FILE:-/opt/genieacs/acs-credentials.env}"

# Random username: bh_ + 8 alnum (bukan admin/msn)
USER="bh_$(openssl rand -hex 4)"
# Random password: 20 hex chars
PASS="$(openssl rand -hex 10)"

echo "=== Generate credentials ==="
echo "User: $USER"
echo "Pass: (disimpan ke $CRED_FILE)"

# Hash untuk GenieACS UI user
HASH_JSON=$(node -e "
const c=require('crypto');
const p=process.argv[1];
const s=c.randomBytes(64).toString('hex');
const h=c.pbkdf2Sync(p,s,10000,128,'sha512').toString('hex');
console.log(JSON.stringify({password:h,salt:s}));
" "$PASS")

mongosh genieacs --quiet --eval "
const h = $HASH_JSON;
const u = '$USER';
// Hapus user lemah default jika ada
db.users.deleteMany({ _id: { \$in: ['admin', 'msn'] } });
db.users.updateOne(
  { _id: u },
  { \$set: { password: h.password, salt: h.salt, roles: 'admin' } },
  { upsert: true }
);
db.cache.deleteOne({ _id: 'ui-local-cache-hash' });
print('OK UI user:', u);
"

bash "$ROOT/scripts/patch-inform.sh" "$HOST" "$PORT" "$USER" "$PASS"

install -d -m 700 /opt/genieacs
cat > "$CRED_FILE" <<EOF
# BillingHub ACS credentials — generated $(date -u +%Y-%m-%dT%H:%M:%SZ)
# UI + CWMP/TR-069 + NBI memakai user/pass yang SAMA
# Jangan commit file ini ke git
BH_ACS_HOST=${HOST}
BH_ACS_PORT=${PORT}
BH_ACS_USER=${USER}
BH_ACS_PASS=${PASS}
BH_UI_USER=${USER}
BH_UI_PASS=${PASS}
EOF
chmod 600 "$CRED_FILE"

systemctl restart genieacs-cwmp genieacs-ui genieacs-nbi
sleep 2

echo ""
echo "================================================================"
echo " CREDENTIALS UPDATED — $HOST"
echo "================================================================"
echo " UI / CWMP / NBI user : $USER"
echo " UI / CWMP / NBI pass : $PASS"
echo " Saved                : $CRED_FILE"
echo " Modem ACS URL        : http://${HOST}:${PORT}"
echo "================================================================"
