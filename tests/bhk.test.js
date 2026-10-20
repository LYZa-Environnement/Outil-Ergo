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
  assert.match(t.conclusion, /Sur le plan de la personne :\n/);
  assert.match(t.conclusion, /une lenteur d'écriture marquée \(BHK : DS −1,50\)/);
  assert.match(t.conclusion, /des difficultés visuo-perceptives et visuo-motrices \(DTVP-3 : coordination œil-main DS −1,67\)/);
  assert.match(t.conclusion, /Diagnostic ergothérapique : Léa présente des difficultés \[occupations à préciser\], en lien avec une lenteur d'écriture/);
  assert.match(t.conclusion, /Points d'appui : volontaire et attentive ; une bonne prise d'informations visuelles en copie\./);
  assert.match(t.preconisations, /Aménagements scolaires à formaliser dans un PAP :\n– Accorder un tiers-temps .* \(en lien avec la lenteur d'écriture, BHK : DS −1,50\)\./);
  assert.match(t.salutations, /scolarisation de Léa/);
});

test("préconisations proposées d'après les résultats", () => {
  const p = B.proposerPreconisations(dossierTest({ douleurEva: "4" }), reglagesTest());
  const temps = p.find((x) => x.id === "temps");
  assert.match(temps.raison, /lenteur d'écriture \(BHK : DS −1,50\)/);
  assert.match(p.find((x) => x.id === "outil").raison, /EVA 4\/10/);
  assert.equal(p.find((x) => x.id === "casque").raison, "");
});

test("DS par critère avec les normes de chaque critère", () => {
  const reg = reglagesTest();
  reg.normes = B.normaliserNormes(Object.assign({}, reg.normes, { criteres: { 3: { CE2: { F: [2, 1], M: [2.5, 1], E: [2.2, 1] } } } }));
  const r = B.calculerBHK(dossierTest(), reg);
  assert.equal(r.criteres[2].ds, -2); // 4 lignes non planes, moyenne 2, ET 1, signe inversé
  assert.equal(r.criteres[2].niveau, "patho");
  const t = B.rediger(dossierTest(), reg);
  assert.match(t.bhk, /des lignes non planes \(4 lignes sur 5, DS −2,00\)/);
  assert.match(t.bhk, /le critère le plus atypique est lignes non planes \(DS −2,00\)/);
  assert.equal(B.formaterDS(-12), "< −5");
});

test("bilan sensoriel : OTIPIS, Dunn 2, SensOT-dir, et diagnostic", () => {
  const d = B.dossierVide();
  Object.assign(d, { prenom: "Tom", sexe: "M", occDifficultes: ["repas"] });
  d.senso.otipis.fait = "oui";
  Object.assign(d.senso.otipis.scores, { 1: 3, 3: 1, 6: 2, 17: 3, 13: 2 });
  d.senso.dunnEnfant.fait = "oui";
  d.senso.dunnEnfant.lignes = { recherche: { brut: "60", classe: "bp" }, evitement: { brut: "", classe: "c" } };
  d.senso.sensot.fait = "oui";
  d.senso.sensot.themes = { auditif: { gene: "3", neutre: "", plaisir: "" } };
  d.senso.sensot.priorites = [{ situation: "Le bruit de la cantine", theme: "auditif", contexte: "École", frequence: "souvent", intensite: "4", ressenti: "", objectif: "" }];
  const t = B.rediger(d, B.reglagesParDefaut());
  assert.equal(t.bhk, ""); // bilan seulement sensoriel : pas de section BHK
  assert.match(t.otipis, /Modulation sensorielle : 1 item adapté sur 3 ; difficultés marquées en réactions aux stimuli auditifs ; quelques difficultés en niveau d'activité\./);
  assert.match(t.dunn, /recherche beaucoup plus que les autres \(60\)/);
  assert.match(t.dunn, /une recherche de stimulations sensorielles beaucoup plus marquée que chez la plupart des enfants/);
  assert.match(t.sensot, /Le bruit de la cantine \(auditif, école\) : gêne souvent, intensité 4\/5\./);
  assert.match(t.conclusion, /Tom présente des difficultés dans les repas, en lien avec des difficultés de modulation sensorielle/);
  assert.match(t.preconisations, /Diminuer la gêne ressentie dans la situation : le bruit de la cantine\./);
  const p = B.proposerPreconisations(d, B.reglagesParDefaut());
  assert.match(p.find((x) => x.id === "casque").raison, /stimuli auditifs \(OTIPIS\)/);
  const m = B.modeleDocument(d, B.reglagesParDefaut());
  const titres = m.blocs.filter((b) => b.type === "h").map((b) => b.texte);
  assert.ok(titres.indexOf("Bilan sensoriel") >= 0);
  assert.ok(titres.indexOf("Écriture") < 0);
  assert.ok(m.blocs.some((b) => b.type === "graphique" && b.id === "otipis"));
});

test("Exner et Benbow, auto-évaluation", () => {
  const d = dossierTest();
  d.manip = { fait: "oui", md: { "rotation-complexe": 3 }, mg: { "rotation-complexe": 1 }, notes: "" };
  d.auto = { fait: "oui", reponses: { 1: 4, 2: 0, 3: 3 }, notes: "" };
  const reg = reglagesTest();
  reg.autoQuestions[0] = "Question saisie par l'ergo";
  const t = B.rediger(d, reg);
  assert.match(t.complementaires, /Rotation complexe : main droite 3 \(fonctionnel\), main gauche 1 \(en partie\)\./);
  assert.match(t.conclusion, /manipulations dans la main peu fonctionnelles/);
  assert.match(t.autoeval, /difficulté fréquente \(souvent ou toujours\) pour 2 questions sur 3/);
  const m = B.modeleDocument(d, reg);
  const tab = m.blocs.find((b) => b.type === "tableau" && b.lignes[0].cellules[0].runs[0].t === "Question");
  assert.equal(tab.lignes[1].cellules[0].runs[0].t, "Question saisie par l'ergo");
  assert.equal(tab.lignes[1].cellules[5].runs[0].t, "X");
});

test("BHK ado : 9 critères, normes de classe ou tous niveaux", () => {
  const reg = B.reglagesParDefaut();
  reg.normes = B.normaliserNormes({ ado: { qualite: { classe: { "5e": { E: [12, 4] } }, global: { E: [14, 5] } }, vitesse: { classe: { "5e": { E: [370, 60] } } } } });
  const d = Object.assign(B.dossierVide(), { prenom: "Inès", sexe: "F", groupe: "5e", vitesse: "250", lignes: { A: [1, 1, 0, 0, 0], G: [1, 1, 1, 1, 1] } });
  const r = B.calculerBHK(d, reg);
  assert.equal(r.version, "ado");
  assert.equal(r.total, 7);
  assert.equal(r.max, 45);
  assert.equal(r.dsQ, -(7 - 12) / 4);
  assert.equal(r.dsV, (250 - 370) / 60);
  assert.equal(r.mpm, 10);
  const g = B.calculerBHK(Object.assign({}, d, { adoQualite: "global" }), reg);
  assert.equal(g.dsQ, -(7 - 14) / 5);
  const t = B.rediger(d, reg);
  assert.match(t.bhk, /^On observe sur l'épreuve du BHK ado que :/);
  assert.match(t.bhk, /250 caractères en 5 minutes, soit 50,0 caractères par minute \(10,00 mots par minute\)/);
  assert.match(t.bhk, /une instabilité de la forme des mots \(5 phrases sur 5\)/);
  assert.match(t.conclusion, /\(BHK ado : DS −2,00\)/);
  assert.equal(B.titreSection("Copie de texte : {bhk}", d), "Copie de texte : BHK ado");
  const vide = B.calculerBHK(Object.assign(B.dossierVide(), { groupe: "6e" }), reg);
  assert.equal(vide.complet, false);
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
