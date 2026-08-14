# Falcom Technology — Versi Netlify (Rombak Total dari Versi Railway/Express+SQLite)

Ini rewrite penuh dari project `falcom-alt` biar bisa jalan di Netlify. **Arsitekturnya
beda total** dari versi sebelumnya karena Netlify tidak bisa menjalankan server Node.js
yang nyala terus-menerus dengan file database lokal — jadi bagian-bagian ini diganti:

| Bagian | Versi lama (Railway) | Versi baru (Netlify) |
|---|---|---|
| Server | Express, nyala terus | **Netlify Functions** (serverless, 1 function nyakup semua route) |
| Database | SQLite file lokal (`better-sqlite3`) | **Turso** (SQLite-compatible, tapi di cloud) |
| Login admin | `express-session` (cookie + memori server) | **JWT** disimpan di cookie (stateless) |
| Upload gambar/video CMS | Disimpan di folder lokal (`multer`) | **Netlify Blobs** (storage bawaan Netlify) |

**Kabar baik**: semua route API, skema database, dan halaman frontend (HTML/CSS/JS)
tetap SAMA PERSIS secara fungsi — cuma "mesin" di baliknya yang diganti. Gua udah tes
seluruh logic backend-nya secara lokal (login, CRUD tiap tabel, chatbot, dll) sebelum
dikasih ke lo, jadi bagian ini gua percaya diri jalan.

**Yang BELUM bisa gua tes dari sisi gua** (karena butuh akun Netlify/Turso beneran):
upload file lewat Netlify Blobs di lingkungan produksi asli, dan perilaku redirect
`netlify.toml` di server Netlify yang sesungguhnya. Kemungkinan besar jalan (udah
gua ikutin pola yang didokumentasikan resmi), tapi tetap perlu lo tes sendiri pas
udah live — kalau ada yang aneh, kirim pesan error-nya, gua bantu benerin.

---

## 1. Persiapan akun (gratis semua)

1. **Akun Turso** — daftar di [turso.tech](https://turso.tech). Install CLI-nya:
   ```
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
   (Windows: pakai WSL, atau lihat instruksi di situsnya)

2. **Akun Netlify** — daftar di [netlify.com](https://netlify.com) kalau belum punya.
   Install CLI-nya:
   ```
   npm install -g netlify-cli
   ```

## 2. Bikin database Turso

```
turso auth login
turso db create falcom-technology
turso db show falcom-technology --url
turso db tokens create falcom-technology
```

Catat 2 hal dari output di atas:
- **Database URL** (formatnya `libsql://falcom-technology-xxx.turso.io`)
- **Auth Token** (string panjang)

## 3. Setup project secara lokal

```
npm install
```

Copy `.env.example` jadi `.env`, isi dengan URL & token Turso dari langkah 2, plus
`JWT_SECRET` (generate string acak, contoh command ada di dalam file `.env.example`).

**Inisialisasi & isi database:**
```
npm run db:init
npm run db:seed
```

Ini akan bikin semua tabel + isi data awal (hero slider, produk, artikel, dst — semua
konten yang udah kita bangun sepanjang project ini) ke database Turso lo.

**Login default setelah seed:**
- Username: `admin`
- Password: `falcom2026` — **GANTI ini setelah login pertama kali**, lewat menu
  Pengaturan di CMS.

## 4. Tes lokal sebelum deploy

```
netlify dev
```

Ini bakal jalanin situs + semua function secara lokal (biasanya di
`http://localhost:8888`), termasuk emulasi Netlify Blobs buat upload gambar. Coba
buka beranda, coba login CMS, coba tambah satu data, pastiin semuanya jalan sebelum
lanjut deploy.

## 5. Deploy ke Netlify

**Cara termudah — connect ke GitHub:**
1. Push project ini ke repo GitHub (baru atau yang sudah ada)
2. Buka [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an
   existing project** → pilih repo-nya
3. Netlify otomatis kebaca `netlify.toml` — build command & publish directory udah
   ke-setting otomatis, nggak perlu diubah
4. **Sebelum klik Deploy**, buka bagian **Environment variables**, tambahkan:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
   - `NODE_ENV` = `production`
5. Klik **Deploy**

**Atau via CLI:**
```
netlify init
netlify env:set TURSO_DATABASE_URL "libsql://..."
netlify env:set TURSO_AUTH_TOKEN "..."
netlify env:set JWT_SECRET "..."
netlify env:set NODE_ENV "production"
netlify deploy --prod
```

## 6. Setelah live — checklist

- [ ] Buka domain Netlify lo, cek beranda tampil normal (hero, produk, testimoni, dst)
- [ ] Login ke `/admin/login`, **langsung ganti password** dari `falcom2026`
- [ ] Ganti nomor WhatsApp default di Pengaturan (`wa_admin_number`)
- [ ] Coba upload 1 gambar lewat CMS (misal ganti foto produk), pastiin upload
      berhasil dan gambarnya muncul di halaman publik
- [ ] Coba isi form kontak / chat widget, pastiin nyambung ke WhatsApp dengan benar
- [ ] Kalau mau pakai domain sendiri (bukan `namasitus.netlify.app`), atur di
      Netlify → Domain settings

---

## Struktur project

```
falcom-netlify/
├── netlify.toml              konfigurasi redirect + build
├── netlify/functions/
│   ├── api.js                 SEMUA route /api dan /admin/api ada di sini
│   └── serve-upload.js        nge-serve file yang di-upload dari Netlify Blobs
├── lib/
│   ├── auth.js                 login pakai JWT cookie
│   ├── generic-crud.js         satu handler buat semua tab CMS
│   ├── chatbot.js               logic live chat + eskalasi WA
│   └── upload.js                 terima file upload, simpan ke Blobs
├── db/
│   ├── client.js                koneksi ke Turso (atau file lokal buat testing)
│   └── schema.sql                struktur semua tabel
├── scripts/
│   ├── init-db.js                bikin tabel (jalanin sekali di awal)
│   └── seed-db.js                 isi data awal (jalanin sekali di awal)
└── public/                        seluruh frontend (HTML/CSS/JS) — TIDAK berubah
    dari versi sebelumnya, kecuali sedikit penyesuaian di admin.js/login.html/
    dashboard.html buat cocok sama endpoint API yang baru.
```

## Kalau nanti mau nambah tabel/fitur baru

Beda dari versi lama, sekarang nambah tabel baru CUKUP dengan:
1. Tambah `CREATE TABLE` di `db/schema.sql`, jalankan `npm run db:init` lagi (aman,
   `IF NOT EXISTS` jadi nggak nimpa data yang sudah ada)
2. Tambah nama tabel + kolom-kolomnya ke `TABLES` di `lib/generic-crud.js`
3. Tambah entry `SCHEMAS` di `public/admin/admin.js` (pola yang sudah ada)
4. Tambah tombol tab + panel di `public/admin/dashboard.html`

Nggak perlu nulis route API baru lagi kayak sebelumnya — generic CRUD handler-nya
otomatis nyakup tabel baru begitu didaftarin di 2 tempat itu.
