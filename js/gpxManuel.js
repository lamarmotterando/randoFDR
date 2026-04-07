/* ============================================================
   gpxManuel.js
   Permet la saisie manuelle de distance, dénivelé, durée, effort
   quand aucun fichier GPX n'est chargé.
   Masque les champs manuels si un GPX est chargé.
   ============================================================ */

const CHAMPS = [
  { inputId: "distanceGPX_manuel", spanId: "distanceGPX" },
  { inputId: "denivele_manuel",    spanId: "denivele"    },
  { inputId: "dureeMarche_manuel", spanId: "dureeMarche" },
  { inputId: "effort_manuel",      spanId: "effort"      },
];

export function initGPXManuel() {

  /* Afficher les champs manuels par défaut (pas de GPX) */
  afficherSaisieManuelle(true);

  /* Écouter le chargement d'un fichier GPX */
  const gpxFile = document.getElementById("gpxFile");
  if (gpxFile) {
    gpxFile.addEventListener("change", () => {
      if (gpxFile.files.length > 0) {
        /* GPX chargé → masquer saisie manuelle, afficher les spans */
        afficherSaisieManuelle(false);
        const hint = document.getElementById("gpx-manuel-hint");
        if (hint) hint.style.display = "none";
      }
    });
  }

  /* Synchroniser les inputs manuels → spans (pour le résumé) */
  CHAMPS.forEach(({ inputId, spanId }) => {
    const input = document.getElementById(inputId);
    const span  = document.getElementById(spanId);
    if (!input || !span) return;

    input.addEventListener("input", () => {
      const val = input.value.trim();
      span.textContent = val || "—";
      /* Mettre à jour les indicateurs si disponible */
      window._majIndicateurs && window._majIndicateurs();
    });
  });
}

function afficherSaisieManuelle(actif) {
  CHAMPS.forEach(({ inputId, spanId }) => {
    const input = document.getElementById(inputId);
    const span  = document.getElementById(spanId);
    if (!input || !span) return;

    if (actif) {
      input.style.display = "block";
      span.style.display  = "none";
      /* Pré-remplir l'input si le span a une valeur */
      if (span.textContent && span.textContent !== "—") {
        input.value = span.textContent;
      }
    } else {
      input.style.display = "none";
      span.style.display  = "inline";
    }
  });
}

/* Appelé par formManager pour restaurer les valeurs sauvegardées */
export function restaurerValeursManuel() {
  CHAMPS.forEach(({ inputId, spanId }) => {
    const input = document.getElementById(inputId);
    const span  = document.getElementById(spanId);
    if (!input || !span) return;
    if (input.value && input.value !== "—") {
      span.textContent = input.value;
    }
  });
}
