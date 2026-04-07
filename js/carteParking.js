import { calculCovoiturage } from "./covoiturage.js"

/* Exposer pour saisie manuelle distanceAR */
window._calculCovoiturage = calculCovoiturage;
import { afficherMeteo } from "./meteoRando.js"

const CHATEAURENARD = [43.88808, 4.84882];

let map
let marker
let routeLine
let pointDepart = CHATEAURENARD

/* ══════════════════════════════════════
   INITIALISATION CARTE
══════════════════════════════════════ */
export function initCarte(){

  map = L.map("map").setView(CHATEAURENARD, 10)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom: 19
  }).addTo(map)

  /* marker TOUJOURS draggable — l'utilisateur positionne librement le parking départ rando */
  marker = L.marker(CHATEAURENARD, { draggable: true }).addTo(map)

  window.coordsParking = ""

  /* NE PAS appeler calculRoute ni afficherMeteo ici :
     latParking / lonParking restent "—" tant que l'utilisateur
     n'a pas explicitement choisi un lieu (recherche ou drag). */

  /* déplacement marker → recalcul route et météo */
  marker.on("dragend", () => {
    const pos = marker.getLatLng()
    calculRoute([pos.lat, pos.lng])
    afficherMeteo(pos.lat, pos.lng)
  })

  /* écouter le select parking covoiturage
     → si "Autre" : géocoder le lieu saisi + repositionner pointDepart
     → si parking connu : pointDepart = Châteaurenard */
  window._majPointDepart = majPointDepart

  const champAutre = document.getElementById("nouveauParking")
  if(champAutre){
    champAutre.addEventListener("keydown", e => {
      if(e.key === "Enter") geocoderParkingAutre(champAutre.value)
    })
    champAutre.addEventListener("blur", () => {
      if(champAutre.value.trim()) geocoderParkingAutre(champAutre.value)
    })
  }
}

/* ══════════════════════════════════════
   MISE À JOUR POINT DE DÉPART COVOIT
══════════════════════════════════════ */
function majPointDepart(valeurSelect) {
  if(valeurSelect === "__autre__"){
    /* le point de départ sera mis à jour par geocoderParkingAutre */
  } else {
    /* parking connu → départ = Châteaurenard */
    pointDepart = CHATEAURENARD
    /* Recalcul route UNIQUEMENT si l'utilisateur a déjà choisi un parking départ rando.
       Évite de remplir latParking automatiquement au chargement / restauration. */
    if(document.getElementById("latParking")?.dataset.userSet === "1"){
      const pos = marker.getLatLng()
      calculRoute([pos.lat, pos.lng])
    }
  }
}

/* geocoder le parking "Autre" saisi manuellement */
function geocoderParkingAutre(texte){
  if(!texte.trim()) return
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texte)}`)
    .then(r => r.json())
    .then(data => {
      if(!data.length) return
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      /* nouveau point de départ covoit */
      pointDepart = [lat, lon]
      /* recalcul route depuis ce nouveau point vers position actuelle marker */
      const pos = marker.getLatLng()
      calculRoute([pos.lat, pos.lng])
    })
}

/* ══════════════════════════════════════
   RECHERCHE LIEU (bouton Localiser)
══════════════════════════════════════ */
export function chercherLieu(){

  const texte = document.getElementById("lieuRecherche").value

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texte)}`)
  .then(r => r.json())
  .then(data => {
    if(!data.length) return

    const lat = parseFloat(data[0].lat)
    const lon = parseFloat(data[0].lon)

    document.getElementById("parkingRandoAdresse").textContent = data[0].display_name

    marker.setLatLng([lat, lon])
    map.setView([lat, lon], 13)

    window.coordsParking = lat + "," + lon

    calculRoute([lat, lon])
    afficherMeteo(lat, lon)
  })
}

/* ══════════════════════════════════════
   REVERSE GEOCODING
══════════════════════════════════════ */
function majAdresse(lat, lon){
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
  .then(r => r.json())
  .then(data => {
    if(!data || !data.display_name) return
    document.getElementById("parkingRandoAdresse").textContent = data.display_name
  })
}

/* ══════════════════════════════════════
   CALCUL ITINÉRAIRE
   Départ = pointDepart (Châteaurenard ou parking Autre)
   Arrivée = dest (marker parking départ rando)
══════════════════════════════════════ */
function calculRoute(dest){

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${pointDepart[1]},${pointDepart[0]};` +
    `${dest[1]},${dest[0]}?overview=full&geometries=geojson`

  fetch(url)
  .then(r => r.json())
  .then(data => {
    if(!data.routes || !data.routes.length) return

    const route = data.routes[0]

    document.getElementById("latParking").textContent = dest[0].toFixed(5)
    document.getElementById("lonParking").textContent = dest[1].toFixed(5)

    window.coordsParking = dest[0].toFixed(5) + "," + dest[1].toFixed(5)
    /* Marquer que le parking a été choisi explicitement par l'utilisateur */
    document.getElementById("latParking").dataset.userSet = "1"

    majAdresse(dest[0], dest[1])

    const distanceKm = route.distance / 1000
    const AR = (distanceKm * 2).toFixed(1)

    const elAR = document.getElementById("distanceAR");
    if (elAR) {
      /* Ne pas écraser si l'utilisateur a saisi manuellement */
      if (!elAR.dataset.manuel) {
        if (elAR.tagName === "INPUT") elAR.value = AR;
        else elAR.textContent = AR;
      }
    }
    calculCovoiturage()

    if(routeLine) map.removeLayer(routeLine)

    routeLine = L.geoJSON(route.geometry,{
      style:{ color:"#e8621a", weight: 4 }
    }).addTo(map)

    map.fitBounds(routeLine.getBounds())
  })
}
