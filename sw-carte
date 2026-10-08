/* ============================================================
   sw-carte.js — Service Worker de la carte de suivi (carte.html)
   Portée limitée à /randoFDR/carte.html : n'agit sur aucune autre page.
   Rôle : rouvrir la carte SANS RÉSEAU quand elle a été « préparée ».
   • Page carte.html et Leaflet : réseau d'abord (4 s max), sinon copie en cache
   • Les tuiles et le tracé sont gérés par la page elle-même
     (caches « randofdr-tuiles-<id> » + localStorage), effacés après la rando.
   Ne supprime aucun cache : chaque cache est géré par la page qui l'a créé.
   ============================================================ */
const VERSION = 'carte-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function reseauOuCache(request, delaiMs) {
  return new Promise(resolve => {
    let fini = false;
    const depuisCache = () => caches.match(request, { ignoreVary: true }).then(r => r || caches.match(request.url));
    const minuteur = setTimeout(() => {
      depuisCache().then(r => { if (r && !fini) { fini = true; resolve(r); } });
    }, delaiMs);
    fetch(request).then(r => {
      clearTimeout(minuteur);
      if (!fini) { fini = true; resolve(r); }
    }).catch(() => {
      clearTimeout(minuteur);
      depuisCache().then(r => { if (!fini) { fini = true; resolve(r || Response.error()); } });
    });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // appels Supabase (POST) : non interceptés
  const url = new URL(req.url);
  const estPage    = req.mode === 'navigate' && url.pathname.endsWith('/carte.html');
  const estLeaflet = url.origin === self.location.origin && url.pathname.includes('/js/lib/leaflet/');
  if (estPage || estLeaflet) event.respondWith(reseauOuCache(req, 4000));
  /* tout le reste (tuiles IGN, polices…) : comportement normal du navigateur */
});
