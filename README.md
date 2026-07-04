 # Manajemen Kendaraan — Build APK CI

 Repository ini sudah dikonfigurasi untuk menghasilkan APK menggunakan GitHub Actions.

 Quick options:

 - Quick (no JDK required): push repo ke GitHub; Actions akan membangun `app-debug.apk` dan `app-release-unsigned.apk`.
 - Signed release (recommended for Play Store): install JDK, buat keystore, encode ke base64, tambah Secrets di GitHub (see below), lalu push.

 How to push (one-time)

 1. Initialize repo and push (replace remote URL when prompted):

 ```powershell
 .\scripts\init_repo_and_push.ps1
 ```

 Creating a signed release

 1. Install JDK (Temurin/Adoptium recommended).
 2. Create keystore (run below) or create manually with `keytool`.

 ```powershell
 .\scripts\create_keystore.ps1
 ```

 3. Encode keystore to base64:

 ```powershell
 [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\path\to\release.keystore')) > keystore.b64.txt
 Get-Content keystore.b64.txt
 ```

 4. In GitHub repository settings → Secrets → Actions add:

 - `KEYSTORE_BASE64` = contents of `keystore.b64.txt`
 - `KEYSTORE_PASSWORD`
 - `KEY_ALIAS`
 - `KEY_PASSWORD`

 5. Push to GitHub and trigger the `Build Android Release` workflow. Download the `app-release-signed` artifact.

 If you prefer, run the debug build locally after installing JDK and Android SDK.
# Manajemen Kendaraan

Aplikasi Manajemen Kendaraan Pribadi dan Logistik dengan Node.js.

## Struktur Proyek

- `src/index.js`: entry point aplikasi Express.
- `src/config/database.js`: konfigurasi SQLite dan pembuatan tabel.
- `src/routes/`: endpoint untuk kendaraan, maintenance, logistik, dan bahan bakar.
- `db/schema.sql`: skema SQL untuk tabel.

## Menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variable Google Maps API key (jika menggunakan fitur maps):
   ```bash
   set GOOGLE_MAPS_API_KEY=YOUR_API_KEY
   ```
3. Jalankan aplikasi:
   ```bash
   npm start
   ```

## Integrasi Google Maps

- Akses halaman demo peta di `http://localhost:3000/maps/page`
- API route:
  - `GET /maps/trip/:id` untuk mengambil rute yang digambar dari `alamat_mulai` ke `alamat_tujuan`
  - `POST /maps/trip/:id/estimate` untuk menghitung estimasi jarak dan waktu menggunakan Google Distance Matrix API
