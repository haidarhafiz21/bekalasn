/* ==========================================================================
   Gerbang lisensi BekalASN (hanya dipakai versi online / hasil build).
   - Membuat ID perangkat acak (disimpan di peramban ini).
   - Memeriksa kunci lisensi BA1-… (tanda tangan Ed25519, ikatan perangkat, masa berlaku).
   - Membuka konten terenkripsi (AES-GCM) lalu menyerahkannya ke aplikasi.
   ========================================================================== */
(function () {
  'use strict';
  const KUNCI_PUBLIK = 'gGnriWtvwMbOvujNTMHcwBkJWJPSgLetKSoxBFDstGk';
  const AWALAN = 'BA1';
  const K_DEV = 'bekalasn:perangkat';
  const K_LIS = 'bekalasn:lisensi';
  const C = window.CPNS;
  const KONTAK = (C && C.situs && C.situs.kontakLisensi) || 'chat TikTok penjual';
  const NAMA = (C && C.situs && C.situs.nama) || 'BekalASN';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } },
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function b64d(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  const b64u = (u) => btoa(String.fromCharCode.apply(null, Array.from(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  /* ---------- lingkungan ---------- */
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const dalamAplikasi = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|BytedanceWebview|Twitter|Snapchat/i.test(ua);
  const bisaKripto = !!(window.crypto && crypto.subtle && window.TextEncoder && window.DecompressionStream);

  /* ---------- ID perangkat ---------- */
  function idPerangkat() {
    let d = ls.get(K_DEV);
    if (!/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(d || '')) {
      const b = crypto.getRandomValues(new Uint8Array(8));
      d = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g).join('-');
      ls.set(K_DEV, d);
    }
    return d;
  }
  async function sidikPerangkat(dev) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(AWALAN + '|' + dev)));
    return b64u(h.slice(0, 12));
  }

  /* ---------- pemeriksaan kunci ---------- */
  async function periksa(kunci, dev) {
    const k = String(kunci || '').replace(/\s+/g, '');
    const m = k.match(/^BA1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (!m) return { ok: false, error: 'Format kunci tidak dikenali. Salin utuh mulai dari BA1- sampai karakter terakhir.' };
    if (typeof window.edVerify !== 'function') return { ok: false, error: 'Komponen verifikasi gagal dimuat. Muat ulang halaman.' };
    let sah = false;
    try { sah = await window.edVerify(enc.encode(m[1]), b64d(m[2]), b64d(KUNCI_PUBLIK)); } catch (e) { sah = false; }
    if (!sah) return { ok: false, error: 'Kunci lisensi tidak valid. Pastikan tidak ada huruf yang terpotong.' };
    let p;
    try { p = JSON.parse(dec.decode(b64d(m[1]))); } catch (e) { return { ok: false, error: 'Kunci lisensi tidak valid.' }; }
    if (p.h && p.h !== (await sidikPerangkat(dev))) {
      return { ok: false, error: `Kunci ini terdaftar untuk perangkat lain. ${kapital(KONTAK)} dengan ID perangkat di atas untuk mendapatkan kunci yang sesuai.` };
    }
    if (p.x && Date.now() > p.x) return { ok: false, error: `Masa berlaku lisensi sudah habis. ${kapital(KONTAK)} untuk memperpanjang.` };
    return { ok: true, p, kunci: k };
  }
  const kapital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- membuka konten ---------- */
  async function bukaKonten(p, dev) {
    const K = window.BEKALASN_KONTEN;
    if (!K) throw new Error('Berkas konten tidak ditemukan.');
    const w = b64d(p.w);
    const base = await crypto.subtle.importKey('raw', enc.encode(p.h ? dev : AWALAN + '-bebas'), 'HKDF', false, ['deriveKey']);
    const kek = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: enc.encode(p.id), info: enc.encode('bekalasn-kek') },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const mentah = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: w.slice(0, 12) }, kek, w.slice(12)));
    const ck = await crypto.subtle.importKey('raw', mentah, 'AES-GCM', false, ['decrypt']);
    const blob = b64d(K.data);
    const gz = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12) }, ck, blob.slice(12));
    const json = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const isi = JSON.parse(json);
    C.tambahMateri(isi.materi);
    C.tambahSoal(isi.soal);
  }

  /* ---------- tampilan ---------- */
  const app = () => document.getElementById('app');
  const logo = `<span class="brand"><svg class="brand__mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5c4.2 0 7.3 1.5 8.4 4.1V21c-1.2-2.6-4.3-4-8.4-4z" fill="#8B7FE0"/><path d="M21 6.5c-4.2 0-7.3 1.5-8.4 4.1V21c1.2-2.6 4.3-4 8.4-4z" fill="#2B2A63"/><circle cx="12" cy="4" r="2.2" fill="#F4C74F"/></svg><span class="brand__name">${esc(NAMA)}</span></span>`;
  const ikon = (d) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IK = {
    salin: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    kunci: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14 9l2 2"/>',
    perisai: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  };

  function tampilMemuat(teks) {
    document.body.dataset.layout = 'gate';
    app().innerHTML = `<div class="gate__loading"><div>${logo}<p>${esc(teks || 'Membuka materi…')}</p><div class="gate__bar"><i></i></div></div></div>`;
  }

  function tampilGerbang(dev, pesan, onAktif) {
    document.body.dataset.layout = 'gate';
    document.title = 'Aktivasi lisensi — ' + NAMA;
    const meta = (window.BEKALASN_KONTEN && window.BEKALASN_KONTEN.meta) || {};
    const harusPasang = iOS && !standalone && !dalamAplikasi;
    let kartu;
    if (dalamAplikasi) {
      kartu = `<div class="gate__card gate__install">
        <h2>Buka di browser dulu</h2>
        <p>Kamu membuka halaman ini dari dalam aplikasi lain (TikTok, Instagram, atau Facebook). Agar lisensi tersimpan dengan aman, buka di <b>Chrome</b> atau <b>Safari</b>.</p>
        <ol><li>Ketuk tombol <b>⋯</b> atau <b>⋮</b> di pojok kanan atas.</li><li>Pilih <b>Buka di browser</b> / <b>Open in browser</b>.</li></ol>
        <button class="btn btn--ghost btn--block" id="gSalinLink" type="button" style="margin-top:18px">${ikon(IK.salin)}<span>Salin tautan halaman</span></button>
      </div>`;
    } else if (harusPasang) {
      kartu = `<div class="gate__card gate__install">
        <h2>Pasang ke Layar Utama dulu</h2>
        <p>Di iPhone, aplikasi yang dibuka dari ikon Layar Utama menyimpan data terpisah dari Safari. Agar lisensi tidak hilang, aktifkan dari ikon tersebut.</p>
        <ol>
          <li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di Safari.</li>
          <li>Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</li>
          <li>Buka <b>${esc(NAMA)}</b> dari ikon di Layar Utama. ID perangkat dan kolom kunci lisensi akan muncul di sana.</li>
        </ol>
      </div>`;
    } else {
      kartu = `<div class="gate__card">
        <h2>Aktivasi lisensi</h2>
        <p>Kunci lisensi berlaku untuk <b>perangkat dan browser ini</b>.</p>
        <div class="gate__id"><div><span>ID perangkat ini</span><b id="gId">${esc(dev)}</b></div><button class="btn btn--ghost btn--sm" id="gSalin" type="button">${ikon(IK.salin)}<span>Salin</span></button></div>
        <label class="gate__label" for="gKunci">Kunci lisensi</label>
        <textarea id="gKunci" rows="4" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="BA1-…"></textarea>
        <p class="gate__err" id="gErr" role="alert">${esc(pesan || '')}</p>
        <button class="btn btn--sun btn--block btn--lg" id="gAktif" type="button">${ikon(IK.kunci)}<span>Aktifkan</span></button>
        <p class="gate__foot">${ikon(IK.perisai)}Satu kunci lisensi berlaku untuk satu perangkat.</p>
      </div>`;
    }
    app().innerHTML = `<section class="gate">
      <div class="container gate__grid">
        <div class="gate__intro">
          ${logo}
          <p class="eyebrow">Akses khusus pemegang lisensi</p>
          <h1>Belajar SKD tanpa menebak-nebak.</h1>
          <p class="gate__lead">Rangkuman materi, cara cepat, latihan bertimer, dan simulasi CAT ${meta.menit || 100} menit — lengkap dengan pembahasan setiap soal.</p>
          <ul class="gate__stats">
            <li><b>${meta.materi || '—'}</b><span>materi</span></li>
            <li><b>${meta.soal || '—'}</b><span>soal + pembahasan</span></li>
            <li><b>3</b><span>subtes SKD</span></li>
          </ul>
          <ol class="gate__steps">
            <li>Salin <b>ID perangkat</b> pada kotak aktivasi.</li>
            <li><b>${esc(kapital(KONTAK))}</b>, lalu kirim ID perangkat beserta bukti pembelian.</li>
            <li>Tempel kunci lisensi yang kamu terima, lalu tekan <b>Aktifkan</b>.</li>
          </ol>
        </div>
        ${kartu}
      </div>
    </section>`;

    const salinTeks = async (teks, tombol) => {
      let ok = false;
      try { await navigator.clipboard.writeText(teks); ok = true; } catch (e) { ok = false; }
      if (tombol) {
        const s = tombol.querySelector('span');
        const awal = s.textContent;
        s.textContent = ok ? 'Tersalin' : 'Salin manual';
        setTimeout(() => (s.textContent = awal), 1800);
      }
      if (!ok) {
        const el = document.getElementById('gId');
        if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
      }
    };
    const bSalin = document.getElementById('gSalin');
    bSalin && bSalin.addEventListener('click', () => salinTeks(dev, bSalin));
    const bLink = document.getElementById('gSalinLink');
    bLink && bLink.addEventListener('click', () => salinTeks(location.href.split('#')[0], bLink));

    const bAktif = document.getElementById('gAktif');
    if (!bAktif) return;
    const area = document.getElementById('gKunci');
    const err = document.getElementById('gErr');
    const aktifkan = async () => {
      err.className = 'gate__err';
      if (!area.value.trim()) { err.textContent = 'Tempel kunci lisensi terlebih dahulu.'; area.focus(); return; }
      if (!bisaKripto) { err.textContent = 'Browser ini terlalu lama. Perbarui Chrome/Safari lalu coba lagi.'; return; }
      bAktif.disabled = true;
      bAktif.querySelector('span').textContent = 'Memeriksa…';
      const r = await periksa(area.value, dev);
      if (!r.ok) {
        err.textContent = r.error;
        bAktif.disabled = false;
        bAktif.querySelector('span').textContent = 'Aktifkan';
        return;
      }
      try {
        await bukaKonten(r.p, dev);
      } catch (e) {
        err.textContent = 'Kunci benar, tetapi materi gagal dibuka. Muat ulang halaman, atau minta kunci baru bila masalah berlanjut.';
        bAktif.disabled = false;
        bAktif.querySelector('span').textContent = 'Aktifkan';
        return;
      }
      ls.set(K_LIS, r.kunci);
      try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* abaikan */ }
      err.className = 'gate__err gate__ok';
      err.textContent = `Lisensi aktif atas nama ${r.p.n}.`;
      setTimeout(() => onAktif(r.p), 500);
    };
    bAktif.addEventListener('click', aktifkan);
    area.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) aktifkan(); });
  }

  function catatanFooter(p) {
    const tempel = () => {
      const f = document.querySelector('.footer__bottom');
      if (!f || f.querySelector('.footer__lic')) return;
      const span = document.createElement('span');
      span.className = 'footer__lic';
      span.innerHTML = `Dilisensikan untuk <b>${esc(p.n)}</b>${p.x ? ' · berlaku s.d. ' + new Date(p.x).toLocaleDateString('id-ID') : ''} <button type="button">Ganti kunci</button>`;
      span.querySelector('button').addEventListener('click', async () => {
        const ok = window.BA && BA.UI ? await BA.UI.modal({ judul: 'Ganti kunci lisensi?', isi: '<p>Kunci yang tersimpan di perangkat ini akan dihapus, lalu kamu diminta memasukkan kunci baru. Progres belajar tetap tersimpan.</p>', ok: 'Ganti kunci', batal: 'Batal' }) : confirm('Ganti kunci lisensi?');
        if (ok) { ls.del(K_LIS); location.reload(); }
      });
      f.appendChild(span);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tempel);
    else tempel();
  }

  /* ---------- alur utama ---------- */
  window.CPNS_GERBANG = new Promise((selesai) => {
    const lanjut = (p) => { catatanFooter(p); selesai(); };
    const mulai = async () => {
      if (!bisaKripto) {
        tampilGerbang('—', 'Browser ini tidak mendukung fitur keamanan yang dibutuhkan. Perbarui Chrome/Safari ke versi terbaru.', () => {});
        return;
      }
      const dev = idPerangkat();
      const tersimpan = ls.get(K_LIS);
      let pesan = '';
      if (tersimpan) {
        tampilMemuat();
        const r = await periksa(tersimpan, dev);
        if (r.ok) {
          try { await bukaKonten(r.p, dev); lanjut(r.p); return; } catch (e) { pesan = 'Materi gagal dibuka dengan kunci yang tersimpan. Masukkan ulang kunci lisensi.'; }
        } else {
          pesan = r.error;
        }
      }
      tampilGerbang(dev, pesan, lanjut);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
    else mulai();
  });
})();
