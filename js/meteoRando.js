export async function afficherMeteo(lat, lon){

/* sécurité coordonnées */

if(!lat || !lon){
console.warn("Coordonnées météo manquantes");
return;
}

let date = document.getElementById("dateRando").value

if(!date){

const aujourd = new Date()
date = aujourd.toISOString().split("T")[0]

}

/* appel API */

const url =
`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant&timezone=Europe/Paris`

const rep = await fetch(url)

if(!rep.ok){
console.error("Erreur appel météo");
return;
}

const data = await rep.json()

if(!data.daily){
console.error("Données météo invalides", data);
return;
}

const jours = data.daily.time.map(d => d.split("T")[0]); // sécurité

let i = jours.indexOf(date);

// fallback si la date choisie n'existe pas
if(i === -1){
  console.warn("Date non trouvée dans l'API météo, on prend le premier jour dispo");
  i = 0;
}

/* température */

const tmin = data.daily.temperature_2m_min[i]
const tmax = data.daily.temperature_2m_max[i]

document.getElementById("meteoTemp").textContent =
`${tmin} / ${tmax} °C`

/* météo */

const code = data.daily.weathercode[i]

document.getElementById("meteoEtat").textContent =
decodeMeteo(code)

/* pluie */

const pluie = data.daily.precipitation_probability_max[i]

document.getElementById("meteoPluie").textContent =
`🌧 ${pluie} %`

/* vent */

const vent = data.daily.windspeed_10m_max[i]
const dir = data.daily.winddirection_10m_dominant[i]

document.getElementById("meteoVent").textContent =
`🧭 ${directionVent(dir)} ${vent} km/h`

/* rafales */

const raf = data.daily.windgusts_10m_max[i]

document.getElementById("meteoRafales").textContent =
`💨 ${raf} km/h`

}

/* décodage météo */

function decodeMeteo(code){

if(code===0) return "☀️ Soleil"
if(code===1 || code===2) return "🌤 Peu nuageux"
if(code===3) return "☁️ Couvert"

if(code===45 || code===48) return "🌫 Brouillard"

if(code>=51 && code<=67) return "🌧 Pluie"

if(code>=71 && code<=77) return "❄️ Neige"

if(code>=95) return "⛈ Orage"

return "Conditions variables"

}

/* direction vent */

function directionVent(deg){

const dirs = [
"N","NNE","NE","ENE",
"E","ESE","SE","SSE",
"S","SSO","SO","OSO",
"O","ONO","NO","NNO"
]

const i = Math.round(deg / 22.5) % 16

return dirs[i]

}
