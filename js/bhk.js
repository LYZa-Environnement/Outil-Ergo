/*
 * Outil Ergo : logique métier du bilan d'écriture.
 * BHK enfant (cotation, normes, déviation standard), grille d'observation de l'écriture,
 * bilans complémentaires, rédaction du compte rendu et modèle du document Word.
 * Aucune dépendance au navigateur : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  const api = fabrique();
  if (typeof module === "object" && module.exports) module.exports = api;
  else racine.BHK = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ================= Outils ================= */

  function nombre(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function texte(v) { return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function min(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function point(s) {
    const t = texte(s).trim();
    if (!t) return "";
    return /[.!?…:]$/.test(t) ? t : t + ".";
  }
  function joindre(l) {
    if (l.length <= 1) return l.join("");
    return l.slice(0, -1).join(", ") + " et " + l[l.length - 1];
  }
  function lignesDe(s) { return texte(s).split("\n").map((x) => x.trim().replace(/^[-–•]\s*/, "")).filter(Boolean); }
  function arrondi(n, dec) {
    const f = Math.pow(10, dec);
    const r = Math.round(n * f) / f;
    return r === 0 ? 0 : r;
  }
  function formaterNombre(n, dec) {
    if (n === null || n === undefined) return "";
    const s = dec === undefined ? String(arrondi(n, 2)) : arrondi(n, dec).toFixed(dec);
    return s.replace(".", ",");
  }
  function formaterDS(z) {
    if (z === null || z === undefined) return "";
    const r = arrondi(z, 2);
    return (r > 0 ? "+" : r < 0 ? "−" : "") + formaterNombre(Math.abs(r), 2);
  }

  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function lireDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte(s));
    if (!m) return null;
    const a = +m[1], mo = +m[2], j = +m[3];
    if (mo < 1 || mo > 12 || j < 1 || j > 31) return null;
    return { a: a, m: mo, j: j, cle: a * 10000 + mo * 100 + j };
  }
  function deux(n) { return String(n).padStart(2, "0"); }
  function dateCourte(s) { const d = lireDate(s); return d ? deux(d.j) + "/" + deux(d.m) + "/" + d.a : ""; }
  function dateLongue(s) { const d = lireDate(s); return d ? (d.j === 1 ? "1er" : d.j) + " " + MOIS[d.m - 1] + " " + d.a : ""; }
  function aujourdhui() { const d = new Date(); return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()); }
  function age(naissance, passation) {
    const n = lireDate(naissance), p = lireDate(passation);
    if (!n || !p || p.cle < n.cle) return null;
    let ans = p.a - n.a, mois = p.m - n.m;
    if (p.j < n.j) mois -= 1;
    if (mois < 0) { ans -= 1; mois += 12; }
    return { ans: ans, mois: mois };
  }
  function formaterAge(a) {
    if (!a) return "";
    const ans = a.ans + (a.ans > 1 ? " ans" : " an");
    return a.mois ? ans + " et " + a.mois + " mois" : ans;
  }

  // Inverse de la loi normale centrée réduite (approximation d'Acklam), pour les rangs percentiles.
  function quantileNormal(p) {
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const bas = 0.02425;
    let q, r;
    if (p < bas) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - bas) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /* ================= Accords ================= */

  function accords(d) {
    const prenom = texte(d.prenom).trim();
    const sujet = prenom || "L'enfant";
    const sujetMin = prenom || "l'enfant";
    if (d.sexe === "F") return { prenom: prenom, sujet: sujet, sujetMin: sujetMin, e: "e", Il: "Elle", il: "elle", le: "la ", un: "une" };
    if (d.sexe === "M") return { prenom: prenom, sujet: sujet, sujetMin: sujetMin, e: "", Il: "Il", il: "il", le: "le ", un: "un" };
    return { prenom: prenom, sujet: sujet, sujetMin: sujetMin, e: "(e)", Il: sujet, il: sujetMin, le: "", un: "un(e)" };
  }

  /* ================= Référentiel BHK ================= */

  const SCORE_MAX = 5;
  const NB_LIGNES = 5;
  const CLASSES = ["CP", "CE1", "CE2", "CM1", "CM2"];
  const AGES = ["6", "7", "8", "9", "10", "11"];

  const DOMAINES = [
    { id: "page", nom: "organisation de la page", preserve: "l'organisation de la page est préservée (taille, marge, lignes et espaces entre les mots)" },
    { id: "liaisons", nom: "liaisons", preserve: "les liaisons entre les lettres sont préservées" },
    { id: "lettres", nom: "formes et proportions des lettres", preserve: "les formes et les proportions des lettres sont préservées" },
    { id: "trace", nom: "qualité du tracé", preserve: "le tracé est assuré, sans retouche ni tremblement" },
  ];

  const CRITERES = [
    { id: 1, domaine: "page", mode: "taille", nom: "Écriture grande", aide: "Taille moyenne des lettres troncs, sur tout le texte (calque I, aide C)", defaut: "une écriture grande" },
    { id: 2, domaine: "page", mode: "global", nom: "Inclinaison de la marge vers la droite", aide: "Numéro de la ligne du calque atteinte par la dernière phrase (calque I, aide B)", defaut: "une marge qui s'incline vers la droite" },
    { id: 3, domaine: "page", mode: "lignes", nom: "Lignes non planes", aide: "Lettres dansantes, sans base rectiligne (aide A)", defaut: "des lignes non planes" },
    { id: 4, domaine: "page", mode: "lignes", nom: "Mots serrés", aide: "Moins d'une largeur de « o » entre deux mots (aide F)", defaut: "des mots serrés" },
    { id: 5, domaine: "liaisons", mode: "lignes", nom: "Écriture chaotique", aide: "Liens trop longs, angles aigus, changements de direction", defaut: "une écriture chaotique" },
    { id: 6, domaine: "liaisons", mode: "lignes", nom: "Liens interrompus entre les lettres", aide: "Absence de lien là où il devrait y en avoir un", defaut: "des liens interrompus entre les lettres" },
    { id: 7, domaine: "liaisons", mode: "lignes", nom: "Télescopages", aide: "Lettres qui se cognent ou se superposent", defaut: "des télescopages" },
    { id: 8, domaine: "lettres", mode: "lignes", nom: "Variation dans la hauteur des lettres troncs", aide: "Écart anormal entre la plus petite et la plus grande lettre tronc (aide D)", defaut: "des variations de hauteur des lettres troncs" },
    { id: 9, domaine: "lettres", mode: "lignes", nom: "Hauteur relative incorrecte", aide: "Lettres troncs aussi hautes que les lettres à hampe ou jambage (aide E). En cas de doute, cotez 1", defaut: "une hauteur relative incorrecte entre les sortes de lettres" },
    { id: 10, domaine: "lettres", mode: "lignes", nom: "Distorsion des lettres", aide: "Forme hors des formes standard de l'alphabet", defaut: "des lettres distordues" },
    { id: 11, domaine: "lettres", mode: "lignes", nom: "Formes de lettres ambiguës", aide: "Lettre qui peut être lue comme une autre", defaut: "des formes de lettres ambiguës" },
    { id: 12, domaine: "trace", mode: "lignes", nom: "Lettres retouchées", aide: "Lettre ou partie de lettre réécrite pour l'améliorer", defaut: "des lettres retouchées" },
    { id: 13, domaine: "trace", mode: "lignes", nom: "Hésitations et tremblements", aide: "Trace irrégulière, hésitante ou tremblée", defaut: "des hésitations ou tremblements de la trace" },
  ];
  const SCORE_TOTAL_MAX = CRITERES.length * SCORE_MAX;

  // Critère 1 : points selon la taille moyenne des lettres troncs (3 mm ou moins, 4, 5, 6, 7, 8, 9 mm ou plus).
  const BAREME_TAILLE = {
    CP: [0, 0, 1, 2, 3, 4, 5], CE1: [0, 0, 1, 2, 3, 4, 5],
    CE2: [0, 1, 2, 3, 4, 5, 5], CM1: [0, 1, 2, 3, 4, 5, 5], CM2: [0, 1, 2, 3, 4, 5, 5],
  };

  const REMARQUES = [
    { id: "translinearite", label: "Translinéarité" },
    { id: "omission-gauche", label: "Omission de la partie gauche" },
    { id: "marge-exageree", label: "Marge allant vers la droite de façon exagérée" },
    { id: "tremblements", label: "Tremblements" },
    { id: "micrographie", label: "Micrographie" },
    { id: "miroirs", label: "Lettres miroirs" },
    { id: "etalees", label: "Lettres trop étalées" },
    { id: "detachees", label: "Parties de mots détachées" },
    { id: "deviant", label: "Texte déviant (omissions, remplacements, répétitions)" },
  ];

  const MODES_COPIE = [
    { id: "lettre", label: "Lettre par lettre", texte: "lettre par lettre" },
    { id: "groupes-lettres", label: "Par groupes de lettres", texte: "par groupes de lettres" },
    { id: "mot", label: "Mot par mot", texte: "mot par mot" },
    { id: "groupes-mots", label: "Par groupes de mots", texte: "par groupes de mots" },
  ];

  /* ================= Grille d'observation de l'écriture ================= */

  const PRISES = [
    { id: "tripode-dynamique", label: "Tripode dynamique", texte: "prise tripode dynamique" },
    { id: "tripode-statique", label: "Tripode statique", texte: "prise tripode statique" },
    { id: "tridigitale-laterale", label: "Tridigitale latérale", texte: "prise tridigitale latérale" },
    { id: "quadripode", label: "Quadripode", texte: "prise quadripode" },
    { id: "pouce-enroule", label: "Pouce enroulé", texte: "prise avec pouce enroulé" },
    { id: "digitale", label: "Digitale", texte: "prise digitale" },
    { id: "palmaire", label: "Palmaire", texte: "prise palmaire" },
  ];

  // Chaque option : [valeur, libellé du bouton, fragment pour le compte rendu]. La première option est l'attendu.
  const GRILLE = [
    { id: "posture", titre: "Posture et installation", composante: "personne", items: [
      { id: "appui-podal", label: "Appui des pieds", options: [["ok", "Au sol", "bon appui podal"], ["absent", "Sans appui", "pieds sans appui au sol"]] },
      { id: "tronc", label: "Tronc", options: [["droit", "Droit", "tronc droit"], ["penche", "Penché", "tronc penché sur la feuille"], ["instable", "Instable", "posture instable, avec des changements fréquents de position"]] },
      { id: "distance", label: "Distance œil-feuille", options: [["ok", "Adaptée", "distance oculaire adaptée"], ["proche", "Trop proche", "visage très proche de la feuille"]] },
      { id: "avant-bras", label: "Appui de l'avant-bras", options: [["ok", "Sur la table", "appui correct de l'avant-bras sur la table"], ["partiel", "Partiel", "appui partiel de l'avant-bras"], ["absent", "Absent", "avant-bras sans appui"]] },
      { id: "poignet", label: "Poignet", options: [["neutre", "Neutre", "poignet en position neutre"], ["flexion", "Hyperflexion", "poignet en hyperflexion"], ["extension", "Hyperextension", "poignet en hyperextension"]] },
      { id: "main-aide", label: "Main non scriptrice", options: [["ok", "Tient la feuille", "la main non scriptrice stabilise la feuille"], ["non", "Ne tient pas", "la main non scriptrice ne stabilise pas la feuille"]] },
    ] },
    { id: "prise", titre: "Prise et tonus", composante: "personne", items: [
      { id: "pression-doigts", label: "Pression des doigts sur l'outil", options: [["ok", "Normale", "pression des doigts adaptée"], ["forte", "Hyperappui", "hyperappui des doigts sur l'outil"], ["faible", "Faible", "pression des doigts faible"]] },
      { id: "pression-feuille", label: "Pression sur la feuille", options: [["ok", "Normale", "pression sur la feuille adaptée"], ["forte", "Forte", "trace très appuyée sur la feuille"], ["faible", "Faible", "trace pâle, peu appuyée"]] },
      { id: "mobilite", label: "Mobilité des doigts", options: [["ok", "Présente", "bonne mobilité des doigts"], ["reduite", "Réduite", "mobilité des doigts réduite, geste mené par le poignet ou l'épaule"]] },
      { id: "appui-main", label: "Appui de la main", options: [["ok", "Bord ulnaire", "appui sur le bord ulnaire de la main"], ["absent", "Sans appui", "main sans appui sur la feuille"]] },
      { id: "tensions", label: "Tensions", options: [["non", "Absentes", "pas de tension visible"], ["oui", "Présentes", "tensions ou crispation visibles"]] },
    ] },
    { id: "geste", titre: "Geste graphique", composante: "occupation", items: [
      { id: "type", label: "Type d'écriture", options: [["cursive", "Cursive", "écriture cursive"], ["script", "Script", "écriture en script"], ["mixte", "Mixte", "écriture mixte, cursive et script"]] },
      { id: "sens", label: "Sens de tracé des lettres", options: [["ok", "Respecté", "sens de tracé des lettres respecté"], ["partiel", "Partiel", "sens de tracé partiellement respecté"], ["non", "Non respecté", "sens de tracé des lettres non respecté"]] },
      { id: "fluidite", label: "Fluidité", options: [["ok", "Fluide", "geste fluide"], ["peu", "Peu fluide", "geste peu fluide"], ["saccade", "Saccadé", "geste saccadé"]] },
      { id: "levees", label: "Levées de crayon", options: [["ok", "Normales", "levées de crayon habituelles"], ["frequentes", "Fréquentes", "levées de crayon fréquentes à l'intérieur des mots"]] },
    ] },
    { id: "lettres", titre: "Lettres et chiffres", composante: "occupation", items: [
      { id: "formation", label: "Formation des lettres", options: [["ok", "Correcte", "lettres correctement formées"], ["approx", "Approximative", "formation des lettres approximative"], ["non", "Incorrecte", "formation des lettres incorrecte"]] },
      { id: "proportions", label: "Proportions entre les lettres", options: [["ok", "Respectées", "proportions entre les lettres respectées"], ["non", "Irrégulières", "proportions entre les lettres irrégulières"]] },
      { id: "lignage", label: "Placement sur le lignage", options: [["ok", "Respecté", "lettres bien placées sur le lignage"], ["irregulier", "Irrégulier", "placement sur le lignage irrégulier"], ["non", "Non respecté", "lignage non respecté"]] },
      { id: "confusions", label: "Confusions de lettres", options: [["non", "Absentes", "pas de confusion entre les lettres"], ["oui", "Présentes", "confusions possibles entre certaines lettres"]] },
      { id: "chiffres", label: "Chiffres", options: [["ok", "Lisibles", "chiffres bien formés et lisibles"], ["mal", "Mal formés", "chiffres mal formés"], ["miroir", "En miroir", "chiffres en miroir"]] },
    ] },
    { id: "page", titre: "Organisation de la page", composante: "occupation", items: [
      { id: "marge", label: "Marge", options: [["ok", "Respectée", "marge respectée"], ["non", "Non respectée", "marge non respectée"]] },
      { id: "espaces", label: "Espaces entre les mots", options: [["ok", "Suffisants", "espaces entre les mots suffisants"], ["irreguliers", "Irréguliers", "espaces entre les mots irréguliers"], ["insuffisants", "Insuffisants", "espaces entre les mots insuffisants"]] },
      { id: "feuille", label: "Gestion de l'espace de la feuille", options: [["ok", "Bonne", "bonne gestion de l'espace de la feuille"], ["difficile", "Difficile", "gestion de l'espace de la feuille difficile"]] },
    ] },
    { id: "lisibilite", titre: "Lisibilité et efficacité", composante: "occupation", items: [
      { id: "lisibilite", label: "Lisibilité", options: [["bonne", "Bonne", "écriture lisible"], ["moyenne", "Moyenne", "lisibilité moyenne"], ["faible", "Faible", "écriture peu lisible"]] },
      { id: "relecture", label: "Relecture de ses écrits", options: [["ok", "Sans difficulté", "se relit sans difficulté"], ["difficile", "Difficile", "relecture de ses écrits difficile"]] },
      { id: "ratures", label: "Ratures et corrections", options: [["rares", "Rares", "peu de ratures"], ["frequentes", "Fréquentes", "ratures et corrections fréquentes"]] },
      { id: "fatigue", label: "Fatigabilité", options: [["non", "Absente", "pas de fatigue observée"], ["oui", "Présente", "fatigue apparaissant en cours de tâche"]] },
    ] },
  ];

  /* ================= Bilans complémentaires ================= */

  const TYPES_SCORE = [
    { id: "ds", label: "Déviation standard" },
    { id: "ns", label: "Note standard (moy. 10, ET 3)" },
    { id: "indice", label: "Indice (moy. 100, ET 15)" },
    { id: "rp", label: "Rang percentile" },
    { id: "brut", label: "Score brut + norme" },
  ];

  const TESTS = [
    { id: "lespargot", section: "vitesse", court: "Lespargot", titre: "Lespargot : évaluation des lenteurs d'écriture",
      lignes: [["copie", "Copie", "ds"], ["repetition", "Répétition", "ds"], ["dictee", "Dictée", "ds"]] },
    { id: "ajuriaguerra", section: "vitesse", court: "Ajuriaguerra", titre: "Ajuriaguerra : écriture en situation d'accélération",
      lignes: [["habituelle", "Vitesse habituelle", "ds"], ["acceleration", "Accélération", "ds"]] },
    { id: "dtvp3", section: "complementaires", court: "DTVP-3", titre: "DTVP-3 : test de développement de la perception visuelle",
      lignes: [["coordination", "Coordination œil-main", "ns"], ["copie", "Copie", "ns"], ["figure-fond", "Figure-fond", "ns"],
        ["closure", "Closure visuelle", "ns"], ["constance", "Constance de la forme", "ns"],
        ["pvrmr", "Perception visuelle à réponse motrice réduite", "indice"], ["ivm", "Intégration visuo-motrice", "indice"], ["pvg", "Perception visuelle générale", "indice"]] },
    { id: "mabc3", section: "complementaires", court: "MABC-3", titre: "MABC-3 : batterie d'évaluation du mouvement chez l'enfant",
      lignes: [["dexterite", "Dextérité manuelle", "ns"], ["viser", "Habileté à viser et attraper", "ns"], ["equilibre", "Équilibre et locomotion", "ns"], ["total", "Note totale de motricité", "ns"]] },
    { id: "manos", section: "complementaires", court: "Man.OS", titre: "Man.OS : test de manipulation des outils scolaires",
      lignes: [["global", "Score global", "ds"]] },
  ];

  const BILANS_COURANTS = [
    { id: "entretien", texte: (a) => "Entretien avec les parents et " + a.sujetMin },
    { id: "comptes-rendus", texte: (a) => "Lecture des comptes rendus des professionnels qui suivent " + a.sujetMin },
    { id: "questionnaire", texte: () => "Questionnaire d'auto-évaluation de l'écriture" },
    { id: "productions", texte: () => "Observation des productions réalisées en classe" },
    { id: "ordinateur", texte: () => "Mise en situation avec l'outil informatique" },
  ];

  const AMENAGEMENTS = [
    { id: "polycopies", label: "Limiter la tâche graphique", texte: "Limiter la tâche graphique (privilégier les polycopiés)" },
    { id: "temps", label: "Tiers-temps", texte: "Accorder un tiers-temps pour les évaluations, afin de compenser la lenteur d'écriture et de permettre l'autocorrection" },
    { id: "non-penaliser", label: "Ne pas pénaliser l'écriture", texte: "Ne pas pénaliser la qualité de l'écriture ni l'orthographe dans les productions écrites" },
    { id: "effacable", label: "Stylo effaçable", texte: "Autoriser un stylo effaçable pour limiter les ratures" },
    { id: "lignage", label: "Lignage adapté", texte: "Proposer un lignage adapté (lignes agrandies ou repères visuels)" },
    { id: "outil", label: "Outil scripteur adapté", texte: "Proposer un outil scripteur adapté (crayon ergonomique, embout)" },
    { id: "installation", label: "Installation en classe", texte: "Veiller à une installation adaptée en classe (hauteur de table et de chaise, appui des pieds)" },
    { id: "numerique", label: "Outil numérique", texte: "Envisager l'outil numérique, avec un apprentissage de la frappe au clavier" },
  ];
  const DISPOSITIFS = ["PAP", "PPRE", "PPS"];

  /* ================= Réglages et normes ================= */

  function normesVides() {
    return { type: "bhk-normes", version: 2, source: "", qualite: { classe: {}, age: {} }, vitesse: { classe: {}, age: {} } };
  }

  function normaliserNormes(n) {
    const out = normesVides();
    if (!n || typeof n !== "object") return out;
    out.source = texte(n.source);
    ["qualite", "vitesse"].forEach((ind) => {
      ["classe", "age"].forEach((ref) => {
        const t = n[ind] && n[ind][ref];
        if (!t || typeof t !== "object") return;
        Object.keys(t).forEach((cle) => {
          const g = t[cle];
          if (!g || typeof g !== "object") return;
          const ligne = {};
          ["F", "M", "E"].forEach((s) => {
            const v = Array.isArray(g[s]) ? g[s] : null;
            const m = v && nombre(v[0]), e = v && nombre(v[1]);
            if (m !== null && e !== null && e > 0) ligne[s] = [m, e];
          });
          if (Object.keys(ligne).length) out[ind][ref][cle] = ligne;
        });
      });
    });
    return out;
  }

  function praticienVide() { return { nom: "", titre: "Ergothérapeute D.E.", tel: "", email: "", adresse: "", siret: "", adeli: "" }; }

  function reglagesParDefaut() {
    return {
      type: "bhk-reglages", version: 1,
      cabinet: { nom: "", adresse: "" },
      praticiens: [praticienVide()],
      signataire: 0,
      seuilInferieur: 1, seuilPatho: 1.5, seuilSuperieur: 1,
      inverserQualite: true,
      brouillon: true,
      normes: normesVides(),
    };
  }

  function normaliserReglages(r) {
    const def = reglagesParDefaut();
    if (!r || typeof r !== "object") return def;
    const out = def;
    if (r.cabinet) { out.cabinet.nom = texte(r.cabinet.nom); out.cabinet.adresse = texte(r.cabinet.adresse); }
    if (Array.isArray(r.praticiens) && r.praticiens.length) {
      out.praticiens = r.praticiens.slice(0, 4).map((p) => {
        const v = praticienVide();
        Object.keys(v).forEach((k) => { if (p && p[k] !== undefined) v[k] = texte(p[k]); });
        return v;
      });
    }
    const s = nombre(r.signataire);
    out.signataire = s !== null && s >= 0 && s < out.praticiens.length ? s : 0;
    ["seuilInferieur", "seuilPatho", "seuilSuperieur"].forEach((k) => { const v = nombre(r[k]); if (v !== null && v > 0) out[k] = v; });
    if (out.seuilPatho < out.seuilInferieur) out.seuilPatho = out.seuilInferieur;
    if (r.inverserQualite !== undefined) out.inverserQualite = !!r.inverserQualite;
    if (r.brouillon !== undefined) out.brouillon = !!r.brouillon;
    if (r.normes) out.normes = normaliserNormes(r.normes);
    return out;
  }

  /* ================= Dossier ================= */

  const CHAMPS_TEXTE = [
    "prenom", "nom", "sexe", "naissance", "parents", "adresse", "passation", "prescripteur", "etablissement", "groupe", "enseignant",
    "motif", "orientation", "bilansLibre",
    "devTrajectoire", "devMoteur", "devLangage", "envFamilial", "envSuivis", "envParcours",
    "occSommeil", "occHabillage", "occAlimentation", "occHygiene", "occLoisirs", "occDeplacements", "occIndependant", "occSynthese",
    "ecoleAmenagements", "ecoleHumain", "ecoleClasse", "ecoleProductions",
    "lateralite", "prise", "priseDetail", "motivation", "envFeuille", "envOutil", "envLieu",
    "reference", "normesSexe", "tailleMm", "c1", "c2", "vitesse", "modeCopie", "reperage", "fautes", "douleurEva", "douleurDetail", "bhkNotes",
    "conclusionContexte", "conclusionPoints", "conclusionForces",
    "dispositif", "amenagementsLibre", "reeducation", "reeducationObjet", "reevaluation", "precoLibre",
  ];
  const CHAMPS_LISTE = ["bilansUtilises", "remarques", "amenagements"];

  function testVide(t) {
    return { fait: "", notes: "", lignes: t.lignes.map((l) => ({ id: l[0], epreuve: l[1], type: l[2], valeur: "", moy: "", et: "", sens: "haut", commentaire: "" })) };
  }

  function dossierVide() {
    const d = {};
    CHAMPS_TEXTE.forEach((k) => { d[k] = ""; });
    CHAMPS_LISTE.forEach((k) => { d[k] = []; });
    d.passation = aujourdhui();
    d.reference = "classe";
    d.normesSexe = "auto";
    d.bilansUtilises = ["entretien"];
    d.lignes = {};
    d.grille = {};
    d.grilleNotes = {};
    d.tests = {};
    TESTS.forEach((t) => { d.tests[t.id] = testVide(t); });
    return d;
  }

  function normaliserDossier(src) {
    const d = dossierVide();
    if (!src || typeof src !== "object") return d;
    CHAMPS_TEXTE.forEach((k) => { if (src[k] !== undefined && src[k] !== null) d[k] = texte(src[k]); });
    CHAMPS_LISTE.forEach((k) => { if (Array.isArray(src[k])) d[k] = src[k].map(texte); });
    if (d.reference !== "age") d.reference = "classe";
    if (d.normesSexe !== "ensemble") d.normesSexe = "auto";
    if (src.lignes && typeof src.lignes === "object") {
      CRITERES.filter((c) => c.mode === "lignes").forEach((c) => {
        const l = src.lignes[c.id];
        if (Array.isArray(l)) d.lignes[c.id] = Array.from({ length: NB_LIGNES }, (_, i) => (l[i] ? 1 : 0));
      });
    }
    if (src.grille && typeof src.grille === "object") {
      GRILLE.forEach((g) => g.items.forEach((it) => {
        const v = src.grille[g.id + "." + it.id];
        if (it.options.some((o) => o[0] === v)) d.grille[g.id + "." + it.id] = v;
      }));
    }
    if (src.grilleNotes && typeof src.grilleNotes === "object") {
      GRILLE.forEach((g) => { if (src.grilleNotes[g.id]) d.grilleNotes[g.id] = texte(src.grilleNotes[g.id]); });
    }
    if (src.tests && typeof src.tests === "object") {
      TESTS.forEach((t) => {
        const s = src.tests[t.id];
        if (!s || typeof s !== "object") return;
        d.tests[t.id].fait = s.fait ? "oui" : "";
        d.tests[t.id].notes = texte(s.notes);
        if (Array.isArray(s.lignes) && s.lignes.length) {
          d.tests[t.id].lignes = s.lignes.slice(0, 20).map((l, i) => ({
            id: texte(l.id) || "x" + i,
            epreuve: texte(l.epreuve),
            type: TYPES_SCORE.some((ty) => ty.id === l.type) ? l.type : "ds",
            valeur: texte(l.valeur), moy: texte(l.moy), et: texte(l.et),
            sens: l.sens === "bas" ? "bas" : "haut",
            commentaire: texte(l.commentaire),
          }));
        }
      });
    }
    return d;
  }

  /* ================= Calculs ================= */

  function niveau(perf, reg) {
    if (perf === null || perf === undefined) return null;
    const r = arrondi(perf, 2);
    if (r <= -reg.seuilPatho) return "patho";
    if (r <= -reg.seuilInferieur) return "inferieur";
    if (r >= reg.seuilSuperieur) return "superieur";
    return "moyenne";
  }

  const APPRECIATIONS = {
    patho: "Très inférieur à la moyenne, pathologique",
    inferieur: "Inférieur à la moyenne",
    moyenne: "Dans la moyenne",
    superieur: "Supérieur à la moyenne",
  };

  function pointsTaille(mm, classe) {
    const b = BAREME_TAILLE[classe];
    const t = nombre(mm);
    if (!b || t === null || t < 0) return null;
    return b[Math.max(0, Math.min(6, Math.round(t) - 3))];
  }

  function scoreCritere(d, c) {
    if (c.id === 1) {
      const m = nombre(d.c1);
      if (m !== null && m >= 0 && m <= SCORE_MAX) return Math.round(m);
      return pointsTaille(d.tailleMm, d.groupe);
    }
    if (c.id === 2) {
      const m = nombre(d.c2);
      return m !== null && m >= 0 && m <= SCORE_MAX ? Math.round(m) : null;
    }
    const l = d.lignes[c.id] || [];
    return l.reduce((a, v) => a + (v ? 1 : 0), 0);
  }

  function normeDe(reg, indic, ref, cle, sexe) {
    const t = reg.normes[indic] && reg.normes[indic][ref] && reg.normes[indic][ref][cle];
    if (!t || !t[sexe]) return null;
    return { moy: t[sexe][0], et: t[sexe][1], identiquesFM: !!(t.F && t.M && t.F[0] === t.M[0] && t.F[1] === t.M[1]) };
  }

  function calculerBHK(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const ageEnfant = age(d.naissance, d.passation);
    const ref = d.reference;
    const cle = ref === "classe" ? (CLASSES.indexOf(d.groupe) >= 0 ? d.groupe : "") : (ageEnfant ? String(ageEnfant.ans) : "");
    const horsEtalonnage = ref === "age" && ageEnfant !== null && AGES.indexOf(String(ageEnfant.ans)) < 0;
    const sexe = d.normesSexe === "ensemble" ? "E" : d.sexe === "F" ? "F" : d.sexe === "M" ? "M" : "E";
    const nQ = cle ? normeDe(reg, "qualite", ref, cle, sexe) : null;
    const nV = cle ? normeDe(reg, "vitesse", ref, cle, sexe) : null;

    const scores = CRITERES.map((c) => scoreCritere(d, c));
    const complet = scores[0] !== null && scores[1] !== null;
    const total = scores.reduce((a, s) => a + (s || 0), 0);
    const vitesse = nombre(d.vitesse);

    const zQbrut = complet && nQ ? (total - nQ.moy) / nQ.et : null;
    const perfQ = zQbrut === null ? null : -zQbrut;
    const dsQ = zQbrut === null ? null : reg.inverserQualite ? -zQbrut : zQbrut;
    const dsV = vitesse !== null && nV ? (vitesse - nV.moy) / nV.et : null;

    const domaines = DOMAINES.map((dom) => {
      const idx = CRITERES.map((c, i) => (c.domaine === dom.id ? i : -1)).filter((i) => i >= 0);
      return { id: dom.id, nom: dom.nom, preserve: dom.preserve, total: idx.reduce((a, i) => a + (scores[i] || 0), 0), max: idx.length * SCORE_MAX, complet: idx.every((i) => scores[i] !== null) };
    });

    let referenceTexte = "";
    if (cle) referenceTexte = ref === "classe" ? "en " + cle : "à " + cle + " ans";
    const sexeTexte = { F: "filles", M: "garçons", E: "ensemble des enfants" }[sexe];

    return {
      age: ageEnfant, ref: ref, cle: cle, sexe: sexe, sexeTexte: sexeTexte, horsEtalonnage: horsEtalonnage, referenceTexte: referenceTexte,
      scores: scores, complet: complet, total: total, max: SCORE_TOTAL_MAX, vitesse: vitesse,
      cpm: vitesse !== null ? vitesse / 5 : null,
      normeQ: nQ, normeV: nV,
      dsQ: dsQ, perfQ: perfQ, dsV: dsV,
      niveauQ: niveau(perfQ, reg), niveauV: niveau(dsV, reg),
      domaines: domaines,
      alerteNormes: !!((nQ && nQ.identiquesFM && sexe !== "E") || (nV && nV.identiquesFM && sexe !== "E")),
    };
  }

  // Déviation standard d'une ligne de bilan complémentaire.
  function dsLigne(l) {
    const v = nombre(l.valeur);
    if (v === null) return null;
    switch (l.type) {
      case "ds": return v;
      case "ns": return (v - 10) / 3;
      case "indice": return (v - 100) / 15;
      case "rp": return v > 0 && v < 100 ? quantileNormal(v / 100) : null;
      case "brut": {
        const m = nombre(l.moy), e = nombre(l.et);
        if (m === null || e === null || e <= 0) return null;
        const z = (v - m) / e;
        return l.sens === "bas" ? -z : z;
      }
    }
    return null;
  }

  function valeurLigne(l) {
    const v = nombre(l.valeur);
    if (v === null) return "";
    const f = formaterNombre(v);
    switch (l.type) {
      case "ds": return "DS " + formaterDS(v);
      case "ns": return "note standard " + f;
      case "indice": return "indice " + f;
      case "rp": return "rang percentile " + f;
      case "brut": return f + (nombre(l.moy) !== null ? " (moyenne " + formaterNombre(nombre(l.moy)) + (nombre(l.et) !== null ? ", ET " + formaterNombre(nombre(l.et)) : "") + ")" : "");
    }
    return f;
  }

  function calculerTests(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    return TESTS.map((t) => {
      const s = d.tests[t.id];
      const lignes = s.lignes.map((l) => {
        const ds = dsLigne(l);
        return { epreuve: l.epreuve, type: l.type, valeurTexte: valeurLigne(l), commentaire: l.commentaire.trim(), ds: ds, niveau: niveau(ds, reg), remplie: nombre(l.valeur) !== null };
      });
      return { id: t.id, court: t.court, titre: t.titre, section: t.section, fait: s.fait === "oui", notes: s.notes.trim(), lignes: lignes };
    });
  }

  // Bornes entières des zones d'interprétation pour chaque type de score (légende du tableau).
  function zonesLegende(reg) {
    const classer = (z) => niveau(z, reg);
    const zones = (vers, de, a) => {
      const res = { patho: null, inferieur: null, moyenne: null, superieur: null };
      for (let x = de; x <= a; x++) {
        const n = classer(vers(x));
        if (!res[n]) res[n] = [x, x]; else res[n][1] = x;
      }
      return res;
    };
    const f = (r, de, a, suffixe) => {
      const t = {};
      Object.keys(r).forEach((k) => {
        const b = r[k];
        if (!b) { t[k] = "–"; return; }
        if (b[0] === de && b[1] === a) t[k] = "toutes";
        else if (b[0] === de) t[k] = "≤ " + b[1] + (suffixe || "");
        else if (b[1] === a) t[k] = "≥ " + b[0] + (suffixe || "");
        else t[k] = b[0] === b[1] ? String(b[0]) : b[0] + " à " + b[1];
      });
      return t;
    };
    const p = formaterNombre(reg.seuilPatho), i = formaterNombre(reg.seuilInferieur), s = formaterNombre(reg.seuilSuperieur);
    return {
      ds: { patho: "DS ≤ −" + p, inferieur: "−" + p + " < DS ≤ −" + i, moyenne: "−" + i + " < DS < +" + s, superieur: "DS ≥ +" + s },
      ns: f(zones((x) => (x - 10) / 3, 1, 19), 1, 19),
      indice: f(zones((x) => (x - 100) / 15, 40, 160), 40, 160),
      rp: f(zones((x) => quantileNormal(x / 100), 1, 99), 1, 99),
    };
  }

  /* ================= Rédaction ================= */

  const SECTIONS = [
    { id: "motif", titre: "Motif du bilan", niveau: 2 },
    { id: "bilans", titre: "Bilans utilisés", niveau: 2 },
    { id: "anamnese", titre: "Anamnèse", niveau: 2 },
    { id: "environnement", titre: "Environnement de {enfant}", niveau: 2 },
    { id: "maison", titre: "À la maison", niveau: 3, avant: [[2, "Description des occupations pouvant générer des difficultés au quotidien pour {enfant}"]] },
    { id: "ecole", titre: "À l'école", niveau: 3 },
    { id: "personne", titre: "Composante liée à la personne", niveau: 3, avant: [[2, "Écriture"]] },
    { id: "environnementale", titre: "Composante environnementale", niveau: 3 },
    { id: "observation", titre: "Observation de l'écriture manuscrite", niveau: 4, avant: [[3, "Composante occupationnelle"]] },
    { id: "bhk", titre: "Copie de texte : BHK", niveau: 4 },
    { id: "vitesse", titre: "Vitesse d'écriture", niveau: 4 },
    { id: "complementaires", titre: "Bilans complémentaires", niveau: 2 },
    { id: "conclusion", titre: "Conclusion", niveau: 2, avant: [["recap"]] },
    { id: "preconisations", titre: "Préconisations", niveau: 2 },
    { id: "salutations", titre: "Formule de politesse", niveau: 0 },
  ];

  function titreSection(titre, d) {
    const prenom = texte(d.prenom).trim();
    return titre.replace("{enfant}", prenom || "l'enfant");
  }

  function ou(v, defaut) { const t = texte(v).trim(); return t ? point(t) : defaut; }

  function fragmentsGrille(d, domaineId) {
    const g = GRILLE.find((x) => x.id === domaineId);
    return g.items.map((it) => {
      const v = d.grille[g.id + "." + it.id];
      const o = it.options.find((x) => x[0] === v);
      return o ? o[2] : null;
    }).filter(Boolean);
  }

  function phraseGrille(d, domaineId, libelle) {
    const fr = fragmentsGrille(d, domaineId);
    const note = texte(d.grilleNotes[domaineId]).trim();
    if (!fr.length && !note) return "";
    return libelle + " : " + (fr.length ? point(fr.join(", ")) : "") + (note ? (fr.length ? " " : "") + point(maj(note)) : "");
  }

  const SITUATION = {
    patho: ["très en dessous de la moyenne", " (zone pathologique)"],
    inferieur: ["en dessous de la moyenne", ""],
    moyenne: ["dans la moyenne", ""],
    superieur: ["au-dessus de la moyenne", ""],
  };

  function messageNormes(r, indic) {
    if (r.horsEtalonnage) return "[Âge hors de l'étalonnage du BHK enfant (6 à 11 ans).]";
    if (!r.cle) return r.ref === "classe" ? "[Choisir la classe pour situer ce score.]" : "[Renseigner les dates pour situer ce score.]";
    return "[Normes " + (indic === "qualite" ? "de qualité" : "de vitesse") + " à importer dans les réglages.]";
  }

  function rediger(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const a = accords(d);
    const r = calculerBHK(d, reg);
    const tests = calculerTests(d, reg);
    const out = {};

    // Motif
    out.motif = ou(maj(d.motif.trim()), "[Motif du bilan à compléter.]") + (d.orientation.trim() ? " Orientation par " + point(d.orientation.trim()) : "");

    // Bilans utilisés
    {
      const l = BILANS_COURANTS.filter((b) => d.bilansUtilises.indexOf(b.id) >= 0).map((b) => b.texte(a));
      if (r.complet || r.vitesse !== null) l.push("BHK : échelle d'évaluation rapide de l'écriture chez l'enfant");
      if (Object.keys(d.grille).length) l.push("Grille d'observation de l'écriture");
      tests.filter((t) => t.fait).forEach((t) => l.push(t.titre));
      lignesDe(d.bilansLibre).forEach((x) => l.push(maj(x)));
      out.bilans = l.length ? l.map((x) => "– " + x).join("\n") : "[Bilans utilisés à compléter.]";
    }

    // Anamnèse
    out.anamnese = [
      "Trajectoire développementale : " + ou(d.devTrajectoire, "RAS"),
      "Acquisitions motrices : " + ou(d.devMoteur, "RAS"),
      "Développement du langage : " + ou(d.devLangage, "RAS"),
    ].join("\n");

    // Environnement
    out.environnement = [
      "Familial : " + ou(d.envFamilial, "[à compléter]"),
      "Accompagnements et suivis : " + ou(d.envSuivis, "aucun"),
      "Parcours scolaire : " + ou(d.envParcours, "RAS"),
    ].join("\n");

    // Occupations
    {
      const l = [
        "Sommeil : " + ou(d.occSommeil, "RAS"),
        "Habillage : " + ou(d.occHabillage, "RAS"),
        "Alimentation : " + ou(d.occAlimentation, "RAS"),
        "Soins d'hygiène : " + ou(d.occHygiene, "RAS"),
        "Loisirs : " + ou(d.occLoisirs, "RAS"),
        "Déplacements : " + ou(d.occDeplacements, "RAS"),
      ];
      if (d.occIndependant === "oui") l.push(a.sujet + " est indépendant" + a.e + " pour l'ensemble de ses activités quotidiennes.");
      if (d.occSynthese.trim()) l.push(point(maj(d.occSynthese.trim())));
      out.maison = l.join("\n");
    }
    {
      const l = [
        "Aménagements en place : " + ou(d.ecoleAmenagements, "aucun"),
        "Environnement humain : " + ou(d.ecoleHumain, "RAS"),
        "Environnement de la classe : " + ou(d.ecoleClasse, "RAS"),
      ];
      if (d.ecoleProductions.trim()) l.push("Productions réalisées en classe : " + point(d.ecoleProductions.trim()));
      out.ecole = l.join("\n");
    }

    // Composante liée à la personne
    {
      const l = [];
      if (d.lateralite === "droite" || d.lateralite === "gauche") l.push("Main d'écriture : " + d.lateralite + ".");
      const p1 = phraseGrille(d, "posture", "Posture et installation pendant les tâches écrites");
      if (p1) l.push(p1);
      const prise = PRISES.find((p) => p.id === d.prise);
      const frPrise = fragmentsGrille(d, "prise");
      const notePrise = texte(d.grilleNotes.prise).trim();
      const morceaux = [];
      if (prise) morceaux.push(prise.texte);
      if (d.priseDetail.trim()) morceaux.push(d.priseDetail.trim());
      frPrise.forEach((f) => morceaux.push(f));
      if (morceaux.length || notePrise) l.push("Prise du crayon : " + maj(point(morceaux.join(", "))) + (notePrise ? (morceaux.length ? " " : "") + point(maj(notePrise)) : ""));
      if (d.motivation.trim()) l.push("Motivation liée à la tâche écrite : " + point(d.motivation.trim()));
      out.personne = l.length ? l.join("\n") : "[Composante à compléter : posture, prise du crayon, motivation.]";
    }

    // Composante environnementale
    {
      const l = [];
      if (d.envFeuille.trim()) l.push("Position de la feuille : " + point(d.envFeuille.trim()));
      if (d.envOutil.trim()) l.push("Outil scripteur : " + point(d.envOutil.trim()));
      if (d.envLieu.trim()) l.push("Lumière, bruit et installation : " + point(d.envLieu.trim()));
      out.environnementale = l.length ? l.join("\n") : "[Composante à compléter : feuille, outil scripteur, environnement.]";
    }

    // Observation de l'écriture manuscrite
    {
      const l = [
        phraseGrille(d, "geste", "Geste graphique"),
        phraseGrille(d, "lettres", "Lettres et chiffres"),
        phraseGrille(d, "page", "Organisation de la page"),
        phraseGrille(d, "lisibilite", "Lisibilité et efficacité"),
      ].filter(Boolean);
      out.observation = l.length ? l.join("\n") : "[Observation de l'écriture à compléter.]";
    }

    // BHK
    {
      const puces = [];
      const mode = MODES_COPIE.find((m) => m.id === d.modeCopie);
      const copie = [];
      if (mode) copie.push(a.sujet + " copie " + mode.texte + ".");
      if (d.reperage === "bon") copie.push(maj(a.il) + " ne se perd pas dans le texte, ce qui montre une bonne prise d'informations visuelles.");
      if (d.reperage === "difficile") copie.push(maj(a.il) + " se perd dans le texte et revient souvent au modèle.");
      if (copie.length) puces.push(copie.join(" "));

      if (r.vitesse !== null) {
        let t = a.sujet + " copie " + formaterNombre(r.vitesse) + " caractères en 5 minutes, soit " + formaterNombre(r.cpm, 1) + " caractères par minute.";
        if (r.dsV !== null) {
          const s = SITUATION[r.niveauV];
          t += " " + a.Il + " obtient une déviation standard de " + formaterDS(r.dsV) + ", ce qui " + (a.le ? a.le + "situe " : "situe " + a.sujetMin + " ") + s[0] + " attendue " + r.referenceTexte + s[1] + ".";
        } else t += " " + messageNormes(r, "vitesse");
        puces.push(t);
      }
      if (r.complet) {
        let t = "Le score de dégradation est de " + r.total + "/" + r.max;
        if (r.dsQ !== null) {
          const s = SITUATION[r.niveauQ];
          t += ", soit une déviation standard de " + formaterDS(r.dsQ) + " : la qualité de l'écriture se situe " + s[0] + " attendue " + r.referenceTexte + s[1] + ".";
        } else t += ". " + messageNormes(r, "qualite");
        puces.push(t);
      } else if (r.scores.some((s, i) => i > 1 && s > 0) || r.scores[0] !== null || r.scores[1] !== null) {
        puces.push("[Cotation incomplète : renseigner les critères 1 et 2.]");
      }

      const defauts = CRITERES.map((c, i) => ({ c: c, s: r.scores[i] })).filter((x) => x.s).sort((x, y) => y.s - x.s || x.c.id - y.c.id);
      if (defauts.length) {
        puces.push("Les défauts observés sont : " + joindre(defauts.map((x) => x.c.defaut + (x.c.mode === "lignes" ? " (" + x.s + " ligne" + (x.s > 1 ? "s" : "") + " sur 5)" : " (" + x.s + "/5)"))) + ".");
      }
      if (r.complet) {
        const preserves = r.domaines.filter((dm) => dm.total === 0).map((dm) => dm.preserve);
        if (preserves.length) puces.push(maj(joindre(preserves)) + ".");
      }
      const rem = REMARQUES.filter((x) => d.remarques.indexOf(x.id) >= 0).map((x) => min(x.label));
      if (rem.length) puces.push("Remarques : " + joindre(rem) + ".");
      const fautes = nombre(d.fautes);
      if (fautes !== null) puces.push(fautes + (fautes > 1 ? " fautes d'orthographe ou corrections" : " faute d'orthographe ou correction") + " sur les cinq premières lignes.");
      const eva = nombre(d.douleurEva);
      if (eva !== null) puces.push("Douleur après l'épreuve : EVA " + formaterNombre(eva) + "/10" + (d.douleurDetail.trim() ? " (" + d.douleurDetail.trim().replace(/\.$/, "") + ")" : "") + ".");

      const l = [];
      if (puces.length) l.push("On observe sur l'épreuve du BHK que :", ...puces.map((p) => "– " + p));
      if (d.bhkNotes.trim()) l.push("", point(maj(d.bhkNotes.trim())));
      out.bhk = l.length ? l.join("\n") : "[Résultats du BHK à compléter.]";
    }

    // Vitesse d'écriture et bilans complémentaires
    const phraseLigne = (l) => {
      const morceaux = [l.valeurTexte];
      if (l.ds !== null && l.type !== "ds") morceaux.push("DS " + formaterDS(l.ds));
      let t = l.epreuve + " : " + morceaux.join(", ");
      if (l.niveau) t += ", " + min(APPRECIATIONS[l.niveau]);
      if (l.commentaire) t += ". " + maj(l.commentaire);
      return point(t);
    };
    const paragrapheTest = (t) => {
      const lignes = t.lignes.filter((l) => l.remplie || l.commentaire);
      const l = [t.titre + " :"];
      lignes.forEach((x) => l.push("– " + (x.remplie ? phraseLigne(x) : point(x.epreuve + " : " + x.commentaire))));
      if (t.notes) l.push(point(maj(t.notes)));
      if (l.length === 1) l.push("[Résultats à compléter.]");
      return l.join("\n");
    };
    {
      const blocs = [];
      if (r.vitesse !== null) {
        let t = "En copie de texte (BHK), " + a.sujetMin + " écrit " + formaterNombre(r.vitesse) + " caractères en 5 minutes, soit " + formaterNombre(r.cpm, 1) + " caractères par minute";
        t += r.dsV !== null ? " (DS " + formaterDS(r.dsV) + ", " + min(APPRECIATIONS[r.niveauV]) + ")." : ".";
        blocs.push(t);
      }
      tests.filter((t) => t.fait && t.section === "vitesse").forEach((t) => blocs.push(paragrapheTest(t)));
      out.vitesse = blocs.join("\n\n");
    }
    out.complementaires = tests.filter((t) => t.fait && t.section === "complementaires").map(paragrapheTest).join("\n\n");

    // Conclusion
    {
      const intro = [];
      const ag = r.age ? formaterAge(r.age) : "";
      let p = a.sujet + " est " + a.un + " enfant" + (ag ? " de " + ag : "") + (CLASSES.indexOf(d.groupe) >= 0 ? ", scolarisé" + a.e + " en " + d.groupe : "") + ".";
      if (d.conclusionContexte.trim()) p += " " + point(maj(d.conclusionContexte.trim()));
      intro.push(p);
      const puces = [];
      if (r.niveauQ) {
        puces.push({
          patho: "des difficultés avérées du geste graphique sur le plan de la qualité (BHK : DS " + formaterDS(r.dsQ) + ")",
          inferieur: "une qualité d'écriture inférieure à la moyenne attendue (BHK : DS " + formaterDS(r.dsQ) + ")",
          moyenne: "une qualité d'écriture dans la moyenne attendue (BHK : DS " + formaterDS(r.dsQ) + ")",
          superieur: "une qualité d'écriture supérieure à la moyenne attendue (BHK : DS " + formaterDS(r.dsQ) + ")",
        }[r.niveauQ]);
      }
      if (r.niveauV) {
        puces.push({
          patho: "une lenteur d'écriture marquée (BHK : DS " + formaterDS(r.dsV) + ")",
          inferieur: "une vitesse d'écriture inférieure à la moyenne attendue (BHK : DS " + formaterDS(r.dsV) + ")",
          moyenne: "une vitesse d'écriture dans la moyenne attendue (BHK : DS " + formaterDS(r.dsV) + ")",
          superieur: "une vitesse d'écriture supérieure à la moyenne attendue (BHK : DS " + formaterDS(r.dsV) + ")",
        }[r.niveauV]);
      }
      const eva = nombre(d.douleurEva);
      if (eva !== null && eva > 0) puces.push("des douleurs lors de l'écriture (EVA " + formaterNombre(eva) + "/10)");
      tests.filter((t) => t.fait).forEach((t) => {
        const faibles = t.lignes.filter((l) => l.niveau === "patho" || l.niveau === "inferieur");
        const cotees = t.lignes.filter((l) => l.niveau);
        if (faibles.length) {
          const patho = faibles.some((l) => l.niveau === "patho");
          puces.push("des résultats " + (patho ? "inférieurs à la moyenne, dont certains en zone pathologique," : "inférieurs à la moyenne") + " en " + joindre(faibles.map((l) => min(l.epreuve))) + " (" + t.court + ")");
        } else if (cotees.length) puces.push("des résultats dans la moyenne au " + t.court);
      });
      lignesDe(d.conclusionPoints).forEach((x) => puces.push(min(x).replace(/\.$/, "")));
      if (puces.length) {
        intro.push("Le bilan en ergothérapie met en avant :");
        puces.forEach((x, i) => intro.push("– " + x + (i === puces.length - 1 ? "." : " ;")));
      } else intro.push("[Conclusion à compléter.]");
      if (d.conclusionForces.trim()) intro.push("", "Points d'appui : " + point(min(d.conclusionForces.trim())));
      out.conclusion = intro.join("\n");
    }

    // Préconisations
    {
      const l = [];
      const am = AMENAGEMENTS.filter((x) => d.amenagements.indexOf(x.id) >= 0).map((x) => x.texte);
      lignesDe(d.amenagementsLibre).forEach((x) => am.push(maj(x).replace(/\.$/, "")));
      if (am.length) {
        l.push("Il semble justifié que des aménagements scolaires soient mis en place" + (d.dispositif ? " (" + d.dispositif + ")" : "") + " :");
        am.forEach((x) => l.push("– " + x + "."));
      }
      if (d.reeducation === "oui") {
        if (l.length) l.push("");
        l.push("Un accompagnement en ergothérapie semble pertinent pour une rééducation graphique " +
          (d.reeducationObjet.trim() ? point(min(d.reeducationObjet.trim())) : "afin d'apporter à " + a.sujetMin + " des stratégies et des outils pour améliorer la fluidité du geste."));
      }
      if (d.reevaluation.trim()) l.push("Une réévaluation est proposée dans " + d.reevaluation.trim() + ".");
      lignesDe(d.precoLibre).forEach((x) => l.push(point(maj(x))));
      out.preconisations = l.length ? l.join("\n") : "[Préconisations à compléter.]";
    }

    out.salutations = "En espérant que ces éléments aideront à la scolarisation de " + a.sujetMin + ", je vous adresse, Madame, Monsieur, l'expression de mes sincères salutations.";
    return out;
  }

  /* ================= Modèle du document ================= */

  // Découpe une ligne en segments : libellé en gras avant « : », passages entre crochets surlignés.
  function segments(ligne) {
    const runs = [];
    let reste = ligne;
    const m = /^([A-ZÀ-ÖØ-Ý][^:\[\]]{0,48}?) : ?(.*)$/.exec(ligne);
    if (m && m[1].split(/\s+/).length <= 8) {
      runs.push({ t: m[1] + " : ", b: true });
      reste = m[2];
    }
    reste.split(/(\[[^\]]*\])/).forEach((morceau) => {
      if (!morceau) return;
      if (/^\[.*\]$/.test(morceau)) runs.push({ t: morceau, surligne: true });
      else runs.push({ t: morceau });
    });
    return runs;
  }

  function texteVersBlocs(t) {
    const blocs = [];
    let puces = null;
    texte(t).split("\n").forEach((brute) => {
      const ligne = brute.trim();
      if (!ligne) { puces = null; return; }
      const m = /^[–•-]\s+(.*)$/.exec(ligne);
      if (m) {
        if (!puces) { puces = { type: "puces", items: [] }; blocs.push(puces); }
        puces.items.push(segments(m[1]));
      } else {
        puces = null;
        blocs.push({ type: "p", runs: segments(ligne) });
      }
    });
    return blocs;
  }

  function cellule(t, opts) { return Object.assign({ runs: Array.isArray(t) ? t : [{ t: texte(t) }] }, opts || {}); }

  function modeleDocument(dossier, reglages, textes) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const r = calculerBHK(d, reg);
    const tests = calculerTests(d, reg);
    const gen = rediger(d, reg);
    const tx = (id) => (textes && typeof textes[id] === "string" ? textes[id] : gen[id]);
    const blocs = [];

    blocs.push({ type: "titre", texte: "Compte rendu de bilan en ergothérapie" });

    // Informations sur l'enfant
    const nomComplet = [texte(d.nom).trim().toUpperCase(), texte(d.prenom).trim()].filter(Boolean).join(" ");
    const lignesInfo = (titre, paires) => [{ entete: true, cellules: [cellule(titre, { colspan: 2, gras: true, fond: "entete", align: "center" })] }]
      .concat(paires.map((p) => ({ cellules: [cellule(p[0], { gras: true }), cellule(texte(p[1]).trim() || "–")] })));
    const scol = [texte(d.etablissement).trim(), CLASSES.indexOf(d.groupe) >= 0 ? d.groupe : "", texte(d.enseignant).trim()].filter(Boolean).join(", ");
    blocs.push({ type: "h", niveau: 2, texte: "Informations sur l'enfant" });
    blocs.push({ type: "tableau", largeurs: [0.34, 0.66], lignes: []
      .concat(lignesInfo("Administratif", [["Nom, prénom", nomComplet], ["Date de naissance", dateCourte(d.naissance)], ["Âge au bilan", r.age ? formaterAge(r.age) : ""], ["Parents", d.parents], ["Adresse", d.adresse]]))
      .concat(lignesInfo("Prescription et suivi", [["Date du bilan", dateCourte(d.passation)], ["Médecin prescripteur", d.prescripteur]]))
      .concat(lignesInfo("Scolarité", [["Établissement scolaire, classe", scol]])) });

    SECTIONS.forEach((s) => {
      (s.avant || []).forEach((av) => {
        if (av[0] === "recap") blocs.push.apply(blocs, blocsRecap(r, tests, reg));
        else blocs.push({ type: "h", niveau: av[0], texte: titreSection(av[1], d) });
      });
      const t = tx(s.id);
      if (!texte(t).trim()) return;
      if (s.niveau) blocs.push({ type: "h", niveau: s.niveau, texte: titreSection(s.titre, d) });
      blocs.push.apply(blocs, texteVersBlocs(t));
    });

    const sig = reg.praticiens[reg.signataire] || reg.praticiens[0];
    if (sig && (sig.nom || sig.titre)) blocs.push({ type: "signature", texte: [sig.nom, sig.titre].filter(Boolean).join(", ") });

    const pied = sig ? [
      [sig.nom, sig.titre].filter(Boolean).join(" – "),
      [sig.tel, sig.email].filter(Boolean).join(" – "),
      sig.adresse || texte(reg.cabinet.adresse).split("\n").join(", "),
    ].filter((x) => x && x.trim()) : [];

    return {
      titre: "Bilan en ergothérapie" + (nomComplet ? " – " + nomComplet : ""),
      entete: {
        cabinet: { nom: reg.cabinet.nom, lignes: texte(reg.cabinet.adresse).split("\n").map((x) => x.trim()).filter(Boolean) },
        praticiens: reg.praticiens.filter((p) => p.nom).map((p) => ({
          nom: p.nom, lignes: [p.titre, p.tel, p.email, p.siret ? "N° SIRET : " + p.siret : "", p.adeli ? "N° ADELI : " + p.adeli : ""].filter(Boolean),
        })),
      },
      pied: pied,
      blocs: blocs,
    };
  }

  function blocsRecap(r, tests, reg) {
    const lignes = [];
    const ajout = (bilan, epreuve, score, ds, niv, commentaire) => lignes.push({ cellules: [
      cellule(bilan, { gras: true }), cellule(epreuve), cellule(score, { align: "center" }), cellule(ds === null ? "–" : formaterDS(ds), { align: "center" }),
      cellule([{ t: niv ? APPRECIATIONS[niv] : "–" }].concat(commentaire ? [{ t: " – " + commentaire, i: true }] : []), { fond: niv ? "niveau-" + niv : null }),
    ] });
    if (r.complet) ajout("BHK", "Qualité", r.total + "/" + r.max, r.dsQ, r.niveauQ, "");
    if (r.vitesse !== null) ajout("BHK", "Vitesse", formaterNombre(r.vitesse) + " car. en 5 min", r.dsV, r.niveauV, "");
    const types = new Set(["ds"]);
    tests.filter((t) => t.fait).forEach((t) => t.lignes.filter((l) => l.remplie).forEach((l) => {
      types.add(l.type);
      ajout(t.court, l.epreuve, l.type === "ds" ? "–" : l.valeurTexte.replace(/^note standard /, "NS ").replace(/^indice /, "").replace(/^rang percentile /, "RP "), l.ds, l.niveau, l.commentaire);
    }));
    if (!lignes.length) return [];

    const z = zonesLegende(reg);
    const legende = [{ entete: true, cellules: [cellule("Score", { gras: true, fond: "entete" })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(APPRECIATIONS[k], { gras: true, fond: "niveau-" + k, align: "center" }))) }];
    legende.push({ cellules: [cellule("Déviation standard (DS)", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.ds[k], { align: "center" }))) });
    if (types.has("ns")) legende.push({ cellules: [cellule("Note standard (NS)", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.ns[k], { align: "center" }))) });
    if (types.has("indice")) legende.push({ cellules: [cellule("Indice", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.indice[k], { align: "center" }))) });
    if (types.has("rp")) legende.push({ cellules: [cellule("Rang percentile (RP)", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.rp[k], { align: "center" }))) });

    const ref = r.cle ? "Normes BHK : " + (r.ref === "classe" ? "classe de " + r.cle : r.cle + " ans") + ", " + r.sexeTexte + "." : "";
    const intro = "Les scores sont exprimés en déviation standard (DS) : ils représentent l'écart entre le résultat obtenu et la moyenne attendue." +
      (reg.inverserQualite && r.complet ? " Pour la qualité du BHK, un DS négatif signale une écriture plus dégradée que la moyenne." : "");
    return [
      { type: "h", niveau: 2, texte: "Tableau récapitulatif des bilans réalisés" },
      { type: "p", runs: [{ t: intro }] },
      { type: "tableau", largeurs: [0.2, 0.2, 0.2, 0.2, 0.2], petit: true, lignes: legende },
      { type: "tableau", largeurs: [0.13, 0.27, 0.17, 0.1, 0.33], entetes: true, lignes: [{ entete: true, cellules: ["Bilan", "Épreuve", "Score", "DS", "Appréciation"].map((x) => cellule(x, { gras: true, fond: "entete" })) }].concat(lignes) },
    ].concat(ref ? [{ type: "p", runs: [{ t: ref, i: true }], petit: true }] : []);
  }

  /* ================= Export ================= */

  return {
    SCORE_MAX, NB_LIGNES, SCORE_TOTAL_MAX, CLASSES, AGES, DOMAINES, CRITERES, BAREME_TAILLE, REMARQUES, MODES_COPIE,
    PRISES, GRILLE, TYPES_SCORE, TESTS, BILANS_COURANTS, AMENAGEMENTS, DISPOSITIFS, SECTIONS, APPRECIATIONS,
    nombre, maj, min, age, formaterAge, formaterDS, formaterNombre, dateCourte, dateLongue, aujourdhui, quantileNormal,
    normesVides, normaliserNormes, reglagesParDefaut, normaliserReglages, praticienVide,
    dossierVide, normaliserDossier, pointsTaille, niveau, dsLigne, zonesLegende,
    calculerBHK, calculerTests, rediger, titreSection, texteVersBlocs, modeleDocument,
  };
});
