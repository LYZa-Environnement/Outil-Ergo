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
    { id: "copie", nom: "Copie", duree: 300, manuscrit: "copie", consigne: "L'enfant recopie au clavier le texte du BHK, posé sur papier à côté de l'écran, pendant 5 minutes." },
    { id: "repetition", nom: "Répétition d'un mot", duree: 180, manuscrit: "repetition", consigne: "L'enfant tape le même mot, suivi d'un espace, le plus de fois possible pendant 3 minutes." },
    { id: "dictee", nom: "Dictée", duree: 300, manuscrit: null, consigne: "Vous dictez le texte du BHK ; l'enfant le tape pendant 5 minutes." },
  ];
  const MANUSCRIT = [
    { id: "copie", nom: "Copie à la main (BHK)", duree: 300 },
    { id: "repetition", nom: "Répétition du mot à la main", duree: 300 },
  ];
  // Passation guidée : ordre des épreuves (la répétition à la main, sur papier, est chronométrée par l'outil).
  const ORDRE = ["main-repetition", "copie", "repetition", "dictee"];
  const ENFANT = {
    "main-repetition": { emoji: "✍️", titre: "Écrire un mot à la main", duree: 300, papier: true,
      texte: "Sur ta feuille, avec ton crayon habituel, écris le mot {mot} le plus de fois possible.",
      depart: "Touche « C'est parti ! » et commence à écrire.",
      adulte: "Feuille et crayon habituel. Comptez ensuite les mots écrits en 5 minutes." },
    copie: { emoji: "📄", titre: "Recopier le texte", duree: 300,
      texte: "Recopie le texte de ta feuille avec le clavier. Si tu te trompes, tu peux corriger ou continuer.",
      depart: "Le temps démarre quand tu tapes la première lettre.",
      adulte: "Le texte du BHK, sur papier, à côté de l'écran." },
    repetition: { emoji: "🔁", titre: "Taper un mot plein de fois", duree: 180,
      texte: "Tape le mot {mot} puis un espace, encore et encore, le plus de fois possible.",
      depart: "Le temps démarre quand tu tapes la première lettre.",
      adulte: "Le mot s'affiche au-dessus de la zone de frappe." },
    dictee: { emoji: "🗣️", titre: "Écrire sous la dictée", duree: 300,
      texte: "Ton ergothérapeute va te lire un texte. Tape ce que tu entends. Ne t'inquiète pas pour l'orthographe.",
      depart: "Le temps démarre quand tu tapes la première lettre.",
      adulte: "Dictez le texte du BHK à votre rythme habituel ; l'enfant ne voit pas le texte." },
  };
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
      mot: "", passation: "", obs: {}, attitude: {}, enfant: { ressenti: "", prefere: "" } };
  }

  function compterMots(t) { return texte(t).split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length; }

  // Épreuves de la passation guidée, dans l'ordre du protocole.
  function etapesPassation(choix) { return ORDRE.filter((id) => choix && choix.indexOf(id) >= 0); }
  function consigneEnfant(id, mot) {
    const e = ENFANT[id];
    if (!e) return "";
    const m = texte(mot).trim();
    return e.texte.replace("{mot}", m ? "« " + m + " »" : "que ton ergothérapeute t'a donné");
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
        motsCorrects: entier(s.motsCorrects), mot: texte(s.mot).slice(0, 40),
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
        majuscules: s ? s.majuscules : null, accents: s ? s.accents : null, ponctuation: s ? s.ponctuation : null, motsCorrects: s ? s.motsCorrects : null, baisse: !!(s && baisseEnFin(s.parMinute)) };
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
    const l = ["EViC, évaluation de la vitesse de frappe au clavier :"];
    r.epreuves.forEach((x) => {
      if (x.mpm === null) return;
      let t = x.nom + " : " + fmt(x.mpm) + " mots par minute au clavier";
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
    const detail = "EViC, " + ref.nom.toLowerCase() + " : " + fmt(ref.mpm) + " mots par minute au clavier contre " + fmt(ref.manuscrit) + " à la main";
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
    vide, normaliser, compterMots, etapesPassation, consigneEnfant, usage, repetitionsCorrectes, parMinute, baisseEnFin, essaiChronometre, resultats, observation, detailsEpreuve, paroleEnfant, fonctionsVues, rediger, indicateur, mesures, fmt };
});
