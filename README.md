# Outil Ergo

Page web pour saisir un bilan en ergothérapie pédiatrique (occupations, écriture, bilan sensoriel), coter le **BHK enfant et ado**, rédiger un **diagnostic ergothérapique** avec des préconisations argumentées et produire le compte rendu en **Word (.docx)**, sur le modèle des comptes rendus du cabinet.

Tout se passe dans le navigateur : aucune donnée n'est envoyée en ligne.

En ligne (GitHub Pages, une fois activé) : https://lyza-environnement.github.io/Outil-Ergo/

## Utilisation

1. Ouvrir `index.html` dans un navigateur (ordinateur, tablette ou téléphone).
2. Au lancement, l'outil demande le profil tant qu'aucun n'est choisi : chaque praticien choisit le sien (ou le crée), et ses bilans sont signés à son nom. On change de profil avec le bouton en haut à droite.
3. **Réglages** (bouton ⚙️), une seule fois par appareil :
   - importer le fichier de normes du BHK (`normes-bhk-enfant.json`, fourni à part, voir plus bas) ;
   - renseigner le cabinet et les praticiens (en-tête, pied de page et signature du compte rendu) ;
   - exporter les réglages pour les réinstaller sur un autre appareil.
4. L'outil s'ouvre sur l'**accueil** (🏠, ou le logo) : séances du jour, rappels (séances prévues non notées, fin de forfait de la plateforme TND, copie de sécurité, code de verrouillage), dossiers récents, et deux boutons « Nouveau bilan » et « Noter une séance ». L'**enfant ouvert** est affiché en permanence en haut (« Léa M. ▾ ») : le toucher permet de changer d'enfant sans quitter l'onglet. Sur téléphone, les onglets sont en bas de l'écran.

5. Remplir les onglets du bilan dans l'ordre. Certains ont des sous-onglets, affichés juste en dessous. Un ✓ vert marque ce qui est rempli ; chaque partie a un encadré « Comment faire ? ».

| Onglet | Sous-onglets et contenu |
| --- | --- |
| 📁 Dossier | **Dossier** : Mes dossiers, identité, âge calculé, parents, prescription, scolarité, motif, accueil adapté, plateforme TND, bilans utilisés, réévaluation, résumé des séances. **Accueil adapté** (si la case est cochée) : questionnaire des parents, fiche « Ce qui aide », planning en images, « Ma visite » |
| 💬 Entretien | **Anamnèse** : développement, environnement, occupations à la maison et à l'école (vide = « RAS »). **Occupations** : grille d'autonomie dans les activités quotidiennes, MCRO (initiale et réévaluation), résultats de l'OT'Hope, tri de cartes « Mes activités » fait par l'enfant à l'écran |
| ✏️ Écriture | **Observation** : questionnaire d'auto-évaluation, grille d'observation de l'écriture manuscrite (posture, prise et tonus, geste graphique, lettres et chiffres, organisation de la page, lisibilité), environnement. **BHK** : BHK enfant (CP à CM2) ou BHK ado (6e à 3e) selon la classe choisie, normes, cotation ligne par ligne, DS par critère (enfant), vitesse, photo de la copie et son analyse, résultats, observations pendant la copie, douleur (EVA). **Clavier** : EViC, vitesse de frappe au clavier, chronométrée dans l'outil |
| 🌈 Bilans | **Sensoriel** : OTIPIS et profil OC, Profil sensoriel 2 de Dunn, ESO (synthèse et réponses détaillées), SensOT-dir, tri de cartes « Ce que je ressens ». **Moteur et autres** : Lespargot, Ajuriaguerra, DTVP-3, MABC-3, Man.OS, EVIC (DS et appréciation calculées), manipulations dans la main (Exner et Benbow), DCDQ, repères TDC |
| 📄 Compte rendu | Les quatre documents (aperçu, impression, Word), diagnostic ergothérapique, objectifs et préconisations proposées d'après les résultats, graphiques, texte modifiable section par section, réglage du plan de suivi |
| 📅 Séances | Planning de toutes les séances de suivi, pour tous les enfants : séances faites, prévues, annulées ; filtres ; programmation du plan de suivi ; impression |

Le bouton 🌙 / ☀️ passe du mode jour (par défaut) au mode nuit ; le choix est gardé sur l'appareil.

### Documents

L'onglet Compte rendu propose quatre documents, chacun avec **Aperçu**, **Imprimer** et **Word** :

| Document | Pour qui |
| --- | --- |
| Compte rendu de bilan | Famille et médecin |
| Synthèse pour l'école | Équipe éducative (sans anamnèse ni informations familiales) |
| Plan de suivi | Ergothérapeute seulement |
| Carnet d'activités | Parents, à imprimer et à garder à la maison |

L'onglet Accueil ajoute quatre documents : questionnaire pour les parents, « Ce qui aide », planning en images, « Ma visite ».

Dans la version ouverte depuis le lien claude.ai, l'impression directe n'est pas permise : « Imprimer » télécharge alors une page prête à imprimer.

### Diagnostic et préconisations

Le diagnostic regroupe les constats du bilan sur le plan de la personne, de l'environnement et des occupations, puis formule l'énoncé : « X présente des difficultés dans [occupations], en lien avec [facteurs] », suivi des points d'appui.

L'outil propose les préconisations justifiées par les résultats (par exemple un tiers-temps quand la vitesse du BHK est inférieure à la moyenne). L'ergothérapeute coche celles qu'elle retient ; le compte rendu indique pour chacune le constat qui la justifie.

### Tri de cartes à l'écran

L'enfant range lui-même des cartes sur la tablette (en les glissant ou en touchant la boîte), puis choisit les trois qui comptent le plus pour lui : activités qu'il voudrait mieux réussir, ou situations sensorielles qui le gênent le plus. Lecture des cartes à voix haute possible. Les cartes (textes et pictogrammes) sont propres à l'outil ; l'ergothérapeute peut ajouter ses cartes, avec photo, dans les réglages, et retirer des cartes pour un enfant. C'est une observation informelle, non étalonnée : elle complète les outils validés sans les remplacer. Les résultats alimentent le diagnostic (occupations difficiles, gênes sensorielles) et les objectifs.

### Réévaluation

« Charger le bilan précédent » garde les mesures comparables du dossier précédent (BHK, épreuves des autres bilans, moyennes de la MCRO, DCDQ). Le compte rendu ajoute une section « Évolution » avec un tableau ; une évolution est retenue à partir de 0,5 DS (2 points pour la MCRO). Si le dossier en cours est vide, l'identité, l'anamnèse et les activités de la MCRO sont reprises.

### Synthèse pour l'école

Un second document Word, court, pour l'équipe éducative : constats, points d'appui, aménagements scolaires et sensoriels retenus, suivi. Il ne contient ni l'anamnèse ni les informations familiales. Son texte est modifiable dans l'onglet Compte rendu.

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

### Repères TDC (ajout)

Dans Bilans › Moteur et autres, un encadré clairement signalé comme **ajout à titre indicatif** reprend les critères des recommandations internationales sur le trouble développemental de la coordination : Blank R., Barnett A. L., Cairney J. et al., *International clinical practice recommendations on the definition, diagnosis, assessment, intervention, and psychosocial aspects of developmental coordination disorder*, Developmental Medicine & Child Neurology, 2019, 61(3), 242-285, https://doi.org/10.1111/dmcn.14132.

Les critères I (MABC-3 au 16e percentile ou moins, 5e avant 5 ans) et II (DCDQ, grille d'autonomie, MCRO) sont renseignés d'après les résultats saisis ; l'ergothérapeute renseigne les critères III (début dans la petite enfance) et IV (autres causes écartées par le médecin). Le compte rendu ajoute un paragraphe marqué « Ajout, à titre indicatif », avec la source, et rappelle que le diagnostic est médical. Le plan de suivi rappelle les interventions recommandées (approches centrées sur l'activité, comme CO-OP ou l'entraînement aux tâches).

### Plan de suivi (document interne)

Un troisième document Word, réservé à l'ergothérapeute : analyse approfondie du bilan (résultats classés du plus fragile au plus solide, détail du BHK, OTIPIS, réponses de l'ESO, occupations, hypothèses de travail), axes de travail justifiés par les résultats, exercices en séance avec leur progression, échelles d'atteinte des objectifs (GAS), calendrier des séances (toutes les deux semaines par défaut, jusqu'à la réévaluation) et exercices à faire à la maison. Les exercices sont des pistes générales à adapter.

### Graphiques

Le compte rendu présente les profils en graphiques : profil des résultats en déviations standard, score de chaque critère du BHK, MCRO, DCDQ, évolution depuis le bilan précédent, OTIPIS, Profil sensoriel 2, ESO (roues, systèmes, réponses détaillées). Ils sont visibles dans l'onglet Compte rendu et insérés dans le Word.

### Ne rien perdre

- Chaque dossier s'enregistre tout seul dans le navigateur, à chaque modification (« Mes dossiers », onglet Dossier) ; un nouveau dossier ne remplace jamais le précédent. Il n'y a pas de bouton « Enregistrer ».
- Un badge, toujours visible dans la barre du haut, montre où en est l'enregistrement : « Enregistrement… », puis « ✓ Enregistré » avec l'heure, ou « ⚠️ Non enregistré » en cas d'échec. Le toucher ouvre « Où sont vos dossiers ? » : où sont les dossiers (sur cet appareil, rien n'est envoyé sur internet), le seul risque (appareil perdu ou changé, données du navigateur effacées), le nombre de dossiers, la date de la dernière copie de sécurité et un bouton pour en faire une. La carte « Vos données » de l'accueil reprend ces informations.
- La **copie de sécurité** télécharge tous les dossiers (et les réglages) dans un seul fichier, à ranger ou à transférer sur un autre appareil ; un rappel s'affiche après une semaine sans copie.
- Effacer une cotation, un tri, une photo ou un dossier peut s'annuler pendant quelques secondes (bouton « Annuler »).
- Le navigateur est prié de ne pas effacer les données de l'outil quand l'appareil manque de place.

### Questionnaires protégés

Les questions et cartes du Profil sensoriel 2, de l'ESO, du SensOT-dir, de l'OT'Hope, du DCDQ et des questionnaires d'auto-évaluation ne sont pas reproduites. Pour l'ESO, les réponses se saisissent par numéro de question (0 à 10) ; l'ergothérapeute peut coller le texte de son propre exemplaire dans les réglages pour l'afficher à côté des réponses (il reste dans son navigateur). L'outil reçoit leurs scores, classifications et résultats. Pour le questionnaire d'auto-évaluation, l'ergothérapeute saisit elle-même les libellés dans les réglages, et range chaque question dans un domaine (lisibilité, satisfaction et émotions, vitesse) ; ils restent dans son navigateur. La version du cabinet les intègre (`auto` dans les réglages intégrés : nom, questions, domaines), hors du dépôt : le questionnaire apparaît directement dans Écriture › Observation, chaque question marquée de sa thématique. Ailleurs, importer le fichier de normes du cabinet (qui contient aussi `auto`) l'installe en une fois. L'outil compte le nombre de réponses dans chaque colonne et, par domaine, les réponses « souvent » ou « toujours » ; le compte rendu reprend ce résumé et un tableau groupé par domaine.

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

Les normes du BHK viennent du manuel édité par les Éditions et Applications Psychologiques. Elles **ne sont pas dans ce dépôt** (il est public) : on les importe une fois par appareil depuis un fichier JSON gardé à part. Pour un usage personnel, une version du fichier HTML peut les intégrer (variable `window.NORMES_INTEGREES` définie avant les scripts) : elle calcule sans import, et ne doit pas être publiée. Format :

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

Une version du cabinet peut aussi intégrer l'en-tête et les praticiens (variable `window.REGLAGES_INTEGRES`, avec `cabinet`, `praticiens`, au besoin `retires` : noms à retirer des réglages déjà enregistrés, et `auto` : questionnaire d'auto-évaluation du cabinet). Les praticiens intégrés sont ajoutés aux réglages s'ils n'y sont pas.

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
js/sensoriel.js   bilan sensoriel : OTIPIS, Dunn 2, ESO, SensOT-dir
js/occupation.js  autonomie, MCRO, OT'Hope, DCDQ, jeux de cartes
js/accueil.js     accueil adapté, plateforme TND, passations adaptées
js/seances.js     séances : modèle, périodes, filtres, regroupement par jour, programmation
js/clavier.js     frappe au clavier (EViC) : épreuves, mots par minute, comparaison avec la main
js/partage.js     partage chiffré entre praticiennes, fusion des dossiers, empreinte du code de verrouillage
js/suivi.js       plan de suivi, carnet des parents et documents d'accueil : axes de travail, exercices, calendrier, GAS
js/graphiques.js  graphiques en SVG (profils sensoriels, DS, critères du BHK, MCRO, DCDQ, évolution)
js/bhk.js         référentiel, calculs, diagnostic, rédaction, modèle du document
js/docx.js        génération du .docx (texte, tableaux, images)
js/analyse.js     analyse locale de la photo de la copie (feuille, lignes, taille, marge, lignes non planes)
js/tri.js         écran de tri de cartes pour l'enfant
js/app.js         interface
tests/          tests (node --test)
```

Lancer les tests : `npm test` (Node 18 ou plus).
