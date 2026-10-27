// Tests de l'épreuve de copie de Lespargot : npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const LP = require("../js/lespargot.js");
const B = require("../js/bhk.js");

test("textes : un par niveau, mots comptés sans la ponctuation isolée", () => {
  assert.deepEqual(Object.keys(LP.TEXTES), ["CE1", "CE2", "CM1", "CM2", "6e", "4e", "2nde"]);
  assert.equal(LP.motsTexte("CE1"), 20); // « Les rossignols » + 18 mots
  assert.equal(LP.compterMots("Qu’est-ce que le regard ?"), 4);
  assert.equal(LP.compterMots("un « écoutard », ni"), 3);
  assert.equal(LP.textePour("5e"), "6e");
  assert.equal(LP.textePour("3e"), "4e");
  assert.equal(LP.textePour("CP"), "");
});

test("normes de la feuille de cotation", () => {
  assert.deepEqual(LP.NORMES.CE1, [7.6, 2]);
  assert.deepEqual(LP.NORMES.CM2, [14.13, 1.48]);
  assert.deepEqual(LP.NORMES["2nde"], [22.69, 3.38]);
  // 5e et 3e : valeurs intermédiaires
  assert.ok(Math.abs(LP.NORMES["5e"][0] - (LP.NORMES["6e"][0] + LP.NORMES["4e"][0]) / 2) < 0.01);
  assert.ok(Math.abs(LP.NORMES["3e"][0] - (LP.NORMES["4e"][0] + LP.NORMES["2nde"][0]) / 2) < 0.01);
});

test("calcul : mots par minute et DS", () => {
  const c = LP.calcul({ mots: "49", min: "4", sec: "0" }, { classe: "CM1" });
  assert.equal(c.texte, "CM1");
  assert.equal(c.mpm, 12.25);
  assert.equal(c.ds, 0);
  const l = LP.calcul({ mots: "30", min: "3", sec: "" }, { classe: "CE2" });
  assert.equal(l.mpm, 10);
  assert.ok(Math.abs(l.ds - (10 - 9.98) / 1.41) < 1e-9);
  const ado = LP.calcul({ classe: "2nde", mots: "60", min: "4" }, { classe: "3e" });
  assert.equal(ado.texte, "2nde");
  assert.equal(ado.mpm, 15);
  assert.ok(ado.ds < -2);
  assert.equal(LP.calcul({ mots: "20" }, { classe: "CE1" }).mpm, null);
  assert.match(LP.calcul({}, { classe: "CP" }).alerte, /Pas de norme en CP/);
  assert.match(LP.calcul({ mots: "999", min: "1" }, { classe: "CE1" }).alerte, /Plus de mots/);
});

test("intégration : la ligne Copie est calculée, le compte rendu la décrit", () => {
  const d = B.dossierVide();
  d.groupe = "CM2";
  d.tests.lespargot.fait = "oui";
  d.lespargot = { mots: "40", min: "4", sec: "0", obs: "retours fréquents au modèle" };
  const t = B.calculerTests(d, B.reglagesParDefaut()).find((x) => x.id === "lespargot");
  const copie = t.lignes[0];
  assert.equal(copie.epreuve, "Copie");
  assert.ok(Math.abs(copie.ds - (10 - 14.13) / 1.48) < 1e-9);
  assert.equal(copie.niveau, "patho");
  assert.match(copie.valeurTexte, /^40 mots en 4 min, soit 10 mots par minute \(moyenne en CM2 : 14,13 ; écart-type 1,48\)/);
  assert.equal(t.lignes.length, 3);
  const n = B.normaliserDossier(JSON.parse(JSON.stringify(d)));
  assert.equal(n.lespargot.mots, "40");
});
