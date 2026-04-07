import { animateurs } from "../data/animateurs.js";

export function activerRechercheAnimateur(){

const champ = document.getElementById("rechercheAnimateur");
const select = document.getElementById("animateur");

if(!champ) return;

champ.addEventListener("input", () => {

const filtre = champ.value.toLowerCase();

select.innerHTML = "";

animateurs
.filter(a => a.nom.toLowerCase().includes(filtre))
.forEach(a => {

const option = document.createElement("option");
option.value         = a.nom;
option.dataset.email = a.email || "";
option.textContent   = a.nom;

select.appendChild(option);

});

});

}
