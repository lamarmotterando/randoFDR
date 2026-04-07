/* ============================================================
   sw.js — Service Worker randoFDR
   Cache les ressources essentielles pour usage hors ligne
   ============================================================ */

const CACHE_NAME = 'randofdr-v5';

/* Fichiers à mettre en cache au démarrage */
const CACHE_STATIC = [
  '/randoFDR/',
  '/randoFDR/index.html',
  '/randoFDR/css/style.css',
  '/randoFDR/js/app.js',
  '/randoFDR/js/meteoRando.js',
  '/randoFDR/js/carteParking.js',
  '/randoFDR/js/covoiturage.js',
  '/randoFDR/js/horairesRando.js',
  '/randoFDR/js/menuRandos.js',
  '/randoFDR/js/menuAnimateurs.js',
  '/randoFDR/js/menuParkings.js',
  '/randoFDR/js/rechercheRandos.js',
  '/randoFDR/js/gpxAnalyse.js',
  '/randoFDR/js/profilAltitude.js',
  '/randoFDR/js/resumeRando.js',
  '/randoFDR/js/envoiRando.js',
  '/randoFDR/js/formManager.js',
  '/randoFDR/data/randos.js',
  '/randoFDR/data/parkings.js',
  '/randoFDR/carteRandos.html',
  '/randoFDR/css/carteRandos.css',
  '/randoFDR/js/carteRandos.js',
  '/randoFDR/data/randosCoords.js',
  '/randoFDR/manifest.json',
];

/* ── INSTALLATION : mise en cache des ressources statiques ── */
self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Mise en cache des ressources');
        return cache.addAll(CACHE_STATIC);
      })
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATION : nettoyage des anciens caches ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH : stratégie Cache First, réseau en fallback ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* APIs externes (météo, carte, nominatim) → réseau uniquement */
  const apiDomains = [
    'api.open-meteo.com',
    'tile.openstreetmap.org',
    'nominatim.openstreetmap.org',
    'router.project-osrm.org',
    'ibp-proxy.vercel.app',
    'supabase.co',
    'unpkg.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];

  if (apiDomains.some(d => url.hostname.includes(d))) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* Ressources locales → Cache First */
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            /* Mettre en cache les nouvelles ressources */
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            /* Hors ligne et pas en cache : page de fallback */
            if (event.request.destination === 'document') {
              return caches.match('/randoFDR/index.html');
            }
          });
      })
  );
});
