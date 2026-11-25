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
Les fichiers old_* (archives) ne sont pas décrits.

randoFDR/
├── .github/workflows/tests.yml          # Tests automatiques (GitHub Actions) à chaque commit
├── tests/
│   ├── tests.py                         # Tests de l'application
│   └── controle_site.py                 # Contrôle du site en ligne
├── README.md                            # Ce document
├── PROCEDURE.md                         # Procédures d'exploitation / maintenance
│
├── index.html                           # Formulaire de saisie FDR
├── planningFDR.html                     # Planning des sorties, modification par code, participants
├── planning_gestion.html                # Interface admin (auth Supabase)
├── goanim.html                          # Feuille de route de la prochaine sortie
├── meteo.html                           # Météo au départ (veille, jour J, lendemain)
├── randonnees-club.html                 # Archive des randonnées
├── recherche_rando.html                 # Recherche d'une sortie (nom / animateur)
├── profil.html                          # Profil altimétrique interactif d'une fiche (?id=)
├── carte.html                           # Carte de suivi GPS sur le terrain (tracé GPX, IGN)
├── carteRandos.html                     # Carte des randonnées
├── carte_saison.html                    # Carte des sorties de la saison (1/09 → 31/08)
├── dashboard.html                       # Tableau de bord de la saison
├── journal.html                         # Journal des actions + résultats des tests (admin)
├── status_system.html                   # Statut des services (admin)
├── verifcalendar.html                   # Contrôle fiches ↔ Google Calendar (lecture seule)
├── visusursite_supabase_notif.html      # Visualisation / notifications
├── pres_fdr.html                        # Présentation de l'application
├── diaporama.html                       # Diaporama
├── test_geocodage.html                  # Test du géocodage IGN des fiches sans GPS (lecture seule)
├── randoFDR/carte_saison.html           # ⚠️ Doublon probable de carte_saison.html (à vérifier)
│
├── manifest.json                        # Manifest PWA
├── sw.js                                # Service Worker de DÉSACTIVATION (purge les caches randofdr-v…, puis se désinscrit)
├── sw-carte.js                          # Service Worker de carte.html uniquement
├── rando-analytics.js                   # Statistiques de fréquentation anonymes
│
├── css/
│   ├── style.css                        # Styles du formulaire et des pages
│   └── carteRandos.css                  # Styles de carteRandos.html
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── data/
│   ├── randos.js                        # Liste des randonnées (autocomplétion)
│   ├── randos.json
│   ├── randosCoords.js                  # Coordonnées des randonnées
│   └── parkings.js                      # Parkings de covoiturage
└── js/
    ├── app.js                           # Orchestrateur du formulaire
    ├── envoiRando.js
    ├── formManager.js
    ├── menuAnimateurs.js
    ├── menuParkings.js
    ├── carteParking.js
    ├── covoiturage.js
    ├── gpxAnalyse.js
    ├── gpxManuel.js
    ├── profilAltitude.js
    ├── meteoRando.js
    ├── rechercheRandos.js
    ├── resumeRando.js
    ├── horairesRando.js
    ├── carteRandos.js
    ├── Randoscoordsglobal.js            # Non référencé (voir Maintenance)
    └── lib/leaflet/                     # Leaflet local (leaflet.js, leaflet.css) pour carte.html
## Pages
Page	Rôle	Accès
index.html	Saisie et envoi d'une feuille de route	Membres (Webnode, clé club)
planningFDR.html	Planning des sorties, boutons « Créer / Resync Calendar », modification et participants par code e-mail	Membres (Webnode)
planning_gestion.html	Administration des fiches (création, modification, suppression, séjours)	Auth Supabase (admin)
goanim.html	Feuille de route de la prochaine sortie, boutons Appel/SMS de l'animateur	Membres (Webnode)
meteo.html	Météo au lieu de départ de la prochaine sortie (ou ?rando=<nom>) : veille, jour J, lendemain. Affichée à partir de J-4 (HORIZON_J), jamais sans GPS	Public (Webnode)
randonnees-club.html	Archive des randonnées passées	Membres (Webnode, clé club)
recherche_rando.html	Recherche dans le planning public par nom de rando ou animateur (getFiches)	Public
profil.html	Profil altimétrique d'une fiche (?id=), coloré selon la pente, ou image PNG à défaut	Public
carte.html	Carte de suivi sur le terrain : tracé GPX sur fond IGN, position GPS, distances, altitude, temps estimés	Membres (clé club)
carteRandos.html	Carte interactive des randonnées	Public
carte_saison.html	Carte des sorties de la saison, avec liste, fiches et niveaux IBP	Public
dashboard.html	Tableau de bord : sorties, km, dénivelé, participants, IBP, état des services, fréquentation	Public (clé publishable)
journal.html	Historique des actions sur les fiches + 5 derniers passages des tests GitHub Actions	Auth Supabase (admin)
status_system.html	Supervision : santé des services, métriques, cohérence Google Calendar	Auth Supabase (admin)
verifcalendar.html	Comparaison fiches ↔ événements Google Calendar (lecture seule)	Membres (Webnode)
visusursite_supabase_notif.html	Visualisation / notifications	Membres (Webnode)
pres_fdr.html	Présentation de l'application	Public
diaporama.html	Diaporama	Public
test_geocodage.html	Test du géocodage par commune (API IGN) des fiches sans GPS, sans écriture en base	Outil
Modules JavaScript

js/app.js orchestre le formulaire et importe les modules. Il démarre via demarrer(), lancée tout de suite si le DOM est déjà prêt.

index.html vérifie la version de chaque script (fetch en no-cache) avant d'importer app.js : le formulaire intégré dans Webnode charge toujours la dernière version. Tout nouveau fichier js/ ou data/ importé par app.js doit être ajouté à la liste FICHIERS d'index.html.

## Module	Responsabilité
envoiRando.js	Collecte, rattachement à la fiche du planning (par id), envoi (email + Calendar + Supabase), messages d'envoi
formManager.js	Sauvegarde auto (localStorage), indicateurs de complétude, validation des champs obligatoires
menuAnimateurs.js	Liste des animateurs (Edge Function get-animateurs)
menuParkings.js / carteParking.js	Sélection et géolocalisation des parkings, carte (dont couche satellite), distance A/R
covoiturage.js	Calcul des coûts de covoiturage
gpxAnalyse.js / gpxManuel.js	Analyse de trace GPX ou saisie manuelle (distance, dénivelé, durée, effort)
profilAltitude.js	Profil altimétrique (graphique + PNG)
meteoRando.js	Météo de la sortie (Open-Meteo)
rechercheRandos.js	Autocomplétion des noms de randos
resumeRando.js / horairesRando.js	Résumé texte et calcul des horaires
carteRandos.js	Carte des randonnées (Leaflet, Thunderforest)
rando-analytics.js (racine)	Suivi anonyme : vues, événements, temps de chargement, erreurs JS (RPC analytics_track), sans cookie, désactivé si « ne pas suivre » ou hors HTTPS
Backend Supabase

## Base de données (schéma public) :

fiches — feuilles de route (date, nom, animateur, parkings, GPS, stats, IBP, statut, profil, participants, gcal_event_id…).
animateurs — annuaire (nom, email, téléphone).
fiches_public — vue filtrée de fiches (colonnes publiques uniquement, sans données personnelles).
codes_validation — codes e-mail de modification.
journal — historique des actions (lu par journal.html).

## Edge Functions (Deno) :

## Fonction	Rôle
dynamic-handler	Point d'entrée multi-actions : getFiches, saveFiche, calendarCreate / calendarUpdate / calendarDelete, emailRappel…
get-animateurs	Liste des animateurs (noms) pour les menus
get-animateurs-admin	Annuaire complet des animateurs (admin)
send-email	Email de confirmation d'une FDR (adresse résolue côté serveur), dépôt du profil PNG
update-fiche	Mise à jour d'une fiche (champs animateur)
delete-fiche	Suppression d'une fiche (admin)
update-participants	Saisie du nombre de participants
rappel-participants	Relance email des animateurs (cron quotidien) ; relance manuelle depuis planning_gestion (admin)
confirmation-participants	E-mail de confirmation après saisie des participants (si nombre ou noms changés)
code-modif	Modification d'une fiche par code e-mail : envoyerCode, verifierCode, modifierAvecCode (dont annulation)
profil	Lecture / enregistrement du profil altimétrique interactif (profil_data)
calendar-list	Lecture seule des événements Google Calendar
reconcile-calendar	Réconciliation nocturne fiches → Google Agenda

Le code des Edge Functions et le schéma SQL sont sauvegardés dans un dépôt GitHub privé distinct (Supabase reste la version exécutée). Copie : supabase functions download <nom-de-la-fonction>.

L'accès à Google Calendar se fait via un Service Account (JWT RS256) côté serveur.

## Règles de l'agenda Google
Figurent dans l'agenda : les randonnées et les événements « Autres », sauf les réunions du CA.
N'y figurent pas : les séjours et les CA (visibles uniquement sur le planning du site).
Une fiche « Autres » est un CA si son libellé contient « CA » (mot isolé, majuscules) ou « conseil d'administration ».
```

```

> **Code serveur non versionné dans ce dépôt** : le code des Edge Functions et le schéma SQL résident dans le projet Supabase. Pour en récupérer une copie : `supabase functions download <nom-de-la-fonction>` (Supabase CLI, projet lié). À conserver dans un dépôt **privé** distinct (ex. `supabase/functions/` + migrations SQL), sans aucun secret.

L'accès à Google Calendar se fait via un **Service Account** (JWT RS256) côté serveur.

## Services externes

- **Supabase** — base de données, authentification (admin), Edge Functions.
- **Google Calendar** — agenda du club (création/màj automatiques des sorties).
- **Resend** — envoi des emails (confirmations, relances participants).
- **Open-Meteo** — prévisions météo (sans clé), utilisées par `goanim.html`, `meteo.html` et `planningFDR.html`.
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

## Maintenance

- **Nouvelle table / colonne sensible** : elle est lisible par défaut → prévoir un `REVOKE` ou l'exposer via une vue/fonction filtrée.
- **Nouvelle Edge Function publique** : lister explicitement les colonnes renvoyées, ne jamais faire de `select *` sur une table contenant des données personnelles.
- **Nouvelle action d'écriture** dans `dynamic-handler` : vérifier une authentification (JWT admin ou clé service_role) pour toute action destructrice ou d'envoi.
- **Service Worker** : depuis le 09/10/2026, `sw.js` ne met plus rien en cache (il purge les anciens caches `randofdr-v…` puis se désinscrit) → **plus de `CACHE_NAME` à incrémenter**. Seul `sw-carte.js` (carte de suivi) utilise un cache : incrémenter sa constante `VERSION` si `carte.html` ou `js/lib/leaflet/` change.
- **Fichiers non référencés dans le dépôt** : `css/old_style.css`, `js/Randoscoordsglobal.js`. Vérifier qu'aucune page Webnode ne les charge avant de les supprimer.

---
## Sécurité oct2026

### Lecture publique
- Les pages publiques lisent les fiches via la vue `fiches_public` (`security_invoker`, lecture seule) ou via l'action `getFiches` de `dynamic-handler`, qui n'accepte que des colonnes, filtres et tris en **liste blanche**.
- `noms_participants` n'est jamais lisible publiquement : colonne non accordée à `anon`, et transmise uniquement par `code-modif` après validation du code de l'animateur.
- `animateurs` et `codes_validation` ne sont pas accessibles depuis le navigateur : seules les Edge Functions (clé service) y accèdent.

### Écriture sans connexion
| Accès | Fonctions concernées | Protection |
|---|---|---|
| Formulaire animateur, import CSV participants | `saveFiche`, `calendarUpdate`, `update-fiche`, `send-email`, `profil` (save), `update-participants` | **clé club** |
| Feuille de Route (modification d'une fiche) | `code-modif` | **code e-mail** (6 chiffres, 10 min, un seul code actif, 5 essais, 3 codes maximum par heure et par fiche) |
| Feuille de Route (agenda) | `calendarCreate` / `calendarUpdate` par `id` | contenu relu en base, jamais fourni par le navigateur |
| Relance des participants | `rappel-participants` | en-tête `x-cron-secret` (cron-job.org) |
| Confirmation des participants | `confirmation-participants` | **une seule** confirmation par fiche |

- La **clé club** est transmise par les iframes de l'espace membres Webnode (`…#k=…`) et comparée au secret Supabase `CLE_CLUB`. Le fragment `#` n'est jamais envoyé au serveur.

### Administration
- `planning_gestion.html` utilise Supabase Auth. Les écritures sont contrôlées par RLS (rôle `admin` dans `app_metadata`). `delete-fiche`, `get-animateurs-admin` et `calendarDelete` vérifient le rôle admin côté serveur.
- Les inscriptions publiques sont désactivées.

### Protection contre l'injection de code (XSS)
- Un trigger (`trg_fiches_neutraliser_html`) neutralise à chaque enregistrement, quel que soit le chemin, les caractères `<` `>` `"` `` ` `` des champs texte de `fiches` (remplacés par `‹` `›` `”` `'`).
- `profil_png` n'accepte qu'une URL https ou une image base64 (png, jpeg, webp).
- Les e-mails générés échappent les valeurs insérées.

### Base et stockage
- RLS active sur toutes les tables, et aucun droit inutile pour `anon`.
- Stockage : aucun dépôt anonyme. Les profils PNG sont déposés par `send-email` avec la clé service.

### Clés et comptes
- Seules les **nouvelles clés** sont actives : publishable côté front, `sb_secret_…` côté serveur (`SUPA_SERVICE_ROLE_KEY_NEW`). Les anciennes clés JWT sont désactivées.
- Aucune clé secrète ni la clé club n'existe dans l'historique Git (vérifié en octobre 2026).
- 2FA obligatoire sur les comptes GitHub (dépôts et accès au dashboard Supabase) et sur les comptes Google associés.
- Bibliothèques CDN à **version figée** (`supabase-js@2`, `chart.js@4`, `leaflet@1.9.4`).

### Opérations courantes
- **Rotation de la clé club** : au départ d'un animateur ou une fois par saison. Générer une nouvelle clé (`openssl rand -hex 24`), puis la mettre à jour aux **trois** endroits : le secret Supabase `CLE_CLUB`, l'iframe du formulaire et l'iframe de `randonnees-club`.
- **Mise à jour du front** : `git push` suffit (aucun cache Service Worker à invalider). Si `carte.html` ou Leaflet change, incrémenter `VERSION` dans `sw-carte.js`.
- **Sauvegarde** : dump quotidien de la base (rôles, schéma, données) par GitHub Actions, dans un dépôt **privé** distinct.

### Secrets Supabase (non versionnés)

SUPABASE_URL, SUPA_SERVICE_ROLE_KEY_NEW
CLE_CLUB, CRON_SECRET
GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID
RESEND_API_KEY

*La Marmotte Châteaurenard — [lamarmottechateaurenard.com](https://lamarmottechateaurenard.com)*
### Ajout envoi code auto à partir du mail pour remplir les participants

05 Novembre 2026 — mise à jour documentation
- Règle `CACHE_NAME` retirée (sw.js désactivé depuis le 09/10/2026) ; règle `VERSION` de sw-carte.js ajoutée
- `tools/import_fdr.py` retiré de l'arborescence (absent du dépôt)
- Tableau Edge Functions complété : code-modif, confirmation-participants, profil, get-animateurs-admin
- Note sur le code serveur non versionné et fichiers non référencés

10 Novembre 2026 — page météo Webnode
- Nouvelle page publique `meteo.html` : météo au lieu de départ (GPS de la fiche) pour le jour de la sortie, la veille et le lendemain
- Affichage limité à J-4 (horizon fiable ARPEGE/AROME) ; veille et lendemain affichés seulement dans cet horizon ; rien si GPS absent, sortie annulée ou passée
- Intégration Webnode : `<iframe src="https://lamarmotterando.github.io/randoFDR/meteo.html" style="width:100%;height:400px;border:0;" loading="lazy"></iframe>`
- Manuel d'exploitation et de maintenance passé en v1.3

### Réconciliation Google Agenda (reconcile-calendar)
18 Novembre 2026 - Principe

Supabase (fiches) est la référence. Chaque nuit, l'Edge Function reconcile-calendar compare les fiches à venir avec les événements Google Agenda de la même période. Elle remet ensuite l'agenda en conformité avec la base.

Lancement : cron-job.org, tous les jours à 3 h 30 (Europe/Paris), POST avec l'en-tête x-cron-secret.
Hors agenda (normal) : séjours et réunions du CA.
Événements ajoutés à la main (non étiquetés) : jamais modifiés ni supprimés.
Étiquette

L'« étiquette » est un marqueur invisible posé sur chaque événement géré par RandoFDR, dans les extendedProperties.private de l'événement Google :

Clé	Valeur
randofdr	1
ficheId	id de la fiche Supabase

Côté base, la colonne fiches.gcal_event_id contient l'id de l'événement Google.

L'étiquette relie de façon certaine un événement à sa fiche, sans dépendre du titre ou de l'animateur. Elle ne s'affiche pas dans Google Agenda.

Actions automatiques
Écart constaté	Action
Fiche sans événement, ou événement disparu	Création de l'événement + enregistrement de gcal_event_id
Événement différent de la fiche	Correction de l'événement d'après la fiche
Plusieurs événements pour une même fiche	Un seul est conservé, les autres sont supprimés
Événement étiqueté dont la fiche n'existe plus	Suppression
Événement 🥾 non étiqueté sans fiche correspondante	Aucune action (signalé dans le mail)
Correspondance incertaine	Aucune action (signalée comme ambiguë)
Lire le mail récapitulatif

Le mail n'est envoyé que s'il y a des actions, des cas ambigus, des erreurs ou des événements non rattachés. Chaque passage est aussi enregistré dans journal (visible dans journal.html, action reconcile_calendar).

Rubrique	Signification
❗ Erreurs	Appel Google ou base en échec
➕ Créés	Événements créés depuis une fiche
✏️ Corrigés	Événements mis en conformité. La liste après → indique les champs corrigés (titre, début, fin, lieu, étiquette…)
🗑️ Supprimés	Doublons ou événements dont la fiche a été supprimée
⚠️ Ambigus	Aucune action : à vérifier à la main
ℹ️ Événements 🥾 sans fiche	Aucune action

→ étiquette seul : l'événement était déjà conforme, mais il n'était pas étiqueté. Le passage a seulement posé le marqueur, sans changement visible dans l'agenda.

Si cela arrive une fois pour un événement, c'est un rattachement normal.
Si cela arrive pour chaque nouvelle rando, le circuit de création (envoiRando / dynamic-handler) ne pose pas l'étiquette. La réconciliation compense, mais le code est à corriger.
Si cela arrive plusieurs nuits de suite pour le même événement, l'étiquette est effacée à chaque modification (PATCH/PUT qui écrase extendedProperties). Le code est à corriger.

Les actions au-delà de la limite d'écritures par passage (MAX_ECRITURES) sont reportées au passage suivant.

Lancement manuel

Simulation (aucune écriture, renvoie le plan d'actions) :

bash
curl -X POST "https://<PROJECT_REF>.supabase.cofunctions/v1/reconcile-calendar" -H "x-cron-secret: VOTRE_SECRET" -H "Content-Type: application/json" -d '{"simulation":true}'

Passage réel (réponse "lance": true, résultat dans journal.html et par mail) :

bash
curl -X POST "https://<PROJECT_REF>.supabase.cofunctions/v1/reconcile-calendar" -H "x-cron-secret: VOTRE_SECRET" -H "Content-Type: application/json" -d '{}'

Contrôle : après un passage réel, une simulation doit renvoyer des listes creations, corrections et suppressions vides.
### Correction lissage de la pente sur carte.html
19 Novembre 2026 
La pente est maintenant recalculée sur 100 m de tracé, centrés sur chaque segment. Le changement vaut pour la tuile « pente », pour les couleurs du tracé sur la carte et pour le profil. Il vaut aussi en sens inversé, puisque la pente est recalculée à partir des distances et des altitudes.

### Correction versionning app et index
app.js : démarrage compatible avec un chargement différé

Remplace l'écouteur DOMContentLoaded par une fonction demarrer() lancée tout de suite si le DOM est déjà prêt. Aucun changement de comportement avec l'index.html actuel ; prépare le chargement toujours à jour des scripts (index_test.html).

### planningFDR : boutons de gestion en haut des modales

- Modale détail : Modifier / Resync / Créer dans Calendar placés sous le titre
- Modale modification : Enregistrer / Annuler la rando en haut, fixés au
  défilement, affichés uniquement après validation du code
- Libellé « Annuler » renommé « Annuler la rando »

### FDR : rattachement explicite à la fiche du planning (par id)

L'animateur choisit la fiche à compléter parmi SES randos du jour
(présélectionnée) ou « Nouvelle rando ». Fin de la recherche devinée
par date + nom d'animateur. Confirmation avant doublon, envoi bloqué
si le planning est injoignable. Tests : 10 cas d'envoi.

### journal : encadré « Tests automatiques » (résultats GitHub Actions)

Affiche les 5 derniers passages (date, déclencheur, résultat par étape,
lien). Lecture de l'API publique GitHub, sans clé ni Edge Function.
Tests : 4 vérifications ajoutées.
<img width="868" height="193" alt="image" src="https://github.com/user-attachments/assets/81960776-97e8-4d4f-bfbe-f56f5c627f43" />

# planning_gestion.html — modal de modification en onglets

Date : 23/11/2026
Fichier modifié : `planning_gestion.html` (aucune modification SQL, table `fiches` inchangée)

## Objectif

Rendre modifiables depuis l'admin les champs logistiques d'une fiche (parkings, lieu de départ, GPS, coûts), regroupés dans un onglet dédié du modal « Modifier l'événement ».

## Structure du modal

| Onglet | Contenu | Visible |
|---|---|---|
| 📝 Général | Date, animateur, nom, heure RV, durée, IBP, distance, dénivelé, statut, remarques | Toujours |
| 🚗 Logistique | Parking covoiturage, parking rando (départ), lieu de départ, GPS, coûts | Randonnées uniquement |
| 👥 Participants | Nombre, noms, bouton « Relancer l'animateur » | Rando passée et non annulée |

Le parking covoiturage passe de Général à Logistique.

<img width="1632" height="1372" alt="image" src="https://github.com/user-attachments/assets/10e20ece-e06e-4955-8e96-1ff47a744478" />

## Correspondance champs ↔ colonnes `fiches`

| Champ | id HTML | Colonne |
|---|---|---|
| Parking covoiturage | `edit-parking` | `parking_covoit` |
| Parking rando (départ) | `edit-parking-depart` | `parking_depart` |
| Lieu de départ | `edit-lieu` | `lieu` |
| GPS | `edit-gps` | `gps` |
| Coûts | `edit-couts` | `couts` |

Champ vide → `null` à l'enregistrement.

## Comportements

- **Autocomplétion**
  - Parking covoiturage : liste `data/parkings.js` (parkings de covoiturage uniquement).
  - Parking rando : valeurs `parking_depart` déjà présentes dans les fiches.
- **GPS rempli automatiquement** : quand un parking rando existant est choisi, le GPS est repris de la fiche la plus récente ayant ce parking. La comparaison ignore la casse et les espaces en trop, et exclut la fiche en cours. Un message « GPS repris de la fiche du JJ/MM/AAAA — à vérifier » s'affiche. Un parking nouveau ne modifie pas le GPS.
- **Lien « 📍 Voir sur la carte »** : ouvre OpenStreetMap aux coordonnées du champ GPS (format `lat, lon` ou `lat,lon`). Masqué si le format est invalide.
- **Statut** : toute modification d'une fiche « publiée » la passe en « modifiée », comme avant.
- **Google Calendar** : `calendarUpdate` reçoit désormais les valeurs saisies pour `parkingDepart`, `gps` et `couts`. Avant, il recevait les anciennes valeurs de la fiche.

## Limites connues

- Changer le parking rando ou le GPS **ne recalcule pas les coûts** ni la distance aller-retour. Ces calculs (OSRM + `covoiturage.js`) n'existent que dans le formulaire avec la carte (`carteParking.js`). Un avertissement est affiché dans l'onglet Logistique.
- Changer le lieu de départ ne modifie pas le GPS. Les deux champs sont indépendants.
- `parking_depart` n'est pas exposé dans la vue `fiches_public`. Les pages publiques ne voient donc pas cette valeur.
- Le profil de dénivelé reste modifiable uniquement depuis le formulaire du site.
- Pas de colonne pour les km de trajet en covoiturage : décision de ne pas en créer.

## Détail technique

- Nouvelles fonctions : `switchEditTab(tab)`, `majLienCarteGPS()`, `gpsDepuisParking()`.
- `setupAutocomplete(inputId, listId, getItems, onSelect)` : 4e paramètre optionnel, appelé à la sélection d'une suggestion.
- L'affichage des participants n'est plus déduit du `display` de la section mais de `edit-sectionParticipants.dataset.actif` (`"1"` / `"0"`), utilisé par `saveEdit`.
- Si `sw.js` met cette page en cache : incrémenter `CACHE_NAME`.

## Recette

1. Ouvrir une rando à venir → onglet Logistique.
2. Choisir un parking rando déjà utilisé : le GPS se remplit et le message s'affiche.
3. Cliquer sur « Voir sur la carte » : le repère est au bon endroit.
4. Enregistrer, puis vérifier la ligne dans Supabase (`fiches`) et l'événement dans Google Calendar.
5. Ouvrir un séjour et un « Autres » : l'onglet Logistique est absent.
6. Ouvrir une rando passée non annulée : l'onglet Participants est présent et l'enregistrement des noms fonctionne.

# planning_gestion.html — onglets du modal et allègement du chargement

Date : 23/11/2026
Fichier modifié : `planning_gestion.html`
Base de données : aucune modification SQL, table `fiches` inchangée.

---

## 1. Modal « Modifier l'événement » en onglets

### Objectif

Rendre modifiables depuis l'admin les champs logistiques d'une fiche (parkings, lieu de départ, GPS, coûts), regroupés dans un onglet dédié.

### Structure

| Onglet | Contenu | Visible |
|---|---|---|
| 📝 Général | Date, animateur, nom, heure RV, durée, IBP, distance, dénivelé, statut, remarques | Toujours |
| 🚗 Logistique | Parking covoiturage, parking rando (départ), lieu de départ, GPS, coûts | Randonnées uniquement |
| 👥 Participants | Nombre, noms, bouton « Relancer l'animateur » | Rando passée et non annulée |

Le parking covoiturage passe de l'onglet Général à l'onglet Logistique.

### Correspondance champs ↔ colonnes `fiches`

| Champ | id HTML | Colonne |
|---|---|---|
| Parking covoiturage | `edit-parking` | `parking_covoit` |
| Parking rando (départ) | `edit-parking-depart` | `parking_depart` |
| Lieu de départ | `edit-lieu` | `lieu` |
| GPS | `edit-gps` | `gps` |
| Coûts | `edit-couts` | `couts` |

Champ vide → `null` à l'enregistrement.

### Comportements

- **Autocomplétion**
  - Parking covoiturage : liste `data/parkings.js` (parkings de covoiturage uniquement, sans coordonnées).
  - Parking rando : valeurs `parking_depart` déjà présentes dans les fiches.
- **GPS rempli automatiquement** : quand un parking rando existant est choisi, le GPS est repris de la fiche la plus récente ayant ce parking. La comparaison ignore la casse et les espaces en trop, et exclut la fiche en cours. Un message « GPS repris de la fiche du JJ/MM/AAAA — à vérifier » s'affiche. Un parking nouveau ne modifie pas le GPS.
- **Lien « 📍 Voir sur la carte »** : ouvre OpenStreetMap aux coordonnées du champ GPS (format `lat, lon` ou `lat,lon`). Masqué si le format est invalide. Aucune modification de la Content-Security-Policy.
- **Statut** : toute modification d'une fiche « publiée » la passe en « modifiée », comme avant.
- **Google Calendar** : `calendarUpdate` reçoit désormais les valeurs saisies pour `parkingDepart`, `gps` et `couts`. Avant, il recevait les anciennes valeurs de la fiche.

### Limites connues

- Changer le parking rando ou le GPS **ne recalcule pas les coûts** ni la distance aller-retour. Ces calculs (OSRM + `covoiturage.js`) n'existent que dans le formulaire avec la carte (`carteParking.js`). Un avertissement est affiché dans l'onglet Logistique.
- Le GPS correspond au marqueur du parking rando posé sur la carte du formulaire. Changer le lieu de départ ne modifie pas le GPS : les deux champs sont indépendants.
- `parking_depart` n'est pas exposé dans la vue `fiches_public`. Les pages publiques ne voient donc pas cette valeur.
- Le profil de dénivelé reste modifiable uniquement depuis le formulaire du site.
- Pas de colonne pour les km de trajet en covoiturage : décision de ne pas en créer.

---

## 2. Allègement de `loadEvents()` (egress Supabase)

### Constat

| Colonne | Volume total (320 fiches) |
|---|---|
| `profil_png` | 2 246 Ko (images en base64 dans la table) |
| `profil_data` | 62 Ko |
| `remarques` | 11 Ko |
| Total table | 2 383 Ko |

`profil_png` représente environ 94 % du volume. `loadEvents()` faisait `select=*` à chaque chargement de la page et après chaque création, modification ou suppression, alors que la page n'utilise pas cette colonne.

### Modification

`select=*` est remplacé par la liste des 26 colonnes lues par la page :

```
id, created_at, updated_at, type, statut, date_rando, date_fin_sejour, sejour_id,
nom_rando, animateur, heure_rv, parking_covoit, parking_depart, lieu, gps,
distance, denivele, duree, ibp, effort, technicite, risque, couts, remarques,
nb_participants, noms_participants
```

Colonnes exclues : `profil_png`, `profil_data`, `itineraire`, `rappel_envoye`, `confirmation_envoyee_at`, `gcal_event_id`.

⚠️ Une future fonctionnalité qui lit une autre colonne doit l'ajouter à `COLS` dans `loadEvents()`. Sinon la valeur arrive vide, sans message d'erreur.

### Test réalisé (23/11/2026, console, session admin)

| Requête | Statut | Taille | Fiches |
|---|---|---|---|
| `select=*` | 200 | 2 602 Ko | 320 |
| `select=COLS` | 200 | 198 Ko | 320 |

Résultat : chargement **13 fois plus léger**, même nombre de fiches, toutes les colonnes valides.

### Piste suivante

`profil_png` est aussi exposé par la vue `fiches_public`. Une page publique qui lit cette vue avec `select=*` télécharge environ 2,2 Mo à chaque visite.
- Solution simple : sélectionner seulement les colonnes affichées dans chaque page publique.
- Solution de fond : stocker les images dans Supabase Storage et ne garder que l'URL dans `profil_png`. Cela demande de modifier le formulaire et de migrer les fiches existantes.

---

## 3. Détail technique

- Nouvelles fonctions : `switchEditTab(tab)`, `majLienCarteGPS()`, `gpsDepuisParking()`.
- `setupAutocomplete(inputId, listId, getItems, onSelect)` : 4e paramètre optionnel, appelé à la sélection d'une suggestion.
- L'affichage des participants n'est plus déduit du `display` de la section mais de `edit-sectionParticipants.dataset.actif` (`"1"` / `"0"`), utilisé par `saveEdit`.
- Si `sw.js` met cette page en cache : incrémenter `CACHE_NAME`.

---

## 4. Mise en production

1. Publier le fichier sous le nom `planning_gestion_test.html` dans le repo `randoFDR`.
2. Ouvrir `https://lamarmotterando.github.io/randoFDR/planning_gestion_test.html` et se connecter en admin.
3. Recette, sur une rando fictive « TEST onglets » à une date lointaine, car la base et Google Calendar sont les vrais :
   - [ ] Dans l'onglet Réseau (F12), la requête `fiches?select=id,...` pèse environ 200 Ko et répond 200.
   - [ ] Le tableau, le calendrier, la recherche et les séjours dépliables s'affichent comme avant.
   - [ ] Onglet Logistique : choisir un parking rando déjà utilisé remplit le GPS et affiche le message.
   - [ ] Le lien « Voir sur la carte » ouvre le bon endroit.
   - [ ] L'enregistrement est visible dans Supabase (`fiches`) et dans Google Calendar.
   - [ ] Séjour et « Autres » : l'onglet Logistique est absent.
   - [ ] Rando passée non annulée : l'onglet Participants est présent et l'enregistrement des noms fonctionne.
   - [ ] Supprimer la rando de test (case à cocher) : la fiche et l'événement Calendar sont supprimés.
4. Remplacer `planning_gestion.html` par la version testée, puis supprimer `planning_gestion_test.html`.

### Modification index.html (24/11/26)
Reset : la fenêtre de confirmation s'ouvre en haut, juste sous la barre du bouton, et non plus au milieu de la page. Annuler la ferme correctement.

Champs manquants : le message s'affiche juste sous le bloc Envoi, dans le flux de la page et non plus centré. « OK, je complète » le fait disparaître. Il se replace au même endroit à chaque nouvel envoi.

## Ajout Affichage informatif des sorties /mois
<img width="1320" height="1016" alt="Screenshot 2026-11-25 at 10-21-41 LA MARMOTTE DE CHATEAURENARD" src="https://github.com/user-attachments/assets/743323d1-1cb4-42e3-ba90-60beb5ec21da" />
