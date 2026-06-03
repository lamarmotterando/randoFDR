/* rechercheRandos.js — autocomplétion depuis Supabase via dynamic-handler */

const HANDLER = "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler";

/* Cache local pour éviter de recharger à chaque frappe */
let _randosCache = null;

async function getRandos() {
  if (_randosCache) return _randosCache;
  try {
    const res = await fetch(HANDLER, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "getFiches", select: "nom_rando", order: "nom_rando.asc" })
    });
    const data = await res.json();
    /* Dédupliquer + trier + ajouter option manuelle en tête */
    const noms = [...new Set(
      Array.isArray(data) ? data.map(x => x.nom_rando).filter(Boolean) : []
    )].sort();
    _randosCache = ["Autre… (saisir manuellement)", ...noms];
    console.log("[Randos] " + noms.length + " noms chargés depuis Supabase");
  } catch(e) {
    console.warn("[Randos] Erreur chargement:", e.message);
    _randosCache = ["Autre… (saisir manuellement)"];
  }
  return _randosCache;
}

export async function activerRecherche() {

  const input        = document.getElementById("rechercheRando");
  const suggestionsDiv = document.getElementById("suggestions");
  const nomRando     = document.getElementById("nomRando");

  if (!input || !suggestionsDiv || !nomRando) {
    console.error("Éléments de recherche introuvables !");
    return;
  }

  /* Précharger les randos dès l'activation */
  const randos = await getRandos();

  /* Si "Autre" sélectionné : mettre à jour nomRando en temps réel */
  const selectRando = document.getElementById("rando");
  if (selectRando) {
    input.addEventListener("input", () => {
      const selVal = selectRando.value;
      if (selVal === "__autre__" || selVal === "" || !randos.includes(selVal)) {
        nomRando.value = input.value;
        window._majIndicateurs && window._majIndicateurs();
      }
    });
  }

  /* Filtrer et afficher les suggestions à chaque frappe */
  input.addEventListener("input", () => {
    const filtre = input.value.toLowerCase().trim();
    suggestionsDiv.innerHTML = "";
    if (filtre === "") return;

    const matches = randos.filter(r => r.toLowerCase().includes(filtre)).slice(0, 15);

    matches.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = r;
      div.addEventListener("click", () => {
        nomRando.value = r;
        input.value = r;
        suggestionsDiv.innerHTML = "";
      });
      suggestionsDiv.appendChild(div);
    });
  });

  /* Clic en dehors pour masquer */
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-rando")) {
      suggestionsDiv.innerHTML = "";
    }
  });

  /* Navigation clavier (flèches + Enter) */
  let index = -1;
  input.addEventListener("keydown", (e) => {
    const suggestions = Array.from(suggestionsDiv.children);
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      index = (index + 1) % suggestions.length;
      suggestions.forEach((s, i) => s.classList.toggle("highlight", i === index));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      index = (index - 1 + suggestions.length) % suggestions.length;
      suggestions.forEach((s, i) => s.classList.toggle("highlight", i === index));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (index >= 0 && index < suggestions.length) {
        suggestions[index].click();
        index = -1;
      }
    }
  });
}
