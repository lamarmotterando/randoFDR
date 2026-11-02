/* Dashboard Analytics RandoFDR. Clé publishable UNIQUEMENT.
   L'autorisation réelle est faite côté base (analytics_dashboard vérifie app_metadata.role). */
const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
const SUPABASE_KEY = "sb_publishable_M7RxCuGoLU8zdzFSPuZl8A_CvvNMZ-O";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storageKey: "randofdr-analytics-auth" },
});
const $ = (id) => document.getElementById(id);
let refreshTimer = null;
let lastActivity = [];

const fmt = (v) => new Intl.NumberFormat("fr-FR").format(v ?? 0);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rows = (list, empty, render) => (list || []).map(render).join("") || `<p class="muted">${empty}</p>`;

function showLogin(message = "") {
  $("login-panel").hidden = false;
  $("dashboard").hidden = true;
  $("login-message").textContent = message;
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
}

async function start() {
  const { data: { session } } = await client.auth.getSession();
  if (!session) return showLogin();
  // Vérification d'affichage seulement ; la base refuse de toute façon les non-admins.
  const { data: { user }, error } = await client.auth.getUser();
  if (error || user?.app_metadata?.role !== "admin") {
    await client.auth.signOut({ scope: "local" });
    return showLogin("Accès réservé aux administrateurs.");
  }
  $("login-panel").hidden = true;
  $("dashboard").hidden = false;
  await load();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(load, 5 * 60 * 1000);
}

async function load() {
  $("status").textContent = "Actualisation…";
  $("status").className = "status";
  const { data, error } = await client.rpc("analytics_dashboard", { p_days: Number($("range").value) });
  if (error || !data) {
    $("status").textContent = error?.message || "Impossible de charger les statistiques.";
    $("status").className = "status error";
    return;
  }
  render(data);
  $("status").textContent = "Données à jour";
  $("status").className = "status success";
  $("updated-at").textContent = "Mis à jour à " + new Date(data.generated_at).toLocaleTimeString("fr-FR");
}

function render(d) {
  const k = d.kpis;
  $("visits-24h").textContent = fmt(k.visits_24h);
  $("visits-7d").textContent = fmt(k.visits_7d);
  $("visits-30d").textContent = fmt(k.visits_30d);
  $("page-views").textContent = fmt(k.page_views);
  $("events").textContent = fmt(k.events);
  $("errors-24h").textContent = fmt(k.errors_24h);

  const listRow = (x) => `<div class="list-row"><span>${esc(x.name)}</span><strong>${fmt(x.count)}</strong></div>`;
  $("top-pages").innerHTML = rows(d.top_pages, "Aucune page vue.", listRow);
  $("top-events").innerHTML = rows(d.top_events, "Aucune action.", listRow);
  $("performance").innerHTML = rows(d.performance, "Aucune mesure.", (x) =>
    `<div class="list-row"><span>${esc(x.name)}<br><small class="muted">${fmt(x.count)} mesures · P95 ${fmt(x.p95)} · Max ${fmt(x.max)}</small></span><strong>${fmt(x.avg)} ms</strong></div>`);
  $("errors").innerHTML = (d.errors || []).map((x) =>
    `<tr><td>${esc(x.type)}</td><td>${esc(x.message)}</td><td>${esc(x.source)}</td><td>${fmt(x.count)}</td><td>${new Date(x.last).toLocaleString("fr-FR")}</td></tr>`
  ).join("") || '<tr><td colspan="5">Aucune erreur.</td></tr>';

  lastActivity = d.activity || [];
  draw(lastActivity);
}

function draw(data) {
  const canvas = $("activity-chart");
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || 700, h = canvas.clientHeight || 240;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 38, r: 12, t: 16, b: 32 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const max = Math.max(1, ...data.map((r) => r.visits));
  ctx.font = "11px system-ui"; ctx.fillStyle = "#8792a5"; ctx.strokeStyle = "#edf0f5"; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + ph * i / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillText(String(Math.round(max * (1 - i / 4))), 4, y + 4);
  }
  if (!data.length) { ctx.fillText("Pas encore de données", pad.l + 10, pad.t + 30); return; }

  const step = data.length > 1 ? pw / (data.length - 1) : 0;
  const pt = (r, i) => [pad.l + i * step, pad.t + ph - (r.visits / max) * ph];
  ctx.strokeStyle = "#315efb"; ctx.lineWidth = 2.5; ctx.beginPath();
  data.forEach((r, i) => { const [x, y] = pt(r, i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.stroke();
  ctx.fillStyle = "#315efb";
  data.forEach((r, i) => { const [x, y] = pt(r, i); ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#8792a5";
  const stride = Math.max(1, Math.ceil(data.length / 7));
  data.forEach((r, i) => {
    if (i % stride === 0 || i === data.length - 1) {
      const label = new Date(r.day + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      ctx.fillText(label, pad.l + i * step - 15, h - 8);
    }
  });
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-message").textContent = "Connexion…";
  const { error } = await client.auth.signInWithPassword({ email: $("email").value, password: $("password").value });
  $("password").value = "";
  if (error) { $("login-message").textContent = "Identifiants invalides."; return; }
  $("login-message").textContent = "";
  await start();
});
$("refresh").addEventListener("click", load);
$("range").addEventListener("change", load);
$("signout").addEventListener("click", async () => { await client.auth.signOut(); showLogin(); });
window.addEventListener("resize", () => draw(lastActivity));

start().catch((err) => showLogin(err.message || "Erreur d'initialisation"));
