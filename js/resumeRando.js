export function initResume(){
document
.getElementById("btnResume")
.addEventListener("click", genererResume)
}

function genererResume(){
  
const gps = window.coordsParking || ""
console.log("GPS résumé =", gps)
  
const nom = val("nomRando","Non renseigné")
const date = val("dateRando","--")
const meteo = txt("meteoEtat")
const pluie = txt("meteoPluie")
const temp = txt("meteoTemp")
const vent = txt("meteoVent")
const raf = txt("meteoRafales")
const fiabiliteEl = document.getElementById("meteoFiabilite")
const fiabiliteTexte = fiabiliteEl?.textContent?.trim() || ""

/* parking covoiturage : saisie manuelle si "Autre" sélectionné */
const parkingCovoitVal = val("parkingCovoiturage", "Non renseigné")
const parkingCovoitAutre = val("nouveauParking", "")
const parkingCovoit = (parkingCovoitVal === "__autre__" && parkingCovoitAutre)
  ? parkingCovoitAutre
  : (parkingCovoitVal === "__autre__" ? "Non renseigné" : parkingCovoitVal)

const rv = val("heureRV","--")
const depart = txt("heureDepart")
const trajet = val("itineraire","Non renseigné")
const km = txt("distanceAR")

const parkingRando =
document.getElementById("parkingRandoAdresse")?.textContent.trim() || "Non renseigné"

const coutKm = txt("coutKm")
const coutAutoroute = val("autoroute","0")
const coutTotal = txt("coutTotal")
const cov4 = txt("cout4")
const cov5 = txt("cout5")

const distRando = txt("distanceGPX")
const denivele = txt("denivele")
const duree = txt("dureeMarche")  // ✅
const ibp = txt("ibp")
const effort = txt("effort")
const technicite = val("technicite","0")
const risque = val("risque","0")
const remarques = val("remarques","Non renseigné")
const animateur = val("animateur","❌ Non renseigné")
const selectAnim = document.getElementById("animateur")
const tel = selectAnim?.selectedOptions[0]?.dataset?.tel || ""
/* Extraire le prénom = premier mot du nom (format "NOM Prénom" ou "Prénom NOM") */
const prenomAnim = (() => {
  const mots = animateur.trim().split(/\s+/);
  if (mots.length === 1) return mots[0];
  /* Si premier mot tout en majuscules → c'est le nom, prendre le suivant */
  return mots[0] === mots[0].toUpperCase() ? mots[1] : mots[0];
})();
const animateurAvecTel = animateur && tel ? `${animateur}  📱 ${tel}` : animateur

/* ── Pastille IBP ── */
const ibpNum = parseFloat(ibp)
const ibpNiveau = (!ibp || ibp === "—" || isNaN(ibpNum)) ? "" :
  ibpNum <= 25  ? "🟢 N1 — Facile" :
  ibpNum <= 50  ? "🔵 N2 — Assez Facile" :
  ibpNum <= 75  ? "🟡 N3 — Peu Difficile" :
  ibpNum <= 100 ? "🔴 N4 — Assez Difficile" :
                  "⚫ N5 — Difficile"

const texte = `Bonjour ${prenomAnim},

Merci d'avoir rempli la feuille de route "${nom} / ${formatDate(date)}".

Vous trouverez ci-joint une copie de votre FdR.

✅ VÉRIFICATION IMPORTANTE — Consultez votre fiche sur le site :
👉 https://www.lamarmottechateaurenard.com/goanim/?animateur=${encodeURIComponent(animateur)}&rando=${encodeURIComponent(nom)}

Vérifiez que les informations suivantes sont bien affichées :
  • Heure de rendez-vous
  • Parking de covoiturage
  • Parking départ randonnée + coordonnées GPS
  • Distance, dénivelé, durée
  • Coûts de covoiturage

Si des informations manquent, contactez l'administrateur ou renvoyez votre FdR complétée.

En cas de nécessité, vous pouvez modifier l'ensemble des paramètres de la FdR ou annuler celle-ci à tout moment en cliquant sur la page suivante : https://bit.ly/4nnwPWW

Sur cette nouvelle page, le bouton "Annuler" fournit l'état de la rando comme - Annulée -. Ces actions mettront automatiquement à jour le planning sur le site et Google Calendar.

――――――――――――――――――――――――――――――――――

Feuille de route : ${formatDate(date)} — ${nom}

Nom de la randonnée : ${nom}

📆 Date de la randonnée : ${formatDate(date)}

🌤️ Météo prévue le ${formatDate(date)} (Météo-France ARPEGE+AROME via Open-Meteo): ${meteo}, ${pluie} ● ${temp} ● ${vent} ● ${raf}${fiabiliteTexte ? "\n   ℹ️ Fiabilité : " + fiabiliteTexte : ""}

🅿️ Parking Covoiturage : ${parkingCovoit}
🕞 Heure de rendez-vous : ${rv}
🔔 Heure de Départ : ${depart}

Trajet suggéré: ${trajet}

Kilométrage voiture A/R : ${km} km

🏁 Parking départ randonnée : ${parkingRando}

📍 Coordonnées GPS : ${gps}
📍 Google Maps :
https://www.google.com/maps?q=${gps}

Coût du Trajet : ${coutKm}
Coût de l'Autoroute : ${coutAutoroute} €
Coût Trajet Total : ${coutTotal}

✅ Covoiturage (par 4) : ${cov4}
✅ Covoiturage (par 5) : ${cov5}

Distance de la Randonnée : ≃${distRando} km
😋 Dénivelé positif : ≃${denivele} m
⏱️ Durée totale: ≃${duree}

IBP : ${ibp}${ibpNiveau ? "  " + ibpNiveau : ""}

E: ${effort}, T: ${technicite}, R : ${risque}

📌 Remarques et particularités : ${remarques}

🚶‍♂️🚶🏻‍♀️Animateur-trice : ${animateurAvecTel}

Les paramètres de la randonnée sont donnés à titre indicatif uniquement. 
Ils peuvent varier en fonction des applications GPS.

Inscription auprès de l'animateur-trice la veille avant 19h par SMS.
L'animateur-trice se réserve le droit de modifier le circuit.

ÉQUIPEMENT : Les chaussures de randonnée montantes et les bâtons de marche sont obligatoires. 
Prévoir des vêtements de protection (vent, pluie, froid), un sac à dos avec pique-nique et de l'eau en quantité suffisante, ainsi que sa propre pharmacie.
`

document.getElementById("resumeRando").textContent = texte

}

/* helpers */

function val(id,def){
const el = document.getElementById(id)
if(!el) return def
return el.value || def
}

function txt(id){
const el = document.getElementById(id)
if(!el) return ""
if(el.tagName === "INPUT" || el.tagName === "TEXTAREA") return el.value || ""
return el.textContent
}

function formatDate(d){
if(!d) return ""
const date = new Date(d)
return date.toLocaleDateString("fr-FR")
}
