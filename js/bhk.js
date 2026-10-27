/*
 * Outil Ergo : logique métier du bilan d'écriture.
 * BHK enfant (cotation, normes, déviation standard), grille d'observation de l'écriture,
 * bilans complémentaires, rédaction du compte rendu et modèle du document Word.
 * Aucune dépendance au navigateur : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique(require("./sensoriel.js"), require("./occupation.js"), require("./accueil.js"), require("./seances.js"), require("./clavier.js"), require("./manos.js"), require("./ajuriaguerra.js"));
  else racine.BHK = fabrique(racine.Senso, racine.Occup, racine.Accueil, racine.Seances, racine.Clavier, racine.Manos, racine.Ajuri);
})(typeof self !== "undefined" ? self : this, function (Senso, Occup, Accueil, Seances, Clavier, Manos, Ajuri) {
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
    if (z < -5) return "< −5";
    if (z > 5) return "> +5";
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

  // BHK ado (6e à 3e) : 9 critères cotés phrase par phrase sur les cinq premières phrases.
  const CLASSES_ADO = ["6e", "5e", "4e", "3e"];
  const TOUTES_CLASSES = CLASSES.concat(CLASSES_ADO);
  const DOMAINES_ADO = [
    { id: "hauteur", nom: "hauteur des lettres" },
    { id: "formes", nom: "formes et liaisons" },
    { id: "lignes", nom: "organisation des lignes" },
    { id: "stabilite", nom: "stabilité des formes" },
  ];
  const CRITERES_ADO = [
    { id: "A", domaine: "hauteur", mode: "lignes", nom: "Variation de hauteur des lettres troncs", aide: "Écart de hauteur anormal entre les lettres troncs (aide A)", defaut: "des variations de hauteur des lettres troncs" },
    { id: "B", domaine: "hauteur", mode: "lignes", nom: "Hauteur relative des lettres troncs et des lettres à hampe ou jambage", aide: "Lettres troncs et lettres à hampe ou jambage de hauteurs trop proches (aide B)", defaut: "une hauteur relative incorrecte entre lettres troncs et lettres à hampe ou jambage" },
    { id: "C", domaine: "formes", mode: "lignes", nom: "Télescopage", aide: "Lettres qui se touchent ou se chevauchent", defaut: "des télescopages" },
    { id: "D", domaine: "formes", mode: "lignes", nom: "Lettre ambiguë", aide: "Lettre qui peut être lue comme une autre", defaut: "des lettres ambiguës" },
    { id: "E", domaine: "formes", mode: "lignes", nom: "Lettre majuscule à l'intérieur des mots", aide: "Majuscule utilisée au milieu d'un mot", defaut: "des majuscules à l'intérieur des mots" },
    { id: "F", domaine: "lignes", mode: "lignes", nom: "Parallélisme des lignes", aide: "Lignes qui ne restent pas parallèles (aide F)", defaut: "un défaut de parallélisme des lignes" },
    { id: "G", domaine: "stabilite", mode: "lignes", nom: "Stabilité des mots", aide: "Forme d'un même mot qui change d'une fois à l'autre", defaut: "une instabilité de la forme des mots" },
    { id: "H", domaine: "stabilite", mode: "lignes", nom: "Stabilité des « a »", aide: "Forme des « a » qui change", defaut: "une instabilité de la forme des « a »" },
    { id: "I", domaine: "stabilite", mode: "lignes", nom: "Stabilité des « t »", aide: "Forme des « t » qui change", defaut: "une instabilité de la forme des « t »" },
  ];
  const SCORE_TOTAL_MAX_ADO = CRITERES_ADO.length * SCORE_MAX;
  function versionBHK(d) { return CLASSES_ADO.indexOf(d.groupe) >= 0 ? "ado" : "enfant"; }

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
    { id: "manos", section: "complementaires", court: "Man.O.S", titre: "Man.O.S : test de manipulation des outils scolaires",
      lignes: [["global", "Score global", "ds"]] },
    { id: "evic", section: "complementaires", court: "EVIC", titre: "EVIC : évaluation de la frappe au clavier",
      lignes: [["copie", "Copie de texte", "ds"], ["repetition", "Répétition", "ds"], ["dictee", "Dictée", "ds"]] },
  ];

  // Manipulations dans la main (Exner, Benbow) : cotation de 0 à 3 par main.
  const MANIPULATIONS = [
    ["translation-dp", "Translation des doigts vers la paume"], ["translation-pd", "Translation de la paume vers les doigts"],
    ["translation-stab", "Translation avec stabilisation"], ["shift", "Shift"], ["shift-stab", "Shift avec stabilisation"],
    ["rotation-simple", "Rotation simple"], ["rotation-complexe", "Rotation complexe"], ["rotation-complexe-stab", "Rotation complexe avec stabilisation et shift"],
  ].map((x) => ({ id: x[0], nom: x[1] }));
  const COTATION_MANIP = { 3: "fonctionnel", 2: "avec lenteur ou compensation", 1: "en partie", 0: "non fonctionnel" };

  // Questionnaire d'auto-évaluation de l'écriture : les libellés des questions sont saisis par l'ergo dans les réglages.
  const ECHELLE_AUTO = ["Jamais", "Rarement", "Parfois", "Souvent", "Toujours"];
  const NB_QUESTIONS_AUTO = 12;
  // Domaines du questionnaire : chaque question est rangée dans un domaine (réglages).
  const DOMAINES_AUTO = [["lisibilite", "Lisibilité"], ["satisfaction", "Satisfaction et émotions"], ["vitesse", "Vitesse"]];
  // Questionnaire d'auto-appréciation de l'écriture du cabinet, d'après le CHaP (libre d'utilisation) : questions et thématiques.
  const NOM_AUTO = "Questionnaire d'auto-appréciation de l'écriture (d'après le CHaP)";
  const QUESTIONS_AUTO = [
    ["As-tu des difficultés à te relire ?", "lisibilite"],
    ["Les autres ont-ils des difficultés à te relire ?", "lisibilite"],
    ["Manques-tu de temps pour copier au tableau en cours ?", "vitesse"],
    ["Rayes-tu ou effaces-tu souvent ce que tu as écrit ?", "vitesse"],
    ["Trouves-tu difficile d'écrire à la main ?", "satisfaction"],
    ["Évites-tu de faire ton travail écrit à la maison ?", "satisfaction"],
    ["Ressens-tu des douleurs quand tu écris ?", "satisfaction"],
    ["Es-tu vite fatigué quand tu écris ?", "satisfaction"],
    ["As-tu souvent besoin de regarder le tableau quand tu écris ?", "vitesse"],
    ["Es-tu insatisfait de ton écriture manuelle ?", "satisfaction"],
    ["Écris-tu moins vite que les autres dans ta classe ?", "vitesse"],
    ["Préfèrerais-tu utiliser un autre moyen pour écrire ?", "satisfaction"],
  ];

  const BILANS_COURANTS = [
    { id: "entretien", texte: (a) => "Entretien avec les parents et " + a.sujetMin },
    { id: "comptes-rendus", texte: (a) => "Lecture des comptes rendus des professionnels qui suivent " + a.sujetMin },
    { id: "questionnaire", texte: () => "Questionnaire d'auto-évaluation de l'écriture" },
    { id: "productions", texte: () => "Observation des productions réalisées en classe" },
    { id: "ordinateur", texte: () => "Mise en situation avec l'outil informatique" },
  ];

  // Questionnaire d'auto-évaluation : nombre de réponses dans chaque colonne et difficultés fréquentes par domaine.
  function syntheseAuto(auto, reglages) {
    const reg = reglages && reglages.autoDomaines ? reglages : normaliserReglages(reglages);
    const rep = (auto && auto.reponses) || {};
    const nums = Object.keys(rep).filter((k) => /^\d+$/.test(k) && rep[k] !== undefined && rep[k] !== null && rep[k] !== "").map(Number).sort((x, y) => x - y);
    const val = (n) => Number(rep[n]);
    const colonnes = ECHELLE_AUTO.map((e, k) => nums.filter((n) => val(n) === k).length);
    const domaines = DOMAINES_AUTO.map((dm) => {
      const qs = reg.autoQuestions.map((q, i) => i + 1).filter((n) => reg.autoDomaines[n - 1] === dm[0]);
      const rep2 = qs.filter((n) => nums.indexOf(n) >= 0);
      return { id: dm[0], nom: dm[1], questions: qs, repondues: rep2.length, frequentes: rep2.filter((n) => val(n) >= 3).length, points: rep2.reduce((a, n) => a + val(n), 0), max: rep2.length * 4 };
    }).filter((dm) => dm.questions.length);
    return { nums: nums, colonnes: colonnes, repondues: nums.length, frequentes: nums.filter((n) => val(n) >= 3).length, domaines: domaines };
  }

  // Synthèse rédigée de l'auto-appréciation : profil par thématique, lecture des réponses du questionnaire du cabinet
  // (seulement si la question est restée la même), et comparaison avec les mesures du bilan. Texte proposé, modifiable.
  function syntheseAutoTexte(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const sa = syntheseAuto(d.auto, reg);
    if (!sa.repondues) return "";
    const a = accords(d);
    const e = a.e;
    const v = (n) => {
      if (reg.autoQuestions[n - 1] !== (QUESTIONS_AUTO[n - 1] || [])[0]) return null; // question modifiée : pas de lecture détaillée
      const x = d.auto.reponses[n];
      return x === undefined || x === null ? null : Number(x);
    };
    const mot = (x) => ECHELLE_AUTO[x].toLowerCase();
    const haut = (x) => x !== null && x >= 3, bas = (x) => x !== null && x <= 1, present = (x) => x !== null && x >= 2;
    const l = [], comparaisons = [];
    const le = d.sexe === "F" ? "la" : "le";

    // 1. Profil par thématique (sans répéter les nombres, déjà dans le compte rendu).
    const doms = sa.domaines.filter((dm) => dm.repondues).map((dm) => Object.assign({ part: dm.points / dm.max }, dm)).sort((x, y) => y.part - x.part);
    if (doms.length) {
      const fortes = doms.filter((dm) => dm.part >= 0.625), moyennes = doms.filter((dm) => dm.part >= 0.4 && dm.part < 0.625), faibles = doms.filter((dm) => dm.part < 0.4);
      const NOMS = { lisibilite: ["la lisibilité", "f"], vitesse: ["la vitesse", "f"], satisfaction: ["le vécu de l'écriture (satisfaction, émotions)", "m"] };
      const noms = (t) => joindre(t.map((dm) => NOMS[dm.id][0]));
      if (fortes.length || moyennes.length) {
        let t = "La gêne ressentie par " + a.sujetMin + " porte surtout sur " + (fortes.length ? noms(fortes) : noms(moyennes));
        if (fortes.length && moyennes.length) t += ", et dans une moindre mesure sur " + noms(moyennes);
        if (faibles.length) {
          const masc = faibles.some((dm) => NOMS[dm.id][1] === "m");
          t += " ; " + noms(faibles) + (faibles.length > 1 ? " sont peu touchés" + (masc ? "" : "es") : " est peu touché" + (masc ? "" : "e"));
        }
        l.push(t + ".");
      } else l.push(a.sujet + " exprime peu de gêne dans son écriture, quelle que soit la thématique.");
    } else if (sa.frequentes) l.push(a.sujet + " répond « souvent » ou « toujours » à " + sa.frequentes + " question" + (sa.frequentes > 1 ? "s" : "") + " sur " + sa.repondues + ".");

    // 2. Lecture des réponses (questionnaire du cabinet).
    const q = {}; for (let n = 1; n <= 12; n++) q[n] = v(n);
    if (haut(q[2]) && bas(q[1])) l.push(maj(a.il) + " se relit sans difficulté mais pense que les autres ont " + mot(q[2]) + " du mal à " + le + " relire : la lisibilité gêne surtout le lecteur extérieur, l'enseignant notamment.");
    else if (haut(q[1]) && haut(q[2])) l.push(maj(a.il) + " a du mal à se relire, comme les autres : la lisibilité gêne aussi la relecture de ses propres écrits (leçons, brouillons).");
    else if (haut(q[1])) l.push(maj(a.il) + " a " + mot(q[1]) + " du mal à se relire.");
    if (haut(q[9]) && present(q[3])) l.push(maj(a.il) + " regarde " + mot(q[9]) + " le tableau en écrivant et manque " + mot(q[3]) + " de temps pour copier : la copie au tableau, avec ses allers-retours entre le tableau et le cahier, semble coûteuse.");
    else if (haut(q[3])) l.push(maj(a.il) + " manque " + mot(q[3]) + " de temps pour copier au tableau.");
    else if (haut(q[9])) l.push(maj(a.il) + " a " + mot(q[9]) + " besoin de regarder le tableau en écrivant, ce qui suggère une prise d'information par petits morceaux.");
    if (haut(q[11])) l.push(maj(a.il) + " se perçoit plus lent" + e + " que ses camarades.");
    if (haut(q[4])) l.push(maj(a.il) + " rature ou efface " + mot(q[4]) + " ce qu'" + a.il + " écrit, ce qui ralentit encore la production.");
    if (present(q[7])) l.push(maj(a.il) + " dit avoir " + mot(q[7]) + " mal en écrivant : à rapprocher de la prise du crayon, de la pression exercée et de la posture.");
    if (haut(q[8])) l.push(maj(a.il) + " se dit " + mot(q[8]) + " vite fatigué" + e + " quand " + a.il + " écrit.");
    if (haut(q[10])) l.push(maj(a.il) + " est " + mot(q[10]) + " insatisfait" + e + " de son écriture" + (bas(q[5]) ? ", sans trouver pour autant difficile d'écrire : l'insatisfaction porte sur le résultat plus que sur l'effort" : "") + ".");
    else if (haut(q[5])) l.push(maj(a.il) + " trouve " + mot(q[5]) + " difficile d'écrire à la main.");
    if (present(q[6])) l.push(maj(a.il) + " évite " + mot(q[6]) + " le travail écrit à la maison : le retentissement sur les devoirs est à explorer avec la famille.");
    const emotionsBasses = [5, 7, 8].every((n) => q[n] === null || bas(q[n])) && [5, 7, 8].some((n) => q[n] !== null);
    if (emotionsBasses && !haut(q[10])) l.push("Écrire ne semble ni pénible ni douloureux pour " + a.sujetMin + ", ce qui est un appui pour l'accompagnement.");

    // 3. Comparaison avec les mesures du bilan.
    const r = calculerBHK(d, reg);
    const faible = (n) => n === "patho" || n === "inferieur";
    const vitesse = sa.domaines.find((dm) => dm.id === "vitesse");
    const lisib = sa.domaines.find((dm) => dm.id === "lisibilite");
    const lentRessenti = haut(q[11]) || (vitesse && vitesse.repondues && vitesse.frequentes / vitesse.repondues >= 0.5);
    const pasLentRessenti = bas(q[11]) || (q[11] === null && vitesse && vitesse.repondues && vitesse.frequentes === 0);
    if (r.niveauV) {
      const ds = r.nomTest + " : DS " + formaterDS(r.dsV);
      if (lentRessenti && faible(r.niveauV)) comparaisons.push("Ce sentiment de lenteur est confirmé par le bilan (vitesse au " + ds + ").");
      else if (lentRessenti) comparaisons.push(maj(a.il) + " se sent lent" + e + " alors que sa vitesse au " + r.nomTest + " est dans la moyenne (DS " + formaterDS(r.dsV) + ") : la lenteur ressentie en classe tient sans doute à la copie au tableau, à la fatigue ou à la longueur des écrits plus qu'au geste seul.");
      else if (pasLentRessenti && faible(r.niveauV)) comparaisons.push(maj(a.il) + " ne se perçoit pas plus lent" + e + " que les autres, alors que le bilan montre une lenteur (vitesse au " + ds + ") : sa conscience de la difficulté est encore partielle.");
    }
    if (r.niveauQ && lisib && lisib.repondues) {
      const gene = lisib.frequentes > 0, ds = "DS " + formaterDS(r.dsQ);
      if (gene && faible(r.niveauQ)) comparaisons.push("Sa perception d'une écriture difficile à relire rejoint la qualité d'écriture mesurée au " + r.nomTest + " (" + ds + ").");
      else if (gene) comparaisons.push("La qualité d'écriture au " + r.nomTest + " est pourtant dans la moyenne (" + ds + ") : l'écriture se dégrade sans doute en situation de classe (vitesse, longueur), ou " + a.il + " est très exigeant" + e + " envers " + (a.il === "elle" ? "elle" : "lui") + "-même.");
      else if (faible(r.niveauQ)) comparaisons.push(maj(a.il) + " ne perçoit pas les difficultés de lisibilité relevées au " + r.nomTest + " (" + ds + ").");
    }
    const eva = nombre(d.douleurEva);
    if (present(q[7]) && eva !== null) comparaisons.push(eva > 0 ? "Une douleur a aussi été relevée pendant la copie (EVA " + formaterNombre(eva) + "/10)." : "Aucune douleur n'a été relevée pendant la copie : la douleur apparaîtrait plutôt sur des écrits longs.");
    else if (bas(q[7]) && eva !== null && eva >= 3) comparaisons.push(maj(a.il) + " ne signale pas de douleur dans le questionnaire, mais en a exprimé pendant la copie (EVA " + formaterNombre(eva) + "/10).");
    if (haut(q[8]) && d.grille["lisibilite.fatigue"] === "oui") comparaisons.push("La fatigue a aussi été observée pendant la copie.");
    const prefere = d.clavier && d.clavier.enfant ? d.clavier.enfant.prefere : "";
    if (present(q[12])) comparaisons.push(maj(a.il) + " aimerait " + mot(q[12]) + " utiliser un autre moyen pour écrire" + (prefere === "clavier" ? ", ce que confirme sa préférence pour le clavier à l'EViC" : "") + " : une piste à explorer, comme l'outil numérique.");
    else if (bas(q[12])) comparaisons.push(maj(a.il) + " ne souhaite pas, pour l'instant, écrire autrement qu'à la main" + (prefere === "clavier" ? " (alors qu'" + a.il + " dit préférer le clavier à l'EViC)" : "") + " : à prendre en compte avant de proposer un outil numérique.");

    // 4. Pour l'accompagnement.
    const pistes = { vitesse: "alléger les copies en classe, automatiser le geste", lisibilite: "travailler la lisibilité (formes des lettres, espacements, tenue de la ligne)", satisfaction: "redonner plaisir et confiance à l'écrit en valorisant les réussites" };
    const prio = doms.filter((dm) => dm.part >= 0.4).map((dm) => pistes[dm.id]).filter(Boolean);
    const blocs = [l.join(" "), comparaisons.join(" ")];
    if (prio.length) blocs.push("Pour l'accompagnement : " + joindre(prio) + ".");
    return blocs.filter(Boolean).join("\n");
  }

  // Version de synthèse pour le compte rendu : deux ou trois phrases (gêne principale et ses raisons, rapport avec le bilan,
  // position sur un autre moyen d'écrire). L'analyse détaillée reste dans le dossier.
  function syntheseAutoCourte(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const sa = syntheseAuto(d.auto, reg);
    if (!sa.repondues) return "";
    const a = accords(d), e = a.e;
    const q = {};
    for (let n = 1; n <= 12; n++) {
      const x = d.auto.reponses[n];
      q[n] = reg.autoQuestions[n - 1] === (QUESTIONS_AUTO[n - 1] || [])[0] && x !== undefined && x !== null ? Number(x) : null;
    }
    const haut = (x) => x !== null && x >= 3, bas = (x) => x !== null && x <= 1, present = (x) => x !== null && x >= 2;
    const soi = a.il === "elle" ? "elle-même" : "lui-même";
    // Raisons, par thématique, tirées des réponses.
    const raisons = {
      vitesse: [present(q[3]) || haut(q[9]) ? "copie au tableau" : "", haut(q[11]) ? "lenteur ressentie" : "", haut(q[4]) ? "ratures fréquentes" : ""],
      lisibilite: [haut(q[1]) && haut(q[2]) ? "écriture difficile à relire, y compris pour " + soi : haut(q[2]) ? "écriture difficile à relire pour les autres" : haut(q[1]) ? "difficulté à se relire" : ""],
      satisfaction: [present(q[7]) ? "douleurs" : "", haut(q[8]) ? "fatigue" : "", haut(q[10]) ? "insatisfaction" : "", present(q[6]) ? "évitement des devoirs écrits" : "", haut(q[5]) ? "écriture vécue comme difficile" : ""],
    };
    const NOMS = { lisibilite: ["la lisibilité", "f"], vitesse: ["la vitesse", "f"], satisfaction: ["le vécu de l'écriture", "m"] };
    const nom = (dm) => { const r = raisons[dm.id].filter(Boolean); return NOMS[dm.id][0].replace(/^le /, "au ").replace(/^la /, "à la ") + (r.length ? " (" + r.join(", ") + ")" : ""); };
    const doms = sa.domaines.filter((dm) => dm.repondues).map((dm) => Object.assign({ part: dm.points / dm.max }, dm)).sort((x, y) => y.part - x.part);
    const fortes = doms.filter((dm) => dm.part >= 0.625), moyennes = doms.filter((dm) => dm.part >= 0.4 && dm.part < 0.625), faibles = doms.filter((dm) => dm.part < 0.4);
    const l = [];
    if (fortes.length || moyennes.length) {
      let t = a.sujet + " exprime une gêne surtout liée " + joindre((fortes.length ? fortes : moyennes).map(nom));
      if (fortes.length && moyennes.length) t += ", et dans une moindre mesure " + joindre(moyennes.map(nom));
      if (faibles.length) t += " ; " + joindre(faibles.map((dm) => NOMS[dm.id][0])) + (faibles.length > 1 ? " sont peu touchés" : " est peu touché" + (NOMS[faibles[0].id][1] === "m" ? "" : "e"));
      l.push(t + ".");
    } else l.push(a.sujet + " exprime peu de gêne dans son écriture.");
    // Rapport avec le bilan.
    const r = calculerBHK(d, reg);
    const faible = (n) => n === "patho" || n === "inferieur";
    const vitesse = sa.domaines.find((dm) => dm.id === "vitesse"), lisib = sa.domaines.find((dm) => dm.id === "lisibilite");
    const lent = haut(q[11]) || !!(vitesse && vitesse.repondues && vitesse.frequentes / vitesse.repondues >= 0.5);
    const pasLent = bas(q[11]) || !!(q[11] === null && vitesse && vitesse.repondues && vitesse.frequentes === 0);
    const c = [];
    if (r.niveauV) {
      if (lent && faible(r.niveauV)) c.push("ce ressenti rejoint la lenteur mesurée au " + r.nomTest);
      else if (lent) c.push("sa vitesse au " + r.nomTest + " étant dans la moyenne, la lenteur ressentie tient surtout aux situations de classe");
      else if (pasLent && faible(r.niveauV)) c.push(a.il + " ne perçoit pas encore la lenteur mesurée au " + r.nomTest);
    }
    if (r.niveauQ && lisib && lisib.repondues) {
      if (lisib.frequentes && faible(r.niveauQ)) c.push("la gêne de lisibilité rejoint la qualité d'écriture mesurée");
      else if (lisib.frequentes) c.push("la qualité au " + r.nomTest + " étant dans la moyenne, la gêne de lisibilité apparaît surtout en classe");
      else if (faible(r.niveauQ)) c.push(a.il + " ne perçoit pas les difficultés de lisibilité relevées au " + r.nomTest);
    }
    const eva = nombre(d.douleurEva);
    if (present(q[7]) && eva !== null && eva > 0) c.push("les douleurs déclarées se retrouvent pendant la copie (EVA " + formaterNombre(eva) + "/10)");
    if (c.length) l.push(maj(c.join(" ; ")) + ".");
    // Autre moyen d'écrire.
    if (present(q[12])) l.push(maj(a.il) + " se montre ouvert" + e + " à un autre moyen d'écrire.");
    else if (bas(q[12])) l.push(maj(a.il) + " ne souhaite pas, pour l'instant, écrire autrement qu'à la main.");
    return l.join(" ");
  }

  // Préconisations proposées d'après les résultats : « raisons » = indicateurs qui les justifient (voir indicateurs()).
  const CATEGORIES_PRECO = [
    { id: "reeducation", titre: "Accompagnement en ergothérapie" },
    { id: "scolaire", titre: "Aménagements scolaires" },
    { id: "sensoriel", titre: "Aménagements sensoriels" },
    { id: "maison", titre: "À la maison" },
  ];
  const PRECONISATIONS = [
    { id: "reed-graphisme", cat: "reeducation", label: "Rééducation graphique", texte: "Rééducation graphique pour améliorer la qualité et la fluidité du geste", raisons: ["qualite", "vitesse", "geste"] },
    { id: "reed-motricite", cat: "reeducation", label: "Motricité fine", texte: "Travail de la motricité fine et des manipulations dans la main", raisons: ["motriciteFine", "pression"] },
    { id: "reed-posture", cat: "reeducation", label: "Contrôle postural", texte: "Travail du contrôle postural et de la stabilité proximale", raisons: ["postural", "posture"] },
    { id: "reed-sensoriel", cat: "reeducation", label: "Intégration sensorielle", texte: "Accompagnement en intégration sensorielle", raisons: ["modulation", "discrimination", "recherche", "evitement", "sensibilite", "enregistrement"] },
    { id: "reed-praxies", cat: "reeducation", label: "Planification motrice", texte: "Travail de la planification motrice (praxies)", raisons: ["praxies"] },
    { id: "reed-clavier", cat: "reeducation", label: "Apprentissage du clavier", texte: "Apprentissage de la frappe au clavier en vue d'une compensation", raisons: ["vitesseForte", "clavier"] },
    { id: "reed-avq", cat: "reeducation", label: "Autonomie au quotidien", texte: "Travail de l'autonomie dans les activités quotidiennes (habillage, repas, soins personnels)", raisons: ["avq"] },
    { id: "polycopies", cat: "scolaire", label: "Limiter la tâche graphique", texte: "Limiter la tâche graphique (privilégier les polycopiés)", raisons: ["vitesse"] },
    { id: "temps", cat: "scolaire", label: "Tiers-temps", texte: "Accorder un tiers-temps pour les évaluations, afin de compenser la lenteur d'écriture et de permettre l'autocorrection", raisons: ["vitesse"] },
    { id: "non-penaliser", cat: "scolaire", label: "Ne pas pénaliser l'écriture", texte: "Ne pas pénaliser la qualité de l'écriture ni l'orthographe dans les productions écrites", raisons: ["qualite"] },
    { id: "effacable", cat: "scolaire", label: "Stylo effaçable", texte: "Autoriser un stylo effaçable pour limiter les ratures", raisons: ["ratures"] },
    { id: "lignage", cat: "scolaire", label: "Lignage adapté", texte: "Proposer un lignage adapté (lignes agrandies ou repères visuels)", raisons: ["lignage"] },
    { id: "outil", cat: "scolaire", label: "Outil scripteur adapté", texte: "Proposer un outil scripteur adapté (crayon ergonomique, embout)", raisons: ["douleur", "pression"] },
    { id: "pauses", cat: "scolaire", label: "Pauses à l'écrit", texte: "Prévoir des pauses lors des tâches écrites longues", raisons: ["fatigue", "douleur"] },
    { id: "installation", cat: "scolaire", label: "Installation en classe", texte: "Veiller à une installation adaptée en classe (hauteur de table et de chaise, appui des pieds)", raisons: ["posture", "postural"] },
    { id: "numerique", cat: "scolaire", label: "Outil numérique", texte: "Envisager l'outil numérique, avec un apprentissage de la frappe au clavier", raisons: ["clavierEfficace", "vitesseForte"] },
    { id: "casque", cat: "sensoriel", label: "Espace calme, casque", texte: "Proposer un espace calme et un casque anti-bruit lors des moments bruyants (cantine, récréation)", raisons: ["auditif", "evitement", "sensibilite"] },
    { id: "mouvement", cat: "sensoriel", label: "Pauses de mouvement", texte: "Intégrer des pauses de mouvement et un siège dynamique", raisons: ["recherche", "attention"] },
    { id: "manipulation", cat: "sensoriel", label: "Objet à manipuler", texte: "Autoriser un objet à manipuler pendant les temps d'écoute", raisons: ["recherche", "attention"] },
    { id: "place", cat: "sensoriel", label: "Place en classe", texte: "Placer l'enfant à l'écart des passages et des affichages chargés", raisons: ["visuel", "attention", "sensibilite"] },
    { id: "consignes", cat: "sensoriel", label: "Consignes courtes", texte: "Donner des consignes courtes, après s'être assuré de l'attention de l'enfant", raisons: ["attention", "enregistrement"] },
    { id: "transitions", cat: "sensoriel", label: "Annoncer les transitions", texte: "Annoncer les changements et les transitions (emploi du temps visuel)", raisons: ["evitement", "modulation"] },
    { id: "activites", cat: "maison", label: "Activités sensorimotrices", texte: "Proposer des activités sensorimotrices dans la journée (porter, pousser, tirer, grimper)", raisons: ["recherche", "postural", "modulation"] },
    { id: "soins", cat: "maison", label: "Soins personnels adaptés", texte: "Adapter les soins personnels (vêtements sans étiquettes, prévenir avant de toucher, brosse douce)", raisons: ["tactile"] },
    { id: "coin-calme", cat: "maison", label: "Coin calme", texte: "Aménager un coin calme pour se ressourcer après l'école", raisons: ["evitement", "auditif", "modulation", "sensibilite"] },
    { id: "adaptations", cat: "maison", label: "Adaptations du quotidien", texte: "Proposer des adaptations pour gagner en autonomie (lacets élastiques, vêtements faciles à enfiler, couverts adaptés)", raisons: ["avq"] },
  ];
  const AMENAGEMENTS = PRECONISATIONS; // ancien nom, gardé pour les dossiers enregistrés
  const DISPOSITIFS = ["PAP", "PPRE", "PPS"];

  const OCCUPATIONS = [
    ["ecrit-classe", "la production écrite en classe"], ["copie", "la copie et la prise de notes"], ["evaluations", "les évaluations écrites"],
    ["devoirs", "les devoirs à la maison"], ["outils", "la manipulation des outils scolaires"], ["habillage", "l'habillage"], ["repas", "les repas"],
    ["toilette", "la toilette et les soins personnels"], ["jeux", "les jeux et les loisirs"], ["sport", "les activités sportives"],
    ["social", "la participation sociale avec les pairs"], ["transitions", "la gestion des transitions et des émotions"], ["sommeil", "le sommeil"],
    ["deplacements", "les déplacements"],
  ].map((x) => ({ id: x[0], texte: x[1] }));

  /* ================= Réglages et normes ================= */

  function normesVides() {
    return {
      type: "bhk-normes", version: 2, source: "", qualite: { classe: {}, age: {} }, vitesse: { classe: {}, age: {} }, criteres: {},
      ado: { qualite: { classe: {}, global: null }, vitesse: { classe: {} } },
    };
  }

  function couple(v) {
    if (!Array.isArray(v)) return null;
    const m = nombre(v[0]), e = nombre(v[1]);
    return m !== null && e !== null && e > 0 ? [m, e] : null;
  }

  function normaliserNormes(n) {
    const out = normesVides();
    if (!n || typeof n !== "object") return out;
    out.source = texte(n.source);
    const pentes = n.calques && Array.isArray(n.calques.margeB) ? n.calques.margeB.map(nombre) : [];
    if (pentes.length === 5 && pentes.every((v, i) => v !== null && v > 0 && (!i || v > pentes[i - 1]))) out.calques = { margeB: pentes };
    if (n.ado && typeof n.ado === "object") {
      CLASSES_ADO.forEach((cl) => {
        const q = n.ado.qualite && n.ado.qualite.classe && n.ado.qualite.classe[cl];
        const v = n.ado.vitesse && n.ado.vitesse.classe && n.ado.vitesse.classe[cl];
        if (q && couple(q.E)) out.ado.qualite.classe[cl] = { E: couple(q.E) };
        if (v && couple(v.E)) out.ado.vitesse.classe[cl] = { E: couple(v.E) };
      });
      const g = n.ado.qualite && n.ado.qualite.global;
      if (g && couple(g.E)) out.ado.qualite.global = { E: couple(g.E) };
    }
    out.criteres = {};
    if (n.criteres && typeof n.criteres === "object") {
      CRITERES.forEach((c) => {
        const t = n.criteres[c.id] || n.criteres[String(c.id)];
        if (!t || typeof t !== "object") return;
        const parClasse = {};
        CLASSES.forEach((cl) => {
          const g = t[cl];
          if (!g) return;
          const ligne = {};
          ["F", "M", "E"].forEach((s) => {
            const v = Array.isArray(g[s]) ? g[s] : null;
            const m = v && nombre(v[0]), e = v && nombre(v[1]);
            if (m !== null && e !== null) ligne[s] = [m, e];
          });
          if (Object.keys(ligne).length) parClasse[cl] = ligne;
        });
        if (Object.keys(parClasse).length) out.criteres[c.id] = parClasse;
      });
    }
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

  // Phrases favorites proposées au départ (modifiables dans les réglages).
  const PHRASES_EXEMPLES = [
    "Bonne coopération tout au long du bilan.",
    "Bon investissement, envie de progresser.",
    "Se fatigue en fin d'épreuve et ralentit.",
    "Secoue la main après l'écriture.",
    "Prise tridigitale dynamique, pression adaptée.",
    "Appui fort sur l'outil scripteur, traits marqués.",
    "Posture enroulée, tête proche de la feuille.",
    "Bonne prise d'informations visuelles en copie.",
    "Se perd dans le modèle et revient souvent au début de la ligne.",
    "Attention fluctuante, besoin de relances verbales.",
    "Recherche de mouvement pendant les tâches assises.",
    "Gêné par les bruits de l'environnement.",
    "Lettres bien formées, mais lenteur importante.",
    "Espaces entre les mots irréguliers.",
    "Verbalise ses stratégies et se corrige seul.",
    "Séance écourtée en raison de la fatigue.",
  ];

  function reglagesParDefaut() {
    return {
      type: "bhk-reglages", version: 1,
      cabinet: { nom: "", adresse: "" },
      praticiens: [praticienVide()],
      signataire: 0,
      seuilInferieur: 1, seuilPatho: 1.5, seuilSuperieur: 1,
      inverserQualite: true,
      brouillon: true,
      autoNom: NOM_AUTO,
      autoQuestions: QUESTIONS_AUTO.map((q) => q[0]),
      autoDomaines: QUESTIONS_AUTO.map((q) => q[1]),
      cartesPerso: [],
      othopeSelection: [],
      esoLibelles: { sp: [], p: [], l: [] },
      esoCotation: null,
      manosGrille: null,
      avqLibelles: Occup.libellesAvqp(null),
      photoCabinet: null,
      logoCabinet: null,
      phrases: PHRASES_EXEMPLES.slice(),
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
    // Questionnaire d'auto-appréciation : celui du cabinet par défaut ; des libellés vides (anciens réglages) le laissent en place.
    if (typeof r.autoNom === "string" && r.autoNom.trim() && r.autoNom !== "Questionnaire d'auto-appréciation de l'écriture") out.autoNom = r.autoNom;
    const libellesSaisis = Array.isArray(r.autoQuestions) && r.autoQuestions.some((q) => texte(q).trim());
    if (libellesSaisis) out.autoQuestions = r.autoQuestions.slice(0, 40).map(texte);
    const domainesSaisis = Array.isArray(r.autoDomaines) && r.autoDomaines.some((v) => DOMAINES_AUTO.some((x) => x[0] === v));
    const parDefaut = out.autoQuestions.length === QUESTIONS_AUTO.length && out.autoQuestions.every((q, i) => q === QUESTIONS_AUTO[i][0]);
    out.autoDomaines = out.autoQuestions.map((q, i) => {
      const v = domainesSaisis ? r.autoDomaines[i] : parDefaut ? QUESTIONS_AUTO[i][1] : "";
      return DOMAINES_AUTO.some((x) => x[0] === v) ? v : "";
    });
    out.cartesPerso = Occup.normaliserCartesPerso(r.cartesPerso);
    if (Array.isArray(r.othopeSelection)) out.othopeSelection = Array.from(new Set(r.othopeSelection.map(texte).filter((id) => /^[op]-[a-z0-9-]+$/.test(id)))).slice(0, 200);
    if (r.esoLibelles && typeof r.esoLibelles === "object") ["sp", "p", "l"].forEach((k) => {
      if (Array.isArray(r.esoLibelles[k])) out.esoLibelles[k] = r.esoLibelles[k].slice(0, Senso.NB_ITEMS_ESO).map((t) => texte(t).slice(0, 300));
    });
    out.esoCotation = Senso.normaliserCotationEso(r.esoCotation);
    out.manosGrille = Manos.normaliserGrille(r.manosGrille);
    // Questionnaire d'autonomie : celui de l'outil par défaut ; des libellés enregistrés (domaine par domaine) le remplacent.
    if (r.avqLibelles && typeof r.avqLibelles === "object") {
      const l = Occup.libellesAvqp(r.avqLibelles);
      out.avqLibelles = { titre: l.titre.slice(0, 300), source: l.source.slice(0, 300), domaines: {} };
      Occup.DOMAINES_AVQP.forEach((d) => { out.avqLibelles.domaines[d.id] = l.domaines[d.id].slice(0, Occup.MAX_AVQP).map((t) => texte(t).slice(0, 300)); });
    }
    out.photoCabinet = Accueil.normaliserPhoto(r.photoCabinet);
    out.logoCabinet = Accueil.normaliserPhoto(r.logoCabinet);
    if (Array.isArray(r.phrases)) out.phrases = r.phrases.map((t) => texte(t).trim().slice(0, 400)).filter(Boolean).slice(0, 300);
    if (r.normes) out.normes = normaliserNormes(r.normes);
    return out;
  }

  // Les normes sont-elles renseignées ? (sinon on peut utiliser les normes intégrées à la version personnelle)
  function normesPresentes(n) {
    return !!n && (["qualite", "vitesse"].some((ind) => Object.keys(n[ind].classe).length + Object.keys(n[ind].age).length > 0) ||
      Object.keys(n.ado.vitesse.classe).length + Object.keys(n.ado.qualite.classe).length > 0);
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
    "conclusionContexte", "conclusionPoints", "conclusionForces", "diagImpact", "envObstacles", "envFacilitateurs", "objectifsLibre",
    "dispositif", "amenagementsLibre", "reeducation", "reeducationObjet", "reevaluation", "precoLibre",
    "photoCopie", "photoL", "photoH", "adoQualite", "adoTermine",
    "id", "creeLe", "auteur",
  ];
  const CHAMPS_LISTE = ["bilansUtilises", "remarques", "amenagements", "occDifficultes", "occRefusees"];

  function testVide(t) {
    return { fait: "", notes: "", lignes: t.lignes.map((l) => ({ id: l[0], epreuve: l[1], type: l[2], valeur: "", moy: "", et: "", sens: "haut", commentaire: "" })) };
  }

  function dossierVide() {
    const d = {};
    CHAMPS_TEXTE.forEach((k) => { d[k] = ""; });
    CHAMPS_LISTE.forEach((k) => { d[k] = []; });
    d.diagAuto = {};
    d.passation = aujourdhui();
    d.reference = "classe";
    d.normesSexe = "auto";
    d.adoQualite = "classe";
    d.bilansUtilises = ["entretien"];
    d.lignes = {};
    d.grille = {};
    d.grilleNotes = {};
    d.tests = {};
    TESTS.forEach((t) => { d.tests[t.id] = testVide(t); });
    d.senso = Senso.vide();
    d.manip = { fait: "", md: {}, mg: {}, notes: "" };
    d.auto = { fait: "", reponses: {}, notes: "", notesAuto: "", synthese: "", syntheseAuto: "" };
    Object.assign(d, Occup.vide());
    d.precedent = null;
    d.suivi = { debut: "", frequence: "14", nombre: "", duree: "45", exclus: [], notes: "" };
    d.tdc = { fait: "", debut: "", exclusion: "", notes: "" };
    Object.assign(d, Accueil.vide());
    d.clavier = Clavier.vide();
    d.manos = Manos.vide();
    d.ajuri = Ajuri.vide();
    return d;
  }

  // Mesures du bilan précédent, gardées pour la réévaluation.
  function normaliserPrecedent(p) {
    if (!p || typeof p !== "object" || !Array.isArray(p.mesures)) return null;
    const mesures = p.mesures.filter((m) => m && texte(m.cle)).slice(0, 80).map((m) => ({
      cle: texte(m.cle), bilan: texte(m.bilan), epreuve: texte(m.epreuve), valeur: texte(m.valeur), echelle: texte(m.echelle),
      ds: nombre(m.ds), perf: nombre(m.perf), num: nombre(m.num), sens: nombre(m.sens) === -1 ? -1 : 1, seuil: nombre(m.seuil),
    }));
    return { passation: texte(p.passation), groupe: texte(p.groupe), mesures: mesures };
  }

  function normaliserDossier(src) {
    const d = dossierVide();
    if (!src || typeof src !== "object") return d;
    CHAMPS_TEXTE.forEach((k) => { if (src[k] !== undefined && src[k] !== null) d[k] = texte(src[k]); });
    CHAMPS_LISTE.forEach((k) => { if (Array.isArray(src[k])) d[k] = src[k].map(texte); });
    // Champs du diagnostic : « auto » = texte proposé par l'outil, « manuel » = modifié par l'ergothérapeute.
    d.diagAuto = {};
    if (src.diagAuto && typeof src.diagAuto === "object") CHAMPS_DIAG.forEach((k) => { if (src.diagAuto[k] === "auto" || src.diagAuto[k] === "manuel") d.diagAuto[k] = src.diagAuto[k]; });
    if (d.reference !== "age") d.reference = "classe";
    if (d.normesSexe !== "ensemble") d.normesSexe = "auto";
    d.senso = Senso.normaliser(src.senso);
    Object.assign(d, Occup.normaliser(src));
    d.precedent = normaliserPrecedent(src.precedent);
    Object.assign(d, Accueil.normaliser(src));
    d.seances = Seances.normaliserListe(src.seances);
    d.clavier = Clavier.normaliser(src.clavier);
    d.manos = Manos.normaliser(src.manos);
    d.ajuri = Ajuri.normaliser(src.ajuri);
    if (src.tdc && typeof src.tdc === "object") {
      d.tdc.fait = src.tdc.fait === "oui" ? "oui" : "";
      ["debut", "exclusion"].forEach((k) => { if (["oui", "non"].indexOf(src.tdc[k]) >= 0) d.tdc[k] = src.tdc[k]; });
      d.tdc.notes = texte(src.tdc.notes);
    }
    if (src.suivi && typeof src.suivi === "object") {
      ["debut", "frequence", "nombre", "duree", "notes"].forEach((k) => { if (src.suivi[k] !== undefined && src.suivi[k] !== null) d.suivi[k] = texte(src.suivi[k]); });
      if (Array.isArray(src.suivi.exclus)) d.suivi.exclus = src.suivi.exclus.map(texte).slice(0, 20);
    }
    if (src.manip && typeof src.manip === "object") {
      d.manip.fait = src.manip.fait ? "oui" : "";
      d.manip.notes = texte(src.manip.notes);
      ["md", "mg"].forEach((m) => MANIPULATIONS.forEach((it) => {
        const v = nombre(src.manip[m] && src.manip[m][it.id]);
        if (v !== null && v >= 0 && v <= 3) d.manip[m][it.id] = Math.round(v);
      }));
    }
    if (src.auto && typeof src.auto === "object") {
      d.auto.fait = src.auto.fait ? "oui" : "";
      d.auto.notes = texte(src.auto.notes);
      d.auto.notesAuto = src.auto.notesAuto === "oui" ? "oui" : "";
      d.auto.synthese = texte(src.auto.synthese);
      d.auto.syntheseAuto = src.auto.syntheseAuto === "oui" ? "oui" : "";
      Object.keys(src.auto.reponses || {}).forEach((k) => {
        const v = nombre(src.auto.reponses[k]);
        if (v !== null && v >= 0 && v <= 4 && /^\d+$/.test(k)) d.auto.reponses[k] = Math.round(v);
      });
    }
    if (d.reeducation === "oui" && d.amenagements.indexOf("reed-graphisme") < 0) d.amenagements.push("reed-graphisme");
    d.reeducation = "";
    if (src.lignes && typeof src.lignes === "object") {
      CRITERES.filter((c) => c.mode === "lignes").concat(CRITERES_ADO).forEach((c) => {
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

  // Score d'une ligne de test pour les phrases : DS si calculée, sinon le résumé (Ajuriaguerra : % de la norme).
  function scoreLigne(l) { return l.ds !== null && l.ds !== undefined ? "DS " + formaterDS(l.ds) : l.valeurCourte || l.valeurTexte || ""; }

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
    if (versionBHK(d) === "ado") return calculerBHKAdo(d, reg);
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

    // DS par critère : le manuel ne donne ces normes que par classe.
    const classeCrit = CLASSES.indexOf(d.groupe) >= 0 ? d.groupe : "";
    const criteres = CRITERES.map((c, i) => {
      const t = classeCrit && reg.normes.criteres && reg.normes.criteres[c.id] && reg.normes.criteres[c.id][classeCrit];
      const nrm = t && t[sexe];
      if (!nrm || scores[i] === null || !(nrm[1] > 0)) return { ds: null, niveau: null };
      const z = (scores[i] - nrm[0]) / nrm[1];
      return { ds: reg.inverserQualite ? -z : z, niveau: niveau(-z, reg), moy: nrm[0], et: nrm[1] };
    });

    let referenceTexte = "";
    if (cle) referenceTexte = ref === "classe" ? "en " + cle : "à " + cle + " ans";
    const sexeTexte = { F: "filles", M: "garçons", E: "ensemble des enfants" }[sexe];

    return {
      version: "enfant", nomTest: "BHK", liste: CRITERES,
      age: ageEnfant, ref: ref, cle: cle, sexe: sexe, sexeTexte: sexeTexte, horsEtalonnage: horsEtalonnage, referenceTexte: referenceTexte,
      scores: scores, complet: complet, total: total, max: SCORE_TOTAL_MAX, vitesse: vitesse,
      cpm: vitesse !== null ? vitesse / 5 : null, mpm: null,
      normeQ: nQ, normeV: nV,
      dsQ: dsQ, perfQ: perfQ, dsV: dsV,
      niveauQ: niveau(perfQ, reg), niveauV: niveau(dsV, reg),
      domaines: domaines,
      criteres: criteres,
      alerteNormes: !!((nQ && nQ.identiquesFM && sexe !== "E") || (nV && nV.identiquesFM && sexe !== "E")),
    };
  }

  // BHK ado : vitesse comparée à la classe ; qualité comparée à la classe ou à la norme tous niveaux.
  function calculerBHKAdo(d, reg) {
    const cl = d.groupe;
    const nA = reg.normes.ado;
    const nVc = nA.vitesse.classe[cl] && nA.vitesse.classe[cl].E;
    const global = d.adoQualite === "global";
    const nQc = global ? nA.qualite.global && nA.qualite.global.E : nA.qualite.classe[cl] && nA.qualite.classe[cl].E;
    const nQ = nQc ? { moy: nQc[0], et: nQc[1] } : null;
    const nV = nVc ? { moy: nVc[0], et: nVc[1] } : null;
    const scores = CRITERES_ADO.map((c) => (d.lignes[c.id] || []).reduce((a, v) => a + (v ? 1 : 0), 0));
    const total = scores.reduce((a, s) => a + s, 0);
    const complet = d.adoTermine === "oui" || total > 0;
    const vitesse = nombre(d.vitesse);
    const zQbrut = complet && nQ ? (total - nQ.moy) / nQ.et : null;
    const perfQ = zQbrut === null ? null : -zQbrut;
    const dsV = vitesse !== null && nV ? (vitesse - nV.moy) / nV.et : null;
    const domaines = DOMAINES_ADO.map((dom) => {
      const idx = CRITERES_ADO.map((c, i) => (c.domaine === dom.id ? i : -1)).filter((i) => i >= 0);
      return { id: dom.id, nom: dom.nom, total: idx.reduce((a, i) => a + scores[i], 0), max: idx.length * SCORE_MAX, complet: true };
    });
    return {
      version: "ado", nomTest: "BHK ado", liste: CRITERES_ADO,
      age: age(d.naissance, d.passation), ref: "classe", cle: cl, sexe: "E", sexeTexte: "ensemble des élèves", horsEtalonnage: false,
      referenceTexte: "en " + cl, referenceQualite: global ? "tous niveaux confondus" : "en " + cl, qualiteGlobale: global,
      scores: scores, complet: complet, total: total, max: SCORE_TOTAL_MAX_ADO, vitesse: vitesse,
      cpm: vitesse !== null ? vitesse / 5 : null, mpm: vitesse !== null ? vitesse / 25 : null,
      normeQ: nQ, normeV: nV,
      dsQ: zQbrut === null ? null : reg.inverserQualite ? -zQbrut : zQbrut, perfQ: perfQ, dsV: dsV,
      niveauQ: niveau(perfQ, reg), niveauV: niveau(dsV, reg),
      domaines: domaines, criteres: CRITERES_ADO.map(() => ({ ds: null, niveau: null })), alerteNormes: false,
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

  // Man.O.S : classe de référence choisie, sinon proposée d'après la classe et la date du bilan.
  function classeManos(d) {
    const p = Manos.classeProposee(d.groupe, d.passation);
    return d.manos.classe ? { classe: d.manos.classe, raison: d.manos.classe === p.classe ? p.raison : "" } : p;
  }
  function calculManos(d, reg) {
    if (!reg.manosGrille) return null;
    const cl = classeManos(d);
    return cl.classe ? Manos.calcul(d.manos, reg.manosGrille, (v) => niveau(v, reg), cl.classe) : null;
  }

  // Ajuriaguerra : lettres en 1 minute comparées à l'étalonnage (classe ou âge, garçons ou filles).
  function calculAjuri(d) {
    const ag = age(d.naissance, d.passation);
    return Ajuri.calcul(d.ajuri, { classe: d.groupe, ageAns: ag ? ag.ans + ag.mois / 12 : null, sexe: d.normesSexe === "ensemble" ? "" : d.sexe });
  }

  function calculerTests(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    return TESTS.map((t) => {
      const s = d.tests[t.id];
      let lignes = s.lignes.map((l) => {
        const ds = dsLigne(l);
        return { epreuve: l.epreuve, type: l.type, valeurTexte: valeurLigne(l), commentaire: l.commentaire.trim(), ds: ds, niveau: niveau(ds, reg), remplie: nombre(l.valeur) !== null };
      });
      // Man.O.S coté épreuve par épreuve (grille et normes du fichier du cabinet) : lignes calculées.
      const manos = t.id === "manos" ? calculManos(d, reg) : null;
      if (manos && manos.faites) lignes = Manos.lignesTest(manos).map((l) => Object.assign({ type: "manos", commentaire: "", remplie: true }, l));
      // Ajuriaguerra saisi en lettres par minute : lignes calculées avec l'étalonnage.
      const ajuri = t.id === "ajuriaguerra" ? calculAjuri(d) : null;
      const ajuriSaisi = ajuri && (ajuri.faites || ajuri.epreuves.some((e) => e.obs));
      if (ajuriSaisi) lignes = Ajuri.lignesTest(ajuri);
      return { id: t.id, court: t.court, titre: t.titre, section: t.section, fait: s.fait === "oui", notes: s.notes.trim(), lignes: lignes, manos: manos, ajuri: ajuriSaisi ? ajuri : null };
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

  // Titres de regroupement, insérés avant la première section non vide du groupe.
  const GROUPES = {
    occupations: [2, "Description des occupations pouvant générer des difficultés au quotidien pour {enfant}"],
    ecriture: [2, "Écriture"],
    occupationnelle: [3, "Composante occupationnelle"],
    sensoriel: [2, "Bilan sensoriel"],
  };
  const SECTIONS = [
    { id: "motif", titre: "Motif du bilan", niveau: 2 },
    { id: "bilans", titre: "Bilans utilisés", niveau: 2 },
    { id: "anamnese", titre: "Anamnèse", niveau: 2 },
    { id: "environnement", titre: "Environnement de {enfant}", niveau: 2 },
    { id: "maison", titre: "À la maison", niveau: 3, groupes: ["occupations"] },
    { id: "ecole", titre: "À l'école", niveau: 3, groupes: ["occupations"] },
    { id: "avqParents", titre: "Autonomie au quotidien : questionnaire des parents", niveau: 3, groupes: ["occupations"] },
    { id: "mcro", titre: "Priorités de {enfant} et de sa famille (MCRO)", niveau: 3, groupes: ["occupations"] },
    { id: "othope", titre: "Auto-évaluation des occupations par {enfant} (OT'Hope)", niveau: 3, groupes: ["occupations"] },
    { id: "cartesActivites", titre: "Tri de cartes : activités du quotidien", niveau: 3, groupes: ["occupations"] },
    { id: "autoeval", titre: "Auto-évaluation de l'écriture", niveau: 3, groupes: ["ecriture"] },
    { id: "personne", titre: "Composante liée à la personne", niveau: 3, groupes: ["ecriture"] },
    { id: "environnementale", titre: "Composante environnementale", niveau: 3, groupes: ["ecriture"] },
    { id: "observation", titre: "Observation de l'écriture manuscrite", niveau: 4, groupes: ["ecriture", "occupationnelle"] },
    { id: "bhk", titre: "Copie de texte : {bhk}", niveau: 4, groupes: ["ecriture", "occupationnelle"] },
    { id: "vitesse", titre: "Vitesse d'écriture", niveau: 4, groupes: ["ecriture", "occupationnelle"] },
    { id: "clavier", titre: "Frappe au clavier", niveau: 4, groupes: ["ecriture", "occupationnelle"] },
    { id: "otipis", titre: "Observations cliniques (OTIPIS)", niveau: 3, groupes: ["sensoriel"], graphiques: ["otipis"] },
    { id: "dunn", titre: "Profil sensoriel 2 de Dunn", niveau: 3, groupes: ["sensoriel"], graphiques: ["dunn-enfant", "dunn-scolaire"] },
    { id: "eso", titre: "Engagement sensori-occupationnel (ESO)", niveau: 3, groupes: ["sensoriel"], graphiques: ["eso-roues", "eso-systemes", "eso-items"] },
    { id: "sensot", titre: "SensOT-dir", niveau: 3, groupes: ["sensoriel"] },
    { id: "cartesSensoriel", titre: "Tri de cartes : situations sensorielles", niveau: 3, groupes: ["sensoriel"] },
    { id: "complementaires", titre: "Bilans complémentaires", niveau: 2 },
    { id: "evolution", titre: "Évolution depuis le bilan précédent", niveau: 2 },
    { id: "conclusion", titre: "Diagnostic ergothérapique", niveau: 2, recap: true },
    { id: "preconisations", titre: "Objectifs et préconisations", niveau: 2 },
    { id: "salutations", titre: "Formule de politesse", niveau: 0 },
  ];
  // Synthèse courte pour l'équipe éducative : sans anamnèse ni données familiales.
  const SECTIONS_ECOLE = [
    { id: "ecoleBilan", titre: "Ce que montre le bilan", niveau: 2 },
    { id: "ecoleAppui", titre: "Points d'appui", niveau: 2 },
    { id: "ecoleAmenagements", titre: "Aménagements proposés en classe", niveau: 2 },
    { id: "ecoleSuivi", titre: "Suivi en ergothérapie", niveau: 2 },
  ];

  const TITRES_GRAPHIQUES = {
    otipis: "Profil des observations cliniques (OTIPIS)",
    "dunn-enfant": "Profil sensoriel 2 de Dunn, questionnaire enfant",
    "dunn-scolaire": "Profil sensoriel 2 de Dunn, compagnon scolaire",
    "eso-roues": "Profil ESO par domaine d'occupation",
    "eso-systemes": "Systèmes sensoriels (ESO)",
    "eso-items": "ESO : réponses détaillées",
    "profil-ds": "Profil des résultats en déviations standard",
    "bhk-criteres": "Score de chaque critère du BHK",
    manos: "Man.O.S : écart à la moyenne, outil par outil",
    mcro: "MCRO : rendement et satisfaction",
    dcdq: "DCDQ-FE : scores par catégorie",
    evolution: "Évolution des résultats depuis le bilan précédent",
  };
  const LARGEURS_GRAPHIQUES = {
    otipis: 14, "dunn-enfant": 14, "dunn-scolaire": 14, "eso-roues": 16.5, "eso-systemes": 14, "eso-items": 16,
    "profil-ds": 16, "bhk-criteres": 15, manos: 16, mcro: 15, dcdq: 14, evolution: 15,
  };

  // Le volet écriture est-il commencé ? (sinon ses sections restent vides dans un bilan seulement sensoriel)
  function ecritureCommencee(d) {
    const champs = ["lateralite", "prise", "priseDetail", "motivation", "envFeuille", "envOutil", "envLieu", "tailleMm", "c1", "c2", "vitesse", "modeCopie", "reperage", "douleurEva", "bhkNotes"];
    return champs.some((k) => texte(d[k]).trim()) || Object.keys(d.grille).length > 0 ||
      Object.keys(d.lignes).some((k) => d.lignes[k].some(Boolean)) || TESTS.some((t) => t.section === "vitesse" && d.tests[t.id].fait === "oui") || d.clavier.fait === "oui";
  }
  function sensorielCommence(d) {
    return ["otipis", "dunnEnfant", "dunnScolaire", "eso", "sensot"].some((k) => d.senso[k].fait === "oui");
  }

  function titreSection(titre, d) {
    const prenom = texte(d.prenom).trim();
    return titre.replace("{enfant}", prenom || "l'enfant").replace("{bhk}", versionBHK(d) === "ado" ? "BHK ado" : "BHK");
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

  // Constats du bilan (personne), facteurs pour l'énoncé du diagnostic, et raisons qui justifient les préconisations.
  function indicateurs(d, reg) {
    const r = calculerBHK(d, reg);
    const tests = calculerTests(d, reg);
    const raisons = {}, facteurs = [], constats = [];
    const ajout = (cle, raison) => { if (raison && !raisons[cle]) raisons[cle] = raison; };
    const faible = (n) => n === "patho" || n === "inferieur";
    const facteur = (f) => { if (facteurs.indexOf(f) < 0) facteurs.push(f); };

    if (faible(r.niveauQ)) {
      const ds = formaterDS(r.dsQ);
      constats.push(r.niveauQ === "patho" ? "une qualité d'écriture très inférieure à la moyenne, en faveur d'une dysgraphie (" + r.nomTest + " : DS " + ds + ")" : "une qualité d'écriture inférieure à la moyenne (" + r.nomTest + " : DS " + ds + ")");
      facteur(r.niveauQ === "patho" ? "une qualité graphique très altérée" : "une qualité graphique fragile");
      ajout("qualite", "la qualité de l'écriture (" + r.nomTest + " : DS " + ds + ")");
    } else if (r.niveauQ) constats.push("une qualité d'écriture " + (r.niveauQ === "superieur" ? "supérieure à" : "dans") + " la moyenne (" + r.nomTest + " : DS " + formaterDS(r.dsQ) + ")");
    if (faible(r.niveauV)) {
      const ds = formaterDS(r.dsV);
      constats.push(r.niveauV === "patho" ? "une lenteur d'écriture marquée (" + r.nomTest + " : DS " + ds + ")" : "une vitesse d'écriture inférieure à la moyenne (" + r.nomTest + " : DS " + ds + ")");
      facteur("une lenteur d'écriture");
      ajout("vitesse", "la lenteur d'écriture (" + r.nomTest + " : DS " + ds + ")");
      if (r.niveauV === "patho") ajout("vitesseForte", "la lenteur d'écriture marquée (" + r.nomTest + " : DS " + ds + ")");
    } else if (r.niveauV) constats.push("une vitesse d'écriture " + (r.niveauV === "superieur" ? "supérieure à" : "dans") + " la moyenne (" + r.nomTest + " : DS " + formaterDS(r.dsV) + ")");
    tests.filter((t) => t.fait && t.section === "vitesse").forEach((t) => {
      const f = t.lignes.filter((l) => faible(l.niveau));
      if (!f.length) return;
      constats.push("une vitesse d'écriture inférieure à la moyenne en " + joindre(f.map((l) => min(l.epreuve) + " (" + scoreLigne(l) + ")")) + " au " + t.court);
      facteur("une lenteur d'écriture");
      ajout("vitesse", "la lenteur d'écriture (" + t.court + ")");
      if (f.some((l) => l.niveau === "patho")) ajout("vitesseForte", "la lenteur d'écriture marquée (" + t.court + ")");
    });
    const eva = nombre(d.douleurEva);
    if (eva !== null && eva > 0) {
      constats.push("des douleurs lors de l'écriture (EVA " + formaterNombre(eva) + "/10)");
      if (eva >= 3) { facteur("des douleurs à l'écriture"); ajout("douleur", "les douleurs à l'écriture (EVA " + formaterNombre(eva) + "/10)"); }
    }
    const ecarts = (dom) => {
      const g = GRILLE.find((x) => x.id === dom);
      return g.items.filter((it) => it.id !== "type").map((it) => {
        const v = d.grille[dom + "." + it.id];
        return v && v !== it.options[0][0] ? it.options.find((o) => o[0] === v)[2] : null;
      }).filter(Boolean);
    };
    const posture = ecarts("posture");
    if (posture.length) { constats.push("une installation peu efficace pendant l'écriture (" + joindre(posture) + ")"); facteur("une installation posturale peu efficace"); ajout("posture", "la posture d'écriture (" + posture[0] + ")"); }
    const prise = ecarts("prise");
    if (prise.length) { constats.push("une prise de l'outil scripteur peu fonctionnelle (" + joindre(prise) + ")"); facteur("une prise du crayon peu fonctionnelle"); }
    if (d.grille["prise.pression-doigts"] === "forte" || d.grille["prise.tensions"] === "oui") ajout("pression", "l'hyperappui sur l'outil scripteur");
    if (d.grille["prise.mobilite"] === "reduite") ajout("motriciteFine", "la mobilité réduite des doigts");
    const geste = ecarts("geste").concat(ecarts("lettres"));
    if (geste.length) { constats.push("un geste graphique peu efficace (" + joindre(geste) + ")"); ajout("geste", "le geste graphique (" + geste[0] + ")"); }
    if (d.grille["lisibilite.ratures"] === "frequentes" || (r.version === "enfant" && (r.scores[11] || 0) >= 3)) ajout("ratures", "les ratures et retouches fréquentes");
    if ((d.grille["lettres.lignage"] && d.grille["lettres.lignage"] !== "ok") || (r.version === "enfant" && (r.scores[2] || 0) >= 3)) ajout("lignage", "le placement irrégulier sur la ligne");
    if (d.grille["lisibilite.fatigue"] === "oui") ajout("fatigue", "la fatigue en cours de tâche");

    const LIBELLES_TESTS = {
      dtvp3: ["des difficultés visuo-perceptives et visuo-motrices", "visuel"],
      mabc3: ["des difficultés de coordination motrice", "praxies"],
      manos: ["des difficultés de manipulation des outils scolaires", "motriciteFine"],
      evic: ["une frappe au clavier lente", "clavier"],
    };
    const frappe = Clavier.indicateur(d.clavier);
    if (frappe) {
      ajout(frappe.cle, frappe.raison);
      if (frappe.constat) constats.push(frappe.constat);
    }
    if (d.manip.fait === "oui") {
      const faibles = MANIPULATIONS.filter((it) => {
        const v = [d.manip.md[it.id], d.manip.mg[it.id]].filter((x) => x !== undefined);
        return v.length && Math.min.apply(null, v) <= 1;
      });
      if (faibles.length) {
        constats.push("des manipulations dans la main peu fonctionnelles (Exner et Benbow : " + joindre(faibles.map((it) => min(it.nom))) + ")");
        facteur("des difficultés de manipulation fine");
        ajout("motriciteFine", "les manipulations dans la main (Exner et Benbow)");
      }
    }
    tests.filter((t) => t.fait && t.section === "complementaires").forEach((t) => {
      const f = t.lignes.filter((l) => faible(l.niveau));
      // Man.O.S : outils en difficulté, même quand le total reste dans la moyenne.
      const outils = t.manos ? Manos.outilsEnDifficulte(t.manos) : [];
      if (!f.length && !outils.length) return;
      const lib = LIBELLES_TESTS[t.id] || ["des difficultés", null];
      const detail = [f.length ? joindre(f.map((l) => min(l.epreuve) + " " + scoreLigne(l))) : "", outils.length ? (f.length ? "surtout pour " : "pour ") + joindre(outils) : ""].filter(Boolean).join(" ; ");
      constats.push(lib[0] + " (" + t.court + " : " + detail + ")");
      facteur(lib[0]);
      if (lib[1]) ajout(lib[1], lib[0].replace(/^des /, "les ") + " (" + t.court + ")");
      if (t.id === "mabc3" && f.some((l) => /dextérité/i.test(l.epreuve))) ajout("motriciteFine", "la dextérité manuelle (MABC-3)");
    });

    const s = Senso.constats(d.senso);
    s.constats.forEach((c) => constats.push(c));
    s.facteurs.forEach(facteur);
    Object.keys(s.raisons).forEach((k) => ajout(k, s.raisons[k]));

    const o = Occup.constats(d, accords(d), ageMois(d));
    o.personne.forEach((c) => constats.push(c));
    o.facteurs.forEach(facteur);
    Object.keys(o.raisons).forEach((k) => ajout(k, o.raisons[k]));
    return { raisons: raisons, facteurs: facteurs, constats: constats, objectifs: s.objectifs.concat(o.objectifs), occupations: o.occupations, occ: o.occ };
  }

  /* ================= Diagnostic ergothérapique : propositions à partir des bilans et questionnaires ================= */
  // Chaque proposition garde sa source, affichée dans l'outil sous le champ (« d'après … »).
  const CHAMPS_DIAG = ["diagImpact", "envObstacles", "envFacilitateurs", "conclusionContexte", "conclusionPoints", "conclusionForces"];
  const OCC_CARTES = {
    habiller: "habillage", manteau: "habillage", lacets: "habillage", laver: "toilette", dents: "toilette", couverts: "repas", verser: "repas", gouter: "repas",
    ecrire: "ecrit-classe", "ecrire-vite": "ecrit-classe", copier: "copie", decouper: "outils", colorier: "outils", regle: "outils", cartable: "outils",
    devoirs: "devoirs", clavier: "ecrit-classe", ballon: "sport", velo: "sport", nager: "sport", courir: "sport", construire: "jeux", dessiner: "jeux",
    recre: "social", dormir: "sommeil",
  };
  const OCC_AVQP = { habillage: "habillage", toilette: "toilette", repas: "repas", loisirs: "jeux", deplacements: "deplacements", comportement: "transitions" };
  // Questions « école » du questionnaire d'autonomie (texte de l'outil) rattachées aux occupations.
  const OCC_ECOLE_AVQP = { outils: [2, 3, 4, 5, 17, 18], "ecrit-classe": [7, 9, 10, 11, 12, 13, 14, 15, 16], devoirs: [6, 8] };
  const DOMAINES_AUTO_DE = { lisibilite: "la lisibilité", satisfaction: "le vécu (satisfaction, émotions)", vitesse: "la vitesse" };

  function propositionsDiagnostic(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const a = accords(d);
    const r = calculerBHK(d, reg);
    const tests = calculerTests(d, reg);
    const faible = (n) => n === "patho" || n === "inferieur";
    const occ = {};
    const ajoutOcc = (id, source) => { if (!id) return; if (!occ[id]) occ[id] = []; if (occ[id].indexOf(source) < 0) occ[id].push(source); };
    const champs = {};
    CHAMPS_DIAG.forEach((k) => { champs[k] = []; });
    const ajout = (k, t, source) => { if (t && !champs[k].some((x) => x.texte === t)) champs[k].push({ texte: t, source: source }); };
    const cite = (t) => "« " + min(texte(t).trim().replace(/\s*\((ex|par ex)[^)]*\)/gi, "").replace(/[.\s]+$/, "")) + " »";
    const rien = (t) => !texte(t).trim() || /^(ras|rien|aucun|aucune|néant|non)\.?$/i.test(texte(t).trim());
    const sansPoint = (t) => texte(t).trim().replace(/[.;]+$/, "");
    // Minuscule en début de texte saisi, sauf sigle (CMP, AESH…).
    const minS = (t) => /^[A-ZÀ-Ý][a-zà-ÿ]/.test(t) ? min(t) : t;

    // BHK et tests
    if (faible(r.niveauQ)) ajoutOcc("ecrit-classe", r.nomTest + " : qualité, DS " + formaterDS(r.dsQ));
    if (faible(r.niveauV)) {
      const src = r.nomTest + " : vitesse, DS " + formaterDS(r.dsV);
      ajoutOcc("ecrit-classe", src); ajoutOcc("copie", src);
      if (r.niveauV === "patho") ajoutOcc("evaluations", src);
    }
    if (r.niveauQ && !faible(r.niveauQ)) ajout("conclusionForces", "une qualité d'écriture " + (r.niveauQ === "superieur" ? "supérieure à" : "dans") + " la moyenne", r.nomTest);
    if (r.niveauV && !faible(r.niveauV)) ajout("conclusionForces", "une vitesse d'écriture " + (r.niveauV === "superieur" ? "supérieure à" : "dans") + " la moyenne", r.nomTest);
    tests.filter((t) => t.fait).forEach((t) => {
      const l = t.lignes.filter((x) => x.niveau);
      if (l.length && l.every((x) => !faible(x.niveau)) && !(t.manos && Manos.outilsEnDifficulte(t.manos).length)) ajout("conclusionForces", "des résultats dans la moyenne au " + t.court, t.court);
      // Man.O.S : manipulation des outils scolaires en difficulté.
      const f = t.id === "manos" ? l.filter((x) => faible(x.niveau)) : [];
      const outils = t.manos ? Manos.outilsEnDifficulte(t.manos) : [];
      if (f.length || outils.length) ajoutOcc("outils", t.court + " : " + [f.slice(0, 3).map((x) => min(x.epreuve) + " DS " + formaterDS(x.ds)).join(", "), outils.length ? "outils en difficulté : " + outils.join(", ") : ""].filter(Boolean).join(" ; "));
    });
    if (d.grille["lisibilite.fatigue"] === "oui") ajout("diagImpact", "une fatigue en cours de tâche écrite", "grille d'observation de l'écriture");
    const frappe = Clavier.indicateur(d.clavier);
    if (frappe && frappe.cle === "clavierEfficace") ajout("conclusionForces", "une frappe au clavier efficace", "EViC");

    // Auto-appréciation de l'écriture
    if (d.auto.fait === "oui") {
      const sa = syntheseAuto(d.auto, reg);
      const g = sa.domaines.filter((x) => x.frequentes > 0).sort((x, y) => y.frequentes - x.frequentes);
      if (g.length) ajout("conclusionPoints", a.sujet + " exprime une gêne fréquente pour " + joindre(g.map((x) => DOMAINES_AUTO_DE[x.id] || min(x.nom))) + " de son écriture", "auto-appréciation de l'écriture");
      g.forEach((x) => { if (x.id === "lisibilite") ajoutOcc("ecrit-classe", "auto-appréciation : lisibilité"); if (x.id === "vitesse") ajoutOcc("copie", "auto-appréciation : vitesse"); });
    }

    // Questionnaire d'autonomie rempli par les parents
    if (d.avqParents.fait === "oui") {
      const q = d.avqParents, SRC = "questionnaire d'autonomie (parents)";
      const an = Occup.analyseAvqParents(q, reg.avqLibelles);
      const libDefaut = JSON.stringify(Occup.libellesAvqp(reg.avqLibelles).domaines.ecole) === JSON.stringify(Occup.LIBELLES_AVQP.domaines.ecole);
      const non = an.filter((x) => x.autonome === "non"), oui = an.filter((x) => x.autonome === "oui");
      if (non.length) ajout("diagImpact", "n'est pas autonome pour " + joindre(non.map((x) => x.le)) + " selon ses parents", SRC);
      // Domaine retenu : pas autonome, priorité des parents, ou difficultés nombreuses (au moins un tiers des réponses).
      // Un domaine où l'enfant est dit autonome n'est retenu que si la moitié des réponses au moins sont des difficultés.
      const enDifficulte = [];
      an.forEach((x) => {
        if (x.id === "ecole" || !OCC_AVQP[x.id]) return;
        const nd = x.difficultes.length, seuil = Math.max(2, Math.ceil(x.repondues / 3));
        const pourquoi = [];
        if (x.autonome === "non") pourquoi.push("pas autonome");
        if (q.priorites[x.id] && q.priorites[x.id].rang) pourquoi.push("priorité des parents");
        if (nd >= seuil && (x.autonome !== "oui" || nd >= Math.ceil(x.repondues / 2))) pourquoi.push(nd + " difficulté" + (nd > 1 ? "s" : "") + " sur " + x.repondues + " réponses");
        if (pourquoi.length) { enDifficulte.push(x.id); ajoutOcc(OCC_AVQP[x.id], SRC + " : " + min(x.nom) + " (" + pourquoi.join(", ") + ")"); }
      });
      const ecole = an.find((x) => x.id === "ecole");
      if (ecole && ecole.difficultes.length) {
        if (libDefaut) Object.keys(OCC_ECOLE_AVQP).forEach((id) => { if (ecole.difficultes.some((it) => OCC_ECOLE_AVQP[id].indexOf(it.n) >= 0)) ajoutOcc(id, SRC + " : école"); });
        else if (ecole.difficultes.length >= 2) ajoutOcc("ecrit-classe", SRC + " : école");
        ajout("diagImpact", "à l'école, difficultés relevées par les parents (jamais ou rarement) : " + ecole.difficultes.slice(0, 4).map((it) => cite(it.libelle)).join(", "), SRC);
      }
      const prio = Occup.DOMAINES_AVQP.map((x) => ({ x: x, p: q.priorites[x.id] })).filter((y) => y.p.rang).sort((y, z) => +y.p.rang - +z.p.rang);
      if (prio.length) ajout("diagImpact", "priorités des parents : " + prio.map((y) => y.x.le).join(", "), SRC);
      an.filter((x) => x.aides).forEach((x) => ajout("envFacilitateurs", "aides en place à la maison pour " + x.le + " : " + minS(sansPoint(x.aides)), SRC));
      if (q.aesh === "oui") ajout("envFacilitateurs", "accompagnement par une AESH" + (q.heures.trim() ? " (" + sansPoint(q.heures) + (/\d$/.test(q.heures.trim()) ? " h" : "") + ")" : ""), SRC);
      const comp = an.find((x) => x.id === "comportement");
      if (comp) {
        const diff = comp.difficultes.filter((it) => it.sens === "-");
        if (diff.length) ajout("conclusionPoints", "selon ses parents, " + a.sujetMin + " : " + diff.slice(0, 4).map((it) => cite(it.libelle)).join(", ") + " (fréquemment ou toujours)", SRC + " : comportement");
        const appuis = comp.acquis.filter((it) => it.sens === "+");
        if (appuis.length) ajout("conclusionForces", appuis.map((it) => cite(it.libelle)).join(", ") + " selon ses parents", SRC + " : comportement");
      }
      const ouiNet = oui.filter((x) => enDifficulte.indexOf(x.id) < 0);
      if (ouiNet.length) ajout("conclusionForces", "autonome pour " + joindre(ouiNet.map((x) => x.le)) + " selon ses parents", SRC);
    }

    // Bilan sensoriel (ESO, profil de Dunn, SensOT-dir)
    if (d.senso.eso.fait === "oui") {
      const an = Senso.analyseEso(d.senso.eso);
      const vers = { sp: "toilette", p: "ecrit-classe", l: "jeux" };
      const noms = { sp: "les soins personnels", p: "le travail scolaire", l: "les loisirs" };
      an.domaines.forEach((x) => { if (x.moyenne !== null && x.moyenne < 2) ajoutOcc(vers[x.id], "ESO : " + min(x.nom) + ", " + formaterNombre(x.moyenne, 1) + " sur 3"); });
      const bons = an.domaines.filter((x) => x.moyenne !== null && x.moyenne >= 2.5);
      if (bons.length && bons.length < an.domaines.length) ajout("conclusionForces", "un engagement adapté dans " + joindre(bons.map((x) => noms[x.id])), "ESO");
      const g = (id) => an.globaux.find((x) => x.id === id);
      if (g("UR") && g("UR").moyenne < 2) ajout("envObstacles", "les consignes données sans s'assurer de son attention, les environnements peu stimulants", "ESO : hyporéactivité sensorielle");
    }
    const sc = Senso.constats(d.senso);
    const sens = ["sensibilite", "evitement", "auditif"].map((k) => sc.raisons[k]).filter(Boolean);
    if (sens.length) ajout("envObstacles", "les environnements bruyants ou très stimulants (cantine, classe agitée, foule), difficiles à supporter", sens[0]);
    if (d.senso.sensot.fait === "oui") {
      const genes = Senso.themesSensot(d.senso.sensot).filter((x) => x.gene > 0).sort((x, y) => y.gene - x.gene);
      if (genes.length) ajout("envObstacles", "des situations sensorielles gênantes au quotidien (" + joindre(genes.slice(0, 3).map((x) => min(x.nom))) + ")", "SensOT-dir");
    }

    // Occupations : grille d'autonomie, MCRO, tri de cartes, DCDQ
    Occup.occupationsAvq(d.avq).forEach((id) => ajoutOcc(id, "grille d'autonomie"));
    const m = Occup.calculMcro(d.mcro);
    if (d.mcro.fait === "oui") {
      const peu = m.problemes.filter((pb) => pb.r1 !== null && pb.r1 <= 5);
      if (peu.length) ajout("diagImpact", "activités prioritaires peu réussies : " + peu.map((pb) => min(pb.activite) + " (" + formaterNombre(pb.r1) + "/10)").join(", "), "MCRO");
    }
    const ta = d.cartes.activites;
    if (ta.fait === "oui") ta.resultats.filter((x) => x.pile === "difficile").forEach((x) => ajoutOcc(OCC_CARTES[x.id], "tri de cartes : " + x.rapport));
    if (d.othope.fait === "oui") d.othope.resultats.filter((x) => (x.pile === "non" || x.pile === "pas-bien") && x.occ).forEach((x) => ajoutOcc(x.occ, "OT'Hope : " + x.rapport));
    const qd = Occup.calculDcdq(d.dcdq, ageMois(d));
    if (d.dcdq.fait === "oui" && qd.indication === true) ajoutOcc("sport", "DCDQ " + qd.total + "/75");

    // Environnement : aucun aménagement alors que des difficultés sont relevées
    if (Object.keys(occ).length && rien(d.ecoleAmenagements)) ajout("envObstacles", "pas d'aménagement en place à l'école pour l'instant", "anamnèse : aménagements");
    if (!rien(d.ecoleHumain)) ajout("envFacilitateurs", sansPoint(minS(d.ecoleHumain.trim())), "anamnèse : environnement humain à l'école");

    // Contexte : suivis et parcours scolaire
    if (!rien(d.envSuivis)) ajout("conclusionContexte", "Suivis en cours : " + sansPoint(minS(d.envSuivis.trim())) + ".", "anamnèse : accompagnements et suivis");
    if (!rien(d.envParcours)) ajout("conclusionContexte", "Parcours scolaire : " + sansPoint(minS(d.envParcours.trim())) + ".", "anamnèse : parcours scolaire");

    const sep = { conclusionContexte: " ", conclusionPoints: "\n" };
    const out = { occupations: OCCUPATIONS.filter((o) => occ[o.id]).map((o) => ({ id: o.id, texte: o.texte, sources: occ[o.id] })), champs: {} };
    CHAMPS_DIAG.forEach((k) => {
      const l = champs[k];
      const t = l.map((x) => x.texte).join(sep[k] || " ; ");
      out.champs[k] = { texte: k === "conclusionContexte" || k === "conclusionPoints" ? t : maj(t), sources: l.map((x) => x.source).filter((x, i, arr) => arr.indexOf(x) === i) };
    });
    return out;
  }
  // Occupations retenues : cochées par l'ergothérapeute, ou proposées par l'outil et non écartées.
  function occupationsRetenues(d, props) {
    const p = props || propositionsDiagnostic(d);
    return OCCUPATIONS.filter((o) => d.occRefusees.indexOf(o.id) < 0 && (d.occDifficultes.indexOf(o.id) >= 0 || p.occupations.some((x) => x.id === o.id)));
  }
  // Bilans et questionnaires sur lesquels s'appuie le diagnostic.
  function sourcesDiagnostic(d, reg) {
    const r = calculerBHK(d, reg), l = [];
    if (r.complet || r.vitesse !== null) l.push("le " + r.nomTest);
    if (Object.keys(d.grille).length) l.push("l'observation de l'écriture");
    if (d.auto.fait === "oui") l.push("l'auto-appréciation de l'écriture");
    if (d.clavier.fait === "oui") l.push("l'EViC");
    calculerTests(d, reg).filter((t) => t.fait).forEach((t) => l.push("le " + t.court));
    const s = d.senso;
    if (s.otipis.fait === "oui") l.push("les observations cliniques OTIPIS");
    if (s.dunnEnfant.fait === "oui" || s.dunnScolaire.fait === "oui") l.push("le profil sensoriel 2 de Dunn");
    if (s.eso.fait === "oui") l.push("l'ESO");
    if (s.sensot.fait === "oui") l.push("le SensOT-dir");
    if (d.avqParents.fait === "oui") l.push("le questionnaire d'autonomie rempli par les parents");
    if (Object.keys(d.avq).length) l.push("la grille d'autonomie");
    if (d.mcro.fait === "oui") l.push("la MCRO");
    if (d.othope.fait === "oui") l.push("l'OT'Hope");
    if (d.dcdq.fait === "oui") l.push("le DCDQ-FE");
    if (d.cartes.activites.fait === "oui" || d.cartes.sensoriel.fait === "oui") l.push("les tris de cartes");
    return l;
  }

  function ageMois(d) {
    const a = age(d.naissance, d.passation);
    return a ? a.ans * 12 + a.mois : null;
  }

  /* ================= Repères TDC : recommandations internationales (ajout) ================= */

  const SOURCE_TDC = {
    court: "Blank et al., 2019",
    texte: "Blank R., Barnett A. L., Cairney J. et al. International clinical practice recommendations on the definition, diagnosis, assessment, intervention, and psychosocial aspects of developmental coordination disorder. Developmental Medicine & Child Neurology, 2019, 61 (3), 242-285.",
    lien: "https://doi.org/10.1111/dmcn.14132",
  };
  // Fonction de répartition de la loi normale (approximation d'Abramowitz et Stegun), pour passer d'un DS à un rang percentile.
  function repartition(z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const p = 0.3989423 * Math.exp((-z * z) / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }
  const ETATS_TDC = { oui: "rempli", non: "non rempli", "?": "à préciser" };

  function reperesTdc(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const a = accords(d);
    const am = ageMois(d);
    const avant5 = am !== null && am < 60;
    const seuilRp = avant5 ? 5 : 16;
    // Critère I : motricité nettement en dessous de l'âge, mesurée par un test standardisé (note totale).
    let I;
    const mabc = d.tests.mabc3;
    if (mabc.fait === "oui") {
      const total = mabc.lignes.find((l) => l.id === "total" || /total/i.test(l.epreuve));
      const ds = total ? dsLigne(total) : null;
      if (ds !== null) {
        const rp = repartition(ds) * 100;
        I = { etat: rp <= seuilRp ? "oui" : "non", texte: "MABC-3, note totale au rang percentile " + (rp < 1 ? "inférieur à 1" : Math.round(rp)) + " (repère : " + seuilRp + "e percentile ou moins)" };
      } else I = { etat: "?", texte: "MABC-3 coché : saisir la note totale de motricité" };
    } else I = { etat: "?", texte: "test moteur standardisé à réaliser (par exemple la MABC-3, note totale)" };
    // Critère II : retentissement sur les activités quotidiennes, scolaires et de loisirs.
    const preuves = [];
    const q = Occup.calculDcdq(d.dcdq, am);
    if (d.dcdq.fait === "oui" && q.indication === true) preuves.push("indication d'un risque de TDC au DCDQ-FE (" + q.total + "/75)");
    const aide = Occup.ITEMS_AVQ.filter((it) => Occup.AIDE_AVQ.indexOf(d.avq[it.id]) >= 0).length;
    if (aide) preuves.push("besoin d'aide pour " + aide + " activité" + (aide > 1 ? "s" : "") + " de la grille d'autonomie");
    const occ = occupationsRetenues(d, propositionsDiagnostic(d, reg)).map((o) => o.texte);
    if (occ.length) preuves.push("difficultés dans " + joindre(occ));
    const mc = Occup.calculMcro(d.mcro);
    if (d.mcro.fait === "oui" && mc.problemes.length) preuves.push("activités prioritaires à la MCRO");
    let II;
    if (preuves.length) II = { etat: "oui", texte: joindre(preuves) };
    else if (d.dcdq.fait === "oui" && q.indication === false) II = { etat: "non", texte: "DCDQ-FE : probablement pas de TDC, sans retentissement relevé par ailleurs" };
    else II = { etat: "?", texte: "retentissement à documenter (DCDQ-FE, grille d'autonomie, entretien)" };
    // Critères III et IV : renseignés par l'ergothérapeute.
    const III = d.tdc.debut === "oui" ? { etat: "oui", texte: "difficultés motrices présentes depuis la petite enfance" }
      : d.tdc.debut === "non" ? { etat: "non", texte: "début des difficultés plus tardif" } : { etat: "?", texte: "à préciser à l'anamnèse" };
    const IV = d.tdc.exclusion === "oui" ? { etat: "oui", texte: "autres causes écartées par le médecin" }
      : d.tdc.exclusion === "non" ? { etat: "non", texte: "une autre cause est en cours d'exploration" }
      : { etat: "?", texte: "à vérifier par le médecin (déficience intellectuelle, trouble visuel, atteinte neurologique)" };
    const criteres = [
      Object.assign({ id: "I", nom: "Motricité nettement inférieure à celle attendue pour l'âge" }, I),
      Object.assign({ id: "II", nom: "Retentissement sur la vie quotidienne, l'école et les loisirs" }, II),
      Object.assign({ id: "III", nom: "Début dans la petite enfance" }, III),
      Object.assign({ id: "IV", nom: "Difficultés non mieux expliquées par une autre cause" }, IV),
    ];
    const e = criteres.map((c) => c.etat);
    let conclusion;
    if (e.every((x) => x === "oui")) conclusion = "Les quatre critères sont réunis : ces éléments sont à transmettre au médecin, qui pose le diagnostic.";
    else if (e[0] === "oui" && e[1] === "oui") {
      const ids = (etat) => criteres.filter((c) => c.etat === etat).map((c) => c.id);
      const reunis = ids("oui"), non = ids("non"), aVoir = ids("?");
      const phrase = (liste, un, plusieurs) => liste.length > 1 ? "les critères " + joindre(liste) + " " + plusieurs : "le critère " + liste[0] + " " + un;
      const morceaux = ["Les critères " + joindre(reunis) + " sont réunis"];
      if (non.length) morceaux.push(phrase(non, "n'est pas rempli", "ne sont pas remplis"));
      if (aVoir.length) morceaux.push(phrase(aVoir, "reste à vérifier", "restent à vérifier"));
      conclusion = morceaux.join(" ; ") + ". Une consultation médicale est conseillée.";
    }
    else if (e[0] === "non" || e[1] === "non") conclusion = "Les éléments recueillis ne réunissent pas les critères I et II.";
    else conclusion = "Repères incomplets : compléter les éléments à préciser.";
    return { criteres: criteres, conclusion: conclusion, avant5: avant5, source: SOURCE_TDC, sujet: a.sujetMin };
  }

  function redigerTdc(d, reg) {
    if (d.tdc.fait !== "oui") return "";
    const t = reperesTdc(d, reg);
    const l = ["Ajout, à titre indicatif : repères des recommandations internationales sur le trouble développemental de la coordination (TDC) (" + SOURCE_TDC.court + ") :"];
    t.criteres.forEach((c, i) => l.push("– Critère " + c.id + " (" + c.nom.charAt(0).toLowerCase() + c.nom.slice(1) + ") : " + ETATS_TDC[c.etat] + ", " + c.texte + (i === 3 ? "." : " ;")));
    if (t.avant5) l.push("Avant 5 ans, les recommandations demandent une atteinte sévère, confirmée par deux évaluations à au moins trois mois d'intervalle.");
    l.push(t.conclusion + " Le diagnostic de TDC est médical : ces repères ne le remplacent pas.");
    if (d.tdc.notes.trim()) l.push(point(maj(d.tdc.notes.trim())));
    l.push("Source : " + SOURCE_TDC.texte + " " + SOURCE_TDC.lien);
    return l.join("\n");
  }

  /* ================= Réévaluation ================= */

  function cleTexte(s) { return texte(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function scoreCourt(l) { if (l.valeurCourte) return l.valeurCourte; return l.type === "ds" ? "DS " + formaterDS(l.ds) : l.valeurTexte.replace(/^note standard /, "NS ").replace(/^indice /, "Indice ").replace(/^rang percentile /, "RP "); }

  // Mesures comparables d'un bilan à l'autre (gardées dans le dossier suivant).
  function mesures(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const r = calculerBHK(d, reg);
    const l = [];
    if (r.complet) l.push({ cle: "bhk-qualite", bilan: r.nomTest, epreuve: "Qualité", valeur: r.total + "/" + r.max, echelle: r.version, ds: r.dsQ, perf: r.perfQ, num: r.total, sens: -1, seuil: null });
    if (r.vitesse !== null) l.push({ cle: "bhk-vitesse", bilan: r.nomTest, epreuve: "Vitesse", valeur: formaterNombre(r.vitesse) + " car. en 5 min", echelle: "caracteres", ds: r.dsV, perf: r.dsV, num: r.vitesse, sens: 1, seuil: null });
    calculerTests(d, reg).filter((t) => t.fait).forEach((t) => t.lignes.filter((x) => x.remplie && x.epreuve.trim()).forEach((x) => {
      l.push({ cle: t.id + ":" + cleTexte(x.epreuve), bilan: t.court, epreuve: x.epreuve, valeur: scoreCourt(x), echelle: "ds", ds: x.ds, perf: x.ds, num: null, sens: 1, seuil: null });
    }));
    if (d.mcro.fait === "oui") {
      const m = Occup.calculMcro(d.mcro);
      const rd = m.r2 !== null ? m.r2 : m.r1, sa = m.s2 !== null ? m.s2 : m.s1;
      if (rd !== null) l.push({ cle: "mcro-rendement", bilan: "MCRO", epreuve: "Rendement moyen", valeur: formaterNombre(rd, 1) + "/10", echelle: "mcro", ds: null, perf: null, num: rd, sens: 1, seuil: Occup.SEUIL_MCRO });
      if (sa !== null) l.push({ cle: "mcro-satisfaction", bilan: "MCRO", epreuve: "Satisfaction moyenne", valeur: formaterNombre(sa, 1) + "/10", echelle: "mcro", ds: null, perf: null, num: sa, sens: 1, seuil: Occup.SEUIL_MCRO });
    }
    if (d.dcdq.fait === "oui") {
      const q = Occup.calculDcdq(d.dcdq, ageMois(d));
      if (q.complet) l.push({ cle: "dcdq-total", bilan: "DCDQ", epreuve: "Score total", valeur: q.total + "/75", echelle: "dcdq", ds: null, perf: null, num: q.total, sens: 1, seuil: null });
    }
    Clavier.mesures(d.clavier).forEach((m) => l.push(m));
    return l;
  }

  function instantane(dossier, reglages) {
    const d = normaliserDossier(dossier);
    return { passation: d.passation, groupe: d.groupe, mesures: mesures(d, reglages) };
  }

  const SEUIL_EVOLUTION_DS = 0.5;
  const TENDANCES = { progres: "En progrès", stable: "Stable", baisse: "En baisse" };

  function evolution(dossier, reglages) {
    const d = normaliserDossier(dossier);
    if (!d.precedent) return null;
    const avant = {};
    d.precedent.mesures.forEach((m) => { avant[m.cle] = m; });
    const lignes = [];
    mesures(d, reglages).forEach((m) => {
      const p = avant[m.cle];
      if (!p) return;
      let ecart = "", tendance = null;
      if (p.perf !== null && m.perf !== null && p.ds !== null && m.ds !== null) {
        const dp = m.perf - p.perf;
        ecart = (m.ds - p.ds >= 0 ? "+" : "−") + formaterNombre(Math.abs(m.ds - p.ds), 2) + " DS";
        tendance = dp >= SEUIL_EVOLUTION_DS ? "progres" : dp <= -SEUIL_EVOLUTION_DS ? "baisse" : "stable";
      } else if (p.num !== null && m.num !== null && p.echelle === m.echelle) {
        const dn = m.num - p.num;
        ecart = (dn >= 0 ? "+" : "−") + formaterNombre(Math.abs(dn), 1);
        const seuil = m.seuil !== null ? m.seuil : null;
        if (seuil !== null) tendance = dn * m.sens >= seuil ? "progres" : dn * m.sens <= -seuil ? "baisse" : "stable";
      }
      const avec = (x) => x.valeur + (x.ds !== null && x.echelle !== "ds" ? " (DS " + formaterDS(x.ds) + ")" : "");
      lignes.push({ bilan: m.bilan, epreuve: m.epreuve, avant: avec(p), apres: avec(m), ecart: ecart, tendance: tendance });
    });
    return { passation: d.precedent.passation, groupe: d.precedent.groupe, lignes: lignes, nonRefaits: d.precedent.mesures.length - lignes.length };
  }

  function proposerPreconisations(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const ind = indicateurs(d, normaliserReglages(reglages));
    return PRECONISATIONS.map((p) => {
      const cle = p.raisons.find((k) => ind.raisons[k]);
      return { id: p.id, cat: p.cat, label: p.label, texte: p.texte, raison: cle ? ind.raisons[cle] : "", choisie: d.amenagements.indexOf(p.id) >= 0 };
    });
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
      if (r.complet || r.vitesse !== null) l.push(r.version === "ado" ? "BHK ado : échelle d'évaluation rapide de l'écriture chez l'adolescent" : "BHK : échelle d'évaluation rapide de l'écriture chez l'enfant");
      if (Object.keys(d.grille).length) l.push("Grille d'observation de l'écriture");
      tests.filter((t) => t.fait).forEach((t) => l.push(t.titre));
      const s = d.senso;
      if (s.otipis.fait === "oui") l.push("Observations cliniques OTIPIS au cours du bilan sensoriel");
      if (s.dunnEnfant.fait === "oui") l.push("Profil sensoriel 2 de Dunn : questionnaire enfant, rempli par " + (s.dunnEnfant.repondant.trim() || "les parents"));
      if (s.dunnScolaire.fait === "oui") l.push("Profil sensoriel 2 de Dunn : compagnon scolaire, rempli par " + (s.dunnScolaire.repondant.trim() || "l'enseignant"));
      if (s.eso.fait === "oui") l.push("Profil de l'engagement sensori-occupationnel (ESO) : questionnaire parental");
      if (s.sensot.fait === "oui") l.push("SensOT-dir (version enfant)");
      if (d.manip.fait === "oui") l.push("Exner et Benbow : évaluation des manipulations fines dans la main");
      if (d.auto.fait === "oui") l.push(reg.autoNom);
      if (d.avqParents.fait === "oui") l.push("Questionnaire sur l'autonomie dans les activités de la vie quotidienne, rempli par " + (d.avqParents.repondant.trim() || "les parents") + (reg.avqLibelles.source.trim() ? " (" + min(reg.avqLibelles.source.trim().replace(/[.]+$/, "")) + ")" : ""));
      if (Object.keys(d.avq).length) l.push("Grille d'autonomie dans les activités quotidiennes");
      if (d.mcro.fait === "oui") l.push("Mesure canadienne du rendement occupationnel (MCRO)");
      if (d.othope.fait === "oui") l.push("OT'Hope : auto-évaluation des occupations par " + a.sujetMin);
      if (d.cartes.activites.fait === "oui") l.push("Tri de cartes sur écran : activités du quotidien");
      if (d.cartes.sensoriel.fait === "oui") l.push("Tri de cartes sur écran : situations sensorielles");
      if (d.clavier.fait === "oui") l.push("EViC : évaluation de la vitesse de frappe au clavier (" + Clavier.SOURCE.court + ")");
      if (d.dcdq.fait === "oui") l.push("DCDQ-FE : questionnaire sur le développement de la coordination (version en français pour l'Europe), rempli par " + (d.dcdq.repondant.trim() || "les parents"));
      if (d.tdc.fait === "oui") l.push("Repères des recommandations internationales sur le TDC (" + SOURCE_TDC.court + ")");
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

    // Occupations : champs de l'anamnèse complétés par la grille d'autonomie.
    {
      const ligne = (libelle, champ, domaine) => {
        const libre = texte(d[champ]).trim();
        const grille = domaine ? Occup.phraseAvq(d.avq, domaine, a) : "";
        return libelle + " : " + (libre || grille ? [libre ? point(libre) : "", grille].filter(Boolean).join(" ") : "RAS");
      };
      const l = [
        ligne("Sommeil", "occSommeil"),
        ligne("Habillage", "occHabillage", "habillage"),
        ligne("Alimentation", "occAlimentation", "repas"),
        ligne("Soins d'hygiène", "occHygiene", "hygiene"),
        ligne("Loisirs", "occLoisirs", "loisirs"),
        ligne("Déplacements", "occDeplacements", "deplacements"),
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
      const autonomie = Occup.phraseAvq(d.avq, "scolaire", a);
      if (autonomie) l.push("Autonomie en classe : " + autonomie);
      out.ecole = l.join("\n");
    }

    // Questionnaire d'autonomie rempli par les parents
    out.avqParents = Occup.redigerAvqParents(d.avqParents, reg.avqLibelles, a);

    // Bilans centrés sur l'occupation
    out.mcro = Occup.redigerMcro(d.mcro, a);
    out.othope = Occup.redigerOthope(d.othope, a);
    out.cartesActivites = Occup.redigerCartes("activites", d.cartes.activites, a);
    out.cartesSensoriel = Occup.redigerCartes("sensoriel", d.cartes.sensoriel, a);

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
        let t = a.sujet + " copie " + formaterNombre(r.vitesse) + " caractères en 5 minutes, soit " + formaterNombre(r.cpm, 1) + " caractères par minute" + (r.mpm !== null ? " (" + formaterNombre(r.mpm, 2) + " mots par minute)" : "") + ".";
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
          t += ", soit une déviation standard de " + formaterDS(r.dsQ) + " : la qualité de l'écriture se situe " + s[0] + " attendue " + (r.referenceQualite || r.referenceTexte) + s[1] + ".";
        } else t += ". " + messageNormes(r, "qualite");
        puces.push(t);
      } else if (r.scores.some((s, i) => i > 1 && s > 0) || r.scores[0] !== null || r.scores[1] !== null) {
        puces.push("[Cotation incomplète : renseigner les critères 1 et 2.]");
      }

      const defauts = r.liste.map((c, i) => ({ c: c, s: r.scores[i], k: r.criteres[i] })).filter((x) => x.s).sort((x, y) => y.s - x.s || r.liste.indexOf(x.c) - r.liste.indexOf(y.c));
      if (defauts.length) {
        puces.push("Les défauts observés sont : " + joindre(defauts.map((x) => x.c.defaut + " (" +
          (x.c.mode === "lignes" ? x.s + (r.version === "ado" ? " phrase" : " ligne") + (x.s > 1 ? "s" : "") + " sur 5" : x.s + "/5") +
          (x.k.ds !== null ? ", DS " + formaterDS(x.k.ds) : "") + ")")) + ".");
        const horsNorme = defauts.filter((x) => x.k.niveau === "patho");
        if (horsNorme.length) {
          puces.push("Par rapport aux enfants de " + d.groupe + ", " + (horsNorme.length > 1 ? "les critères les plus atypiques sont " : "le critère le plus atypique est ") +
            joindre(horsNorme.map((x) => min(x.c.nom) + " (DS " + formaterDS(x.k.ds) + ")")) + ".");
        }
      }
      if (r.complet) {
        const preserves = r.domaines.filter((dm) => dm.total === 0 && dm.preserve).map((dm) => dm.preserve);
        if (preserves.length) puces.push(maj(joindre(preserves)) + ".");
      }
      const rem = REMARQUES.filter((x) => d.remarques.indexOf(x.id) >= 0).map((x) => min(x.label));
      if (rem.length) puces.push("Remarques : " + joindre(rem) + ".");
      const fautes = nombre(d.fautes);
      if (fautes !== null) puces.push(fautes + (fautes > 1 ? " fautes d'orthographe ou corrections" : " faute d'orthographe ou correction") + " sur les cinq premières lignes.");
      const eva = nombre(d.douleurEva);
      if (eva !== null) puces.push("Douleur après l'épreuve : EVA " + formaterNombre(eva) + "/10" + (d.douleurDetail.trim() ? " (" + d.douleurDetail.trim().replace(/\.$/, "") + ")" : "") + ".");

      const passation = Accueil.phrasePassation(d.passations.bhk);
      if (passation && puces.length) puces.push(passation);
      const l = [];
      if (puces.length) l.push("On observe sur l'épreuve du " + r.nomTest + " que :", ...puces.map((p) => "– " + p));
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
      if (t.ajuri) {
        const l = [Ajuri.rediger(t.ajuri, a, { appreciations: APPRECIATIONS, notes: t.notes, titre: t.titre })];
        const passation = Accueil.phrasePassation(d.passations[t.id]);
        if (passation) l.push(passation);
        return l.join("\n");
      }
      if (t.manos && t.manos.faites) {
        const l = [Manos.rediger(t.manos, a, { appreciations: APPRECIATIONS, raison: classeManos(d).raison, notes: t.notes })];
        const passation = Accueil.phrasePassation(d.passations[t.id]);
        if (passation) l.push(passation);
        return l.join("\n");
      }
      const lignes = t.lignes.filter((l) => l.remplie || l.commentaire);
      const l = [t.titre + " :"];
      lignes.forEach((x) => l.push("– " + (x.remplie ? phraseLigne(x) : point(x.epreuve + " : " + x.commentaire))));
      if (t.notes) l.push(point(maj(t.notes)));
      if (l.length === 1) l.push("[Résultats à compléter.]");
      const passation = Accueil.phrasePassation(d.passations[t.id]);
      if (passation) l.push(passation);
      return l.join("\n");
    };
    {
      const blocs = [];
      if (r.vitesse !== null) {
        let t = "En copie de texte (" + r.nomTest + "), " + a.sujetMin + " écrit " + formaterNombre(r.vitesse) + " caractères en 5 minutes, soit " + formaterNombre(r.cpm, 1) + " caractères par minute";
        t += r.dsV !== null ? " (DS " + formaterDS(r.dsV) + ", " + min(APPRECIATIONS[r.niveauV]) + ")." : ".";
        blocs.push(t);
      }
      tests.filter((t) => t.fait && t.section === "vitesse").forEach((t) => blocs.push(paragrapheTest(t)));
      out.vitesse = blocs.join("\n\n");
      out.clavier = d.clavier.fait === "oui" ? Clavier.rediger(d.clavier, a) : "";
    }
    {
      const blocs = tests.filter((t) => t.fait && t.section === "complementaires").map(paragrapheTest);
      if (d.manip.fait === "oui") {
        const l = ["Manipulations dans la main (Exner et Benbow) :"];
        MANIPULATIONS.forEach((it) => {
          const md = d.manip.md[it.id], mg = d.manip.mg[it.id];
          if (md === undefined && mg === undefined) return;
          const parts = [];
          if (md !== undefined) parts.push("main droite " + md + " (" + COTATION_MANIP[md] + ")");
          if (mg !== undefined) parts.push("main gauche " + mg + " (" + COTATION_MANIP[mg] + ")");
          l.push("– " + it.nom + " : " + parts.join(", ") + ".");
        });
        if (d.manip.notes.trim()) l.push(point(maj(d.manip.notes.trim())));
        if (l.length === 1) l.push("[Cotation à compléter.]");
        blocs.push(l.join("\n"));
      }
      const dcdq = Occup.redigerDcdq(d.dcdq, ageMois(d));
      if (dcdq) blocs.push(dcdq);
      const tdc = redigerTdc(d, reg);
      if (tdc) blocs.push(tdc);
      out.complementaires = blocs.join("\n\n");
    }

    // Évolution depuis le bilan précédent
    const evo = evolution(d, reg);
    const syntheseEvolution = (e) => {
      const par = (t) => e.lignes.filter((x) => x.tendance === t).map((x) => min(x.epreuve) + " (" + x.bilan + ")");
      return ["progres", "stable", "baisse"].map((t) => [t, par(t)]).filter((x) => x[1].length);
    };
    if (evo) {
      const l = ["Comparaison avec le bilan du " + dateCourte(evo.passation) + (evo.groupe ? " (" + evo.groupe + ")" : "") + "."];
      if (!evo.lignes.length) l.push("[Aucune mesure commune avec le bilan précédent : refaire au moins une épreuve pour comparer.]");
      else {
        syntheseEvolution(evo).forEach((x) => l.push("– " + TENDANCES[x[0]] + " : " + joindre(x[1]) + "."));
        l.push("Une évolution est retenue à partir d'un écart de " + formaterNombre(SEUIL_EVOLUTION_DS) + " DS (2 points pour la MCRO). Le détail figure dans le tableau ci-dessous.");
      }
      out.evolution = l.join("\n");
    } else out.evolution = "";

    // Auto-évaluation de l'écriture
    if (d.auto.fait === "oui") {
      const sa = syntheseAuto(d.auto, reg);
      const frequentes = sa.frequentes;
      const l = [reg.autoNom + ", rempli par " + a.sujetMin + " :"];
      if (sa.repondues) {
        const doms = sa.domaines.filter((dm) => dm.repondues).sort((x, y) => y.frequentes / y.repondues - x.frequentes / x.repondues);
        l.push("Les réponses de " + a.sujetMin + " signalent une difficulté fréquente (souvent ou toujours) pour " + frequentes + " question" + (frequentes > 1 ? "s" : "") + " sur " + sa.repondues +
          (doms.length ? " : " + doms.map((dm) => dm.nom.toLowerCase() + " " + dm.frequentes + " sur " + dm.repondues).join(", ") : "") + ".");
      } else l.push("[Réponses à saisir.]");
      // Version de synthèse ; d'anciennes notes écrites à la main (sans synthèse) restent reprises.
      const courte = d.auto.synthese.trim() || (d.auto.notes.trim() && d.auto.notesAuto !== "oui" ? d.auto.notes.trim() : syntheseAutoCourte(d, reg));
      if (courte) l.push(point(maj(courte)));
      out.autoeval = l.join("\n");
    } else out.autoeval = "";

    // Bilan seulement sensoriel : les sections du volet écriture restent vides.
    if (!ecritureCommencee(d) && (sensorielCommence(d) || Occup.commence(d))) ["personne", "environnementale", "observation", "bhk", "vitesse", "clavier"].forEach((k) => { out[k] = ""; });

    // Bilan sensoriel
    Object.assign(out, Senso.rediger(d.senso, a, { libelles: reg.esoLibelles, cotation: reg.esoCotation }));

    const ind = indicateurs(d, reg);

    // Diagnostic ergothérapique
    {
      const l = [];
      const ag = r.age ? formaterAge(r.age) : "";
      let p = a.sujet + " est " + a.un + " enfant" + (ag ? " de " + ag : "") + (TOUTES_CLASSES.indexOf(d.groupe) >= 0 ? ", scolarisé" + a.e + " en " + d.groupe : "") + ".";
      const diagnostic = Accueil.phraseDiagnostic(d);
      if (diagnostic) p += " " + diagnostic;
      if (d.conclusionContexte.trim()) p += " " + point(maj(d.conclusionContexte.trim()));
      l.push(p, "", "Synthèse des constats :");
      const liste = (titre, items) => {
        l.push(titre);
        items.forEach((x, i) => l.push("– " + x + (i === items.length - 1 ? "." : " ;")));
      };
      const pers = ind.constats.concat(lignesDe(d.conclusionPoints).map((x) => min(x).replace(/\.$/, "")));
      liste("Sur le plan de la personne :", pers.length ? pers : ["[constats à compléter]"]);
      const env = [];
      if (d.ecoleAmenagements.trim()) env.push("aménagements en place : " + min(d.ecoleAmenagements.trim()).replace(/\.$/, ""));
      if (d.envObstacles.trim()) env.push("obstacles : " + min(d.envObstacles.trim()).replace(/\.$/, ""));
      if (d.envFacilitateurs.trim()) env.push("facilitateurs : " + min(d.envFacilitateurs.trim()).replace(/\.$/, ""));
      if (env.length) liste("Sur le plan de l'environnement :", env);
      const occ = occupationsRetenues(d, propositionsDiagnostic(d, reg)).map((o) => o.texte);
      const occItems = [];
      if (occ.length) occItems.push("difficultés dans " + joindre(occ));
      ind.occupations.forEach((x) => occItems.push(x));
      if (d.diagImpact.trim()) occItems.push(min(d.diagImpact.trim()).replace(/\.$/, ""));
      if (occItems.length) liste("Sur le plan des occupations :", occItems);
      if (evo && evo.lignes.some((x) => x.tendance)) {
        liste("Évolution depuis le bilan du " + dateCourte(evo.passation) + " :", syntheseEvolution(evo).map((x) => min(TENDANCES[x[0]]) + " : " + joindre(x[1])));
      }

      let enonce;
      if (!ind.facteurs.length && !occ.length) enonce = "[Diagnostic à rédiger une fois les bilans saisis.]";
      else {
        enonce = a.sujet + " présente des difficultés " + (occ.length ? "dans " + joindre(occ) : "[occupations à préciser]") +
          (ind.facteurs.length ? ", en lien avec " + joindre(ind.facteurs) : "") +
          (d.envObstacles.trim() ? " ; facteurs environnementaux : " + min(d.envObstacles.trim()).replace(/\.$/, "") : "") + ".";
      }
      l.push("", "Diagnostic ergothérapique : " + enonce);
      const appuiSur = sourcesDiagnostic(d, reg);
      if (appuiSur.length && (ind.facteurs.length || occ.length)) l.push("Ce diagnostic s'appuie sur " + joindre(appuiSur) + ", ainsi que sur l'entretien avec " + a.sujetMin + " et sa famille.");
      const appui = [];
      if (d.conclusionForces.trim()) appui.push(min(d.conclusionForces.trim()).replace(/\.$/, ""));
      if (d.reperage === "bon") appui.push("une bonne prise d'informations visuelles en copie");
      if (appui.length) l.push("Points d'appui : " + appui.join(" ; ") + ".");
      out.conclusion = l.join("\n");
    }

    // Objectifs et préconisations
    {
      const l = [];
      const objectifs = lignesDe(d.objectifsLibre).map((x) => maj(x).replace(/\.$/, "")).concat(ind.objectifs);
      if (objectifs.length) {
        l.push("Objectifs d'intervention :");
        objectifs.forEach((x) => l.push("– " + x + "."));
      }
      const lien = (p) => {
        const cle = p.raisons.find((k) => ind.raisons[k]);
        return cle ? " (en lien avec " + ind.raisons[cle].replace(/ \(/g, ", ").replace(/\)/g, "") + ")" : "";
      };
      CATEGORIES_PRECO.forEach((cat) => {
        const items = PRECONISATIONS.filter((p) => p.cat === cat.id && d.amenagements.indexOf(p.id) >= 0).map((p) => p.texte + lien(p));
        if (cat.id === "scolaire") lignesDe(d.amenagementsLibre).forEach((x) => items.push(maj(x).replace(/\.$/, "")));
        const modalites = cat.id === "reeducation" && d.reeducationObjet.trim();
        if (!items.length && !modalites) return;
        if (l.length) l.push("");
        l.push((cat.id === "scolaire" && d.dispositif ? "Aménagements scolaires à formaliser dans un " + d.dispositif : cat.titre) + " :");
        items.forEach((x) => l.push("– " + x + "."));
        if (modalites) l.push("Modalités : " + point(d.reeducationObjet.trim()));
      });
      if (d.reevaluation.trim()) l.push("", "Une réévaluation est proposée dans " + d.reevaluation.trim() + ".");
      lignesDe(d.precoLibre).forEach((x) => l.push(point(maj(x))));
      const orientation = Accueil.phraseOrientation(d, a.sujetMin);
      if (orientation) { if (l.length) l.push(""); l.push(orientation); }
      out.preconisations = l.length ? l.join("\n") : "[Préconisations à compléter : cochez celles que l'outil propose d'après le bilan.]";
    }

    out.salutations = "En espérant que ces éléments aideront à la scolarisation de " + a.sujetMin + ", je vous adresse, Madame, Monsieur, l'expression de mes sincères salutations.";

    // Synthèse pour l'école : constats, points d'appui, aménagements, suivi (sans données familiales ni médicales).
    {
      const l = ["Bilan en ergothérapie réalisé le " + (dateLongue(d.passation) || "[date]") + "."];
      const enonce = /Diagnostic ergothérapique : (.*)$/m.exec(out.conclusion);
      if (enonce && !/^\[/.test(enonce[1])) l.push(enonce[1]);
      if (ind.constats.length) {
        l.push("Le bilan met en évidence :");
        ind.constats.forEach((x, i) => l.push("– " + x + (i === ind.constats.length - 1 ? "." : " ;")));
      }
      out.ecoleBilan = l.join("\n");
    }
    {
      const appui = [];
      if (d.conclusionForces.trim()) appui.push(maj(d.conclusionForces.trim()).replace(/\.$/, ""));
      if (d.reperage === "bon") appui.push("Bonne prise d'informations visuelles en copie");
      out.ecoleAppui = appui.map((x) => "– " + x + ".").join("\n");
    }
    {
      const l = [];
      if (d.dispositif) l.push("Ces aménagements sont à formaliser dans un " + d.dispositif + ".");
      const items = PRECONISATIONS.filter((p) => (p.cat === "scolaire" || p.cat === "sensoriel") && d.amenagements.indexOf(p.id) >= 0).map((p) => p.texte);
      lignesDe(d.amenagementsLibre).forEach((x) => items.push(maj(x).replace(/\.$/, "")));
      items.forEach((x) => l.push("– " + x + "."));
      out.ecoleAmenagements = items.length ? l.join("\n") : "[Aménagements à cocher dans l'onglet Compte rendu.]";
    }
    {
      const l = [];
      const reed = PRECONISATIONS.filter((p) => p.cat === "reeducation" && d.amenagements.indexOf(p.id) >= 0).map((p) => min(p.texte));
      if (reed.length) l.push("Un accompagnement en ergothérapie est proposé : " + joindre(reed) + ".");
      if (d.reeducationObjet.trim()) l.push("Modalités : " + point(d.reeducationObjet.trim()));
      if (d.reevaluation.trim()) l.push("Une réévaluation est prévue dans " + d.reevaluation.trim() + ".");
      out.ecoleSuivi = l.join("\n");
    }
    return out;
  }

  /* ================= Données des graphiques ================= */

  function donneesGraphiques(dossier, reglages) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const r = calculerBHK(d, reg);
    const seuils = { patho: reg.seuilPatho, inferieur: reg.seuilInferieur, superieur: reg.seuilSuperieur };
    const g = {};
    // Profil des résultats : toutes les mesures en DS (la qualité du BHK dans le sens « plus haut = mieux »).
    const lignes = [];
    if (r.complet && r.perfQ !== null) lignes.push({ bilan: r.nomTest, epreuve: "Qualité", ds: r.perfQ, niveau: r.niveauQ });
    if (r.dsV !== null) lignes.push({ bilan: r.nomTest, epreuve: "Vitesse", ds: r.dsV, niveau: r.niveauV });
    calculerTests(d, reg).filter((t) => t.fait).forEach((t) => t.lignes.filter((l) => l.ds !== null).forEach((l) => lignes.push({ bilan: t.court, epreuve: l.epreuve, ds: l.ds, niveau: l.niveau })));
    g["profil-ds"] = lignes.length >= 2 ? { lignes: lignes, seuils: seuils } : null;
    g.manos = d.tests.manos.fait === "oui" ? Manos.donneesGraphique(calculManos(d, reg), seuils) : null;
    g["bhk-criteres"] = r.complet ? {
      titre: "Score de chaque critère (" + r.nomTest + ")",
      seuils: seuils, inverse: reg.inverserQualite, normes: r.criteres.some((c) => c.niveau),
      reference: r.cle ? (r.ref === "classe" ? "les enfants de " + r.cle : "les enfants de " + r.cle + " ans") : "",
      criteres: r.liste.map((c, i) => ({ id: String(c.id), nom: c.nom, score: r.scores[i] || 0, ds: r.criteres[i].ds, niveau: r.criteres[i].niveau })),
    } : null;
    const m = Occup.calculMcro(d.mcro);
    g.mcro = d.mcro.fait === "oui" && m.problemes.some((p) => p.r1 !== null || p.s1 !== null) ? { problemes: m.problemes, reeval: m.reeval } : null;
    const q = Occup.calculDcdq(d.dcdq, ageMois(d));
    g.dcdq = d.dcdq.fait === "oui" && q.complet ? { facteurs: q.facteurs, total: q.total, seuil: q.bande ? q.bande.seuil : null, indication: q.indication } : null;
    const e = evolution(d, reg);
    if (e && d.precedent) {
      const avant = {};
      d.precedent.mesures.forEach((x) => { avant[x.cle] = x; });
      const ls = mesures(d, reg).filter((x) => x.perf !== null && avant[x.cle] && avant[x.cle].perf !== null)
        .map((x) => ({ bilan: x.bilan, epreuve: x.epreuve, avant: avant[x.cle].perf, apres: x.perf }));
      g.evolution = ls.length ? { lignes: ls, seuils: seuils, date: dateCourte(e.passation) } : null;
    } else g.evolution = null;
    return g;
  }

  function blocGraphique(g, id) {
    return g[id] ? [{ type: "graphique", id: id, donnees: g[id], alt: TITRES_GRAPHIQUES[id], largeurCm: LARGEURS_GRAPHIQUES[id] }] : [];
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
    const g = donneesGraphiques(d, reg);

    blocs.push({ type: "titre", texte: "Compte rendu de bilan en ergothérapie" });

    // Informations sur l'enfant
    const nomComplet = [texte(d.nom).trim().toUpperCase(), texte(d.prenom).trim()].filter(Boolean).join(" ");
    const lignesInfo = (titre, paires) => [{ entete: true, cellules: [cellule(titre, { colspan: 2, gras: true, fond: "entete", align: "center" })] }]
      .concat(paires.map((p) => ({ cellules: [cellule(p[0], { gras: true }), cellule(texte(p[1]).trim() || "–")] })));
    const scol = [texte(d.etablissement).trim(), TOUTES_CLASSES.indexOf(d.groupe) >= 0 ? d.groupe : "", texte(d.enseignant).trim()].filter(Boolean).join(", ");
    blocs.push({ type: "h", niveau: 2, texte: "Informations sur l'enfant" });
    blocs.push({ type: "tableau", largeurs: [0.34, 0.66], lignes: []
      .concat(lignesInfo("Administratif", [["Nom, prénom", nomComplet], ["Date de naissance", dateCourte(d.naissance)], ["Âge au bilan", r.age ? formaterAge(r.age) : ""], ["Parents", d.parents], ["Adresse", d.adresse]]))
      .concat(lignesInfo("Prescription et suivi", [["Date du bilan", dateCourte(d.passation)], ["Médecin prescripteur", d.prescripteur]].concat(Accueil.lignesPco(d))))
      .concat(lignesInfo("Scolarité", [["Établissement scolaire, classe", scol]])) });

    const emis = {};
    SECTIONS.forEach((s) => {
      if (s.recap) {
        const recap = blocsRecap(r, tests, reg, d);
        blocs.push.apply(blocs, recap);
        if (recap.length) blocs.push.apply(blocs, blocGraphique(g, "profil-ds"));
      }
      const t = tx(s.id);
      if (!texte(t).trim()) return;
      (s.groupes || []).forEach((g) => {
        if (emis[g]) return;
        emis[g] = true;
        blocs.push({ type: "h", niveau: GROUPES[g][0], texte: titreSection(GROUPES[g][1], d) });
      });
      if (s.niveau) blocs.push({ type: "h", niveau: s.niveau, texte: titreSection(s.titre, d) });
      blocs.push.apply(blocs, texteVersBlocs(t));
      if (s.id === "autoeval" && d.auto.fait === "oui") {
        const sa = syntheseAuto(d.auto, reg);
        if (sa.nums.length) {
          const ligneQ = (n) => ({ cellules: [cellule(n + ". " + (texte(reg.autoQuestions[n - 1]).trim() || "Question " + n))]
            .concat(ECHELLE_AUTO.map((e, k) => cellule(d.auto.reponses[n] === k ? "X" : "", { align: "center", gras: true }))) });
          let lignes = [];
          const rangees = sa.domaines.reduce((acc, dm) => acc.concat(dm.questions), []);
          if (sa.domaines.length) {
            sa.domaines.forEach((dm) => {
              const qs = dm.questions.filter((n) => sa.nums.indexOf(n) >= 0);
              if (!qs.length) return;
              lignes.push({ cellules: [cellule(dm.nom + " : difficulté fréquente pour " + dm.frequentes + " question" + (dm.frequentes > 1 ? "s" : "") + " sur " + dm.repondues, { colspan: 6, gras: true, fond: "niveau-moyenne" })] });
              lignes = lignes.concat(qs.map(ligneQ));
            });
            const autres = sa.nums.filter((n) => rangees.indexOf(n) < 0);
            if (autres.length) lignes.push({ cellules: [cellule("Autres questions", { colspan: 6, gras: true, fond: "niveau-moyenne" })] });
            lignes = lignes.concat(autres.map(ligneQ));
          } else lignes = sa.nums.map(ligneQ);
          blocs.push({ type: "tableau", largeurs: [0.5, 0.1, 0.1, 0.1, 0.1, 0.1], petit: true, entetes: true, lignes: [
            { entete: true, cellules: [cellule("Question", { gras: true, fond: "entete" })].concat(ECHELLE_AUTO.map((e, k) => cellule(e + " (" + k + ")", { gras: true, fond: "entete", align: "center" }))) },
          ].concat(lignes).concat([{ cellules: [cellule("Nombre de réponses dans chaque colonne", { gras: true, align: "right" })].concat(sa.colonnes.map((n) => cellule(String(n), { align: "center", gras: true }))) }]) });
        }
      }
      if (s.id === "bhk") blocs.push.apply(blocs, blocGraphique(g, "bhk-criteres"));
      if (s.id === "complementaires") blocs.push.apply(blocs, blocGraphique(g, "manos").concat(blocGraphique(g, "dcdq")));
      if (s.id === "bhk" && d.photoCopie) blocs.push({ type: "photo", donnees: d.photoCopie, l: nombre(d.photoL), h: nombre(d.photoH), alt: "Copie du BHK", largeurCm: 15 });
      if (s.id === "mcro") blocs.push.apply(blocs, blocsMcro(d).concat(blocGraphique(g, "mcro")));
      if (s.id === "evolution") blocs.push.apply(blocs, blocsEvolution(d, reg).concat(blocGraphique(g, "evolution")));
      (s.graphiques || []).forEach((id) => {
        if (Senso.aDesDonnees(d.senso, id)) blocs.push({ type: "graphique", id: id, alt: TITRES_GRAPHIQUES[id], largeurCm: LARGEURS_GRAPHIQUES[id] });
      });
    });

    const sig = signataire(reg);
    if (sig && (sig.nom || sig.titre)) blocs.push({ type: "signature", texte: [sig.nom, sig.titre].filter(Boolean).join(", ") });

    return Object.assign({ titre: "Bilan en ergothérapie" + (nomComplet ? " – " + nomComplet : ""), blocs: blocs }, papier(reg));
  }

  // Bilan synthétique : l'essentiel en une ou deux pages, avec le diagnostic ergothérapique.
  function modeleBilanSynthese(dossier, reglages, textes) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const r = calculerBHK(d, reg);
    const tests = calculerTests(d, reg);
    const gen = rediger(d, reg);
    const tx = (id) => texte(textes && typeof textes[id] === "string" ? textes[id] : gen[id]).trim();
    const nomComplet = [texte(d.nom).trim().toUpperCase(), texte(d.prenom).trim()].filter(Boolean).join(" ");
    const scol = [TOUTES_CLASSES.indexOf(d.groupe) >= 0 ? d.groupe : "", texte(d.etablissement).trim()].filter(Boolean).join(", ");
    const blocs = [{ type: "titre", texte: "Bilan en ergothérapie : synthèse" }];
    const infos = [["Nom, prénom", nomComplet], ["Date de naissance, âge", [dateCourte(d.naissance), r.age ? formaterAge(r.age) : ""].filter(Boolean).join(", ")],
      ["Classe, établissement", scol], ["Date du bilan", dateCourte(d.passation)], ["Médecin prescripteur", d.prescripteur]]
      .filter((x) => texte(x[1]).trim());
    if (infos.length) blocs.push({ type: "tableau", largeurs: [0.34, 0.66], lignes: infos.map((x) => ({ cellules: [cellule(x[0], { gras: true, fond: "entete" }), cellule(texte(x[1]).trim())] })) });
    const section = (titre, t) => { if (!t) return; blocs.push({ type: "h", niveau: 2, texte: titre }); blocs.push.apply(blocs, texteVersBlocs(t)); };
    section("Motif du bilan", tx("motif"));
    section("Bilans réalisés", tx("bilans"));
    const recap = blocsRecap(r, tests, reg, d);
    if (recap.length) {
      blocs.push({ type: "h", niveau: 2, texte: "Résultats principaux" });
      blocs.push.apply(blocs, recap.filter((b) => b.type !== "h"));
    }
    section("Diagnostic ergothérapique", tx("conclusion"));
    section("Objectifs et préconisations", tx("preconisations"));
    blocs.push({ type: "p", petit: true, runs: [{ t: "Ce document résume le bilan. Le compte rendu complet détaille l'ensemble des observations, des résultats et des questionnaires.", i: true }] });
    const sig = signataire(reg);
    if (sig && (sig.nom || sig.titre)) blocs.push({ type: "signature", texte: [sig.nom, sig.titre].filter(Boolean).join(", ") });
    return Object.assign({ titre: "Synthèse du bilan en ergothérapie" + (nomComplet ? " – " + nomComplet : ""), blocs: blocs }, papier(reg));
  }

  function signataire(reg) { return reg.praticiens[reg.signataire] || reg.praticiens[0]; }

  // En-tête (cabinet, praticiens) et pied de page communs aux documents.
  function papier(reg) {
    const sig = signataire(reg);
    return {
      entete: {
        logo: reg.logoCabinet || null,
        cabinet: { nom: reg.cabinet.nom, lignes: texte(reg.cabinet.adresse).split("\n").map((x) => x.trim()).filter(Boolean) },
        praticiens: reg.praticiens.filter((p) => p.nom).map((p) => ({
          nom: p.nom, lignes: [p.titre, p.tel, p.email, p.siret ? "N° SIRET : " + p.siret : "", p.adeli ? "N° ADELI : " + p.adeli : ""].filter(Boolean),
        })),
      },
      pied: sig ? [
        [sig.nom, sig.titre].filter(Boolean).join(" – "),
        [sig.tel, sig.email].filter(Boolean).join(" – "),
        sig.adresse || texte(reg.cabinet.adresse).split("\n").join(", "),
      ].filter((x) => x && x.trim()) : [],
    };
  }

  function blocsMcro(d) {
    if (d.mcro.fait !== "oui") return [];
    const m = Occup.calculMcro(d.mcro);
    if (!m.problemes.length) return [];
    const f = (v) => (v === null ? "–" : formaterNombre(v, Number.isInteger(v) ? 0 : 1));
    const c = (t, o) => cellule(t, Object.assign({ align: "center" }, o || {}));
    const entetes = ["Activité", "Importance", "Rendement", "Satisfaction"].concat(m.reeval ? ["Rendement (réév.)", "Satisfaction (réév.)"] : []);
    const lignes = [{ entete: true, cellules: entetes.map((x, i) => cellule(x, { gras: true, fond: "entete", align: i ? "center" : null })) }];
    m.problemes.forEach((p) => lignes.push({ cellules: [cellule(maj(p.activite)), c(f(p.importance)), c(f(p.r1)), c(f(p.s1))].concat(m.reeval ? [c(f(p.r2)), c(f(p.s2))] : []) }));
    const fm = (v) => (v === null ? "–" : formaterNombre(v, 1));
    lignes.push({ cellules: [cellule("Moyenne", { gras: true }), c(""), c(fm(m.r1), { gras: true }), c(fm(m.s1), { gras: true })].concat(m.reeval ? [c(fm(m.r2), { gras: true }), c(fm(m.s2), { gras: true })] : []) });
    return [{ type: "tableau", largeurs: m.reeval ? [0.32, 0.13, 0.13, 0.14, 0.14, 0.14] : [0.46, 0.18, 0.18, 0.18], entetes: true, petit: true, lignes: lignes }];
  }

  function blocsEvolution(d, reg) {
    const e = evolution(d, reg);
    if (!e || !e.lignes.length) return [];
    const fonds = { progres: "niveau-moyenne", baisse: "niveau-inferieur" };
    const lignes = [{ entete: true, cellules: ["Bilan", "Épreuve", "Bilan du " + dateCourte(e.passation), "Ce bilan", "Évolution"].map((x) => cellule(x, { gras: true, fond: "entete" })) }];
    e.lignes.forEach((x) => lignes.push({ cellules: [
      cellule(x.bilan, { gras: true }), cellule(x.epreuve), cellule(x.avant, { align: "center" }), cellule(x.apres, { align: "center" }),
      cellule([{ t: x.tendance ? TENDANCES[x.tendance] : "–" }].concat(x.ecart ? [{ t: " (" + x.ecart + ")", i: true }] : []), { fond: fonds[x.tendance] || null }),
    ] }));
    return [{ type: "tableau", largeurs: [0.13, 0.25, 0.2, 0.2, 0.22], entetes: true, petit: true, lignes: lignes }];
  }

  // Synthèse courte pour l'équipe éducative (second document Word).
  function modeleSyntheseEcole(dossier, reglages, textes) {
    const d = normaliserDossier(dossier);
    const reg = normaliserReglages(reglages);
    const gen = rediger(d, reg);
    const tx = (id) => (textes && typeof textes[id] === "string" ? textes[id] : gen[id]);
    const sig = signataire(reg);
    const nomComplet = [texte(d.prenom).trim(), texte(d.nom).trim().toUpperCase()].filter(Boolean).join(" ");
    const scol = [TOUTES_CLASSES.indexOf(d.groupe) >= 0 ? d.groupe : "", texte(d.etablissement).trim()].filter(Boolean).join(", ");
    const blocs = [
      { type: "titre", texte: "Synthèse du bilan en ergothérapie" },
      { type: "p", runs: [{ t: "À l'attention de l'équipe éducative", i: true }] },
      { type: "tableau", largeurs: [0.34, 0.66], lignes: [
        ["Élève", nomComplet], ["Classe, établissement", scol], ["Date du bilan", dateCourte(d.passation)],
        ["Ergothérapeute", sig ? [sig.nom, sig.titre].filter(Boolean).join(", ") : ""],
      ].map((p) => ({ cellules: [cellule(p[0], { gras: true }), cellule(texte(p[1]).trim() || "–")] })) },
    ];
    SECTIONS_ECOLE.forEach((s) => {
      const t = tx(s.id);
      if (!texte(t).trim()) return;
      blocs.push({ type: "h", niveau: s.niveau, texte: s.titre });
      blocs.push.apply(blocs, texteVersBlocs(t));
    });
    const contact = sig ? [sig.tel, sig.email].filter((x) => texte(x).trim()) : [];
    if (contact.length) blocs.push({ type: "p", runs: [{ t: "Pour toute question, vous pouvez me joindre : " + contact.join(" ou ") + "." }] });
    if (sig && (sig.nom || sig.titre)) blocs.push({ type: "signature", texte: [sig.nom, sig.titre].filter(Boolean).join(", ") });
    return Object.assign({ titre: "Synthèse pour l'école" + (nomComplet ? " – " + nomComplet : ""), blocs: blocs }, papier(reg));
  }

  function blocsRecap(r, tests, reg, d) {
    const lignes = [];
    const ajout = (bilan, epreuve, score, ds, niv, commentaire) => lignes.push({ cellules: [
      cellule(bilan, { gras: true }), cellule(epreuve), cellule(score, { align: "center" }), cellule(ds === null ? "–" : formaterDS(ds), { align: "center" }),
      cellule([{ t: niv ? APPRECIATIONS[niv] : "–" }].concat(commentaire ? [{ t: " – " + commentaire, i: true }] : []), { fond: niv ? "niveau-" + niv : null }),
    ] });
    if (r.complet) ajout(r.nomTest, "Qualité", r.total + "/" + r.max, r.dsQ, r.niveauQ, "");
    if (r.vitesse !== null) ajout(r.nomTest, "Vitesse", formaterNombre(r.vitesse) + " car. en 5 min", r.dsV, r.niveauV, "");
    const types = new Set(["ds"]);
    tests.filter((t) => t.fait).forEach((t) => t.lignes.filter((l) => l.remplie).forEach((l) => {
      types.add(l.type);
      ajout(t.court, l.epreuve, l.valeurCourte ? l.valeurCourte : l.type === "ds" ? "–" : l.valeurTexte.replace(/^note standard /, "NS ").replace(/^indice /, "").replace(/^rang percentile /, "RP "), l.ds, l.niveau, l.commentaire);
    }));
    if (d && d.dcdq.fait === "oui") {
      const q = Occup.calculDcdq(d.dcdq, ageMois(d));
      if (q.complet) {
        const app = q.indication === true ? "Risque de TDC" : q.indication === false ? "Probablement pas de TDC" : q.hors ? "Hors âge (5-14 ans 11 mois)" : "Âge à renseigner";
        lignes.push({ cellules: [cellule("DCDQ-FE", { gras: true }), cellule("Score total"), cellule(q.total + "/75", { align: "center" }), cellule("–", { align: "center" }),
          cellule([{ t: app }].concat(q.bande ? [{ t: " – seuil " + q.bande.seuil, i: true }] : []), { fond: q.indication === true ? "niveau-patho" : q.indication === false ? "niveau-moyenne" : null })] });
      }
    }
    if (!lignes.length) return [];

    const z = zonesLegende(reg);
    const legende = [{ entete: true, cellules: [cellule("Score", { gras: true, fond: "entete" })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(APPRECIATIONS[k], { gras: true, fond: "niveau-" + k, align: "center" }))) }];
    legende.push({ cellules: [cellule("Déviation standard (DS)", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.ds[k], { align: "center" }))) });
    if (types.has("ns")) legende.push({ cellules: [cellule("Note standard (NS)", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.ns[k], { align: "center" }))) });
    if (types.has("indice")) legende.push({ cellules: [cellule("Indice", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.indice[k], { align: "center" }))) });
    if (types.has("rp")) legende.push({ cellules: [cellule("Rang percentile (RP)", { gras: true })].concat(["patho", "inferieur", "moyenne", "superieur"].map((k) => cellule(z.rp[k], { align: "center" }))) });

    const ref = !r.cle ? "" : r.version === "ado"
      ? "Normes BHK ado : vitesse en " + r.cle + ", qualité " + r.referenceQualite + "."
      : "Normes BHK : " + (r.ref === "classe" ? "classe de " + r.cle : r.cle + " ans") + ", " + r.sexeTexte + ".";
    const intro = "Les scores sont exprimés en déviation standard (DS) : ils représentent l'écart entre le résultat obtenu et la moyenne attendue." +
      (reg.inverserQualite && r.complet ? " Pour la qualité du BHK, un DS négatif signale une écriture plus dégradée que la moyenne." : "");
    return [
      { type: "h", niveau: 2, texte: "Tableau récapitulatif des bilans réalisés" },
      { type: "p", runs: [{ t: intro }] },
      { type: "tableau", largeurs: [0.2, 0.2, 0.2, 0.2, 0.2], petit: true, lignes: legende },
      { type: "tableau", largeurs: [0.13, 0.27, 0.17, 0.1, 0.33], entetes: true, lignes: [{ entete: true, cellules: ["Bilan", "Épreuve", "Score", "DS", "Appréciation"].map((x) => cellule(x, { gras: true, fond: "entete" })) }].concat(lignes) },
    ].concat(ref ? [{ type: "p", runs: [{ t: ref, i: true }], petit: true }] : [])
      .concat(types.has("ajuri") ? [{ type: "p", runs: [{ t: "Ajuriaguerra : l'étalonnage donne la moyenne des lettres écrites en 1 minute, sans écart-type ; le résultat est exprimé en pourcentage de cette moyenne et l'appréciation est celle de l'ergothérapeute.", i: true }], petit: true }] : []);
  }

  /* ================= Export ================= */

  return {
    SCORE_MAX, NB_LIGNES, SCORE_TOTAL_MAX, CLASSES, AGES, DOMAINES, CRITERES, BAREME_TAILLE, REMARQUES, MODES_COPIE,
    PRISES, GRILLE, TYPES_SCORE, TESTS, BILANS_COURANTS, AMENAGEMENTS, PRECONISATIONS, CATEGORIES_PRECO, OCCUPATIONS, DISPOSITIFS, SECTIONS, APPRECIATIONS,
    proposerPreconisations, ecritureCommencee, CLASSES_ADO, TOUTES_CLASSES, CRITERES_ADO, DOMAINES_ADO, versionBHK, MANIPULATIONS, COTATION_MANIP, ECHELLE_AUTO, NB_QUESTIONS_AUTO, DOMAINES_AUTO, QUESTIONS_AUTO, NOM_AUTO, syntheseAuto, syntheseAutoTexte, syntheseAutoCourte,
    nombre, maj, min, age, formaterAge, formaterDS, formaterNombre, dateCourte, dateLongue, aujourdhui, quantileNormal,
    normesVides, normaliserNormes, reglagesParDefaut, normaliserReglages, praticienVide,
    dossierVide, normaliserDossier, pointsTaille, niveau, dsLigne, zonesLegende,
    calculerBHK, calculerTests, rediger, titreSection, texteVersBlocs, modeleDocument,
    SECTIONS_ECOLE, modeleSyntheseEcole, modeleBilanSynthese, CHAMPS_DIAG, propositionsDiagnostic, occupationsRetenues, sourcesDiagnostic, mesures, instantane, evolution, TENDANCES, normesPresentes, ageMois,
    donneesGraphiques, TITRES_GRAPHIQUES, LARGEURS_GRAPHIQUES, accords, indicateurs, papier, cellule,
    classeManos, calculManos, calculAjuri,
    reperesTdc, SOURCE_TDC, ETATS_TDC, repartition, PHRASES_EXEMPLES,
  };
});
