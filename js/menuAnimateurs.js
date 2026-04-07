/* menuAnimateurs.js — charge depuis Supabase (données non exposées dans le code) */

const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE";

export async function remplirMenuAnimateurs() {
  const select = document.getElementById("animateur");
  if (!select) return;

  /* Option par défaut pendant le chargement */
  select.innerHTML = '<option value="">⏳ Chargement…</option>';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/animateurs?select=nom,email,telephone&order=nom`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const animateurs = await res.json();

    select.innerHTML = '<option value="">— Choisir un animateur —</option>';

    animateurs.forEach(a => {
      const opt = document.createElement("option");
      /* Select affiche : nom prénom uniquement */
      opt.value         = a.nom;  /* nom uniquement — téléphone dans data-tel */
      opt.dataset.email = a.email || "";
      opt.dataset.tel   = a.telephone || "";
      opt.textContent   = a.nom;  /* affiché dans le select */
      select.appendChild(opt);
    });

    /* Email auto-rempli à la sélection */
    select.addEventListener("change", () => {
      const opt = select.selectedOptions[0];
      const emailField = document.getElementById("emailUser");
      if (emailField) emailField.value = opt?.dataset.email || "";
    });

    console.log(`[Animateurs] ${animateurs.length} animateurs chargés depuis Supabase`);

  } catch(e) {
    console.warn("[Animateurs] Erreur chargement Supabase:", e);
    /* Fallback : option d'erreur */
    select.innerHTML = '<option value="">⚠️ Erreur chargement — réessayez</option>';
  }
}
