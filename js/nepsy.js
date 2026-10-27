/*
 * Outil Ergo : NEPSY-II, subtests visuospatiaux Cubes et Copie de figures (5 à 16 ans).
 * Reprend la structure du cahier d'administration : départ selon l'âge, règle de retour, règle d'arrêt,
 * chronométrage et bonus de temps (Cubes) ; critères Général, Motricité A-B, Global C-D, Local E-F et
 * corrections de la note brute (Copie de figures).
 * Le contenu protégé du test (figures, consignes, critères de l'annexe B, tables d'étalonnage) n'est pas
 * dans ce code : les notes étalonnées et le rang percentile se reportent depuis le manuel.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Nepsy = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Cubes ---------- */

  // Items 1 à 19 : nombre de cubes, temps limite, seuil du bonus de temps (2 points si réussi en ce temps ou moins).
  const CUBES = [3, 2, 6, 4, 3, 5, 5, 6, 7, 7, 7, 9, 8, 8, 9, 8, 12, 10, 12].map((nb, i) => {
    const n = i + 1;
    return { n: n, cubes: nb, limite: n <= 7 ? 30 : 60, bonus: n <= 10 ? null : n <= 15 ? 20 : 30, max: n <= 10 ? 1 : 2 };
  });
  const CUBES_MAX = CUBES.reduce((t, i) => t + i.max, 0); // 28
  const CUBES_ARRET = 4; // notes 0 consécutives

  /* ---------- Copie de figures ---------- */

  // Critères notés 0 ou 1 par item, regroupés en notes ; correction retranchée à la note brute (jamais sous 0).
  const CRITERES = [
    { id: "g", code: "G", nom: "Général" },
    { id: "a", code: "A", nom: "Motricité A", note: "motricite" },
    { id: "b", code: "B", nom: "Motricité B", note: "motricite" },
    { id: "c", code: "C", nom: "Global C", note: "global" },
    { id: "d", code: "D", nom: "Global D", note: "global" },
    { id: "e", code: "E", nom: "Local E", note: "local" },
    { id: "f", code: "F", nom: "Local F", note: "local" },
  ];
  // Notes de la Copie de figures : critères sommés, correction, maximum de la note brute (5-6 ans, 7-16 ans).
  const NOTES_CF = [
    { id: "cfg", code: "CFG", nom: "Note totale Général", criteres: ["g"], correction: 3, max: [18, 21] },
    { id: "motricite", code: "CFP Motricité", nom: "Motricité", criteres: ["a", "b"], correction: 3, max: [36, 42] },
    { id: "global", code: "CFP Global", nom: "Global", criteres: ["c", "d"], correction: 2, max: [36, 42] },
    { id: "local", code: "CFP Local", nom: "Local", criteres: ["e", "f"], correction: 3, max: [30, 36] },
  ];
  const CF_ITEMS = [18, 21]; // 5-6 ans : fin du subtest après l'item 18
  const CFP_MAX = [102, 120];

  function nombre(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function texte(v, max) { const t = typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); return max ? t.slice(0, max) : t; }
  function entier(v, min, max) { const n = nombre(v); return n !== null && Number.isInteger(n) && n >= min && n <= max ? n : null; }

  // Tranche d'âge du cahier : "5-6", "7-16", ou null hors de 5 à 16 ans (âge en années et mois).
  function tranche(a) {
    if (!a || typeof a.ans !== "number") return null;
    if (a.ans < 5 || a.ans > 16) return null;
    return a.ans <= 6 ? "5-6" : "7-16";
  }

  /* ---------- Données du dossier ---------- */

  function vide() {
    return { cubes: { items: {}, depart: "", total: "", obs: "" }, cf: { items: {}, bruts: {}, rpCfg: "", comparaison: "", obs: "" } };
  }

  function normaliser(src) {
    const x = vide();
    if (!src || typeof src !== "object") return x;
    const cb = src.cubes && typeof src.cubes === "object" ? src.cubes : {};
    if (cb.items && typeof cb.items === "object") {
      CUBES.forEach((it) => {
        const s = cb.items[it.n];
        if (!s || typeof s !== "object") return;
        const o = {};
        if (s.ok === "oui" || s.ok === "non") o.ok = s.ok;
        const t = nombre(s.t);
        if (t !== null && t >= 0 && t <= 999) o.t = Math.round(t);
        if (Object.keys(o).length) x.cubes.items[it.n] = o;
      });
    }
    const dep = entier(cb.depart, 1, 19);
    if (dep !== null) x.cubes.depart = dep;
    const tot = entier(cb.total, 0, CUBES_MAX);
    if (tot !== null) x.cubes.total = tot;
    x.cubes.obs = texte(cb.obs, 600);

    const cf = src.cf && typeof src.cf === "object" ? src.cf : {};
    if (cf.items && typeof cf.items === "object") {
      for (let n = 1; n <= CF_ITEMS[1]; n++) {
        const s = cf.items[n];
        if (!s || typeof s !== "object") continue;
        const o = {};
        CRITERES.forEach((c) => { const v = entier(s[c.id], 0, 1); if (v !== null) o[c.id] = v; });
        if (Object.keys(o).length) x.cf.items[n] = o;
      }
    }
    if (cf.bruts && typeof cf.bruts === "object") {
      NOTES_CF.forEach((nt) => { const v = entier(cf.bruts[nt.id], 0, nt.max[1]); if (v !== null) x.cf.bruts[nt.id] = v; });
    }
    x.cf.rpCfg = texte(cf.rpCfg, 12).trim();
    const comp = entier(cf.comparaison, 1, 19);
    if (comp !== null) x.cf.comparaison = comp;
    x.cf.obs = texte(cf.obs, 600);
    return x;
  }

  /* ---------- Calcul : Cubes ---------- */

  // Points d'un item à partir de la réussite et de la durée d'exécution.
  // null : item non coté, ou réussi sans durée alors que le bonus de temps en dépend.
  function pointsCube(it, s) {
    if (!s || !s.ok) return null;
    if (s.ok === "non") return 0;
    const t = s.t === undefined ? null : s.t;
    if (t !== null && t > it.limite) return 0;
    if (it.bonus === null) return 1;
    if (t === null) return null;
    return t <= it.bonus ? 2 : 1;
  }

  function calculCubes(cb, a) {
    const tr = tranche(a);
    const depAuto = tr === "5-6" ? 6 : tr === "7-16" ? 8 : null;
    const depart = cb.depart || depAuto;
    const items = CUBES.map((it) => {
      const s = cb.items[it.n];
      const pts = pointsCube(it, s);
      return { n: it.n, saisi: !!(s && s.ok), points: pts, attenteTemps: !!(s && s.ok === "oui" && pts === null), credite: false, apresArret: false };
    });
    const p = (n) => (n >= 1 && n <= 19 ? items[n - 1].points : null);

    // Règle de retour : la base est la paire d'items consécutifs réussis la plus haute à partir du départ.
    let base = null, retour = false;
    if (depart) {
      if (p(depart) > 0 && p(depart + 1) > 0) base = depart;
      else if (p(depart) !== null && (p(depart) === 0 || (p(depart + 1) !== null && p(depart + 1) === 0))) {
        retour = true;
        for (let n = depart - 1; n >= 1; n--) {
          if (p(n) === null) break;
          if (p(n) > 0 && p(n + 1) > 0) { base = n; break; }
        }
      }
    }
    // Items avant la base, non passés : tous les points (comme si réussis).
    if (base !== null) for (let n = 1; n < base; n++) if (!items[n - 1].saisi) { items[n - 1].points = CUBES[n - 1].max; items[n - 1].credite = true; }

    // Règle d'arrêt : 4 notes 0 consécutives.
    let arret = null, zeros = 0;
    for (let i = 0; i < items.length; i++) {
      const v = items[i].points;
      if (v === 0) zeros++; else zeros = 0;
      if (v === null) zeros = 0;
      if (zeros >= CUBES_ARRET) { arret = i + 1; break; }
    }
    if (arret !== null) items.forEach((it) => { if (it.n > arret) it.apresArret = true; });

    const comptes = items.filter((it) => !it.apresArret);
    const somme = comptes.reduce((t, it) => t + (it.points || 0), 0);
    const dernier = arret || 19;
    const premier = base !== null ? 1 : retour ? 1 : depart || 1;
    const manquants = items.filter((it) => it.n >= premier && it.n <= dernier && it.points === null).map((it) => it.n);
    const retourAFaire = retour && base === null && p(1) === null;
    const saisis = items.some((it) => it.saisi);
    const saisi = cb.total !== "" && cb.total !== undefined ? cb.total : null;
    const brut = saisi !== null ? saisi : saisis && !manquants.length && !retourAFaire ? somme : null;
    return { tranche: tr, depart: depart, departAuto: depAuto, base: base, retour: retour, retourAFaire: retourAFaire, arret: arret, items: items,
      somme: saisis ? somme : null, manquants: manquants, brut: brut, brutSaisi: saisi !== null, max: CUBES_MAX, obs: cb.obs.trim() };
  }

  /* ---------- Calcul : Copie de figures ---------- */

  function calculCf(cf, a) {
    const tr = tranche(a);
    const k = tr === "5-6" ? 0 : 1;
    const nbItems = CF_ITEMS[k];
    const items = [];
    for (let n = 1; n <= CF_ITEMS[1]; n++) items.push({ n: n, propose: n <= nbItems, cote: !!cf.items[n] && n <= nbItems });
    const cotes = items.filter((it) => it.cote).length;
    const manquants = items.filter((it) => it.propose && !it.cote).map((it) => it.n);
    const notes = NOTES_CF.map((nt) => {
      let somme = 0;
      for (let n = 1; n <= nbItems; n++) { const s = cf.items[n]; if (s) nt.criteres.forEach((c) => { somme += s[c] || 0; }); }
      const saisi = cf.bruts[nt.id];
      const brut = saisi !== undefined ? saisi : cotes && !manquants.length ? somme : null;
      return { id: nt.id, code: nt.code, nom: nt.nom, correction: nt.correction, max: nt.max[k], somme: cotes ? somme : null, brut: brut, brutSaisi: saisi !== undefined,
        corrigee: brut === null ? null : Math.max(0, brut - nt.correction) };
    });
    const proc = notes.filter((n) => n.id !== "cfg");
    const cfp = proc.every((n) => n.corrigee !== null) ? proc.reduce((t, n) => t + n.corrigee, 0) : null;
    return { tranche: tr, nbItems: nbItems, items: items, cotes: cotes, manquants: manquants, notes: notes, cfp: cfp, cfpMax: CFP_MAX[k], rpCfg: cf.rpCfg, comparaison: cf.comparaison === "" ? null : cf.comparaison, obs: cf.obs.trim() };
  }

  function calcul(x0, a) {
    const x = normaliser(x0);
    return { cubes: calculCubes(x.cubes, a), cf: calculCf(x.cf, a) };
  }

  /* ---------- Rédaction ---------- */

  // Compléments pour le compte rendu, par ligne du bloc NEPSY-II : notes brutes à côté des notes étalonnées.
  function complements(c) {
    const out = {};
    if (!c) return out;
    if (c.cubes.brut !== null) out.cubes = { autres: ["note totale " + c.cubes.brut + "/" + c.cubes.max] };
    const note = (id) => c.cf.notes.find((n) => n.id === id);
    if (c.cf.cfp !== null) {
      const m = ["note totale " + c.cf.cfp + "/" + c.cf.cfpMax];
      const g = note("cfg");
      if (g.corrigee !== null) m.push("note Général " + g.corrigee + (c.cf.rpCfg ? " (rang percentile " + c.cf.rpCfg + ")" : ""));
      out.cfp = { autres: m };
    } else if (c.cf.rpCfg) out.cfp = { autres: ["rang percentile de la note Général " + c.cf.rpCfg] };
    // Comparaison Global / Local : note étalonnée de contraste, rapportée telle quelle (sans appréciation).
    if (c.cf.comparaison !== null) (out.cfp = out.cfp || { autres: [] }).autres.push("note étalonnée de comparaison Global / Local " + c.cf.comparaison);
    [["motricite", "cfp-motricite"], ["global", "cfp-global"], ["local", "cfp-local"]].forEach((p) => {
      const n = note(p[0]);
      if (n.corrigee !== null) out[p[1]] = { autres: ["note " + n.corrigee] };
    });
    return out;
  }

  return { CUBES, CUBES_MAX, CUBES_ARRET, CRITERES, NOTES_CF, CF_ITEMS, CFP_MAX,
    tranche, vide, normaliser, pointsCube, calcul, complements };
});
