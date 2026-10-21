/*
 * Outil Ergo : séances de suivi.
 * Modèle d'une séance, planning de toutes les séances (périodes, filtres, regroupement par jour),
 * programmation des séances du plan de suivi. Chaque séance est rangée dans le dossier de l'enfant.
 * Aucune dépendance : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Seances = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STATUTS = [["prevue", "Prévue", "🗓️"], ["faite", "Faite", "✓"], ["annulee", "Annulée ou absent", "✗"]];
  const ETATS = [["bien", "Bien", "😀"], ["moyen", "Moyen", "😐"], ["difficile", "Difficile", "😣"]];
  const PERIODES = [["semaine", "Semaine"], ["mois", "Mois"], ["avenir", "À venir"], ["passees", "Passées"], ["toutes", "Toutes"]];
  const MAX = 200;
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function court(v, n) { return texte(v).slice(0, n || 2000); }
  function dateIso(v) { return /^\d{4}-\d{2}-\d{2}$/.test(texte(v)) ? v : ""; }
  function heureValide(v) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(texte(v)) ? v : ""; }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ================= Dates ================= */

  function versDate(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte(iso)); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; }
  function versIso(d) { return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
  function ajouterJours(iso, n) { const d = versDate(iso); if (!d) return ""; d.setUTCDate(d.getUTCDate() + n); return versIso(d); }
  function lundi(iso) { const d = versDate(iso); return d ? ajouterJours(iso, -((d.getUTCDay() + 6) % 7)) : ""; }
  function jourMois(iso) { const d = versDate(iso); return d ? (d.getUTCDate() === 1 ? "1er" : d.getUTCDate()) + " " + MOIS[d.getUTCMonth()] : ""; }
  function libelleJour(iso) { const d = versDate(iso); return d ? maj(JOURS[d.getUTCDay()]) + " " + jourMois(iso) : "Sans date"; }

  // Période affichée : debut et fin inclus (dates ISO), libellé lisible.
  function periode(type, decalage, aujourdhui) {
    const k = Math.round(+decalage || 0);
    if (type === "semaine") {
      const debut = ajouterJours(lundi(aujourdhui), 7 * k), fin = ajouterJours(debut, 6);
      const memeMois = debut.slice(0, 7) === fin.slice(0, 7);
      const d1 = versDate(debut);
      return { type: type, debut: debut, fin: fin, navigable: true,
        libelle: "Semaine du " + (memeMois ? (d1.getUTCDate() === 1 ? "1er" : d1.getUTCDate()) : jourMois(debut)) + " au " + jourMois(fin) + (fin.slice(0, 4) !== aujourdhui.slice(0, 4) ? " " + fin.slice(0, 4) : "") };
    }
    if (type === "mois") {
      const a = versDate(aujourdhui);
      const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + k, 1));
      const f = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
      return { type: type, debut: versIso(d), fin: versIso(f), navigable: true, libelle: maj(MOIS[d.getUTCMonth()]) + " " + d.getUTCFullYear() };
    }
    if (type === "avenir") return { type: type, debut: aujourdhui, fin: "9999-12-31", libelle: "À partir d'aujourd'hui" };
    if (type === "passees") return { type: type, debut: "0000-01-01", fin: ajouterJours(aujourdhui, -1), libelle: "Avant aujourd'hui" };
    return { type: "toutes", debut: "0000-01-01", fin: "9999-12-31", libelle: "Toutes les séances" };
  }

  // Décalage (en semaines ou en mois) qui affiche une date donnée.
  function decalagePour(type, date, aujourdhui) {
    if (type === "semaine") return Math.round((versDate(lundi(date)) - versDate(lundi(aujourdhui))) / (7 * 86400000));
    if (type === "mois") { const a = versDate(aujourdhui), d = versDate(date); return (d.getUTCFullYear() - a.getUTCFullYear()) * 12 + d.getUTCMonth() - a.getUTCMonth(); }
    return 0;
  }

  /* ================= Séance ================= */

  function nouvelId() { return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function seanceVide(date, o) {
    return Object.assign({ id: nouvelId(), date: dateIso(date), heure: "", statut: "faite", axes: {}, etat: "", fait: "", prochaine: "", aide: "", difficile: "", auteur: "", lieu: "" }, o || {});
  }

  // Une séance sans statut (versions précédentes) est considérée comme faite.
  function normaliserSeance(s, i) {
    const date = dateIso(s.date);
    const axes = {};
    if (s.axes && typeof s.axes === "object") Object.keys(s.axes).slice(0, 20).forEach((k) => { if (/^[a-z]{2,20}$/.test(k) && s.axes[k] === "oui") axes[k] = "oui"; });
    return {
      id: /^[a-z0-9-]{2,40}$/i.test(texte(s.id)) ? s.id : "x" + i + "-" + (date || "sans-date"),
      date: date, heure: heureValide(s.heure), statut: STATUTS.some((x) => x[0] === s.statut) ? s.statut : "faite",
      axes: axes, etat: ETATS.some((e) => e[0] === s.etat) ? s.etat : "",
      fait: court(s.fait), prochaine: court(s.prochaine, 1000), aide: court(s.aide), difficile: court(s.difficile),
      auteur: court(s.auteur, 120), lieu: court(s.lieu, 120),
    };
  }
  function normaliserListe(l) { return Array.isArray(l) ? l.filter((s) => s && typeof s === "object").slice(0, MAX).map(normaliserSeance) : []; }

  function ordre(x, y) { return (x.date || "9999").localeCompare(y.date || "9999") || (x.heure || "99").localeCompare(y.heure || "99"); }

  /* ================= Planning ================= */

  // lignes : [{ dossierId, enfant, s }] ; filtres : { enfant, periode, decalage, statut, auteur, axe }.
  function filtrer(lignes, f, aujourdhui) {
    const p = periode(f.periode, f.decalage, aujourdhui);
    const l = lignes.filter((x) => {
      const s = x.s;
      if (f.enfant && x.dossierId !== f.enfant) return false;
      if (f.statut && s.statut !== f.statut) return false;
      if (f.auteur && s.auteur !== f.auteur) return false;
      if (f.axe && s.axes[f.axe] !== "oui") return false;
      if (!s.date) return p.type === "toutes";
      return s.date >= p.debut && s.date <= p.fin;
    }).sort((a, b) => ordre(a.s, b.s) || a.enfant.localeCompare(b.enfant));
    if (p.type === "passees") l.reverse();
    return { periode: p, lignes: l };
  }

  // Regroupe par jour ; la vue « semaine » montre aussi les jours vides (du lundi au samedi, le dimanche s'il est occupé).
  function grouperParJour(res, aujourdhui) {
    const jours = [];
    const parDate = {};
    res.lignes.forEach((x) => { const k = x.s.date || ""; (parDate[k] = parDate[k] || []).push(x); });
    let dates = Object.keys(parDate);
    if (res.periode.type === "semaine") {
      dates = [];
      for (let i = 0; i < 7; i++) { const d = ajouterJours(res.periode.debut, i); if (i < 6 || parDate[d]) dates.push(d); }
    } else {
      dates.sort((a, b) => (a || "9999").localeCompare(b || "9999"));
      if (res.periode.type === "passees") dates.reverse();
    }
    dates.forEach((d) => jours.push({ date: d, libelle: libelleJour(d), aujourdhui: d === aujourdhui, passe: !!d && d < aujourdhui, lignes: parDate[d] || [] }));
    return jours;
  }

  // Résumé pour un enfant : séances faites, prochaine séance prévue, dernier « pour la prochaine fois ».
  function resumeEnfant(seances, aujourdhui) {
    const l = seances.slice().sort(ordre);
    const faites = l.filter((s) => s.statut === "faite");
    const prochaine = l.find((s) => s.statut === "prevue" && s.date && s.date >= aujourdhui) || null;
    const rappel = faites.filter((s) => s.date && s.date <= aujourdhui && texte(s.prochaine).trim()).pop() || null;
    return { faites: faites.length, prevues: l.filter((s) => s.statut === "prevue" && s.date >= aujourdhui).length,
      annulees: l.filter((s) => s.statut === "annulee").length, prochaine: prochaine, rappel: rappel };
  }

  // Rang d'une séance faite (1 pour la première) : sert à retrouver la séance prévue au plan de suivi.
  function rang(seances, s) {
    const faites = seances.filter((x) => x.statut !== "annulee" && x.date && (x.date < s.date || (x.date === s.date && (x.heure || "") <= (s.heure || "")))).sort(ordre);
    const i = faites.findIndex((x) => x.id === s.id);
    return i >= 0 ? i + 1 : faites.length + 1;
  }

  // Séances prévues à ajouter d'après les dates du plan de suivi (à partir d'aujourd'hui, sans doublon de date).
  function planifier(existantes, dates, o) {
    const prises = new Set(existantes.map((s) => s.date));
    const a = (o && o.aujourdhui) || "";
    return dates.filter((d) => dateIso(d) && d >= a && !prises.has(d))
      .map((d) => seanceVide(d, { statut: "prevue", heure: heureValide(o && o.heure), auteur: court(o && o.auteur, 120), lieu: court(o && o.lieu, 120) }));
  }

  return {
    STATUTS, ETATS, PERIODES, MAX,
    ajouterJours, lundi, libelleJour, jourMois, periode, decalagePour,
    seanceVide, normaliserSeance, normaliserListe, ordre, filtrer, grouperParJour, resumeEnfant, rang, planifier, heureValide,
  };
});
