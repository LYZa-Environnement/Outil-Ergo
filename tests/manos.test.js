// Man.O.S : calculs et rédaction avec une grille FICTIVE (la vraie grille et les normes restent dans le fichier du cabinet).
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../js/manos.js");
const B = require("../js/bhk.js");

const C = (nom, ...o) => ({ nom, o });
const grilleFictive = {
  version: "essai", source: "Grille fictive pour les tests",
  classes: {
    CM2: {
      intro: "Épreuves chronométrées.",
      epreuves: [
        { id: "outil-a", nom: "Outil A", consigne: "« Consigne A. »", m: [C("Critère 1", [0, "Bas"], [1, "Haut"]), C("Critère 2", [0, "Bas"], [1, "Moyen"], [2, "Haut"])], r: [C("Rendu", [0, "Raté"], [1, "Réussi"])], nm: [2, 0.5], nr: [0.8, 0.4], nt: [30, 10] },
        { id: "outil-b", nom: "Outil B", m: [C("Critère", [0, "Bas"], [1, "Haut"])], r: [C("Rendu", [0, "Raté"], [1, "Moyen"], [2, "Réussi"])], nm: [0.9, 0.3], nr: [1.5, 0.5], nt: [60, 20] },
      ],
      total: { nm: [3, 1], nr: [2.4, 0.6], nt: [90, 25] },
    },
    CE1: { epreuves: [{ id: "outil-a", nom: "Outil A", m: [C("Critère", [0, "Bas"], [1, "Haut"])], r: [C("Rendu", [0, "Raté"], [1, "Réussi"])], nm: [0.8, 0.4], nr: [0.7, 0.45] }], total: { nm: [0.8, 0.4], nr: [0.7, 0.45] } },
    XX: { epreuves: [] },
  },
};
const niveau = (v) => (v <= -1.5 ? "patho" : v <= -1 ? "inferieur" : v >= 1 ? "superieur" : "moyenne");

test("Man.O.S : grille du cabinet validée, classes inconnues ignorées", () => {
  const g = M.normaliserGrille(grilleFictive);
  assert.deepEqual(Object.keys(g.classes), ["CE1", "CM2"]);
  assert.equal(M.maxCriteres(g.classes.CM2.epreuves[0].m), 3);
  assert.equal(M.normaliserGrille({ classes: { CM2: { epreuves: [{ id: "x", m: [], r: [], nm: [1, 1], nr: [1, 1] }] } } }), null);
  assert.equal(M.normaliserGrille(null), null);
});

test("Man.O.S : classe proposée selon la classe et la date du bilan", () => {
  assert.deepEqual(M.classeProposee("CM2", "2026-02-10"), { classe: "CM2", raison: "" });
  assert.equal(M.classeProposee("CM2", "2026-10-10").classe, "CM1");
  assert.match(M.classeProposee("CM2", "2026-10-10").raison, /classe inférieure/);
  assert.equal(M.classeProposee("4e", "2026-10-10").classe, "6e");
  assert.equal(M.classeProposee("CP", "2026-03-10").classe, "CE1");
  assert.equal(M.classeProposee("", "2026-03-10").classe, "");
});

test("Man.O.S : notes brutes par critères ou saisies, DS, temps et totaux", () => {
  const g = M.normaliserGrille(grilleFictive);
  const x = { classe: "CM2", cotes: { CM2: {
    "outil-a": { m: { 0: 1, 1: 0 }, r: { 0: 1 }, temps: "45" },
    "outil-b": { nbM: "1", nbR: "1", temps: "50,5", obs: "se précipite." },
  } } };
  const c = M.calcul(x, g, niveau);
  const a = c.epreuves[0], b = c.epreuves[1];
  assert.equal(a.m.nb, 1); assert.equal(a.m.source, "grille");
  assert.equal(a.m.ds, -2); assert.equal(a.m.niveau, "patho");
  assert.ok(Math.abs(a.r.ds - 0.5) < 1e-9);
  assert.equal(a.t.ds, -1.5, "plus lent que la moyenne : DS négative");
  assert.deepEqual(a.zeros.m, [{ critere: "Critère 2", choix: "Bas", partie: "" }]);
  assert.equal(b.m.source, "saisie"); assert.ok(Math.abs(b.m.ds - 1 / 3) < 1e-9);
  assert.equal(b.t.v, 50.5);
  assert.equal(c.total.m.nb, 2); assert.equal(c.total.m.ds, -1);
  assert.equal(c.total.t.v, 95.5); assert.ok(Math.abs(c.total.t.ds - -0.22) < 1e-9);
  // Critères en partie cotés : pas de note, pas de total
  x.cotes.CM2["outil-a"].m = { 0: 1 };
  const c2 = M.calcul(x, g, niveau);
  assert.equal(c2.epreuves[0].m.nb, null); assert.equal(c2.epreuves[0].m.repondus, 1);
  assert.equal(c2.total.m.nb, null); assert.equal(c2.total.m.faites, 1);
  // Note saisie hors barème : ignorée
  const c3 = M.calcul({ cotes: { CM2: { "outil-b": { nbM: "7" } } } }, g, niveau, "CM2");
  assert.equal(c3.epreuves[1].m.nb, null); assert.ok(c3.epreuves[1].m.horsBorne);
});

test("Man.O.S : lignes du tableau récapitulatif, rédaction et graphique", () => {
  const g = M.normaliserGrille(grilleFictive);
  const x = { classe: "CM2", cotes: { CM2: { "outil-a": { m: { 0: 1, 1: 0 }, r: { 0: 1 }, temps: "45" }, "outil-b": { nbM: "1", nbR: "2", temps: "40" } } } };
  const c = M.calcul(x, g, niveau);
  const l = M.lignesTest(c);
  assert.deepEqual(l.map((y) => y.epreuve), ["Manipulation (total)", "Résultat (total)", "Temps total"]);
  assert.deepEqual(M.outilsEnDifficulte(c), ["outil A"]);
  // Passation partielle : chaque épreuve cotée
  const partielle = M.calcul({ classe: "CM2", cotes: { CM2: { "outil-b": { nbM: "1", nbR: "2", temps: "40" } } } }, g, niveau);
  assert.deepEqual(M.lignesTest(partielle).map((y) => y.epreuve), ["Outil B : manipulation", "Outil B : résultat", "Outil B : temps"]);
  const t = M.rediger(c, { sujetMin: "Léa" }, { appreciations: B.APPRECIATIONS, notes: "Bonne coopération" });
  assert.match(t, /^Man\.O\.S, test de manipulation des outils scolaires \(épreuves de CM2\) :/);
  assert.match(t, /– Manipulation, toutes épreuves : 2 sur 4 \(DS −1,00, inférieur à la moyenne\)\./);
  assert.match(t, /– Outil A : manipulation 1\/3 \(DS −2,00\), résultat 1\/1 \(DS \+0,50\), 45 s \(DS −1,50\)\. Observé : critère 2 : bas\./);
  assert.match(t, /Pour outil A, le résultat est correct mais obtenu avec une manipulation peu efficace/);
  assert.match(t, /Utilisation dans la moyenne pour outil B\./);
  assert.match(t, /Bonne coopération\.$/);
  const gd = M.donneesGraphique(c, { patho: 1.5, inferieur: 1, superieur: 1 });
  assert.equal(gd.lignes.length, 2); assert.equal(gd.total.nom, "Toutes épreuves");
  const G = require("../js/graphiques.js");
  const svg = G.dessiner("manos", gd).svg;
  assert.match(svg, /Man\.O\.S : écart à la moyenne, outil par outil/);
  assert.match(svg, /Pour le temps, une DS négative signifie plus lent/);
});

test("Man.O.S dans le bilan : lignes, compte rendu, graphique et diagnostic", () => {
  const reg = B.normaliserReglages({ manosGrille: grilleFictive });
  assert.ok(reg.manosGrille);
  const d = B.dossierVide();
  d.prenom = "Léa"; d.sexe = "F"; d.groupe = "CM2"; d.passation = "2026-02-12";
  d.tests.manos.fait = "oui";
  d.manos = { cotes: { CM2: { "outil-a": { m: { 0: 0, 1: 0 }, r: { 0: 0 }, temps: "70" }, "outil-b": { nbM: "0", nbR: "0", temps: "120" } } } };
  const t = B.calculerTests(d, reg).find((x) => x.id === "manos");
  assert.equal(t.lignes[0].epreuve, "Manipulation (total)");
  assert.equal(t.lignes[0].type, "manos");
  const cr = B.rediger(d, reg);
  assert.match(cr.complementaires, /Man\.O\.S, test de manipulation des outils scolaires \(épreuves de CM2\)/);
  assert.match(cr.complementaires, /la manipulation comme le résultat sont en difficulté/);
  assert.ok(B.donneesGraphiques(d, reg).manos);
  const m = B.modeleDocument(d, reg);
  assert.ok(m.blocs.some((b) => b.type === "graphique" && b.id === "manos"));
  const constats = B.rediger(d, reg).conclusion;
  assert.match(constats, /des difficultés de manipulation des outils scolaires \(Man\.O\.S : manipulation \(total\) DS .* ; surtout pour outil A et outil B\)/);
  const p = B.propositionsDiagnostic(d, reg);
  assert.ok(p.occupations.some((o) => o.id === "outils" && o.sources.some((s) => /^Man\.O\.S : manipulation \(total\) DS/.test(s))));
  // Sans grille : ancienne saisie libre
  const sans = B.calculerTests(d, B.normaliserReglages({})).find((x) => x.id === "manos");
  assert.equal(sans.manos, null);
  // Données du dossier nettoyées
  const n = B.normaliserDossier({ manos: { classe: "CM9", cotes: { CM2: { "outil-a": { m: { 0: "1", 1: 12, x: 1 } }, "../x": {} } } } });
  assert.equal(n.manos.classe, "");
  assert.deepEqual(n.manos.cotes.CM2["outil-a"].m, { 0: 1 });
  assert.equal(n.manos.cotes.CM2["../x"], undefined);
});
