/*
 * Outil Ergo : génération d'un fichier Word (.docx) sans bibliothèque externe.
 * Un .docx est une archive ZIP de fichiers XML (WordprocessingML). On l'écrit ici à la main,
 * sans compression, à partir du modèle de document produit par bhk.js (modeleDocument).
 */
(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.DocxBHK = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- ZIP (méthode « stored ») ---------- */

  const TABLE_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(octets) {
    let c = 0xffffffff;
    for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function encoder(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    return Uint8Array.from(Buffer.from(s, "utf8"));
  }

  function zip(fichiers) {
    const morceaux = [];
    const central = [];
    let decalage = 0;
    const date = new Date();
    const heureDos = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const dateDos = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

    fichiers.forEach((f) => {
      const nom = encoder(f.nom);
      const donnees = typeof f.donnees === "string" ? encoder(f.donnees) : f.donnees;
      const crc = crc32(donnees);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // noms en UTF-8
      local.setUint16(8, 0, true);
      local.setUint16(10, heureDos, true);
      local.setUint16(12, dateDos, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, donnees.length, true);
      local.setUint32(22, donnees.length, true);
      local.setUint16(26, nom.length, true);
      local.setUint16(28, 0, true);
      morceaux.push(new Uint8Array(local.buffer), nom, donnees);

      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(4, 20, true);
      c.setUint16(6, 20, true);
      c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true);
      c.setUint16(12, heureDos, true);
      c.setUint16(14, dateDos, true);
      c.setUint32(16, crc, true);
      c.setUint32(20, donnees.length, true);
      c.setUint32(24, donnees.length, true);
      c.setUint16(28, nom.length, true);
      c.setUint32(42, decalage, true);
      central.push(new Uint8Array(c.buffer), nom);
      decalage += 30 + nom.length + donnees.length;
    });

    const tailleCentral = central.reduce((a, b) => a + b.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, fichiers.length, true);
    fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentral, true);
    fin.setUint32(16, decalage, true);

    const tout = morceaux.concat(central, [new Uint8Array(fin.buffer)]);
    const total = tout.reduce((a, b) => a + b.length, 0);
    const sortie = new Uint8Array(total);
    let pos = 0;
    tout.forEach((b) => { sortie.set(b, pos); pos += b.length; });
    return sortie;
  }

  /* ---------- WordprocessingML ---------- */

  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const LARGEUR = 9638; // A4 (11906) moins deux marges de 2 cm (1134)
  const FONDS = {
    entete: "DCE3F0",
    "niveau-patho": "F4CCCC",
    "niveau-inferieur": "FCE5CD",
    "niveau-moyenne": "DDEBD7",
    "niveau-superieur": "D5E4F2",
  };

  function x(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function run(r, base) {
    const o = Object.assign({}, base || {}, r);
    let pr = "";
    if (o.b) pr += "<w:b/>";
    if (o.i) pr += "<w:i/>";
    if (o.couleur) pr += '<w:color w:val="' + o.couleur + '"/>';
    if (o.taille) pr += '<w:sz w:val="' + o.taille + '"/><w:szCs w:val="' + o.taille + '"/>';
    if (o.surligne) pr += '<w:highlight w:val="yellow"/>';
    return "<w:r>" + (pr ? "<w:rPr>" + pr + "</w:rPr>" : "") + '<w:t xml:space="preserve">' + x(o.t) + "</w:t></w:r>";
  }

  function para(runs, opts) {
    const o = opts || {};
    let pr = "";
    if (o.style) pr += '<w:pStyle w:val="' + o.style + '"/>';
    if (o.keepNext) pr += "<w:keepNext/>";
    if (o.puce) pr += '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
    if (o.bordureBas) pr += '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="8EA3C2"/></w:pBdr>';
    if (o.espace) pr += '<w:spacing w:before="' + (o.espace[0] || 0) + '" w:after="' + (o.espace[1] || 0) + '"/>';
    if (o.align) pr += '<w:jc w:val="' + { center: "center", right: "right", left: "left" }[o.align] + '"/>';
    return "<w:p>" + (pr ? "<w:pPr>" + pr + "</w:pPr>" : "") + runs.map((r) => run(r, o.base)).join("") + "</w:p>";
  }

  function tableau(t, opts) {
    const o = opts || {};
    const largeur = o.largeur || LARGEUR;
    const cols = t.largeurs.map((f) => Math.round(f * largeur));
    const ecart = largeur - cols.reduce((a, b) => a + b, 0);
    cols[cols.length - 1] += ecart;
    const bord = o.sansBordure ? "nil" : "single";
    const bords = ["top", "left", "bottom", "right", "insideH", "insideV"]
      .map((b) => "<w:" + b + ' w:val="' + bord + '" w:sz="4" w:space="0" w:color="A6B4C8"/>').join("");
    let xml = '<w:tbl><w:tblPr><w:tblW w:w="' + largeur + '" w:type="dxa"/><w:tblBorders>' + bords + '</w:tblBorders><w:tblLayout w:type="fixed"/>' +
      '<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr>';
    xml += "<w:tblGrid>" + cols.map((c) => '<w:gridCol w:w="' + c + '"/>').join("") + "</w:tblGrid>";
    t.lignes.forEach((ligne) => {
      xml += "<w:tr>" + (ligne.entete && t.entetes ? "<w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>");
      let col = 0;
      ligne.cellules.forEach((c) => {
        const span = c.colspan || 1;
        const w = cols.slice(col, col + span).reduce((a, b) => a + b, 0);
        col += span;
        let pr = '<w:tcW w:w="' + w + '" w:type="dxa"/>';
        if (span > 1) pr += '<w:gridSpan w:val="' + span + '"/>';
        if (c.fond && FONDS[c.fond]) pr += '<w:shd w:val="clear" w:color="auto" w:fill="' + FONDS[c.fond] + '"/>';
        pr += '<w:vAlign w:val="center"/>';
        const base = { b: !!c.gras, taille: o.taille || (t.petit ? 18 : 20) };
        const lignes = (o.multiLignes && c.lignes) ? c.lignes : null;
        const contenu = lignes
          ? lignes.map((l) => para(l, { align: c.align, espace: [0, 0], base: base })).join("")
          : para(c.runs, { align: c.align, espace: [0, 0], base: base });
        xml += "<w:tc><w:tcPr>" + pr + "</w:tcPr>" + contenu + "</w:tc>";
      });
      xml += "</w:tr>";
    });
    return xml + "</w:tbl>";
  }

  function depuisDataUrl(url) {
    const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(String(url || ""));
    if (!m) return null;
    const bin = typeof atob === "function" ? atob(m[2]) : Buffer.from(m[2], "base64").toString("binary");
    const o = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
    return { octets: o, ext: m[1] === "png" ? "png" : "jpeg" };
  }

  // Prépare les images (graphiques déjà convertis en PNG, photo en data URL) et leur place dans le document.
  function preparerImages(modele) {
    const images = [];
    modele.blocs.forEach((b) => {
      let src = null;
      if (b.type === "graphique" && b.png) src = { octets: b.png, ext: "png" };
      if (b.type === "photo") src = depuisDataUrl(b.donnees);
      if (!src || !b.l || !b.h) return;
      const n = images.length + 1;
      const cx = Math.round((b.largeurCm || 14) * 360000);
      const cy = Math.round((cx * b.h) / b.l);
      const maxCy = Math.round(22 * 360000);
      const k = cy > maxCy ? maxCy / cy : 1;
      b._image = { n: n, rid: "rIdImage" + n, nom: "image" + n + "." + (src.ext === "png" ? "png" : "jpeg"), cx: Math.round(cx * k), cy: Math.round(cy * k) };
      images.push({ nom: "word/media/" + b._image.nom, donnees: src.octets });
    });
    return images;
  }

  function paraImage(b) {
    const im = b._image;
    return '<w:p><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="40"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>' +
      '<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + im.cx + '" cy="' + im.cy + '"/>' +
      '<wp:docPr id="' + im.n + '" name="Image ' + im.n + '" descr="' + x(b.alt || "") + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
      '<pic:nvPicPr><pic:cNvPr id="' + im.n + '" name="' + im.nom + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + im.rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + im.cx + '" cy="' + im.cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>" +
      para([{ t: b.alt || "", i: true }], { align: "center", espace: [0, 160], base: { taille: 17, couleur: "4A5568" } });
  }

  function corps(modele) {
    let xml = "";
    modele.blocs.forEach((b) => {
      switch (b.type) {
        case "graphique":
        case "photo":
          if (b._image) xml += paraImage(b);
          break;
        case "titre":
          xml += para([{ t: b.texte.toUpperCase() }], { style: "Titre" });
          break;
        case "h":
          xml += para([{ t: b.texte }], { style: "Titre" + Math.min(4, Math.max(2, b.niveau)) });
          break;
        case "p":
          xml += para(b.runs, { base: b.petit ? { taille: 18 } : null });
          break;
        case "puces":
          b.items.forEach((runs) => { xml += para(runs, { puce: true }); });
          break;
        case "tableau":
          xml += tableau(b) + para([], { espace: [0, 60] });
          break;
        case "signature":
          xml += para([{ t: b.texte }], { align: "right", espace: [360, 0], base: { b: true } });
          break;
      }
    });
    return xml;
  }

  function entete(modele) {
    const e = modele.entete || {};
    const colonnes = [];
    if (e.cabinet && (e.cabinet.nom || e.cabinet.lignes.length)) {
      colonnes.push([[{ t: e.cabinet.nom || "", b: true }]].concat(e.cabinet.lignes.map((l) => [{ t: l }])));
    }
    (e.praticiens || []).forEach((p) => {
      colonnes.push([[{ t: p.nom, b: true }]].concat(p.lignes.map((l) => [{ t: l }])));
    });
    let xml = "";
    if (colonnes.length) {
      const n = colonnes.length;
      xml += tableau({
        largeurs: colonnes.map(() => 1 / n),
        lignes: [{ cellules: colonnes.map((lignes) => ({ lignes: lignes, runs: [], align: "center" })) }],
      }, { sansBordure: true, taille: 15, multiLignes: true });
      xml += para([], { bordureBas: true, espace: [0, 0] });
    } else {
      xml += para([]);
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ' + NS + ">" + xml + "</w:hdr>";
  }

  function champ(code) {
    return '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ' + code +
      ' </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>';
  }

  function pied(modele) {
    const base = { taille: 15, couleur: "4A5568" };
    let xml = para([], { bordureBas: true, espace: [0, 60] });
    (modele.pied || []).forEach((l, i) => { xml += para([{ t: l, b: i === 0 }], { align: "center", espace: [0, 0], base: base }); });
    xml += '<w:p><w:pPr><w:spacing w:before="60" w:after="0"/><w:jc w:val="right"/></w:pPr>' +
      run({ t: "Page " }, base) + champ("PAGE").replace(/<w:r>/g, '<w:r><w:rPr><w:sz w:val="15"/></w:rPr>') +
      run({ t: " sur " }, base) + champ("NUMPAGES").replace(/<w:r>/g, '<w:r><w:rPr><w:sz w:val="15"/></w:rPr>') + "</w:p>";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ' + NS + ">" + xml + "</w:ftr>";
  }

  function styles() {
    const titre = (id, nom, taille, couleur, avant, apres, niveau, extra) =>
      '<w:style w:type="paragraph" w:customStyle="1" w:styleId="' + id + '"><w:name w:val="' + nom + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>' +
      '<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="' + avant + '" w:after="' + apres + '"/>' + (extra || "") + '<w:outlineLvl w:val="' + niveau + '"/></w:pPr>' +
      '<w:rPr><w:b/><w:color w:val="' + couleur + '"/><w:sz w:val="' + taille + '"/><w:szCs w:val="' + taille + '"/></w:rPr></w:style>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ' + NS + ">" +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault>' +
      '<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
      titre("Titre", "Titre du bilan", 30, "1F3A5F", 120, 240, 0, '<w:jc w:val="center"/>') +
      titre("Titre2", "Titre de partie", 25, "1F3A5F", 280, 100, 1, '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="8EA3C2"/></w:pBdr>') +
      titre("Titre3", "Titre de sous-partie", 22, "2E5C8A", 200, 80, 2) +
      titre("Titre4", "Titre de rubrique", 21, "2E5C8A", 160, 60, 3) +
      '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>' +
      "</w:styles>";
  }

  function numerotation() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ' + NS + ">" +
      '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="–"/><w:lvlJc w:val="left"/>' +
      '<w:pPr><w:ind w:left="397" w:hanging="227"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:lvl></w:abstractNum>' +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>';
  }

  function construire(modele) {
    const images = preparerImages(modele);
    const NS_DOC = NS + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
    const relsImages = modele.blocs.filter((b) => b._image).map((b) =>
      '<Relationship Id="' + b._image.rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + b._image.nom + '"/>').join("");
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS_DOC + "><w:body>" + corps(modele) +
      '<w:sectPr><w:headerReference w:type="default" r:id="rIdEntete"/><w:footerReference w:type="default" r:id="rIdPied"/>' +
      '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1418" w:left="1134" w:header="510" w:footer="454" w:gutter="0"/></w:sectPr>' +
      "</w:body></w:document>";
    const maintenant = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    return zip([
      { nom: "[Content_Types].xml", donnees: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
        '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' +
        '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
      { nom: "_rels/.rels", donnees: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
      { nom: "docProps/core.xml", donnees: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        "<dc:title>" + x(modele.titre || "Bilan en ergothérapie") + "</dc:title><dc:creator>Outil Ergo</dc:creator>" +
        '<dcterms:created xsi:type="dcterms:W3CDTF">' + maintenant + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + maintenant + "</dcterms:modified></cp:coreProperties>" },
      { nom: "word/_rels/document.xml.rels", donnees: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
        '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
        '<Relationship Id="rIdEntete" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' +
        '<Relationship Id="rIdPied" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' + relsImages + "</Relationships>" },
      { nom: "word/document.xml", donnees: doc },
      { nom: "word/styles.xml", donnees: styles() },
      { nom: "word/numbering.xml", donnees: numerotation() },
      { nom: "word/settings.xml", donnees: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings ' + NS + '><w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/>' +
        '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>' },
      { nom: "word/header1.xml", donnees: entete(modele) },
      { nom: "word/footer1.xml", donnees: pied(modele) },
    ].concat(images));
  }

  return { construire: construire, zip: zip, crc32: crc32 };
});
