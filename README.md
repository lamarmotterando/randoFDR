Rando FDR est un système de création d'informations précises pour préparer un randonnée pédestre. cela permet à, l'utilisateur, de grouper toutes les informations
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
