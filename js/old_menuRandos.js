import { randos } from "../data/randos.js";

export function remplirMenu() {

const select = document.getElementById("rando");

if(!select){
console.error("select rando introuvable");
return;
}

select.innerHTML = "";
randos.forEach(r => {

const option = document.createElement("option");

option.value = r;
option.textContent = r;

select.appendChild(option);

});
console.log("Randos chargées :", select.options.length);
}
