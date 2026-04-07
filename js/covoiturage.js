const PRIX_KM = 0.30

/* arrondi à la dizaine de centimes supérieure ex: 3.66 → 3.70 */
function arrondir(val){
  return (Math.ceil(val * 10) / 10).toFixed(2)
}

export function calculCovoiturage(){

const elAR = document.getElementById("distanceAR");
const km = parseFloat(
  elAR ? (elAR.tagName === "INPUT" ? elAR.value : elAR.textContent) : "0"
) || 0

const autoroute =
parseFloat(document.getElementById("autoroute").value) || 0

/* cout km */

const coutKm = km * PRIX_KM

/* total */

const total = coutKm + autoroute

/* partage */

const par4 = total / 4
const par5 = total / 5

/* affichage */

document.getElementById("coutKm").textContent =
arrondir(coutKm) + " €"

document.getElementById("coutTotal").textContent =
arrondir(total) + " €"

document.getElementById("cout4").textContent =
arrondir(par4) + " €"

document.getElementById("cout5").textContent =
arrondir(par5) + " €"

}

window._calculCovoiturage = calculCovoiturage;
