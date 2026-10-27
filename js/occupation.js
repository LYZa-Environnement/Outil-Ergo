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

  /* ================= Questionnaire d'autonomie rempli par les parents ================= */
  // Questionnaire sur l'autonomie dans les activités de la vie quotidienne (libre d'utilisation), d'après le document de
  // Doriane Madeline et Marjorie Carreau, cabinet d'ergothérapie de Vertou. Sept domaines, réponses de « jamais » à « toujours ».
  // Quelques fautes de frappe du document d'origine sont corrigées.
  const LIBELLES_AVQP = {
    titre: "Questionnaire concernant l'autonomie dans les activités de la vie quotidienne",
    source: "D'après le questionnaire de Doriane Madeline et Marjorie Carreau, cabinet d'ergothérapie de Vertou",
    domaines: {
      habillage: ["Peut choisir ses vêtements", "Enfile ses vêtements dans l'ordre", "Enfile ses vêtements à l'endroit", "Sait mettre ses chaussures", "Sait faire ses lacets", "Manipule efficacement les boutons", "Manipule efficacement les boutons à pression", "Manipule efficacement les fermetures Éclair", "S'habille dans un temps approprié pour son âge"],
      toilette: ["Sait gérer la robinetterie (température, pression)", "Se lave et se rince le corps", "Se lave et se rince les cheveux", "Parvient à s'essuyer seul", "Se coiffe seul", "Met le dentifrice sur la brosse à dents", "Se brosse les dents efficacement", "Sait se rincer la bouche", "Va aux toilettes seul", "Peut se rhabiller seul après être allé aux toilettes", "Se lave dans un temps approprié à son âge"],
      repas: ["Mange proprement avec la cuillère et la fourchette", "Manipule efficacement le couteau", "Parvient à couper les viandes fermes", "Se sert un verre sans renverser", "Peut mettre et débarrasser la table", "Sert les plats sur la table et dans l'assiette", "Ouvre les opercules", "Ouvre les contenants", "Tient en place à table le temps du repas", "A une alimentation variée", "Mange dans un temps approprié à son âge"],
      loisirs: ["Pratique des activités sportives extrascolaires", "Pratique des activités artistiques extrascolaires", "Joue aux jeux de construction", "Aime les jeux d'extérieur", "Joue aux jeux d'imagination", "Joue aux jeux de balles et ballons", "Aime les activités manuelles", "Joue aux jeux vidéo", "Joue à l'ordinateur", "Peut jouer ou s'occuper seul", "Participe aux jeux d'équipe pendant la récréation", "Peut suivre les règles", "Sait nager seul sans aide", "Sait faire du vélo à deux roues"],
      deplacements: ["Se déplace dans le logement aisément", "Se déplace à l'extérieur aisément", "Peut monter les escaliers seul", "Peut descendre les escaliers seul", "Se repère dans des lieux non habituels", "Connaît sa droite et sa gauche", "Utilise les transports en commun pour aller à l'école", "Utilise les transports en commun pour ses loisirs"],
      ecole: ["Se rend volontiers à l'école", "Fait seul son cartable", "Parvient à ranger son casier à l'école et son bureau", "Tient ses cahiers proprement", "Colle correctement ses feuilles dans les cahiers", "Fait ses devoirs dans un temps approprié", "Présente de l'intérêt pour les activités graphiques", "Écrit tous les devoirs dans son agenda", "Écrit en respectant les lignes", "Parvient à relire son écriture", "Peut être relu par autrui", "Écrit sans ressentir de douleur", "Tient son crayon de façon adéquate", "A une vitesse d'écriture appropriée à son âge", "Sait poser les opérations en colonne", "Se repère efficacement sur une page ou un tableau", "Sait manipuler les outils scolaires en géométrie", "Parvient à représenter des figures géométriques", "Reste assis à son bureau en classe ou pour les devoirs", "Lit sans oublier de lettres ou de mots", "Comprend et peut appliquer les consignes simples", "Comprend et peut appliquer les consignes multiples"],
      comportement: ["Se bloque face à une difficulté", "Est anxieux devant une activité potentiellement difficile", "Se dévalorise", "Persévère sans se rendre compte de son erreur", "Se rend compte de ses erreurs mais poursuit la tâche", "Exprime avoir réussi une tâche échouée", "Exprime avoir fini une tâche non terminée", "Peut manquer d'attention", "Est sensible aux critiques", "Est sensible aux encouragements", "Est tolérant à la frustration"],
    },
  };

  const FREQ_AVQP = ["Jamais", "Rarement", "Parfois", "Fréquemment", "Toujours"];
  const DOMAINES_AVQP = [
    { id: "habillage", nom: "Habillage", le: "l'habillage", n: 9, question: true },
    { id: "toilette", nom: "Toilette et soins personnels", le: "la toilette", n: 11, question: true },
    { id: "repas", nom: "Alimentation et repas", le: "les repas", n: 11, question: true },
    { id: "loisirs", nom: "Loisirs", le: "les loisirs", n: 14, question: true, note: "Dans les remarques, précisez si possible la durée et la fréquence des principaux jeux." },
    { id: "deplacements", nom: "Déplacements", le: "les déplacements", n: 8, question: true },
    { id: "ecole", nom: "École", le: "la vie scolaire", n: 22, question: true },
    { id: "comportement", nom: "Comportement et vécu des difficultés", le: "le vécu des difficultés", n: 11, question: false },
  ];
  const MAX_AVQP = 40;
  // Lecture des réponses, question par question : « + » une réponse basse signale une difficulté ;
  // « - » une réponse haute la signale ; « 0 » habitude ou goût (loisirs pratiqués). Par défaut « + ».
  const SENS_AVQP = { loisirs: "000000000+++++", comportement: "---------++" };
  function sensAvqp(dom, n) { const t = SENS_AVQP[dom] || ""; return t.charAt(n - 1) || "+"; }
  // Libellés à utiliser : ceux des réglages s'ils existent (domaine par domaine), sinon ceux de l'outil.
  function libellesAvqp(libelles) {
    const l = libelles && typeof libelles === "object" ? libelles : {};
    const domaines = {};
    DOMAINES_AVQP.forEach((d) => {
      const x = l.domaines && l.domaines[d.id];
      domaines[d.id] = Array.isArray(x) && x.some((t) => texte(t).trim()) ? x : LIBELLES_AVQP.domaines[d.id];
    });
    return { titre: texte(l.titre).trim() || LIBELLES_AVQP.titre, source: texte(l.source).trim() || LIBELLES_AVQP.source, domaines: domaines };
  }
  function nbQuestionsAvqp(dom, libelles) {
    const l = libellesAvqp(libelles).domaines[dom];
    return Array.isArray(l) ? Math.min(MAX_AVQP, l.length) : 0;
  }

  function avqParentsVide() {
    const o = { fait: "", repondant: "", date: "", pdfImporte: "", enfant: "", classe: "", aesh: "", heures: "", domaines: {}, priorites: {}, complement: "", commentaire: "" };
    DOMAINES_AVQP.forEach((d) => {
      o.domaines[d.id] = { autonome: "", reponses: {}, remarques: {}, aides: "", commentaire: "" };
      o.priorites[d.id] = { rang: "", precision: "" };
    });
    return o;
  }
  function normaliserAvqParents(src) {
    const o = avqParentsVide();
    if (!src || typeof src !== "object") return o;
    o.fait = oui(src.fait);
    ["repondant", "date", "pdfImporte", "enfant", "classe", "heures", "complement", "commentaire"].forEach((k) => { if (src[k] !== undefined && src[k] !== null) o[k] = texte(src[k]).slice(0, 2000); });
    o.aesh = src.aesh === "oui" || src.aesh === "non" ? src.aesh : "";
    DOMAINES_AVQP.forEach((d) => {
      const x = (src.domaines && src.domaines[d.id]) || {}, c = o.domaines[d.id];
      c.autonome = x.autonome === "oui" || x.autonome === "non" ? x.autonome : "";
      c.aides = texte(x.aides).slice(0, 2000);
      c.commentaire = texte(x.commentaire).slice(0, 2000);
      Object.keys(x.reponses || {}).forEach((k) => {
        const v = nombre(x.reponses[k]);
        if (/^\d+$/.test(k) && +k >= 1 && +k <= MAX_AVQP && v !== null && v >= 0 && v <= 4) c.reponses[k] = Math.round(v);
      });
      Object.keys(x.remarques || {}).forEach((k) => {
        const t = texte(x.remarques[k]).slice(0, 500);
        if (/^\d+$/.test(k) && +k >= 1 && +k <= MAX_AVQP && t.trim()) c.remarques[k] = t;
      });
      const p = (src.priorites && src.priorites[d.id]) || {};
      const r = nombre(p.rang);
      o.priorites[d.id] = { rang: r !== null && r >= 1 && r <= DOMAINES_AVQP.length ? String(Math.round(r)) : "", precision: texte(p.precision).slice(0, 1000) };
    });
    return o;
  }

  // Réponses d'un PDF rempli (champs avq_…), dans la forme du dossier. ch : valeur d'un bouton radio sans « / ».
  function depuisChampsAvqParents(champs) {
    const ch = (v) => { const t = texte(v).trim().replace(/^\//, ""); return t === "Off" ? "" : t; };
    const tx = (v) => texte(v).trim();
    const o = avqParentsVide();
    let nombre = 0;
    DOMAINES_AVQP.forEach((d) => {
      const c = o.domaines[d.id], pre = "avq_" + d.id + "_";
      const a = ch(champs[pre + "auto"]);
      if (a === "oui" || a === "non") c.autonome = a;
      c.aides = tx(champs[pre + "aides"]);
      for (let n = 1; n <= MAX_AVQP; n++) {
        const nom = pre + String(n).padStart(2, "0");
        const v = ch(champs[nom]);
        if (/^[0-4]$/.test(v)) { c.reponses[n] = Number(v); nombre++; }
        const r = tx(champs[nom + "_r"]);
        if (r) c.remarques[n] = r;
      }
      const rang = tx(champs["avq_prio_" + d.id]).replace(/\D/g, "");
      o.priorites[d.id] = { rang: rang && +rang >= 1 && +rang <= DOMAINES_AVQP.length ? String(+rang) : "", precision: tx(champs["avq_prio_" + d.id + "_p"]) };
    });
    o.complement = tx(champs.avq_complement);
    o.enfant = tx(champs.avq_enfant);
    o.classe = tx(champs.avq_classe);
    o.heures = tx(champs.avq_heures);
    o.repondant = tx(champs.avq_repondant);
    o.date = tx(champs.avq_date);
    const aesh = ch(champs.avq_aesh);
    if (aesh === "oui" || aesh === "non") o.aesh = aesh;
    const autres = DOMAINES_AVQP.some((d) => o.domaines[d.id].autonome || o.domaines[d.id].aides || Object.keys(o.domaines[d.id].remarques).length || o.priorites[d.id].rang || o.priorites[d.id].precision) || o.complement;
    return { donnees: o, nombre: nombre, autres: !!autres, naissance: tx(champs.avq_naissance), formulaire: Object.keys(champs).some((k) => /^avq_/.test(k)) };
  }

  // Modèle vierge du PDF (le même pour tous les enfants), pour js/pdf.js.
  // o : { libelles: { titre, source, domaines } (par défaut ceux de l'outil), cabinet: [lignes], logo, contact, mention }
  function specAvqParents(o) {
    const lib = libellesAvqp(o.libelles);
    const valeurs = FREQ_AVQP.map((_, k) => String(k));
    return {
      titre: texte(lib.titre).trim() || "Autonomie dans les activités de la vie quotidienne : questionnaire pour les parents",
      source: texte(lib.source).trim(), cabinet: o.cabinet, logo: o.logo, mention: o.mention, meta: { type: "outil-ergo-avq", v: 1 },
      entete: [
        [{ type: "texte", nom: "avq_enfant", libelle: "Enfant (prénom et nom)", largeur: 214 }, { type: "texte", nom: "avq_naissance", libelle: "Né(e) le" }],
        [{ type: "texte", nom: "avq_classe", libelle: "Classe", largeur: 110 }, { type: "choix", nom: "avq_aesh", libelle: "AESH (AVS)", options: [["oui", "Oui"], ["non", "Non"]] }, { type: "texte", nom: "avq_heures", libelle: "Nombre d'heures" }],
        [{ type: "texte", nom: "avq_repondant", libelle: "Rempli par", largeur: 264 }, { type: "texte", nom: "avq_date", libelle: "Le" }],
      ],
      consignes: [
        "Pour chaque phrase, cliquez sur la fréquence qui correspond le mieux à votre enfant : jamais, rarement, parfois, fréquemment ou toujours. Vous pouvez ajouter une remarque dans la colonne de droite. Il n'y a pas de bonne ou de mauvaise réponse.",
        "Pour chaque domaine, indiquez aussi si votre enfant est autonome et quelles aides vous avez mises en place. À la fin, classez les domaines que vous aimeriez voir progresser.",
        "Une fois rempli, enregistrez le fichier (« Enregistrer » ou « Télécharger » dans votre lecteur PDF) et renvoyez-le" + (o.contact ? " à " + o.contact : " au cabinet") + ".",
        "Vous préférez le papier ? Imprimez-le, cochez les ronds et écrivez dans les cadres.",
      ],
      sections: DOMAINES_AVQP.map((d) => {
        const libs = (lib.domaines && lib.domaines[d.id]) || [];
        return {
          titre: d.nom, note: d.note, remarques: true,
          question: d.question ? { nom: "avq_" + d.id + "_auto", libelle: "Votre enfant est-il autonome dans ce domaine ?", options: [["oui", "Oui"], ["non", "Non"]] } : null,
          echelle: { valeurs: valeurs, libelles: FREQ_AVQP },
          items: Array.from({ length: nbQuestionsAvqp(d.id, lib) }, (_, i) => ({ nom: "avq_" + d.id + "_" + String(i + 1).padStart(2, "0"), texte: texte(libs[i]).trim() || "Question " + (i + 1), aide: d.nom + ", question " + (i + 1) })),
          zone: d.question ? { nom: "avq_" + d.id + "_aides", libelle: "Quelles aides avez-vous mises en place pour votre enfant ? Sont-elles efficaces ?", hauteur: 40 }
            : { nom: "avq_complement", libelle: "Avez-vous d'autres éléments à ajouter ?", hauteur: 56 },
        };
      }),
      fin: [{ type: "priorites", titre: "Quels domaines aimeriez-vous voir progresser ?", note: "Numérotez les domaines par ordre de priorité, de 1 (le plus important) à 7, et précisez si vous le souhaitez.",
        lignes: DOMAINES_AVQP.map((d) => ({ libelle: d.nom, rang: "avq_prio_" + d.id, precision: "avq_prio_" + d.id + "_p" })) }],
    };
  }

  // Classement d'une réponse : « difficulte », « parfois », « acquis » ; pour une habitude : « frequent », « parfois », « rare ».
  function classeAvqp(sens, v) {
    if (v === undefined || v === null) return "";
    if (sens === "0") return v >= 3 ? "frequent" : v <= 1 ? "rare" : "parfois";
    const bon = sens === "-" ? 4 - v : v;
    return bon <= 1 ? "difficulte" : bon === 2 ? "parfois" : "acquis";
  }
  function analyseAvqParents(q, libelles) {
    const lib = libellesAvqp(libelles);
    return DOMAINES_AVQP.map((d) => {
      const libs = lib.domaines[d.id] || [];
      const x = q.domaines[d.id];
      const items = Object.keys(x.reponses).map(Number).sort((a, b) => a - b).map((n) => {
        const sens = sensAvqp(d.id, n), v = x.reponses[n];
        return { n: n, libelle: texte(libs[n - 1]).trim() || "question " + n, v: v, reponse: FREQ_AVQP[v], sens: sens, classe: classeAvqp(sens, v), remarque: texte(x.remarques[n]).trim() };
      });
      const de = (c) => items.filter((it) => it.classe === c);
      return {
        id: d.id, nom: d.nom, le: d.le, autonome: x.autonome, repondues: items.length, nb: nbQuestionsAvqp(d.id, libelles), items: items,
        difficultes: de("difficulte"), parfois: de("parfois"), acquis: de("acquis"), frequents: de("frequent"), rares: de("rare"),
        aides: texte(x.aides).trim(), commentaire: texte(x.commentaire).trim(),
      };
    });
  }

  // Synthèse pour le compte rendu (texte modifiable ensuite dans l'onglet Compte rendu).
  function redigerAvqParents(q, libelles, a) {
    if (!q || q.fait !== "oui") return "";
    const an = analyseAvqParents(q, libelles);
    const l = ["Questionnaire sur l'autonomie dans les activités de la vie quotidienne, rempli par " + (q.repondant.trim() || "les parents") + (q.date ? " le " + (dateCourte(q.date) || q.date) : "") + "."];
    const ouiL = an.filter((d) => d.autonome === "oui").map((d) => d.le), nonL = an.filter((d) => d.autonome === "non").map((d) => d.le);
    if (ouiL.length || nonL.length) {
      const m = [];
      if (ouiL.length) m.push("est autonome pour " + joindre(ouiL));
      if (nonL.length) m.push((ouiL.length ? "mais " : "") + "n'est pas autonome pour " + joindre(nonL));
      l.push("Selon ses parents, " + a.sujetMin + " " + m.join(" ") + ".");
    }
    if (q.aesh === "oui") l.push("Accompagnement par une AESH" + (q.heures.trim() ? " : " + sansPoint(q.heures) + (/\d$/.test(q.heures.trim()) ? " h" : "") : "") + ".");
    else if (q.aesh === "non") l.push("Pas d'accompagnement par une AESH.");
    const liste = (its) => its.map((it) => min(sansPoint(it.libelle)) + (it.remarque ? " (" + sansPoint(it.remarque).slice(0, 140) + ")" : "")).join(" ; ");
    const calmes = [];
    an.forEach((d) => {
      const m = [];
      const plus = d.difficultes.filter((it) => it.sens === "+"), moins = d.difficultes.filter((it) => it.sens === "-");
      if (plus.length) m.push("Jamais ou rarement : " + liste(plus) + ".");
      if (moins.length) m.push("Fréquemment ou toujours : " + liste(moins) + ".");
      const parfois = d.parfois.filter((it) => it.sens !== "0");
      if (parfois.length) m.push("Parfois : " + liste(parfois) + ".");
      if (d.frequents.length) m.push("Activités fréquentes : " + liste(d.frequents) + ".");
      if (d.rares.length) m.push("Rarement ou jamais pratiqué : " + liste(d.rares) + ".");
      if (d.aides) m.push("Aides mises en place : " + point(sansPoint(d.aides)));
      if (d.commentaire) m.push(point(maj(d.commentaire)));
      if (m.length) l.push("– " + d.nom + ". " + m.join(" "));
      else if (d.repondues) calmes.push(d.le);
    });
    if (calmes.length) l.push("Pas de difficulté signalée pour " + joindre(calmes) + ".");
    if (q.complement.trim()) l.push("Autres éléments rapportés par les parents : " + point(sansPoint(q.complement)));
    const prio = DOMAINES_AVQP.map((d) => ({ d: d, p: q.priorites[d.id] })).filter((x) => x.p.rang).sort((x, y) => +x.p.rang - +y.p.rang);
    if (prio.length) l.push("Priorités des parents : " + prio.map((x) => x.p.rang + ". " + x.d.le + (x.p.precision.trim() ? " (" + sansPoint(x.p.precision) + ")" : "")).join(" ; ") + ".");
    if (q.commentaire.trim()) l.push(point(maj(q.commentaire.trim())));
    if (l.length === 1) l.push("[Réponses à saisir.]");
    return l.join("\n");
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
  const MAX_OBJECTIFS_OTHOPE = 5;
  const CONSEIL_OTHOPE = 50; // le guide conseille de proposer 50 cartes au plus à la fois

  /* ---------- OT'Hope : cartes items à l'écran (textes des cartes, pictogrammes propres à l'outil) ---------- */

  // Colonnes du plateau ; « retiree » = carte sans importance pour l'enfant, retirée du plateau.
  const PILES_OTHOPE = [
    { id: "sait", label: "Oui", aide: "je sais faire", emoji: "😀", couleur: "ciel" },
    { id: "aide", label: "Oui, avec aide", aide: "j'ai besoin d'aide", emoji: "🤝", couleur: "ambre" },
    { id: "pas-bien", label: "Pas très bien", aide: "je fais, mais ce n'est pas bien", emoji: "😐", couleur: "violet" },
    { id: "non", label: "Non", aide: "je ne sais pas faire", emoji: "😟", couleur: "corail" },
  ];
  const RETIREE_OTHOPE = { id: "retiree", label: "Pas pour moi", emoji: "✋" };

  // [id, texte de la carte, texte du compte rendu, pictogramme, occupation du diagnostic]
  const FAMILLES_OTHOPE = [
    { id: "avq", nom: "Activités de vie quotidienne", sousFamilles: [
      { id: "soins", nom: "Soins personnels", couleur: "#1f7fbf", cartes: [
        ["maquiller", "Me maquiller", "se maquiller", "💄", "toilette"], ["raser", "Me raser", "se raser", "🪒", "toilette"],
        ["epiler", "M'épiler", "s'épiler", "🦵", "toilette"], ["hygiene", "Gérer mon hygiène féminine", "gérer son hygiène féminine", "🌸", "toilette"],
        ["tartine", "Me faire une tartine", "se faire une tartine", "🍞", "repas"], ["vetements", "Mettre et enlever mes vêtements", "mettre et enlever ses vêtements", "👕", "habillage"],
        ["dents", "Me brosser les dents", "se brosser les dents", "🪥", "toilette"], ["verre", "Servir un verre d'eau", "servir un verre d'eau", "🥛", "repas"],
        ["reveil", "Me réveiller seul", "se réveiller seul", "⏰", "sommeil"], ["moucher", "Me moucher", "se moucher", "🤧", "toilette"],
        ["manger", "Manger / boire", "manger et boire", "🍽️", "repas"], ["visage", "Me laver le visage", "se laver le visage", "🧼", "toilette"],
        ["manteau", "Fermer mon manteau", "fermer son manteau", "🧥", "habillage"], ["wc", "Aller aux WC", "aller aux toilettes", "🚽", "toilette"],
        ["dormir", "Dormir", "dormir", "😴", "sommeil"], ["eplucher", "Éplucher un fruit", "éplucher un fruit", "🍊", "repas"],
        ["doucher", "Me doucher", "se doucher", "🚿", "toilette"], ["mains", "Me laver les mains", "se laver les mains", "🫧", "toilette"],
        ["chaussures", "Mettre mes chaussures", "mettre ses chaussures", "👟", "habillage"], ["coiffer", "Me coiffer", "se coiffer", "💇", "toilette"],
        ["boutons", "Mettre mes boutons", "fermer ses boutons", "🔘", "habillage"], ["viande", "Couper ma viande", "couper sa viande", "🔪", "repas"],
        ["lacets", "Faire mes lacets", "faire ses lacets", "🎀", "habillage"], ["bijoux", "Mettre mes bijoux", "mettre ses bijoux", "📿", "habillage"],
      ] },
      { id: "securite", nom: "Gérer ma sécurité", couleur: "#6f9a1f", cartes: [
        ["parents", "Appeler mes parents", "appeler ses parents", "📱", ""], ["casque", "Mettre mon casque", "mettre son casque", "⛑️", ""],
        ["protections", "Mettre mes protections", "mettre ses protections", "🛡️", ""], ["ceinture", "Attacher ma ceinture", "attacher sa ceinture", "🚗", ""],
        ["cle", "Utiliser une clé, un cadenas", "utiliser une clé ou un cadenas", "🔑", ""], ["traverser", "Traverser la rue", "traverser la rue", "🚸", "deplacements"],
        ["secours", "Appeler les secours", "appeler les secours", "🚑", ""],
      ] },
      { id: "deplacements", nom: "Déplacements", couleur: "#1e7a5a", cartes: [
        ["trottinette", "Me déplacer à roller / skate / trottinette", "se déplacer en roller, skate ou trottinette", "🛴", "deplacements"],
        ["transports", "Utiliser les transports en commun", "utiliser les transports en commun", "🚌", "deplacements"],
        ["velo-trajet", "Me déplacer à vélo", "se déplacer à vélo", "🚴", "deplacements"],
      ] },
      { id: "productivite", nom: "Productivité", couleur: "#1f3f8f", cartes: [
        ["repasser", "Repasser", "repasser le linge", "👔", ""], ["etendre", "Étendre le linge", "étendre le linge", "🧺", ""],
        ["balayer", "Balayer", "balayer", "🧹", ""], ["animaux", "S'occuper des animaux", "s'occuper des animaux", "🐇", ""],
        ["poubelle", "Sortir la poubelle", "sortir la poubelle", "🗑️", ""], ["lave-vaisselle", "Vider le lave-vaisselle", "vider le lave-vaisselle", "🥣", ""],
        ["lessive", "Faire la lessive", "faire la lessive", "🌀", ""], ["plier", "Plier le linge", "plier le linge", "👚", ""],
        ["vaisselle", "Faire la vaisselle", "faire la vaisselle", "🧽", ""], ["aspirateur", "Passer l'aspirateur", "passer l'aspirateur", "🔌", ""],
        ["table", "Mettre la table / débarrasser", "mettre et débarrasser la table", "🍴", "repas"], ["lit", "Faire mon lit", "faire son lit", "🛏️", ""],
        ["chambre", "Ranger ma chambre", "ranger sa chambre", "🧸", ""], ["micro-ondes", "Utiliser le micro-ondes", "utiliser le micro-ondes", "♨️", ""],
        ["poussiere", "Enlever la poussière", "enlever la poussière", "🪶", ""], ["argent", "Compter mon argent", "compter son argent", "🪙", ""],
        ["cuisiner", "Cuisiner", "cuisiner", "🍳", "repas"],
      ] },
    ] },
    { id: "scolaire", nom: "Activités scolaires", sousFamilles: [
      { id: "ecole", nom: "Dans l'école", couleur: "#9a5426", cartes: [
        ["delegue", "Être délégué de classe", "être délégué de classe", "🗳️", "social"], ["plateau", "Tenir mon plateau à la cantine", "tenir son plateau à la cantine", "🍱", "repas"],
        ["installer", "M'installer confortablement à mon bureau", "s'installer confortablement à son bureau", "🪑", "ecrit-classe"],
        ["changer-sport", "Me changer pour le sport", "se changer pour le sport", "🩳", "habillage"], ["heure", "Lire l'heure", "lire l'heure", "🕒", ""],
        ["bureau", "Retrouver mes affaires dans mon bureau", "retrouver ses affaires dans son bureau", "🗂️", "outils"],
        ["debarrasser", "Débarrasser mon plateau", "débarrasser son plateau", "🥡", "repas"], ["reperer", "Me repérer dans l'école", "se repérer dans l'école", "🏫", ""],
        ["sport-ecole", "Faire du sport", "faire du sport à l'école", "🤸", "sport"], ["classeur", "Ranger dans mon classeur", "ranger ses feuilles dans son classeur", "📒", "outils"],
        ["tableau", "Écrire au tableau", "écrire au tableau", "🧑‍🏫", "ecrit-classe"],
        ["casier", "Retrouver mes affaires dans mon casier", "retrouver ses affaires dans son casier", "🗄️", "outils"],
        ["recre", "Jouer à la récréation", "jouer à la récréation", "🤝", "social"],
      ] },
      { id: "ordinateur", nom: "Avec mon ordinateur", couleur: "#b8961a", cartes: [
        ["ordi-classe", "Utiliser l'ordinateur en classe", "utiliser l'ordinateur en classe", "💻", "ecrit-classe"],
        ["ordi-maison", "Utiliser l'ordinateur à la maison", "utiliser l'ordinateur à la maison", "🏠", "devoirs"],
        ["ordi-evaluation", "Utiliser l'ordinateur en évaluation", "utiliser l'ordinateur en évaluation", "🖥️", "evaluations"],
      ] },
      { id: "crayon", nom: "Avec mon crayon", couleur: "#c8202f", cartes: [
        ["lecon", "Écrire une leçon sans être fatigué", "écrire une leçon sans être fatigué", "😮‍💨", "ecrit-classe"],
        ["lignes", "Écrire en suivant les lignes", "écrire en suivant les lignes", "〰️", "ecrit-classe"],
        ["dessiner", "Dessiner sur une feuille", "dessiner sur une feuille", "🖼️", "outils"],
        ["lisible", "Écrire lisiblement pour les autres", "écrire lisiblement pour les autres", "✍️", "ecrit-classe"],
        ["relire", "Me relire", "se relire", "🔁", "ecrit-classe"], ["lettres", "Former toutes les lettres correctement", "former toutes les lettres correctement", "🔤", "ecrit-classe"],
        ["endroit", "Écrire au bon endroit sur la feuille", "écrire au bon endroit sur la feuille", "📄", "ecrit-classe"],
      ] },
      { id: "outils", nom: "Avec mes outils", couleur: "#e06b10", cartes: [
        ["tailler", "Tailler mes crayons", "tailler ses crayons", "✏️", "outils"], ["coller", "Coller une feuille dans mon cahier", "coller une feuille dans son cahier", "📓", "outils"],
        ["pinceau", "Utiliser un pinceau", "utiliser un pinceau", "🖌️", "outils"], ["regle", "Tracer un trait à la règle", "tracer un trait à la règle", "📏", "outils"],
        ["souligner", "Souligner", "souligner", "🖊️", "outils"], ["decouper", "Découper", "découper", "✂️", "outils"],
        ["gommer", "Gommer", "gommer", "🔲", "outils"], ["colorier", "Colorier sans dépasser", "colorier sans dépasser", "🖍️", "outils"],
      ] },
      { id: "maths", nom: "En mathématiques", couleur: "#c9a800", cartes: [
        ["calculatrice", "Utiliser une calculatrice", "utiliser une calculatrice", "🧮", "outils"], ["equerre", "Utiliser mon équerre", "utiliser son équerre", "📐", "outils"],
        ["triangle", "Tracer un triangle", "tracer un triangle", "🔺", "outils"], ["compter", "Compter", "compter", "🔢", ""],
        ["carre", "Tracer un carré", "tracer un carré", "🟦", "outils"], ["operation", "Poser une opération", "poser une opération", "➕", "ecrit-classe"],
        ["rapporteur", "Utiliser mon rapporteur", "utiliser son rapporteur", "🌓", "outils"], ["rond", "Tracer un rond", "tracer un rond", "⭕", "outils"],
        ["compas", "Utiliser mon compas", "utiliser son compas", "🧭", "outils"],
      ] },
      { id: "devoirs", nom: "Pour les devoirs", couleur: "#d98a00", cartes: [
        ["organiser", "M'organiser pour faire mes devoirs", "s'organiser pour faire ses devoirs", "🗓️", "devoirs"],
        ["exercices", "Faire mes exercices", "faire ses exercices", "📗", "devoirs"],
        ["agenda", "Écrire mes devoirs dans mon agenda", "noter ses devoirs dans son agenda", "📔", "devoirs"],
        ["apprendre", "Savoir quoi apprendre", "savoir quoi apprendre", "🤔", "devoirs"],
        ["cartable", "Préparer mon cartable", "préparer son cartable", "🎒", "outils"], ["cours", "Relire mes cours", "relire ses cours", "📖", "devoirs"],
      ] },
    ] },
    { id: "loisirs", nom: "Loisirs", sousFamilles: [
      { id: "sports", nom: "Sports", couleur: "#3a2470", cartes: [
        ["basket", "Faire du basket", "faire du basket", "🏀", "sport"], ["courir", "Courir", "courir", "🏃", "sport"],
        ["rugby", "Faire du rugby", "faire du rugby", "🏉", "sport"], ["badminton", "Faire du badminton / tennis", "faire du badminton ou du tennis", "🏸", "sport"],
        ["volley", "Faire du volley", "faire du volley", "🏐", "sport"], ["gym", "Faire de la gym / danse", "faire de la gymnastique ou de la danse", "🤸‍♀️", "sport"],
        ["handball", "Faire du handball", "faire du handball", "🤾", "sport"], ["foot", "Faire du foot", "faire du football", "🥅", "sport"],
        ["nager", "Nager", "nager", "🏊", "sport"], ["ski", "Faire du ski", "faire du ski", "⛷️", "sport"],
        ["patin", "Faire du patin à glace", "faire du patin à glace", "⛸️", "sport"], ["judo", "Faire du judo / karaté", "faire du judo ou du karaté", "🥋", "sport"],
      ] },
      { id: "exterieur", nom: "Jeux d'extérieur", couleur: "#c4527f", cartes: [
        ["roller", "Faire du roller", "faire du roller", "🛼", "sport"], ["balancoire", "Faire de la balançoire", "faire de la balançoire", "🎢", "jeux"],
        ["neige", "Jouer dans la neige", "jouer dans la neige", "⛄", "jeux"], ["amis-dehors", "Se retrouver entre amis", "se retrouver entre amis", "👫", "social"],
        ["sable", "Jouer dans le sable", "jouer dans le sable", "🏖️", "jeux"], ["ballon", "Jouer au ballon", "jouer au ballon", "⚽", "sport"],
        ["grimper", "Grimper aux arbres", "grimper aux arbres", "🌳", "jeux"], ["corde", "Sauter à la corde", "sauter à la corde", "🪢", "jeux"],
        ["marelle", "Jouer à la marelle", "jouer à la marelle", "👣", "jeux"], ["velo", "Faire du vélo", "faire du vélo", "🚲", "sport"],
        ["petanque", "Jouer au palet / à la pétanque", "jouer au palet ou à la pétanque", "🎳", "jeux"], ["trampoline", "Faire du trampoline", "faire du trampoline", "🦘", "jeux"],
        ["eau", "Jouer dans l'eau", "jouer dans l'eau", "💦", "jeux"], ["frisbee", "Jouer au frisbee", "jouer au frisbee", "🥏", "jeux"],
      ] },
      { id: "interieur", nom: "Jeux d'intérieur", couleur: "#8e1b5c", cartes: [
        ["jeux-video", "Jouer aux jeux vidéo", "jouer aux jeux vidéo", "🎮", "jeux"], ["flechettes", "Jouer aux fléchettes", "jouer aux fléchettes", "🎯", "jeux"],
        ["construction", "Faire des jeux de construction", "faire des jeux de construction", "🧱", "jeux"],
        ["instrument", "Jouer d'un instrument de musique", "jouer d'un instrument de musique", "🎸", "jeux"],
        ["ecrire-histoires", "Écrire des histoires", "écrire des histoires", "🖋️", "jeux"], ["amis", "Jouer avec des amis", "jouer avec des amis", "🃏", "social"],
        ["lire", "Lire des histoires", "lire des histoires", "📚", "jeux"], ["arts", "Faire des arts plastiques", "faire des arts plastiques", "🎨", "jeux"],
        ["bricoler", "Bricoler", "bricoler", "🔨", "jeux"], ["societe", "Jouer aux jeux de société", "jouer aux jeux de société", "🎲", "jeux"],
        ["collections", "Faire des collections", "faire des collections", "🏷️", "jeux"], ["musique", "Écouter de la musique", "écouter de la musique", "🎧", "jeux"],
        ["telephone", "Répondre au téléphone", "répondre au téléphone", "☎️", "social"],
      ] },
    ] },
  ];
  const SOUS_FAMILLES_OTHOPE = [];
  const CARTES_OTHOPE = [];
  FAMILLES_OTHOPE.forEach((f) => f.sousFamilles.forEach((sf) => {
    sf.famille = f.id;
    sf.cartes = sf.cartes.map((c) => {
      const carte = { id: "o-" + c[0], enfant: c[1], rapport: c[2], emoji: c[3], occ: c[4], sf: sf.id, famille: f.id };
      CARTES_OTHOPE.push(carte);
      return carte;
    });
    SOUS_FAMILLES_OTHOPE.push(sf);
  }));
  const SF_PERSO_OTHOPE = { id: "perso", nom: "Mes cartes", couleur: "#5a6470", famille: "perso" };

  // Jeu passé à l'écran par l'enfant (TriCartes) : 4 colonnes, carte retirée, valorisation, souhaits, objectifs.
  const JEU_OTHOPE = {
    id: "othope", titre: "Moi, je sais faire !", ordre: "fixe",
    consigne: "Est-ce que tu sais le faire ?",
    accueil: "Je vais te montrer des cartes.<br>Pour chaque carte, dis-moi si tu sais le faire.",
    piles: PILES_OTHOPE,
    passer: RETIREE_OTHOPE,
    valoriser: { pile: "sait", titre: "Tout ça, tu sais déjà le faire !" },
    souhait: { consigne: "Quelles activités aimerais-tu savoir bien faire ?", piles: ["aide", "pas-bien", "non"] },
    choix: { consigne: "Choisis jusqu'à 5 activités à travailler avec moi", piles: ["aide", "pas-bien", "non"], max: MAX_OBJECTIFS_OTHOPE, parmiSouhaits: true },
  };

  function sousFamilleOthope(id) { return SOUS_FAMILLES_OTHOPE.find((s) => s.id === id) || (id === "perso" ? SF_PERSO_OTHOPE : null); }

  // DCDQ-FE : version en français pour l'Europe (Ray-Kaeser, Thommen, Martini, Jover, Gurtner et Bertrand, 2019,
  // feuille de scores et guide d'administration du 16.09.2019). Les questions ne sont pas reproduites : seuls les
  // intitulés courts de la feuille de scores servent de repère pour la saisie.
  const NB_DCDQ = 15;
  const ITEMS_DCDQ = ["", "Lance un ballon", "Attrape une balle", "Frappe une balle, un volant", "Saute par-dessus", "Court vite",
    "Planifie une activité motrice", "Écrit rapidement", "Écrit lisiblement", "Fournit une pression adaptée", "Découpe",
    "Aime les activités sportives", "Apprend de nouvelles habiletés", "Rapide et efficace", "Semble adroit", "Reste assis en se tenant droit"];
  const FACTEURS_DCDQ = [
    { id: "controle", nom: "contrôle durant le mouvement", items: [1, 2, 3, 4, 5, 6] },
    { id: "fine", nom: "motricité fine et écriture", items: [7, 8, 9, 10] },
    { id: "generale", nom: "coordination globale", items: [11, 12, 13, 14, 15] },
  ];
  // Un total inférieur ou égal à 56 indique un risque de TDC (5 ans 0 mois à 14 ans 11 mois), quel que soit l'âge.
  // Sensibilité et spécificité par groupe d'âge, avec ce seuil (guide d'administration du DCDQ-FE).
  const SEUIL_DCDQ = 56;
  const AGE_DCDQ = { de: 60, a: 179, libelle: "5 ans 0 mois à 14 ans 11 mois" };
  const SEUILS_DCDQ = [
    { de: 60, a: 95, seuil: SEUIL_DCDQ, libelle: "5 ans 0 mois à 7 ans 11 mois", sensibilite: 0.75, specificite: 0.91 },
    { de: 96, a: 119, seuil: SEUIL_DCDQ, libelle: "8 ans 0 mois à 9 ans 11 mois", sensibilite: 1, specificite: 0.74 },
    { de: 120, a: 179, seuil: SEUIL_DCDQ, libelle: "10 ans 0 mois à 14 ans 11 mois", sensibilite: 0.83, specificite: 0.81 },
  ];
  const REF_DCDQ = "Ray-Kaeser S., Thommen E., Martini R., Jover M., Gurtner B., Bertrand A. M. (2019). Psychometric assessment of the French European Developmental Coordination Disorder Questionnaire (DCDQ-FE). PLoS ONE, 14(5), e0217280";

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
    return l.filter((c) => c && (JEUX[c.jeu] || c.jeu === "othope") && texte(c.texte).trim()).slice(0, MAX_CARTES_PERSO).map((c) => {
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

  // Cartes OT'Hope proposables, dans l'ordre des familles, suivies des cartes personnelles.
  function cartesOthope(perso) {
    return CARTES_OTHOPE.concat(normaliserCartesPerso(perso).filter((c) => c.jeu === "othope").map((c) => ({
      id: c.id, enfant: c.texte, rapport: min(c.texte), emoji: "", photo: c.photo, occ: "", sf: "perso", famille: "perso", perso: true,
    })));
  }
  const PILES_OTHOPE_IDS = PILES_OTHOPE.map((p) => p.id).concat([RETIREE_OTHOPE.id]);

  // Résultats de l'écran (ou du plateau, reportés dans la grille) → lignes { activite, niveau, objectif, souhait }.
  function itemsOthope(t) {
    const ecran = (t.resultats || []).filter((x) => x.pile !== RETIREE_OTHOPE.id).map((x) => ({
      activite: maj(x.rapport || min(x.enfant)), niveau: x.pile, objectif: (t.choix || []).indexOf(x.id) >= 0 ? "oui" : "", souhait: x.souhait ? "oui" : "",
    }));
    return ecran.concat((t.items || []).filter((x) => texte(x.activite).trim()).map((x) => Object.assign({ souhait: "" }, x)));
  }

  function triVide() { return { fait: "", date: "", resultats: [], choix: [], exclues: [], notes: "" }; }

  /* ================= Dossier ================= */

  function problemeVide() { return { activite: "", importance: "", rendement1: "", satisfaction1: "", rendement2: "", satisfaction2: "" }; }

  function vide() {
    return {
      avq: {},
      avqParents: avqParentsVide(),
      mcro: { fait: "", date: "", date2: "", repondant: "", problemes: Array.from({ length: NB_MCRO }, problemeVide), notes: "" },
      othope: { fait: "", date: "", selection: [], resultats: [], choix: [], items: Array.from({ length: NB_OTHOPE }, () => ({ activite: "", niveau: "", objectif: "" })), notes: "" },
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
    o.avqParents = normaliserAvqParents(src.avqParents);
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
    o.othope.date = texte(t.date);
    if (Array.isArray(t.selection)) o.othope.selection = Array.from(new Set(t.selection.map(texte).filter((id) => /^[op]-[a-z0-9-]+$/.test(id)))).slice(0, 200);
    if (Array.isArray(t.resultats)) {
      const vus = {};
      o.othope.resultats = t.resultats.filter((x) => {
        if (!x || !/^[op]-[a-z0-9-]+$/.test(texte(x.id)) || PILES_OTHOPE_IDS.indexOf(x.pile) < 0 || vus[x.id]) return false;
        vus[x.id] = true;
        return true;
      }).slice(0, 200).map((x) => ({
        id: texte(x.id), enfant: texte(x.enfant), rapport: texte(x.rapport) || min(texte(x.enfant)), emoji: texte(x.emoji),
        sf: sousFamilleOthope(texte(x.sf)) ? texte(x.sf) : "perso", occ: texte(x.occ), pile: x.pile, souhait: !!x.souhait && x.pile !== RETIREE_OTHOPE.id,
      }));
    }
    if (Array.isArray(t.choix)) {
      const ok = o.othope.resultats.filter((x) => x.pile !== RETIREE_OTHOPE.id).map((x) => x.id);
      o.othope.choix = Array.from(new Set(t.choix.map(texte))).filter((id) => ok.indexOf(id) >= 0).slice(0, MAX_OBJECTIFS_OTHOPE);
    }
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

  // hors : "jeune" ou "age" (au-delà de 14 ans 11 mois) quand l'âge est connu mais hors du champ du DCDQ-FE.
  function calculDcdq(q, ageMois) {
    const rep = q.reponses;
    const n = Object.keys(rep).filter((k) => rep[k] >= 1 && rep[k] <= 5).length;
    const facteurs = FACTEURS_DCDQ.map((f) => ({
      id: f.id, nom: f.nom, total: f.items.reduce((a, i) => a + (rep[i] || 0), 0), max: f.items.length * 5, complet: f.items.every((i) => rep[i]),
      manquantes: f.items.filter((i) => !rep[i]),
    }));
    const total = facteurs.reduce((a, f) => a + f.total, 0);
    const complet = n === NB_DCDQ;
    const manquantes = facteurs.reduce((a, f) => a.concat(f.manquantes), []);
    const connu = ageMois !== null && ageMois !== undefined && !isNaN(ageMois);
    const bande = connu ? SEUILS_DCDQ.find((b) => ageMois >= b.de && ageMois <= b.a) || null : null;
    const hors = connu && !bande ? (ageMois < AGE_DCDQ.de ? "jeune" : "age") : null;
    return { n: n, complet: complet, manquantes: manquantes, facteurs: facteurs, total: total, bande: bande, hors: hors,
      indication: complet && bande ? total <= bande.seuil : null };
  }

  // Termes recommandés par le guide du DCDQ-FE pour parler du résultat.
  function libelleDcdq(c) {
    return c.indication === true ? "indication d'un risque de TDC" : c.indication === false ? "probablement pas de TDC" : "";
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
    const items = itemsOthope(t);
    const res = t.resultats || [];
    const nEcran = res.length;
    const retirees = res.filter((x) => x.pile === RETIREE_OTHOPE.id).length;
    let intro = "OT'Hope (outil d'autodétermination des objectifs) : " + a.sujetMin + " a classé ";
    intro += nEcran ? nEcran + " carte" + (nEcran > 1 ? "s" : "") + " d'activités" + (t.date ? " le " + dateCourte(t.date) : "") : "les cartes d'activités";
    intro += " selon son niveau de réussite, sur ses propres critères, puis choisi ses objectifs.";
    const l = [intro];
    if (!items.length) { l.push("[Résultats à saisir.]"); return l.join("\n"); }
    if (retirees) l.push("Cartes retirées car sans importance pour " + a.sujetMin + " : " + retirees + ".");
    NIVEAUX_OTHOPE.forEach((nv) => {
      const xs = items.filter((x) => x.niveau === nv.id).map((x) => min(sansPoint(x.activite)));
      if (xs.length) l.push("– " + maj(nv.texte) + " : " + joindre(xs) + ".");
    });
    const souh = items.filter((x) => x.souhait === "oui" && x.objectif !== "oui").map((x) => min(sansPoint(x.activite)));
    if (souh.length) l.push("Autres activités que " + a.sujetMin + " aimerait réussir : " + joindre(souh) + ".");
    const obj = items.filter((x) => x.objectif === "oui").map((x) => min(sansPoint(x.activite)));
    if (obj.length) l.push("Objectifs choisis par " + a.sujetMin + " : " + joindre(obj) + ".");
    if (t.notes.trim()) l.push(point(maj(t.notes.trim())));
    return l.join("\n");
  }

  function redigerDcdq(q, ageMois) {
    if (q.fait !== "oui") return "";
    const c = calculDcdq(q, ageMois);
    const l = ["Questionnaire sur le développement de la coordination, version en français pour l'Europe (DCDQ-FE), rempli par " + (q.repondant.trim() || "les parents") + ". Les parents comparent la coordination de leur enfant à celle des enfants du même âge (15 questions cotées de 1 à 5 ; un score plus bas signale plus de difficultés)."];
    if (!c.n) { l.push("[Réponses à saisir.]"); return l.join("\n"); }
    c.facteurs.forEach((f) => l.push("– " + maj(f.nom) + " : " + f.total + "/" + f.max + (f.complet ? "" : " (incomplet)") + " ;"));
    if (!c.complet) {
      l.push("– Score total : non calculable (" + c.n + " réponses sur 15).");
      l.push("[Réponses manquantes : question" + (c.manquantes.length > 1 ? "s " : " ") + joindre(c.manquantes.map(String)) + ". Une donnée manquante empêche de conclure : faire compléter par les parents, ou par une personne qui a vu l'enfant faire l'activité.]");
    } else {
      l.push("– Score total : " + c.total + "/75.");
      const b = c.bande;
      if (c.indication === true) l.push("Avec un score égal ou inférieur au seuil de " + b.seuil + ", le résultat donne une indication d'un risque de trouble développemental de la coordination (TDC).");
      else if (c.indication === false) l.push("Avec un score supérieur au seuil de " + b.seuil + ", il n'y a probablement pas de trouble développemental de la coordination (TDC).");
      else if (c.hors) l.push("[Le DCDQ-FE s'interprète de " + AGE_DCDQ.libelle + " : à cet âge, le score total n'est pas interprétable avec le seuil de " + SEUIL_DCDQ + ".]");
      else l.push("[Âge à renseigner (" + AGE_DCDQ.libelle + ") pour interpréter le score.]");
      if (b) l.push("Pour les enfants de " + b.libelle + ", ce seuil a une sensibilité de " + fmt(b.sensibilite, 2) + " et une spécificité de " + fmt(b.specificite, 2) + ".");
      if (c.indication !== null) l.push("Le DCDQ-FE est un outil de repérage : il ne permet pas, seul, de poser le diagnostic, qui s'appuie sur un test moteur standardisé et d'autres observations. Les scores par catégorie ne disent pas à eux seuls s'il y a un TDC ; comparés entre eux et aux autres évaluations, ils aident à situer les forces et les difficultés motrices.");
    }
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
      const items = itemsOthope(o.othope);
      const diff = items.filter((x) => x.niveau === "pas-bien" || x.niveau === "non").map((x) => min(sansPoint(x.activite)));
      if (diff.length) c.occupations.push("activités que " + a.sujetMin + " dit ne pas bien réussir (OT'Hope) : " + joindre(diff));
      items.filter((x) => x.objectif === "oui").forEach((x) => c.objectifs.push(maj(sansPoint(x.activite)) + " (objectif choisi par " + a.sujetMin + ")"));
    }
    if (o.dcdq.fait === "oui") {
      const q = calculDcdq(o.dcdq, ageMois);
      if (q.indication === true) {
        c.personne.push("une indication d'un risque de trouble développemental de la coordination au DCDQ-FE (" + q.total + "/75, seuil " + q.bande.seuil + ")");
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
    return Object.keys(o.avq).length > 0 || (o.avqParents && o.avqParents.fait === "oui") || ["mcro", "othope", "dcdq"].some((k) => o[k].fait === "oui") || Object.keys(JEUX).some((j) => o.cartes[j].fait === "oui");
  }

  return {
    NIVEAUX_AVQ, DOMAINES_AVQ, ITEMS_AVQ, AIDE_AVQ,
    FREQ_AVQP, DOMAINES_AVQP, LIBELLES_AVQP, MAX_AVQP, SENS_AVQP, sensAvqp, libellesAvqp, nbQuestionsAvqp, avqParentsVide, normaliserAvqParents, depuisChampsAvqParents,
    specAvqParents, classeAvqp, analyseAvqParents, redigerAvqParents, NB_MCRO, SEUIL_MCRO, NIVEAUX_OTHOPE, NB_OTHOPE, MAX_OTHOPE, NB_DCDQ, ITEMS_DCDQ, FACTEURS_DCDQ, SEUIL_DCDQ, SEUILS_DCDQ, AGE_DCDQ, REF_DCDQ,
    JEUX, MAX_CARTES_PERSO, FAMILLES_OTHOPE, SOUS_FAMILLES_OTHOPE, CARTES_OTHOPE, PILES_OTHOPE, RETIREE_OTHOPE, JEU_OTHOPE,
    MAX_OBJECTIFS_OTHOPE, CONSEIL_OTHOPE, cartesOthope, sousFamilleOthope, itemsOthope, pilesDe, cartesDuJeu, normaliserCartesPerso, problemeVide,
    vide, normaliser, calculMcro, calculDcdq, libelleDcdq, phraseAvq, occupationsAvq, redigerMcro, redigerOthope, redigerDcdq, redigerCartes, constats, commence,
  };
});
