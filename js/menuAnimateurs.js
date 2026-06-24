/* menuAnimateurs.js — charge les animateurs via la Edge Function dédiée get-animateurs
   ✅ Aucune clé exposée — nom + email uniquement (téléphone jamais transmis ici)
   ✅ goanim.html est protégé par mot de passe Webnode */

const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";

export async function remplirMenuAnimateurs() {
  const select = document.getElementById("animateur");
  if (!select) return;

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
      opt.value         = a.nom;
      opt.dataset.email = a.email || "";
      opt.textContent   = a.nom;
      select.appendChild(opt);
    });

    /* Pré-remplir emailUser à la sélection */
    select.addEventListener("change", () => {
      const opt = select.selectedOptions[0];
      const emailField = document.getElementById("emailUser");
      if (emailField) emailField.value = opt?.dataset.email || "";
    });

    console.log(`[Animateurs] ${animateurs.length} animateurs chargés via get-animateurs`);

  } catch(e) {
    console.warn("[Animateurs] Erreur chargement:", e);
    select.innerHTML = '<option value="">⚠️ Erreur chargement — réessayez</option>';
  }
}
