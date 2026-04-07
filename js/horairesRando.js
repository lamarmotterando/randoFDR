export function initHoraires(){

const heureRV = document.getElementById("heureRV")

heureRV.addEventListener("change", calculDepart)

}

function calculDepart(){

const rv = document.getElementById("heureRV").value

if(!rv) return

const [h,m] = rv.split(":").map(Number)

let date = new Date()

date.setHours(h)
date.setMinutes(m + 15)

const hh = String(date.getHours()).padStart(2,"0")
const mm = String(date.getMinutes()).padStart(2,"0")

document.getElementById("heureDepart").textContent =
`${hh}:${mm}`

}
