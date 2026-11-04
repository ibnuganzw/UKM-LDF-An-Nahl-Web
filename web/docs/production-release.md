# Persiapan production dan domain An-Nahl

Status 4 November 2026: tahap 5 masuk **persiapan rilis**. Pengguna memilih
akhiran `.site`, belum membeli domain, dan belum menetapkan nama lengkapnya.
Jangan mengganti placeholder `DOMAIN_FINAL` dengan nama tebakan. Masukan pengguna
bahwa tampilan di Android 6 sudah bagus dicatat sebagai acceptance pengguna,
bukan hasil pengukuran CWV atau pengujian seluruh fitur.

## Target dan konfigurasi yang akan diterapkan

`ORIGIN_FINAL` berarti `https://DOMAIN_FINAL`, tanpa slash di akhir. Pilih satu
host utama; rekomendasi awal memakai domain tanpa `www`. Alias `www` hanya
ditambahkan bila dipilih, lalu dialihkan ke host utama sambil mempertahankan
path, query, dan fragment pemulihan Auth. Verifikasi alur email sebelum
mengarahkan pengguna ke alias.

| Lokasi | Pengaturan | Nilai production |
| --- | --- | --- |
| Build frontend | `VITE_SITE_URL` | `ORIGIN_FINAL` |
| Build frontend | `VITE_SUPABASE_URL` | `https://rdbjmmgzmfyrphxiimcf.supabase.co` |
| Build frontend | `VITE_SUPABASE_ANON_KEY` | Public anon key milik ref production yang sama; isi di lingkungan build, jangan di dokumen/chat |
| Supabase Auth | Site URL | `ORIGIN_FINAL` |
| Supabase Auth | Redirect URL konfirmasi | `ORIGIN_FINAL/menunggu-persetujuan` |
| Supabase Auth | Redirect URL pemulihan | `ORIGIN_FINAL/reset-password` |
| Edge Functions production | `ALLOWED_ORIGINS` | `ORIGIN_FINAL`; tambahkan hanya origin production lain yang benar-benar dipakai |
| Edge Functions production | `PASSWORD_RESET_REDIRECT_URL` | `ORIGIN_FINAL/reset-password` |
| Hosted Auth production | Password | Minimum 10 karakter, kombinasi letters and digits |
| Cloudflare Pages production | Output build | `web/dist` setelah verifikasi artifact |

Redirect konfirmasi berasal dari `Register.tsx`; redirect pemulihan ditentukan
di server `nim-request-password-reset`, bukan dari input pengguna. CORS kedua
fungsi memakai allowlist origin persis, tanpa path atau trailing slash.
Gunakan URL redirect production yang spesifik. Wildcard preview dan origin
staging tetap berada di project staging.

## Keadaan production yang diverifikasi read-only

Dashboard membuktikan `UKM-LDF-An-Nahl-Web`, ref `rdbjmmgzmfyrphxiimcf`, Healthy.
Project ini berbeda dari staging `qclesvwptdvvlmxxfnsj`.

- Cloudflare di akun yang diperiksa memiliki project An-Nahl **staging** dan
  project lain yang tidak terkait. Project Pages An-Nahl production belum ada
  dalam daftar itu; nama/target hosting production perlu ditetapkan saat rilis.
- Hosted Auth Site URL masih `http://localhost:5174`; allowlist redirect hanya
  `http://localhost:5174/**`. Konfirmasi email aktif. Domain baru belum tersambung.
- Panel Email menunjukkan minimum password 10 karakter dan Letters and digits,
  sesuai policy aplikasi. Ini bukti konfigurasi dashboard; signup/reset nyata
  pada production belum diuji. Leaked-password protection tidak aktif dan
  dashboard menyatakan fitur tersebut memerlukan Pro atau lebih tinggi.
- Delapan tabel aplikasi sudah ada dan semua memiliki RLS. Kolom token QR tidak
  dapat dibaca role anon maupun authenticated.
- `consume_auth_rate_limit(text,text,integer,integer)` tersedia; grant anon dan
  authenticated ditolak, service_role diizinkan. Metadata ini tidak membuktikan
  fungsi Edge production sudah sama persis dengan source terkini.
- `apply_org_structure_import(jsonb,jsonb)` belum tersedia.
- Dua policy Storage SELECT masih bernama `article_images_public_read` dan
  `org_photos_public_read`, berlaku bagi anon/authenticated dengan syarat hanya
  bucket_id. Pembatasan listing September belum ada pada production.
- Tabel `supabase_migrations.schema_migrations` tidak ada, sementara schema
  aplikasi sudah terisi. **Jangan menjalankan seluruh migration dari awal atau
  menganggap semua migration pending.**
- Dua Edge Functions bernama `nim-login` dan `nim-request-password-reset` sudah
  ada. Versi source terdeploy, nilai CORS/reset, pengiriman email production,
  dan pengaturan SMTP belum diverifikasi.

Bukti lokal: `../../audit-evidence/2026-11-04/`. Katalog yang tersimpan dengan
akhiran `visible` hanya baris yang dirender grid, bukan dump seluruh hasil.
Ringkasan izin tujuh baris tersimpan lengkap. Tidak ada migration, perubahan
policy, secret, domain, atau data production pada pemeriksaan ini.

## Urutan persiapan database sebelum deploy

1. Rekonsiliasi schema/fungsi/grant aktual terhadap migration repository, termasuk
   Phase 9–12 yang sebagian objeknya sudah ada tanpa history CLI. Catat daftar
   efek yang sudah ada dan yang belum ada, serta cadangan yang dapat dipulihkan.
2. Siapkan SQL/transaksi khusus untuk selisih yang terkonfirmasi. Kandidat yang
   sudah terbukti adalah definisi RPC Phase 13 dan pembatasan Storage dari
   `20260928090000_restrict_public_storage_listing.sql`. Periksa dependency,
   policy lain, grant Phase 12, trigger audit, dan bucket aktual sebelum eksekusi.
   Jangan menyamakan riwayat dengan menjalankan SQL lama ulang secara buta.
3. Sesudah persetujuan eksplisit atas perubahan production yang konkret,
   terapkan hanya selisih yang disetujui dan rekam katalog sebelum/sesudah.
   Jangan memanggil RPC impor; pembuatan fungsi tidak memerlukan penggantian
   struktur organisasi atau penghapusan foto.
4. Cocokkan hosted password policy, lalu deploy kedua Edge Functions dari commit
   yang disetujui setelah limiter terverifikasi. Rekam versi terdeploy tanpa
   mencetak nilai secret.

Tes anggota biasa staging dan 18 warning Security Advisor staging tetap
terbuka; penilaian tampilan Android tidak menutup audit akses. QR staging yang
sudah ditutup berhasil menolak token uji pada 2 November; attendance tidak
bertambah. Hasil itu tidak menggantikan acceptance production.

## Build dan pemeriksaan artifact

Gunakan checkout/commit yang diketahui. `.env` lokal menunjuk production;
staging wajib memakai override variabel staging di memori. Untuk production,
set ketiga variabel frontend di atas secara eksplisit dalam lingkungan build.
Jangan memasukkan service-role key atau secret Edge ke frontend.

Jalankan dari `web/` setelah target build dipastikan:

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run release:verify -- --target production --site https://DOMAIN_FINAL
```

Untuk artifact staging:

```powershell
npm.cmd run release:verify -- --target staging --site https://ldf-annahl-fkh-usk-staging.pages.dev
```

`release:verify` hanya membaca artifact lokal; tidak membaca `.env`, mengakses
jaringan, mengubah hosted settings, atau melakukan deploy. Pemeriksaan meliputi
canonical, sitemap/robots/prerender, endpoint Supabase, claim project/role anon
key publik, dan tidak adanya fixture QA pada discovery. Output mencatat SHA-256
bundle utama untuk dicocokkan dengan live. Ini bukan pemindai secret menyeluruh
atau bukti bahwa hosted Auth/database sudah benar.

Jangan mengunggah artifact staging ke domain production. Pada Direct Upload,
variabel di dashboard tidak mengganti nilai yang sudah tertanam dalam JS:
perubahan origin atau target database memerlukan build ulang.

## Domain, DNS, dan HTTPS

1. Tetapkan dan beli nama lengkap `.site`. Catat harga pembelian dan renewal
   yang benar di registrar saat checkout; harga tahun pertama belum diperiksa.
2. Tetapkan project Pages production yang terpisah. Tambahkan domain melalui
   **Pages → Custom domains**. Untuk apex domain, zone harus berada pada akun
   Cloudflare yang sama dan nameserver diarahkan ke nameserver yang diberikan
   Cloudflare. Salin target DNS dari project production aktual, bukan staging.
3. Tunggu domain Active dan sertifikat HTTPS valid. Bila memakai subdomain dengan
   DNS eksternal, buat CNAME setelah domain didaftarkan ke project Pages. Menambah
   CNAME saja tanpa mengasosiasikan domain pada Pages dapat menghasilkan 522.
4. Cocokkan Auth URL/redirect, CORS/reset, dan `VITE_SITE_URL` dengan host yang sama.
   Konfirmasi penerimaan email/SMTP production sebelum membuka pendaftaran.
5. Verifikasi domain dan URL deployment mengembalikan bundle identik, canonical
   dan sitemap memakai domain final, deep link/refresh tidak 404, serta tidak
   memunculkan fixture internal. Pages mendukung fallback SPA bila tidak ada
   top-level `404.html`; uji route Auth/admin/scan yang tidak diprerender.
6. Jalankan smoke test publik, login admin normal, konfirmasi email, reset,
   permission anggota biasa, serta agenda/QR yang disepakati. Jangan memakai
   perubahan peran atau data riil sebagai probe negatif.

Catat deployment sebelum/sesudah. Bila ada regresi, gunakan rollback artifact
Pages yang diketahui dan konfigurasi origin sebelumnya yang sudah direkam;
rollback frontend tidak membalik migration database. Jangan menghapus deployment
lama atau data sebagai bagian dari penutupan rilis.

## Referensi resmi

- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages serving and SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/)

Persiapan ini belum merupakan deployment production. PR #3 tetap draft. Nama
domain final, rekonsiliasi schema production, serta persetujuan atas paket rilis
yang konkret masih diperlukan sebelum penerapan production/domain.
