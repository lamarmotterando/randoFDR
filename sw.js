/* ============================================================
   sw.js — DÉSACTIVATION du service worker de RandoFDR (09/10/2026)
   L'ancien sw.js ne s'installait plus depuis avril 2026 (fichier
   js/menuRandos.js absent) ; les appareils qui avaient installé la
   version d'avril gardaient des pages anciennes en cache.
   Cette version s'installe, efface les caches "randofdr-v…",
   puis se désinscrit : les pages sont ensuite chargées normalement.
   Ne touche pas aux caches de la carte de suivi (randofdr-tuiles-…)
   ni à sw-carte.js (enregistrement séparé).
   ============================================================ */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter(k => /^randofdr-v\d+$/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
  })());
});
/* pas de gestionnaire "fetch" : tout passe par le réseau */
