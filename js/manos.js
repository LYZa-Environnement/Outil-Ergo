/*
 * Outil Ergo : Man.O.S (test de manipulation des outils scolaires), cotation épreuve par épreuve.
 * Le contenu du test (épreuves, critères de cotation, consignes, normes) est protégé : il n'est jamais
 * dans ce code. Il arrive par le fichier du cabinet (clé « manos ») et reste sur l'appareil.
 * Ce module ne fait que le calcul (notes brutes, déviations standard), la rédaction et les données du graphique.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Manos = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CLASSES = ["CE1", "CE2", "CM1", "CM2", "6e"];
  const ORDRE = ["CP", "CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e"];
  const PARTIES = { m: "manipulation", r: "résultat" };

  function nombre(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function texte(v, max) { const t = typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); return max ? t.slice(0, max) : t; }
  function min(s) { return s && /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function fr(v, d) { return (d === undefined ? String(Math.round(v * 100) / 100) : v.toFixed(d)).replace(".", ","); }
  function formaterDS(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + fr(Math.abs(v), 2); }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }
  function sansPoint(t) { return texte(t).trim().replace(/[.;\s]+$/, ""); }
  const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

  /* ---------- Grille du cabinet ---------- */

  function norme(v) {
    if (!Array.isArray(v) || v.length < 2) return null;
    const m = nombre(v[0]), e = nombre(v[1]);
    return m !== null && e !== null && e > 0 ? [m, e] : null;
  }
  function criteres(l) {
    if (!Array.isArray(l)) return [];
    return l.slice(0, 16).map((c) => {
      if (!c || typeof c !== "object" || !Array.isArray(c.o)) return null;
      const o = c.o.slice(0, 6).map((x) => (Array.isArray(x) && Number.isInteger(nombre(x[0])) && nombre(x[0]) >= 0 && nombre(x[0]) <= 9 ? [nombre(x[0]), texte(x[1], 160)] : null)).filter(Boolean);
      if (!o.length) return null;
      const out = { nom: texte(c.nom, 160), o: o };
      if (texte(c.partie).trim()) out.partie = texte(c.partie, 100);
      return out;
    }).filter(Boolean);
  }
  // Grille et normes (fichier du cabinet) : null si absente ou illisible.
  function normaliserGrille(g) {
    if (!g || typeof g !== "object" || !g.classes || typeof g.classes !== "object") return null;
    const classes = {};
    CLASSES.forEach((k) => {
      const c = g.classes[k];
      if (!c || !Array.isArray(c.epreuves)) return;
      const vus = {};
      const epreuves = c.epreuves.slice(0, 14).map((e) => {
        if (!e || typeof e !== "object" || !ID.test(texte(e.id)) || vus[e.id]) return null;
        const nm = norme(e.nm), nr = norme(e.nr), m = criteres(e.m), r = criteres(e.r);
        if (!nm || !nr || !m.length || !r.length) return null;
        vus[e.id] = true;
        const out = { id: e.id, nom: texte(e.nom, 80) || e.id, le: texte(e.le, 80), installation: texte(e.installation, 700), consigne: texte(e.consigne, 700), note: texte(e.note, 400), m: m, r: r, nm: nm, nr: nr };
        const nt = norme(e.nt);
        if (nt) out.nt = nt;
        return out;
      }).filter(Boolean);
      if (!epreuves.length) return;
      const t = c.total || {};
      const total = { nm: norme(t.nm), nr: norme(t.nr), nt: norme(t.nt) };
      classes[k] = { intro: texte(c.intro, 700), epreuves: epreuves, total: total };
    });
    if (!Object.keys(classes).length) return null;
    return { version: texte(g.version, 20), source: texte(g.source, 300), classes: classes };
  }
  function maxCriteres(l) { return l.reduce((t, c) => t + Math.max.apply(null, c.o.map((x) => x[0])), 0); }

  /* ---------- Données du dossier ---------- */

  function vide() { return { classe: "", cotes: {} }; }
  function normaliser(x) {
    const out = vide();
    if (!x || typeof x !== "object") return out;
    if (CLASSES.indexOf(x.classe) >= 0) out.classe = x.classe;
    const c = x.cotes && typeof x.cotes === "object" ? x.cotes : {};
    CLASSES.forEach((k) => {
      if (!c[k] || typeof c[k] !== "object") return;
      const o = {};
      Object.keys(c[k]).filter((id) => ID.test(id)).slice(0, 14).forEach((id) => {
        const e = c[k][id];
        if (!e || typeof e !== "object") return;
        const p = (src) => {
          const r = {};
          if (src && typeof src === "object") Object.keys(src).filter((i) => /^\d{1,2}$/.test(i)).forEach((i) => { const v = nombre(src[i]); if (v !== null && Number.isInteger(v) && v >= 0 && v <= 9) r[i] = v; });
          return r;
        };
        o[id] = { m: p(e.m), r: p(e.r), nbM: texte(e.nbM, 10), nbR: texte(e.nbR, 10), temps: texte(e.temps, 10), obs: texte(e.obs, 600) };
      });
      if (Object.keys(o).length) out.cotes[k] = o;
    });
    return out;
  }
  function coteVide() { return { m: {}, r: {}, nbM: "", nbR: "", temps: "", obs: "" }; }

  // Classe de référence proposée : celle de l'enfant ; avant janvier, la classe inférieure (étalonnage de janvier à mars) ;
  // au-delà de la 6e, les épreuves de 6e.
  function classeProposee(classe, date) {
    let i = ORDRE.indexOf(classe);
    if (i < 0) return { classe: "", raison: "" };
    if (i >= 6) return { classe: "6e", raison: "les épreuves de 6e valent pour les classes supérieures" };
    const m = /^\d{4}-(\d{2})/.exec(texte(date));
    const mois = m ? Number(m[1]) : null;
    if (mois !== null && mois >= 9 && i >= 1) {
      if (i === 1) return { classe: "CE1", raison: "bilan avant janvier : pas d'épreuves en dessous du CE1, comparaison à titre indicatif" };
      return { classe: ORDRE[i - 1], raison: "bilan avant janvier : épreuves de la classe inférieure (étalonnage réalisé de janvier à mars)" };
    }
    if (i === 0) return { classe: "CE1", raison: "pas d'épreuves avant le CE1 : comparaison à titre indicatif" };
    return { classe: ORDRE[i], raison: "" };
  }
  function classeEffective(x, classeEnfant, date) {
    const m = normaliser(x);
    return m.classe || classeProposee(classeEnfant, date).classe;
  }

  /* ---------- Calcul ---------- */

  function partie(ep, cote, k) {
    const crit = ep[k], rep = cote[k] || {}, max = maxCriteres(crit);
    const repondus = crit.map((c, i) => rep[i]).filter((v) => v !== undefined).length;
    if (repondus) {
      const somme = crit.reduce((t, c, i) => t + (rep[i] !== undefined ? rep[i] : 0), 0);
      return { nb: repondus === crit.length ? somme : null, somme: somme, max: max, repondus: repondus, total: crit.length, source: "grille" };
    }
    const v = nombre(k === "m" ? cote.nbM : cote.nbR);
    const ok = v !== null && v >= 0 && v <= max;
    return { nb: ok ? v : null, somme: null, max: max, repondus: 0, total: crit.length, source: v !== null ? "saisie" : "", horsBorne: v !== null && !ok };
  }
  function ds(v, n, inverse) {
    if (v === null || v === undefined || !n) return null;
    return inverse ? (n[0] - v) / n[1] : (v - n[0]) / n[1];
  }

  // niveauFn : classe une DS (« patho », « inferieur », « moyenne », « superieur ») selon les seuils de l'outil.
  function calcul(x, grille, niveauFn, classe) {
    const g = grille && grille.classes ? grille : null;
    const m = normaliser(x);
    const cl = classe || m.classe;
    const def = g && g.classes[cl];
    if (!def) return null;
    const niv = (v) => (v === null || !niveauFn ? null : niveauFn(v));
    const cotes = m.cotes[cl] || {};
    const epreuves = def.epreuves.map((ep) => {
      const c = cotes[ep.id] || coteVide();
      const pm = partie(ep, c, "m"), pr = partie(ep, c, "r");
      const tv = ep.nt ? nombre(c.temps) : null;
      const t = tv !== null && tv >= 0 ? tv : null;
      pm.ds = ds(pm.nb, ep.nm); pm.niveau = niv(pm.ds); pm.norme = ep.nm;
      pr.ds = ds(pr.nb, ep.nr); pr.niveau = niv(pr.ds); pr.norme = ep.nr;
      const temps = ep.nt ? { v: t, ds: ds(t, ep.nt, true), norme: ep.nt } : null;
      if (temps) temps.niveau = niv(temps.ds);
      // Comportements observés : critères cotés au plus bas (0 point).
      const zeros = { m: [], r: [] };
      ["m", "r"].forEach((k) => ep[k].forEach((cr, i) => {
        const v = c[k][i];
        if (v !== 0) return;
        const o = cr.o.find((y) => y[0] === 0);
        zeros[k].push({ critere: cr.nom, choix: o ? o[1] : "", partie: cr.partie || "" });
      }));
      const fait = pm.nb !== null || pr.nb !== null || t !== null || pm.repondus > 0 || pr.repondus > 0;
      return { id: ep.id, nom: ep.nom, le: ep.le || "", m: pm, r: pr, t: temps, zeros: zeros, obs: c.obs.trim(), fait: fait };
    });
    const tot = (k, cle) => {
      const l = epreuves.map((e) => e[k]);
      const max = l.reduce((s, p) => s + p.max, 0);
      const faites = l.filter((p) => p.nb !== null).length;
      const nb = faites === l.length ? l.reduce((s, p) => s + p.nb, 0) : null;
      const d = ds(nb, def.total[cle]);
      return { nb: nb, max: max, faites: faites, sur: l.length, ds: d, niveau: niv(d), norme: def.total[cle] };
    };
    const tTemps = (() => {
      if (!def.total.nt || !epreuves.every((e) => e.t)) return null;
      const faites = epreuves.filter((e) => e.t.v !== null).length;
      const v = faites === epreuves.length ? epreuves.reduce((s, e) => s + e.t.v, 0) : null;
      const d = ds(v, def.total.nt, true);
      return { v: v, faites: faites, sur: epreuves.length, ds: d, niveau: niv(d), norme: def.total.nt };
    })();
    return {
      classe: cl, intro: def.intro, chronometre: epreuves.some((e) => e.t), epreuves: epreuves,
      total: { m: tot("m", "nm"), r: tot("r", "nr"), t: tTemps },
      faites: epreuves.filter((e) => e.fait).length, source: g.source,
    };
  }

  function faible(n) { return n === "patho" || n === "inferieur"; }
  function secondes(v) { return fr(v, v % 1 ? 1 : 0) + " s"; }

  // Lignes pour le tableau récapitulatif et le profil : les totaux si toutes les épreuves sont cotées,
  // sinon chaque épreuve cotée (le détail par outil est dans le paragraphe et le graphique du Man.O.S).
  function lignesTest(c) {
    if (!c) return [];
    const l = [];
    const T = c.total;
    const complet = T.m.ds !== null || T.r.ds !== null || (T.t && T.t.ds !== null);
    if (T.m.ds !== null) l.push({ epreuve: "Manipulation (total)", valeurTexte: fr(T.m.nb) + " sur " + T.m.max, ds: T.m.ds, niveau: T.m.niveau });
    if (T.r.ds !== null) l.push({ epreuve: "Résultat (total)", valeurTexte: fr(T.r.nb) + " sur " + T.r.max, ds: T.r.ds, niveau: T.r.niveau });
    if (T.t && T.t.ds !== null) l.push({ epreuve: "Temps total", valeurTexte: secondes(T.t.v), ds: T.t.ds, niveau: T.t.niveau });
    c.epreuves.forEach((e) => {
      const garde = (p) => p && p.ds !== null && !complet;
      if (garde(e.m)) l.push({ epreuve: e.nom + " : manipulation", valeurTexte: fr(e.m.nb) + " sur " + e.m.max, ds: e.m.ds, niveau: e.m.niveau });
      if (garde(e.r)) l.push({ epreuve: e.nom + " : résultat", valeurTexte: fr(e.r.nb) + " sur " + e.r.max, ds: e.r.ds, niveau: e.r.niveau });
      if (e.t && garde(e.t)) l.push({ epreuve: e.nom + " : temps", valeurTexte: secondes(e.t.v), ds: e.t.ds, niveau: e.t.niveau });
    });
    return l;
  }

  /* ---------- Rédaction ---------- */

  // appreciations : libellés des niveaux (« Dans la moyenne »…). a : accords (sujetMin…).
  function rediger(c, a, opts) {
    if (!c) return "";
    const o = opts || {};
    const app = (n) => (n && o.appreciations ? ", " + min(o.appreciations[n]) : "");
    const l = ["Man.O.S, test de manipulation des outils scolaires (épreuves de " + c.classe + (o.raison ? ", " + o.raison : "") + ") :"];
    const T = c.total;
    if (T.m.nb !== null) l.push("– Manipulation, toutes épreuves : " + fr(T.m.nb) + " sur " + T.m.max + (T.m.ds !== null ? " (DS " + formaterDS(T.m.ds) + app(T.m.niveau) + ")" : "") + ".");
    if (T.r.nb !== null) l.push("– Résultat, toutes épreuves : " + fr(T.r.nb) + " sur " + T.r.max + (T.r.ds !== null ? " (DS " + formaterDS(T.r.ds) + app(T.r.niveau) + ")" : "") + ".");
    if (T.t && T.t.v !== null) l.push("– Temps total : " + secondes(T.t.v) + (T.t.ds !== null ? " (DS " + formaterDS(T.t.ds) + app(T.t.niveau) + ")" : "") + ".");
    if (T.m.nb === null && T.r.nb === null && c.faites) l.push("– Passation partielle : " + c.faites + " épreuve" + (c.faites > 1 ? "s" : "") + " sur " + c.epreuves.length + " ; chaque épreuve est comparée séparément à la norme.");
    const morceau = (p, nom) => (p.nb === null ? "" : nom + " " + fr(p.nb) + "/" + p.max + (p.ds !== null ? " (DS " + formaterDS(p.ds) + ")" : ""));
    const detail = c.epreuves.filter((e) => e.fait).map((e) => {
      const parts = [morceau(e.m, "manipulation"), morceau(e.r, "résultat")].filter(Boolean);
      if (e.t && e.t.v !== null) parts.push(secondes(e.t.v) + (e.t.ds !== null ? " (DS " + formaterDS(e.t.ds) + ")" : ""));
      let t = "– " + e.nom + " : " + (parts.length ? parts.join(", ") : "cotation à compléter");
      const z = e.zeros.m.concat(e.zeros.r);
      if (z.length) t += ". Observé : " + z.map((y) => min(y.critere) + " : " + min(sansPoint(y.choix))).join(" ; ");
      if (e.obs) t += ". " + maj(sansPoint(e.obs));
      return t + ".";
    });
    if (detail.length) l.push("Par outil :", ...detail);

    // Lecture : manipulation, résultat et temps mis en regard (la performance tient au résultat, la manipulation dit comment il est obtenu).
    const groupes = { compense: [], imprecis: [], double: [], lent: [], reussi: [] };
    c.epreuves.filter((e) => e.fait).forEach((e) => {
      const fm = faible(e.m.niveau), fR = faible(e.r.niveau), fT = !!(e.t && faible(e.t.niveau));
      const nom = e.le || min(e.nom);
      if (fm && fR) groupes.double.push(nom);
      else if (fm && e.r.niveau) groupes.compense.push(nom);
      else if (fR && e.m.niveau) groupes.imprecis.push(nom);
      if (fT && e.r.niveau && !fR) groupes.lent.push(nom);
      if (e.m.niveau && e.r.niveau && !fm && !fR && !fT) groupes.reussi.push(nom);
    });
    const lecture = [];
    if (groupes.double.length) lecture.push("Pour " + joindre(groupes.double) + ", la manipulation comme le résultat sont en difficulté : l'usage de l'outil n'est pas encore fonctionnel.");
    if (groupes.compense.length) lecture.push("Pour " + joindre(groupes.compense) + ", le résultat est correct mais obtenu avec une manipulation peu efficace ; travailler la manipulation peut rendre le geste plus fluide et plus économique.");
    if (groupes.imprecis.length) lecture.push("Pour " + joindre(groupes.imprecis) + ", la manipulation est correcte mais le rendu manque de précision : anticipation, planification du geste ou précipitation sont à explorer.");
    if (groupes.lent.length) lecture.push("Pour " + joindre(groupes.lent) + ", la réalisation est correcte mais lente, ce qui peut peser en classe (fatigue, travail non terminé).");
    if (!lecture.length && groupes.reussi.length) lecture.push(maj(a && a.sujetMin ? a.sujetMin : "l'enfant") + " utilise ses outils scolaires comme les enfants de " + c.classe + " de l'étalonnage" + (groupes.reussi.length < c.faites ? " pour les épreuves cotées" : "") + ".");
    else if (groupes.reussi.length) lecture.push("Utilisation dans la moyenne pour " + joindre(groupes.reussi) + ".");
    if (lecture.length) l.push("Lecture : " + lecture.join(" "));
    if (o.notes) l.push(maj(sansPoint(o.notes)) + ".");
    return l.join("\n");
  }

  /* ---------- Graphique ---------- */

  // Outils en difficulté (manipulation ou résultat sous la moyenne), avec leur article : « le compas ».
  function outilsEnDifficulte(c) {
    return c ? c.epreuves.filter((e) => faible(e.m.niveau) || faible(e.r.niveau)).map((e) => e.le || min(e.nom)) : [];
  }

  function donneesGraphique(c, seuils) {
    if (!c || !c.faites) return null;
    const p = (x) => (x && x.ds !== null ? { ds: x.ds, niveau: x.niveau } : null);
    const lignes = c.epreuves.filter((e) => e.fait).map((e) => ({ nom: e.nom, m: p(e.m), r: p(e.r), t: p(e.t) }))
      .filter((x) => x.m || x.r || x.t);
    if (!lignes.length) return null;
    const T = c.total;
    const total = T.m.ds !== null || T.r.ds !== null || (T.t && T.t.ds !== null) ? { nom: "Toutes épreuves", m: p(T.m), r: p(T.r), t: p(T.t) } : null;
    return { titre: "Man.O.S : écart à la moyenne, outil par outil", reference: "les enfants de " + c.classe, seuils: seuils, temps: c.chronometre, lignes: lignes, total: total };
  }

  return {
    CLASSES, PARTIES, normaliserGrille, maxCriteres, vide, normaliser, coteVide, classeProposee, classeEffective,
    calcul, lignesTest, rediger, donneesGraphique, outilsEnDifficulte, faible,
  };
});
