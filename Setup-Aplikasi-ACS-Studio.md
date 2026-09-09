# Setup Aplikasi ACS Studio

Panduan memasang aplikasi **ACS Studio** (UI wizard) di PC atau server.

Untuk alur pemula (install ACS ke VPS, modem, L2TP/Summon): lihat **[Panduan-Pemula-ACS.md](Panduan-Pemula-ACS.md)**.

## Konfigurasi (env pusat)

Semua setting UI ada di **`theme-studio/.env`**:

```bash
cd theme-studio
cp .env.example .env
# edit .env jika perlu
```

| Variabel | Default | Fungsi |
|----------|---------|--------|
| `PORT` | `5174` (lokal) | Port API; UI Vite di **5173**. Docker tetap **5173**. |
| `NODE_ENV` | `development` | Mode Node |
| `AUTH_USER` | `admin` | Username login Studio |
| `AUTH_PASS` | `billinghub01` | Password login Studio |

Template: `theme-studio/.env.example` (aman di-commit).  
File `.env` jangan di-commit.

## Persyaratan

- Node.js **20+** (PC), atau **Docker** (server)
- Repo `genieacs-billinghub` lengkap
- Port **5173** bebas (atau sesuai `PORT` di `.env`)

---

## 1. Install di PC (tanpa Docker)

```bash
cd theme-studio
cp .env.example .env
npm install
npm run dev
```

Buka: **http://127.0.0.1:5173**  
Login: sesuai `AUTH_USER` / `AUTH_PASS` di `.env`

---

## 2. Install dengan Docker (server)

```bash
cd /path/ke/genieacs-billinghub
cp theme-studio/.env.example theme-studio/.env
# edit theme-studio/.env jika perlu

docker compose -f theme-studio/docker-compose.yml up -d --build
```

Buka: **http://IP-SERVER:5173**  
Login: sesuai `.env`

Cek status:

```bash
docker ps --filter name=ACS-Studio
docker logs ACS-Studio --tail 20
```

### Update aplikasi

```bash
cd /path/ke/genieacs-billinghub
docker compose -f theme-studio/docker-compose.yml build
docker rm -f ACS-Studio
docker compose -f theme-studio/docker-compose.yml up -d
```

### Jika compose gagal buat network

Pastikan `theme-studio/.env` sudah ada, lalu:

```bash
docker compose -f theme-studio/docker-compose.yml build
docker rm -f ACS-Studio 2>/dev/null || true
set -a; source theme-studio/.env; set +a
docker run -d \
  --name ACS-Studio \
  --restart unless-stopped \
  --network host \
  -e PORT \
  -e NODE_ENV \
  -e AUTH_USER \
  -e AUTH_PASS \
  theme-studio-acs-studio:latest
```
