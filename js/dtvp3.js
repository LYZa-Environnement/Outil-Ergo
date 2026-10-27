/*
 * Outil Ergo : DTVP-3 (Developmental Test of Visual Perception, 3e édition), feuille de cotation.
 * Reprend la structure du livret de l'examinateur : 5 sous-tests cotés item par item, plafonds,
 * scores bruts, notes standard, indices composites, termes descriptifs et score de différence.
 * Le contenu protégé du test (consignes, figures, réponses attendues, tables de normes) n'est pas dans ce code :
 * les réponses attendues peuvent arriver par le fichier du cabinet (clé « dtvp3 ») ; les notes standard,
 * rangs percentiles, âges équivalents et indices se reportent depuis le manuel.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Dtvp3 = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Sous-tests, dans l'ordre de passation. ligne = id de la ligne du bloc DTVP-3 (tests.dtvp3.lignes).
  // eh : segments par item et points maximum par segment ; autres : nombre d'items et points maximum par item.
  const SOUS_TESTS = [
    { id: "eh", ligne: "coordination", code: "EH", nom: "Coordination œil-main", motrice: true, plafond: 0,
      items: [[8, 1], [8, 1], [8, 4], [19, 4], [17, 4]].map((x) => ({ segments: x[0], maxSeg: x[1], max: x[0] * x[1] })) },
    { id: "co", ligne: "copie", code: "CO", nom: "Copie", motrice: true, plafond: 3, nb: 18, max: 3 },
    { id: "fg", ligne: "figure-fond", code: "FG", nom: "Figure-fond", motrice: false, plafond: 3, nb: 23, max: 8, lettres: true },
    { id: "vc", ligne: "closure", code: "VC", nom: "Closure visuelle", motrice: false, plafond: 3, nb: 26, max: 1, lettres: true, unique: true },
    { id: "fc", ligne: "constance", code: "FC", nom: "Constance de la forme", motrice: false, plafond: 3, nb: 24, max: 6, lettres: true },
  ];
  SOUS_TESTS.forEach((s) => { if (!s.items) s.items = Array.from({ length: s.nb }, () => ({ max: s.max })); s.sem = 1; });

  const COMPOSITES = [
    { id: "ivm", ligne: "ivm", code: "IVM", nom: "Intégration visuo-motrice", sous: ["eh", "co"], sem: 4 },
    { id: "pvrmr", ligne: "pvrmr", code: "PVRMR", nom: "Perception visuelle à réponse motrice réduite", sous: ["fg", "vc", "fc"], sem: 4 },
    { id: "pvg", ligne: "pvg", code: "PVG", nom: "Perception visuelle générale", sous: ["eh", "co", "fg", "vc", "fc"], sem: 3 },
  ];

  // Termes descriptifs (section 4 du livret).
  const TERMES = [
    ["tres-faible", "Très faible", 1, 3, 0, 69],
    ["faible", "Faible", 4, 5, 70, 79],
    ["inferieur", "Inférieur à la moyenne", 6, 7, 80, 89],
    ["moyen", "Moyen", 8, 12, 90, 110],
    ["superieur-moyenne", "Supérieur à la moyenne", 13, 14, 111, 120],
    ["superieur", "Supérieur", 15, 16, 121, 130],
    ["tres-superieur", "Très supérieur", 17, 20, 131, 200],
  ];
  // Score de différence entre l'intégration visuo-motrice et la perception à réponse motrice réduite.
  const SEUIL_STATISTIQUE = 12, SEUIL_CLINIQUE = 28;

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
  function sousTest(id) { return SOUS_TESTS.find((s) => s.id === id) || null; }
  const LETTRES = "abcdefgh";

  /* ---------- Réponses attendues (fichier du cabinet) ---------- */

  // { fg: [["abcde", "ae"], …], vc: [["abc", "c"], …], fc: [...] } : lettres proposées et lettres justes, item par item.
  function normaliserCles(c) {
    if (!c || typeof c !== "object") return null;
    const out = {};
    ["fg", "vc", "fc"].forEach((id) => {
      const s = sousTest(id), l = c[id];
      if (!Array.isArray(l) || l.length !== s.nb) return;
      const items = l.map((x) => {
        if (!Array.isArray(x)) return null;
        const prop = texte(x[0]).toLowerCase().replace(/[^a-h]/g, ""), bonnes = texte(x[1]).toLowerCase().replace(/[^a-h]/g, "");
        if (!prop || !bonnes || bonnes.split("").some((b) => prop.indexOf(b) < 0)) return null;
        if (s.unique && bonnes.length !== 1) return null;
        return [prop, bonnes];
      });
      if (items.every(Boolean)) out[id] = items;
    });
    return Object.keys(out).length ? out : null;
  }

  /* ---------- Données du dossier ---------- */

  function vide() {
    const x = { items: {}, segments: {}, choix: {}, bruts: {}, rp: {}, ae: {}, obs: {} };
    return x;
  }
  function normaliser(src) {
    const x = vide();
    if (!src || typeof src !== "object") return x;
    SOUS_TESTS.forEach((s) => {
      const it = src.items && src.items[s.id], ch = src.choix && src.choix[s.id];
      if (it && typeof it === "object") {
        const o = {};
        s.items.forEach((item, i) => { const v = entier(it[i + 1], 0, item.max); if (v !== null) o[i + 1] = v; });
        if (Object.keys(o).length) x.items[s.id] = o;
      }
      if (s.lettres && ch && typeof ch === "object") {
        const o = {};
        s.items.forEach((item, i) => { const v = texte(ch[i + 1]).toLowerCase().replace(/[^a-h]/g, ""); if (v) o[i + 1] = Array.from(new Set(v.split(""))).sort().join(""); });
        if (Object.keys(o).length) x.choix[s.id] = o;
      }
      const b = entier(src.bruts && src.bruts[s.id], 0, s.items.reduce((t, i) => t + i.max, 0));
      if (b !== null) x.bruts[s.id] = b;
      ["ae", "obs"].forEach((k) => { const v = texte(src[k] && src[k][s.id], k === "obs" ? 600 : 12).trim(); if (v) x[k][s.id] = v; });
    });
    if (src.segments && src.segments.eh && typeof src.segments.eh === "object") {
      const eh = sousTest("eh"), o = {};
      eh.items.forEach((item, i) => {
        const seg = src.segments.eh[i + 1];
        if (!seg || typeof seg !== "object") return;
        const r = {};
        for (let k = 1; k <= item.segments; k++) { const v = entier(seg[k], 0, item.maxSeg); if (v !== null) r[k] = v; }
        if (Object.keys(r).length) o[i + 1] = r;
      });
      if (Object.keys(o).length) x.segments.eh = o;
    }
    SOUS_TESTS.concat(COMPOSITES).forEach((s) => { const v = nombre(src.rp && src.rp[s.id]); if (v !== null && v >= 0 && v <= 100) x.rp[s.id] = texte(src.rp[s.id], 6).trim(); });
    return x;
  }

  /* ---------- Calcul ---------- */

  // Points d'un item des sous-tests à choix : avec les réponses attendues, une lettre fausse donne 0.
  function pointsChoix(choix, cle) {
    if (!choix || !cle) return null;
    if (choix.split("").some((l) => cle[1].indexOf(l) < 0)) return 0;
    return choix.length;
  }

  function scoreItem(x, s, i, cles) {
    const n = i + 1;
    if (s.id === "eh") {
      const seg = (x.segments.eh || {})[n];
      if (seg && Object.keys(seg).length) {
        const remplis = Object.keys(seg).length;
        return { points: Object.keys(seg).reduce((t, k) => t + seg[k], 0), complet: remplis === s.items[i].segments, source: "segments", segmentsRemplis: remplis };
      }
    }
    const cle = s.lettres && cles && cles[s.id] ? cles[s.id][i] : null;
    const ch = (x.choix[s.id] || {})[n];
    if (cle && ch) return { points: pointsChoix(ch, cle), complet: true, source: "lettres" };
    const v = (x.items[s.id] || {})[n];
    return v === undefined ? null : { points: v, complet: true, source: "saisie" };
  }

  // Score brut d'un sous-test : somme des items jusqu'au plafond (3 items consécutifs à 0) ; une note brute saisie l'emporte.
  function calculSousTest(x, s, cles) {
    const items = s.items.map((it, i) => scoreItem(x, s, i, cles));
    let plafond = null, zeros = 0;
    if (s.plafond) {
      for (let i = 0; i < items.length; i++) {
        if (items[i] && items[i].points === 0) zeros++; else zeros = 0;
        if (!items[i]) zeros = 0;
        if (zeros >= s.plafond) { plafond = i + 1; break; }
      }
    }
    const comptes = items.map((it, i) => (plafond !== null && i + 1 > plafond ? null : it));
    const notes = comptes.filter(Boolean);
    const somme = notes.reduce((t, it) => t + it.points, 0);
    // Maximum : connu pour EH, CO et VC ; pour FG et FC, seulement avec les réponses attendues (nombre de formes justes).
    const cle = s.lettres && cles && cles[s.id];
    const max = cle ? cle.reduce((t, c) => t + c[1].length, 0) : s.lettres && !s.unique ? null : s.items.reduce((t, it) => t + it.max, 0);
    const dernier = plafond || s.items.length;
    const manquants = s.items.slice(0, dernier).map((it, i) => i + 1).filter((n) => !comptes[n - 1] || !comptes[n - 1].complet);
    const saisi = x.bruts[s.id];
    const brut = saisi !== undefined ? saisi : notes.length && !manquants.length ? somme : null;
    return { id: s.id, items: items, plafond: plafond, somme: notes.length ? somme : null, max: max, manquants: manquants,
      brut: brut, brutSaisi: saisi !== undefined, partiel: notes.length > 0 && manquants.length > 0 && saisi === undefined };
  }

  function terme(v, type) {
    if (v === null || v === undefined) return null;
    const t = TERMES.find((x) => (type === "indice" ? v >= x[4] && v <= x[5] : v >= x[2] && v <= x[3]));
    return t ? { id: t[0], nom: t[1] } : null;
  }

  // lignes : lignes du bloc DTVP-3 (notes standard et indices reportés du manuel).
  function calcul(x0, lignes, cles) {
    const x = normaliser(x0);
    const val = (id) => { const l = (lignes || []).find((y) => y.id === id); return l ? nombre(l.valeur) : null; };
    const sous = SOUS_TESTS.map((s) => {
      const c = calculSousTest(x, s, cles);
      const ns = val(s.ligne);
      const nsOk = ns !== null && Number.isInteger(ns) && ns >= 1 && ns <= 20 ? ns : null;
      return Object.assign(c, { code: s.code, nom: s.nom, ns: nsOk, nsHorsBorne: ns !== null && nsOk === null, terme: terme(nsOk, "ns"), rp: x.rp[s.id] || "", ae: x.ae[s.id] || "", obs: x.obs[s.id] || "", sem: s.sem });
    });
    const comp = COMPOSITES.map((c) => {
      const notes = c.sous.map((id) => sous.find((s) => s.id === id).ns);
      const somme = notes.every((n) => n !== null) ? notes.reduce((t, n) => t + n, 0) : null;
      const ind = val(c.ligne);
      return { id: c.id, code: c.code, nom: c.nom, sous: c.sous, sem: c.sem, sommeNS: somme, manque: c.sous.filter((id, i) => notes[i] === null),
        indice: ind, terme: terme(ind, "indice"), rp: x.rp[c.id] || "" };
    });
    const ivm = comp.find((c) => c.id === "ivm").indice, pvrmr = comp.find((c) => c.id === "pvrmr").indice;
    let difference = null;
    if (ivm !== null && pvrmr !== null) {
      const ecart = Math.abs(ivm - pvrmr);
      difference = { ecart: ecart, signe: ivm - pvrmr, niveau: ecart >= SEUIL_CLINIQUE ? "clinique" : ecart >= SEUIL_STATISTIQUE ? "statistique" : "non" };
    }
    return { sousTests: sous, composites: comp, difference: difference, cotes: sous.some((s) => s.somme !== null || s.brutSaisi) };
  }

  // Âge pour les tables de normes : années et mois, sans arrondir.
  function ageNormes(a) { return a ? a.ans + " ans " + a.mois + " mois" : ""; }

  /* ---------- Rédaction ---------- */

  function fr(v) { return String(v).replace(".", ","); }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }

  // Phrase sur l'écart entre la composante visuo-motrice et la perception pure (compte rendu).
  function phraseDifference(c, a) {
    const d = c && c.difference;
    if (!d) return "";
    const sujet = (a && a.sujetMin) || "l'enfant";
    if (d.niveau === "non") return "L'écart entre l'intégration visuo-motrice et la perception visuelle à réponse motrice réduite (" + d.ecart + " points) n'est pas significatif : le profil est homogène.";
    const fort = d.signe > 0 ? "la perception visuelle sans réponse motrice" : "la perception visuelle quand une réponse motrice est demandée";
    return "L'écart entre l'intégration visuo-motrice et la perception visuelle à réponse motrice réduite est de " + d.ecart + " points, " +
      (d.niveau === "clinique" ? "cliniquement significatif (28 ou plus)" : "statistiquement significatif (12 ou plus)") +
      " : " + sujet + " est en difficulté surtout pour " + fort + (d.signe > 0 ? " (analyse, discrimination)." : " (coordination du geste avec la vision).");
  }

  // Compléments pour le compte rendu, par ligne : terme descriptif du manuel, puis score brut, rang percentile, âge équivalent.
  function complements(c) {
    const out = {};
    if (!c) return out;
    c.sousTests.forEach((s) => {
      const m = [];
      if (s.brut !== null) m.push("score brut " + s.brut);
      if (s.rp) m.push("rang percentile " + fr(s.rp));
      if (s.ae) m.push("âge équivalent " + s.ae);
      out[sousTest(s.id).ligne] = { terme: s.terme ? s.terme.nom.toLowerCase() : "", autres: m };
    });
    c.composites.forEach((k) => {
      const m = [];
      if (k.sommeNS !== null) m.push("somme des notes standard " + k.sommeNS);
      if (k.rp) m.push("rang percentile " + fr(k.rp));
      out[k.id] = { terme: k.terme ? k.terme.nom.toLowerCase() : "", autres: m };
    });
    return out;
  }

  return { SOUS_TESTS, COMPOSITES, TERMES, LETTRES, SEUIL_STATISTIQUE, SEUIL_CLINIQUE,
    vide, normaliser, normaliserCles, calcul, terme, ageNormes, phraseDifference, complements, joindre };
});
