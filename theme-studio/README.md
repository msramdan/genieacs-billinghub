# ACS Studio

UI lokal untuk ganti **logo** + **nuansa warna** GenieACS BillingHub di server remote via **SSH**.

## Rollback

Sebelum ACS Studio dibuat, git tag:

```bash
git checkout pre-theme-studio
# atau
git reset --hard pre-theme-studio
```

## Jalankan di PC (Windows/macOS/Linux)

```bash
cd theme-studio
npm install
npm run dev
```

- Web UI: http://127.0.0.1:5173  
- API: http://127.0.0.1:5174  

## Alur

1. Isi **IP, Port SSH (22), Username, Password** VPS → **Test koneksi**
2. Setelah OK → upload **logo** + pilih **template warna** (atau hex custom)
3. **Deploy** → upload ke `genieacs/public/`, patch `app.css` + semua `app-*.css`, restart `genieacs-ui`
4. Hard refresh browser ACS (`Ctrl+F5`)

## Catatan

- Target install: **VPS / server / STB fresh** (kosong). Ideal 1 mesin = 1 ACS.
- Sudah ada ACS + data device → jangan full install; pakai sync / ACS Studio saja.
- Butuh akses **SSH** ke VPS (bukan login UI GenieACS `admin/...`)
- User SSH perlu full akses (sudo/root) agar bisa tulis folder GenieACS public
- Tidak menghapus device / config MongoDB — hanya asset UI

## Preset warna

Teal (default BillingHub), Ocean, Ember, Forest, Slate, Rose — atau custom hex.
