# Audit editorial 114 catatan surah — 28 September 2026

## Ringkasan keputusan

**Seluruh 114 catatan tetap berstatus dalam penelaahan editorial.** Pemeriksaan ini menemukan kesalahan teks yang nyata, konflik metadata internal, rujukan yang belum dapat ditelusuri ke klaim tertentu, dan sejumlah analogi kesehatan/sains yang tidak pantas dinyatakan sebagai fakta tanpa pemeriksaan ahli. Pemeriksaan ini **bukan pentashihan tafsir atau penilaian sanad menyeluruh**; status `reviewed` tidak boleh diubah berdasarkan laporan ini saja.

Sumber yang diaudit: `web/src/data/surahInfo.ts` pada commit `944d633`, SHA-256 `e7c9e9316b052fec16e82dc6c91e8c931276fd005e69f684239e108de32afc1f`. Pemindai yang dapat diulang ada di `scan.mjs`; seluruh hasil per surah ada di `scan.csv`, `scan.json`, dan `INDEX-114.md`.

## Cakupan dan cara pemeriksaan

1. Semua field pada 114 entri dipindai dengan parser TypeScript dan aturan triase teks. Semua 114 **ringkasanSingkat** dibaca manual; bagian terindikasi dan beberapa entri utuh dibaca lebih dekat.
2. Nomor surah, jumlah ayat, rentang juz, dan rentang ayat pada peta isi/struktur/ayat kunci dicocokkan dengan `web/src/data/surahs.ts` serta 114 paket ayat lokal. Ini uji konsistensi internal, **bukan pembandingan seluruh isi terhadap mushaf rujukan eksternal**.
3. Beberapa temuan yang menyangkut angka dan klasifikasi diperiksa lagi terhadap [Qur'an Kemenag/LPMQ](https://quran.kemenag.go.id/) dan [Quran.com Al-Ma'arij 70:4](https://quran.com/id/70%3A4/qiraat). Perbedaan klasifikasi surah dipertahankan sebagai ikhtilaf sampai editor menetapkan acuan.
4. Angka pemicu otomatis di bawah adalah **kandidat untuk diperiksa**, bukan jumlah kesalahan tafsir yang terbukti. Pemindai dapat memberi positif palsu, terutama untuk angka dan istilah metaforis.

## Hasil seluruh dataset

| Pemeriksaan | Hasil | Makna |
| --- | ---: | --- |
| Entri 1–114, nomor unik | 114/114 | Tidak ada surah hilang/duplikat. |
| Jumlah ayat terhadap paket lokal | 0 beda | Metadata jumlah ayat konsisten. |
| Rentang juz terhadap paket lokal | 0 beda | Metadata juz konsisten. |
| Rentang ayat di peta isi/struktur/ayat kunci | 0 di luar batas | Format yang beragam sudah diparsing, termasuk rentang majemuk. |
| `reviewStatus` belum direkam | 114 | UI secara benar menampilkan “Dalam penelaahan editorial”. |
| `sumberRujukan` tanpa lokasi klaim spesifik | 114 | Nama kitab ada, tetapi tidak ada jilid/halaman/ayat/tautan untuk memverifikasi tiap pernyataan. |
| Nomor `urutanTurun` | 1 duplikat, 1 hilang | Nilai 56 dipakai Al-Fatihah dan As-Saffat; nilai 5 tidak muncul. Perlu memilih acuan kronologi sebelum membetulkan. |
| Cakupan `strukturSurat` tidak menyeluruh | 3 entri | Al-Baqarah, Al-Kahf, Taha. Ini bisa pilihan editorial, tetapi label “struktur” memberi kesan seluruh surah dipetakan. |
| Calon angka/penanda tersisa di prosa | 49 temuan pada 32 entri | Sebagian positif palsu; contoh yang terbukti terlihat di bawah. |
| Pemicu kosakata kesehatan/klinis | 55 entri | Wajib dibaca dalam konteks; tidak berarti 55 klaim medis keliru. |
| Pemicu kosakata sains/teknologi | 75 entri | Wajib cek apakah analogi dinyatakan seolah fakta ayat. |
| Penyebutan kelompok agama tertentu | 25 entri | Wajib cek generalisasi; penyebutan sendiri bukan masalah. |

Volume teks sekitar **120.437 kata**, median sekitar **1.073 kata per entri**. Ringkasan awal median **66–67 kata**, terpanjang **134 kata**. Di Android, tab Ringkasan menampilkan `ringkasanSingkat` dan `temaUtama` berturut-turut; dua lapis penjelasan ini sering mengulang pesan dan membuat sumber di bawah jauh dari pembuka.

## Temuan yang perlu ditangani paling dulu

### 1. Angka ayat Al-Ma'arij rusak dalam beberapa field

Pada Al-Ma'arij, `konteksTurun`, peta ayat, ayat kunci, dan catatan ikhtilaf menulis **“50. tahun”** (`surahInfo.ts` sekitar baris 3213–3244). Ini mengubah atau membuat tidak jelas nilai pada Al-Ma'arij 70:4. [Teks ayat yang ditampilkan Quran.com](https://quran.com/id/70%3A4/qiraat) menyebut **lima puluh ribu tahun**. Perbaikan harus memeriksa seluruh kemunculan angka dan tidak sekadar mengganti satu string. Ada bentuk serupa **“70. malaikat”** pada Al-An'am (sekitar baris 254/280) dan Al-Hasyr (sekitar baris 2717/2722); nilai yang dimaksud perlu dicek dari riwayat yang sahih sebelum disunting.

### 2. Konflik klasifikasi Al-Falaq dan An-Nas di dalam web

`surahs.ts` baris 117–118 menampilkan **Makkiyah** untuk Al-Falaq dan An-Nas. Akan tetapi `surahInfo.ts` sekitar baris 5198 dan 5244 menyatakan kisah turunnya keduanya terjadi pada periode **Madinah** dan mengikatnya pada insiden sihir, tanpa `tempatTurunCatatan` yang membuat UI memberi tanda “diperselisihkan”. Ini konflik internal yang pembaca dapat lihat dalam satu dialog.

Perbedaan riwayat/klasifikasi memang ada: [PDF Juz Amma Kemenag](https://quran.kemenag.go.id/assets/files/Juz-Amma-Metode-Tilawah.pdf) memberi label *Madaniyyah* untuk keduanya, sedangkan [Quran.com Al-Falaq](https://quran.com/id/waktu-shubuh/translation/quran.id) dan [Quran.com An-Nas](https://quran.com/id/an-nas/info) memberi label Mekah. Editor perlu menetapkan acuan, menjelaskan ikhtilaf, dan memisahkan **riwayat pemakaian surah saat insiden** dari **klaim kapan surah pertama kali turun**. Jangan memilih salah satu secara diam-diam.

### 3. Angka sisa dan kalimat rusak

Contoh yang tampak sebagai artefak penyalinan: Luqman **“akidah 6”** (baris 1429), As-Sajdah **“sujud 8”** (1475), Al-Ahzab **“kenabian 10”** (1520), Saba' **“berhala 12”** (1565), An-Nur **“pandangan 31”** (sekitar 1116), serta Fussilat **`seakan " masa`** dan ejaan **“komulatif”** (1889). Periksa kandidat lain dalam `scan.json`. Angka yang kemungkinan penanda catatan tidak boleh ditafsirkan sebagai nomor ayat tanpa melihat dokumen asal.

### 4. Klaim kesehatan dan sains yang terdengar seperti janji faktual

Az-Zumar menyebut **“Ayat Antidepresan”** (baris 1796). Fussilat menyebut kulit **“di-hack”**, jaringan sel menyimpan **“Memory Cell”**, dan **“asuransi Anti-Depresan”** (1859, 1885, 1890). Al-Falaq menyebut **“vaksin penawar”**, **“radiasi mematikan”**, serta kesembuhan total yang dipaparkan sangat pasti (sekitar 5198–5234). Ini bukan pemeriksaan kemujaraban ayat atau keyakinan pembaca; masalah editorialnya adalah istilah klinis dan biologis dipakai seolah ada mekanisme atau efek medis yang terbukti, padahal rujukan dalam data tidak menunjukkannya. Pisahkan pengajaran spiritual, riwayat, analogi, dan klaim medis. Hapus janji medis yang tidak dapat disokong; minta penelaah agama dan, jika mempertahankan klaim kesehatan, penelaah kesehatan.

### 5. Gaya dan konteks kelompok

Ringkasan At-Taubah (sekitar baris 430) memakai “proklamasi militer tanpa kompromi”, “durjana”, dan “mensterilkan ibukota”. Surat Muhammad (sekitar baris 2160) memakai “konstitusi militer”, “menumpas”, dan “secara kejam”. Al-Baqarah (sekitar baris 61) menulis tentang “kaum Yahudi Madinah yang berusaha merusak akidah umat Islam” secara luas. Ini perlu dijadikan uraian yang lebih presisi: aktor dan konteks historis spesifik, ayat terkait, pendapat tafsir yang dapat dilacak, dan tanpa menyamaratakan kelompok masa kini. Penilaian ini menyangkut ketepatan redaksi, bukan menghapus sejarah konflik dalam teks agama.

### 6. Struktur ayat dan kronologi

`strukturSurat` Al-Baqarah berhenti pada ayat 283 sehingga ayat 284–286 tidak terpetakan. Al-Kahf dan Taha juga menyisakan beberapa segmen di peta struktur, sementara `gambaranIsi` ketiganya lengkap. Jika struktur dimaksud sebagai pilihan sorotan, labelnya harus menyatakan demikian. Nilai `urutanTurun: 56` pada Al-Fatihah dan As-Saffat serta ketiadaan 5 memerlukan rujukan kronologi yang dipilih editor; daftar urutan turun dapat berbeda antartradisi.

## Pola “AI-like” dan beban baca Android

Pola yang muncul lintas ringkasan adalah banyak metafora berurutan, kepastian yang terlalu tegas, istilah modern yang ditempelkan pada tafsir, dan nada dramatis yang sama pada surah yang temanya berbeda. Contoh: “peta jalan peradaban”, “konstitusi”, “operasi”, “asuransi”, “GPS”, “sinematik”, “arsitektur kosmik”. Beberapa ringkasan sudah lebih jernih—misalnya Al-Isra', Taha, Ar-Rum, Qaf, Al-Waqi'ah, Al-Ma'un—sehingga ada contoh gaya internal yang dapat dipakai untuk revisi.

Pada layar kecil, gunakan satu ringkasan sekitar 40–60 kata di pembuka; pindahkan konteks/ikhtilaf/rujukan ke bagian yang dapat dibuka. Tampilkan rujukan tepat di dekat klaim penting, bukan hanya daftar kitab pada bagian akhir. Jangan menyembunyikan status penelaahan.

## Urutan revisi yang disarankan

1. **Tahan klaim spesifik berisiko** dari tampilan publik sampai diperiksa: Al-Ma'arij 70:4, keterangan Al-Falaq/An-Nas, dan analogi kesehatan pada Az-Zumar, Fussilat, Al-Falaq/An-Nas. Ini rekomendasi implementasi; audit ini tidak mengubah aplikasi.
2. **Bersihkan artefak angka dan ejaan** setelah mencocokkan sumber asal. Lakukan pencarian seluruh dataset, bukan hanya contoh di atas.
3. **Tetapkan standar rujukan per klaim:** surah/ayat, kitab tafsir dan edisi/jilid/halaman atau tautan, status hadis bila disebut, serta catatan bila pendapat diperselisihkan. [LPMQ Kemenag](https://lajnah.kemenag.go.id/detail) menyediakan jalur tafsir ringkas, tahlili, tematik, dan ilmi sebagai bahan pembanding; pemilihan rujukan final tetap tugas editor.
4. **Tulis ulang ringkasan dan tema utama** dengan kalimat singkat, proporsional, dan hanya satu lapis pembuka. Periksa kesesuaian setiap kesimpulan dengan ayat yang dirujuk.
5. **Tinjauan manusia bertahap:** catat penelaah, tanggal, sumber, perubahan, dan keputusan per surah. `reviewStatus: "reviewed"` baru diberikan setelah pemeriksaan isi dan sumber selesai. Prioritaskan surah yang sering diakses, tetapi jalankan koreksi numerik/klinis berisiko pada seluruh dataset lebih dahulu.

## Batas hasil

Laporan ini tidak menilai keaslian hadis, memilih pendapat fikih, atau menyatakan 114 tafsir salah. Regex kesehatan/sains/kelompok hanya penunjuk lokasi untuk reviewer. Audit tidak mengubah `surahInfo.ts`, database, deployment, PR, atau status publikasi.
