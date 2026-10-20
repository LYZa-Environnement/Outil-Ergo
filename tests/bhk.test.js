// Tests de la logique du bilan : npm test (ou node --test tests/)
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../js/bhk.js");
const D = require("../js/docx.js");

// Normes fictives (les vraies normes du manuel s'importent dans l'outil, elles ne sont pas dans le dépôt).
function reglagesTest() {
  const r = B.reglagesParDefaut();
  r.normes = B.normaliserNormes({
    qualite: { classe: { CE2: { F: [12, 4], M: [14, 5], E: [13, 4.5] } }, age: { 8: { F: [12, 4], M: [14, 5], E: [13, 4.5] } } },
    vitesse: { classe: { CE2: { F: [170, 40], M: [160, 40], E: [165, 40] } }, age: { 8: { F: [150, 40], M: [150, 40], E: [150, 40] } } },
  });
  return r;
}

function dossierTest(extra) {
  return Object.assign(B.dossierVide(), {
    prenom: "Léa", nom: "Martin", sexe: "F", naissance: "2018-03-15", passation: "2026-10-20", groupe: "CE2",
    tailleMm: "4", c2: "1",
    lignes: { 3: [1, 1, 1, 1, 0], 7: [1, 1, 1, 0, 0], 11: [1, 0, 0, 0, 0] },
    vitesse: "110",
  }, extra || {});
}

test("âge en années et mois", () => {
  assert.deepEqual(B.age("2018-03-15", "2026-10-20"), { ans: 8, mois: 7 });
  assert.deepEqual(B.age("2018-11-25", "2026-10-20"), { ans: 7, mois: 10 });
  assert.equal(B.age("2027-01-01", "2026-10-20"), null);
  assert.equal(B.formaterAge({ ans: 8, mois: 0 }), "8 ans");
});

test("critère 1 : points selon la taille des lettres et la classe", () => {
  assert.equal(B.pointsTaille(5, "CP"), 1);
  assert.equal(B.pointsTaille(4, "CE1"), 0);
  assert.equal(B.pointsTaille(4, "CE2"), 1);
  assert.equal(B.pointsTaille("2,5", "CM1"), 0);
  assert.equal(B.pointsTaille(9.6, "CM2"), 5);
  assert.equal(B.pointsTaille(6, ""), null);
});

test("score total, normes de classe et signe de la qualité", () => {
  const r = B.calculerBHK(dossierTest(), reglagesTest());
  assert.deepEqual(r.scores.slice(0, 3), [1, 1, 4]);
  assert.equal(r.total, 1 + 1 + 4 + 3 + 1);
  assert.ok(r.complet);
  assert.equal(r.normeQ.moy, 12); // filles de CE2
  assert.equal(r.dsQ, -(10 - 12) / 4); // inversé : moins de défauts que la moyenne → DS positif
  assert.equal(r.niveauQ, "moyenne");
  assert.equal(r.dsV, (110 - 170) / 40);
  assert.equal(r.niveauV, "patho");
});

test("normes par âge et ensemble, alerte filles = garçons", () => {
  const r = B.calculerBHK(dossierTest({ reference: "age" }), reglagesTest());
  assert.equal(r.cle, "8");
  assert.ok(r.alerteNormes);
  const e = B.calculerBHK(dossierTest({ reference: "age", normesSexe: "ensemble" }), reglagesTest());
  assert.equal(e.normeQ.moy, 13);
  assert.ok(!e.alerteNormes);
});

test("seuils d'interprétation", () => {
  const reg = B.reglagesParDefaut();
  assert.equal(B.niveau(-1.5, reg), "patho");
  assert.equal(B.niveau(-1.49, reg), "inferieur");
  assert.equal(B.niveau(-1, reg), "inferieur");
  assert.equal(B.niveau(-0.99, reg), "moyenne");
  assert.equal(B.niveau(1, reg), "superieur");
});

test("conversions des scores des autres bilans", () => {
  assert.equal(B.dsLigne({ type: "ns", valeur: "7" }), -1);
  assert.equal(B.dsLigne({ type: "indice", valeur: "85" }), -1);
  assert.ok(Math.abs(B.dsLigne({ type: "rp", valeur: "50" })) < 1e-9);
  assert.ok(Math.abs(B.dsLigne({ type: "rp", valeur: "16" }) + 0.994) < 0.01);
  assert.equal(B.dsLigne({ type: "brut", valeur: "30", moy: "40", et: "5", sens: "haut" }), -2);
  assert.equal(B.dsLigne({ type: "brut", valeur: "30", moy: "40", et: "5", sens: "bas" }), 2);
});

test("légende calculée à partir des seuils", () => {
  const z = B.zonesLegende(B.reglagesParDefaut());
  assert.deepEqual(z.ns, { patho: "≤ 5", inferieur: "6 à 7", moyenne: "8 à 12", superieur: "≥ 13" });
  assert.deepEqual(z.indice, { patho: "≤ 77", inferieur: "78 à 85", moyenne: "86 à 114", superieur: "≥ 115" });
  assert.deepEqual(z.rp, { patho: "≤ 6", inferieur: "7 à 15", moyenne: "16 à 84", superieur: "≥ 85" });
});

test("rédaction : accords, BHK, conclusion, préconisations", () => {
  const d = dossierTest({
    modeCopie: "groupes-lettres", reperage: "bon", douleurEva: "2", remarques: ["miroirs"], fautes: "3",
    amenagements: ["temps"], dispositif: "PAP", reeducation: "oui", conclusionForces: "Volontaire et attentive",
    grille: { "geste.sens": "partiel", "lettres.chiffres": "miroir" },
  });
  d.tests.dtvp3.fait = "oui";
  d.tests.dtvp3.lignes[0].valeur = "5";
  const t = B.rediger(d, reglagesTest());
  assert.match(t.bhk, /Léa copie par groupes de lettres\. Elle ne se perd pas dans le texte/);
  assert.match(t.bhk, /110 caractères en 5 minutes, soit 22,0 caractères par minute\. Elle obtient une déviation standard de −1,50, ce qui la situe très en dessous de la moyenne attendue en CE2 \(zone pathologique\)\./);
  assert.match(t.bhk, /Le score de dégradation est de 10\/65/);
  assert.match(t.bhk, /des lignes non planes \(4 lignes sur 5\), des télescopages \(3 lignes sur 5\)/);
  assert.match(t.bhk, /Remarques : lettres miroirs\./);
  assert.match(t.bhk, /EVA 2\/10/);
  assert.match(t.observation, /Geste graphique : sens de tracé partiellement respecté\./);
  assert.match(t.complementaires, /Coordination œil-main : note standard 5, DS −1,67, très inférieur à la moyenne, pathologique\./);
  assert.match(t.conclusion, /^Léa est une enfant de 8 ans et 7 mois, scolarisée en CE2\./);
  assert.match(t.conclusion, /une lenteur d'écriture marquée \(BHK : DS −1,50\)/);
  assert.match(t.conclusion, /Points d'appui : volontaire et attentive\./);
  assert.match(t.preconisations, /aménagements scolaires soient mis en place \(PAP\) :\n– Accorder un tiers-temps/);
  assert.match(t.salutations, /scolarisation de Léa/);
});

test("rédaction d'un dossier vide sans erreur", () => {
  const t = B.rediger(B.dossierVide(), B.reglagesParDefaut());
  B.SECTIONS.forEach((s) => assert.equal(typeof t[s.id], "string"));
  assert.match(t.motif, /\[Motif du bilan à compléter\.\]/);
});

test("texte vers blocs : libellés en gras, puces, passages à compléter", () => {
  const b = B.texteVersBlocs("Sommeil : RAS\n– un point [à vérifier]\n– un autre");
  assert.equal(b[0].type, "p");
  assert.deepEqual(b[0].runs[0], { t: "Sommeil : ", b: true });
  assert.equal(b[1].type, "puces");
  assert.equal(b[1].items.length, 2);
  assert.ok(b[1].items[0].some((r) => r.surligne));
});

test("le fichier Word est une archive ZIP valide", () => {
  const m = B.modeleDocument(dossierTest(), reglagesTest());
  const octets = D.construire(m);
  assert.equal(octets[0], 0x50); // « PK »
  assert.equal(octets[1], 0x4b);
  assert.equal(D.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.ok(m.blocs.some((b) => b.type === "tableau"));
});
