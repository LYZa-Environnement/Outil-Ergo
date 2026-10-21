/*
 * Outil Ergo : bilans centrés sur l'occupation.
 * Grille d'autonomie dans les activités quotidiennes, MCRO (mesure canadienne du rendement occupationnel),
 * résultats de l'OT'Hope, questionnaire DCDQ, et tri de cartes à l'écran (cartes propres à l'outil).
 * Les questions et cartes des outils protégés ne sont pas reproduites : l'outil reçoit leurs réponses et scores.
 */
(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.Occup = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function nombre(v) {
    if (v === null || v === undefined) return null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function min(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function point(s) { const t = texte(s).trim(); return !t ? "" : /[.!?…:]$/.test(t) ? t : t + "."; }
  function sansPoint(s) { return texte(s).trim().replace(/[.;]+$/, ""); }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }
  function fmt(n, dec) { return (dec === undefined ? String(Math.round(n * 100) / 100) : n.toFixed(dec)).replace(".", ","); }
  function dateCourte(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte(s)); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }
  function signe(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n), 1); }
  function oui(v) { return v === true || v === "oui" ? "oui" : ""; }

  /* ================= Grille d'autonomie ================= */

  const NIVEAUX_AVQ = [
    { id: "autonome", label: "Autonome" },
    { id: "lent", label: "Avec lenteur" },
    { id: "aide-partielle", label: "Aide partielle" },
    { id: "aide-totale", label: "Aide totale" },
    { id: "non-acquis", label: "Non acquis" },
  ];
  const AIDE_AVQ = ["aide-partielle", "aide-totale", "non-acquis"];
  // champ : ligne de l'anamnèse complétée par la grille ; occ : occupation du diagnostic.
  const DOMAINES_AVQ = [
    { id: "habillage", nom: "Habillage", champ: "occHabillage", occ: "habillage", items: [
      ["enfiler", "enfiler ses vêtements"], ["ordre", "s'habiller dans le bon ordre et à l'endroit"], ["boutons", "fermer les boutons"],
      ["zip", "fermer une fermeture éclair"], ["chaussures", "mettre ses chaussures"], ["lacets", "faire ses lacets"]] },
    { id: "repas", nom: "Repas", champ: "occAlimentation", occ: "repas", items: [
      ["fourchette", "manger avec une fourchette"], ["couteau", "couper ses aliments au couteau"], ["tartiner", "tartiner"],
      ["verser", "se servir à boire"], ["emballages", "ouvrir les emballages"], ["proprement", "manger proprement"]] },
    { id: "hygiene", nom: "Hygiène", champ: "occHygiene", occ: "toilette", items: [
      ["mains", "se laver les mains"], ["laver", "se laver (douche ou bain)"], ["dents", "se brosser les dents"],
      ["coiffer", "se coiffer"], ["toilettes", "aller aux toilettes"]] },
    { id: "scolaire", nom: "Vie scolaire", champ: "ecole", occ: "outils", items: [
      ["cartable", "préparer son cartable"], ["affaires", "sortir et ranger ses affaires"], ["ciseaux", "découper aux ciseaux"],
      ["regle", "tracer à la règle"], ["agenda", "noter les devoirs dans l'agenda"]] },
    { id: "deplacements", nom: "Déplacements", champ: "occDeplacements", occ: "deplacements", items: [
      ["escaliers", "monter et descendre les escaliers"], ["velo", "faire du vélo"], ["orienter", "se repérer dans l'école"]] },
    { id: "loisirs", nom: "Loisirs", champ: "occLoisirs", occ: "jeux", items: [
      ["ballon", "jouer au ballon"], ["construction", "jouer à des jeux de construction"], ["dessin", "dessiner et colorier"],
      ["societe", "jouer à des jeux de société"]] },
  ].map((d) => Object.assign({}, d, { items: d.items.map((x) => ({ id: d.id + "-" + x[0], nom: x[1] })) }));
  const ITEMS_AVQ = DOMAINES_AVQ.reduce((a, d) => a.concat(d.items.map((it) => Object.assign({ domaine: d.id }, it))), []);

  // Phrase d'un domaine : « Autonome pour … ; a besoin d'une aide partielle pour … ».
  function phraseAvq(avq, domaineId, a) {
    const dom = DOMAINES_AVQ.find((d) => d.id === domaineId);
    const de = (niv) => dom.items.filter((it) => avq[it.id] === niv).map((it) => it.nom);
    const morceaux = [];
    const ajout = (niv, f) => { const l = de(niv); if (l.length) morceaux.push(f(joindre(l))); };
    ajout("autonome", (l) => "autonome pour " + l);
    ajout("lent", (l) => "autonome mais lent" + a.e + " pour " + l);
    ajout("aide-partielle", (l) => "a besoin d'une aide partielle pour " + l);
    ajout("aide-totale", (l) => "a besoin d'une aide totale pour " + l);
    ajout("non-acquis", (l) => "ne sait pas encore " + l);
    return morceaux.length ? point(maj(morceaux.join(" ; "))) : "";
  }

  // Occupations du diagnostic où la grille montre un besoin d'aide.
  function occupationsAvq(avq) {
    return DOMAINES_AVQ.filter((d) => d.items.some((it) => AIDE_AVQ.indexOf(avq[it.id]) >= 0)).map((d) => d.occ);
  }

  /* ================= MCRO, OT'Hope, DCDQ ================= */

  const NB_MCRO = 5;
  const SEUIL_MCRO = 2; // un changement de 2 points ou plus est cliniquement significatif
  const NIVEAUX_OTHOPE = [
    { id: "sait", label: "Je sais faire", texte: "sait faire" },
    { id: "aide", label: "Avec aide", texte: "avec aide" },
    { id: "pas-bien", label: "Pas très bien", texte: "pas très bien" },
    { id: "non", label: "Non", texte: "ne sait pas faire" },
  ];
  const NB_OTHOPE = 8;
  const MAX_OTHOPE = 30;

  const NB_DCDQ = 15;
  const FACTEURS_DCDQ = [
    { id: "controle", nom: "contrôle pendant le mouvement", items: [1, 2, 3, 4, 5, 12] },
    { id: "fine", nom: "motricité fine et écriture", items: [7, 8, 9, 10] },
    { id: "generale", nom: "coordination générale", items: [6, 11, 13, 14, 15] },
  ];
  // Un total inférieur ou égal au seuil est en faveur d'un trouble développemental de la coordination.
  const SEUILS_DCDQ = [
    { de: 60, a: 95, seuil: 46, libelle: "5 ans à 7 ans 11 mois" },
    { de: 96, a: 119, seuil: 55, libelle: "8 ans à 9 ans 11 mois" },
    { de: 120, a: 191, seuil: 57, libelle: "10 à 15 ans" },
  ];

  /* ================= Tri de cartes (cartes propres à l'outil) ================= */

  // enfant : libellé lu par l'enfant ; rapport : libellé du compte rendu.
  const JEUX = {
    activites: {
      titre: "Mes activités", sousTitre: "activités du quotidien", deSousTitre: "d'activités du quotidien",
      consigne: "Est-ce facile pour toi ?",
      piles: [
        { id: "facile", label: "Facile", emoji: "😀" },
        { id: "moyen", label: "Un peu difficile", emoji: "😐" },
        { id: "difficile", label: "Difficile", emoji: "😣" },
      ],
      passer: { id: "non", label: "Je ne fais pas", emoji: "🚫" },
      choix: { consigne: "Choisis 3 activités que tu voudrais mieux réussir", piles: ["moyen", "difficile"], max: 3 },
      cartes: [
        ["habiller", "M'habiller", "s'habiller", "👕", "soins"], ["manteau", "Fermer mon manteau", "fermer son manteau", "🧥", "soins"],
        ["lacets", "Faire mes lacets", "faire ses lacets", "👟", "soins"], ["laver", "Me laver", "se laver", "🛁", "soins"],
        ["dents", "Me brosser les dents", "se brosser les dents", "🪥", "soins"],
        ["couverts", "Manger avec un couteau et une fourchette", "manger avec un couteau et une fourchette", "🍴", "repas"],
        ["verser", "Me servir à boire", "se servir à boire", "🥛", "repas"], ["gouter", "Ouvrir mon goûter", "ouvrir son goûter", "🧃", "repas"],
        ["ecrire", "Écrire", "écrire", "✏️", "ecole"], ["ecrire-vite", "Écrire vite", "écrire vite", "⏱️", "ecole"],
        ["copier", "Recopier le tableau", "recopier le tableau", "📝", "ecole"], ["decouper", "Découper", "découper", "✂️", "ecole"],
        ["colorier", "Colorier sans dépasser", "colorier sans dépasser", "🖍️", "ecole"], ["regle", "Tracer avec la règle", "tracer avec la règle", "📏", "ecole"],
        ["cartable", "Ranger mon cartable", "ranger son cartable", "🎒", "ecole"], ["devoirs", "Faire mes devoirs", "faire ses devoirs", "📚", "ecole"],
        ["clavier", "Écrire à l'ordinateur", "écrire à l'ordinateur", "💻", "ecole"],
        ["ballon", "Jouer au ballon", "jouer au ballon", "⚽", "loisirs"], ["velo", "Faire du vélo", "faire du vélo", "🚲", "loisirs"],
        ["nager", "Nager", "nager", "🏊", "loisirs"], ["courir", "Courir", "courir", "🏃", "loisirs"],
        ["construire", "Construire avec des briques", "construire avec des briques", "🧱", "loisirs"], ["dessiner", "Dessiner", "dessiner", "🎨", "loisirs"],
        ["recre", "Jouer avec les copains à la récré", "jouer avec les copains à la récréation", "🤝", "loisirs"],
        ["dormir", "M'endormir le soir", "s'endormir le soir", "🌙", "soins"],
      ],
    },
    sensoriel: {
      titre: "Ce que je ressens", sousTitre: "situations sensorielles", deSousTitre: "de situations sensorielles",
      consigne: "Comment tu trouves ça ?",
      piles: [
        { id: "aime", label: "J'aime", emoji: "😊" },
        { id: "egal", label: "Ça m'est égal", emoji: "😶" },
        { id: "naime", label: "Je n'aime pas", emoji: "😖" },
      ],
      passer: { id: "non", label: "Je ne sais pas", emoji: "🤷" },
      choix: { consigne: "Choisis 3 choses qui te gênent le plus", piles: ["naime"], max: 3 },
      cartes: [
        ["cantine", "Le bruit à la cantine", "le bruit à la cantine", "🍽️", "auditif"], ["sechemains", "Le sèche-mains", "le sèche-mains", "💨", "auditif"],
        ["bruits", "Les bruits forts (sirène, aspirateur)", "les bruits forts", "🚨", "auditif"], ["classe", "Le bruit en classe", "le bruit en classe", "🗣️", "auditif"],
        ["etiquettes", "Les étiquettes des vêtements", "les étiquettes des vêtements", "🏷️", "tactile"], ["chaussettes", "Les chaussettes", "les chaussettes", "🧦", "tactile"],
        ["coiffeur", "Me faire couper les cheveux", "se faire couper les cheveux", "💇", "tactile"], ["cheveux", "Me laver les cheveux", "se laver les cheveux", "🚿", "tactile"],
        ["mains", "Avoir les mains sales (peinture, colle)", "avoir les mains sales", "🖐️", "tactile"], ["sable", "Marcher pieds nus dans le sable", "marcher pieds nus dans le sable", "🏖️", "tactile"],
        ["calins", "Les câlins", "les câlins", "🤗", "tactile"], ["surprise", "Être touché par surprise", "être touché par surprise", "👋", "tactile"],
        ["brosse", "Me brosser les dents", "se brosser les dents", "🪥", "tactile"],
        ["aliments", "Goûter un nouvel aliment", "goûter un nouvel aliment", "🥦", "gout"], ["odeurs", "Les odeurs fortes", "les odeurs fortes", "👃", "odorat"],
        ["lumiere", "La lumière forte", "la lumière forte", "☀️", "visuel"], ["foule", "Les endroits avec beaucoup de monde", "les endroits avec beaucoup de monde", "👥", "visuel"],
        ["manege", "Tourner, faire du manège", "tourner, faire du manège", "🎠", "vestibulaire"], ["grimper", "Sauter et grimper", "sauter et grimper", "🧗", "proprio"],
        ["voiture", "Les trajets en voiture", "les trajets en voiture", "🚗", "vestibulaire"], ["assis", "Rester assis longtemps", "rester assis longtemps", "🪑", "proprio"],
      ],
    },
  };
  Object.keys(JEUX).forEach((k) => {
    JEUX[k].id = k;
    JEUX[k].cartes = JEUX[k].cartes.map((c) => ({ id: k.charAt(0) + "-" + c[0], enfant: c[1], rapport: c[2], emoji: c[3], theme: c[4] }));
  });
  const MAX_CARTES_PERSO = 24;

  function pilesDe(jeu) { return JEUX[jeu].piles.concat([JEUX[jeu].passer]); }

  // Cartes personnelles des réglages : { id, jeu, texte, photo, l, h }.
  function normaliserCartesPerso(l) {
    if (!Array.isArray(l)) return [];
    return l.filter((c) => c && JEUX[c.jeu] && texte(c.texte).trim()).slice(0, MAX_CARTES_PERSO).map((c) => {
      const photo = typeof c.photo === "string" && /^data:image\/(jpeg|png);base64,/.test(c.photo) && c.photo.length < 600000 ? c.photo : "";
      return {
        id: /^p-[a-z0-9]+$/.test(texte(c.id)) ? c.id : "p-" + Math.random().toString(36).slice(2, 9),
        jeu: c.jeu, texte: texte(c.texte).trim().slice(0, 80), photo: photo,
        l: photo ? nombre(c.l) || 0 : 0, h: photo ? nombre(c.h) || 0 : 0,
      };
    });
  }

  function cartesDuJeu(jeu, perso) {
    return JEUX[jeu].cartes.concat(normaliserCartesPerso(perso).filter((c) => c.jeu === jeu).map((c) => ({
      id: c.id, enfant: c.texte, rapport: min(c.texte), emoji: "", photo: c.photo, theme: "perso", perso: true,
    })));
  }

  function triVide() { return { fait: "", date: "", resultats: [], choix: [], exclues: [], notes: "" }; }

  /* ================= Dossier ================= */

  function problemeVide() { return { activite: "", importance: "", rendement1: "", satisfaction1: "", rendement2: "", satisfaction2: "" }; }

  function vide() {
    return {
      avq: {},
      mcro: { fait: "", date: "", date2: "", repondant: "", problemes: Array.from({ length: NB_MCRO }, problemeVide), notes: "" },
      othope: { fait: "", items: Array.from({ length: NB_OTHOPE }, () => ({ activite: "", niveau: "", objectif: "" })), notes: "" },
      dcdq: { fait: "", repondant: "", reponses: {}, notes: "" },
      cartes: { activites: triVide(), sensoriel: triVide() },
    };
  }

  function normaliser(src) {
    const o = vide();
    if (!src || typeof src !== "object") return o;
    if (src.avq && typeof src.avq === "object") {
      ITEMS_AVQ.forEach((it) => { if (NIVEAUX_AVQ.some((n) => n.id === src.avq[it.id])) o.avq[it.id] = src.avq[it.id]; });
    }
    const m = src.mcro || {};
    o.mcro.fait = oui(m.fait);
    ["date", "date2", "repondant", "notes"].forEach((k) => { if (m[k] !== undefined) o.mcro[k] = texte(m[k]); });
    if (Array.isArray(m.problemes)) m.problemes.slice(0, NB_MCRO).forEach((p, i) => {
      if (!p) return;
      Object.keys(o.mcro.problemes[i]).forEach((k) => { if (p[k] !== undefined) o.mcro.problemes[i][k] = texte(p[k]); });
    });
    const t = src.othope || {};
    o.othope.fait = oui(t.fait);
    if (t.notes !== undefined) o.othope.notes = texte(t.notes);
    if (Array.isArray(t.items)) {
      const n = Math.max(NB_OTHOPE, Math.min(MAX_OTHOPE, t.items.length));
      o.othope.items = Array.from({ length: n }, (_, i) => {
        const x = t.items[i] || {};
        return { activite: texte(x.activite), niveau: NIVEAUX_OTHOPE.some((v) => v.id === x.niveau) ? x.niveau : "", objectif: oui(x.objectif) };
      });
    }
    const q = src.dcdq || {};
    o.dcdq.fait = oui(q.fait);
    ["repondant", "notes"].forEach((k) => { if (q[k] !== undefined) o.dcdq[k] = texte(q[k]); });
    Object.keys(q.reponses || {}).forEach((k) => {
      const v = nombre(q.reponses[k]);
      if (/^\d+$/.test(k) && +k >= 1 && +k <= NB_DCDQ && v !== null && v >= 1 && v <= 5) o.dcdq.reponses[k] = Math.round(v);
    });
    const c = src.cartes || {};
    Object.keys(JEUX).forEach((jeu) => {
      const s = c[jeu];
      if (!s || typeof s !== "object") return;
      const piles = pilesDe(jeu).map((p) => p.id);
      const r = o.cartes[jeu];
      r.fait = oui(s.fait);
      r.date = texte(s.date);
      r.notes = texte(s.notes);
      if (Array.isArray(s.resultats)) {
        const vus = {};
        r.resultats = s.resultats.filter((x) => {
          if (!x || !texte(x.id) || piles.indexOf(x.pile) < 0 || vus[x.id]) return false;
          vus[x.id] = true;
          return true;
        }).slice(0, 80).map((x) => ({
          id: texte(x.id), enfant: texte(x.enfant), rapport: texte(x.rapport) || min(texte(x.enfant)), emoji: texte(x.emoji), theme: texte(x.theme), pile: x.pile,
        }));
      }
      const ids = r.resultats.map((x) => x.id);
      if (Array.isArray(s.choix)) r.choix = s.choix.map(texte).filter((id) => ids.indexOf(id) >= 0).slice(0, JEUX[jeu].choix.max);
      if (Array.isArray(s.exclues)) r.exclues = s.exclues.map(texte).slice(0, 80);
    });
    return o;
  }

  /* ================= Calculs ================= */

  function moyenne(l) { return l.length ? l.reduce((a, b) => a + b, 0) / l.length : null; }
  function note10(v) { const n = nombre(v); return n !== null && n >= 1 && n <= 10 ? n : null; }

  function calculMcro(m) {
    const ps = m.problemes.filter((p) => p.activite.trim()).map((p) => ({
      activite: sansPoint(p.activite), importance: note10(p.importance),
      r1: note10(p.rendement1), s1: note10(p.satisfaction1), r2: note10(p.rendement2), s2: note10(p.satisfaction2),
    }));
    const val = (k) => ps.map((p) => p[k]).filter((x) => x !== null);
    const r1 = moyenne(val("r1")), s1 = moyenne(val("s1")), r2 = moyenne(val("r2")), s2 = moyenne(val("s2"));
    return { problemes: ps, r1: r1, s1: s1, r2: r2, s2: s2, reeval: r2 !== null || s2 !== null };
  }

  function calculDcdq(q, ageMois) {
    const rep = q.reponses;
    const n = Object.keys(rep).length;
    const facteurs = FACTEURS_DCDQ.map((f) => ({
      id: f.id, nom: f.nom, total: f.items.reduce((a, i) => a + (rep[i] || 0), 0), max: f.items.length * 5, complet: f.items.every((i) => rep[i]),
    }));
    const total = facteurs.reduce((a, f) => a + f.total, 0);
    const complet = n === NB_DCDQ;
    const bande = ageMois === null || ageMois === undefined ? null : SEUILS_DCDQ.find((b) => ageMois >= b.de && ageMois <= b.a) || null;
    return { n: n, complet: complet, facteurs: facteurs, total: total, bande: bande, indication: complet && bande ? total <= bande.seuil : null };
  }

  /* ================= Rédaction ================= */

  function redigerMcro(m, a) {
    if (m.fait !== "oui") return "";
    const c = calculMcro(m);
    const l = ["Mesure canadienne du rendement occupationnel (MCRO), réalisée avec " + (m.repondant.trim() || a.sujetMin + " et ses parents") + (m.date ? " le " + dateCourte(m.date) : "") + "."];
    if (!c.problemes.length) { l.push("[Activités prioritaires à saisir.]"); return l.join("\n"); }
    l.push("Les activités que " + a.sujetMin + " et sa famille jugent prioritaires sont cotées de 1 à 10 dans le tableau ci-dessous.");
    if (c.r1 !== null || c.s1 !== null) l.push("Scores moyens : rendement " + (c.r1 !== null ? fmt(c.r1, 1) : "–") + "/10, satisfaction " + (c.s1 !== null ? fmt(c.s1, 1) : "–") + "/10.");
    if (c.reeval) {
      const dr = c.r1 !== null && c.r2 !== null ? c.r2 - c.r1 : null, ds = c.s1 !== null && c.s2 !== null ? c.s2 - c.s1 : null;
      let t = "À la réévaluation" + (m.date2 ? " du " + dateCourte(m.date2) : "") + " : rendement " + (c.r2 !== null ? fmt(c.r2, 1) : "–") + "/10" + (dr !== null ? " (" + signe(dr) + ")" : "") +
        ", satisfaction " + (c.s2 !== null ? fmt(c.s2, 1) : "–") + "/10" + (ds !== null ? " (" + signe(ds) + ")" : "") + ".";
      const sig = [dr !== null && Math.abs(dr) >= SEUIL_MCRO ? "du rendement" : "", ds !== null && Math.abs(ds) >= SEUIL_MCRO ? "de la satisfaction" : ""].filter(Boolean);
      if (sig.length) t += " L'évolution " + joindre(sig) + " est cliniquement significative (2 points ou plus).";
      l.push(t);
    }
    if (m.notes.trim()) l.push(point(maj(m.notes.trim())));
    return l.join("\n");
  }

  function redigerOthope(t, a) {
    if (t.fait !== "oui") return "";
    const items = t.items.filter((x) => x.activite.trim());
    const l = ["OT'Hope : " + a.sujetMin + " a classé les cartes d'activités selon son niveau de réussite, puis choisi ses objectifs."];
    if (!items.length) { l.push("[Résultats à saisir.]"); return l.join("\n"); }
    NIVEAUX_OTHOPE.forEach((nv) => {
      const xs = items.filter((x) => x.niveau === nv.id).map((x) => min(sansPoint(x.activite)));
      if (xs.length) l.push("– " + maj(nv.texte) + " : " + joindre(xs) + ".");
    });
    const obj = items.filter((x) => x.objectif === "oui").map((x) => min(sansPoint(x.activite)));
    if (obj.length) l.push("Objectifs choisis par " + a.sujetMin + " : " + joindre(obj) + ".");
    if (t.notes.trim()) l.push(point(maj(t.notes.trim())));
    return l.join("\n");
  }

  function redigerDcdq(q, ageMois) {
    if (q.fait !== "oui") return "";
    const c = calculDcdq(q, ageMois);
    const l = ["Questionnaire sur le trouble développemental de la coordination (DCDQ), rempli par " + (q.repondant.trim() || "les parents") + " :"];
    if (!c.n) { l.push("[Réponses à saisir.]"); return l.join("\n"); }
    c.facteurs.forEach((f) => l.push("– " + maj(f.nom) + " : " + f.total + "/" + f.max + (f.complet ? "" : " (incomplet)") + " ;"));
    l.push("– Score total : " + c.total + "/75" + (c.complet ? "" : " (" + c.n + " réponses sur 15)") + ".");
    if (c.indication === true) l.push("Pour un enfant de " + c.bande.libelle + ", ce score est en faveur d'un trouble développemental de la coordination (seuil : " + c.bande.seuil + "). Le DCDQ est un questionnaire de repérage : il oriente sans poser le diagnostic.");
    else if (c.indication === false) l.push("Pour un enfant de " + c.bande.libelle + ", ce score n'est probablement pas en faveur d'un trouble développemental de la coordination (seuil : " + c.bande.seuil + ").");
    else if (c.complet) l.push("[Âge à renseigner (5 à 15 ans) pour interpréter le score.]");
    if (q.notes.trim()) l.push(point(maj(q.notes.trim())));
    return l.join("\n");
  }

  function redigerCartes(jeu, r, a) {
    if (r.fait !== "oui") return "";
    const J = JEUX[jeu];
    const n = r.resultats.length;
    const l = ["Tri de cartes sur écran (cartes de l'outil, observation informelle non étalonnée) : " + a.sujetMin + " a classé " + n + " carte" + (n > 1 ? "s" : "") + " " + J.deSousTitre + (r.date ? " le " + dateCourte(r.date) : "") + "."];
    if (!n) { l[0] = "Tri de cartes sur écran (" + J.sousTitre + ")."; l.push("[Tri à réaliser avec " + a.sujetMin + ".]"); return l.join("\n"); }
    const libelles = jeu === "activites"
      ? { facile: "Facile", moyen: "Un peu difficile", difficile: "Difficile", non: "Ne fait pas" }
      : { aime: "Ce que " + a.sujetMin + " aime", egal: "Ce qui lui est égal", naime: "Ce que " + a.sujetMin + " n'aime pas", non: "Ne sait pas" };
    pilesDe(jeu).forEach((p) => {
      const xs = r.resultats.filter((x) => x.pile === p.id).map((x) => x.rapport);
      if (xs.length) l.push("– " + libelles[p.id] + " : " + joindre(xs) + ".");
    });
    const ch = r.choix.map((id) => r.resultats.find((x) => x.id === id)).filter(Boolean).map((x) => x.rapport);
    if (ch.length) l.push((jeu === "activites" ? "Activités que " + a.sujetMin + " voudrait mieux réussir : " : "Ce qui gêne le plus " + a.sujetMin + " : ") + joindre(ch) + ".");
    if (r.notes.trim()) l.push(point(maj(r.notes.trim())));
    return l.join("\n");
  }

  /* ================= Constats pour le diagnostic ================= */

  const THEMES_RAISONS = { auditif: "aux bruits", tactile: "au toucher", visuel: "aux stimulations visuelles" };

  function constats(o, a, ageMois) {
    const c = { personne: [], occupations: [], facteurs: [], objectifs: [], raisons: {}, occ: occupationsAvq(o.avq) };
    const ajoutRaison = (k, v) => { if (!c.raisons[k]) c.raisons[k] = v; };

    const aide = ITEMS_AVQ.filter((it) => AIDE_AVQ.indexOf(o.avq[it.id]) >= 0).map((it) => it.nom);
    const lent = ITEMS_AVQ.filter((it) => o.avq[it.id] === "lent").map((it) => it.nom);
    if (aide.length) {
      c.occupations.push("besoin d'aide ou apprentissage en cours pour " + joindre(aide));
      ajoutRaison("avq", "le besoin d'aide pour " + joindre(aide.slice(0, 3)));
    }
    if (lent.length) c.occupations.push("lenteur pour " + joindre(lent));

    if (o.mcro.fait === "oui") {
      const m = calculMcro(o.mcro);
      if (m.problemes.length) {
        const evol = (v1, v2) => (v1 !== null ? fmt(v1, 1) : "–") + (v2 !== null ? " puis " + fmt(v2, 1) : "") + "/10";
        c.occupations.push("activités prioritaires pour " + a.sujetMin + " et sa famille (MCRO) : " + joindre(m.problemes.map((p) => min(p.activite))) +
          (m.r1 !== null || m.r2 !== null ? " ; rendement moyen " + evol(m.r1, m.r2) : "") + (m.s1 !== null || m.s2 !== null ? ", satisfaction " + evol(m.s1, m.s2) : ""));
        m.problemes.forEach((p) => c.objectifs.push("Améliorer le rendement et la satisfaction de " + a.sujetMin + " pour : " + min(p.activite)));
      }
    }
    if (o.othope.fait === "oui") {
      const items = o.othope.items.filter((x) => x.activite.trim());
      const diff = items.filter((x) => x.niveau === "pas-bien" || x.niveau === "non").map((x) => min(sansPoint(x.activite)));
      if (diff.length) c.occupations.push("activités que " + a.sujetMin + " dit ne pas bien réussir (OT'Hope) : " + joindre(diff));
      items.filter((x) => x.objectif === "oui").forEach((x) => c.objectifs.push(maj(sansPoint(x.activite)) + " (objectif choisi par " + a.sujetMin + ")"));
    }
    if (o.dcdq.fait === "oui") {
      const q = calculDcdq(o.dcdq, ageMois);
      if (q.indication === true) {
        c.personne.push("un questionnaire DCDQ en faveur d'un trouble développemental de la coordination (" + q.total + "/75, seuil " + q.bande.seuil + ")");
        c.facteurs.push("des difficultés de coordination motrice");
        ajoutRaison("praxies", "les difficultés de coordination rapportées par les parents (DCDQ " + q.total + "/75)");
      }
    }
    const ta = o.cartes.activites;
    if (ta.fait === "oui" && ta.resultats.length) {
      const diff = ta.resultats.filter((x) => x.pile === "difficile").map((x) => x.rapport);
      if (diff.length) c.occupations.push("activités que " + a.sujetMin + " trouve difficiles (tri de cartes) : " + joindre(diff));
      ta.choix.map((id) => ta.resultats.find((x) => x.id === id)).filter(Boolean)
        .forEach((x) => c.objectifs.push(maj(x.rapport) + " (activité choisie par " + a.sujetMin + ")"));
    }
    const ts = o.cartes.sensoriel;
    if (ts.fait === "oui" && ts.resultats.length) {
      const gene = ts.resultats.filter((x) => x.pile === "naime");
      if (gene.length) c.personne.push("une gêne exprimée par " + a.sujetMin + " pour " + joindre(gene.map((x) => x.rapport)) + " (tri de cartes)");
      Object.keys(THEMES_RAISONS).forEach((th) => {
        const xs = gene.filter((x) => x.theme === th);
        if (xs.length) ajoutRaison(th, "la gêne exprimée face " + THEMES_RAISONS[th] + " (tri de cartes : " + joindre(xs.slice(0, 2).map((x) => x.rapport)) + ")");
      });
      const ch = ts.choix.map((id) => ts.resultats.find((x) => x.id === id)).filter(Boolean);
      if (ch.length) c.objectifs.push("Mieux vivre les situations qui gênent " + a.sujetMin + " : " + joindre(ch.map((x) => x.rapport)));
    }
    return c;
  }

  // Le volet occupationnel est-il commencé ?
  function commence(o) {
    return Object.keys(o.avq).length > 0 || ["mcro", "othope", "dcdq"].some((k) => o[k].fait === "oui") || Object.keys(JEUX).some((j) => o.cartes[j].fait === "oui");
  }

  return {
    NIVEAUX_AVQ, DOMAINES_AVQ, ITEMS_AVQ, AIDE_AVQ, NB_MCRO, SEUIL_MCRO, NIVEAUX_OTHOPE, NB_OTHOPE, MAX_OTHOPE, NB_DCDQ, FACTEURS_DCDQ, SEUILS_DCDQ,
    JEUX, MAX_CARTES_PERSO, pilesDe, cartesDuJeu, normaliserCartesPerso, problemeVide,
    vide, normaliser, calculMcro, calculDcdq, phraseAvq, occupationsAvq, redigerMcro, redigerOthope, redigerDcdq, redigerCartes, constats, commence,
  };
});
