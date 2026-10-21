/*
 * Outil Ergo : accueil adapté, journal des séances, parcours de la plateforme TND (PCO) et passations adaptées.
 * Données, normalisation et phrases ; les documents à imprimer sont dans suivi.js.
 * Aucune dépendance : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Accueil = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function court(v, n) { return texte(v).slice(0, n || 2000); }
  function oui(v) { return v === "oui" || v === true ? "oui" : ""; }
  function dateIso(v) { return /^\d{4}-\d{2}-\d{2}$/.test(texte(v)) ? v : ""; }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }

  /* ================= Accueil adapté ================= */

  // La raison reste interne : elle n'apparaît dans aucun document remis, sauf choix explicite de l'ergothérapeute.
  const RAISONS = [
    ["tsa", "TSA diagnostiqué"],
    ["tsa-suspecte", "TSA suspecté ou en cours d'évaluation"],
    ["autre", "Autre besoin (anxiété, sensibilités sensorielles, attention…)"],
  ];

  const COMMUNICATION = [
    ["phrases", "Parle en phrases"],
    ["mots", "Utilise surtout des mots isolés"],
    ["gestes", "Communique surtout par gestes, images ou pictogrammes"],
    ["outil", "Utilise un outil de communication (tablette, classeur)"],
  ];

  // titre : libellé dans l'outil ; parents : question du questionnaire ; exemple : aide au remplissage.
  const QUESTIONS = [
    { id: "comprendre", titre: "Ce qui l'aide à comprendre une consigne", parents: "Qu'est-ce qui aide votre enfant à comprendre ce qu'on lui demande ?", exemple: "lui montrer, une phrase courte, une image, lui laisser le temps de répondre" },
    { id: "interets", titre: "Ce qu'il aime, ses passions", parents: "Qu'est-ce que votre enfant aime ? Ses passions, ses jeux préférés ?", exemple: "les dinosaures, les trains, les chansons, les puzzles" },
    { id: "apaise", titre: "Ce qui l'apaise", parents: "Qu'est-ce qui apaise votre enfant quand il est contrarié ou fatigué ?", exemple: "se balancer, un coin calme, son doudou, un casque antibruit" },
    { id: "difficile", titre: "Ce qui le met en difficulté", parents: "Qu'est-ce qui met votre enfant en difficulté ou peut déclencher une crise ?", exemple: "attendre, un changement imprévu, le bruit, être touché sans prévenir" },
    { id: "signes", titre: "Signes qu'il commence à saturer", parents: "À quels signes voyez-vous que votre enfant commence à être dépassé ?", exemple: "se bouche les oreilles, s'agite, ne répond plus, répète une phrase" },
    { id: "routines", titre: "Habitudes et objets rassurants", parents: "Y a-t-il des habitudes ou des objets qui rassurent votre enfant ?", exemple: "toujours la même place, garder sa peluche, savoir ce qui vient après" },
    { id: "motivation", titre: "Ce qui le motive", parents: "Qu'est-ce qui motive votre enfant après un effort ?", exemple: "un jeu choisi à la fin, des autocollants, un moment sur la tablette" },
    { id: "eviter", titre: "À éviter", parents: "Y a-t-il des choses à éviter avec votre enfant (mots, gestes, situations) ?", exemple: "le toucher sans prévenir, parler fort, insister quand il dit non" },
    { id: "autres", titre: "Autres informations", parents: "Souhaitez-vous nous dire autre chose ?", exemple: "" },
  ];

  const SENS = [
    ["bruits", "Bruits"],
    ["lumieres", "Lumières"],
    ["toucher", "Toucher, contact physique"],
    ["textures", "Textures (vêtements, matières, aliments)"],
    ["odeurs", "Odeurs"],
    ["mouvement", "Mouvement (balançoire, tourner, sauter)"],
  ];
  const REACTIONS = [["gene", "Le gêne"], ["recherche", "Le recherche"], ["rien", "Rien de particulier"]];

  // Étapes du planning de séance en images (pictogrammes propres à l'outil).
  const ETAPES = [
    { id: "bonjour", picto: "👋", texte: "Bonjour" },
    { id: "jeu", picto: "🧩", texte: "Jeu" },
    { id: "bouger", picto: "🤸", texte: "Bouger" },
    { id: "dessiner", picto: "🖍️", texte: "Dessiner" },
    { id: "ecrire", picto: "✏️", texte: "Écrire" },
    { id: "manipuler", picto: "✂️", texte: "Découper, manipuler" },
    { id: "ordinateur", picto: "💻", texte: "Ordinateur" },
    { id: "pause", picto: "⏸️", texte: "Pause" },
    { id: "choix", picto: "⭐", texte: "Activité choisie" },
    { id: "ranger", picto: "🧺", texte: "Ranger" },
    { id: "aurevoir", picto: "🚪", texte: "Au revoir" },
  ];
  const PLANNING_DEFAUT = ["bonjour", "jeu", "dessiner", "ecrire", "pause", "choix", "aurevoir"];
  const MAX_ETAPES = 10;

  function adaptationVide() {
    const reponses = { communication: "", communicationDetail: "" };
    QUESTIONS.forEach((q) => { reponses[q.id] = ""; });
    return {
      actif: "", raison: "", raisonAutre: "", mentionDiagnostic: "", phraseOrientation: "",
      reponses: reponses, sensibilites: {}, planning: PLANNING_DEFAUT.slice(),
      visite: { date: "", accompagnant: "", lieu: "" },
    };
  }

  /* ================= Journal des séances ================= */

  // Saisie en quelques touches : axes travaillés (cases), déroulement (un visage), une note et « pour la prochaine fois ».
  const ETATS_SEANCE = [["bien", "Bien", "😀"], ["moyen", "Moyen", "😐"], ["difficile", "Difficile", "😣"]];
  const MAX_SEANCES = 120;

  function seanceVide(date) { return { date: dateIso(date), axes: {}, etat: "", fait: "", prochaine: "", aide: "", difficile: "" }; }

  // Séances triées de la plus récente à la plus ancienne (sans date en dernier).
  function seancesRecentes(d) { return (d.seances || []).slice().sort((x, y) => (y.date || "").localeCompare(x.date || "")); }

  /* ================= Plateforme de coordination et d'orientation (PCO-TND) ================= */

  // Forfait d'intervention précoce (fiche technique du ministère, 2025) : versé un an, renouvelable une fois.
  const FORMULES_PCO = [
    ["35", "Intervention : 35 séances environ sur 12 mois", 35],
    ["12", "Intervention courte : au moins 12 séances", 12],
    ["bilan", "Bilan seul", 0],
  ];
  const SOURCE_PCO = {
    texte: "Ministère chargé des personnes handicapées, fiche technique « Forfait d'intervention précoce » (2025).",
    lien: "https://handicap.gouv.fr/sites/handicap/files/2025-04/TND-fiche-technique-forfait-intervention-2025.pdf",
  };

  function pcoVide() { return { actif: "", plateforme: "", debut: "", formule: "35", medecin: "", renouvele: "", notes: "" }; }

  function ajouterMois(iso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte(iso));
    if (!m) return "";
    const d = new Date(Date.UTC(+m[1], +m[2] - 1 + n, +m[3]));
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function joursEntre(a, b) {
    const p = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
    return Math.round((p(b) - p(a)) / 86400000);
  }

  // État du forfait : séances notées dans le journal depuis le début du parcours, échéance et rappel du renouvellement.
  function etatPco(d, aujourdhui) {
    const p = d.pco || pcoVide();
    const f = FORMULES_PCO.find((x) => x[0] === p.formule) || FORMULES_PCO[0];
    const seances = (d.seances || []).filter((s) => s.date && (!p.debut || s.date >= p.debut));
    const echeance = p.debut ? ajouterMois(p.debut, p.renouvele === "oui" ? 24 : 12) : "";
    const restant = echeance && aujourdhui ? joursEntre(aujourdhui, echeance) : null;
    let alerte = "";
    if (restant !== null && restant < 0) alerte = "Le forfait est arrivé à échéance.";
    else if (restant !== null && restant <= 60) alerte = p.renouvele === "oui"
      ? "Le forfait se termine bientôt et ne peut plus être renouvelé : préparez la suite avec la famille (MDPH, autre financement)."
      : "Le forfait se termine bientôt : si le suivi doit continuer, demandez le renouvellement à la plateforme (une fois, pour 12 mois).";
    return { formule: f, prevues: f[2], faites: seances.length, echeance: echeance, joursRestants: restant, alerte: alerte, renouvele: p.renouvele === "oui" };
  }

  /* ================= Passation adaptée ================= */

  const ADAPTATIONS_PASSATION = [
    ["pauses", "pauses"],
    ["consignes", "consignes montrées ou en images"],
    ["plusieursFois", "passation en plusieurs fois"],
    ["environnement", "environnement aménagé (bruit, lumière)"],
    ["parent", "présence d'un parent"],
    ["temps", "temps supplémentaire"],
  ];

  function passationVide() { const p = { autre: "" }; ADAPTATIONS_PASSATION.forEach((a) => { p[a[0]] = ""; }); return p; }
  function passationAdaptee(p) { return !!p && (ADAPTATIONS_PASSATION.some((a) => p[a[0]] === "oui") || !!texte(p.autre).trim()); }
  function libellesPassation(p) {
    if (!p) return [];
    const l = ADAPTATIONS_PASSATION.filter((a) => p[a[0]] === "oui").map((a) => a[1]);
    if (texte(p.autre).trim()) l.push(texte(p.autre).trim().replace(/\.$/, ""));
    return l;
  }
  function phrasePassation(p) {
    const l = libellesPassation(p);
    if (!l.length) return "";
    return "Passation adaptée (" + l.join(", ") + ") : les résultats sont à interpréter avec prudence, les normes ayant été établies en passation standard.";
  }

  /* ================= Normalisation ================= */

  function vide() { return { adaptation: adaptationVide(), pco: pcoVide(), seances: [], passations: {} }; }

  function normaliser(src) {
    const out = vide();
    if (!src || typeof src !== "object") return out;
    const a = src.adaptation;
    if (a && typeof a === "object") {
      const o = out.adaptation;
      o.actif = oui(a.actif);
      if (RAISONS.some((r) => r[0] === a.raison)) o.raison = a.raison;
      o.raisonAutre = court(a.raisonAutre, 300);
      o.mentionDiagnostic = oui(a.mentionDiagnostic);
      o.phraseOrientation = oui(a.phraseOrientation);
      if (a.reponses && typeof a.reponses === "object") {
        if (COMMUNICATION.some((c) => c[0] === a.reponses.communication)) o.reponses.communication = a.reponses.communication;
        o.reponses.communicationDetail = court(a.reponses.communicationDetail, 1000);
        QUESTIONS.forEach((q) => { o.reponses[q.id] = court(a.reponses[q.id], 2000); });
      }
      if (a.sensibilites && typeof a.sensibilites === "object") SENS.forEach((s) => {
        if (REACTIONS.some((r) => r[0] === a.sensibilites[s[0]])) o.sensibilites[s[0]] = a.sensibilites[s[0]];
      });
      if (Array.isArray(a.planning)) o.planning = a.planning.filter((id) => ETAPES.some((e) => e.id === id)).slice(0, MAX_ETAPES);
      if (a.visite && typeof a.visite === "object") { o.visite.date = dateIso(a.visite.date); o.visite.accompagnant = court(a.visite.accompagnant, 120); o.visite.lieu = court(a.visite.lieu, 120); }
    }
    const p = src.pco;
    if (p && typeof p === "object") {
      const o = out.pco;
      o.actif = oui(p.actif);
      o.plateforme = court(p.plateforme, 200);
      o.debut = dateIso(p.debut);
      if (FORMULES_PCO.some((f) => f[0] === String(p.formule))) o.formule = String(p.formule);
      o.medecin = court(p.medecin, 200);
      o.renouvele = oui(p.renouvele);
      o.notes = court(p.notes, 4000);
    }
    if (Array.isArray(src.seances)) {
      out.seances = src.seances.filter((s) => s && typeof s === "object").slice(0, MAX_SEANCES).map((s) => {
        const axes = {};
        if (s.axes && typeof s.axes === "object") Object.keys(s.axes).slice(0, 20).forEach((k) => { if (/^[a-z]{2,20}$/.test(k) && s.axes[k] === "oui") axes[k] = "oui"; });
        return {
          date: dateIso(s.date), axes: axes, etat: ETATS_SEANCE.some((e) => e[0] === s.etat) ? s.etat : "",
          fait: court(s.fait), prochaine: court(s.prochaine, 1000), aide: court(s.aide), difficile: court(s.difficile),
        };
      });
    }
    if (src.passations && typeof src.passations === "object") {
      Object.keys(src.passations).slice(0, 30).forEach((id) => {
        if (!/^[a-z0-9-]{1,30}$/i.test(id)) return;
        const s = src.passations[id], o = passationVide();
        if (!s || typeof s !== "object") return;
        ADAPTATIONS_PASSATION.forEach((x) => { o[x[0]] = oui(s[x[0]]); });
        o.autre = court(s.autre, 300);
        if (passationAdaptee(o)) out.passations[id] = o;
      });
    }
    return out;
  }

  // Photo du cabinet (réglages, gardée sur l'appareil) : image JPEG ou PNG en data URL.
  function normaliserPhoto(p) {
    if (!p || typeof p !== "object" || !/^data:image\/(png|jpe?g);base64,/.test(texte(p.donnees))) return null;
    const l = +p.l, h = +p.h;
    return { donnees: p.donnees, l: l > 0 ? l : 800, h: h > 0 ? h : 600 };
  }

  /* ================= Phrases et synthèses ================= */

  function raisonTsa(d) { return d.adaptation.actif === "oui" && (d.adaptation.raison === "tsa" || d.adaptation.raison === "tsa-suspecte"); }
  function libelleRaison(d) {
    const r = RAISONS.find((x) => x[0] === d.adaptation.raison);
    if (!r) return "";
    return r[0] === "autre" && texte(d.adaptation.raisonAutre).trim() ? texte(d.adaptation.raisonAutre).trim() : r[1];
  }

  // Phrase du compte rendu sur le diagnostic posé : seulement si l'ergothérapeute l'a choisi.
  function phraseDiagnostic(d) {
    const a = d.adaptation;
    return a.actif === "oui" && a.raison === "tsa" && a.mentionDiagnostic === "oui" ? "Un diagnostic de trouble du spectre de l'autisme a été posé." : "";
  }

  // Phrase d'orientation : neutre, sans parler d'autisme ; inutile quand l'enfant est déjà suivi par la plateforme.
  function orientationPossible(d) { return d.adaptation.actif === "oui" && d.adaptation.raison !== "tsa" && d.pco.actif !== "oui"; }
  function phraseOrientation(d, sujetMin) {
    if (!orientationPossible(d) || d.adaptation.phraseOrientation !== "oui") return "";
    return "Au vu des observations du bilan, un avis médical est conseillé ; le médecin pourra, s'il le juge utile, orienter " + (sujetMin || "l'enfant") +
      " vers la plateforme de coordination et d'orientation des troubles du neurodéveloppement de son territoire.";
  }

  function lignesPco(d) {
    const p = d.pco;
    if (p.actif !== "oui") return [];
    return [
      ["Cadre", "Parcours de bilan et d'intervention précoce, plateforme de coordination et d'orientation des troubles du neurodéveloppement" + (texte(p.plateforme).trim() ? " (" + texte(p.plateforme).trim() + ")" : "")],
      ["Destinataires", "La famille, le médecin traitant" + (texte(p.medecin).trim() ? " (" + texte(p.medecin).trim() + ")" : "") + " et la plateforme"],
    ];
  }

  // Ce qui revient dans le journal (du plus récent au plus ancien, sans doublon).
  function reperesJournal(d, champ, n) {
    const vus = new Set(), out = [];
    seancesRecentes(d).forEach((s) => {
      texte(s[champ]).split(/\n|;/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean).forEach((x) => {
        const k = x.toLowerCase();
        if (vus.has(k) || out.length >= (n || 6)) return;
        vus.add(k); out.push(x);
      });
    });
    return out;
  }

  // Fiche « Ce qui aide » : paires [libellé, texte] dans l'ordre d'affichage.
  function ceQuiAide(d) {
    const a = d.adaptation, r = a.reponses, l = [];
    const com = COMMUNICATION.find((c) => c[0] === r.communication);
    const comTexte = [com ? com[1] : "", texte(r.communicationDetail).trim()].filter(Boolean).join(" ; ");
    if (comTexte) l.push(["Communication", comTexte]);
    QUESTIONS.forEach((q) => { if (texte(r[q.id]).trim()) l.push([q.titre, texte(r[q.id]).trim()]); });
    const par = (k) => SENS.filter((s) => a.sensibilites[s[0]] === k).map((s) => s[1].replace(/ \(.*\)$/, "").toLowerCase());
    const gene = par("gene"), recherche = par("recherche");
    if (gene.length || recherche.length) l.push(["Sensibilités", [gene.length ? "le gênent : " + joindre(gene) : "", recherche.length ? "recherche : " + joindre(recherche) : ""].filter(Boolean).join(" ; ")]);
    const aide = reperesJournal(d, "aide"), diff = reperesJournal(d, "difficile");
    if (aide.length) l.push(["A aidé en séance", aide.join(" ; ")]);
    if (diff.length) l.push(["A été difficile en séance", diff.join(" ; ")]);
    return l;
  }

  function accueilCommence(d) {
    const a = d.adaptation;
    return Object.keys(a.reponses).some((k) => texte(a.reponses[k]).trim()) || Object.keys(a.sensibilites).length > 0;
  }

  // Villes du cabinet, tirées des lignes d'adresse qui contiennent un code postal (la première est l'adresse principale).
  function villesCabinet(adresse) {
    const out = [];
    texte(adresse).split("\n").map((x) => x.trim()).filter((x) => /\b\d{5}\b/.test(x)).forEach((l) => {
      const v = l.replace(/^.*\b\d{5}\s*/, "").replace(/\s*cedex.*$/i, "").trim();
      if (v && out.indexOf(v) < 0) out.push(v);
    });
    return out;
  }
  function villeCabinet(adresse) { return villesCabinet(adresse)[0] || ""; }

  // Repères des recommandations HAS 2026 sur l'autisme (ajout à titre indicatif, plan de suivi).
  const SOURCE_HAS_TSA = {
    court: "HAS, 2026",
    texte: "Haute Autorité de santé, Trouble du spectre de l'autisme : interventions et parcours de vie du nourrisson, de l'enfant et de l'adolescent, recommandation de bonne pratique, février 2026.",
    lien: "https://www.has-sante.fr/jcms/p_3859897/fr/autisme-les-nouvelles-recommandations-pour-le-nourrisson-l-enfant-et-l-adolescent",
  };
  const SOURCE_NCAEP = {
    texte: "Steinbrenner J. R. et al., Evidence-based practices for children, youth, and young adults with autism, National Clearinghouse on Autism Evidence and Practice (NCAEP), 2020.",
    lien: "https://ncaep.fpg.unc.edu/wp-content/uploads/EBP-Report-2020.pdf",
  };
  const REPERES_HAS_TSA = [
    "évaluer le fonctionnement au moins une fois par an, avec les autres professionnels et à partir des observations des parents ; l'évaluation sensorielle et motrice est un préalable indispensable aux interventions",
    "à partir de 3 ans, proposer des interventions motrices centrées sur la tâche et une activité physique ou sportive de loisirs",
    "offrir un cadre structuré et prévisible : consignes et plannings visuels, langage concret, aménagements sensoriels (bruit, lumière, textures) pour éviter la surstimulation, stratégies sensorielles réévaluées régulièrement",
    "associer les parents aux interventions et travailler en réseau autour de l'enfant (école, autres professionnels)",
    "ne sont pas recommandés : Snoezelen, intégration des réflexes archaïques, intégration auditive (dont la méthode Tomatis), packing, neurofeedback, approches psychanalytiques, méthodes Doman-Delacato et Padovan",
  ];
  const NOTE_INTEGRATION_SENSORIELLE = "À l'international, l'intégration sensorielle d'Ayres n'est reconnue comme pratique fondée sur les preuves que lorsqu'elle respecte son modèle : séances actives et individuelles par un ergothérapeute formé, pour des enfants qui ont des difficultés sensorielles marquées. Les approches sensorielles passives (gilet lesté, brossage, « régime sensoriel ») n'ont pas de preuves suffisantes.";

  return {
    RAISONS, COMMUNICATION, QUESTIONS, SENS, REACTIONS, ETAPES, PLANNING_DEFAUT, MAX_ETAPES,
    ETATS_SEANCE, MAX_SEANCES, seancesRecentes, FORMULES_PCO, SOURCE_PCO, ADAPTATIONS_PASSATION,
    SOURCE_HAS_TSA, SOURCE_NCAEP, REPERES_HAS_TSA, NOTE_INTEGRATION_SENSORIELLE,
    vide, normaliser, adaptationVide, pcoVide, seanceVide, passationVide, normaliserPhoto,
    etatPco, ajouterMois, joursEntre, passationAdaptee, libellesPassation, phrasePassation,
    raisonTsa, libelleRaison, phraseDiagnostic, orientationPossible, phraseOrientation, lignesPco,
    reperesJournal, ceQuiAide, accueilCommence, villeCabinet, villesCabinet,
  };
});
