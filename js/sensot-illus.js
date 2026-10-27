/*
 * Outil Ergo : illustrations originales des cartes du jeu SensOT-dir (dessins de l'outil, en SVG).
 * Chaque carte montre la situation (scène), le sens concerné (badge et halo jaune sur l'organe)
 * et trois exemples en vignettes, pour qu'un enfant qui ne lit pas comprenne seul.
 * Les visages restent neutres : la carte montre la situation, c'est l'enfant qui dit ce qu'il ressent.
 * SensotIllus.scene(id) → SVG ; SensotIllus.vignettes(id) → [SVG, SVG, SVG] ; SensotIllus.badge(theme) → SVG
 */
(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.SensotIllus = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TRAIT = "#2B2630";
  const P = { peau: ["#F6D5B8", "#E2AA80", "#B8784F", "#7B4B2F"], cheveux: ["#3A2A20", "#D2953F", "#1D1B1F", "#94502C", "#E7C36A"] };
  const HALO = "#FFD84D";
  const ONDE = "#E8743B";

  const svg = (vb, contenu) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-hidden="true" focusable="false">${contenu}</svg>`;
  const g = (x, y, s, c) => `<g transform="translate(${x} ${y})${s && s !== 1 ? ` scale(${s})` : ""}">${c}</g>`;

  /* ---------- Petits signes ---------- */

  // Ondes sonores : arcs qui partent d'un point vers une direction (angle en degrés).
  function ondes(x, y, angle, n, couleur) {
    let c = "";
    for (let i = 1; i <= (n || 3); i++) {
      const r = 6 + i * 6;
      c += `<path d="M ${r * Math.cos(-0.7)} ${r * Math.sin(-0.7)} A ${r} ${r} 0 0 1 ${r * Math.cos(0.7)} ${r * Math.sin(0.7)}" fill="none" stroke="${couleur || ONDE}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return `<g transform="translate(${x} ${y}) rotate(${angle})">${c}</g>`;
  }
  // Odeur : trois volutes qui montent.
  function odeur(x, y, couleur, h) {
    const k = h || 1;
    return g(x, y, k, [-10, 0, 10].map((dx) => `<path d="M ${dx} 0 c -6 -7 6 -12 0 -19 s 6 -12 0 -19" fill="none" stroke="${couleur || "#9C6BB3"}" stroke-width="3" stroke-linecap="round"/>`).join(""));
  }
  // Rayons de lumière autour d'un point.
  function rayons(x, y, r1, r2, couleur, n) {
    let c = "";
    const k = n || 8;
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2;
      c += `<line x1="${x + r1 * Math.cos(a)}" y1="${y + r1 * Math.sin(a)}" x2="${x + r2 * Math.cos(a)}" y2="${y + r2 * Math.sin(a)}" stroke="${couleur || "#F2B705"}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return c;
  }
  // Traits de mouvement horizontaux.
  function vitesse(x, y, l, couleur) {
    return [0, 9, 18].map((dy, i) => `<line x1="${x + i * 4}" y1="${y + dy}" x2="${x + i * 4 + (l || 22)}" y2="${y + dy}" stroke="${couleur || "#8AA0B8"}" stroke-width="3" stroke-linecap="round"/>`).join("");
  }
  const halo = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${HALO}" opacity=".55"/>`;
  const zigzag = (x, y, couleur) => `<path d="M ${x} ${y} l 5 -6 l 4 8 l 5 -9 l 4 8 l 5 -6" fill="none" stroke="${couleur || "#D6453D"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

  /* ---------- Personnage (buste vu de face) ---------- */
  // o : { peau, cheveux, haut, fille, halo: "oreille"|"nez"|"bouche"|"yeux"|"tete", yeuxFermes }
  function enfant(o) {
    const peau = P.peau[o.peau || 0], ch = P.cheveux[o.cheveux || 0];
    const haut = o.haut || "#4F8FD9";
    let c = "";
    // halo derrière l'organe concerné
    const h = { oreille: [-17, 2, 11], oreilleD: [17, 2, 11], nez: [0, 4, 10], bouche: [0, 10, 11], yeux: [0, -1, 15], tete: [0, -6, 24] }[o.halo];
    // corps
    c += `<path d="M -26 62 Q -26 26 0 24 Q 26 26 26 62 Z" fill="${haut}" stroke="${TRAIT}" stroke-width="2"/>`;
    c += `<rect x="-6" y="14" width="12" height="12" fill="${peau}"/>`;
    if (o.fille) c += `<path d="M -19 -6 Q -24 22 -14 24 L 14 24 Q 24 22 19 -6 Z" fill="${ch}"/>`;
    // oreilles et tête
    c += `<circle cx="-17" cy="2" r="5" fill="${peau}" stroke="${TRAIT}" stroke-width="2"/><circle cx="17" cy="2" r="5" fill="${peau}" stroke="${TRAIT}" stroke-width="2"/>`;
    if (h) c += halo(h[0], h[1], h[2]);
    c += `<ellipse cx="0" cy="0" rx="17" ry="19" fill="${peau}" stroke="${TRAIT}" stroke-width="2"/>`;
    c += `<path d="M -17 -3 Q -18 -21 0 -21 Q 18 -21 17 -3 Q 12 -12 2 -12 Q -8 -14 -17 -3 Z" fill="${ch}" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`;
    // visage neutre
    if (o.yeuxFermes) c += `<path d="M -9 1 q 3 2 6 0 M 3 1 q 3 2 6 0" fill="none" stroke="${TRAIT}" stroke-width="2" stroke-linecap="round"/>`;
    else c += `<circle cx="-6" cy="1" r="2.3" fill="${TRAIT}"/><circle cx="6" cy="1" r="2.3" fill="${TRAIT}"/>`;
    c += `<path d="M -1 5 q 1 3 2 0" fill="none" stroke="${TRAIT}" stroke-width="1.6" stroke-linecap="round"/>`;
    c += `<path d="M -5 11 q 5 3 10 0" fill="none" stroke="${TRAIT}" stroke-width="2" stroke-linecap="round"/>`;
    return g(o.x, o.y, o.s || 1, c);
  }
  // Main simple (ronde), utile pour tenir un objet.
  const main = (x, y, peau) => `<circle cx="${x}" cy="${y}" r="6" fill="${P.peau[peau || 0]}" stroke="${TRAIT}" stroke-width="2"/>`;
  const bras = (x1, y1, x2, y2, haut) => `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${haut || "#4F8FD9"}" stroke-width="10" stroke-linecap="round"/>`;

  /* ---------- Décors ---------- */
  const fond = (couleur) => `<rect width="200" height="150" fill="${couleur}"/>`;
  const sol = (y, couleur) => `<rect y="${y}" width="200" height="${150 - y}" fill="${couleur}"/>`;

  /* ---------- Objets (aussi utilisés en vignettes, dessinés dans un carré de 48) ---------- */
  const O = {
    chaise: () => `<path d="M 14 6 V 40 M 14 26 H 34 V 40 M 14 26 V 6 H 18" fill="none" stroke="#9A6B3F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${zigzag(30, 44, "#D6453D")}`,
    couverts: () => `<path d="M 15 6 V 42 M 10 6 V 16 Q 15 21 20 16 V 6" fill="none" stroke="#8A93A0" stroke-width="3.5" stroke-linecap="round"/><path d="M 32 6 Q 40 16 34 26 V 42" fill="none" stroke="#8A93A0" stroke-width="3.5" stroke-linecap="round"/>${ondes(40, 8, -40, 2)}`,
    bavardage: () => `<circle cx="14" cy="26" r="9" fill="${P.peau[1]}" stroke="${TRAIT}" stroke-width="2"/><circle cx="34" cy="26" r="9" fill="${P.peau[0]}" stroke="${TRAIT}" stroke-width="2"/><path d="M 6 8 h 16 v 9 h -10 l -4 4 v -4 h -2 z M 26 6 h 16 v 9 h -2 v 4 l -4 -4 h -10 z" fill="#fff" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`,
    secheCheveux: () => `<path d="M 6 14 h 22 a 8 8 0 0 1 0 16 h -22 z" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/><path d="M 16 30 l 3 14 h 6 l -3 -14 z" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/>${ondes(38, 22, 0, 2)}`,
    chasseEau: () => `<path d="M 10 18 h 28 q 0 14 -14 14 q -14 0 -14 -14 z" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><rect x="18" y="32" width="12" height="10" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><rect x="12" y="4" width="24" height="12" rx="2" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><path d="M 16 24 q 4 -4 8 0 t 8 0" fill="none" stroke="#3E8FD6" stroke-width="2.5"/>`,
    secheMains: () => `<rect x="8" y="6" width="32" height="18" rx="4" fill="#C9D1DB" stroke="${TRAIT}" stroke-width="2"/><path d="M 16 28 v 6 M 24 28 v 9 M 32 28 v 6" stroke="#7FB3E3" stroke-width="3" stroke-linecap="round"/>${zigzag(14, 44, ONDE)}`,
    sirene: () => `<path d="M 12 34 v -12 a 12 12 0 0 1 24 0 v 12 z" fill="#E33E33" stroke="${TRAIT}" stroke-width="2"/><rect x="8" y="34" width="32" height="7" rx="2" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/>${rayons(24, 22, 16, 21, "#E33E33", 5)}`,
    voiture: () => `<path d="M 4 30 l 6 -12 h 22 l 8 12 h 4 v 8 h -40 z" fill="#3E7CC9" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="39" r="5" fill="${TRAIT}"/><circle cx="36" cy="39" r="5" fill="${TRAIT}"/>${ondes(44, 14, -30, 2)}`,
    moto: () => `<circle cx="11" cy="34" r="8" fill="none" stroke="${TRAIT}" stroke-width="3.5"/><circle cx="38" cy="34" r="8" fill="none" stroke="${TRAIT}" stroke-width="3.5"/><path d="M 11 34 l 10 -12 h 10 l 7 12 M 30 22 l -3 -8 h 6" fill="none" stroke="#E07B26" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${vitesse(0, 8, 8)}`,
    etiquette: () => `<path d="M 6 8 Q 24 18 42 8 L 40 44 H 8 Z" fill="#F4F0E6" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/><rect x="18" y="12" width="12" height="9" fill="#F3B23E" stroke="${TRAIT}" stroke-width="1.5"/>${halo(24, 16, 10)}`,
    couture: () => `<path d="M 16 4 v 22 q 0 8 8 12 l 14 6 q 6 2 6 -4 q 0 -4 -4 -6 l -10 -4 v -26 z" fill="#E66C6C" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/><path d="M 32 32 q 6 1 9 6" fill="none" stroke="${TRAIT}" stroke-width="2" stroke-dasharray="3 3"/>${halo(37, 36, 8)}`,
    boutons: () => `<rect x="10" y="4" width="28" height="40" rx="3" fill="#BFD7EA" stroke="${TRAIT}" stroke-width="2"/><circle cx="24" cy="14" r="4" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><circle cx="24" cy="26" r="4" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><circle cx="24" cy="38" r="4" fill="#fff" stroke="${TRAIT}" stroke-width="2"/>`,
    brosse: () => `<rect x="6" y="10" width="26" height="12" rx="6" fill="#E66C9C" stroke="${TRAIT}" stroke-width="2"/><path d="M 10 22 v 8 M 15 22 v 8 M 20 22 v 8 M 25 22 v 8 M 30 22 v 8" stroke="${TRAIT}" stroke-width="2"/><rect x="30" y="13" width="14" height="6" rx="3" fill="#E66C9C" stroke="${TRAIT}" stroke-width="2"/>`,
    ciseaux: () => `<circle cx="12" cy="36" r="6" fill="none" stroke="#E04E4E" stroke-width="3.5"/><circle cx="30" cy="38" r="6" fill="none" stroke="#E04E4E" stroke-width="3.5"/><path d="M 16 31 L 38 6 M 26 33 L 16 6" stroke="#8A93A0" stroke-width="4" stroke-linecap="round"/>`,
    shampoing: () => `<rect x="14" y="14" width="20" height="30" rx="5" fill="#68B98A" stroke="${TRAIT}" stroke-width="2"/><rect x="19" y="6" width="10" height="8" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><circle cx="38" cy="12" r="4" fill="#E7F3FB" stroke="#7FB3E3" stroke-width="1.5"/><circle cx="42" cy="22" r="3" fill="#E7F3FB" stroke="#7FB3E3" stroke-width="1.5"/>`,
    casserole: () => `<path d="M 8 22 h 28 v 14 q 0 6 -6 6 h -16 q -6 0 -6 -6 z" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/><path d="M 36 26 h 10" stroke="${TRAIT}" stroke-width="4" stroke-linecap="round"/>${odeur(22, 18, "#9C6BB3", 0.5)}`,
    poisson: () => `<path d="M 6 24 q 14 -14 28 0 q -14 14 -28 0 z M 34 24 l 10 -8 v 16 z" fill="#7FB3E3" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="22" r="2" fill="${TRAIT}"/>${odeur(26, 12, "#9C6BB3", 0.35)}`,
    epices: () => `<rect x="6" y="18" width="14" height="24" rx="3" fill="#D9822B" stroke="${TRAIT}" stroke-width="2"/><rect x="26" y="14" width="14" height="28" rx="3" fill="#B5462E" stroke="${TRAIT}" stroke-width="2"/><rect x="6" y="12" width="14" height="6" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><rect x="26" y="8" width="14" height="6" fill="#fff" stroke="${TRAIT}" stroke-width="2"/>`,
    balancoire: () => `<path d="M 6 44 L 14 4 H 34 L 42 44" fill="none" stroke="#9A6B3F" stroke-width="3.5" stroke-linejoin="round"/><path d="M 20 4 v 26 M 30 4 v 26" stroke="${TRAIT}" stroke-width="2"/><rect x="16" y="30" width="18" height="5" rx="2" fill="#E07B26" stroke="${TRAIT}" stroke-width="1.5"/>`,
    toboggan: () => `<path d="M 8 44 V 10 M 16 44 V 10 M 8 18 H 16 M 8 28 H 16 M 8 38 H 16" stroke="#5B6676" stroke-width="3" stroke-linecap="round"/><path d="M 16 10 Q 30 14 34 34 Q 36 42 44 42" fill="none" stroke="#F2B705" stroke-width="6" stroke-linecap="round"/>`,
    tourniquet: () => `<ellipse cx="24" cy="34" rx="20" ry="7" fill="#E66C6C" stroke="${TRAIT}" stroke-width="2"/><path d="M 24 34 V 10 M 12 24 h 24" stroke="${TRAIT}" stroke-width="3" stroke-linecap="round"/><path d="M 40 14 a 18 12 0 0 1 -6 14" fill="none" stroke="#8AA0B8" stroke-width="3" stroke-linecap="round" marker-end=""/><path d="M 34 28 l 0 -6 l 5 3" fill="none" stroke="#8AA0B8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    bonbon: () => `<ellipse cx="24" cy="24" rx="11" ry="9" fill="#E66C9C" stroke="${TRAIT}" stroke-width="2"/><path d="M 13 24 l -9 -7 v 14 z M 35 24 l 9 -7 v 14 z" fill="#E66C9C" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`,
    citron: () => `<ellipse cx="24" cy="26" rx="17" ry="13" fill="#F5D64A" stroke="${TRAIT}" stroke-width="2"/><circle cx="24" cy="26" r="8" fill="#FCEFA5" stroke="#E0B92C" stroke-width="1.5"/><path d="M 24 18 v 16 M 16 26 h 16 M 18 20 l 12 12 M 30 20 l -12 12" stroke="#E0B92C" stroke-width="1.2"/>`,
    brocoli: () => `<path d="M 20 30 v 14 h 8 v -14" fill="#8CC56A" stroke="${TRAIT}" stroke-width="2"/><circle cx="16" cy="22" r="9" fill="#4E9A3A" stroke="${TRAIT}" stroke-width="2"/><circle cx="32" cy="22" r="9" fill="#4E9A3A" stroke="${TRAIT}" stroke-width="2"/><circle cx="24" cy="14" r="9" fill="#5DAE45" stroke="${TRAIT}" stroke-width="2"/>`,
    telephone: () => `<rect x="14" y="4" width="20" height="40" rx="4" fill="${TRAIT}"/><rect x="17" y="9" width="14" height="28" fill="#FFF2B3"/>${rayons(24, 23, 22, 26, "#F2B705", 6)}`,
    ordinateur: () => `<rect x="6" y="8" width="36" height="24" rx="2" fill="${TRAIT}"/><rect x="9" y="11" width="30" height="18" fill="#FFF2B3"/><path d="M 2 38 h 44 l -4 -6 h -36 z" fill="#8A93A0" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`,
    tele: () => `<rect x="4" y="6" width="40" height="28" rx="2" fill="${TRAIT}"/><rect x="7" y="9" width="34" height="22" fill="#BFE3FF"/><path d="M 18 34 l -4 8 h 20 l -4 -8" fill="#8A93A0" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`,
    genou: () => `<path d="M 10 4 q 4 18 4 22 q 0 16 10 18 h 10 q -8 -6 -8 -20 q 0 -10 2 -20 z" fill="${P.peau[1]}" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/><circle cx="18" cy="26" r="5" fill="#D6453D" opacity=".85"/>`,
    pansement: () => `<g transform="rotate(-30 24 24)"><rect x="4" y="16" width="40" height="16" rx="8" fill="#E9B98C" stroke="${TRAIT}" stroke-width="2"/><rect x="17" y="16" width="14" height="16" fill="#F6E0C8" stroke="${TRAIT}" stroke-width="1.5"/></g>`,
    piqure: () => `<g transform="rotate(-40 24 24)"><rect x="8" y="18" width="24" height="12" rx="2" fill="#E7F3FB" stroke="${TRAIT}" stroke-width="2"/><path d="M 32 24 h 12 M 2 18 v 12 M 2 24 h 6" stroke="${TRAIT}" stroke-width="2.5" stroke-linecap="round"/><rect x="10" y="20" width="12" height="8" fill="#7FB3E3"/></g>`,
  };

  /* ---------- Badges des sens ---------- */
  const BADGES = {
    auditif: `<path d="M 14 30 q -6 -2 -6 -10 q 0 -10 10 -10 q 10 0 10 10 q 0 6 -5 9 q -3 2 -3 6 q 0 5 -5 5" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`,
    tactile: `<path d="M 12 34 v -14 q 0 -3 3 -3 q 3 0 3 3 v -8 q 0 -3 3 -3 q 3 0 3 3 v 8 v -6 q 0 -3 3 -3 q 3 0 3 3 v 14 q 0 8 -8 8 h -2 q -8 0 -10 -2 z" fill="#fff"/>`,
    douleur: `<path d="M 22 6 l -8 16 h 7 l -4 14 l 12 -18 h -7 l 5 -12 z" fill="#fff"/>`,
    temperature: `<rect x="17" y="6" width="8" height="22" rx="4" fill="#fff"/><circle cx="21" cy="31" r="6" fill="#fff"/><rect x="19.5" y="14" width="3" height="16" fill="#C8323A"/>`,
    olfactif: `<path d="M 20 8 q -2 14 -8 20 q -2 4 4 4 q 2 3 6 0 q 6 0 4 -4 q -4 -6 -4 -20" fill="#fff"/>`,
    mouvement: `<circle cx="22" cy="9" r="4" fill="#fff"/><path d="M 14 22 l 8 -8 l 6 6 M 22 14 l -2 10 l 8 6 l -2 8 M 20 24 l -8 10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    gout: `<path d="M 8 20 q 13 -10 26 0 q -13 14 -26 0 z" fill="#fff"/><path d="M 16 22 q 5 10 10 0" fill="#C8323A"/>`,
    oromoteur: `<path d="M 8 20 q 13 -10 26 0 q -13 14 -26 0 z" fill="#fff"/><path d="M 8 20 h 26" stroke="#C8323A" stroke-width="2"/>`,
    visuel: `<path d="M 4 21 q 17 -16 34 0 q -17 16 -34 0 z" fill="#fff"/><circle cx="21" cy="21" r="6" fill="#2C64A0"/><circle cx="21" cy="21" r="2.5" fill="#fff"/>`,
  };
  const COULEURS = { auditif: "#D9822B", tactile: "#6E9B3A", douleur: "#6E9B3A", temperature: "#6E9B3A", olfactif: "#A23A82", mouvement: "#C8643A", gout: "#C8323A", oromoteur: "#C8323A", visuel: "#2C64A0" };
  function badge(theme) { return svg("0 0 42 42", `<circle cx="21" cy="21" r="21" fill="${COULEURS[theme] || "#59645D"}"/>${BADGES[theme] || ""}`); }

  /* ---------- Scènes ---------- */
  const SCENES = {
    "a-cantine": () => fond("#EAF2F7") + `<rect x="150" y="10" width="40" height="40" rx="4" fill="#fff" stroke="#C9D1DB" stroke-width="2"/><circle cx="170" cy="30" r="11" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><path d="M 170 30 v -7 M 170 30 h 5" stroke="${TRAIT}" stroke-width="2"/>`
      + enfant({ x: 48, y: 60, peau: 2, cheveux: 0, haut: "#F2A03D" }) + enfant({ x: 152, y: 66, peau: 0, cheveux: 4, fille: true, haut: "#9C7BD1" })
      + enfant({ x: 100, y: 56, peau: 0, cheveux: 1, haut: "#5DAE8B", halo: "oreille", s: 1.08 })
      + sol(104, "#C99B6B") + `<rect y="100" width="200" height="8" fill="#B58455"/>`
      + `<rect x="28" y="96" width="40" height="10" rx="2" fill="#E9EEF2" stroke="${TRAIT}" stroke-width="1.5"/><rect x="132" y="96" width="40" height="10" rx="2" fill="#E9EEF2" stroke="${TRAIT}" stroke-width="1.5"/><ellipse cx="100" cy="100" rx="18" ry="5" fill="#fff" stroke="${TRAIT}" stroke-width="1.5"/><circle cx="96" cy="98" r="3" fill="#E04E4E"/><circle cx="104" cy="99" r="3" fill="#8CC56A"/>`
      + ondes(26, 46, 200, 3) + ondes(176, 50, -20, 3) + zigzag(60, 30) + zigzag(126, 26),
    "a-sdb": () => fond("#E7F3FB") + `<rect x="14" y="14" width="56" height="44" rx="6" fill="#CFE6F5" stroke="#9CC2DE" stroke-width="2"/>` + `<path d="M 0 112 h 200" stroke="#C9D1DB" stroke-width="2"/>` + sol(112, "#F3F6F8")
      + enfant({ x: 86, y: 62, peau: 1, cheveux: 4, fille: true, haut: "#fff", halo: "oreilleD", s: 1.15 })
      + bras(146, 104, 150, 78, "#9C7BD1") + main(150, 72, 2)
      + `<g transform="translate(166 44) scale(-1 1)"><path d="M 6 14 h 22 a 8 8 0 0 1 0 16 h -22 z" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/><path d="M 16 30 l 3 14 h 6 l -3 -14 z" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/></g>`
      + ondes(128, 66, 180, 3) + `<path d="M 118 52 q -6 -4 -10 -2 M 118 60 q -6 -3 -12 0" fill="none" stroke="#7FB3E3" stroke-width="2.5" stroke-linecap="round"/>`,
    "a-vehicules": () => fond("#DCEFF7") + `<path d="M 0 70 q 30 -14 60 0 t 60 0 t 80 0 V 150 H 0 Z" fill="#CFE3C3"/>` + sol(108, "#6E7480") + `<path d="M 10 128 h 24 M 60 128 h 24 M 110 128 h 24 M 160 128 h 24" stroke="#fff" stroke-width="4"/>`
      + `<rect x="58" y="74" width="92" height="40" rx="4" fill="#E33E33" stroke="${TRAIT}" stroke-width="2"/><rect x="150" y="86" width="30" height="28" rx="4" fill="#E33E33" stroke="${TRAIT}" stroke-width="2"/><rect x="155" y="90" width="20" height="12" fill="#BFE3FF" stroke="${TRAIT}" stroke-width="1.5"/><path d="M 66 82 h 76 M 66 92 h 76" stroke="#fff" stroke-width="3"/><circle cx="80" cy="116" r="9" fill="${TRAIT}"/><circle cx="160" cy="116" r="9" fill="${TRAIT}"/><rect x="160" y="78" width="12" height="8" rx="2" fill="#3E8FD6"/>`
      + rayons(166, 82, 10, 16, "#3E8FD6", 6) + ondes(184, 80, -30, 3)
      + enfant({ x: 28, y: 66, peau: 3, cheveux: 2, haut: "#F2B705", halo: "oreille", s: 0.95 }),
    "t-details": () => fond("#F7EFE6") + `<path d="M 40 34 l 30 -14 q 30 12 60 0 l 30 14 l -10 30 l -16 -6 v 70 h -68 v -70 l -16 6 z" fill="#BFD7EA" stroke="${TRAIT}" stroke-width="2.5" stroke-linejoin="round"/>`
      + `<path d="M 70 20 q 30 16 60 0" fill="none" stroke="${TRAIT}" stroke-width="2.5"/>` + halo(100, 32, 18) + `<rect x="90" y="24" width="20" height="14" fill="#F3B23E" stroke="${TRAIT}" stroke-width="2"/><path d="M 94 29 h 12 M 94 33 h 8" stroke="${TRAIT}" stroke-width="1.5"/>`
      + `<circle cx="100" cy="60" r="4" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><circle cx="100" cy="80" r="4" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><circle cx="100" cy="100" r="4" fill="#fff" stroke="${TRAIT}" stroke-width="2"/>`
      + `<path d="M 118 30 l 6 -4 M 120 38 l 7 0 M 80 30 l -6 -4" stroke="#D6453D" stroke-width="2.5" stroke-linecap="round"/>`,
    "t-tete": () => fond("#F3EEF7") + `<rect x="0" y="0" width="200" height="150" fill="url(#none)"/>`
      + enfant({ x: 96, y: 70, peau: 0, cheveux: 3, fille: true, haut: "#E66C6C", halo: "tete", s: 1.25 })
      + `<g transform="translate(118 18) rotate(25)"><rect x="0" y="0" width="34" height="14" rx="7" fill="#E66C9C" stroke="${TRAIT}" stroke-width="2"/><path d="M 4 14 v 8 M 10 14 v 8 M 16 14 v 8 M 22 14 v 8 M 28 14 v 8" stroke="${TRAIT}" stroke-width="2"/><rect x="32" y="3" width="22" height="8" rx="4" fill="#E66C9C" stroke="${TRAIT}" stroke-width="2"/></g>`
      + `<path d="M 182 48 q -8 -2 -10 -10" stroke="${P.peau[2]}" stroke-width="12" stroke-linecap="round" fill="none"/>`
      + `<path d="M 112 40 q -6 -4 -12 -2" fill="none" stroke="#8AA0B8" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 4"/>`,
    "o-cuisine": () => fond("#FBF1DA") + `<rect x="0" y="92" width="200" height="58" fill="#E3C9A1"/><rect x="0" y="88" width="200" height="6" fill="#C9A376"/>`
      + `<rect x="10" y="70" width="70" height="22" rx="3" fill="#3B3F48"/><circle cx="28" cy="80" r="7" fill="#D6453D" opacity=".7"/><circle cx="60" cy="80" r="7" fill="#555"/>`
      + `<path d="M 16 46 h 40 v 22 q 0 6 -6 6 h -28 q -6 0 -6 -6 z" fill="#5B6676" stroke="${TRAIT}" stroke-width="2"/><path d="M 56 52 h 16" stroke="${TRAIT}" stroke-width="5" stroke-linecap="round"/><rect x="12" y="42" width="48" height="6" rx="3" fill="#7A8494" stroke="${TRAIT}" stroke-width="2"/>`
      + odeur(36, 38, "#9C6BB3", 0.9) + `<path d="M 70 26 q 20 -6 50 16" fill="none" stroke="#9C6BB3" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/>`
      + enfant({ x: 146, y: 56, peau: 2, cheveux: 0, haut: "#4F8FD9", halo: "nez", s: 1.1 }),
    "m-joue": () => fond("#DCEFF7") + `<path d="M 0 112 q 50 -16 100 0 t 100 0 V 150 H 0 Z" fill="#A6CE9A"/>`
      + `<path d="M 30 140 L 50 14 H 150 L 170 140" fill="none" stroke="#9A6B3F" stroke-width="6" stroke-linejoin="round"/>`
      + `<g transform="rotate(-18 100 14)"><path d="M 84 14 v 76 M 116 14 v 76" stroke="${TRAIT}" stroke-width="2.5"/><rect x="78" y="88" width="44" height="8" rx="3" fill="#E07B26" stroke="${TRAIT}" stroke-width="2"/>`
      + enfant({ x: 100, y: 56, peau: 1, cheveux: 2, haut: "#F2B705", halo: "tete", s: 0.95 }) + `<path d="M 88 90 l -6 20 M 112 90 l 6 20" stroke="#3E4FA0" stroke-width="9" stroke-linecap="round"/></g>`
      + `<path d="M 150 60 q 16 20 4 46" fill="none" stroke="#8AA0B8" stroke-width="3.5" stroke-linecap="round"/><path d="M 148 98 l 6 9 l 5 -10" fill="none" stroke="#8AA0B8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` + vitesse(162, 70, 18),
    "g-nourriture": () => fond("#FDF0E4") + sol(104, "#E9C9A0")
      + enfant({ x: 100, y: 52, peau: 3, cheveux: 2, haut: "#5DAE8B", halo: "bouche", s: 1.1 })
      + bras(124, 92, 116, 70, "#5DAE8B") + main(115, 66, 3) + `<path d="M 112 62 l -8 -2" stroke="#8A93A0" stroke-width="3" stroke-linecap="round"/><circle cx="104" cy="60" r="3.5" fill="#4E9A3A"/>`
      + `<ellipse cx="100" cy="116" rx="50" ry="12" fill="#fff" stroke="${TRAIT}" stroke-width="2"/><circle cx="80" cy="112" r="8" fill="#4E9A3A" stroke="${TRAIT}" stroke-width="1.5"/><path d="M 96 108 h 22 l -4 10 h -14 z" fill="#E9A04B" stroke="${TRAIT}" stroke-width="1.5"/><ellipse cx="128" cy="113" rx="9" ry="5" fill="#F5D64A" stroke="${TRAIT}" stroke-width="1.5"/>`,
    "v-ecrans": () => fond("#1E2A44") + `<rect x="140" y="18" width="44" height="34" rx="3" fill="#2E3D5E"/><path d="M 146 24 h 32 v 22 h -32 z" fill="#3D5683"/>`
      + enfant({ x: 84, y: 60, peau: 0, cheveux: 3, fille: true, haut: "#F4F0E6", halo: "yeux", s: 1.15 })
      + `<g transform="rotate(-12 132 98)"><rect x="118" y="72" width="30" height="48" rx="5" fill="${TRAIT}"/><rect x="122" y="77" width="22" height="38" fill="#FFF2B3"/></g>`
      + rayons(133, 96, 30, 38, "#F2B705", 7) + main(118, 112, 0) + `<path d="M 102 104 q 6 -2 12 6" stroke="#F4F0E6" stroke-width="10" stroke-linecap="round" fill="none"/>` + main(118, 112, 0),
    "d-blesse": () => fond("#F2F7F2") + sol(124, "#D7E8D0")
      + enfant({ x: 64, y: 58, peau: 1, cheveux: 1, haut: "#7FB3E3" })
      + `<path d="M 44 116 q 0 -6 8 -6 h 34 l 32 -14 q 8 -2 10 6 l 8 34 h -14 l -8 -24 l -30 14 h -40 z" fill="#3E4FA0" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`
      + `<path d="M 112 98 q 10 -6 18 0 l 6 22 q -8 4 -16 0 z" fill="${P.peau[1]}" stroke="${TRAIT}" stroke-width="2" stroke-linejoin="round"/>`
      + halo(124, 106, 15) + `<circle cx="124" cy="106" r="5.5" fill="#D6453D" opacity=".85"/>`
      + bras(78, 92, 106, 106, "#7FB3E3") + main(110, 106, 1)
      + `<g transform="rotate(-35 160 78)"><rect x="144" y="72" width="34" height="13" rx="6.5" fill="#E9B98C" stroke="${TRAIT}" stroke-width="2"/><rect x="155" y="72" width="12" height="13" fill="#F6E0C8" stroke="${TRAIT}" stroke-width="1.5"/></g>`
      + `<path d="M 198 58 q -14 2 -24 14" stroke="${P.peau[0]}" stroke-width="12" stroke-linecap="round" fill="none"/>` + zigzag(132, 92) + zigzag(100, 88),
  };
  const VIGNETTES = {
    "a-cantine": ["chaise", "couverts", "bavardage"], "a-sdb": ["secheCheveux", "chasseEau", "secheMains"], "a-vehicules": ["sirene", "voiture", "moto"],
    "t-details": ["etiquette", "couture", "boutons"], "t-tete": ["brosse", "ciseaux", "shampoing"], "o-cuisine": ["casserole", "poisson", "epices"],
    "m-joue": ["balancoire", "toboggan", "tourniquet"], "g-nourriture": ["bonbon", "citron", "brocoli"], "v-ecrans": ["telephone", "ordinateur", "tele"],
    "d-blesse": ["genou", "pansement", "piqure"],
  };

  function scene(id) { return SCENES[id] ? svg("0 0 200 150", SCENES[id]()) : ""; }
  function vignettes(id) { return (VIGNETTES[id] || []).map((k) => svg("0 0 48 48", O[k]())); }
  function a(id) { return !!SCENES[id]; }

  return { scene: scene, vignettes: vignettes, badge: badge, a: a, ids: Object.keys(SCENES), COULEURS: COULEURS };
});
