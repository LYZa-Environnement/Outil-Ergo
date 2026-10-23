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
  const ligne1 = tab.lignes.find((l) => l.cellules[0].runs[0].t === "1. Question saisie par l'ergo");
  assert.ok(ligne1);
  assert.equal(ligne1.cellules[5].runs[0].t, "X");
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

/* ---------- Bilans centrés sur l'occupation, réévaluation, synthèse école ---------- */

const O = require("../js/occupation.js");

test("DCDQ : facteurs, total et seuil selon l'âge", () => {
  const rep = {};
  for (let i = 1; i <= 15; i++) rep[i] = 3;
  const q = O.calculDcdq({ reponses: rep }, 8 * 12 + 7);
  assert.deepEqual(q.facteurs.map((f) => [f.total, f.max]), [[18, 30], [12, 20], [15, 25]]);
  assert.equal(q.total, 45);
  assert.equal(q.bande.seuil, 55);
  assert.equal(q.indication, true);
  assert.equal(O.calculDcdq({ reponses: rep }, 6 * 12).indication, true); // 45 ≤ 46
  rep[1] = 5; rep[2] = 5;
  assert.equal(O.calculDcdq({ reponses: rep }, 6 * 12).indication, false); // 49 > 46
  delete rep[3];
  assert.equal(O.calculDcdq({ reponses: rep }, 6 * 12).indication, null); // incomplet
  assert.equal(O.calculDcdq({ reponses: rep }, null).bande, null);
});

test("DCDQ : constat, raison praxies et ligne du tableau récapitulatif", () => {
  const rep = {};
  for (let i = 1; i <= 15; i++) rep[i] = 2;
  const d = dossierTest({ dcdq: { fait: "oui", repondant: "la maman", reponses: rep, notes: "" } });
  const t = B.rediger(d, reglagesTest());
  assert.match(t.complementaires, /Score total : 30\/75/);
  assert.match(t.complementaires, /en faveur d'un trouble développemental de la coordination \(seuil : 55\)/);
  assert.match(t.conclusion, /DCDQ en faveur/);
  const p = B.proposerPreconisations(d, reglagesTest()).find((x) => x.id === "reed-praxies");
  assert.match(p.raison, /DCDQ 30\/75/);
  const m = B.modeleDocument(d, reglagesTest());
  const recap = m.blocs.filter((b) => b.type === "tableau").map((b) => JSON.stringify(b)).join("");
  assert.match(recap, /En faveur d'un TDC/);
});

test("MCRO : moyennes, réévaluation et tableau", () => {
  const mcro = O.vide().mcro;
  mcro.fait = "oui";
  mcro.problemes[0] = { activite: "Faire ses lacets", importance: "9", rendement1: "3", satisfaction1: "2", rendement2: "7", satisfaction2: "6" };
  mcro.problemes[1] = { activite: "Écrire lisiblement", importance: "8", rendement1: "4", satisfaction1: "5", rendement2: "5", satisfaction2: "5" };
  const c = O.calculMcro(mcro);
  assert.equal(c.r1, 3.5);
  assert.equal(c.s2, 5.5);
  const d = dossierTest({ mcro: mcro });
  const t = B.rediger(d, reglagesTest());
  assert.match(t.mcro, /rendement 3,5\/10, satisfaction 3,5\/10/);
  assert.match(t.mcro, /rendement 6,0\/10 \(\+2,5\)/);
  assert.match(t.mcro, /cliniquement significative/);
  assert.match(t.preconisations, /Améliorer le rendement et la satisfaction de Léa pour : faire ses lacets/);
  const m = B.modeleDocument(d, reglagesTest());
  const i = m.blocs.findIndex((b) => b.type === "h" && /MCRO/.test(b.texte));
  assert.ok(i > 0);
  const tab = m.blocs.slice(i).find((b) => b.type === "tableau");
  assert.equal(tab.lignes.length, 4);
  assert.equal(tab.lignes[0].cellules.length, 6);
});

test("grille d'autonomie : texte « À la maison », occupations et préconisations", () => {
  const d = dossierTest({ avq: { "habillage-lacets": "aide-partielle", "habillage-chaussures": "autonome", "repas-couteau": "non-acquis", "scolaire-cartable": "lent" } });
  const t = B.rediger(d, reglagesTest());
  assert.match(t.maison, /Habillage : Autonome pour mettre ses chaussures ; a besoin d'une aide partielle pour faire ses lacets\./);
  assert.match(t.maison, /Alimentation : Ne sait pas encore couper ses aliments au couteau\./);
  assert.match(t.maison, /Sommeil : RAS/);
  assert.match(t.ecole, /Autonomie en classe : Autonome mais lente pour préparer son cartable\./);
  assert.match(t.conclusion, /difficultés dans l'habillage et les repas/);
  assert.match(t.bilans, /Grille d'autonomie/);
  const p = B.proposerPreconisations(d, reglagesTest()).find((x) => x.id === "adaptations");
  assert.match(p.raison, /faire ses lacets/);
});

test("OT'Hope et tri de cartes : résultats, objectifs et raisons", () => {
  const d = dossierTest({
    othope: { fait: "oui", notes: "", items: [{ activite: "Faire du vélo", niveau: "non", objectif: "oui" }, { activite: "Dessiner", niveau: "sait", objectif: "" }] },
    cartes: {
      activites: { fait: "oui", date: "2026-10-20", choix: ["a-lacets"], exclues: [], notes: "", resultats: [
        { id: "a-lacets", enfant: "Faire mes lacets", rapport: "faire ses lacets", emoji: "👟", theme: "soins", pile: "difficile" },
        { id: "a-velo", enfant: "Faire du vélo", rapport: "faire du vélo", emoji: "🚲", theme: "loisirs", pile: "facile" }] },
      sensoriel: { fait: "oui", date: "", choix: ["s-cantine"], exclues: [], notes: "", resultats: [
        { id: "s-cantine", enfant: "Le bruit à la cantine", rapport: "le bruit à la cantine", emoji: "", theme: "auditif", pile: "naime" },
        { id: "s-calins", enfant: "Les câlins", rapport: "les câlins", emoji: "", theme: "tactile", pile: "aime" }] },
    },
  });
  const t = B.rediger(d, reglagesTest());
  assert.match(t.othope, /– Ne sait pas faire : faire du vélo\./);
  assert.match(t.othope, /Objectifs choisis par Léa : faire du vélo\./);
  assert.match(t.cartesActivites, /a classé 2 cartes/);
  assert.match(t.cartesActivites, /– Difficile : faire ses lacets\./);
  assert.match(t.cartesActivites, /voudrait mieux réussir : faire ses lacets/);
  assert.match(t.cartesSensoriel, /Ce que Léa n'aime pas : le bruit à la cantine/);
  assert.match(t.preconisations, /Faire du vélo \(objectif choisi par Léa\)/);
  assert.match(t.preconisations, /Mieux vivre les situations qui gênent Léa : le bruit à la cantine/);
  const casque = B.proposerPreconisations(d, reglagesTest()).find((x) => x.id === "casque");
  assert.match(casque.raison, /bruits \(tri de cartes/);
  // Les résultats restent lisibles même sans les définitions des cartes.
  const n = B.normaliserDossier(JSON.parse(JSON.stringify(d)));
  assert.equal(n.cartes.activites.resultats[0].rapport, "faire ses lacets");
  assert.deepEqual(n.cartes.sensoriel.choix, ["s-cantine"]);
});

test("cartes personnelles : validation et ajout au jeu", () => {
  const perso = O.normaliserCartesPerso([{ jeu: "activites", texte: "Jouer du piano" }, { jeu: "inconnu", texte: "x" }, { jeu: "sensoriel", texte: "  " }]);
  assert.equal(perso.length, 1);
  assert.match(perso[0].id, /^p-/);
  const cartes = O.cartesDuJeu("activites", perso);
  assert.equal(cartes.length, O.JEUX.activites.cartes.length + 1);
  assert.equal(cartes[cartes.length - 1].rapport, "jouer du piano");
  assert.equal(B.normaliserReglages({ cartesPerso: perso }).cartesPerso.length, 1);
});

test("réévaluation : comparaison avec le bilan précédent", () => {
  const reg = reglagesTest();
  const avant = dossierTest({ passation: "2026-04-20", vitesse: "90", lignes: { 3: [1, 1, 1, 1, 1], 7: [1, 1, 1, 1, 0], 11: [1, 1, 0, 0, 0] } });
  avant.tests.dtvp3.fait = "oui";
  avant.tests.dtvp3.lignes[0].valeur = "6";
  avant.tests.dtvp3.lignes[0].type = "ns";
  const snap = B.instantane(avant, reg);
  assert.ok(snap.mesures.some((m) => m.cle === "bhk-vitesse"));
  const apres = dossierTest({ precedent: JSON.parse(JSON.stringify(snap)) });
  apres.tests.dtvp3.fait = "oui";
  apres.tests.dtvp3.lignes[0].valeur = "7";
  apres.tests.dtvp3.lignes[0].type = "ns";
  const e = B.evolution(apres, reg);
  const v = e.lignes.find((x) => x.epreuve === "Vitesse");
  assert.equal(v.tendance, "progres"); // (110 − 90) / 40 = +0,5 DS
  assert.equal(e.lignes.find((x) => x.bilan === "DTVP-3").tendance, "stable");
  const t = B.rediger(apres, reg);
  assert.match(t.evolution, /Comparaison avec le bilan du 20\/04\/2026 \(CE2\)/);
  assert.match(t.evolution, /– En progrès : qualité \(BHK\) et vitesse \(BHK\)\./);
  assert.match(t.conclusion, /Évolution depuis le bilan du 20\/04\/2026/);
  const m = B.modeleDocument(apres, reg);
  assert.ok(m.blocs.some((b) => b.type === "tableau" && JSON.stringify(b).indexOf("Bilan du 20/04/2026") >= 0));
  assert.equal(B.normaliserDossier({}).precedent, null);
});

test("synthèse pour l'école : sans données familiales, avec aménagements", () => {
  const d = dossierTest({ parents: "M. et Mme Martin", adresse: "1 rue des Lilas", envFamilial: "Parents séparés", devTrajectoire: "Prématurité",
    amenagements: ["temps", "reed-graphisme", "casque"], dispositif: "PAP", reevaluation: "6 mois", conclusionForces: "volontaire", vitesse: "60" });
  const reg = reglagesTest();
  reg.praticiens[0].nom = "Camille Ergo";
  reg.praticiens[0].tel = "06 00 00 00 00";
  const m = B.modeleSyntheseEcole(d, reg);
  const tout = JSON.stringify(m);
  ["Lilas", "séparés", "Prématurité", "M. et Mme"].forEach((x) => assert.ok(tout.indexOf(x) < 0, x));
  assert.match(tout, /Accorder un tiers-temps/);
  assert.match(tout, /formaliser dans un PAP/);
  assert.match(tout, /Un accompagnement en ergothérapie est proposé : ","b":true\},\{"t":"rééducation graphique/);
  assert.match(tout, /réévaluation est prévue dans 6 mois/);
  assert.match(tout, /06 00 00 00 00/);
  assert.match(tout, /Volontaire/);
  const zip = D.construire(m);
  assert.equal(zip[0], 0x50);
});

/* ---------- ESO détaillé, graphiques, plan de suivi ---------- */

const S = require("../js/sensoriel.js");
const U = require("../js/suivi.js");

test("ESO : lecture des libellés collés (texte fictif) et réponses détaillées", () => {
  const bloc = (titre, n) => [titre].concat(Array.from({ length: n }, (_, i) => (i + 1) + " Question fictive " + titre.charAt(0) + (i + 1) + "   0 1 2 3 4 5 6 7 8 9 10")).join("\n");
  const t = ["Titre du questionnaire", bloc("SOINS PERSONNELS", 36), "Mention de bas de page", bloc("TRAVAIL SCOLAIRE", 36), bloc("LOISIRS", 36)].join("\n");
  const l = S.lireLibellesEso(t);
  assert.deepEqual([l.sp.length, l.p.length, l.l.length], [36, 36, 36]);
  assert.equal(l.sp[0], "Question fictive S1");
  assert.equal(l.l[35], "Question fictive L36");
  // Numéro seul sur sa ligne (autre format de copie)
  const l2 = S.lireLibellesEso("SOINS PERSONNELS\n1\nPremière question\n0\n1 2 3 4 5 6 7 8 9 10\n2\nDeuxième question\n");
  assert.deepEqual(l2.sp, ["Première question", "Deuxième question"]);
  const e = S.normaliser({ eso: { fait: "oui", items: { sp: { 1: "9", 2: 1, 3: "12", 40: 5 } } } }).eso;
  assert.deepEqual(e.items.sp, { 1: 9, 2: 1 });
  const items = S.itemsEso(e, { sp: ["A", "B"] });
  assert.equal(items[0].n, 2);
  assert.equal(items[0].moyenne, 5);
  assert.equal(items[0].forts[0].libelle, "A");
  assert.ok(S.aDesDonnees(S.normaliser({ eso: e }), "eso-items"));
  assert.match(S.rediger(S.normaliser({ eso: e }), B.accords({ prenom: "Léa", sexe: "F" })).eso, /soins personnels 2\/36 réponses\. \[Cotation à reporter ou à calculer avec la grille du cabinet\.\]/);
});

test("graphiques du compte rendu : données préparées", () => {
  const reg = reglagesTest();
  const d = dossierTest();
  d.tests.dtvp3.fait = "oui";
  d.tests.dtvp3.lignes[0].type = "ns";
  d.tests.dtvp3.lignes[0].valeur = "4";
  const g = B.donneesGraphiques(d, reg);
  assert.equal(g["profil-ds"].lignes.length, 3);
  assert.equal(g["bhk-criteres"].criteres.length, 13);
  assert.equal(g.mcro, null);
  const m = B.modeleDocument(d, reg);
  const ids = m.blocs.filter((b) => b.type === "graphique").map((b) => b.id);
  assert.ok(ids.indexOf("profil-ds") >= 0 && ids.indexOf("bhk-criteres") >= 0);
});

test("plan de suivi : axes justifiés, calendrier toutes les deux semaines, document", () => {
  const reg = reglagesTest();
  const d = dossierTest({ reevaluation: "6 mois", objectifsLibre: "Écrire plus lisiblement", avq: { "habillage-lacets": "aide-partielle" } });
  const p = U.planning(d, reg);
  assert.equal(p.parametres.frequence, 14);
  assert.equal(p.parametres.debut, "2026-11-03");
  assert.equal(p.seances.length, 13);
  assert.equal(p.seances[1].date, "2026-11-17");
  assert.equal(p.seances[0].phase, "Lancement");
  assert.equal(p.seances[12].phase, "Réévaluation");
  assert.ok(p.seances.some((s) => s.phase === "Point d'étape"));
  const axes = p.axes.map((a) => a.id);
  assert.ok(axes.indexOf("vitesse") >= 0 && axes.indexOf("autonomie") >= 0);
  // Réglages du plan : chaque semaine, 6 séances, un axe retiré
  d.suivi = { debut: "2026-11-02", frequence: "7", nombre: "6", duree: "60", exclus: ["autonomie"], notes: "" };
  const p2 = U.planning(d, reg);
  assert.equal(p2.seances.length, 6);
  assert.equal(p2.seances[5].date, "2026-12-07");
  assert.ok(p2.axes.every((a) => a.id !== "autonomie"));
  const m = U.modeleSuivi(d, reg);
  const tout = JSON.stringify(m);
  assert.match(tout, /Plan de suivi en ergothérapie/);
  assert.match(tout, /Exercices à faire à la maison/);
  assert.match(tout, /échelles d'atteinte \(GAS\)/);
  assert.equal(D.construire(m)[0], 0x50);
  // Champs du plan gardés dans le dossier
  assert.equal(B.normaliserDossier(JSON.parse(JSON.stringify(d))).suivi.frequence, "7");
});

/* ---------- Analyse locale de la photo, repères TDC, carnet pour les parents ---------- */

const A = require("../js/analyse.js");

// Fausse photo : feuille A4 claire sur fond gris, « mots » faits de lettres rectangulaires.
function fausseCopie(o) {
  const W = 1500, H = 2100, s = 6, x0 = 120, y0 = 80, pw = 210 * s, ph = 297 * s;
  const data = new Uint8ClampedArray(W * H * 4);
  const pose = (x, y, v) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) pose(x, y, x >= x0 && x < x0 + pw && y >= y0 && y < y0 + ph ? 245 : 110);
  const xh = Math.round(o.xhMm * s);
  for (let ligne = 0; ligne < 6; ligne++) {
    const base = y0 + Math.round((40 + 12 * ligne) * s);
    let x = x0 + Math.round((20 + o.deriveMm * ligne) * s);
    for (let mot = 0; mot < 7; mot++) {
      const dy = ligne === o.dansante ? [0, 0.8, -0.7, 0.9, -0.8, 0.7, -0.6][mot] * xh : 0;
      for (let lettre = 0; lettre < 4; lettre++) {
        const haut = lettre === 1 ? Math.round(2.2 * xh) : xh;      // une lettre à hampe par mot
        for (let yy = 0; yy < haut; yy++) for (let xx = 0; xx < Math.round(0.6 * xh); xx++) pose(x + xx, Math.round(base + dy - yy), 30);
        x += Math.round(0.8 * xh);
      }
      x += Math.round(1.6 * xh);
    }
  }
  return { width: W, height: H, data: data };
}

test("analyse locale de la photo : feuille, taille des lettres, marge et lignes non planes", () => {
  const r = A.analyser(fausseCopie({ xhMm: 3.5, deriveMm: 2, dansante: 2 }), { pentesMarge: [0.05, 0.1, 0.2, 0.3, 0.4] }); // pentes fictives
  assert.ok(r.ok, r.message);
  assert.ok(r.feuille.detectee && r.feuille.entiere);
  assert.ok(Math.abs(r.feuille.pxParMm - 6) < 0.1);
  assert.equal(r.nbLignes, 6);
  assert.ok(Math.abs(r.tailleMm - 3.5) < 0.6, "taille " + r.tailleMm);
  assert.ok(Math.abs(r.marge.deriveMm - 10) < 1, "dérive " + r.marge.deriveMm);
  assert.equal(r.marge.points, 2);
  assert.deepEqual(r.lignes.map((l) => l.nonPlane), [false, false, true, false, false, false]);
  // Sans les pentes du calque, pas de points proposés pour le critère 2.
  assert.equal(A.analyser(fausseCopie({ xhMm: 3, deriveMm: 0, dansante: -1 })).marge.points, null);
  // Image vide : pas de ligne d'écriture.
  const vide = fausseCopie({ xhMm: 3, deriveMm: 0, dansante: -1 });
  for (let i = 0; i < vide.data.length; i += 4) if (vide.data[i] === 30) vide.data[i] = vide.data[i + 1] = vide.data[i + 2] = 245;
  assert.equal(A.analyser(vide).ok, false);
});

test("repères TDC : critères I à IV, mention d'ajout et source", () => {
  const reg = reglagesTest();
  const d = dossierTest({ tdc: { fait: "oui", debut: "oui", exclusion: "", notes: "" } });
  d.tests.mabc3.fait = "oui";
  d.tests.mabc3.lignes[3].valeur = "5"; // note standard 5 : environ 5e percentile
  const rep = {};
  for (let i = 1; i <= 15; i++) rep[i] = 2;
  d.dcdq = { fait: "oui", repondant: "", notes: "", reponses: rep };
  const t = B.reperesTdc(d, reg);
  assert.deepEqual(t.criteres.map((c) => c.etat), ["oui", "oui", "oui", "?"]);
  assert.equal(t.conclusion, "Les critères I, II et III sont réunis ; le critère IV reste à vérifier. Une consultation médicale est conseillée.");
  const txt = B.rediger(d, reg).complementaires;
  assert.match(txt, /Ajout, à titre indicatif/);
  assert.match(txt, /doi\.org\/10\.1111\/dmcn\.14132/);
  assert.match(txt, /Le diagnostic de TDC est médical/);
  // Note standard 9 : au-dessus du 16e percentile, critère I non rempli.
  d.tests.mabc3.lignes[3].valeur = "9";
  assert.equal(B.reperesTdc(d, reg).criteres[0].etat, "non");
  assert.match(B.reperesTdc(d, reg).conclusion, /ne réunissent pas/);
  assert.equal(B.normaliserDossier(JSON.parse(JSON.stringify(d))).tdc.debut, "oui");
});

test("carnet d'activités pour les parents : activités des axes retenus et tableaux de la semaine", () => {
  const reg = reglagesTest();
  reg.praticiens[0].nom = "Camille Ergo";
  const d = dossierTest({ avq: { "habillage-lacets": "aide-partielle" }, envFamilial: "Parents séparés" });
  const m = U.modeleLivret(d, reg);
  const tout = JSON.stringify(m);
  assert.match(tout, /Mon carnet d'activités : Léa/);
  assert.match(tout, /Pour faire seul au quotidien/);
  assert.match(tout, /Mon tableau, semaine 2/);
  assert.match(tout, /Camille Ergo/);
  assert.ok(tout.indexOf("séparés") < 0);
  assert.equal(D.construire(m)[0], 0x50);
});

/* ---------- Accueil adapté, plateforme TND, journal des séances, passations adaptées ---------- */

const Acc = require("../js/accueil.js");

function tousLesTextes(d, reg) {
  const r = B.rediger(d, reg);
  return Object.keys(r).map((k) => r[k]).join("\n") + JSON.stringify(B.modeleDocument(d, reg)) + JSON.stringify(B.modeleSyntheseEcole(d, reg));
}

test("accueil adapté : la raison reste interne, sauf choix explicite", () => {
  const reg = reglagesTest();
  const d = dossierTest();
  d.adaptation = Object.assign(Acc.adaptationVide(), { actif: "oui", raison: "tsa-suspecte" });
  assert.ok(!/autis|TSA/i.test(tousLesTextes(d, reg)));
  assert.match(JSON.stringify(U.modeleSuivi(d, reg)), /Raison \(information interne\) : ","b":true\},\{"t":"TSA suspecté/);
  assert.match(JSON.stringify(U.modeleSuivi(d, reg)), /recommandations de la HAS sur l'autisme/);
  // Phrase d'orientation : neutre, sans parler d'autisme.
  d.adaptation.phraseOrientation = "oui";
  const pre = B.rediger(d, reg).preconisations;
  assert.match(pre, /un avis médical est conseillé/);
  assert.ok(!/autis/i.test(pre));
  // Déjà suivie par la plateforme : pas de phrase d'orientation, mais le cadre et les destinataires.
  d.pco = Object.assign(Acc.pcoVide(), { actif: "oui", plateforme: "PCO TND 50", medecin: "Dr Durand" });
  assert.ok(!/avis médical/.test(B.rediger(d, reg).preconisations));
  const cr = JSON.stringify(B.modeleDocument(d, reg));
  assert.match(cr, /plateforme de coordination et d'orientation des troubles du neurodéveloppement \(PCO TND 50\)/);
  assert.match(cr, /La famille, le médecin traitant \(Dr Durand\) et la plateforme/);
  assert.ok(!/plateforme/.test(JSON.stringify(B.modeleSyntheseEcole(d, reg))));
  // Diagnostic posé : mentionné seulement si la case est cochée.
  d.adaptation.raison = "tsa";
  assert.ok(!/autis/i.test(B.rediger(d, reg).conclusion));
  d.adaptation.mentionDiagnostic = "oui";
  assert.match(B.rediger(d, reg).conclusion, /Un diagnostic de trouble du spectre de l'autisme a été posé\./);
  // « Autre besoin » : pas de repères HAS sur l'autisme dans le plan de suivi.
  d.adaptation.raison = "autre";
  assert.ok(!/HAS sur l'autisme/.test(JSON.stringify(U.modeleSuivi(d, reg))));
});

test("passation adaptée : phrase de prudence dans le BHK et les autres épreuves", () => {
  const reg = reglagesTest();
  const d = dossierTest();
  d.passations = { bhk: { pauses: "oui", consignes: "oui", autre: "" }, lespargot: { plusieursFois: "oui" } };
  d.tests.lespargot.fait = "oui";
  d.tests.lespargot.lignes[0].valeur = "-1";
  const r = B.rediger(d, reg);
  assert.match(r.bhk, /Passation adaptée \(pauses, consignes montrées ou en images\) : les résultats sont à interpréter avec prudence/);
  assert.match(r.vitesse, /Passation adaptée \(passation en plusieurs fois\)/);
  const n = B.normaliserDossier(JSON.parse(JSON.stringify(Object.assign(d, { passations: Object.assign(d.passations, { vide: { pauses: "" } }) }))));
  assert.deepEqual(Object.keys(n.passations).sort(), ["bhk", "lespargot"]);
  assert.match(JSON.stringify(U.modeleSuivi(d, reg)), /Passations adaptées/);
});

test("plateforme TND : séances comptées, échéance et rappel du renouvellement", () => {
  const d = B.normaliserDossier(Object.assign(dossierTest(), {
    pco: { actif: "oui", debut: "2026-01-10", formule: "35" },
    seances: [{ date: "2026-09-01" }, { date: "2026-02-01" }, { date: "2025-12-01" }, { date: "" }],
  }));
  let e = Acc.etatPco(d, "2026-10-21");
  assert.equal(e.faites, 2);
  assert.equal(e.prevues, 35);
  assert.equal(e.echeance, "2027-01-10");
  assert.equal(e.alerte, "");
  e = Acc.etatPco(d, "2026-12-01");
  assert.match(e.alerte, /demandez le renouvellement/);
  d.pco.renouvele = "oui";
  e = Acc.etatPco(d, "2026-12-01");
  assert.equal(e.echeance, "2028-01-10");
  assert.equal(Acc.etatPco(d, "2028-01-11").alerte, "Le forfait est arrivé à échéance.");
});

test("journal des séances : saisie rapide, rappel et plan de suivi", () => {
  const reg = reglagesTest();
  const d = dossierTest({ adaptation: Object.assign(Acc.adaptationVide(), { actif: "oui", raison: "autre" }) });
  d.seances = [
    { date: "2026-11-05", axes: { graphisme: "oui", pirate: "non" }, etat: "bien", fait: "grands tracés", prochaine: "reprendre les boucles", aide: "minuteur visuel", difficile: "attendre" },
    { date: "2026-10-22", axes: {}, etat: "difficile", fait: "", prochaine: "", aide: "minuteur visuel ; parler de dinosaures", difficile: "" },
  ];
  const n = B.normaliserDossier(d);
  assert.deepEqual(n.seances[0].axes, { graphisme: "oui" });
  assert.deepEqual(Acc.reperesJournal(n, "aide"), ["minuteur visuel", "parler de dinosaures"]);
  assert.ok(Acc.ceQuiAide(n).some((x) => x[0] === "A aidé en séance"));
  d.seances[0].axes = { graphisme: "oui" };
  const plan = JSON.stringify(U.modeleSuivi(d, reg));
  assert.match(plan, /Journal des séances/);
  assert.match(plan, /2 séances faites/);
  assert.match(plan, /Geste graphique et lisibilité/);
  assert.match(plan, /Prochaine fois : reprendre les boucles/);
  assert.match(plan, /😀 Bien/);
});

test("documents d'accueil : questionnaire, ce qui aide, planning en images, ma visite, carnet imagé", () => {
  const reg = reglagesTest();
  reg.praticiens[0].nom = "Camille Ergo";
  reg.cabinet.adresse = "3 rue des Pommiers\n50000 Saint-Lô";
  const d = dossierTest({ adaptation: Object.assign(Acc.adaptationVide(), { actif: "oui", raison: "tsa", visite: { date: "2026-11-04", accompagnant: "maman" } }) });
  d.adaptation.reponses.apaise = "la peluche Bidule";
  d.adaptation.sensibilites = { bruits: "gene", mouvement: "recherche" };
  const q = JSON.stringify(U.modeleQuestionnaire(d, reg));
  assert.match(q, /Qu'est-ce qui apaise votre enfant/);
  assert.ok(q.indexOf("Bidule") < 0);
  const f = JSON.stringify(U.modeleCeQuiAide(d, reg));
  assert.match(f, /la peluche Bidule/);
  assert.match(f, /le gênent : bruits ; recherche : mouvement/);
  assert.ok(!/TSA|autis/i.test(f));
  assert.match(JSON.stringify(U.modelePlanningImages(d, reg)), /✏️/);
  const v = JSON.stringify(U.modeleVisite(d, reg));
  assert.match(v, /Le 4 novembre 2026, je vais voir Camille\. Camille est ergothérapeute\./);
  assert.match(v, /Son cabinet est à Saint-Lô\./);
  assert.match(v, /J'y vais avec maman\./);
  assert.match(JSON.stringify(U.modeleLivret(d, reg)), /😀/);
  ["modeleQuestionnaire", "modeleCeQuiAide", "modelePlanningImages", "modeleVisite", "modeleLivret"].forEach((f) => assert.equal(D.construire(U[f](d, reg))[0], 0x50));
  assert.equal(Acc.villeCabinet("12 av. X\n14000 CAEN CEDEX 4"), "CAEN");
});


/* ---------- Séances : planning ---------- */

const SE = require("../js/seances.js");

test("séances : normalisation, séances anciennes sans statut, identifiants stables", () => {
  const l = SE.normaliserListe([{ date: "2026-10-01", etat: "bien" }, { id: "abc12", date: "2026-11-05", statut: "prevue", heure: "14:30" }, { date: "x", heure: "25:00", statut: "?" }, null]);
  assert.equal(l.length, 3);
  assert.equal(l[0].statut, "faite");
  assert.equal(l[0].id, "x0-2026-10-01");
  assert.equal(SE.normaliserListe([{ date: "2026-10-01" }])[0].id, l[0].id);
  assert.deepEqual([l[1].id, l[1].statut, l[1].heure], ["abc12", "prevue", "14:30"]);
  assert.deepEqual([l[2].date, l[2].heure, l[2].statut], ["", "", "faite"]);
  const v = SE.seanceVide("2026-12-01", { statut: "prevue" });
  assert.match(v.id, /^s[a-z0-9]+$/);
  assert.equal(SE.normaliserSeance(v, 0).id, v.id);
});

test("séances : périodes semaine et mois, navigation", () => {
  let p = SE.periode("semaine", 0, "2026-10-21");
  assert.deepEqual([p.debut, p.fin, p.libelle], ["2026-10-19", "2026-10-25", "Semaine du 19 au 25 octobre"]);
  p = SE.periode("semaine", 2, "2026-10-21");
  assert.deepEqual([p.debut, p.fin, p.libelle], ["2026-11-02", "2026-11-08", "Semaine du 2 au 8 novembre"]);
  p = SE.periode("semaine", 1, "2026-10-21");
  assert.equal(p.libelle, "Semaine du 26 octobre au 1er novembre");
  p = SE.periode("mois", -10, "2026-10-21");
  assert.deepEqual([p.debut, p.fin, p.libelle], ["2025-12-01", "2025-12-31", "Décembre 2025"]);
  assert.equal(SE.decalagePour("semaine", "2026-11-04", "2026-10-21"), 2);
  assert.equal(SE.decalagePour("mois", "2027-01-15", "2026-10-21"), 3);
  assert.equal(SE.libelleJour("2026-10-21"), "Mercredi 21 octobre");
});

test("séances : filtres par enfant, période, statut, praticienne, axe, et regroupement par jour", () => {
  const ligne = (dossierId, enfant, s) => ({ dossierId, enfant, s: SE.normaliserSeance(s, 0) });
  const lignes = [
    ligne("d1", "Léa M.", { id: "a1", date: "2026-10-19", heure: "16:00", statut: "faite", auteur: "Camille", axes: { graphisme: "oui" } }),
    ligne("d2", "Tom B.", { id: "b1", date: "2026-10-19", heure: "09:30", statut: "faite", auteur: "Sacha" }),
    ligne("d1", "Léa M.", { id: "a2", date: "2026-10-23", statut: "prevue", auteur: "Camille" }),
    ligne("d2", "Tom B.", { id: "b2", date: "2026-11-02", statut: "annulee" }),
    ligne("d1", "Léa M.", { id: "a3", date: "2026-09-01", statut: "faite" }),
  ];
  const f = (o) => Object.assign({ enfant: "", periode: "semaine", decalage: 0, statut: "", auteur: "", axe: "", lieu: "" }, o);
  let r = SE.filtrer(lignes, f({}), "2026-10-21");
  assert.deepEqual(r.lignes.map((x) => x.s.id), ["b1", "a1", "a2"]);
  const jours = SE.grouperParJour(r, "2026-10-21");
  assert.equal(jours.length, 6);
  assert.deepEqual(jours.map((j) => j.lignes.length), [2, 0, 0, 0, 1, 0]);
  assert.ok(jours[2].aujourdhui && jours[0].passe);
  assert.deepEqual(SE.filtrer(lignes, f({ enfant: "d1", periode: "toutes" }), "2026-10-21").lignes.map((x) => x.s.id), ["a3", "a1", "a2"]);
  assert.deepEqual(SE.filtrer(lignes, f({ periode: "passees" }), "2026-10-21").lignes.map((x) => x.s.id), ["a1", "b1", "a3"]);
  assert.deepEqual(SE.filtrer(lignes, f({ periode: "avenir" }), "2026-10-21").lignes.map((x) => x.s.id), ["a2", "b2"]);
  assert.deepEqual(SE.filtrer(lignes, f({ periode: "toutes", statut: "annulee" }), "2026-10-21").lignes.map((x) => x.s.id), ["b2"]);
  assert.deepEqual(SE.filtrer(lignes, f({ periode: "toutes", auteur: "Sacha" }), "2026-10-21").lignes.map((x) => x.s.id), ["b1"]);
  assert.deepEqual(SE.filtrer(lignes, f({ periode: "toutes", axe: "graphisme" }), "2026-10-21").lignes.map((x) => x.s.id), ["a1"]);
});

test("séances : résumé de l'enfant, rang dans le plan, programmation sans doublon", () => {
  const l = SE.normaliserListe([
    { id: "s1", date: "2026-10-01", statut: "faite", prochaine: "boucles" },
    { id: "s2", date: "2026-10-08", statut: "annulee" },
    { id: "s3", date: "2026-10-15", statut: "faite", prochaine: "" },
    { id: "s4", date: "2026-10-29", statut: "prevue", heure: "10:00" },
  ]);
  const r = SE.resumeEnfant(l, "2026-10-21");
  assert.deepEqual([r.faites, r.prevues, r.annulees, r.prochaine.id, r.rappel.id], [2, 1, 1, "s4", "s1"]);
  assert.equal(SE.rang(l, l[2]), 2);
  assert.equal(SE.rang(l, l[3]), 3);
  const nouvelles = SE.planifier(l, ["2026-10-15", "2026-10-29", "2026-11-12", "2026-11-26"], { aujourdhui: "2026-10-21", heure: "10:00", auteur: "Camille" });
  assert.deepEqual(nouvelles.map((s) => [s.date, s.statut, s.heure, s.auteur]), [["2026-11-12", "prevue", "10:00", "Camille"], ["2026-11-26", "prevue", "10:00", "Camille"]]);
  // Le forfait de la plateforme ne compte que les séances faites.
  const d = B.normaliserDossier(Object.assign(dossierTest(), { pco: { actif: "oui", debut: "2026-01-10" }, seances: l }));
  assert.equal(Acc.etatPco(d, "2026-10-21").faites, 2);
  // Le plan de suivi liste les séances faites et annonce les séances prévues.
  const plan = JSON.stringify(U.modeleSuivi(Object.assign(dossierTest(), { seances: [{ date: "2026-10-01", statut: "faite" }, { date: "2099-01-05", statut: "prevue", heure: "10:00" }] }), reglagesTest()));
  assert.match(plan, /1 séance faite\. Prochaines séances prévues : 05\/01\/2099 à 10 h 00\./);
});

/* ---------- Partage entre praticiennes et code de verrouillage ---------- */

const P = require("../js/partage.js");
const nodeCrypto = require("node:crypto");

test("verrouillage : SHA-256 conforme, code vérifié, attente après erreurs", () => {
  ["", "abc", "a".repeat(55), "a".repeat(56), "é".repeat(300)].forEach((t) => {
    assert.equal(Buffer.from(P.sha256(new TextEncoder().encode(t))).toString("hex"), nodeCrypto.createHash("sha256").update(t).digest("hex"));
  });
  const v = P.creerVerrou("2580", 10);
  assert.deepEqual([v.longueur, v.delai], [4, 10]);
  assert.ok(P.verifierCode(v, "2580"));
  assert.ok(!P.verifierCode(v, "2581"));
  assert.ok(JSON.stringify(v).indexOf("2580") < 0);
  assert.throws(() => P.creerVerrou("12a4"), /4 à 8 chiffres/);
  assert.equal(P.normaliserDelai("7"), 5);
  assert.equal(P.normaliserDelai("0"), 0);
  assert.deepEqual([4, 5, 6, 7].map(P.attenteApres), [0, 30, 60, 120]);
});

test("partage : fichier protégé par mot de passe", async () => {
  const contenu = { de: "Camille", dossiers: [{ id: "d1", prenom: "Léa", dossier: { prenom: "Léa" } }] };
  const f = await P.emballer(contenu, "pommier-2026");
  assert.equal(f.chiffre, true);
  assert.ok(JSON.stringify(f).indexOf("Léa") < 0);
  assert.deepEqual(await P.deballer(JSON.parse(JSON.stringify(f)), "pommier-2026"), contenu);
  await assert.rejects(P.deballer(f, "faux"), /Mot de passe incorrect/);
  await assert.rejects(P.deballer(f, ""), /protégé/);
  await assert.rejects(P.deballer({ type: "autre" }, "x"), /pas un partage/);
});

test("partage : fusion, version la plus récente gardée et séances réunies", () => {
  const entree = (id, modifieLe, motif, seances) => ({ id, prenom: id === "d1" ? "Léa" : "Tom", modifieLe, dossier: { id, motif, seances } });
  const locaux = [
    entree("d1", "2026-10-20T10:00:00Z", "local", [{ id: "s1", date: "2026-10-01", statut: "faite" }, { id: "s2", date: "2026-10-08", statut: "faite", etat: "bien" }]),
    entree("d2", "2026-10-21T10:00:00Z", "local", [{ id: "t1", date: "2026-10-02" }]),
  ];
  const recus = [
    entree("d1", "2026-10-21T09:00:00Z", "reçu", [{ id: "s2", date: "2026-10-08", statut: "faite", etat: "moyen" }, { id: "s3", date: "2026-10-15", statut: "faite" }]),
    entree("d2", "2026-10-19T10:00:00Z", "reçu", [{ id: "t1", date: "2026-10-02" }, { id: "t2", date: "2026-10-09" }]),
    entree("d3", "2026-10-18T10:00:00Z", "reçu", []),
    entree("d4", "2026-10-18T10:00:00Z", "reçu", null),
  ];
  recus[3].prenom = "Nina";
  const f = P.fusionner(locaux, recus.concat([entree("d2", "2026-10-21T10:00:00Z", "local", [{ id: "t1", date: "2026-10-02" }])]));
  const d1 = f.ecrire.find((x) => x.id === "d1"), d2 = f.ecrire.find((x) => x.id === "d2");
  assert.equal(d1.dossier.motif, "reçu");
  assert.deepEqual(d1.dossier.seances.map((s) => s.id + ":" + (s.etat || "")), ["s1:", "s2:moyen", "s3:"]);
  assert.equal(d2.dossier.motif, "local");
  assert.deepEqual(d2.dossier.seances.map((s) => s.id), ["t1", "t2"]);
  assert.equal(d2.modifieLe, "2026-10-21T10:00:00Z");
  assert.deepEqual(f.resume, { ajouts: 2, misAJour: 1, seancesAjoutees: 2, inchanges: 1 });
  assert.deepEqual(f.lignes.map((x) => x.action), ["maj", "seances", "ajout", "ajout", "inchange"]);
});

/* ---------- Frappe au clavier (EViC) ---------- */

const Cl = require("../js/clavier.js");

test("EViC : mots par minute, comparaison avec la main, compte rendu et préconisations", () => {
  assert.equal(Cl.compterMots("  le chat  dort, sous la table . "), 6);
  const e = Cl.essaiChronometre("le chat dort sous la table", 120, 3, "2026-10-21");
  assert.deepEqual([e.mots, e.duree, e.caracteres, e.corrections, e.outil], ["6", 120, 26, 3, "oui"]);
  const reg = reglagesTest();
  const d = dossierTest();
  d.clavier = { fait: "oui", doigte: "index", regard: "clavier", materiel: "portable", fonctions: { majuscule: "oui", accents: "non" },
    essais: { copie: { mots: "40" }, repetition: { mots: "45", duree: 180 }, dictee: { mots: "25" } }, manuscrit: { copie: "70", repetition: "90" } };
  const r = Cl.resultats(d.clavier);
  assert.deepEqual(r.epreuves.map((x) => Math.round(x.mpm * 10) / 10), [8, 15, 5]);
  assert.deepEqual(r.epreuves.map((x) => x.ratio === null ? null : Math.round(x.ratio * 100)), [57, 83, null]);
  const txt = B.rediger(d, reg);
  assert.match(txt.clavier, /Copie : 8 mots par minute au clavier, contre 14 à la main, soit 57 % de sa vitesse manuscrite\./);
  assert.match(txt.clavier, /Léa tape avec les deux index ; regarde surtout le clavier ; connaît les majuscules ; ne connaît pas encore les accents\./);
  assert.match(txt.clavier, /reste inférieure à la vitesse à la main/);
  assert.match(txt.bilans, /EViC : évaluation de la vitesse de frappe au clavier \(EViC, Lefèvere et Galbiati, 2007\)/);
  assert.match(B.indicateurs(B.normaliserDossier(d), reg).raisons.clavier, /plus lente que l'écriture à la main/);
  assert.ok(B.mesures(d, reg).some((m) => m.cle === "evic-copie" && m.num === 8));
  assert.match(JSON.stringify(U.modeleSuivi(d, reg)), /Repères de l'EViC/);
  // Clavier plus rapide que la main : l'outil numérique est justifié.
  d.clavier.essais.copie.mots = "80";
  assert.match(B.indicateurs(B.normaliserDossier(d), reg).raisons.clavierEfficace, /au moins aussi rapide/);
  assert.match(B.rediger(d, reg).clavier, /atteint ou dépasse la vitesse à la main en copie/);
  // Saisies invalides écartées.
  assert.deepEqual(Object.keys(Cl.normaliser({ essais: { copie: { mots: "abc" }, dictee: { mots: "-3" } } }).essais), []);
});

test("EViC guidé : ordre des épreuves, relevés de la passation, observation et parole de l'enfant", () => {
  assert.deepEqual(Cl.etapesPassation(["dictee", "copie", "main-repetition"]), ["main-repetition", "copie", "dictee"]);
  assert.match(Cl.consigneEnfant("repetition", "bateau"), /Tape le mot « bateau » puis un espace/);
  assert.match(Cl.consigneEnfant("repetition", ""), /que ton ergothérapeute t'a donné/);
  assert.deepEqual(Cl.usage("Élise a vu, le bateau."), { majuscules: 1, accents: 1, ponctuation: 2 });
  assert.equal(Cl.repetitionsCorrectes("bateau Bateau, bateu bateau", "bateau"), 3);
  assert.equal(Cl.repetitionsCorrectes("bateau", ""), null);
  assert.deepEqual(Cl.parMinute([6, 13, 19, 22]), [6, 7, 6, 3]);
  assert.equal(Cl.baisseEnFin([6, 7, 6, 3]), true);
  assert.equal(Cl.baisseEnFin([6, 7, 6, 6]), false);
  const e = Cl.essaiChronometre("bateau bateau bateu", 180, 2, "2026-10-21", { instantanes: [1, 2, 3], pauses: 1, pauseMax: 5.6, interruptions: 1, mot: "bateau" });
  assert.deepEqual([e.motsCorrects, e.mot, e.parMinute.join(","), e.pauses, e.pauseMax, e.interruptions], [2, "bateau", "1,1,1", 1, 6, 1]);
  const reg = reglagesTest();
  const d = dossierTest();
  d.clavier = { fait: "oui", mot: "bateau", passation: "2026-10-21",
    essais: { repetition: e, copie: Cl.essaiChronometre("Le chat dort. Il a vu la tête", 300, 4, "2026-10-21", { instantanes: [3, 6, 8, 9, 9], pauses: 3, pauseMax: 12 }) },
    obs: { mains: "deux", recherche: "cherche", fatigue: "fin", modele: "lettres", inconnu: "x" }, attitude: { concentre: "oui", precipite: "", autre: "oui" },
    enfant: { ressenti: "difficile", prefere: "clavier" } };
  const n = Cl.normaliser(d.clavier);
  assert.deepEqual(n.obs, { mains: "deux", recherche: "cherche", fatigue: "fin", modele: "lettres" });
  assert.deepEqual(n.attitude, { concentre: "oui" });
  const v = Cl.fonctionsVues(n);
  assert.deepEqual(v.vues, ["majuscule", "accents", "ponctuation", "effacer"]);
  const txt = B.rediger(d, reg).clavier;
  assert.match(txt, /Copie : 1,6 mot par minute au clavier ; minute par minute : 3, 3, 2, 1, 0 mots, vitesse en baisse en fin d'épreuve ; 4 corrections ; 3 arrêts de plus de 3 secondes \(le plus long : 12 s\)\./);
  assert.match(txt, /mot tapé correctement 2 fois sur 3/);
  assert.match(txt, /utilise les deux mains ; cherche souvent les touches ; se fatigue en fin d'épreuve ; en copie, revient au modèle lettre par lettre ; reste concentrée/);
  assert.match(txt, /À la fin des épreuves, Léa dit avoir trouvé les épreuves difficiles et préférer écrire au clavier\./);
});

test("EViC : textes de l'outil, consignes, copie exacte et feuille de passation", () => {
  assert.ok(Cl.compterMots(Cl.TEXTES.copie.texte) >= 150, "assez de texte pour 5 minutes");
  assert.ok(Cl.compterMots(Cl.texteDictee()) >= 120);
  assert.equal(Cl.motEffectif({ mot: " " }), "maison");
  assert.match(Cl.consigneEnfant("copie", { texte: "outil" }), /« La cabane du jardin » de ta feuille/);
  assert.match(Cl.consigneEnfant("copie", { texte: "outil", ecran: "oui" }), /en haut de l'écran/);
  assert.match(Cl.consigneEnfant("copie", { texte: "bhk", ecran: "oui" }), /le texte de ta feuille/);
  assert.match(Cl.consigneAdulte("dictee", { texte: "outil" }), /Le marché du samedi/);
  assert.match(Cl.consigneAdulte("dictee", { texte: "bhk" }), /texte du BHK sur votre exemplaire/);
  // Mots recopiés sans erreur : l'ordre compte, majuscules et ponctuation ignorées, le texte peut être recommencé.
  assert.equal(Cl.copieExacte("au fond du jardin de mamie il y a une vielle cabane", Cl.TEXTES.copie.texte), 11);
  assert.equal(Cl.copieExacte("Au fond du jardin", "Au fond du jardin."), 4);
  assert.equal(Cl.copieExacte("Au fond du jardin Au fond", "Au fond du jardin."), 6);
  assert.equal(Cl.copieExacte("l’ouvre", "l'ouvre"), 1);
  const e = Cl.essaiChronometre("Au fond du jardn", 300, 0, "2026-10-21", { modele: Cl.TEXTES.copie.texte });
  assert.equal(e.motsExacts, 3);
  const reg = reglagesTest();
  const d = dossierTest();
  d.clavier = { fait: "oui", texte: "outil", essais: { copie: e } };
  assert.match(B.rediger(d, reg).clavier, /\(copie et dictée sur les textes de l'outil, à la place du texte du BHK\)/);
  assert.match(B.rediger(d, reg).clavier, /3 mots sur 4 recopiés sans erreur/);
  const m = U.modeleEvic(d, reg);
  assert.ok(m.blocs.some((b) => b.type === "saut"));
  assert.ok(JSON.stringify(m).indexOf("Le samedi matin,") >= 0);
  assert.ok(JSON.stringify(m).indexOf("La cabane du jardin") >= 0);
  d.clavier.texte = "bhk";
  const m2 = U.modeleEvic(d, reg);
  assert.ok(!m2.blocs.some((b) => b.type === "saut"), "pas de texte à recopier avec le BHK");
  assert.ok(D.construire(m).length > 1000);
});

test("auto-évaluation : domaines, nombre de réponses par colonne, tableau groupé", () => {
  const d = dossierTest();
  // Réponses fictives ; libellés et domaines fictifs (les vrais restent dans les réglages du cabinet).
  d.auto = { fait: "oui", reponses: { 1: 1, 2: 3, 3: 2, 4: 3, 5: 1, 6: 4 }, notes: "" };
  const reg = reglagesTest();
  reg.autoQuestions = ["A", "B", "C", "D", "E", "F"];
  reg.autoDomaines = ["lisibilite", "lisibilite", "vitesse", "vitesse", "satisfaction", "inconnu"];
  const n = B.normaliserReglages(reg);
  assert.deepEqual(n.autoDomaines, ["lisibilite", "lisibilite", "vitesse", "vitesse", "satisfaction", ""]);
  const sa = B.syntheseAuto(d.auto, n);
  assert.deepEqual(sa.colonnes, [0, 2, 1, 2, 1]);
  assert.deepEqual(sa.domaines.map((x) => [x.id, x.frequentes, x.repondues]), [["lisibilite", 1, 2], ["satisfaction", 0, 1], ["vitesse", 1, 2]]);
  const t = B.rediger(d, n).autoeval;
  assert.match(t, /pour 3 questions sur 6 : lisibilité 1 sur 2, vitesse 1 sur 2, satisfaction et émotions 0 sur 1\./);
  assert.doesNotMatch(t, /Réponses : /); // le nombre de réponses par colonne est dans le tableau du document
  const tab = B.modeleDocument(d, n).blocs.find((b) => b.type === "tableau" && b.lignes[0].cellules[0].runs[0].t === "Question");
  const textes = tab.lignes.map((l) => l.cellules[0].runs[0].t);
  assert.equal(textes[1], "Lisibilité : difficulté fréquente pour 1 question sur 2");
  assert.ok(textes.indexOf("Autres questions") > 0);
  assert.deepEqual(tab.lignes[tab.lignes.length - 1].cellules.slice(1).map((c) => c.runs[0].t), ["0", "2", "1", "2", "1"]);
});

test("auto-appréciation : questionnaire du cabinet intégré, anciens réglages vides complétés", () => {
  const r = B.reglagesParDefaut();
  assert.equal(r.autoQuestions.length, 12);
  assert.match(r.autoNom, /d'après le CHaP/);
  assert.deepEqual(r.autoDomaines.filter((x) => x === "lisibilite").length, 2);
  // Réglages enregistrés avant : libellés vides, ancien nom → questionnaire du cabinet.
  const ancien = B.normaliserReglages({ autoNom: "Questionnaire d'auto-appréciation de l'écriture", autoQuestions: Array(12).fill(""), autoDomaines: Array(12).fill("") });
  assert.equal(ancien.autoQuestions[0], B.QUESTIONS_AUTO[0][0]);
  assert.equal(ancien.autoDomaines[2], "vitesse");
  assert.match(ancien.autoNom, /d'après le CHaP/);
  // Libellés saisis par l'ergo : gardés, sans thématique imposée.
  const perso = B.normaliserReglages({ autoNom: "Mon questionnaire", autoQuestions: ["Q1", "Q2"] });
  assert.deepEqual([perso.autoNom, perso.autoQuestions, perso.autoDomaines], ["Mon questionnaire", ["Q1", "Q2"], ["", ""]]);
});

test("auto-appréciation : synthèse rédigée (profil, lecture des réponses, comparaison avec le bilan)", () => {
  const reg = reglagesTest();
  const d = dossierTest({ sexe: "M", prenom: "Tom", douleurEva: "0" });
  d.auto = { fait: "oui", reponses: { 1: 1, 2: 3, 3: 2, 4: 3, 5: 1, 6: 2, 7: 2, 8: 1, 9: 3, 10: 3, 11: 3, 12: 2 }, notes: "" };
  d.clavier = { enfant: { prefere: "clavier" } };
  const t = B.syntheseAutoTexte(d, reg);
  assert.match(t, /La gêne ressentie par Tom porte surtout sur la vitesse/);
  assert.match(t, /Il se relit sans difficulté mais pense que les autres ont souvent du mal à le relire/);
  assert.match(t, /la copie au tableau, avec ses allers-retours/);
  assert.match(t, /Aucune douleur n'a été relevée pendant la copie/);
  assert.match(t, /ce que confirme sa préférence pour le clavier à l'EViC/);
  assert.match(t, /Pour l'accompagnement : alléger les copies en classe/);
  // Vitesse ressentie comparée au BHK (normes fictives du test).
  const r = B.calculerBHK(d, reg);
  if (r.niveauV) assert.match(t, /(confirmé par le bilan|dans la moyenne)/);
  // Peu de gêne exprimée, fille.
  const f = dossierTest({ sexe: "F", prenom: "Léa" });
  f.auto = { fait: "oui", reponses: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 0, 6: 0, 7: 0, 8: 1, 9: 1, 10: 0, 11: 1, 12: 0 }, notes: "" };
  const tf = B.syntheseAutoTexte(f, reg);
  assert.match(tf, /Léa exprime peu de gêne/);
  assert.match(tf, /Elle ne souhaite pas, pour l'instant, écrire autrement qu'à la main/);
  // Question modifiée par l'ergothérapeute : pas de lecture détaillée de cette question.
  const reg2 = B.normaliserReglages(Object.assign({}, reg, { autoQuestions: reg.autoQuestions.map((q, i) => i === 1 ? "Autre question" : q) }));
  assert.doesNotMatch(B.syntheseAutoTexte(d, reg2), /les autres ont souvent du mal/);
  // La synthèse gardée par le dossier, avec son statut.
  d.auto.notes = t; d.auto.notesAuto = "oui";
  assert.equal(B.normaliserDossier(d).auto.notesAuto, "oui");
});

test("auto-appréciation : version de synthèse dans le compte rendu, analyse détaillée hors compte rendu", () => {
  const reg = reglagesTest();
  const d = dossierTest({ sexe: "M", prenom: "Tom" });
  d.auto = { fait: "oui", reponses: { 1: 1, 2: 3, 3: 2, 4: 3, 5: 1, 6: 2, 7: 1, 8: 1, 9: 3, 10: 3, 11: 3, 12: 1 }, notes: "", synthese: "" };
  const courte = B.syntheseAutoCourte(d, reg);
  assert.match(courte, /^Tom exprime une gêne surtout liée à la vitesse \(copie au tableau, lenteur ressentie, ratures fréquentes\), et dans une moindre mesure à la lisibilité \(écriture difficile à relire pour les autres\)/);
  assert.match(courte, /Il ne souhaite pas, pour l'instant, écrire autrement qu'à la main\./);
  assert.ok(courte.length < B.syntheseAutoTexte(d, reg).length / 2, "nettement plus courte que l'analyse");
  // Compte rendu : la synthèse proposée, pas l'analyse détaillée.
  d.auto.notes = B.syntheseAutoTexte(d, reg); d.auto.notesAuto = "oui";
  let t = B.rediger(d, reg).autoeval;
  assert.match(t, /Tom exprime une gêne surtout liée à la vitesse/);
  assert.doesNotMatch(t, /allers-retours entre le tableau et le cahier/);
  // Synthèse modifiée par l'ergothérapeute : c'est elle qui figure.
  d.auto.synthese = "synthèse revue par l'ergothérapeute"; d.auto.syntheseAuto = "";
  assert.match(B.rediger(d, reg).autoeval, /Synthèse revue par l'ergothérapeute\./);
  // Anciennes notes écrites à la main, sans synthèse : reprises.
  d.auto.synthese = ""; d.auto.notes = "notes écrites avant la synthèse automatique"; d.auto.notesAuto = "";
  assert.match(B.rediger(d, reg).autoeval, /Notes écrites avant la synthèse automatique\./);
  assert.deepEqual([B.normaliserDossier({ auto: { synthese: "x", syntheseAuto: "oui" } }).auto.synthese, B.normaliserDossier({ auto: { syntheseAuto: "oui" } }).auto.syntheseAuto], ["x", "oui"]);
});

test("ESO : cotation à partir des réponses avec une grille (fictive), roues, systèmes, interprétation", () => {
  // Grille fictive (la vraie grille reste dans le fichier du cabinet) : secteurs et systèmes répartis au hasard.
  const secteurs = Array.from({ length: 36 }, (_, i) => S.SECTEURS_ESO[i % 7]);
  const systemes = Array.from({ length: 36 }, (_, i) => (i < 28 ? S.SYSTEMES_ESO[i % 7].id : ""));
  const cle = { secteurs: secteurs, systemes: systemes, sens: { sp: "D".repeat(36), p: "I".repeat(36), l: "DI".repeat(18) } };
  assert.equal(S.normaliserCotationEso({ secteurs: secteurs.slice(1), systemes: systemes, sens: cle.sens }), null);
  assert.equal(S.normaliserCotationEso(Object.assign({}, cle, { sens: { sp: "X".repeat(36), p: "", l: "" } })), null);
  assert.deepEqual([S.pointsEso(0, "D"), S.pointsEso(10, "D"), S.pointsEso(0, "I"), S.pointsEso(5, "I")], [0, 3, 3, 1]);
  const items = { sp: {}, p: {}, l: {} };
  for (let i = 1; i <= 36; i++) { items.sp[i] = 10; items.p[i] = 10; if (i > 2) items.l[i] = i < 5 ? (i % 2 ? 0 : 10) : 10; }
  const c = S.cotationEso({ items: items }, cle);
  assert.equal(c.n, 106);
  assert.equal(c.manquants.l, 2);
  assert.equal(c.roues.sp.SS, 3);  // direct, toujours : 3 points
  assert.equal(c.roues.p.SS, 0);   // inverse, toujours : 0 point
  assert.equal(c.points.sp, "3".repeat(36));
  assert.equal(c.points.l.slice(0, 4), "--00"); // 3 : jamais en sens direct ; 4 : toujours en sens inverse
  assert.equal(c.systemes.audition.sp, 12); // questions 1, 8, 15, 22 : 4 × 3 points
  // Valeurs reportées comme le fait l'outil, puis interprétation
  const e = { fait: "oui", repondant: "sa mère", items: items, roues: { sp: {}, p: {}, l: {} }, systemes: {}, points: c.points };
  S.DOMAINES_ESO.forEach((dm) => S.SECTEURS_ESO.forEach((sc) => { if (c.roues[dm[0]][sc] !== undefined) e.roues[dm[0]][sc] = String(c.roues[dm[0]][sc]).replace(".", ","); }));
  S.SYSTEMES_ESO.forEach((sy) => { e.systemes[sy.id] = { sp: String(c.systemes[sy.id].sp || 0), p: String(c.systemes[sy.id].p || 0), l: String(c.systemes[sy.id].l || 0) }; });
  const s = S.normaliser({ eso: e });
  const t = S.rediger(s, B.accords({ prenom: "Léa", sexe: "F" }), { libelles: { p: Array.from({ length: 36 }, (_, i) => "Situation " + (i + 1)) } }).eso;
  assert.match(t, /Lecture : chaque réponse est cotée de 0 à 3 ; 3 correspond à un engagement adapté/);
  assert.match(t, /– Soins personnels \(moyenne 3,0\/3\) : engagement adapté dans tous les secteurs\./);
  assert.match(t, /– Productivité \(moyenne 0,0\/3\) : difficultés marquées en /);
  assert.match(t, /Le domaine le plus touché est celui de la productivité/);
  assert.match(t, /Situations les plus difficiles selon les parents : travail scolaire : « situation 1 » \(toujours\), « situation 2 » \(toujours\), « situation 3 » \(toujours\)…\n/);
  assert.match(t, /En résumé, le profil ESO de Léa montre /);
  const an = S.analyseEso(s.eso);
  assert.ok(an.systemes.every((x) => x.pourcentage !== null));
  // Diagnostic : un score bas est une difficulté (et non l'inverse).
  const k = S.constats(s);
  assert.ok(k.constats.some((x) => /engagement sensori-occupationnel/.test(x)));
  const tousBons = S.normaliser({ eso: { fait: "oui", roues: { sp: { SS: "3" }, p: { SS: "2,5" }, l: { SS: "3" } }, systemes: { audition: { sp: "12", p: "12", l: "10" } } } });
  assert.equal(S.constats(tousBons).constats.length, 0);
  assert.match(S.rediger(tousBons, B.accords({ prenom: "Léa", sexe: "F" })).eso, /ne montre pas de difficulté notable/);
});
