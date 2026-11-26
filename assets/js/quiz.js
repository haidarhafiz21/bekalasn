/* ==========================================================================
   BekalASN — mesin soal: latihan, simulasi CAT, hasil & pembahasan
   ========================================================================== */
(function () {
  'use strict';
  const { C, $, $$, esc, fmt, polos, ic, data, Store, UI, App, nilai, acak, jam, durasiTeks, tanggal, HURUF } = BA;
  const Quiz = (BA.Quiz = {});

  /* ---------- sesi ---------- */
  function buatSesi(jenis, judul, sumber, soal, extra) {
    const urutan = {};
    // Opsi TKP diacak agar posisi jawaban terbaik tidak bisa ditebak
    soal.forEach((s) => { if (s.tkp) urutan[s.id] = acak(s.opsi.map((_, i) => i)); });
    return Object.assign(
      { id: Date.now().toString(36), jenis, judul, sumber, soalIds: soal.map((s) => s.id), urutan, jawaban: {}, ragu: {}, waktu: {}, mulai: Date.now() },
      extra || {}
    );
  }
  const urutanOpsi = (sesi, s) => (sesi.urutan && sesi.urutan[s.id]) || s.opsi.map((_, i) => i);
  const hurufTampil = (sesi, s, oi) => HURUF[urutanOpsi(sesi, s).indexOf(oi)];

  function hitung(sesi) {
    const rows = [], per = {};
    sesi.soalIds.forEach((id) => {
      const s = data.soal(id);
      if (!s) return;
      const p = sesi.jawaban[id];
      const n = nilai(s, p == null ? null : p);
      rows.push(Object.assign({ no: rows.length + 1, s, pilih: p == null ? null : p, ragu: !!(sesi.ragu || {})[id] }, n));
      const k = s.kategori;
      per[k] = per[k] || { skor: 0, maks: 0, benar: 0, salah: 0, kosong: 0, n: 0 };
      per[k].skor += n.skor; per[k].maks += n.maks; per[k][n.status]++; per[k].n++;
    });
    const sum = (f) => rows.reduce((a, r) => a + f(r), 0);
    const skor = sum((r) => r.skor), maks = sum((r) => r.maks) || 1;
    const H = {
      rows, per, skor, maks,
      benar: sum((r) => +(r.status === 'benar')),
      salah: sum((r) => +(r.status === 'salah')),
      kosong: sum((r) => +(r.status === 'kosong')),
      persen: Math.round((skor / maks) * 100),
      lulus: null,
    };
    if (sesi.pg) {
      Object.keys(per).forEach((k) => (per[k].pg = sesi.pg[k] || 0));
      H.lulus = Object.keys(per).every((k) => per[k].skor >= per[k].pg);
    }
    return H;
  }

  function selesaikan(sesi) {
    sesi.selesai = Date.now();
    // Durasi = waktu benar-benar mengerjakan (jeda saat halaman ditutup tidak dihitung pada latihan tanpa batas)
    sesi.durasi = sesi.batas
      ? Math.min(sesi.batas, Math.round((sesi.selesai - sesi.mulai) / 1000))
      : Math.round(sesi.terpakai != null ? sesi.terpakai : (sesi.selesai - sesi.mulai) / 1000);
    const H = hitung(sesi);
    // Ringkasan untuk riwayat & laporan perkembangan
    const per = {}, materi = {}, tingkat = {};
    Object.keys(H.per).forEach((k) => { const p = H.per[k]; per[k] = { skor: p.skor, maks: p.maks, benar: p.benar, n: p.n }; });
    H.rows.forEach((r) => {
      const ok = r.status === 'benar' ? 1 : 0;
      const m = (materi[r.s.materi] = materi[r.s.materi] || [0, 0]); m[0] += ok; m[1]++;
      const tg = r.s.tingkat || 'sedang';
      const t = (tingkat[tg] = tingkat[tg] || [0, 0]); t[0] += ok; t[1]++;
    });
    Store.catat(sesi, {
      skor: H.skor, maks: H.maks, persen: H.persen, lulus: H.lulus, durasi: sesi.durasi,
      n: H.rows.length, benar: H.benar, salah: H.salah, kosong: H.kosong, per, materi, tingkat,
    });
  }

  /* ---------- tingkat kesulitan ---------- */
  const TINGKAT = ['mudah', 'sedang', 'sulit'];
  const namaTingkat = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
  const ambilTingkat = (q) => { const t = q && q.get('tingkat'); return TINGKAT.includes(t) ? t : ''; };
  const saringTingkat = (pool, t) => (t ? pool.filter((s) => (s.tingkat || 'sedang') === t) : pool);
  BA.TINGKAT = TINGKAT;
  BA.namaTingkat = namaTingkat;

  /* ---------- melanjutkan sesi setelah refresh / halaman ditutup ---------- */
  // Sesi yang belum selesai disimpan bersama alamat halamannya. Saat alamat yang
  // sama dibuka lagi, sesi itu dilanjutkan — termasuk sisa waktunya (waktu tidak
  // diulang dari awal, sehingga refresh tidak bisa dipakai untuk menambah waktu).
  function sesiAktifUntuk(hash) {
    const a = Store.d.aktif;
    if (!a || a.hash !== hash || !a.sesi || !Array.isArray(a.sesi.soalIds)) return null;
    if (!a.sesi.soalIds.every((id) => data.soal(id))) { Store.hapusAktif(); return null; }
    return a;
  }
  Quiz.lanjut = function () {
    const a = Store.d.aktif;
    return { redirect: a && a.hash ? a.hash : '#/latihan' };
  };

  /* ---------- potongan tampilan bersama ---------- */
  function kepalaSoal(s, no, total) {
    const m = data.materi(s.materi);
    return `<div class="q__head">
      <span class="q__no">Soal ${no}${total ? `<small> / ${total}</small>` : ''}</span>
      ${UI.tag(s.kategori)}
      ${m ? `<span class="q__topic">${esc(m.judul)}</span>` : ''}
      ${s.tingkat ? `<span class="lvl lvl--${esc(s.tingkat)}">${esc(s.tingkat)}</span>` : ''}
    </div>
    ${s.gambar ? `<figure class="q__fig"><img src="${esc(s.gambar)}" alt="Gambar soal ${no}"></figure>` : ''}
    <div class="q__text">${fmt(s.soal)}</div>
    ${UI.figur(s.figur)}`;
  }
  const kelasOpsi = (s) => 'q__opts' + (UI.opsiFigural(s) ? ' q__opts--fig' : '');

  // Ritme ujian: 100 menit untuk 110 soal ≈ 54,5 detik per soal
  const DETIK_PER_SOAL = 6000 / 110;
  const DETIK_SOAL = Math.round(DETIK_PER_SOAL); // 55 detik untuk mode per soal
  // Mode waktu latihan: 'ujian' = hitung mundur total (seperti CAT BKN),
  // 'soal' = hitung mundur tiap soal & otomatis lanjut, 'bebas' = tanpa batas.
  const PARAM_WAKTU = { ujian: '1', soal: 'soal', bebas: '0' };
  const modeWaktu = (w) => (w === 'soal' ? 'soal' : w === '0' ? 'bebas' : w === '1' ? 'ujian' : Store.d.pref.waktu || 'ujian');
  function aturWaktu(sesi, mode) {
    const n = sesi.soalIds.length;
    if (mode === 'ujian') sesi.batas = Math.round(n * DETIK_PER_SOAL);
    else if (mode === 'soal') sesi.perSoal = DETIK_SOAL;
    sesi.sumber.waktu = PARAM_WAKTU[mode];
  }
  const waktuTeks = (d) => (d >= 60 ? `${Math.floor(d / 60)} mnt ${d % 60} dtk` : `${d} dtk`);

  function opsiHTML(sesi, s) {
    return urutanOpsi(sesi, s)
      .map((oi, p) => `<button type="button" class="opt" data-oi="${oi}" aria-pressed="false">
        <span class="opt__key">${HURUF[p]}</span>
        <span class="opt__text">${UI.teksOpsi(s.opsi[oi])}</span>
        <span class="opt__mark"><svg viewBox="0 0 24 24"><path class="m-ok" d="M5 12.5l4.5 4.5L19 7.5"/><path class="m-no" d="M7 7l10 10M17 7 7 17"/></svg></span>
      </button>`)
      .join('');
  }

  function pembahasanHTML(s) {
    return `<div class="explain"><h4>${ic('bulb')}Pembahasan</h4>${UI.blok(s.pembahasan || 'Pembahasan belum tersedia.')}</div>`;
  }

  // Tangkap A–E / 1–5
  function tombolKeOpsi(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return -1;
    const k = e.key.toUpperCase();
    let i = HURUF.indexOf(k);
    if (i < 0 && /^[1-8]$/.test(k)) i = +k - 1;
    return k.length === 1 ? i : -1;
  }
  const sedangMengetik = (e) => e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);

  /* ======================================================================
     MODE LATIHAN — kunci & pembahasan baru terbuka setelah selesai
     ====================================================================== */
  Quiz.latihan = function ({ params: [tipe, id], q }) {
    const hash = location.hash;
    const aktif = sesiAktifUntuk(hash);
    if (aktif) return jalankanLatihan(aktif.sesi, aktif.posisi, hash);

    let pool, judul, sumber;
    if (tipe === 'm') {
      const m = data.materi(id);
      if (!m) return BA.Pages.notFound();
      pool = data.soalMateri(id); judul = m.judul; sumber = { tipe: 'materi', id };
    } else {
      const k = data.kat(id);
      if (!k) return BA.Pages.notFound();
      pool = data.soalKategori(id); judul = 'Campuran ' + k.kode; sumber = { tipe: 'kategori', id };
    }
    const tg = ambilTingkat(q);
    pool = saringTingkat(pool, tg);
    if (tg) { judul += ' · ' + namaTingkat[tg]; sumber.tingkat = tg; }
    const nParam = q.get('n') || '10';
    const n = nParam === 'semua' ? pool.length : Math.min(parseInt(nParam, 10) || 10, pool.length);
    let soal = acak(pool).slice(0, n);
    if (tipe === 'm') soal.sort((a, b) => (data.urutTingkat[a.tingkat] ?? 1) - (data.urutTingkat[b.tingkat] ?? 1));
    sumber.n = nParam;
    if (!soal.length) return kosong(tg ? `Belum ada soal tingkat ${namaTingkat[tg].toLowerCase()} untuk bagian ini.` : 'Belum ada soal untuk bagian ini.', tipe === 'm' ? `#/materi/${id}?tab=latihan` : '#/latihan');
    const sesi = buatSesi('latihan', judul, sumber, soal);
    aturWaktu(sesi, modeWaktu(q.get('waktu')));
    return jalankanLatihan(sesi, 0, hash);
  };

  Quiz.ulang = function () {
    const hash = location.hash;
    const aktif = sesiAktifUntuk(hash);
    if (aktif) return jalankanLatihan(aktif.sesi, aktif.posisi, hash);
    const u = Store.d.ulang;
    const soal = u && u.ids ? u.ids.map(data.soal).filter(Boolean) : [];
    if (!soal.length) return { redirect: '#/latihan' };
    const sesi = buatSesi('latihan', 'Ulangi: ' + u.judul.replace(/^Ulangi: /, ''), { tipe: 'ulang' }, acak(soal));
    aturWaktu(sesi, modeWaktu(null));
    return jalankanLatihan(sesi, 0, hash);
  };

  function kosong(pesan, balik) {
    return {
      title: 'Latihan',
      html: `<section class="container nf"><h1>${esc(pesan)}</h1><p>Tambahkan soal di folder <code>assets/js/data</code>.</p><a class="btn btn--ink" href="${balik}">${ic('arrowLeft')} Kembali</a></section>`,
    };
  }

  function asalLatihan(sesi) {
    const s = sesi.sumber || {};
    if (s.tipe === 'materi') return `#/materi/${s.id}?tab=latihan`;
    return '#/latihan';
  }

  function jalankanLatihan(sesi, posisi, hash) {
    const soal = sesi.soalIds.map(data.soal);
    const N = soal.length;
    let i = Math.min(Math.max(0, posisi || 0), N - 1);
    let dijawab = Object.keys(sesi.jawaban).length;
    const dilanjutkan = dijawab > 0 || i > 0;
    // Batas waktu memakai jam dinding: refresh / tutup halaman tidak mengulang waktu
    if (sesi.batas && !sesi.akhir) sesi.akhir = sesi.mulai + sesi.batas * 1000;
    if (sesi.terpakai == null) sesi.terpakai = 0;
    // Mode per soal: tiap soal punya tenggat sendiri (jam dinding). Jika halaman
    // sempat tertutup, soal yang waktunya sudah lewat dianggap terlewati.
    let habisSaatDibuka = false;
    if (sesi.perSoal) {
      if (!sesi.akhirSoal) sesi.akhirSoal = Date.now() + sesi.perSoal * 1000;
      while (Date.now() >= sesi.akhirSoal) {
        const id = sesi.soalIds[i];
        if (!sesi.waktu[id]) sesi.waktu[id] = sesi.perSoal;
        if (i >= N - 1) { habisSaatDibuka = true; break; }
        i++;
        sesi.akhirSoal += sesi.perSoal * 1000;
      }
    }
    const berwaktu = !!(sesi.batas || sesi.perSoal);
    const sisaAwal = sesi.perSoal ? (sesi.akhirSoal - Date.now()) / 1000 : sesi.batas ? (sesi.akhir - Date.now()) / 1000 : sesi.terpakai;
    const simpan = () => Store.simpanAktif(hash, sesi, i);
    simpan();

    const html = `<div class="run">
      <header class="run__bar">
        <div class="container run__bar-in">
          <a class="iconbtn" href="${asalLatihan(sesi)}" aria-label="Keluar latihan">${ic('x')}</a>
          <div class="run__title"><span class="run__kicker">Latihan</span><b>${esc(sesi.judul)}</b></div>
          <div class="run__score">
            <span class="run__timer${berwaktu ? ' is-count' : ''}" id="rTimer" title="${sesi.perSoal ? `Sisa waktu soal ini (${sesi.perSoal} detik per soal, otomatis lanjut)` : sesi.batas ? 'Sisa waktu seluruh latihan (ritme CAT ±55 detik per soal)' : 'Waktu berjalan (tanpa batas)'}">${ic('timer')}<b>${jam(Math.max(0, sisaAwal))}</b></span>
            <span class="run__ok" title="Soal dijawab — kunci & pembahasan terbuka setelah selesai">${ic('checkCircle')}<b id="rBenar">${dijawab}</b></span>
            <span class="run__count"><b id="rNo">1</b>/${N}</span>
          </div>
        </div>
        <div class="run__progress"><i id="rProg"></i></div>
      </header>
      <div class="container run__body">
        <ol class="dots" id="rDots" aria-hidden="true">${soal.map((s, j) => `<li data-j="${j}"${sesi.jawaban[s.id] != null ? ' class="is-done"' : ''}></li>`).join('')}</ol>
        <article class="qcard" id="qcard"></article>
      </div>
    </div>`;

    return {
      html,
      layout: 'focus',
      title: 'Latihan · ' + sesi.judul,
      mount(root) {
        const card = $('#qcard', root);
        const dots = $$('#rDots li', root);
        const timerEl = $('#rTimer', root);
        let selesai = false, t0 = Date.now();
        // Stopwatch latihan tanpa batas: hanya menghitung saat halaman terbuka
        let tJalan = Date.now();
        const terpakai = () => sesi.terpakai + (Date.now() - tJalan) / 1000;
        const simpanWaktu = () => { sesi.terpakai = terpakai(); tJalan = Date.now(); simpan(); };

        const akhiri = (otomatis) => {
          if (selesai) return;
          selesai = true;
          clearInterval(tick);
          sesi.terpakai = terpakai();
          selesaikan(sesi);
          if (otomatis) UI.toast(`${ic('timer')}<span>Waktu habis — jawaban dikumpulkan otomatis; soal yang belum dijawab dihitung kosong.</span>`);
          App.go('#/hasil');
        };
        let detik = 0;
        const detak = () => {
          if (selesai) return;
          if (sesi.perSoal) {
            const sisa = Math.ceil((sesi.akhirSoal - Date.now()) / 1000);
            timerEl.querySelector('b').textContent = jam(Math.max(0, sisa));
            timerEl.classList.toggle('is-warn', sisa <= 10);
            if (sisa <= 0) lanjut(true);
            else if (++detik % 10 === 0) simpanWaktu();
          } else if (sesi.batas) {
            const sisa = Math.round((sesi.akhir - Date.now()) / 1000);
            timerEl.querySelector('b').textContent = jam(Math.max(0, sisa));
            timerEl.classList.toggle('is-warn', sisa <= 60);
            if (sisa <= 0) akhiri(true);
          } else {
            timerEl.querySelector('b').textContent = jam(terpakai());
            if (++detik % 10 === 0) simpanWaktu();
          }
        };
        const tick = setInterval(detak, 1000);
        const onHide = () => { if (!selesai && document.visibilityState === 'hidden') simpanWaktu(); };
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onHide);

        // Saat berwaktu, soal boleh dilewati (dihitung kosong) seperti ujian sungguhan
        const labelNext = (pil) => (i === N - 1 ? (pil == null && berwaktu ? 'Lewati & lihat hasil' : 'Lihat hasil') : pil == null && berwaktu ? 'Lewati' : 'Soal berikutnya');
        const render = () => {
          const s = soal[i];
          t0 = Date.now();
          const pil = sesi.jawaban[s.id];
          card.innerHTML = `${kepalaSoal(s, i + 1)}
            <div class="${kelasOpsi(s)}" role="group" aria-label="Pilihan jawaban">${opsiHTML(sesi, s)}</div>
            <div class="q__foot">
              <span class="hint">${ic('keyboard')}Tekan <kbd>A</kbd>–<kbd>${HURUF[s.opsi.length - 1]}</kbd> untuk memilih</span>
              <button class="btn btn--ink" data-act="next" ${pil == null && !berwaktu ? 'disabled' : ''}><span>${labelNext(pil)}</span> ${ic('arrowRight', 'i-arrow')}</button>
            </div>`;
          if (pil != null) $$('.opt', card).forEach((b) => { const on = +b.dataset.oi === pil; b.classList.toggle('is-picked', on); b.setAttribute('aria-pressed', String(on)); });
          card.classList.remove('q-enter'); void card.offsetWidth; card.classList.add('q-enter');
          $('#rNo', root).textContent = i + 1;
          $('#rProg', root).style.width = ((i + (pil != null ? 1 : 0)) / N) * 100 + '%';
          dots.forEach((d, j) => d.classList.toggle('is-cur', j === i));
        };

        // Jawaban hanya ditandai (masih bisa diganti sebelum lanjut). Benar/salah,
        // kunci, dan pembahasan sengaja TIDAK ditampilkan di sini — semuanya baru
        // terbuka di halaman hasil setelah latihan selesai, agar tidak bisa dicontek.
        const pilih = (oi) => {
          const s = soal[i];
          if (selesai) return;
          const baru = sesi.jawaban[s.id] == null;
          sesi.jawaban[s.id] = oi;
          $$('.opt', card).forEach((b) => {
            const on = +b.dataset.oi === oi;
            b.classList.toggle('is-picked', on);
            b.setAttribute('aria-pressed', String(on));
          });
          if (baru) {
            dijawab++;
            $('#rBenar', root).textContent = dijawab;
            dots[i].classList.add('is-done');
            $('#rProg', root).style.width = ((i + 1) / N) * 100 + '%';
          }
          simpan();
          const nx = $('[data-act="next"]', card);
          nx.disabled = false;
          nx.querySelector('span').textContent = labelNext(oi);
          if (baru) setTimeout(() => {
            nx.focus({ preventScroll: true });
            const r = nx.getBoundingClientRect();
            if (r.bottom > window.innerHeight) window.scrollBy({ top: r.bottom - window.innerHeight + 24, behavior: BA.reduceMotion() ? 'auto' : 'smooth' });
          }, 200);
        };

        const lanjut = (waktuHabis) => {
          const s = soal[i];
          if (selesai || (sesi.jawaban[s.id] == null && !berwaktu)) return;
          sesi.waktu[s.id] = (sesi.waktu[s.id] || 0) + Math.max(1, Math.round((Date.now() - t0) / 1000));
          if (sesi.perSoal && sesi.waktu[s.id] > sesi.perSoal) sesi.waktu[s.id] = sesi.perSoal;
          if (i < N - 1) {
            i++;
            if (sesi.perSoal) sesi.akhirSoal = Date.now() + sesi.perSoal * 1000;
            if (waktuHabis) UI.toast(`${ic('timer')}<span>Waktu soal ${i} habis — otomatis lanjut ke soal ${i + 1}.</span>`);
            simpanWaktu();
            render();
            window.scrollTo({ top: 0, behavior: BA.reduceMotion() ? 'auto' : 'smooth' });
          } else {
            akhiri(!!waktuHabis);
          }
        };

        card.addEventListener('click', (e) => {
          const o = e.target.closest('.opt');
          if (o && !o.disabled) { pilih(+o.dataset.oi); return; }
          if (e.target.closest('[data-act="next"]')) lanjut(false);
        });
        const onKey = (e) => {
          if (sedangMengetik(e) || document.querySelector('.modal')) return;
          const k = tombolKeOpsi(e);
          const s = soal[i];
          if (k >= 0 && k < s.opsi.length) {
            e.preventDefault();
            pilih(urutanOpsi(sesi, s)[k]);
          } else if (e.key === 'Enter' && (sesi.jawaban[s.id] != null || berwaktu)) {
            e.preventDefault();
            lanjut(false);
          } else if (e.key === 'Escape') {
            location.hash = asalLatihan(sesi);
          }
        };
        document.addEventListener('keydown', onKey);
        render();
        if (habisSaatDibuka || (sesi.batas && Date.now() >= sesi.akhir)) setTimeout(() => akhiri(true), 0);
        else if (dilanjutkan) UI.toast(`${ic('play')}<span>Melanjutkan latihan dari soal ${i + 1}${berwaktu ? ' — waktu tetap berjalan' : ''}.</span>`);

        return {
          cleanup() {
            clearInterval(tick);
            if (!selesai) simpanWaktu();
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onHide);
          },
          guard() {
            if (selesai || !Object.keys(sesi.jawaban).length) return Promise.resolve(true);
            return UI.modal({
              judul: 'Keluar dari latihan?',
              isi: `<p>Kamu sudah menjawab ${Object.keys(sesi.jawaban).length} dari ${N} soal. Jawabanmu <b>tersimpan</b> dan bisa dilanjutkan dari halaman Latihan.${berwaktu ? ' Ingat, <b>waktu tetap berjalan</b> walaupun halaman ditutup.' : ''}</p>`,
              ok: 'Keluar', batal: 'Lanjutkan latihan', nada: 'ink',
            });
          },
        };
      },
    };
  }

  /* ======================================================================
     SIMULASI CAT — timer, ragu-ragu, panel nomor
     ====================================================================== */
  Quiz.simulasi = function ({ params: [key], q }) {
    const p = C.simulasi[key];
    if (!p) return BA.Pages.notFound();
    const hash = location.hash;
    const aktif = sesiAktifUntuk(hash);
    let sesi, soal, i = 0;
    if (aktif) {
      sesi = aktif.sesi;
      soal = sesi.soalIds.map(data.soal);
      i = Math.min(Math.max(0, aktif.posisi || 0), soal.length - 1);
    } else {
      // Formasi khusus disabilitas netra: 130 menit untuk 100 menit normal (+30%)
      const khusus = q && q.get('khusus') === '1';
      const tg = ambilTingkat(q);
      const menit = Math.round(p.durasiMenit * (khusus ? 1.3 : 1));
      const pg = {};
      soal = [];
      C.kategori.forEach((k) => {
        const ambil = acak(saringTingkat(data.soalKategori(k.id), tg)).slice(0, p.jumlah[k.id] || 0);
        if (!ambil.length) return;
        soal.push(...ambil);
        pg[k.id] = Math.ceil((k.passingGrade * ambil.length) / k.jumlahSoal);
      });
      if (!soal.length) return kosong('Bank soal masih kosong.', '#/simulasi');
      const judul = p.nama + (tg ? ' · ' + namaTingkat[tg] : '') + (khusus ? ' (waktu formasi khusus)' : '');
      sesi = buatSesi('simulasi', judul, { tipe: 'simulasi', id: key, khusus: khusus ? '1' : '', tingkat: tg }, soal, { pg, batas: menit * 60 });
    }
    // Batas waktu memakai jam dinding: refresh / tutup halaman tidak mengulang waktu
    if (!sesi.akhir) sesi.akhir = sesi.mulai + sesi.batas * 1000;
    const rentang = [];
    soal.forEach((s, j) => {
      const r = rentang[rentang.length - 1];
      if (r && r.k.id === s.kategori) r.sampai = j;
      else rentang.push({ k: data.kat(s.kategori) || { id: s.kategori, kode: s.kategori }, dari: j, sampai: j });
    });
    const N = soal.length;
    const dilanjutkan = !!aktif;
    const simpan = () => Store.simpanAktif(hash, sesi, i);
    simpan();

    const html = `<div class="cat">
      <header class="run__bar">
        <div class="container run__bar-in">
          <div class="run__title"><span class="run__kicker">Simulasi</span><b>${esc(p.nama)}</b></div>
          <div class="timer" id="timer" role="timer">${ic('timer')}<span>${jam(Math.max(0, (sesi.akhir - Date.now()) / 1000))}</span></div>
          <div class="cat__actions">
            <button class="btn btn--ghost btn--sm cat__gridbtn" data-act="grid" aria-expanded="false" aria-controls="cside">${ic('grid')}<span>Nomor</span></button>
            <button class="btn btn--ink btn--sm" data-act="selesai">Selesai</button>
          </div>
        </div>
        <div class="run__progress"><i id="cProg"></i></div>
      </header>
      <div class="container cat__body">
        <section class="cat__main">
          <article class="qcard" id="qcard"></article>
          <nav class="cat__nav" aria-label="Navigasi soal">
            <button class="btn btn--ghost" data-act="prev">${ic('arrowLeft')}<span>Sebelumnya</span></button>
            <button class="btn btn--ghost btn--ragu" data-act="ragu" aria-pressed="false">${ic('flag')}<span>Ragu-ragu</span></button>
            <button class="btn btn--ink" data-act="next"><span>Berikutnya</span>${ic('arrowRight', 'i-arrow')}</button>
          </nav>
        </section>
        <aside class="cat__side" id="cside" aria-label="Nomor soal">
          <div class="cat__side-in">
            <header><b>Nomor soal</b><button class="iconbtn cat__close" data-act="grid" aria-label="Tutup">${ic('x')}</button></header>
            <div class="cat__stats">
              <span><i class="f"></i><b id="sJawab">0</b>dijawab</span>
              <span><i class="r"></i><b id="sRagu">0</b>ragu</span>
              <span><i></i><b id="sKosong">${N}</b>kosong</span>
            </div>
            ${rentang.map((r) => `<div class="ngroup">
              <p>${UI.tag(r.k.id)}<small>No. ${r.dari + 1}–${r.sampai + 1}</small></p>
              <div class="ngrid">${soal.slice(r.dari, r.sampai + 1).map((_, j) => `<button type="button" data-no="${r.dari + j}">${r.dari + j + 1}</button>`).join('')}</div>
            </div>`).join('')}
          </div>
        </aside>
        <div class="cat__scrim" data-act="grid"></div>
      </div>
    </div>`;

    return {
      html,
      layout: 'focus',
      title: p.nama,
      mount(root) {
        const card = $('#qcard', root);
        const side = $('#cside', root);
        const nums = $$('.ngrid button', root);
        const timerEl = $('#timer', root);
        const akhir = sesi.akhir;
        let selesai = false, tick = null, tSoal = Date.now();
        // Catat lama mengerjakan soal yang sedang tampil (dijumlahkan bila soal dibuka lagi)
        const catatWaktu = () => {
          const id = soal[i].id;
          sesi.waktu[id] = (sesi.waktu[id] || 0) + Math.round((Date.now() - tSoal) / 1000);
          tSoal = Date.now();
        };

        const statistik = () => {
          const dijawab = Object.keys(sesi.jawaban).length;
          const ragu = Object.keys(sesi.ragu).filter((k) => sesi.ragu[k]).length;
          $('#sJawab', root).textContent = dijawab;
          $('#sRagu', root).textContent = ragu;
          $('#sKosong', root).textContent = N - dijawab;
          $('#cProg', root).style.width = (dijawab / N) * 100 + '%';
          return { dijawab, ragu, kosong: N - dijawab };
        };

        const tandaiNomor = () => {
          nums.forEach((b) => {
            const id = soal[+b.dataset.no].id;
            b.className = (sesi.ragu[id] ? 'r' : sesi.jawaban[id] != null ? 'f' : '') + (+b.dataset.no === i ? ' c' : '');
            b.setAttribute('aria-current', String(+b.dataset.no === i));
          });
        };

        const render = (arah) => {
          const s = soal[i];
          card.innerHTML = `${kepalaSoal(s, i + 1, N)}<div class="${kelasOpsi(s)}" role="group" aria-label="Pilihan jawaban">${opsiHTML(sesi, s)}</div>`;
          const pil = sesi.jawaban[s.id];
          $$('.opt', card).forEach((b) => {
            const on = +b.dataset.oi === pil;
            b.classList.toggle('is-picked', on);
            b.setAttribute('aria-pressed', String(on));
          });
          card.classList.remove('q-enter', 'q-enter--back'); void card.offsetWidth;
          card.classList.add(arah < 0 ? 'q-enter--back' : 'q-enter');
          $('[data-act="prev"]', root).disabled = i === 0;
          const nx = $('[data-act="next"]', root);
          nx.querySelector('span').textContent = i === N - 1 ? 'Nomor terakhir' : 'Berikutnya';
          nx.disabled = i === N - 1;
          const rg = $('[data-act="ragu"]', root);
          rg.setAttribute('aria-pressed', String(!!sesi.ragu[s.id]));
          tandaiNomor();
        };

        const ke = (j) => {
          if (j < 0 || j >= N || j === i) return;
          const arah = j > i ? 1 : -1;
          catatWaktu();
          i = j;
          simpan();
          render(arah);
          if (window.innerWidth < 1024) toggleSide(false);
          const top = card.getBoundingClientRect().top + window.scrollY - 120;
          if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
        };

        const pilih = (oi) => {
          const s = soal[i];
          sesi.jawaban[s.id] = oi;
          $$('.opt', card).forEach((b) => {
            const on = +b.dataset.oi === oi;
            b.classList.toggle('is-picked', on);
            b.setAttribute('aria-pressed', String(on));
            if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
          });
          tandaiNomor();
          statistik();
          simpan();
        };

        const toggleRagu = () => {
          const id = soal[i].id;
          sesi.ragu[id] = !sesi.ragu[id];
          if (!sesi.ragu[id]) delete sesi.ragu[id];
          $('[data-act="ragu"]', root).setAttribute('aria-pressed', String(!!sesi.ragu[id]));
          tandaiNomor();
          statistik();
          simpan();
        };

        const toggleSide = (paksa) => {
          const open = paksa != null ? paksa : !root.querySelector('.cat').classList.contains('side-open');
          root.querySelector('.cat').classList.toggle('side-open', open);
          $('.cat__gridbtn', root).setAttribute('aria-expanded', String(open));
        };

        const kumpulkan = (otomatis) => {
          if (selesai) return;
          selesai = true;
          clearInterval(tick);
          catatWaktu();
          selesaikan(sesi);
          if (otomatis) UI.toast(`${ic('timer')}<span>Waktu habis — jawaban dikumpulkan otomatis.</span>`);
          App.go('#/hasil');
        };

        const konfirmasi = async () => {
          const st = statistik();
          const ok = await UI.modal({
            judul: 'Kumpulkan jawaban?',
            isi: `<div class="sum3"><div><b>${st.dijawab}</b><span>dijawab</span></div><div><b>${st.ragu}</b><span>ragu-ragu</span></div><div><b>${st.kosong}</b><span>kosong</span></div></div>
              <p>${st.kosong ? 'Masih ada soal kosong. Ingat, soal TKP tidak pernah bernilai nol, jadi lebih baik dijawab. ' : ''}Setelah dikumpulkan, jawaban tidak bisa diubah.</p>`,
            ok: 'Kumpulkan', batal: 'Periksa lagi', nada: 'ink',
          });
          if (ok) kumpulkan(false);
        };

        const perbaruiTimer = () => {
          const sisa = Math.max(0, Math.round((akhir - Date.now()) / 1000));
          timerEl.querySelector('span').textContent = jam(sisa);
          timerEl.classList.toggle('is-warn', sisa <= 300);
          timerEl.classList.toggle('is-crit', sisa <= 60);
          if (sisa <= 0) kumpulkan(true);
        };

        root.addEventListener('click', (e) => {
          const o = e.target.closest('.opt');
          if (o) { pilih(+o.dataset.oi); return; }
          const n = e.target.closest('[data-no]');
          if (n) { ke(+n.dataset.no); return; }
          const a = e.target.closest('[data-act]');
          if (!a) return;
          const act = a.dataset.act;
          if (act === 'prev') ke(i - 1);
          else if (act === 'next') ke(i + 1);
          else if (act === 'ragu') toggleRagu();
          else if (act === 'grid') toggleSide();
          else if (act === 'selesai') konfirmasi();
        });

        const onKey = (e) => {
          if (sedangMengetik(e) || document.querySelector('.modal')) return;
          const k = tombolKeOpsi(e);
          const s = soal[i];
          if (e.key === 'ArrowRight') { e.preventDefault(); ke(i + 1); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); ke(i - 1); }
          else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleRagu(); }
          else if (k >= 0 && k < s.opsi.length) { e.preventDefault(); pilih(urutanOpsi(sesi, s)[k]); }
        };
        // Simpan lama mengerjakan soal yang sedang tampil saat halaman disembunyikan/ditutup
        const onHide = () => { if (!selesai && document.visibilityState === 'hidden') { catatWaktu(); simpan(); } };

        document.addEventListener('keydown', onKey);
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onHide);
        tick = setInterval(perbaruiTimer, 1000);
        render(1);
        statistik();
        perbaruiTimer();
        if (dilanjutkan && !selesai) UI.toast(`${ic('play')}<span>Simulasi dilanjutkan — sisa waktu tetap berjalan sejak dimulai.</span>`);

        return {
          cleanup() {
            clearInterval(tick);
            if (!selesai) { catatWaktu(); simpan(); }
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onHide);
          },
          guard() {
            if (selesai) return Promise.resolve(true);
            return UI.modal({
              judul: 'Tinggalkan simulasi?',
              isi: '<p>Jawabanmu <b>tersimpan</b> dan simulasi bisa dilanjutkan dari halaman Simulasi, tetapi <b>waktu tetap berjalan</b> seperti ujian sungguhan. Untuk mengakhiri dan melihat skor, gunakan tombol <b>Selesai</b>.</p>',
              ok: 'Tinggalkan', batal: 'Lanjutkan simulasi', nada: 'ink',
            });
          },
        };
      },
    };
  };

  /* ======================================================================
     HASIL & PEMBAHASAN
     ====================================================================== */
  Quiz.hasil = function ({ q } = {}) {
    const idMinta = q && q.get('id');
    const sesi = idMinta ? Store.arsipSesi(idMinta) : Store.d.sesi;
    if (idMinta && !sesi) {
      return {
        title: 'Hasil',
        html: `<section class="container nf"><span class="nf__code">${ic('history')}</span><h1>Pembahasan sesi ini sudah tidak tersimpan.</h1><p>Skor dan statistiknya tetap tercatat di laporan. Pembahasan lengkap disimpan untuk ${30} sesi terakhir.</p><a class="btn btn--ink" href="#/progres">${ic('arrowLeft')} Kembali ke Progres</a></section>`,
      };
    }
    if (!sesi || !sesi.soalIds) {
      return {
        title: 'Hasil',
        html: `<section class="container nf"><span class="nf__code">${ic('bars')}</span><h1>Belum ada hasil.</h1><p>Kerjakan satu latihan atau simulasi, lalu hasil dan pembahasannya akan muncul di sini.</p><a class="btn btn--sun" href="#/latihan">Mulai latihan ${ic('arrowRight', 'i-arrow')}</a></section>`,
      };
    }
    const H = hitung(sesi);
    const sim = sesi.jenis === 'simulasi';
    const src = sesi.sumber || {};
    const adaTkp = H.rows.some((r) => r.s.tkp);
    const kurang = H.rows.filter((r) => r.status !== 'benar');

    // Pesan utama
    let judulPesan, subPesan;
    if (sim) {
      const gagal = Object.keys(H.per).filter((k) => H.per[k].skor < H.per[k].pg).map((k) => (data.kat(k) || {}).kode || k);
      judulPesan = H.lulus ? 'Selamat, semua subtes memenuhi passing grade.' : 'Belum memenuhi passing grade.';
      subPesan = H.lulus
        ? 'Pertahankan dengan simulasi rutin dan perkuat subtes yang skornya paling tipis di atas ambang batas.'
        : `Subtes <b>${gagal.join(', ')}</b> masih di bawah ambang batas. Fokuskan latihan di sana, lalu coba lagi.`;
    } else if (H.persen >= 80) {
      judulPesan = 'Mantap, topik ini sudah kamu kuasai.';
      subPesan = 'Lanjutkan ke materi berikutnya atau uji diri dengan simulasi.';
    } else if (H.persen >= 60) {
      judulPesan = 'Sudah bagus, tinggal sedikit lagi.';
      subPesan = 'Pelajari pembahasan soal yang belum tepat, lalu ulangi bagian itu.';
    } else {
      judulPesan = 'Masih ada yang perlu diperkuat.';
      subPesan = 'Baca ulang rangkuman dan cara cepatnya, lalu kerjakan ulang soal yang salah.';
    }

    // Rekomendasi materi lemah
    const perMateri = {};
    H.rows.forEach((r) => {
      const m = r.s.materi;
      perMateri[m] = perMateri[m] || { n: 0, ok: 0 };
      perMateri[m].n++;
      if (r.status === 'benar') perMateri[m].ok++;
    });
    const lemah = Object.keys(perMateri)
      .map((id) => ({ m: data.materi(id), akurasi: perMateri[id].ok / perMateri[id].n, n: perMateri[id].n }))
      .filter((x) => x.m && x.akurasi < 0.7)
      .sort((a, b) => a.akurasi - b.akurasi)
      .slice(0, 3);

    const w = (src.waktu ? '&waktu=' + src.waktu : '') + (src.tingkat ? '&tingkat=' + src.tingkat : '');
    const simQ = [src.khusus ? 'khusus=1' : '', src.tingkat ? 'tingkat=' + src.tingkat : ''].filter(Boolean).join('&');
    const ulangHref = src.tipe === 'materi' ? `#/latihan/m/${src.id}?n=${src.n || 10}${w}`
      : src.tipe === 'kategori' ? `#/latihan/k/${src.id}?n=${src.n || 10}${w}`
      : src.tipe === 'simulasi' ? `#/simulasi/${src.id}${simQ ? '?' + simQ : ''}` : '#/latihan/ulang';

    // Waktu per soal
    const waktu = sesi.waktu || {};
    const tercatat = H.rows.filter((r) => waktu[r.s.id] > 0 && r.status !== 'kosong');
    const rataWaktu = tercatat.length ? Math.round(tercatat.reduce((a, r) => a + waktu[r.s.id], 0) / tercatat.length) : null;
    const lambat = tercatat.filter((r) => waktu[r.s.id] > 55).length;
    const balik = src.tipe === 'materi' ? { h: `#/materi/${src.id}`, t: 'Kembali ke materi' }
      : sim ? { h: '#/simulasi', t: 'Pilihan simulasi' } : { h: '#/latihan', t: 'Daftar latihan' };

    const ringCls = sim ? (H.lulus ? 'ring--ok' : 'ring--bad') : H.persen >= 80 ? 'ring--ok' : H.persen >= 60 ? 'ring--mid' : 'ring--bad';

    // Bandingkan dengan percobaan sebelumnya pada topik/simulasi yang sama
    const samaSumber = (r) => r.sumber && src.tipe && r.sumber.tipe === src.tipe && r.sumber.id === src.id && (r.sumber.tingkat || '') === (src.tingkat || '');
    const sebelumnya = Store.d.riwayat.find((r) => r.id !== sesi.id && r.waktu < (sesi.selesai || Date.now()) && samaSumber(r));
    const selisih = sebelumnya ? H.persen - sebelumnya.persen : null;
    const banding = selisih == null ? ''
      : `<p class="delta ${selisih > 0 ? 'delta--up' : selisih < 0 ? 'delta--down' : ''}">${ic(selisih >= 0 ? 'trend' : 'minusCircle')}<span>${selisih > 0 ? `Naik <b>${selisih} poin</b>` : selisih < 0 ? `Turun <b>${-selisih} poin</b>` : '<b>Sama</b>'} dibanding percobaan sebelumnya (${sebelumnya.persen}%).</span></p>`;

    const kategoriUrut = C.kategori.map((k) => k.id).filter((k) => H.per[k]);
    const bar = (k) => {
      const p = H.per[k], kk = data.kat(k) || { kode: k };
      const w = (p.skor / p.maks) * 100;
      const pgPos = p.pg != null ? Math.min(100, (p.pg / p.maks) * 100) : null;
      const ok = p.pg != null ? p.skor >= p.pg : null;
      return `<div class="cbar ${ok === false ? 'is-bad' : ok ? 'is-ok' : ''}">
        <div class="cbar__top">${UI.tag(k)}<span class="cbar__name">${esc(kk.nama || '')}</span><b>${p.skor}</b><small>/ ${p.maks}</small>
          ${ok == null ? '' : `<span class="pill ${ok ? 'pill--ok' : 'pill--bad'}">${ok ? 'Lulus' : 'Belum'}</span>`}</div>
        <div class="cbar__track"><i style="--w:${w.toFixed(1)}%"></i>${pgPos != null ? `<span class="cbar__pg" style="left:${pgPos.toFixed(1)}%"><em>PG ${p.pg}</em></span>` : ''}</div>
        <div class="cbar__foot"><span>${p.benar} ${adaTkp && k === 'tkp' ? 'optimal' : 'benar'}</span><span>${p.salah} ${k === 'tkp' ? 'belum optimal' : 'salah'}</span><span>${p.kosong} kosong</span></div>
      </div>`;
    };

    const itemReview = (r) => {
      const s = r.s;
      const ikon = r.status === 'benar' ? 'check' : r.status === 'salah' ? (s.tkp && r.skor >= 3 ? 'minusCircle' : 'x') : 'minusCircle';
      const kunciHuruf = hurufTampil(sesi, s, s.kunci);
      const t = waktu[s.id] || 0;
      const opts = urutanOpsi(sesi, s).map((oi, p) => {
        const isKey = oi === s.kunci, isPick = oi === r.pilih;
        const cls = isKey ? 'is-correct' : isPick ? (s.tkp && s.skor[oi] >= 3 ? 'is-picked' : 'is-wrong') : '';
        return `<li class="${cls}">
          <span class="opt__key">${HURUF[p]}</span>
          <span class="opt__text">${UI.teksOpsi(s.opsi[oi])}</span>
          <span class="rv__badges">${isPick ? '<em class="b-you">Jawabanmu</em>' : ''}${isKey ? `<em class="b-key">${s.tkp ? 'Terbaik' : 'Kunci'}</em>` : ''}${s.tkp ? `<em class="b-pts s${s.skor[oi]}">+${s.skor[oi]}</em>` : ''}</span>
        </li>`;
      }).join('');
      return `<li class="rv rv--${r.status}${s.tkp && r.status === 'salah' && r.skor >= 3 ? ' rv--mid' : ''}" data-st="${r.status}" data-ragu="${r.ragu ? 1 : 0}">
        <button class="rv__head" aria-expanded="false">
          <span class="rv__no">${r.no}</span>
          <span class="rv__ic">${ic(ikon)}</span>
          <span class="rv__q">${UI.tag(s.kategori)}<span>${esc(polos(s.soal).slice(0, 140))}${polos(s.soal).length > 140 ? '…' : ''}</span></span>
          ${r.ragu ? `<span class="rv__flag" title="Ditandai ragu-ragu">${ic('flag')}</span>` : ''}
          ${t ? `<span class="rv__time${t > 55 ? ' is-slow' : ''}" title="Lama mengerjakan">${t} dtk</span>` : ''}
          <span class="rv__pts">${r.skor}<small>/${r.maks}</small></span>
          <span class="rv__chev">${ic('chevDown')}</span>
        </button>
        <div class="rv__body"><div><div class="rv__inner">
          ${s.gambar ? `<figure class="q__fig"><img src="${esc(s.gambar)}" alt=""></figure>` : ''}
          <div class="q__text">${fmt(s.soal)}</div>
          ${UI.figur(s.figur)}
          <ul class="rv__opts${UI.opsiFigural(s) ? ' rv__opts--fig' : ''}">${opts}</ul>
          ${t > 55 ? `<p class="rv__slow">${ic('timer')}Dikerjakan ${waktuTeks(t)} — lebih lama dari ritme ujian (±55 detik per soal).</p>` : ''}
          <p class="rv__sum">${r.status === 'kosong' ? `Tidak dijawab. ${s.tkp ? 'Opsi terbaik' : 'Kunci jawaban'}: <b>${kunciHuruf}</b>.` : s.tkp ? `Kamu memilih <b>${hurufTampil(sesi, s, r.pilih)}</b> (skor ${r.skor}). Opsi terbaik: <b>${kunciHuruf}</b>.` : r.status === 'benar' ? `Jawabanmu <b>${kunciHuruf}</b> tepat.` : `Kamu memilih <b>${hurufTampil(sesi, s, r.pilih)}</b>, kunci jawaban <b>${kunciHuruf}</b>.`}</p>
          ${pembahasanHTML(s)}
          ${data.materi(s.materi) ? `<a class="link link--sm" href="#/materi/${esc(s.materi)}">Buka materi ${esc(data.materi(s.materi).judul)} ${ic('arrowRight', 'i-arrow')}</a>` : ''}
        </div></div></div>
      </li>`;
    };

    const nRagu = H.rows.filter((r) => r.ragu).length;
    const filter = [
      ['semua', 'Semua', H.rows.length],
      ['salah', adaTkp && !H.rows.some((r) => !r.s.tkp) ? 'Belum optimal' : 'Salah', H.salah],
      ['benar', adaTkp && !H.rows.some((r) => !r.s.tkp) ? 'Optimal' : 'Benar', H.benar],
      ['kosong', 'Kosong', H.kosong],
    ];
    if (nRagu) filter.push(['ragu', 'Ragu-ragu', nRagu]);

    const html = `
    <section class="page-head page-head--res">
      <div class="container">
        <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<a href="${sim ? '#/simulasi' : '#/latihan'}">${sim ? 'Simulasi' : 'Latihan'}</a>${ic('chevRight')}<span>Hasil</span></nav>
        <span class="kicker reveal">Hasil ${sim ? 'simulasi' : 'latihan'}</span>
        <h1 class="reveal" style="--d:1">${esc(sesi.judul)}</h1>
        <ul class="meta-row reveal" style="--d:2">
          <li>${ic('file')}${H.rows.length} soal</li>
          <li>${ic('clock')}${durasiTeks(sesi.durasi || 0)}${sesi.batas ? ` dari ${Math.round(sesi.batas / 60)} menit` : ''}</li>
          ${rataWaktu != null ? `<li>${ic('timer')}rata-rata ${rataWaktu} dtk/soal${lambat ? ` · ${lambat} soal di atas 55 dtk` : ''}</li>` : ''}
          <li>${ic('history')}${tanggal(sesi.selesai || Date.now())}</li>
        </ul>
      </div>
    </section>
    <section class="container res">
      <div class="res__grid">
        <div class="score-card reveal">
          <div class="score-card__ring">
            ${UI.ring(H.persen, { size: 176, stroke: 12, cls: ringCls })}
            <div class="score-card__val"><b data-count="${H.skor}">0</b><span>dari ${H.maks}</span></div>
          </div>
          <div class="score-card__msg">
            <h2>${judulPesan}</h2>
            <p>${subPesan}</p>
            ${banding}
          </div>
          ${sim ? `<div class="stamp ${H.lulus ? 'stamp--ok' : 'stamp--bad'}" aria-hidden="true"><span>${H.lulus ? 'Memenuhi' : 'Belum memenuhi'}</span><b>Passing Grade</b></div>` : ''}
        </div>
        <div class="res__side">
          <div class="stat-grid reveal" style="--d:1">
            <div class="stat stat--ok">${ic('checkCircle')}<b data-count="${H.benar}">0</b><span>${adaTkp && !H.rows.some((r) => !r.s.tkp) ? 'Optimal' : 'Benar'}</span></div>
            <div class="stat stat--bad">${ic('xCircle')}<b data-count="${H.salah}">0</b><span>${adaTkp && !H.rows.some((r) => !r.s.tkp) ? 'Belum optimal' : 'Salah'}</span></div>
            <div class="stat">${ic('minusCircle')}<b data-count="${H.kosong}">0</b><span>Kosong</span></div>
            <div class="stat">${ic('target')}<b><span data-count="${H.persen}">0</span>%</b><span>Persentase skor</span></div>
          </div>
          <div class="cbars reveal" style="--d:2">
            <h3>Nilai per subtes</h3>
            ${kategoriUrut.map(bar).join('')}
          </div>
        </div>
      </div>

      ${lemah.length ? `<div class="focus-next reveal">
        <div><span class="kicker">Fokus berikutnya</span><h3>Materi yang perlu diperkuat</h3></div>
        <div class="focus-next__list">${lemah.map((x) => `<a href="#/materi/${esc(x.m.id)}">${UI.tag(x.m.kategori)}<span><b>${esc(x.m.judul)}</b><small>${Math.round(x.akurasi * 100)}% tepat dari ${x.n} soal</small></span>${ic('arrowRight')}</a>`).join('')}</div>
      </div>` : ''}

      <div class="res__actions reveal">
        ${kurang.length ? `<button class="btn btn--sun" data-act="ulang-salah">${ic('rotate')}Ulangi yang ${H.rows.every((r) => r.s.tkp) ? 'belum optimal' : 'salah'} (${kurang.length})</button>` : ''}
        <a class="btn btn--ink" href="${ulangHref}">${sim ? 'Simulasi lagi' : 'Kerjakan ulang'}</a>
        <a class="btn btn--ghost" href="${balik.h}">${esc(balik.t)}</a>
        <a class="btn btn--ghost" href="#/progres">${ic('trend')}Laporan progres</a>
      </div>

      <div class="review">
        <header class="review__head reveal">
          <div><h2>Pembahasan</h2><p>Ketuk nomor soal untuk melihat pilihanmu, kunci jawaban, dan penjelasannya.</p></div>
          <div class="chips" role="tablist" aria-label="Filter pembahasan">
            ${filter.map(([k, l, n], j) => `<button role="tab" class="chip" data-f="${k}" aria-selected="${j === 0}">${l}<span>${n}</span></button>`).join('')}
          </div>
        </header>
        <ol class="rv-list">${H.rows.map(itemReview).join('')}</ol>
        <p class="empty empty--sm" id="rvEmpty" hidden>Tidak ada soal pada filter ini.</p>
      </div>
    </section>`;

    return {
      html,
      title: 'Hasil · ' + sesi.judul,
      mount(root) {
        root.addEventListener('click', (e) => {
          const h = e.target.closest('.rv__head');
          if (h) {
            const li = h.parentElement;
            const open = !li.classList.contains('is-open');
            li.classList.toggle('is-open', open);
            h.setAttribute('aria-expanded', String(open));
            return;
          }
          const f = e.target.closest('[data-f]');
          if (f) {
            const v = f.dataset.f;
            $$('[data-f]', root).forEach((c) => c.setAttribute('aria-selected', String(c === f)));
            let tampil = 0;
            $$('.rv', root).forEach((li) => {
              const ok = v === 'semua' || (v === 'ragu' ? li.dataset.ragu === '1' : li.dataset.st === v);
              li.hidden = !ok;
              if (ok) tampil++;
            });
            $('#rvEmpty', root).hidden = tampil > 0;
            return;
          }
          if (e.target.closest('[data-act="ulang-salah"]')) {
            Store.d.ulang = { ids: kurang.map((r) => r.s.id), judul: sesi.judul };
            Store.save();
            App.go('#/latihan/ulang');
          }
        });
        // Buka otomatis soal salah pertama agar pembahasan langsung terlihat
        const pertama = $('.rv--salah .rv__head', root) || $('.rv--kosong .rv__head', root);
        pertama && pertama.click();
      },
    };
  };
})();
