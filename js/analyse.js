/*
 * Outil Ergo : analyse locale de la photo de la copie du BHK (aucun envoi, aucune IA).
 * Traitement d'image classique : repérage de la feuille, séparation encre/papier, détection des lignes
 * d'écriture, puis mesures proposées à l'ergothérapeute, qui les vérifie avec les calques du manuel :
 *  - taille moyenne des lettres troncs (critère 1) ;
 *  - dérive de la marge vers la droite (critère 2) ;
 *  - lignes dont la base ondule (critère 3) ;
 *  - espaces entre les mots (critère 4, à titre indicatif).
 * L'image attendue : { width, height, data } (RGBA, comme ImageData).
 */
(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.Analyse = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const A4 = { l: 210, h: 297 };

  function gris(img) {
    const n = img.width * img.height, g = new Uint8Array(n), d = img.data;
    for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000;
    return g;
  }

  // Seuil d'Otsu sur l'histogramme des niveaux de gris.
  function otsu(g) {
    const h = new Float64Array(256);
    for (let i = 0; i < g.length; i++) h[g[i]]++;
    let somme = 0;
    for (let i = 0; i < 256; i++) somme += i * h[i];
    let sB = 0, wB = 0, meilleur = 0, seuil = 128;
    for (let t = 0; t < 256; t++) {
      wB += h[t];
      if (!wB) continue;
      const wF = g.length - wB;
      if (!wF) break;
      sB += t * h[t];
      const mB = sB / wB, mF = (somme - sB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if (v > meilleur) { meilleur = v; seuil = t; }
    }
    return seuil;
  }

  // Plus longue suite d'indices où f(i) est vrai.
  function plusLongue(n, f) {
    let deb = -1, best = [0, -1];
    for (let i = 0; i <= n; i++) {
      if (i < n && f(i)) { if (deb < 0) deb = i; }
      else if (deb >= 0) { if (i - 1 - deb > best[1] - best[0]) best = [deb, i - 1]; deb = -1; }
    }
    return best;
  }

  // La feuille est la zone claire la plus grande ; son échelle vient de la largeur d'une feuille A4.
  function trouverFeuille(g, W, H) {
    const t = otsu(g);
    const colonnes = new Float64Array(W), lignes = new Float64Array(H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x] > t) { colonnes[x]++; lignes[y]++; }
    const cx = plusLongue(W, (x) => colonnes[x] > 0.35 * H), cy = plusLongue(H, (y) => lignes[y] > 0.35 * W);
    let x0 = cx[0], x1 = cx[1], y0 = cy[0], y1 = cy[1];
    const larg = x1 - x0 + 1, haut = y1 - y0 + 1;
    let detectee = larg > 0.3 * W && haut > 0.3 * H;
    if (!detectee) { x0 = 0; x1 = W - 1; y0 = 0; y1 = H - 1; }
    const rapport = (y1 - y0 + 1) / (x1 - x0 + 1);
    const entiere = detectee && Math.abs(rapport - A4.h / A4.l) < 0.12;
    const pxParMm = (x1 - x0 + 1) / A4.l;
    return { x0: x0, y0: y0, x1: x1, y1: y1, detectee: detectee, entiere: entiere, rapport: rapport, pxParMm: pxParMm, seuil: t };
  }

  // Encre : pixel nettement plus sombre que son voisinage (seuil local, robuste aux ombres).
  function masqueEncre(g, W, H, f, fenetre) {
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
      let s = 0;
      for (let x = 0; x < W; x++) { s += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + s; }
    }
    const r = Math.max(4, Math.round(fenetre / 2)), m = new Uint8Array(W * H);
    const marge = Math.round(Math.min(f.x1 - f.x0, f.y1 - f.y0) * 0.025);
    const xa = f.x0 + marge, xb = f.x1 - marge, ya = f.y0 + marge, yb = f.y1 - marge;
    for (let y = ya; y <= yb; y++) {
      const y1 = Math.max(0, y - r), y2 = Math.min(H - 1, y + r);
      for (let x = xa; x <= xb; x++) {
        const x1 = Math.max(0, x - r), x2 = Math.min(W - 1, x + r);
        const aire = (x2 - x1 + 1) * (y2 - y1 + 1);
        const somme = I[(y2 + 1) * (W + 1) + x2 + 1] - I[y1 * (W + 1) + x2 + 1] - I[(y2 + 1) * (W + 1) + x1] + I[y1 * (W + 1) + x1];
        const moy = somme / aire, v = g[y * W + x];
        if (v < moy - Math.max(18, 0.16 * moy)) m[y * W + x] = 1;
      }
    }
    return m;
  }

  function lisser(t, r) {
    const out = new Float64Array(t.length);
    let s = 0;
    for (let i = 0; i < t.length + r; i++) {
      if (i < t.length) s += t[i];
      if (i - 2 * r - 1 >= 0) s -= t[i - 2 * r - 1];
      const c = i - r;
      if (c >= 0 && c < t.length) out[c] = s / (Math.min(t.length - 1, c + r) - Math.max(0, c - r) + 1);
    }
    return out;
  }

  function regression(pts) {
    const n = pts.length;
    if (n < 2) return { a: 0, b: n ? pts[0][1] : 0 };
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach((p) => { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    const d = n * sxx - sx * sx;
    const a = d ? (n * sxy - sx * sy) / d : 0;
    return { a: a, b: (sy - a * sx) / n };
  }

  function mediane(l) {
    if (!l.length) return null;
    const t = l.slice().sort((a, b) => a - b), m = Math.floor(t.length / 2);
    return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
  }

  /* ---------- Lignes d'écriture ---------- */

  function trouverLignes(m, W, H, f) {
    const p = new Float64Array(H);
    for (let y = f.y0; y <= f.y1; y++) { let s = 0; for (let x = f.x0; x <= f.x1; x++) s += m[y * W + x]; p[y] = s; }
    const ps = lisser(p, Math.max(1, Math.round(0.3 * f.pxParMm)));
    let max = 0;
    for (let y = 0; y < H; y++) max = Math.max(max, ps[y]);
    if (!max) return [];
    const ecartMin = Math.round(5 * f.pxParMm);
    const pics = [];
    for (let y = 1; y < H - 1; y++) {
      if (ps[y] < 0.2 * max || ps[y] < ps[y - 1] || ps[y] < ps[y + 1]) continue;
      const dernier = pics[pics.length - 1];
      if (dernier !== undefined && y - dernier < ecartMin) { if (ps[y] > ps[dernier]) pics[pics.length - 1] = y; continue; }
      pics.push(y);
    }
    const lignes = [];
    pics.forEach((yc) => {
      // Bande « tronc » : rangées où la densité dépasse la moitié du pic.
      const seuil = 0.5 * ps[yc];
      let a = yc, b = yc;
      while (a > f.y0 && ps[a - 1] >= seuil) a--;
      while (b < f.y1 && ps[b + 1] >= seuil) b++;
      const hauteur = b - a + 1;
      if (hauteur < 0.8 * f.pxParMm || hauteur > 15 * f.pxParMm) return;
      lignes.push({ centre: yc, haut: a, bas: b, coeur: hauteur, force: ps[yc] });
    });
    // Une ligne qui monte et descend beaucoup peut donner deux pics proches : on les regroupe
    // quand ils sont bien plus proches que l'interligne habituel de la copie.
    if (lignes.length >= 3) {
      const ecarts = [];
      for (let i = 1; i < lignes.length; i++) ecarts.push(lignes[i].centre - lignes[i - 1].centre);
      const usuel = ecarts.slice().sort((x, y) => x - y)[Math.floor(ecarts.length / 2)];
      // On regroupe d'abord les deux pics les plus proches, puis on recommence.
      for (;;) {
        let i = -1, plusPetit = Infinity;
        for (let k = 1; k < lignes.length; k++) {
          const e = lignes[k].centre - lignes[k - 1].centre;
          if (e < plusPetit) { plusPetit = e; i = k; }
        }
        if (i < 0 || plusPetit >= 0.65 * usuel) break;
        const L0 = lignes[i - 1], L1 = lignes[i];
        const fort = L0.force >= L1.force ? L0 : L1;
        lignes.splice(i - 1, 2, { centre: fort.centre, haut: Math.min(L0.haut, L1.haut), bas: Math.max(L0.bas, L1.bas), coeur: Math.min(L0.coeur, L1.coeur), force: fort.force });
      }
    }
    return lignes;
  }

  function mesurerLigne(L, m, W, f) {
    const c = L.coeur;
    const ya = Math.max(f.y0, Math.round(L.haut - 0.7 * c)), yb = Math.min(f.y1, Math.round(L.bas + 0.7 * c));
    const col = new Uint16Array(W);
    for (let x = f.x0; x <= f.x1; x++) { let s = 0; for (let y = ya; y <= yb; y++) s += m[y * W + x]; col[x] = s; }
    // Étendue : colonnes encrées, en ignorant les points isolés.
    const min = Math.max(2, Math.round(0.6 * f.pxParMm));
    const runs = [];
    let deb = -1;
    for (let x = f.x0; x <= f.x1 + 1; x++) {
      const encre = x <= f.x1 && col[x] > 0;
      if (encre && deb < 0) deb = x;
      if (!encre && deb >= 0) { runs.push([deb, x - 1]); deb = -1; }
    }
    const utiles = runs.filter((r) => r[1] - r[0] + 1 >= min);
    if (!utiles.length) return null;
    const gauche = utiles[0][0], droite = utiles[utiles.length - 1][1];
    // Espaces entre les mots : trous d'au moins un tiers de la hauteur des lettres (en cursive, les lettres d'un mot sont liées).
    const espaces = [];
    for (let i = 1; i < utiles.length; i++) {
      const e = utiles[i][0] - utiles[i - 1][1] - 1;
      if (e >= 0.3 * c) espaces.push(e);
    }
    const colles = !espaces.length && droite - gauche > 20 * c;
    // Base des lettres troncs, tranche par tranche : bas de la bande dense (au moins la moitié du maximum de la tranche).
    const largeurTranche = Math.max(4, Math.round(1.5 * c));
    const points = [];
    for (let x0 = gauche; x0 + largeurTranche / 2 <= droite; x0 += largeurTranche) {
      const x1 = Math.min(droite, x0 + largeurTranche - 1);
      const brut = [];
      for (let y = ya; y <= yb; y++) { let s2 = 0; for (let x = x0; x <= x1; x++) s2 += m[y * W + x]; brut.push(s2); }
      const prof = brut.map((v, i) => (v + (brut[i - 1] || v) + (brut[i + 1] || v)) / 3);
      let iMax = 0;
      for (let i = 1; i < prof.length; i++) if (prof[i] > prof[iMax]) iMax = i;
      if (prof[iMax] < 0.25 * c) continue;
      let haut = iMax, bas = iMax;
      while (haut > 0 && prof[haut - 1] >= 0.5 * prof[iMax]) haut--;
      while (bas + 1 < prof.length && prof[bas + 1] >= 0.5 * prof[iMax]) bas++;
      if (bas - haut + 1 < 0.4 * c) continue;
      points.push([(x0 + x1) / 2, ya + bas]);
    }
    let ecart = 0;
    if (points.length >= 3) {
      // L'inclinaison générale de la ligne ne compte pas : on mesure l'écart à la droite moyenne,
      // en écartant le point le plus éloigné (une lettre isolée ne suffit pas à rendre la ligne non plane).
      const d = regression(points);
      const residus = points.map((p) => Math.abs(p[1] - (d.a * p[0] + d.b))).sort((u, v) => v - u);
      ecart = residus.length >= 5 ? residus[1] : residus[0];
    }
    return { gauche: gauche, droite: droite, espaces: espaces, colles: colles, points: points, ecart: ecart, zoneHaut: ya, zoneBas: yb };
  }

  // Photo un peu penchée : on cherche l'inclinaison des lignes (cisaillement vertical) qui rend la projection la plus contrastée.
  function redresser(m, W, H, f) {
    const pas = Math.max(1, Math.round((f.x1 - f.x0) / 400));
    const xc = (f.x0 + f.x1) / 2;
    const score = (t) => {
      const p = new Float64Array(H);
      for (let y = f.y0; y <= f.y1; y += 1) for (let x = f.x0; x <= f.x1; x += pas) {
        if (!m[y * W + x]) continue;
        const yy = Math.round(y - t * (x - xc));
        if (yy >= 0 && yy < H) p[yy]++;
      }
      let s = 0;
      for (let i = 0; i < H; i++) s += p[i] * p[i];
      return s;
    };
    let best = 0, bestScore = score(0);
    for (let d = -6; d <= 6; d += 1) { const t = Math.tan((d * Math.PI) / 180), v = score(t); if (v > bestScore) { bestScore = v; best = t; } }
    const centre = best;
    for (let d = -0.75; d <= 0.75; d += 0.25) { const t = centre + Math.tan((d * Math.PI) / 180), v = score(t); if (v > bestScore) { bestScore = v; best = t; } }
    if (Math.abs(best) < 1e-4) return { m: m, t: 0 };
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = f.x0; x <= f.x1; x++) {
      const ys = Math.round(y + best * (x - xc));
      if (ys >= 0 && ys < H && m[ys * W + x]) out[y * W + x] = 1;
    }
    return { m: out, t: best };
  }

  /* ---------- Analyse ---------- */

  // options.pentesMarge : pentes des lignes 1 à 5 du calque B (horizontal / vertical), si disponibles.
  function analyser(img, options) {
    const o = options || {};
    const W = img.width, H = img.height;
    if (!W || !H || W < 200 || H < 200) return { ok: false, message: "Image trop petite pour être analysée." };
    const g = gris(img);
    const f = trouverFeuille(g, W, H);
    const r0 = redresser(masqueEncre(g, W, H, f, 8 * f.pxParMm), W, H, f);
    const m = r0.m;
    const lignes = trouverLignes(m, W, H, f).map((L) => Object.assign(L, mesurerLigne(L, m, W, f) || {})).filter((L) => L.gauche !== undefined);
    if (lignes.length < 2) return { ok: false, feuille: f, message: "Aucune ligne d'écriture reconnue. Reprenez la photo bien à plat, de face, avec la feuille entière et une bonne lumière." };
    const mm = (px) => px / f.pxParMm;

    const coeurs = lignes.map((L) => L.coeur);
    const med = mediane(coeurs);
    const taille = mediane(coeurs.filter((c) => c > 0.6 * med && c < 1.6 * med));
    // Dérive de la marge : position de la première lettre de chaque ligne.
    const premiere = lignes[0], derniere = lignes[lignes.length - 1];
    const vertical = derniere.centre - premiere.centre;
    // Corrigée de l'inclinaison de la photo : la marge se juge par rapport au bord de la feuille.
    const brute = vertical > 0 ? (derniere.gauche - premiere.gauche) / vertical : 0;
    const pente = (brute + r0.t) / (1 - brute * r0.t);
    let points2 = null;
    if (Array.isArray(o.pentesMarge) && o.pentesMarge.length === 5) points2 = o.pentesMarge.filter((p) => pente >= p).length;

    const seuilOndulation = Math.max(1.5 * f.pxParMm, 0.45 * taille);
    const detail = lignes.map((L, i) => ({
      numero: i + 1,
      tailleMm: mm(L.coeur), margeMm: mm(L.gauche - f.x0),
      ondulationMm: mm(L.ecart), nonPlane: L.points.length >= 3 && L.ecart > seuilOndulation,
      espaceMinMm: L.espaces.length ? mm(Math.min.apply(null, L.espaces)) : null,
      motsSerres: L.colles ? true : L.espaces.length ? Math.min.apply(null, L.espaces) < 0.8 * taille : null,
      boite: { x0: L.gauche, x1: L.droite, y0: L.zoneHaut, y1: L.zoneBas },
      coeur: { y0: L.haut, y1: L.bas }, base: L.points,
    }));

    const avert = [];
    if (!f.detectee) avert.push("La feuille n'a pas été repérée : l'échelle suppose que la photo montre toute la largeur d'une feuille A4.");
    else if (!f.entiere) avert.push("La feuille repérée n'a pas les proportions d'une feuille A4 entière : les mesures en millimètres sont approximatives.");
    if (lignes.length < 5) avert.push("Moins de 5 lignes reconnues : vérifiez la photo.");

    return {
      ok: true, feuille: f, avertissements: avert, inclinaisonPhoto: (Math.atan(r0.t) * 180) / Math.PI,
      nbLignes: lignes.length,
      tailleMm: mm(taille),
      marge: { deriveMm: mm(pente * vertical), pente: pente, degres: (Math.atan(pente) * 180) / Math.PI, points: points2 },
      lignes: detail,
    };
  }

  return { analyser: analyser, otsu: otsu, trouverFeuille: trouverFeuille, A4: A4 };
});
