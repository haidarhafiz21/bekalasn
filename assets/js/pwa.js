/* ==========================================================================
   PWA: daftarkan service worker agar situs bisa dipasang & dipakai offline.
   Versi baru dimuat otomatis, tetapi ditunda selama pengguna sedang
   mengerjakan latihan/simulasi (layout "focus") agar jawabannya tidak hilang.
   ========================================================================== */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const sibuk = () => document.body && (document.body.dataset.layout === 'focus' || document.body.dataset.layout === 'gate');
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
    }).catch(() => {});
  });
})();
