/* ==========================================================================
   KONFIGURASI SITUS
   File ini wajib dimuat paling awal. Ubah nama situs, kategori, passing grade,
   dan aturan simulasi di sini. Materi & soal ditambahkan lewat file lain
   memakai CPNS.tambahMateri([...]) dan CPNS.tambahSoal([...]).
   ========================================================================== */
window.CPNS = {
  situs: {
    nama: 'BekalASN',
    tagline: 'Belajar SKD CPNS',
    // id materi yang tampil di bagian "Materi Populer" pada beranda
    materiPopuler: ['pancasila', 'deret', 'pelayanan'],
    // Cara pembeli meminta kunci lisensi (tampil di layar aktivasi versi online).
    // Contoh lain: 'hubungi WhatsApp 08xx-xxxx-xxxx'
    kontakLisensi: 'chat TikTok penjual',
  },

  // Struktur SKD. passingGrade & jumlahSoal mengikuti ketentuan seleksi terakhir.
  // Jika tahun ini berubah, cukup ganti angkanya di sini.
  kategori: [
    {
      id: 'twk',
      kode: 'TWK',
      nama: 'Tes Wawasan Kebangsaan',
      jumlahSoal: 30,
      passingGrade: 65,
      deskripsi: 'Nasionalisme, integritas, bela negara, pilar negara, dan bahasa Indonesia.',
    },
    {
      id: 'tiu',
      kode: 'TIU',
      nama: 'Tes Intelegensia Umum',
      jumlahSoal: 35,
      passingGrade: 80,
      deskripsi: 'Kemampuan verbal, numerik, dan analitis: analogi, silogisme, deret, hingga soal cerita.',
    },
    {
      id: 'tkp',
      kode: 'TKP',
      nama: 'Tes Karakteristik Pribadi',
      jumlahSoal: 45,
      passingGrade: 166,
      deskripsi: 'Pelayanan publik, jejaring kerja, sosial budaya, TIK, profesionalisme, dan anti radikalisme.',
    },
  ],

  // Preset simulasi. Bila bank soal belum cukup, jumlah soal & passing grade
  // otomatis disesuaikan secara proporsional.
  simulasi: {
    mini: {
      nama: 'Simulasi Mini',
      deskripsi: 'Pemanasan singkat untuk mengukur kesiapan.',
      durasiMenit: 30,
      jumlah: { twk: 10, tiu: 10, tkp: 10 },
    },
    penuh: {
      nama: 'Simulasi Penuh',
      deskripsi: 'Format lengkap seperti hari-H: 110 soal, 100 menit.',
      durasiMenit: 100,
      jumlah: { twk: 30, tiu: 35, tkp: 45 },
    },
  },

  materi: [],
  soal: [],
  tambahMateri(daftar) { this.materi.push(...daftar); },
  tambahSoal(daftar) { this.soal.push(...daftar); },
};
