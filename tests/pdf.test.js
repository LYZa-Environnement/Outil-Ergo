/* Tests du questionnaire ESO en PDF à remplir (js/pdf.js). Lancer : node --test tests/ */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const zlib = require("zlib");
const P = require("../js/pdf.js");

const libelles = (dm) => Array.from({ length: 36 }, (_, i) => "Question fictive " + dm + " " + (i + 1) + (i === 0 ? " avec (parenthèses), barre \\ oblique et un texte assez long pour passer à la ligne" : ""));
const options = { enfant: "Léa Martin", naissance: "03/04/2017", cabinet: ["Cabinet fictif", "1 rue de l'Exemple"], contact: "contact@example.org",
  libelles: { sp: libelles("sp"), p: libelles("p"), l: libelles("l") }, meta: { type: "outil-ergo-eso", dossier: "d123", enfant: "Léa M. (essai) \\ ok" }, mention: "Document fictif" };
const enTexte = (o) => Buffer.from(o).toString("latin1");
const versOctets = (s) => new Uint8Array(Buffer.from(s, "latin1"));

test("PDF : structure, 108 groupes de cases et champs d'identité", () => {
  const o = P.creerFormulaireEso(options);
  const s = enTexte(o);
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

test("PDF vierge : formulaire reconnu, aucune réponse, lien avec le dossier relu", async () => {
  const r = await P.lireFormulaireEso(P.creerFormulaireEso(options));
  assert.strictEqual(r.formulaire, true);
  assert.strictEqual(r.nombre, 0);
  assert.deepStrictEqual(r.meta, options.meta);
  assert.strictEqual(r.repondant, "");
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
  const r = await P.lireFormulaireEso(await doc.save());
  assert.strictEqual(r.nombre, 2);
  assert.strictEqual(r.reponses.sp[3], 9);
  assert.strictEqual(r.reponses.l[20], 0);
  assert.strictEqual(r.repondant, "Papa");
  assert.strictEqual(r.date, "12/11/2026");
});
