/* ==========================================================================
   BekalASN — halaman: beranda, materi, detail materi, latihan, simulasi
   ========================================================================== */
(function () {
  'use strict';
  const { C, $, $$, esc, fmt, pad, ic, data, Store, UI, App, tanggal, jam } = BA;
  const Pages = (BA.Pages = {});

  // Parameter latihan dari preferensi: waktu ujian & tingkat kesulitan
  // Mode waktu: ujian (hitung mundur total, bawaan — seperti CAT BKN), soal (55 dtk/soal, otomatis lanjut), bebas
  const PARAM_WAKTU = { ujian: '1', soal: 'soal', bebas: '0' };
  const modeWaktu = () => (PARAM_WAKTU[Store.d.pref.waktu] ? Store.d.pref.waktu : 'ujian');
  const LABEL_WAKTU = [['ujian', 'Waktu ujian (mundur)'], ['soal', '55 dtk per soal'], ['bebas', 'Tanpa batas']];
  const INFO_WAKTU = {
    ujian: 'Seperti CAT BKN: satu hitung mundur untuk semua soal (±55 detik × jumlah soal). Saat waktu habis, jawaban otomatis dikumpulkan.',
    soal: 'Latihan kecepatan: setiap soal diberi 55 detik. Jika waktunya habis, otomatis pindah ke soal berikutnya.',
    bebas: 'Tanpa batas waktu, cocok untuk memahami pola soal. Waktu hanya dicatat.',
  };
  const segWaktu = (id, lebar) => `<fieldset class="seg${lebar ? " seg--wide" : ""}" id="${id}">
      <legend>Waktu</legend>
      ${LABEL_WAKTU.map(([v, l]) => `<label><input type="radio" name="waktu" value="${v}" ${modeWaktu() === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
    </fieldset>
    <p class="seg__note" data-info-waktu>${INFO_WAKTU[modeWaktu()]}</p>`;
  const pasangSegWaktu = (el, onUbah) => el && el.addEventListener('change', (e) => {
    if (e.target.name !== 'waktu') return;
    Store.d.pref.waktu = e.target.value;
    Store.save();
    const info = el.parentNode.querySelector('[data-info-waktu]');
    if (info) info.textContent = INFO_WAKTU[e.target.value];
    onUbah && onUbah(e.target.value);
  });
  const prefQ = () => '&waktu=' + PARAM_WAKTU[modeWaktu()] + (Store.d.pref.tingkat ? '&tingkat=' + Store.d.pref.tingkat : '');
  BA.prefQ = prefQ;
  const LABEL_TINGKAT = [['', 'Semua tingkat'], ['mudah', 'Mudah'], ['sedang', 'Sedang'], ['sulit', 'Sulit']];

  /* ---------- banner sesi yang belum selesai ---------- */
  UI.bannerAktif = function () {
    const a = Store.d.aktif;
    if (!a || !a.sesi || !a.hash || !Array.isArray(a.sesi.soalIds)) return '';
    const s = a.sesi, N = s.soalIds.length, dj = Object.keys(s.jawaban || {}).length;
    let waktu = '';
    if (s.perSoal) waktu = `${s.perSoal} dtk per soal, waktu tetap berjalan`;
    else if (s.akhir) {
      const sisa = Math.round((s.akhir - Date.now()) / 1000);
      waktu = sisa > 0 ? `sisa waktu ${jam(sisa)}` : 'waktu sudah habis, buka untuk melihat hasil';
    }
    return `<div class="resume reveal" role="status">
      <span class="resume__ic">${ic('play')}</span>
      <div class="resume__txt"><small>${s.jenis === 'simulasi' ? 'Simulasi' : 'Latihan'} belum selesai</small><b>${esc(s.judul)}</b><span>${dj} dari ${N} soal dijawab${waktu ? ' · ' + waktu : ''}</span></div>
      <div class="resume__act"><a class="btn btn--sun btn--sm" href="${esc(a.hash)}">${s.akhir && s.akhir <= Date.now() ? 'Lihat hasil' : 'Lanjutkan'} ${ic('arrowRight', 'i-arrow')}</a><button type="button" class="btn btn--ghost btn--sm" data-act="buang-aktif">Buang</button></div>
    </div>`;
  };
  UI.pasangBannerAktif = function (root) {
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act="buang-aktif"]');
      if (!b) return;
      const ok = await UI.modal({ judul: 'Buang sesi ini?', isi: '<p>Jawaban pada sesi yang belum selesai akan dihapus dan tidak masuk riwayat.</p>', ok: 'Buang', batal: 'Batal', nada: 'bad' });
      if (!ok) return;
      Store.hapusAktif();
      const el = b.closest('.resume');
      el && el.remove();
      UI.toast('<span>Sesi yang belum selesai dibuang</span>');
    });
  };

  const totalSoalSKD = C.kategori.reduce((a, k) => a + k.jumlahSoal, 0);
  const nilaiMaksSKD = totalSoalSKD * 5;

  /* ======================================================================
     BERANDA
     ====================================================================== */
  function heroArt() {
    return `<div class="hero-art" aria-hidden="true">
      <div class="ha-panel"><span class="ha-hand">Pahami<br>polanya,<br>bukan<br>hafalannya.</span></div>
      <div class="ha-sun"></div>
      <div class="ha-q">
        <div class="ha-q__head"><span class="tag tag--tiu">TIU</span><span>Deret Angka · Soal 12</span><span class="ha-q__time">${ic('timer')}01:24:10</span></div>
        <p class="ha-q__text">Bilangan berikutnya dari deret<br><b>2, 6, 18, 54, …</b></p>
        <ul class="ha-q__opts">
          <li><i>A</i>108</li>
          <li><i>B</i>148</li>
          <li class="is-right"><i>C</i>162<svg class="ha-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></li>
          <li><i>D</i>216</li>
        </ul>
        <div class="ha-q__explain"><b>Pembahasan</b> Setiap suku dikali 3 → 54 × 3 = 162</div>
      </div>
      <div class="ha-score">
        ${UI.ring(73, { size: 58, stroke: 7, cls: 'ring--ok' })}
        <div><small>Skor TWK</small><b>110<span>/150</span></b><em>${ic('check')}Lewat passing grade</em></div>
      </div>
      <div class="ha-note">×3 terus!
        <svg viewBox="0 0 80 50"><path d="M4 6c18 2 40 10 52 30m0 0-12-3m12 3 1-12"/></svg>
      </div>
    </div>`;
  }

  function catMock() {
    const sel = [];
    for (let i = 1; i <= 40; i++) {
      let st = '';
      if (i < 23) st = 'f';
      if ([5, 11, 17].includes(i)) st = 'r';
      if (i === 23) st = 'c';
      sel.push(`<span class="cm-cell ${st}" style="--i:${i}">${i}</span>`);
    }
    return `<div class="cat-mock reveal" aria-hidden="true">
      <div class="cm-sun"></div>
      <div class="cm-card">
        <div class="cm-head"><b>Simulasi Penuh</b><span class="cm-timer">${ic('timer')}01:12:47</span></div>
        <div class="cm-tabs"><span class="is-on">TWK</span><span>TIU</span><span>TKP</span></div>
        <div class="cm-grid">${sel.join('')}</div>
        <div class="cm-legend"><span><i class="f"></i>Dijawab</span><span><i class="r"></i>Ragu-ragu</span><span><i></i>Belum</span></div>
      </div>
      <div class="cm-note">Latihan seperti<br>hari-H.</div>
    </div>`;
  }

  function hlStroke() {
    return '<svg class="hl__stroke" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true"><path d="M3 15c38-7 92-9 194-4"/></svg>';
  }

  const FAQ = [
    ['Apakah soal SKD ada batas waktunya?', 'Ada. Sebanyak 110 soal dikerjakan dalam 100 menit dengan sistem CAT, atau sekitar 55 detik per soal. Pelamar formasi khusus disabilitas netra mendapat 130 menit. Waktunya satu hitung mundur untuk semua soal (bukan per soal), kamu bebas berpindah nomor, dan jawaban otomatis dikumpulkan saat waktu habis. Simulasi di sini memakai cara yang sama, dan latihan per topik secara bawaan juga memakai hitung mundur.'],
    ['Apakah materi di sini mengikuti kisi-kisi SKD terbaru?', 'Materi disusun mengikuti struktur SKD yang digunakan pada seleksi CPNS: TWK, TIU, dan TKP. Ketentuan seperti jumlah soal dan passing grade dapat berubah setiap tahun, jadi selalu cocokkan dengan pengumuman resmi panitia seleksi.'],
    ['Bagaimana sistem penilaian TKP?', 'Setiap opsi jawaban TKP bernilai 1 sampai 5 dan tidak ada nilai nol. Karena itu, jangan pernah mengosongkan soal TKP. Skor setiap opsi ditampilkan di halaman hasil setelah latihan selesai.'],
    ['Apa bedanya mode latihan dan simulasi?', 'Mode latihan berisi sedikit soal per topik, cocok untuk memahami pola soal; kunci jawaban dan pembahasan terbuka setelah semua soal selesai dikerjakan. Mode simulasi meniru ujian CAT: ada batas waktu, tanda ragu-ragu, dan pembahasan baru terbuka setelah kamu menekan Selesai.'],
    ['Apakah progres belajar saya tersimpan?', 'Ya. Materi yang ditandai selesai, skor terbaik, seluruh riwayat latihan, dan latihan yang belum selesai disimpan otomatis di perangkat ini. Jika halaman ter-refresh atau tertutup, latihan bisa dilanjutkan dari soal terakhir, dan waktunya tidak diulang dari awal.'],
    ['Bagaimana kalau ganti HP atau browser dihapus datanya?', 'Buka halaman Progres, lalu tekan Simpan cadangan. File cadangan bisa dikirim ke WhatsApp, Google Drive, atau email sendiri. Di HP baru, buka halaman Progres dan tekan Pulihkan dari cadangan; riwayat lama akan digabung dengan riwayat di HP tersebut. Simpan cadangan secara rutin, misalnya seminggu sekali.'],
    ['Apakah ini soal asli ujian?', 'Bukan. Soal latihan disusun ulang mengikuti pola dan materi SKD agar kamu terbiasa dengan tipe soalnya. Kami tidak menggunakan soal bocoran.'],
  ];

  Pages.home = function () {
    const pop = (C.situs.materiPopuler || []).map(data.materi).filter(Boolean);
    const sumMateri = C.materi.length, sumSoal = C.soal.length;

    const pathCard = (k, i) => {
      const pr = Store.progresKategori(k.id);
      const ms = data.materiKategori(k.id);
      return `<a class="path reveal" style="--d:${i}" href="#/materi?k=${k.id}">
        <div class="path__art path__art--${k.id}">
          ${UI.ring(pr.persen, { size: 92, stroke: 8, cls: 'ring--ink' })}
          <span class="path__code">${esc(k.kode)}</span>
        </div>
        <div class="path__body">
          <h3>${esc(k.nama)}</h3>
          <p>${esc(k.deskripsi)}</p>
          <p class="path__meta">${ms.length} materi · ${data.soalKategori(k.id).length} soal · ${pr.selesai}/${pr.total} selesai</p>
          <span class="link">Lihat jalur ${ic('arrowRight', 'i-arrow')}</span>
        </div>
      </a>`;
    };

    const html = `
    <section class="hero">
      <div class="container hero__grid">
        <div class="hero__copy">
          <p class="eyebrow reveal">Pahami · Latih · Lulus</p>
          <h1 class="hero__title reveal" style="--d:1">Satu langkah lebih dekat ke <span class="hl">NIP-mu.${hlStroke()}</span></h1>
          <p class="hero__lead reveal" style="--d:2">Rangkuman materi yang padat, cara cepat yang benar-benar terpakai saat ujian, dan latihan soal dengan pembahasan langkah demi langkah — disusun mengikuti struktur SKD CPNS.</p>
          <form class="search reveal" style="--d:3" role="search" id="heroSearch" autocomplete="off">
            ${ic('search')}
            <input type="search" name="q" placeholder="Mau belajar apa? Coba “silogisme”" aria-label="Cari materi" aria-autocomplete="list" aria-controls="heroDrop">
            <kbd>/</kbd>
            <div class="search__drop" id="heroDrop" role="listbox" hidden></div>
          </form>
          <div class="hero__cta reveal" style="--d:4">
            <a class="btn btn--sun" href="#/materi">Jelajahi Materi ${ic('arrowRight', 'i-arrow')}</a>
            <a class="link" href="#/simulasi">atau coba simulasi SKD</a>
          </div>
          <ul class="hero__feats reveal" style="--d:5">
            <li>${ic('book')}<span>Rangkuman<br>padat</span></li>
            <li>${ic('zap')}<span>Cara cepat<br>teruji</span></li>
            <li>${ic('checkCircle')}<span>Pembahasan<br>tiap soal</span></li>
          </ul>
        </div>
        ${heroArt()}
      </div>
    </section>

    ${UI.bannerAktif() ? `<section class="container resume-wrap">${UI.bannerAktif()}</section>` : ''}
    <section class="container skd-wrap"><div class="skd reveal">
      <div class="skd__label"><b>Struktur SKD CPNS</b><span>Sistem CAT · nilai benar 5 poin</span><a class="link link--sm" href="#/panduan">Panduan & strategi waktu ${ic('arrowRight', 'i-arrow')}</a></div>
      <div class="skd__grid">
        ${C.kategori.map((k) => `<div class="skd__item"><span class="skd__code">${esc(k.kode)}</span><div class="skd__num"><b data-count="${k.jumlahSoal}">0</b><span>soal</span></div><span class="skd__pg">Passing grade <strong>${k.passingGrade}</strong></span></div>`).join('')}
        <div class="skd__item skd__item--total"><span class="skd__code">Total</span><div class="skd__num"><b data-count="${C.simulasi.penuh.durasiMenit}">0</b><span>menit</span></div><span class="skd__pg">${totalSoalSKD} soal · nilai maks ${nilaiMaksSKD}</span></div>
      </div>
    </div></section>

    <section class="section container">
      <div class="sec-head">
        <div><h2 class="reveal">Materi Populer</h2><p class="reveal" style="--d:1">Mulai dari topik yang paling sering keluar dan paling cepat menaikkan skor.</p></div>
        <a class="link reveal" href="#/materi">Lihat semua materi ${ic('arrowRight', 'i-arrow')}</a>
      </div>
      <div class="grid-3">${pop.map((m, i) => UI.kartuMateri(m, i)).join('')}</div>
    </section>

    <section class="container">
      <div class="band reveal">
        <div class="sec-head">
          <div><h2>Pilih Jalur Belajar</h2><p>Tiga subtes, tiga cara berpikir yang berbeda. Kerjakan berurutan atau langsung ke bagian yang paling lemah.</p></div>
        </div>
        <div class="paths">${C.kategori.map(pathCard).join('')}</div>
      </div>
    </section>

    <section class="section container">
      <div class="sec-head">
        <div><h2 class="reveal">Belajar dengan Mengerjakan</h2><p class="reveal" style="--d:1">Teori cukup, saatnya mencoba dalam kondisi seperti hari-H.</p></div>
      </div>
      <div class="feature">
        <div class="feature__copy reveal">
          <span class="kicker">Simulasi unggulan</span>
          <h3>Simulasi CAT SKD</h3>
          <p>Timer berjalan, nomor soal bisa ditandai ragu-ragu, dan skor dihitung per subtes lengkap dengan passing grade. Pembahasan terbuka setelah kamu menekan Selesai.</p>
          <ul class="meta-row">
            <li>${ic('file')}${totalSoalSKD} soal</li>
            <li>${ic('clock')}${C.simulasi.penuh.durasiMenit} menit</li>
            <li>${ic('layers')}3 subtes</li>
          </ul>
          <a class="btn btn--ink" href="#/simulasi">Mulai Simulasi ${ic('arrowRight', 'i-arrow')}</a>
        </div>
        ${catMock()}
      </div>
    </section>

    <section class="section section--tint">
      <div class="container">
        <div class="sec-head">
          <div><h2 class="reveal">Satu topik, tiga langkah</h2><p class="reveal" style="--d:1">Setiap materi dirancang supaya kamu paham konsepnya, punya jalan pintas, lalu menguji diri.</p></div>
        </div>
        <ol class="steps3">
          <li class="reveal">
            <span class="steps3__no">01</span>
            <h3>${ic('book')}Baca rangkuman</h3>
            <p>Inti materi dalam tabel dan poin, bukan paragraf panjang.</p>
            <div class="snip"><small>UUD NRI 1945</small><b>Pasal 33 ayat (3)</b><span>Bumi, air, dan kekayaan alam dikuasai negara untuk sebesar-besar kemakmuran rakyat.</span></div>
          </li>
          <li class="reveal" style="--d:1">
            <span class="steps3__no">02</span>
            <h3>${ic('zap')}Pakai cara cepat</h3>
            <p>Trik yang memangkas hitungan dan hafalan saat waktu terbatas.</p>
            <div class="snip snip--mono"><small>Kali 25</small><b>48 × 25</b><span>= 4.800 ÷ 4 = <mark>1.200</mark></span></div>
          </li>
          <li class="reveal" style="--d:2">
            <span class="steps3__no">03</span>
            <h3>${ic('checkCircle')}Latihan & bahas</h3>
            <p>Kerjakan dulu, lalu lihat skor dan alasan di balik setiap jawaban.</p>
            <div class="snip snip--ans"><span class="snip__opt"><i>C</i>162 ${ic('check')}</span><span>Tepat. Setiap suku dikali 3.</span></div>
          </li>
        </ol>
      </div>
    </section>

    <section class="section container faq">
      <div class="faq__intro reveal">
        <h2>Pertanyaan yang Sering Diajukan</h2>
        <p>Belum menemukan jawabannya? Mulai saja dari satu materi — kebanyakan pertanyaan terjawab setelah mencoba.</p>
        <div class="faq__stat"><b data-count="${sumMateri}">0</b><span>materi</span><b data-count="${sumSoal}">0</b><span>soal latihan</span></div>
      </div>
      <div class="acc">
        ${FAQ.map(([q, a], i) => `<div class="acc__item reveal" style="--d:${i}">
          <button class="acc__btn" aria-expanded="false" aria-controls="faq-${i}" id="faqb-${i}"><span>${esc(q)}</span><i>${ic('plus')}</i></button>
          <div class="acc__panel" id="faq-${i}" role="region" aria-labelledby="faqb-${i}"><div><p>${esc(a)}</p></div></div>
        </div>`).join('')}
      </div>
    </section>

    <section class="container">
      <div class="cta reveal">
        <div class="cta__sun"></div>
        <div class="cta__copy">
          <h2>Temukan materi berikutnya</h2>
          <p>Lima belas menit sehari sudah cukup untuk mulai. Pilih satu topik, baca rangkumannya, lalu kerjakan latihannya.</p>
        </div>
        <a class="btn btn--sun" href="#/materi">Jelajahi Materi ${ic('arrowRight', 'i-arrow')}</a>
        <span class="cta__hand">mulai dari sini!</span>
      </div>
    </section>`;

    return {
      html,
      mount(root) {
        initSearch($('#heroSearch', root));
        initAccordion(root);
        UI.pasangBannerAktif(root);
      },
    };
  };

  function initSearch(form) {
    if (!form) return;
    const input = form.querySelector('input');
    const drop = form.querySelector('.search__drop');
    let aktif = -1, hasil = [];
    const tampil = () => {
      const q = input.value.trim();
      if (!q) { drop.hidden = true; return; }
      hasil = data.cariMateri(q).slice(0, 5);
      aktif = -1;
      drop.innerHTML = hasil.length
        ? hasil.map((m, i) => `<a role="option" href="#/materi/${esc(m.id)}" data-i="${i}">${UI.tag(m.kategori)}<span><b>${esc(m.judul)}</b><small>${data.soalMateri(m.id).length} soal · ${esc(m.level || '')}</small></span>${ic('arrowRight')}</a>`).join('') +
          `<button type="submit" class="search__all">Lihat semua hasil untuk “${esc(q)}”</button>`
        : `<div class="search__empty">Belum ada materi untuk “${esc(q)}”. Coba kata lain, misalnya <em>deret</em> atau <em>pancasila</em>.</div>`;
      drop.hidden = false;
    };
    const sorot = () => $$('a[role="option"]', drop).forEach((a, i) => a.classList.toggle('is-active', i === aktif));
    input.addEventListener('input', tampil);
    input.addEventListener('focus', tampil);
    input.addEventListener('keydown', (e) => {
      const n = hasil.length;
      if (e.key === 'ArrowDown' && n) { e.preventDefault(); aktif = (aktif + 1) % n; sorot(); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); aktif = (aktif - 1 + n) % n; sorot(); }
      else if (e.key === 'Escape') { drop.hidden = true; input.blur(); }
      else if (e.key === 'Enter' && aktif >= 0) { e.preventDefault(); App.go('#/materi/' + hasil[aktif].id); }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      App.go('#/materi?q=' + encodeURIComponent(input.value.trim()));
    });
    document.addEventListener('click', function luar(e) {
      if (!document.body.contains(form)) { document.removeEventListener('click', luar); return; }
      if (!form.contains(e.target)) drop.hidden = true;
    });
  }

  function initAccordion(root) {
    $$('.acc__btn', root).forEach((b) => {
      b.addEventListener('click', () => {
        const item = b.closest('.acc__item');
        const open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ======================================================================
     DAFTAR MATERI
     ====================================================================== */
  Pages.materi = function ({ q }) {
    let kat = q.get('k') || 'semua';
    let query = q.get('q') || '';
    const chips = [{ id: 'semua', label: 'Semua', n: C.materi.length }].concat(
      C.kategori.map((k) => ({ id: k.id, label: k.kode, n: data.materiKategori(k.id).length }))
    );
    const html = `
    <section class="page-head">
      <div class="container">
        <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<span>Materi</span></nav>
        <h1 class="reveal" style="--d:1">Materi SKD</h1>
        <p class="reveal" style="--d:2">${C.materi.length} topik dari tiga subtes. Setiap topik berisi rangkuman, cara cepat, dan latihan soal dengan pembahasan.</p>
        <div class="filters reveal" style="--d:3">
          <div class="chips" role="tablist" aria-label="Filter kategori">
            ${chips.map((c) => `<button role="tab" class="chip" data-k="${c.id}" aria-selected="${c.id === kat}">${esc(c.label)}<span>${c.n}</span></button>`).join('')}
          </div>
          <label class="search search--sm">${ic('search')}<input type="search" id="mq" value="${esc(query)}" placeholder="Cari topik…" aria-label="Cari topik"><kbd>/</kbd></label>
        </div>
      </div>
    </section>
    <section class="container section--tight">
      <p class="result-info" id="minfo" aria-live="polite"></p>
      <div class="grid-3" id="mgrid"></div>
    </section>`;

    return {
      html,
      title: 'Materi',
      mount(root) {
        const grid = $('#mgrid', root), info = $('#minfo', root), input = $('#mq', root);
        const draw = () => {
          let list = data.cariMateri(query);
          if (kat !== 'semua') list = list.filter((m) => m.kategori === kat);
          const k = data.kat(kat);
          info.innerHTML = query
            ? `${list.length} hasil untuk “<b>${esc(query)}</b>”${k ? ' di ' + esc(k.kode) : ''}`
            : k ? `<b>${esc(k.nama)}</b> — ${esc(k.deskripsi)}` : '';
          grid.innerHTML = list.length
            ? list.map((m, i) => UI.kartuMateri(m, i % 6)).join('')
            : `<div class="empty"><b>Tidak ada materi yang cocok.</b><p>Coba kata kunci lain atau pilih kategori “Semua”.</p></div>`;
          UI.reveal(grid);
          App.setQuery('/materi', { k: kat === 'semua' ? '' : kat, q: query });
        };
        $$('.chip', root).forEach((c) =>
          c.addEventListener('click', () => {
            kat = c.dataset.k;
            $$('.chip', root).forEach((x) => x.setAttribute('aria-selected', String(x === c)));
            draw();
          })
        );
        let t;
        input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { query = input.value.trim(); draw(); }, 120); });
        draw();
        if (q.get('cari')) setTimeout(() => input.focus(), 50);
      },
    };
  };

  /* ======================================================================
     DETAIL MATERI
     ====================================================================== */
  Pages.materiDetail = function ({ params: [id], q }) {
    const m = data.materi(id);
    if (!m) return Pages.notFound();
    const k = data.kat(m.kategori) || {};
    const soal = data.soalMateri(id);
    let tab = q.get('tab') || 'rangkuman';
    if (!['rangkuman', 'cara-cepat', 'latihan'].includes(tab)) tab = 'rangkuman';
    const sekategori = data.materiKategori(m.kategori);
    const idx = sekategori.indexOf(m);
    const berikut = sekategori[idx + 1] || C.materi[(C.materi.indexOf(m) + 1) % C.materi.length];

    const html = `
    <section class="mhead">
      <div class="container mhead__grid">
        <div>
          <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<a href="#/materi">Materi</a>${ic('chevRight')}<a href="#/materi?k=${esc(m.kategori)}">${esc(k.kode)}</a>${ic('chevRight')}<span>${esc(m.judul)}</span></nav>
          <div class="mhead__tags reveal" style="--d:1">${UI.tag(m.kategori)}<span class="muted">${esc(k.nama || '')}</span></div>
          <h1 class="reveal" style="--d:1">${esc(m.judul)}</h1>
          <p class="mhead__lead reveal" style="--d:2">${esc(m.ringkasan)}</p>
          <ul class="meta-row reveal" style="--d:3">
            <li>${ic('clock')}${m.durasi || 10} menit baca</li>
            <li>${ic('pencil')}${soal.length} soal latihan</li>
            <li>${ic('bars')}${esc(m.level || 'Dasar')}</li>
          </ul>
          <div class="mhead__act reveal" style="--d:4">
            <a class="btn btn--sun" href="#/latihan/m/${esc(m.id)}?n=10${prefQ()}">Mulai Latihan ${ic('arrowRight', 'i-arrow')}</a>
            <button class="btn btn--ghost" id="btnSelesai" aria-pressed="${Store.isSelesai(m.id)}">${ic('check')}<span></span></button>
          </div>
        </div>
        <div class="mhead__art reveal" style="--d:2">${UI.sampul(m, true)}</div>
      </div>
    </section>
    <div class="tabs-bar">
      <div class="container">
        <div class="tabs" role="tablist" aria-label="Bagian materi">
          <button role="tab" data-tab="rangkuman">${ic('book')}Rangkuman</button>
          <button role="tab" data-tab="cara-cepat">${ic('zap')}Cara Cepat<span>${(m.caraCepat || []).length}</span></button>
          <button role="tab" data-tab="latihan">${ic('pencil')}Latihan Soal<span>${soal.length}</span></button>
          <i class="tabs__ink"></i>
        </div>
      </div>
    </div>
    <div class="container section--tight"><div id="tabpanel" role="tabpanel"></div></div>`;

    function rangkuman() {
      const sec = m.rangkuman || [];
      return `<div class="read">
        <aside class="toc">
          <p class="toc__label">Di halaman ini</p>
          <ol>${sec.map((s, i) => `<li><a href="#" data-target="sec-${i}"><span>${pad(i + 1)}</span>${esc(s.judul)}</a></li>`).join('')}</ol>
        </aside>
        <article class="prose">
          ${sec.map((s, i) => `<section class="prose__sec reveal" id="sec-${i}"><span class="prose__no">${pad(i + 1)}</span><h2>${esc(s.judul)}</h2>${UI.blok(s.isi)}</section>`).join('')}
          <div class="next-up reveal">
            <div><small>Sudah paham konsepnya?</small><b>Lanjut ke cara cepat untuk topik ini</b></div>
            <button class="btn btn--ink" data-goto="cara-cepat">Cara Cepat ${ic('arrowRight', 'i-arrow')}</button>
          </div>
        </article>
      </div>`;
    }

    function caraCepat() {
      const list = m.caraCepat || [];
      if (!list.length) return `<div class="empty"><b>Belum ada cara cepat untuk topik ini.</b></div>`;
      return `<div class="tricks">
        ${list.map((t, i) => `<article class="trick reveal" style="--d:${i % 3}">
          <header><span class="trick__no">Trik ${pad(i + 1)}</span><h3>${esc(t.judul)}</h3></header>
          <div class="trick__body">${UI.blok(t.isi)}</div>
          ${t.contoh ? `<div class="trick__ex">
            <span class="kicker">Contoh</span>
            <p class="trick__q">${fmt(t.contoh.soal)}</p>
            <div class="trick__reveal">
              <div>
                <ol class="trick__steps">${(t.contoh.langkah || []).map((l, j) => `<li style="--d:${j}">${fmt(l)}</li>`).join('')}</ol>
                <p class="trick__ans" style="--d:${(t.contoh.langkah || []).length}">${ic('checkCircle')}<span>Jawaban: <b>${fmt(t.contoh.jawaban)}</b></span></p>
              </div>
            </div>
            <button class="btn btn--ghost btn--sm" data-reveal aria-expanded="false">${ic('eye')}<span>Tampilkan langkah</span></button>
          </div>` : ''}
        </article>`).join('')}
        <div class="next-up reveal">
          <div><small>Saatnya menguji diri</small><b>${soal.length} soal latihan menunggumu</b></div>
          <button class="btn btn--ink" data-goto="latihan">Latihan Soal ${ic('arrowRight', 'i-arrow')}</button>
        </div>
      </div>`;
    }

    function latihan() {
      const best = Store.terbaik(m.id);
      const cnt = { mudah: 0, sedang: 0, sulit: 0 };
      soal.forEach((s) => (cnt[s.tingkat] = (cnt[s.tingkat] || 0) + 1));
      const tot = soal.length || 1;
      const opsiN = [5, 10].filter((n) => n < soal.length);
      return `<div class="practice">
        <div class="practice__card reveal">
          <span class="kicker">Mode latihan</span>
          <h2>Latihan: ${esc(m.judul)}</h2>
          <p>Kerjakan semua soal dulu; skor, kunci jawaban, dan pembahasan terbuka setelah selesai. Pilih tingkat kesulitan, atau campur semua tingkat yang diurutkan dari mudah ke sulit.</p>
          <div class="practice__stats">
            <div><b>${soal.length}</b><span>soal tersedia</span></div>
            <div><b>${best != null ? best + '%' : '—'}</b><span>skor terbaik</span></div>
            <div class="practice__lvl">
              <span>Sebaran tingkat</span>
              <div class="lvlbar"><i class="l1" style="flex:${cnt.mudah}"></i><i class="l2" style="flex:${cnt.sedang}"></i><i class="l3" style="flex:${cnt.sulit}"></i></div>
              <small>${cnt.mudah} mudah · ${cnt.sedang} sedang · ${cnt.sulit} sulit</small>
            </div>
          </div>
          ${soal.length ? `<fieldset class="seg" id="segTingkat">
            <legend>Tingkat kesulitan</legend>
            ${LABEL_TINGKAT.map(([v, l]) => {
              const n = v ? cnt[v] || 0 : soal.length;
              const pilih = (Store.d.pref.tingkat || '') === v && n > 0;
              return `<label><input type="radio" name="tingkat" value="${v}" ${pilih || (!v && !(cnt[Store.d.pref.tingkat] > 0)) ? 'checked' : ''} ${n ? '' : 'disabled'}><span>${l}<small> · ${n}</small></span></label>`;
            }).join('')}
          </fieldset>
          <fieldset class="seg">
            <legend>Jumlah soal</legend>
            ${opsiN.map((n) => `<label><input type="radio" name="n" value="${n}" ${n === 10 ? 'checked' : ''}><span>${n} soal</span></label>`).join('')}
            <label><input type="radio" name="n" value="semua" ${!opsiN.includes(10) ? 'checked' : ''}><span>Semua (<span id="nSemua">${soal.length}</span>)</span></label>
          </fieldset>
          ${segWaktu('segWaktu')}
          <button class="btn btn--sun btn--lg" id="startLatihan">Mulai Latihan ${ic('arrowRight', 'i-arrow')}</button>` : `<div class="empty"><b>Belum ada soal untuk materi ini.</b></div>`}
        </div>
        <aside class="practice__side reveal" style="--d:1">
          <h3>${ic('keyboard')}Pintasan keyboard</h3>
          <ul class="keys">
            <li><span><kbd>A</kbd>–<kbd>E</kbd></span>pilih jawaban</li>
            <li><span><kbd>Enter</kbd></span>soal berikutnya</li>
            <li><span><kbd>Esc</kbd></span>keluar latihan</li>
          </ul>
          <h3>${ic('history')}Aman jika ter-refresh</h3>
          <p>Jawabanmu tersimpan otomatis. Jika halaman tertutup, buka lagi latihannya untuk melanjutkan dari soal terakhir; batas waktu tidak diulang dari awal.</p>
          <h3>${ic('timer')}Soal SKD ada waktunya</h3>
          <p>Di CAT BKN, 110 soal dikerjakan dalam 100 menit dengan <b>satu hitung mundur</b> (±55 detik per soal), dan jawaban otomatis dikumpulkan saat waktu habis. Mode <b>Waktu ujian</b> meniru cara itu. <a class="link link--sm" href="#/panduan">Panduan SKD ${ic('arrowRight', 'i-arrow')}</a></p>
          <h3>${ic('target')}Tips</h3>
          <p>Baca rangkuman dan cara cepat terlebih dahulu. Setelah selesai, gunakan tombol <b>Ulangi yang salah</b> di halaman hasil untuk mengulang soal yang belum tepat.</p>
        </aside>
      </div>`;
    }

    return {
      html,
      title: m.judul,
      mount(root) {
        const panel = $('#tabpanel', root);
        const tabs = $$('[data-tab]', root);
        const ink = $('.tabs__ink', root);
        const btnSel = $('#btnSelesai', root);
        let spy = null;

        const labelSel = () => {
          const s = Store.isSelesai(m.id);
          btnSel.setAttribute('aria-pressed', String(s));
          btnSel.querySelector('span').textContent = s ? 'Sudah selesai' : 'Tandai selesai';
        };
        labelSel();
        btnSel.addEventListener('click', () => {
          const s = Store.toggleSelesai(m.id);
          labelSel();
          UI.toast(s ? `${ic('checkCircle')} <span>Materi ditandai selesai</span>` : '<span>Tanda selesai dihapus</span>');
        });

        const moveInk = () => {
          const a = tabs.find((t) => t.dataset.tab === tab);
          if (a && ink) { ink.style.width = a.offsetWidth + 'px'; ink.style.transform = `translateX(${a.offsetLeft}px)`; }
        };

        const show = (t, scroll) => {
          tab = t;
          tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
          moveInk();
          if (spy) { spy.disconnect(); spy = null; }
          panel.innerHTML = t === 'rangkuman' ? rangkuman() : t === 'cara-cepat' ? caraCepat() : latihan();
          panel.classList.remove('panel-enter'); void panel.offsetWidth; panel.classList.add('panel-enter');
          UI.reveal(panel);
          App.setQuery('/materi/' + m.id, { tab: t === 'rangkuman' ? '' : t });
          if (scroll) {
            const bar = $('.tabs-bar', root);
            const y = bar.getBoundingClientRect().top + window.scrollY - 64;
            if (window.scrollY > y) window.scrollTo({ top: y, behavior: 'smooth' });
          }
          if (t === 'rangkuman') initToc();
          if (t === 'latihan') {
            const st = $('#startLatihan', panel);
            const segT = $('#segTingkat', panel);
            const perbaruiN = () => {
              const tg = ($('input[name="tingkat"]:checked', panel) || {}).value || '';
              const n = tg ? soal.filter((s) => (s.tingkat || 'sedang') === tg).length : soal.length;
              const el = $('#nSemua', panel);
              if (el) el.textContent = n;
            };
            segT && segT.addEventListener('change', perbaruiN);
            pasangSegWaktu($('#segWaktu', panel));
            perbaruiN();
            st && st.addEventListener('click', () => {
              const v = ($('input[name="n"]:checked', panel) || {}).value || '10';
              const mw = ($('input[name="waktu"]:checked', panel) || {}).value || 'ujian';
              const tg = ($('input[name="tingkat"]:checked', panel) || {}).value || '';
              Store.d.pref.waktu = mw;
              Store.d.pref.tingkat = tg;
              Store.save();
              App.go(`#/latihan/m/${m.id}?n=${v}${prefQ()}`);
            });
          }
        };

        const initToc = () => {
          const links = $$('.toc a', panel);
          links.forEach((a) =>
            a.addEventListener('click', (e) => {
              e.preventDefault();
              const el = document.getElementById(a.dataset.target);
              el && el.scrollIntoView({ behavior: BA.reduceMotion() ? 'auto' : 'smooth', block: 'start' });
            })
          );
          if (!('IntersectionObserver' in window)) return;
          spy = new IntersectionObserver(
            (es) => es.forEach((e) => {
              if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.dataset.target === e.target.id));
            }),
            { rootMargin: '-30% 0px -60% 0px' }
          );
          $$('.prose__sec', panel).forEach((s) => spy.observe(s));
        };

        tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab, true)));
        panel.addEventListener('click', (e) => {
          const g = e.target.closest('[data-goto]');
          if (g) { show(g.dataset.goto, true); return; }
          const r = e.target.closest('[data-reveal]');
          if (r) {
            const box = r.closest('.trick__ex');
            const open = !box.classList.contains('is-open');
            box.classList.toggle('is-open', open);
            r.setAttribute('aria-expanded', String(open));
            r.querySelector('span').textContent = open ? 'Sembunyikan langkah' : 'Tampilkan langkah';
            r.querySelector('svg').outerHTML = ic(open ? 'eyeOff' : 'eye');
          }
        });
        const onResize = () => moveInk();
        window.addEventListener('resize', onResize);
        show(tab, false);
        requestAnimationFrame(moveInk);
        return { cleanup() { window.removeEventListener('resize', onResize); spy && spy.disconnect(); } };
      },
    };
  };

  /* ======================================================================
     HUB LATIHAN
     ====================================================================== */
  Pages.latihan = function () {
    const riwayat = Store.d.riwayat.slice(0, 6);
    const wq = prefQ;
    const adaArsip = (id) => !!Store.arsipSesi(id);
    const html = `
    <section class="page-head">
      <div class="container">
        <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<span>Latihan Soal</span></nav>
        <h1 class="reveal" style="--d:1">Latihan Soal</h1>
        <p class="reveal" style="--d:2">Pilih per topik untuk memperdalam satu materi, atau campuran per subtes untuk menguji ketahanan. Kunci dan pembahasan terbuka setelah kamu selesai.</p>
      </div>
    </section>
    <section class="container section--tight hub">
      <div class="hub__main">
        ${UI.bannerAktif()}
        <fieldset class="seg seg--wide reveal" id="prefTingkat">
          <legend>Tingkat kesulitan soal</legend>
          ${LABEL_TINGKAT.map(([v, l]) => `<label><input type="radio" name="tingkat" value="${v}" ${(Store.d.pref.tingkat || '') === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
        </fieldset>
        <div class="reveal seg-waktu">${segWaktu("prefWaktu", true)}</div>
        ${C.kategori.map((k, ki) => {
          const ms = data.materiKategori(k.id);
          const nk = data.soalKategori(k.id).length;
          return `<div class="hub__group reveal" style="--d:${ki}">
            <header class="hub__head">
              <div>${UI.tag(k.id)}<h2>${esc(k.nama)}</h2><p>${nk} soal · passing grade ${k.passingGrade} dari ${k.jumlahSoal * 5}</p></div>
              <a class="btn btn--ghost btn--sm" data-base="#/latihan/k/${k.id}?n=10" href="#/latihan/k/${k.id}?n=10${wq()}">${ic('layers')}Campuran 10 soal</a>
            </header>
            <ul class="hub__list">
              ${ms.map((m) => {
                const semua = data.soalMateri(m.id);
                const n = semua.length;
                const nt = { mudah: 0, sedang: 0, sulit: 0 };
                semua.forEach((s) => nt[s.tingkat || 'sedang']++);
                const best = Store.terbaik(m.id);
                return `<li>
                  <a class="hub__row" data-base="#/latihan/m/${esc(m.id)}?n=10" href="#/latihan/m/${esc(m.id)}?n=10${wq()}">
                    <span class="hub__title"><b>${esc(m.judul)}</b><small>${n} soal · <span class="lvlmini" title="${nt.mudah} mudah, ${nt.sedang} sedang, ${nt.sulit} sulit"><i class="l1">${nt.mudah}</i><i class="l2">${nt.sedang}</i><i class="l3">${nt.sulit}</i></span></small></span>
                    <span class="hub__best">${best != null ? `<span class="minibar"><i style="width:${best}%"></i></span><small>${best}%</small>` : '<small class="muted">Belum dicoba</small>'}</span>
                    <span class="hub__go">${ic('arrowRight')}</span>
                  </a>
                </li>`;
              }).join('')}
            </ul>
          </div>`;
        }).join('')}
      </div>
      <aside class="hub__side">
        <div class="side-card reveal">
          <span class="kicker">Siap diuji?</span>
          <h3>Simulasi SKD</h3>
          <p>Kerjakan TWK, TIU, dan TKP sekaligus dengan batas waktu seperti hari-H.</p>
          <a class="btn btn--ink btn--block" href="#/simulasi">Ke Simulasi ${ic('arrowRight', 'i-arrow')}</a>
        </div>
        <div class="side-card reveal" style="--d:1">
          <h3>${ic('history')}Riwayat terakhir</h3>
          ${riwayat.length ? `<ul class="hist">${riwayat.map((r) => `<li>
              <span class="hist__score ${r.persen >= 70 ? 'is-ok' : ''}">${r.persen}%</span>
              <span>${adaArsip(r.id) ? `<a href="#/hasil?id=${esc(r.id)}"><b>${esc(r.judul)}</b></a>` : `<b>${esc(r.judul)}</b>`}<small>${r.jenis === 'simulasi' ? 'Simulasi' : 'Latihan'} · ${tanggal(r.waktu)}</small></span>
            </li>`).join('')}</ul>
            <a class="link" href="#/progres">Semua riwayat & laporan progres ${ic('arrowRight', 'i-arrow')}</a>`
            : '<p class="muted">Belum ada latihan. Hasilmu akan muncul di sini.</p>'}
        </div>
      </aside>
    </section>`;
    return {
      html,
      title: 'Latihan Soal',
      mount(root) {
        UI.pasangBannerAktif(root);
        const segarkan = () => $$('[data-base]', root).forEach((a) => (a.href = a.dataset.base + wq()));
        pasangSegWaktu($('#prefWaktu', root), segarkan);
        $('#prefTingkat', root).addEventListener('change', (e) => {
          Store.d.pref.tingkat = e.target.value;
          Store.save();
          segarkan();
          const lbl = LABEL_TINGKAT.find((x) => x[0] === e.target.value);
          UI.toast(`<span>Soal latihan: <b>${esc(lbl ? lbl[1].toLowerCase() : '')}</b></span>`);
        });
      },
    };
  };

  /* ======================================================================
     INTRO SIMULASI
     ====================================================================== */
  Pages.simulasi = function () {
    const preset = (key) => {
      const p = C.simulasi[key];
      let total = 0;
      const rinci = C.kategori.map((k) => {
        const ada = data.soalKategori(k.id).length;
        const n = Math.min(ada, p.jumlah[k.id] || 0);
        total += n;
        return { k, n, target: p.jumlah[k.id] || 0, pg: Math.ceil((k.passingGrade * n) / k.jumlahSoal) };
      });
      const kurang = rinci.some((r) => r.n < r.target);
      return `<article class="preset reveal ${key === 'penuh' ? 'preset--main' : ''}">
        <header>
          <span class="kicker">${key === 'penuh' ? 'Format hari-H' : 'Pemanasan'}</span>
          <h2>${esc(p.nama)}</h2>
          <p>${esc(p.deskripsi)}</p>
        </header>
        <div class="preset__big"><div><b>${total}</b><span>soal</span></div><div><b data-menit="${p.durasiMenit}">${p.durasiMenit}</b><span>menit</span></div></div>
        <table class="preset__table">
          <thead><tr><th>Subtes</th><th>Soal</th><th>Passing grade</th></tr></thead>
          <tbody>${rinci.map((r) => `<tr><td>${UI.tag(r.k.id)}</td><td>${r.n}${r.n < r.target ? `<small> / ${r.target}</small>` : ''}</td><td>${r.pg} <small>/ ${r.n * 5}</small></td></tr>`).join('')}</tbody>
        </table>
        ${kurang ? `<p class="preset__note">${ic('help')}Bank soal belum mencapai jumlah resmi, jadi jumlah soal dan passing grade disesuaikan secara proporsional.</p>` : ''}
        <a class="btn ${key === 'penuh' ? 'btn--sun' : 'btn--ink'} btn--block" data-sim="#/simulasi/${key}" href="#/simulasi/${key}">Mulai ${esc(p.nama)} ${ic('arrowRight', 'i-arrow')}</a>
      </article>`;
    };
    const html = `
    <section class="page-head">
      <div class="container">
        <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<span>Simulasi SKD</span></nav>
        <h1 class="reveal" style="--d:1">Simulasi SKD</h1>
        <p class="reveal" style="--d:2">Ukur kesiapanmu dalam kondisi yang mirip ujian CAT. Skor dihitung per subtes dan dibandingkan dengan passing grade.</p>
      </div>
    </section>
    <section class="container section--tight sim">
      <div class="sim__main">
        ${UI.bannerAktif()}
        <div class="sim__presets">${preset('mini')}${preset('penuh')}</div>
        <fieldset class="seg seg--wide reveal" id="simTingkat">
          <legend>Tingkat kesulitan</legend>
          ${LABEL_TINGKAT.map(([v, l]) => `<label><input type="radio" name="simtingkat" value="${v}" ${v ? '' : 'checked'}><span>${v ? l : 'Campuran (seperti ujian)'}</span></label>`).join('')}
        </fieldset>
        <p class="muted sim__note" id="simTingkatNote" hidden>${ic('help')}Bank soal per tingkat belum sebanyak format resmi, jadi jumlah soal & passing grade disesuaikan secara proporsional.</p>
        <label class="switch reveal">
          <input type="checkbox" id="khusus">
          <span class="switch__ui" aria-hidden="true"></span>
          <span class="switch__txt"><b>Waktu formasi disabilitas netra</b><small>Pelamar formasi khusus disabilitas netra mendapat 130 menit (bukan 100 menit). Aktifkan untuk menambah waktu 30% pada simulasi.</small></span>
        </label>
      </div>
      <aside class="rules reveal">
        <h3>Aturan simulasi</h3>
        <ol>
          <li><b>Waktu berjalan terus</b>, termasuk saat halaman di-refresh atau ditutup. Jawaban tersimpan otomatis dan simulasi bisa dilanjutkan. Saat waktu habis, jawaban otomatis dikumpulkan.</li>
          <li><b>Bebas berpindah nomor.</b> Gunakan panel nomor soal atau tombol sebelumnya/berikutnya.</li>
          <li><b>Tandai ragu-ragu</b> untuk soal yang ingin kamu periksa kembali.</li>
          <li><b>Pembahasan terkunci</b> sampai kamu menekan Selesai.</li>
          <li><b>Lulus</b> berarti nilai <em>setiap</em> subtes mencapai passing grade-nya.</li>
        </ol>
        <p class="muted">Pintasan: <kbd>A</kbd>–<kbd>E</kbd> memilih, <kbd>←</kbd> <kbd>→</kbd> berpindah soal, <kbd>R</kbd> ragu-ragu.</p>
        <a class="link link--sm" href="#/panduan">Baca panduan & strategi waktu SKD ${ic('arrowRight', 'i-arrow')}</a>
      </aside>
    </section>`;
    return {
      html,
      title: 'Simulasi SKD',
      mount(root) {
        UI.pasangBannerAktif(root);
        const k = $('#khusus', root);
        const segarkan = () => {
          const tg = ($('input[name="simtingkat"]:checked', root) || {}).value || '';
          const qs = [k.checked ? 'khusus=1' : '', tg ? 'tingkat=' + tg : ''].filter(Boolean).join('&');
          $$('[data-sim]', root).forEach((a) => (a.href = a.dataset.sim + (qs ? '?' + qs : '')));
          $$('[data-menit]', root).forEach((b) => (b.textContent = Math.round(+b.dataset.menit * (k.checked ? 1.3 : 1))));
          $('#simTingkatNote', root).hidden = !tg;
        };
        k.addEventListener('change', segarkan);
        $('#simTingkat', root).addEventListener('change', segarkan);
      },
    };
  };

  /* ======================================================================
     PANDUAN SKD — struktur, waktu, penilaian, ambang batas, strategi
     ====================================================================== */
  Pages.panduan = function () {
    const total = C.kategori.reduce((a, k) => a + k.jumlahSoal, 0);
    const menit = C.simulasi.penuh.durasiMenit;
    const html = `
    <section class="page-head">
      <div class="container">
        <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<span>Panduan SKD</span></nav>
        <h1 class="reveal" style="--d:1">Panduan SKD CPNS</h1>
        <p class="reveal" style="--d:2">Aturan main Seleksi Kompetensi Dasar: berapa soal, berapa lama, bagaimana dinilai, dan berapa nilai minimal yang harus kamu kejar.</p>
      </div>
    </section>
    <section class="container section--tight">
      <div class="guide">
        <div class="guide__time reveal">
          <div class="guide__clock">${ic('timer')}<b>${menit}</b><span>menit</span></div>
          <div>
            <h2>Ya, SKD ada batas waktunya.</h2>
            <p><b>${total} soal dikerjakan dalam ${menit} menit</b> melalui sistem CAT BKN, atau sekitar <b>54,5 detik per soal</b>. Waktu berjalan terus dan jawaban otomatis tersimpan ketika waktu habis. Pelamar <b>formasi khusus disabilitas netra</b> mendapat <b>130 menit</b>.</p>
            <div class="guide__cta"><a class="btn btn--sun" href="#/simulasi">Coba simulasi bertimer ${ic('arrowRight', 'i-arrow')}</a><a class="link" href="#/latihan">Latihan dengan ritme ujian</a></div>
          </div>
        </div>

        <article class="prose guide__body">
          <section class="prose__sec reveal">
            <span class="prose__no">01</span><h2>Struktur dan penilaian</h2>
            <div class="table-wrap"><table>
              <thead><tr><th>Subtes</th><th>Soal</th><th>Nilai per soal</th><th>Nilai maks</th><th>Passing grade</th></tr></thead>
              <tbody>
                ${C.kategori.map((k) => `<tr><td>${esc(k.kode)} — ${esc(k.nama)}</td><td>${k.jumlahSoal}</td><td>${k.id === 'tkp' ? '1–5 per opsi' : 'benar 5, salah/kosong 0'}</td><td>${k.jumlahSoal * 5}</td><td>${k.passingGrade}</td></tr>`).join('')}
                <tr><td><b>Total</b></td><td><b>${total}</b></td><td>—</td><td><b>${total * 5}</b></td><td><b>${C.kategori.reduce((a, k) => a + k.passingGrade, 0)}</b> (kumulatif)</td></tr>
              </tbody>
            </table></div>
            <p>Pada formasi umum, <b>setiap subtes harus mencapai passing grade-nya masing-masing</b>. Nilai total tinggi tidak menolong jika satu subtes di bawah ambang. Di TKP tidak ada jawaban bernilai nol, jadi jangan pernah mengosongkan soal TKP.</p>
          </section>

          <section class="prose__sec reveal">
            <span class="prose__no">02</span><h2>Nilai ambang batas per jalur formasi</h2>
            <div class="table-wrap"><table>
              <thead><tr><th>Jalur</th><th>Syarat lolos SKD</th></tr></thead>
              <tbody>
                <tr><td>Umum (termasuk putra/putri Kalimantan)</td><td>TWK ≥ 65, TIU ≥ 80, TKP ≥ 166</td></tr>
                <tr><td>Lulusan cumlaude & diaspora</td><td>Nilai kumulatif ≥ 311 dan TIU ≥ 85</td></tr>
                <tr><td>Penyandang disabilitas, putra/putri Papua, daerah tertinggal</td><td>Nilai kumulatif ≥ 286 dan TIU ≥ 60</td></tr>
              </tbody>
            </table></div>
            <aside class="note">${ic('bulb')}<div><p>Angka di atas mengacu pada Keputusan Menteri PANRB No. 321 Tahun 2024 dan dipakai sebagai acuan oleh banyak media untuk seleksi berikutnya. Ketentuan resmi seleksi tahun berjalan selalu diumumkan di <b>sscasn.bkn.go.id</b> — cocokkan sebelum ujian.</p></div></aside>
            <p>Jika nilai kumulatif peserta sama, urutan kelulusan ditentukan dari nilai <b>TKP</b>, lalu <b>TIU</b>, lalu <b>TWK</b>.</p>
          </section>

          <section class="prose__sec reveal">
            <span class="prose__no">03</span><h2>Strategi membagi waktu</h2>
            <p>Di CAT kamu bebas berpindah nomor, jadi tidak harus mengerjakan berurutan. Pembagian berikut adalah saran agar ${menit} menit cukup dan masih tersisa waktu memeriksa:</p>
            <div class="table-wrap"><table>
              <thead><tr><th>Subtes</th><th>Target per soal</th><th>Total</th><th>Alasan</th></tr></thead>
              <tbody>
                <tr><td>TKP (45 soal)</td><td>±35 detik</td><td>±26 menit</td><td>Soal sikap, tanpa hitungan. Kerjakan lebih dulu untuk mengamankan nilai.</td></tr>
                <tr><td>TWK (30 soal)</td><td>±40 detik</td><td>±20 menit</td><td>Hafalan dan studi kasus; jika lupa, tandai ragu-ragu lalu lanjut.</td></tr>
                <tr><td>TIU (35 soal)</td><td>±75 detik</td><td>±44 menit</td><td>Hitungan dan logika butuh waktu paling banyak.</td></tr>
                <tr><td>Cadangan</td><td>—</td><td>±10 menit</td><td>Memeriksa soal ragu-ragu dan yang masih kosong.</td></tr>
              </tbody>
            </table></div>
            <ul class="list">
              <li>Jangan terpaku pada satu soal sulit. Lewati, tandai <b>ragu-ragu</b>, dan kembali di akhir.</li>
              <li>Untuk TWK dan TIU, salah dan kosong sama-sama bernilai 0. Jika waktu hampir habis, tetap isi jawaban terbaikmu.</li>
              <li>Latih kecepatan dengan mode <b>Ritme ujian</b> di halaman latihan; halaman hasil menandai soal yang kamu kerjakan lebih dari 55 detik.</li>
            </ul>
          </section>

          <section class="prose__sec reveal">
            <span class="prose__no">04</span><h2>Kisi-kisi materi</h2>
            <dl class="terms">
              <div><dt>TWK</dt><dd>Nasionalisme, integritas, bela negara, pilar negara (Pancasila, UUD 1945, NKRI, Bhinneka Tunggal Ika), dan bahasa negara.</dd></div>
              <div><dt>TIU</dt><dd>Verbal (analogi, silogisme, analitis), numerik (berhitung, deret angka, perbandingan kuantitatif, soal cerita), dan figural (analogi, ketidaksamaan, serial gambar).</dd></div>
              <div><dt>TKP</dt><dd>Pelayanan publik, jejaring kerja, sosial budaya, teknologi informasi dan komunikasi, profesionalisme, dan anti radikalisme.</dd></div>
            </dl>
            <a class="btn btn--ink" href="#/materi">Pelajari materinya ${ic('arrowRight', 'i-arrow')}</a>
          </section>
        </article>
      </div>
    </section>`;
    return { html, title: 'Panduan SKD' };
  };

  /* ======================================================================
     404
     ====================================================================== */
  Pages.notFound = function () {
    return {
      title: 'Halaman tidak ditemukan',
      html: `<section class="container nf">
        <span class="nf__code">404</span>
        <h1>Halaman ini tidak ada di kisi-kisi.</h1>
        <p>Tautannya mungkin salah ketik atau materinya sudah dipindahkan.</p>
        <a class="btn btn--ink" href="#/">${ic('arrowLeft')} Kembali ke beranda</a>
      </section>`,
    };
  };

  /* ======================================================================
     ROUTES
     ====================================================================== */
  BA.registerRoutes = function (App) {
    App.on(/^\/$/, Pages.home);
    App.on(/^\/materi$/, Pages.materi);
    App.on(/^\/materi\/([\w-]+)$/, Pages.materiDetail);
    App.on(/^\/latihan$/, Pages.latihan);
    App.on(/^\/latihan\/(m|k)\/([\w-]+)$/, BA.Quiz.latihan);
    App.on(/^\/latihan\/ulang$/, BA.Quiz.ulang);
    App.on(/^\/simulasi$/, Pages.simulasi);
    App.on(/^\/panduan$/, Pages.panduan);
    App.on(/^\/simulasi\/([\w-]+)$/, BA.Quiz.simulasi);
    App.on(/^\/hasil$/, BA.Quiz.hasil);
  };
})();
