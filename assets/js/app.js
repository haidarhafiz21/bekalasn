/* ==========================================================================
   BekalASN — inti aplikasi
   util · ikon · indeks data · penyimpanan progres · komponen UI · router
   ========================================================================== */
(function () {
  'use strict';
  // Anti-clickjacking: situs tidak boleh ditampilkan di dalam bingkai (iframe) situs lain.
  // GitHub Pages tidak bisa mengirim header X-Frame-Options, jadi dicegah di sini.
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    window.BA = window.BA || { dibingkai: true }; // cegah galat beruntun di skrip lain
    try { window.top.location.replace(window.location.href); } catch (e) { /* bingkai diblokir: halaman tetap tersembunyi */ }
    return;
  }

  const C = window.CPNS;
  const BA = (window.BA = { C });
  const HURUF = 'ABCDEFGH';

  /* ---------- util ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Format teks ringan: **tebal**, _miring_, ==sorotan==, `kode`, ^pangkat^, ~indeks~, ~~coret~~
  function fmt(s) {
    return esc(s)
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/==(.+?)==/g, '<mark>$1</mark>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\^(.+?)\^/g, '<sup>$1</sup>')
      .replace(/~(.+?)~/g, '<sub>$1</sub>')
      .replace(/(^|[\s(“"'])_(.+?)_(?=[\s.,;:)!?”"'…]|$)/g, '$1<em>$2</em>')
      .replace(/\n/g, '<br>');
  }
  const polos = (s) => String(s || '').replace(/[*_=`^~]/g, '').replace(/\s+/g, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');
  const acak = (a) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const jam = (detik) => {
    detik = Math.max(0, Math.round(detik));
    const h = Math.floor(detik / 3600), m = Math.floor((detik % 3600) / 60), d = detik % 60;
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(d);
  };
  const durasiTeks = (detik) => {
    const m = Math.floor(detik / 60), d = Math.round(detik % 60);
    return m ? (d ? `${m} mnt ${d} dtk` : `${m} mnt`) : `${d} dtk`;
  };
  const tanggal = (t) =>
    new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const angka = (n) => Number(n).toLocaleString('id-ID');
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Object.assign(BA, { $, $$, esc, fmt, polos, pad, acak, jam, durasiTeks, tanggal, angka, HURUF, reduceMotion });

  /* ---------- ikon (garis, 24×24) ---------- */
  const P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    bars: '<path d="M3 20h18"/><rect x="5" y="11" width="3" height="6" rx="1"/><rect x="10.5" y="5" width="3" height="12" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    flag: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevRight: '<path d="m9 6 6 6-6 6"/>',
    chevLeft: '<path d="m15 6-6 6 6 6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14.5-1.5 7.5 5-3 5 3-1.5-7.5"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    minusCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  function ic(nama, cls) {
    return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nama] || ''}</svg>`;
  }
  BA.ic = ic;

  /* ---------- indeks data ---------- */
  const materiMap = new Map();
  const soalMap = new Map();
  const katMap = new Map();
  function indeks() {
    C.kategori.forEach((k) => katMap.set(k.id, k));
    C.materi.forEach((m) => {
      if (materiMap.has(m.id)) console.warn('[BekalASN] id materi ganda:', m.id);
      materiMap.set(m.id, m);
    });
    C.soal.forEach((s) => {
      const m = materiMap.get(s.materi);
      if (!m) console.warn('[BekalASN] soal', s.id, 'merujuk materi yang tidak ada:', s.materi);
      if (soalMap.has(s.id)) console.warn('[BekalASN] id soal ganda:', s.id);
      s.kategori = s.kategori || (m ? m.kategori : 'lain');
      s.tkp = Array.isArray(s.skor);
      s.kunci = s.tkp ? s.skor.indexOf(Math.max.apply(null, s.skor)) : HURUF.indexOf(String(s.jawaban || '').toUpperCase());
      if (s.kunci < 0 || s.kunci >= s.opsi.length) console.warn('[BekalASN] kunci jawaban tidak valid pada soal', s.id);
      soalMap.set(s.id, s);
    });
  }

  const urutTingkat = { mudah: 0, sedang: 1, sulit: 2 };
  const data = {
    materi: (id) => materiMap.get(id),
    soal: (id) => soalMap.get(id),
    kat: (id) => katMap.get(id),
    materiKategori: (k) => C.materi.filter((m) => m.kategori === k),
    soalMateri: (id) => C.soal.filter((s) => s.materi === id),
    soalKategori: (k) => C.soal.filter((s) => s.kategori === k),
    urutTingkat,
    cariMateri(q) {
      q = String(q || '').toLowerCase().trim();
      if (!q) return C.materi.slice();
      const kata = q.split(/\s+/);
      return C.materi
        .map((m) => {
          const k = katMap.get(m.kategori) || {};
          const judul = m.judul.toLowerCase();
          const teks = [m.judul, m.ringkasan, k.kode, k.nama, (m.rangkuman || []).map((r) => r.judul).join(' '), (m.caraCepat || []).map((r) => r.judul).join(' ')]
            .join(' ')
            .toLowerCase();
          let skor = 0;
          for (const w of kata) {
            if (judul.includes(w)) skor += 3;
            else if (teks.includes(w)) skor += 1;
            else return null;
          }
          return { m, skor };
        })
        .filter(Boolean)
        .sort((a, b) => b.skor - a.skor)
        .map((x) => x.m);
    },
  };
  BA.data = data;

  /* ---------- penilaian ---------- */
  // jawaban disimpan sebagai indeks opsi asli (0..n), bukan huruf tampilan
  function nilai(s, pilih) {
    const maks = 5;
    if (pilih == null) return { skor: 0, maks, status: 'kosong' };
    if (s.tkp) {
      const sk = s.skor[pilih] || 0;
      return { skor: sk, maks, status: sk === maks ? 'benar' : 'salah' };
    }
    return pilih === s.kunci ? { skor: 5, maks, status: 'benar' } : { skor: 0, maks, status: 'salah' };
  }
  BA.nilai = nilai;

  /* ---------- penyimpanan progres (localStorage, aman bila diblokir) ---------- */
  const MAKS_RIWAYAT = 1000; // ringkasan tiap sesi (± 0,5 KB per sesi)
  const MAKS_ARSIP = 30;     // sesi lengkap untuk membuka ulang pembahasan lama

  /* ---------- penyaring data tersimpan / file cadangan ----------
     Data dari file cadangan (atau localStorage yang rusak) tidak dipercaya:
     hanya kolom yang dikenal dengan tipe yang benar yang disimpan, sehingga
     file aneh tidak bisa merusak tampilan atau menyisipkan HTML. */
  const POLA_ID = /^[A-Za-z0-9_-]{1,48}$/;
  const objek = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
  const bil = (v, min = 0, max = 1e15) => { v = +v; return isFinite(v) ? Math.min(max, Math.max(min, v)) : 0; };
  const bilOpsi = (v, min, max) => (v == null ? undefined : bil(v, min, max));
  const teks = (v, max = 160) => (typeof v === 'string' ? v.slice(0, max) : '');
  const kunciAman = (o, f, batas = 400) => {
    const r = {};
    if (objek(o)) Object.keys(o).slice(0, batas).forEach((k) => { if (POLA_ID.test(k)) { const v = f(o[k]); if (v !== undefined) r[k] = v; } });
    return r;
  };
  const pasangan = (v) => (Array.isArray(v) ? [bil(v[0]), bil(v[1])] : undefined);
  function bersihSumber(x) {
    const r = {};
    if (objek(x)) ['tipe', 'id', 'n', 'tingkat', 'waktu', 'khusus'].forEach((k) => { if (x[k] != null && POLA_ID.test(String(x[k]))) r[k] = String(x[k]); });
    return r;
  }
  function bersihRiwayat(x) {
    if (!objek(x) || !POLA_ID.test(String(x.id)) || !isFinite(+x.waktu) || !isFinite(+x.persen)) return null;
    const r = {
      id: String(x.id), judul: teks(x.judul), jenis: x.jenis === 'simulasi' ? 'simulasi' : 'latihan',
      sumber: bersihSumber(x.sumber), waktu: bil(x.waktu), persen: Math.round(bil(x.persen, 0, 100)),
      skor: bil(x.skor), maks: bil(x.maks), lulus: x.lulus == null ? null : !!x.lulus,
    };
    ['mulai', 'durasi', 'n', 'benar', 'salah', 'kosong'].forEach((k) => { const v = bilOpsi(x[k]); if (v !== undefined) r[k] = v; });
    if (objek(x.per)) r.per = kunciAman(x.per, (p) => (objek(p) ? { skor: bil(p.skor), maks: bil(p.maks), benar: bil(p.benar), n: bil(p.n) } : undefined));
    if (objek(x.materi)) r.materi = kunciAman(x.materi, pasangan);
    if (objek(x.tingkat)) r.tingkat = kunciAman(x.tingkat, pasangan);
    return r;
  }
  function bersihSesi(x) {
    if (!objek(x) || !POLA_ID.test(String(x.id)) || !Array.isArray(x.soalIds)) return null;
    const ids = x.soalIds.filter((id) => typeof id === 'string' && POLA_ID.test(id)).slice(0, 300);
    if (!ids.length) return null;
    const r = {
      id: String(x.id), jenis: x.jenis === 'simulasi' ? 'simulasi' : 'latihan', judul: teks(x.judul), sumber: bersihSumber(x.sumber),
      soalIds: ids,
      urutan: kunciAman(x.urutan, (u) => (Array.isArray(u) && u.length <= 8 && u.every((n, i) => Number.isInteger(n) && n >= 0 && n < u.length && u.indexOf(n) === i) ? u.slice() : undefined)),
      jawaban: kunciAman(x.jawaban, (v) => (Number.isInteger(v) && v >= 0 && v < 8 ? v : undefined)),
      ragu: kunciAman(x.ragu, (v) => (v ? true : undefined)),
      waktu: kunciAman(x.waktu, (v) => (isFinite(+v) ? bil(v, 0, 86400) : undefined)),
      mulai: bil(x.mulai),
    };
    ['selesai', 'durasi', 'batas', 'akhir', 'terpakai', 'perSoal', 'akhirSoal'].forEach((k) => { const v = bilOpsi(x[k]); if (v !== undefined) r[k] = v; });
    if (objek(x.pg)) r.pg = kunciAman(x.pg, (v) => bil(v, 0, 10000));
    return r;
  }
  BA.bersih = { riwayat: bersihRiwayat, sesi: bersihSesi };

  const Store = {
    KEY: 'bekalasn:v1',
    d: { selesai: {}, terbaik: {}, riwayat: [], arsip: [], sesi: null, aktif: null, ulang: null, pref: {}, cadangan: null, dibuat: null },
    load() {
      try {
        const r = localStorage.getItem(this.KEY);
        if (r) Object.assign(this.d, JSON.parse(r));
      } catch (e) { /* abaikan */ }
      if (!Array.isArray(this.d.riwayat)) this.d.riwayat = [];
      if (!Array.isArray(this.d.arsip)) this.d.arsip = [];
      if (!objek(this.d.pref)) this.d.pref = {};
      if (!objek(this.d.selesai)) this.d.selesai = {};
      if (!objek(this.d.terbaik)) this.d.terbaik = {};
      if (this.d.ulang && !(objek(this.d.ulang) && Array.isArray(this.d.ulang.ids))) this.d.ulang = null;
      // Buang entri yang rusak agar satu data aneh tidak membuat halaman error
      this.d.riwayat = this.d.riwayat.map(bersihRiwayat).filter(Boolean);
      this.d.arsip = this.d.arsip.map(bersihSesi).filter(Boolean);
      if (this.d.sesi) this.d.sesi = bersihSesi(this.d.sesi);
      if (this.d.aktif && !(objek(this.d.aktif) && typeof this.d.aktif.hash === 'string' && this.d.aktif.hash.startsWith('#/') && bersihSesi(this.d.aktif.sesi))) this.d.aktif = null;
      else if (this.d.aktif) this.d.aktif = { hash: this.d.aktif.hash, sesi: bersihSesi(this.d.aktif.sesi), posisi: Math.max(0, Math.floor(+this.d.aktif.posisi) || 0), diperbarui: +this.d.aktif.diperbarui || Date.now() };
      if (!this.d.dibuat) this.d.dibuat = Date.now();
    },
    save() {
      for (let coba = 0; coba < 4; coba++) {
        try { localStorage.setItem(this.KEY, JSON.stringify(this.d)); return true; } catch (e) {
          // Penyimpanan penuh: buang arsip pembahasan terlama dulu (riwayat & progres tetap aman)
          if (this.d.arsip.length > 3) this.d.arsip = this.d.arsip.slice(0, Math.ceil(this.d.arsip.length / 2));
          else return false;
        }
      }
      return false;
    },
    isSelesai(id) { return !!this.d.selesai[id]; },
    toggleSelesai(id) {
      if (this.d.selesai[id]) delete this.d.selesai[id];
      else this.d.selesai[id] = Date.now();
      this.save();
      return !!this.d.selesai[id];
    },
    terbaik(id) { return this.d.terbaik[id]; },

    /* --- sesi yang sedang dikerjakan (bertahan saat halaman di-refresh/ditutup) --- */
    simpanAktif(hash, sesi, posisi) {
      this.d.aktif = { hash, sesi, posisi: posisi || 0, diperbarui: Date.now() };
      this.save();
    },
    hapusAktif() {
      if (!this.d.aktif) return;
      this.d.aktif = null;
      this.save();
    },
    arsipSesi(id) {
      if (this.d.sesi && this.d.sesi.id === id) return this.d.sesi;
      return this.d.arsip.find((s) => s.id === id) || null;
    },

    /* --- cadangan: ekspor & pulihkan (tanpa data lisensi/ID perangkat) --- */
    ekspor() {
      const d = this.d;
      return {
        aplikasi: 'BekalASN', format: 1, dibuat: Date.now(),
        data: { selesai: d.selesai, terbaik: d.terbaik, riwayat: d.riwayat, arsip: d.arsip, sesi: d.sesi, pref: d.pref, dibuat: d.dibuat },
      };
    },
    // Menggabungkan cadangan ke data di perangkat ini (tidak ada yang terhapus)
    impor(obj) {
      if (!obj || obj.aplikasi !== 'BekalASN' || !obj.data || typeof obj.data !== 'object') throw new Error('File ini bukan cadangan BekalASN.');
      const x = obj.data, d = this.d;
      const rw = Array.isArray(x.riwayat) ? x.riwayat.slice(0, MAKS_RIWAYAT * 2).map(bersihRiwayat).filter(Boolean) : [];
      const ada = new Set(d.riwayat.map((r) => r.id));
      const baru = rw.filter((r) => !ada.has(r.id));
      d.riwayat = d.riwayat.concat(baru).sort((a, b) => b.waktu - a.waktu).slice(0, MAKS_RIWAYAT);
      const ar = Array.isArray(x.arsip) ? x.arsip.slice(0, MAKS_ARSIP * 2).map(bersihSesi).filter(Boolean) : [];
      const adaAr = new Set(d.arsip.map((s) => s.id));
      d.arsip = d.arsip.concat(ar.filter((s) => !adaAr.has(s.id))).sort((a, b) => (b.selesai || 0) - (a.selesai || 0)).slice(0, MAKS_ARSIP);
      Object.keys(kunciAman(x.selesai, (v) => (v ? 1 : undefined))).forEach((k) => { if (!d.selesai[k]) d.selesai[k] = isFinite(+x.selesai[k]) ? +x.selesai[k] : Date.now(); });
      const tb = kunciAman(x.terbaik, (v) => (isFinite(+v) ? bil(v, 0, 100) : undefined));
      Object.keys(tb).forEach((k) => { if (d.terbaik[k] == null || tb[k] > d.terbaik[k]) d.terbaik[k] = tb[k]; });
      const ss = bersihSesi(x.sesi);
      if (ss && (!d.sesi || (ss.selesai || 0) > (d.sesi.selesai || 0))) d.sesi = ss;
      const dibuat = bil(x.dibuat);
      if (dibuat && (!d.dibuat || dibuat < d.dibuat)) d.dibuat = dibuat;
      d.cadangan = d.cadangan || null;
      this.save();
      return { riwayatBaru: baru.length, totalRiwayat: d.riwayat.length };
    },
    // ringkas: { skor, maks, persen, lulus, n, benar, salah, kosong, per, materi, tingkat, durasi }
    catat(sesi, ringkas) {
      this.d.sesi = sesi;
      this.d.aktif = null;
      if (sesi.sumber && sesi.sumber.tipe === 'materi') {
        const lama = this.d.terbaik[sesi.sumber.id];
        if (lama == null || ringkas.persen > lama) this.d.terbaik[sesi.sumber.id] = ringkas.persen;
      }
      this.d.riwayat = this.d.riwayat.filter((r) => r.id !== sesi.id);
      this.d.riwayat.unshift(Object.assign({
        id: sesi.id, judul: sesi.judul, jenis: sesi.jenis, sumber: sesi.sumber, waktu: sesi.selesai, mulai: sesi.mulai,
      }, ringkas));
      this.d.riwayat = this.d.riwayat.slice(0, MAKS_RIWAYAT);
      this.d.arsip = [sesi].concat(this.d.arsip.filter((s) => s.id !== sesi.id)).slice(0, MAKS_ARSIP);
      this.save();
    },
    progresKategori(k) {
      const list = data.materiKategori(k);
      const selesai = list.filter((m) => this.isSelesai(m.id)).length;
      return { selesai, total: list.length, persen: list.length ? Math.round((selesai / list.length) * 100) : 0 };
    },
  };
  Store.load();
  BA.Store = Store;

  /* ---------- komponen UI ---------- */
  const UI = {};
  BA.UI = UI;

  // Render blok isi materi / pembahasan
  UI.blok = function (isi) {
    if (isi == null) return '';
    return (Array.isArray(isi) ? isi : [isi])
      .map((b) => {
        if (typeof b === 'string') return `<p>${fmt(b)}</p>`;
        if (b.daftar) {
          const tag = b.bernomor ? 'ol' : 'ul';
          return `<${tag} class="list">${b.daftar.map((x) => `<li>${fmt(x)}</li>`).join('')}</${tag}>`;
        }
        if (b.tabel) {
          const t = b.tabel;
          return `<div class="table-wrap"><table><thead><tr>${t.kolom.map((c) => `<th>${fmt(c)}</th>`).join('')}</tr></thead><tbody>${t.baris
            .map((r) => `<tr>${r.map((c) => `<td>${fmt(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`;
        }
        if (b.catatan) return `<aside class="note">${ic('bulb')}<div>${b.judul ? `<strong>${esc(b.judul)}</strong>` : ''}<p>${fmt(b.catatan)}</p></div></aside>`;
        if (b.rumus) return `<div class="formula">${fmt(b.rumus)}</div>`;
        if (b.istilah) return `<dl class="terms">${b.istilah.map(([t, d]) => `<div><dt>${fmt(t)}</dt><dd>${fmt(d)}</dd></div>`).join('')}</dl>`;
        if (b.kutipan) return `<blockquote>${fmt(b.kutipan)}${b.sumber ? `<cite>${esc(b.sumber)}</cite>` : ''}</blockquote>`;
        if (b.gambar) return `<figure class="fig"><img src="${esc(b.gambar)}" alt="${esc(b.alt || '')}" loading="lazy">${b.keterangan ? `<figcaption>${fmt(b.keterangan)}</figcaption>` : ''}</figure>`;
        if (b.html) return b.html;
        return '';
      })
      .join('');
  };

  // Isi opsi: teks biasa, atau gambar figural { svg: '<svg…>' }
  UI.teksOpsi = function (o) {
    if (o && typeof o === 'object' && o.svg) return `<span class="figtile figtile--opt">${o.svg}</span>`;
    return fmt(o);
  };
  UI.opsiFigural = (s) => s.opsi.some((o) => o && typeof o === 'object' && o.svg);

  // Deret gambar soal figural: item svg, '?' (kotak tanya), ':' atau '=' (pemisah analogi)
  UI.figur = function (arr) {
    if (!Array.isArray(arr) || !arr.length) return '';
    return `<div class="figrow" aria-label="Gambar soal">${arr
      .map((x) => (x === '?' ? '<span class="figtile figtile--q">?</span>' : x === ':' || x === '=' ? `<span class="figop">${x === ':' ? '∶' : '='}</span>` : `<span class="figtile">${x}</span>`))
      .join('')}</div>`;
  };

  // Sampul ilustratif per materi (tanpa gambar eksternal)
  UI.sampul = function (m, besar) {
    const k = data.kat(m.kategori) || { kode: '' };
    let h = 0;
    for (const c of m.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const v = h % 3;
    const urut = data.materiKategori(m.kategori).indexOf(m) + 1;
    return `<div class="thumb thumb--${esc(m.kategori)} thumb--v${v}${besar ? ' thumb--lg' : ''}" aria-hidden="true">
      <span class="thumb__sun"></span>
      <span class="thumb__sheet thumb__sheet--back"></span>
      <span class="thumb__sheet"><small>${esc(k.kode)} · Materi ${pad(urut)}</small><b>${esc(m.sampul || m.judul)}</b></span>
    </div>`;
  };

  UI.tag = (katId) => {
    const k = data.kat(katId);
    return `<span class="tag tag--${esc(katId)}">${esc(k ? k.kode : katId)}</span>`;
  };

  UI.kartuMateri = function (m, i) {
    const n = data.soalMateri(m.id).length;
    const selesai = Store.isSelesai(m.id);
    const best = Store.terbaik(m.id);
    return `<a class="mcard reveal" style="--d:${i || 0}" href="#/materi/${esc(m.id)}">
      ${UI.sampul(m)}
      <div class="mcard__body">
        <div class="mcard__top">${UI.tag(m.kategori)}${selesai ? `<span class="pill pill--ok">${ic('check')}Selesai</span>` : best != null ? `<span class="pill">Skor ${best}%</span>` : ''}</div>
        <h3>${esc(m.judul)}</h3>
        <p class="mcard__meta">${n} soal <i></i> ${esc(m.level || 'Dasar')} <i></i> ${m.durasi || 10} mnt baca</p>
        <p class="mcard__desc">${esc(m.ringkasan)}</p>
      </div>
    </a>`;
  };

  // Cincin progres (SVG). Animasi diisi saat elemen terlihat.
  UI.ring = function (persen, opt) {
    opt = opt || {};
    const size = opt.size || 120, sw = opt.stroke || 10, r = (size - sw) / 2, c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(100, persen));
    return `<svg class="ring ${opt.cls || ''}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="--c:${c.toFixed(2)}px;--off:${(c * (1 - p / 100)).toFixed(2)}px" aria-hidden="true">
      <circle class="ring__track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/>
      <circle class="ring__bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>`;
  };

  // Animasi muncul saat di-scroll + hitung angka
  let io = null;
  UI.reveal = function (root) {
    const els = $$('.reveal:not(.is-in), [data-count]:not(.is-counted), .ring:not(.is-in)', root || document);
    if (!('IntersectionObserver' in window) || reduceMotion()) {
      els.forEach((el) => {
        el.classList.add('is-in');
        if (el.dataset.count != null) UI.countUp(el, true);
      });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            el.classList.add('is-in');
            if (el.dataset.count != null) UI.countUp(el);
            io.unobserve(el);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      );
    }
    els.forEach((el) => io.observe(el));
  };

  UI.countUp = function (el, langsung) {
    if (el.classList.contains('is-counted')) return;
    el.classList.add('is-counted');
    const target = parseFloat(el.dataset.count) || 0;
    if (langsung || reduceMotion()) { el.textContent = angka(target); return; }
    const dur = 1100, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = angka(Math.round(target * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Modal konfirmasi → Promise<boolean>
  UI.modal = function ({ judul, isi, ok = 'Lanjutkan', batal = 'Batal', nada = 'ink' }) {
    return new Promise((resolve) => {
      const root = $('#modal-root');
      const lastFocus = document.activeElement;
      root.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdl-t">
        <div class="modal__scrim" data-m="0"></div>
        <div class="modal__card">
          <h3 id="mdl-t">${esc(judul)}</h3>
          <div class="modal__body">${isi || ''}</div>
          <div class="modal__act">
            ${batal ? `<button class="btn btn--ghost" data-m="0">${esc(batal)}</button>` : ''}
            <button class="btn btn--${nada}" data-m="1">${esc(ok)}</button>
          </div>
        </div>
      </div>`;
      const el = root.firstElementChild;
      requestAnimationFrame(() => el.classList.add('is-open'));
      const tutup = (v) => {
        el.classList.remove('is-open');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(() => { root.innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }, 200);
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); tutup(false); }
      };
      document.addEventListener('keydown', onKey, true);
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-m]');
        if (t) tutup(t.dataset.m === '1');
      });
      const btn = el.querySelector('[data-m="1"]');
      btn && btn.focus();
    });
  };

  UI.toast = function (pesan) {
    const root = $('#toast-root');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = pesan;
    root.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, 2600);
  };

  /* ---------- router ---------- */
  const App = {
    routes: [],
    view: null,
    currentHash: '#/',
    on(re, fn) { this.routes.push([re, fn]); },
    parse() {
      const h = (location.hash || '#/').slice(1) || '/';
      const i = h.indexOf('?');
      return { path: i < 0 ? h : h.slice(0, i), q: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) };
    },
    go(hash) {
      if (location.hash === hash) this.render();
      else location.hash = hash;
    },
    // Ubah query tanpa render ulang
    setQuery(path, params) {
      const qs = new URLSearchParams();
      Object.keys(params).forEach((k) => { if (params[k] != null && params[k] !== '') qs.set(k, params[k]); });
      const s = qs.toString();
      const h = '#' + path + (s ? '?' + s : '');
      history.replaceState(null, '', h);
      this.currentHash = h;
    },
    render() {
      const { path, q } = this.parse();
      if (this.view && this.view.cleanup) this.view.cleanup();
      this.view = null;
      let handler = null, m = null;
      for (const [re, fn] of this.routes) {
        m = path.match(re);
        if (m) { handler = fn; break; }
      }
      if (!handler) handler = BA.Pages.notFound;
      this.currentHash = location.hash || '#/';
      const root = $('#app');
      const res = handler({ params: m ? m.slice(1) : [], q, root }) || {};
      if (res.redirect) { location.replace(res.redirect); return; }
      // Kontainer baru tiap halaman: listener halaman lama ikut terbuang
      const view = document.createElement('div');
      view.className = 'view page-enter';
      view.innerHTML = res.html || '';
      root.replaceChildren(view);
      document.body.dataset.layout = res.layout || 'default';
      document.title = res.title ? `${res.title} — ${C.situs.nama}` : `${C.situs.nama} — ${C.situs.tagline}`;
      window.scrollTo(0, 0);
      this.view = (res.mount && res.mount(view)) || {};
      UI.reveal(view);
      setActiveNav(path);
      closeMenu();
    },
  };
  BA.App = App;

  let lewati = false;
  window.addEventListener('hashchange', async () => {
    if (lewati) { lewati = false; return; }
    if (App.view && App.view.guard) {
      const tujuan = location.hash;
      const asal = App.currentHash;
      lewati = true;
      history.replaceState(null, '', asal);
      lewati = false;
      const boleh = await App.view.guard();
      if (!boleh) return;
      App.view.guard = null;
      history.pushState(null, '', tujuan);
    }
    App.render();
  });

  /* ---------- navigasi global ---------- */
  function setActiveNav(path) {
    const seg = path.split('/')[1] || '';
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === seg));
  }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    const b = $('.nav__burger');
    b && b.setAttribute('aria-expanded', 'false');
  }

  function initShell() {
    $$('[data-site-name]').forEach((el) => (el.textContent = C.situs.nama));
    $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    const nav = $('#nav');
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const burger = $('.nav__burger');
    burger.addEventListener('click', () => {
      const open = !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    // "/" untuk fokus ke kolom pencarian
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const input = $('#app input[type="search"]');
      if (input) { e.preventDefault(); input.focus(); }
    });
  }

  let sudahMulai = false;
  function mulai() {
    if (sudahMulai) return;
    sudahMulai = true;
    indeks();
    initShell();
    // Minta browser tidak menghapus progres otomatis saat ruang penyimpanan menipis
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* abaikan */ }
    const reg = BA.registerRoutes;
    reg && reg(App);
    App.render();
  }
  BA.mulai = mulai;

  // Versi online menunggu gerbang lisensi (assets/js/gerbang.js) membuka konten terenkripsi.
  // Versi lokal/ekstensi tidak memuat gerbang, jadi langsung mulai.
  document.addEventListener('DOMContentLoaded', () => {
    const g = window.CPNS_GERBANG;
    if (g && typeof g.then === 'function') g.then(mulai);
    else mulai();
  });
})();
