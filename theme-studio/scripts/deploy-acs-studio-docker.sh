# Deploy helper — dijalankan DI SERVER (root)
# Tidak menyentuh service lain; hanya build & run container acs-studio.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/acs-studio}"
HOST_PORT="${HOST_PORT:-5173}"

echo "=== ACS Studio Docker deploy ==="
echo "Dir : $APP_DIR"
echo "Port: $HOST_PORT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker belum ada — install Docker Engine..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

# Pastikan compose plugin tersedia
if ! docker compose version >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y docker-compose-plugin || true
fi

cd "$APP_DIR"

# Cek port bentrok
if ss -lnt | awk '{print $4}' | grep -qE "[:.]${HOST_PORT}$"; then
  if ! docker ps --format '{{.Names}}' | grep -qx 'ACS-Studio'; then
    echo "WARNING: Port $HOST_PORT sudah dipakai. Cek: ss -lntp | grep $HOST_PORT"
    echo "Set HOST_PORT lain, contoh: HOST_PORT=5190 bash scripts/deploy-acs-studio-docker.sh"
    exit 1
  fi
fi

# Ganti hanya container ACS-Studio — jangan down project lain
if docker ps -a --format '{{.Names}}' | grep -qx 'ACS-Studio'; then
  echo "Mengganti container ACS-Studio lama..."
  docker rm -f ACS-Studio || true
fi

# Build image, lalu run host-network (hindari buat bridge/iptables baru)
docker compose -f theme-studio/docker-compose.yml build
docker run -d \
  --name ACS-Studio \
  --restart unless-stopped \
  --network host \
  -e "PORT=${HOST_PORT}" \
  -e NODE_ENV=production \
  theme-studio-acs-studio:latest

echo ""
echo "=== Selesai ==="
docker ps --filter name=ACS-Studio --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "Buka: http://${IP:-SERVER}:${HOST_PORT}"
