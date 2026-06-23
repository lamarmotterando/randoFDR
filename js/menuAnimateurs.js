/* menuAnimateurs.js — charge depuis Supabase via dynamic-handler (pas de clé exposée) */

const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
/* ✅ Clé anon supprimée — lecture animateurs via dynamic-handler (action getAnimateurs) */

export async function remplirMenuAnimateurs() {
  const select = document.getElementById("animateur");
  if (!select) return;

  /* Option par défaut pendant le chargement */
  select.innerHTML = '<option value="">⏳ Chargement…</option>';

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/dynamic-handler`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAnimateurs" })
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

    console.log(`[Animateurs] ${animateurs.length} animateurs chargés via dynamic-handler`);

  } catch(e) {
    console.warn("[Animateurs] Erreur chargement:", e);
    /* Fallback : option d'erreur */
    select.innerHTML = '<option value="">⚠️ Erreur chargement — réessayez</option>';
  }
}
