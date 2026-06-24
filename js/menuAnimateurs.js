/* menuAnimateurs.js — charge les animateurs via la Edge Function dédiée get-animateurs
   ✅ Aucune clé exposée — noms uniquement (email et téléphone jamais transmis ici) */

const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";

export async function remplirMenuAnimateurs() {
  const select = document.getElementById("animateur");
  if (!select) return;

  /* Option par défaut pendant le chargement */
  select.innerHTML = '<option value="">⏳ Chargement…</option>';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/get-animateurs`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const animateurs = await res.json();

    select.innerHTML = '<option value="">— Choisir un animateur —</option>';

    animateurs.forEach(a => {
      const opt = document.createElement("option");
      opt.value       = a.nom;
      opt.textContent = a.nom;
      select.appendChild(opt);
    });

    /* Email auto-rempli à la sélection — récupéré depuis le champ caché emailUser si présent */
    select.addEventListener("change", () => {
      const emailField = document.getElementById("emailUser");
      if (emailField) emailField.value = "";
    });

    console.log(`[Animateurs] ${animateurs.length} animateurs chargés via get-animateurs`);

  } catch(e) {
    console.warn("[Animateurs] Erreur chargement:", e);
    select.innerHTML = '<option value="">⚠️ Erreur chargement — réessayez</option>';
  }
}
