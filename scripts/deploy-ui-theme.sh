#!/usr/bin/env bash
# Deploy BillingHub UI theme + dark/light toggle tanpa reinstall penuh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Jalankan: sudo bash scripts/deploy-ui-theme.sh" >&2
  exit 1
fi

GENIEACS_NPM="$(npm root -g)/genieacs"
if [[ ! -d "$GENIEACS_NPM/public" ]]; then
  echo "GenieACS npm tidak ditemukan: $GENIEACS_NPM" >&2
  exit 1
fi

cd "$ROOT_DIR"
if command -v node >/dev/null 2>&1; then
  node "$ROOT_DIR/scripts/build-logo.js" 2>/dev/null || true
  node "$ROOT_DIR/scripts/patch-pie-chart.js" 2>/dev/null || true
  node "$ROOT_DIR/scripts/build-ui.js"
fi

cp -r "$ROOT_DIR/genieacs/public/"* "$GENIEACS_NPM/public/"
[[ -f "$ROOT_DIR/logo.png" ]] && cp "$ROOT_DIR/logo.png" "$GENIEACS_NPM/public/logo.png"

UI_BIN="$GENIEACS_NPM/bin/genieacs-ui"
node "$ROOT_DIR/scripts/patch-genieacs-ui-html.js" "$UI_BIN"

for jsf in "$GENIEACS_NPM/public"/app*.js; do
  [[ -f "$jsf" ]] || continue
  sed -i 's/logo-[a-f0-9]*\.svg/logo.png/g; s/"logo\.svg"/"logo.png"/g' "$jsf"
done

systemctl restart genieacs-ui
sleep 2
echo "OK: UI theme + toggle deployed -> $GENIEACS_NPM/public/"
echo "OK: genieacs-ui patched -> $UI_BIN"
systemctl is-active genieacs-ui
