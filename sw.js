/* BekalASN ae344ba5cd — simpan file aplikasi agar bisa dipakai offline */
const CACHE = 'bekalasn-ae344ba5cd';
const FONT = 'bekalasn-font';
const FILES = ["./","index.html","manifest.webmanifest","assets/css/style.css?v=ae344ba5cd","assets/js/data/config.js?v=ae344ba5cd","assets/js/vendor/ed25519-verify.js?v=ae344ba5cd","assets/js/app.js?v=ae344ba5cd","assets/js/quiz.js?v=ae344ba5cd","assets/js/pages.js?v=ae344ba5cd","assets/js/laporan.js?v=ae344ba5cd","assets/js/pwa.js?v=ae344ba5cd","assets/icons/icon-32.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/icons/icon-maskable-512.png","assets/icons/apple-touch-icon.png","assets/js/gerbang.js?v=ae344ba5cd","assets/js/konten.js?v=ae344ba5cd"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== FONT).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(caches.match('index.html').then((r) => r || fetch(req)));
      return;
    }
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT).then((c) => c.match(req).then((r) => {
      const baru = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => r);
      return r || baru;
    })));
  }
});
