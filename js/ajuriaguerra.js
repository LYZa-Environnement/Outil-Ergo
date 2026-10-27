/*
 * Outil Ergo : épreuves de copie d'Ajuriaguerra (1 minute), écriture à vitesse habituelle puis en accélération.
 * Étalonnage des vitesses d'écriture (lettres écrites en 1 minute), par classe ou par âge, garçons et filles.
 * L'étalonnage ne donne que des moyennes, sans écart-type : on compare au pourcentage de la norme,
 * et l'appréciation est choisie par l'ergothérapeute.
 * Aucune dépendance au navigateur : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Ajuri = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function nombre(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function texte(v, max) { const t = typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); return max ? t.slice(0, max) : t; }
  function fr(v) { return String(Math.round(v * 10) / 10).replace(".", ","); }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function min(s) { return s && /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function point(t) { t = texte(t).trim(); return !t ? "" : /[.!?…]$/.test(t) ? t : t + "."; }
  function pl(n, mot) { return fr(n) + " " + mot + (Math.abs(n) >= 2 ? "s" : ""); }

  /* ---------- Phrases à recopier ---------- */
  // CP et CE1 (6 à 8 ans) : 20 lettres. CE2 et après (8 à 14 ans) : l'une ou l'autre des deux phrases de 30 lettres.
  const PHRASES = {
    cheval: { texte: "Le petit cheval gambade", lettres: 20 },
    poulain: { texte: "Le petit poulain gambade dans le pré", lettres: 30 },
    parfum: { texte: "Je respire le doux parfum des fleurs", lettres: 30 },
  };
  const CLASSES = ["CP", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e"];
  function phrasesPour(classe) { return classe === "CP" || classe === "CE1" ? ["cheval"] : ["poulain", "parfum"]; }

  /* ---------- Étalonnage (lettres en 1 minute) : [garçons, filles] ---------- */
  // En 3e, une seule valeur, pour les garçons et les filles.
  const NORMES = {
    habituelle: {
      classe: { CP: [14, 12], CE1: [32, 32], CE2: [51, 45], CM1: [52, 60], CM2: [75, 83], "6e": [88, 95], "5e": [100, 117], "4e": [117, 121], "3e": [130, 130] },
      // Tranches d'âge de l'étalonnage : [de, jusqu'à (exclu), garçons, filles, libellé].
      // La tranche « 6,5-7 ans » est prolongée jusqu'à 7,5 ans pour ne pas laisser de trou avant « 7,5-8,5 ans ».
      age: [[6, 6.5, 14, 12, "6 à 6,5 ans"], [6.5, 7.5, 21, 28, "6,5 à 7 ans"], [7.5, 8.5, 44, 40, "7,5 à 8,5 ans"], [8.5, 9.5, 52, 55, "8,5 à 9,5 ans"],
        [9.5, 10.5, 59, 61, "9,5 à 10,5 ans"], [10.5, 11.5, 79, 81, "10,5 à 11,5 ans"]],
    },
    maximale: {
      classe: { CE1: [44, 47], CE2: [68, 71], CM1: [89, 99], CM2: [107, 116], "6e": [128, 139], "5e": [147, 155], "4e": [157, 165], "3e": [172, 172] },
      age: [[7.5, 8.5, 62, 58, "7,5 à 8,5 ans"], [8.5, 9.5, 80, 89, "8,5 à 9,5 ans"], [9.5, 10.5, 93, 104, "9,5 à 10,5 ans"], [10.5, 11.5, 112, 117, "10,5 à 11,5 ans"]],
    },
  };
  const SOURCE = "Étalonnage des vitesses d'écriture d'Ajuriaguerra (lettres écrites en 1 minute)";
  const EPREUVES = [
    { id: "hab", norme: "habituelle", nom: "Vitesse habituelle", court: "à son allure habituelle" },
    { id: "max", norme: "maximale", nom: "Vitesse maximale (accélération)", court: "en accélérant au maximum" },
  ];
  const APPRECIATIONS = ["patho", "inferieur", "moyenne", "superieur"];

  function vide() {
    return { reference: "", phrase: "", habPhrases: "", habLettres: "", maxPhrases: "", maxLettres: "", appHab: "", appMax: "", obsHab: "", obsMax: "" };
  }

  function normaliser(src) {
    const a = vide();
    if (!src || typeof src !== "object") return a;
    if (src.reference === "classe" || src.reference === "age") a.reference = src.reference;
    if (PHRASES[src.phrase]) a.phrase = src.phrase;
    ["habPhrases", "habLettres", "maxPhrases", "maxLettres"].forEach((k) => { a[k] = texte(src[k], 10); });
    ["appHab", "appMax"].forEach((k) => { if (APPRECIATIONS.indexOf(src[k]) >= 0) a[k] = src[k]; });
    ["obsHab", "obsMax"].forEach((k) => { a[k] = texte(src[k], 2000); });
    return a;
  }

  // Lettres écrites en 1 minute : phrases entières × lettres de la phrase + lettres de la phrase commencée.
  function lettres(phrases, enPlus, parPhrase) {
    const p = nombre(phrases), l = nombre(enPlus);
    if (p === null && l === null) return null;
    if ((p !== null && p < 0) || (l !== null && l < 0)) return null;
    return (p || 0) * parPhrase + (l || 0);
  }

  // Phrase utilisée : celle choisie si elle convient à la classe, sinon la première prévue pour la classe.
  function phraseUtilisee(a, classe) {
    const possibles = phrasesPour(classe);
    return possibles.indexOf(a.phrase) >= 0 ? a.phrase : a.phrase && !classe ? a.phrase : possibles[0];
  }

  // Référence : la classe si elle est dans l'étalonnage (choix par défaut), sinon l'âge.
  function reference(a, ctx) {
    const classeOk = CLASSES.indexOf(ctx.classe) >= 0;
    const type = a.reference || (classeOk ? "classe" : "age");
    if (type === "classe") return classeOk ? { type: "classe", cle: ctx.classe, label: "classe de " + ctx.classe } : { type: "classe", cle: null, label: "" };
    if (ctx.ageAns === null || ctx.ageAns === undefined) return { type: "age", cle: null, label: "" };
    return { type: "age", cle: ctx.ageAns, label: "" };
  }

  function normeDe(ind, ref, sexe) {
    let v = null, label = ref.label;
    if (ref.cle === null) return null;
    if (ref.type === "classe") v = NORMES[ind].classe[ref.cle] || null;
    else {
      const t = NORMES[ind].age.find((x) => ref.cle >= x[0] && ref.cle < x[1]);
      if (t) { v = [t[2], t[3]]; label = t[4]; }
    }
    if (!v) return null;
    const moy = sexe === "M" ? v[0] : sexe === "F" ? v[1] : (v[0] + v[1]) / 2;
    return { moy: moy, label: label, memeValeur: v[0] === v[1] };
  }

  // ctx : { classe, ageAns (âge en années, décimal), sexe ("F", "M" ou "") }
  function calcul(src, ctx) {
    const a = normaliser(src);
    ctx = ctx || {};
    const ph = phraseUtilisee(a, ctx.classe);
    const ref = reference(a, ctx);
    const sexe = ctx.sexe === "F" || ctx.sexe === "M" ? ctx.sexe : "";
    const epreuves = EPREUVES.map((e) => {
      const n = lettres(a[e.id + "Phrases"], a[e.id + "Lettres"], PHRASES[ph].lettres);
      const nm = normeDe(e.norme, ref, sexe);
      const pct = n !== null && nm ? Math.round((n / nm.moy) * 100) : null;
      return { id: e.id, nom: e.nom, court: e.court, lettres: n, norme: nm, pct: pct, ecart: n !== null && nm ? n - nm.moy : null,
        niveau: a["app" + maj(e.id)] || null, obs: a["obs" + maj(e.id)].trim() };
    });
    const h = epreuves[0], m = epreuves[1];
    const gain = h.lettres !== null && m.lettres !== null ? { v: m.lettres - h.lettres, pct: h.lettres > 0 ? Math.round(((m.lettres - h.lettres) / h.lettres) * 100) : null,
      attendu: h.norme && m.norme ? m.norme.moy - h.norme.moy : null } : null;
    const sexeTexte = sexe === "F" ? "filles" : sexe === "M" ? "garçons" : "moyenne des garçons et des filles";
    let alerte = "";
    if (!ref.cle) alerte = ref.type === "classe" ? "Choisissez la classe dans le dossier (ou comparez à l'âge)." : "Renseignez les dates de naissance et du bilan (ou comparez à la classe).";
    else if (!h.norme && !m.norme) alerte = ref.type === "age" ? "Âge hors de l'étalonnage (6 à 11,5 ans) : comparez plutôt à la classe." : "Pas de norme pour cette classe.";
    else if (!m.norme) alerte = "Pas de norme de vitesse maximale " + (ref.type === "classe" ? "en " + ref.cle : "avant 7,5 ans") + " : l'accélération est décrite sans comparaison.";
    return {
      phrase: ph, phraseTexte: PHRASES[ph].texte, lettresPhrase: PHRASES[ph].lettres, ref: ref,
      refTexte: (h.norme || m.norme || {}).label || ref.label, sexe: sexe, sexeTexte: sexeTexte,
      epreuves: epreuves, gain: gain, faites: epreuves.filter((e) => e.lettres !== null).length, alerte: alerte,
    };
  }

  // Résumé court d'une épreuve : « 57 lettres/min, 95 % de la norme (60) ».
  function resume(e) {
    if (e.lettres === null) return "";
    return fr(e.lettres) + " lettres/min" + (e.norme ? ", " + e.pct + " % de la norme (" + fr(e.norme.moy) + ")" : "");
  }

  // Lignes pour le tableau récapitulatif, le diagnostic et le suivi (pas de DS : l'étalonnage n'a pas d'écart-type).
  function lignesTest(c) {
    if (!c) return [];
    return c.epreuves.filter((e) => e.lettres !== null || e.obs).map((e) => ({
      epreuve: e.nom, valeurTexte: e.lettres === null ? "" : pl(e.lettres, "lettre") + " en 1 minute" + (e.norme ? " (norme " + fr(e.norme.moy) + ", soit " + e.pct + " %)" : ""),
      valeurCourte: resume(e), ds: null, niveau: e.niveau, commentaire: e.obs, remplie: e.lettres !== null, type: "ajuri",
    }));
  }

  // Paragraphe du compte rendu. a : accords (sujetMin…), opts : { appreciations, notes, titre }
  function rediger(c, a, opts) {
    opts = opts || {};
    const app = opts.appreciations || {};
    const l = [(opts.titre || "Ajuriaguerra : écriture en situation d'accélération") + " (copie de la phrase « " + c.phraseTexte + " » pendant 1 minute" +
      (c.refTexte ? " ; étalonnage : " + c.refTexte + ", " + c.sexeTexte : "") + ") :"];
    c.epreuves.forEach((e) => {
      if (e.lettres === null) { if (e.obs) l.push("– " + point(e.nom + " : " + e.obs)); return; }
      let t = e.nom + " : " + pl(e.lettres, "lettre") + " en 1 minute";
      if (e.norme) t += ", pour une moyenne attendue de " + fr(e.norme.moy) + ", soit " + e.pct + " % de la norme";
      if (e.niveau && app[e.niveau]) t += " (" + min(app[e.niveau]) + ")";
      if (e.obs) t += ". " + maj(e.obs);
      l.push("– " + point(t));
    });
    if (c.gain) {
      const g = c.gain;
      let t;
      if (g.v > 0) t = "En accélérant, " + a.sujetMin + " gagne " + pl(g.v, "lettre") + " par minute" + (g.pct !== null ? " (+" + g.pct + " %)" : "");
      else if (g.v === 0) t = "Quand on lui demande d'accélérer, " + a.sujetMin + " ne va pas plus vite";
      else t = "Quand on lui demande d'accélérer, " + a.sujetMin + " écrit moins vite (" + fr(g.v) + " lettres par minute)";
      if (g.attendu !== null) t += ", pour un gain moyen de " + fr(g.attendu) + " lettres d'après l'étalonnage";
      l.push(point(t));
    }
    if (opts.notes) l.push(point(maj(opts.notes)));
    if (l.length === 1) l.push("[Résultats à compléter.]");
    return l.join("\n");
  }

  return { PHRASES, CLASSES, NORMES, SOURCE, EPREUVES, phrasesPour, vide, normaliser, lettres, calcul, resume, lignesTest, rediger };
});
