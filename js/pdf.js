/*
 * Outil Ergo : questionnaire ESO en PDF à remplir (formulaire cliquable), pour les parents, et lecture du PDF rempli.
 * Le PDF est écrit à la main (pas de bibliothèque) : texte en Helvetica, une rangée de cases rondes 0 à 10 par
 * question (boutons radio), un champ « Rempli par », et un champ caché qui relie le PDF au dossier.
 * Le texte des questions vient du fichier du cabinet importé sur l'appareil : il n'est pas dans ce fichier.
 * Lecture : les valeurs des champs sont relues dans le PDF enregistré par le lecteur des parents
 * (Acrobat, Aperçu, Chrome, Edge, Firefox…), y compris dans les flux d'objets compressés.
 * Aucune dépendance : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.PdfEso = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DOMAINES = [["sp", "Soins personnels"], ["p", "Travail scolaire"], ["l", "Loisirs"]];
  const NB = 36;
  const nomChamp = (dm, n) => "eso_" + dm + "_" + String(n).padStart(2, "0");

  /* ================= Texte : WinAnsi, échappement, largeurs Helvetica ================= */

  const WIN = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "œ": 0x9C, "Œ": 0x8C, "Ÿ": 0x9F };
  function versWinAnsi(t) {
    let o = "";
    for (const ch of String(t === undefined || t === null ? "" : t)) {
      const c = ch.codePointAt(0);
      if (c === 0x202F || c === 0x2009) o += " ";
      else if (c < 0x80 || (c >= 0xA0 && c <= 0xFF)) o += String.fromCharCode(c);
      else if (WIN[ch] !== undefined) o += String.fromCharCode(WIN[ch]);
      else o += "?";
    }
    return o;
  }
  // Chaîne de texte des métadonnées et des champs : UTF-16 (les accents et tirets restent justes partout).
  function texteUtf16(t) {
    let h = "<FEFF";
    for (const ch of String(t === undefined || t === null ? "" : t)) {
      const c = ch.codePointAt(0);
      if (c > 0xFFFF) { const v = c - 0x10000; h += (0xD800 + (v >> 10)).toString(16).padStart(4, "0") + (0xDC00 + (v & 0x3FF)).toString(16).padStart(4, "0"); }
      else h += c.toString(16).padStart(4, "0");
    }
    return h.toUpperCase() + ">";
  }
  function chaine(t) { return "(" + versWinAnsi(t).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " ") + ")"; }

  // Largeurs Helvetica (pour 1000 unités), caractères 32 à 126.
  const L_ASCII = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const L_SPECIAUX = { "«": 556, "»": 556, "…": 1000, "’": 222, "‘": 222, "“": 333, "”": 333, "–": 556, "—": 1000, "œ": 944, "Œ": 1000, "°": 400, "•": 350, "ß": 611, "æ": 889, "Æ": 1000 };
  function largeurCar(ch, gras) {
    let w;
    if (L_SPECIAUX[ch]) w = L_SPECIAUX[ch];
    else {
      const base = ch.normalize ? ch.normalize("NFD").charAt(0) : ch;
      const c = base.charCodeAt(0);
      w = c >= 32 && c <= 126 ? L_ASCII[c - 32] : 556;
    }
    return gras ? w * 1.06 : w;
  }
  function largeur(t, taille, gras) { let s = 0; for (const ch of String(t)) s += largeurCar(ch, gras); return s * taille / 1000; }
  function couper(t, max, taille, gras) {
    const mots = String(t).split(/\s+/).filter(Boolean), lignes = [];
    let l = "";
    mots.forEach((m) => {
      const essai = l ? l + " " + m : m;
      if (!l || largeur(essai, taille, gras) <= max) l = essai;
      else { lignes.push(l); l = m; }
    });
    if (l) lignes.push(l);
    return lignes.length ? lignes : [""];
  }

  /* ================= Écriture du PDF ================= */

  function Ecrivain() { this.objets = []; }
  Ecrivain.prototype.reserver = function () { this.objets.push(null); return this.objets.length; };
  Ecrivain.prototype.definir = function (n, corps) { this.objets[n - 1] = corps; return n; };
  Ecrivain.prototype.ajouter = function (corps) { return this.definir(this.reserver(), corps); };
  Ecrivain.prototype.flux = function (dict, donnees) { return this.ajouter("<< " + dict + " /Length " + donnees.length + " >>\nstream\n" + donnees + "\nendstream"); };
  Ecrivain.prototype.octets = function (racine, info) {
    let s = "%PDF-1.7\n%\u00E2\u00E3\u00CF\u00D3\n";
    const pos = [];
    this.objets.forEach((corps, i) => { pos.push(s.length); s += (i + 1) + " 0 obj\n" + corps + "\nendobj\n"; });
    const xref = s.length;
    s += "xref\n0 " + (this.objets.length + 1) + "\n0000000000 65535 f \n" + pos.map((p) => String(p).padStart(10, "0") + " 00000 n \n").join("");
    s += "trailer\n<< /Size " + (this.objets.length + 1) + " /Root " + racine + " 0 R" + (info ? " /Info " + info + " 0 R" : "") + " >>\nstartxref\n" + xref + "\n%%EOF\n";
    const o = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 0xFF;
    return o;
  };

  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  function cercle(cx, cy, r) {
    const k = 0.5523 * r;
    return "" + f2(cx + r) + " " + f2(cy) + " m " + [
      [cx + r, cy + k, cx + k, cy + r, cx, cy + r], [cx - k, cy + r, cx - r, cy + k, cx - r, cy],
      [cx - r, cy - k, cx - k, cy - r, cx, cy - r], [cx + k, cy - r, cx + r, cy - k, cx + r, cy],
    ].map((c) => c.map(f2).join(" ") + " c").join(" ");
  }

  // o : { titre, enfant, naissance, cabinet: [lignes], contact, libelles: {sp, p, l}, meta: {…}, mention }
  function creerFormulaireEso(o) {
    const W = 595.28, H = 841.89, M = 36;
    const pdf = new Ecrivain();
    const catalogue = pdf.reserver(), pages = pdf.reserver(), acro = pdf.reserver();
    const helv = pdf.ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const helvB = pdf.ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const zadb = pdf.ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /ZapfDingbats >>");
    // Apparence des cases : un rond avec le chiffre dedans ; rempli en vert quand il est choisi (lisible aussi à l'impression).
    const D = 15, R = 6.8;
    const resAp = "/Resources << /Font << /F1 " + helv + " 0 R /F2 " + helvB + " 0 R >> >>";
    const chiffre = (k, gras, couleur) => { const t = String(k), tl = k > 9 ? 6.2 : 7.2; return "BT /" + (gras ? "F2" : "F1") + " " + tl + " Tf " + couleur + " rg " + f2(D / 2 - largeur(t, tl, gras) / 2) + " " + f2(D / 2 - tl * 0.36) + " Td (" + t + ") Tj ET"; };
    const apOff = [], apOn = [];
    for (let k = 0; k <= 10; k++) {
      apOff.push(pdf.flux("/Type /XObject /Subtype /Form /BBox [0 0 " + D + " " + D + "] " + resAp, "q 1 1 1 rg 0.45 0.45 0.45 RG 0.8 w " + cercle(D / 2, D / 2, R) + " b " + chiffre(k, false, "0.4 0.4 0.4") + " Q"));
      apOn.push(pdf.flux("/Type /XObject /Subtype /Form /BBox [0 0 " + D + " " + D + "] " + resAp, "q 0.12 0.36 0.26 rg 0.12 0.36 0.26 RG 1 w " + cercle(D / 2, D / 2, R) + " b " + chiffre(k, true, "1 1 1") + " Q"));
    }
    const apTexte = (w, h) => pdf.flux("/Type /XObject /Subtype /Form /BBox [0 0 " + f2(w) + " " + f2(h) + "] /Resources << >>", "/Tx BMC EMC");
    const champTexteVide = (nom, aide, rect) => {
      const n = pdf.reserver();
      pdf.definir(n, "<< /Type /Annot /Subtype /Widget /FT /Tx /T (" + nom + ") /TU " + texteUtf16(aide) + " /V () /Rect [" + rect.map(f2).join(" ") + "] /P " + page.num + " 0 R /F 4 /DA (/Helv 10 Tf 0 g) /MK << /BC [0.6 0.6 0.6] /BG [0.97 0.97 0.97] >> /AP << /N " + apTexte(rect[2] - rect[0], rect[3] - rect[1]) + " 0 R >> >>");
      page.annots.push(n);
      champs.push(n);
      // Cadre dessiné dans la page : visible même dans les lecteurs qui ne montrent pas les champs.
      page.contenu.push("0.97 g 0.6 G 0.6 w " + f2(rect[0]) + " " + f2(rect[1]) + " " + f2(rect[2] - rect[0]) + " " + f2(rect[3] - rect[1]) + " re B");
    };
    const champs = [], listePages = [];

    // Mise en page : colonnes
    const xNum = M, xTexte = M + 20, pas = 21.5, xRadios = W - M - 11 * pas + (pas - D) / 2, lTexte = xRadios - xTexte - 10;
    let page = null;
    const nouvellePage = () => {
      page = { num: pdf.reserver(), contenu: [], annots: [], y: H - M };
      listePages.push(page);
      return page;
    };
    const texte = (x, y, t, taille, gras, gris) => page.contenu.push("BT /" + (gras ? "F2" : "F1") + " " + taille + " Tf " + (gris ? "0.35 0.35 0.35 rg " : "0 0 0 rg ") + f2(x) + " " + f2(y) + " Td " + chaine(t) + " Tj ET");
    const trait = (x1, y1, x2, y2, g) => page.contenu.push((g || "0.8") + " G 0.5 w " + f2(x1) + " " + f2(y1) + " m " + f2(x2) + " " + f2(y2) + " l S");
    const bande = (x, y, w, h, g) => page.contenu.push(g + " g " + f2(x) + " " + f2(y) + " " + f2(w) + " " + f2(h) + " re f");
    const entetesChiffres = (y) => {
      texte(xRadios, y, "0 = jamais", 8, false);
      const t = "10 = toujours";
      texte(xRadios + 10 * pas + D - largeur(t, 8), y, t, 8, false);
    };

    // Première page : en-tête et consignes.
    nouvellePage();
    (o.cabinet || []).slice(0, 4).forEach((l, i) => texte(M, page.y - 8 - i * 10, l, i ? 8 : 9, !i, !!i));
    page.y -= 8 + Math.max(1, Math.min(4, (o.cabinet || []).length)) * 10 + 14;
    texte(M, page.y, o.titre || "Profil de l'Engagement Sensori-Occupationnel (ESO)", 15, true);
    page.y -= 20;
    texte(M, page.y, "Enfant : " + (o.enfant || "") + (o.naissance ? "   ·   né(e) le " + o.naissance : ""), 10, false);
    page.y -= 22;
    texte(M, page.y, "Rempli par :", 10, true);
    champTexteVide("eso_repondant", "Rempli par", [M + 66, page.y - 5, M + 330, page.y + 12]);
    texte(M + 350, page.y, "Le :", 10, true);
    champTexteVide("eso_date", "Date", [M + 374, page.y - 5, W - M, page.y + 12]);
    page.y -= 28;
    const consignes = [
      "Pour chaque phrase, cliquez sur le chiffre qui correspond le mieux à votre enfant, de 0 (jamais, pas du tout) à 10 (toujours, tout à fait). Il n'y a pas de bonne ou de mauvaise réponse. Pour changer une réponse, cliquez sur un autre chiffre.",
      "Une fois rempli, enregistrez le fichier (« Enregistrer » ou « Télécharger » dans votre lecteur PDF) et renvoyez-le" + (o.contact ? " à " + o.contact : " au cabinet") + ".",
      "Vous préférez le papier ? Imprimez-le et entourez les chiffres.",
    ];
    consignes.forEach((c) => { couper(c, W - 2 * M, 9.5).forEach((l) => { texte(M, page.y, l, 9.5, false); page.y -= 12.5; }); page.y -= 3; });
    page.y -= 6;

    // Questions par domaine.
    DOMAINES.forEach((dm) => {
      const libs = (o.libelles && o.libelles[dm[0]]) || [];
      const enTeteDomaine = () => {
        if (page.y < M + 90) nouvellePage();
        bande(M, page.y - 6, W - 2 * M, 20, "0.9");
        texte(M + 6, page.y, dm[1].toUpperCase(), 10, true);
        entetesChiffres(page.y);
        page.y -= 8;
      };
      enTeteDomaine();
      for (let n = 1; n <= NB; n++) {
        const lignes = couper(libs[n - 1] || "Question " + n, lTexte, 8.5);
        const h = Math.max(20, lignes.length * 10.5 + 8);
        if (page.y - h < M + 30) { nouvellePage(); enTeteDomaine(); }
        const y0 = page.y - h;
        if (n % 2 === 0) bande(M, y0, W - 2 * M, h, "0.965");
        texte(xNum, y0 + h / 2 - 3, String(n), 8.5, true);
        lignes.forEach((l, i) => texte(xTexte, y0 + h / 2 + (lignes.length - 1) * 5.25 - i * 10.5 - 3, l, 8.5, false));
        trait(M, y0, W - M, y0);
        // Groupe de boutons radio : un champ parent, onze cases.
        const parent = pdf.reserver(), kids = [];
        for (let k = 0; k <= 10; k++) {
          const x = xRadios + k * pas, y = y0 + (h - D) / 2;
          kids.push(pdf.ajouter("<< /Type /Annot /Subtype /Widget /Parent " + parent + " 0 R /Rect [" + [x, y, x + D, y + D].map(f2).join(" ") + "] /P " + page.num + " 0 R /F 4 /AS /Off /MK << /BC [0.45 0.45 0.45] /BG [1 1 1] /CA (l) >> /DA (/ZaDb 0 Tf 0.12 0.36 0.26 rg) /AP << /N << /" + k + " " + apOn[k] + " 0 R /Off " + apOff[k] + " 0 R >> >> >>"));
        }
        pdf.definir(parent, "<< /FT /Btn /Ff 49152 /T (" + nomChamp(dm[0], n) + ") /TU " + texteUtf16(dm[1] + ", question " + n) + " /V /Off /Kids [" + kids.map((k) => k + " 0 R").join(" ") + "] >>");
        page.annots.push.apply(page.annots, kids);
        champs.push(parent);
        page.y = y0;
      }
      page.y -= 14;
    });

    // Champ caché : relie le PDF au dossier (aucune donnée de santé).
    const meta = pdf.ajouter("<< /Type /Annot /Subtype /Widget /FT /Tx /T (outil_ergo) /Ff 1 /F 2 /V " + texteUtf16(JSON.stringify(o.meta || {})) + " /Rect [0 0 0 0] /P " + listePages[0].num + " 0 R /DA (/Helv 0 Tf 0 g) >>");
    listePages[0].annots.push(meta);
    champs.push(meta);

    // Pied de page, numéros, objets des pages.
    listePages.forEach((p, i) => {
      page = p;
      texte(M, M - 14, o.mention || "", 7, false, true);
      const num = (i + 1) + " / " + listePages.length;
      texte(W - M - largeur(num, 8), M - 14, num, 8, false, true);
      const contenu = pdf.flux("", p.contenu.join("\n"));
      pdf.definir(p.num, "<< /Type /Page /Parent " + pages + " 0 R /MediaBox [0 0 " + f2(W) + " " + f2(H) + "] /Resources << /Font << /F1 " + helv + " 0 R /F2 " + helvB + " 0 R >> >> /Contents " + contenu + " 0 R /Annots [" + p.annots.map((a) => a + " 0 R").join(" ") + "] >>");
    });
    pdf.definir(pages, "<< /Type /Pages /Kids [" + listePages.map((p) => p.num + " 0 R").join(" ") + "] /Count " + listePages.length + " >>");
    pdf.definir(acro, "<< /Fields [" + champs.map((c) => c + " 0 R").join(" ") + "] /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv " + helv + " 0 R /ZaDb " + zadb + " 0 R >> >> >>");
    pdf.definir(catalogue, "<< /Type /Catalog /Pages " + pages + " 0 R /AcroForm " + acro + " 0 R >>");
    const info = pdf.ajouter("<< /Title " + texteUtf16((o.titre || "ESO") + (o.enfant ? " – " + o.enfant : "")) + " /Creator (Outil Ergo) >>");
    return pdf.octets(catalogue, info);
  }

  /* ================= Lecture du PDF rempli ================= */

  function latin1(octets) {
    let s = "";
    for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
    return s;
  }
  function versOctets(s) { const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 0xFF; return o; }

  async function decompresser(octets) {
    if (typeof DecompressionStream !== "undefined" && typeof Response !== "undefined" && typeof Blob !== "undefined") {
      try {
        const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(flux).arrayBuffer());
      } catch (e) { /* données tronquées ou autre format : essai suivant */ }
    }
    if (typeof require === "function") { try { return new Uint8Array(require("zlib").inflateSync(Buffer.from(octets))); } catch (e) { /* rien */ } }
    return null;
  }

  // Décodage d'une chaîne PDF (littérale ou hexadécimale, UTF-16 ou PDFDocEncoding) et d'un nom.
  function decoderChaine(brut) {
    let octets = [];
    if (brut.charAt(0) === "<") {
      const h = brut.slice(1, -1).replace(/\s+/g, "");
      for (let i = 0; i < h.length; i += 2) octets.push(parseInt(h.substr(i, 2).padEnd(2, "0"), 16));
    } else {
      const s = brut.slice(1, -1);
      for (let i = 0; i < s.length; i++) {
        const c = s.charAt(i);
        if (c !== "\\") { octets.push(c.charCodeAt(0) & 0xFF); continue; }
        const d = s.charAt(++i);
        const esc = { n: 10, r: 13, t: 9, b: 8, f: 12 };
        if (esc[d] !== undefined) octets.push(esc[d]);
        else if (/[0-7]/.test(d)) { let oct = d; while (oct.length < 3 && /[0-7]/.test(s.charAt(i + 1))) oct += s.charAt(++i); octets.push(parseInt(oct, 8) & 0xFF); }
        else if (d === "\r" || d === "\n") { if (d === "\r" && s.charAt(i + 1) === "\n") i++; }
        else octets.push(d.charCodeAt(0) & 0xFF);
      }
    }
    if (octets[0] === 0xFE && octets[1] === 0xFF) {
      let t = "";
      for (let i = 2; i + 1 < octets.length; i += 2) t += String.fromCharCode((octets[i] << 8) | octets[i + 1]);
      return t;
    }
    const inverse = {};
    Object.keys(WIN).forEach((k) => { inverse[WIN[k]] = k; });
    return octets.map((b) => inverse[b] || String.fromCharCode(b)).join("");
  }
  function decoderNom(n) { return n.replace(/#([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16))); }
  const RE_CHAINE = "\\((?:\\\\[\\s\\S]|[^\\\\)])*\\)|<[0-9A-Fa-f\\s]*>";
  function valeurCle(corps, cle) {
    const m = new RegExp("/" + cle + "(?=[\\s(<\\/\\[])\\s*(\\/[^\\s/<>\\[\\]()]*|" + RE_CHAINE + ")").exec(corps);
    if (!m) return null;
    return m[1].charAt(0) === "/" ? decoderNom(m[1].slice(1)) : decoderChaine(m[1]);
  }

  async function objetsDuPdf(octets) {
    const s = latin1(octets);
    const objets = {}; // num → { corps, pos }
    const garder = (num, corps, pos) => { if (!objets[num] || objets[num].pos <= pos) objets[num] = { corps: corps, pos: pos }; };
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    const flux = [];
    while ((m = re.exec(s))) {
      const debut = m.index + m[0].length;
      const fin = s.indexOf("endobj", debut);
      if (fin < 0) break;
      let corps = s.slice(debut, fin);
      const iFlux = corps.search(/\bstream\r?\n/);
      if (iFlux >= 0) {
        const dict = corps.slice(0, iFlux);
        if (/\/Type\s*\/ObjStm/.test(dict)) {
          const debutDonnees = corps.indexOf("\n", iFlux) + 1;
          let finDonnees = corps.lastIndexOf("endstream");
          if (finDonnees < 0) finDonnees = corps.length;
          // Données : la longueur annoncée (/Length) quand elle est écrite en clair, sinon jusqu'à « endstream ».
          const brut = corps.slice(debutDonnees, finDonnees);
          const lg = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
          const essais = [];
          if (lg && +lg[1] <= brut.length) essais.push(brut.slice(0, +lg[1]));
          essais.push(brut.replace(/\r?\n$/, ""), brut.replace(/\n$/, ""), brut);
          flux.push({ dict: dict, essais: essais, pos: m.index });
        }
        corps = dict;
      }
      garder(Number(m[1]), corps, m.index);
      re.lastIndex = fin;
    }
    for (const f of flux) {
      let donnees = versOctets(f.essais[0]);
      if (/\/FlateDecode/.test(f.dict)) {
        let d = null;
        for (let i = 0; !d && i < f.essais.length; i++) d = await decompresser(versOctets(f.essais[i]));
        if (!d) continue;
        donnees = d;
      }
      const texteFlux = latin1(donnees);
      const n = Number((/\/N\s+(\d+)/.exec(f.dict) || [])[1] || 0), premier = Number((/\/First\s+(\d+)/.exec(f.dict) || [])[1] || 0);
      const entete = texteFlux.slice(0, premier).trim().split(/\s+/).map(Number);
      for (let i = 0; i < n; i++) {
        const num = entete[2 * i], off = entete[2 * i + 1], suivant = i + 1 < n ? entete[2 * i + 3] : texteFlux.length - premier;
        if (!Number.isFinite(num)) continue;
        garder(num, texteFlux.slice(premier + off, premier + suivant), f.pos + 0.5);
      }
    }
    return objets;
  }

  // Renvoie { reponses: { sp: {1: 5, …}, p: {…}, l: {…} }, nombre, repondant, meta }.
  async function lireFormulaireEso(octets) {
    const objets = await objetsDuPdf(octets instanceof Uint8Array ? octets : new Uint8Array(octets));
    const champs = {}; // nom → valeur
    const nomDe = {};  // numéro d'objet → nom du champ
    Object.keys(objets).forEach((num) => {
      const c = objets[num].corps;
      const t = valeurCle(c, "T");
      if (t === null) return;
      nomDe[num] = t;
      const v = valeurCle(c, "V");
      if (v !== null) champs[t] = v;
    });
    // Valeur portée par les cases (/AS) quand le parent n'a pas de /V.
    Object.keys(objets).forEach((num) => {
      const c = objets[num].corps;
      const parent = /\/Parent\s+(\d+)\s+\d+\s+R/.exec(c);
      const as = valeurCle(c, "AS");
      if (!parent || as === null || as === "Off") return;
      const nom = nomDe[parent[1]];
      if (nom && !/^\/?\d+$/.test(String(champs[nom] === undefined ? "" : champs[nom]).trim())) champs[nom] = as;
    });
    const reponses = { sp: {}, p: {}, l: {} };
    let nombre = 0;
    Object.keys(champs).forEach((nom) => {
      const m = /^eso_(sp|p|l)_(\d{1,2})$/.exec(nom);
      if (!m) return;
      const brut = String(champs[nom]).trim().replace(/^\//, "");
      if (!/^\d+$/.test(brut)) return;
      const v = Number(brut);
      const n = Number(m[2]);
      if (!Number.isInteger(v) || v < 0 || v > 10 || n < 1 || n > NB) return;
      reponses[m[1]][n] = v;
      nombre++;
    });
    let meta = null;
    try { meta = champs.outil_ergo ? JSON.parse(champs.outil_ergo) : null; } catch (e) { meta = null; }
    return { reponses: reponses, nombre: nombre, repondant: String(champs.eso_repondant || "").trim(), date: String(champs.eso_date || "").trim(), meta: meta, formulaire: Object.keys(champs).some((k) => /^eso_/.test(k)) || !!meta };
  }

  return { DOMAINES, NB, nomChamp, versWinAnsi, largeur, couper, creerFormulaireEso, lireFormulaireEso, objetsDuPdf };
});
