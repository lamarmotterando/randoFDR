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
const animateurAvecTel = animateur && tel ? `${animateur}  📱 ${tel}` : animateur

/* ── Pastille IBP ── */
const ibpNum = parseFloat(ibp)
const ibpNiveau = (!ibp || ibp === "—" || isNaN(ibpNum)) ? "" :
  ibpNum <= 25  ? "🟢 N1 — Facile" :
  ibpNum <= 50  ? "🔵 N2 — Assez Facile" :
  ibpNum <= 75  ? "🟡 N3 — Peu Difficile" :
  ibpNum <= 100 ? "🔴 N4 — Assez Difficile" :
                  "⚫ N5 — Difficile"

const texte = `
Feuille de route : ${formatDate(date)} — ${nom}

Nom de la randonnée : ${nom}

📆 Date de la randonnée : ${formatDate(date)}

🌤️ Météo prévue le ${formatDate(date)} (fournie à titre indicatif par open-meteo.com): ${meteo}, ${pluie} ● ${temp} ● ${vent} ● ${raf}

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
