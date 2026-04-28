/* remplirMenu inliné — supprime la dépendance vers menuRandos.js (404 sur GitHub Pages) */
import { randos } from "../data/randos.js";
function remplirMenu() {
  const select = document.getElementById("rando");
  if (!select) { console.error("select rando introuvable"); return; }
  select.innerHTML = "";
  randos.forEach(r => {
    const option = document.createElement("option");
    option.value = r;
    option.textContent = r;
    select.appendChild(option);
  });
  console.log("Randos chargées :", select.options.length);
}

import { activerRecherche } from "./rechercheRandos.js";
import { initHoraires } from "./horairesRando.js";
import { remplirMenuAnimateurs } from "./menuAnimateurs.js";
import { remplirMenuParkings } from "./menuParkings.js";
import { initCarte, chercherLieu } from "./carteParking.js";
import { calculCovoiturage } from "./covoiturage.js";
import { initGPX } from "./gpxAnalyse.js";
import { initProfilGPX } from "./profilAltitude.js";
import { afficherMeteo } from "./meteoRando.js";
import { initResume } from "./resumeRando.js";
import { initEnvoi } from "./envoiRando.js";
import { initSauvegarde, initIndicateurs, majIndicateurs, validerFormulaire, effacerSauvegarde } from "./formManager.js";
import { initGPXManuel, restaurerValeursManuel } from "./gpxManuel.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Application MeteoRando initialisée");
  const dateInput = document.getElementById("dateRando");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
  /* randonnées */
  remplirMenu();
  activerRecherche();
  initHoraires();
  /* animateurs — chargement async depuis Supabase */
  await remplirMenuAnimateurs();
  /* parkings covoiturage */
  remplirMenuParkings();
  /* gestion carte */
  initCarte();
  const btnGeocoder = document.getElementById("btnGeocoder");
  if (btnGeocoder) btnGeocoder.addEventListener("click", chercherLieu);
  /* liaison parking covoiturage → point de départ calcul distance */
  const selectParking = document.getElementById("parkingCovoiturage");
  if(selectParking) {
    selectParking.addEventListener("change", () => {
      window._majPointDepart && window._majPointDepart(selectParking.value)
    });
  }
  /* coût covoiturage */
  const autoroute = document.getElementById("autoroute");
  if (autoroute) autoroute.addEventListener("input", calculCovoiturage);
  /* gpx */
  initGPX();
  initProfilGPX();
  /* résumé + envoi */
  initResume();
  initEnvoi();
  /* sauvegarde auto + indicateurs + validation */
  initSauvegarde();
  initIndicateurs();
  initGPXManuel();
  restaurerValeursManuel(); /* sync inputs manuels après restauration localStorage */
  /* exposer validerFormulaire pour envoiRando.js */
  window._validerFormulaire = validerFormulaire;
  window._majIndicateurs    = majIndicateurs;
  window._effacerSauvegarde = effacerSauvegarde;
  /* mise à jour météo si date change */
  if (dateInput) {
    dateInput.addEventListener("change", () => {
      const lat = document.getElementById("latParking")?.textContent;
      const lon = document.getElementById("lonParking")?.textContent;
      if (lat && lon) afficherMeteo(lat, lon);
    });
  }

});
