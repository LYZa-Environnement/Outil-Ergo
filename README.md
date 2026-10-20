# Outil Ergo

Page web pour saisir un bilan en ergothérapie (écriture et bilan sensoriel), coter le **BHK enfant**, rédiger un **diagnostic ergothérapique** avec des préconisations argumentées et produire le compte rendu en **Word (.docx)**, sur le modèle des comptes rendus du cabinet.

Tout se passe dans le navigateur : aucune donnée n'est envoyée en ligne.

En ligne (GitHub Pages, une fois activé) : https://lyza-environnement.github.io/Outil-Ergo/

## Utilisation

1. Ouvrir `index.html` dans un navigateur (ordinateur, tablette ou téléphone).
2. **Réglages**, une seule fois par appareil :
   - importer le fichier de normes du BHK (`normes-bhk-enfant.json`, fourni à part, voir plus bas) ;
   - renseigner le cabinet et les praticiens (en-tête, pied de page et signature du compte rendu) ;
   - exporter les réglages pour les réinstaller sur un autre appareil.
3. Remplir les onglets dans l'ordre :

| Onglet | Contenu |
| --- | --- |
| Dossier | Identité, âge calculé, parents, prescription, scolarité, motif, bilans utilisés |
| Anamnèse | Développement, environnement, occupations à la maison et à l'école (vide = « RAS ») |
| Écriture | Questionnaire d'auto-évaluation ; grille d'observation de l'écriture manuscrite : posture, prise et tonus, geste graphique, lettres et chiffres, organisation de la page, lisibilité ; environnement |
| BHK | BHK enfant (CP à CM2) ou BHK ado (6e à 3e) selon la classe choisie. Normes (classe ou âge, selon le sexe ou ensemble ; pour l'ado, classe ou tous niveaux), cotation ligne par ligne, DS par critère (enfant), vitesse, photo de la copie, résultats, observations pendant la copie, douleur (EVA) |
| Sensoriel | Observations cliniques OTIPIS et profil OC, Profil sensoriel 2 de Dunn (enfant, compagnon scolaire), synthèse ESO (roues et systèmes sensoriels), résultats du SensOT-dir |
| Autres bilans | Lespargot, Ajuriaguerra, DTVP-3, MABC-3, Man.OS, EVIC : scores saisis selon leur type, DS et appréciation calculées ; manipulations dans la main (Exner et Benbow) |
| Compte rendu | Diagnostic ergothérapique (constats personne, environnement, occupations), objectifs et préconisations proposées d'après les résultats, texte modifiable section par section, téléchargement Word avec graphiques, aperçu |

### Diagnostic et préconisations

Le diagnostic regroupe les constats du bilan sur le plan de la personne, de l'environnement et des occupations, puis formule l'énoncé : « X présente des difficultés dans [occupations], en lien avec [facteurs] », suivi des points d'appui.

L'outil propose les préconisations justifiées par les résultats (par exemple un tiers-temps quand la vitesse du BHK est inférieure à la moyenne). L'ergothérapeute coche celles qu'elle retient ; le compte rendu indique pour chacune le constat qui la justifie.

### Questionnaires protégés

Les questions du Profil sensoriel 2, de l'ESO, du SensOT-dir et des questionnaires d'auto-évaluation ne sont pas reproduites. L'outil reçoit leurs scores, classifications et résultats. Pour le questionnaire d'auto-évaluation, l'ergothérapeute saisit elle-même les libellés dans les réglages ; ils restent dans son navigateur.

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

Les normes du BHK viennent du manuel édité par les Éditions et Applications Psychologiques. Elles **ne sont pas dans ce dépôt** : on les importe dans l'outil depuis un fichier JSON gardé à part. Format :

```json
{
  "type": "bhk-normes",
  "version": 2,
  "qualite": {
    "classe": { "CP": { "F": [10.0, 2.0], "M": [11.0, 2.5], "E": [10.5, 2.2] } },
    "age": { "6": { "F": [10.0, 2.0], "M": [11.0, 2.5], "E": [10.5, 2.2] } }
  },
  "vitesse": { "classe": {}, "age": {} }
}
```

Une clé `ado` donne les normes du BHK ado : `ado.vitesse.classe` et `ado.qualite.classe` (de `6e` à `3e`), et `ado.qualite.global` pour la norme de qualité tous niveaux.

Chaque valeur est `[moyenne, écart-type]` ; `F` filles, `M` garçons, `E` ensemble. Les nombres ci-dessus sont fictifs. Une clé facultative `criteres` donne, pour chaque critère de 1 à 13 et chaque classe, les normes du critère : elle sert au DS par critère.

Dans les tableaux du manuel par critère, quelques valeurs sont incohérentes (par exemple un écart-type de 0,01 pour le critère 1 des filles de CE2, ou une moyenne de l'ensemble qui ne correspond pas à celles des filles et des garçons pour le critère 9 en CM1 et CM2). L'outil les reprend telles quelles et affiche « < −5 » quand le DS dépasse cette valeur.

## Données personnelles

Le fichier `.gitignore` empêche d'ajouter au dépôt les dossiers, comptes rendus, normes et réglages exportés. Ne jamais y ajouter de bilan réel.

## Développement

Aucune dépendance. Le fichier Word est écrit directement (archive ZIP de XML) par `js/docx.js`.

```
index.html        page
css/style.css     mise en forme (cahier Seyès, thème sombre)
js/sensoriel.js   bilan sensoriel : OTIPIS, Dunn 2, ESO, SensOT-dir
js/graphiques.js  profils en SVG (OTIPIS, Dunn 2, ESO)
js/bhk.js         référentiel, calculs, diagnostic, rédaction, modèle du document
js/docx.js        génération du .docx (texte, tableaux, images)
js/app.js         interface
tests/          tests (node --test)
```

Lancer les tests : `npm test` (Node 18 ou plus).
