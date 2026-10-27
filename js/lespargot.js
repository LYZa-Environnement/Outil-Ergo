/*
 * Outil Ergo : Lespargot, évaluation des lenteurs d'écriture, épreuve de copie.
 * Un texte par niveau (CE1, CE2, CM1, CM2, 6e, 4e, 2nde) ; l'enfant le recopie, on chronomètre.
 * Résultat en mots par minute (MPM), comparé à la moyenne et à l'écart-type de la classe
 * (feuille de cotation « LESPARGOT (copie) » du cabinet) : DS = (MPM − moyenne) / écart-type.
 * Aucune dépendance au navigateur : utilisable dans la page et dans les tests Node.
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique();
  else racine.Lespargot = fabrique();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function nombre(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const t = String(v).replace(",", ".").trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  function texte(v, max) { const t = typeof v === "string" ? v : v === null || v === undefined ? "" : String(v); return max ? t.slice(0, max) : t; }
  function fr(v, dec) { const p = Math.pow(10, dec === undefined ? 1 : dec); return String(Math.round(v * p) / p).replace(".", ","); }
  function maj(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function point(t) { t = texte(t).trim(); return !t ? "" : /[.!?…]$/.test(t) ? t : t + "."; }

  /* ---------- Textes à recopier (fichiers « Lenteur de l'écriture » du cabinet) ---------- */
  const TEXTES = {
    CE1: { titre: "Les rossignols", texte: "Les six petits rossignols restent sagement dans le nid bien chaud pendant que leur maman vole aux alentours." },
    CE2: { titre: "Un beau cadeau", texte: "Françoise a reçu un magnifique livre illustré. Elle rit. Papa et maman la récompensent pour son travail. Elle embrasse ses parents. « Ce soir, je le couvrirai avec soin, je le rangerai dans la bibliothèque car je tiens à mes livres ! »" },
    CM1: { titre: "Le petit chat", source: "Extrait des Contes des quatre vents",
      texte: "Ils sortirent des bois et s’engagèrent sur une route. Et tout à coup, le petit chaton aperçut sa maison. De joie, il redressa sa queue toute droite et courut de toute la vitesse de ses petites pattes. Et en arrivant il déclara, encore tout essoufflé de sa course : Jamais, jamais plus je n’irai seul dans les bois…" },
    CM2: { titre: "Géographie aérienne",
      texte: "Quand on s’élève, grâce à l’avion, l’esprit doit faire un effort d’imagination devant ces aspects inhabituels qu’offrent les paysages. Ce filet d’eau, c’est un fleuve que vous traversez difficilement à la nage.\nCette tache verte, c’est la forêt dans laquelle vous vous êtes égarés. Ces rubans qui se déroulent interminablement jusqu’à cet horizon, sans cesse, reculé, sont des routes, et ces mouches qui s’y promènent sont des automobiles…\nQue de surprises… Mais quelle manière agréable d’assurer ses connaissances géographiques." },
    "6e": { titre: "Goûter après la baignade",
      texte: "Il fait très beau, très chaud, et la piscine est pleine de monde. De tous les côtés, ça saute, ça crie. Les rires et les éclaboussures se mélangent, et on a l’impression qu’on ne pourra jamais trouver sa place dans toute cette pagaille éblouissante. Heureusement, le bassin est en forme de grand haricot, et il y a des espaces où l’on peut nager. Enfin, juste quelques brasses, avant de prendre un ballon sur la tête. Mais ce qui est magique, c’est que dès qu’on est dans l’eau, on ne sent plus du tout cette excitation. On est simplement bien, tout souple et léger, tout frais surtout." },
    "4e": { titre: "", source: "Amélie Nothomb, Métaphysique des tubes, p. 36, Albin Michel, 2000",
      texte: "Les yeux des êtres vivants possèdent la plus étonnante des propriétés : le regard. Il n’y a pas plus singulier. On ne dit pas des oreilles des créatures qu’elles ont un « écoutard », ni de leurs narines qu’elles ont un « sentard » ou un « reniflard ». Qu’est-ce que le regard ? C’est inexprimable. Aucun mot ne peut approcher son essence étrange. Et pourtant, le regard existe. Il y a même peu de réalité qui existe à ce point. Quelle est la différence entre les yeux qui ont un regard et les yeux qui n’en n’ont pas ? Cette différence à un nom : c’est la vie. La vie commence là où commence le regard." },
    "2nde": { titre: "", source: "Antoine de Saint-Exupéry, Le Petit Prince, Gallimard",
      texte: "Il y a des millions d’années que les fleurs fabriquent des épines. Il y a des millions d’années que les moutons mangent quand même les fleurs. Et ce n’est pas sérieux de chercher à comprendre pourquoi elles se donnent tant de mal pour se fabriquer des épines qui ne servent jamais à rien ? Ce n’est pas important la guerre des moutons et des fleurs ? Ce n’est pas plus sérieux et plus important que les additions d’un gros Monsieur rouge ? Et si je connais, moi, une fleur unique au monde, qui n’existe nulle part, sauf dans ma planète, et qu’un petit mouton peut anéantir d’un seul coup, comme ça, un matin, sans se rendre compte de ce qu’il a fait, ce n’est pas important ça !" },
  };
  const NOMS_TEXTES = { CE1: "CE1", CE2: "CE2", CM1: "CM1", CM2: "CM2", "6e": "6e", "4e": "4e", "2nde": "2nde" };

  /* ---------- Normes (mots par minute) : [moyenne, écart-type] ---------- */
  // 5e et 3e : valeurs grisées sur la feuille, à mi-chemin entre la classe d'avant et celle d'après.
  const CLASSES = ["CE1", "CE2", "CM1", "CM2", "6e", "5e", "4e", "3e", "2nde"];
  const NORMES = { CE1: [7.6, 2], CE2: [9.98, 1.41], CM1: [12.25, 2.5], CM2: [14.13, 1.48], "6e": [16.31, 4.78], "5e": [18.3, 4.43], "4e": [20.29, 4.09], "3e": [21.49, 3.73], "2nde": [22.69, 3.38] };
  const INTERPOLEES = ["5e", "3e"];
  // Classe sans texte propre : texte de la classe d'avant.
  const TEXTE_PAR_CLASSE = { "5e": "6e", "3e": "4e" };
  const SOURCE = "Lespargot, épreuve de copie : moyennes et écarts-types en mots par minute (feuille de cotation du cabinet)";

  function textePour(classe) { return TEXTES[classe] ? classe : TEXTE_PAR_CLASSE[classe] || ""; }

  // Découpe en morceaux : les mots (au moins une lettre ou un chiffre) sont comptés, la ponctuation isolée non.
  // « l’avion », « qu’est-ce » comptent pour un mot, comme dans Word.
  function morceaux(t) {
    const res = [];
    let n = 0;
    String(t).split(/(\s+)/).forEach((m) => {
      if (!m) return;
      if (/^\s+$/.test(m)) { res.push({ t: m, espace: true }); return; }
      const mot = /[0-9A-Za-zÀ-ÖØ-öø-ÿŒœ]/.test(m);
      res.push(mot ? { t: m, n: ++n } : { t: m });
    });
    return res;
  }
  function compterMots(t) { return morceaux(t).filter((m) => m.n).length; }
  // Texte complet à recopier (titre compris) et nombre de mots.
  function texteComplet(id) { const x = TEXTES[id]; return x ? (x.titre ? x.titre + "\n" : "") + x.texte : ""; }
  function motsTexte(id) { return compterMots(texteComplet(id)); }

  function vide() { return { classe: "", texte: "", mots: "", min: "", sec: "", obs: "" }; }

  function normaliser(src) {
    const a = vide();
    if (!src || typeof src !== "object") return a;
    if (CLASSES.indexOf(src.classe) >= 0) a.classe = src.classe;
    if (TEXTES[src.texte]) a.texte = src.texte;
    ["mots", "min", "sec"].forEach((k) => { a[k] = texte(src[k], 10); });
    a.obs = texte(src.obs, 2000);
    return a;
  }

  function formaterTemps(s) {
    if (s === null) return "";
    const m = Math.floor(s / 60), r = Math.round((s - m * 60) * 10) / 10;
    return (m ? m + " min" : "") + (m && r ? " " : "") + (r || !m ? fr(r) + " s" : "");
  }

  // ctx : { classe } (classe du dossier, utilisée si aucune classe n'est choisie dans l'épreuve)
  function calcul(src, ctx) {
    const a = normaliser(src);
    ctx = ctx || {};
    const classe = a.classe || (CLASSES.indexOf(ctx.classe) >= 0 ? ctx.classe : "");
    const tx = a.texte || textePour(classe) || "";
    const total = tx ? motsTexte(tx) : null;
    const mots = nombre(a.mots), mn = nombre(a.min), sc = nombre(a.sec);
    const temps = mn === null && sc === null ? null : (mn || 0) * 60 + (sc || 0);
    const motsOk = mots !== null && mots >= 0 ? mots : null;
    const tempsOk = temps !== null && temps > 0 && (mn === null || mn >= 0) && (sc === null || sc >= 0) ? temps : null;
    const mpm = motsOk !== null && tempsOk !== null ? (motsOk * 60) / tempsOk : null;
    const n = NORMES[classe];
    const norme = n ? { moy: n[0], et: n[1], interpolee: INTERPOLEES.indexOf(classe) >= 0 } : null;
    const ds = mpm !== null && norme ? (mpm - norme.moy) / norme.et : null;
    let alerte = "";
    if (!classe) alerte = ctx.classe ? "Pas de norme en " + ctx.classe + " (étalonnage du CE1 à la 2nde) : choisissez la classe de comparaison." : "Choisissez la classe (dans le dossier ou ci-dessous).";
    else if (motsOk !== null && total !== null && motsOk > total) alerte = "Plus de mots que le texte n'en compte (" + total + ") : vérifiez le nombre.";
    return {
      classe: classe, texte: tx, texteNom: tx ? NOMS_TEXTES[tx] : "", texteAutre: !!(tx && classe && tx !== classe), motsTexte: total,
      mots: motsOk, temps: tempsOk, tempsTexte: formaterTemps(tempsOk), mpm: mpm, norme: norme, ds: ds,
      fait: mpm !== null, obs: a.obs.trim(), alerte: alerte,
    };
  }

  // Résumé court : « 12,2 mots/min (moyenne 12,25, ET 2,5) ».
  function resume(c) {
    if (!c || c.mpm === null) return "";
    return fr(c.mpm) + " mots/min" + (c.norme ? " (moyenne " + fr(c.norme.moy, 2) + ", ET " + fr(c.norme.et, 2) + ")" : "");
  }

  // Valeur détaillée pour les phrases du compte rendu.
  function valeurTexte(c) {
    if (!c || c.mpm === null) return "";
    let t = fr(c.mots, 0) + " mot" + (c.mots >= 2 ? "s" : "") + " en " + c.tempsTexte + ", soit " + fr(c.mpm) + " mots par minute";
    if (c.norme) t += " (moyenne en " + c.classe + " : " + fr(c.norme.moy, 2) + " ; écart-type " + fr(c.norme.et, 2) + ")";
    if (c.texteAutre) t += ", texte de " + c.texteNom;
    return t;
  }

  return { TEXTES, NOMS_TEXTES, CLASSES, NORMES, INTERPOLEES, SOURCE, textePour, morceaux, compterMots, texteComplet, motsTexte, vide, normaliser, formaterTemps, calcul, resume, valeurTexte };
});
