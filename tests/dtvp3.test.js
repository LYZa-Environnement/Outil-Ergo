"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../js/dtvp3.js");
const B = require("../js/bhk.js");

const lignes = (v) => [["coordination", "ns"], ["copie", "ns"], ["figure-fond", "ns"], ["closure", "ns"], ["constance", "ns"], ["pvrmr", "indice"], ["ivm", "indice"], ["pvg", "indice"]]
  .map((x) => ({ id: x[0], type: x[1], valeur: v[x[0]] === undefined ? "" : String(v[x[0]]) }));

test("DTVP-3 : structure du livret (items, maximums, SEM)", () => {
  const max = (id) => D.SOUS_TESTS.find((s) => s.id === id).items.reduce((t, i) => t + i.max, 0);
  assert.equal(max("eh"), 8 + 8 + 32 + 76 + 68);
  assert.equal(max("co"), 54);
  assert.equal(D.SOUS_TESTS.find((s) => s.id === "fg").items.length, 23);
  assert.equal(max("vc"), 26);
  assert.equal(D.SOUS_TESTS.find((s) => s.id === "fc").items.length, 24);
  assert.deepEqual(D.COMPOSITES.map((c) => c.sem), [4, 4, 3]);
});

test("DTVP-3 : coordination œil-main, segments et items, tous les items proposés", () => {
  const x = { items: { eh: { 1: 8, 2: 7 } }, segments: { eh: { 3: { 1: 4, 2: 3, 3: 4, 4: 4, 5: 2, 6: 4, 7: 4, 8: 4 } } } };
  let c = D.calcul(x, lignes({}));
  const eh = c.sousTests.find((s) => s.id === "eh");
  assert.equal(eh.items[2].points, 29);
  assert.equal(eh.brut, null, "items 4 et 5 manquants");
  assert.deepEqual(eh.manquants, [4, 5]);
  x.items.eh[4] = 60; x.items.eh[5] = 50;
  c = D.calcul(x, lignes({}));
  assert.equal(c.sousTests.find((s) => s.id === "eh").brut, 8 + 7 + 29 + 60 + 50);
  // Segment hors bornes (5 sur un item coté 0 à 4) ignoré ; item 1 au-delà de 8 refusé.
  const n = D.normaliser({ items: { eh: { 1: 9 } }, segments: { eh: { 3: { 1: 5 } } } });
  assert.deepEqual(n.items, {});
  assert.deepEqual(n.segments, {});
});

test("DTVP-3 : plafond de 3 items consécutifs à 0, items suivants non comptés", () => {
  const items = { 1: 3, 2: 3, 3: 2, 4: 0, 5: 3, 6: 0, 7: 0, 8: 0, 9: 3 };
  const c = D.calcul({ items: { co: items } }, lignes({}));
  const co = c.sousTests.find((s) => s.id === "co");
  assert.equal(co.plafond, 8);
  assert.equal(co.brut, 11);
  assert.equal(co.partiel, false);
});

test("DTVP-3 : lettres choisies avec les réponses attendues du fichier du cabinet", () => {
  // Réponses fictives pour le test (le vrai contenu vient de l'exemplaire du cabinet).
  const cles = D.normaliserCles({
    fg: Array.from({ length: 23 }, () => ["abcde", "ab"]),
    vc: Array.from({ length: 26 }, () => ["abc", "b"]),
  });
  assert.ok(cles.fg && cles.vc && !cles.fc);
  const c = D.calcul({ choix: { fg: { 1: "ab", 2: "a", 3: "ac", 4: "c", 5: "d" }, vc: { 1: "b", 2: "a" } } }, lignes({}), cles);
  const fg = c.sousTests.find((s) => s.id === "fg"), vc = c.sousTests.find((s) => s.id === "vc");
  assert.deepEqual(fg.items.slice(0, 5).map((i) => i.points), [2, 1, 0, 0, 0]);
  assert.equal(fg.plafond, 5);
  assert.equal(fg.brut, 3);
  assert.equal(vc.somme, 1);
  assert.equal(D.normaliserCles({ vc: [["abc", "bc"]] }), null, "closure : une seule bonne réponse, liste complète");
});

test("DTVP-3 : termes descriptifs, sommes des notes standard, score de différence", () => {
  assert.equal(D.terme(5, "ns").nom, "Faible");
  assert.equal(D.terme(12, "ns").nom, "Moyen");
  assert.equal(D.terme(69, "indice").nom, "Très faible");
  assert.equal(D.terme(131, "indice").nom, "Très supérieur");
  const c = D.calcul({}, lignes({ coordination: 5, copie: 6, "figure-fond": 10, closure: 11, constance: 9, ivm: 75, pvrmr: 101, pvg: 86 }));
  assert.equal(c.composites.find((k) => k.id === "ivm").sommeNS, 11);
  assert.equal(c.composites.find((k) => k.id === "pvrmr").sommeNS, 30);
  assert.equal(c.composites.find((k) => k.id === "pvg").sommeNS, 41);
  assert.equal(c.composites.find((k) => k.id === "pvg").terme.nom, "Inférieur à la moyenne");
  assert.deepEqual([c.difference.ecart, c.difference.niveau], [26, "statistique"]);
  assert.match(D.phraseDifference(c, { sujetMin: "Léa" }), /26 points, statistiquement significatif.*Léa est en difficulté surtout pour la perception visuelle quand une réponse motrice est demandée/);
  const c2 = D.calcul({}, lignes({ ivm: 70, pvrmr: 100 }));
  assert.equal(c2.difference.niveau, "clinique");
  assert.equal(D.ageNormes({ ans: 7, mois: 11 }), "7 ans 11 mois");
});

test("DTVP-3 : compte rendu avec score brut, rang percentile, terme du manuel et différence", () => {
  const d = B.normaliserDossier({ prenom: "Léa", sexe: "F", naissance: "2018-03-10", passation: "2026-10-20" });
  d.tests.dtvp3.fait = "oui";
  d.tests.dtvp3.lignes.find((l) => l.id === "copie").valeur = "6";
  d.tests.dtvp3.lignes.find((l) => l.id === "ivm").valeur = "75";
  d.tests.dtvp3.lignes.find((l) => l.id === "pvrmr").valeur = "105";
  d.dtvp3 = { items: { co: { 1: 3, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0 } }, rp: { co: "9", ivm: "5" } };
  const t = B.calculerTests(d, {}).find((x) => x.id === "dtvp3");
  assert.equal(t.dtvp3.sousTests.find((s) => s.id === "co").brut, 8);
  const txt = B.rediger(d, {}).complementaires;
  assert.match(txt, /Copie : note standard 6 \(inférieur à la moyenne selon le manuel\), DS −1,33, score brut 8, rang percentile 9/);
  assert.match(txt, /Intégration visuo-motrice : indice 75 \(faible selon le manuel\), DS −1,67, rang percentile 5/);
  assert.match(txt, /30 points, cliniquement significatif/);
  // Le dossier garde la feuille de cotation à l'enregistrement.
  assert.deepEqual(B.normaliserDossier(JSON.parse(JSON.stringify(d))).dtvp3.items.co, { 1: 3, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0 });
});
