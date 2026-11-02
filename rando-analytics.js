/* RandoFDR — traceur analytics anonyme (aucun cookie, aucune donnée personnelle).
   Inclure sur chaque page :  <script defer src="./rando-analytics.js"></script>
   Usage manuel :  RandoAnalytics.event("fiche_envoyee", { type: "rando" });
                   RandoAnalytics.metric("supabase.envoi", 412);
   Clé : UNIQUEMENT la clé publishable (jamais la clé secrète / service_role). */
(() => {
  "use strict";
  const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
  const SUPABASE_KEY = "sb_publishable_M7RxCuGoLU8zdzFSPuZl8A_CvvNMZ-O";

  if (navigator.doNotTrack === "1" || location.protocol !== "https:") {
    window.RandoAnalytics = { event() {}, error() {}, metric() {} };
    return;
  }

  // ID de session : aléatoire, limité à l'onglet (sessionStorage), non persistant.
  let sid = null;
  try { sid = sessionStorage.getItem("ra_sid"); } catch (_) {}
  if (!sid) {
    sid = crypto.randomUUID();
    try { sessionStorage.setItem("ra_sid", sid); } catch (_) {}
  }

  const headers = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = "Bearer " + SUPABASE_KEY; // ancienne clé anon

  // Masque les e-mails et les suites de chiffres (codes à 6 chiffres, téléphones).
  const scrub = (s) => String(s ?? "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\d{6,}/g, "[n]")
    .slice(0, 500);
  const path = () => location.pathname;

  function send(args) {
    fetch(SUPABASE_URL + "/rest/v1/rpc/analytics_track", {
      method: "POST", headers, keepalive: true,
      body: JSON.stringify({ p_session_id: sid, p_page: path(), ...args }),
    }).catch(() => {}); // hors ligne : on ignore
  }

  let errorCount = 0;
  const api = {
    event(name, props = {}) { send({ p_kind: "event", p_name: name, p_properties: props }); },
    metric(name, ms)        { if (Number.isFinite(ms)) send({ p_kind: "metric", p_name: name, p_value: Math.round(ms) }); },
    error(type, message, source) {
      if (++errorCount > 10) return; // max 10 erreurs par page
      send({ p_kind: "error", p_name: String(type || "Error").slice(0, 60),
             p_message: scrub(message) || "(vide)", p_source: scrub(source) });
    },
  };
  window.RandoAnalytics = api;

  api.event("page_view");

  window.addEventListener("error", (e) => {
    if (!e.message) return; // erreurs de chargement de ressource : ignorées
    api.error(e.error?.name || "Error", e.message, (e.filename || "").split("?")[0] + ":" + e.lineno);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    api.error(r?.name || "UnhandledRejection", r?.message || r, "");
  });
  window.addEventListener("appinstalled", () => api.event("pwa_installee"));

  window.addEventListener("load", () => setTimeout(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.loadEventEnd > 0) api.metric("page.load", nav.loadEventEnd);
  }, 0));
})();
