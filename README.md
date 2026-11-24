# Tetes — Pencatat Hidrasi Harian

Aplikasi web mobile-first pencatat minum air harian dengan maskot original **Dropi**, gamifikasi streak, misi harian, pencapaian bertingkat, grafik mingguan/bulanan, serta efek suara sintetis dan dukungan PWA dasar.

Seluruh data tersimpan 100% secara lokal di browser (`localStorage` dengan key `tetes:v1`) — tanpa backend, tanpa login, dan tanpa API key.

## Fitur Utama

- **Maskot Dropi (SVG Animasi)**: 8 ekspresi (`happy`, `cheer`, `celebrate`, `thirsty`, `sleepy`, `sad`, `wow`, `drinking`), berkedip acak, bobbing halus, dan balon ucapan interaktif.
- **Pencatatan Minum Memuaskan**: Wadah botol tetesan air SVG bergelombang, hitungan naik halus, popup combo (`COMBO x3!`), efek suara Web Audio API (`glug`, `ding`, `tada`, `pop`), haptic vibration, serta feedback sheet geser.
- **Streak & Pelindung Streak**: Penghitung streak harian otomatis sesuai zona waktu lokal, strip 7 hari (`S S R K J S M`), milestone progres, dan perlindungan otomatis jika terlewat 1 hari.
- **Misi Harian & Pencapaian**: Kumpulkan XP untuk naik level dan membuka variasi warna Dropi serta lencana Perunggu/Perak/Emas.
- **Statistik & Kalender**: Grafik batang mingguan/bulanan dengan garis target, ringkasan metrik, kalender cincin progres bulanan, dan wawasan otomatis dari Dropi.
- **PWA Dasar**: Mendukung `manifest.webmanifest`, ikon home screen, mode offline dasar, dan tombol instalasi di Pengaturan.

## Menjalankan Secara Lokal

Prasyarat: Node.js 18+ dan npm.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser (atau gunakan DevTools mobile viewport selebar 360–430px).

## Build Produksi

```bash
npm run build
```

Hasil build statis berada di folder `dist/`.

## Deploy ke GitHub Pages

Proyek ini sudah dikonfigurasi dengan `base: './'` di `vite.config.ts` dan navigasi berbasis state (tanpa router URL) sehingga berjalan lancar di sub-path GitHub Pages (`https://<username>.github.io/<repo>/`).

1. Push repositori ini ke GitHub (branch `main`).
2. Buka **Settings -> Pages** di repositori GitHub Anda.
3. Pada bagian **Build and deployment -> Source**, pilih **GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` akan otomatis mem-build Vite dan mempublikasikan folder `dist/` setiap kali ada push ke `main`.
