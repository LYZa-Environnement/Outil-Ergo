/* Tests des questionnaires en PDF à remplir (js/pdf.js, ESO et autonomie au quotidien). Lancer : npm test */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const zlib = require("zlib");
const P = require("../js/pdf.js");
const O = require("../js/occupation.js");
const B = require("../js/bhk.js");

const libelles = (dm) => Array.from({ length: 36 }, (_, i) => "Question fictive " + dm + " " + (i + 1) + (i === 0 ? " avec (parenthèses), barre \\ oblique et un texte assez long pour passer à la ligne" : ""));
const options = { cabinet: ["Cabinet fictif", "1 rue de l'Exemple"], contact: "contact@example.org",
  libelles: { sp: libelles("sp"), p: libelles("p"), l: libelles("l") }, mention: "Document fictif" };
const enTexte = (o) => Buffer.from(o).toString("latin1");
const versOctets = (s) => new Uint8Array(Buffer.from(s, "latin1"));

test("PDF ESO : structure, 108 groupes de cases, modèle vierge sans donnée de l'enfant", () => {
  const o = P.creerFormulaireEso(options);
  const s = enTexte(o);
  assert.ok(s.includes("/T (eso_enfant) /TU") && s.includes("/T (eso_naissance)"));
  assert.ok(!/Enfant : /.test(s));
  assert.ok(s.startsWith("%PDF-1.7"));
  assert.ok(/startxref\n\d+\n%%EOF\n$/.test(s));
  assert.strictEqual((s.match(/\/FT \/Btn \/Ff 49152/g) || []).length, 108);
  assert.ok(s.includes("/T (eso_sp_01)") && s.includes("/T (eso_l_36)") && s.includes("/T (eso_repondant)") && s.includes("/T (eso_date)"));
  // Table des références : chaque position pointe bien sur son objet.
  const xref = Number(/startxref\n(\d+)/.exec(s)[1]);
  const lignes = s.slice(xref).split("\n");
  const n = Number(/^0 (\d+)/.exec(lignes[1])[1]);
  for (let i = 1; i < n; i++) {
    const pos = Number(lignes[2 + i].slice(0, 10));
    assert.ok(s.startsWith(i + " 0 obj", pos), "objet " + i);
  }
});

test("PDF vierge : formulaire reconnu, aucune réponse, type relu", async () => {
  const r = await P.lireFormulaireEso(P.creerFormulaireEso(options));
  assert.strictEqual(r.formulaire, true);
  assert.strictEqual(r.nombre, 0);
  assert.deepStrictEqual(r.meta, { type: "outil-ergo-eso", v: 2 });
  assert.strictEqual(r.repondant, "");
  assert.strictEqual(r.enfant, "");
});

test("Réponses ajoutées par mise à jour incrémentale (Firefox, Acrobat)", async () => {
  let s = enTexte(P.creerFormulaireEso(options));
  // Les lecteurs réécrivent l'objet du champ à la fin du fichier, avec la nouvelle valeur.
  const num = (nom) => Number(new RegExp("(\\d+) 0 obj\\n<< /FT /Btn /Ff 49152 /T \\(" + nom + "\\)").exec(s)[1]);
  s += [["eso_sp_01", "/7"], ["eso_p_12", "/0"], ["eso_l_36", "/10"]]
    .map(([nom, v]) => num(nom) + " 0 obj\n<< /FT /Btn /Ff 49152 /T (" + nom + ") /V " + v + " >>\nendobj\n").join("");
  const numTexte = Number(/(\d+) 0 obj\n<< \/Type \/Annot \/Subtype \/Widget \/FT \/Tx \/T \(eso_repondant\)/.exec(s)[1]);
  s += numTexte + " 0 obj\n<< /Type /Annot /Subtype /Widget /FT /Tx /T (eso_repondant) /V <FEFF004D0061006D0061006E00200028004C00E90061002900> >>\nendobj\n";
  // Une deuxième modification de la même question l'emporte sur la première.
  s += num("eso_sp_01") + " 0 obj\n<< /FT /Btn /Ff 49152 /T (eso_sp_01) /V /8 >>\nendobj\n";
  const r = await P.lireFormulaireEso(versOctets(s));
  assert.strictEqual(r.nombre, 3);
  assert.strictEqual(r.reponses.sp[1], 8);
  assert.strictEqual(r.reponses.p[12], 0);
  assert.strictEqual(r.reponses.l[36], 10);
  assert.strictEqual(r.repondant, "Maman (Léa)");
});

test("Réponses dans un flux d'objets compressé (Aperçu, pdf-lib) et valeur portée par la case", async () => {
  const base = enTexte(P.creerFormulaireEso(options));
  const num = (nom) => Number(new RegExp("(\\d+) 0 obj\\n<< /FT /Btn /Ff 49152 /T \\(" + nom + "\\)").exec(base)[1]);
  const objets = [[num("eso_sp_02"), "<< /FT /Btn /Ff 49152 /T (eso_sp_02) /V /5 >>"], [num("eso_p_01"), "<< /FT /Btn /Ff 49152 /T (eso_p_01) /V /Off >>"]];
  // Case cochée sans /V sur le parent : la valeur vient de /AS.
  const kid = Number(new RegExp("(\\d+) 0 obj\\n<< /Type /Annot /Subtype /Widget /Parent " + num("eso_p_01") + " 0 R").exec(base)[1]);
  objets.push([kid + 3, "<< /Type /Annot /Subtype /Widget /Parent " + num("eso_p_01") + " 0 R /AS /3 >>"]);
  let corps = "", entete = "";
  objets.forEach(([n, o]) => { entete += n + " " + corps.length + " "; corps += o + "\n"; });
  const donnees = zlib.deflateSync(Buffer.from(entete + corps, "latin1"));
  const flux = "900 0 obj\n<< /Type /ObjStm /N " + objets.length + " /First " + entete.length + " /Filter /FlateDecode /Length " + donnees.length + " >>\nstream\n" + donnees.toString("latin1") + "\nendstream\nendobj\n";
  const r = await P.lireFormulaireEso(versOctets(base + flux));
  assert.strictEqual(r.reponses.sp[2], 5);
  assert.strictEqual(r.reponses.p[1], 3);
  assert.strictEqual(r.nombre, 2);
});

test("PDF sans le questionnaire : non reconnu", async () => {
  const r = await P.lireFormulaireEso(versOctets("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"));
  assert.strictEqual(r.formulaire, false);
  assert.strictEqual(r.nombre, 0);
});

test("Texte : encodage WinAnsi et retour à la ligne", () => {
  assert.strictEqual(P.versWinAnsi("œuf – « là » €"), "\x9Cuf \x96 \xAB l\xE0 \xBB \x80");
  const l = P.couper("un deux trois quatre cinq six sept huit neuf dix", 60, 10);
  assert.ok(l.length > 1);
  l.forEach((x) => assert.ok(P.largeur(x, 10) <= 60 || !x.includes(" ")));
});

test("Remplissage par une autre bibliothèque (pdf-lib), si elle est installée", async (t) => {
  let PDFDocument;
  try { ({ PDFDocument } = require("/opt/npm-tools/node_modules/pdf-lib")); } catch (e) { return t.skip("pdf-lib absent"); }
  const doc = await PDFDocument.load(P.creerFormulaireEso(options));
  const form = doc.getForm();
  form.getRadioGroup("eso_sp_03").select("9");
  form.getRadioGroup("eso_l_20").select("0");
  form.getTextField("eso_repondant").setText("Papa");
  form.getTextField("eso_date").setText("12/11/2026");
  form.getTextField("eso_enfant").setText("Léa Martin");
  const r = await P.lireFormulaireEso(await doc.save());
  assert.strictEqual(r.enfant, "Léa Martin");
  assert.strictEqual(r.nombre, 2);
  assert.strictEqual(r.reponses.sp[3], 9);
  assert.strictEqual(r.reponses.l[20], 0);
  assert.strictEqual(r.repondant, "Papa");
  assert.strictEqual(r.date, "12/11/2026");
});

/* ================= Questionnaire d'autonomie (AVQ) ================= */

const libAvq = { titre: "Questionnaire fictif", source: "D'après un questionnaire fictif", domaines: {} };
O.DOMAINES_AVQP.forEach((d) => { libAvq.domaines[d.id] = Array.from({ length: d.n }, (_, i) => "Item fictif " + d.id + " " + (i + 1)); });
const specAvq = () => O.specAvqParents({ libelles: libAvq, cabinet: ["Cabinet fictif"], contact: "contact@example.org", mention: "Document fictif" });

test("PDF AVQ : 86 questions, question d'autonomie, remarques, aides et priorités", () => {
  const s = enTexte(P.creerFormulaire(specAvq()));
  const radios = (s.match(/\/FT \/Btn \/Ff 49152/g) || []).length;
  assert.strictEqual(radios, 86 + 6 + 1); // questions, « autonome ? » de 6 domaines, AESH
  ["avq_habillage_01", "avq_ecole_22_r", "avq_habillage_aides", "avq_complement", "avq_prio_ecole", "avq_prio_ecole_p", "avq_enfant", "avq_classe", "avq_heures"].forEach((n) => assert.ok(s.includes("/T (" + n + ")"), n));
  assert.ok(!s.includes("/T (avq_comportement_auto)"));
});

test("PDF AVQ rempli (pdf-lib) : lecture, synthèse du compte rendu", async (t) => {
  let PDFDocument;
  try { ({ PDFDocument } = require("/opt/npm-tools/node_modules/pdf-lib")); } catch (e) { return t.skip("pdf-lib absent"); }
  const doc = await PDFDocument.load(P.creerFormulaire(specAvq()));
  const f = doc.getForm();
  f.getRadioGroup("avq_habillage_05").select("0");
  f.getRadioGroup("avq_habillage_06").select("2");
  f.getRadioGroup("avq_habillage_01").select("4");
  f.getRadioGroup("avq_comportement_01").select("4"); // « - » : fréquent = difficulté
  f.getRadioGroup("avq_loisirs_08").select("3");      // « 0 » : habitude
  f.getRadioGroup("avq_habillage_auto").select("non");
  f.getRadioGroup("avq_repas_auto").select("oui");
  f.getRadioGroup("avq_aesh").select("oui");
  f.getTextField("avq_heures").setText("12");
  f.getTextField("avq_habillage_05_r").setText("lacets élastiques");
  f.getTextField("avq_habillage_aides").setText("Lacets élastiques, efficace");
  f.getTextField("avq_prio_ecole").setText("1");
  f.getTextField("avq_prio_habillage").setText("2");
  f.getTextField("avq_enfant").setText("Léa MARTIN");
  const lu = await P.lireChampsPdf(await doc.save());
  assert.deepStrictEqual(lu.meta, { type: "outil-ergo-avq", v: 1 });
  const r = O.depuisChampsAvqParents(lu.champs);
  assert.strictEqual(r.nombre, 5);
  const q = r.donnees;
  assert.strictEqual(q.domaines.habillage.reponses[5], 0);
  assert.strictEqual(q.domaines.habillage.autonome, "non");
  assert.strictEqual(q.domaines.habillage.remarques[5], "lacets élastiques");
  assert.strictEqual(q.priorites.ecole.rang, "1");
  assert.strictEqual(q.enfant, "Léa MARTIN");
  const d = B.dossierVide();
  d.prenom = "Léa"; d.sexe = "F";
  d.avqParents = Object.assign(q, { fait: "oui", repondant: "sa mère", date: "2026-11-12" });
  d.avqParents.domaines.habillage.commentaire = "observé aussi en séance";
  d.avqParents.commentaire = "Commentaire général de l'ergothérapeute.";
  const reg = B.reglagesParDefaut();
  reg.avqLibelles = libAvq;
  const t2 = B.rediger(d, reg).avqParents;
  assert.match(t2, /rempli par sa mère le 12\/11\/2026/);
  assert.match(t2, /Léa est autonome pour les repas mais n'est pas autonome pour l'habillage/);
  assert.match(t2, /AESH : 12 h/);
  assert.match(t2, /– Habillage\. Jamais ou rarement : item fictif habillage 5 \(lacets élastiques\)\. Parfois : item fictif habillage 6\. Aides mises en place : Lacets élastiques, efficace\. Observé aussi en séance\./);
  assert.match(t2, /Fréquemment ou toujours : item fictif comportement 1/);
  assert.match(t2, /Activités fréquentes : item fictif loisirs 8/);
  assert.match(t2, /Priorités des parents : 1\. la vie scolaire ; 2\. l'habillage\./);
  assert.match(t2, /Commentaire général de l'ergothérapeute\.$/);
  assert.ok(!/item fictif habillage 1\b/.test(t2)); // « toujours » sur une question « + » : rien à signaler
  assert.match(B.rediger(d, reg).bilans, /Questionnaire sur l'autonomie dans les activités de la vie quotidienne, rempli par sa mère \(d'après un questionnaire fictif\)/);
});

test("AVQ : normalisation du dossier et des réglages", () => {
  const q = O.normaliserAvqParents({ fait: "oui", aesh: "peut-être", domaines: { habillage: { autonome: "oui", reponses: { 1: "3", 2: 9, x: 1 }, remarques: { 1: "  " } } }, priorites: { ecole: { rang: "9" } } });
  assert.deepStrictEqual(q.domaines.habillage.reponses, { 1: 3 });
  assert.deepStrictEqual(q.domaines.habillage.remarques, {});
  assert.strictEqual(q.aesh, "");
  assert.strictEqual(q.priorites.ecole.rang, "");
  const r = B.normaliserReglages({ avqLibelles: libAvq });
  assert.strictEqual(r.avqLibelles.domaines.ecole.length, 22);
  assert.strictEqual(B.normaliserDossier({}).avqParents.fait, "");
});

/* ================= Logo du cabinet ================= */

const JPEG_1PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

test("Logo : lu dans le JPEG et placé en haut des PDF pour les parents", () => {
  const im = P.imageJpeg(JPEG_1PX);
  assert.deepStrictEqual([im.l, im.h, im.espace], [1, 1, "DeviceGray"]);
  assert.strictEqual(P.imageJpeg("data:image/png;base64,iVBORw0KGgo="), null);
  const s = enTexte(P.creerFormulaireEso(Object.assign({ logo: JPEG_1PX }, options)));
  assert.ok(s.includes("/Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /DCTDecode"));
  assert.ok(/\/XObject << \/Logo \d+ 0 R >>/.test(s));
  assert.ok(!enTexte(P.creerFormulaireEso(options)).includes("/Subtype /Image"));
});

test("Logo : dans l'en-tête de tous les documents Word", () => {
  const W = require("../js/docx.js");
  const reg = B.reglagesParDefaut();
  reg.cabinet.nom = "Cabinet fictif";
  reg.logoCabinet = { donnees: JPEG_1PX, l: 300, h: 120 };
  const papier = B.papier(B.normaliserReglages(reg));
  assert.strictEqual(papier.entete.logo.l, 300);
  const z = enTexte(W.construire(Object.assign({ titre: "Essai", blocs: [{ type: "p", runs: [{ t: "Texte" }] }] }, papier)));
  assert.ok(z.includes("word/_rels/header1.xml.rels") && z.includes("word/media/logo.jpeg"));
  const sans = enTexte(W.construire(Object.assign({ titre: "Essai", blocs: [] }, B.papier(B.reglagesParDefaut()))));
  assert.ok(!sans.includes("word/media/logo.jpeg"));
});
