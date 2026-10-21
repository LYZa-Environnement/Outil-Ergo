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
  assert.match(S.rediger(S.normaliser({ eso: e }), B.accords({ prenom: "Léa", sexe: "F" })).eso, /soins personnels 2\/36 réponses \(moyenne 5,0\/10\)/);
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
