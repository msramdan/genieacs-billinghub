#!/usr/bin/env bash
# Set GenieACS admin password
set -euo pipefail
PASS="${1:-bilhub90}"

HASH_JSON=$(node -e "
const c=require('crypto');
const p=process.argv[1];
const s=c.randomBytes(64).toString('hex');
const h=c.pbkdf2Sync(p,s,10000,128,'sha512').toString('hex');
console.log(JSON.stringify({password:h,salt:s}));
" "$PASS")

mongosh genieacs --quiet --eval "
const h = $HASH_JSON;
db.users.updateOne(
  { _id: 'admin' },
  { \$set: { password: h.password, salt: h.salt, roles: 'admin' } },
  { upsert: true }
);
db.cache.deleteOne({ _id: 'ui-local-cache-hash' });
print('Admin password updated');
"
