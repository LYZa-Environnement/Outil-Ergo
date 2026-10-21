/*
 * Outil Ergo : graphiques du bilan sensoriel en SVG autonome (couleurs fixes, fond blanc),
 * affichés dans la page et convertis en images pour le fichier Word.
 * Dépend de js/sensoriel.js.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique(require("./sensoriel.js"));
  else racine.Graph = fabrique(racine.Senso);
})(typeof self !== "undefined" ? self : this, function (S) {
  "use strict";

  const POLICE = "Arial, Helvetica, sans-serif";
  const ENCRE = "#23408E";
  const TRAIT = "#333333";

  function x(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function n(v) { return Math.round(v * 10) / 10; }
  function svg(l, h, contenu, titre) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${l}" height="${h}" viewBox="0 0 ${l} ${h}" role="img" aria-label="${x(titre)}" font-family="${POLICE}">` +
      `<rect width="${l}" height="${h}" fill="#FFFFFF"/>${contenu}</svg>`;
  }
  function polaire(cx, cy, r, deg) { const a = (deg * Math.PI) / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function secteur(cx, cy, r0, r1, a0, a1) {
    const [x1, y1] = polaire(cx, cy, r1, a0), [x2, y2] = polaire(cx, cy, r1, a1);
    const [x3, y3] = polaire(cx, cy, r0, a1), [x4, y4] = polaire(cx, cy, r0, a0);
    const grand = a1 - a0 > 180 ? 1 : 0;
    return `M${n(x1)} ${n(y1)} A${r1} ${r1} 0 ${grand} 1 ${n(x2)} ${n(y2)} L${n(x3)} ${n(y3)} A${r0} ${r0} 0 ${grand} 0 ${n(x4)} ${n(y4)} Z`;
  }

  /* ---------- Profil OC (OTIPIS) ---------- */

  function profilOC(o) {
    const L = 720, H = 780, cx = 360, cy = 405, r0 = 44, rayons = [0, 118, 200, 282];
    const ordre = S.ORDRE_PROFIL.map((id) => S.OTIPIS.find((it) => it.id === id));
    const N = ordre.length, pas = 360 / N;
    const angle = (i) => -90 + (i + 0.5) * pas;
    const couleur = (dom) => S.DOMAINES_OC.find((d) => d.id === dom).couleur;
    let c = "";

    // Secteurs colorés et séparations
    S.DOMAINES_OC.forEach((dm) => {
      const idx = ordre.map((it, i) => (it.domaine === dm.id ? i : -1)).filter((i) => i >= 0);
      const a0 = -90 + idx[0] * pas, a1 = -90 + (idx[idx.length - 1] + 1) * pas;
      c += `<path d="${secteur(cx, cy, r0, rayons[3], a0, a1)}" fill="${dm.couleur}" fill-opacity="0.07"/>`;
    });
    [1, 2, 3].forEach((k) => { c += `<circle cx="${cx}" cy="${cy}" r="${rayons[k]}" fill="none" stroke="${TRAIT}" stroke-width="1.6"/>`; });
    ordre.forEach((it, i) => {
      const [x1, y1] = polaire(cx, cy, r0, angle(i)), [x2, y2] = polaire(cx, cy, rayons[3], angle(i));
      c += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${couleur(it.domaine)}" stroke-width="0.9"/>`;
    });
    ordre.forEach((it, i) => {
      if (i > 0 && ordre[i - 1].domaine === it.domaine) return;
      const a = -90 + i * pas;
      const [x1, y1] = polaire(cx, cy, r0, a), [x2, y2] = polaire(cx, cy, rayons[3] + 10, a);
      c += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="#111" stroke-width="2.6"/>`;
    });
    // Libellés des items
    ordre.forEach((it, i) => {
      const a = angle(i);
      const [lx, ly] = polaire(cx, cy, rayons[3] + 8, a);
      const gauche = a > 90 && a < 270;
      const rot = gauche ? a + 180 : a;
      c += `<text x="${n(lx)}" y="${n(ly)}" font-size="11" font-weight="700" fill="${couleur(it.domaine)}" text-anchor="${gauche ? "end" : "start"}" dominant-baseline="middle" transform="rotate(${n(rot)} ${n(lx)} ${n(ly)})">${x(it.code)}</text>`;
    });

    // Tracé du profil
    const pts = [];
    ordre.forEach((it, i) => {
      const v = o.scores[it.id];
      if (!v) return;
      const [px, py] = polaire(cx, cy, rayons[v], angle(i));
      pts.push([px, py, it]);
    });
    if (pts.length > 2) c += `<polygon points="${pts.map((p) => n(p[0]) + "," + n(p[1])).join(" ")}" fill="${ENCRE}" fill-opacity="0.12" stroke="${ENCRE}" stroke-width="1.6" stroke-linejoin="round"/>`;
    c += `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="#FFFFFF" stroke="${TRAIT}" stroke-width="1.6"/>`;
    [1, 2, 3].forEach((k) => { c += `<text x="${cx + 5}" y="${cy - rayons[k] + 15}" font-size="13" font-weight="700" fill="#111">${k}</text>`; });
    pts.forEach((p) => { c += `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="5" fill="${couleur(p[2].domaine)}" stroke="#FFFFFF" stroke-width="1.5"/>`; });

    // Titres
    c += `<text x="${L / 2}" y="28" font-size="18" font-weight="700" fill="#111" text-anchor="middle">Profil des observations cliniques (OTIPIS)</text>`;
    const coin = (dom, tx, ty, ancre) => { const d = S.DOMAINES_OC.find((z) => z.id === dom); c += `<text x="${tx}" y="${ty}" font-size="15" font-weight="700" fill="${d.couleur}" text-anchor="${ancre}">${x(d.nom)}</text>`; };
    coin("modulation", 18, 64, "start");
    coin("discrimination", L - 18, 64, "end");
    coin("praxies", 18, H - 44, "start");
    coin("postural", L - 18, H - 44, "end");
    const lat = [o.main ? "main " + o.main : "", o.oeil ? "œil " + o.oeil : "", o.pied ? "pied " + o.pied : ""].filter(Boolean);
    if (lat.length) c += `<text x="${L / 2}" y="${H - 14}" font-size="13" fill="#333" text-anchor="middle">Latéralité : ${x(lat.join(", "))}</text>`;
    c += `<text x="${L / 2}" y="${H - 44}" font-size="11" fill="#555" text-anchor="middle">Cercles : 1 difficultés marquées, 2 quelques difficultés, 3 adapté</text>`;
    return { svg: svg(L, H, c, "Profil des observations cliniques OTIPIS"), l: L, h: H };
  }

  /* ---------- Profil sensoriel 2 de Dunn ---------- */

  const FONDS_CLASSE = { bm: "#F4CCCC", m: "#FCE5CD", c: "#DDEBD7", p: "#FCE5CD", bp: "#F4CCCC" };

  function profilDunn(forme, donnees) {
    const f = S.FORMES_DUNN[forme];
    const lignes = S.lignesDunn(forme, donnees);
    const lab = 210, col = 84, L = lab + col * 5 + 14, haut = 84;
    const hLigne = 25, hGroupe = 27;
    const H = haut + f.groupes.length * hGroupe + lignes.length * hLigne + 14;
    let c = `<text x="${L / 2}" y="24" font-size="16" font-weight="700" fill="#111" text-anchor="middle">${x(f.titre)}</text>`;
    S.CLASSIFICATIONS.forEach((cl, k) => {
      const x0 = lab + k * col;
      c += `<rect x="${x0}" y="${haut - 44}" width="${col}" height="${H - haut + 30}" fill="${FONDS_CLASSE[cl.id]}" fill-opacity="0.55"/>`;
      const mots = cl.court.split(" ");
      const l1 = mots.length > 2 ? mots.slice(0, 2).join(" ") : mots[0], l2 = mots.length > 2 ? mots.slice(2).join(" ") : mots.slice(1).join(" ");
      c += `<text x="${x0 + col / 2}" y="${haut - 26}" font-size="11.5" font-weight="700" fill="#222" text-anchor="middle">${x(l1)}</text>`;
      if (l2) c += `<text x="${x0 + col / 2}" y="${haut - 12}" font-size="11.5" font-weight="700" fill="#222" text-anchor="middle">${x(l2)}</text>`;
    });
    let y = haut;
    f.groupes.forEach((g) => {
      c += `<rect x="6" y="${y}" width="${L - 12}" height="${hGroupe}" fill="#DCE3F0"/>`;
      c += `<text x="14" y="${y + 18}" font-size="13" font-weight="700" fill="#1F3A5F">${x(g.titre)}</text>`;
      y += hGroupe;
      const pts = [];
      lignes.filter((r) => r.groupe === g.titre).forEach((r) => {
        c += `<line x1="6" x2="${L - 8}" y1="${y + hLigne}" y2="${y + hLigne}" stroke="#D8DCE6" stroke-width="1"/>`;
        c += `<text x="14" y="${y + 17}" font-size="12.5" fill="#222">${x(r.nom)}${r.brut !== null ? ` <tspan fill="#666">(${String(r.brut).replace(".", ",")})</tspan>` : ""}</text>`;
        const k = S.CLASSIFICATIONS.findIndex((cl) => cl.id === r.classe);
        if (k >= 0) pts.push([lab + k * col + col / 2, y + hLigne / 2]);
        y += hLigne;
      });
      if (pts.length > 1) c += `<polyline points="${pts.map((p) => n(p[0]) + "," + n(p[1])).join(" ")}" fill="none" stroke="${ENCRE}" stroke-width="1.5" stroke-opacity="0.6"/>`;
      pts.forEach((p) => { c += `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="6.5" fill="${ENCRE}"/>`; });
    });
    return { svg: svg(L, H, c, f.titre), l: L, h: H };
  }

  /* ---------- ESO ---------- */

  function rouesEso(e) {
    const val = S.valeursRoues(e);
    const L = 840, H = 340, R = 110, cy = 190;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">Profil ESO par domaine d'occupation</text>`;
    S.DOMAINES_ESO.forEach((dm, k) => {
      const cx = 140 + k * 280;
      c += `<text x="${cx}" y="58" font-size="14" font-weight="700" fill="#1F3A5F" text-anchor="middle">${x(dm[1])}</text>`;
      const nS = S.SECTEURS_ESO.length, pas = 360 / nS;
      S.SECTEURS_ESO.forEach((sc, i) => {
        const a0 = -90 - pas / 2 + i * pas, a1 = a0 + pas;
        const v = val[dm[0]][sc];
        if (v !== null && v > 0) c += `<path d="${secteur(cx, cy, 0.01, Math.min(3, v) / 3 * R, a0, a1)}" fill="${ENCRE}" fill-opacity="0.35" stroke="${ENCRE}" stroke-width="1"/>`;
        const [x1, y1] = polaire(cx, cy, R, a0);
        c += `<line x1="${cx}" y1="${cy}" x2="${n(x1)}" y2="${n(y1)}" stroke="${TRAIT}" stroke-width="1.4"/>`;
        const [lx, ly] = polaire(cx, cy, R + 17, a0 + pas / 2);
        c += `<text x="${n(lx)}" y="${n(ly)}" font-size="12" font-weight="700" fill="#222" text-anchor="middle" dominant-baseline="middle">${sc}</text>`;
        if (v !== null) {
          const [vx, vy] = polaire(cx, cy, R * 0.82, a0 + pas / 2);
          c += `<text x="${n(vx)}" y="${n(vy)}" font-size="10" fill="#1F3A5F" text-anchor="middle" dominant-baseline="middle">${String(v).replace(".", ",")}</text>`;
        }
      });
      [1, 2, 3].forEach((r) => { c += `<circle cx="${cx}" cy="${cy}" r="${(R * r) / 3}" fill="none" stroke="${TRAIT}" stroke-width="1.3"/>`; });
    });
    c += `<text x="${L / 2}" y="${H - 12}" font-size="11" fill="#555" text-anchor="middle">Cercles de 1 à 3, comme sur la fiche de synthèse</text>`;
    return { svg: svg(L, H, c, "Profil ESO par domaine d'occupation"), l: L, h: H };
  }

  function systemesEso(e) {
    const sys = S.systemesEso(e);
    const lab = 170, larg = 420, L = lab + larg + 60, h = 30, haut = 50;
    const H = haut + sys.length * h + 40;
    const X = (p) => lab + (Math.max(0, Math.min(100, p)) / 100) * larg;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">Systèmes sensoriels (ESO)</text>`;
    [0, 20, 40, 60, 80, 100].forEach((t) => {
      c += `<line x1="${X(t)}" x2="${X(t)}" y1="${haut - 6}" y2="${haut + sys.length * h}" stroke="#D8DCE6" stroke-width="1"/>`;
      c += `<text x="${X(t)}" y="${haut + sys.length * h + 18}" font-size="11" fill="#555" text-anchor="middle">${t}</text>`;
    });
    c += `<line x1="${X(S.REPERE_ESO)}" x2="${X(S.REPERE_ESO)}" y1="${haut - 10}" y2="${haut + sys.length * h + 4}" stroke="#D23B3B" stroke-width="1.8" stroke-dasharray="6 4"/>`;
    c += `<text x="${X(S.REPERE_ESO)}" y="${haut - 14}" font-size="11" fill="#D23B3B" text-anchor="middle">${S.REPERE_ESO}</text>`;
    sys.forEach((s, i) => {
      const y = haut + i * h;
      c += `<text x="${lab - 10}" y="${y + 19}" font-size="13" fill="#222" text-anchor="end">${x(s.nom)}</text>`;
      c += `<rect x="${lab}" y="${y + 6}" width="${larg}" height="${h - 12}" fill="none" stroke="#444" stroke-width="1"/>`;
      if (s.pourcentage !== null) {
        c += `<rect x="${lab}" y="${y + 6}" width="${n(X(s.pourcentage) - lab)}" height="${h - 12}" fill="${ENCRE}" fill-opacity="0.75"/>`;
        c += `<text x="${n(X(s.pourcentage) + 6)}" y="${y + 19}" font-size="12" font-weight="700" fill="#1F3A5F">${Math.round(s.pourcentage)} %</text>`;
      }
    });
    return { svg: svg(L, H, c, "Systèmes sensoriels du profil ESO"), l: L, h: H };
  }

  /* ---------- Graphiques calculés à partir des résultats (données préparées par bhk.js) ---------- */

  const NIVEAUX = {
    patho: ["#F4CCCC", "#C0392B"], inferieur: ["#FCE5CD", "#C77B12"], moyenne: ["#DDEBD7", "#2E7D4F"], superieur: ["#D5E4F2", "#23408E"],
  };
  const VERT = "#2E7D4F", VERT_CLAIR = "#A9D3B8", AMBRE = "#C77B12", CORAIL = "#C0392B";
  function fr(v, d) { return (d === undefined ? String(Math.round(v * 100) / 100) : v.toFixed(d)).replace(".", ","); }
  function signeDS(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + fr(Math.abs(v), 2); }
  function coupe(t, max) { t = String(t); return t.length > max ? t.slice(0, max - 1) + "…" : t; }

  // Échelle de DS commune : zones d'interprétation en fond.
  function axeDS(X, haut, bas, s, vmin, vmax) {
    let c = "";
    const zone = (a, b, couleur) => {
      const x1 = X(Math.max(vmin, a)), x2 = X(Math.min(vmax, b));
      if (x2 > x1) c += `<rect x="${n(x1)}" y="${haut}" width="${n(x2 - x1)}" height="${bas - haut}" fill="${couleur}" fill-opacity="0.75"/>`;
    };
    zone(vmin, -s.patho, NIVEAUX.patho[0]); zone(-s.patho, -s.inferieur, NIVEAUX.inferieur[0]);
    zone(-s.inferieur, s.superieur, NIVEAUX.moyenne[0]); zone(s.superieur, vmax, NIVEAUX.superieur[0]);
    for (let v = vmin; v <= vmax; v++) {
      c += `<line x1="${n(X(v))}" x2="${n(X(v))}" y1="${haut}" y2="${bas}" stroke="${v === 0 ? "#555" : "#FFFFFF"}" stroke-width="${v === 0 ? 1.4 : 1}"/>`;
      c += `<text x="${n(X(v))}" y="${bas + 16}" font-size="11" fill="#444" text-anchor="middle">${v > 0 ? "+" + v : v < 0 ? "−" + -v : "0"}</text>`;
    }
    return c;
  }

  function profilDS(d) {
    const lignes = d.lignes, s = d.seuils, vmin = -4, vmax = 3;
    const lab = 270, larg = 380, L = lab + larg + 90, h = 30, haut = 58;
    const H = haut + lignes.length * h + 46;
    const X = (v) => lab + ((Math.max(vmin, Math.min(vmax, v)) - vmin) / (vmax - vmin)) * larg;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">Profil des résultats (déviations standard)</text>`;
    c += `<text x="${L / 2}" y="44" font-size="11" fill="#555" text-anchor="middle">À gauche de 0 : en dessous de la moyenne des enfants du même âge ou de la même classe</text>`;
    c += axeDS(X, haut, haut + lignes.length * h, s, vmin, vmax);
    lignes.forEach((r, i) => {
      const y = haut + i * h + h / 2;
      c += `<text x="${lab - 10}" y="${y + 4}" font-size="12" fill="#222" text-anchor="end"><tspan font-weight="700">${x(r.bilan)}</tspan> ${x(coupe(r.epreuve, 30))}</text>`;
      if (i) c += `<line x1="${lab}" x2="${lab + larg}" y1="${haut + i * h}" y2="${haut + i * h}" stroke="#FFFFFF" stroke-width="1"/>`;
      const col = (NIVEAUX[r.niveau] || ["", "#555"])[1];
      c += `<line x1="${n(X(0))}" x2="${n(X(r.ds))}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="3" stroke-opacity="0.55"/>`;
      c += `<circle cx="${n(X(r.ds))}" cy="${y}" r="7" fill="${col}" stroke="#FFFFFF" stroke-width="1.5"/>`;
      if (r.ds < vmin || r.ds > vmax) c += `<text x="${n(X(r.ds) + (r.ds < vmin ? -12 : 12))}" y="${y + 4}" font-size="12" fill="${col}" text-anchor="middle">${r.ds < vmin ? "◀" : "▶"}</text>`;
      c += `<text x="${lab + larg + 10}" y="${y + 4}" font-size="12" font-weight="700" fill="${col}">${signeDS(r.ds)}</text>`;
    });
    return { svg: svg(L, H, c, "Profil des résultats en déviations standard"), l: L, h: H };
  }

  function criteresBHK(d) {
    const lab = 300, larg = 300, L = lab + larg + 110, h = 26, haut = 46;
    const H = haut + d.criteres.length * h + 34;
    const X = (v) => lab + (v / 5) * larg;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">${x(d.titre)}</text>`;
    for (let v = 0; v <= 5; v++) {
      c += `<line x1="${X(v)}" x2="${X(v)}" y1="${haut - 4}" y2="${haut + d.criteres.length * h}" stroke="#E1E5EC" stroke-width="1"/>`;
      c += `<text x="${X(v)}" y="${haut + d.criteres.length * h + 16}" font-size="11" fill="#555" text-anchor="middle">${v}</text>`;
    }
    d.criteres.forEach((k, i) => {
      const y = haut + i * h;
      c += `<text x="${lab - 10}" y="${y + 17}" font-size="12" fill="#222" text-anchor="end"><tspan font-weight="700">${x(k.id)}</tspan> ${x(coupe(k.nom, 38))}</text>`;
      const col = k.niveau ? NIVEAUX[k.niveau][1] : k.score === 0 ? VERT : k.score <= 2 ? AMBRE : CORAIL;
      if (k.score > 0) c += `<rect x="${lab}" y="${y + 5}" width="${n(X(k.score) - lab)}" height="${h - 10}" rx="3" fill="${col}" fill-opacity="0.8"/>`;
      else c += `<circle cx="${lab + 5}" cy="${y + h / 2}" r="4" fill="${VERT}"/>`;
      c += `<text x="${n(X(Math.max(k.score, 0.15)) + 8)}" y="${y + 17}" font-size="12" font-weight="700" fill="${col}">${k.score}/5${k.ds !== null && k.ds !== undefined ? "  (DS " + signeDS(k.ds) + ")" : ""}</text>`;
    });
    return { svg: svg(L, H, c, d.titre), l: L, h: H };
  }

  function mcro(d) {
    const lab = 250, larg = 360, L = lab + larg + 40, hBloc = d.reeval ? 50 : 32, haut = d.reeval ? 80 : 66;
    const H = haut + d.problemes.length * hBloc + 40;
    const X = (v) => lab + (v / 10) * larg;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">MCRO : rendement et satisfaction (sur 10)</text>`;
    const legende = [["Rendement", "#2E7D4F"], ["Satisfaction", "#E0A106"]];
    legende.forEach((lg, k) => {
      c += `<rect x="${L / 2 - 110 + k * 130}" y="36" width="14" height="14" rx="3" fill="${lg[1]}"/><text x="${L / 2 - 90 + k * 130}" y="48" font-size="12" fill="#333">${lg[0]}</text>`;
    });
    if (d.reeval) c += `<text x="${L / 2}" y="64" font-size="11" fill="#555" text-anchor="middle">Barres claires : bilan initial ; barres foncées : réévaluation</text>`;
    for (let v = 0; v <= 10; v += 2) {
      c += `<line x1="${X(v)}" x2="${X(v)}" y1="${haut - 4}" y2="${haut + d.problemes.length * hBloc}" stroke="#E1E5EC" stroke-width="1"/>`;
      c += `<text x="${X(v)}" y="${haut + d.problemes.length * hBloc + 16}" font-size="11" fill="#555" text-anchor="middle">${v}</text>`;
    }
    d.problemes.forEach((p, i) => {
      const y = haut + i * hBloc;
      c += `<text x="${lab - 10}" y="${y + hBloc / 2 + 4}" font-size="12" fill="#222" text-anchor="end">${x(coupe(p.activite, 34))}</text>`;
      const barre = (v, yy, couleur, op) => (v === null ? "" : `<rect x="${lab}" y="${yy}" width="${n(X(v) - lab)}" height="7" rx="2" fill="${couleur}" fill-opacity="${op}"/>`);
      if (d.reeval) {
        c += barre(p.r1, y + 6, "#2E7D4F", 0.35) + barre(p.r2, y + 14, "#2E7D4F", 0.95) + barre(p.s1, y + 26, "#E0A106", 0.35) + barre(p.s2, y + 34, "#E0A106", 0.95);
      } else {
        c += barre(p.r1, y + 7, "#2E7D4F", 0.9) + barre(p.s1, y + 17, "#E0A106", 0.9);
      }
    });
    return { svg: svg(L, H, c, "Graphique de la MCRO"), l: L, h: H };
  }

  function dcdq(d) {
    const lab = 260, larg = 340, L = lab + larg + 90, h = 34, haut = 46;
    const lignes = d.facteurs.concat([{ nom: "Score total", total: d.total, max: 75, min: 15, seuil: d.seuil }]);
    const H = haut + lignes.length * h + 34;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">DCDQ : scores par facteur</text>`;
    lignes.forEach((f, i) => {
      const y = haut + i * h, mn = f.min || 0, X = (v) => lab + ((v - mn) / (f.max - mn)) * larg;
      const total = i === lignes.length - 1;
      c += `<text x="${lab - 10}" y="${y + 21}" font-size="12.5" ${total ? 'font-weight="700"' : ""} fill="#222" text-anchor="end">${x(f.nom.charAt(0).toUpperCase() + f.nom.slice(1))}</text>`;
      c += `<rect x="${lab}" y="${y + 8}" width="${larg}" height="18" rx="4" fill="#EEF1F5"/>`;
      c += `<rect x="${lab}" y="${y + 8}" width="${n(Math.max(0, X(f.total) - lab))}" height="18" rx="4" fill="${total ? (d.indication ? CORAIL : VERT) : "#5B8DB8"}" fill-opacity="0.85"/>`;
      if (f.seuil) {
        c += `<line x1="${n(X(f.seuil))}" x2="${n(X(f.seuil))}" y1="${y + 2}" y2="${y + 32}" stroke="#C0392B" stroke-width="2" stroke-dasharray="4 3"/>`;
        c += `<text x="${n(X(f.seuil))}" y="${y + h + 10}" font-size="10.5" fill="#C0392B" text-anchor="middle">seuil ${f.seuil}</text>`;
      }
      c += `<text x="${lab + larg + 8}" y="${y + 21}" font-size="12.5" font-weight="700" fill="#222">${f.total}/${f.max}</text>`;
    });
    c += `<text x="${L / 2}" y="${H - 6}" font-size="10.5" fill="#555" text-anchor="middle">Un score plus bas signale plus de difficultés de coordination rapportées.</text>`;
    return { svg: svg(L, H, c, "Graphique du DCDQ"), l: L, h: H };
  }

  function evolution(d) {
    const lignes = d.lignes, s = d.seuils, vmin = -4, vmax = 3;
    const lab = 250, larg = 380, L = lab + larg + 40, h = 30, haut = 70;
    const H = haut + lignes.length * h + 40;
    const X = (v) => lab + ((Math.max(vmin, Math.min(vmax, v)) - vmin) / (vmax - vmin)) * larg;
    let c = `<text x="${L / 2}" y="26" font-size="16" font-weight="700" fill="#111" text-anchor="middle">Évolution depuis le bilan du ${x(d.date)}</text>`;
    c += `<circle cx="${L / 2 - 120}" cy="46" r="6" fill="#9AA3AF"/><text x="${L / 2 - 108}" y="50" font-size="12" fill="#333">Bilan précédent</text>`;
    c += `<circle cx="${L / 2 + 30}" cy="46" r="6" fill="${ENCRE}"/><text x="${L / 2 + 42}" y="50" font-size="12" fill="#333">Ce bilan</text>`;
    c += axeDS(X, haut, haut + lignes.length * h, s, vmin, vmax);
    lignes.forEach((r, i) => {
      const y = haut + i * h + h / 2;
      c += `<text x="${lab - 10}" y="${y + 4}" font-size="12" fill="#222" text-anchor="end"><tspan font-weight="700">${x(r.bilan)}</tspan> ${x(coupe(r.epreuve, 26))}</text>`;
      const x1 = X(r.avant), x2 = X(r.apres);
      if (Math.abs(x2 - x1) > 10) c += `<path d="M${n(x1)} ${y} L${n(x2 + (x2 > x1 ? -9 : 9))} ${y}" stroke="${ENCRE}" stroke-width="2.2" fill="none"/><path d="M${n(x2 + (x2 > x1 ? -10 : 10))} ${y - 5} L${n(x2 + (x2 > x1 ? -3 : 3))} ${y} L${n(x2 + (x2 > x1 ? -10 : 10))} ${y + 5}" fill="${ENCRE}"/>`;
      c += `<circle cx="${n(x1)}" cy="${y}" r="6" fill="#9AA3AF"/><circle cx="${n(x2)}" cy="${y}" r="7" fill="${ENCRE}" stroke="#FFFFFF" stroke-width="1.5"/>`;
    });
    return { svg: svg(L, H, c, "Évolution des résultats"), l: L, h: H };
  }

  function itemsEso(d) {
    const L = 760, hPanneau = 120, haut = 40, H = haut + d.domaines.length * hPanneau + 10;
    const gx = 40, larg = L - gx - 16, pas = larg / 36;
    let c = `<text x="${L / 2}" y="24" font-size="16" font-weight="700" fill="#111" text-anchor="middle">ESO : réponses détaillées (0 à 10)</text>`;
    d.domaines.forEach((dm, k) => {
      const y0 = haut + k * hPanneau, hb = 72, base = y0 + 22 + hb;
      c += `<text x="${gx}" y="${y0 + 14}" font-size="13" font-weight="700" fill="#1F3A5F">${x(dm.nom)}${dm.moyenne !== null ? ` <tspan font-weight="400" fill="#555">(moyenne ${fr(dm.moyenne, 1)})</tspan>` : ""}</text>`;
      [0, 5, 10].forEach((v) => {
        const yy = base - (v / 10) * hb;
        c += `<line x1="${gx}" x2="${gx + larg}" y1="${n(yy)}" y2="${n(yy)}" stroke="#E1E5EC" stroke-width="1"/><text x="${gx - 6}" y="${n(yy + 4)}" font-size="10" fill="#666" text-anchor="end">${v}</text>`;
      });
      dm.valeurs.forEach((v, i) => {
        const xx = gx + i * pas + 1.5;
        if (v !== null) c += `<rect x="${n(xx)}" y="${n(base - (v / 10) * hb)}" width="${n(pas - 3)}" height="${n((v / 10) * hb)}" fill="${v >= 8 ? CORAIL : v <= 2 ? "#5B8DB8" : VERT_CLAIR}"/>`;
        if ((i + 1) % 5 === 0 || i === 0) c += `<text x="${n(xx + (pas - 3) / 2)}" y="${base + 12}" font-size="9.5" fill="#666" text-anchor="middle">${i + 1}</text>`;
      });
    });
    return { svg: svg(L, H, c, "Réponses détaillées de l'ESO"), l: L, h: H };
  }

  function dessiner(id, donnees) {
    if (!donnees) return null;
    switch (id) {
      case "profil-ds": return donnees.lignes && donnees.lignes.length ? profilDS(donnees) : null;
      case "bhk-criteres": return criteresBHK(donnees);
      case "mcro": return mcro(donnees);
      case "dcdq": return dcdq(donnees);
      case "evolution": return donnees.lignes && donnees.lignes.length ? evolution(donnees) : null;
      case "eso-items": return itemsEso(donnees);
    }
    return null;
  }

  /* ---------- Accès ---------- */

  const TITRES = {
    otipis: "Profil des observations cliniques (OTIPIS)",
    "dunn-enfant": "Profil sensoriel 2 de Dunn, questionnaire enfant",
    "dunn-scolaire": "Profil sensoriel 2 de Dunn, compagnon scolaire",
    "eso-roues": "Profil ESO par domaine d'occupation",
    "eso-systemes": "Systèmes sensoriels (ESO)",
    "eso-items": "ESO : réponses détaillées",
  };

  function graphique(id, senso) {
    const s = S.normaliser(senso);
    if (!S.aDesDonnees(s, id)) return null;
    switch (id) {
      case "otipis": return profilOC(s.otipis);
      case "dunn-enfant": return profilDunn("enfant", s.dunnEnfant);
      case "dunn-scolaire": return profilDunn("scolaire", s.dunnScolaire);
      case "eso-roues": return rouesEso(s.eso);
      case "eso-systemes": return systemesEso(s.eso);
      case "eso-items": return itemsEso({ domaines: S.itemsEso(s.eso) });
    }
    return null;
  }

  // Bloc « graphique » du modèle de document : données préparées, ou graphique du bilan sensoriel.
  function deBloc(b, senso) { return b.donnees ? dessiner(b.id, b.donnees) : graphique(b.id, senso); }

  return { graphique: graphique, dessiner: dessiner, deBloc: deBloc, TITRES: TITRES };
});
