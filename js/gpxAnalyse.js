export function initGPX(){

const input = document.getElementById("gpxFile")

if(!input) return

input.addEventListener("change", analyserGPX)

}

function analyserGPX(event){

const file = event.target.files[0]

if(!file) return

/* 
Le traitement GPX est géré par profilAltitude.js
Ce module sert seulement à déclencher l'analyse
*/

console.log("GPX chargé :", file.name)

}
