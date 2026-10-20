/* Outil Ergo : interface du bilan d'écriture. Dépend de js/bhk.js et js/docx.js. */
(function () {
  "use strict";

  const B = window.BHK;
  const W = window.DocxBHK;
  const CLE_REGLAGES = "outil-ergo:reglages";
  const CLE_BROUILLON = "outil-ergo:brouillon";
  const RADIOS_EFFACABLES = ["sexe", "lateralite", "reperage", "c2"];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  let reglages = chargerReglages();
  let dossier = B.dossierVide();
  let cr = {};
  let genere = {};
  let nonEnregistre = false;

  /* ================= Utilitaires ================= */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function lireStockage(cle) {
    try { const t = localStorage.getItem(cle); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function ecrireStockage(cle, valeur) {
    try { if (valeur === null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* stockage indisponible */ }
  }

  function chargerReglages() { return B.normaliserReglages(lireStockage(CLE_REGLAGES)); }
  function sauverReglages() { ecrireStockage(CLE_REGLAGES, reglages); }

  let minuteurBrouillon = null;
  function sauverBrouillon() {
    clearTimeout(minuteurBrouillon);
    minuteurBrouillon = setTimeout(() => {
      if (reglages.brouillon) ecrireStockage(CLE_BROUILLON, { dossier: dossier, compteRendu: cr, le: new Date().toISOString() });
    }, 400);
  }

  let minuteurStatut = null;
  function annoncer(message) {
    const el = $("#statut");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(minuteurStatut);
    minuteurStatut = setTimeout(() => el.classList.remove("visible"), 2800);
  }

  function slug(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function nomFichier(prefixe, ext) {
    return [prefixe, slug(dossier.nom).toUpperCase(), slug(dossier.prenom), dossier.passation].filter(Boolean).join("_") + "." + ext;
  }

  // Dans une page partagée sur claude.ai, les fichiers passent par la capacité « downloads » ;
  // ailleurs (fichier ouvert directement, GitHub Pages), par un lien de téléchargement classique.
  const dansClaude = typeof window.claude === "object" && window.claude !== null && typeof window.claude.use === "function";
  const capaciteTelechargement = dansClaude ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);

  async function telecharger(nom, contenu, type, annonce) {
    const blob = new Blob([contenu], { type: type });
    const cap = await capaciteTelechargement;
    if (cap) {
      try {
        await cap.save({ filename: nom, data: blob });
        if (annonce) annoncer(annonce);
        return true;
      } catch (e) {
        if (e && e.code === "declined") annoncer("Téléchargement annulé");
        else if (e && e.code === "rate_limited") annoncer("Un téléchargement est déjà en attente de confirmation.");
        else annoncer("Le téléchargement n'est pas disponible ici" + (e && e.message ? " : " + e.message : "."));
        return false;
      }
    }
    if (dansClaude) { annoncer("Le téléchargement n'est pas disponible dans cette vue."); return false; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (annonce) annoncer(annonce);
    return true;
  }

  // Confirmation dans la page (les fenêtres confirm() ne s'affichent pas dans une page partagée).
  function demander(message, libelleOui) {
    return new Promise((resoudre) => {
      const precedent = document.activeElement;
      const fond = document.createElement("div");
      fond.className = "demande";
      fond.setAttribute("role", "alertdialog");
      fond.setAttribute("aria-modal", "true");
      fond.setAttribute("aria-labelledby", "demande-texte");
      fond.innerHTML = `<div class="demande-boite"><p id="demande-texte">${esc(message)}</p>
        <div class="barre-actions"><button type="button" class="bouton" data-reponse="oui">${esc(libelleOui || "Confirmer")}</button>
        <button type="button" class="bouton bouton-second" data-reponse="non">Annuler</button></div></div>`;
      const fin = (v) => {
        fond.remove();
        document.removeEventListener("keydown", clavier, true);
        if (precedent && precedent.focus) precedent.focus();
        resoudre(v);
      };
      const clavier = (e) => { if (e.key === "Escape") { e.stopPropagation(); fin(false); } };
      fond.addEventListener("click", (e) => {
        const b = e.target.closest("[data-reponse]");
        if (b) fin(b.dataset.reponse === "oui");
        else if (e.target === fond) fin(false);
      });
      document.addEventListener("keydown", clavier, true);
      document.body.appendChild(fond);
      fond.querySelector("[data-reponse='oui']").focus();
    });
  }

  function lireFichier(input) {
    return new Promise((ok, ko) => {
      const f = input.files && input.files[0];
      if (!f) return ko(new Error("Aucun fichier choisi."));
      const lecteur = new FileReader();
      lecteur.onload = () => { try { ok(JSON.parse(lecteur.result)); } catch (e) { ko(new Error("Ce fichier n'est pas un fichier JSON valide.")); } };
      lecteur.onerror = () => ko(new Error("Le fichier n'a pas pu être lu."));
      lecteur.readAsText(f);
    }).finally(() => { input.value = ""; });
  }

  // Accès aux champs imbriqués du dossier (« senso.otipis.scores.3 »).
  function lireChemin(obj, chemin) {
    return chemin.split(".").reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);
  }
  function ecrireChemin(obj, chemin, v) {
    const ks = chemin.split(".");
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] === null || typeof o[ks[i]] !== "object") o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = v;
  }
  function effacerChemin(obj, chemin) {
    const ks = chemin.split(".");
    const parent = lireChemin(obj, ks.slice(0, -1).join("."));
    if (parent && typeof parent === "object") delete parent[ks[ks.length - 1]];
  }

  function ajuster(ta) {
    if (!ta.offsetParent) return;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + 2 + "px";
  }

  /* ================= Construction de l'interface ================= */

  function radios(nom, valeurs, attrs) {
    return valeurs.map((v) => `<label><input type="radio" name="${nom}" value="${esc(v[0])}" ${attrs}><span>${esc(v[1])}</span></label>`).join("");
  }

  function construireListes() {
    $("#bilans-courants").innerHTML = B.BILANS_COURANTS.map((b) =>
      `<label><input type="checkbox" value="${b.id}" data-liste="bilansUtilises"><span>${esc(b.texte({ sujetMin: "l'enfant" }))}</span></label>`).join("");
    $("#prise").innerHTML = `<option value="">Non précisé</option>` + B.PRISES.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("");
    $("#mode-copie").innerHTML = `<option value="">Non précisée</option>` + B.MODES_COPIE.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join("");
    $("#remarques").innerHTML = B.REMARQUES.map((x) => `<label><input type="checkbox" value="${x.id}" data-liste="remarques"><span>${esc(x.label)}</span></label>`).join("");
    $("#occupations").innerHTML = B.OCCUPATIONS.map((x) => `<label><input type="checkbox" value="${x.id}" data-liste="occDifficultes"><span>${esc(B.maj(x.texte))}</span></label>`).join("");
    $$(".critere-global .critere-tete").forEach((t, i) => { t.insertAdjacentHTML("beforeend", `<output class="ds-critere" id="dsc-${i + 1}"></output>`); });
    $("#c1").innerHTML = `<option value="">Selon la taille</option>` + [0, 1, 2, 3, 4, 5].map((v) => `<option value="${v}">${v} (saisi)</option>`).join("");
    $("#c2").innerHTML = radios("c2", [0, 1, 2, 3, 4, 5].map((v) => [String(v), String(v)]), 'data-champ="c2"');
  }

  function construireGrille() {
    $("#grille").innerHTML = B.GRILLE.map((g) =>
      `<fieldset class="groupe">
        <legend>${esc(g.titre)}</legend>
        ${g.items.map((it) => `<div class="item-grille">
          <span class="item-label" id="gl-${g.id}-${it.id}">${esc(it.label)}</span>
          <div class="choix" role="radiogroup" aria-labelledby="gl-${g.id}-${it.id}">
            ${radios("g-" + g.id + "-" + it.id, it.options.map((o) => [o[0], o[1]]), `data-grille="${g.id}.${it.id}"`)}
          </div></div>`).join("")}
        <label class="champ"><span>Remarques</span><textarea data-grille-note="${g.id}" rows="1"></textarea></label>
      </fieldset>`).join("");
  }

  function construireCriteres() {
    $("#criteres").innerHTML = B.DOMAINES.map((dom) => {
      const cs = B.CRITERES.filter((c) => c.domaine === dom.id && c.mode === "lignes");
      if (!cs.length) return "";
      return `<div class="domaine"><h3>${esc(B.maj(dom.nom))}</h3>` + cs.map((c) =>
        `<fieldset class="critere-ligne">
          <legend class="critere-tete"><span class="num">${c.id}</span><span class="intitule"><span class="nom">${esc(c.nom)}</span><span class="aide">${esc(c.aide)}</span></span></legend>
          <div class="cases-lignes">
            ${[0, 1, 2, 3, 4].map((i) => `<label><input type="checkbox" data-ligne="${c.id}:${i}" aria-label="${esc(c.nom)}, ligne ${i + 1}"><span>L${i + 1}</span></label>`).join("")}
            <output class="score-critere" id="sc-${c.id}">0</output>
          </div>
          <output class="ds-critere" id="dsc-${c.id}"></output>
        </fieldset>`).join("") + `</div>`;
    }).join("");
  }

  /* ---------- Bilan sensoriel, manipulations, auto-évaluation ---------- */

  const S = window.Senso;

  function blocRealise(id, titre, chemin, contenu) {
    return `<fieldset class="groupe test" id="bloc-${id}">
      <legend><label class="case case-titre"><input type="checkbox" data-chemin="${chemin}.fait" data-bascule="#corps-${id}"><span>${esc(titre)}</span></label></legend>
      <div class="test-corps" id="corps-${id}" hidden>${contenu}</div>
    </fieldset>`;
  }
  function pastilles(nom, chemin, valeurs) {
    return `<div class="choix" role="radiogroup">${valeurs.map((v) => `<label><input type="radio" name="${nom}" value="${esc(v[0])}" data-chemin="${chemin}"><span>${esc(v[1])}</span></label>`).join("")}</div>`;
  }
  function champTexte(libelle, chemin, attrs) { return `<label class="champ"><span>${esc(libelle)}</span><input type="text" data-chemin="${chemin}" ${attrs || ""}></label>`; }
  function champZone(libelle, chemin, lignes) { return `<label class="champ"><span>${esc(libelle)}</span><textarea data-chemin="${chemin}" rows="${lignes || 2}"></textarea></label>`; }
  function champNombre(libelle, chemin) { return `<label class="champ"><span>${esc(libelle)}</span><input type="text" inputmode="decimal" data-chemin="${chemin}"></label>`; }
  function champDate(libelle, chemin) { return `<label class="champ"><span>${esc(libelle)}</span><input type="date" data-chemin="${chemin}"></label>`; }
  function liste(chemin, options, vide) {
    return `<select data-chemin="${chemin}"><option value="">${esc(vide || "–")}</option>${options.map((o) => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>`;
  }

  function htmlOtipis() {
    const c = "senso.otipis";
    let h = `<div class="grille2">
        <div class="champ"><span>Présence d'un parent</span>${pastilles("ot-parent", c + ".parent", [["oui", "Oui"], ["non", "Non"]])}</div>
        <div class="champ"><span>Main</span>${pastilles("ot-main", c + ".main", [["droite", "Droite"], ["gauche", "Gauche"]])}</div>
        <div class="champ"><span>Œil</span>${pastilles("ot-oeil", c + ".oeil", [["droit", "Droit"], ["gauche", "Gauche"]])}</div>
        <div class="champ"><span>Pied</span>${pastilles("ot-pied", c + ".pied", [["droit", "Droit"], ["gauche", "Gauche"]])}</div>
      </div>
      <p class="note">Cotation : 3 adapté, 2 quelques difficultés, 1 difficultés marquées. Les items 1 à 10 s'observent tout au long de la passation.</p>`;
    let groupe = "";
    S.OTIPIS.forEach((it) => {
      if (it.groupe !== groupe) { groupe = it.groupe; if (groupe) h += `<h4 class="sous-groupe">${esc(groupe)}</h4>`; }
      const dom = S.DOMAINES_OC.find((d) => d.id === it.domaine);
      h += `<div class="item-otipis">
        <span class="item-label"><span class="code" style="color:${dom.couleur}">${esc(it.code)}</span> ${esc(it.groupe ? it.nom.replace(it.groupe + ", ", "") : it.nom)}</span>
        ${pastilles("ot-" + it.id, c + ".scores." + it.id, [["3", "3"], ["2", "2"], ["1", "1"]])}
        <input type="text" class="remarque" data-chemin="${c}.notes.${it.id}" placeholder="Remarque" aria-label="Remarque, ${esc(it.nom)}">
      </div>`;
    });
    h += `<div class="grille2">${champNombre("Extension contre la gravité : temps (sur 20 s)", c + ".temps20")}${champNombre("Flexion contre la gravité : temps (sur 20 s)", c + ".temps22")}
      ${champNombre("Perception des formes : erreurs main droite", c + ".erreursMD")}${champNombre("Perception des formes : erreurs main gauche", c + ".erreursMG")}</div>
      ${champZone("Autres observations", c + ".autres")}${champZone("Comportement global, temps de transition", c + ".comportement")}${champZone("Discussion à l'issue du bilan", c + ".discussion")}
      <div class="graphique" id="g-otipis" hidden></div>`;
    return h;
  }

  function htmlDunn(forme) {
    const cle = forme === "enfant" ? "dunnEnfant" : "dunnScolaire";
    const f = S.FORMES_DUNN[forme];
    const c = "senso." + cle;
    let h = `<div class="grille2">${champTexte("Rempli par", c + ".repondant", `placeholder="${esc(f.repondant)}"`)}${champDate("Date", c + ".date")}</div>
      <p class="note">Score brut et classification lus dans le manuel du Profil sensoriel 2.</p>`;
    f.groupes.forEach((g) => {
      h += `<h4 class="sous-groupe">${esc(g.titre)}</h4>`;
      g.lignes.forEach((l) => {
        h += `<div class="ligne-dunn"><span class="item-label">${esc(l[1])}</span>
          <input type="text" inputmode="decimal" class="score-brut" data-chemin="${c}.lignes.${l[0]}.brut" placeholder="Score" aria-label="Score brut, ${esc(l[1])}">
          ${liste(c + ".lignes." + l[0] + ".classe", S.CLASSIFICATIONS.map((x) => [x.id, x.label]), "Classification")}</div>`;
      });
    });
    h += champZone("Observations", c + ".notes") + `<div class="graphique" id="g-dunn-${forme}" hidden></div>`;
    return h;
  }

  function htmlEso() {
    const c = "senso.eso";
    let h = `<div class="grille2">${champTexte("Rempli par", c + ".repondant", 'placeholder="les parents"')}${champDate("Date", c + ".date")}</div>
      <p class="note">Valeurs reportées depuis la fiche de synthèse : roues de 0 à 3, et sous-totaux de chaque domaine pour les systèmes sensoriels (le pourcentage se calcule).</p>
      <h4 class="sous-groupe">Roues par domaine d'occupation</h4>
      <div class="defile"><table class="table-saisie"><thead><tr><th scope="col">Domaine</th>${S.SECTEURS_ESO.map((s) => `<th scope="col">${s}</th>`).join("")}</tr></thead><tbody>
      ${S.DOMAINES_ESO.map((dm) => `<tr><th scope="row">${esc(dm[1])}</th>${S.SECTEURS_ESO.map((s) => `<td><input type="text" inputmode="decimal" data-chemin="${c}.roues.${dm[0]}.${s}" aria-label="${esc(dm[1])}, ${s}"></td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
      <h4 class="sous-groupe">Systèmes sensoriels</h4>
      <div class="defile"><table class="table-saisie"><thead><tr><th scope="col">Système</th><th scope="col">Soins pers.</th><th scope="col">Productivité</th><th scope="col">Loisirs</th><th scope="col">%</th></tr></thead><tbody>
      ${S.SYSTEMES_ESO.map((sy) => `<tr><th scope="row">${esc(sy.nom)}</th>${["sp", "p", "l"].map((k) => `<td><input type="text" inputmode="decimal" data-chemin="${c}.systemes.${sy.id}.${k}" aria-label="${esc(sy.nom)}, ${k}"></td>`).join("")}<td><output id="eso-pct-${sy.id}"></output></td></tr>`).join("")}
      </tbody></table></div>
      ${champZone("Observations", c + ".notes")}
      <div class="graphique" id="g-eso-roues" hidden></div><div class="graphique" id="g-eso-systemes" hidden></div>`;
    return h;
  }

  function htmlSensot() {
    const c = "senso.sensot";
    let h = `${champDate("Date", c + ".date")}
      <h4 class="sous-groupe">Classement des cartes par thème</h4>
      <div class="defile"><table class="table-saisie"><thead><tr><th scope="col">Thème</th><th scope="col">Gêne</th><th scope="col">Sans gêne</th><th scope="col">Plaisir</th></tr></thead><tbody>
      ${S.THEMES_SENSOT.map((t) => `<tr><th scope="row">${esc(t.nom)}</th>${["gene", "neutre", "plaisir"].map((k) => `<td><input type="text" inputmode="numeric" data-chemin="${c}.themes.${t.id}.${k}" aria-label="${esc(t.nom)}, ${k}"></td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
      <h4 class="sous-groupe">Situations prioritaires (5 au plus)</h4>`;
    for (let i = 0; i < S.NB_PRIORITES; i++) {
      const p = c + ".priorites." + i;
      h += `<div class="priorite">
        ${champTexte("Situation " + (i + 1), p + ".situation", 'placeholder="telle qu\'écrite sur la carte"')}
        <div class="grille3">
          <label class="champ"><span>Thème</span>${liste(p + ".theme", S.THEMES_SENSOT.map((t) => [t.id, t.nom]))}</label>
          <label class="champ"><span>Contexte</span>${liste(p + ".contexte", S.CONTEXTES_SENSOT.map((x) => [x, x]))}</label>
          <label class="champ"><span>Fréquence de la gêne</span>${liste(p + ".frequence", S.FREQUENCES_SENSOT.map((x) => [x, B.maj(x)]))}</label>
          <label class="champ"><span>Intensité (1 à 5)</span>${liste(p + ".intensite", [1, 2, 3, 4, 5].map((x) => [String(x), String(x)]))}</label>
          ${champTexte("Ressenti", p + ".ressenti")}${champTexte("Objectif", p + ".objectif")}
        </div></div>`;
    }
    return h + champZone("Observations", c + ".notes");
  }

  function construireSenso() {
    $("#sensoriel").innerHTML =
      blocRealise("otipis", "Observations cliniques OTIPIS", "senso.otipis", htmlOtipis()) +
      blocRealise("dunn-enfant", "Profil sensoriel 2 de Dunn : questionnaire enfant", "senso.dunnEnfant", htmlDunn("enfant")) +
      blocRealise("dunn-scolaire", "Profil sensoriel 2 de Dunn : compagnon scolaire", "senso.dunnScolaire", htmlDunn("scolaire")) +
      blocRealise("eso", "Engagement sensori-occupationnel (ESO)", "senso.eso", htmlEso()) +
      blocRealise("sensot", "SensOT-dir (version enfant)", "senso.sensot", htmlSensot());
  }

  function construireManip() {
    const lignes = B.MANIPULATIONS.map((it) => `<tr><th scope="row">${esc(it.nom)}</th>${["md", "mg"].map((m) =>
      `<td>${liste("manip." + m + "." + it.id, [3, 2, 1, 0].map((v) => [String(v), v + " " + B.COTATION_MANIP[v]]))}</td>`).join("")}</tr>`).join("");
    $("#manip").innerHTML = blocRealise("manip", "Exner et Benbow : manipulations dans la main", "manip",
      `<p class="note">Cotation : 3 fonctionnel, 2 avec lenteur ou compensation, 1 en partie, 0 non fonctionnel.</p>
      <div class="defile"><table class="table-saisie"><thead><tr><th scope="col">Manipulation</th><th scope="col">Main droite</th><th scope="col">Main gauche</th></tr></thead><tbody>${lignes}</tbody></table></div>
      ${champZone("Observations", "manip.notes")}`);
  }

  function construireAuto() {
    const n = reglages.autoQuestions.length;
    let h = `<p class="note">Libellés des questions et nom du questionnaire : onglet Réglages.</p>`;
    for (let i = 1; i <= n; i++) {
      h += `<div class="item-grille"><span class="item-label" id="lq-${i}">${esc(reglages.autoQuestions[i - 1] || "Question " + i)}</span>
        ${pastilles("auto-" + i, "auto.reponses." + i, B.ECHELLE_AUTO.map((e, k) => [String(k), e]))}</div>`;
    }
    $("#auto").innerHTML = blocRealise("auto", reglages.autoNom, "auto", h + champZone("Synthèse de l'auto-évaluation", "auto.notes"));
  }

  let signaturePreco = "";
  function majPreconisations() {
    const liste = B.proposerPreconisations(dossier, reglages);
    const sig = JSON.stringify(liste.map((p) => [p.id, p.raison, p.choisie]));
    if (sig === signaturePreco) return;
    signaturePreco = sig;
    $("#preconisations").innerHTML = B.CATEGORIES_PRECO.map((cat) => {
      const items = liste.filter((p) => p.cat === cat.id).sort((x, y) => (y.raison ? 1 : 0) - (x.raison ? 1 : 0));
      return `<div class="preco-cat"><h3>${esc(cat.titre)}</h3>${items.map((p) =>
        `<label class="preco${p.raison ? " proposee" : ""}"><input type="checkbox" value="${p.id}" data-liste="amenagements"${p.choisie ? " checked" : ""}>
          <span class="preco-texte"><span class="preco-label">${esc(p.label)}</span>${p.raison ? `<span class="preco-raison">Proposé : ${esc(p.raison)}</span>` : ""}</span></label>`).join("")}</div>`;
    }).join("");
  }

  function construireCriteresAdo() {
    $("#criteres-ado").innerHTML = B.DOMAINES_ADO.map((dom) => {
      const cs = B.CRITERES_ADO.filter((c) => c.domaine === dom.id);
      return `<div class="domaine"><h3>${esc(B.maj(dom.nom))}</h3>` + cs.map((c) =>
        `<fieldset class="critere-ligne">
          <legend class="critere-tete"><span class="num">${c.id}</span><span class="intitule"><span class="nom">${esc(c.nom)}</span><span class="aide">${esc(c.aide)}</span></span></legend>
          <div class="cases-lignes">
            ${[0, 1, 2, 3, 4].map((i) => `<label><input type="checkbox" data-ligne="${c.id}:${i}" aria-label="${esc(c.nom)}, phrase ${i + 1}"><span>P${i + 1}</span></label>`).join("")}
            <output class="score-critere" id="sc-${c.id}">0</output>
          </div>
        </fieldset>`).join("") + `</div>`;
    }).join("");
  }

  function optionsType(sel) {
    return B.TYPES_SCORE.map((t) => `<option value="${t.id}"${t.id === sel ? " selected" : ""}>${esc(t.label)}</option>`).join("");
  }

  function htmlTest(t) {
    const s = dossier.tests[t.id];
    const fait = s.fait === "oui";
    return `<fieldset class="groupe test" data-bloc-test="${t.id}">
      <legend><label class="case case-titre"><input type="checkbox" data-test="${t.id}" data-tchamp="fait"${fait ? " checked" : ""}><span>${esc(t.titre)}</span></label></legend>
      <div class="test-corps"${fait ? "" : " hidden"}>
        ${s.lignes.map((l, i) => `<div class="epreuve">
          <div class="grille-epreuve">
            <label class="champ e-nom"><span>Épreuve</span><input type="text" data-test="${t.id}" data-tl="${i}:epreuve" value="${esc(l.epreuve)}"></label>
            <label class="champ"><span>Type de score</span><select data-test="${t.id}" data-tl="${i}:type">${optionsType(l.type)}</select></label>
            <label class="champ"><span>Score</span><input type="text" inputmode="decimal" data-test="${t.id}" data-tl="${i}:valeur" value="${esc(l.valeur)}"></label>
            ${l.type === "brut" ? `
            <label class="champ"><span>Moyenne</span><input type="text" inputmode="decimal" data-test="${t.id}" data-tl="${i}:moy" value="${esc(l.moy)}"></label>
            <label class="champ"><span>Écart-type</span><input type="text" inputmode="decimal" data-test="${t.id}" data-tl="${i}:et" value="${esc(l.et)}"></label>
            <label class="champ"><span>Sens</span><select data-test="${t.id}" data-tl="${i}:sens"><option value="haut"${l.sens !== "bas" ? " selected" : ""}>Plus haut = mieux</option><option value="bas"${l.sens === "bas" ? " selected" : ""}>Plus bas = mieux</option></select></label>` : ""}
          </div>
          <label class="champ"><span>Observation</span><input type="text" data-test="${t.id}" data-tl="${i}:commentaire" value="${esc(l.commentaire)}"></label>
          <div class="epreuve-pied"><output id="tl-${t.id}-${i}" class="ds-ligne"></output>
            <button type="button" class="bouton-lien" data-suppr-epreuve="${t.id}:${i}">Retirer l'épreuve</button></div>
        </div>`).join("")}
        <button type="button" class="bouton bouton-second" data-ajouter-epreuve="${t.id}">Ajouter une épreuve</button>
        <label class="champ"><span>Observations générales</span><textarea data-test="${t.id}" data-tchamp="notes" rows="2">${esc(s.notes)}</textarea></label>
      </div>
    </fieldset>`;
  }

  function construireTests() {
    $("#tests").innerHTML = B.TESTS.map(htmlTest).join("");
  }

  function reconstruireTest(id) {
    const t = B.TESTS.find((x) => x.id === id);
    const ancien = $(`[data-bloc-test="${id}"]`);
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlTest(t);
    ancien.replaceWith(tmp.firstElementChild);
  }

  function construireSections() {
    $("#sections").innerHTML = B.SECTIONS.map((s) =>
      `<div class="section-cr">
        <div class="section-tete">
          <h3 id="h-${s.id}">${esc(B.titreSection(s.titre, { prenom: "" }))}</h3>
          <button type="button" class="bouton-lien" data-retablir="${s.id}" hidden>Rétablir le texte généré</button>
        </div>
        <textarea data-section="${s.id}" aria-labelledby="h-${s.id}" rows="3"></textarea>
      </div>`).join("");
  }

  /* ================= Réglages ================= */

  function construirePraticiens() {
    $("#praticiens").innerHTML = reglages.praticiens.map((p, i) =>
      `<div class="praticien">
        <div class="grille2">
          <label class="champ"><span>Nom</span><input type="text" data-prat="${i}:nom" value="${esc(p.nom)}"></label>
          <label class="champ"><span>Titre</span><input type="text" data-prat="${i}:titre" value="${esc(p.titre)}"></label>
          <label class="champ"><span>Téléphone</span><input type="tel" data-prat="${i}:tel" value="${esc(p.tel)}"></label>
          <label class="champ"><span>E-mail</span><input type="email" data-prat="${i}:email" value="${esc(p.email)}"></label>
          <label class="champ"><span>N° SIRET</span><input type="text" data-prat="${i}:siret" value="${esc(p.siret)}"></label>
          <label class="champ"><span>N° ADELI</span><input type="text" data-prat="${i}:adeli" value="${esc(p.adeli)}"></label>
        </div>
        <label class="champ"><span>Adresse du pied de page</span><input type="text" data-prat="${i}:adresse" value="${esc(p.adresse)}" placeholder="Vide : adresse du cabinet"></label>
        <div class="praticien-pied">
          <label class="case"><input type="radio" name="signataire" value="${i}" data-signataire${reglages.signataire === i ? " checked" : ""}><span>Signe les bilans</span></label>
          ${reglages.praticiens.length > 1 ? `<button type="button" class="bouton-lien" data-suppr-praticien="${i}">Retirer</button>` : ""}
        </div>
      </div>`).join("");
  }

  function construireNormes() {
    const n = reglages.normes;
    const nb = ["qualite", "vitesse"].reduce((a, ind) => a + Object.keys(n[ind].classe).length + Object.keys(n[ind].age).length, 0) + Object.keys(n.ado.vitesse.classe).length + Object.keys(n.ado.qualite.classe).length;
    $("#etat-normes-reglages").textContent = nb
      ? "Normes importées" + (n.source ? " : " + n.source : "") + "."
      : "Aucune norme pour l'instant. Importez le fichier de normes pour calculer les déviations standard.";
    if (!nb) { $("#tableau-normes").innerHTML = ""; return; }
    const f = (v) => (v ? B.formaterNombre(v[0]) + " / " + B.formaterNombre(v[1]) : "–");
    const table = (ind, ref, cles, titre) => {
      const t = n[ind][ref];
      if (!Object.keys(t).length) return "";
      return `<div class="defile"><table class="table-normes"><caption>${titre}</caption>
        <thead><tr><th scope="col">${ref === "classe" ? "Classe" : "Âge"}</th><th scope="col">Filles</th><th scope="col">Garçons</th><th scope="col">Ensemble</th></tr></thead>
        <tbody>${cles.filter((c) => t[c]).map((c) => `<tr><th scope="row">${ref === "age" ? c + " ans" : c}</th><td>${f(t[c].F)}</td><td>${f(t[c].M)}</td><td>${f(t[c].E)}</td></tr>`).join("")}</tbody></table></div>`;
    };
    const tableAdo = () => {
      const a = n.ado;
      if (!Object.keys(a.vitesse.classe).length && !Object.keys(a.qualite.classe).length) return "";
      return `<div class="defile"><table class="table-normes"><caption>BHK ado, par classe</caption>
        <thead><tr><th scope="col">Classe</th><th scope="col">Qualité</th><th scope="col">Vitesse</th></tr></thead>
        <tbody>${B.CLASSES_ADO.map((c) => `<tr><th scope="row">${c}</th><td>${f(a.qualite.classe[c] && a.qualite.classe[c].E)}</td><td>${f(a.vitesse.classe[c] && a.vitesse.classe[c].E)}</td></tr>`).join("")}
        ${a.qualite.global ? `<tr><th scope="row">Tous niveaux</th><td>${f(a.qualite.global.E)}</td><td>–</td></tr>` : ""}</tbody></table></div>`;
    };
    $("#tableau-normes").innerHTML = `<p class="note">Moyenne / écart-type.</p>` +
      table("qualite", "classe", B.CLASSES, "Qualité (score de dégradation), par classe") +
      table("qualite", "age", B.AGES, "Qualité, par âge") +
      table("vitesse", "classe", B.CLASSES, "Vitesse (caractères en 5 minutes), par classe") +
      table("vitesse", "age", B.AGES, "Vitesse, par âge") + tableAdo();
  }

  function remplirReglages() {
    $$("[data-reg]").forEach((el) => { const [a, b] = el.dataset.reg.split("."); el.value = reglages[a][b] || ""; });
    $$("[data-reg-num]").forEach((el) => { el.value = B.formaterNombre(reglages[el.dataset.regNum]); el.removeAttribute("aria-invalid"); });
    $$("[data-reg-bool]").forEach((el) => { el.checked = !!reglages[el.dataset.regBool]; });
    $$("[data-reg-texte]").forEach((el) => { el.value = reglages[el.dataset.regTexte] || ""; });
    $("#questions-auto").innerHTML = reglages.autoQuestions.map((q, i) =>
      `<label class="champ"><span>Question ${i + 1}</span><input type="text" data-reg-question="${i}" value="${esc(q)}"></label>`).join("") +
      `<div class="barre-actions"><button type="button" class="bouton bouton-second" data-action="ajouter-question">Ajouter une question</button>` +
      (reglages.autoQuestions.length > 1 ? `<button type="button" class="bouton-lien" data-action="retirer-question">Retirer la dernière question</button>` : "") + `</div>`;
    construirePraticiens();
    construireNormes();
    $("#note-brouillon").textContent = reglages.brouillon
      ? "Rien n'est envoyé en ligne. Un brouillon du dossier en cours reste dans ce navigateur jusqu'à « Nouveau dossier » ; enregistrez le dossier pour le garder."
      : "Rien n'est envoyé en ligne. Enregistrez le dossier sur votre appareil pour le reprendre plus tard.";
  }

  function surSaisieReglages(e) {
    const el = e.target;
    if (el.dataset.reg) {
      const [a, b] = el.dataset.reg.split(".");
      reglages[a][b] = el.value;
    } else if (el.dataset.prat) {
      const [i, k] = el.dataset.prat.split(":");
      reglages.praticiens[Number(i)][k] = el.value;
    } else if (el.dataset.signataire !== undefined) {
      if (el.checked) reglages.signataire = Number(el.value);
    } else if (el.dataset.regNum) {
      const k = el.dataset.regNum;
      const v = B.nombre(el.value);
      const essai = Object.assign({}, reglages, { [k]: v });
      const ok = v !== null && v > 0 && essai.seuilPatho >= essai.seuilInferieur;
      if (ok) { reglages[k] = v; el.removeAttribute("aria-invalid"); } else el.setAttribute("aria-invalid", "true");
    } else if (el.dataset.regTexte) {
      reglages[el.dataset.regTexte] = el.value;
      const titre = $("#bloc-auto legend span");
      if (titre) titre.textContent = el.value || "Questionnaire d'auto-évaluation";
    } else if (el.dataset.regQuestion !== undefined) {
      const i = Number(el.dataset.regQuestion);
      reglages.autoQuestions[i] = el.value;
      const lab = $("#lq-" + (i + 1));
      if (lab) lab.textContent = el.value || "Question " + (i + 1);
    } else if (el.dataset.regBool) {
      reglages[el.dataset.regBool] = el.checked;
      if (el.dataset.regBool === "brouillon") {
        if (!el.checked) ecrireStockage(CLE_BROUILLON, null); else sauverBrouillon();
        remplirReglages();
      }
    } else return false;
    sauverReglages();
    majTout();
    return true;
  }

  /* ================= Formulaire ⇄ dossier ================= */

  function remplirFormulaire() {
    $$("[data-champ]").forEach((el) => {
      const v = dossier[el.dataset.champ] || "";
      if (el.type === "radio") el.checked = el.value === v;
      else if (el.type === "checkbox") el.checked = v === "oui";
      else el.value = v;
    });
    $$("[data-liste]").forEach((el) => { el.checked = (dossier[el.dataset.liste] || []).indexOf(el.value) >= 0; });
    $$("[data-ligne]").forEach((el) => {
      const [c, i] = el.dataset.ligne.split(":");
      el.checked = !!(dossier.lignes[c] && dossier.lignes[c][Number(i)]);
    });
    $$("[data-grille]").forEach((el) => { el.checked = dossier.grille[el.dataset.grille] === el.value; });
    $$("[data-grille-note]").forEach((el) => { el.value = dossier.grilleNotes[el.dataset.grilleNote] || ""; });
    $$("[data-chemin]").forEach((el) => {
      const v = lireChemin(dossier, el.dataset.chemin);
      const t = v === undefined || v === null ? "" : String(v);
      if (el.type === "radio") el.checked = t !== "" && el.value === t;
      else if (el.type === "checkbox") el.checked = t === "oui";
      else el.value = t;
      if (el.dataset.bascule) { const corps = $(el.dataset.bascule); if (corps) corps.hidden = !el.checked; }
    });
    construireTests();
    majPhoto();
  }

  function majPhoto() {
    const img = $("#apercu-photo");
    img.hidden = !dossier.photoCopie;
    if (dossier.photoCopie) img.src = dossier.photoCopie; else img.removeAttribute("src");
    $$("[data-action='retirer-photo']").forEach((b) => { b.hidden = !dossier.photoCopie; });
  }

  // Réduit la photo (1600 px au plus, JPEG) pour garder des dossiers légers.
  function chargerPhoto(fichier) {
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onerror = () => ko(new Error("La photo n'a pas pu être lue."));
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = () => ko(new Error("Ce fichier n'est pas une image lisible."));
        img.onload = () => {
          const k = Math.min(1, 1600 / Math.max(img.width, img.height));
          const l = Math.round(img.width * k), h = Math.round(img.height * k);
          const canvas = document.createElement("canvas");
          canvas.width = l; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, l, h);
          ctx.drawImage(img, 0, 0, l, h);
          ok({ donnees: canvas.toDataURL("image/jpeg", 0.82), l: l, h: h });
        };
        img.src = lecteur.result;
      };
      lecteur.readAsDataURL(fichier);
    });
  }

  function surSaisie(e) {
    const el = e.target;
    if (!el.dataset) return;
    if (el.closest("#p-reglages")) { surSaisieReglages(e); return; }

    if (el.dataset.chemin) {
      if (el.type === "radio" && !el.checked) return;
      if (el.tagName === "SELECT" && el.value === "" && el.dataset.chemin.indexOf("manip.") === 0) effacerChemin(dossier, el.dataset.chemin);
      else ecrireChemin(dossier, el.dataset.chemin, el.type === "checkbox" ? (el.checked ? "oui" : "") : el.value);
      if (el.dataset.bascule) { const corps = $(el.dataset.bascule); if (corps) corps.hidden = !el.checked; }
    } else if (el.dataset.champ) {
      if (el.type === "radio" && !el.checked) return;
      dossier[el.dataset.champ] = el.type === "checkbox" ? (el.checked ? "oui" : "") : el.value;
    } else if (el.dataset.liste) {
      const l = new Set(dossier[el.dataset.liste]);
      if (el.checked) l.add(el.value); else l.delete(el.value);
      dossier[el.dataset.liste] = Array.from(l);
    } else if (el.dataset.ligne) {
      const [c, i] = el.dataset.ligne.split(":");
      const l = dossier.lignes[c] || [0, 0, 0, 0, 0];
      l[Number(i)] = el.checked ? 1 : 0;
      dossier.lignes[c] = l;
    } else if (el.dataset.grille) {
      if (!el.checked) return;
      dossier.grille[el.dataset.grille] = el.value;
    } else if (el.dataset.grilleNote) {
      dossier.grilleNotes[el.dataset.grilleNote] = el.value;
    } else if (el.dataset.test) {
      const s = dossier.tests[el.dataset.test];
      if (el.dataset.tchamp === "fait") {
        s.fait = el.checked ? "oui" : "";
        $(".test-corps", el.closest("[data-bloc-test]")).hidden = !el.checked;
      } else if (el.dataset.tchamp === "notes") {
        s.notes = el.value;
      } else if (el.dataset.tl) {
        const [i, k] = el.dataset.tl.split(":");
        s.lignes[Number(i)][k] = el.value;
        if (k === "type" && e.type === "change") reconstruireTest(el.dataset.test);
      }
    } else if (el.dataset.section) {
      if (e.type !== "input") return;
      const id = el.dataset.section;
      cr[id] = { texte: el.value, modifie: el.value !== genere[id] };
      $(`[data-retablir="${id}"]`).hidden = !cr[id].modifie;
      ajuster(el);
      nonEnregistre = true;
      sauverBrouillon();
      majACompleter();
      return;
    } else return;
    nonEnregistre = true;
    majTout();
  }

  // Un second appui sur une réponse déjà choisie l'efface.
  function surClicRadio(e) {
    const el = e.target;
    if (el.type !== "radio") return;
    if (el.dataset.grille && dossier.grille[el.dataset.grille] === el.value) {
      el.checked = false;
      delete dossier.grille[el.dataset.grille];
    } else if (el.dataset.chemin && String(lireChemin(dossier, el.dataset.chemin)) === el.value) {
      el.checked = false;
      effacerChemin(dossier, el.dataset.chemin);
    } else if (el.dataset.champ && RADIOS_EFFACABLES.indexOf(el.dataset.champ) >= 0 && dossier[el.dataset.champ] === el.value) {
      el.checked = false;
      dossier[el.dataset.champ] = "";
    } else return;
    nonEnregistre = true;
    majTout();
  }

  /* ================= Mise à jour ================= */

  function svgEchelle(z) {
    const vmin = -4, vmax = 3;
    const W0 = 360, H = 72, gx = 18, haut = 10, bas = 46;
    const x = (v) => +(gx + ((v - vmin) / (vmax - vmin)) * (W0 - 2 * gx)).toFixed(1);
    const p = reglages.seuilPatho, i = reglages.seuilInferieur, s = reglages.seuilSuperieur;
    const zone = (a, b, cls) => {
      const x1 = x(Math.max(vmin, a)), x2 = x(Math.min(vmax, b));
      return x2 > x1 ? `<rect class="${cls}" x="${x1}" y="${haut}" width="${(x2 - x1).toFixed(1)}" height="${bas - haut}"/>` : "";
    };
    const signe = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v);
    const aria = (z === null ? "Position non calculée" : "Déviation standard " + B.formaterDS(z)) + ". Seuil pathologique à −" + B.formaterNombre(p) + ".";
    let svg = `<svg class="echelle" viewBox="0 0 ${W0} ${H}" role="img" aria-label="${esc(aria)}">`;
    svg += zone(vmin, -p, "zone-patho") + zone(-p, -i, "zone-fragile") + zone(s, vmax, "zone-sup");
    for (let k = vmin * 2; k <= vmax * 2; k++) {
      const v = k / 2;
      svg += `<line class="${v === 0 ? "ligne-moyenne" : Number.isInteger(v) ? "ligne" : "ligne-fine"}" x1="${x(v)}" x2="${x(v)}" y1="${haut}" y2="${bas}"/>`;
    }
    svg += `<line class="ligne" x1="${gx}" x2="${W0 - gx}" y1="${haut}" y2="${haut}"/><line class="ligne" x1="${gx}" x2="${W0 - gx}" y1="${bas}" y2="${bas}"/>`;
    svg += `<line class="marge" x1="${x(-p)}" x2="${x(-p)}" y1="${haut - 7}" y2="${bas + 5}"/>`;
    for (let v = vmin; v <= vmax; v++) svg += `<text class="graduation${v === 0 ? " graduation-moyenne" : ""}" x="${x(v)}" y="${H - 6}" text-anchor="middle">${signe(v)}</text>`;
    if (z !== null) {
      const zc = Math.max(vmin, Math.min(vmax, z)), cx = x(zc), cy = (haut + bas) / 2;
      svg += `<circle class="point" cx="${cx}" cy="${cy}" r="8"/>`;
      if (z > vmax) svg += `<path class="fleche" d="M${cx + 11} ${cy - 6} l7 6 l-7 6"/>`;
      if (z < vmin) svg += `<path class="fleche" d="M${cx - 11} ${cy - 6} l-7 6 l7 6"/>`;
    }
    return svg + "</svg>";
  }

  function messageReference(r) {
    if (r.horsEtalonnage) return "Âge hors de l'étalonnage du BHK enfant (6 à 11 ans).";
    if (!r.cle) return r.ref === "classe"
      ? `Choisissez la classe dans le <button type="button" class="bouton-lien" data-aller="dossier">dossier</button>.`
      : `Renseignez les dates dans le <button type="button" class="bouton-lien" data-aller="dossier">dossier</button>.`;
    return `Normes à importer dans les <button type="button" class="bouton-lien" data-aller="reglages">réglages</button>.`;
  }

  function rendreResultat(cible, qualite, r) {
    const ds = qualite ? r.dsQ : r.dsV;
    const pos = qualite ? r.perfQ : r.dsV;
    const niv = qualite ? r.niveauQ : r.niveauV;
    let valeur, detail;
    if (qualite) {
      valeur = r.complet ? `${r.total}<small>/${r.max}</small>` : `<small>à coter</small>`;
      detail = !r.complet ? "Renseignez les critères 1 et 2." : ds === null ? messageReference(r) : `<span class="z">DS ${B.formaterDS(ds)}</span>`;
    } else {
      valeur = r.vitesse === null ? `<small>à saisir</small>` : `${B.formaterNombre(r.vitesse)}<small> caractères</small>`;
      detail = r.vitesse === null ? "Saisissez le nombre de caractères écrits." : ds === null ? messageReference(r) : `<span class="z">DS ${B.formaterDS(ds)}</span>`;
    }
    cible.className = "resultat" + (niv ? " niveau-" + niv : "");
    cible.innerHTML = `<div class="resultat-tete"><h3>${qualite ? "Qualité" : "Vitesse"}</h3><p class="valeur">${valeur}</p></div>` +
      `<p class="detail">${detail}${niv ? `<span class="niveau">${B.APPRECIATIONS[niv]}</span>` : ""}</p>` + svgEchelle(pos);
  }

  function majACompleter() {
    const n = B.SECTIONS.reduce((a, s) => a + ((cr[s.id] && cr[s.id].texte.match(/\[[^\]]*\]/g)) || []).length, 0);
    $("#a-completer").textContent = n
      ? `Il reste ${n} passage${n > 1 ? "s" : ""} à compléter, entre crochets dans le texte ci-dessous.`
      : "Tout est complété.";
  }

  function majTout() {
    const r = B.calculerBHK(dossier, reglages);

    $("#age").textContent = r.age ? B.formaterAge(r.age) : "renseignez la date de naissance";

    // Normes
    let etat;
    if (r.horsEtalonnage) etat = "L'âge de l'enfant est hors de l'étalonnage du BHK enfant (6 à 11 ans).";
    else if (!r.cle) etat = r.ref === "classe" ? "Choisissez la classe dans le dossier." : "Renseignez les dates de naissance et du bilan.";
    else if (!r.normeQ && !r.normeV) etat = "Aucune norme pour ce groupe : importez le fichier de normes dans les réglages.";
    else if (r.version === "ado") etat = "BHK ado. Vitesse comparée à la classe de " + r.cle + ", qualité " + r.referenceQualite + ".";
    else etat = "Comparaison : " + (r.ref === "classe" ? "classe de " + r.cle : r.cle + " ans") + ", " + r.sexeTexte + ".";
    if (r.alerteNormes) etat += " Attention : dans le manuel, les normes des filles et des garçons sont identiques pour ce groupe, ce qui ressemble à une erreur de saisie. Préférez « Ensemble ».";
    $("#etat-normes").textContent = etat;

    // Cotation
    const auto = B.pointsTaille(dossier.tailleMm, dossier.groupe);
    $("#c1").options[0].textContent = auto === null ? "Selon la taille (taille et classe à renseigner)" : "Selon la taille : " + auto + " point" + (auto > 1 ? "s" : "");
    const ado = r.version === "ado";
    $("#cotation-enfant").hidden = ado; $("#cotation-ado").hidden = !ado;
    $("#ref-enfant").hidden = ado; $("#ref-ado").hidden = !ado;
    r.liste.forEach((c, i) => { const o = $("#sc-" + c.id); if (o) o.textContent = r.scores[i] === null ? "–" : r.scores[i]; });
    $("#total-cotation").innerHTML = `Score de dégradation : <strong>${r.total}/${r.max}</strong>` + (r.complet ? "" : " (critères 1 et 2 à renseigner)");

    rendreResultat($("#res-qualite"), true, r);
    rendreResultat($("#res-vitesse"), false, r);

    const q = r.complet ? `${r.total}/${r.max}${r.dsQ !== null ? " (" + B.formaterDS(r.dsQ) + ")" : ""}` : "à coter";
    const v = r.vitesse !== null ? `${B.formaterNombre(r.vitesse)} car.${r.dsV !== null ? " (" + B.formaterDS(r.dsV) + ")" : ""}` : "à saisir";
    $("#recap").innerHTML = `<span class="${r.niveauQ ? "niveau-" + r.niveauQ : ""}">Qualité <strong>${q}</strong></span><span class="${r.niveauV ? "niveau-" + r.niveauV : ""}">Vitesse <strong>${v}</strong></span>`;

    // Autres bilans
    B.calculerTests(dossier, reglages).forEach((t) => t.lignes.forEach((l, i) => {
      const o = $(`#tl-${t.id}-${i}`);
      if (!o) return;
      o.className = "ds-ligne" + (l.niveau ? " niveau-" + l.niveau : "");
      o.textContent = l.ds === null ? (l.remplie ? "DS non calculable" : "") : "DS " + B.formaterDS(l.ds) + " : " + B.APPRECIATIONS[l.niveau];
    }));

    // DS par critère
    r.liste.forEach((c, i) => {
      const o = $("#dsc-" + c.id);
      if (!o) return;
      const k = r.criteres[i];
      o.className = "ds-critere" + (k.niveau ? " niveau-" + k.niveau : "");
      o.textContent = k.ds === null ? "" : "DS " + B.formaterDS(k.ds);
    });

    // Bilan sensoriel : graphiques et pourcentages ESO
    ["otipis", "dunn-enfant", "dunn-scolaire", "eso-roues", "eso-systemes"].forEach((id) => {
      const zone = $("#g-" + id);
      if (!zone) return;
      const g = window.Graph.graphique(id, dossier.senso);
      zone.hidden = !g;
      zone.innerHTML = g ? g.svg : "";
    });
    S.systemesEso(S.normaliser(dossier.senso).eso).forEach((sy) => {
      const o = $("#eso-pct-" + sy.id);
      if (o) o.textContent = sy.pourcentage === null ? "" : Math.round(sy.pourcentage) + " %";
    });
    majPreconisations();

    // Compte rendu
    genere = B.rediger(dossier, reglages);
    B.SECTIONS.forEach((s) => {
      const ta = $(`[data-section="${s.id}"]`);
      $(`#h-${s.id}`).textContent = B.titreSection(s.titre, dossier);
      if (!cr[s.id] || !cr[s.id].modifie) {
        cr[s.id] = { texte: genere[s.id], modifie: false };
        if (ta.value !== genere[s.id]) { ta.value = genere[s.id]; ajuster(ta); }
      }
      ta.placeholder = genere[s.id] ? "" : "Section vide : elle n'apparaîtra pas dans le compte rendu.";
      $(`[data-retablir="${s.id}"]`).hidden = !cr[s.id].modifie;
    });
    majACompleter();
    sauverBrouillon();
  }

  /* ================= Rendu du document ================= */

  function textes() {
    const t = {};
    B.SECTIONS.forEach((s) => { t[s.id] = cr[s.id] ? cr[s.id].texte : ""; });
    return t;
  }

  function htmlRuns(runs) {
    return runs.map((r) => {
      let h = esc(r.t);
      if (r.surligne) h = `<mark>${h}</mark>`;
      if (r.i) h = `<em>${h}</em>`;
      if (r.b) h = `<strong>${h}</strong>`;
      return h;
    }).join("");
  }

  function htmlModele(m) {
    let h = "";
    const cols = [];
    if (m.entete.cabinet.nom || m.entete.cabinet.lignes.length) cols.push([m.entete.cabinet.nom].concat(m.entete.cabinet.lignes));
    m.entete.praticiens.forEach((p) => cols.push([p.nom].concat(p.lignes)));
    if (cols.length) h += `<div class="doc-entete">${cols.map((c) => `<div><strong>${esc(c[0])}</strong>${c.slice(1).map((l) => "<br>" + esc(l)).join("")}</div>`).join("")}</div>`;
    m.blocs.forEach((b) => {
      if (b.type === "titre") h += `<h1>${esc(b.texte)}</h1>`;
      else if (b.type === "h") h += `<h${b.niveau}>${esc(b.texte)}</h${b.niveau}>`;
      else if (b.type === "p") h += `<p${b.petit ? ' class="petit"' : ""}>${htmlRuns(b.runs)}</p>`;
      else if (b.type === "puces") h += `<ul>${b.items.map((it) => `<li>${htmlRuns(it)}</li>`).join("")}</ul>`;
      else if (b.type === "signature") h += `<p class="doc-signature">${esc(b.texte)}</p>`;
      else if (b.type === "graphique") {
        const g = window.Graph.graphique(b.id, dossier.senso);
        if (g) h += `<figure class="doc-figure">${g.svg}<figcaption>${esc(b.alt)}</figcaption></figure>`;
      } else if (b.type === "photo") h += `<figure class="doc-figure"><img src="${esc(b.donnees)}" alt="${esc(b.alt)}"><figcaption>${esc(b.alt)}</figcaption></figure>`;
      else if (b.type === "tableau") {
        h += `<table class="doc-table${b.petit ? " petit" : ""}"><colgroup>${b.largeurs.map((w) => `<col style="width:${(w * 100).toFixed(1)}%">`).join("")}</colgroup>`;
        h += b.lignes.map((l) => `<tr>${l.cellules.map((c) => {
          const tag = l.entete ? "th" : "td";
          const cls = [c.fond ? "fond-" + c.fond : "", c.align ? "a-" + c.align : "", c.gras && !l.entete ? "gras" : ""].filter(Boolean).join(" ");
          return `<${tag}${c.colspan ? ` colspan="${c.colspan}"` : ""}${cls ? ` class="${cls}"` : ""}>${htmlRuns(c.runs)}</${tag}>`;
        }).join("")}</tr>`).join("") + `</table>`;
      }
    });
    if (m.pied.length) h += `<div class="doc-pied">${m.pied.map(esc).join("<br>")}</div>`;
    return h;
  }

  function texteModele(m) {
    const l = [];
    m.blocs.forEach((b) => {
      if (b.type === "titre") l.push(b.texte.toUpperCase(), "");
      else if (b.type === "h") l.push("", b.texte);
      else if (b.type === "p") l.push(b.runs.map((r) => r.t).join(""));
      else if (b.type === "puces") b.items.forEach((it) => l.push("– " + it.map((r) => r.t).join("")));
      else if (b.type === "signature") l.push("", b.texte);
      else if (b.type === "tableau") { b.lignes.forEach((ln) => l.push(ln.cellules.map((c) => c.runs.map((r) => r.t).join("")).join(" | "))); l.push(""); }
    });
    return l.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function modele() { return B.modeleDocument(dossier, reglages, textes()); }

  // Convertit un graphique SVG en image PNG (pour le fichier Word).
  function svgVersPng(svg, l, h) {
    return new Promise((ok, ko) => {
      const img = new Image();
      img.onload = () => {
        const echelle = 2;
        const canvas = document.createElement("canvas");
        canvas.width = l * echelle;
        canvas.height = h * echelle;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return ko(new Error("image non créée"));
          blob.arrayBuffer().then((buf) => ok(new Uint8Array(buf)), ko);
        }, "image/png");
      };
      img.onerror = () => ko(new Error("graphique illisible"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  async function modeleAvecImages() {
    const m = modele();
    for (const b of m.blocs) {
      if (b.type !== "graphique" || !window.Graph) continue;
      const g = window.Graph.graphique(b.id, dossier.senso);
      if (!g) continue;
      try {
        b.png = await svgVersPng(g.svg, g.l, g.h);
        b.l = g.l;
        b.h = g.h;
      } catch (e) { /* le graphique est omis du Word */ }
    }
    return m;
  }

  async function word() {
    let octets;
    try {
      octets = W.construire(await modeleAvecImages());
    } catch (e) {
      annoncer("Le fichier Word n'a pas pu être créé : " + e.message);
      return;
    }
    await telecharger(nomFichier("Bilan_ergo", "docx"), octets, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Word téléchargé");
  }

  function apercu() {
    $("#apercu-page").innerHTML = htmlModele(modele());
    $("#apercu").hidden = false;
    document.body.classList.add("sans-defilement");
    $("[data-action='fermer-apercu']").focus();
  }
  function fermerApercu() {
    $("#apercu").hidden = true;
    document.body.classList.remove("sans-defilement");
  }

  function copier() {
    const t = texteModele(modele());
    const secours = () => {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      annoncer(ok ? "Texte copié" : "La copie a échoué : utilisez le téléchargement Word.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => annoncer("Texte copié"), secours);
    else secours();
  }

  /* ================= Dossier : enregistrer, ouvrir, nouveau ================= */

  function enregistrer() {
    const donnees = { type: "bilan-ergo-dossier", version: 2, enregistreLe: new Date().toISOString(), dossier: dossier, compteRendu: cr };
    telecharger(nomFichier("Dossier", "json"), JSON.stringify(donnees, null, 2), "application/json", "Dossier enregistré")
      .then((ok) => { if (ok) nonEnregistre = false; });
  }

  function charger(obj) {
    dossier = B.normaliserDossier(obj.dossier);
    cr = {};
    const src = obj.compteRendu || {};
    B.SECTIONS.forEach((s) => {
      if (src[s.id] && src[s.id].modifie && typeof src[s.id].texte === "string") cr[s.id] = { texte: src[s.id].texte, modifie: true };
      $(`[data-section="${s.id}"]`).value = cr[s.id] ? cr[s.id].texte : "";
    });
    remplirFormulaire();
    majTout();
  }

  function ouvrir(obj) {
    if (!obj || !obj.dossier || (obj.type !== "bilan-ergo-dossier" && obj.type !== "bhk-dossier")) throw new Error("Ce fichier n'est pas un dossier de bilan.");
    charger(obj);
    nonEnregistre = false;
    afficherOnglet("dossier");
    annoncer("Dossier ouvert");
  }

  async function nouveau() {
    if (nonEnregistre && !(await demander("Le dossier en cours n'est pas enregistré. Commencer un nouveau dossier ?", "Commencer un nouveau dossier"))) return;
    ecrireStockage(CLE_BROUILLON, null);
    charger({ dossier: B.dossierVide() });
    nonEnregistre = false;
    afficherOnglet("dossier");
    annoncer("Nouveau dossier");
  }

  /* ================= Onglets ================= */

  function afficherOnglet(nom) {
    $$(".onglets [role=tab]").forEach((t) => {
      const actif = t.id === "t-" + nom;
      t.setAttribute("aria-selected", String(actif));
      t.tabIndex = actif ? 0 : -1;
      if (actif) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    $$("[role=tabpanel]").forEach((p) => { p.hidden = p.id !== "p-" + nom; });
    window.scrollTo(0, 0);
    if (nom === "compte-rendu") $$("[data-section]").forEach(ajuster);
  }

  function initOnglets() {
    const onglets = $$(".onglets [role=tab]");
    onglets.forEach((t, i) => {
      t.addEventListener("click", () => afficherOnglet(t.id.slice(2)));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const j = (i + (e.key === "ArrowRight" ? 1 : onglets.length - 1)) % onglets.length;
        onglets[j].focus();
        afficherOnglet(onglets[j].id.slice(2));
      });
    });
  }

  /* ================= Actions ================= */

  function surClic(e) {
    const el = e.target.closest("button");
    if (!el) return;
    if (el.dataset.aller) return afficherOnglet(el.dataset.aller);
    if (el.dataset.retablir) {
      const id = el.dataset.retablir;
      cr[id] = { texte: genere[id], modifie: false };
      const ta = $(`[data-section="${id}"]`);
      ta.value = genere[id];
      ajuster(ta);
      el.hidden = true;
      majACompleter();
      sauverBrouillon();
      return;
    }
    if (el.dataset.ajouterEpreuve) {
      const id = el.dataset.ajouterEpreuve;
      dossier.tests[id].lignes.push({ id: "x" + Date.now().toString(36), epreuve: "", type: "ds", valeur: "", moy: "", et: "", sens: "haut", commentaire: "" });
      reconstruireTest(id);
      const champs = $$(`[data-bloc-test="${id}"] .e-nom input`);
      champs[champs.length - 1].focus();
      return;
    }
    if (el.dataset.supprEpreuve) {
      const [id, i] = el.dataset.supprEpreuve.split(":");
      dossier.tests[id].lignes.splice(Number(i), 1);
      reconstruireTest(id);
      nonEnregistre = true;
      majTout();
      return;
    }
    if (el.dataset.supprPraticien !== undefined) {
      const i = Number(el.dataset.supprPraticien);
      demander("Retirer ce praticien des réglages ?", "Retirer").then((ok) => {
        if (!ok) return;
        reglages.praticiens.splice(i, 1);
        if (reglages.signataire >= reglages.praticiens.length) reglages.signataire = 0;
        sauverReglages(); construirePraticiens(); majTout();
      });
      return;
    }
    switch (el.dataset.action) {
      case "enregistrer": return enregistrer();
      case "nouveau": return nouveau();
      case "word": return word();
      case "apercu": return apercu();
      case "fermer-apercu": return fermerApercu();
      case "imprimer": $("#impression").innerHTML = htmlModele(modele()); return window.print();
      case "copier": return copier();
      case "effacer-cotation":
        demander("Effacer la cotation des 13 critères ?", "Effacer la cotation").then((ok) => {
          if (!ok) return;
          dossier.lignes = {}; dossier.c1 = ""; dossier.c2 = ""; dossier.tailleMm = ""; dossier.adoTermine = "";
          remplirFormulaire(); nonEnregistre = true; majTout();
        });
        return;
      case "ajouter-praticien":
        if (reglages.praticiens.length >= 4) return annoncer("Quatre praticiens au plus dans l'en-tête.");
        reglages.praticiens.push(B.praticienVide());
        sauverReglages(); construirePraticiens();
        $$("#praticiens .praticien").pop().querySelector("input").focus();
        return;
      case "ajouter-question":
        reglages.autoQuestions.push("");
        sauverReglages(); remplirReglages(); construireAuto(); remplirFormulaire(); majTout();
        $$("[data-reg-question]").pop().focus();
        return;
      case "retirer-question":
        reglages.autoQuestions.pop();
        sauverReglages(); remplirReglages(); construireAuto(); remplirFormulaire(); majTout();
        return;
      case "retirer-photo":
        dossier.photoCopie = ""; dossier.photoL = ""; dossier.photoH = "";
        majPhoto(); nonEnregistre = true; majTout();
        return;
      case "exporter-reglages":
        return telecharger("reglages-outil-ergo.json", JSON.stringify(reglages, null, 2), "application/json", "Réglages exportés");
    }
  }

  function surFichier(e) {
    const action = e.target.dataset && e.target.dataset.action;
    if (!action) return false;
    if (action === "ouvrir") {
      const champ = e.target;
      const suite = () => lireFichier(champ).then(ouvrir).catch((err) => annoncer(err.message));
      if (!nonEnregistre) suite();
      else demander("Le dossier en cours n'est pas enregistré. Ouvrir l'autre dossier quand même ?", "Ouvrir le dossier")
        .then((ok) => { if (ok) suite(); else champ.value = ""; });
    } else if (action === "photo") {
      const f = e.target.files && e.target.files[0];
      if (!f) return true;
      chargerPhoto(f).then((p) => {
        dossier.photoCopie = p.donnees; dossier.photoL = String(p.l); dossier.photoH = String(p.h);
        majPhoto(); nonEnregistre = true; majTout();
        annoncer("Photo ajoutée");
      }).catch((err) => annoncer(err.message)).finally(() => { e.target.value = ""; });
    } else if (action === "importer-normes") {
      lireFichier(e.target).then((obj) => {
        const n = obj && obj.qualite ? obj : obj && obj.normes ? obj.normes : null;
        if (!n) throw new Error("Ce fichier ne contient pas de normes BHK.");
        reglages.normes = B.normaliserNormes(n);
        sauverReglages(); construireNormes(); majTout();
        annoncer("Normes importées");
      }).catch((err) => annoncer(err.message));
    } else if (action === "importer-reglages") {
      lireFichier(e.target).then((obj) => {
        if (!obj || obj.type !== "bhk-reglages") throw new Error("Ce fichier ne contient pas de réglages.");
        reglages = B.normaliserReglages(obj);
        sauverReglages(); remplirReglages(); construireAuto(); remplirFormulaire(); majTout();
        annoncer("Réglages importés");
      }).catch((err) => annoncer(err.message));
    } else return false;
    return true;
  }

  /* ================= Démarrage ================= */

  function init() {
    document.documentElement.lang = "fr";
    construireListes();
    construireGrille();
    construireCriteres();
    construireCriteresAdo();
    construireSections();
    construireSenso();
    construireManip();
    initOnglets();
    remplirReglages();
    construireAuto();
    if (dansClaude) $$("[data-action='imprimer']").forEach((b) => { b.hidden = true; });

    const brouillon = reglages.brouillon ? lireStockage(CLE_BROUILLON) : null;
    if (brouillon && brouillon.dossier) {
      charger(brouillon);
      annoncer("Brouillon repris");
    } else {
      remplirFormulaire();
      majTout();
    }

    document.addEventListener("input", surSaisie);
    document.addEventListener("change", (e) => { if (!surFichier(e)) surSaisie(e); });
    document.addEventListener("click", (e) => { surClicRadio(e); surClic(e); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#apercu").hidden) fermerApercu(); });
    window.addEventListener("beforeprint", () => { $("#impression").innerHTML = htmlModele(modele()); });
    window.addEventListener("beforeunload", (e) => {
      if (!nonEnregistre || reglages.brouillon) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  init();
})();
