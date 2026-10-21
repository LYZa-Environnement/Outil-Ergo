/*
 * Outil Ergo : frappe au clavier, d'après le protocole EViC (Lefèvere et Galbiati, 2007, GEPPE).
 * Épreuves au clavier (copie 5 min, répétition d'un mot 3 min, dictée 5 min) et à la main (copie du BHK 5 min,
 * répétition 5 min), en mots par minute ; observation de la frappe. Les données de référence de l'EViC sont
 * indicatives (petits effectifs) : l'outil compare surtout l'enfant à lui-même (« équivalence personnelle »).
 * Les textes des épreuves (ceux du BHK) ne sont pas reproduits : l'enfant copie depuis la feuille.
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
  const MATERIELS = [["portable", "Ordinateur portable"], ["externe", "Ordinateur avec clavier externe"], ["tablette-clavier", "Tablette avec clavier"], ["tablette", "Tablette, clavier à l'écran"]];
  const DOIGTES = [["un", "un seul doigt"], ["index", "les deux index"], ["plusieurs", "plusieurs doigts, sans méthode"], ["dix", "les dix doigts"]];
  const REGARDS = [["clavier", "regarde surtout le clavier"], ["alterne", "alterne entre le clavier et l'écran"], ["ecran", "regarde l'écran"]];
  const FONCTIONS = [["majuscule", "les majuscules", "Majuscules"], ["accents", "les accents", "Accents"], ["ponctuation", "la ponctuation", "Ponctuation"], ["effacer", "l'effacement et la correction", "Effacer, corriger"],
    ["deplacer", "le déplacement dans le texte", "Se déplacer dans le texte"], ["correcteur", "le correcteur d'orthographe", "Correcteur d'orthographe"], ["dicteeVocale", "la dictée vocale", "Dictée vocale"]];

  function vide() {
    return { fait: "", materiel: "", doigte: "", regard: "", fonctions: {}, experience: "", notes: "", essais: {}, manuscrit: { copie: "", repetition: "" } };
  }

  function compterMots(t) { return texte(t).split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length; }

  // Résultat d'une épreuve faite dans l'outil (chronomètre et zone de frappe).
  function essaiChronometre(texteTape, dureeSec, corrections, date) {
    const t = texte(texteTape);
    return { mots: String(compterMots(t)), duree: Math.max(1, Math.round(dureeSec)), caracteres: t.length, corrections: Math.max(0, Math.round(corrections || 0)), texte: t.slice(0, 6000), date: texte(date), outil: "oui" };
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
    if (src.essais && typeof src.essais === "object") EPREUVES.forEach((e) => {
      const s = src.essais[e.id];
      if (!s || typeof s !== "object") return;
      const mots = nombre(s.mots);
      if (mots === null || mots < 0) return;
      const duree = nombre(s.duree);
      c.essais[e.id] = {
        mots: String(Math.round(mots)), duree: duree !== null && duree > 0 ? Math.round(duree) : e.duree,
        caracteres: nombre(s.caracteres), corrections: nombre(s.corrections), texte: texte(s.texte).slice(0, 6000), date: texte(s.date).slice(0, 10), outil: oui(s.outil),
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
      return { id: e.id, nom: e.nom, mpm: mpm, mots: s ? Number(s.mots) : null, duree: s ? s.duree : e.duree, corrections: s ? s.corrections : null, caracteres: s ? s.caracteres : null, outil: !!(s && s.outil), manuscrit: manu, ratio: ratio };
    });
    return { epreuves: l, faites: l.filter((x) => x.mpm !== null) };
  }

  function observation(brut) {
    const c = normaliser(brut);
    const l = [];
    const doigte = DOIGTES.find((x) => x[0] === c.doigte), regard = REGARDS.find((x) => x[0] === c.regard);
    if (doigte) l.push("tape avec " + doigte[1]);
    if (regard) l.push(regard[1]);
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
      l.push("– " + t + ".");
    });
    if (!r.faites.length) l.push("[Résultats à saisir : nombre de mots tapés pour chaque épreuve.]");
    const mat = MATERIELS.find((x) => x[0] === c.materiel);
    const obs = observation(c);
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
    if (texte(c.notes).trim()) l.push(texte(c.notes).trim().charAt(0).toUpperCase() + texte(c.notes).trim().slice(1).replace(/([^.!?])$/, "$1."));
    return l.join("\n");
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

  return { SOURCE, SOURCE_REPERES, EPREUVES, MANUSCRIT, MATERIELS, DOIGTES, REGARDS, FONCTIONS, REPERES, vide, normaliser, compterMots, essaiChronometre, resultats, observation, rediger, indicateur, mesures, fmt };
});
