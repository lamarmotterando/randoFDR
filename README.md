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
calcul IBP avec IBPindes
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
1	envoiRando.js	rows non défini → doublon systématique à chaque envoi	✅ Corrigé et confirmé en fonctionnement
2	dynamic-handler.ts	Tri SQL multi-colonnes cassé → mauvaise fiche affichée en cas de doublon	✅ Corrigé et déployé
3	fiche_route.html (goanim)	Dépendait uniquement du tri SQL cassé	✅ Corrigé + filet de sécurité côté client
4	visu_xy.html	Doublons affichés en double sur le site public	✅ Corrigé (dédup côté client)
5	sw.js	Cache figé sur l'ancienne version d'envoiRando.js	✅ CACHE_NAME bumpé
6	index.html	Service Worker ne s'enregistrait jamais (mauvais hostname)	✅ Corrigé à l'instant
7	Base Supabase	Pas de colonne updated_at, pas de contrainte anti-doublon	✅ Colonne + trigger ajoutés
8	Base Supabase	Aucune barrière anti-doublon en base	✅ contrainte UNIQUE ajoutée et testée
