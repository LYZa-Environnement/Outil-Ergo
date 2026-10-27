"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const N = require("../js/nepsy.js");
const B = require("../js/bhk.js");

const a = (ans) => ({ ans: ans, mois: 3 });
const reussi = (t) => ({ ok: "oui", t: t });
const echec = { ok: "non" };

test("NEPSY-II Cubes : structure du protocole", () => {
  assert.equal(N.CUBES.length, 19);
  assert.equal(N.CUBES_MAX, 28);
  assert.deepEqual(N.CUBES.slice(0, 8).map((i) => i.limite), [30, 30, 30, 30, 30, 30, 30, 60]);
  assert.equal(N.CUBES[10].bonus, 20);
  assert.equal(N.CUBES[15].bonus, 30, "items 16 à 19 : bonus jusqu'à 30 s (cahier d'administration)");
});

test("NEPSY-II Cubes : points selon la durée et le bonus de temps", () => {
  const it = (n) => N.CUBES[n - 1];
  assert.equal(N.pointsCube(it(3), reussi(25)), 1);
  assert.equal(N.pointsCube(it(3), reussi(31)), 0, "hors temps");
  assert.equal(N.pointsCube(it(3), { ok: "oui" }), 1, "durée facultative items 1 à 10");
  assert.equal(N.pointsCube(it(12), reussi(20)), 2);
  assert.equal(N.pointsCube(it(12), reussi(21)), 1);
  assert.equal(N.pointsCube(it(12), { ok: "oui" }), null, "durée nécessaire pour le bonus");
  assert.equal(N.pointsCube(it(17), reussi(30)), 2);
  assert.equal(N.pointsCube(it(17), reussi(31)), 1);
  assert.equal(N.pointsCube(it(17), reussi(61)), 0);
  assert.equal(N.pointsCube(it(17), echec), 0);
});

test("NEPSY-II Cubes : départ à 8 ans, items précédents accordés, arrêt après 4 zéros", () => {
  const items = { 8: reussi(20), 9: reussi(40), 10: reussi(50), 11: reussi(15), 12: reussi(45), 13: echec, 14: echec, 15: echec, 16: echec };
  const c = N.calcul({ cubes: { items } }, a(8)).cubes;
  assert.equal(c.depart, 8);
  assert.equal(c.base, 8);
  assert.equal(c.arret, 16);
  assert.deepEqual(c.manquants, []);
  // Items 1 à 7 accordés (7 points) + 8, 9, 10 (3) + 11 (2) + 12 (1).
  assert.equal(c.brut, 13);
  assert.ok(c.items[0].credite && !c.items[7].credite);
});

test("NEPSY-II Cubes : règle de retour à 5 ans", () => {
  let c = N.calcul({ cubes: { items: { 6: echec, 7: reussi(10) } } }, a(5)).cubes;
  assert.equal(c.depart, 6);
  assert.equal(c.retourAFaire, true);
  assert.equal(c.brut, null);
  c = N.calcul({ cubes: { items: { 6: echec, 7: reussi(10), 5: reussi(10), 4: reussi(12), 8: echec, 9: echec, 10: echec, 11: echec } } }, a(5)).cubes;
  assert.equal(c.base, 4);
  assert.equal(c.retourAFaire, false);
  assert.equal(c.arret, 11);
  // Items 1 à 3 accordés (3) + 4, 5 (2) + 6 (0) + 7 (1).
  assert.equal(c.brut, 6);
});

test("NEPSY-II Cubes : note totale saisie l'emporte", () => {
  const c = N.calcul({ cubes: { items: { 8: reussi(5) }, total: 17 } }, a(10)).cubes;
  assert.equal(c.brut, 17);
  assert.equal(c.brutSaisi, true);
  assert.equal(N.normaliser({ cubes: { total: 29 } }).cubes.total, "", "au-delà de 28 refusé");
});

test("NEPSY-II Copie de figures : corrections et maximums par âge", () => {
  const items = {};
  for (let n = 1; n <= 21; n++) items[n] = { g: 1, a: 1, b: 1, c: 1, d: 1, e: n > 3 ? 1 : 0, f: n > 3 ? 1 : 0 };
  let cf = N.calcul({ cf: { items } }, a(9)).cf;
  const note = (id) => cf.notes.find((x) => x.id === id);
  assert.equal(cf.nbItems, 21);
  assert.equal(note("cfg").brut, 21); assert.equal(note("cfg").corrigee, 18);
  assert.equal(note("motricite").brut, 42); assert.equal(note("motricite").corrigee, 39);
  assert.equal(note("global").corrigee, 40);
  assert.equal(note("local").brut, 36); assert.equal(note("local").corrigee, 33);
  assert.equal(cf.cfp, 39 + 40 + 33);
  assert.equal(cf.cfpMax, 120);
  // 5-6 ans : fin après l'item 18, les items 19 à 21 ne comptent pas.
  cf = N.calcul({ cf: { items } }, a(6)).cf;
  assert.equal(cf.nbItems, 18);
  assert.equal(cf.notes.find((x) => x.id === "cfg").brut, 18);
  assert.equal(cf.cfpMax, 102);
});

test("NEPSY-II Copie de figures : note corrigée jamais sous 0, items manquants", () => {
  const cf = N.calcul({ cf: { items: { 1: { g: 1 } } } }, a(7)).cf;
  assert.equal(cf.notes[0].brut, null, "items 2 à 21 à coter");
  assert.equal(cf.manquants.length, 20);
  const cf2 = N.calcul({ cf: { bruts: { cfg: 2, motricite: 1, global: 1, local: 0 } } }, a(7)).cf;
  assert.deepEqual(cf2.notes.map((x) => x.corrigee), [0, 0, 0, 0]);
  assert.equal(cf2.cfp, 0);
});

test("NEPSY-II : bloc des bilans, compte rendu et diagnostic", () => {
  const d = B.dossierVide ? B.dossierVide() : {};
  d.naissance = "2017-03-01"; d.passation = "2026-10-27";
  d.tests = d.tests || {};
  const t = B.TESTS.find((x) => x.id === "nepsy2");
  assert.ok(t);
  d.tests.nepsy2 = { fait: "oui", notes: "", lignes: t.lignes.map((l) => ({ id: l[0], epreuve: l[1], type: l[2], valeur: l[0] === "cubes" ? "5" : "", moy: "", et: "", sens: "haut", commentaire: "" })) };
  d.nepsy = { cubes: { total: 9 }, cf: { rpCfg: "11-25", comparaison: 7 } };
  const r = B.calculerTests(d, B.reglagesParDefaut()).find((x) => x.id === "nepsy2");
  const cubes = r.lignes.find((l) => l.epreuve === "Cubes");
  assert.ok(Math.abs(cubes.ds - (-5 / 3)) < 1e-9);
  assert.deepEqual(cubes.complement, ["note totale 9/28"]);
  const cfp = r.lignes.find((l) => l.epreuve === "Copie de figures (Processus)");
  assert.deepEqual(cfp.complement, ["rang percentile de la note Général 11-25", "note étalonnée de comparaison Global / Local 7"]);
});
