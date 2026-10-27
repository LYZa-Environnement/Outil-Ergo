# Outil Ergo

Page web pour saisir un bilan en ergothérapie pédiatrique (occupations, écriture, bilan sensoriel), coter le **BHK enfant et ado**, rédiger un **diagnostic ergothérapique** avec des préconisations argumentées et produire le compte rendu en **Word (.docx)**, sur le modèle des comptes rendus du cabinet.

Tout se passe dans le navigateur : aucune donnée n'est envoyée en ligne.

En ligne (GitHub Pages, une fois activé) : https://lyza-environnement.github.io/Outil-Ergo/

## Utilisation

1. Ouvrir `index.html` dans un navigateur (ordinateur, tablette ou téléphone).
2. Au lancement, l'outil demande le profil tant qu'aucun n'est choisi : chaque praticien choisit le sien (ou le crée), et ses bilans sont signés à son nom. On change de profil avec le bouton en haut à droite.
3. **Réglages** (bouton ⚙️), une seule fois par appareil :
   - importer le **fichier du cabinet** (fourni à part, jamais publié, voir plus bas) : normes du BHK et texte des questions de l'ESO ;
   - renseigner le cabinet, son logo et les praticiens (en-tête, pied de page et signature des documents ; le logo apparaît en haut de tous les documents, à l'aperçu, à l'impression, dans les fichiers Word et dans les PDF pour les parents) ;
   - exporter les réglages pour les réinstaller sur un autre appareil.
4. L'outil s'ouvre sur l'**accueil** (🏠, ou le logo) : séances du jour, rappels (séances prévues non notées, fin de forfait de la plateforme TND, copie de sécurité, code de verrouillage), dossiers récents, et deux boutons « Nouveau bilan » et « Noter une séance ». L'**enfant ouvert** est affiché en permanence en haut (« Léa M. ▾ ») : le toucher permet de changer d'enfant sans quitter l'onglet. Sur téléphone, les onglets sont en bas de l'écran.

5. Remplir les onglets du bilan dans l'ordre. Certains ont des sous-onglets, affichés juste en dessous. Un ✓ vert marque ce qui est rempli ; chaque partie a un encadré « Comment faire ? ».

| Onglet | Sous-onglets et contenu |
| --- | --- |
| 📁 Dossier | **Dossier** : Mes dossiers, identité, âge calculé, parents, prescription, scolarité, motif, questionnaires à envoyer aux parents en PDF à remplir (ESO, autonomie au quotidien), accueil adapté, plateforme TND, bilans utilisés, réévaluation, résumé des séances. **Accueil adapté** (si la case est cochée) : questionnaire des parents, fiche « Ce qui aide », planning en images, « Ma visite » |
| 💬 Entretien | **Anamnèse** : développement, environnement, occupations à la maison et à l'école (vide = « RAS »). **Occupations** : questionnaire d'autonomie rempli par les parents (PDF à remplir, import, commentaires de l'ergothérapeute, synthèse pour le compte rendu), grille d'autonomie dans les activités quotidiennes, MCRO (initiale et réévaluation), OT'Hope passé par l'enfant à l'écran (choix des cartes par l'ergothérapeute, grille de réponses), tri de cartes « Mes activités » fait par l'enfant à l'écran |
| ✏️ Écriture | **Observation** : questionnaire d'auto-évaluation, grille d'observation de l'écriture manuscrite (posture, prise et tonus, geste graphique, lettres et chiffres, organisation de la page, lisibilité), environnement. **BHK** : BHK enfant (CP à CM2) ou BHK ado (6e à 3e) selon la classe choisie, normes, cotation ligne par ligne, DS par critère (enfant), vitesse, photo de la copie (prise avec la caméra de l'appareil dans l'outil, ou choisie dans les fichiers) et son analyse, résultats, observations pendant la copie, douleur (EVA). **Clavier** : EViC, vitesse de frappe au clavier, chronométrée dans l'outil |
| 🌈 Bilans | **Sensoriel** : OTIPIS et profil OC, Profil sensoriel 2 de Dunn, ESO (réponses détaillées, import du PDF rempli par les parents, roues, systèmes, graphiques et interprétation calculés avec la grille de cotation du cabinet), SensOT-dir en jeu de cartes sur tablette (plateaux, gabarit, sensations, réglette ; grilles et tableaux de cotation remplis seuls), tri de cartes « Ce que je ressens ». **Moteur et autres** : Lespargot (copie du texte de la classe, du CE1 à la 2nde, affiché à l'écran ; chronomètre ; mots copiés comptés en touchant le dernier mot ; mots par minute et DS avec la feuille de cotation du cabinet), Ajuriaguerra (copies d'une minute à vitesse habituelle et en accélération, consignes, minuteur d'une minute, lettres comptées à partir des phrases écrites, comparaison à l'étalonnage par classe ou par âge, garçons ou filles, en pourcentage de la norme), DTVP-3 (feuille de cotation du livret : items, plafonds, scores bruts, notes du manuel, termes descriptifs, score de différence), NEPSY-II, Cubes et Copie de figures (départ selon l'âge, règle de retour et d'arrêt, durée et bonus de temps des Cubes ; critères Général, Motricité, Global et Local de la Copie de figures avec les corrections de la note brute ; notes étalonnées de la table A.1 à reporter), MABC-3, Man.O.S (cotation épreuve par épreuve, chronomètre, DS, graphique et lecture rédigée, avec la grille et les normes du fichier du cabinet), EVIC (DS et appréciation calculées), manipulations dans la main (Exner et Benbow), DCDQ, repères TDC |
| 📄 Compte rendu | Diagnostic ergothérapique pré-rempli d'après les bilans et questionnaires (avec la source de chaque proposition), objectifs et préconisations proposées d'après les résultats, plan de suivi, puis la section **📄 Documents** (aperçu, impression, Word) : compte rendu, bilan synthétique (une à deux pages : identité, motif, bilans réalisés, tableau des résultats principaux, diagnostic ergothérapique, objectifs et préconisations, en reprenant les textes retouchés), synthèse pour l'école, plan de suivi, carnet pour les parents ; enfin le texte du compte rendu, modifiable section par section |
| 📅 Séances | Planning de toutes les séances de suivi, pour tous les enfants : séances faites, prévues, annulées ; filtres ; programmation du plan de suivi ; impression |

Chaque partie a sa couleur (Dossier bleu, Entretien violet, Écriture vert, Bilans orange, Compte rendu bleu-vert, Séances rose), reprise par l'onglet actif, le liseré des cartes et les titres. Chaque carte se replie en touchant son titre (un résumé indique le nombre de réponses), les blocs de bilans se cochent puis se replient avec la flèche, les sous-parties (par exemple, dans l'ESO : réponses, cotation, graphiques, synthèse ; dans le texte du compte rendu : présentation, occupations, écriture, sensoriel, conclusion) se replient aussi ; « Tout replier » et « Tout déplier » en haut de chaque onglet. L'état replié est gardé sur l'appareil. Le bouton 🌙 / ☀️ passe du mode jour (par défaut) au mode nuit ; le choix est gardé sur l'appareil. L'onglet du navigateur et l'icône d'écran d'accueil (iPad, iPhone) reprennent le logo de l'outil.

### Documents

Dans l'onglet Compte rendu, la section **📄 Documents** (placée après le plan de suivi) propose cinq documents, chacun avec **Aperçu**, **Imprimer** et **Word** :

| Document | Pour qui |
| --- | --- |
| Compte rendu de bilan | Famille et médecin |
| Bilan synthétique | Famille et médecin (une à deux pages, avec le diagnostic ergothérapique) |
| Synthèse pour l'école | Équipe éducative (sans anamnèse ni informations familiales) |
| Plan de suivi | Ergothérapeute seulement |
| Carnet d'activités | Parents, à imprimer et à garder à la maison |

L'onglet Accueil ajoute quatre documents : questionnaire pour les parents, « Ce qui aide », planning en images, « Ma visite ».

Dans la version ouverte depuis le lien claude.ai, l'impression directe n'est pas permise : « Imprimer » télécharge alors une page prête à imprimer.

### Diagnostic et préconisations

Le diagnostic regroupe les constats du bilan sur le plan de la personne, de l'environnement et des occupations, puis formule l'énoncé : « X présente des difficultés dans [occupations], en lien avec [facteurs] », suivi des points d'appui et de la phrase « Ce diagnostic s'appuie sur [bilans et questionnaires saisis], ainsi que sur l'entretien avec X et sa famille ».

**Pré-remplissage expliqué.** L'outil remplit d'avance les champs du diagnostic à partir de ce qui est saisi, et indique sous chaque champ d'où vient la proposition (« 💡 D'après : … ») :

| Champ | Sources utilisées |
| --- | --- |
| Occupations en difficulté | BHK (qualité ou vitesse inférieure à la moyenne), auto-appréciation, questionnaire d'autonomie des parents (domaine où l'enfant n'est pas autonome, priorité des parents, ou au moins un tiers de réponses en difficulté ; questions sur l'école), ESO (domaine sous 2 sur 3), grille d'autonomie, tri de cartes, DCDQ. La raison est écrite sous chaque occupation cochée. |
| Retentissement au quotidien | Questionnaire d'autonomie (domaines non autonomes, difficultés à l'école, priorités des parents), fatigue relevée à la grille d'observation, MCRO (activités cotées 5 ou moins) |
| Obstacles dans l'environnement | Signes d'hyperréactivité ou d'hyporéactivité sensorielle (ESO, profil de Dunn, OTIPIS), SensOT-dir, absence d'aménagement à l'école alors que des difficultés sont relevées |
| Facilitateurs | Aides en place à la maison, AESH (questionnaire d'autonomie), environnement humain à l'école (anamnèse) |
| Contexte | Suivis en cours et parcours scolaire (anamnèse) |
| Autres constats | Gêne exprimée par l'enfant (auto-appréciation), comportement et vécu des difficultés (questionnaire d'autonomie) |
| Points d'appui | Résultats dans la moyenne (BHK, autres bilans), frappe efficace (EViC), domaines où l'enfant est autonome sans difficulté notable, appuis relevés par les parents, engagement adapté (ESO) |

Les propositions se mettent à jour quand les résultats changent. Un champ modifié à la main n'est plus remplacé ; « ↻ Reproposer » revient à la proposition. Une occupation proposée peut être décochée : elle reste écartée. Un aperçu montre le diagnostic tel qu'il apparaîtra dans le compte rendu.

L'outil propose les préconisations justifiées par les résultats (par exemple un tiers-temps quand la vitesse du BHK est inférieure à la moyenne). L'ergothérapeute coche celles qu'elle retient ; le compte rendu indique pour chacune le constat qui la justifie.

### Tri de cartes à l'écran

L'enfant range lui-même des cartes sur la tablette (en les glissant ou en touchant la boîte), puis choisit les trois qui comptent le plus pour lui : activités qu'il voudrait mieux réussir, ou situations sensorielles qui le gênent le plus. Lecture des cartes à voix haute possible. Les cartes (textes et pictogrammes) sont propres à l'outil ; l'ergothérapeute peut ajouter ses cartes, avec photo, dans les réglages, et retirer des cartes pour un enfant. C'est une observation informelle, non étalonnée : elle complète les outils validés sans les remplacer. Les résultats alimentent le diagnostic (occupations difficiles, gênes sensorielles) et les objectifs.

### OT'Hope à l'écran

Outil d'autodétermination des objectifs (A. Perrault et C. Giraux, cabinet La Rose des Vents ; ANFE). L'outil reprend les cartes items du kit (136 cartes, 3 familles, 13 sous-familles avec leur couleur : soins personnels, sécurité, déplacements, productivité ; dans l'école, ordinateur, crayon, outils, mathématiques, devoirs ; sports, jeux d'extérieur, jeux d'intérieur), avec des pictogrammes propres à l'outil.

1. **Choix des cartes** : l'ergothérapeute coche les cartes à montrer, une à une ou par sous-famille et famille (« Tout », « Aucune »). Un compteur signale quand on dépasse 50 cartes, maximum conseillé par le guide. La dernière sélection est gardée sur l'appareil (« Reprendre ma dernière sélection »). Des cartes personnelles peuvent être ajoutées dans les réglages (jeu « OT'Hope »).
2. **Passation** : l'enfant range chaque carte dans « Oui », « Oui, avec aide », « Pas très bien » ou « Non », ou la retire (« Pas pour moi ») si l'activité n'a pas d'importance pour lui. Les cartes passent dans l'ordre des familles, avec le bandeau de leur sous-famille. Il voit ensuite tout ce qu'il sait déjà faire, touche ce qu'il aimerait réussir (♥), puis choisit 1 à 5 objectifs (★) ; s'il en a désigné 5 ou moins, ce sont ses objectifs.
3. **Grille de réponses** : les réponses sont rangées par sous-famille. Toucher une case corrige un classement ou reporte celui fait sur le plateau du kit.

Familles et sous-familles se replient en touchant leur titre (les boutons « Tout » et « Aucune » restent utilisables replié, avec le nombre de cartes choisies), dans le choix des cartes comme dans la grille ; « Tout replier » et « Tout déplier » agissent sur toute la liste. Par défaut, les sous-familles du choix des cartes sont repliées ; l'état est gardé sur l'appareil.

Le compte rendu reprend les colonnes, le nombre de cartes retirées, les souhaits et les objectifs ; les activités « pas très bien » et « non » alimentent les occupations du diagnostic, les objectifs les préconisations.

### Réévaluation

« Charger le bilan précédent » garde les mesures comparables du dossier précédent (BHK, épreuves des autres bilans, moyennes de la MCRO, DCDQ-FE). Le compte rendu ajoute une section « Évolution » avec un tableau ; une évolution est retenue à partir de 0,5 DS (2 points pour la MCRO). Si le dossier en cours est vide, l'identité, l'anamnèse et les activités de la MCRO sont reprises.

### Synthèse pour l'école

Un document Word court, pour l'équipe éducative : constats, points d'appui, aménagements scolaires et sensoriels retenus, suivi. Il ne contient ni l'anamnèse ni les informations familiales. Il reprend le diagnostic et les préconisations retenues ; on le prépare depuis la section Documents (aperçu, impression, Word).

### Frappe au clavier (EViC)

Dans Écriture › Clavier, l'outil reprend le protocole EViC (évaluation de la vitesse de frappe au clavier, Lefèvere et Galbiati, 2007, GEPPE, gratuit) : au clavier, copie (5 min), répétition d'un mot (3 min) et dictée (5 min) ; à la main, copie du BHK et répétition (5 min). Les copies et dictées reprennent le texte du BHK, que l'enfant lit sur la feuille : il n'est pas reproduit dans l'outil.

- **Pas à pas** : un encadré guide la passation en 5 étapes : choisir les textes, imprimer la feuille de passation, installer l'enfant, passer la main à l'enfant, puis compléter.
- **Textes prêts à l'emploi** : l'outil propose ses propres textes, écrits pour lui et libres de droits : « La cabane du jardin » à recopier (166 mots, avec majuscules, accents et ponctuation), la dictée « Le marché du samedi » découpée en 35 groupes de mots numérotés, et le mot à répéter « maison » (modifiable). On peut aussi garder le texte du BHK (protocole d'origine, sur l'exemplaire papier de l'ergothérapeute) ; le compte rendu précise quels textes ont servi.
- **Feuille de passation** (voir, imprimer, Word) : déroulé avec, pour chaque épreuve, la consigne à dire à l'enfant et ce que fait l'adulte ; dictée à lire ; mot à répéter ; grille d'observation à cocher pendant les épreuves ; et, avec les textes de l'outil, une page « La cabane du jardin » en gros caractères à poser devant l'enfant. Sans imprimante, le texte à recopier peut s'afficher à l'écran, et la dictée se lire sur un autre appareil.
- **Comptage de la copie à la main** : on touche le dernier mot écrit par l'enfant dans le texte, l'outil compte les mots. Au clavier, l'outil compte aussi les mots recopiés sans erreur.
- **Passation guidée** : « Commencer la passation » ; l'ergothérapeute choisit les épreuves et le matériel, puis passe la main à l'enfant. L'enfant passe les épreuves seul, dans l'ordre : copie et répétition du mot à la main (sur papier, chronométrées par l'outil), puis copie, répétition et dictée au clavier. Chaque épreuve a un écran de consigne en grand ; le chronomètre démarre à la première lettre (au toucher de « C'est parti ! » pour l'épreuve sur papier), une barre montre le temps qui passe, et l'épreuve s'arrête seule avec un petit signal sonore. L'enfant ne voit pas ses résultats ; l'écran reste allumé.
- **Pour l'adulte** : le bouton « Adulte », en haut à droite, s'ouvre par un appui long (ou la touche Échap) ; il met le chronomètre en pause et permet de reprendre, de terminer l'épreuve (après 30 secondes), de la recommencer, de la passer, ou d'arrêter la passation. Le geste « retour » du téléphone ne fait pas sortir l'enfant.
- **À la fin**, l'enfant répond à deux questions en images (« C'était comment ? », « Pour écrire, tu préfères… ») et rend l'appareil : un appui long ramène l'ergothérapeute (avec le code de verrouillage s'il y en a un) sur les résultats, à compléter par l'observation.
- **Relevés de l'outil, sans IA, dans l'appareil** : mots par minute, mots tapés à chaque minute (baisse en fin d'épreuve signalée), corrections, arrêts de plus de 3 secondes, nombre de fois où le mot répété est tapé sans erreur, usage des majuscules, des accents et de la ponctuation (les fonctions vues sont pré-cochées « Connaît », à confirmer), texte tapé. Correction automatique, majuscules automatiques et collage désactivés.
- **Observation** en un toucher : matériel, doigts, mains, regard, recherche des touches, posture, fatigue, prise d'information sur le modèle en copie, dictée, attitude, fonctions du clavier ; et ce qu'en dit l'enfant.
- Résultats en mots par minute, comparés à la vitesse à la main de l'enfant (« équivalence personnelle »). Une épreuve faite ailleurs se note en nombre de mots.
- Le compte rendu a une section « Frappe au clavier » ; une frappe plus lente que la main justifie l'apprentissage du clavier, une frappe au moins aussi rapide justifie l'outil numérique. Les résultats sont gardés pour la réévaluation (l'EViC prévoit de refaire les épreuves à un an et à deux ans), sans seuil d'évolution imposé.
- Le plan de suivi reprend les repères de l'auteure, avec leur source. Les repères par classe de l'EViC sont indicatifs (petits effectifs) : ce n'est pas un étalonnage.

### Phrases favorites

Dans les notes et les observations (textes du bilan, compte rendu, séances), le bouton ★ qui apparaît sur le champ ouvre la liste des phrases favorites : un appui insère la phrase à l'endroit du curseur. On peut chercher une phrase, en ajouter une, ou garder le texte sélectionné. La liste se gère dans les réglages (une phrase par ligne) ; seize phrases d'exemple sont proposées au départ.

### Code de verrouillage

Dans les réglages, un code de 4 à 8 chiffres peut être demandé à l'ouverture de l'outil et après un temps sans utilisation (2, 5, 10 ou 30 minutes, ou seulement à l'ouverture), ainsi qu'au retour dans l'application. Le bouton 🔒 de l'en-tête verrouille tout de suite. Le code n'est pas gardé en clair (empreinte SHA-256 salée et répétée). Après cinq erreurs, l'attente augmente (30 s, 60 s, 120 s…). Code oublié : on efface les dossiers de l'appareil (les réglages sont gardés) et on les remet avec une copie de sécurité ou un partage.

Limite : le code empêche d'ouvrir l'outil, il ne chiffre pas les données enregistrées dans le navigateur. Le code de l'appareil (tablette, téléphone, session de l'ordinateur) reste indispensable.

### Partage entre praticiennes

Chaque appareil garde ses dossiers. Pour travailler à deux, « 📤 Envoyer à une collègue » (dans Mes dossiers) crée un fichier avec les dossiers choisis, chiffré par un mot de passe (AES-GCM 256 bits, clé dérivée par PBKDF2-SHA-256, 210 000 itérations). Le fichier se transmet par un moyen sûr (clé USB, messagerie sécurisée de santé), le mot de passe par un autre moyen. « 📥 Recevoir d'une collègue » ouvre le fichier et montre ce qui va changer avant d'ajouter :

- dossier inconnu : ajouté ;
- dossier déjà présent : la version la plus récente est gardée, et les séances des deux côtés sont réunies (chaque séance a son identifiant) ;
- l'ajout peut être annulé.

Un même enfant saisi séparément par deux praticiennes donne deux dossiers distincts : il vaut mieux qu'une seule crée le dossier, puis l'envoie à l'autre. Il n'y a pas de synchronisation automatique : un serveur demanderait un hébergement certifié pour les données de santé (HDS).

### Séances

L'onglet 📅 Séances réunit les séances de suivi de tous les enfants (chaque séance reste rangée dans le dossier de l'enfant).

- **Noter une séance** : « ＋ Séance », l'enfant (celui du dossier ouvert par défaut), la date (aujourd'hui par défaut) et, si on veut, l'heure. Une date passée donne une séance faite, une date à venir une séance prévue. La séance s'ouvre : on coche ce qui a été travaillé (les axes du plan de suivi d'abord), on touche un visage (bien, moyen, difficile) ; une note et « pour la prochaine fois » sont facultatives. Tout s'enregistre aussitôt.
- **Séance prévue** : le jour venu, elle porte deux boutons, « ✓ Faite » et « Absent ».
- **Planning** : vue par semaine ou par mois (flèches pour avancer ou reculer, « Aujourd'hui » pour revenir), séances à venir, passées ou toutes. Filtres : enfant, statut (prévue, faite, annulée), praticienne, axe travaillé, lieu (si le cabinet a plusieurs adresses).
- **Un enfant** : résumé (séances faites, prochaine séance, forfait de la plateforme TND, rappel 📌 noté la fois précédente, « Ce qui aide ») et « Programmer le plan de suivi » : on choisit la première date, l'heure, la fréquence et le nombre de séances (le plan de suivi est mis à jour si on le souhaite) ; les séances prévues s'ajoutent sans doublon, et c'est annulable.
- Dans chaque séance, le rappel 📌 et le contenu prévu au plan de suivi pour ce rang de séance.
- Le planning affiché s'imprime ou se télécharge en Word ; le plan de suivi reprend les séances faites et les prochaines séances prévues ; le forfait de la plateforme TND compte les séances faites.

### Accueil adapté

Dans le dossier, la case « Adapter l'accueil et le bilan » sert aux enfants qui ont besoin d'un cadre très prévisible (TSA connu ou suspecté, grande anxiété, fortes sensibilités sensorielles…). Elle ouvre l'onglet Accueil :

- questionnaire à remettre aux parents avant le premier rendez-vous (communication, ce qui aide à comprendre, intérêts, ce qui apaise, ce qui met en difficulté, signes de saturation, sensations) ;
- fiche « Ce qui aide », remplie avec les réponses des parents et le journal des séances (ce qui a aidé, ce qui a été difficile) ;
- planning de séance en images (pictogrammes de l'outil), avec cartes « pause » et « j'ai besoin d'aide » à découper ;
- « Ma visite chez l'ergothérapeute » : courte histoire à lire avec l'enfant avant de venir, avec la photo du cabinet (gardée sur l'appareil) ;
- carnet des parents en version imagée.

La raison reste interne : elle figure dans le plan de suivi, jamais dans le compte rendu ni dans la synthèse pour l'école. L'ergothérapeute peut choisir d'ajouter au compte rendu le diagnostic de TSA posé (avec l'accord des parents) ou, pour une suspicion, une phrase neutre qui conseille un avis médical. Quand la raison est un TSA diagnostiqué ou suspecté, le plan de suivi rappelle, comme ajout à titre indicatif et avec leur source, les recommandations de la HAS (février 2026) et le statut de l'intégration sensorielle (NCAEP, 2020).

### Passation adaptée

Sous le BHK et sous chaque épreuve, un encadré « Passation adaptée ? » note les adaptations (pauses, consignes montrées, passation en plusieurs fois, environnement aménagé, présence d'un parent, temps supplémentaire, autre). Elles apparaissent dans le compte rendu avec un rappel : les normes ont été établies en passation standard.

### Plateforme TND (PCO)

Pour un enfant suivi dans le cadre d'une plateforme de coordination et d'orientation des troubles du neurodéveloppement (forfait d'intervention précoce) : nom de la plateforme, début du parcours, forfait (35 séances environ sur 12 mois, 12 séances, ou bilan seul), médecin traitant, renouvellement. Le compte rendu indique le cadre et les destinataires (famille, médecin traitant, plateforme). L'outil compte les séances du journal, affiche la fin du forfait et rappelle, deux mois avant, de demander le renouvellement (possible une fois). Règles : fiche technique du ministère, https://handicap.gouv.fr/sites/handicap/files/2025-04/TND-fiche-technique-forfait-intervention-2025.pdf.

### Carnet d'activités pour les parents

Un livret court à imprimer : conseils pour que l'entraînement reste un plaisir, activités à faire à la maison pour chaque axe de travail retenu dans le plan de suivi (expliquées simplement), deux tableaux de la semaine à cocher avec l'enfant, une page de remarques pour la prochaine séance et le contact de l'ergothérapeute. Il ne contient ni résultats chiffrés ni informations familiales.

### Analyse de la photo de la copie

Sous la photo de la copie du BHK, « Analyser la photo » mesure la copie **sur l'appareil**, par des calculs d'image simples (aucune intelligence artificielle, aucun envoi) : repérage de la feuille, des lignes d'écriture, de la hauteur des lettres troncs (échelle prise sur la largeur d'une feuille A4), du décalage de la marge et des lignes dont la base ondule. L'outil **propose** des valeurs pour les critères 1, 2 et 3 ; l'ergothérapeute vérifie sur la copie et clique pour les reprendre (annulable). Les autres critères restent à coter à l'œil.

Conditions : feuille A4 entière, à plat, photographiée de face, bien éclairée, sur un fond plus sombre que la feuille. Pour le critère 2, les points ne sont proposés que si le fichier de normes contient les pentes des lignes du calque B (clé `calques.margeB`, cinq nombres croissants, voir Normes).

### DCDQ-FE (questionnaire sur le développement de la coordination)

Dans Bilans › Moteur et autres. L'outil suit la **version en français pour l'Europe** (Ray-Kaeser, Thommen, Martini, Jover, Gurtner et Bertrand, 2019, guide d'administration et feuille de scores du 16.09.2019 ; *PLoS ONE* 14(5), e0217280) :

- 15 réponses de 1 (« pas du tout ») à 5 (« tout à fait »), saisies question par question sous l'intitulé court de la feuille de scores (les questions ne sont pas reproduites) ;
- trois catégories : contrôle durant le mouvement (questions 1 à 6, /30), motricité fine et écriture (7 à 10, /20), coordination globale (11 à 15, /25) ; total /75 ;
- de 5 ans 0 mois à 14 ans 11 mois, un seul seuil : **total ≤ 56 = indication d'un risque de TDC**, total ≥ 57 = probablement pas de TDC. Hors de cet âge, le score est affiché mais pas interprété ;
- le score total n'est calculé que si les 15 réponses sont saisies : l'outil indique les questions manquantes ;
- le compte rendu reprend les termes recommandés par le guide (« indication d'un risque de TDC », « probablement pas de TDC »), la sensibilité et la spécificité du seuil pour le groupe d'âge de l'enfant (5-7 ans : 0,75 / 0,91 ; 8-9 ans : 1,00 / 0,74 ; 10-14 ans : 0,83 / 0,81), et rappelle qu'il s'agit d'un repérage à confirmer par un test moteur standardisé.

Les dossiers saisis avant cette mise à jour gardent leurs réponses (même numérotation) ; seuls les regroupements et le seuil sont recalculés.

### Repères TDC (ajout)

Dans Bilans › Moteur et autres, un encadré clairement signalé comme **ajout à titre indicatif** reprend les critères des recommandations internationales sur le trouble développemental de la coordination : Blank R., Barnett A. L., Cairney J. et al., *International clinical practice recommendations on the definition, diagnosis, assessment, intervention, and psychosocial aspects of developmental coordination disorder*, Developmental Medicine & Child Neurology, 2019, 61(3), 242-285, https://doi.org/10.1111/dmcn.14132.

Les critères I (MABC-3 au 16e percentile ou moins, 5e avant 5 ans) et II (DCDQ-FE, grille d'autonomie, MCRO) sont renseignés d'après les résultats saisis ; l'ergothérapeute renseigne les critères III (début dans la petite enfance) et IV (autres causes écartées par le médecin). Le compte rendu ajoute un paragraphe marqué « Ajout, à titre indicatif », avec la source, et rappelle que le diagnostic est médical. Le plan de suivi rappelle les interventions recommandées (approches centrées sur l'activité, comme CO-OP ou l'entraînement aux tâches).

### Man.O.S (manipulation des outils scolaires)

Dans Bilans › Moteur et autres. Avec la grille du fichier du cabinet (clé `manos` : épreuves de chaque classe du CE1 à la 6e, critères de cotation, consignes, normes ; contenu protégé, jamais dans le dépôt), le bloc devient une feuille de cotation complète :

- **Classe de référence** proposée d'après la classe et la date du bilan : avant janvier, épreuves de la classe inférieure (l'étalonnage a été fait de janvier à mars) ; de la 5e à la 3e, épreuves de 6e. L'ergothérapeute peut en choisir une autre (par exemple une classe plus basse pour ne pas mettre l'enfant en échec).
- **Par épreuve** : installation et consigne à lire (repliables), critères de manipulation et de résultat à toucher (un second appui efface), note brute calculée quand tous les critères sont cotés, ou saisie directe de la note brute ; temps en secondes à partir du CM2, avec un **chronomètre** (démarrer, pause, reprendre, arrêter : le temps s'inscrit) ; observation. La DS de chaque partie s'affiche aussitôt, en couleur. Les épreuves peuvent être proposées séparément.
- **Résultats** : totaux de manipulation, de résultat et de temps comparés à la norme quand toutes les épreuves de la classe sont cotées ; graphique « écart à la moyenne, outil par outil » (manipulation, résultat, temps sur l'échelle des DS, zones colorées, légende détaillée), repris dans le Word.
- **Compte rendu** : totaux, détail par outil avec les comportements cotés 0, puis une lecture : manipulation et résultat en difficulté, résultat correct obtenu avec une manipulation peu efficace, manipulation correcte mais rendu imprécis, réalisation correcte mais lente, outils utilisés dans la moyenne. Les totaux vont dans le tableau récapitulatif et le profil en DS ; les outils en difficulté alimentent le diagnostic (constat et occupation « manipulation des outils scolaires »). Règles écrites, sans IA.
- Le temps se lit dans le bon sens : plus lent que la moyenne donne une DS négative. Les calculs ont été vérifiés avec le fichier de calcul des auteurs.

Sans le fichier du cabinet (lien public), le bloc garde la saisie libre des épreuves et signale qu'il faut importer le fichier pour la cotation complète.

### DTVP-3 (perception visuelle)

Dans Bilans › Moteur et autres, le bloc reprend le livret de l'examinateur (Hammill, Pearson, Voress, PRO-ED, 2014) et la feuille de passation :

- **Âge pour les tables** : années et mois, sans arrondir, d'après la date de naissance et la date du bilan.
- **Section 5, item par item**, dans l'ordre de passation. Coordination œil-main : 5 items, tous proposés ; points de l'item saisis, ou segment par segment (8, 8, 8, 19 et 17 segments ; 0 ou 1 point aux items 1 et 2, 0 à 4 aux items 3 à 5), maximum 192. Copie : 18 items de 0 à 3 (54). Figure-fond (23 items), closure visuelle (26 items, 0 ou 1) et constance de la forme (24 items) : points de l'item, 0 si l'enfant a choisi une forme fausse. Pour ces trois sous-tests, si le fichier du cabinet contient les réponses attendues, on touche simplement les lettres choisies par l'enfant et les points se calculent. Le **plafond** (3 items consécutifs à 0, sauf coordination œil-main) est repéré : les items suivants sont grisés et ne comptent pas. Le score brut s'affiche quand tous les items jusqu'au plafond sont cotés ; on peut aussi saisir directement un score brut coté sur papier.
- **Sections 2 et 3** : âge équivalent, rang percentile, note standard (1 à 20) et indices composites se reportent depuis le manuel (les tables de normes ne sont pas dans l'outil). L'outil calcule la somme des notes standard de chaque composite (IVM = EH + CO ; PVRMR = FG + VC + FC ; PVG = les cinq), rappelle la SEM et donne le **terme descriptif** de la section 4.
- **Score de différence** IVM − PVRMR : non significatif sous 12, statistiquement significatif à 12 ou plus, cliniquement significatif à 28 ou plus.
- **Compte rendu** : chaque ligne donne la note, le terme du manuel, la DS, le score brut, le rang percentile et l'âge équivalent ; une phrase interprète le score de différence. Les notes alimentent le tableau récapitulatif, le profil en DS, le diagnostic et la réévaluation comme avant.

Les consignes, les figures, les réponses attendues et les tables de normes du test sont protégées : elles ne sont pas dans le dépôt. Les réponses attendues peuvent être ajoutées au fichier du cabinet (clé `dtvp3`, voir plus bas).

### Plan de suivi (document interne)

Un troisième document Word, réservé à l'ergothérapeute : analyse approfondie du bilan (résultats classés du plus fragile au plus solide, détail du BHK, OTIPIS, réponses de l'ESO, occupations, hypothèses de travail), axes de travail justifiés par les résultats, exercices en séance avec leur progression, échelles d'atteinte des objectifs (GAS), calendrier des séances (toutes les deux semaines par défaut, jusqu'à la réévaluation) et exercices à faire à la maison. Les exercices sont des pistes générales à adapter.

### Graphiques

Les graphiques ont une légende détaillée : critères du BHK (barre = score de dégradation de 0 à 5, écart en DS avec les enfants du même âge ou de la même classe et son sens, couleurs des niveaux avec leurs bornes), profil des résultats (point = résultat en DS, zones colorées avec leurs bornes). Le graphique des critères s'affiche aussi sous les résultats, dans l'onglet BHK. Le compte rendu présente les profils en graphiques : profil des résultats en déviations standard, score de chaque critère du BHK, MCRO, DCDQ, évolution depuis le bilan précédent, OTIPIS, Profil sensoriel 2, ESO (roues, systèmes, réponses détaillées). Ils s'affichent dans les blocs de bilans concernés, et sont insérés dans l'aperçu et le Word du compte rendu.

### Ne rien perdre

- Chaque dossier s'enregistre tout seul dans le navigateur, à chaque modification (« Mes dossiers », onglet Dossier) ; un nouveau dossier ne remplace jamais le précédent. Il n'y a pas de bouton « Enregistrer ».
- Un badge, toujours visible dans la barre du haut, montre où en est l'enregistrement : « Enregistrement… », puis « ✓ Enregistré » avec l'heure, ou « ⚠️ Non enregistré » en cas d'échec. Le toucher ouvre « Où sont vos dossiers ? » : où sont les dossiers (sur cet appareil, rien n'est envoyé sur internet), le seul risque (appareil perdu ou changé, données du navigateur effacées), le nombre de dossiers, la date de la dernière copie de sécurité et un bouton pour en faire une. La carte « Vos données » de l'accueil reprend ces informations.
- La **copie de sécurité** télécharge tous les dossiers (et les réglages) dans un seul fichier, à ranger ou à transférer sur un autre appareil ; un rappel s'affiche après une semaine sans copie.
- Effacer une cotation, un tri, une photo ou un dossier peut s'annuler pendant quelques secondes (bouton « Annuler »).
- Le navigateur est prié de ne pas effacer les données de l'outil quand l'appareil manque de place.

### Questionnaires protégés

Les questions et cartes du Profil sensoriel 2, de l'ESO, de l'OT'Hope et du DCDQ, ainsi que la grille et les normes du Man.O.S, ne sont pas reproduites. Pour l'ESO, les réponses se saisissent par numéro de question (0 à 10), ou arrivent toutes seules depuis le PDF rempli par les parents (voir ci-dessous) ; l'ergothérapeute peut coller le texte de son propre exemplaire dans les réglages pour l'afficher à côté des réponses (il reste dans son navigateur). L'outil reçoit leurs scores, classifications et résultats. Le questionnaire sur l'autonomie dans les activités de la vie quotidienne (libre d'utilisation, voir plus bas) est intégré. Le questionnaire d'auto-appréciation de l'écriture du cabinet (d'après le CHaP, libre d'utilisation) est intégré : 12 questions, chacune rangée dans une thématique (lisibilité, satisfaction et émotions, vitesse), visibles directement dans Écriture › Observation. Questions et thématiques restent modifiables dans les Réglages. L'outil compte le nombre de réponses dans chaque colonne et, par thématique, les réponses « souvent » ou « toujours » ; le compte rendu reprend ce résumé et un tableau groupé par thématique. Deux textes se remplissent seuls : une **synthèse pour le compte rendu** (deux ou trois phrases : gêne principale et ses raisons, rapport avec le bilan, position sur un autre moyen d'écrire), seule reprise dans le compte rendu, et une **analyse détaillée** qui reste dans le dossier : thématiques les plus gênantes, lecture des réponses (lisibilité pour soi et pour les autres, copie au tableau, douleurs, fatigue, évitement des devoirs, envie d'un autre moyen d'écrire), comparaison avec les mesures du bilan (vitesse et qualité au BHK, EVA pendant la copie, fatigue observée, préférence exprimée à l'EViC) et pistes pour l'accompagnement. Chacun suit les réponses tant qu'il n'est pas modifié ; une fois modifié, il reste tel quel (boutons « Reproposer la synthèse » et « Reproposer l'analyse »). Règles écrites, sans IA ; la lecture détaillée ne porte que sur les questions du questionnaire du cabinet restées inchangées.

Le **SensOT-dir** se passe en jeu de cartes à l'écran (Bilans › Sensoriel), en suivant le protocole du livret : plateau 1 (j'aime, ça me gêne, ça ne me gêne pas, je ne sais pas, ça ne me concerne pas), plateau 2 pour la fréquence des cartes gênantes (étape qu'on peut passer si l'enfant ne comprend pas les fréquences), gabarit pour choisir 5 situations à travailler, carte « sensation » puis réglette de 1 à 10 pour chacune, et enfin 5 stimulations plaisantes au plus avec leur effet. Les 74 cartes « situations » et les 12 cartes « sensations » reprennent les intitulés du jeu, rangés comme dans les grilles de cotation ; les illustrations ne sont pas reproduites (pictogrammes de l'outil, couleur par sens). L'outil remplit les grilles par sens et les deux tableaux de cotation (gêne, auto-régulation), qui restent modifiables : on peut aussi y reporter un tri fait avec les cartes papier. Précisions et préconisations s'écrivent dans les tableaux et passent dans le compte rendu. Les dossiers remplis avec l'ancienne saisie (comptes par thème) restent lisibles.

### Questionnaires pour les parents en PDF à remplir (ESO, autonomie au quotidien)

Dans **Dossier › Avant le rendez-vous**, et dans les blocs concernés (ESO dans 🌈 Sensoriel, questionnaire d'autonomie dans 🌱 Autonomie et priorités) : un bouton crée le PDF de chaque questionnaire. C'est un **modèle vierge, le même pour tous les enfants** : rien sur l'enfant n'y figure, il peut être créé une fois et réutilisé. Il est écrit dans le navigateur, sans bibliothèque ni serveur (`js/pdf.js`, moteur de formulaire générique). En haut : logo du cabinet, cabinet, ergothérapeute signataire (téléphone, e-mail), puis des champs remplis par les parents (nom et date de naissance de l'enfant, « Rempli par », date ; classe, AESH et nombre d'heures pour le questionnaire d'autonomie).

- **ESO** : 108 questions par domaine, une rangée de onze ronds numérotés de 0 à 10 par question.
- **Autonomie dans les activités de la vie quotidienne** (questionnaire libre d'utilisation, d'après le document de Doriane Madeline et Marjorie Carreau, cabinet d'ergothérapie de Vertou ; intégré à l'outil, quelques fautes de frappe corrigées) : 86 questions en sept domaines (habillage, toilette, repas, loisirs, déplacements, école, comportement et vécu des difficultés), réponses de « jamais » à « toujours », colonne de remarques, question « autonome dans ce domaine ? », cadre « aides mises en place » par domaine, puis classement des domaines à faire progresser en priorité.

Les ronds sont des boutons radio (un clic choisit, un autre clic change), lisibles aussi à l'impression. Les parents remplissent le PDF dans leur lecteur (Acrobat Reader, Aperçu sur Mac, iPad ou iPhone, Chrome, Edge, Firefox, Google Drive sur Android), l'enregistrent et le renvoient par e-mail.

« Importer un PDF rempli » reconnaît le questionnaire et relit les valeurs des champs, que le lecteur ait ajouté ses modifications à la fin du fichier ou réécrit tout le fichier avec des objets compressés. Le PDF va dans le dossier ouvert : si le nom écrit par les parents ne correspond pas au prénom du dossier (ou s'il manque), l'outil demande avant d'importer ; s'il y a déjà des réponses, il demande avant de les remplacer. ESO : réponses dans le bloc ESO, coché, « Rempli par » et date repris s'ils sont vides. Autonomie : réponses, remarques, aides, priorités, classe et AESH dans « Autonomie dans les activités quotidiennes », où tout reste modifiable (saisie à la main pour un questionnaire papier). Un PDF imprimé puis scanné, ou rempli sans être enregistré, ne contient pas de réponses lisibles : l'outil le dit. Le texte des questions de l'ESO vient du fichier du cabinet : il n'est ni dans le code ni dans la version publiée ; sans lui, le bouton de création de l'ESO renvoie vers les Réglages, et l'import fonctionne quand même. Le questionnaire d'autonomie, libre d'utilisation, est intégré (réglage `avqLibelles` pour le remplacer domaine par domaine). Champs : `eso_sp_01` à `eso_l_36` (valeurs `/0` à `/10`), `eso_enfant`, `eso_naissance`, `eso_repondant`, `eso_date` ; `avq_<domaine>_<nn>` (valeurs `/0` à `/4`), `avq_<domaine>_<nn>_r`, `avq_<domaine>_auto`, `avq_<domaine>_aides`, `avq_complement`, `avq_prio_<domaine>` et `_p`, `avq_enfant`, `avq_naissance`, `avq_classe`, `avq_aesh`, `avq_heures`, `avq_repondant`, `avq_date` ; `outil_ergo` (type du questionnaire).

**Cotation et interprétation de l'ESO.** Avec la grille de cotation du cabinet (fichier du cabinet, clé `esoCotation` : secteur et système de chaque question, sens direct ou inverse par domaine ; jamais dans le code), chaque réponse de 0 à 10 devient 0 à 3 points (sens direct : 0-1 → 0, 2-4 → 1, 5-7 → 2, 8-10 → 3 ; sens inverse : 3 moins ces points). 3 correspond à un engagement adapté. Roues : moyenne des points de chaque secteur (SS recherche sensorielle, DS discrimination, CP contrôle postural, PX praxies, EO engagement occupationnel, OR hyperréactivité, UR hyporéactivité) dans chaque domaine. Systèmes : somme des points par domaine, pourcentage sur les trois domaines (sur 36, intéroception sur 27), repère à 50 %. Le calcul suit les réponses (saisies ou importées) ; une valeur modifiée à la main l'arrête, « Recalculer à partir des réponses » le reprend. Les graphiques se remplissent (roues, systèmes avec les barres sous le repère en rouge, points par question). Le compte rendu reçoit une synthèse interprétée, rédigée en quelques paragraphes : profil d'ensemble (moyenne sur 3), difficultés par secteur avec leur intensité (marquée sous 1 sur 3, modérée de 1 à 2) et les domaines du quotidien concernés, domaine le plus touché, systèmes sous le repère de 50 %, situations concrètes relevées par les parents (questions à 0 point), hypothèse prudente (modulation, discrimination, difficultés motrices d'origine sensorielle) à mettre en lien avec le reste du bilan, puis les observations de l'ergothérapeute. Le détail point par point (systèmes, secteurs par domaine, situations) reste dans le bloc ESO, pour l'ergothérapeute. Le diagnostic ergothérapique reprend les secteurs et systèmes en difficulté. Règles écrites, sans IA.

**Synthèse de l'autonomie au quotidien dans le compte rendu** (section « Autonomie au quotidien : questionnaire des parents ») : qui a répondu et quand, domaines où l'enfant est autonome ou non selon ses parents, AESH, puis par domaine les réponses à signaler (« jamais ou rarement » pour une capacité, « fréquemment ou toujours » pour une difficulté du comportement, « parfois »), avec la remarque des parents, les aides en place et le commentaire de l'ergothérapeute sur ce domaine ; les loisirs pratiqués souvent ou rarement ; les domaines sans difficulté ; les autres éléments rapportés ; les priorités des parents ; le commentaire général de l'ergothérapeute. Un aperçu suit les réponses dans l'onglet Autonomie ; le texte se retouche dans l'onglet Compte rendu. Règles écrites, sans IA.

4. **Enregistrer le dossier** télécharge un fichier `.json` qu'on rouvre avec **Ouvrir un dossier**. Un brouillon du dossier en cours reste aussi dans le navigateur jusqu'à « Nouveau dossier » (désactivable dans les réglages, à faire sur un ordinateur partagé).

## Cotation du BHK enfant

Règles reprises du manuel (Charles, Soppelsa et Albaret) :

- critères 1 et 2 sur tout le texte : le critère 1 est calculé à partir de la taille moyenne des lettres troncs et de la classe (barème du manuel), avec saisie manuelle possible ; le critère 2 se lit sur le calque ;
- critères 3 à 13 : une case par ligne sur les cinq premières lignes (0 ou 1 point par ligne) ;
- en cas de doute, coter 0, sauf pour le critère 9 ;
- vitesse : caractères écrits en 5 minutes (mots, ponctuations, apostrophes ; « j' » compte deux caractères) ;
- remarques non cotées (translinéarité, micrographie, lettres miroirs…) et fautes d'orthographe sur les cinq premières lignes.

**Signe de la qualité.** Par défaut le DS de qualité est inversé : un DS négatif signale une écriture plus dégradée que la moyenne, comme pour la vitesse et comme dans l'exemple de cas du manuel. Réglable dans les réglages.

**Interprétation.** Seuils par défaut : pathologique à DS ≤ −1,5, inférieur à la moyenne à DS ≤ −1, supérieur à la moyenne à DS ≥ +1 (modifiables). La légende du tableau récapitulatif (DS, notes standard, indices, rangs percentiles) est calculée à partir de ces seuils.

**Point de vigilance.** Dans le manuel, les normes de vitesse à 9 ans sont identiques pour les filles et les garçons, et ne collent pas avec la moyenne de l'ensemble : c'est probablement une erreur de saisie du manuel. Quand les normes filles et garçons d'un groupe sont identiques, l'outil le signale et propose d'utiliser les normes de l'ensemble.

## Normes

Les normes du BHK viennent du manuel édité par les Éditions et Applications Psychologiques. Elles **ne sont pas dans ce dépôt** (il est public) : on les importe une fois par appareil depuis un fichier JSON gardé à part.

Le **fichier du cabinet** (`type: "outil-ergo-contenus"`) réunit en un seul import tout ce qui est protégé : `normes` (le fichier de normes décrit ci-dessous), `eso` (texte des questions de l'ESO, `{ "sp": [36 textes], "p": [36], "l": [36] }`, tiré de l'exemplaire du cabinet), `esoCotation` (grille de cotation de l'ESO), `dtvp3` (réponses attendues du DTVP-3, tirées de l'exemplaire du cabinet : `{ "fg": [[lettres proposées, lettres justes] × 23], "vc": [× 26, une seule lettre juste], "fc": [× 24] }`, par exemple `["abcde", "ad"]` ; chaque sous-test peut être fourni seul, liste complète) et `manos` (grille et normes du Man.O.S : `{ "classes": { "CM2": { "intro", "epreuves": [{ "id", "nom", "le", "installation", "consigne", "m": [critères], "r": [critères], "nm": [moyenne, écart-type], "nr", "nt" }], "total": { "nm", "nr", "nt" } } } }`, un critère étant `{ "nom", "partie", "o": [[points, libellé]] }`). Réglages › « Importer le fichier du cabinet » ; un ancien fichier de normes seules reste accepté. La version du cabinet intègre ces contenus (`window.NORMES_INTEGREES`, `eso` dans `window.REGLAGES_INTEGRES`). D'autres questionnaires protégés pourront s'y ajouter de la même façon. Pour un usage personnel, une version du fichier HTML peut les intégrer (variable `window.NORMES_INTEGREES` définie avant les scripts) : elle calcule sans import, et ne doit pas être publiée. Format :

```json
{
  "type": "bhk-normes",
  "version": 2,
  "qualite": {
    "classe": { "CP": { "F": [10.0, 2.0], "M": [11.0, 2.5], "E": [10.5, 2.2] } },
    "age": { "6": { "F": [10.0, 2.0], "M": [11.0, 2.5], "E": [10.5, 2.2] } }
  },
  "vitesse": { "classe": {}, "age": {} },
  "calques": { "margeB": [0.1, 0.2, 0.3, 0.4, 0.5] }
}
```

La clé facultative `calques.margeB` donne les pentes (décalage horizontal divisé par la hauteur) des lignes du calque B, dans l'ordre croissant : elle sert à proposer les points du critère 2 lors de l'analyse de la photo. Les valeurs ci-dessus sont fictives.

Une version du cabinet peut aussi intégrer l'en-tête et les praticiens (variable `window.REGLAGES_INTEGRES`, avec `cabinet`, `praticiens`, au besoin `retires` : noms à retirer des réglages déjà enregistrés, `auto` : questionnaire d'auto-évaluation du cabinet, `eso` : texte de l'ESO, `logo` : logo du cabinet, `{ donnees: data URL JPEG, l, h }`). Le fichier du cabinet accepte aussi `logo`. Les praticiens intégrés sont ajoutés aux réglages s'ils n'y sont pas.

Une clé `ado` donne les normes du BHK ado : `ado.vitesse.classe` et `ado.qualite.classe` (de `6e` à `3e`), et `ado.qualite.global` pour la norme de qualité tous niveaux.

Chaque valeur est `[moyenne, écart-type]` ; `F` filles, `M` garçons, `E` ensemble. Les nombres ci-dessus sont fictifs. Une clé facultative `criteres` donne, pour chaque critère de 1 à 13 et chaque classe, les normes du critère : elle sert au DS par critère.

Dans les tableaux du manuel par critère, quelques valeurs sont incohérentes (par exemple un écart-type de 0,01 pour le critère 1 des filles de CE2, ou une moyenne de l'ensemble qui ne correspond pas à celles des filles et des garçons pour le critère 9 en CM1 et CM2). L'outil les reprend telles quelles et affiche « < −5 » quand le DS dépasse cette valeur.

## Données personnelles

Le fichier `.gitignore` empêche d'ajouter au dépôt les dossiers, comptes rendus, normes et réglages exportés. Ne jamais y ajouter de bilan réel.

## Développement

Aucune dépendance. Le fichier Word est écrit directement (archive ZIP de XML) par `js/docx.js`.

```
index.html        page
css/style.css     mise en forme (thème nature, mode jour et mode nuit)
js/sensoriel.js   bilan sensoriel : OTIPIS, Dunn 2, ESO, SensOT-dir (cartes et cotation)
js/sensot-jeu.js  jeu de cartes SensOT-dir passé par l'enfant à l'écran
js/occupation.js  autonomie, MCRO, OT'Hope, DCDQ, jeux de cartes
js/accueil.js     accueil adapté, plateforme TND, passations adaptées
js/seances.js     séances : modèle, périodes, filtres, regroupement par jour, programmation
js/clavier.js     frappe au clavier (EViC) : épreuves, mots par minute, comparaison avec la main
js/partage.js     partage chiffré entre praticiennes, fusion des dossiers, empreinte du code de verrouillage
js/suivi.js       plan de suivi, carnet des parents et documents d'accueil : axes de travail, exercices, calendrier, GAS
js/graphiques.js  graphiques en SVG (profils sensoriels, DS, critères du BHK, Man.O.S, MCRO, DCDQ, évolution)
js/dtvp3.js       DTVP-3 : cotation item par item, plafonds, scores bruts, composites, termes, score de différence
js/manos.js       Man.O.S : notes brutes, DS, temps, totaux, rédaction (grille et normes : fichier du cabinet)
js/bhk.js         référentiel, calculs, diagnostic, rédaction, modèle du document
js/docx.js        génération du .docx (texte, tableaux, images)
js/pdf.js         formulaires PDF à remplir (moteur générique, ESO) et relecture des réponses du PDF rempli
js/analyse.js     analyse locale de la photo de la copie (feuille, lignes, taille, marge, lignes non planes)
js/tri.js         écran de tri de cartes pour l'enfant (dont OT'Hope : 4 colonnes, réussites, souhaits, objectifs)
js/app.js         interface
tests/          tests (node --test)
```

Lancer les tests : `npm test` (Node 18 ou plus).
