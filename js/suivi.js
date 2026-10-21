/*
 * Outil Ergo : plan de suivi, document interne pour l'ergothérapeute.
 * Analyse approfondie du bilan, axes de travail justifiés, pistes d'exercices en séance,
 * planning des séances (toutes les deux semaines par défaut), exercices à la maison et objectifs GAS.
 * Les exercices sont des pistes générales à adapter à chaque enfant.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique(require("./bhk.js"), require("./occupation.js"), require("./sensoriel.js"));
  else racine.Suivi = fabrique(racine.BHK, racine.Occup, racine.Senso);
})(typeof self !== "undefined" ? self : this, function (B, O, S) {
  "use strict";

  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }

  /* ================= Axes de travail et exercices ================= */

  // cles : indicateurs du bilan (voir BHK.indicateurs) qui rendent l'axe prioritaire.
  // seance : [titre, déroulé, progression] ; maison : [titre, consigne, fréquence].
  const AXES = [
    {
      id: "graphisme", titre: "Geste graphique et lisibilité", cles: ["qualite", "geste", "lignage", "ratures"],
      cle: "Verbaliser le trajet des lettres, travailler en grand avant de réduire, toujours terminer par une écriture en situation réelle.",
      seance: [
        ["Grands tracés sur plan vertical", "Au tableau ou sur une feuille fixée au mur : boucles, ponts, vagues et ronds, en suivant un rythme (comptine, métronome).", "Réduire la taille, passer au plan incliné puis à la table."],
        ["Familles de lettres", "Regrouper les lettres par geste de départ (rondes : a, c, d, g, o, q ; à boucle : b, e, f, h, k, l ; à pont : m, n). Tracer en disant le trajet à voix haute.", "Lettre isolée, puis liaisons, puis mots courts."],
        ["Tracés multisensoriels", "Tracer les lettres difficiles dans un bac de semoule, sur une ardoise, avec le doigt dans le dos (l'enfant devine).", "Yeux fermés, puis vitesse croissante."],
        ["Copie avec autocorrection", "Copier une phrase courte puis vérifier soi-même trois critères avec une grille : taille régulière, lettres posées sur la ligne, espaces entre les mots.", "Allonger le texte, retirer progressivement la grille."],
        ["Repères visuels sur la feuille", "Trait de couleur pour la marge, point vert de départ en début de ligne, bâtonnet ou doigt pour l'espace entre les mots.", "Retirer les repères un à un quand ils ne sont plus utiles."],
        ["Labyrinthes et tracés entre deux lignes", "Chemins de plus en plus étroits, sans toucher les bords, au crayon puis au stylo.", "Réduire la largeur, ajouter un temps limité."],
      ],
      maison: [
        ["Dessin au mur", "Dessiner ou colorier sur une grande feuille scotchée au mur ou sur une ardoise posée verticalement.", "10 minutes, 3 fois par semaine"],
        ["Lettres dans la semoule", "Tracer avec le doigt dans un plateau de semoule ou de sable les lettres travaillées en séance.", "5 minutes, 3 fois par semaine"],
        ["Écriture plaisir", "Écrire pour de vrai : liste de courses, carte postale, mot pour un proche, en soignant une seule chose à la fois.", "Une fois par semaine"],
      ],
    },
    {
      id: "vitesse", titre: "Vitesse et automatisation de l'écriture", cles: ["vitesse", "vitesseForte"],
      cle: "La vitesse vient de l'automatisation : entraîner des enchaînements fréquents, mesurer et montrer les progrès à l'enfant.",
      seance: [
        ["Mots outils automatisés", "Écrire plusieurs fois, de mémoire, les petits mots fréquents (le, les, et, est, on, un, une, dans, pour), en cherchant la fluidité.", "Passer aux groupes de mots puis aux phrases dictées."],
        ["Écriture chronométrée", "Écrire une phrase connue pendant une minute ; noter le nombre de caractères sur un graphique de progression tenu par l'enfant.", "Changer de phrase, viser la régularité avant la vitesse."],
        ["Liaisons fréquentes", "Enchaîner les liaisons les plus courantes (on, ou, an, en, er, re, es) en rythme, sans lever le crayon.", "Augmenter le tempo, intégrer dans des mots."],
        ["Prise de notes simplifiée", "Pour les plus grands : abréviations utiles (cad, qd, pr, ds, tjs), mots clés, flèches.", "Prendre en notes une courte consigne orale."],
      ],
      maison: [
        ["Petite dictée de mots outils", "Un adulte dicte 5 à 8 mots outils ; l'enfant les écrit sans se presser puis les relit.", "5 minutes, 3 fois par semaine"],
        ["Mon graphique de vitesse", "Écrire une phrase connue pendant une minute et colorier le résultat sur le graphique donné en séance.", "Une fois par semaine"],
      ],
    },
    {
      id: "clavier", titre: "Outil numérique et frappe au clavier", cles: ["vitesseForte", "clavier"],
      cle: "Le clavier compense quand l'écrit manuscrit reste trop coûteux ; il s'apprend progressivement, en séance et à la maison.",
      seance: [
        ["Position et doigté", "Installation devant l'ordinateur, position des mains sur la rangée de repère, premières touches avec un logiciel ou un site d'apprentissage ludique.", "Ajouter une rangée par étape, sans regarder le clavier."],
        ["Copie au clavier", "Recopier une phrase connue au clavier et comparer le temps avec l'écriture manuscrite.", "Textes plus longs, ponctuation, majuscules."],
        ["Outils utiles en classe", "Correcteur, dictée vocale, raccourcis (copier, coller, annuler), enregistrement des fichiers.", "Utiliser l'ordinateur pour un vrai devoir."],
      ],
      maison: [
        ["Entraînement à la frappe", "Exercices courts sur le logiciel choisi en séance, sans regarder le clavier.", "10 minutes, 4 fois par semaine"],
      ],
    },
    {
      id: "motricite", titre: "Motricité fine, manipulations et dosage de la force", cles: ["motriciteFine", "pression", "douleur"],
      cle: "Renforcer la main et dissocier les doigts par le jeu ; travailler le relâchement quand l'appui est trop fort ou douloureux.",
      seance: [
        ["Pâte à modeler", "Rouler des boudins, faire de petites boules entre le pouce et l'index, pincer, cacher et retrouver des perles dans la pâte.", "Pâte plus ferme, objets plus petits."],
        ["Pinces et tri", "Trier perles ou pompons avec une pince à linge, une pince à épiler ou une pince à sucre.", "Objets plus petits, temps limité."],
        ["Manipulations dans la main", "Faire passer des pièces une à une de la paume aux doigts pour les glisser dans une tirelire ; visser et dévisser des bouchons ; faire tourner un crayon entre les doigts.", "Plusieurs objets tenus en même temps."],
        ["Dosage de l'appui", "Dessiner « la pluie » (appui léger) puis « l'orage » (appui fort) ; écrire sur un papier fin posé sur un papier carbone pour voir la trace.", "Écrire une phrase avec un appui juste."],
        ["Jeux de précision", "Mikado, tour en bois, puces, jeux d'enfilage et de laçage.", "Augmenter la précision demandée."],
      ],
      maison: [
        ["Coup de main en cuisine", "Tartiner, éplucher une clémentine, malaxer une pâte, ouvrir des bocaux.", "Dès que l'occasion se présente"],
        ["Jardinage", "Arroser avec un vaporisateur, planter des graines une à une, cueillir des petits fruits.", "2 à 3 fois par semaine"],
        ["Pinces à linge", "Accrocher le linge ou des cartes avec des pinces à linge, avec chaque doigt opposé au pouce.", "5 minutes, 3 fois par semaine"],
        ["Mains détendues", "Avant les devoirs : secouer les mains, auto-massage, étirer les doigts.", "Avant chaque séance de devoirs"],
      ],
    },
    {
      id: "posture", titre: "Posture, stabilité et installation", cles: ["posture", "postural", "fatigue"],
      cle: "Une bonne base (pieds à plat, table à hauteur des coudes) et une ceinture des épaules plus solide libèrent la main.",
      seance: [
        ["Installation", "Régler la chaise et la table, caler les pieds, incliner la feuille selon la main d'écriture ; tester un plan incliné.", "Transposer les réglages à la maison et en classe."],
        ["Renforcement des épaules", "Marche en brouette, ramper sous un tunnel, pousser un mur ou un gros ballon, tirer une corde.", "Allonger la durée, ajouter un parcours."],
        ["Gainage ludique", "Positions de l'avion (sur le ventre) et du crabe, tenir le temps d'une chanson.", "Augmenter le temps, ajouter un lancer de balle."],
        ["Travail à quatre pattes", "Puzzles ou jeux posés au sol, en appui sur les avant-bras ou à quatre pattes.", "Lever un bras ou une jambe."],
      ],
      maison: [
        ["Coin devoirs", "Pieds à plat (cale-pieds si besoin), table à hauteur des coudes, bonne lumière.", "À installer une fois, à vérifier chaque semaine"],
        ["Jeux de force", "Brouette, lutte de coussins, porter les courses légères, grimper au parc.", "10 minutes, 3 fois par semaine"],
      ],
    },
    {
      id: "praxies", titre: "Planification motrice et coordination", cles: ["praxies"],
      cle: "Approche orientée vers la tâche : l'enfant choisit l'activité, se fixe un but, fait un plan, essaie et vérifie (démarche de type CO-OP).",
      seance: [
        ["But, plan, faire, vérifier", "Sur une activité choisie par l'enfant (lacets, vélo, découpage…), l'aider à trouver lui-même sa stratégie et à la vérifier.", "Transférer la stratégie à une autre activité."],
        ["Parcours moteur", "Parcours avec consignes à mémoriser (sauter, ramper, enjamber) ; l'enfant le décrit avant de le faire.", "Allonger la séquence, l'enfant crée son parcours."],
        ["Imitation de gestes", "Reproduire des postures ou une courte chorégraphie, puis la faire reproduire à l'adulte.", "Séquences plus longues, en miroir."],
        ["Constructions d'après modèle", "Briques, tangram, perles à enfiler selon un modèle.", "Modèle en photo, puis de mémoire."],
        ["Lancer et attraper", "Ballon de baudruche, puis balle de plus en plus petite ; cibles au sol.", "Distance et vitesse croissantes."],
      ],
      maison: [
        ["Activité choisie", "S'entraîner à l'activité choisie en séance (lacets, vélo…) en rappelant le plan à voix haute.", "5 minutes par jour"],
        ["Jeux de balle", "Lancer et attraper en famille, jeux de quilles ou de pétanque.", "2 à 3 fois par semaine"],
      ],
    },
    {
      id: "visuel", titre: "Perception visuelle et coordination œil-main", cles: ["visuel", "discrimination"],
      cle: "Entraîner l'analyse visuelle en lien avec le geste : repérer, comparer, reproduire.",
      seance: [
        ["Reproduction sur géoplan", "Reproduire une figure avec des élastiques sur un géoplan ou des points à relier.", "Figures plus complexes, modèle retiré."],
        ["Recherche visuelle", "Jeux de différences, cherche-et-trouve, barrer une lettre ou un symbole.", "Fonds plus chargés, temps limité."],
        ["Puzzles et tangram", "Puzzles adaptés à l'âge, tangram d'après modèle.", "Modèles sans les contours."],
        ["Copie de figures", "Reproduire des figures géométriques sur papier quadrillé puis blanc.", "Figures composées, mise en page."],
      ],
      maison: [
        ["Jeux de société visuels", "Jeux d'observation et de rapidité visuelle, puzzles, labyrinthes.", "2 à 3 fois par semaine"],
      ],
    },
    {
      id: "regulation", titre: "Régulation sensorielle et attention", cles: ["modulation", "recherche", "evitement", "sensibilite", "enregistrement", "auditif", "tactile", "attention"],
      cle: "Construire avec l'enfant ses propres outils de régulation ; ne jamais imposer une sensation, avancer à son rythme.",
      seance: [
        ["Activités proprioceptives", "Porter, pousser, tirer, sauter sur un trampoline avant une tâche qui demande de la concentration.", "L'enfant choisit lui-même l'activité qui l'aide."],
        ["Thermomètre du corps", "Repérer avec l'enfant son niveau d'éveil (trop agité, fatigué, prêt) et ce qui l'aide à revenir à « prêt ».", "Utiliser le thermomètre en classe et à la maison."],
        ["Découverte tactile choisie", "Bacs sensoriels (riz, sable, pâte) explorés par l'enfant, avec un outil puis avec les mains, toujours à son rythme.", "Durée et textures choisies par l'enfant."],
        ["Écoute et bruit", "Jeux d'écoute (reconnaître des sons, du plus doux au plus fort), essai du casque anti-bruit.", "Préparer les moments bruyants (cantine, récréation)."],
        ["Routine sensorielle", "Construire avec l'enfant et sa famille une routine de la journée (réveil, avant l'école, après l'école, coucher).", "Ajuster selon le carnet de bord des parents."],
      ],
      maison: [
        ["Pauses de mouvement", "Entre deux exercices de devoirs : 2 minutes de sauts, porter un sac de livres, pousser le mur.", "À chaque séance de devoirs"],
        ["Coin calme", "Un endroit choisi avec l'enfant (coussin, lumière douce, casque) pour se poser après l'école.", "Chaque jour si besoin"],
        ["Carnet de bord", "Noter les moments difficiles et ce qui a aidé, à rapporter à la séance suivante.", "Tout au long des deux semaines"],
      ],
    },
    {
      id: "autonomie", titre: "Autonomie dans les activités quotidiennes", cles: ["avq"],
      cle: "Travailler l'activité elle-même, découpée en étapes, avec des adaptations si besoin, puis la pratiquer chaque jour à la maison.",
      seance: [
        ["Chaînage arrière", "L'adulte fait les premières étapes, l'enfant fait la dernière (par exemple serrer la boucle des lacets), puis une étape de plus à chaque fois.", "L'enfant réalise toute l'activité seul."],
        ["Boutons et fermetures", "Tableau d'activités : gros boutons, puis petits, fermeture éclair, pressions.", "Sur ses propres vêtements, avec un temps limité."],
        ["Couper ses aliments", "Couper de la pâte à modeler, puis une banane, puis des aliments plus fermes, en tenant la fourchette pour stabiliser.", "Au repas, avec ses propres couverts."],
        ["Séquence visuelle", "Pictogrammes de l'habillage ou de la toilette, dans l'ordre, que l'enfant suit seul.", "Retirer les images une à une."],
      ],
      maison: [
        ["Le défi du jour", "Laisser l'enfant faire seul l'étape travaillée en séance (même si c'est plus long), le féliciter.", "Chaque jour"],
        ["Préparer les vêtements la veille", "Poser les vêtements dans l'ordre d'habillage.", "Chaque soir"],
      ],
    },
  ];

  /* ================= Planning ================= */

  const FREQUENCES = [[7, "Chaque semaine"], [14, "Toutes les deux semaines"], [21, "Toutes les trois semaines"], [28, "Toutes les quatre semaines"]];
  const DUREES = ["30", "45", "60"];
  const MOIS_REEVAL = { "3 mois": 3, "6 mois": 6, "un an": 12 };

  function suiviVide() { return { debut: "", frequence: "14", nombre: "", duree: "45", exclus: [], notes: "" }; }

  function normaliserSuivi(src) {
    const s = suiviVide();
    if (!src || typeof src !== "object") return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(texte(src.debut))) s.debut = src.debut;
    if (FREQUENCES.some((f) => String(f[0]) === String(src.frequence))) s.frequence = String(src.frequence);
    const n = B.nombre(src.nombre);
    if (n !== null && n >= 1 && n <= 60) s.nombre = String(Math.round(n));
    if (DUREES.indexOf(String(src.duree)) >= 0) s.duree = String(src.duree);
    if (Array.isArray(src.exclus)) s.exclus = src.exclus.map(texte).filter((id) => AXES.some((a) => a.id === id));
    s.notes = texte(src.notes);
    return s;
  }

  function ajouterJours(iso, j) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return "";
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + j));
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }

  // Axes proposés d'après le bilan, du plus justifié au moins justifié.
  function axesProposes(d, reg) {
    const ind = B.indicateurs(d, reg);
    return AXES.map((a, rang) => {
      const cles = a.cles.filter((k) => ind.raisons[k]);
      return { id: a.id, titre: a.titre, raisons: cles.map((k) => ind.raisons[k]), poids: cles.length, rang: rang };
    }).sort((x, y) => (y.poids > 0) - (x.poids > 0) || x.rang - y.rang);
  }

  function parametres(d) {
    const s = normaliserSuivi(d.suivi);
    const freq = +s.frequence;
    const debut = s.debut || ajouterJours(d.passation || B.aujourdhui(), freq);
    const mois = MOIS_REEVAL[texte(d.reevaluation).trim()] || 6;
    const nombre = s.nombre ? +s.nombre : Math.max(3, Math.round((mois * 30.4) / freq));
    return { s: s, frequence: freq, debut: debut, nombre: nombre, duree: +s.duree, mois: mois };
  }

  function planning(dossier, reglages) {
    const d = B.normaliserDossier(dossier);
    const reg = B.normaliserReglages(reglages);
    const p = parametres(d);
    const proposes = axesProposes(d, reg);
    let axes = proposes.filter((a) => a.poids > 0 && p.s.exclus.indexOf(a.id) < 0);
    if (!axes.length) axes = proposes.filter((a) => p.s.exclus.indexOf(a.id) < 0).slice(0, 2);
    const defs = axes.map((a) => AXES.find((x) => x.id === a.id));
    const ind = B.indicateurs(d, reg);
    const objectifs = lignes(d.objectifsLibre).concat(ind.objectifs);
    const seances = [];
    const milieu = p.nombre >= 6 ? Math.round(p.nombre / 2) : -1;
    let k = 0;
    for (let i = 1; i <= p.nombre; i++) {
      const date = ajouterJours(p.debut, (i - 1) * p.frequence);
      if (i === 1) {
        seances.push({ num: i, date: date, phase: "Lancement", titre: "Objectifs partagés et ligne de base",
          contenu: ["Restituer le bilan à l'enfant avec des mots simples ; choisir ensemble 2 ou 3 objectifs (échelles GAS ci-dessous).",
            "Ligne de base : échantillon d'écriture daté, phrase connue écrite en une minute, observation de l'activité choisie.",
            "Présenter le programme maison et le carnet de bord."],
          maison: defs.length ? [defs[0].maison[0]] : [] });
        continue;
      }
      if (i === p.nombre && p.nombre > 1) {
        seances.push({ num: i, date: date, phase: "Réévaluation", titre: "Réévaluation et bilan avec la famille",
          contenu: ["Refaire les mesures du bilan (BHK, MCRO et autres épreuves concernées) et coter les échelles GAS.",
            "Comparer avec le bilan initial (charger le dossier précédent dans l'outil) ; décider de la suite avec la famille et l'école."],
          maison: [] });
        continue;
      }
      if (i === milieu) {
        seances.push({ num: i, date: date, phase: "Point d'étape", titre: "Point d'étape",
          contenu: ["Coter les échelles GAS, regarder le graphique de vitesse et les productions avec l'enfant.",
            "Ajuster les objectifs et le programme maison ; faire le lien avec l'enseignant (aménagements en place, effets observés)."],
          maison: defs.length ? [defs[(k) % defs.length].maison[k % defs[(k) % defs.length].maison.length]] : [] });
        continue;
      }
      const avance = (i - 1) / Math.max(1, p.nombre - 1);
      const phase = avance < 0.4 ? "Apprentissage" : avance < 0.75 ? "Entraînement" : "Transfert";
      const principal = defs.length ? defs[k % defs.length] : null;
      const second = defs.length > 1 ? defs[(k + 1) % defs.length] : null;
      const tour = Math.floor(k / Math.max(1, defs.length));
      const ex = (axe, decal) => axe.seance[(tour + decal) % axe.seance.length];
      const contenu = [];
      if (principal) {
        const e1 = ex(principal, 0);
        contenu.push(principal.titre + " : " + e1[0].toLowerCase() + ". " + e1[1] + (phase !== "Apprentissage" ? " Progression : " + e1[2].charAt(0).toLowerCase() + e1[2].slice(1) : ""));
      }
      if (second) {
        const e2 = ex(second, 1);
        contenu.push(second.titre + " : " + e2[0].toLowerCase() + ". " + e2[1]);
      }
      if (phase === "Transfert") contenu.push("Mise en situation réelle : un écrit ou une activité de la vie quotidienne apportés par l'enfant (cahier, devoir, vêtement, repas…).");
      if (objectifs.length) contenu.push("Fil rouge : " + objectifs[k % objectifs.length].replace(/\.$/, "") + ".");
      seances.push({ num: i, date: date, phase: phase, titre: principal ? principal.titre : "Séance", contenu: contenu,
        maison: principal ? [principal.maison[tour % principal.maison.length]] : [] });
      k++;
    }
    return { parametres: p, axes: axes, proposes: proposes, seances: seances, objectifs: objectifs };
  }

  function lignes(t) { return texte(t).split("\n").map((x) => x.trim().replace(/^[-–•]\s*/, "")).filter(Boolean).map((x) => x.charAt(0).toUpperCase() + x.slice(1)); }

  /* ================= Analyse approfondie ================= */

  function analyse(d, reg, a) {
    const l = [];
    const r = B.calculerBHK(d, reg);
    const ind = B.indicateurs(d, reg);
    const tests = B.calculerTests(d, reg);

    // Résultats chiffrés, du plus faible au plus élevé
    const mesures = [];
    if (r.complet && r.perfQ !== null) mesures.push([r.nomTest + ", qualité", r.perfQ, "DS " + B.formaterDS(r.dsQ)]);
    if (r.dsV !== null) mesures.push([r.nomTest + ", vitesse", r.dsV, "DS " + B.formaterDS(r.dsV) + ", " + B.formaterNombre(r.cpm, 1) + " caractères par minute"]);
    tests.filter((t) => t.fait).forEach((t) => t.lignes.filter((x) => x.ds !== null).forEach((x) => mesures.push([t.court + ", " + x.epreuve, x.ds, "DS " + B.formaterDS(x.ds)])));
    if (mesures.length) {
      l.push("Résultats chiffrés, du plus fragile au plus solide :");
      mesures.sort((x, y) => x[1] - y[1]).forEach((m) => l.push("– " + m[0] + " : " + m[2] + " (" + B.APPRECIATIONS[B.niveau(m[1], reg)].toLowerCase() + ")"));
      l.push("");
    }

    // BHK en détail
    if (r.complet) {
      const def = r.liste.map((c, i) => ({ c: c, s: r.scores[i], k: r.criteres[i] })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s);
      l.push("Détail du " + r.nomTest + " :");
      r.domaines.forEach((dm) => l.push("– " + dm.nom.charAt(0).toUpperCase() + dm.nom.slice(1) + " : " + dm.total + "/" + dm.max + " points de dégradation"));
      if (def.length) l.push("– Critères en cause : " + joindre(def.map((x) => x.c.nom.toLowerCase() + " " + x.s + "/5" + (x.k.ds !== null ? " (DS " + B.formaterDS(x.k.ds) + ")" : ""))));
      l.push("");
    }

    // Bilan sensoriel en détail
    const s = d.senso;
    if (s.otipis.fait === "oui") {
      const syn = S.syntheseOtipis(s.otipis);
      const doms = syn.domaines.filter((x) => x.marquees.length || x.legeres.length);
      if (doms.length) {
        l.push("Observations OTIPIS par domaine :");
        doms.forEach((x) => l.push("– " + S.DOMAINES_OC.find((y) => y.id === x.id).nom + " : " + x.marquees.length + " item(s) en difficulté marquée, " + x.legeres.length + " en légère difficulté (" + joindre(x.marquees.concat(x.legeres).slice(0, 6).map((it) => it.nom.toLowerCase())) + ")"));
        l.push("");
      }
    }
    if (s.eso.fait === "oui") {
      const items = S.itemsEso(s.eso, reg.esoLibelles).filter((x) => x.n > 0);
      if (items.length) {
        l.push("ESO, réponses détaillées (0 = jamais, 10 = toujours) :");
        items.forEach((x) => {
          const f = (it) => "n° " + it.num + (it.libelle ? " « " + it.libelle.replace(/\s*\(ex[^)]*\)/i, "") + " »" : "") + " : " + it.v;
          l.push("– " + x.nom + " (moyenne " + B.formaterNombre(x.moyenne, 1) + ")");
          if (x.forts.length) l.push("– Réponses fortes (8 à 10) : " + x.forts.map(f).join(" ; "));
          if (x.faibles.length) l.push("– Réponses faibles (0 à 2) : " + x.faibles.map(f).join(" ; "));
        });
        l.push("Lire chaque réponse selon le sens de la question (certaines décrivent une capacité, d'autres une difficulté).");
        l.push("");
      }
    }

    // Occupations
    const occ = O.constats(d, a, B.ageMois(d));
    if (occ.occupations.length) {
      l.push("Occupations :");
      occ.occupations.forEach((x) => l.push("– " + x.charAt(0).toUpperCase() + x.slice(1)));
      l.push("");
    }

    // Hypothèses de travail
    if (ind.facteurs.length) {
      l.push("Hypothèses de travail (à vérifier en séance) :");
      ind.facteurs.forEach((f) => l.push("– " + f.charAt(0).toUpperCase() + f.slice(1) + " : quel retentissement sur les occupations ciblées ? Quelles stratégies l'enfant utilise-t-il déjà ?"));
      l.push("");
    }
    const appui = [];
    if (texte(d.conclusionForces).trim()) appui.push(texte(d.conclusionForces).trim().replace(/\.$/, ""));
    if (d.reperage === "bon") appui.push("bonne prise d'informations visuelles en copie");
    if (appui.length) l.push("Points d'appui pour l'intervention : " + appui.join(" ; ") + ".");
    return l.join("\n").trim();
  }

  /* ================= Document Word ================= */

  function modeleSuivi(dossier, reglages) {
    const d = B.normaliserDossier(dossier);
    const reg = B.normaliserReglages(reglages);
    const a = B.accords(d);
    const plan = planning(d, reg);
    const p = plan.parametres;
    const c = (t, o) => B.cellule(t, o);
    const nomComplet = [texte(d.prenom).trim(), texte(d.nom).trim().toUpperCase()].filter(Boolean).join(" ");
    const r = B.calculerBHK(d, reg);
    const blocs = [
      { type: "titre", texte: "Plan de suivi en ergothérapie" },
      { type: "p", runs: [{ t: "Document de travail réservé à l'ergothérapeute, à ne pas transmettre en l'état.", i: true }] },
      { type: "tableau", largeurs: [0.34, 0.66], lignes: [
        ["Enfant", nomComplet + (r.age ? ", " + B.formaterAge(r.age) : "") + (B.TOUTES_CLASSES.indexOf(d.groupe) >= 0 ? ", " + d.groupe : "")],
        ["Bilan du", B.dateCourte(d.passation)],
        ["Séances", p.nombre + " séances de " + p.duree + " minutes, " + FREQUENCES.find((f) => f[0] === p.frequence)[1].toLowerCase() + ", à partir du " + B.dateCourte(p.debut)],
      ].map((x) => ({ cellules: [c(x[0], { gras: true }), c(x[1])] })) },
    ];
    const h = (niveau, t) => blocs.push({ type: "h", niveau: niveau, texte: t });
    const txt = (t) => blocs.push.apply(blocs, B.texteVersBlocs(t));

    h(2, "Analyse approfondie du bilan");
    const an = analyse(d, reg, a);
    txt(an || "[Saisir les résultats du bilan pour obtenir l'analyse.]");
    const g = B.donneesGraphiques(d, reg);
    ["profil-ds", "bhk-criteres"].forEach((id) => { if (g[id]) blocs.push({ type: "graphique", id: id, donnees: g[id], alt: B.TITRES_GRAPHIQUES[id], largeurCm: B.LARGEURS_GRAPHIQUES[id] }); });
    if (d.senso.eso.fait === "oui" && S.aDesDonnees(d.senso, "eso-items")) blocs.push({ type: "graphique", id: "eso-items", alt: B.TITRES_GRAPHIQUES["eso-items"], largeurCm: B.LARGEURS_GRAPHIQUES["eso-items"] });

    h(2, "Axes de travail");
    const actifs = plan.axes.map((x) => x.id);
    plan.proposes.filter((x) => actifs.indexOf(x.id) >= 0).forEach((x, i) => {
      const def = AXES.find((y) => y.id === x.id);
      h(3, (i + 1) + ". " + def.titre);
      if (x.raisons.length) txt("Justification : " + joindre(x.raisons) + ".");
      txt("Principe : " + def.cle);
      blocs.push({ type: "tableau", largeurs: [0.27, 0.48, 0.25], petit: true, lignes: [
        { entete: true, cellules: ["Exercice en séance", "Déroulé", "Progression"].map((t) => c(t, { gras: true, fond: "entete" })) },
      ].concat(def.seance.map((e) => ({ cellules: [c(e[0], { gras: true }), c(e[1]), c(e[2])] }))) });
    });

    h(2, "Objectifs et échelles d'atteinte (GAS)");
    txt("Pour chaque objectif, décrire avec l'enfant et sa famille ce que serait chaque niveau, puis coter à mi-parcours et à la réévaluation. Le niveau 0 correspond au résultat attendu.");
    const obj = plan.objectifs.slice(0, 5);
    (obj.length ? obj : ["[Objectif à définir avec l'enfant]"]).forEach((o, i) => {
      blocs.push({ type: "p", runs: [{ t: "Objectif " + (i + 1) + " : ", b: true }, { t: o.replace(/\.$/, "") + "." }] });
      blocs.push({ type: "tableau", largeurs: [0.16, 0.48, 0.18, 0.18], petit: true, lignes: [
        { entete: true, cellules: ["Niveau", "Description", "Mi-parcours", "Réévaluation"].map((t) => c(t, { gras: true, fond: "entete" })) },
        ["−2", "Niveau actuel : "], ["−1", "Progrès partiel : "], ["0", "Résultat attendu : "], ["+1", "Un peu mieux qu'attendu : "], ["+2", "Beaucoup mieux qu'attendu : "],
      ].map((x, k) => (k === 0 ? x : { cellules: [c(x[0], { gras: true, align: "center", fond: x[0] === "0" ? "niveau-moyenne" : null }), c([{ t: x[1], i: true }]), c(""), c("")] })) });
    });

    h(2, "Planning des séances");
    txt("Chaque séance (" + p.duree + " minutes) : accueil et retour sur les deux semaines (5 min) ; mise en route sensori-motrice (10 min) ; travail principal (" + Math.max(10, p.duree - 25) + " min) ; activité choisie par l'enfant (5 min) ; consignes pour la maison (5 min).");
    blocs.push({ type: "tableau", largeurs: [0.07, 0.13, 0.15, 0.43, 0.22], petit: true, lignes: [
      { entete: true, cellules: ["N°", "Date", "Phase", "Contenu", "À la maison"].map((t) => c(t, { gras: true, fond: "entete" })) },
    ].concat(plan.seances.map((s) => ({ cellules: [
      c(String(s.num), { align: "center", gras: true }), c(B.dateCourte(s.date)),
      c(s.phase, { fond: s.phase === "Réévaluation" || s.phase === "Point d'étape" ? "niveau-superieur" : null }),
      c(s.contenu.map((x, j) => ({ t: (j ? "\n" : "") + "• " + x }))),
      c(s.maison.length ? s.maison.map((m) => m[0]).join(", ") : "–"),
    ] }))) });

    h(2, "Exercices à faire à la maison");
    txt("À donner aux parents au fil des séances, deux ou trois à la fois au plus. Les faire sous forme de jeu, courts et réguliers, et les arrêter s'ils deviennent une source de conflit.");
    plan.axes.forEach((x) => {
      const def = AXES.find((y) => y.id === x.id);
      h(3, def.titre);
      txt(def.maison.map((m) => "– " + m[0] + " : " + m[1] + " (" + m[2] + ").").join("\n"));
    });

    if (texte(p.s.notes).trim()) { h(2, "Notes"); txt(p.s.notes); }
    const sig = reg.praticiens[reg.signataire] || reg.praticiens[0];
    if (sig && (sig.nom || sig.titre)) blocs.push({ type: "signature", texte: [sig.nom, sig.titre].filter(Boolean).join(", ") });
    return Object.assign({ titre: "Plan de suivi" + (nomComplet ? " – " + nomComplet : ""), blocs: blocs }, B.papier(reg));
  }

  return { AXES, FREQUENCES, DUREES, suiviVide, normaliserSuivi, axesProposes, parametres, planning, analyse, modeleSuivi, ajouterJours };
});
