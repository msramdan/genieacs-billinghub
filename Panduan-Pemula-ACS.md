# Panduan Pemula — Pasang ACS BillingHub

Panduan ini untuk **pemula**. Ikuti urutan dari atas ke bawah.

Ada 2 aplikasi berbeda:

| Nama | Fungsi | Contoh URL |
|------|--------|------------|
| **ACS Studio** | Wizard untuk *memasang* ACS di VPS baru | `http://IP:5173` |
| **ACS (GenieACS)** | Panel kelola modem / Summon | `http://IP:3000` (atau port custom) |

---

## Persiapan

Siapkan dulu:

1. **VPS / server Ubuntu** kosong (belum ada ACS), akses SSH:
   - IP
   - user (biasanya `root` atau `ubuntu`)
   - password
2. (Opsional) **MikroTik** kalau mau Summon lewat L2TP:
   - Host API, contoh `vpn-id.billinghub.id`
   - Port API, contoh `21552`
   - Username & password API
3. PC / browser untuk buka ACS Studio

---

## Langkah 1 — Pasang ACS Studio

Ikuti file: [`Setup-Aplikasi-ACS-Studio.md`](Setup-Aplikasi-ACS-Studio.md)

Ringkas (di PC):

```bash
cd theme-studio
cp .env.example .env
npm install
npm run dev
```

Buka: **http://127.0.0.1:5173**  
Login: lihat `AUTH_USER` / `AUTH_PASS` di `theme-studio/.env` (default biasanya `admin` / `billinghub01`).

---

## Langkah 2 — Install ACS ke VPS lewat Studio

1. Login ACS Studio.
2. Isi **Koneksi Server**:
   - IP / Host VPS
   - Port SSH (biasanya `22`)
   - Username & password SSH
3. Klik **Uji koneksi**. Harus sukses.
4. **Setup L2TP** (pilih salah satu):
   - **Lewati** dulu kalau belum ada data MikroTik / belum butuh Summon.
   - **Isi** kalau sudah ada API MikroTik (lihat Langkah 4).
5. (Opsional) Logo & warna.
6. Klik mulai **Instalasi**. Tunggu sampai selesai (bisa 5–15 menit).
7. Di akhir, **catat** URL + user + password yang ditampilkan. Jangan hilang.

Kalau **Uji koneksi gagal** (“authentication methods failed”) tapi PuTTY bisa masuk:  
pasang ACS manual lewat SSH (minta bantuan teknisi), atau cek password/port SSH.

---

## Langkah 3 — Login ke ACS (panel modem)

1. Buka URL UI ACS, contoh:
   - `http://IP-VPS:3000`  
   - atau port custom, contoh `http://domain:25500`
2. Login pakai user/pass yang diberikan di akhir instalasi.
3. Menu **Devices** untuk melihat modem.

### URL yang dikasih ke teknisi / modem

| Jenis | Contoh | Dipakai untuk |
|-------|--------|----------------|
| **UI** | `http://acs.domain:3000` | Login admin di browser |
| **CWMP** | `http://acs.domain:7547` | Diisi di setting ACS / TR-069 modem |
| **NBI** | `http://acs.domain:7557` | API (jarang diisi di modem) |

Di modem (ACS Parameter / TR-069), yang wajib:

- **ACS URL** = CWMP (bukan UI)
- **ACS Username** = user ACS
- **ACS Password** = pass ACS
- Centang **Enable ACS** + **Periodic Inform**

Connection Request user/pass boleh dibiarkan default modem (sering `acs`/`acs`) kecuali diminta diganti.

---

## Langkah 4 — L2TP supaya Summon jalan

**Tanpa L2TP:** modem tetap bisa masuk ACS (Inform), tapi tombol **Summon** sering gagal (“Device is offline”) kalau modem di balik NAT.

**Dengan L2TP:** MikroTik connect VPN ke VPS ACS → ACS bisa “nelpon balik” ke modem → Summon biasanya jalan.

### Di ACS Studio (saat install)

1. Aktifkan Setup L2TP.
2. Isi API MikroTik (host, port, user, pass).
3. Biarkan Studio deteksi jaringan / isi subnet modem bila diminta.
4. Selesaikan install.

### Yang harus benar setelah L2TP

- Di MikroTik ada interface L2TP ke IP VPS ACS, status **running**.
- Di VPS ACS ada tunnel (mis. `ppp0`) dan route ke **IP TR-069 / PPP modem**.
- Auth tunnel L2TP ACS↔MikroTik biasanya user lokal di VPS (`acs-mt`), **bukan** RADIUS pelanggan.

RADIUS PPPoE pelanggan **jangan diubah** hanya untuk L2TP Summon.

---

## Langkah 5 — Cek Summon

1. Pastikan modem sudah muncul di **Devices** dan status Inform OK.
2. Klik **Summon**.
3. Kalau sukses: device merespons / task jalan.
4. Kalau “Device is offline”:
   - L2TP belum up, atau
   - IP Connection Request modem (contoh `10.3.x.x`) **belum** masuk route lewat tunnel, atau
   - firewall MikroTik memblok akses dari tunnel.

Inform periodik bisa tetap jalan meskipun Summon gagal — itu normal.

---

## Tips keamanan (pemula)

- Jangan pakai password ACS yang lemah di server produksi.
- Kalau IP VPS “bekas” dan modem orang lain ikut masuk: ganti **port CWMP** (jangan 7547 default) + tutup port lain di firewall (sisakan SSH + port ACS).
- Jangan commit file `.env` atau file password ke Git.

---

## Ringkas alur

```
1. Pasang ACS Studio
2. Studio → install ACS di VPS (catat URL + login)
3. Isi ACS URL (CWMP) di modem
4. (Opsional) L2TP ke MikroTik untuk Summon
5. Cek Devices → Summon
```

Untuk detail pasang Studio saja: [`Setup-Aplikasi-ACS-Studio.md`](Setup-Aplikasi-ACS-Studio.md).
