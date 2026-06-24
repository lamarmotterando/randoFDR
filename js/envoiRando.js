console.log("envoiRando.js chargé");

import { chartProfil } from "./profilAltitude.js"

/* ✅ Clé Supabase supprimée — requêtes via dynamic-handler */

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

    if (!rows.length) return null;

    const normaliser = str => (str || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[-_]/g, " ")
      .split(/\s+/).filter(m => m.length > 2);

    const motsAnim = normaliser(animateur);

    // 1) Match animateur
    let found = rows.find(r => {
      const mots = normaliser(r.animateur);
      const match = motsAnim.some(m => mots.includes(m));
      return match;
    });

    // 2) Fallback : seule fiche du jour sans ibp (= prévisionnelle sans FDR)
    if (!found) {
      const sansFDR = rows.filter(r => !r.ibp);
      if (sansFDR.length === 1) found = sansFDR[0];
    }

    return found ? found.id : null;
  } catch(e) {
    console.warn("[Supabase] Erreur recherche fiche:", e.message);
    return null;
  }
}

const HANDLER    = "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler";
const SEND_EMAIL   = "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/send-email";
const UPDATE_FICHE = "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/update-fiche";
/* ✅ send-email : Edge Function dédiée — l'email animateur est résolu côté serveur */
/* ✅ update-fiche : Edge Function dédiée — champs animateur uniquement, sans auth */

async function callHandler(body) {
  const res = await fetch(HANDLER, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Handler error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function sauvegarderFiche(fiche) {
  try {
    const idExistant = await chercherFicheExistante(fiche.date_rando, fiche.animateur);

    if (idExistant) {
      /* ✅ PATCH — filtrer les valeurs null pour ne pas écraser
         les données prévisionnelles déjà en base
         (ex: heure_rv, itineraire saisis dans planning_gestion) */
      const patch = Object.fromEntries(
        Object.entries(fiche).filter(([, v]) => v !== null && v !== "" && v !== undefined)
      );
      /* Toujours forcer le statut et profil_png même si null */
      patch.statut = fiche.statut || "publiée";
      if (fiche.profil_png) patch.profil_png = fiche.profil_png;

      /* ✅ update-fiche — Edge Function dédiée avec liste blanche des champs */
      const resUpd = await fetch(UPDATE_FICHE, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: idExistant, fiche: patch })
      });
      if (!resUpd.ok) throw new Error("update-fiche HTTP " + resUpd.status);
      console.log("[Supabase] Fiche prévisionnelle mise à jour ✅ id:", idExistant);
      return true;
    } else {
      /* POST — aucune fiche prévisionnelle, création complète */
      await callHandler({ action: "saveFiche", fiche });
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
    /* ✅ send-email — l'email est résolu côté serveur depuis le nom animateur
       emailUser n'est plus transmis au serveur (fin de la faille sendEmail) */
    const nomAnimateur = document.getElementById("animateur")?.value?.trim() || "";
    const res  = await fetch(SEND_EMAIL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ resume, nomAnimateur, profilPNG })
    });
    const data = await res.json();
    console.log("[Email] réponse:", data);
    return data?.success === true;
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
      "https://whlxbfnmyqdflmxosfse.supabase.co/functions/v1/dynamic-handler",
      {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Content-Type":  "application/json"
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
