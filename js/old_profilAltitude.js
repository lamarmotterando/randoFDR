export let chartProfil

/* ── Dimensions fixes pour l'export (identiques sur toutes plateformes) ── */
const EXPORT_W = 1200
const EXPORT_H = 450

export function initProfilGPX(){
  document.getElementById("gpxFile").addEventListener("change", lireGPX)
}

/* recalcul simulation si paramètres changent */
document.getElementById("vitesse").addEventListener("input", recalculSimulation)
document.getElementById("heureDepartMarche").addEventListener("input", recalculSimulation)

function recalculSimulation(){
  const dist = parseFloat(document.getElementById("distanceGPX").textContent)
  if(dist) calculSimulation(dist)
}

async function lireGPX(event){
  const file = event.target.files[0]
  if(!file) return

  calculIBP(file)

  const text = await file.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(text,"text/xml")
  const points = [...xml.getElementsByTagName("trkpt")]

  let distances=[], altitudes=[], slopes=[], totalDist=0, totalDplus=0
  let tDebut=null, tFin=null  // timestamps GPX pour durée exacte

  for(let i=1;i<points.length;i++){
    const lat1=parseFloat(points[i-1].getAttribute("lat"))
    const lon1=parseFloat(points[i-1].getAttribute("lon"))
    const lat2=parseFloat(points[i].getAttribute("lat"))
    const lon2=parseFloat(points[i].getAttribute("lon"))
    const e1 = points[i-1].getElementsByTagName("ele")[0]
    const e2 = points[i].getElementsByTagName("ele")[0]
    if(!e1 || !e2) continue
    const ele1 = parseFloat(e1.textContent)
    const ele2 = parseFloat(e2.textContent)
    const dist = haversine(lat1,lon1,lat2,lon2)
    totalDist += dist
    /* Cumul dénivelé positif */
    if(ele2 - ele1 > 0) totalDplus += (ele2 - ele1)
    if(dist===0) continue
    const pente = ((ele2-ele1)/(dist*1000))*100
    distances.push(totalDist)
    altitudes.push(ele2)
    slopes.push(pente)
  }

  /* Timestamps GPX : lire premier et dernier point */
  const allPts = Array.from(points)
  const t0el = allPts[0]?.getElementsByTagName("time")?.[0]
  const tNel = allPts[allPts.length-1]?.getElementsByTagName("time")?.[0]
  if(t0el && tNel) {
    tDebut = new Date(t0el.textContent)
    tFin   = new Date(tNel.textContent)
  }

  /* sous-échantillonnage uniforme 300 pts */
  const { d, a, s } = souséchantillonner(distances, altitudes, slopes, 300)

  /* 1. Affichage interactif Chart.js */
  dessinerChartJS(d, a, s)

  /* 2. Canvas export fixe hors-écran */
  dessinerCanvasExport(d, a, s)

  calculDuree(totalDist, totalDplus, tDebut, tFin)
  calculSimulation(totalDist, totalDplus)
}

/* ══════════════════════════════════════════
   AFFICHAGE INTERACTIF — Chart.js
   (responsive, s'adapte à l'écran)
══════════════════════════════════════════ */
function dessinerChartJS(dist, alt, slopes){
  const ctx = document.getElementById("profilAltitude")
  const colors = slopes.map(p => couleurPente(p))

  if(chartProfil) chartProfil.destroy()

  const label = buildLabel()

  chartProfil = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [{
        label,
        data: alt.map((a,i) => ({ x: dist[i], y: a })),
        borderColor: "black",
        borderWidth: 2,
        segment: { borderColor: ctx => colors[ctx.p0DataIndex] },
        pointRadius: 0,
        tension: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: {
          display: true,
          labels: { color:"#2c1a0e", font:{ size:13, weight:"600" }, boxWidth:0, padding:16 }
        },
        tooltip: {
          callbacks: {
            label: function(ctx){
              const distance = ctx.raw.x
              const altitude = ctx.raw.y
              const pente    = slopes[ctx.dataIndex].toFixed(1)
              const vitesse  = parseFloat(document.getElementById("vitesse").value)
              const hDep     = document.getElementById("heureDepartMarche").value
              let heurePoint = ""
              if(vitesse && hDep){
                const temps = distance / vitesse
                const h = Math.floor(temps), m = Math.round((temps-h)*60)
                const [hh, mm] = hDep.split(":").map(Number)
                let hP = hh+h, mP = mm+m
                if(mP>=60){ mP-=60; hP++ }
                if(hP>=24) hP-=24
                heurePoint = ` | heure ${hP}h${String(mP).padStart(2,"0")}`
              }
              return `Altitude ${altitude} m | Dist ${distance.toFixed(2)} km | pente ${pente}%${heurePoint}`
            }
          }
        }
      },
      scales: {
        x: { type:"linear", title:{ display:true, text:"Distance (km)" } },
        y: { title:{ display:true, text:"Altitude (m)" } }
      }
    },
    plugins: [{
      id: "fondBlanc",
      beforeDraw(chart){
        const c = chart.canvas.getContext("2d")
        c.save()
        c.globalCompositeOperation = "destination-over"
        c.fillStyle = "white"
        c.fillRect(0, 0, chart.width, chart.height)
        c.restore()
      }
    }]
  })

  window.chartProfil = chartProfil
}

/* ══════════════════════════════════════════
   CANVAS EXPORT FIXE 1200×450 hors-écran
   Taille et rendu IDENTIQUES sur tous appareils
══════════════════════════════════════════ */
function dessinerCanvasExport(dist, alt, slopes){
  const W = EXPORT_W, H = EXPORT_H
  const PAD = { top:50, right:30, bottom:55, left:65 }

  const canvas = document.createElement("canvas")
  canvas.width  = W
  canvas.height = H
  const c = canvas.getContext("2d")

  /* fond blanc */
  c.fillStyle = "white"
  c.fillRect(0, 0, W, H)

  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top  - PAD.bottom

  const minAlt = Math.min(...alt)
  const maxAlt = Math.max(...alt)
  const maxDist = dist[dist.length - 1]

  /* helpers de projection */
  const px = d => PAD.left + (d / maxDist) * plotW
  const py = a => PAD.top  + plotH - ((a - minAlt) / (maxAlt - minAlt || 1)) * plotH

  /* grille légère */
  c.strokeStyle = "#e8e8e8"
  c.lineWidth = 1
  for(let i=0; i<=5; i++){
    const y = PAD.top + (plotH / 5) * i
    c.beginPath(); c.moveTo(PAD.left, y); c.lineTo(PAD.left + plotW, y); c.stroke()
  }
  for(let i=0; i<=7; i++){
    const x = PAD.left + (plotW / 7) * i
    c.beginPath(); c.moveTo(x, PAD.top); c.lineTo(x, PAD.top + plotH); c.stroke()
  }

  /* courbe colorée segment par segment */
  c.lineWidth = 2.5
  for(let i=1; i<dist.length; i++){
    c.strokeStyle = couleurPente(slopes[i-1])
    c.beginPath()
    c.moveTo(px(dist[i-1]), py(alt[i-1]))
    c.lineTo(px(dist[i]),   py(alt[i]))
    c.stroke()
  }

  /* axes */
  c.strokeStyle = "#555"
  c.lineWidth = 1.5
  c.beginPath()
  c.moveTo(PAD.left, PAD.top)
  c.lineTo(PAD.left, PAD.top + plotH)
  c.lineTo(PAD.left + plotW, PAD.top + plotH)
  c.stroke()

  /* labels X */
  c.fillStyle = "#555"
  c.font = "14px Arial"
  c.textAlign = "center"
  const nbTicksX = Math.min(8, Math.floor(maxDist))
  for(let i=0; i<=nbTicksX; i++){
    const d = (maxDist / nbTicksX) * i
    c.fillText(d.toFixed(1), px(d), PAD.top + plotH + 20)
  }
  c.fillText("Distance (km)", PAD.left + plotW/2, H - 8)

  /* labels Y */
  c.textAlign = "right"
  for(let i=0; i<=5; i++){
    const a = minAlt + ((maxAlt - minAlt) / 5) * (5 - i)
    const y = PAD.top + (plotH / 5) * i
    c.fillText(Math.round(a), PAD.left - 8, y + 5)
  }

  /* titre Y */
  c.save()
  c.translate(16, PAD.top + plotH/2)
  c.rotate(-Math.PI/2)
  c.textAlign = "center"
  c.fillText("Altitude (m)", 0, 0)
  c.restore()

  /* légende titre */
  const label = buildLabel()
  c.fillStyle = "#7c2d00"
  c.font = "bold 15px Arial"
  c.textAlign = "center"
  c.fillText(label, W/2, 28)

  /* stocker l'image export dans window pour l'envoi email */
  window.profilExportBase64 = canvas.toDataURL("image/png")
}

/* ══════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════ */
function buildLabel(){
  const nom  = document.getElementById("nomRando")?.value?.trim()  || "Randonnée"
  const date = document.getElementById("dateRando")?.value?.trim() || ""
  const anim = document.getElementById("animateur")?.value?.trim() || ""
  const animOk = (anim === "" || anim === "Cliquez!") ? "" : anim
  const dateStr = date ? new Date(date).toLocaleDateString("fr-FR") : ""
  return [nom, dateStr, animOk].filter(Boolean).join("  •  ")
}

function souséchantillonner(dist, alt, slopes, max){
  const n = dist.length
  if(n <= max) return { d: dist, a: alt, s: slopes }
  const d=[], a=[], s=[]
  for(let i=0; i<max; i++){
    const idx = Math.round(i * (n-1) / (max-1))
    d.push(dist[idx]); a.push(alt[idx]); s.push(slopes[idx])
  }
  return { d, a, s }
}

function haversine(lat1,lon1,lat2,lon2){
  const R=6371
  const dLat=(lat2-lat1)*Math.PI/180
  const dLon=(lon2-lon1)*Math.PI/180
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

async function calculIBP(file){
  const formData = new FormData()
  formData.append("file", file)
  const status = document.getElementById("gpx-status")
  if(status){ status.style.display="block"; status.textContent="⏳ Analyse GPX en cours…" }
  try {
    const rep  = await fetch("https://ibp-proxy.vercel.app/api/ibp",{ method:"POST", body:formData })
    const data = JSON.parse(await rep.text())
    exploiterIBP(data)
    window.gpxImporte = true
    if(status) status.textContent = "✅ GPX analysé avec succès"
  } catch(e) {
    if(status) status.textContent = "⚠️ Erreur analyse IBP"
  }
}

let ibpAccuclimb = 0  // D+ lissé retourné par l'API IBP

function exploiterIBP(data){
  if(!data || !data.hiking) return
  const hike = data.hiking
  document.getElementById("distanceGPX").textContent = hike.totlengthkm
  document.getElementById("denivele").textContent    = hike.accuclimb
  document.getElementById("ibp").textContent         = hike.ibp
  ibpAccuclimb = parseFloat(hike.accuclimb) || 0  // stocker D+ lissé IBP
  calculEffort(hike.ibp)
}

function calculDuree(distanceKm, dplus=0, tDebut=null, tFin=null){
  let h, m
  if(tDebut && tFin && !isNaN(tDebut) && !isNaN(tFin) && tFin > tDebut) {
    /* Durée exacte depuis les timestamps GPX — même résultat qu'IBPindex */
    const dureeMin = (tFin - tDebut) / 60000
    h = Math.floor(dureeMin / 60)
    m = Math.round(dureeMin % 60)
  } else {
    /* Fallback Naismith si pas de timestamps
       Priorité : D+ lissé IBP (plus précis) sinon D+ brut GPX */
    const vitesse = parseFloat(document.getElementById("vitesse").value)
    if(!vitesse) return
    const dplusNaismith = ibpAccuclimb > 0 ? ibpAccuclimb : dplus
    const heures = (distanceKm / vitesse) + (dplusNaismith / 300)
    h = Math.floor(heures)
    m = Math.round((heures - h) * 60)
  }
  document.getElementById("dureeMarche").textContent=`${h}h${String(m).padStart(2,'0')}`
}

function calculSimulation(distanceKm, dplus=0){
  const vitesse    = parseFloat(document.getElementById("vitesse").value)
  const heureDepart = document.getElementById("heureDepartMarche").value
  if(!vitesse || !heureDepart) return
  /* Formule Naismith : durée = distance/vitesse + D+/300m par heure */
  const heures = (distanceKm / vitesse) + (dplus / 300)
  const h=Math.floor(heures), m=Math.round((heures-h)*60)
  const [hh,mm]=heureDepart.split(":").map(Number)
  let hA=hh+h, mA=mm+m
  if(mA>=60){ mA-=60; hA++ }
  if(hA>=24) hA-=24
  document.getElementById("dureeMarcheSim").textContent=`Durée marche : ${h}h${m}`
  document.getElementById("heureArriveeSim").textContent=`Arrivée estimée : ${hA}h${String(mA).padStart(2,"0")}`
}

function calculEffort(ibp){
  let e="5"
  if(ibp<25) e="1"
  else if(ibp<50) e="2"
  else if(ibp<75) e="3"
  else if(ibp<100) e="4"
  document.getElementById("effort").textContent=e
}

function couleurPente(p){
  if(p>=20) return "rgb(200,0,0)"
  if(p>=15) return "rgb(255,80,0)"
  if(p>=10) return "rgb(255,150,0)"
  if(p>=5)  return "rgb(255,200,0)"
  if(p>-5)  return "rgb(255,220,0)"
  if(p>-10) return "rgb(150,200,255)"
  if(p>-15) return "rgb(80,150,255)"
  if(p>-20) return "rgb(40,100,255)"
  return "rgb(0,60,200)"
}
