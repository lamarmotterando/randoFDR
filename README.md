Rando FDR est un système de création d'informations précises pour préparer une randonnée pédestre. cela permet à, l'utilisateur, de grouper toutes les informations
de logistique sur les difficultés de la rando. 
En même temps il informe tous les participants éventuels de toutes les caractéristiques logistiques, technique du sentier proposé.
date
heure de RV
parking covoiturage
trajet jusqu'au parking de départ randonnée
cout du co voiturage; /4 et / 5
courbe du profil altimétrique avec % de pentes + et -
distance rando
dénivelé +
durée en marche
calcul IBP avec IBPindex
effort, technicité et risque sur des échelles de 1 à 5
remarques sur la rando: tourisme , difficulté spécifique
coordonnées animateur/trice
Last modif/ 14 avril 26 @ 15h00 (planning_gestion.html)
20 avril modif planning gestion:  Flux complet :

La rando est insérée dans Supabase (fiches)
syncCalendar("calendarCreate", {...}) est appelé — il envoie un POST à dynamic-handler
Le handler génère un token Google via le Service Account (JWT RS256), puis crée l'événement sur Google Calendar avec events.insert
L'événement Calendar reçoit : titre 🥾 Nom, date, animateur, parking covoiturage, distance, dénivelé, IBP + couleur automatique selon niveau IBP

Les champs optionnels comme heureRV, gps, parkingDepart, duree, tel, covoit4/5 restent vides à la création depuis ce formulaire — ils seront remplis plus tard via le bouton Modifier qui fait appel à calendarUpdate.
*******************
Migration nouvelle clé Supabase 24 juin 2026
*******************
21 Aout 2026
Récapitulatif final de toute la série de correctifs
#	Fichier	Bug corrigé	Statut
1	envoiRando.js	rows non défini → doublon systématique à chaque envoi	  ✅ Corrigé et confirmé en fonctionnement

2	dynamic-handler.ts	Tri SQL multi-colonnes cassé → mauvaise fiche affichée en cas de doublon	✅ Corrigé et déployé

3	fiche_route.html (goanim)	Dépendait uniquement du tri SQL cassé	✅ Corrigé + filet de sécurité côté client

4	visu_xy.html	Doublons affichés en double sur le site public	✅ Corrigé (dédup côté client)

5	sw.js	Cache figé sur l'ancienne version d'envoiRando.js	✅ CACHE_NAME bumpé

6	index.html	Service Worker ne s'enregistrait jamais (mauvais hostname)	✅ Corrigé 

7	Base Supabase	Pas de colonne updated_at, pas de contrainte anti-doublon	✅ Colonne + trigger ajoutés

8	Base Supabase	Aucune barrière anti-doublon en base	✅ contrainte UNIQUE ajoutée et testée

**********************
02 Septembre 2026
#	Fichier	Bug corrigé	Statut
Sécurité : restriction des accès en lecture Supabase (RLS + Edge Function)

fiches : accès direct anon révoqué, lecture publique via nouvelle vue filtrée `fiches_public` (colonnes personnelles exclues)
  
Animateurs : lecture directe anon/authenticated révoquée (accès uniquement via l'Edge Function get-animateurs)

get-animateurs : ne renvoie plus que le nom (colonne email retirée)

randonnees-club.html : lecture repointée vers fiches_public
  
menuAnimateurs.js : suppression de l'auto-remplissage email devenu inutile

Écritures inchangées (toujours via Edge Functions en service_role).
Interface admin (planning_gestion.html) inchangée : rôle authenticated
conserve l'accès complet à la table fiches.
**********************
2 Septembre 2026 
#	Fichier	Bug corrigé	Statut
Durcissement des accès en lecture
#   Zone            Correctif                                             Statut
1   Supabase RLS    fiches : REVOKE anon + vue publique fiches_public     ✅ appliqué et vérifié

2   Supabase RLS    animateurs : REVOKE anon/authenticated                ✅ appliqué et vérifié

3   Edge Function   get-animateurs : .select("nom") (email retiré)        ✅ déployé et vérifié

4   randonnees-club lecture repointée vers fiches_public                  ✅ déployé

5   menuAnimateurs  nettoyage auto-remplissage email                      ✅ déployé
******************************************************************************************
******************************************************************************************
******************************************************************************************
# randoFDR — Feuille de route randonnées maj le 4/9/26

Application web de **planification et de gestion des feuilles de route (FDR)** du club de randonnée **La Marmotte Châteaurenard**.

Elle permet aux animateurs de saisir une fiche de sortie, la publie automatiquement (base de données, agenda Google, email de confirmation), l'affiche sur le site du club, et assure le suivi des participants.

- **Front** : pages statiques HTML/CSS/JS (ES modules), hébergées sur **GitHub Pages** et intégrées au site Webnode du club.
- **Back** : **Supabase** (PostgreSQL + Edge Functions Deno).
- **Services** : Google Calendar (agenda du club), Resend (emails), Open-Meteo (météo), IBP (indice de difficulté), Thunderforest (fond de carte).

---

## Sommaire

- [Fonctionnement général](#fonctionnement-général)
- [Arborescence](#arborescence)
- [Pages](#pages)
- [Modules JavaScript](#modules-javascript)
- [Backend Supabase](#backend-supabase)
- [Services externes](#services-externes)
- [Modèle de sécurité](#modèle-de-sécurité)
- [Déploiement](#déploiement)
- [Maintenance](#maintenance)

---

## Fonctionnement général

Le cycle de vie d'une randonnée :

1. **Saisie** — l'animateur remplit le formulaire (`index.html`) : nom, date, parkings, GPS, distance/dénivelé/durée, profil altimétrique, coûts de covoiturage, etc.
2. **Publication** — à l'envoi, trois opérations en parallèle :
   - enregistrement de la fiche dans Supabase (table `fiches`) ;
   - envoi d'un email de confirmation à l'animateur (adresse **résolue côté serveur** à partir de son nom) ;
   - création / mise à jour de l'événement dans **Google Calendar** (couleur selon l'IBP).
3. **Diffusion** — les randos publiées apparaissent sur les pages publiques (planning, feuille de route, archive, carte).
4. **Suivi** — le lendemain d'une sortie, une tâche planifiée relance l'animateur par email pour saisir le **nombre de participants**.

---

## Arborescence

```
randoFDR/
├── index.html                      # Formulaire de saisie FDR
├── planningFDR.html                # Planning + synchro Google Calendar
├── planning_gestion.html           # Interface admin (auth Supabase)
├── goanim.html                     # Feuille de route affichée (prochaine sortie)
├── randonnees-club.html            # Archive des randonnées (vue publique)
├── carteRandos.html                # Carte des randonnées (Leaflet)
├── visusursite_supabase_notif.html # Visualisation / notifications
├── status_system.html              # Page de statut système (admin)
├── verifcalendar.html              # Outil de contrôle Google Calendar
├── manifest.json                   # Manifest PWA
├── sw.js                           # Service Worker (cache PWA)
├── css/                            # Feuilles de style
├── icons/                          # Icônes PWA
├── data/                           # Données statiques (randos, coords, parkings)
├── js/                             # Modules applicatifs (voir plus bas)
└── tools/
    └── import_fdr.py               # Import des anciennes FDR (.docx/.odt/.pdf) → Supabase
```

## Pages

| Page | Rôle | Accès |
|---|---|---|
| `index.html` | Saisie et envoi d'une feuille de route | Membres (Webnode) |
| `planningFDR.html` | Planning des sorties + boutons « Créer / Resync Calendar » | Membres (Webnode) |
| `planning_gestion.html` | Administration des fiches (création, modification, suppression, séjours) | **Auth Supabase (admin)** |
| `goanim.html` | Feuille de route de la prochaine sortie, avec boutons Appel/SMS de l'animateur | Membres (Webnode) |
| `randonnees-club.html` | Archive des randonnées passées | Membres (Webnode) |
| `carteRandos.html` | Carte interactive des randonnées | Public |
| `status_system.html` | Supervision : santé des services, métriques, cohérence Google Calendar | **Auth Supabase (admin)** |
| `verifcalendar.html` | Comparaison fiches ↔ événements Google Calendar (lecture seule) | Membres (Webnode) |

## Modules JavaScript

`js/app.js` orchestre le formulaire et importe les modules :

| Module | Responsabilité |
|---|---|
| `envoiRando.js` | Collecte, envoi (email + Calendar + Supabase), gestion des doublons |
| `formManager.js` | Sauvegarde auto (localStorage), indicateurs de complétude, validation |
| `menuAnimateurs.js` | Liste déroulante des animateurs (via Edge Function `get-animateurs`) |
| `menuParkings.js` / `carteParking.js` | Sélection et géolocalisation des parkings |
| `covoiturage.js` | Calcul des coûts de covoiturage |
| `gpxAnalyse.js` / `gpxManuel.js` | Analyse de traces GPX (distance, dénivelé) |
| `profilAltitude.js` | Génération du profil altimétrique (PNG) |
| `meteoRando.js` | Météo de la sortie (Open-Meteo) |
| `rechercheRandos.js` | Autocomplétion des noms de randos (Supabase) |
| `resumeRando.js` / `horairesRando.js` | Résumé texte et calcul des horaires |
| `carteRandos.js` / `Randoscoordsglobal.js` | Carte des randonnées (Leaflet) |

## Backend Supabase

**Base de données** (schéma `public`) :
- `fiches` — les feuilles de route (date, nom, animateur, parkings, GPS, stats, IBP, statut, profil, participants…).
- `animateurs` — annuaire des animateurs (nom, email, téléphone).
- `fiches_public` — **vue filtrée** de `fiches`, exposant uniquement les colonnes destinées à l'affichage public (sans données personnelles).

**Edge Functions** (Deno) :

| Fonction | Rôle |
|---|---|
| `dynamic-handler` | Point d'entrée multi-actions : `getFiches`, `saveFiche`, synchro Google Calendar (`calendarCreate` / `calendarUpdate` / `calendarDelete`), `emailRappel`… |
| `get-animateurs` | Liste des animateurs (noms) pour les menus |
| `send-email` | Email de confirmation d'une FDR (adresse animateur résolue côté serveur) |
| `update-fiche` | Mise à jour d'une fiche (champs animateur) |
| `delete-fiche` | Suppression d'une fiche (**réservée admin**) |
| `update-participants` | Saisie du nombre de participants |
| `calendar-list` | Lecture seule des événements Google Calendar (pour l'outil de contrôle) |
| `rappel-participants` | Tâche planifiée : relance email des animateurs (cron quotidien) |

L'accès à Google Calendar se fait via un **Service Account** (JWT RS256) côté serveur.

## Services externes

- **Supabase** — base de données, authentification (admin), Edge Functions.
- **Google Calendar** — agenda du club (création/màj automatiques des sorties).
- **Resend** — envoi des emails (confirmations, relances participants).
- **Open-Meteo** — prévisions météo (sans clé).
- **IBP** (proxy Vercel) — calcul de l'indice de difficulté.
- **Thunderforest** — fond de carte topographique (clé requise, à réinjecter dans `js/carteRandos.js`).
- **cron-job.org** — déclencheur quotidien de la relance participants.

## Modèle de sécurité

Le front étant statique, la **clé Supabase publishable** est publique par conception (comme prévu par Supabase). La protection des données ne repose donc **pas** sur le secret de cette clé, mais sur la configuration serveur :

- **Lecture** — l'accès direct anonyme aux tables contenant des données personnelles est révoqué (`REVOKE`). Les lectures publiques passent par la **vue filtrée `fiches_public`** ou par des **Edge Functions** qui ne renvoient que les colonnes nécessaires.
- **Écriture** — aucune écriture directe anonyme sur les tables ; tout passe par des Edge Functions en `service_role`.
- **Actions sensibles** — la suppression de fiches et d'événements Calendar exige une **session admin authentifiée** (JWT Supabase) ; la relance email est réservée aux appels internes de la tâche planifiée.
- **Clés secrètes** — la clé `service_role`, le Service Account Google et la clé Resend restent **côté serveur** (secrets Supabase), jamais dans le code front.

> Les secrets ne doivent jamais être commités dans ce dépôt. Ils sont configurés dans **Supabase → Project Settings → Edge Functions → Secrets**.

## Déploiement

**Front (GitHub Pages)** — un `git push` sur la branche publiée met à jour le site. Les pages sont servies sous `https://lamarmotterando.github.io/randoFDR/` et intégrées au site Webnode via iframe.

**Edge Functions (Supabase CLI)** :
```bash
supabase functions deploy <nom-de-la-fonction>
# ex. : supabase functions deploy dynamic-handler
```
Les fonctions publiques appelées sans jeton (ex. `get-animateurs`, `calendar-list`) sont déployées avec `--no-verify-jwt`.

**Secrets Supabase requis** (non versionnés) :
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID
RESEND_API_KEY
CRON_SECRET
```

## Maintenance

- **Nouvelle table / colonne sensible** : elle est lisible par défaut → prévoir un `REVOKE` ou l'exposer via une vue/fonction filtrée.
- **Nouvelle Edge Function publique** : lister explicitement les colonnes renvoyées, ne jamais faire de `select *` sur une table contenant des données personnelles.
- **Nouvelle action d'écriture** dans `dynamic-handler` : vérifier une authentification (JWT admin ou clé service_role) pour toute action destructrice ou d'envoi.
- **Service Worker** (`sw.js`) : penser à incrémenter le nom de cache (`CACHE_NAME`) à chaque changement d'un fichier mis en cache, sinon les navigateurs servent l'ancienne version.

---

*La Marmotte Châteaurenard — [lamarmottechateaurenard.com](https://lamarmottechateaurenard.com)*
