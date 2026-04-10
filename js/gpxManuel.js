/* ============================================================
   gpxManuel.js
   - Sans GPX : saisie manuelle via les inputs
   - Avec GPX : valeurs affichées dans les spans, éditables au clic
               (contenteditable) sans aucun bouton supplémentaire
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
        /* GPX chargé → masquer inputs, afficher spans éditables */
        afficherSaisieManuelle(false);
        const hint = document.getElementById("gpx-manuel-hint");
        if (hint) hint.style.display = "none";
        /* Rendre les spans éditables au clic */
        activerEditionSpans(true);
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
      window._majIndicateurs && window._majIndicateurs();
    });
  });

  /* Exposer sur window pour le reset formulaire */
  window._initGPXManuel = initGPXManuel;
}

/* Active/désactive l'édition directe sur les spans GPX */
function activerEditionSpans(actif) {
  CHAMPS.forEach(({ inputId, spanId }) => {
    const span  = document.getElementById(spanId);
    const input = document.getElementById(inputId);
    if (!span) return;

    if (actif) {
      span.contentEditable = "true";
      span.classList.add("stat-span-editable");
      span.title = "Cliquez pour modifier";

      /* Sélectionner tout le texte au focus */
      span.addEventListener("focus", selectionnerTout, { once: false });

      /* Valider à l'appui sur Entrée */
      span.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          span.blur();
        }
      });

      /* Synchroniser vers l'input caché + indicateurs à chaque modification */
      span.addEventListener("input", () => {
        const val = span.textContent.trim();
        if (input) input.value = val !== "—" ? val : "";
        window._majIndicateurs && window._majIndicateurs();
      });

      /* Nettoyer à la perte du focus (supprimer HTML parasite) */
      span.addEventListener("blur", () => {
        const val = span.textContent.trim();
        span.textContent = val || "—";
        if (input) input.value = val !== "—" ? val : "";
        window._majIndicateurs && window._majIndicateurs();
      });

    } else {
      span.contentEditable = "false";
      span.classList.remove("stat-span-editable");
      span.title = "";
    }
  });
}

function selectionnerTout() {
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(this);
  sel.removeAllRanges();
  sel.addRange(range);
}

function afficherSaisieManuelle(actif) {
  CHAMPS.forEach(({ inputId, spanId }) => {
    const input = document.getElementById(inputId);
    const span  = document.getElementById(spanId);
    if (!input || !span) return;

    if (actif) {
      input.style.display = "block";
      span.style.display  = "none";
      span.contentEditable = "false";
      span.classList.remove("stat-span-editable");
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
