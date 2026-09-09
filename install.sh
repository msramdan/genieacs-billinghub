#!/usr/bin/env bash
# ============================================================
# BillingHub GenieACS — Auto Installer
# Tema custom BillingHub + parameter multi-vendor (ZTE/Huawei/FiberHome)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() {
  echo -e "${GREEN}"
  echo "================================================================"
  echo "   ____  _ _ _ _ _   _ _   _       _   _       _    "
  echo "  | __ )(_) | | | | | | | | |     | | | |     | |   "
  echo "  |  _ \\| | | | | |_| | |_| | __ _| |_| |__   | |__ "
  echo "  | |_) | | | | |  _  |  _  |/ _\` | __| '_ \\  | '_ \\"
  echo "  |____/|_|_|_| |_| |_|_| |_|\\__,_|\\__|_.__/  |_.__/"
  echo "              GenieACS — BillingHub.id Edition"
  echo "================================================================"
  echo -e "${NC}"
}

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }
ask()  { echo -en "${CYAN}[?]${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
  err "Jalankan sebagai root: sudo bash install.sh"
fi

banner

echo -e "${YELLOW}Catatan instalasi:${NC}"
echo "  • Cocok untuk VPS / server / STB yang masih fresh (kosong)."
echo "  • Ideal 1 mesin = 1 peran ACS (port 3000, 7547, 7557, 7567)."
echo "  • Kalau ACS sudah jalan & ada data device: jangan full install ulang."
echo "    Pakai sync-config agar data modem aman."
echo ""

# --- Konfigurasi ---
# Non-interactive (ACS Studio): set BH_NONINTERACTIVE=1 + env vars
LOCAL_IP=$(hostname -I | awk '{print $1}')
NONINTERACTIVE="${BH_NONINTERACTIVE:-0}"

if [[ "$NONINTERACTIVE" == "1" || "$NONINTERACTIVE" == "true" ]]; then
  ACS_HOST="${ACS_HOST:-${BH_ACS_HOST:-$LOCAL_IP}}"
  ACS_PORT="${ACS_PORT:-${BH_ACS_PORT:-7547}}"
  ACS_USER="${ACS_USER:-${BH_ACS_USER:-admin}}"
  # Placeholder — ACS Studio / set-random-credentials akan ganti setelah install
  ACS_PASS="${ACS_PASS:-${BH_ACS_PASS:-changeme}}"
  UI_ADMIN_PASS="${UI_ADMIN_PASS:-${BH_UI_PASS:-changeme}}"
  INSTALL_ZT="${INSTALL_ZT:-n}"
  log "Mode non-interactive (ACS Studio)"
else
  gen_pass() { openssl rand -hex 10 2>/dev/null || head -c 16 /dev/urandom | xxd -p | head -c 20; }
  echo ""
  ask "Domain/IP ACS CWMP [$LOCAL_IP]: "
  read -r ACS_HOST
  ACS_HOST="${ACS_HOST:-$LOCAL_IP}"

  ask "Port CWMP [7547]: "
  read -r ACS_PORT
  ACS_PORT="${ACS_PORT:-7547}"

  ask "Username ACS TR-069 [admin]: "
  read -r ACS_USER
  ACS_USER="${ACS_USER:-admin}"

  ask "Password ACS TR-069 [acak otomatis]: "
  read -r ACS_PASS
  ACS_PASS="${ACS_PASS:-$(gen_pass)}"

  ask "Password admin UI GenieACS [acak otomatis / sama TR-069]: "
  read -r UI_ADMIN_PASS
  UI_ADMIN_PASS="${UI_ADMIN_PASS:-$ACS_PASS}"

  ask "Install ZeroTier untuk NAT traversal? (y/n) [n]: "
  read -r INSTALL_ZT
  INSTALL_ZT="${INSTALL_ZT:-n}"
fi

ACS_URL="http://${ACS_HOST}:${ACS_PORT}"

echo ""
log "Konfigurasi:"
echo "  ACS URL     : $ACS_URL"
echo "  ACS Auth    : $ACS_USER / ****"
echo "  UI Admin    : admin / ****"
echo "  ZeroTier    : $INSTALL_ZT"
echo ""

if [[ "$NONINTERACTIVE" != "1" && "$NONINTERACTIVE" != "true" ]]; then
  ask "Lanjutkan instalasi? (y/n): "
  read -r CONFIRM
  [[ "$CONFIRM" == "y" ]] || err "Instalasi dibatalkan."
else
  log "Lanjut install otomatis…"
fi

# Tunggu / lepaskan apt lock (sering dipegang unattended-upgrades di VPS baru)
wait_for_apt() {
  local max="${1:-180}"
  local i=0
  log "Menyiapkan apt (cek unattended-upgrades / dpkg lock)…"
  systemctl stop unattended-upgrades 2>/dev/null || true
  systemctl stop apt-daily.service apt-daily-upgrade.service 2>/dev/null || true
  systemctl kill --kill-who=all unattended-upgrades 2>/dev/null || true
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 \
     || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 \
     || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
    if (( i >= max )); then
      warn "Apt masih terkunci — mencoba lanjut…"
      break
    fi
    if (( i % 15 == 0 )); then
      log "Menunggu apt lock… (${i}s/${max}s)"
    fi
    sleep 1
    ((i++)) || true
  done
  dpkg --configure -a 2>/dev/null || true
}

wait_for_apt 180

# ============================================================
# 1. Node.js
# ============================================================
if ! command -v node >/dev/null 2>&1; then
  log "Install Node.js 20..."
  wait_for_apt 120
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  wait_for_apt 60
  apt-get install -y nodejs
else
  log "Node.js sudah ada: $(node -v)"
fi

# ============================================================
# 2. MongoDB
# ============================================================
if ! systemctl is-active --quiet mongod 2>/dev/null; then
  log "Install MongoDB..."
  wait_for_apt 60
  ubuntu_codename=""
  if [[ -r /etc/os-release ]]; then
    ubuntu_codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}")"
  fi
  [[ -z "$ubuntu_codename" ]] && command -v lsb_release >/dev/null && ubuntu_codename="$(lsb_release -sc)"

  # MongoDB apt hanya punya beberapa distro. Map Ubuntu baru/unknown → noble.
  mongo_distro=""
  mongodb_major="8.0"
  case "$ubuntu_codename" in
    focal)
      mongodb_major="4.4"
      mongo_distro="focal"
      ;;
    jammy)
      mongodb_major="8.0"
      mongo_distro="jammy"
      ;;
    noble)
      mongodb_major="8.0"
      mongo_distro="noble"
      ;;
    *)
      # oracular / plucky / resolute / dll — pakai paket noble
      mongodb_major="8.0"
      mongo_distro="noble"
      warn "Ubuntu '$ubuntu_codename' belum ada di repo MongoDB resmi — memakai paket noble."
      ;;
  esac

  apt-get update -y
  apt-get install -y gnupg curl
  install -d -m 0755 /usr/share/keyrings
  curl -fsSL "https://www.mongodb.org/static/pgp/server-${mongodb_major}.asc" \
    | gpg --dearmor -o "/usr/share/keyrings/mongodb-server-${mongodb_major}.gpg"
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${mongodb_major}.gpg ] \
https://repo.mongodb.org/apt/ubuntu ${mongo_distro}/mongodb-org/${mongodb_major} multiverse" \
    > "/etc/apt/sources.list.d/mongodb-org-${mongodb_major}.list"
  # Hapus list MongoDB lama yang salah (mis. resolute/4.4)
  rm -f /etc/apt/sources.list.d/mongodb-org-4.4.list 2>/dev/null || true
  wait_for_apt 60
  apt-get update -y
  apt-get install -y mongodb-org
  systemctl enable --now mongod
  sleep 3
  log "MongoDB $mongodb_major siap (repo: $mongo_distro)."
else
  log "MongoDB sudah berjalan."
fi

# ============================================================
# 3. GenieACS
# ============================================================
if ! systemctl is-active --quiet genieacs-cwmp 2>/dev/null; then
  log "Install GenieACS 1.2.16..."
  npm install -g genieacs@1.2.16
  GENIEACS_NPM="$(npm root -g)/genieacs"

  useradd --system --no-create-home --user-group genieacs 2>/dev/null
  mkdir -p /opt/genieacs/ext /var/log/genieacs

  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)

  cat > /opt/genieacs/genieacs.env <<EOF
GENIEACS_CWMP_ACCESS_LOG_FILE=/var/log/genieacs/genieacs-cwmp-access.log
GENIEACS_NBI_ACCESS_LOG_FILE=/var/log/genieacs/genieacs-nbi-access.log
GENIEACS_FS_ACCESS_LOG_FILE=/var/log/genieacs/genieacs-fs-access.log
GENIEACS_UI_ACCESS_LOG_FILE=/var/log/genieacs/genieacs-ui-access.log
GENIEACS_DEBUG_FILE=/var/log/genieacs/genieacs-debug.yaml
GENIEACS_EXT_DIR=/opt/genieacs/ext
GENIEACS_UI_JWT_SECRET=${JWT_SECRET}
GENIEACS_CWMP_INTERFACE=0.0.0.0
GENIEACS_NBI_INTERFACE=0.0.0.0
GENIEACS_UI_INTERFACE=0.0.0.0
EOF

  chown -R genieacs:genieacs /opt/genieacs /var/log/genieacs
  chmod 600 /opt/genieacs/genieacs.env

  for svc in cwmp nbi fs ui; do
    if [[ "$svc" == "ui" ]]; then
      cat > "/etc/systemd/system/genieacs-${svc}.service" <<EOF
[Unit]
Description=GenieACS UI
After=network.target mongod.service

[Service]
User=genieacs
EnvironmentFile=/opt/genieacs/genieacs.env
WorkingDirectory=${GENIEACS_NPM}
ExecStart=/usr/bin/node bin/genieacs-ui
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    else
      cat > "/etc/systemd/system/genieacs-${svc}.service" <<EOF
[Unit]
Description=GenieACS ${svc^^}
After=network.target mongod.service

[Service]
User=genieacs
EnvironmentFile=/opt/genieacs/genieacs.env
ExecStart=/usr/bin/genieacs-${svc}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    fi
  done

  cat > /etc/logrotate.d/genieacs <<'EOF'
/var/log/genieacs/*.log /var/log/genieacs/*.yaml {
    daily
    rotate 30
    compress
    delaycompress
    dateext
    missingok
    notifempty
}
EOF

  systemctl daemon-reload
  systemctl enable --now genieacs-{cwmp,nbi,fs,ui}
  sleep 5
  log "GenieACS services started."
else
  log "GenieACS sudah terinstall."
fi

# ============================================================
# 4. BillingHub Custom UI
# ============================================================
log "Deploy tema BillingHub UI..."
if command -v node >/dev/null 2>&1; then
  node "$ROOT_DIR/scripts/build-logo.js" 2>/dev/null || warn "build-logo.js gagal — pastikan logo.png ada di root project"
  node "$ROOT_DIR/scripts/patch-pie-chart.js" 2>/dev/null || true
  node "$ROOT_DIR/scripts/build-ui.js" 2>/dev/null || true
fi
GENIEACS_NPM=$(npm root -g)/genieacs
if [[ -d "$ROOT_DIR/genieacs/public" ]]; then
  cp -r "$ROOT_DIR/genieacs/public/"* "$GENIEACS_NPM/public/"
  if [[ -f "$ROOT_DIR/logo.png" ]]; then
    cp "$ROOT_DIR/logo.png" "$GENIEACS_NPM/public/logo.png"
    log "Logo BillingHub deployed."
  else
    warn "logo.png tidak ditemukan di root project."
  fi
  log "UI BillingHub deployed ke $GENIEACS_NPM/public/"
  UI_BIN="$GENIEACS_NPM/bin/genieacs-ui"
  if command -v node >/dev/null 2>&1 && [[ -f "$ROOT_DIR/scripts/patch-genieacs-ui-html.js" ]]; then
    node "$ROOT_DIR/scripts/patch-genieacs-ui-html.js" "$UI_BIN"
    log "genieacs-ui patched (viewport + theme toggle)."
  fi
  # Paksa semua bundle JS pakai logo.png (lebih reliable dari SVG hash)
  for jsf in "$GENIEACS_NPM/public"/app*.js; do
    [[ -f "$jsf" ]] || continue
    sed -i 's/logo-[a-f0-9]*\.svg/logo.png/g; s/"logo\.svg"/"logo.png"/g' "$jsf"
  done
  log "Logo refs patched di JS bundles."
else
  warn "Folder genieacs/public tidak ditemukan, skip UI custom."
fi

# ============================================================
# 5. Restore Parameter Database
# ============================================================
log "Restore virtual parameters, provisions, UI config..."
bash "$ROOT_DIR/scripts/restore-db.sh"

log "Sync provisions dari repo (refresh-lan/wlan, useradmin ONT)..."
BILLINGHUB_ROOT="$ROOT_DIR" mongosh genieacs --quiet "$ROOT_DIR/scripts/sync-provisions-from-repo.mongosh.js"

log "Patch provision inform -> $ACS_URL"
bash "$ROOT_DIR/scripts/patch-inform.sh" "$ACS_URL" "$ACS_PORT" "$ACS_USER" "$ACS_PASS"

# Set admin password
log "Set password admin UI..."
bash "$ROOT_DIR/scripts/set-admin-password.sh" "$UI_ADMIN_PASS"

log "Fix capability ping UI (genieacs user)..."
bash "$ROOT_DIR/scripts/fix-ping-capability.sh"

systemctl restart genieacs-{cwmp,fs,ui,nbi}
sleep 3

# ============================================================
# 6. ZeroTier (opsional — untuk summon melalui NAT)
# ============================================================
if [[ "$INSTALL_ZT" == "y" ]]; then
  log "Install ZeroTier..."
  if ! command -v zerotier-cli >/dev/null 2>&1; then
    curl -s https://install.zerotier.com | bash
  fi
  echo ""
  warn "Join network ZeroTier Anda:"
  warn "  zerotier-cli join <NETWORK_ID>"
  warn "Pastikan ONU/CPE juga terhubung ke network ZeroTier yang sama."
  warn "Dengan ZeroTier, ACS bisa reach ConnectionRequestURL perangkat di belakang NAT."
fi

# ============================================================
# 7. Firewall (UFW)
# ============================================================
if command -v ufw >/dev/null 2>&1; then
  ufw allow 7547/tcp comment 'GenieACS CWMP' 2>/dev/null || true
  ufw allow 7557/tcp comment 'GenieACS NBI' 2>/dev/null || true
  ufw allow 7567/tcp comment 'GenieACS FS' 2>/dev/null || true
  ufw allow 3000/tcp comment 'GenieACS UI' 2>/dev/null || true
fi

# ============================================================
# Selesai
# ============================================================
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  Instalasi BillingHub GenieACS SELESAI!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""
echo -e "  ${CYAN}UI GenieACS${NC}   : http://${LOCAL_IP}:3000"
echo -e "  ${CYAN}Login UI${NC}      : admin / ${UI_ADMIN_PASS}"
echo -e "  ${CYAN}CWMP ACS${NC}      : ${ACS_URL}"
echo -e "  ${CYAN}NBI API${NC}       : http://${LOCAL_IP}:7557"
echo -e "  ${CYAN}TR-069 Auth${NC}   : ${ACS_USER} / ****"
echo ""
echo -e "  ${YELLOW}Catatan Summon:${NC}"
echo "  - Perangkat di belakang NAT/CGNAT (IP 10.x.x.x) membutuhkan"
echo "    ZeroTier/VPN agar tombol Summon langsung berfungsi."
echo "  - Tanpa NAT traversal, task SSID/password tetap jalan saat"
echo "    perangkat Inform berikutnya (interval ~200 detik)."
echo ""
echo -e "  ${YELLOW}Password WiFi ZTE CMCC:${NC}"
echo "  - Beberapa firmware ZTE F660/F670 mengembalikan password kosong"
echo "    (write-only). Password tetap bisa di-SET via ACS."
echo ""
echo -e "${GREEN}================================================================${NC}"
