import type { Article, ArticleCategory } from '../types';

export const CATEGORIES: { name: ArticleCategory; blurb: string }[] = [
  { name: 'Islam Veteriner', blurb: 'Nilai Islam bertemu dunia kedokteran hewan: amanah profesi, halal-thayyib, kesejahteraan hewan, dan kesmavet.' },
  { name: 'Kisah', blurb: 'Cerita yang menghidupkan: sahabat, ulama, perjuangan dakwah, dan kisah keseharian mahasiswa.' },
  { name: 'Renungan', blurb: 'Refleksi singkat dan tadabbur ringan — bacaan dua menit yang menenangkan hati.' },
];

export const ARTICLES: Article[] = [
  {
    id: 'v1',
    cat: 'Islam Veteriner',
    title: 'Halal dan Thayyib: Amanah dari Kandang hingga Meja Makan',
    mins: 5,
    excerpt: 'Profesi veteriner memegang mata rantai penting dalam memastikan pangan asal hewan halal dan thayyib bagi umat.',
    body: [
      'Sebelum sepotong daging sampai ke piring seorang muslim, ada rantai panjang yang harus dijaga: kesehatan ternak, cara penyembelihan, hingga penanganan pasca-panen. Di setiap titik itu, ada tangan dokter hewan.',
      'Halal berbicara tentang kebolehan, sedangkan thayyib berbicara tentang kebaikan — sehat, bersih, dan tidak membahayakan. Keduanya tidak bisa dipisahkan, dan keduanya membutuhkan ilmu veteriner yang diamalkan dengan jujur.',
      'Maka bagi mahasiswa FKH, belajar bukan sekadar mengejar gelar. Setiap praktikum dan setiap ujian adalah bagian dari menyiapkan diri memikul amanah umat.',
    ],
  },
  {
    id: 'v2',
    cat: 'Islam Veteriner',
    title: 'Kesejahteraan Hewan adalah Bagian dari Ihsan',
    mins: 4,
    excerpt: 'Islam mengajarkan berbuat baik kepada segala sesuatu — termasuk hewan yang kita rawat dan tangani.',
    body: [
      'Rasulullah ﷺ mengabarkan bahwa seorang wanita masuk neraka karena mengurung seekor kucing, dan seorang lelaki diampuni dosanya karena memberi minum seekor anjing. Islam menempatkan perlakuan terhadap hewan sebagai perkara besar.',
      'Dalam dunia veteriner modern, prinsip ini dikenal sebagai animal welfare. Jauh sebelum istilah itu ada, Islam sudah mengajarkan ihsan: berbuat sebaik-baiknya, bahkan kepada hewan yang akan disembelih.',
      'Merawat pasien dengan lembut, meminimalkan rasa sakit, dan tidak menelantarkan — semua itu bukan hanya etika profesi, tetapi juga ibadah.',
    ],
  },
  {
    id: 'v3',
    cat: 'Islam Veteriner',
    title: 'Zoonosis dan Tanggung Jawab Menjaga Kehidupan',
    mins: 6,
    excerpt: 'Kesehatan masyarakat veteriner adalah wujud nyata menjaga jiwa manusia — salah satu maqashid syariah.',
    body: [
      'Banyak penyakit manusia berawal dari hewan. Rabies, flu burung, antraks — di sinilah dokter hewan berdiri sebagai garda terdepan yang sering tidak terlihat.',
      'Menjaga jiwa (hifzhun nafs) adalah salah satu tujuan besar syariat. Ketika seorang dokter hewan memutus rantai penularan zoonosis, ia sedang mengamalkan maqashid itu dengan keilmuannya.',
      'Profesi ini adalah ladang pahala yang luas: satu vaksinasi, satu edukasi peternak, satu pemeriksaan daging kurban — semuanya bernilai jika diniatkan karena Allah.',
    ],
  },
  {
    id: 'k1',
    cat: 'Kisah',
    title: 'Belajar dari Lebah: Tadabbur Surah An-Nahl',
    mins: 4,
    excerpt: 'Lebah hanya mengambil yang baik dan hanya memberi yang bermanfaat. Begitulah seharusnya seorang dai.',
    body: [
      'Dalam Surah An-Nahl, Allah mewahyukan kepada lebah untuk membangun sarang lalu memakan dari buah-buahan yang baik. Dari perutnya keluar minuman yang menyembuhkan manusia.',
      'Para ulama sering menjadikan lebah sebagai perumpamaan seorang mukmin: ia tidak makan kecuali yang baik, tidak menghasilkan kecuali yang baik, dan ketika hinggap di ranting ia tidak mematahkannya.',
      'Nama An-Nahl dipilih dengan harapan itu — menjadi koloni yang teratur, bergerak bersama, dan kehadirannya membawa manfaat bagi sekitar.',
    ],
  },
  {
    id: 'k2',
    cat: 'Kisah',
    title: 'Tangan di Atas: Kedermawanan Abdurrahman bin Auf',
    mins: 5,
    excerpt: 'Saudagar besar yang datang ke Madinah tanpa apa-apa, lalu membangun segalanya dari nol — dan memberikannya kembali.',
    body: [
      'Ketika hijrah ke Madinah, Abdurrahman bin Auf ditawari separuh harta oleh saudaranya dari kaum Anshar. Ia menolak dengan santun dan hanya berkata: tunjukkan aku jalan ke pasar.',
      'Dari pasar itu ia membangun kembali kekayaannya, dan dari kekayaan itu ia menopang dakwah: kafilah dagangnya pernah ia sedekahkan seluruhnya untuk penduduk Madinah.',
      'Kemandirian dan kedermawanan bisa berjalan bersama. Bagi organisasi dakwah kampus, kisah ini adalah pengingat bahwa dana usaha pun bagian dari perjuangan.',
    ],
  },
  {
    id: 'k3',
    cat: 'Kisah',
    title: 'Sajadah di Pojok Laboratorium',
    mins: 3,
    excerpt: 'Cerita kecil dari mahasiswa koas yang menjaga shalatnya di tengah jadwal jaga yang padat.',
    body: [
      'Jadwal koas tidak kenal waktu — operasi bisa berlangsung berjam-jam, dan pasien datang tanpa janji. Tapi di pojok laboratorium itu selalu ada sajadah yang terlipat rapi.',
      'Pemiliknya tidak pernah berceramah. Ia hanya selalu pamit sebentar ketika azan berkumandang, lalu kembali melanjutkan pekerjaannya dengan tenang.',
      'Bertahun kemudian, teman-temannya bercerita: dakwah yang paling membekas bukan kata-katanya, melainkan sajadah yang tidak pernah absen itu.',
    ],
  },
  {
    id: 'r1',
    cat: 'Renungan',
    title: 'Yang Kecil, yang Istiqamah',
    mins: 2,
    excerpt: 'Amal yang paling dicintai Allah bukan yang paling besar, melainkan yang paling berkesinambungan.',
    body: [
      'Kita sering menunda kebaikan karena menunggu mampu melakukannya secara sempurna. Menunggu bisa tilawah satu juz, akhirnya tidak membaca sama sekali.',
      'Padahal amal yang paling dicintai Allah adalah yang dikerjakan terus-menerus meskipun sedikit. Dua ayat yang dijaga setiap hari lebih berat timbangannya daripada semangat besar yang padam sepekan.',
      'Mulailah dari yang kecil hari ini. Istiqamah itu bukan bakat — ia dilatih.',
    ],
  },
  {
    id: 'r2',
    cat: 'Renungan',
    title: 'Pulang Sebelum Maghrib',
    mins: 3,
    excerpt: 'Tentang jeda, langit sore, dan mengingat bahwa hari ini pun akan dihisab.',
    body: [
      'Ada waktu-waktu yang sengaja Allah buat indah, seolah mengajak kita berhenti sejenak. Langit menjelang maghrib adalah salah satunya.',
      'Di tengah deadline laporan dan jadwal praktikum, cobalah pulang sedikit lebih awal sesekali. Duduk, tarik napas, dan hitung: hari ini lebih banyak mana, yang bermanfaat atau yang sia-sia?',
      'Muhasabah tidak butuh tempat khusus. Ia hanya butuh kejujuran beberapa menit sebelum matahari terbenam.',
    ],
  },
  {
    id: 'r3',
    cat: 'Renungan',
    title: 'Niat di Pagi Hari',
    mins: 2,
    excerpt: 'Amal yang sama bisa bernilai langit atau debu — pembedanya ada di dalam hati.',
    body: [
      'Setiap pagi kita berangkat ke kampus yang sama, duduk di kelas yang sama, mengerjakan tugas yang sama. Yang membedakan nilainya di sisi Allah adalah niat yang menyertainya.',
      'Belajar bisa menjadi ibadah jika diniatkan menyiapkan diri untuk bermanfaat. Bahkan tidur pun bisa bernilai jika diniatkan agar kuat beribadah esok hari.',
      'Maka sebelum membuka buku hari ini, luruskan dulu satu kalimat kecil di hati: untuk apa semua ini kulakukan?',
    ],
  },
];
