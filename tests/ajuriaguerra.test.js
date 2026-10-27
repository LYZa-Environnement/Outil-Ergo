// Tests de l'épreuve d'Ajuriaguerra : npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const AJ = require("../js/ajuriaguerra.js");
const B = require("../js/bhk.js");

test("phrases : 20 lettres en CP-CE1, 30 lettres ensuite", () => {
  Object.values(AJ.PHRASES).forEach((p) => assert.equal(p.texte.replace(/[^a-zA-Zéèàù]/g, "").length, p.lettres));
  assert.deepEqual(AJ.phrasesPour("CE1"), ["cheval"]);
  assert.deepEqual(AJ.phrasesPour("CM1"), ["poulain", "parfum"]);
});

test("lettres : phrases entières et lettres de la phrase commencée", () => {
  assert.equal(AJ.lettres("2", "7", 30), 67);
  assert.equal(AJ.lettres("", "57", 30), 57);
  assert.equal(AJ.lettres("", "", 30), null);
});

test("norme par classe et par sexe, pourcentage et gain", () => {
  const c = AJ.calcul({ habPhrases: "2", habLettres: "0", maxPhrases: "3", maxLettres: "0" }, { classe: "CM1", sexe: "F" });
  assert.equal(c.phrase, "poulain");
  assert.equal(c.epreuves[0].norme.moy, 60);
  assert.equal(c.epreuves[0].pct, 100);
  assert.equal(c.epreuves[1].norme.moy, 99);
  assert.equal(c.gain.v, 30);
  assert.equal(c.gain.attendu, 39);
  const g = AJ.calcul({ habLettres: "52" }, { classe: "CM1", sexe: "M" });
  assert.equal(g.epreuves[0].pct, 100);
});

test("norme par âge ; pas de vitesse maximale en CP", () => {
  const c = AJ.calcul({ reference: "age", habLettres: "55" }, { classe: "CE2", ageAns: 9, sexe: "F" });
  assert.equal(c.epreuves[0].norme.moy, 55);
  assert.equal(c.refTexte, "8,5 à 9,5 ans");
  const cp = AJ.calcul({ habLettres: "10", maxLettres: "15" }, { classe: "CP", sexe: "" });
  assert.equal(cp.epreuves[0].norme.moy, 13);
  assert.equal(cp.epreuves[1].norme, null);
  assert.match(cp.alerte, /vitesse maximale/);
});

test("intégration au bilan : lignes, diagnostic et compte rendu", () => {
  const d = Object.assign(B.dossierVide(), { prenom: "Léa", sexe: "F", naissance: "2017-03-15", passation: "2026-10-20", groupe: "CM1" });
  d.tests.ajuriaguerra.fait = "oui";
  d.ajuri = { habPhrases: "1", habLettres: "6", maxPhrases: "1", maxLettres: "20", appHab: "inferieur", appMax: "patho" };
  const t = B.calculerTests(d, B.reglagesParDefaut()).find((x) => x.id === "ajuriaguerra");
  assert.equal(t.lignes.length, 2);
  assert.equal(t.lignes[0].niveau, "inferieur");
  assert.match(t.lignes[0].valeurCourte, /36 lettres\/min, 60 %/);
  const texte = B.rediger(d, B.reglagesParDefaut()).vitesse;
  assert.match(texte, /Le petit poulain gambade dans le pré/);
  assert.match(texte, /En accélérant, Léa gagne 14 lettres/);
  const n = B.normaliserDossier(JSON.parse(JSON.stringify(d)));
  assert.equal(n.ajuri.habLettres, "6");
});
