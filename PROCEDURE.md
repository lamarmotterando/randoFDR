# Procédure RandoFDR — tester, mettre en ligne, réparer

Fiche à suivre sans aide extérieure. Les tests automatiques tournent chez GitHub,
gratuitement, sans abonnement.

---

## 1. Ce qui tourne tout seul

| Quand | Quoi | Où voir le résultat |
|---|---|---|
| À chaque commit **et chaque lundi matin** | `tests/tests.py` : 41 vérifications avec de fausses données (aucun effet réel) | Onglet **Actions** du dépôt : ✅ ou ❌ |
| À chaque commit **et chaque lundi matin** | `tests/controle_site.py` : contrôle du site **réel**, en lecture seule (rien n'est écrit, aucun mail, aucun agenda) | Onglet **Actions** |

En cas de ❌, **GitHub envoie un mail** à l'adresse du compte.

**Voir les résultats sans aller sur GitHub** : `journal.html` (connexion admin) affiche en haut
l'encadré **🧪 Tests automatiques** — les 5 derniers passages, le résultat de chaque étape
(tests avec fausses données / contrôle du site réel) et un lien « Voir ↗ » vers le détail.
La bordure devient **rouge** si le dernier passage a échoué. Bouton **↻ Actualiser** pour recharger.
L'encadré lit l'API publique de GitHub : aucune clé, rien à configurer.

**Lancer les tests à la main** : onglet Actions → « Tests RandoFDR » → bouton **Run workflow**.

⚠️ **Après 60 jours sans commit**, GitHub met en pause le contrôle du lundi et prévient
par mail quelques jours avant. Pour le relancer : Actions → « Tests RandoFDR » →
bouton **Enable workflow**.

---

## 2. Avant / après chaque modification

1. **Une seule modification par commit.** Si ça casse, on sait quoi annuler.
2. Après le commit, **attendre le ✅** dans Actions (environ 1 minute).
3. **Test réel** sur une **date de test lointaine** (ex. dans 1 an), jamais sur une vraie rando.
4. **Nettoyer** : supprimer les fiches de test dans `planning_gestion` (ça supprime aussi l'événement de l'agenda).
5. Recharger la page Webnode : le formulaire charge toujours la dernière version, rien à vider.

**Edge Functions** : toute modification va **aux deux endroits** — dans Supabase (pour qu'elle serve)
et dans le dépôt privé (pour la sauvegarde).

---

## 3. Tests réels (à faire selon ce qui a été modifié)

### Formulaire FDR (`index.html`, `js/…`)
1. Dans `planning_gestion`, créer une rando test à une date lointaine, avec un animateur.
2. Dans Webnode, ouvrir le formulaire, choisir cette date et cet animateur.
   → L'encadré « Rando prévue au planning » propose la rando test, cochée.
3. Envoyer la feuille de route.
   → Dans `planning_gestion` : **une seule** fiche, complétée. Dans l'agenda : **un seul** événement.
4. Supprimer la fiche test.

### planningFDR (`planningFDR.html`)
1. Ouvrir une rando → les boutons sont en haut de la fenêtre.
2. « Modifier » → les boutons Enregistrer / Annuler n'apparaissent qu'après le code reçu par mail.
3. Modifier un champ sur une rando **de test**, enregistrer → vérifier la fiche et l'agenda.

### planning_gestion (`planning_gestion.html`)
1. Créer une rando test → elle apparaît dans l'agenda.
2. La supprimer → **son** événement disparaît de l'agenda, et lui seul.

---

## 4. Quand GitHub envoie un ❌ (ou bordure rouge dans `journal.html`)

1. Dans `journal.html`, lien **Voir ↗** du passage en ❌ — ou onglet **Actions** → ligne en ❌ → « tests ».
2. Ouvrir l'étape en rouge et lire les lignes marquées **❌** : elles disent ce qui ne va pas.
3. Selon l'étape :
   - **« Tests avec fausses données »** en ❌ → c'est le **dernier commit** qui a cassé quelque chose.
     Revenir en arrière (section 5).
   - **« Contrôle du site réel »** en ❌ sans commit récent → le problème vient **de l'extérieur** :
     - Supabase injoignable → tableau de bord Supabase (projet en pause ? panne ?) ;
     - Chart.js / Leaflet / html2pdf non chargés → service de bibliothèques en panne, réessayer plus tard
       (bouton **Re-run jobs**) ;
     - liste des animateurs vide → Edge Function `get-animateurs` ou table `animateurs`.
4. Pour comprendre une erreur dans la page : ouvrir la page concernée, touche **F12** → onglet **Console**.
5. Dans Supabase, la table **`journal`** liste ce qui s'est passé (créations, modifications, mails) :
   ```sql
   select id, date, action, fiche_id, detail from public.journal order by id desc limit 20;
   ```

---

## 5. Revenir en arrière (annuler une modification)

1. Sur GitHub, ouvrir le fichier modifié → bouton **History** (en haut à droite).
2. Cliquer sur le commit **d'avant** la modification → « … » → **View file** → bouton **Raw**.
3. Tout copier.
4. Revenir au fichier actuel → crayon ✏️ → tout remplacer par le contenu copié → **Commit changes**.
5. Attendre le ✅, puis vérifier sur le site.

Le site revient exactement à l'état d'avant. Rien n'est perdu : l'historique garde toutes les versions.

---

## 6. Entretien du workflow GitHub

Le fichier `.github/workflows/tests.yml` utilise deux briques fournies par GitHub
(`actions/checkout@v5`, `actions/setup-python@v6`, prévues pour Node.js 24).
Si un jour GitHub affiche un avertissement du type « Node.js XX is deprecated » dans un passage,
ce n'est **pas** une erreur des tests : il suffit de passer ces deux lignes à la version
majeure suivante indiquée dans le message (ex. `@v6` → `@v7`), puis de vérifier le ✅.

---

## 7. Règles qui protègent l'appli

- Les données importantes sont protégées **par la base** (Supabase), pas seulement par le code :
  `date_rando` et `nom_rando` obligatoires, pas deux fiches avec la même date + nom + animateur.
- Les bibliothèques externes sont **figées** (Chart.js 4.6.1, Leaflet 1.9.4, html2pdf 0.10.1) :
  elles ne changent jamais sans un commit. Exception connue : `journal.html` charge
  `supabase-js@2` sans version précise (page admin seulement) — à figer lors d'une prochaine modification.
- Chaque bug corrigé reçoit **son test** dans `tests/tests.py`, pour qu'il ne revienne pas sans être vu.
- Une fiche FDR est rattachée au planning **par son identifiant**, choisi par l'animateur — jamais devinée.
