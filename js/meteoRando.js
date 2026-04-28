/* ============================================================
   meteoRando.js
   API Météo-France via Open-Meteo (ARPEGE + AROME)
   - J0→J2 : AROME 1.3 km (très haute résolution, France)
   - J2→J4 : ARPEGE (5 km Europe)
   - Au-delà de J+4 : prévisions indicatives seulement
   ============================================================ */

export async function afficherMeteo(lat, lon) {

  /* sécurité coordonnées */
  if (!lat || !lon) {
    console.warn("Coordonnées météo manquantes");
    return;
  }

  let date = document.getElementById("dateRando").value;

  if (!date) {
    const aujourd = new Date();
    date = aujourd.toISOString().split("T")[0];
  }

  /* ── Calcul du nombre de jours depuis aujourd'hui ── */
  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  const dateRando = new Date(date + "T00:00:00");
  const diffMs    = dateRando - today;
  const diffJours = Math.round(diffMs / (1000 * 60 * 60 * 24));

  /* ── Mise à jour du titre de la carte météo ── */
  const adresse = document.getElementById("parkingRandoAdresse")?.textContent?.trim();
  const titrEl  = document.getElementById("meteoTitre");
  if (titrEl) {
    if (adresse && adresse !== "—" && adresse !== "") {
      /* Raccourcir l'adresse : garder les 2 premiers segments */
      const segments = adresse.split(",").map(s => s.trim()).filter(Boolean);
      const courte   = segments.slice(0, 2).join(", ");
      titrEl.textContent = `🌤 Météo — ${courte}`;
    } else {
      titrEl.textContent = "🌤 Météo prévue (position approchée)";
    }
  }

  /* ── Appel API Météo-France Open-Meteo ── */
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&models=meteofrance` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,` +
    `precipitation_probability_max,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant` +
    `&timezone=Europe%2FParis&forecast_days=7`;

  let data;
  try {
    const rep = await fetch(url);
    if (!rep.ok) {
      console.error("Erreur appel météo Météo-France:", rep.status);
      _afficherErreurMeteo("Erreur de connexion à l'API météo.");
      return;
    }
    data = await rep.json();
  } catch (e) {
    console.error("Erreur fetch météo:", e);
    _afficherErreurMeteo("Impossible de récupérer la météo.");
    return;
  }

  if (!data.daily) {
    console.error("Données météo invalides", data);
    _afficherErreurMeteo("Données météo invalides.");
    return;
  }

  const jours = data.daily.time.map(d => d.split("T")[0]);

  let i = jours.indexOf(date);

  /* fallback si la date choisie n'existe pas dans l'API */
  if (i === -1) {
    console.warn("Date non trouvée dans l'API météo, on prend le premier jour dispo");
    i = 0;
  }

  /* ── Température ── */
  const tmin = data.daily.temperature_2m_min[i];
  const tmax = data.daily.temperature_2m_max[i];
  document.getElementById("meteoTemp").textContent = `${tmin} / ${tmax} °C`;

  /* ── État météo ── */
  const code = data.daily.weathercode[i];
  document.getElementById("meteoEtat").textContent = decodeMeteo(code);

  /* ── Pluie ── */
  const pluie = data.daily.precipitation_probability_max[i];
  document.getElementById("meteoPluie").textContent = `🌧 ${pluie} %`;

  /* ── Vent ── */
  const vent = data.daily.windspeed_10m_max[i];
  const dir  = data.daily.winddirection_10m_dominant[i];
  document.getElementById("meteoVent").textContent =
    `🧭 ${directionVent(dir)} ${vent} km/h`;

  /* ── Rafales ── */
  const raf = data.daily.windgusts_10m_max[i];
  document.getElementById("meteoRafales").textContent = `💨 ${raf} km/h`;

  /* ── Bandeau fiabilité ── */
  _afficherFiabilite(diffJours);
}

/* ── Bandeau fiabilité selon l'horizon ── */
function _afficherFiabilite(diffJours) {
  const el = document.getElementById("meteoFiabilite");
  if (!el) return;

  if (diffJours < 0) {
    el.style.display = "block";
    el.style.background = "#f5f5f5";
    el.style.color = "#888";
    el.style.border = "1px solid #ddd";
    el.innerHTML = "📅 Cette date est dans le passé — données indicatives uniquement.";
    return;
  }

  if (diffJours <= 2) {
    /* J0–J2 : AROME haute résolution */
    el.style.display = "block";
    el.style.background = "#e8f5e9";
    el.style.color = "#2e7d32";
    el.style.border = "1px solid #a5d6a7";
    el.innerHTML =
      "✅ <strong>Prévision fiable</strong> — modèle AROME 1,3 km " +
      "(Météo-France, haute résolution France)";
  } else if (diffJours <= 4) {
    /* J2–J4 : ARPEGE */
    el.style.display = "block";
    el.style.background = "#fff8e1";
    el.style.color = "#f57f17";
    el.style.border = "1px solid #ffe082";
    el.innerHTML =
      "🟡 <strong>Prévision bonne</strong> — modèle ARPEGE 5 km " +
      "(Météo-France, J+" + diffJours + "). Précision correcte pour les tendances générales.";
  } else {
    /* Au-delà de J+4 */
    el.style.display = "block";
    el.style.background = "#fce4ec";
    el.style.color = "#c62828";
    el.style.border = "1px solid #ef9a9a";
    el.innerHTML =
      "⚠️ <strong>Prévision indicative</strong> — J+" + diffJours +
      " dépasse l'horizon fiable d'ARPEGE/AROME (4 jours). " +
      "À utiliser avec prudence, revenez vérifier à l'approche de la date.";
  }
}

/* ── Affichage d'une erreur dans la section météo ── */
function _afficherErreurMeteo(msg) {
  ["meteoEtat","meteoTemp","meteoPluie","meteoVent","meteoRafales"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });
  const el = document.getElementById("meteoFiabilite");
  if (el) {
    el.style.display = "block";
    el.style.background = "#fce4ec";
    el.style.color = "#c62828";
    el.style.border = "1px solid #ef9a9a";
    el.innerHTML = "❌ " + msg;
  }
}

/* ── Décodage code météo WMO ── */
function decodeMeteo(code) {
  if (code === 0)               return "☀️ Soleil";
  if (code === 1 || code === 2) return "🌤 Peu nuageux";
  if (code === 3)               return "☁️ Couvert";
  if (code === 45 || code === 48) return "🌫 Brouillard";
  if (code >= 51 && code <= 67) return "🌧 Pluie";
  if (code >= 71 && code <= 77) return "❄️ Neige";
  if (code >= 95)               return "⛈ Orage";
  return "Conditions variables";
}

/* ── Direction du vent ── */
function directionVent(deg) {
  const dirs = [
    "N","NNE","NE","ENE",
    "E","ESE","SE","SSE",
    "S","SSO","SO","OSO",
    "O","ONO","NO","NNO"
  ];
  const i = Math.round(deg / 22.5) % 16;
  return dirs[i];
}
