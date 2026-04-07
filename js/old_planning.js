/* ============================================================
   planning.js — Planning randonnées La Marmotte
   Onglet Nouveau : saisie + envoi
   Onglet Gestion : liste, modifier, annuler depuis Sheets
   ============================================================ */

const BASE           = 'https://dbizcyber.github.io/randoFDR/data/';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzkOcGRb6QvmWYZsll4crnH4Al3sIXhfQHdd0YpR3_sB-X0tdP8lhXSPMMuh74UmJ22ag/exec';

let planning   = [];
let animateurs = [];
let randos     = [];

/* ══ Iframe cachée ══ */
(function() {
  if (!document.getElementById('iframe_hidden')) {
    var iframe = document.createElement('iframe');
    iframe.name = 'iframe_hidden';
    iframe.id   = 'iframe_hidden';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
})();

/* ══ Envoi via formulaire GET (URL params) ══ */
function appelGET(params) {
  return new Promise(function(resolve) {
    var form = document.createElement('form');
    form.method = 'GET';
    form.action = APPS_SCRIPT_URL;
    form.target = 'iframe_hidden';
    form.style.display = 'none';
    Object.keys(params).forEach(function(key) {
      var input = document.createElement('input');
      input.type  = 'hidden';
      input.name  = key;
      input.value = params[key] || '';
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    setTimeout(function() {
      if (form.parentNode) document.body.removeChild(form);
      resolve();
    }, 2500);
  });
}

/* ══ Onglets ══ */
window.switchTab = function(tab) {
  document.querySelectorAll('.tab-btn').forEach(function(b, i) {
    b.classList.toggle('active', (i === 0 && tab === 'nouveau') || (i === 1 && tab === 'gestion'));
  });
  document.getElementById('tab-nouveau').classList.toggle('active', tab === 'nouveau');
  document.getElementById('tab-gestion').classList.toggle('active', tab === 'gestion');
  if (tab === 'gestion') chargerGestion();
};

/* ══ INIT ══ */
async function init() {
  try {
    const [anim, rando] = await Promise.all([
      fetch(BASE + 'animateurs.json').then(r => r.json()),
      fetch(BASE + 'randos.json').then(r => r.json())
    ]);
    animateurs = anim;
    randos     = rando;

    /* Menu animateurs */
    const selAnim = document.getElementById('animateur');
    animateurs.filter(a => a.nom !== '').forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.nom; opt.textContent = a.nom;
      selAnim.appendChild(opt);
    });

    /* Autocomplétion randos */
    const inputRando = document.getElementById('rechercheRando');
    const sugDiv     = document.getElementById('suggestions');
    let nomSelectionne = '';
    let indexSugg = -1;

    inputRando.addEventListener('input', () => {
      const filtre = inputRando.value.toLowerCase().trim();
      sugDiv.innerHTML = ''; nomSelectionne = '';
      if (!filtre) return;
      randos.filter(r => r.toLowerCase().includes(filtre)).slice(0, 10).forEach(r => {
        const div = document.createElement('div');
        div.className = 'suggestion'; div.textContent = r;
        div.addEventListener('click', () => { inputRando.value = r; nomSelectionne = r; sugDiv.innerHTML = ''; });
        sugDiv.appendChild(div);
      });
    });

    inputRando.addEventListener('keydown', e => {
      const items = sugDiv.querySelectorAll('.suggestion');
      if (!items.length) return;
      if (e.key === 'ArrowDown')  { e.preventDefault(); indexSugg = Math.min(indexSugg + 1, items.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); indexSugg = Math.max(indexSugg - 1, 0); }
      else if (e.key === 'Enter' && indexSugg >= 0) { e.preventDefault(); items[indexSugg].click(); indexSugg = -1; return; }
      items.forEach((s, i) => s.classList.toggle('highlight', i === indexSugg));
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-wrap')) sugDiv.innerHTML = '';
    });

    window.ajouterRando = function() {
      const date      = document.getElementById('dateRando').value;
      const animateur = document.getElementById('animateur').value;
      const nom       = nomSelectionne || inputRando.value.trim();
      const ibp       = document.getElementById('ibp').value;
      const distance  = document.getElementById('distance').value;
      const denivele  = document.getElementById('denivele').value;

      if (!date)      { toast('⚠️ Date manquante'); return; }
      if (!animateur) { toast('⚠️ Animateur manquant'); return; }
      if (!nom)       { toast('⚠️ Nom de la rando manquant'); return; }

      planning.push({ date, animateur, nom, ibp, distance, denivele });
      planning.sort((a, b) => a.date.localeCompare(b.date));

      document.getElementById('dateRando').value = '';
      document.getElementById('animateur').value = '';
      document.getElementById('ibp').value = '';
      document.getElementById('distance').value = '';
      document.getElementById('denivele').value = '';
      inputRando.value = ''; nomSelectionne = '';
      document.getElementById('ibpBadge').className = 'ibp-badge';

      const last = new Date(date + 'T12:00:00');
      const dow  = last.getDay();
      const next = new Date(last);
      next.setDate(last.getDate() + (dow === 1 ? 3 : dow === 4 ? 4 : 3));
      document.getElementById('dateRando').value = next.toISOString().split('T')[0];

      renderPlanning();
      toast('✅ Randonnée ajoutée');
    };

  } catch(err) {
    console.error('[Planning] Erreur init:', err);
    toast('❌ Erreur chargement données');
  }
}

/* ══ IBP badge ══ */
document.getElementById('ibp').addEventListener('input', function() { majBadgeIBP(this.value); });

function majBadgeIBP(v) {
  const badge = document.getElementById('ibpBadge');
  const info  = niveauIBP(v);
  if (!info) { badge.className = 'ibp-badge'; return; }
  badge.textContent = info.label;
  badge.style.background = info.bg;
  badge.style.color = info.color;
  badge.className = 'ibp-badge visible';
}

function niveauIBP(v) {
  const n = parseFloat(v);
  if (isNaN(n) || v === '') return null;
  if (n <= 25)  return { label: '🟢 N1 Facile',          bg: '#d4edda', color: '#155724' };
  if (n <= 50)  return { label: '🔵 N2 Assez Facile',    bg: '#cce5ff', color: '#004085' };
  if (n <= 75)  return { label: '🟡 N3 Peu Difficile',   bg: '#fff3cd', color: '#856404' };
  if (n <= 100) return { label: '🔴 N4 Assez Difficile', bg: '#f8d7da', color: '#721c24' };
  return              { label: '⚫ N5 Difficile',         bg: '#343a40', color: '#ffffff' };
}

/* ══ Envoyer une rando ══ */
window.envoyerRando = async function(index) {
  const item = planning[index];
  const btns = document.querySelectorAll('.btn-send');
  const btn  = btns[index];
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    await appelGET(Object.assign({ action: 'add' }, item));
    planning.splice(index, 1);
    renderPlanning();
    toast('✅ Envoyé — Sheets et Calendar mis à jour !');
  } catch(err) {
    toast('❌ Erreur : ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '📤'; }
  }
};

window.envoyerTout = async function() {
  const btn = document.getElementById('btnEnvoyerTout');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Envoi...'; }
  for (const item of [...planning]) {
    await appelGET(Object.assign({ action: 'add' }, item));
    await new Promise(r => setTimeout(r, 500));
  }
  planning = [];
  renderPlanning();
  toast('✅ Tout envoyé !');
};

window.supprimerRando = function(index) { planning.splice(index, 1); renderPlanning(); };

window.viderPlanning = function() {
  if (!confirm('Vider tout le planning ?')) return;
  planning = []; renderPlanning();
};

/* ══ Rendu onglet Nouveau ══ */
function renderPlanning() {
  const list   = document.getElementById('planningList');
  const btnEnv = document.getElementById('btnEnvoyerTout');
  const btnVid = document.getElementById('btnVider');

  if (!planning.length) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🥾</div>Aucune randonnée.<br>Ajoutez-en une ci-dessus.</div>';
    btnEnv.style.display = btnVid.style.display = 'none';
    return;
  }
  btnEnv.style.display = btnVid.style.display = '';

  list.innerHTML = planning.map((item, i) => {
    const ibpInfo = niveauIBP(item.ibp);
    const ibpPill = ibpInfo ? `<span class="ibp-pill" style="background:${ibpInfo.bg};color:${ibpInfo.color}">${ibpInfo.label}</span>` : '';
    const dateStr = item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }) : '—';
    const details = [item.distance ? item.distance + ' km' : '', item.denivele ? '↑' + item.denivele + ' m' : '', (item.animateur.split(' ')[0] + ' ' + (item.animateur.split(' ')[1] || '')).trim()].filter(Boolean).join(' · ');
    return `
      <div class="planning-item">
        <div class="date-badge">${dateStr}</div>
        <div class="infos">
          <div class="nom-rando">${item.nom}</div>
          <div class="details">${details}</div>
          ${ibpPill}
        </div>
        <div class="actions">
          <button class="btn-action btn-send" onclick="envoyerRando(${i})">📤</button>
          <button class="btn-action btn-del"  onclick="supprimerRando(${i})">✕</button>
        </div>
      </div>`;
  }).join('');
}

/* ══ GESTION — charger depuis Sheets ══ */
window.chargerGestion = async function() {
  const list = document.getElementById('gestionList');
  list.innerHTML = '<div class="loader">⏳ Chargement…</div>';
  try {
    const resp = await fetch(APPS_SCRIPT_URL + '?action=list');
    const data = await resp.json();
    if (!data.success || !data.rows.length) {
      list.innerHTML = '<div class="empty-state"><div class="icon">📋</div>Aucun événement trouvé.</div>';
      return;
    }
    renderGestion(data.rows);
  } catch(err) {
    list.innerHTML = '<div class="empty-state">❌ Erreur chargement : ' + err.message + '</div>';
  }
};

function renderGestion(rows) {
  const list = document.getElementById('gestionList');
  list.innerHTML = rows.map(function(row) {
    const ibpInfo = niveauIBP(row.ibp);
    const ibpPill = ibpInfo ? `<span class="ibp-pill" style="background:${ibpInfo.bg};color:${ibpInfo.color}">${ibpInfo.label}</span>` : '';
    const dateStr = row.date ? new Date(row.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }) : '—';
    const statutClass = row.statut === 'sync' ? 'statut-sync' : 'statut-erreur';
    const statutLabel = row.statut === 'sync' ? '✅ sync' : '⚠️ ' + (row.statut || '?');
    return `
      <div class="gestion-item" id="gitem-${row.rowIndex}">
        <div class="gestion-header">
          <div class="date-badge">${dateStr}</div>
          <div style="flex:1;min-width:100px">
            <div class="nom-rando" style="font-weight:700;font-size:12px">${row.nom}</div>
            <div style="color:var(--stone);font-size:10px;margin-top:2px">${row.animateur} · ${row.distance || '?'} km · ↑${row.denivele || '?'} m</div>
            ${ibpPill}
          </div>
          <span class="statut-badge ${statutClass}">${statutLabel}</span>
          <div class="actions" style="display:flex;gap:5px;flex-shrink:0">
            <button class="btn-action btn-edit" onclick="editerItem(${row.rowIndex})">✏️</button>
            <button class="btn-action btn-del"  onclick="supprimerItem(${row.rowIndex}, '${(row.nom || '').replace(/'/g, "\\'")}')">❌</button>
          </div>
        </div>
        <!-- Formulaire édition (masqué) -->
        <div class="gestion-form" id="gform-${row.rowIndex}" style="display:none">
          <div class="gestion-row">
            <div>
              <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--stone);display:block;margin-bottom:4px">Date</label>
              <input class="gestion-input" type="date" id="gedit-date-${row.rowIndex}" value="${row.date}">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--stone);display:block;margin-bottom:4px">Animateur</label>
              <select class="gestion-select" id="gedit-anim-${row.rowIndex}">
                ${animateurs.filter(a => a.nom !== '').map(a => `<option value="${a.nom}" ${a.nom === row.animateur ? 'selected' : ''}>${a.nom}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--stone);display:block;margin-bottom:4px">Nom randonnée</label>
            <input class="gestion-input" type="text" id="gedit-nom-${row.rowIndex}" value="${row.nom}">
          </div>
          <div class="gestion-row-3">
            <div>
              <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--stone);display:block;margin-bottom:4px">IBP</label>
              <input class="gestion-input" type="number" id="gedit-ibp-${row.rowIndex}" value="${row.ibp}">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--stone);display:block;margin-bottom:4px">Distance (km)</label>
              <input class="gestion-input" type="number" id="gedit-dist-${row.rowIndex}" value="${row.distance}">
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--stone);display:block;margin-bottom:4px">Dénivelé (m)</label>
              <input class="gestion-input" type="number" id="gedit-den-${row.rowIndex}" value="${row.denivele}">
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:4px">
            <button class="btn-action btn-save"        onclick="sauvegarderModif(${row.rowIndex})">💾 Sauvegarder</button>
            <button class="btn-action btn-cancel-edit" onclick="annulerEdit(${row.rowIndex})">Annuler</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ══ Éditer un item ══ */
window.editerItem = function(rowIndex) {
  /* Fermer les autres formulaires ouverts */
  document.querySelectorAll('.gestion-form').forEach(function(f) { f.style.display = 'none'; });
  document.querySelectorAll('.gestion-item').forEach(function(i) { i.classList.remove('editing'); });
  /* Ouvrir celui-ci */
  var form = document.getElementById('gform-' + rowIndex);
  var item = document.getElementById('gitem-' + rowIndex);
  if (form) { form.style.display = 'flex'; item.classList.add('editing'); }
};

window.annulerEdit = function(rowIndex) {
  var form = document.getElementById('gform-' + rowIndex);
  var item = document.getElementById('gitem-' + rowIndex);
  if (form) { form.style.display = 'none'; item.classList.remove('editing'); }
};

/* ══ Sauvegarder modification ══ */
window.sauvegarderModif = async function(rowIndex) {
  const date      = document.getElementById('gedit-date-' + rowIndex).value;
  const animateur = document.getElementById('gedit-anim-' + rowIndex).value;
  const nom       = document.getElementById('gedit-nom-'  + rowIndex).value;
  const ibp       = document.getElementById('gedit-ibp-'  + rowIndex).value;
  const distance  = document.getElementById('gedit-dist-' + rowIndex).value;
  const denivele  = document.getElementById('gedit-den-'  + rowIndex).value;

  if (!date || !nom) { toast('⚠️ Date et nom obligatoires'); return; }

  toast('⏳ Mise à jour en cours…');
  await appelGET({ action: 'update', rowIndex, date, animateur, nom, ibp, distance, denivele });
  toast('✅ Mis à jour dans Sheets et Calendar !');
  setTimeout(chargerGestion, 1500);
};

/* ══ Supprimer un item ══ */
window.supprimerItem = async function(rowIndex, nom) {
  if (!confirm('Annuler "' + nom + '" ?\nSera supprimé de Sheets ET de Calendar.')) return;
  toast('⏳ Suppression en cours…');
  await appelGET({ action: 'delete', rowIndex: rowIndex });
  toast('✅ Événement supprimé !');
  setTimeout(chargerGestion, 1500);
};

/* ══ Toast ══ */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══ Date par défaut : prochain lundi ══ */
const d   = new Date();
const dow = d.getDay();
const diff = dow === 0 ? 1 : dow === 1 ? 7 : (8 - dow);
d.setDate(d.getDate() + diff);
document.getElementById('dateRando').value = d.toISOString().split('T')[0];

/* ══ Lancer ══ */
init();
