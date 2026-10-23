/*
 * Outil Ergo : bilan sensoriel.
 * Observations cliniques OTIPIS et profil OC, Profil sensoriel 2 de Dunn (enfant, compagnon scolaire),
 * synthèse du profil d'engagement sensori-occupationnel (ESO), résultats du SensOT-dir.
 * Les questionnaires protégés (Dunn 2, ESO, SensOT-dir) ne sont pas reproduits :
 * l'outil reçoit leurs scores et leurs résultats, pas leurs questions.
 */
(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.Senso = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function nombre(v) {
    if (v === null || v === undefined) return null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function min(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function point(s) { const t = texte(s).trim(); return !t ? "" : /[.!?…:]$/.test(t) ? t : t + "."; }
  function joindre(l) { return l.length <= 1 ? l.join("") : l.slice(0, -1).join(", ") + " et " + l[l.length - 1]; }
  function fmt(n, dec) { return (dec === undefined ? String(Math.round(n * 100) / 100) : n.toFixed(dec)).replace(".", ","); }
  function dateCourte(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte(s)); return m ? m[3] + "/" + m[2] + "/" + m[1] : ""; }

  /* ================= OTIPIS ================= */

  const DOMAINES_OC = [
    { id: "modulation", nom: "Modulation sensorielle", de: "de modulation sensorielle", couleur: "#2F6DB5" },
    { id: "discrimination", nom: "Discrimination sensorielle", de: "de discrimination sensorielle", couleur: "#2E9455" },
    { id: "postural", nom: "Contrôle postural", de: "de contrôle postural", couleur: "#E07A1F" },
    { id: "praxies", nom: "Praxies", de: "praxiques", couleur: "#D23B3B" },
  ];

  // Items de l'observation clinique, dans l'ordre de passation. « code » = libellé court du profil OC.
  const OTIPIS = [
    ["1", "Sécurité gravitationnelle", "modulation"], ["2", "Réactions au mouvement", "modulation"],
    ["3", "Réactions aux stimuli auditifs", "modulation"], ["4", "Réactions aux stimuli tactiles", "modulation"],
    ["5", "Niveau de concentration", "modulation"], ["6", "Niveau d'activité", "modulation"],
    ["7", "Ajustements posturaux", "postural"], ["8", "Tonus musculaire", "postural"], ["9", "Mouvements associés", "postural"],
    ["10", "Préférence manuelle", "praxies"],
    ["11a", "Poursuite visuelle horizontale", "postural", "Mouvements contrôlés des yeux"],
    ["11b", "Poursuite visuelle verticale", "postural", "Mouvements contrôlés des yeux"],
    ["11c", "Fixation visuelle horizontale", "postural", "Mouvements contrôlés des yeux"],
    ["11d", "Fixation visuelle verticale", "postural", "Mouvements contrôlés des yeux"],
    ["11e", "Localisation rapide", "postural", "Mouvements contrôlés des yeux"],
    ["11f", "Passage de la ligne médiane", "postural", "Mouvements contrôlés des yeux"],
    ["11g", "Convergence", "postural", "Mouvements contrôlés des yeux"],
    ["12", "Doigt-nez", "postural"],
    ["13md", "Diadococinésies, main droite", "praxies", "Diadococinésies"],
    ["13mg", "Diadococinésies, main gauche", "praxies", "Diadococinésies"],
    ["13dm", "Diadococinésies, deux mains", "praxies", "Diadococinésies"],
    ["14md", "Opposition pouce-doigts, main droite", "praxies", "Opposition pouce-doigts"],
    ["14mg", "Opposition pouce-doigts, main gauche", "praxies", "Opposition pouce-doigts"],
    ["14dm", "Opposition pouce-doigts, deux mains", "praxies", "Opposition pouce-doigts"],
    ["15", "Cocontractions", "postural"],
    ["16a", "Tirelire", "praxies", "Manipulation d'objets dans la main dominante"],
    ["16b", "Crayon", "praxies", "Manipulation d'objets dans la main dominante"],
    ["16c", "Servir un verre d'eau", "praxies", "Manipulation d'objets dans la main dominante"],
    ["17", "Localisation de stimuli tactiles", "discrimination"], ["18", "Perception manuelle des formes", "discrimination"],
    ["19", "Séquences rythmiques", "discrimination"], ["20", "Extension contre la gravité", "postural"],
    ["21", "Stabilisation posturale", "postural"], ["22", "Flexion contre la gravité", "postural"],
    ["23", "Cibles", "discrimination"], ["24", "Réactions de protection", "postural"],
    ["25", "Sauts à travers la salle", "postural"], ["26", "Brouette", "postural"], ["27", "Balle pendule", "postural"],
    ["28", "Équilibre sur plan instable", "postural"], ["29", "Équilibre sur un pied", "postural"],
    ["30a", "Attraper un ballon", "praxies", "Séquences d'actions planifiées"],
    ["30b", "Shooter", "praxies", "Séquences d'actions planifiées"],
    ["30c", "Sauter à pieds joints", "praxies", "Séquences d'actions planifiées"],
    ["30d", "Saut en hauteur", "praxies", "Séquences d'actions planifiées"],
    ["30eh", "Sauts de pantin, haut du corps", "praxies", "Séquences d'actions planifiées"],
    ["30eb", "Sauts de pantin, bas du corps", "praxies", "Séquences d'actions planifiées"],
    ["30f", "Sauts écarts symétriques", "praxies", "Séquences d'actions planifiées"],
    ["30g", "Frappes genoux croisés", "praxies", "Séquences d'actions planifiées"],
  ].map((x) => ({ id: x[0], nom: x[1], domaine: x[2], groupe: x[3] || "", code: x[0].replace("md", " MD").replace("mg", " MG").replace("dm", " 2M").replace("eh", "e H").replace("eb", "e B") }));

  // Ordre des rayons du profil OC (dans le sens des aiguilles d'une montre, à partir du haut).
  const ORDRE_PROFIL = ["17", "18", "19", "23", "7", "8", "9", "11a", "11b", "11c", "11d", "11e", "11f", "11g", "12", "15", "20", "21", "22",
    "24", "25", "26", "27", "28", "29", "10", "13md", "13mg", "13dm", "14md", "14mg", "14dm", "16a", "16b", "16c",
    "30a", "30b", "30c", "30d", "30eh", "30eb", "30f", "30g", "1", "2", "3", "4", "5", "6"];

  /* ================= Profil sensoriel 2 de Dunn ================= */

  const CLASSIFICATIONS = [
    { id: "bm", label: "Beaucoup moins que les autres", court: "Beaucoup moins" },
    { id: "m", label: "Moins que les autres", court: "Moins" },
    { id: "c", label: "Comme la majorité des autres", court: "Comme la majorité" },
    { id: "p", label: "Plus que les autres", court: "Plus" },
    { id: "bp", label: "Beaucoup plus que les autres", court: "Beaucoup plus" },
  ];
  const QUADRANTS = [
    { id: "recherche", nom: "Recherche", plus: "une recherche de stimulations sensorielles", facteur: "une recherche sensorielle marquée" },
    { id: "evitement", nom: "Évitement", plus: "un évitement des stimulations sensorielles", facteur: "un évitement sensoriel marqué" },
    { id: "sensibilite", nom: "Sensibilité", plus: "une sensibilité aux stimulations sensorielles", facteur: "une sensibilité sensorielle marquée" },
    { id: "enregistrement", nom: "Enregistrement", plus: "un faible enregistrement des stimulations sensorielles", facteur: "un faible enregistrement sensoriel" },
  ];
  const FORMES_DUNN = {
    enfant: {
      titre: "Profil sensoriel 2 de Dunn, questionnaire enfant", repondant: "les parents",
      groupes: [
        { titre: "Quadrants", lignes: QUADRANTS.map((q) => [q.id, q.nom]) },
        { titre: "Sections sensorielles", lignes: [["auditif", "Auditif"], ["visuel", "Visuel"], ["tactile", "Tactile"], ["mouvement", "Mouvement"], ["position", "Position du corps"], ["oral", "Oral"]] },
        { titre: "Sections comportementales", lignes: [["comportement", "Comportement"], ["socio", "Socio-émotionnel"], ["attention", "Attention"]] },
      ],
    },
    scolaire: {
      titre: "Profil sensoriel 2 de Dunn, compagnon scolaire", repondant: "l'enseignant",
      groupes: [
        { titre: "Quadrants", lignes: QUADRANTS.map((q) => [q.id, q.nom]) },
        { titre: "Composantes scolaires", lignes: [["cs1", "Composante scolaire 1"], ["cs2", "Composante scolaire 2"], ["cs3", "Composante scolaire 3"], ["cs4", "Composante scolaire 4"]] },
        { titre: "Sections", lignes: [["auditif", "Auditif"], ["visuel", "Visuel"], ["tactile", "Tactile"], ["mouvement", "Mouvement"], ["comportement", "Comportement"]] },
      ],
    },
  };

  /* ================= ESO ================= */

  const DOMAINES_ESO = [["sp", "Soins personnels"], ["p", "Productivité"], ["l", "Loisirs"]];
  const SECTEURS_ESO = ["SS", "DS", "CP", "PX", "EO", "OR", "UR"];
  const SYSTEMES_ESO = [
    ["audition", "Audition", 36], ["olfagust", "Olfaction et gustation", 36], ["visuel", "Visuel", 36], ["tactile", "Tactile", 36],
    ["proprio", "Proprioception", 36], ["vestib", "Vestibulaire", 36], ["intero", "Intéroception", 27],
  ].map((x) => ({ id: x[0], nom: x[1], max: x[2] }));
  const REPERE_ESO = 50;
  // Réponses détaillées : 36 questions par domaine, cotées de 0 (jamais) à 10 (toujours).
  // Les libellés ne sont pas reproduits : l'ergothérapeute peut coller ceux de son exemplaire (réglages, stockés localement).
  const NB_ITEMS_ESO = 36;
  const DOMAINES_ITEMS_ESO = [["sp", "Soins personnels", /SOINS\s+PERSONNELS/i], ["p", "Travail scolaire", /TRAVAIL\s+SCOLAIRE|PRODUCTIVIT/i], ["l", "Loisirs", /LOISIRS/i]];
  // Secteurs des roues : 3 = engagement adapté ; plus le score est bas, plus la difficulté est marquée.
  const SECTEURS_NOMS_ESO = {
    SS: { nom: "recherche sensorielle", signe: "des comportements de recherche sensorielle", le: "la recherche sensorielle" },
    DS: { nom: "discrimination sensorielle", signe: "des difficultés de discrimination sensorielle", le: "la difficulté de discrimination sensorielle" },
    CP: { nom: "contrôle postural", signe: "des difficultés de contrôle postural", le: "la difficulté de contrôle postural" },
    PX: { nom: "praxies", signe: "des difficultés praxiques", le: "la difficulté praxique" },
    EO: { nom: "engagement occupationnel", signe: "un engagement occupationnel restreint", le: "la restriction de l'engagement occupationnel" },
    OR: { nom: "hyperréactivité sensorielle", signe: "des signes d'hyperréactivité sensorielle", le: "l'hyperréactivité sensorielle" },
    UR: { nom: "hyporéactivité sensorielle", signe: "des signes d'hyporéactivité sensorielle", le: "l'hyporéactivité sensorielle" },
  };
  const NIVEAUX_ROUE_ESO = [{ id: "marque", max: 1, nom: "difficulté marquée" }, { id: "modere", max: 2, nom: "difficulté modérée" }, { id: "adapte", max: 3.01, nom: "engagement adapté" }];
  function niveauRoueEso(v) { return v === null || v === undefined ? null : NIVEAUX_ROUE_ESO.find((n) => v < n.max); }

  // Cotation à partir des réponses (0 à 10) et de la grille de cotation du cabinet (fichier du cabinet, jamais dans le code) :
  // chaque réponse donne 0 à 3 points, en sens direct ou inverse ; roue = moyenne des points du secteur dans le domaine ;
  // système = somme des points du système dans le domaine (le pourcentage se calcule sur les trois domaines).
  const POINTS_ESO = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3];
  function pointsEso(v, sens) { const p = POINTS_ESO[v]; return sens === "I" ? 3 - p : p; }
  function normaliserCotationEso(c) {
    if (!c || typeof c !== "object") return null;
    const secteurs = Array.isArray(c.secteurs) ? c.secteurs.map((x) => texte(x).trim()) : [];
    const systemes = Array.isArray(c.systemes) ? c.systemes.map((x) => texte(x).trim()) : [];
    if (secteurs.length !== NB_ITEMS_ESO || secteurs.some((x) => SECTEURS_ESO.indexOf(x) < 0)) return null;
    if (systemes.length !== NB_ITEMS_ESO || systemes.some((x) => x && !SYSTEMES_ESO.some((sy) => sy.id === x))) return null;
    const sens = {};
    for (const dm of DOMAINES_ITEMS_ESO) {
      const t = texte(c.sens && c.sens[dm[0]]).trim().toUpperCase();
      if (!/^[DI]{36}$/.test(t)) return null;
      sens[dm[0]] = t;
    }
    return { secteurs: secteurs, systemes: systemes, sens: sens };
  }
  function cotationEso(e, cle) {
    const k = normaliserCotationEso(cle);
    if (!k) return null;
    const roues = {}, systemes = {}, manquants = {}, points = {};
    let n = 0;
    SYSTEMES_ESO.forEach((sy) => { systemes[sy.id] = {}; });
    DOMAINES_ITEMS_ESO.forEach((dm) => {
      const src = (e.items && e.items[dm[0]]) || {};
      const somme = {}, nb = {};
      let chaine = "";
      manquants[dm[0]] = 0;
      for (let i = 1; i <= NB_ITEMS_ESO; i++) {
        const v = nombre(src[i]);
        if (v === null || v < 0 || v > 10) { manquants[dm[0]]++; chaine += "-"; continue; }
        n++;
        const p = pointsEso(Math.round(v), k.sens[dm[0]].charAt(i - 1));
        chaine += p;
        const sc = k.secteurs[i - 1];
        somme[sc] = (somme[sc] || 0) + p;
        nb[sc] = (nb[sc] || 0) + 1;
        const sy = k.systemes[i - 1];
        if (sy) systemes[sy][dm[0]] = (systemes[sy][dm[0]] || 0) + p;
      }
      points[dm[0]] = chaine;
      roues[dm[0]] = {};
      SECTEURS_ESO.forEach((sc) => { if (nb[sc]) roues[dm[0]][sc] = Math.round((somme[sc] / nb[sc]) * 10) / 10; });
    });
    return { n: n, roues: roues, systemes: systemes, manquants: manquants, points: points, complet: n === NB_ITEMS_ESO * DOMAINES_ITEMS_ESO.length };
  }

  /* ================= SensOT-dir ================= */

  const THEMES_SENSOT = [["auditif", "Auditif"], ["visuel", "Visuel"], ["tactile", "Tactile"], ["olfactif", "Olfactif"], ["mouvement", "Mouvement"],
    ["gout", "Goût"], ["oromoteur", "Oro-moteur"], ["douleur", "Douleur"], ["temperature", "Température"]].map((x) => ({ id: x[0], nom: x[1] }));
  const CONTEXTES_SENSOT = ["Maison", "École", "Extérieur", "Sensations internes"];
  const FREQUENCES_SENSOT = ["rarement", "parfois", "souvent", "très souvent"];
  const NB_PRIORITES = 5;

  /* ================= Données ================= */

  function vide() {
    const s = {
      otipis: { fait: "", parent: "", main: "", oeil: "", pied: "", scores: {}, notes: {}, temps20: "", temps22: "", erreursMD: "", erreursMG: "", autres: "", comportement: "", discussion: "" },
      dunnEnfant: { fait: "", repondant: "", date: "", lignes: {}, notes: "" },
      dunnScolaire: { fait: "", repondant: "", date: "", lignes: {}, notes: "" },
      eso: { fait: "", repondant: "", date: "", roues: { sp: {}, p: {}, l: {} }, systemes: {}, items: { sp: {}, p: {}, l: {} }, notes: "", pdfImporte: "", calcul: "", points: { sp: "", p: "", l: "" } },
      sensot: { fait: "", date: "", themes: {}, priorites: [], notes: "" },
    };
    return s;
  }

  function copierTexte(cible, src, cles) { cles.forEach((k) => { if (src && src[k] !== undefined && src[k] !== null) cible[k] = texte(src[k]); }); }

  function normaliser(src) {
    const s = vide();
    if (!src || typeof src !== "object") return s;
    const o = src.otipis || {};
    copierTexte(s.otipis, o, ["fait", "parent", "main", "oeil", "pied", "temps20", "temps22", "erreursMD", "erreursMG", "autres", "comportement", "discussion"]);
    OTIPIS.forEach((it) => {
      const v = nombre(o.scores && o.scores[it.id]);
      if (v === 1 || v === 2 || v === 3) s.otipis.scores[it.id] = v;
      if (o.notes && o.notes[it.id]) s.otipis.notes[it.id] = texte(o.notes[it.id]);
    });
    ["enfant", "scolaire"].forEach((f) => {
      const cle = f === "enfant" ? "dunnEnfant" : "dunnScolaire";
      const x = src[cle] || {};
      copierTexte(s[cle], x, ["fait", "repondant", "date", "notes"]);
      FORMES_DUNN[f].groupes.forEach((g) => g.lignes.forEach((l) => {
        const v = x.lignes && x.lignes[l[0]];
        if (!v) return;
        s[cle].lignes[l[0]] = { brut: texte(v.brut), classe: CLASSIFICATIONS.some((c) => c.id === v.classe) ? v.classe : "" };
      }));
    });
    const e = src.eso || {};
    copierTexte(s.eso, e, ["fait", "repondant", "date", "notes", "pdfImporte"]);
    s.eso.calcul = e.calcul === "auto" || e.calcul === "manuel" ? e.calcul : "";
    DOMAINES_ITEMS_ESO.forEach((dm) => { const t = texte(e.points && e.points[dm[0]]); if (/^[0-3-]{36}$/.test(t)) s.eso.points[dm[0]] = t; });
    DOMAINES_ESO.forEach((dm) => SECTEURS_ESO.forEach((sc) => {
      const v = e.roues && e.roues[dm[0]] && e.roues[dm[0]][sc];
      if (v !== undefined && v !== null && v !== "") s.eso.roues[dm[0]][sc] = texte(v);
    }));
    SYSTEMES_ESO.forEach((sy) => {
      const v = e.systemes && e.systemes[sy.id];
      if (v) s.eso.systemes[sy.id] = { sp: texte(v.sp), p: texte(v.p), l: texte(v.l) };
    });
    DOMAINES_ITEMS_ESO.forEach((dm) => {
      const src = (e.items && e.items[dm[0]]) || {};
      Object.keys(src).forEach((k) => {
        const v = nombre(src[k]);
        if (/^\d+$/.test(k) && +k >= 1 && +k <= NB_ITEMS_ESO && v !== null && v >= 0 && v <= 10) s.eso.items[dm[0]][k] = Math.round(v);
      });
    });
    const t = src.sensot || {};
    copierTexte(s.sensot, t, ["fait", "date", "notes"]);
    THEMES_SENSOT.forEach((th) => {
      const v = t.themes && t.themes[th.id];
      if (v) s.sensot.themes[th.id] = { gene: texte(v.gene), neutre: texte(v.neutre), plaisir: texte(v.plaisir) };
    });
    if (Array.isArray(t.priorites)) {
      s.sensot.priorites = t.priorites.slice(0, NB_PRIORITES).map((p) => ({
        situation: texte(p.situation), theme: texte(p.theme), contexte: texte(p.contexte), frequence: texte(p.frequence),
        intensite: texte(p.intensite), ressenti: texte(p.ressenti), objectif: texte(p.objectif),
      }));
    }
    return s;
  }

  /* ================= Calculs ================= */

  function syntheseOtipis(o) {
    const domaines = DOMAINES_OC.map((dm) => {
      const items = OTIPIS.filter((it) => it.domaine === dm.id);
      const cotes = items.filter((it) => o.scores[it.id]);
      const n = (v) => cotes.filter((it) => o.scores[it.id] === v);
      const somme = cotes.reduce((a, it) => a + o.scores[it.id], 0);
      const un = n(1), deux = n(2);
      return {
        id: dm.id, nom: dm.nom, total: items.length, cotes: cotes.length, adaptes: n(3).length,
        moyenne: cotes.length ? somme / cotes.length : null,
        marquees: un, legeres: deux,
        niveau: !cotes.length ? null : un.length ? "marque" : deux.length ? "leger" : "ok",
      };
    });
    return { domaines: domaines, cotes: domaines.reduce((a, d) => a + d.cotes, 0) };
  }

  function lignesDunn(forme, x) {
    const res = [];
    FORMES_DUNN[forme].groupes.forEach((g) => g.lignes.forEach((l) => {
      const v = x.lignes[l[0]] || { brut: "", classe: "" };
      res.push({ id: l[0], nom: l[1], groupe: g.titre, brut: nombre(v.brut), classe: v.classe });
    }));
    return res;
  }

  function systemesEso(e) {
    return SYSTEMES_ESO.map((sy) => {
      const v = e.systemes[sy.id] || {};
      const parts = [nombre(v.sp), nombre(v.p), nombre(v.l)];
      const rempli = parts.some((x) => x !== null);
      const somme = parts.reduce((a, x) => a + (x || 0), 0);
      return { id: sy.id, nom: sy.nom, max: sy.max, rempli: rempli, pourcentage: rempli ? (somme * 100) / sy.max : null };
    });
  }

  function valeursRoues(e) {
    const out = {};
    DOMAINES_ESO.forEach((dm) => {
      out[dm[0]] = {};
      SECTEURS_ESO.forEach((sc) => { out[dm[0]][sc] = nombre(e.roues[dm[0]][sc]); });
    });
    return out;
  }

  // Réponses détaillées de l'ESO par domaine : valeurs, moyenne, réponses les plus fortes et les plus faibles.
  function itemsEso(e, libelles) {
    return DOMAINES_ITEMS_ESO.map((dm) => {
      const src = (e.items && e.items[dm[0]]) || {};
      const libs = (libelles && libelles[dm[0]]) || [];
      const valeurs = Array.from({ length: NB_ITEMS_ESO }, (_, i) => { const v = nombre(src[i + 1]); return v === null ? null : v; });
      const pts = texte(e.points && e.points[dm[0]]);
      const points = /^[0-3-]{36}$/.test(pts) ? Array.from(pts).map((c) => (c === "-" ? null : Number(c))) : null;
      const rep = valeurs.map((v, i) => ({ num: i + 1, v: v, p: points ? points[i] : null, libelle: texte(libs[i]).trim() })).filter((x) => x.v !== null);
      return {
        id: dm[0], nom: dm[1], valeurs: valeurs, points: points, n: rep.length, reponses: rep,
        moyenne: rep.length ? rep.reduce((a, x) => a + x.v, 0) / rep.length : null,
        forts: rep.filter((x) => x.v >= 8), faibles: rep.filter((x) => x.v <= 2),
      };
    });
  }

  // Lit les libellés collés depuis l'exemplaire de l'ergothérapeute (texte copié du PDF) : 36 questions par domaine.
  function lireLibellesEso(brut) {
    const out = { sp: [], p: [], l: [] };
    const lignes = texte(brut).replace(/\r/g, "").split("\n");
    let dom = null, courant = null, attente = null;
    const propre = (t) => t.replace(/(\s+\d{1,2}){8,11}\s*$/, "").replace(/\s+/g, " ").trim();
    lignes.forEach((l0) => {
      const l = l0.trim();
      if (!l) return;
      const d = DOMAINES_ITEMS_ESO.find((x) => x[2].test(l) && l.length < 40);
      if (d) { dom = d[0]; courant = null; attente = null; return; }
      if (!dom || /propri[ée]t[ée] intellectuelle|reproduction|^pour compl[ée]ter|^0\s*=|^(\d{1,2}\s*){8,11}$/i.test(l)) return;
      // Numéro seul sur sa ligne (copie depuis certains lecteurs PDF) : le libellé suit.
      if (/^\d{1,2}$/.test(l) && +l === out[dom].length + 1) { attente = +l; courant = null; return; }
      if (attente && !/^(\d{1,2}\s*)+$/.test(l)) { courant = attente - 1; out[dom][courant] = propre(l); attente = null; return; }
      const m = /^(\d{1,2})[\s.)-]+(.+)$/.exec(l);
      if (m && +m[1] >= 1 && +m[1] <= NB_ITEMS_ESO && +m[1] === out[dom].length + 1) {
        courant = +m[1] - 1;
        out[dom][courant] = propre(m[2]);
      } else if (courant !== null && !/^(\d{1,2}\s*)+$/.test(l)) {
        out[dom][courant] = propre(out[dom][courant] + " " + l);
      }
    });
    Object.keys(out).forEach((k) => { out[k] = out[k].map((t) => texte(t).slice(0, 300)); });
    return out;
  }

  function themesSensot(t) {
    return THEMES_SENSOT.map((th) => {
      const v = t.themes[th.id] || {};
      return { id: th.id, nom: th.nom, gene: nombre(v.gene) || 0, neutre: nombre(v.neutre) || 0, plaisir: nombre(v.plaisir) || 0 };
    });
  }

  function aDesDonnees(s, quoi) {
    switch (quoi) {
      case "otipis": return s.otipis.fait === "oui" && syntheseOtipis(s.otipis).cotes > 0;
      case "dunn-enfant": return s.dunnEnfant.fait === "oui" && lignesDunn("enfant", s.dunnEnfant).some((l) => l.classe);
      case "dunn-scolaire": return s.dunnScolaire.fait === "oui" && lignesDunn("scolaire", s.dunnScolaire).some((l) => l.classe);
      case "eso-roues": return s.eso.fait === "oui" && DOMAINES_ESO.some((dm) => SECTEURS_ESO.some((sc) => nombre(s.eso.roues[dm[0]][sc]) !== null));
      case "eso-systemes": return s.eso.fait === "oui" && systemesEso(s.eso).some((x) => x.rempli);
      case "eso-items": return s.eso.fait === "oui" && itemsEso(s.eso).some((x) => x.n > 0);
    }
    return false;
  }

  /* ================= Rédaction ================= */

  function classeTexte(id) { const c = CLASSIFICATIONS.find((x) => x.id === id); return c ? min(c.label) : ""; }

  function redigerOtipis(o, a) {
    if (o.fait !== "oui") return "";
    const syn = syntheseOtipis(o);
    const l = [];
    l.push("Observations cliniques au cours du bilan sensoriel (OTIPIS)" + (o.parent === "oui" ? ", en présence d'un parent" : o.parent === "non" ? ", sans la présence d'un parent" : "") + " :");
    const lat = [];
    if (o.main) lat.push("main " + o.main);
    if (o.oeil) lat.push("œil " + o.oeil);
    if (o.pied) lat.push("pied " + o.pied);
    if (lat.length) l.push("– Latéralité : " + joindre(lat) + ".");
    syn.domaines.forEach((dm) => {
      if (!dm.cotes) return;
      let t = dm.nom + " : " + dm.adaptes + " item" + (dm.adaptes > 1 ? "s" : "") + " adapté" + (dm.adaptes > 1 ? "s" : "") + " sur " + dm.cotes;
      if (dm.marquees.length) t += " ; difficultés marquées en " + joindre(dm.marquees.map((it) => min(it.nom)));
      if (dm.legeres.length) t += " ; quelques difficultés en " + joindre(dm.legeres.map((it) => min(it.nom)));
      l.push("– " + t + ".");
    });
    const mesures = [];
    if (nombre(o.temps20) !== null) mesures.push("extension contre la gravité tenue " + fmt(nombre(o.temps20)) + " s sur 20");
    if (nombre(o.temps22) !== null) mesures.push("flexion contre la gravité tenue " + fmt(nombre(o.temps22)) + " s sur 20");
    if (nombre(o.erreursMD) !== null || nombre(o.erreursMG) !== null) {
      mesures.push("perception manuelle des formes : " + [nombre(o.erreursMD) !== null ? fmt(nombre(o.erreursMD)) + " erreur(s) main droite" : "", nombre(o.erreursMG) !== null ? fmt(nombre(o.erreursMG)) + " erreur(s) main gauche" : ""].filter(Boolean).join(", "));
    }
    if (mesures.length) l.push("– Mesures : " + mesures.join(" ; ") + ".");
    const notes = OTIPIS.filter((it) => o.notes[it.id] && o.notes[it.id].trim()).map((it) => it.nom + " : " + o.notes[it.id].trim().replace(/\.$/, ""));
    if (notes.length) l.push("– Remarques : " + notes.join(" ; ") + ".");
    if (o.autres.trim()) l.push("", "Autres observations : " + point(o.autres.trim()));
    if (o.comportement.trim()) l.push("Comportement global et temps de transition : " + point(o.comportement.trim()));
    if (o.discussion.trim()) l.push("Échanges à l'issue du bilan : " + point(o.discussion.trim()));
    if (!syn.cotes) l.push("[Cotation OTIPIS à compléter.]");
    return l.join("\n");
  }

  function redigerDunnForme(forme, x, a) {
    if (x.fait !== "oui") return "";
    const f = FORMES_DUNN[forme];
    const lignes = lignesDunn(forme, x);
    const l = [];
    l.push(f.titre + ", rempli par " + (x.repondant.trim() || f.repondant) + (x.date ? " le " + dateCourte(x.date) : "") + " :");
    f.groupes.forEach((g) => {
      const ls = lignes.filter((r) => r.groupe === g.titre && r.classe);
      if (!ls.length) return;
      if (g.titre === "Quadrants") {
        l.push("– " + g.titre + " : " + ls.map((r) => r.nom.toLowerCase() + " " + classeTexte(r.classe) + (r.brut !== null ? " (" + fmt(r.brut) + ")" : "")).join(" ; ") + ".");
      } else {
        const atypiques = ls.filter((r) => r.classe !== "c");
        l.push("– " + g.titre + " : " + (atypiques.length
          ? atypiques.map((r) => r.nom.toLowerCase() + " " + classeTexte(r.classe)).join(" ; ") + (atypiques.length < ls.length ? " ; les autres comme la majorité des autres" : "")
          : "toutes comme la majorité des autres") + ".");
      }
    });
    const quads = lignes.filter((r) => r.groupe === "Quadrants" && r.classe && r.classe !== "c");
    if (quads.length) {
      l.push("Le profil met en évidence " + joindre(quads.map((r) => {
        const q = QUADRANTS.find((y) => y.id === r.id);
        const plus = r.classe === "p" || r.classe === "bp";
        return q.plus + (plus ? (r.classe === "bp" ? " beaucoup plus marqué" : " plus marqué") : (r.classe === "bm" ? " beaucoup moins marqué" : " moins marqué")) + (q.plus.indexOf("une ") === 0 ? "e" : "") + " que chez la plupart des enfants";
      })) + ".");
    }
    if (!lignes.some((r) => r.classe)) l.push("[Classifications du manuel à saisir.]");
    if (x.notes.trim()) l.push(point(maj(x.notes.trim())));
    return l.join("\n");
  }

  // Lecture des roues et des systèmes : secteurs en difficulté par domaine, systèmes sous le repère, constantes d'un domaine à l'autre.
  function analyseEso(e) {
    const val = valeursRoues(e);
    const domaines = DOMAINES_ESO.map((dm) => {
      const secteurs = SECTEURS_ESO.map((sc) => ({ id: sc, v: val[dm[0]][sc], niveau: niveauRoueEso(val[dm[0]][sc]) })).filter((x) => x.v !== null);
      const moyenne = secteurs.length ? secteurs.reduce((t, x) => t + x.v, 0) / secteurs.length : null;
      return { id: dm[0], nom: dm[1], secteurs: secteurs, moyenne: moyenne };
    });
    const globaux = SECTEURS_ESO.map((sc) => {
      const vs = domaines.map((d) => (d.secteurs.find((x) => x.id === sc) || {}).v).filter((v) => v !== undefined && v !== null);
      return { id: sc, n: vs.length, moyenne: vs.length ? vs.reduce((t, v) => t + v, 0) / vs.length : null, partout: vs.length === domaines.length && vs.every((v) => v < 2) };
    }).filter((x) => x.n);
    const sys = systemesEso(e).filter((x) => x.rempli);
    return { domaines: domaines, globaux: globaux, systemes: sys, bas: sys.filter((x) => x.pourcentage < REPERE_ESO).sort((x, y) => x.pourcentage - y.pourcentage) };
  }

  const COURT_SYSTEMES_ESO = { olfagust: "olfaction-gustation", vestib: "vestibulaire", proprio: "proprioception", intero: "intéroception" };
  const ADJ_SYSTEMES_ESO = { audition: "auditif", olfagust: "olfactif et gustatif", visuel: "visuel", tactile: "tactile", proprio: "proprioceptif", vestib: "vestibulaire", intero: "intéroceptif" };
  const court = (x) => COURT_SYSTEMES_ESO[x.id] || min(x.nom);
  const plans = (l) => (l.length > 1 ? "les plans " : "le plan ") + joindre(l.map((x) => ADJ_SYSTEMES_ESO[x.id]));
  // Détail des résultats, point par point (aperçu de l'outil, pour l'ergothérapeute).
  function detailEso(e, a, opts) {
    if (e.fait !== "oui") return "";
    const libelles = (opts && opts.libelles) || null;
    const l = [];
    l.push("Profil de l'engagement sensori-occupationnel (ESO), questionnaire parental rempli par " + (e.repondant.trim() || "les parents") + (e.date ? " le " + dateCourte(e.date) : "") + ".");
    const an = analyseEso(e);
    const roues = an.domaines.some((d) => d.secteurs.length);
    if (roues || an.systemes.length) l.push("Lecture : chaque réponse est cotée de 0 à 3 ; 3 correspond à un engagement adapté. Roues : score moyen par secteur, de 0 à 3. Systèmes sensoriels : pourcentage d'engagement, repère à " + REPERE_ESO + " %.");
    const v1 = (v) => fmt(v, 1);
    if (an.systemes.length) {
      l.push("– Systèmes sensoriels : " + an.systemes.slice().sort((x, y) => x.pourcentage - y.pourcentage).map((x) => court(x) + " " + fmt(x.pourcentage, 0) + " %").join(", ") + ".");
      if (an.bas.length) l.push("– Sous le repère de " + REPERE_ESO + " %, engagement fragilisé sur " + plans(an.bas) + (an.bas.length < an.systemes.length ? " ; les autres systèmes sont au-dessus du repère." : "."));
      else l.push("– Tous les systèmes sensoriels sont au-dessus du repère de " + REPERE_ESO + " %.");
    }
    an.domaines.forEach((d) => {
      if (!d.secteurs.length) return;
      const de = (niv) => d.secteurs.filter((x) => x.niveau && x.niveau.id === niv).sort((x, y) => x.v - y.v).map((x) => SECTEURS_NOMS_ESO[x.id].nom + " (" + x.id + " " + v1(x.v) + ")");
      const m = [];
      const marque = de("marque"), modere = de("modere");
      if (marque.length) m.push("difficultés marquées en " + joindre(marque));
      if (modere.length) m.push("difficultés modérées en " + joindre(modere));
      l.push("– " + d.nom + (d.moyenne !== null ? " (moyenne " + v1(d.moyenne) + "/3)" : "") + " : " + (m.length ? m.join(" ; ") + (marque.length + modere.length < d.secteurs.length ? " ; autres secteurs adaptés" : "") : "engagement adapté dans tous les secteurs") + ".");
    });
    const dom = an.domaines.filter((d) => d.moyenne !== null).sort((x, y) => x.moyenne - y.moyenne);
    if (dom.length > 1 && dom[0].moyenne < 2 && dom[1].moyenne - dom[0].moyenne >= 0.3) l.push("– Le domaine le plus touché est " + ({ sp: "celui des soins personnels", p: "celui de la productivité", l: "celui des loisirs" })[dom[0].id] + ".");
    const partout = an.globaux.filter((x) => x.partout).sort((x, y) => x.moyenne - y.moyenne);
    if (partout.length) l.push("– " + maj(joindre(partout.map((x) => SECTEURS_NOMS_ESO[x.id].le))) + (partout.length > 1 ? " se retrouvent" : " se retrouve") + " dans les trois domaines d'occupation, ce qui suggère une gêne présente dans l'ensemble du quotidien.");
    // Situations les plus difficiles (0 point), avec le texte des questions s'il est disponible.
    const items = itemsEso(e, libelles).filter((x) => x.n > 0);
    const durs = items.map((x) => ({ nom: x.nom, l: x.reponses.filter((r) => r.p === 0 && r.libelle) })).filter((x) => x.l.length);
    if (durs.length) l.push("– Situations les plus difficiles selon les parents : " + durs.map((x) => min(x.nom) + " : " + x.l.slice(0, 3).map((r) => "« " + min(r.libelle.replace(/[.\s]+$/, "")) + " » (" + (r.v <= 1 ? "jamais" : r.v >= 9 ? "toujours" : fmt(r.v, 0) + "/10") + ")").join(", ") + (x.l.length > 3 ? "…" : "")).join(" ; ").replace(/…$/, "") + (durs[durs.length - 1].l.length > 3 ? "…" : "."));
    // Synthèse
    const faibles = an.globaux.filter((x) => x.moyenne !== null && x.moyenne < 2).sort((x, y) => x.moyenne - y.moyenne).slice(0, 3);
    if (roues || an.systemes.length) {
      if (faibles.length || an.bas.length) {
        let t = "En résumé, le profil ESO de " + a.sujetMin + " montre " + (faibles.length ? joindre(faibles.map((x) => SECTEURS_NOMS_ESO[x.id].signe)) : "un engagement fragilisé");
        if (an.bas.length) t += (faibles.length ? ", en particulier sur " : " sur ") + plans(an.bas.slice(0, 3));
        l.push(t + ".");
      } else l.push("En résumé, le profil ESO de " + a.sujetMin + " ne montre pas de difficulté notable d'engagement sensori-occupationnel.");
    }
    if (!roues && !an.systemes.length) {
      if (items.length) l.push("– Réponses détaillées : " + items.map((x) => min(x.nom) + " " + x.n + "/" + NB_ITEMS_ESO + " réponses").join(", ") + ". [Cotation à reporter ou à calculer avec la grille du cabinet.]");
      else l.push("[Synthèse ESO à saisir.]");
    }
    if (e.notes.trim()) l.push(point(maj(e.notes.trim())));
    return l.join("\n");
  }

  // Synthèse rédigée pour le compte rendu : profil d'ensemble, difficultés et domaines, systèmes, situations concrètes, hypothèse.
  const PHRASES_SECTEURS_ESO = {
    OR: (fort) => "une hyperréactivité sensorielle " + (fort ? "marquée" : "modérée"),
    UR: (fort) => "une hyporéactivité sensorielle " + (fort ? "marquée" : "modérée"),
    SS: (fort) => "une recherche sensorielle " + (fort ? "importante" : "modérée"),
    DS: (fort) => "des difficultés " + (fort ? "marquées" : "modérées") + " de discrimination sensorielle",
    CP: (fort) => "des difficultés " + (fort ? "marquées" : "modérées") + " de contrôle postural",
    PX: (fort) => "des difficultés praxiques " + (fort ? "marquées" : "modérées"),
    EO: (fort) => "un engagement dans les activités " + (fort ? "nettement" : "un peu") + " restreint",
  };
  const DANS_DOMAINES_ESO = { sp: "les soins personnels", p: "le travail scolaire", l: "les loisirs" };
  function citationEso(r) {
    const t = min(r.libelle.replace(/\s*\((ex|par ex)[^)]*\)/gi, "").replace(/[.\s]+$/, ""));
    return "« " + t + " » (" + (r.v <= 1 ? "jamais" : r.v >= 9 ? "toujours" : fmt(r.v, 0) + " sur 10") + ")";
  }
  function redigerEso(e, a, opts) {
    if (e.fait !== "oui") return "";
    const libelles = (opts && opts.libelles) || null;
    const an = analyseEso(e);
    const roues = an.domaines.some((d) => d.secteurs.length);
    const items = itemsEso(e, libelles).filter((x) => x.n > 0);
    const l = [];
    const qui = (e.repondant.trim() || "les parents") + (e.date ? " le " + dateCourte(e.date) : "");
    if (!roues && !an.systemes.length) {
      l.push("Profil de l'engagement sensori-occupationnel (ESO), questionnaire parental rempli par " + qui + ".");
      if (items.length) l.push("– Réponses détaillées : " + items.map((x) => min(x.nom) + " " + x.n + "/" + NB_ITEMS_ESO + " réponses").join(", ") + ". [Cotation à reporter ou à calculer avec la grille du cabinet.]");
      else l.push("[Synthèse ESO à saisir.]");
      if (e.notes.trim()) l.push(point(maj(e.notes.trim())));
      return l.join("\n");
    }
    // 1. Profil d'ensemble
    const doms = an.domaines.filter((d) => d.moyenne !== null);
    const moyenne = doms.length ? Math.round((doms.reduce((t, d) => t + d.moyenne, 0) / doms.length) * 10) / 10 : null;
    const faibles = an.globaux.filter((x) => x.moyenne !== null && x.moyenne < 2).sort((x, y) => x.moyenne - y.moyenne);
    let p1 = "Le profil de l'engagement sensori-occupationnel (ESO), rempli par " + qui + ", ";
    if (moyenne !== null) {
      const qualif = moyenne < 1.5 ? "nettement fragilisé" : moyenne < 2 ? "fragilisé" : faibles.length || an.bas.length ? "globalement adapté, avec des fragilités ciblées" : "adapté";
      p1 += "décrit chez " + a.sujetMin + " un engagement dans les activités du quotidien " + qualif + " (moyenne " + fmt(moyenne, 1) + " sur 3, où 3 correspond à un engagement adapté).";
    } else p1 += "a été coté de 0 à 3 par question (3 correspond à un engagement adapté).";
    l.push(p1);
    // 2. Difficultés : secteurs, intensité, domaines concernés
    if (faibles.length) {
      // Secteurs regroupés quand ils touchent les mêmes domaines : « A et B, surtout dans … ».
      const groupes = [];
      faibles.slice(0, 4).forEach((x) => {
        const touches = an.domaines.filter((d) => { const sc = d.secteurs.find((y) => y.id === x.id); return sc && sc.v < 2; }).map((d) => d.id);
        const cleG = touches.join(",");
        let g = groupes.find((y) => y.cle === cleG);
        if (!g) { g = { cle: cleG, touches: touches, phrases: [] }; groupes.push(g); }
        g.phrases.push(PHRASES_SECTEURS_ESO[x.id](x.moyenne < 1));
      });
      const morceaux = groupes.map((g) => joindre(g.phrases) + (g.touches.length === an.domaines.length ? (g.phrases.length > 1 ? ", qui touchent" : ", qui touche") + " les trois domaines du quotidien" : g.touches.length ? ", surtout dans " + joindre(g.touches.map((id) => DANS_DOMAINES_ESO[id])) : ""));
      const p2 = "Il met en évidence " + (morceaux.length === 2 ? morceaux[0] + ", ainsi que " + morceaux[1] : morceaux.join(" ; ")) + ".";
      const tri = doms.slice().sort((x, y) => x.moyenne - y.moyenne);
      l.push(p2 + (tri.length > 1 && tri[0].moyenne < 2 && tri[1].moyenne - tri[0].moyenne >= 0.3 ? " " + maj(DANS_DOMAINES_ESO[tri[0].id]) + (tri[0].id === "p" ? " est le domaine le plus touché" : " sont le domaine le plus touché") + " (moyenne " + fmt(tri[0].moyenne, 1) + " sur 3)." : ""));
    } else if (roues) l.push("Aucun secteur ne montre de difficulté notable : l'engagement est adapté dans les soins personnels, le travail scolaire et les loisirs.");
    // 3. Systèmes sensoriels
    if (an.systemes.length) {
      const tri = an.systemes.slice().sort((x, y) => x.pourcentage - y.pourcentage);
      if (an.bas.length) {
        const pcts = an.bas.map((x) => fmt(x.pourcentage, 0) + " %");
        let p3 = "Sur le plan des systèmes sensoriels, l'engagement est fragilisé sur " + plans(an.bas) + " (" + (pcts.length > 1 ? (pcts.every((x) => x === pcts[0]) ? pcts[0] + " chacun" : "respectivement " + joindre(pcts)) : pcts[0]) + ", sous le repère de " + REPERE_ESO + " %)";
        const autres = tri.filter((x) => x.pourcentage >= REPERE_ESO);
        p3 += autres.length ? " ; les autres systèmes restent au-dessus du repère." : ".";
        l.push(p3);
      } else l.push("Tous les systèmes sensoriels sont au-dessus du repère de " + REPERE_ESO + " %" + (tri[0].pourcentage < 75 ? ", le plus bas étant " + plans([tri[0]]).replace(/^le plan /, "le plan ") + " (" + fmt(tri[0].pourcentage, 0) + " %)" : "") + ".");
    }
    // 4. Situations concrètes (questions à 0 point), en commençant par les secteurs les plus touchés
    const cle = opts && opts.cotation ? normaliserCotationEso(opts.cotation) : null;
    const ordre = faibles.map((x) => x.id);
    const durs = [];
    items.forEach((x) => x.reponses.forEach((r) => {
      if (r.p !== 0 || !r.libelle) return;
      const sc = cle ? cle.secteurs[r.num - 1] : "";
      durs.push({ r: r, rang: ordre.indexOf(sc) < 0 ? 9 : ordre.indexOf(sc) });
    }));
    durs.sort((x, y) => x.rang - y.rang);
    if (durs.length) l.push("Au quotidien, les parents relèvent notamment : " + durs.slice(0, 4).map((x) => citationEso(x.r)).join(", ") + ".");
    // 5. Hypothèse prudente
    const fragiles = faibles.slice(0, 4).map((x) => x.id);
    const parties = [];
    const modulation = fragiles.filter((x) => x === "OR" || x === "UR" || x === "SS");
    if (modulation.length) parties.push("une difficulté de modulation sensorielle (" + joindre(modulation.map((x) => ({ OR: "hyperréactivité", UR: "hyporéactivité", SS: "recherche sensorielle" })[x])) + ")");
    if (fragiles.indexOf("DS") >= 0) parties.push("une difficulté de discrimination sensorielle");
    const motrices = fragiles.filter((x) => x === "CP" || x === "PX");
    if (motrices.length) parties.push("des difficultés motrices d'origine sensorielle (" + joindre(motrices.map((x) => ({ CP: "contrôle postural", PX: "praxies" })[x])) + ")");
    if (parties.length) l.push("Ce profil évoque " + joindre(parties) + ". " + (parties.length > 1 || /^des /.test(parties[0]) ? "Ces difficultés " + (fragiles.indexOf("EO") >= 0 ? "restreignent" : "peuvent gêner") : "Cette difficulté " + (fragiles.indexOf("EO") >= 0 ? "restreint" : "peut gêner")) + " la participation de " + a.sujetMin + " aux activités du quotidien ; elles sont à mettre en lien avec l'observation clinique et les autres résultats du bilan.".replace("; elles sont", parties.length > 1 || /^des /.test(parties[0]) ? "; elles sont" : "; elle est"));
    else if (fragiles.indexOf("EO") >= 0) l.push("Ce profil évoque surtout un engagement restreint dans les activités du quotidien, à mettre en lien avec l'observation clinique et les autres résultats du bilan.");
    else if (an.bas.length) l.push("Ce profil évoque surtout une fragilité sur " + plans(an.bas) + ", à confirmer par l'observation clinique.");
    if (e.notes.trim()) l.push(point(maj(e.notes.trim())));
    return l.join("\n");
  }

  function redigerSensot(t, a) {
    if (t.fait !== "oui") return "";
    const l = [];
    l.push("SensOT-dir (version enfant)" + (t.date ? ", le " + dateCourte(t.date) : "") + " : " + a.sujetMin + " a classé les situations proposées selon la gêne ou le plaisir ressentis.");
    const th = themesSensot(t);
    const genes = th.filter((x) => x.gene > 0).sort((x, y) => y.gene - x.gene);
    const plaisirs = th.filter((x) => x.plaisir > 0).sort((x, y) => y.plaisir - x.plaisir);
    if (genes.length) l.push("– Situations gênantes : " + genes.map((x) => min(x.nom) + " (" + fmt(x.gene) + ")").join(", ") + ".");
    if (plaisirs.length) l.push("– Situations agréables : " + plaisirs.map((x) => min(x.nom) + " (" + fmt(x.plaisir) + ")").join(", ") + ".");
    const prio = t.priorites.filter((p) => p.situation.trim());
    if (prio.length) {
      l.push("", "Situations prioritaires choisies par " + a.sujetMin + " :");
      prio.forEach((p) => {
        const det = [];
        const theme = THEMES_SENSOT.find((x) => x.id === p.theme);
        if (theme || p.contexte) det.push([theme ? min(theme.nom) : "", p.contexte ? min(p.contexte) : ""].filter(Boolean).join(", "));
        let s = p.situation.trim().replace(/\.$/, "") + (det.length ? " (" + det.join("") + ")" : "");
        const g = [];
        if (p.frequence) g.push("gêne " + p.frequence);
        if (nombre(p.intensite) !== null) g.push("intensité " + fmt(nombre(p.intensite)) + "/5");
        if (p.ressenti.trim()) g.push(min(p.ressenti.trim()).replace(/\.$/, ""));
        if (g.length) s += " : " + g.join(", ");
        l.push("– " + maj(s) + ".");
      });
    }
    if (!genes.length && !plaisirs.length && !prio.length) l.push("[Résultats du tri à saisir.]");
    if (t.notes.trim()) l.push(point(maj(t.notes.trim())));
    return l.join("\n");
  }

  function rediger(s, a, opts) {
    return {
      otipis: redigerOtipis(s.otipis, a),
      dunn: [redigerDunnForme("enfant", s.dunnEnfant, a), redigerDunnForme("scolaire", s.dunnScolaire, a)].filter(Boolean).join("\n\n"),
      eso: redigerEso(s.eso, a, opts),
      sensot: redigerSensot(s.sensot, a),
    };
  }

  /* ================= Constats pour le diagnostic et les préconisations ================= */

  function constats(s) {
    const c = { facteurs: [], constats: [], raisons: {}, objectifs: [] };
    const premier = (cle, raison) => { if (!c.raisons[cle]) c.raisons[cle] = raison; };

    if (s.otipis.fait === "oui") {
      const syn = syntheseOtipis(s.otipis);
      syn.domaines.forEach((dm) => {
        if (dm.niveau !== "marque" && dm.niveau !== "leger") return;
        const items = dm.marquees.concat(dm.legeres).map((it) => min(it.nom));
        const de = DOMAINES_OC.find((x) => x.id === dm.id).de;
        c.constats.push((dm.niveau === "marque" ? "des difficultés " : "des fragilités ") + de + " (OTIPIS : " + joindre(items.slice(0, 4)) + (items.length > 4 ? "…" : "") + ")");
        c.facteurs.push((dm.niveau === "marque" ? "des difficultés " : "des fragilités ") + de);
        premier(dm.id, "les difficultés " + de + " (OTIPIS)");
      });
      const sc = s.otipis.scores;
      if (sc["3"] && sc["3"] <= 2) premier("auditif", "les réactions aux stimuli auditifs (OTIPIS)");
      if (sc["4"] && sc["4"] <= 2) premier("tactile", "les réactions aux stimuli tactiles (OTIPIS)");
      if (sc["5"] && sc["5"] <= 2) premier("attention", "le niveau de concentration (OTIPIS)");
      if (sc["6"] && sc["6"] <= 2) premier("recherche", "le niveau d'activité (OTIPIS)");
      ["16a", "16b", "16c"].forEach((id) => { if (sc[id] && sc[id] <= 2) premier("motriciteFine", "la manipulation d'objets dans la main (OTIPIS)"); });
    }

    [["enfant", "dunnEnfant"], ["scolaire", "dunnScolaire"]].forEach(([forme, cle]) => {
      if (s[cle].fait !== "oui") return;
      const lignes = lignesDunn(forme, s[cle]);
      const quads = lignes.filter((r) => r.groupe === "Quadrants" && (r.classe === "p" || r.classe === "bp"));
      quads.forEach((r) => {
        const q = QUADRANTS.find((y) => y.id === r.id);
        if (c.facteurs.indexOf(q.facteur) < 0) c.facteurs.push(q.facteur);
        premier(r.id, q.facteur + " (Dunn 2" + (forme === "scolaire" ? ", compagnon scolaire" : "") + " : " + classeTexte(r.classe) + ")");
      });
      if (quads.length) c.constats.push("profil sensoriel 2 de Dunn" + (forme === "scolaire" ? " (compagnon scolaire)" : "") + " : " + joindre(quads.map((r) => r.nom.toLowerCase() + " " + classeTexte(r.classe))));
      lignes.filter((r) => r.groupe !== "Quadrants" && (r.classe === "p" || r.classe === "bp")).forEach((r) => {
        const map = { auditif: "auditif", visuel: "visuel", tactile: "tactile", attention: "attention", mouvement: "recherche" };
        if (map[r.id]) premier(map[r.id], "la section " + r.nom.toLowerCase() + " du profil de Dunn (" + classeTexte(r.classe) + ")");
      });
    });

    if (s.eso.fait === "oui") {
      // Un score bas signale une difficulté : systèmes sous le repère de 50 %, secteurs des roues sous 2 sur 3.
      const an = analyseEso(s.eso);
      const faibles = an.globaux.filter((x) => x.moyenne !== null && x.moyenne < 2).sort((x, y) => x.moyenne - y.moyenne);
      const m = [];
      if (faibles.length) m.push(joindre(faibles.slice(0, 3).map((x) => SECTEURS_NOMS_ESO[x.id].signe)));
      if (an.bas.length) m.push("un engagement fragilisé sur " + plans(an.bas) + " (" + an.bas.map((x) => fmt(x.pourcentage, 0) + " %").join(", ") + ")");
      if (m.length) {
        c.constats.push("engagement sensori-occupationnel : " + m.join(", ") + " (ESO)");
        if (faibles.length) c.facteurs.push(faibles.slice(0, 2).map((x) => SECTEURS_NOMS_ESO[x.id].signe).join(" et ") + " au quotidien");
      }
      const mapS = { audition: "auditif", tactile: "tactile", visuel: "visuel", vestib: "recherche", proprio: "postural" };
      an.bas.forEach((x) => { if (mapS[x.id]) premier(mapS[x.id], "le système " + min(x.nom) + " au profil ESO (" + fmt(x.pourcentage, 0) + " %)"); });
      const mapR = { OR: "sensibilite", UR: "enregistrement", SS: "recherche", DS: "discrimination", CP: "postural", PX: "praxies" };
      faibles.forEach((x) => { if (mapR[x.id]) premier(mapR[x.id], SECTEURS_NOMS_ESO[x.id].signe + " (ESO, " + fmt(x.moyenne, 1) + " sur 3)"); });
    }

    if (s.sensot.fait === "oui") {
      const genes = themesSensot(s.sensot).filter((x) => x.gene > 0).sort((x, y) => y.gene - x.gene);
      if (genes.length) {
        c.constats.push("situations sensorielles gênantes au quotidien, surtout " + joindre(genes.slice(0, 3).map((x) => min(x.nom))) + " (SensOT-dir)");
        c.facteurs.push("une gêne sensorielle au quotidien (" + joindre(genes.slice(0, 2).map((x) => min(x.nom))) + ")");
        genes.forEach((x) => {
          const map = { auditif: "auditif", tactile: "tactile", visuel: "visuel", mouvement: "recherche" };
          if (map[x.id]) premier(map[x.id], "les situations gênantes du thème " + min(x.nom) + " (SensOT-dir)");
        });
      }
      s.sensot.priorites.filter((p) => p.situation.trim()).forEach((p) => {
        c.objectifs.push(p.objectif.trim() ? maj(p.objectif.trim()).replace(/\.$/, "") : "Diminuer la gêne ressentie dans la situation : " + min(p.situation.trim()).replace(/\.$/, ""));
      });
    }
    return c;
  }

  return {
    DOMAINES_OC, OTIPIS, ORDRE_PROFIL, CLASSIFICATIONS, QUADRANTS, FORMES_DUNN,
    DOMAINES_ESO, SECTEURS_ESO, SYSTEMES_ESO, REPERE_ESO, NB_ITEMS_ESO, DOMAINES_ITEMS_ESO, itemsEso, lireLibellesEso,
    SECTEURS_NOMS_ESO, NIVEAUX_ROUE_ESO, niveauRoueEso, POINTS_ESO, pointsEso, normaliserCotationEso, cotationEso, analyseEso, detailEso, redigerEso, THEMES_SENSOT, CONTEXTES_SENSOT, FREQUENCES_SENSOT, NB_PRIORITES,
    vide, normaliser, syntheseOtipis, lignesDunn, systemesEso, valeursRoues, themesSensot, aDesDonnees, rediger, constats,
  };
});
