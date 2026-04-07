import { randos } from "./randos.js";

const select = document.getElementById("nom");

randos.forEach(r => {

const option = document.createElement("option");

option.value = r;
option.textContent = r;

select.appendChild(option);

});
