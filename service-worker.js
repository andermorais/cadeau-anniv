// Service Worker — cache des assets statiques
// V2 : pré-cache COMPLET à l'install (parade au poids ~140 Mo en 4G).
// Objectif : après une première ouverture en WiFi, tout est offline-ready.

const CACHE = 'cadeau-gui-v21';

// Assets critiques : bloquants à l'install. Si un seul échoue, install échoue.
const ASSETS_CORE = [
  './',
  './index.html',
  './app.js',
  './creatures.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Assets lourds : pré-cachés à l'install mais non-bloquants (Promise.allSettled).
// Un GLB manquant ne fait pas planter l'install ; il retombera en cache runtime.
const ASSETS_HEAVY = [
  // 3D models
  './models/blob_vide.glb',
  './models/jeanlouis_humain.glb',
  './models/02_quoikoube.glb',
  './models/03_taytay.glb',
  './models/04_abjectus.glb',
  './models/05_bahdaccord.glb',
  './models/06_jeboudelix.glb',
  // Settings Three.js
  './settings/jeanlouisaure_settings.js',
  './settings/quoikoube_settings.js',
  './settings/taytay_settings.js',
  './settings/abjectus_settings.js',
  './settings/bahdaccord_settings.js',
  './settings/jeboudelix_settings.js',
  // Photos-souvenirs
  './images/01_jeanlouisaure_card.png',
  './images/02_quoikoube_card.png',
  './images/03_taytay_card.png',
  './images/04_abjectus_card.png',
  './images/05_bahdaccord_card.png',
  './images/06_jeboudelix_card.png',
  // CDN externes (unpkg — maplibre-gl + three.js). Cross-origin OK via CORS.
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',
  'https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js',
  'https://unpkg.com/three@0.160.0/examples/jsm/environments/RoomEnvironment.js',
  // Style OpenFreeMap Liberty (JSON, léger)
  'https://tiles.openfreemap.org/styles/liberty',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 1) Core : bloquant. On force `cache: 'reload'` pour bypass le HTTP cache
    //    navigateur (GitHub Pages set max-age=600 → sans ça, on cache une vieille version)
    await Promise.all(ASSETS_CORE.map(async url => {
      const res = await fetch(url, { cache: 'reload' });
      if (res.ok) await cache.put(url, res.clone());
    }));
    // 2) Heavy : non-bloquant, on tolère les échecs individuels
    const results = await Promise.allSettled(
      ASSETS_HEAVY.map(async url => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await cache.put(url, res.clone());
        } catch (e) { /* ignore, runtime cache prendra le relais */ }
      })
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed) console.warn(`[SW] ${failed} asset(s) lourd(s) non pré-cachés — fallback runtime`);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Ignore les protocoles non-http (chrome-extension, etc.)
  if (!req.url.startsWith('http')) return;

  event.respondWith((async () => {
    // Cache-first
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // Runtime cache : GLB, settings, images, icons (pour tout ce qui aurait raté le pré-cache)
      if (res && res.ok && (
        req.url.includes('/models/') ||
        req.url.includes('/settings/') ||
        req.url.includes('/images/') ||
        req.url.includes('/icons/') ||
        req.url.includes('unpkg.com/') ||
        req.url.includes('tiles.openfreemap.org/')  // tuiles vector OSM + assets style
      )) {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, clone)).catch(() => {});
      }
      return res;
    } catch (e) {
      // Offline + rien en cache : on renvoie une réponse d'erreur soft
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
