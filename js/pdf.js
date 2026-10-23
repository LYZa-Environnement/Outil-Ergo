/*
 * Outil Ergo : questionnaires en PDF à remplir (formulaires cliquables) pour les parents, et lecture du PDF rempli.
 * Le PDF est écrit à la main (pas de bibliothèque) : texte en Helvetica, une rangée de ronds par question (boutons
 * radio), des champs de texte (remarques, aides, priorités), et un champ caché qui relie le PDF au dossier.
 * Moteur générique (creerFormulaire) ; l'ESO et le questionnaire d'autonomie (js/occupation.js) en décrivent le contenu.
 * Le texte des questions vient du fichier du cabinet importé sur l'appareil : il n'est pas dans ce fichier.
 * Lecture : les valeurs des champs sont relues dans le PDF enregistré par le lecteur des parents
 * (Acrobat, Aperçu, Chrome, Edge, Firefox…), y compris dans les flux d'objets compressés.
 * Aucune dépendance : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.PdfFormulaire = fabrique();
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

  // Image JPEG (data URL) : octets en chaîne binaire, dimensions et espace de couleur lus dans l'en-tête SOF.
  function imageJpeg(src) {
    const m = /^data:image\/jpe?g;base64,(.+)$/.exec(String((src && src.donnees) || src || ""));
    if (!m) return null;
    const bin = typeof atob === "function" ? atob(m[1]) : Buffer.from(m[1], "base64").toString("latin1");
    if (bin.charCodeAt(0) !== 0xFF || bin.charCodeAt(1) !== 0xD8) return null;
    let i = 2;
    while (i + 9 < bin.length) {
      if (bin.charCodeAt(i) !== 0xFF) { i++; continue; }
      const mk = bin.charCodeAt(i + 1);
      if (mk === 0xFF || mk === 0xD8 || mk === 0x01 || (mk >= 0xD0 && mk <= 0xD7)) { i += mk === 0xFF ? 1 : 2; continue; }
      const len = (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3);
      if (mk >= 0xC0 && mk <= 0xCF && mk !== 0xC4 && mk !== 0xC8 && mk !== 0xCC) {
        const h = (bin.charCodeAt(i + 5) << 8) | bin.charCodeAt(i + 6), l = (bin.charCodeAt(i + 7) << 8) | bin.charCodeAt(i + 8), comp = bin.charCodeAt(i + 9);
        return l && h ? { donnees: bin, l: l, h: h, espace: comp === 1 ? "DeviceGray" : comp === 4 ? "DeviceCMYK" : "DeviceRGB", cmjn: comp === 4 } : null;
      }
      i += 2 + len;
    }
    return null;
  }

  /*
   * Formulaire générique. spec :
   *   titre, source, cabinet: [lignes], logo (data URL JPEG, en haut à droite), mention, meta (objet relu à l'import, sans donnée de l'enfant),
   *   entete: [[élément, …], …] : lignes de champs sous le titre (identité de l'enfant remplie par les parents…) ;
   *     élément { type: "texte", nom, libelle, largeur?, valeur? } ou { type: "choix", nom, libelle, options: [[valeur, libellé], …] }
   *   consignes: [paragraphes],
   *   sections: [{ titre, note?, question?: { nom, libelle, options }, echelle, remarques?, items: [{ nom, texte, aide? }], zone? }]
   *     echelle { valeurs: ["0", …], chiffres: true, gauche, droite } : ronds numérotés ;
   *     echelle { valeurs, libelles: [...] } : ronds simples, libellés inclinés au-dessus des colonnes ;
   *     remarques : colonne de remarques libres (champ « <nom>_r ») ; zone { nom, libelle, hauteur } : cadre de texte libre.
   *   fin: [{ type: "zone", … } | { type: "priorites", titre, note, lignes: [{ libelle, rang, precision }] }]
   */
  function creerFormulaire(spec) {
    const W = 595.28, H = 841.89, M = 36, BAS = M + 30, LARG = W - 2 * M;
    const VERT = "0.12 0.36 0.26";
    const pdf = new Ecrivain();
    const catalogue = pdf.reserver(), pages = pdf.reserver(), acro = pdf.reserver();
    const helv = pdf.ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const helvB = pdf.ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const zadb = pdf.ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /ZapfDingbats >>");
    const polices = "/Font << /F1 " + helv + " 0 R /F2 " + helvB + " 0 R /Helv " + helv + " 0 R >>";
    const champs = [], listePages = [];
    let page = null;
    const nouvellePage = () => { page = { num: pdf.reserver(), contenu: [], annots: [], y: H - M }; listePages.push(page); };
    const dessiner = (t) => page.contenu.push(t);
    const texte = (x, y, t, taille, gras, gris) => dessiner("BT /" + (gras ? "F2" : "F1") + " " + taille + " Tf " + (gris ? "0.35 0.35 0.35" : "0 0 0") + " rg " + f2(x) + " " + f2(y) + " Td " + chaine(t) + " Tj ET");
    const texteIncline = (x, y, t, taille) => dessiner("BT /F1 " + taille + " Tf 0.2 0.2 0.2 rg 0.7071 0.7071 -0.7071 0.7071 " + f2(x) + " " + f2(y) + " Tm " + chaine(t) + " Tj ET");
    const paragraphe = (t, x, max, taille, gras, gris, interligne) => couper(t, max, taille, gras).forEach((l) => { texte(x, page.y, l, taille, gras, gris); page.y -= interligne; });
    const trait = (x1, y1, x2, y2) => dessiner("0.8 G 0.5 w " + f2(x1) + " " + f2(y1) + " m " + f2(x2) + " " + f2(y2) + " l S");
    const fond = (x, y, w, h, couleur) => dessiner(couleur + " rg " + f2(x) + " " + f2(y) + " " + f2(w) + " " + f2(h) + " re f");

    // Apparences partagées des cases et des champs vides.
    const cache = {};
    const forme = (cle, w, h, contenu) => cache[cle] || (cache[cle] = pdf.flux("/Type /XObject /Subtype /Form /BBox [0 0 " + f2(w) + " " + f2(h) + "] /Resources << " + polices + " >>", contenu));
    // Rond (avec ou sans chiffre) ; rempli en vert quand il est choisi, lisible aussi à l'impression.
    const rond = (D, etiquette, coche) => {
      const c = D / 2, r = D / 2 - 0.7, tl = etiquette.length > 1 ? 0.41 * D : 0.48 * D;
      const ecrit = (gras, couleur) => etiquette ? " BT /" + (gras ? "F2" : "F1") + " " + f2(tl) + " Tf " + couleur + " rg " + f2(c - largeur(etiquette, tl, gras) / 2) + " " + f2(c - tl * 0.36) + " Td " + chaine(etiquette) + " Tj ET" : "";
      return forme("rond:" + D + ":" + etiquette + ":" + coche, D, D, coche
        ? "q " + VERT + " rg " + VERT + " RG 1 w " + cercle(c, c, r) + " b" + (etiquette ? ecrit(true, "1 1 1") : " 1 1 1 rg " + cercle(c, c, D * 0.17) + " f") + " Q"
        : "q 1 1 1 rg 0.45 0.45 0.45 RG 0.8 w " + cercle(c, c, r) + " b" + ecrit(false, "0.4 0.4 0.4") + " Q");
    };
    // Groupe de boutons radio : un champ parent, une case par valeur (options : [{ valeur, x, y, etiquette }]).
    const groupeRadio = (nom, aide, D, options) => {
      const parent = pdf.reserver();
      const kids = options.map((o) => pdf.ajouter("<< /Type /Annot /Subtype /Widget /Parent " + parent + " 0 R /Rect [" + [o.x, o.y, o.x + D, o.y + D].map(f2).join(" ") + "] /P " + page.num + " 0 R /F 4 /AS /Off /MK << /BC [0.45 0.45 0.45] /BG [1 1 1] /CA (l) >> /DA (/ZaDb 0 Tf " + VERT + " rg) /AP << /N << /" + o.valeur + " " + rond(D, o.etiquette || "", true) + " 0 R /Off " + rond(D, o.etiquette || "", false) + " 0 R >> >> >>"));
      pdf.definir(parent, "<< /FT /Btn /Ff 49152 /T (" + nom + ") /TU " + texteUtf16(aide) + " /V /Off /Kids [" + kids.map((k) => k + " 0 R").join(" ") + "] >>");
      page.annots.push.apply(page.annots, kids);
      champs.push(parent);
    };
    // Champ de texte, avec son cadre dessiné dans la page (visible même là où les champs ne s'affichent pas).
    const champTexte = (nom, aide, r, o) => {
      o = o || {};
      const taille = o.taille || 10, w = r[2] - r[0], h = r[3] - r[1], v = o.valeur ? String(o.valeur) : "";
      const ap = v ? pdf.flux("/Type /XObject /Subtype /Form /BBox [0 0 " + f2(w) + " " + f2(h) + "] /Resources << " + polices + " >>",
        "/Tx BMC q BT /Helv " + taille + " Tf 0 g " + f2(o.centre ? (w - largeur(v, taille)) / 2 : 2) + " " + f2(o.multiligne ? h - taille - 1.5 : (h - taille * 0.7) / 2) + " Td " + chaine(v) + " Tj ET Q EMC")
        : forme("tx:" + f2(w) + ":" + f2(h), w, h, "/Tx BMC EMC");
      champs.push(pdf.ajouter("<< /Type /Annot /Subtype /Widget /FT /Tx /T (" + nom + ") /TU " + texteUtf16(aide) + " /V " + (v ? texteUtf16(v) : "()") + (o.multiligne ? " /Ff 4096" : "") + (o.max ? " /MaxLen " + o.max : "") + (o.centre ? " /Q 1" : "") + " /Rect [" + r.map(f2).join(" ") + "] /P " + page.num + " 0 R /F 4 /DA (/Helv " + taille + " Tf 0 g) /MK << /BC [0.6 0.6 0.6] /BG [0.98 0.98 0.98] >> /AP << /N " + ap + " 0 R >> >>"));
      page.annots.push(champs[champs.length - 1]);
      dessiner("0.98 g 0.6 G 0.6 w " + f2(r[0]) + " " + f2(r[1]) + " " + f2(w) + " " + f2(h) + " re B");
    };
    // Choix sur une ligne : « Libellé : ○ Oui ○ Non ».
    const ligneChoix = (x, y, nom, aide, options) => {
      const D = 12, opts = [];
      options.forEach((op) => {
        opts.push({ valeur: op[0], x: x, y: y - 2.5 });
        texte(x + D + 4, y, op[1], 10, false);
        x += D + 4 + largeur(op[1], 10) + 16;
      });
      groupeRadio(nom, aide, D, opts);
      return x;
    };
    const zone = (z) => {
      const h = z.hauteur || 44, lignes = couper(z.libelle, LARG, 9, true);
      if (page.y - (14 + lignes.length * 11 + h) < BAS) nouvellePage();
      page.y -= 14;
      lignes.forEach((l) => { texte(M, page.y, l, 9, true); page.y -= 11; });
      champTexte(z.nom, z.libelle, [M, page.y - h + 7, W - M, page.y + 7], { taille: 9, multiligne: true });
      page.y -= h - 7;
    };

    // ===== Première page : cabinet, titre, enfant, champs d'en-tête, consignes =====
    nouvellePage();
    const haut = page.y;
    const logo = imageJpeg(spec.logo);
    let hLogo = 0;
    if (logo) {
      let wL = 150, hL = (wL * logo.h) / logo.l;
      if (hL > 52) { hL = 52; wL = (hL * logo.l) / logo.h; }
      page.logo = pdf.flux("/Type /XObject /Subtype /Image /Width " + logo.l + " /Height " + logo.h + " /ColorSpace /" + logo.espace + " /BitsPerComponent 8" + (logo.cmjn ? " /Decode [1 0 1 0 1 0 1 0]" : "") + " /Filter /DCTDecode", logo.donnees);
      dessiner("q " + f2(wL) + " 0 0 " + f2(hL) + " " + f2(W - M - wL) + " " + f2(haut - hL + 4) + " cm /Logo Do Q");
      hLogo = hL;
    }
    const cab = (spec.cabinet || []).slice(0, 4);
    cab.forEach((l, i) => texte(M, page.y - 8 - i * 10, l, i ? 8 : 9, !i, !!i));
    page.y -= 8 + Math.max(1, cab.length) * 10 + 14;
    if (hLogo) page.y = Math.min(page.y, haut - hLogo - 14);
    couper(spec.titre || "Questionnaire", LARG, 15, true).forEach((l) => { texte(M, page.y, l, 15, true); page.y -= 18; });
    if (spec.source) { paragraphe(spec.source, M, LARG, 8, false, true, 10); }
    page.y -= 12;
    (spec.entete || []).forEach((ligne) => {
      let x = M;
      ligne.forEach((el) => {
        const lib = el.libelle + " :";
        texte(x, page.y, lib, 10, true);
        x += largeur(lib, 10, true) + 6;
        if (el.type === "choix") x = ligneChoix(x, page.y, el.nom, el.libelle, el.options) + 4;
        else {
          const finChamp = el.largeur ? Math.min(W - M, x + el.largeur) : W - M;
          champTexte(el.nom, el.libelle, [x, page.y - 5, finChamp, page.y + 12], { valeur: el.valeur });
          x = finChamp + 18;
        }
      });
      page.y -= 26;
    });
    page.y -= 2;
    (spec.consignes || []).forEach((c) => { paragraphe(c, M, LARG, 9.5, false, false, 12.5); page.y -= 3; });
    page.y -= 6;

    // ===== Sections de questions =====
    (spec.sections || []).forEach((sec) => {
      const e = sec.echelle, nb = e.valeurs.length, chiffres = !!e.chiffres;
      const D = chiffres ? 15 : 12.5, pas = chiffres ? 21.5 : 25;
      const lRem = sec.remarques ? 158 : 0, xRem = W - M - lRem;
      const xRadios = (sec.remarques ? xRem - 8 : W - M) - nb * pas + (pas - D) / 2;
      const xTexte = M + 20, lTexte = xRadios - (pas - D) / 2 - xTexte - 8;
      const hBande = chiffres ? 20 : 46;
      const enTete = (suite) => {
        if (page.y - (hBande + 70) < BAS) nouvellePage();
        const haut = page.y + 14, bas = haut - hBande;
        fond(M, bas, LARG, hBande, "0.9 0.9 0.9");
        const titres = couper(sec.titre.toUpperCase() + (suite ? " (SUITE)" : ""), xRadios - M - 16, 10, true);
        titres.forEach((l, i) => texte(M + 6, bas + 6 + (titres.length - 1 - i) * 12, l, 10, true));
        if (chiffres) {
          texte(xRadios, bas + 6, e.gauche || "", 8, false);
          texte(xRadios + (nb - 1) * pas + D - largeur(e.droite || "", 8), bas + 6, e.droite || "", 8, false);
        } else (e.libelles || []).forEach((l, k) => texteIncline(xRadios + k * pas + D / 2 - 2, bas + 4, l, 7.5));
        if (sec.remarques) { const t = "Observations, remarques"; texte(xRem + (lRem - largeur(t, 8)) / 2, bas + 6, t, 8, false); }
        page.y = bas - 2;
        if (suite) return;
        if (sec.note) { page.y -= 10; paragraphe(sec.note, M + 4, LARG - 8, 8, false, true, 10); page.y += 6; }
        if (sec.question) {
          page.y -= 16;
          const q = sec.question.libelle;
          texte(M + 4, page.y, q, 9.5, true);
          ligneChoix(M + 4 + largeur(q, 9.5, true) + 10, page.y, sec.question.nom, sec.titre + " : " + q, sec.question.options);
          page.y -= 8;
        }
      };
      enTete(false);
      sec.items.forEach((it, i) => {
        const n = i + 1, lignes = couper(it.texte, lTexte, 8.5);
        const h = Math.max(chiffres ? 20 : 19, lignes.length * 10.5 + 8);
        if (page.y - h < BAS) { nouvellePage(); enTete(true); }
        const y0 = page.y - h;
        if (n % 2 === 0) fond(M, y0, LARG, h, "0.965 0.965 0.965");
        texte(M, y0 + h / 2 - 3, String(n), 8.5, true);
        lignes.forEach((l, k) => texte(xTexte, y0 + h / 2 + (lignes.length - 1) * 5.25 - k * 10.5 - 3, l, 8.5, false));
        trait(M, y0, W - M, y0);
        groupeRadio(it.nom, it.aide || sec.titre + ", question " + n, D, e.valeurs.map((v, k) => ({ valeur: v, x: xRadios + k * pas, y: y0 + (h - D) / 2, etiquette: chiffres ? v : "" })));
        if (sec.remarques) champTexte(it.nom + "_r", "Remarque, " + sec.titre + ", question " + n, [xRem, y0 + 2, W - M - 1, y0 + h - 2], { taille: 7.5, multiligne: true });
        page.y = y0;
      });
      if (sec.zone) zone(sec.zone);
      page.y -= sec.zone ? 26 : 16;
    });

    // ===== Fin : zones libres et priorités =====
    (spec.fin || []).forEach((b) => {
      if (b.type === "zone") { zone(b); page.y -= 10; return; }
      if (b.type !== "priorites") return;
      const hL = 30, xRang = M + 176, xPrec = xRang + 40;
      page.y -= 12;
      if (page.y - (60 + b.lignes.length * hL) < BAS) nouvellePage();
      fond(M, page.y - 6, LARG, 20, "0.9 0.9 0.9");
      texte(M + 6, page.y, b.titre, 10, true);
      page.y -= 20;
      if (b.note) { paragraphe(b.note, M + 4, LARG - 8, 8.5, false, true, 10.5); }
      page.y -= 4;
      texte(xRang - 2, page.y, "Ordre", 8, true);
      texte(xPrec, page.y, "Précisez", 8, true);
      page.y -= 5;
      b.lignes.forEach((l) => {
        const y0 = page.y - hL;
        fond(M, y0 + 1, 170, hL - 2, "0.86 0.92 0.83");
        const ls = couper(l.libelle, 160, 9, true);
        ls.forEach((t, k) => texte(M + 85 - largeur(t, 9, true) / 2, y0 + hL / 2 + (ls.length - 1) * 5.5 - k * 11 - 3, t, 9, true));
        champTexte(l.rang, "Ordre de priorité, " + l.libelle, [xRang, y0 + 5, xRang + 28, y0 + hL - 5], { taille: 12, max: 1, centre: true });
        champTexte(l.precision, "Précisions, " + l.libelle, [xPrec, y0 + 3, W - M, y0 + hL - 3], { taille: 8.5, multiligne: true });
        trait(M, y0, W - M, y0);
        page.y = y0;
      });
      page.y -= 14;
    });

    // Champ caché : relie le PDF au dossier (aucune donnée de santé).
    const meta = pdf.ajouter("<< /Type /Annot /Subtype /Widget /FT /Tx /T (outil_ergo) /Ff 1 /F 2 /V " + texteUtf16(JSON.stringify(spec.meta || {})) + " /Rect [0 0 0 0] /P " + listePages[0].num + " 0 R /DA (/Helv 0 Tf 0 g) >>");
    listePages[0].annots.push(meta);
    champs.push(meta);

    // Pied de page, numéros, objets des pages.
    listePages.forEach((p, i) => {
      page = p;
      texte(M, M - 14, spec.mention || "", 7, false, true);
      const num = (i + 1) + " / " + listePages.length;
      texte(W - M - largeur(num, 8), M - 14, num, 8, false, true);
      const contenu = pdf.flux("", p.contenu.join("\n"));
      pdf.definir(p.num, "<< /Type /Page /Parent " + pages + " 0 R /MediaBox [0 0 " + f2(W) + " " + f2(H) + "] /Resources << /Font << /F1 " + helv + " 0 R /F2 " + helvB + " 0 R >>" + (p.logo ? " /XObject << /Logo " + p.logo + " 0 R >>" : "") + " >> /Contents " + contenu + " 0 R /Annots [" + p.annots.map((a) => a + " 0 R").join(" ") + "] >>");
    });
    pdf.definir(pages, "<< /Type /Pages /Kids [" + listePages.map((p) => p.num + " 0 R").join(" ") + "] /Count " + listePages.length + " >>");
    pdf.definir(acro, "<< /Fields [" + champs.map((c) => c + " 0 R").join(" ") + "] /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv " + helv + " 0 R /ZaDb " + zadb + " 0 R >> >> >>");
    pdf.definir(catalogue, "<< /Type /Catalog /Pages " + pages + " 0 R /AcroForm " + acro + " 0 R >>");
    const info = pdf.ajouter("<< /Title " + texteUtf16(spec.titre || "Questionnaire") + " /Creator (Outil Ergo) >>");
    return pdf.octets(catalogue, info);
  }

  /* ================= ESO ================= */

  // Modèle vierge, le même pour tous les enfants : les parents écrivent eux-mêmes le nom de l'enfant.
  // o : { titre, cabinet: [lignes], contact, libelles: {sp, p, l}, mention }
  function specEso(o) {
    const valeurs = Array.from({ length: 11 }, (_, k) => String(k));
    return {
      titre: o.titre || "Profil de l'Engagement Sensori-Occupationnel (ESO)", source: o.source,
      cabinet: o.cabinet, logo: o.logo, mention: o.mention, meta: { type: "outil-ergo-eso", v: 2 },
      entete: [
        [{ type: "texte", nom: "eso_enfant", libelle: "Enfant (prénom et nom)", largeur: 214 }, { type: "texte", nom: "eso_naissance", libelle: "Né(e) le" }],
        [{ type: "texte", nom: "eso_repondant", libelle: "Rempli par", largeur: 264 }, { type: "texte", nom: "eso_date", libelle: "Le" }],
      ],
      consignes: [
        "Pour chaque phrase, cliquez sur le chiffre qui correspond le mieux à votre enfant, de 0 (jamais, pas du tout) à 10 (toujours, tout à fait). Il n'y a pas de bonne ou de mauvaise réponse. Pour changer une réponse, cliquez sur un autre chiffre.",
        "Une fois rempli, enregistrez le fichier (« Enregistrer » ou « Télécharger » dans votre lecteur PDF) et renvoyez-le" + (o.contact ? " à " + o.contact : " au cabinet") + ".",
        "Vous préférez le papier ? Imprimez-le et entourez les chiffres.",
      ],
      sections: DOMAINES.map((dm) => {
        const libs = (o.libelles && o.libelles[dm[0]]) || [];
        return {
          titre: dm[1], echelle: { valeurs: valeurs, chiffres: true, gauche: "0 = jamais", droite: "10 = toujours" },
          items: Array.from({ length: NB }, (_, i) => ({ nom: nomChamp(dm[0], i + 1), texte: libs[i] || "Question " + (i + 1), aide: dm[1] + ", question " + (i + 1) })),
        };
      }),
    };
  }
  function creerFormulaireEso(o) { return creerFormulaire(specEso(o)); }

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

  // Valeurs de tous les champs du PDF : { champs: { nom: valeur }, meta, formulaire }.
  async function lireChampsPdf(octets) {
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
    // Valeur portée par les cases (/AS) quand le parent n'en a pas d'utilisable.
    const vide = (v) => v === undefined || /^\/?(Off)?$/.test(String(v).trim());
    Object.keys(objets).forEach((num) => {
      const c = objets[num].corps;
      const parent = /\/Parent\s+(\d+)\s+\d+\s+R/.exec(c);
      const as = valeurCle(c, "AS");
      if (!parent || as === null || as === "Off") return;
      const nom = nomDe[parent[1]];
      if (nom && vide(champs[nom])) champs[nom] = as;
    });
    let meta = null;
    try { meta = champs.outil_ergo ? JSON.parse(champs.outil_ergo) : null; } catch (e) { meta = null; }
    return { champs: champs, meta: meta };
  }
  // Valeur d'un bouton radio (nom de l'état choisi), sans « / » éventuel ; "" si rien n'est coché.
  function choix(v) { const t = String(v === undefined || v === null ? "" : v).trim().replace(/^\//, ""); return t === "Off" ? "" : t; }
  function texteChamp(v) { return String(v === undefined || v === null ? "" : v).trim(); }

  // ESO : { reponses: { sp: {1: 5, …}, p, l }, nombre, enfant, naissance, repondant, date, meta, formulaire }.
  function depuisChampsEso(lu) {
    const champs = lu.champs, reponses = { sp: {}, p: {}, l: {} };
    let nombre = 0;
    Object.keys(champs).forEach((nom) => {
      const m = /^eso_(sp|p|l)_(\d{1,2})$/.exec(nom);
      if (!m) return;
      const brut = choix(champs[nom]);
      if (!/^\d+$/.test(brut)) return;
      const v = Number(brut), n = Number(m[2]);
      if (v > 10 || n < 1 || n > NB) return;
      reponses[m[1]][n] = v;
      nombre++;
    });
    return {
      reponses: reponses, nombre: nombre, enfant: texteChamp(champs.eso_enfant), naissance: texteChamp(champs.eso_naissance),
      repondant: texteChamp(champs.eso_repondant), date: texteChamp(champs.eso_date), meta: lu.meta,
      formulaire: Object.keys(champs).some((k) => /^eso_/.test(k)) || !!(lu.meta && lu.meta.type === "outil-ergo-eso"),
    };
  }
  async function lireFormulaireEso(octets) { return depuisChampsEso(await lireChampsPdf(octets)); }

  return { DOMAINES, NB, nomChamp, versWinAnsi, largeur, couper, imageJpeg, creerFormulaire, specEso, creerFormulaireEso, lireChampsPdf, choix, texteChamp, depuisChampsEso, lireFormulaireEso, objetsDuPdf };
});
