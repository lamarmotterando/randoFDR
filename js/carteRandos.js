/* carteRandos.js — script classique (pas de module ES)
   Les données viennent de window.randosCoords (randosCoordsGlobal.js) */

(function() {

var randosCoords = window.randosCoords || [];

var TF_KEY = '0ffff5950d8a4019bcede9aaeeecb57f';

/* ══ INIT CARTE ══ */
var map = L.map('map', { center: [43.9, 5.0], zoom: 9 });

/* ── Fond Thunderforest Outdoors ── */
L.tileLayer(
  'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=' + TF_KEY,
  {
    maxZoom: 22,
    attribution: '© <a href="https://www.thunderforest.com">Thunderforest</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }
).addTo(map);

/* ── Layer sentiers hiking (Waymarked Trails) ── */
var layerSentiers = L.tileLayer(
  'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
  {
    maxZoom: 22,
    opacity: 0.8,
    attribution: '© <a href="https://hiking.waymarkedtrails.org">Waymarked Trails</a>'
  }
);
var sentiersActifs = false;

/* ══ CLUSTERS ══ */
var clusterKnown    = L.markerClusterGroup({ chunkedLoading: true });
var clusterAuto     = L.markerClusterGroup({ chunkedLoading: true });
var clusterNotFound = L.markerClusterGroup({ chunkedLoading: true });

/* ══ ICÔNES ══ */
function makeIcon(color) {
  return L.divIcon({
    html: '<div style="background:' + color + ';width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
}

var iconKnown    = makeIcon('#1978c8');
var iconAuto     = makeIcon('#28a745');
var iconNotFound = makeIcon('#d9534f');

/* ══ AJOUT MARKER ══ */
function ajouterMarker(item, cluster, icon, geocoded) {
  var badge = geocoded
    ? '<br><span style="font-size:10px;background:#fff3cd;color:#856404;padding:1px 5px;border-radius:4px">géocodé auto</span>'
    : '';
  var coords = '<br><span style="font-size:11px;color:#888">'
    + item.lat.toFixed(5) + ', ' + item.lon.toFixed(5) + '</span>';

  var marker = L.marker([item.lat, item.lon], { icon: icon });
  marker.bindPopup('<strong>' + item.nom + '</strong>' + coords + badge);
  marker.bindTooltip(item.nom, {
    permanent: true,
    direction: 'right',
    offset: [8, 0],
    className: 'label-rando'
  });
  marker.addTo(cluster);
}

/* ══ STATS ══ */
var nbTotal    = randosCoords.length;
var nbOk       = 0;
var nbGeocoded = 0;
var nbNok      = 0;

function majStats() {
  document.getElementById('stat-total').textContent    = nbTotal;
  document.getElementById('stat-ok').textContent       = nbOk;
  document.getElementById('stat-geocoded').textContent = nbGeocoded;
  document.getElementById('stat-nok').textContent      = nbNok;
}

/* ══ ÉTIQUETTES selon zoom ══ */
var ZOOM_LABELS = 11;

function majLabels() {
  var afficher = map.getZoom() >= ZOOM_LABELS;
  document.querySelectorAll('.label-rando').forEach(function(el) {
    el.style.display = afficher ? '' : 'none';
  });
}

map.on('zoomend', majLabels);

/* ══ STYLES BOUTONS ══ */
function styleBtnOn() {
  return [
    'width:100%', 'padding:6px 10px',
    'background:linear-gradient(135deg,#c1440e,#f49d37)',
    'color:white', 'border:none', 'border-radius:6px',
    'font-size:12px', 'font-weight:700',
    'font-family:Arial,sans-serif', 'cursor:pointer', 'text-align:left'
  ].join(';');
}

function styleBtnOff() {
  return [
    'width:100%', 'padding:6px 10px',
    'background:#f0ece4', 'color:#5a4a3a',
    'border:1px solid #d8cfc4', 'border-radius:6px',
    'font-size:12px', 'font-weight:700',
    'font-family:Arial,sans-serif', 'cursor:pointer', 'text-align:left'
  ].join(';');
}

/* ══ CONTRÔLE PERSONNALISÉ ══ */
var ControlToggle = L.Control.extend({
  options: { position: 'topright' },

  onAdd: function() {
    var div = L.DomUtil.create('div', 'ctrl-toggle');
    div.style.cssText = [
      'background:white', 'border-radius:10px', 'padding:8px 12px',
      'box-shadow:0 2px 8px rgba(0,0,0,0.18)',
      'font-family:Arial,sans-serif', 'font-size:13px',
      'display:flex', 'flex-direction:column', 'gap:8px', 'min-width:165px'
    ].join(';');

    /* Bouton Sentiers */
    var btnSentiers = document.createElement('button');
    btnSentiers.textContent = '🥾 Sentiers : OFF';
    btnSentiers.style.cssText = styleBtnOff();
    btnSentiers.addEventListener('click', function(e) {
      L.DomEvent.stopPropagation(e);
      sentiersActifs = !sentiersActifs;
      if (sentiersActifs) {
        layerSentiers.addTo(map);
        btnSentiers.textContent = '🥾 Sentiers : ON';
        btnSentiers.style.cssText = styleBtnOn();
      } else {
        map.removeLayer(layerSentiers);
        btnSentiers.textContent = '🥾 Sentiers : OFF';
        btnSentiers.style.cssText = styleBtnOff();
      }
    });

    /* Bouton Légende */
    var btnLegende = document.createElement('button');
    btnLegende.textContent = '📋 Légende : ON';
    btnLegende.style.cssText = styleBtnOn();
    btnLegende.addEventListener('click', function(e) {
      L.DomEvent.stopPropagation(e);
      var panel = document.querySelector('.stats-panel');
      if (!panel) return;
      var visible = panel.style.display !== 'none';
      panel.style.display = visible ? 'none' : '';
      btnLegende.textContent = visible ? '📋 Légende : OFF' : '📋 Légende : ON';
      btnLegende.style.cssText = visible ? styleBtnOff() : styleBtnOn();
    });

    div.appendChild(btnSentiers);
    div.appendChild(btnLegende);

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  }
});

map.whenReady(function() { new ControlToggle().addTo(map); });

/* ══ TRAITEMENT : coords connues ══ */
var connus    = randosCoords.filter(function(r) { return r.lat !== null; });
var aGeocoder = randosCoords.filter(function(r) { return r.lat === null; });
var bounds    = [];

connus.forEach(function(r) {
  ajouterMarker(r, clusterKnown, iconKnown, false);
  bounds.push([r.lat, r.lon]);
  nbOk++;
});

clusterKnown.addTo(map);
clusterAuto.addTo(map);
clusterNotFound.addTo(map);

if (bounds.length > 0) {
  map.fitBounds(bounds, { padding: [20, 20] });
}

majStats();
majLabels();

/* ══ GÉOCODAGE automatique ══ */
function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function geocoder(nom) {
  var q = encodeURIComponent(nom + ', Provence, France');
  var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + q;
  return fetch(url, { headers: { 'Accept-Language': 'fr' } })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.length) {
        return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) };
      }
      return null;
    })
    .catch(function() { return null; });
}

async function lancerGeocodage() {
  if (aGeocoder.length === 0) return;

  var bar  = document.getElementById('geocode-bar');
  var msg  = document.getElementById('geocode-msg');
  var fill = document.getElementById('progress-fill');
  bar.style.display = 'block';

  for (var i = 0; i < aGeocoder.length; i++) {
    var r = aGeocoder[i];
    msg.textContent = '⏳ ' + (i + 1) + ' / ' + aGeocoder.length + ' — ' + r.nom;
    fill.style.width = Math.round((i + 1) / aGeocoder.length * 100) + '%';

    var result = await geocoder(r.nom);
    if (result) {
      r.lat = result.lat; r.lon = result.lon;
      ajouterMarker(r, clusterAuto, iconAuto, true);
      nbGeocoded++;
    } else {
      nbNok++;
      var jLat = 43.5 + Math.random() * 0.8;
      var jLon = 4.5  + Math.random() * 1.5;
      L.marker([jLat, jLon], { icon: iconNotFound })
        .bindPopup('<strong>' + r.nom + '</strong><br><em style="color:#d9534f">Non localisé</em>')
        .addTo(clusterNotFound);
    }
    majStats();
    majLabels();
    await sleep(1100);
  }

  bar.style.display = 'none';
}

lancerGeocodage();

/* ══ TRACE GPX depuis sessionStorage ══ */
var gpxLayers  = [];
var gpxMarkers = [];
var traceVisible = false;
var btnTrace = null;

function couleurPente(p) {
  if(p>=20) return "rgb(200,0,0)";
  if(p>=15) return "rgb(255,80,0)";
  if(p>=10) return "rgb(255,150,0)";
  if(p>=5)  return "rgb(255,200,0)";
  if(p>-5)  return "rgb(255,220,0)";
  if(p>-10) return "rgb(150,200,255)";
  if(p>-15) return "rgb(80,150,255)";
  if(p>-20) return "rgb(40,100,255)";
  return "rgb(0,60,200)";
}

function afficherTrace(pts) {
  for(var i = 1; i < pts.length; i++) {
    var seg = L.polyline(
      [[pts[i-1].lat, pts[i-1].lon], [pts[i].lat, pts[i].lon]],
      { color: couleurPente(pts[i].pente), weight: 4, opacity: 0.85 }
    ).addTo(map);
    gpxLayers.push(seg);
  }
  /* Marqueur départ */
  var mkD = L.circleMarker([pts[0].lat, pts[0].lon], {
    radius: 8, fillColor: '#28a745', fillOpacity: 1, color: 'white', weight: 2
  }).bindTooltip('🏁 Départ').addTo(map);
  gpxMarkers.push(mkD);
  /* Marqueur arrivée */
  var last = pts[pts.length - 1];
  var mkA = L.circleMarker([last.lat, last.lon], {
    radius: 8, fillColor: '#d9534f', fillOpacity: 1, color: 'white', weight: 2
  }).bindTooltip('🏁 Arrivée').addTo(map);
  gpxMarkers.push(mkA);
  /* Zoom sur la trace */
  var bounds = L.latLngBounds(pts.map(function(p){ return [p.lat, p.lon]; }));
  map.fitBounds(bounds, { padding: [30, 30] });
  traceVisible = true;
}

function effacerTrace() {
  gpxLayers.forEach(function(l){ map.removeLayer(l); });
  gpxLayers = [];
  gpxMarkers.forEach(function(m){ map.removeLayer(m); });
  gpxMarkers = [];
  traceVisible = false;
}

function styleBtnTraceOn() {
  if(!btnTrace) return;
  btnTrace.textContent = '🗺 Trace GPX : ON';
  btnTrace.style.background = 'linear-gradient(135deg,#c1440e,#f49d37)';
  btnTrace.style.color = 'white';
  btnTrace.style.border = 'none';
}

function styleBtnTraceOff() {
  if(!btnTrace) return;
  btnTrace.textContent = '🗺 Trace GPX';
  btnTrace.style.background = '#f5ead8';
  btnTrace.style.color = '#5a4a3a';
  btnTrace.style.border = '1.5px solid #d8cfc4';
}

/* Lire sessionStorage et créer le bouton si trace disponible */
(function initTrace() {
  var raw = null;
  try { raw = sessionStorage.getItem('gpxTrace'); } catch(e) {}
  if(!raw) return;

  var pts;
  try { pts = JSON.parse(raw); } catch(e) { return; }
  if(!pts || pts.length < 2) return;

  /* Créer le bouton dans le contrôle toggle existant */
  var ctrl = document.querySelector('.ctrl-toggle');
  if(!ctrl) {
    /* Fallback : créer un contrôle simple */
    ctrl = document.createElement('div');
    ctrl.style.cssText = 'position:absolute;z-index:900;top:70px;right:10px;background:white;border-radius:10px;padding:8px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.18);';
    document.getElementById('map').appendChild(ctrl);
  }

  btnTrace = document.createElement('button');
  btnTrace.textContent = '🗺 Trace GPX';
  btnTrace.style.cssText = [
    'width:100%', 'padding:6px 10px',
    'background:#f5ead8', 'color:#5a4a3a',
    'border:1.5px solid #d8cfc4', 'border-radius:6px',
    'font-size:12px', 'font-weight:700',
    'font-family:Arial,sans-serif', 'cursor:pointer', 'text-align:left'
  ].join(';');

  btnTrace.addEventListener('click', function(e) {
    if(typeof L !== 'undefined' && L.DomEvent) L.DomEvent.stopPropagation(e);
    if(traceVisible) {
      effacerTrace();
      styleBtnTraceOff();
    } else {
      afficherTrace(pts);
      styleBtnTraceOn();
    }
  });

  ctrl.appendChild(btnTrace);
})();

})();
