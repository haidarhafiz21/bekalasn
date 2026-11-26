/* ==========================================================================
   BekalASN — Progres belajar: laporan peningkatan, riwayat lengkap,
   cadangan (ekspor/pulihkan) untuk pindah HP atau setelah data browser terhapus.
   ========================================================================== */
(function () {
  'use strict';
  if (!window.BA || window.BA.dibingkai) return; // dibuka di dalam iframe: aplikasi tidak dijalankan
  const { C, $, $$, esc, ic, data, Store, UI, App, tanggal, durasiTeks, angka } = BA;
  const Pages = BA.Pages;

  const HARI = 86400000;
  const hariKe = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const tglPendek = (t) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const rata = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const persen = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const tanda = (x) => (x > 0 ? '+' + x : String(x));
  const jamTeks = (detik) => {
    if (detik < 60) return `${Math.round(detik)} dtk`;
    const j = Math.floor(detik / 3600), m = Math.round((detik % 3600) / 60);
    return j ? `${j} jam ${m} mnt` : `${m} mnt`;
  };

  /* ---------- olah riwayat ---------- */
  function olah() {
    const semua = Store.d.riwayat.slice().sort((a, b) => a.waktu - b.waktu); // kronologis
    const rinci = semua.filter((r) => r.n); // entri lama (sebelum pembaruan) tidak punya rincian
    const soalDikerjakan = rinci.reduce((a, r) => a + r.n, 0);
    const benar = rinci.reduce((a, r) => a + r.benar, 0);
    const detik = semua.reduce((a, r) => a + (r.durasi || 0), 0);

    // Hari aktif & streak
    const hari = [...new Set(semua.map((r) => hariKe(r.waktu)))].sort((a, b) => a - b);
    const setHari = new Set(hari);
    let streak = 0;
    let h = hariKe(Date.now());
    if (!setHari.has(h)) h -= HARI; // streak tetap dihitung jika belum belajar hari ini
    while (setHari.has(h)) { streak++; h -= HARI; }
    let terpanjang = 0, jalan = 0, prev = null;
    hari.forEach((x) => { jalan = prev != null && x - prev === HARI ? jalan + 1 : 1; terpanjang = Math.max(terpanjang, jalan); prev = x; });

    // Peningkatan keseluruhan: rata-rata 3 sesi pertama vs 3 sesi terakhir
    const k = Math.min(3, Math.floor(semua.length / 2));
    const awal = k ? Math.round(rata(semua.slice(0, k).map((r) => r.persen))) : null;
    const akhir = k ? Math.round(rata(semua.slice(-k).map((r) => r.persen))) : null;

    // Per subtes: akurasi skor pada sesi-sesi awal vs terbaru
    const perKat = C.kategori.map((kt) => {
      const xs = rinci.filter((r) => r.per && r.per[kt.id]);
      const ag = (list) => { const s = list.reduce((a, r) => a + r.per[kt.id].skor, 0), m = list.reduce((a, r) => a + r.per[kt.id].maks, 0); return m ? Math.round((s / m) * 100) : null; };
      const kk = Math.min(3, Math.floor(xs.length / 2));
      return {
        kt, n: xs.length, soal: xs.reduce((a, r) => a + r.per[kt.id].n, 0),
        total: ag(xs), awal: kk ? ag(xs.slice(0, kk)) : null, akhir: kk ? ag(xs.slice(-kk)) : null,
      };
    });

    // Per materi & per tingkat
    const mat = {}, tgk = { mudah: [0, 0], sedang: [0, 0], sulit: [0, 0] };
    rinci.forEach((r) => {
      Object.keys(r.materi || {}).forEach((id) => {
        const [b, n] = r.materi[id];
        const x = (mat[id] = mat[id] || { b: 0, n: 0, sesi: [] });
        x.b += b; x.n += n; x.sesi.push(persen(b, n));
      });
      Object.keys(r.tingkat || {}).forEach((t) => { if (tgk[t]) { tgk[t][0] += r.tingkat[t][0]; tgk[t][1] += r.tingkat[t][1]; } });
    });

    const simulasi = semua.filter((r) => r.jenis === 'simulasi');
    return { semua, rinci, soalDikerjakan, benar, detik, hari, streak, terpanjang, awal, akhir, perKat, mat, tgk, simulasi };
  }

  /* ---------- grafik tren (satu seri, tanpa legenda) ---------- */
  function grafikTren(list) {
    const pts = list.slice(-30);
    if (pts.length < 2) return `<p class="muted chart__empty">Grafik muncul setelah minimal 2 sesi.</p>`;
    // Layar sempit: kanvas lebih kecil agar teks sumbu tetap terbaca (tidak ikut diperkecil)
    const sempit = window.innerWidth < 600;
    const W = sempit ? 340 : 640, H = sempit ? 200 : 220, L = 30, R = 10, T = 14, B = 26;
    const iw = W - L - R, ih = H - T - B;
    const x = (i) => L + (pts.length === 1 ? iw / 2 : (i * iw) / (pts.length - 1));
    const y = (p) => T + ih - (p / 100) * ih;
    const d = pts.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.persen).toFixed(1)}`).join(' ');
    const area = `${d} L${x(pts.length - 1).toFixed(1)},${(T + ih).toFixed(1)} L${x(0).toFixed(1)},${(T + ih).toFixed(1)} Z`;
    const grid = [0, 25, 50, 75, 100].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" class="chart__grid"/><text x="${L - 8}" y="${y(g) + 4}" class="chart__ax" text-anchor="end">${g}</text>`).join('');
    const lbl = [0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i)
      .map((i) => `<text x="${x(i)}" y="${H - 8}" class="chart__ax" text-anchor="${i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${tglPendek(pts[i].waktu)}</text>`).join('');
    const lebarHit = iw / Math.max(1, pts.length - 1);
    const titik = pts.map((r, i) => `<g class="chart__pt" data-i="${i}" tabindex="0" role="img" aria-label="${esc(r.judul)}, ${tanggal(r.waktu)}: ${r.persen}%">
        <rect x="${(x(i) - lebarHit / 2).toFixed(1)}" y="${T}" width="${lebarHit.toFixed(1)}" height="${ih}" class="chart__hit"/>
        <line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${T + ih}" class="chart__cross"/>
        <circle cx="${x(i).toFixed(1)}" cy="${y(r.persen).toFixed(1)}" r="4.5" class="chart__dot ${r.jenis === 'simulasi' ? 'is-sim' : ''}"/>
      </g>`).join('');
    return `<div class="chart${sempit ? ' chart--sempit' : ''}" data-pts='${esc(JSON.stringify(pts.map((r) => ({ j: r.judul, t: r.waktu, p: r.persen, s: r.jenis === 'simulasi' }))))}'>
      <svg viewBox="0 0 ${W} ${H}" class="chart__svg" role="group" aria-label="Skor ${pts.length} sesi terakhir dalam persen">
        ${grid}
        <path d="${area}" class="chart__area"/>
        <path d="${d}" class="chart__line"/>
        ${titik}
        ${lbl}
      </svg>
      <div class="chart__tip" hidden></div>
    </div>`;
  }

  function pasangTooltip(root) {
    $$('.chart', root).forEach((ch) => {
      let pts = [];
      try { pts = JSON.parse(ch.dataset.pts); } catch (e) { return; }
      const tip = $('.chart__tip', ch);
      const tampil = (g) => {
        const p = pts[+g.dataset.i];
        if (!p) return;
        $$('.chart__pt', ch).forEach((x) => x.classList.toggle('is-on', x === g));
        tip.innerHTML = `<b>${p.p}%</b><span>${esc(p.j)}</span><small>${p.s ? 'Simulasi' : 'Latihan'} · ${tanggal(p.t)}</small>`;
        tip.hidden = false;
        const dot = g.querySelector('circle').getBoundingClientRect();
        const box = ch.getBoundingClientRect();
        const lx = dot.left - box.left + dot.width / 2;
        tip.style.left = Math.min(Math.max(lx, 90), box.width - 90) + 'px';
        tip.style.top = Math.max(0, dot.top - box.top - 12) + 'px';
      };
      const sembunyi = () => { tip.hidden = true; $$('.chart__pt', ch).forEach((x) => x.classList.remove('is-on')); };
      $$('.chart__pt', ch).forEach((g) => {
        g.addEventListener('pointerenter', () => tampil(g));
        g.addEventListener('focus', () => tampil(g));
        g.addEventListener('click', () => tampil(g));
      });
      ch.addEventListener('pointerleave', sembunyi);
      ch.addEventListener('focusout', (e) => { if (!ch.contains(e.relatedTarget)) sembunyi(); });
    });
  }

  /* ---------- kalender aktivitas 12 minggu ---------- */
  function kalender(semua) {
    const perHari = {};
    semua.forEach((r) => { const k = hariKe(r.waktu); perHari[k] = (perHari[k] || 0) + (r.n || 1); });
    const hariIni = hariKe(Date.now());
    const dow = (new Date(hariIni).getDay() + 6) % 7; // Senin = 0
    const mulai = hariIni - (dow + 7 * 11) * HARI;
    const sel = [];
    for (let t = mulai; t <= hariIni; t += HARI) {
      const n = perHari[hariKe(t)] || 0;
      const lv = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4;
      sel.push(`<i class="cal__c l${lv}" title="${new Date(t).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}: ${n ? n + ' soal' : 'tidak ada latihan'}"></i>`);
    }
    return `<div class="cal" aria-label="Aktivitas 12 minggu terakhir">
      <div class="cal__days" aria-hidden="true"><span>Sen</span><span></span><span>Rab</span><span></span><span>Jum</span><span></span><span>Min</span></div>
      <div class="cal__grid">${sel.join('')}</div>
    </div>
    <div class="cal__legend" aria-hidden="true"><span>Sedikit</span><i class="cal__c l0"></i><i class="cal__c l1"></i><i class="cal__c l2"></i><i class="cal__c l3"></i><i class="cal__c l4"></i><span>Banyak</span></div>`;
  }

  /* ---------- baris riwayat ---------- */
  function barisRiwayat(r) {
    const arsip = !!Store.arsipSesi(r.id);
    const tg = r.sumber && r.sumber.tingkat ? `<span class="lvl lvl--${esc(r.sumber.tingkat)}">${esc(r.sumber.tingkat)}</span>` : '';
    const nilaiSim = r.jenis === 'simulasi' && r.per
      ? `<span class="hrow__per">${C.kategori.filter((k) => r.per[k.id]).map((k) => `${esc(k.kode)} ${r.per[k.id].skor}`).join(' · ')}</span>` : '';
    return `<li class="hrow" data-jenis="${esc(r.jenis)}">
      <span class="hist__score ${r.jenis === 'simulasi' ? (r.lulus ? 'is-ok' : '') : r.persen >= 70 ? 'is-ok' : ''}">${r.persen}%</span>
      <span class="hrow__main">
        <b>${esc(r.judul)}</b>${tg}
        <small>${r.jenis === 'simulasi' ? 'Simulasi' + (r.lulus == null ? '' : r.lulus ? ' · lulus PG' : ' · belum lulus PG') : 'Latihan'} · ${tanggal(r.waktu)}${r.n ? ` · ${r.benar}/${r.n} tepat` : ''}${r.durasi ? ' · ' + durasiTeks(r.durasi) : ''}</small>
        ${nilaiSim}
      </span>
      ${arsip ? `<a class="btn btn--ghost btn--sm hrow__go" href="#/hasil?id=${esc(r.id)}">Pembahasan</a>` : ''}
    </li>`;
  }

  /* ---------- halaman ---------- */
  Pages.progres = function ({ q } = {}) {
    const D = olah();
    const kosong = !D.semua.length;
    const cad = Store.d.cadangan;
    const hariSejakCadangan = cad ? Math.floor((Date.now() - cad) / HARI) : null;
    const perluCadangan = !kosong && (cad == null || hariSejakCadangan >= 7);

    const selisih = D.awal != null ? D.akhir - D.awal : null;
    const pesanNaik = selisih == null ? 'Kerjakan minimal 2 sesi untuk melihat peningkatanmu.'
      : selisih > 0 ? `Rata-rata skormu naik <b>${selisih} poin</b>, dari ${D.awal}% di awal menjadi ${D.akhir}% di sesi terbaru.`
      : selisih < 0 ? `Rata-rata skor sesi terbaru turun <b>${-selisih} poin</b> (${D.awal}% → ${D.akhir}%). Wajar jika kamu sedang mencoba soal yang lebih sulit; ulangi pembahasannya.`
      : `Rata-rata skormu stabil di ${D.akhir}%. Coba naikkan tingkat kesulitan untuk tantangan baru.`;

    const materiList = C.materi.map((m) => ({ m, x: D.mat[m.id] })).filter((o) => o.x && o.x.n);
    const lemah = materiList.filter((o) => o.x.n >= 3).sort((a, b) => a.x.b / a.x.n - b.x.b / b.x.n).slice(0, 3).filter((o) => o.x.b / o.x.n < 0.75);
    const belum = C.materi.filter((m) => !D.mat[m.id]);

    const barMateri = (o) => {
      const p = persen(o.x.b, o.x.n);
      const s = o.x.sesi;
      const tren = s.length >= 2 ? s[s.length - 1] - s[s.length - 2] : null;
      return `<li class="mbar">
        <a href="#/materi/${esc(o.m.id)}" class="mbar__name">${UI.tag(o.m.kategori)}<span>${esc(o.m.judul)}</span></a>
        <span class="mbar__track"><i style="width:${p}%"></i></span>
        <span class="mbar__val"><b>${p}%</b><small>${o.x.b}/${o.x.n}</small></span>
        <span class="mbar__trend ${tren > 0 ? 'is-up' : tren < 0 ? 'is-down' : ''}" title="Dibanding percobaan sebelumnya">${tren == null ? '' : tren === 0 ? '±0' : tanda(tren)}</span>
      </li>`;
    };

    const html = `
    <section class="page-head">
      <div class="container">
        <nav class="crumbs reveal" aria-label="Remah roti"><a href="#/">Beranda</a>${ic('chevRight')}<span>Progres</span></nav>
        <h1 class="reveal" style="--d:1">Progres Belajar</h1>
        <p class="reveal" style="--d:2">Riwayat semua latihan dan simulasi, seberapa jauh skormu naik, dan topik yang masih perlu diperkuat. Data tersimpan di perangkat ini; simpan cadangan agar tidak hilang saat ganti HP.</p>
      </div>
    </section>
    <section class="container section--tight prog">
      ${UI.bannerAktif()}
      ${perluCadangan ? `<div class="nudge reveal">${ic('download')}<span>${cad == null ? 'Riwayatmu belum pernah dicadangkan.' : `Cadangan terakhir ${hariSejakCadangan} hari lalu.`} Simpan cadangan supaya progres tidak hilang jika HP diganti atau data browser terhapus.</span><button class="btn btn--sun btn--sm" data-act="ekspor">Simpan cadangan</button></div>` : ''}

      ${kosong ? `<div class="empty-state reveal">
        <span class="nf__code">${ic('trend')}</span>
        <h2>Belum ada riwayat belajar</h2>
        <p>Kerjakan satu latihan atau simulasi. Skor, waktu, dan topik yang kamu kerjakan akan tercatat di sini. Punya file cadangan dari HP lain? Pulihkan di bagian bawah.</p>
        <a class="btn btn--sun" href="#/latihan">Mulai latihan ${ic('arrowRight', 'i-arrow')}</a>
      </div>` : `
      <div class="stat-grid stat-grid--prog reveal">
        <div class="stat">${ic('layers')}<b data-count="${D.semua.length}">0</b><span>sesi selesai</span></div>
        <div class="stat">${ic('file')}<b data-count="${D.soalDikerjakan}">0</b><span>soal dikerjakan</span></div>
        <div class="stat">${ic('target')}<b><span data-count="${persen(D.benar, D.soalDikerjakan)}">0</span>%</b><span>jawaban tepat</span></div>
        <div class="stat">${ic('clock')}<b class="stat__txt">${jamTeks(D.detik)}</b><span>waktu belajar</span></div>
      </div>

      <div class="prog__grid">
        <article class="pcard pcard--wide reveal">
          <header class="pcard__head">
            <div><span class="kicker">Peningkatan</span><h2>${selisih == null ? 'Mulai catat kemajuanmu' : selisih > 0 ? `Naik ${selisih} poin` : selisih < 0 ? `Turun ${-selisih} poin` : 'Stabil'}</h2><p>${pesanNaik}</p></div>
          </header>
          <div class="pkat">${D.perKat.map((p) => `<div class="pkat__item">
            <div class="pkat__top">${UI.tag(p.kt.id)}<small>${p.soal} soal</small></div>
            ${p.total == null ? '<p class="muted">Belum dikerjakan</p>' : `<b>${p.akhir != null ? p.akhir : p.total}%</b>
            <p>${p.awal != null ? `<span class="${p.akhir - p.awal > 0 ? 'up' : p.akhir - p.awal < 0 ? 'down' : ''}">${tanda(p.akhir - p.awal)} poin</span> dari ${p.awal}%` : 'Skor rata-rata'}</p>`}
          </div>`).join('')}</div>
          <h3 class="pcard__sub">Skor ${Math.min(30, D.semua.length)} sesi terakhir (%)</h3>
          ${grafikTren(D.semua)}
          <p class="chart__key"><span><i class="k-lat"></i>Latihan</span><span><i class="k-sim"></i>Simulasi</span></p>
        </article>

        <article class="pcard reveal">
          <header class="pcard__head"><div><span class="kicker">Konsistensi</span><h2>${D.streak ? `${D.streak} hari beruntun` : 'Ayo mulai lagi'}</h2><p>${D.hari.length} hari belajar · rekor ${D.terpanjang} hari beruntun.</p></div></header>
          ${kalender(D.semua)}
        </article>

        <article class="pcard reveal">
          <header class="pcard__head"><div><span class="kicker">Tingkat kesulitan</span><h2>Ketepatan per tingkat</h2><p>Jika tingkat mudah sudah di atas 80%, naikkan ke tingkat berikutnya.</p></div></header>
          <ul class="tbar">${['mudah', 'sedang', 'sulit'].map((t) => {
            const [b, n] = D.tgk[t];
            return `<li><span class="lvl lvl--${t}">${t}</span><span class="mbar__track"><i style="width:${persen(b, n)}%"></i></span><span class="mbar__val"><b>${n ? persen(b, n) + '%' : '–'}</b><small>${b}/${n}</small></span></li>`;
          }).join('')}</ul>
          <a class="link link--sm" href="#/latihan">Atur tingkat soal di halaman Latihan ${ic('arrowRight', 'i-arrow')}</a>
        </article>

        ${D.simulasi.length ? `<article class="pcard pcard--wide reveal">
          <header class="pcard__head"><div><span class="kicker">Simulasi</span><h2>${D.simulasi.filter((r) => r.lulus).length} dari ${D.simulasi.length} simulasi lulus passing grade</h2><p>Nilai per subtes pada simulasi terakhir dibanding simulasi pertama.</p></div></header>
          <div class="table-wrap"><table class="simtab">
            <thead><tr><th>Tanggal</th><th>Simulasi</th>${C.kategori.map((k) => `<th>${esc(k.kode)}</th>`).join('')}<th>Total</th><th>Status</th></tr></thead>
            <tbody>${D.simulasi.slice(-8).reverse().map((r) => `<tr>
              <td>${tglPendek(r.waktu)}</td><td>${esc(r.judul)}</td>
              ${C.kategori.map((k) => `<td>${r.per && r.per[k.id] ? `${r.per[k.id].skor}<small>/${r.per[k.id].maks}</small>` : '–'}</td>`).join('')}
              <td><b>${r.skor}</b><small>/${r.maks}</small></td>
              <td>${r.lulus == null ? '–' : `<span class="pill ${r.lulus ? 'pill--ok' : 'pill--bad'}">${r.lulus ? 'Lulus' : 'Belum'}</span>`}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </article>` : ''}

        <article class="pcard pcard--wide reveal">
          <header class="pcard__head"><div><span class="kicker">Per materi</span><h2>Penguasaan tiap topik</h2><p>Persentase jawaban tepat dari semua sesi. Angka di kanan menunjukkan perubahan dibanding percobaan sebelumnya.</p></div></header>
          ${lemah.length ? `<div class="focus-next focus-next--in"><div><span class="kicker">Perlu diperkuat</span></div><div class="focus-next__list">${lemah.map((o) => `<a href="#/materi/${esc(o.m.id)}">${UI.tag(o.m.kategori)}<span><b>${esc(o.m.judul)}</b><small>${persen(o.x.b, o.x.n)}% tepat dari ${o.x.n} soal</small></span>${ic('arrowRight')}</a>`).join('')}</div></div>` : ''}
          ${materiList.length ? `<ul class="mbars">${materiList.map(barMateri).join('')}</ul>` : '<p class="muted">Rincian per materi tersedia untuk latihan yang dikerjakan setelah pembaruan ini.</p>'}
          ${belum.length ? `<p class="muted prog__belum">Belum pernah dilatih: ${belum.map((m) => `<a href="#/materi/${esc(m.id)}?tab=latihan">${esc(m.judul)}</a>`).join(', ')}.</p>` : ''}
        </article>
      </div>

      <div class="hlist reveal" id="riwayat">
        <header class="review__head">
          <div><h2>Riwayat lengkap</h2><p>${D.semua.length} sesi tercatat.${Store.d.arsip.length ? ` Pembahasan lengkap bisa dibuka lagi untuk ${Math.min(30, Store.d.arsip.length)} sesi terakhir.` : ''}</p></div>
          <div class="chips" role="tablist" aria-label="Filter riwayat">
            <button role="tab" class="chip" data-hf="semua" aria-selected="true">Semua<span>${D.semua.length}</span></button>
            <button role="tab" class="chip" data-hf="latihan" aria-selected="false">Latihan<span>${D.semua.length - D.simulasi.length}</span></button>
            <button role="tab" class="chip" data-hf="simulasi" aria-selected="false">Simulasi<span>${D.simulasi.length}</span></button>
          </div>
        </header>
        <ul class="hlist__ul" id="hUl"></ul>
        <button class="btn btn--ghost btn--block" id="hMore" hidden>Tampilkan lebih banyak</button>
      </div>`}

      <div class="backup reveal" id="cadangan">
        <div class="backup__copy">
          <span class="kicker">Cadangan & pindah perangkat</span>
          <h2>Riwayat aman walau ganti HP</h2>
          <p>Progres tersimpan di browser perangkat ini, bukan di server. Simpan cadangan, lalu kirim filenya ke WhatsApp, Google Drive, atau email sendiri. Di HP atau laptop lain yang sudah aktif, tekan <b>Pulihkan</b> dan pilih file tersebut; riwayat akan digabung tanpa menghapus yang sudah ada.</p>
          <p class="muted backup__last">${cad ? `Cadangan terakhir: ${tanggal(cad)}` : 'Belum pernah membuat cadangan.'}</p>
        </div>
        <div class="backup__act">
          <button class="btn btn--sun" data-act="ekspor" ${kosong ? 'disabled' : ''}>${ic('download')}Simpan cadangan</button>
          <label class="btn btn--ink backup__file">${ic('upload')}Pulihkan dari cadangan<input type="file" id="fImpor" accept=".json,application/json"></label>
          ${kosong ? '' : `<button class="btn btn--ghost" data-act="cetak">${ic('file')}Cetak / simpan PDF laporan</button>`}
          <small class="muted">File cadangan tidak berisi kunci lisensi. Perangkat baru tetap perlu diaktifkan dengan kuncinya sendiri.</small>
        </div>
      </div>
    </section>`;

    return {
      html,
      title: 'Progres Belajar',
      mount(root) {
        UI.pasangBannerAktif(root);
        pasangTooltip(root);
        const ke = q && /^[a-z]+$/.test(q.get('ke') || '') ? $('#' + q.get('ke'), root) : null;
        if (ke) setTimeout(() => ke.scrollIntoView({ block: 'start' }), 60);

        // Riwayat bertahap (20 per halaman) + filter
        const ul = $('#hUl', root), more = $('#hMore', root);
        let filter = 'semua', tampil = 20;
        const urut = D.semua.slice().reverse();
        const gambar = () => {
          if (!ul) return;
          const list = urut.filter((r) => filter === 'semua' || r.jenis === filter);
          ul.innerHTML = list.slice(0, tampil).map(barisRiwayat).join('') || '<li class="muted">Belum ada sesi pada filter ini.</li>';
          more.hidden = list.length <= tampil;
        };
        gambar();

        root.addEventListener('click', async (e) => {
          const f = e.target.closest('[data-hf]');
          if (f) {
            filter = f.dataset.hf; tampil = 20;
            $$('[data-hf]', root).forEach((c) => c.setAttribute('aria-selected', String(c === f)));
            gambar();
            return;
          }
          if (e.target.closest('#hMore')) { tampil += 20; gambar(); return; }
          if (e.target.closest('[data-act="ekspor"]')) { await ekspor(); return; }
          if (e.target.closest('[data-act="cetak"]')) { window.print(); }
        });

        const fi = $('#fImpor', root);
        fi.addEventListener('change', async () => {
          const file = fi.files && fi.files[0];
          fi.value = '';
          if (!file) return;
          try {
            if (file.size > 8 * 1024 * 1024) throw new Error('File terlalu besar untuk cadangan BekalASN.');
            const obj = JSON.parse(await file.text());
            const ok = await UI.modal({
              judul: 'Pulihkan cadangan?',
              isi: `<p>Cadangan dibuat ${obj && obj.dibuat ? tanggal(obj.dibuat) : '(tanggal tidak diketahui)'} dan berisi ${obj && obj.data && Array.isArray(obj.data.riwayat) ? obj.data.riwayat.length : 0} sesi. Riwayat akan <b>digabung</b> dengan data di perangkat ini; tidak ada yang dihapus.</p>`,
              ok: 'Pulihkan', batal: 'Batal',
            });
            if (!ok) return;
            const h = Store.impor(obj);
            UI.toast(`${ic('checkCircle')}<span>${h.riwayatBaru} sesi dipulihkan · total ${h.totalRiwayat} sesi.</span>`);
            App.render();
          } catch (err) {
            UI.modal({ judul: 'Cadangan tidak bisa dibaca', isi: `<p>${esc(err && err.message && /BekalASN/.test(err.message) ? err.message : 'Pastikan yang dipilih adalah file cadangan BekalASN (.json) yang utuh.')}</p>`, ok: 'Mengerti', batal: '' });
          }
        });
      },
    };
  };

  /* ---------- simpan cadangan: bagikan (HP) atau unduh (laptop) ---------- */
  async function ekspor() {
    const isi = JSON.stringify(Store.ekspor());
    const tgl = new Date();
    const nama = `BekalASN-cadangan-${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, '0')}-${String(tgl.getDate()).padStart(2, '0')}.json`;
    const blob = new Blob([isi], { type: 'application/json' });
    const tandai = () => { Store.d.cadangan = Date.now(); Store.save(); };
    const sentuh = window.matchMedia('(pointer: coarse)').matches;
    try {
      const file = new File([blob], nama, { type: 'application/json' });
      if (sentuh && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Cadangan BekalASN', text: 'Cadangan progres belajar BekalASN' });
        tandai();
        UI.toast(`${ic('checkCircle')}<span>Cadangan dibagikan. Simpan file itu di tempat aman.</span>`);
        App.render();
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return; // pengguna membatalkan
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nama; a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    tandai();
    UI.toast(`${ic('download')}<span>File <b>${esc(nama)}</b> tersimpan di folder Unduhan.</span>`);
    setTimeout(() => App.render(), 600);
  }

  /* ---------- daftarkan rute tambahan ---------- */
  const daftarLama = BA.registerRoutes;
  BA.registerRoutes = function (App) {
    daftarLama && daftarLama(App);
    App.on(/^\/progres$/, Pages.progres);
    App.on(/^\/lanjut$/, BA.Quiz.lanjut);
  };
})();
