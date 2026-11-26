/* ==========================================================================
   PWA: daftarkan service worker agar situs bisa dipasang & dipakai offline.
   Versi baru dimuat otomatis, tetapi ditunda selama pengguna sedang
   mengerjakan latihan/simulasi (layout "focus") agar jawabannya tidak hilang.
   ========================================================================== */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // "Sibuk" = sedang mengerjakan soal, atau sedang mengetik kunci lisensi. Layar aktivasi
  // yang masih kosong boleh dimuat ulang agar pembeli selalu mendapat versi terbaru.
  const sibuk = () => {
    const l = document.body && document.body.dataset.layout;
    if (l === 'focus') return true;
    if (l === 'gate') { const t = document.getElementById('gKunci'); return !!(t && t.value.trim()); }
    return false;
  };
  let tertunda = false, selesai = false;
  const muatUlang = () => {
    if (selesai) return;
    if (sibuk()) { tertunda = true; return; }
    selesai = true;
    location.reload();
  };
  window.addEventListener('load', () => {
    const adaSebelumnya = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (adaSebelumnya) muatUlang(); });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      window.addEventListener('hashchange', () => { if (tertunda && !sibuk()) muatUlang(); });
      setInterval(() => { if (tertunda && !sibuk()) muatUlang(); }, 5000);
    }).catch(() => {});
  });
})();
