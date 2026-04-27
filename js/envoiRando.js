console.log("envoiRando.js chargé");

import { chartProfil } from "./profilAltitude.js"

const SUPABASE_URL = "https://whlxbfnmyqdflmxosfse.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobHhiZm5teXFkZmxteG9zZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODA5MTksImV4cCI6MjA4ODM1NjkxOX0.vf3sdnJRnnXyIx998fhPSIUPX0WS7KqDbvAwesCzOcE";

export function initEnvoi() {
  const btn = document.getElementById("btnEnvoyer");
  if (!btn) { console.warn("Bouton Envoyer introuvable"); return; }
  btn.addEventListener("click", envoyerRando);
}

/* ══════════════════════════════════════
   POPUP STYLISÉ
══════════════════════════════════════ */
function afficherPopup({ icone, titre, message, couleur = "#c1440e", bouton = "OK", onClose }) {
  document.getElementById("envoi-popup")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "envoi-popup";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(44,26,14,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;";

  const box = document.createElement("div");
  box.style.cssText = "background:white;border-radius:16px;padding:28px 24px;max-width:400px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,0.25);font-family:'Outfit',Arial,sans-serif;text-align:center;";

  const ico = document.createElement("div");
  ico.style.cssText = "font-size:40px;margin-bottom:12px;";
  ico.textContent = icone;
  box.appendChild(ico);

  const tit = document.createElement("div");
  tit.style.cssText = "font-size:18px;font-weight:700;color:"+couleur+";margin-bottom:10px;";
  tit.textContent = titre;
  box.appendChild(tit);

  if (message) {
    const msg = document.createElement("div");
    msg.style.cssText = "font-size:14px;color:#2c1a0e;margin-bottom:20px;line-height:1.5;";
    msg.textContent = message;
    box.appendChild(msg);
  }

  const btn = document.createElement("button");
  btn.textContent = bouton;
  btn.style.cssText = "padding:11px 32px;background:linear-gradient(135deg,#c1440e,#f49d37);color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;font-family:'Outfit',Arial,sans-serif;cursor:pointer;transform:none;box-shadow:none;";
  btn.addEventListener("click", () => { overlay.remove(); onClose && onClose(); });
  box.appendChild(btn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) { overlay.remove(); onClose && onClose(); } });
}

/* ══════════════════════════════════════
   COLLECTE DES DONNÉES
══════════════════════════════════════ */
function collecterFiche(profilPNG) {
  const val = id => document.getElementById(id)?.value?.trim() || "";
  const txt = id => document.getElementById(id)?.textContent?.trim() || "";

  return {
    date_rando:     val("dateRando")             || null,
    nom_rando:      val("nomRando")              || null,
    animateur:      val("animateur")             || null,
    parking_covoit: val("parkingCovoiturage") === "__autre__"
                    ? val("nouveauParking")
                    : val("parkingCovoiturage"),
    heure_rv:       val("heureRV")               || null,
    parking_depart: txt("parkingRandoAdresse")   || null,
    gps:            (() => {
                      const lat = txt("latParking");
                      const lon = txt("lonParking");
                      return (lat && lat !== "—" && lon && lon !== "—") ? lat + "," + lon : null;
                    })(),
    distance:       parseFloat(txt("distanceGPX"))  || parseFloat(val("distanceGPX_manuel"))  || null,
    denivele:       parseInt(txt("denivele"))        || parseInt(val("denivele_manuel"))        || null,
    duree:          txt("dureeMarche")              || val("dureeMarche_manuel")               || null,
    ibp:            parseInt(txt("ibp"))             || null,
    effort:         parseInt(txt("effort"))          || parseInt(val("effort_manuel"))          || null,
    technicite:     parseInt(val("technicite"))      || null,
    risque:         parseInt(val("risque"))           || null,
    couts:          txt("coutTotal")                 || null,
    remarques:      val("remarques")                 || null,
    profil_png:     profilPNG                        || null,
    statut:         "publiée",
  };
}

/* ══════════════════════════════════════
   SAUVEGARDE SUPABASE (indépendante)
══════════════════════════════════════ */
/* ══════════════════════════════════════
   CHERCHER FICHE PRÉVISIONNELLE SUPABASE
   Cherche par date + animateur pour éviter doublon
══════════════════════════════════════ */
async function chercherFicheExistante(date_rando, animateur) {
  if (!date_rando || !animateur) return null;
  try {
    const params = new URLSearchParams({
      select:     "id,nom_rando,animateur,ibp",
      date_rando: "eq." + date_rando,
      order:      "id.asc"
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fiches?${params}`, {
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;

    const normaliser = str => (str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[-_]/g, " ")
      .split(/\s+/).filter(m => m.length > 2);

    const motsAnim = normaliser(animateur);
    console.log("[Supabase] Recherche fiche — date:", date_rando, "| animateur FDR:", animateur, "| mots:", motsAnim);
    console.log("[Supabase] Fiches trouvées ce jour:", rows.map(r => ({ id: r.id, animateur: r.animateur, ibp: r.ibp })));

    // 1) Match animateur
    let found = rows.find(r => {
      const mots = normaliser(r.animateur);
      const match = motsAnim.some(m => mots.includes(m));
      console.log("[Supabase] Comparaison animateur — fiche id:" + r.id, "| supabase:", r.animateur, "| mots:", mots, "| match:", match);
      return match;
    });

    // 2) Fallback : seule fiche du jour sans ibp (= prévisionnelle sans FDR)
    if (!found) {
      const sansFDR = rows.filter(r => !r.ibp);
      console.log("[Supabase] Fallback sans IBP:", sansFDR.map(r => r.id));
      if (sansFDR.length === 1) found = sansFDR[0];
    }

    console.log("[Supabase] Fiche existante trouvée:", found ? found.id : "AUCUNE → POST");
    return found ? found.id : null;
  } catch(e) {
    console.warn("[Supabase] Erreur recherche fiche:", e.message);
    return null;
  }
}

async function sauvegarderFiche(fiche) {
  try {
    const idExistant = await chercherFicheExistante(fiche.date_rando, fiche.animateur);

    if (idExistant) {
      // PATCH — met à jour la fiche prévisionnelle existante
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fiches?id=eq.${idExistant}`, {
        method: "PATCH",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer":        "return=minimal"
        },
        body: JSON.stringify(fiche)
      });
      if (!res.ok) {
        console.warn("[Supabase] Erreur PATCH fiche:", res.status, await res.text());
        return false;
      }
      console.log("[Supabase] Fiche prévisionnelle mise à jour ✅ id:", idExistant);
      return true;
    } else {
      // POST — aucune fiche prévisionnelle, création
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fiches`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer":        "return=minimal"
        },
        body: JSON.stringify(fiche)
      });
      if (!res.ok) {
        console.warn("[Supabase] Erreur POST fiche:", res.status, await res.text());
        return false;
      }
      console.log("[Supabase] Nouvelle fiche créée ✅");
      return true;
    }
  } catch(e) {
    console.warn("[Supabase] Erreur réseau sauvegarde:", e.message);
    return false;
  }
}
/* ══════════════════════════════════════
   ENVOI EMAIL (indépendant)
══════════════════════════════════════ */
async function envoyerEmail(resume, emailUser, profilPNG) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/dynamic-handler`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ resume, emailUser, profilPNG })
      }
    );
    const data = await res.json();
    console.log("[Email] réponse:", data);
    return data.success === true;
  } catch(e) {
    console.warn("[Email] Erreur réseau:", e.message);
    return false;
  }
}

/* ══════════════════════════════════════
   MISE À JOUR GOOGLE CALENDAR
   Met à jour l'événement existant (créé dans planning_gestion)
   en le retrouvant par date — évite le doublon.
══════════════════════════════════════ */
async function mettreAJourCalendar(fiche) {
  const val = id => document.getElementById(id)?.value?.trim() || "";
  const txt = id => document.getElementById(id)?.textContent?.trim() || "";

  // Calcul coût covoit 4 et 5 personnes
  const coutTotalStr = txt("coutTotal").replace(/[^\d.,]/g, "").replace(",", ".");
  const coutTotal    = parseFloat(coutTotalStr) || 0;
  const covoit4      = coutTotal > 0 ? (coutTotal / 4).toFixed(2) + " €" : "";
  const covoit5      = coutTotal > 0 ? (coutTotal / 5).toFixed(2) + " €" : "";

  const ficheCalendar = {
    dateRando:     fiche.date_rando     || "",
    dateRandoOld:  fiche.date_rando     || "",   // même date = recherche de l'event existant
    nomRando:      fiche.nom_rando      || "",
    animateur:     fiche.animateur      || "",
    tel:           "",
    heureRV:       fiche.heure_rv       || "",
    parking:       fiche.parking_covoit || "",
    parkingDepart: fiche.parking_depart || "",
    gps:           fiche.gps            || "",
    distance:      fiche.distance       ? String(fiche.distance) : "",
    denivele:      fiche.denivele       ? String(fiche.denivele) : "",
    duree:         fiche.duree          || "",
    ibp:           fiche.ibp            ? String(fiche.ibp)     : "",
    effort:        fiche.effort         ? String(fiche.effort)  : "",
    technicite:    fiche.technicite     ? String(fiche.technicite) : "",
    risque:        fiche.risque         ? String(fiche.risque)  : "",
    couts:         fiche.couts          || "",
    covoit4,
    covoit5,
    profilUrl:     "",
  };

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/dynamic-handler`,
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ action: "calendarUpdate", fiche: ficheCalendar })
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      console.warn("[Calendar update] Échec:", res.status, JSON.stringify(data));
      return false;
    }
    console.log("[Calendar update] OK ✅");
    return true;
  } catch(e) {
    console.warn("[Calendar update] Erreur réseau:", e.message);
    return false;
  }
}

/* ══════════════════════════════════════
   ENVOI PRINCIPAL
══════════════════════════════════════ */
async function envoyerRando() {
  console.log("envoyerRando déclenché");

  if (window._validerFormulaire && !window._validerFormulaire()) return;

  const resume    = document.getElementById("resumeRando")?.textContent.trim();
  const emailUser = document.getElementById("emailUser")?.value.trim();

  if (!resume) {
    afficherPopup({ icone:"📋", titre:"Résumé manquant", message:"Veuillez générer le résumé avant l'envoi.", bouton:"OK" });
    return;
  }
  if (!emailUser) {
    afficherPopup({ icone:"📧", titre:"Email manquant", message:"Veuillez saisir un email.", bouton:"OK" });
    return;
  }

  const btnEnvoyer = document.getElementById("btnEnvoyer");
  if (btnEnvoyer) { btnEnvoyer.disabled = true; btnEnvoyer.textContent = "⏳ Envoi en cours…"; }

  try {
    /* Récupération du profil */
    let profilPNG = null;
    if (window.profilExportBase64) {
      profilPNG = window.profilExportBase64;
    } else if (chartProfil) {
      profilPNG = chartProfil.toBase64Image();
    }

    /* Collecte unique de la fiche */
    const fiche = collecterFiche(profilPNG);

    /* ── 3 opérations en parallèle :
       1) Email via Edge Function
       2) Mise à jour Calendar (event existant retrouvé par date)
       3) Sauvegarde Supabase ── */
    const [emailOk, calOk, saveOk] = await Promise.all([
      envoyerEmail(resume, emailUser, profilPNG),
      mettreAJourCalendar(fiche),
      sauvegarderFiche(fiche),
    ]);

    console.log("[Résultat] email:", emailOk, "calendar:", calOk, "supabase:", saveOk);

    /* Message selon résultat email + supabase (Google Calendar est best-effort) */
    if (emailOk && saveOk) {
      afficherPopup({
        icone: "✅", titre: "Fiche envoyée !",
        message: calOk
          ? "Email envoyé, fiche archivée et événement Google Calendar mis à jour."
          : "Email envoyé et fiche archivée. (Google Calendar non mis à jour — l'événement sera créé manuellement si absent.)",
        couleur: "#2a7a2a", bouton: "Super !",
        onClose: () => { window._effacerSauvegarde && window._effacerSauvegarde(); }
      });
    } else if (emailOk && !saveOk) {
      afficherPopup({
        icone: "📧", titre: "Email envoyé",
        message: "Email envoyé mais l'archivage dans l'historique a échoué.",
        couleur: "#2a7a2a", bouton: "OK",
        onClose: () => { window._effacerSauvegarde && window._effacerSauvegarde(); }
      });
    } else if (!emailOk && saveOk) {
      afficherPopup({
        icone: "⚠️", titre: "Fiche archivée",
        message: "Fiche sauvegardée dans l'historique mais l'envoi email a échoué. Réessayez l'envoi.",
        couleur: "#856404", bouton: "OK"
      });
    } else {
      afficherPopup({
        icone: "❌", titre: "Erreur",
        message: "L'envoi email et l'archivage ont échoué. Vérifiez votre connexion et réessayez.",
        bouton: "Fermer"
      });
    }

  } catch (err) {
    console.error("Erreur JS :", err);
    afficherPopup({
      icone: "⚠️", titre: "Erreur inattendue",
      message: err.message, bouton: "Fermer"
    });
  } finally {
    if (btnEnvoyer) { btnEnvoyer.disabled = false; btnEnvoyer.textContent = "Envoyer"; }
  }
}
