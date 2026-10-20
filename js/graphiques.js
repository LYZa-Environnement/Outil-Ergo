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

  /* ---------- Accès ---------- */

  const TITRES = {
    otipis: "Profil des observations cliniques (OTIPIS)",
    "dunn-enfant": "Profil sensoriel 2 de Dunn, questionnaire enfant",
    "dunn-scolaire": "Profil sensoriel 2 de Dunn, compagnon scolaire",
    "eso-roues": "Profil ESO par domaine d'occupation",
    "eso-systemes": "Systèmes sensoriels (ESO)",
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
    }
    return null;
  }

  return { graphique: graphique, TITRES: TITRES };
});
