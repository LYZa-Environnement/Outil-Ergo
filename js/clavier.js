/*
 * Outil Ergo : frappe au clavier, d'après le protocole EViC (Lefèvere et Galbiati, 2007, GEPPE).
 * Épreuves au clavier (copie 5 min, répétition d'un mot 3 min, dictée 5 min) et à la main (copie du BHK 5 min,
 * répétition 5 min), en mots par minute ; observation de la frappe. Les données de référence de l'EViC sont
 * indicatives (petits effectifs) : l'outil compare surtout l'enfant à lui-même (« équivalence personnelle »).
 * Les textes des épreuves (ceux du BHK) ne sont pas reproduits : l'enfant copie depuis la feuille.
 * Passation guidée : l'enfant passe les épreuves seul sur l'appareil (consignes en grand, chronomètre, arrêt
 * automatique) ; l'outil relève sans IA, dans l'appareil, les mots minute par minute, les pauses, les corrections,
 * l'usage des majuscules, des accents et de la ponctuation. L'ergothérapeute ajoute ensuite son observation.
 * Aucune dépendance : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Clavier = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function nombre(v) { const t = texte(v).replace(",", ".").trim(); if (t === "") return null; const n = Number(t); return Number.isFinite(n) ? n : null; }
  function oui(v) { return v === "oui" ? "oui" : ""; }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }
  function fmt(n, d) { return n === null || n === undefined ? "" : (Math.round(n * Math.pow(10, d === undefined ? 1 : d)) / Math.pow(10, d === undefined ? 1 : d)).toString().replace(".", ","); }

  const SOURCE = {
    court: "EViC, Lefèvere et Galbiati, 2007",
    texte: "Lefèvere G., Galbiati C., EViC : évaluation de la vitesse de frappe au clavier, protocole et feuille de passation, GEPPE, 2007.",
    lien: "http://www.geppe.free.fr/IMG/pdf/2007_02_-_LEFEVERE_GWENAELLE_-_EViC_consignes_et_feuille_passation.pdf",
  };

  const EPREUVES = [
    { id: "copie", nom: "Copie", duree: 300, manuscrit: "copie", consigne: "L'enfant recopie le texte au clavier pendant 5 minutes." },
    { id: "repetition", nom: "Répétition d'un mot", duree: 180, manuscrit: "repetition", consigne: "L'enfant tape le même mot, suivi d'un espace, le plus de fois possible pendant 3 minutes." },
    { id: "dictee", nom: "Dictée", duree: 300, manuscrit: null, consigne: "Vous dictez le texte par petits groupes de mots ; l'enfant le tape pendant 5 minutes." },
  ];
  const MANUSCRIT = [
    { id: "copie", nom: "Copie à la main", duree: 300 },
    { id: "repetition", nom: "Répétition du mot à la main", duree: 300 },
  ];
  // Textes écrits pour l'outil (libres de droits), utilisables à la place du texte du BHK : copie, dictée, mot à répéter.
  const TEXTES = {
    mot: "maison",
    copie: { titre: "La cabane du jardin", texte: "Au fond du jardin de Mamie, il y a une vieille cabane en bois. Le toit est vert et la porte grince quand on l'ouvre. Mon frère et moi, nous y allons chaque mercredi après l'école. À l'intérieur, on trouve des pots de fleurs, une brouette, des outils et une grosse caisse pleine de jouets. Il y a aussi une petite fenêtre ronde. Par cette fenêtre, on voit le potager, les poules et le grand cerisier. Quand il pleut, nous restons dans la cabane et nous écoutons les gouttes tomber sur le toit. Nous lisons des bandes dessinées, nous jouons aux cartes ou nous inventons des histoires de pirates. Un jour, nous avons découvert un nid caché sous une planche. Dedans, trois minuscules oiseaux dormaient. Nous n'avons rien touché. Mamie nous a dit que leur maman allait revenir. La semaine suivante, les trois oisillons ouvraient grand le bec pour réclamer à manger. Depuis, nous parlons tout bas dans la cabane pour ne pas leur faire peur." },
    dictee: { titre: "Le marché du samedi", groupes: ["Le samedi matin,", "je vais au marché", "avec mon papa.", "Nous prenons un grand panier", "et nous partons à pied.", "Sur la place,", "il y a beaucoup de monde.", "Les marchands crient", "pour vendre leurs fruits", "et leurs légumes.", "Papa achète des pommes,", "des carottes", "et une salade bien verte.", "Moi, je choisis", "un gros melon", "qui sent bon.", "Ensuite, nous passons", "devant le stand du fromager.", "Il nous fait goûter", "un petit morceau de fromage.", "Il est très fort", "et je fais une grimace.", "Le marchand se met à rire.", "Avant de rentrer,", "nous nous arrêtons", "chez le boulanger.", "Papa prend une baguette", "et deux croissants.", "Sur le chemin du retour,", "je mange le bout", "de la baguette.", "Il est encore chaud !", "À la maison,", "maman nous attend", "pour préparer le repas."] },
  };
  const SOURCES_TEXTE = [["outil", "Textes de l'outil (prêts à imprimer)"], ["bhk", "Texte du BHK (votre exemplaire, protocole d'origine)"]];

  // Passation guidée : ordre des épreuves (les épreuves à la main, sur papier, sont chronométrées par l'outil).
  const ORDRE = ["main-copie", "main-repetition", "copie", "repetition", "dictee"];
  const ENFANT = {
    "main-copie": { emoji: "📝", titre: "Recopier le texte à la main", duree: 300, papier: true, depart: "Touche « C'est parti ! » et commence à écrire." },
    "main-repetition": { emoji: "✍️", titre: "Écrire un mot à la main", duree: 300, papier: true, depart: "Touche « C'est parti ! » et commence à écrire." },
    copie: { emoji: "📄", titre: "Recopier le texte au clavier", duree: 300, depart: "Le temps démarre quand tu tapes la première lettre." },
    repetition: { emoji: "🔁", titre: "Taper un mot plein de fois", duree: 180, depart: "Le temps démarre quand tu tapes la première lettre." },
    dictee: { emoji: "🗣️", titre: "Écrire sous la dictée", duree: 300, depart: "Le temps démarre quand tu tapes la première lettre." },
  };
  const ENCOURAGER = "Pendant l'épreuve, ne corrigez pas l'enfant ; encouragez seulement (« continue »).";
  const RESSENTIS = [["facile", "😀", "Facile", "faciles"], ["moyen", "😐", "Moyen", "ni faciles ni difficiles"], ["difficile", "😣", "Difficile", "difficiles"]];
  const PREFERENCES = [["main", "✍️", "À la main", "préférer écrire à la main"], ["clavier", "⌨️", "Au clavier", "préférer écrire au clavier"], ["egal", "🤝", "Les deux pareil", "aimer autant écrire à la main qu'au clavier"]];
  const SEUIL_PAUSE = 3; // secondes sans taper

  // Observation de l'ergothérapeute : [id, phrase du compte rendu (« {e} » pour l'accord), libellé court].
  const OBSERVATIONS = [
    { id: "mains", titre: "Mains", valeurs: [["deux", "utilise les deux mains", "Les deux mains"], ["une", "n'utilise qu'une main", "Une seule main"]] },
    { id: "recherche", titre: "Recherche des touches", valeurs: [["rapide", "trouve les touches rapidement", "Trouve vite"], ["cherche", "cherche souvent les touches", "Cherche souvent"], ["longtemps", "cherche longtemps chaque touche", "Cherche longtemps"]] },
    { id: "posture", titre: "Posture", valeurs: [["adaptee", "garde une posture adaptée", "Adaptée"], ["penche", "se penche vers le clavier ou l'écran", "Se penche"], ["bouge", "change souvent de position", "Bouge beaucoup"]] },
    { id: "fatigue", titre: "Fatigue", valeurs: [["aucune", "ne montre pas de fatigue", "Aucune"], ["fin", "se fatigue en fin d'épreuve", "En fin d'épreuve"], ["rapide", "se fatigue rapidement", "Rapidement"]] },
    { id: "modele", titre: "En copie, prise d'information sur le modèle", valeurs: [["mots", "en copie, lit le modèle par mots ou groupes de mots", "Par mots"], ["syllabes", "en copie, lit le modèle par syllabes", "Par syllabes"], ["lettres", "en copie, revient au modèle lettre par lettre", "Lettre par lettre"], ["perd", "en copie, perd souvent sa place dans le texte", "Perd sa place"]] },
    { id: "dictee", titre: "En dictée", valeurs: [["suit", "en dictée, suit le rythme", "Suit le rythme"], ["repeter", "en dictée, demande souvent de répéter", "Fait répéter"], ["perd", "en dictée, perd le fil", "Perd le fil"]] },
  ];
  const ATTITUDES = [["concentre", "reste concentré{e}", "Concentré·e"], ["precipite", "se précipite", "Se précipite"], ["decourage", "se décourage", "Se décourage"], ["aide", "demande de l'aide", "Demande de l'aide"], ["satisfait", "se montre satisfait{e} de son travail", "Satisfait·e"]];

  const MATERIELS = [["portable", "Ordinateur portable"], ["externe", "Ordinateur avec clavier externe"], ["tablette-clavier", "Tablette avec clavier"], ["tablette", "Tablette, clavier à l'écran"]];
  const DOIGTES = [["un", "un seul doigt"], ["index", "les deux index"], ["plusieurs", "plusieurs doigts, sans méthode"], ["dix", "les dix doigts"]];
  const REGARDS = [["clavier", "regarde surtout le clavier"], ["alterne", "alterne entre le clavier et l'écran"], ["ecran", "regarde l'écran"]];
  const FONCTIONS = [["majuscule", "les majuscules", "Majuscules"], ["accents", "les accents", "Accents"], ["ponctuation", "la ponctuation", "Ponctuation"], ["effacer", "l'effacement pour corriger", "Effacer, corriger"],
    ["deplacer", "le déplacement dans le texte", "Se déplacer dans le texte"], ["correcteur", "le correcteur d'orthographe", "Correcteur d'orthographe"], ["dicteeVocale", "la dictée vocale", "Dictée vocale"]];

  function vide() {
    return { fait: "", materiel: "", doigte: "", regard: "", fonctions: {}, experience: "", notes: "", essais: {}, manuscrit: { copie: "", repetition: "" },
      mot: "", texte: "outil", ecran: "", passation: "", obs: {}, attitude: {}, enfant: { ressenti: "", prefere: "" } };
  }
  function motEffectif(c) { return texte(c && c.mot).trim() || TEXTES.mot; }
  function texteDictee() { return TEXTES.dictee.groupes.join(" "); }

  function compterMots(t) { return texte(t).split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length; }

  // Épreuves de la passation guidée, dans l'ordre du protocole.
  function etapesPassation(choix) { return ORDRE.filter((id) => choix && choix.indexOf(id) >= 0); }
  // Consigne lue à l'enfant ; o : { mot, texte: "outil" | "bhk", ecran: "oui" }.
  function consigneEnfant(id, o) {
    const r = o && typeof o === "object" ? o : { mot: o };
    const m = texte(r.mot).trim();
    const mot = m ? "« " + m + " »" : "que ton ergothérapeute t'a donné";
    const outil = r.texte !== "bhk", ecran = outil && r.ecran === "oui";
    const nom = "« " + TEXTES.copie.titre + " »";
    const fin = " Si tu arrives au bout, recommence au début.";
    if (id === "main-copie") return (ecran ? "Recopie sur ta feuille le texte de l'écran, " : outil ? "Sur ta feuille, recopie le texte " + nom + ", " : "Sur ta feuille, recopie le texte qu'on te donne, ") + "avec ton crayon habituel. Écris comme d'habitude." + fin;
    if (id === "main-repetition") return "Sur ta feuille, avec ton crayon habituel, écris le mot " + mot + " encore et encore, le plus de fois possible.";
    if (id === "copie") return (ecran ? "Recopie avec le clavier le texte qui est en haut de l'écran." : outil ? "Recopie avec le clavier le texte " + nom + " de ta feuille." : "Recopie avec le clavier le texte de ta feuille.") + " Si tu te trompes, tu peux corriger ou continuer." + fin;
    if (id === "repetition") return "Tape le mot " + mot + " puis un espace, encore et encore, le plus de fois possible.";
    if (id === "dictee") return "Ton ergothérapeute va te lire une histoire, un petit morceau à la fois. Tape ce que tu entends, puis attends le morceau suivant. Ne t'inquiète pas pour l'orthographe.";
    return "";
  }
  // Ce que fait l'adulte pour chaque épreuve (écran de consigne et feuille de passation).
  function consigneAdulte(id, o) {
    const r = o || {};
    const outil = r.texte !== "bhk", ecran = outil && r.ecran === "oui";
    const mot = "« " + (texte(r.mot).trim() || TEXTES.mot) + " »";
    if (id === "main-copie") return (ecran ? "Le texte à recopier s'affiche à l'écran ; donnez une feuille lignée." : outil ? "Donnez la page « " + TEXTES.copie.titre + " » de la feuille de passation (texte à recopier) et une feuille lignée." : "Donnez votre exemplaire du texte du BHK et une feuille lignée (si la copie du BHK est déjà faite, vous pouvez passer cette épreuve).") + " Ensuite, comptez les mots écrits.";
    if (id === "main-repetition") return "Donnez une feuille lignée. L'enfant écrit " + mot + " encore et encore. Ensuite, comptez les mots écrits.";
    if (id === "copie") return ecran ? "Le texte s'affiche au-dessus de la zone de frappe." : outil ? "Posez la page « " + TEXTES.copie.titre + " » à côté de l'écran, bien lisible." : "Posez votre exemplaire du texte du BHK à côté de l'écran, bien lisible.";
    if (id === "repetition") return "Le mot " + mot + " s'affiche au-dessus de la zone de frappe.";
    if (id === "dictee") return (outil ? "Lisez la dictée « " + TEXTES.dictee.titre + " » de la feuille de passation" : "Dictez le texte du BHK sur votre exemplaire") + " : un groupe de mots à la fois, à voix claire. Attendez que l'enfant ait fini de le taper avant de lire le suivant ; répétez une fois s'il le demande. Ne dictez pas la ponctuation. Au bout du texte, reprenez au début.";
    return "";
  }

  // Nombre de mots tapés identiques au modèle, dans l'ordre (le texte peut être recommencé) : majuscules et ponctuation ignorées.
  function motsNormalises(t) {
    return texte(t).replace(/[’`]/g, "'").split(/\s+/).map((w) => w.toLowerCase().replace(/^[^0-9a-zà-ÿœæ]+|[^0-9a-zà-ÿœæ]+$/g, "")).filter(Boolean);
  }
  function copieExacte(tape, modele) {
    const a = motsNormalises(tape), m = motsNormalises(modele);
    if (!a.length || !m.length) return 0;
    const ref = [];
    while (ref.length < a.length + 20 && ref.length < 3000) Array.prototype.push.apply(ref, m);
    let avant = new Array(ref.length + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      const ligne = new Array(ref.length + 1).fill(0);
      for (let j = 1; j <= ref.length; j++) ligne[j] = a[i - 1] === ref[j - 1] ? avant[j - 1] + 1 : Math.max(avant[j], ligne[j - 1]);
      avant = ligne;
    }
    return avant[ref.length];
  }

  // Usage des majuscules, des accents et de la ponctuation dans le texte tapé.
  function usage(t) {
    const s = texte(t);
    return { majuscules: (s.match(/[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/g) || []).length, accents: (s.match(/[àâäçéèêëîïôöùûüÿÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/g) || []).length,
      ponctuation: (s.match(/[.,;:!?'’"«»()-]/g) || []).length };
  }
  // Nombre de fois où le mot à répéter est tapé sans erreur (majuscules et ponctuation ignorées).
  function repetitionsCorrectes(t, mot) {
    const m = texte(mot).trim().toLowerCase();
    if (!m) return null;
    return texte(t).split(/\s+/).map((w) => w.toLowerCase().replace(/^[.,;:!?'’"«»()-]+|[.,;:!?'’"«»()-]+$/g, "")).filter((w) => w === m).length;
  }
  // Mots par minute, minute par minute, d'après le nombre de mots relevé à chaque minute pleine.
  function parMinute(instantanes) {
    const l = Array.isArray(instantanes) ? instantanes.map(Number).filter((n) => Number.isFinite(n) && n >= 0) : [];
    return l.map((n, i) => Math.max(0, n - (i ? l[i - 1] : 0)));
  }
  // Baisse nette de la vitesse sur la dernière minute (au moins 3 minutes pleines).
  function baisseEnFin(pm) {
    if (!Array.isArray(pm) || pm.length < 3) return false;
    const avant = Math.max.apply(null, pm.slice(0, -1));
    return avant >= 3 && pm[pm.length - 1] <= 0.7 * avant;
  }

  // Résultat d'une épreuve faite dans l'outil (chronomètre et zone de frappe), avec les relevés de la passation.
  function essaiChronometre(texteTape, dureeSec, corrections, date, releves) {
    const t = texte(texteTape);
    const r = releves || {};
    const u = usage(t);
    const e = { mots: String(compterMots(t)), duree: Math.max(1, Math.round(dureeSec)), caracteres: t.length, corrections: Math.max(0, Math.round(corrections || 0)), texte: t.slice(0, 6000), date: texte(date), outil: "oui",
      parMinute: parMinute(r.instantanes), pauses: Math.max(0, Math.round(r.pauses || 0)), pauseMax: Math.max(0, Math.round(r.pauseMax || 0)), interruptions: Math.max(0, Math.round(r.interruptions || 0)),
      majuscules: u.majuscules, accents: u.accents, ponctuation: u.ponctuation };
    const ok = repetitionsCorrectes(t, r.mot);
    if (ok !== null) { e.motsCorrects = ok; e.mot = texte(r.mot).trim().slice(0, 40); }
    if (texte(r.modele).trim()) e.motsExacts = copieExacte(t, r.modele);
    return e;
  }

  function normaliser(src) {
    const c = vide();
    if (!src || typeof src !== "object") return c;
    c.fait = oui(src.fait);
    if (MATERIELS.some((m) => m[0] === src.materiel)) c.materiel = src.materiel;
    if (DOIGTES.some((m) => m[0] === src.doigte)) c.doigte = src.doigte;
    if (REGARDS.some((m) => m[0] === src.regard)) c.regard = src.regard;
    if (src.fonctions && typeof src.fonctions === "object") FONCTIONS.forEach((f) => { if (["oui", "non"].indexOf(src.fonctions[f[0]]) >= 0) c.fonctions[f[0]] = src.fonctions[f[0]]; });
    c.experience = texte(src.experience).slice(0, 1000);
    c.notes = texte(src.notes).slice(0, 4000);
    c.mot = texte(src.mot).trim().slice(0, 40);
    c.texte = src.texte === "bhk" ? "bhk" : "outil";
    c.ecran = oui(src.ecran);
    c.passation = /^\d{4}-\d{2}-\d{2}$/.test(texte(src.passation)) ? src.passation : "";
    if (src.obs && typeof src.obs === "object") OBSERVATIONS.forEach((o) => { if (o.valeurs.some((v) => v[0] === src.obs[o.id])) c.obs[o.id] = src.obs[o.id]; });
    if (src.attitude && typeof src.attitude === "object") ATTITUDES.forEach((a) => { if (src.attitude[a[0]] === "oui") c.attitude[a[0]] = "oui"; });
    if (src.enfant && typeof src.enfant === "object") {
      if (RESSENTIS.some((x) => x[0] === src.enfant.ressenti)) c.enfant.ressenti = src.enfant.ressenti;
      if (PREFERENCES.some((x) => x[0] === src.enfant.prefere)) c.enfant.prefere = src.enfant.prefere;
    }
    if (src.essais && typeof src.essais === "object") EPREUVES.forEach((e) => {
      const s = src.essais[e.id];
      if (!s || typeof s !== "object") return;
      const mots = nombre(s.mots);
      if (mots === null || mots < 0) return;
      const duree = nombre(s.duree);
      const entier = (v) => { const n = nombre(v); return n !== null && n >= 0 ? Math.round(n) : null; };
      c.essais[e.id] = {
        mots: String(Math.round(mots)), duree: duree !== null && duree > 0 ? Math.round(duree) : e.duree,
        caracteres: nombre(s.caracteres), corrections: nombre(s.corrections), texte: texte(s.texte).slice(0, 6000), date: texte(s.date).slice(0, 10), outil: oui(s.outil),
        parMinute: Array.isArray(s.parMinute) ? s.parMinute.slice(0, 10).map(entier).filter((n) => n !== null) : [],
        pauses: entier(s.pauses), pauseMax: entier(s.pauseMax), interruptions: entier(s.interruptions),
        majuscules: entier(s.majuscules), accents: entier(s.accents), ponctuation: entier(s.ponctuation),
        motsCorrects: entier(s.motsCorrects), mot: texte(s.mot).slice(0, 40), motsExacts: entier(s.motsExacts),
      };
    });
    if (src.manuscrit && typeof src.manuscrit === "object") MANUSCRIT.forEach((m) => { const n = nombre(src.manuscrit[m.id]); c.manuscrit[m.id] = n !== null && n >= 0 ? String(Math.round(n)) : ""; });
    return c;
  }

  // Mots par minute de chaque épreuve, et comparaison avec la vitesse à la main (équivalence personnelle).
  function resultats(brut) {
    const c = normaliser(brut);
    const l = EPREUVES.map((e) => {
      const s = c.essais[e.id];
      const mpm = s ? Number(s.mots) / (s.duree / 60) : null;
      const m = e.manuscrit ? MANUSCRIT.find((x) => x.id === e.manuscrit) : null;
      const manu = m && c.manuscrit[m.id] !== "" ? Number(c.manuscrit[m.id]) / (m.duree / 60) : null;
      const ratio = mpm !== null && manu ? mpm / manu : null;
      return { id: e.id, nom: e.nom, mpm: mpm, mots: s ? Number(s.mots) : null, duree: s ? s.duree : e.duree, dureePrevue: e.duree, corrections: s ? s.corrections : null, caracteres: s ? s.caracteres : null, outil: !!(s && s.outil), manuscrit: manu, ratio: ratio,
        parMinute: s ? s.parMinute : [], pauses: s ? s.pauses : null, pauseMax: s ? s.pauseMax : null, interruptions: s ? s.interruptions : null,
        majuscules: s ? s.majuscules : null, accents: s ? s.accents : null, ponctuation: s ? s.ponctuation : null, motsCorrects: s ? s.motsCorrects : null, motsExacts: s ? s.motsExacts : null, baisse: !!(s && baisseEnFin(s.parMinute)) };
    });
    return { epreuves: l, faites: l.filter((x) => x.mpm !== null) };
  }

  function observation(brut, e) {
    const c = normaliser(brut);
    const accord = (t) => t.replace(/\{e\}/g, e === undefined ? "(e)" : e);
    const l = [];
    const doigte = DOIGTES.find((x) => x[0] === c.doigte), regard = REGARDS.find((x) => x[0] === c.regard);
    if (doigte) l.push("tape avec " + doigte[1]);
    const mains = OBSERVATIONS[0].valeurs.find((v) => v[0] === c.obs.mains);
    if (mains) l.push(mains[1]);
    if (regard) l.push(regard[1]);
    OBSERVATIONS.slice(1).forEach((o) => { const v = o.valeurs.find((x) => x[0] === c.obs[o.id]); if (v) l.push(accord(v[1])); });
    const att = ATTITUDES.filter((a) => c.attitude[a[0]] === "oui").map((a) => accord(a[1]));
    if (att.length) l.push(joindre(att));
    const connues = FONCTIONS.filter((f) => c.fonctions[f[0]] === "oui").map((f) => f[1]);
    const aApprendre = FONCTIONS.filter((f) => c.fonctions[f[0]] === "non").map((f) => f[1]);
    if (connues.length) l.push("connaît " + joindre(connues));
    if (aApprendre.length) l.push("ne connaît pas encore " + joindre(aApprendre));
    return l;
  }

  // Texte du compte rendu.
  function rediger(brut, a) {
    const c = normaliser(brut);
    const r = resultats(c);
    const avecOutil = c.texte === "outil" && r.faites.some((x) => x.outil && x.id !== "repetition");
    const l = ["EViC, évaluation de la vitesse de frappe au clavier" + (avecOutil ? " (copie et dictée sur les textes de l'outil, à la place du texte du BHK)" : "") + " :"];
    r.epreuves.forEach((x) => {
      if (x.mpm === null) return;
      let t = x.nom + " : " + fmt(x.mpm) + (x.mpm < 2 ? " mot" : " mots") + " par minute au clavier";
      if (x.manuscrit !== null) t += ", contre " + fmt(x.manuscrit) + " à la main, soit " + Math.round(x.ratio * 100) + " % de sa vitesse manuscrite";
      const det = detailsEpreuve(x);
      l.push("– " + t + (det.length ? " ; " + det.join(" ; ") : "") + ".");
    });
    if (!r.faites.length) l.push("[Résultats à saisir : nombre de mots tapés pour chaque épreuve.]");
    const mat = MATERIELS.find((x) => x[0] === c.materiel);
    const obs = observation(c, a ? a.e : undefined);
    if (obs.length) l.push((a ? a.sujet : "L'enfant") + " " + obs.join(" ; ") + ".");
    if (mat) l.push("Matériel utilisé : " + mat[1].charAt(0).toLowerCase() + mat[1].slice(1) + ".");
    if (texte(c.experience).trim()) l.push("Apprentissage du clavier : " + texte(c.experience).trim().replace(/\.$/, "") + ".");
    const comparees = r.faites.filter((x) => x.ratio !== null);
    if (comparees.length) {
      const atteinte = comparees.filter((x) => x.ratio >= 1).map((x) => x.nom.toLowerCase());
      l.push(atteinte.length
        ? "La vitesse au clavier atteint ou dépasse la vitesse à la main en " + joindre(atteinte) + "."
        : "La vitesse au clavier reste inférieure à la vitesse à la main : le clavier ne peut pas encore remplacer l'écriture manuscrite sans un apprentissage.");
    }
    const enfant = paroleEnfant(c);
    if (enfant.length) l.push("À la fin des épreuves, " + (a ? a.sujetMin || a.sujet : "l'enfant") + " dit " + joindre(enfant) + ".");
    if (texte(c.notes).trim()) l.push(texte(c.notes).trim().charAt(0).toUpperCase() + texte(c.notes).trim().slice(1).replace(/([^.!?])$/, "$1."));
    return l.join("\n");
  }

  // Détails relevés par l'outil pendant une épreuve (pour le compte rendu et l'écran de résultats).
  function detailsEpreuve(x) {
    const d = [];
    if (x.outil && x.dureePrevue && x.duree < x.dureePrevue - 1) d.push("épreuve arrêtée au bout de " + Math.floor(x.duree / 60) + " min " + String(x.duree % 60).padStart(2, "0") + " s");
    if (x.motsExacts !== null && x.motsExacts !== undefined && x.mots) d.push(x.motsExacts + " mot" + (x.motsExacts > 1 ? "s" : "") + " sur " + x.mots + " recopié" + (x.motsExacts > 1 ? "s" : "") + " sans erreur");
    if (x.motsCorrects !== null && x.motsCorrects !== undefined && x.mots) d.push("mot tapé correctement " + x.motsCorrects + " fois sur " + x.mots);
    if (x.parMinute && x.parMinute.length >= 2) d.push("minute par minute : " + x.parMinute.join(", ") + " mots" + (x.baisse ? ", vitesse en baisse en fin d'épreuve" : ""));
    if (x.corrections !== null && x.corrections !== undefined && x.outil) d.push(x.corrections ? x.corrections + " correction" + (x.corrections > 1 ? "s" : "") : "aucune correction");
    if (x.pauses) d.push(x.pauses + " arrêt" + (x.pauses > 1 ? "s" : "") + " de plus de " + SEUIL_PAUSE + " secondes (le plus long : " + x.pauseMax + " s)");
    return d;
  }
  function paroleEnfant(brut) {
    const c = normaliser(brut);
    const l = [];
    const r = RESSENTIS.find((x) => x[0] === c.enfant.ressenti), p = PREFERENCES.find((x) => x[0] === c.enfant.prefere);
    if (r) l.push("avoir trouvé les épreuves " + r[3]);
    if (p) l.push(p[3]);
    return l;
  }
  // Fonctions du clavier vues pendant la passation (à confirmer par l'ergothérapeute).
  function fonctionsVues(brut) {
    const c = normaliser(brut);
    const t = { majuscule: 0, accents: 0, ponctuation: 0, effacer: 0 };
    let motsTexte = 0;
    ["copie", "dictee"].forEach((id) => {
      const s = c.essais[id];
      if (!s || !s.outil) return;
      t.majuscule += s.majuscules || 0; t.accents += s.accents || 0; t.ponctuation += s.ponctuation || 0; t.effacer += s.corrections || 0;
      motsTexte += Number(s.mots) || 0;
    });
    if (c.essais.repetition && c.essais.repetition.outil) t.effacer += c.essais.repetition.corrections || 0;
    return { vues: Object.keys(t).filter((k) => t[k] > 0), comptes: t, motsTexte: motsTexte };
  }

  // Raison retenue pour les préconisations : clavier encore lent, ou clavier au moins aussi rapide que la main.
  function indicateur(brut) {
    const c = normaliser(brut);
    if (c.fait !== "oui") return null;
    const r = resultats(c);
    const copie = r.epreuves.find((x) => x.id === "copie");
    const ref = copie && copie.ratio !== null ? copie : r.faites.find((x) => x.ratio !== null);
    if (!ref) return null;
    const detail = "EViC, " + ref.nom.toLowerCase() + " : " + fmt(ref.mpm) + (ref.mpm < 2 ? " mot" : " mots") + " par minute au clavier contre " + fmt(ref.manuscrit) + " à la main";
    return ref.ratio >= 1
      ? { cle: "clavierEfficace", raison: "une frappe au clavier au moins aussi rapide que l'écriture à la main (" + detail + ")" }
      : { cle: "clavier", raison: "une frappe au clavier plus lente que l'écriture à la main (" + detail + ")", constat: "une frappe au clavier encore plus lente que l'écriture à la main (" + detail + ")" };
  }

  // Mesures gardées pour la réévaluation (l'EViC prévoit de refaire les épreuves à un an et à deux ans).
  function mesures(brut) {
    const c = normaliser(brut);
    if (c.fait !== "oui") return [];
    return resultats(c).faites.map((x) => ({ cle: "evic-" + x.id, bilan: "EViC", epreuve: x.nom + " au clavier", valeur: fmt(x.mpm) + " mots/min", echelle: "mpm", ds: null, perf: null, num: Math.round(x.mpm * 10) / 10, sens: 1, seuil: null }));
  }

  // Repères de l'auteure (présentation de 2007), pour le plan de suivi.
  const REPERES = "Repères de l'auteure de l'EViC (données descriptives, petits effectifs) : en un an d'apprentissage supervisé (15 à 40 heures), la plupart des enfants doublent leur vitesse au clavier, environ un sur trois atteint sa propre vitesse à la main, mais aucun n'atteint la vitesse manuscrite moyenne de sa classe. Le clavier se justifie surtout quand l'écriture est peu lisible ; pour un enfant seulement lent, la vitesse progresse peu. La frappe à dix doigts n'est conseillée que si la motricité le permet.";

  const SOURCE_REPERES = {
    texte: "Lefèvere G., Mise en place d'un protocole d'évaluation : EViC, présentation aux journées européennes et francophones, Paris, juin 2007.",
    lien: "http://www.geppe.free.fr/IMG/pdf/2007_06_-_LEFEVERE_GWENAELLE_-_presentation_powerpoint_EVIC_journees_europeennes_et_francophnones_Paris.pdf",
  };

  return { SOURCE, SOURCE_REPERES, EPREUVES, MANUSCRIT, MATERIELS, DOIGTES, REGARDS, FONCTIONS, REPERES, ORDRE, ENFANT, RESSENTIS, PREFERENCES, OBSERVATIONS, ATTITUDES, SEUIL_PAUSE,
    TEXTES, SOURCES_TEXTE, ENCOURAGER, motEffectif, texteDictee, consigneAdulte, motsNormalises, copieExacte,
    vide, normaliser, compterMots, etapesPassation, consigneEnfant, usage, repetitionsCorrectes, parMinute, baisseEnFin, essaiChronometre, resultats, observation, detailsEpreuve, paroleEnfant, fonctionsVues, rediger, indicateur, mesures, fmt };
});
