# ACS Studio — Cara Install

Wizard UI untuk memasang **GenieACS BillingHub** di VPS kosong (logo, warna, opsional L2TP/MikroTik) lewat SSH.

## Persyaratan

- Node.js **20+** (jalankan di PC), atau **Docker** (jalankan di server)
- Repo `genieacs-billinghub` lengkap
- Port **5173** bebas

---

## A. Install di PC (tanpa Docker)

```bash
cd theme-studio
npm install
npm run dev
```

Buka: **http://127.0.0.1:5173**

Opsional — aktifkan login:

```bash
# Linux / macOS
AUTH_USER=admin AUTH_PASS=rahasia npm run dev

# Windows PowerShell
$env:AUTH_USER="admin"; $env:AUTH_PASS="rahasia"; npm run dev
```

---

## B. Install dengan Docker (server)

Jalankan dari **root repo** `genieacs-billinghub`:

```bash
cd /path/ke/genieacs-billinghub

export AUTH_USER=admin
export AUTH_PASS='password-kuat'
export PORT=5173

docker compose -f theme-studio/docker-compose.yml up -d --build
```

Buka: **http://IP-SERVER:5173**

Cek:

```bash
docker ps --filter name=ACS-Studio
docker logs ACS-Studio --tail 20
```

### Update

```bash
cd /path/ke/genieacs-billinghub
docker compose -f theme-studio/docker-compose.yml build
docker rm -f ACS-Studio
AUTH_USER=admin AUTH_PASS='...' PORT=5173 \
  docker compose -f theme-studio/docker-compose.yml up -d
```

### Jika compose gagal buat network

```bash
docker compose -f theme-studio/docker-compose.yml build
docker rm -f ACS-Studio 2>/dev/null || true
docker run -d \
  --name ACS-Studio \
  --restart unless-stopped \
  --network host \
  -e PORT=5173 \
  -e NODE_ENV=production \
  -e AUTH_USER=admin \
  -e AUTH_PASS='password-kuat' \
  theme-studio-acs-studio:latest
```

---

## Cara pakai

1. Buka ACS Studio → login (jika auth aktif)
2. Isi IP + SSH VPS kosong → Test koneksi
3. L2TP/MikroTik (opsional) → Logo & warna → Instalasi
4. Simpan username/password ACS yang muncul di akhir

Gunakan **VPS fresh** (belum ada ACS). Jangan full-install ulang ke server yang sudah punya data device.
