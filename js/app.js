/* Outil Ergo : interface du bilan d'écriture. Dépend de js/bhk.js et js/docx.js. */
(function () {
  "use strict";

  const B = window.BHK;
  const W = window.DocxBHK;
  const O = window.Occup;
  const TOUTES_SECTIONS = B.SECTIONS.concat(B.SECTIONS_ECOLE);
  const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
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

  // Version personnelle : les normes du manuel sont intégrées au fichier (window.NORMES_INTEGREES).
  function avecNormesIntegrees(r) {
    if (!B.normesPresentes(r.normes) && window.NORMES_INTEGREES) r.normes = B.normaliserNormes(window.NORMES_INTEGREES);
    // Version du cabinet : en-tête et praticiens préremplis tant que les réglages n'en ont pas.
    const integres = window.REGLAGES_INTEGRES;
    if (integres) {
      if (!r.praticiens.some((p) => p.nom.trim())) {
        const base = B.normaliserReglages(Object.assign({}, r, { cabinet: integres.cabinet, praticiens: integres.praticiens }));
        r.cabinet = base.cabinet;
        r.praticiens = base.praticiens;
      } else {
        // Praticiens du cabinet ajoutés s'ils manquent ; praticiens retirés du cabinet enlevés.
        const retires = (integres.retires || []).map((n) => n.toLowerCase());
        r.praticiens = r.praticiens.filter((p) => retires.indexOf(p.nom.trim().toLowerCase()) < 0);
        (integres.praticiens || []).forEach((p) => {
          if (r.praticiens.length < 4 && !r.praticiens.some((x) => x.nom.trim().toLowerCase() === String(p.nom).trim().toLowerCase())) {
            const vide = r.praticiens.findIndex((x) => !x.nom.trim());
            const nouveau = Object.assign(B.praticienVide(), p);
            if (vide >= 0) r.praticiens[vide] = nouveau; else r.praticiens.push(nouveau);
          }
        });
        if (!r.praticiens.length) r.praticiens = [B.praticienVide()];
        if (r.signataire >= r.praticiens.length) r.signataire = 0;
        if (!r.cabinet.nom.trim() && integres.cabinet) r.cabinet = B.normaliserReglages({ cabinet: integres.cabinet }).cabinet;
      }
      // Texte des questions de l'ESO (exemplaire du cabinet), s'il n'est pas déjà enregistré.
      if (integres.eso && typeof integres.eso === "object" && !(r.esoLibelles.sp.length + r.esoLibelles.p.length + r.esoLibelles.l.length)) {
        r.esoLibelles = B.normaliserReglages({ esoLibelles: integres.eso }).esoLibelles;
      }
      // Grille de cotation de l'ESO (exemplaire du cabinet), si elle n'est pas déjà enregistrée.
      if (integres.esoCotation && !r.esoCotation) r.esoCotation = B.normaliserReglages({ esoCotation: integres.esoCotation }).esoCotation;
      // Logo du cabinet (documents et PDF), s'il n'a pas été choisi sur cet appareil.
      if (integres.logo && !r.logoCabinet) r.logoCabinet = B.normaliserReglages({ logoCabinet: integres.logo }).logoCabinet;
      // Questionnaire d'auto-évaluation du cabinet : libellés et domaines, si aucun libellé n'est encore saisi.
      const q = integres.auto;
      if (q && Array.isArray(q.questions) && q.questions.length && !r.autoQuestions.some((x) => String(x).trim())) {
        const base = B.normaliserReglages({ autoNom: q.nom || r.autoNom, autoQuestions: q.questions, autoDomaines: q.domaines || [] });
        r.autoNom = base.autoNom; r.autoQuestions = base.autoQuestions; r.autoDomaines = base.autoDomaines;
      } else if (q && Array.isArray(q.domaines) && Array.isArray(q.questions) && !r.autoDomaines.some(Boolean) && r.autoQuestions.length === q.questions.length) {
        r.autoDomaines = B.normaliserReglages({ autoQuestions: r.autoQuestions, autoDomaines: q.domaines }).autoDomaines;
      }
    }
    return r;
  }
  // Fichier du cabinet (jamais publié) : normes du BHK et texte des questionnaires protégés, gardés sur l'appareil.
  // Accepte aussi un ancien fichier de normes seules. remplacer = false : ne complète que ce qui manque.
  function appliquerContenusCabinet(obj, remplacer) {
    const faits = [];
    if (!obj || typeof obj !== "object") return faits;
    const n = obj.qualite ? obj : obj.normes && typeof obj.normes === "object" ? obj.normes : null;
    if (n && (remplacer || !B.normesPresentes(reglages && reglages.normes))) { reglages.normes = B.normaliserNormes(n); faits.push("normes du BHK"); }
    const eso = obj.eso && typeof obj.eso === "object" ? B.normaliserReglages({ esoLibelles: obj.eso }).esoLibelles : null;
    if (eso && eso.sp.length + eso.p.length + eso.l.length) {
      const deja = reglages.esoLibelles.sp.length + reglages.esoLibelles.p.length + reglages.esoLibelles.l.length;
      if (remplacer || !deja) { reglages.esoLibelles = eso; faits.push("texte des questions de l'ESO"); }
    }
    const cot = obj.esoCotation ? B.normaliserReglages({ esoCotation: obj.esoCotation }).esoCotation : null;
    if (cot && (remplacer || !reglages.esoCotation)) { reglages.esoCotation = cot; faits.push("grille de cotation de l'ESO"); }
    const logo = obj.logo ? B.normaliserReglages({ logoCabinet: obj.logo }).logoCabinet : null;
    if (logo && (remplacer || !reglages.logoCabinet)) { reglages.logoCabinet = logo; faits.push("logo du cabinet"); }
    const avq = obj.avq && typeof obj.avq === "object" ? B.normaliserReglages({ avqLibelles: obj.avq }).avqLibelles : null;
    if (avq && nbAvqLibelles(avq) && (remplacer || !nbAvqLibelles(reglages.avqLibelles))) { reglages.avqLibelles = avq; faits.push("texte du questionnaire d'autonomie (AVQ)"); }
    const q = obj.auto && Array.isArray(obj.auto.questions) && obj.auto.questions.length ? obj.auto : null;
    if (q && remplacer) {
      const base = B.normaliserReglages({ autoNom: q.nom || reglages.autoNom, autoQuestions: q.questions, autoDomaines: q.domaines || [] });
      reglages.autoNom = base.autoNom; reglages.autoQuestions = base.autoQuestions; reglages.autoDomaines = base.autoDomaines;
      faits.push("questionnaire d'auto-appréciation");
    }
    return faits;
  }

  function nbAvqLibelles(l) { return l && l.domaines ? Object.keys(l.domaines).reduce((t, k) => t + (l.domaines[k] || []).length, 0) : 0; }
  function chargerReglages() { return avecNormesIntegrees(B.normaliserReglages(lireStockage(CLE_REGLAGES))); }
  function sauverReglages() { ecrireStockage(CLE_REGLAGES, reglages); }

  let minuteurBrouillon = null;
  function sauverBrouillon() {
    clearTimeout(minuteurBrouillon);
    if (reglages.brouillon && !dossierVierge()) majEtatEnregistrement("attente");
    minuteurBrouillon = setTimeout(() => {
      if (!reglages.brouillon) return;
      ecrireStockage(CLE_BROUILLON, { dossier: dossier, compteRendu: cr, le: new Date().toISOString() });
      enregistrerDansMesDossiers();
    }, 500);
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
        else annoncer("Le téléchargement n'a pas abouti ici. Sur téléphone, ouvrez l'outil dans le navigateur (Safari, Chrome) ou sur un ordinateur.");
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
          <legend class="critere-tete"><span class="num">${c.id}</span><span class="intitule"><span class="nom">${esc(c.nom)}</span><span class="aide-critere">${esc(c.aide)}</span></span></legend>
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
    let h = `<h4 class="sous-groupe">📨 Réponses des parents</h4>
      <div class="grille2">${champTexte("Rempli par", c + ".repondant", 'placeholder="les parents"')}${champDate("Date", c + ".date")}</div>
      <div class="barre-actions barre-eso-pdf">
        <button type="button" class="bouton bouton-second bouton-petit" data-action="eso-pdf">📄 PDF à remplir pour les parents</button>
        <label class="bouton bouton-second bouton-petit">📥 Importer le PDF rempli
          <input type="file" accept="application/pdf,.pdf" data-action="importer-pdf-parents" class="masque"></label>
      </div>
      <p class="calcule etat-eso-parents" aria-live="polite"></p>
      <p class="note">Avec le PDF, les réponses arrivent toutes seules. Sur papier, reportez le chiffre entouré pour chaque question : de 0 (jamais, pas du tout) à 10 (toujours, tout à fait).
        ${reglages.esoLibelles.sp.length ? "" : `Pour voir ici le texte des questions, importez une fois le fichier du cabinet (ou collez le texte de votre exemplaire) dans les <button type="button" class="bouton-lien" data-aller="reglages">Réglages</button>.`}</p>
      ${S.DOMAINES_ITEMS_ESO.map((dm) => `<details class="eso-domaine"><summary>${esc(dm[1])} <span class="eso-compte" id="eso-n-${dm[0]}"></span></summary>
        <div class="eso-items${(reglages.esoLibelles[dm[0]] || []).length ? " avec-libelles" : ""}">${Array.from({ length: S.NB_ITEMS_ESO }, (_, i) => {
          const lib = (reglages.esoLibelles[dm[0]] || [])[i] || "";
          return `<label class="eso-item"><span class="eso-num">${i + 1}</span>${lib ? `<span class="eso-lib">${esc(lib)}</span>` : ""}
            <input type="text" inputmode="numeric" maxlength="2" placeholder="0-10" data-chemin="${c}.items.${dm[0]}.${i + 1}" data-note10 aria-label="${esc(dm[1])}, question ${i + 1}"></label>`;
        }).join("")}</div></details>`).join("")}
      <h4 class="sous-groupe">🧮 Cotation : roues et systèmes sensoriels</h4>
      <p class="note">Avec les réponses des parents et la grille de cotation du cabinet, tout se calcule seul. Sinon, reportez les valeurs de la fiche de synthèse : roues de 0 à 3, sous-totaux de chaque domaine pour les systèmes (le pourcentage se calcule). 3 correspond à un engagement adapté.</p>
      <p class="calcule" id="etat-cotation-eso" aria-live="polite"></p>
      <button type="button" class="bouton-lien" data-action="eso-recalculer" hidden>Recalculer à partir des réponses</button>
      <p class="petit-titre">Roues par domaine d'occupation (0 à 3)</p>
      <div class="defile"><table class="table-saisie"><thead><tr><th scope="col">Domaine</th>${S.SECTEURS_ESO.map((s) => `<th scope="col" title="${esc(S.SECTEURS_NOMS_ESO[s].nom)}">${s}</th>`).join("")}</tr></thead><tbody>
      ${S.DOMAINES_ESO.map((dm) => `<tr><th scope="row">${esc(dm[1])}</th>${S.SECTEURS_ESO.map((s) => `<td><input type="text" inputmode="decimal" data-chemin="${c}.roues.${dm[0]}.${s}" aria-label="${esc(dm[1])}, ${s}"></td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
      <p class="note legende-secteurs">${S.SECTEURS_ESO.map((s) => `<strong>${s}</strong> ${esc(S.SECTEURS_NOMS_ESO[s].nom)}`).join(" · ")}</p>
      <p class="petit-titre">Systèmes sensoriels</p>
      <div class="defile"><table class="table-saisie"><thead><tr><th scope="col">Système</th><th scope="col">Soins pers.</th><th scope="col">Productivité</th><th scope="col">Loisirs</th><th scope="col">%</th></tr></thead><tbody>
      ${S.SYSTEMES_ESO.map((sy) => `<tr><th scope="row">${esc(sy.nom)}</th>${["sp", "p", "l"].map((k) => `<td><input type="text" inputmode="decimal" data-chemin="${c}.systemes.${sy.id}.${k}" aria-label="${esc(sy.nom)}, ${k}"></td>`).join("")}<td><output id="eso-pct-${sy.id}"></output></td></tr>`).join("")}
      </tbody></table></div>
      <h4 class="sous-groupe">📊 Graphiques</h4>
      <div class="graphique" id="g-eso-roues" hidden></div><div class="graphique" id="g-eso-systemes" hidden></div><div class="graphique" id="g-eso-items" hidden></div>
      <p class="note vide-graphiques-eso">Les graphiques apparaissent dès que les réponses ou les valeurs de la fiche de synthèse sont saisies.</p>
      <h4 class="sous-groupe">🧠 Synthèse interprétée pour le compte rendu</h4>
      <div class="apercu-synthese" id="apercu-eso"></div>
      <p class="note">Elle suit les réponses et vos observations. Pour la retoucher : onglet Compte rendu, section « Engagement sensori-occupationnel (ESO) ».</p>
      ${champZone("Vos observations (ajoutées à la fin de la synthèse)", c + ".notes")}
      <details class="detail-resultats"><summary>Détail des résultats, secteur par secteur (pour vous)</summary><div class="apercu-synthese" id="detail-eso"></div></details>`;
    return h;
  }

  /* Questionnaires pour les parents en PDF à remplir (ESO, autonomie au quotidien) : modèles vierges, puis import */
  const PE = window.PdfFormulaire;
  function libellesEsoPresents() { const l = reglages.esoLibelles; return l.sp.length + l.p.length + l.l.length > 0; }
  function dateDepuisTexte(t) {
    const s = String(t || "").trim();
    let a, m, j, r;
    if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { a = +r[1]; m = +r[2]; j = +r[3]; }
    else if ((r = /^(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{4}|\d{2})$/.exec(s))) { j = +r[1]; m = +r[2]; a = r[3].length === 2 ? 2000 + +r[3] : +r[3]; }
    else return "";
    const d = new Date(a, m - 1, j);
    if (d.getFullYear() !== a || d.getMonth() !== m - 1 || d.getDate() !== j) return "";
    return a + "-" + String(m).padStart(2, "0") + "-" + String(j).padStart(2, "0");
  }
  const net = (x) => String(x || "").trim();
  function majEtatQuestionnairesParents(items) {
    const e = (dossier.senso && dossier.senso.eso) || {};
    const n = (items || S.itemsEso(S.normaliser(dossier.senso).eso)).reduce((t, x) => t + x.n, 0);
    const tEso = !libellesEsoPresents() ? "Pour créer ce PDF, importez une fois le fichier du cabinet dans les Réglages."
      : e.pdfImporte ? "✅ Réponses importées le " + B.dateCourte(e.pdfImporte) + " : " + n + " sur " + S.NB_ITEMS_ESO * 3 + "." : "";
    $$(".etat-eso-parents").forEach((el) => { el.textContent = tEso; el.hidden = !tEso; });
    const q = O.normaliserAvqParents(dossier.avqParents);
    const nq = O.DOMAINES_AVQP.reduce((t, d) => t + Object.keys(q.domaines[d.id].reponses).length, 0);
    const total = O.DOMAINES_AVQP.reduce((t, d) => t + O.nbQuestionsAvqp(d.id, reglages.avqLibelles), 0);
    const tAvq = q.pdfImporte ? "✅ Réponses importées le " + B.dateCourte(q.pdfImporte) + " : " + nq + " sur " + total + "." : "";
    $$(".etat-avq-parents").forEach((el) => { el.textContent = tAvq; el.hidden = !tAvq; });
  }
  // En-tête du PDF : cabinet et ergothérapeute signataire (aucune donnée de l'enfant : le modèle sert pour tous).
  function enteteCabinetPdf() {
    const sig = reglages.praticiens[reglages.signataire] || reglages.praticiens[0] || {};
    const lignes = [reglages.cabinet.nom].concat(net(reglages.cabinet.adresse).split("\n")).map(net).filter(Boolean).slice(0, 3);
    const coord = [sig.tel, sig.email].map(net).filter(Boolean).join(" – ");
    if (net(sig.nom)) lignes.push(net(sig.nom) + (coord ? " · " + coord : ""));
    return { cabinet: lignes, logo: reglages.logoCabinet ? reglages.logoCabinet.donnees : null, contact: net(sig.email), mention: "Document confidentiel : à renvoyer uniquement à votre ergothérapeute." };
  }
  async function exporterPdfParents(quoi) {
    const avq = quoi === "avq";
    if (!avq && !libellesEsoPresents()) {
      if (await demander("Le texte des questions de l'ESO n'est pas encore sur cet appareil. Importez une fois le fichier du cabinet dans les Réglages, puis revenez ici.", "Ouvrir les Réglages")) afficherOnglet("reglages");
      return;
    }
    const en = enteteCabinetPdf();
    let octets;
    try {
      octets = avq ? PE.creerFormulaire(O.specAvqParents({ libelles: reglages.avqLibelles, cabinet: en.cabinet, logo: en.logo, contact: en.contact, mention: en.mention }))
        : PE.creerFormulaireEso({ cabinet: en.cabinet, logo: en.logo, contact: en.contact, mention: en.mention, libelles: reglages.esoLibelles });
    } catch (err) {
      annoncer("Le PDF n'a pas pu être créé : " + (err && err.message ? err.message : "erreur inconnue") + ".");
      return;
    }
    await telecharger(avq ? "Questionnaire_autonomie_AVQ_parents.pdf" : "Questionnaire_ESO_parents.pdf", octets, "application/pdf",
      "PDF prêt : joignez-le à un e-mail pour les parents (le même pour tous les enfants)");
  }

  // Le PDF rempli va dans le dossier ouvert : on vérifie le nom écrit par les parents.
  function sansAccents(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  async function accordEnfant(nomPdf, naissancePdf) {
    if (!net(dossier.prenom) && !net(dossier.nom)) throw new Error("Ouvrez d'abord le dossier de l'enfant (ou créez-le avec son prénom), puis importez le PDF." + (nomPdf ? " Ce questionnaire concerne « " + nomPdf + " »." : ""));
    const mots = sansAccents(nomPdf).split(/[^a-z]+/).filter(Boolean);
    const cle = sansAccents(net(dossier.prenom) || net(dossier.nom)).split(/[^a-z]+/).filter(Boolean);
    if (nomPdf && cle.length && cle.every((m) => mots.indexOf(m) >= 0)) return true;
    return demander((nomPdf ? "Ce questionnaire concerne « " + nomPdf + " »" + (naissancePdf ? ", né(e) le " + naissancePdf : "") + "." : "Le nom de l'enfant n'est pas écrit dans le PDF.")
      + " L'importer dans le dossier « " + nomEnfant(dossier) + " » ?", "Importer dans ce dossier");
  }
  async function importerPdfParents(f) {
    if (!/\.pdf$/i.test(f.name || "") && f.type !== "application/pdf") throw new Error("Choisissez le fichier PDF renvoyé par les parents (son nom se termine par .pdf).");
    let lu;
    try { lu = await PE.lireChampsPdf(new Uint8Array(await f.arrayBuffer())); }
    catch (e) { throw new Error("Ce PDF n'a pas pu être lu. Demandez aux parents de le renvoyer, ou saisissez les réponses à la main."); }
    const type = lu.meta && lu.meta.type;
    const noms = Object.keys(lu.champs);
    if (type === "outil-ergo-avq" || noms.some((k) => /^avq_/.test(k))) return importerAvqParents(lu);
    if (type === "outil-ergo-eso" || noms.some((k) => /^eso_/.test(k))) return importerEso(lu);
    throw new Error("Ce PDF n'est pas un questionnaire créé par l'outil. S'il a été imprimé puis scanné, saisissez les réponses à la main.");
  }
  const SANS_REPONSE = "Ce PDF ne contient aucune réponse. Les parents l'ont peut-être rempli sans l'enregistrer : demandez-leur de cliquer sur « Enregistrer » avant de vous le renvoyer.";
  async function importerEso(lu) {
    const r = PE.depuisChampsEso(lu);
    if (!r.nombre) throw new Error(SANS_REPONSE);
    if (!(await accordEnfant(r.enfant, r.naissance))) return;
    const eso = lireChemin(dossier, "senso.eso") || {};
    const avant = S.itemsEso(S.normaliser(dossier.senso).eso).reduce((t, x) => t + x.n, 0);
    if (avant && !(await demander(avant + (avant > 1 ? " réponses sont déjà saisies" : " réponse est déjà saisie") + " dans l'ESO. Les remplacer par les " + r.nombre + " réponses du PDF ?", "Remplacer"))) return;
    ecrireChemin(dossier, "senso.eso.items", { sp: r.reponses.sp, p: r.reponses.p, l: r.reponses.l });
    ecrireChemin(dossier, "senso.eso.fait", "oui");
    if (!net(eso.repondant) && r.repondant) ecrireChemin(dossier, "senso.eso.repondant", r.repondant.slice(0, 120));
    if (!eso.date) ecrireChemin(dossier, "senso.eso.date", dateDepuisTexte(r.date) || B.aujourdhui());
    ecrireChemin(dossier, "senso.eso.pdfImporte", B.aujourdhui());
    apresImport("sensoriel", "#bloc-eso", "details.eso-domaine");
    const manque = S.NB_ITEMS_ESO * 3 - r.nombre;
    annoncer(r.nombre + " réponses importées dans l'ESO" + (manque ? " (" + manque + " sans réponse)" : ""));
  }
  async function importerAvqParents(lu) {
    const r = O.depuisChampsAvqParents(lu.champs);
    if (!r.nombre && !r.autres) throw new Error(SANS_REPONSE);
    if (!(await accordEnfant(r.donnees.enfant, r.naissance))) return;
    const q = O.normaliserAvqParents(dossier.avqParents);
    const avant = O.DOMAINES_AVQP.reduce((t, d) => t + Object.keys(q.domaines[d.id].reponses).length, 0);
    if (avant && !(await demander(avant + (avant > 1 ? " réponses sont déjà saisies" : " réponse est déjà saisie") + " dans le questionnaire d'autonomie. Les remplacer par celles du PDF (" + r.nombre + ") ? Vos commentaires sont gardés.", "Remplacer"))) return;
    const n = r.donnees;
    // Les commentaires de l'ergothérapeute restent ; le reste vient du PDF.
    O.DOMAINES_AVQP.forEach((d) => { n.domaines[d.id].commentaire = q.domaines[d.id].commentaire; });
    n.commentaire = q.commentaire;
    n.fait = "oui";
    n.repondant = net(q.repondant) || n.repondant.slice(0, 120);
    n.date = q.date || dateDepuisTexte(n.date) || B.aujourdhui();
    n.pdfImporte = B.aujourdhui();
    dossier.avqParents = n;
    apresImport("occupations", "#bloc-avq-parents", "details.avq-domaine");
    const total = O.DOMAINES_AVQP.reduce((t, d) => t + O.nbQuestionsAvqp(d.id, reglages.avqLibelles), 0);
    annoncer(r.nombre + " réponses importées dans « Autonomie dans les activités quotidiennes »" + (total > r.nombre ? " (" + (total - r.nombre) + " sans réponse)" : ""));
  }
  function apresImport(onglet, bloc, details) {
    nonEnregistre = true;
    remplirFormulaire();
    majTout();
    sauverBrouillon();
    afficherOnglet(onglet);
    const b = $(bloc);
    if (b) {
      const premier = $(details, b);
      if (premier) premier.open = true;
      b.scrollIntoView({ block: "start" });
    }
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
    const nomDomaine = (id) => (B.DOMAINES_AUTO.find((x) => x[0] === id) || [])[1];
    const avecLibelles = reglages.autoQuestions.some((q) => String(q).trim());
    const utilises = B.DOMAINES_AUTO.filter((x) => reglages.autoDomaines.indexOf(x[0]) >= 0);
    let h = avecLibelles
      ? (utilises.length ? `<p class="legende-auto">${utilises.map((x) => `<span class="domaine-auto domaine-${x[0]}">${esc(x[1])}</span>`).join("")}</p>` : "")
      : `<p class="note">Aucune question : saisissez-les dans les Réglages (questionnaire d'auto-évaluation).</p>`;
    for (let i = 1; i <= n; i++) {
      const dm = reglages.autoDomaines[i - 1];
      h += `<div class="item-grille item-auto${dm ? " theme-" + dm : ""}"><span class="item-label"><span id="lq-${i}">${i}. ${esc(reglages.autoQuestions[i - 1] || "Question " + i)}</span>${dm ? `<span class="domaine-auto domaine-${dm}">${esc(nomDomaine(dm))}</span>` : ""}</span>
        ${pastilles("auto-" + i, "auto.reponses." + i, B.ECHELLE_AUTO.map((e, k) => [String(k), e + " (" + k + ")"]))}</div>`;
    }
    h += `<div class="synthese-auto" id="synthese-auto" aria-live="polite"></div>`;
    h += `<div class="champ"><label for="synthese-cr-auto">Synthèse pour le compte rendu</label>
      <p class="note" id="etat-synthese-cr-auto"></p>
      <textarea id="synthese-cr-auto" data-chemin="auto.synthese" rows="5"></textarea>
      <div class="barre-actions"><button type="button" class="bouton bouton-second bouton-petit" data-action="reproposer-synthese-auto" data-quoi="synthese">Reproposer la synthèse</button></div></div>
      <div class="champ"><label for="notes-auto">Analyse détaillée <small class="discret">(reste dans le dossier, n'est pas dans le compte rendu)</small></label>
      <p class="note" id="etat-synthese-auto"></p>
      <textarea id="notes-auto" data-chemin="auto.notes" rows="13"></textarea>
      <div class="barre-actions"><button type="button" class="bouton bouton-second bouton-petit" data-action="reproposer-synthese-auto" data-quoi="notes">Reproposer l'analyse</button></div></div>`;
    $("#auto").innerHTML = blocRealise("auto", reglages.autoNom, "auto", h);
  }
  // Analyse détaillée et synthèse pour le compte rendu, rédigées par l'outil tant que l'ergothérapeute ne les a pas modifiées.
  const TEXTES_AUTO = {
    notes: { drapeau: "notesAuto", champ: "#notes-auto", etat: "#etat-synthese-auto", nom: "l'analyse", produire: () => B.syntheseAutoTexte(dossier, reglages) },
    synthese: { drapeau: "syntheseAuto", champ: "#synthese-cr-auto", etat: "#etat-synthese-cr-auto", nom: "la synthèse", produire: () => B.syntheseAutoCourte(dossier, reglages) },
  };
  function majSyntheseAuto(forcer) {
    if (!dossier.auto || typeof dossier.auto !== "object") return;
    Object.keys(TEXTES_AUTO).forEach((cle) => {
      const t = TEXTES_AUTO[cle];
      const propose = t.produire();
      const actuel = String(dossier.auto[cle] || "");
      const libre = !actuel.trim() || dossier.auto[t.drapeau] === "oui";
      if ((libre || forcer === cle) && propose && actuel !== propose) {
        dossier.auto[cle] = propose;
        dossier.auto[t.drapeau] = "oui";
        const z = $(t.champ);
        if (z && document.activeElement !== z) z.value = propose;
        nonEnregistre = true;
        sauverBrouillon();
      }
      const etat = $(t.etat);
      if (etat) etat.textContent = !propose ? "Proposée dès les premières réponses."
        : dossier.auto[t.drapeau] === "oui" ? (cle === "synthese" ? "Version courte, reprise dans le compte rendu. " : "Lecture complète des réponses et du bilan, pour vous. ") + "Proposée par l'outil ; modifiez-la librement : une fois modifiée, elle n'est plus changée automatiquement."
        : "Modifiée par vous : elle n'est plus mise à jour automatiquement.";
    });
  }
  async function reproposerSyntheseAuto(cle) {
    const t = TEXTES_AUTO[cle] || TEXTES_AUTO.synthese;
    const k = TEXTES_AUTO[cle] ? cle : "synthese";
    if (!t.produire()) return annoncer("Saisissez d'abord des réponses au questionnaire.");
    const modifiee = String(dossier.auto[k] || "").trim() && dossier.auto[t.drapeau] !== "oui";
    if (modifiee && !(await demander("Remplacer votre texte par " + t.nom + " proposée par l'outil ?", "Remplacer"))) return;
    majSyntheseAuto(k);
    const z = $(t.champ);
    if (z) z.value = dossier.auto[k];
    majTout();
    annoncer(cle === "notes" ? "Analyse proposée" : "Synthèse proposée");
  }
  function majAuto() {
    const el = $("#synthese-auto");
    if (!el) return;
    const sa = B.syntheseAuto(B.normaliserDossier(dossier).auto, reglages);
    el.innerHTML = !sa.repondues ? "" : `<strong>Nombre de réponses dans chaque colonne</strong>
      <div class="colonnes-auto">${B.ECHELLE_AUTO.map((e, k) => `<span><strong>${sa.colonnes[k]}</strong>${esc(e)}</span>`).join("")}</div>
      <p class="note">Souvent ou toujours : ${sa.frequentes} question${sa.frequentes > 1 ? "s" : ""} sur ${sa.repondues}.</p>` +
      (sa.domaines.some((d) => d.repondues) ? `<ul class="domaines-auto">${sa.domaines.filter((d) => d.repondues).map((d) => `<li><span class="domaine-auto domaine-${d.id}">${esc(d.nom)}</span> souvent ou toujours : ${d.frequentes} sur ${d.repondues} · ${d.points} points sur ${d.max}</li>`).join("")}</ul>` : "");
  }

  /* ---------- Occupations : autonomie, MCRO, OT'Hope, tri de cartes ; DCDQ ---------- */

  // Questionnaire d'autonomie rempli par les parents : PDF, réponses (importées ou saisies), commentaires, synthèse.
  function htmlAvqParents() {
    const c = "avqParents", lib = O.libellesAvqp(reglages.avqLibelles);
    const freq = O.FREQ_AVQP.map((f, k) => [String(k), f]);
    const domaine = (d) => {
      const libs = (lib.domaines && lib.domaines[d.id]) || [];
      const ch = c + ".domaines." + d.id;
      const items = Array.from({ length: O.nbQuestionsAvqp(d.id, lib) }, (_, i) => {
        const n = i + 1, texteQ = libs[i] || "Question " + n;
        return `<div class="item-avqp"><span class="item-label"><span class="eso-num">${n}</span>${esc(texteQ)}</span>
          ${pastilles("avqp-" + d.id + "-" + n, ch + ".reponses." + n, freq)}
          <input type="text" class="remarque" data-chemin="${ch}.remarques.${n}" placeholder="Remarque des parents" aria-label="Remarque des parents, ${esc(d.nom)}, question ${n}"></div>`;
      }).join("");
      return `<details class="avq-domaine" data-avqp="${d.id}"><summary>${esc(d.nom)} <span class="avq-compte" id="avqp-n-${d.id}"></span></summary>
        ${d.question ? `<div class="champ"><span>Autonome dans ce domaine, selon les parents</span>${pastilles("avqp-auto-" + d.id, ch + ".autonome", [["oui", "Oui"], ["non", "Non"]])}</div>` : ""}
        <div class="avqp-items">${items}</div>
        ${d.question ? champZone("Aides mises en place, selon les parents", ch + ".aides") : champZone("Autres éléments rapportés par les parents", c + ".complement")}
        ${champZone("💬 Votre commentaire sur ce domaine (repris dans le compte rendu)", ch + ".commentaire")}
      </details>`;
    };
    return `<div class="sous-bloc" id="bloc-avq-parents">
      <h4 class="sous-groupe">📨 Questionnaire des parents</h4>
      <p class="note">${esc(lib.titre)} (${esc(B.min(lib.source))}). Un PDF à remplir, le même pour tous les enfants : envoyez-le avant le rendez-vous, puis importez le PDF rempli. Sur papier, cochez ici les réponses à la main.</p>
      <div class="barre-actions barre-eso-pdf">
        <button type="button" class="bouton bouton-second bouton-petit" data-action="avq-pdf">📄 PDF à remplir pour les parents</button>
        <label class="bouton bouton-second bouton-petit">📥 Importer le PDF rempli
          <input type="file" accept="application/pdf,.pdf" data-action="importer-pdf-parents" class="masque"></label>
      </div>
      <p class="calcule etat-avq-parents" aria-live="polite"></p>
      <label class="case case-titre case-avqp"><input type="checkbox" data-chemin="${c}.fait" data-bascule="#corps-avq-parents"><span>Réponses des parents</span></label>
      <div id="corps-avq-parents" hidden>
        <div class="grille2">${champTexte("Rempli par", c + ".repondant", 'placeholder="les parents"')}${champDate("Date", c + ".date")}</div>
        <div class="grille3">${champTexte("Classe (selon les parents)", c + ".classe")}
          <div class="champ"><span>AESH (AVS)</span>${pastilles("avqp-aesh", c + ".aesh", [["oui", "Oui"], ["non", "Non"]])}</div>
          ${champTexte("Nombre d'heures", c + ".heures")}</div>
        <p class="note">Nom écrit par les parents dans le PDF : <strong id="avqp-enfant">–</strong></p>
        ${O.DOMAINES_AVQP.map(domaine).join("")}
        <details class="avq-domaine"><summary>Priorités des parents <span class="avq-compte" id="avqp-n-priorites"></span></summary>
          <p class="note">Ordre de 1 (le plus important) à ${O.DOMAINES_AVQP.length}.</p>
          ${O.DOMAINES_AVQP.map((d) => `<div class="priorite-avqp"><span class="item-label">${esc(d.nom)}</span>
            <input type="text" inputmode="numeric" maxlength="1" data-chemin="${c}.priorites.${d.id}.rang" aria-label="Ordre de priorité, ${esc(d.nom)}">
            <input type="text" data-chemin="${c}.priorites.${d.id}.precision" placeholder="Précisions" aria-label="Précisions, ${esc(d.nom)}"></div>`).join("")}
        </details>
        ${champZone("💬 Commentaire de l'ergothérapeute (repris à la fin de la synthèse)", c + ".commentaire", 3)}
        <h5 class="titre-apercu">Synthèse pour le compte rendu</h5>
        <div class="apercu-synthese" id="apercu-avq-parents"></div>
        <p class="note">Elle suit les réponses et vos commentaires. Pour la retoucher : onglet Compte rendu, section « Autonomie au quotidien : questionnaire des parents ».</p>
      </div>
    </div>`;
  }
  function majAvqParents() {
    const q = O.normaliserAvqParents(dossier.avqParents);
    O.analyseAvqParents(q, reglages.avqLibelles).forEach((d) => {
      const o = $("#avqp-n-" + d.id);
      if (!o) return;
      const m = [];
      if (d.autonome) m.push(d.autonome === "oui" ? "autonome" : "non autonome");
      if (d.repondues) m.push(d.repondues + "/" + d.nb + " réponses");
      if (d.difficultes.length) m.push(d.difficultes.length + " difficulté" + (d.difficultes.length > 1 ? "s" : ""));
      o.textContent = m.join(" · ");
    });
    const np = O.DOMAINES_AVQP.filter((d) => q.priorites[d.id].rang).length;
    const op = $("#avqp-n-priorites");
    if (op) op.textContent = np ? np + " domaine" + (np > 1 ? "s" : "") + " classé" + (np > 1 ? "s" : "") : "";
    const oe = $("#avqp-enfant");
    if (oe) oe.textContent = q.enfant || "–";
    const ap = $("#apercu-avq-parents");
    if (ap) {
      const t = genere.avqParents || "";
      ap.innerHTML = t ? t.split("\n").map((l) => `<p>${esc(l)}</p>`).join("") : `<p class="note">Saisissez ou importez les réponses.</p>`;
      if (cr.avqParents && cr.avqParents.modifie) ap.insertAdjacentHTML("beforeend", `<p class="note">Vous avez retouché cette section dans l'onglet Compte rendu : c'est votre version qui est utilisée.</p>`);
    }
  }

  function htmlAvq() {
    return `<fieldset class="groupe"><legend>Autonomie dans les activités quotidiennes</legend>
      ${htmlAvqParents()}
      <h4 class="sous-groupe">📝 Grille de l'ergothérapeute</h4>
      <div class="grille-ergo-avq">
      <p class="note">À remplir avec les parents. La grille complète les lignes « À la maison » et « À l'école » du compte rendu ; un besoin d'aide s'ajoute aux occupations du diagnostic.</p>
      ${O.DOMAINES_AVQ.map((dm) => `<h4 class="sous-groupe">${esc(dm.nom)}</h4>` + dm.items.map((it) =>
        `<div class="item-grille item-avq"><span class="item-label">${esc(B.maj(it.nom))}</span>${pastilles("avq-" + it.id, "avq." + it.id, O.NIVEAUX_AVQ.map((n) => [n.id, n.label]))}</div>`).join("")).join("")}
    </div>
    </fieldset>`;
  }

  function htmlMcro() {
    const champs = [["importance", "Importance"], ["rendement1", "Rendement"], ["satisfaction1", "Satisfaction"], ["rendement2", "Rendement (réév.)"], ["satisfaction2", "Satisfaction (réév.)"]];
    return `<div class="grille3">${champTexte("Réalisée avec", "mcro.repondant", `placeholder="l'enfant et ses parents"`)}${champDate("Date", "mcro.date")}${champDate("Date de la réévaluation", "mcro.date2")}</div>
      <p class="note">Jusqu'à 5 activités prioritaires, cotées de 1 à 10. Les colonnes de réévaluation se remplissent plus tard (elles sont reprises d'elles-mêmes quand on charge le bilan précédent).</p>
      ${Array.from({ length: O.NB_MCRO }, (_, i) => `<div class="probleme">
        ${champTexte("Activité " + (i + 1), "mcro.problemes." + i + ".activite")}
        <div class="notes-mcro">${champs.map((c) => `<label class="champ"><span>${c[1]}</span><input type="text" inputmode="numeric" maxlength="2" data-chemin="mcro.problemes.${i}.${c[0]}"></label>`).join("")}</div>
      </div>`).join("")}
      <p class="calcule" id="mcro-moyennes" aria-live="polite"></p>
      ${champZone("Observations", "mcro.notes")}`;
  }

  function htmlOthope() {
    return `<p class="note">Saisissez le titre de chaque carte classée par l'enfant, son niveau, et cochez les objectifs qu'il a choisis. Les cartes OT'Hope ne sont pas reproduites dans l'outil.</p>
      ${dossier.othope.items.map((x, i) => `<div class="ligne-othope">
        <input type="text" data-chemin="othope.items.${i}.activite" placeholder="Activité ${i + 1}" aria-label="Activité ${i + 1}">
        ${pastilles("oh-" + i, "othope.items." + i + ".niveau", O.NIVEAUX_OTHOPE.map((n) => [n.id, n.label]))}
        <label class="case case-objectif"><input type="checkbox" data-chemin="othope.items.${i}.objectif"><span>Objectif</span></label>
      </div>`).join("")}
      ${dossier.othope.items.length < O.MAX_OTHOPE ? `<button type="button" class="bouton bouton-second" data-action="othope-lignes">Ajouter des lignes</button>` : ""}
      ${champZone("Observations", "othope.notes")}`;
  }

  function htmlListeCartes(jeu) {
    const cartes = O.cartesDuJeu(jeu, reglages.cartesPerso);
    return cartes.map((c) => `<label class="carte-case"><input type="checkbox" data-carte-incluse="${jeu}:${esc(c.id)}">
      <span>${c.photo ? `<img src="${esc(c.photo)}" alt="">` : `<span aria-hidden="true">${esc(c.emoji)}</span>`}${esc(c.enfant)}</span></label>`).join("");
  }

  function htmlCartes(jeu) {
    const J = O.JEUX[jeu];
    return `<p class="note">L'enfant range lui-même les cartes à l'écran (${J.piles.map((p) => "« " + p.label + " »").join(", ")}), en les glissant ou en touchant la boîte, puis choisit ce qui compte le plus pour lui. Une tablette est conseillée ; la lecture à voix haute aide les plus jeunes. Observation informelle, non étalonnée : cartes propres à l'outil, complétées par vos cartes personnelles (Réglages).</p>
      <details class="cartes-proposees"><summary>Cartes proposées : <span id="nb-cartes-${jeu}"></span></summary>
        <div class="cartes-liste" id="liste-cartes-${jeu}">${htmlListeCartes(jeu)}</div>
      </details>
      <div class="barre-actions">
        <button type="button" class="bouton" data-action="lancer-tri" data-jeu="${jeu}">Lancer le tri avec l'enfant</button>
        <button type="button" class="bouton-lien" data-action="effacer-tri" data-jeu="${jeu}" hidden>Effacer le tri</button>
      </div>
      <div class="resultat-tri" id="resultat-tri-${jeu}"></div>
      ${champZone("Observations pendant le tri", "cartes." + jeu + ".notes")}`;
  }

  function construireOccupation() {
    $("#occupation").innerHTML = htmlAvq() +
      blocRealise("mcro", "MCRO : mesure canadienne du rendement occupationnel", "mcro", htmlMcro()) +
      blocRealise("othope", "OT'Hope : résultats du tri de l'enfant", "othope", htmlOthope()) +
      blocRealise("cartes-activites", "Tri de cartes sur écran : mes activités", "cartes.activites", htmlCartes("activites"));
    $("#cartes-sensoriel").innerHTML = blocRealise("cartes-sensoriel", "Tri de cartes sur écran : ce que je ressens", "cartes.sensoriel", htmlCartes("sensoriel"));
  }

  function construireDcdq() {
    const facteur = (n) => O.FACTEURS_DCDQ.find((f) => f.items.indexOf(n) >= 0);
    let h = `${champTexte("Rempli par", "dcdq.repondant", 'placeholder="les parents"')}
      <p class="note">Reportez la réponse (1 à 5) de chaque question, dans l'ordre de la feuille de réponses. Les questions ne sont pas reproduites.</p>`;
    for (let n = 1; n <= O.NB_DCDQ; n++) {
      h += `<div class="item-grille item-dcdq"><span class="item-label">Question ${n} <span class="etiquette">${esc(facteur(n).nom)}</span></span>
        ${pastilles("dcdq-" + n, "dcdq.reponses." + n, [1, 2, 3, 4, 5].map((v) => [String(v), String(v)]))}</div>`;
    }
    h += `<div class="resultat-dcdq" id="dcdq-resultat" aria-live="polite"></div>${champZone("Observations", "dcdq.notes")}`;
    $("#dcdq").innerHTML = blocRealise("dcdq", "DCDQ : questionnaire sur le trouble développemental de la coordination", "dcdq", h) +
      blocRealise("tdc", "Repères TDC : recommandations internationales (ajout)", "tdc", `
        <p class="ajout"><strong>Ajout fondé sur une recommandation, à titre indicatif.</strong> Les recommandations internationales sur le trouble développemental de la coordination (${esc(B.SOURCE_TDC.court)}) décrivent quatre critères. L'outil les renseigne avec les résultats saisis (MABC-3, DCDQ, grille d'autonomie, MCRO) ; vous complétez les critères III et IV. Le diagnostic reste médical.
          <a href="${B.SOURCE_TDC.lien}" target="_blank" rel="noopener">Lire la source</a></p>
        <ul class="tdc-criteres" id="tdc-criteres"></ul>
        <div class="item-grille"><span class="item-label">Critère III : difficultés motrices présentes depuis la petite enfance ?</span>${pastilles("tdc-debut", "tdc.debut", [["oui", "Oui"], ["non", "Non"]])}</div>
        <div class="item-grille"><span class="item-label">Critère IV : autres causes écartées par un médecin ?</span>${pastilles("tdc-exclusion", "tdc.exclusion", [["oui", "Oui"], ["non", "Non"]])}</div>
        <p class="tdc-conclusion" id="tdc-conclusion" aria-live="polite"></p>
        ${champZone("Observations", "tdc.notes")}`);
  }


  /* ---------- Frappe au clavier (EViC) : passation guidée, l'enfant passe les épreuves seul ---------- */

  const C = window.Clavier;
  let evic = null;        // passation en cours
  let sonEvic = null;     // signal sonore de fin d'épreuve
  let veilleEvic = null;  // écran gardé allumé pendant la passation
  let appuiEvic = null;   // appui long en cours (bouton réservé à l'adulte)
  const DUREE_APPUI = 900;
  let minuteurIndice = null;

  function nomEtape(id) {
    if (id === "main-repetition") return "Répétition du mot à la main";
    const e = C.EPREUVES.find((x) => x.id === id);
    return e ? e.nom + " au clavier" : id;
  }

  function construireClavier() {
    const maj1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    $("#epreuves-clavier").innerHTML = C.EPREUVES.map((e) => `<div class="epreuve-clavier" id="epreuve-${e.id}">
        <div class="epreuve-clavier-tete"><strong>${esc(e.nom)}</strong><span class="discret">${e.duree / 60} min</span></div>
        <p class="note">${esc(e.consigne)}</p>
        <output class="resultat-epreuve" id="res-clavier-${e.id}"></output>
        <div class="details-epreuve" id="det-clavier-${e.id}"></div>
        <div class="epreuve-clavier-actions">
          <button type="button" class="bouton bouton-second bouton-petit" data-preparer-evic="${e.id}"><span aria-hidden="true">▶️</span> Faire passer cette épreuve</button>
          <label class="champ champ-court"><span>Mots tapés en ${e.duree / 60} min</span><input type="text" inputmode="numeric" data-chemin="clavier.essais.${e.id}.mots" placeholder="ex. 25"></label>
        </div>
      </div>`).join("");
    $("#manuscrit-clavier").innerHTML = `<div class="champ"><label for="manuscrit-copie">Copie à la main : mots écrits en 5 min</label><input type="text" id="manuscrit-copie" inputmode="numeric" data-chemin="clavier.manuscrit.copie" placeholder="ex. 60"><small class="note" id="aide-manuscrit-copie"></small></div>
      <div class="champ"><label for="manuscrit-repetition">Répétition du mot à la main : mots écrits en 5 min</label><input type="text" id="manuscrit-repetition" inputmode="numeric" data-chemin="clavier.manuscrit.repetition" placeholder="ex. 60"><small class="note"><button type="button" class="bouton-lien" data-preparer-evic="main-repetition">▶️ Chronométrer avec l'enfant</button></small></div>`;
    $("#materiel-clavier").innerHTML = pastilles("clavier-materiel", "clavier.materiel", C.MATERIELS);
    $("#doigte-clavier").innerHTML = pastilles("clavier-doigte", "clavier.doigte", C.DOIGTES.map((x) => [x[0], maj1(x[1])]));
    $("#mains-clavier").innerHTML = pastilles("clavier-o-mains", "clavier.obs.mains", C.OBSERVATIONS[0].valeurs.map((v) => [v[0], v[2]]));
    $("#regard-clavier").innerHTML = pastilles("clavier-regard", "clavier.regard", C.REGARDS.map((x) => [x[0], maj1(x[1])]));
    $("#obs-clavier").innerHTML = C.OBSERVATIONS.slice(1).map((o) => `<div class="champ"><span>${esc(o.titre)}</span>${pastilles("clavier-o-" + o.id, "clavier.obs." + o.id, o.valeurs.map((v) => [v[0], v[2]]))}</div>`).join("") +
      `<div class="champ"><span>Attitude <small class="discret">(plusieurs choix possibles)</small></span><div class="choix">${C.ATTITUDES.map((a) => `<label><input type="checkbox" data-chemin="clavier.attitude.${a[0]}"><span>${esc(a[2])}</span></label>`).join("")}</div></div>`;
    $("#fonctions-clavier").innerHTML = C.FONCTIONS.map((f) => `<div class="item-grille"><span class="item-label">${esc(f[2])}</span>${pastilles("clavier-f-" + f[0], "clavier.fonctions." + f[0], [["oui", "Connaît"], ["non", "À apprendre"]])}</div>`).join("");
    $("#enfant-clavier").innerHTML = `<div class="champ"><span>Les épreuves étaient…</span>${pastilles("clavier-ressenti", "clavier.enfant.ressenti", C.RESSENTIS.map((r) => [r[0], r[1] + " " + r[2]]))}</div>
      <div class="champ"><span>Pour écrire, préfère…</span>${pastilles("clavier-prefere", "clavier.enfant.prefere", C.PREFERENCES.map((r) => [r[0], r[1] + " " + r[2]]))}</div>`;
  }

  function htmlDetailsEpreuve(x, s) {
    const pm = s.parMinute || [];
    const max = Math.max.apply(null, [1].concat(pm));
    const infos = [];
    if (s.motsCorrects !== null && s.motsCorrects !== undefined) infos.push(`« ${esc(s.mot)} » tapé sans erreur ${s.motsCorrects} fois sur ${esc(s.mots)} mots`);
    if (x.duree < x.dureePrevue - 1) infos.push("arrêtée au bout de " + tempsTexte(x.duree));
    if (s.corrections !== null) infos.push(s.corrections ? s.corrections + " correction" + (s.corrections > 1 ? "s" : "") : "aucune correction");
    if (s.pauses !== null) infos.push(s.pauses ? s.pauses + " arrêt" + (s.pauses > 1 ? "s" : "") + " de plus de " + C.SEUIL_PAUSE + " s (le plus long : " + s.pauseMax + " s)" : "aucun arrêt de plus de " + C.SEUIL_PAUSE + " s");
    if (x.id !== "repetition" && s.majuscules !== null) infos.push(`majuscules : ${s.majuscules} · accents : ${s.accents} · ponctuation : ${s.ponctuation}`);
    if (s.interruptions) infos.push(s.interruptions + " pause" + (s.interruptions > 1 ? "s" : "") + " demandée" + (s.interruptions > 1 ? "s" : "") + " par l'adulte");
    return (pm.length ? `<div class="minutes" role="img" aria-label="Mots tapés à chaque minute : ${pm.join(", ")}">${pm.map((n, i) => `<span class="minute"><span class="minute-barre"><b style="height:${Math.round(n / max * 100)}%"></b></span><strong>${n}</strong><small>${i + 1}<sup>${i ? "e" : "re"}</sup> min</small></span>`).join("")}</div>` +
      (x.baisse ? `<p class="note alerte-douce">Vitesse en baisse en fin d'épreuve.</p>` : "") : "") +
      (infos.length ? `<p class="note">${infos.join(" · ")}</p>` : "") +
      (s.texte ? `<details class="texte-tape"><summary>Texte tapé par l'enfant</summary><p>${esc(s.texte)}</p></details>` : "");
  }

  function majClavier() {
    const d = B.normaliserDossier(dossier);
    const r = C.resultats(d.clavier);
    r.epreuves.forEach((x) => {
      const o = $("#res-clavier-" + x.id);
      if (!o) return;
      o.className = "resultat-epreuve" + (x.ratio === null ? "" : x.ratio >= 1 ? " niveau-moyenne" : " niveau-inferieur");
      o.innerHTML = x.mpm === null ? "" : `<strong>${esc(C.fmt(x.mpm))} ${x.mpm < 2 ? "mot" : "mots"} par minute</strong>` +
        (x.ratio !== null ? ` · ${Math.round(x.ratio * 100)} % de la vitesse à la main` : "") +
        (x.outil ? ` · passée dans l'outil` : "");
      const s = d.clavier.essais[x.id];
      $("#det-clavier-" + x.id).innerHTML = s && s.outil ? htmlDetailsEpreuve(x, s) : "";
    });
    const ind = C.indicateur(d.clavier);
    $("#resultats-clavier").textContent = !r.faites.length ? "" : !ind ? "Notez aussi les mots écrits à la main pour comparer les deux vitesses."
      : ind.cle === "clavierEfficace" ? "Équivalence personnelle atteinte : au clavier, l'enfant est au moins aussi rapide qu'à la main."
      : "Équivalence personnelle non atteinte : au clavier, l'enfant reste plus lent qu'à la main.";
    const vu = C.fonctionsVues(d.clavier);
    const noms = { majuscule: "majuscules", accents: "accents", ponctuation: "ponctuation", effacer: "effacement" };
    const pasVu = ["majuscule", "accents", "ponctuation"].filter((k) => vu.vues.indexOf(k) < 0);
    $("#fonctions-vues").textContent = !vu.motsTexte ? "" : (vu.vues.length ? "Vu pendant la passation : " + vu.vues.map((k) => noms[k] + " (" + vu.comptes[k] + ")").join(", ") + ". " : "") +
      (pasVu.length && vu.motsTexte >= 10 ? "Pas utilisé en copie ni en dictée : " + pasVu.map((k) => noms[k]).join(", ") + " (à vérifier)." : "");
    $("#info-textes-evic").textContent = d.clavier.texte === "bhk"
      ? "Copie et dictée sur le texte du BHK, comme dans le protocole d'origine. La copie du BHK faite pendant le bilan peut servir de copie à la main."
      : "Copie : « " + C.TEXTES.copie.titre + " » (" + C.compterMots(C.TEXTES.copie.texte) + " mots). Dictée : « " + C.TEXTES.dictee.titre + " », lue par petits groupes de mots. Textes écrits pour l'outil, de vocabulaire simple, avec majuscules, accents et ponctuation.";
    $("#aide-manuscrit-copie").innerHTML = d.clavier.texte === "bhk" ? "Comptez les mots sur la copie du BHK (5 minutes)."
      : `Copie du texte « ${esc(C.TEXTES.copie.titre)} ». <button type="button" class="bouton-lien" data-action="compter-copie">Compter en touchant le dernier mot écrit</button> · <button type="button" class="bouton-lien" data-preparer-evic="main-copie">▶️ Chronométrer</button>`;
    const faites = C.EPREUVES.filter((e) => d.clavier.essais[e.id] && d.clavier.essais[e.id].outil).map((e) => e.nom.toLowerCase());
    $("#etat-passation-evic").textContent = d.clavier.passation ? "Dernière passation : " + B.dateCourte(d.clavier.passation) + (faites.length ? " (" + faites.join(", ") + ")" : "") + "." : "";
  }

  /* Préparation par l'ergothérapeute */
  function reglagesEvic() {
    const k = C.normaliser(dossier.clavier);
    return { mot: C.motEffectif(k), texte: k.texte, ecran: k.ecran };
  }
  async function preparerEvic(seule) {
    if (evic) return;
    const c = C.normaliser(dossier.clavier);
    const o = reglagesEvic();
    const deja = (id) => id === "main-copie" ? c.manuscrit.copie !== "" : id === "main-repetition" ? c.manuscrit.repetition !== "" : !!c.essais[id];
    const cochees = seule ? [seule] : C.ORDRE.filter((id) => !(id === "main-copie" && o.texte === "bhk"));
    const noms = { "main-copie": "Copie à la main", "main-repetition": "Répétition du mot à la main", copie: "Copie au clavier", repetition: "Répétition du mot au clavier", dictee: "Dictée au clavier" };
    let choix = null;
    const v = await ouvrirDialogue({
      titre: "Commencer la passation", classe: "boite-evic",
      html: `<p class="resume-evic"><span>📄 ${o.texte === "bhk" ? "Texte du BHK (votre exemplaire)" : "Textes de l'outil" + (o.ecran === "oui" ? ", texte à recopier affiché à l'écran" : " : feuille imprimée")}</span><span>🔁 Mot à répéter : <strong>${esc(o.mot)}</strong></span></p>
        <fieldset class="champ evic-choix"><legend>Épreuves, dans l'ordre</legend>${C.ORDRE.map((id) => {
          const e = C.ENFANT[id];
          return `<label class="case"><input type="checkbox" name="etape" value="${id}"${cochees.indexOf(id) >= 0 ? " checked" : ""}><span><span aria-hidden="true">${e.emoji}</span> ${esc(noms[id])} <small class="discret">${e.duree / 60} min${e.papier ? ", sur papier" : ""}${deja(id) ? " · déjà noté, sera remplacé" : ""}${id === "main-copie" && o.texte === "bhk" ? " · la copie du BHK peut servir" : ""}</small></span></label>`;
        }).join("")}</fieldset>
        <div class="champ"><span>Matériel</span><div class="choix">${C.MATERIELS.map((m) => `<label><input type="radio" name="materiel" value="${m[0]}"${c.materiel === m[0] ? " checked" : ""}><span>${esc(m[1])}</span></label>`).join("")}</div></div>
        <p class="note">Vérifiez : feuille de passation et feuille lignée à portée de main, correction automatique de la tablette désactivée, son allumé. Pour vous pendant les épreuves : appui long sur « Adulte » (ou touche Échap).</p>`,
      boutons: [{ valeur: "go", libelle: "Passer la main à l'enfant ▶" }, { valeur: "annuler", libelle: "Annuler" }],
      valider: (fond) => {
        const etapes = $$("input[name=etape]:checked", fond).map((x) => x.value);
        if (!etapes.length) return "Choisissez au moins une épreuve.";
        const m = $("input[name=materiel]:checked", fond);
        choix = { etapes: etapes, mot: o.mot, materiel: m ? m.value : "" };
        preparerSon(); // dans le geste : autorise le signal sonore sur tablette
        return "";
      },
    });
    if (v === "go" && choix) demarrerPassation(choix);
  }

  /* ---------- Caméra : photo de la copie prise dans l'outil (tablette Windows, ordinateur, iPad) ---------- */

  let camera = null; // { flux, appareils, index, cliche }
  const OPTIONS_CAMERA = { width: { ideal: 2560 }, height: { ideal: 1920 } };

  function cameraPermise() {
    const pp = document.permissionsPolicy || document.featurePolicy;
    try { return !(pp && pp.allowsFeature && !pp.allowsFeature("camera")); } catch (e) { return true; }
  }
  async function ouvrirCamera() {
    const md = navigator.mediaDevices;
    // Sans caméra accessible ici (navigateur ancien, page intégrée) : l'appareil photo du système, sinon les fichiers.
    if (!md || !md.getUserMedia || !cameraPermise()) { $("#photo-camera-secours").click(); return; }
    camera = { flux: null, appareils: [], index: -1, cliche: null };
    afficherCliche(false);
    $("#ecran-camera").hidden = false;
    document.body.classList.add("sans-defilement");
    $("#camera-message").textContent = "Ouverture de la caméra…";
    try {
      await demarrerFlux(null);
      camera.appareils = (await md.enumerateDevices()).filter((d) => d.kind === "videoinput");
      const piste = camera.flux.getVideoTracks()[0];
      const reglage = piste && piste.getSettings ? piste.getSettings() : {};
      camera.index = camera.appareils.findIndex((d) => d.deviceId === reglage.deviceId);
      // Tablette Windows : la caméra arrière n'est pas toujours celle ouverte ; on la cherche par son nom.
      if (reglage.facingMode !== "environment") {
        const arriere = camera.appareils.findIndex((d) => /back|rear|arri[eè]re|environment/i.test(d.label));
        if (arriere >= 0 && arriere !== camera.index) { await demarrerFlux(camera.appareils[arriere].deviceId); camera.index = arriere; }
      }
      $("#ecran-camera [data-action='changer-camera']").hidden = camera.appareils.length < 2;
      $("#camera-message").textContent = "Cadrez la feuille entière, bien à plat, de face, avec une bonne lumière.";
    } catch (err) {
      fermerCamera();
      annoncer(err && err.name === "NotAllowedError"
        ? "La caméra n'est pas autorisée. Autorisez-la dans le navigateur (icône à gauche de l'adresse), ou touchez « Choisir un fichier »."
        : "Aucune caméra n'est disponible ici : touchez « Choisir un fichier ».");
    }
  }
  async function demarrerFlux(id) {
    arreterFlux();
    const video = Object.assign(id ? { deviceId: { exact: id } } : { facingMode: { ideal: "environment" } }, OPTIONS_CAMERA);
    camera.flux = await navigator.mediaDevices.getUserMedia({ video: video, audio: false });
    const v = $("#camera-video");
    v.srcObject = camera.flux;
    try { await v.play(); } catch (e) { /* lecture automatique */ }
  }
  function arreterFlux() {
    if (camera && camera.flux) camera.flux.getTracks().forEach((t) => t.stop());
    if (camera) camera.flux = null;
  }
  function fermerCamera() {
    arreterFlux();
    camera = null;
    $("#camera-video").srcObject = null;
    $("#ecran-camera").hidden = true;
    document.body.classList.remove("sans-defilement");
  }
  async function changerCamera() {
    if (!camera || camera.appareils.length < 2) return;
    camera.index = (camera.index + 1) % camera.appareils.length;
    try { await demarrerFlux(camera.appareils[camera.index].deviceId); } catch (e) { annoncer("Cette caméra n'est pas disponible."); }
  }
  function afficherCliche(oui) {
    $("#camera-cliche").hidden = !oui;
    $(".camera-cadre").hidden = oui;
    $("#camera-video").hidden = oui;
    $("#ecran-camera [data-action='declencher-camera']").hidden = oui;
    $("#ecran-camera [data-action='reprendre-cliche']").hidden = !oui;
    $("#ecran-camera [data-action='garder-cliche']").hidden = !oui;
    $("#ecran-camera [data-action='changer-camera']").hidden = oui || !camera || camera.appareils.length < 2;
  }
  function declencherCamera() {
    const v = $("#camera-video");
    if (!camera || !v.videoWidth) return;
    const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const l = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
    const c = document.createElement("canvas");
    c.width = l; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, l, h);
    ctx.drawImage(v, 0, 0, l, h);
    camera.cliche = { donnees: c.toDataURL("image/jpeg", 0.82), l: l, h: h };
    $("#camera-cliche").src = camera.cliche.donnees;
    afficherCliche(true);
    $("#camera-message").textContent = "La feuille est-elle entière et nette ?";
  }
  function garderCliche() {
    if (!camera || !camera.cliche) return;
    const p = camera.cliche;
    fermerCamera();
    garderPhotoCopie(p);
  }
  function garderPhotoCopie(p) {
    dossier.photoCopie = p.donnees; dossier.photoL = String(p.l); dossier.photoH = String(p.h);
    majPhoto(); nonEnregistre = true; majTout();
    annoncer("Photo ajoutée");
  }

  // Aide au comptage de la copie à la main : on touche le dernier mot écrit par l'enfant.
  async function compterCopieMain() {
    const mots = C.TEXTES.copie.texte.split(/\s+/);
    let tours = 0, choisi = null;
    const total = () => choisi === null ? null : tours * C.compterMots(C.TEXTES.copie.texte) + C.compterMots(mots.slice(0, choisi + 1).join(" "));
    const v = await ouvrirDialogue({
      titre: "Compter les mots écrits à la main", classe: "boite-compter",
      html: `<p class="note">Touchez le dernier mot que l'enfant a écrit sur sa feuille.</p>
        <p class="mots-a-toucher">${mots.map((m, i) => `<button type="button" class="mot-a-toucher" data-i="${i}">${esc(m)}</button>`).join(" ")}</p>
        <label class="case"><input type="checkbox" name="tour"><span>L'enfant a fini le texte et l'a recommencé</span></label>
        <p class="apercu-programme" id="total-copie">Aucun mot choisi.</p>`,
      boutons: [{ valeur: "ok", libelle: "Noter ce nombre" }, { valeur: "annuler", libelle: "Annuler" }],
      clic: (e, fond) => {
        const b = e.target.closest(".mot-a-toucher");
        const caseTour = e.target.closest("input[name=tour]");
        if (b) { choisi = Number(b.dataset.i); $$(".mot-a-toucher", fond).forEach((x) => x.classList.toggle("choisi", Number(x.dataset.i) <= choisi)); }
        if (caseTour) tours = caseTour.checked ? 1 : 0;
        if (b || caseTour) $("#total-copie", fond).textContent = total() === null ? "Aucun mot choisi." : total() + " mots écrits en 5 minutes";
      },
      valider: () => total() === null ? "Touchez le dernier mot écrit." : "",
    });
    if (v !== "ok") return;
    if (!dossier.clavier.manuscrit || typeof dossier.clavier.manuscrit !== "object") dossier.clavier.manuscrit = {};
    dossier.clavier.manuscrit.copie = String(total());
    $("#manuscrit-copie").value = dossier.clavier.manuscrit.copie;
    nonEnregistre = true; majTout();
    annoncer(total() + " mots notés pour la copie à la main");
  }

  function demarrerPassation(choix) {
    if (!dossier.clavier || typeof dossier.clavier !== "object") dossier.clavier = C.vide();
    const k = dossier.clavier;
    k.fait = "oui"; k.passation = B.aujourdhui();
    if (!k.texte) k.texte = "outil";
    if (choix.materiel) k.materiel = choix.materiel;
    if (!k.essais || typeof k.essais !== "object") k.essais = {};
    nonEnregistre = true; sauverBrouillon();
    evic = { etapes: C.etapesPassation(choix.etapes), i: 0, phase: "intro", mot: choix.mot, t: null, faites: [] };
    fermerPhrases();
    $("#evic-menu").hidden = true;
    $("#ecran-frappe").hidden = false;
    document.body.classList.add("sans-defilement", "mode-enfant");
    garderEcranAllume();
    try { history.pushState({ onglet: panneauCourant(), evic: true }, ""); } catch (e) { /* page partagée */ }
    rendreEvic();
  }

  function etapeEvic() { return evic ? evic.etapes[evic.i] : null; }

  function rendreEvic() {
    if (!evic) return;
    const id = etapeEvic(), e = C.ENFANT[id] || {};
    const fini = evic.phase === "questions" || evic.phase === "fin";
    $("#evic-etapes").innerHTML = evic.etapes.map((x, k) => `<li class="${k < evic.i || (fini && k === evic.i) ? "faite" : k === evic.i ? "en-cours" : ""}" title="${esc(C.ENFANT[x].titre)}"><span aria-hidden="true">${C.ENFANT[x].emoji}</span></li>`).join("");
    const clavier = evic.phase === "frappe" && !e.papier;
    $("#evic-frappe").hidden = !clavier;
    $("#evic-ecran").hidden = clavier;
    $("#evic-temps").hidden = evic.phase !== "frappe";
    if (evic.phase !== "frappe") $("#evic-temps span").style.width = "0";
    const mot = (id || "").indexOf("repetition") >= 0 && evic.mot ? `<p class="evic-mot">${esc(evic.mot)}</p>` : "";
    const o = reglagesEvic();
    const modeleEcran = o.texte === "outil" && o.ecran === "oui" && (id === "copie" || id === "main-copie");
    const htmlModeleCopie = `<div class="evic-modele"><p class="evic-modele-titre">${esc(C.TEXTES.copie.titre)}</p><p>${esc(C.TEXTES.copie.texte)}</p></div>`;
    $("#evic-modele").innerHTML = clavier && modeleEcran ? htmlModeleCopie : "";
    let h = "";
    if (evic.phase === "intro") {
      h = `<p class="evic-num">Épreuve ${evic.i + 1} sur ${evic.etapes.length}</p>
        <p class="evic-emoji" aria-hidden="true">${e.emoji}</p>
        <h2 id="titre-evic">${esc(e.titre)}</h2>${mot}
        <p class="evic-consigne">${esc(C.consigneEnfant(id, o))}</p>
        <p class="evic-depart">${esc(e.depart)}</p>
        <button type="button" class="bouton evic-grand" data-evic="pret">C'est parti !</button>
        <p class="evic-adulte-note"><strong>Pour l'adulte, à lire à l'enfant :</strong> la consigne ci-dessus. ${esc(C.consigneAdulte(id, o))} ${esc(C.ENCOURAGER)} Durée : ${e.duree / 60} minutes.</p>`;
    } else if (evic.phase === "frappe") {
      if (e.papier) h = id === "main-copie"
        ? `<p class="evic-emoji" aria-hidden="true">📝</p><h2 id="titre-evic">Recopie le texte sur ta feuille</h2>${modeleEcran ? htmlModeleCopie : `<p class="evic-consigne">Écris comme d'habitude, jusqu'au signal.</p>`}`
        : `<p class="evic-emoji" aria-hidden="true">✍️</p><h2 id="titre-evic">Écris sur ta feuille</h2>${mot}<p class="evic-consigne">Le plus de fois possible, jusqu'au signal.</p>`;
      $("#evic-rappel").innerHTML = id === "repetition" ? `Tape <strong>${esc(evic.mot)}</strong> puis un espace, encore et encore.` : id === "dictee" ? "Tape ce que tu entends, morceau par morceau."
        : modeleEcran ? "Recopie le texte ci-dessus. Au bout, recommence au début." : "Recopie le texte de ta feuille. Au bout, recommence au début.";
    } else if (evic.phase === "fin-epreuve") {
      const suivante = evic.etapes[evic.i + 1];
      h = `<p class="evic-emoji" aria-hidden="true">🎉</p><h2 id="titre-evic">Bravo !</h2>
        <p class="evic-consigne">${e.papier ? "Stop ! Tu peux poser ton crayon." : "C'est fini pour cette épreuve."}</p>
        ${suivante ? `<p class="evic-depart">Tu peux secouer un peu les mains. Ensuite : ${esc(C.ENFANT[suivante].titre.toLowerCase())}.</p>` : ""}
        <button type="button" class="bouton evic-grand" data-evic="suite">Continuer</button>`;
    } else if (evic.phase === "questions") {
      const k = dossier.clavier.enfant || {};
      h = `<p class="evic-emoji" aria-hidden="true">💬</p><h2 id="titre-evic">Deux petites questions</h2>
        <p class="evic-question">C'était comment ?</p>
        <div class="evic-reponses">${C.RESSENTIS.map((r) => `<button type="button" class="evic-reponse" data-evic-ressenti="${r[0]}" aria-pressed="${k.ressenti === r[0]}"><span class="evic-emoji-petit" aria-hidden="true">${r[1]}</span>${esc(r[2])}</button>`).join("")}</div>
        <p class="evic-question">Pour écrire, tu préfères…</p>
        <div class="evic-reponses">${C.PREFERENCES.map((r) => `<button type="button" class="evic-reponse" data-evic-prefere="${r[0]}" aria-pressed="${k.prefere === r[0]}"><span class="evic-emoji-petit" aria-hidden="true">${r[1]}</span>${esc(r[2])}</button>`).join("")}</div>
        <button type="button" class="bouton evic-grand" data-evic="fini">J'ai fini</button>`;
    } else if (evic.phase === "fin") {
      h = `<p class="evic-emoji" aria-hidden="true">🌟</p><h2 id="titre-evic">Tu as fini, bravo !</h2>
        <p class="evic-consigne">Merci. Tu peux rendre l'appareil à ton ergothérapeute.</p>
        <button type="button" class="bouton bouton-second evic-maintenir" data-maintenir="ergo"><span class="evic-jauge" aria-hidden="true"></span>Ergothérapeute : maintenir appuyé</button>`;
    }
    $("#evic-ecran").innerHTML = h ? `<div class="evic-carte">${h}</div>` : "";
  }

  function evicPret() {
    const id = etapeEvic(), e = C.ENFANT[id];
    evic.t = { lance: false, actif: false, debut: 0, cumul: 0, derniereA: 0, pauses: 0, pauseMax: 0, corrections: 0, instantanes: [], interruptions: 0, minuteur: null };
    evic.phase = "frappe";
    const z = $("#zone-frappe");
    z.value = ""; z.readOnly = !!e.papier;
    rendreEvic();
    if (e.papier) { lancerChrono(); return; }
    z.focus(); // dans le geste : le clavier de la tablette s'ouvre
  }
  function lancerChrono() {
    const t = evic.t;
    t.lance = true; t.actif = true; t.debut = performance.now();
    clearInterval(t.minuteur);
    t.minuteur = setInterval(ticEvic, 200);
  }
  function ecouleEvic() { const t = evic.t; return (t.cumul + (t.actif ? performance.now() - t.debut : 0)) / 1000; }
  function ticEvic() {
    if (!evic || !evic.t || !evic.t.actif) return;
    const e = C.ENFANT[etapeEvic()];
    const s = ecouleEvic();
    $("#evic-temps span").style.width = Math.min(100, s / e.duree * 100) + "%";
    if (!e.papier) {
      const z = $("#zone-frappe");
      while (evic.t.instantanes.length < Math.min(Math.floor(s / 60), Math.floor(e.duree / 60))) evic.t.instantanes.push(C.compterMots(z.value));
    }
    if (s >= e.duree) finirEpreuve(e.duree);
  }

  function finirEpreuve(duree) {
    const id = etapeEvic(), e = C.ENFANT[id], t = evic.t;
    clearInterval(t.minuteur);
    if (t.actif) { t.cumul += performance.now() - t.debut; t.actif = false; }
    const z = $("#zone-frappe");
    z.readOnly = true; z.blur();
    const d = Math.max(1, Math.min(duree, t.cumul / 1000 || duree));
    if (!e.papier && t.lance) {
      const fin = d - t.derniereA;
      if (fin > C.SEUIL_PAUSE) { t.pauses++; t.pauseMax = Math.max(t.pauseMax, fin); }
      while (t.instantanes.length < Math.floor(d / 60)) t.instantanes.push(C.compterMots(z.value));
      dossier.clavier.essais[id] = C.essaiChronometre(z.value, d, t.corrections, B.aujourdhui(),
        { instantanes: t.instantanes, pauses: t.pauses, pauseMax: t.pauseMax, interruptions: t.interruptions, mot: id === "repetition" ? evic.mot : "",
          modele: id === "copie" && reglagesEvic().texte === "outil" ? C.TEXTES.copie.texte : "" });
    }
    if (t.lance && evic.faites.indexOf(id) < 0) evic.faites.push(id);
    nonEnregistre = true; sauverBrouillon();
    bip();
    evic.phase = "fin-epreuve";
    rendreEvic();
  }

  function suiteEvic() {
    evic.i++;
    evic.t = null;
    evic.phase = evic.i >= evic.etapes.length ? "questions" : "intro";
    rendreEvic();
  }

  /* Menu de l'adulte : appui long sur « Adulte » ou touche Échap */
  function ouvrirMenuEvic() {
    if (!evic) return;
    const t = evic.t, e = C.ENFANT[etapeEvic()] || {};
    if (t && t.actif) { t.cumul += performance.now() - t.debut; t.actif = false; t.interruptions++; }
    const z = $("#zone-frappe");
    z.readOnly = true;
    const enCours = evic.phase === "frappe" && t;
    const assez = enCours && t.lance && ecouleEvic() >= 30; // un résultat sur moins de 30 secondes ne serait pas fiable
    clearTimeout(minuteurIndice); $("#evic-indice").textContent = "";
    $("#evic-menu-etat").textContent = enCours
      ? e.titre + " : " + tempsTexte(ecouleEvic()) + " sur " + tempsTexte(e.duree) + (e.papier ? "" : " · " + C.compterMots(z.value) + " mots") + (t.lance ? " · chronomètre en pause" : " · pas encore commencé")
      : evic.phase === "questions" || evic.phase === "fin" ? "Épreuves terminées." : (e.titre || "") + " : pas encore commencé.";
    $$("#evic-menu [data-evic]").forEach((b) => {
      const a = b.dataset.evic;
      b.hidden = (a === "terminer" && !assez) || (a === "recommencer" && !(enCours || evic.phase === "fin-epreuve")) || (a === "passer" && !(evic.phase === "intro" || evic.phase === "frappe"));
    });
    $("#evic-menu").hidden = false;
    $("#evic-menu [data-evic='reprendre']").focus();
  }
  function fermerMenuEvic() {
    $("#evic-menu").hidden = true;
    if (!evic || evic.phase !== "frappe" || !evic.t) return;
    const t = evic.t, e = C.ENFANT[etapeEvic()];
    if (t.lance) { t.debut = performance.now(); t.actif = true; }
    if (!e.papier) { const z = $("#zone-frappe"); z.readOnly = false; z.focus(); }
  }
  function tempsTexte(sec) { const s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

  function surClicEvic(e) {
    const b = e.target.closest("button");
    if (!b || !evic) return;
    if (b.dataset.evicRessenti || b.dataset.evicPrefere) {
      const k = dossier.clavier.enfant && typeof dossier.clavier.enfant === "object" ? dossier.clavier.enfant : (dossier.clavier.enfant = {});
      if (b.dataset.evicRessenti) k.ressenti = b.dataset.evicRessenti; else k.prefere = b.dataset.evicPrefere;
      nonEnregistre = true; sauverBrouillon();
      rendreEvic();
      return;
    }
    if (b.dataset.maintenir) { if (!b.classList.contains("fait")) indiceAppui(b); return; }
    switch (b.dataset.evic) {
      case "pret": return evicPret();
      case "suite": return suiteEvic();
      case "fini": evic.phase = "fin"; return rendreEvic();
      case "reprendre": return fermerMenuEvic();
      case "terminer": $("#evic-menu").hidden = true; return finirEpreuve(ecouleEvic());
      case "recommencer": {
        if (evic.t) clearInterval(evic.t.minuteur);
        evic.faites = evic.faites.filter((x) => x !== etapeEvic());
        evic.t = null; evic.phase = "intro";
        $("#evic-menu").hidden = true;
        return rendreEvic();
      }
      case "passer": {
        if (evic.t) clearInterval(evic.t.minuteur);
        $("#evic-menu").hidden = true;
        return suiteEvic();
      }
      case "arreter": return quitterPassation();
    }
  }

  // Un simple toucher sur un bouton réservé à l'adulte rappelle qu'il faut maintenir appuyé.
  function indiceAppui(b) {
    b.classList.add("indice");
    setTimeout(() => b.classList.remove("indice"), 1200);
    $("#evic-indice").textContent = b.dataset.maintenir === "ergo" ? "Ergothérapeute : gardez le doigt appuyé sur le bouton." : "Ce bouton est pour l'adulte : gardez le doigt appuyé.";
    clearTimeout(minuteurIndice);
    minuteurIndice = setTimeout(() => { $("#evic-indice").textContent = ""; }, 2500);
  }
  function debutAppui(e) {
    const b = e.target.closest && e.target.closest("[data-maintenir]");
    if (!b || !evic) return;
    finAppui();
    b.classList.add("appui");
    appuiEvic = { b: b, minuteur: setTimeout(() => {
      b.classList.remove("appui");
      b.classList.add("fait");
      setTimeout(() => b.classList.remove("fait"), 400);
      appuiEvic = null;
      if (b.dataset.maintenir === "ergo") quitterPassation(); else ouvrirMenuEvic();
    }, DUREE_APPUI) };
  }
  function finAppui() {
    if (!appuiEvic) return;
    clearTimeout(appuiEvic.minuteur);
    appuiEvic.b.classList.remove("appui");
    appuiEvic = null;
  }

  function quitterPassation() {
    if (!evic) return;
    if (evic.t) clearInterval(evic.t.minuteur);
    const papier = evic.faites.some((x) => x.indexOf("main-") === 0);
    evic = null;
    finAppui();
    $("#evic-menu").hidden = true;
    $("#ecran-frappe").hidden = true;
    $("#zone-frappe").value = "";
    document.body.classList.remove("sans-defilement", "mode-enfant");
    lacherEcran();
    // Fonctions du clavier vues pendant la passation : pré-cochées « Connaît », à confirmer par l'ergothérapeute.
    const k = dossier.clavier;
    if (!k.fonctions || typeof k.fonctions !== "object") k.fonctions = {};
    C.fonctionsVues(k).vues.forEach((f) => { if (!k.fonctions[f]) k.fonctions[f] = "oui"; });
    nonEnregistre = true;
    remplirFormulaire();
    majTout();
    afficherOnglet("clavier");
    $("#corps-clavier").hidden = false;
    $("#bandeau-passation").hidden = false;
    $("#bandeau-passation").innerHTML = papier && !(k.manuscrit && String(k.manuscrit.repetition || "").trim())
      ? "✅ Passation terminée. Notez d'abord les <strong>mots écrits à la main</strong>, puis complétez votre observation."
      : "✅ Passation terminée. Complétez votre observation ci-dessous.";
    const cible = papier ? $("#titre-main-clavier") : $("#titre-obs-clavier");
    setTimeout(() => { if (cible) cible.scrollIntoView({ block: "center" }); }, 60);
    annoncer("Passation enregistrée");
    if (verrouActif()) verrouiller();
  }

  /* Son et écran */
  function preparerSon() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      sonEvic = sonEvic || new AC();
      if (sonEvic.state === "suspended") sonEvic.resume();
    } catch (e) { sonEvic = null; }
  }
  function bip() {
    if (!sonEvic) return;
    try {
      [0, 0.28].forEach((d, i) => {
        const o = sonEvic.createOscillator(), g = sonEvic.createGain(), t0 = sonEvic.currentTime + d;
        o.type = "sine"; o.frequency.value = i ? 1046 : 784;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        o.connect(g); g.connect(sonEvic.destination); o.start(t0); o.stop(t0 + 0.55);
      });
    } catch (e) { /* sans son */ }
  }
  async function garderEcranAllume() {
    try { if (navigator.wakeLock && navigator.wakeLock.request) veilleEvic = await navigator.wakeLock.request("screen"); } catch (e) { veilleEvic = null; }
  }
  function lacherEcran() { try { if (veilleEvic) veilleEvic.release(); } catch (e) { /* rien */ } veilleEvic = null; }

  function initFrappe() {
    const z = $("#zone-frappe");
    z.addEventListener("input", () => {
      if (!evic || evic.phase !== "frappe" || !evic.t || z.readOnly) return;
      const t = evic.t;
      if (!t.lance) { if (z.value.length) { lancerChrono(); t.derniereA = 0; } return; }
      if (!t.actif) return;
      const a = ecouleEvic();
      if (a - t.derniereA > C.SEUIL_PAUSE) { t.pauses++; t.pauseMax = Math.max(t.pauseMax, a - t.derniereA); }
      t.derniereA = a;
    });
    const effacement = (e) => { if (evic && evic.t && evic.t.lance && evic.t.actif) evic.t.corrections++; };
    if ("onbeforeinput" in z) z.addEventListener("beforeinput", (e) => { if (/^delete/.test(e.inputType || "")) effacement(e); });
    else z.addEventListener("keydown", (e) => { if (e.key === "Backspace" || e.key === "Delete") effacement(e); });
    z.addEventListener("paste", (e) => e.preventDefault());
    z.addEventListener("drop", (e) => e.preventDefault());
    const ec = $("#ecran-frappe");
    ec.addEventListener("click", surClicEvic);
    ec.addEventListener("pointerdown", debutAppui);
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => ec.addEventListener(t, finAppui));
    ec.addEventListener("contextmenu", (e) => { if (e.target.closest("[data-maintenir]")) e.preventDefault(); });
    // Échap : menu de l'adulte (ordinateur ou clavier externe).
    document.addEventListener("keydown", (e) => {
      if (!evic || e.key !== "Escape") return;
      e.preventDefault(); e.stopPropagation();
      if ($("#evic-menu").hidden) ouvrirMenuEvic(); else fermerMenuEvic();
    }, true);
    window.addEventListener("beforeunload", (e) => { if (evic) { e.preventDefault(); e.returnValue = ""; } });
    document.addEventListener("visibilitychange", () => { if (evic && document.visibilityState === "visible") garderEcranAllume(); });
  }

  /* ---------- Accueil adapté, journal des séances, plateforme TND ---------- */

  const A = window.Accueil;

  function construireAccueil() {
    const radiosChemin = (nom, chemin, valeurs) => valeurs.map((v) => `<label><input type="radio" name="${nom}" value="${esc(v[0])}" data-chemin="${chemin}"><span>${esc(v[1])}</span></label>`).join("");
    $("#raisons-adaptation").innerHTML = radiosChemin("adaptation-raison", "adaptation.raison", A.RAISONS);
    $("#formules-pco").innerHTML = radiosChemin("pco-formule", "pco.formule", A.FORMULES_PCO);
    $("#choix-communication").innerHTML = radiosChemin("accueil-communication", "adaptation.reponses.communication", A.COMMUNICATION);
    $("#questions-accueil").innerHTML = A.QUESTIONS.map((q) => `<label class="champ"><span>${esc(q.titre)}</span><textarea data-chemin="adaptation.reponses.${q.id}" rows="2"${q.exemple ? ` placeholder="${esc(q.exemple)}"` : ""}></textarea></label>`).join("");
    $("#table-sens").innerHTML = `<thead><tr><th scope="col">Sensations</th>${A.REACTIONS.map((r) => `<th scope="col">${esc(r[1])}</th>`).join("")}</tr></thead><tbody>` +
      A.SENS.map((x) => `<tr><th scope="row">${esc(x[1])}</th>${A.REACTIONS.map((r) => `<td><label class="case-seule"><input type="radio" name="sens-${x[0]}" value="${r[0]}" data-chemin="adaptation.sensibilites.${x[0]}" aria-label="${esc(x[1])} : ${esc(r[1])}"></label></td>`).join("")}</tr>`).join("") + "</tbody>";
    $("#palette-etapes").innerHTML = A.ETAPES.map((e) => `<button type="button" class="etape-palette" data-etape-ajout="${e.id}"><span class="picto" aria-hidden="true">${e.picto}</span>${esc(e.texte)}</button>`).join("");
    $("#passation-bhk").innerHTML = htmlPassation("bhk");
  }

  function htmlPassation(id) {
    const p = (dossier.passations || {})[id] || {};
    const l = A.libellesPassation(p);
    return `<details class="passation${l.length ? " adaptee" : ""}" data-passation-bloc="${id}"${l.length ? " open" : ""}>
      <summary>Passation adaptée ? <span class="passation-resume">${esc(l.join(", "))}</span></summary>
      <div class="cases">${A.ADAPTATIONS_PASSATION.map((a) => `<label><input type="checkbox" data-chemin="passations.${id}.${a[0]}"${p[a[0]] === "oui" ? " checked" : ""}><span>${esc(B.maj(a[1]))}</span></label>`).join("")}</div>
      <label class="champ"><span>Autre adaptation</span><input type="text" data-chemin="passations.${id}.autre" value="${esc(p.autre || "")}" placeholder="consigne relue, crayon adapté…"></label>
      <p class="note">Ce qui est coché apparaît dans le compte rendu, avec un rappel : les normes ont été établies en passation standard.</p>
    </details>`;
  }

  /* ---------- Séances : planning de toutes les séances de tous les enfants ---------- */

  const SE = window.Seances;
  const CLE_FILTRES = "outil-ergo:filtres-seances";
  let filtres = Object.assign({ enfant: "", periode: "semaine", decalage: 0, statut: "", auteur: "", axe: "", lieu: "" }, lireStockage(CLE_FILTRES) || {});
  filtres.decalage = 0;
  let agenda = { lignes: [], dossiers: {}, enfants: [], entrees: {} };
  let agendaVue = null;
  let seanceOuverte = "";
  const ecritures = {};

  function sauverFiltres() { ecrireStockage(CLE_FILTRES, Object.assign({}, filtres, { decalage: 0 })); }
  function nomEnfant(x) { const p = String(x.prenom || "").trim(), n = String(x.nom || "").trim(); return [p, n ? n.charAt(0).toUpperCase() + "." : ""].filter(Boolean).join(" ") || "Sans nom"; }
  function nomCompletEnfant(x) { return [String(x.prenom || "").trim(), String(x.nom || "").trim().toUpperCase()].filter(Boolean).join(" ") || "Sans nom"; }
  function titreCourtAxe(a) { return a.titre.split(/ et | : |, | dans /)[0]; }
  function heureTexte(h) { return h ? h.replace(":", " h ") : ""; }
  function axesDuPlan(d) {
    try { return U.planning(d, reglages).axes.map((a) => U.AXES.find((x) => x.id === a.id)).filter(Boolean); } catch (e) { return []; }
  }

  // Rassemble les séances rangées dans chaque dossier (le dossier ouvert est pris en mémoire).
  async function chargerAgenda() {
    await viderEcritures();
    let l = [];
    try { l = await Base.tous(); } catch (e) { l = []; }
    agenda = { lignes: [], dossiers: {}, enfants: [], entrees: {} };
    const ajouter = (id, d, infos, entree) => {
      d.seances = SE.normaliserListe(d.seances);
      agenda.dossiers[id] = { d: d, infos: infos, courant: d === dossier };
      if (entree) agenda.entrees[id] = entree;
      agenda.enfants.push({ id: id, nom: nomEnfant(infos), complet: nomCompletEnfant(infos), groupe: infos.groupe || "" });
    };
    l.forEach((x) => { if (x && x.id && x.dossier && x.id !== dossier.id) ajouter(x.id, x.dossier, x, x); });
    if (String(dossier.prenom || "").trim() || String(dossier.nom || "").trim()) { assurerId(); ajouter(dossier.id, dossier, dossier, null); }
    agenda.enfants.sort((a, b) => a.complet.localeCompare(b.complet, "fr"));
    reconstruireLignes();
  }
  function reconstruireLignes() {
    agenda.lignes = [];
    Object.keys(agenda.dossiers).forEach((id) => {
      const e = agenda.dossiers[id];
      e.d.seances.forEach((s) => agenda.lignes.push({ dossierId: id, enfant: nomEnfant(e.infos), s: s }));
    });
  }

  async function rendreAgenda() {
    await chargerAgenda();
    rendreFiltres();
    rendreVue();
  }

  function rendreFiltres() {
    if (filtres.enfant && !agenda.dossiers[filtres.enfant]) filtres.enfant = "";
    const opts = agenda.enfants.map((e) => `<option value="${esc(e.id)}">${esc(e.complet)}${e.groupe ? " · " + esc(e.groupe) : ""}</option>`).join("");
    $("#filtre-enfant").innerHTML = `<option value="">Tous les enfants (${agenda.enfants.length})</option>` + opts;
    $("#filtre-enfant").value = filtres.enfant;
    $("#ns-enfant").innerHTML = agenda.enfants.length ? opts : `<option value="">Aucun dossier : commencez par l'onglet Dossier</option>`;
    $$("#filtre-periode input").forEach((r) => { r.checked = r.value === filtres.periode; });
    $("#filtre-statut").value = filtres.statut;
    const auteurs = Array.from(new Set(agenda.lignes.map((x) => x.s.auteur).filter(Boolean))).sort();
    $("#filtre-auteur").innerHTML = `<option value="">Toutes</option>` + auteurs.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
    $("#filtre-auteur").value = auteurs.indexOf(filtres.auteur) >= 0 ? filtres.auteur : "";
    $("#filtre-axe").innerHTML = `<option value="">Tous</option>` + U.AXES.map((a) => `<option value="${a.id}">${U.PICTOS_AXES[a.id] || ""} ${esc(titreCourtAxe(a))}</option>`).join("");
    $("#filtre-axe").value = filtres.axe;
    const villes = A.villesCabinet(reglages.cabinet.adresse);
    $("#champ-filtre-lieu").hidden = villes.length < 2;
    $("#filtre-lieu").innerHTML = `<option value="">Tous</option>` + villes.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    $("#filtre-lieu").value = villes.indexOf(filtres.lieu) >= 0 ? filtres.lieu : "";
    $("#champ-ns-lieu").hidden = villes.length < 2;
    $("#ns-lieu").innerHTML = `<option value="">–</option>` + villes.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    const actifs = ["statut", "auteur", "axe", "lieu"].filter((k) => filtres[k]).length;
    $("#plus-filtres-compte").textContent = actifs ? " (" + actifs + ")" : "";
  }

  function vueCourante() { return SE.filtrer(agenda.lignes, filtres, B.aujourdhui()); }

  function rendreVue() {
    const auj = B.aujourdhui();
    const res = vueCourante();
    agendaVue = res;
    $("#nav-periode").hidden = !res.periode.navigable;
    $("#libelle-periode").textContent = res.periode.libelle;
    const faites = res.lignes.filter((x) => x.s.statut === "faite").length, prevues = res.lignes.filter((x) => x.s.statut === "prevue").length;
    const pl = (n, mot) => n + " " + mot + (n > 1 ? "s" : "");
    $("#compte-seances").textContent = res.lignes.length ? pl(res.lignes.length, "séance") + " : " + pl(faites, "faite") + ", " + pl(prevues, "prévue") : "";
    rendreFicheEnfant();
    const jours = SE.grouperParJour(res, auj);
    $("#agenda").innerHTML = res.lignes.length || res.periode.type === "semaine" ? jours.map((j) => `<section class="jour${j.aujourdhui ? " jour-aujourdhui" : ""}${j.passe ? " jour-passe" : ""}">
        <h3 class="jour-titre">${esc(j.libelle)}${j.aujourdhui ? ` <span class="badge">Aujourd'hui</span>` : ""}</h3>
        ${j.lignes.length ? j.lignes.map(htmlLigneSeance).join("") : `<p class="jour-vide">Pas de séance</p>`}
      </section>`).join("")
      : `<p class="vide">Aucune séance${filtres.enfant ? " pour cet enfant" : ""} sur cette période. Touchez « ＋ Séance » pour en ajouter une, passée ou à venir.</p>`;
    $("[data-action='programmer-seances']").hidden = !filtres.enfant;
    if (seanceOuverte && $(`[data-seance="${seanceOuverte}"]`, $("#p-seances"))) ouvrirEditeur(seanceOuverte, false); else seanceOuverte = "";
  }

  function htmlTeteSeance(x) {
    const s = x.s, cle = x.dossierId + "|" + s.id;
    const statut = SE.STATUTS.find((t) => t[0] === s.statut);
    const etat = SE.ETATS.find((e) => e[0] === s.etat);
    const pictos = U.AXES.filter((a) => s.axes[a.id] === "oui").map((a) => U.PICTOS_AXES[a.id] || "").join(" ");
    const marque = s.statut === "faite" ? (etat ? etat[2] : "✓") : statut[2];
    const rapide = s.statut === "prevue" && s.date && s.date <= B.aujourdhui();
    return `<div class="seance-ligne-tete">
        <button type="button" class="seance-ouvrir" data-ouvrir-seance="${esc(cle)}" aria-expanded="${seanceOuverte === cle}">
          <span class="seance-heure">${esc(heureTexte(s.heure))}</span>
          <span class="seance-quoi"><strong>${esc(x.enfant)}</strong>${pictos ? ` <span class="seance-pictos" aria-hidden="true">${pictos}</span>` : ""}${s.fait ? `<small>${esc(s.fait)}</small>` : ""}</span>
          <span class="seance-marque" aria-hidden="true">${marque}</span><span class="lecteur">${esc(statut[1])}</span>
        </button>
        ${rapide ? `<span class="seance-rapide"><button type="button" class="bouton bouton-petit" data-statut-rapide="faite" data-cle="${esc(cle)}">✓ Faite</button><button type="button" class="bouton bouton-second bouton-petit" data-statut-rapide="annulee" data-cle="${esc(cle)}">Absent</button></span>` : ""}
      </div>`;
  }
  function htmlLigneSeance(x) {
    return `<article class="seance-ligne statut-${x.s.statut}" data-seance="${esc(x.dossierId + "|" + x.s.id)}">${htmlTeteSeance(x)}<div class="seance-edition" hidden></div></article>`;
  }

  function trouverSeance(cle) {
    const [id, sid] = String(cle).split("|");
    const e = agenda.dossiers[id];
    const s = e && e.d.seances.find((x) => x.id === sid);
    return s ? { id: id, e: e, s: s } : null;
  }

  function htmlEditeur(cle) {
    const t = trouverSeance(cle);
    if (!t) return "";
    const e = t.e, s = t.s;
    const ad = e.d.adaptation && e.d.adaptation.actif === "oui";
    const plan = axesDuPlan(e.d);
    const coches = Object.keys(s.axes).filter((k) => s.axes[k] === "oui");
    const liste = plan.concat(U.AXES.filter((a) => coches.indexOf(a.id) >= 0 && !plan.some((b) => b.id === a.id)));
    const autres = U.AXES.filter((a) => !liste.some((b) => b.id === a.id));
    const caseAxe = (a) => `<label><input type="checkbox" data-ed="axes.${a.id}"${s.axes[a.id] === "oui" ? " checked" : ""}><span>${U.PICTOS_AXES[a.id] || ""} ${esc(titreCourtAxe(a))}</span></label>`;
    const avant = e.d.seances.filter((x) => x.id !== s.id && x.date && s.date && x.date < s.date);
    const rappel = SE.resumeEnfant(avant, s.date || B.aujourdhui()).rappel;
    const rang = SE.rang(e.d.seances, s);
    let prevu = null;
    try { prevu = U.planning(e.d, reglages).seances[rang - 1] || null; } catch (err) { prevu = null; }
    const villes = A.villesCabinet(reglages.cabinet.adresse);
    return `${rappel ? `<p class="rappel-prochaine"><span aria-hidden="true">📌</span> Noté le ${esc(B.dateCourte(rappel.date))} pour la fois suivante : <strong>${esc(rappel.prochaine)}</strong></p>` : ""}
      ${prevu && s.statut !== "annulee" ? `<details class="prevu-plan"><summary>Plan de suivi, séance n° ${rang} (${esc(prevu.phase.toLowerCase())}) : <strong>${esc(prevu.titre)}</strong></summary><ul>${prevu.contenu.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>${prevu.maison.length ? `<p>À la maison : ${esc(prevu.maison.map((m) => m[0]).join(", "))}</p>` : ""}</details>` : ""}
      <div class="champ"><span>Statut</span><div class="choix" role="radiogroup" aria-label="Statut">${SE.STATUTS.map((x) => `<label><input type="radio" name="ed-statut" value="${x[0]}" data-ed="statut"${s.statut === x[0] ? " checked" : ""}><span>${esc(x[1])}</span></label>`).join("")}</div></div>
      <div class="si-faite"${s.statut === "faite" ? "" : " hidden"}>
        <div class="champ"><span>Travaillé</span><div class="cases cases-puces">${liste.map(caseAxe).join("")}</div>
          ${autres.length ? `<details class="autres-axes"><summary>Autres axes</summary><div class="cases cases-puces">${autres.map(caseAxe).join("")}</div></details>` : ""}</div>
        <div class="champ"><span>Comment ça s'est passé ?</span><div class="choix choix-visages" role="radiogroup" aria-label="Comment ça s'est passé ?">${SE.ETATS.map((x) => `<label><input type="radio" name="ed-etat" value="${x[0]}" data-ed="etat"${s.etat === x[0] ? " checked" : ""}><span><span aria-hidden="true">${x[2]}</span> ${esc(x[1])}</span></label>`).join("")}</div></div>
        <label class="champ"><span>Pour la prochaine fois</span><input type="text" data-ed="prochaine" value="${esc(s.prochaine)}" placeholder="reprendre les boucles ; apporter son cahier"></label>
        ${ad ? `<div class="grille2">
          <label class="champ"><span>Ce qui a aidé</span><input type="text" data-ed="aide" value="${esc(s.aide)}" placeholder="minuteur visuel ; parler de dinosaures"></label>
          <label class="champ"><span>Ce qui a été difficile</span><input type="text" data-ed="difficile" value="${esc(s.difficile)}" placeholder="attendre son tour ; bruit du couloir"></label>
        </div>` : ""}
      </div>
      <label class="champ"><span>Note (facultatif)</span><input type="text" data-ed="fait" value="${esc(s.fait)}" placeholder="${s.statut === "annulee" ? "malade, rendez-vous reporté…" : "grands tracés au tableau, a bien accroché"}"></label>
      <div class="grille3">
        <label class="champ"><span>Date</span><input type="date" data-ed="date" value="${esc(s.date)}"></label>
        <label class="champ"><span>Heure</span><input type="time" data-ed="heure" value="${esc(s.heure)}"></label>
        ${villes.length > 1 ? `<label class="champ"><span>Lieu</span><select data-ed="lieu"><option value="">–</option>${villes.map((v) => `<option${v === s.lieu ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></label>` : ""}
      </div>
      <div class="seance-pied">
        <button type="button" class="bouton-lien" data-ouvrir-dossier-seance="${esc(t.id)}">Ouvrir le dossier</button>
        <button type="button" class="bouton-lien" data-retirer-seance="${esc(cle)}">Retirer la séance</button>
        <button type="button" class="bouton bouton-petit" data-ouvrir-seance="${esc(cle)}">Fermer</button>
      </div>`;
  }

  function ouvrirEditeur(cle, basculer) {
    const art = $(`[data-seance="${cle}"]`, zoneActive());
    if (!art) return;
    const zone = $(".seance-edition", art);
    if (basculer && seanceOuverte === cle && !zone.hidden) {
      zone.hidden = true; zone.innerHTML = ""; seanceOuverte = "";
      $(".seance-ouvrir", art).setAttribute("aria-expanded", "false");
      return;
    }
    $$(".seance-edition").forEach((z) => { if (z !== zone) { z.hidden = true; z.innerHTML = ""; } });
    $$(".seance-ouvrir").forEach((b) => b.setAttribute("aria-expanded", String(b.closest("[data-seance]") === art)));
    seanceOuverte = cle;
    zone.innerHTML = htmlEditeur(cle);
    zone.hidden = false;
  }

  function majTeteSeance(cle) {
    const art = $(`[data-seance="${cle}"]`, zoneActive()), t = trouverSeance(cle);
    if (!art || !t) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlTeteSeance({ dossierId: t.id, enfant: nomEnfant(t.e.infos), s: t.s });
    $(".seance-ligne-tete", art).replaceWith(tmp.firstElementChild);
    art.className = "seance-ligne statut-" + t.s.statut;
  }

  // Écrit les séances d'un dossier : en mémoire pour le dossier ouvert, dans Mes dossiers pour les autres.
  function ecrireEntree(id) {
    const x = agenda.entrees[id];
    if (!x) return Promise.resolve();
    majEtatEnregistrement("attente");
    x.modifieLe = new Date().toISOString();
    return Base.mettre(JSON.parse(JSON.stringify(x))).then(() => { dernierEnregistrement = new Date(); majIndicateur(); }).catch(() => majIndicateur(true));
  }
  function enregistrerSeancesDe(id) {
    const e = agenda.dossiers[id];
    if (!e) return;
    if (e.d === dossier) {
      nonEnregistre = true;
      sauverBrouillon();
      clearTimeout(ecritures.courant);
      ecritures.courant = setTimeout(() => { delete ecritures.courant; majTout(); }, 500);
    } else if (agenda.entrees[id]) {
      clearTimeout(ecritures[id]);
      majEtatEnregistrement("attente");
      ecritures[id] = setTimeout(() => { delete ecritures[id]; ecrireEntree(id); }, 300);
    } else {
      // Dossier ouvert entre-temps : on relit l'entrée enregistrée.
      Base.lire(id).then((x) => { if (x && x.dossier) { x.dossier.seances = e.d.seances; agenda.entrees[id] = x; ecrireEntree(id); } });
    }
  }
  function viderEcritures() {
    return Promise.all(Object.keys(ecritures).filter((k) => k !== "courant").map((id) => { clearTimeout(ecritures[id]); delete ecritures[id]; return ecrireEntree(id); }));
  }

  function modifierSeance(cle, f) {
    const t = trouverSeance(cle);
    if (!t) return null;
    f(t.s);
    enregistrerSeancesDe(t.id);
    return t;
  }

  function surSaisieSeance(e) {
    const el = e.target;
    const art = el.closest("[data-seance]");
    if (!art) return;
    if ((el.type === "radio" || el.type === "checkbox" || el.type === "date" || el.type === "time" || el.tagName === "SELECT") && e.type !== "change") return;
    if (el.type === "radio" && !el.checked) return;
    const cle = art.dataset.seance, champ = el.dataset.ed;
    const v = el.type === "checkbox" ? (el.checked ? "oui" : "") : el.value;
    modifierSeance(cle, (s) => {
      if (champ.indexOf("axes.") === 0) { const k = champ.slice(5); if (v) s.axes[k] = "oui"; else delete s.axes[k]; }
      else if (champ === "heure") s.heure = SE.heureValide(v);
      else s[champ] = v;
    });
    if (champ === "statut") $(".si-faite", art).hidden = v !== "faite";
    if (champ === "date") { reconstruireLignes(); rafraichirSeances(); return; }
    majTeteSeance(cle);
  }

  function statutRapide(cle, statut) {
    const t = modifierSeance(cle, (s) => { s.statut = statut; });
    if (!t) return;
    majTeteSeance(cle);
    if (statut === "faite") { ouvrirEditeur(cle, false); annoncer("Séance notée comme faite"); }
    else annoncer("Absence notée");
  }

  function retirerSeance(cle) {
    const t = trouverSeance(cle);
    if (!t) return;
    const i = t.e.d.seances.indexOf(t.s);
    t.e.d.seances.splice(i, 1);
    enregistrerSeancesDe(t.id);
    seanceOuverte = "";
    reconstruireLignes(); rafraichirSeances();
    proposerAnnulation("Séance retirée.", () => {
      t.e.d.seances.splice(i, 0, t.s);
      enregistrerSeancesDe(t.id);
      reconstruireLignes(); rafraichirSeances();
    });
  }

  function ouvrirFormSeance() {
    const f = $("#form-seance");
    f.hidden = false;
    const defaut = filtres.enfant || (agenda.dossiers[dossier.id] ? dossier.id : "") || (agenda.enfants[0] ? agenda.enfants[0].id : "");
    $("#ns-enfant").value = defaut;
    $("#ns-date").value = B.aujourdhui();
    $("#ns-heure").value = "";
    majFormSeance();
    $("#ns-enfant").focus();
  }
  function majFormSeance() {
    const d = $("#ns-date").value || B.aujourdhui();
    $("#ns-statut").textContent = d > B.aujourdhui() ? "Séance à venir : elle sera notée comme prévue." : d < B.aujourdhui() ? "Séance passée : elle sera notée comme faite." : "Séance d'aujourd'hui : elle sera notée comme faite.";
  }
  function ajouterSeanceDepuisForm() {
    const id = $("#ns-enfant").value;
    const e = agenda.dossiers[id];
    if (!e) { annoncer("Choisissez l'enfant (son dossier doit avoir un prénom)."); return; }
    if (e.d.seances.length >= SE.MAX) { annoncer(SE.MAX + " séances au plus par enfant."); return; }
    const auj = B.aujourdhui();
    const date = $("#ns-date").value || auj;
    const s = SE.seanceVide(date, { statut: date > auj ? "prevue" : "faite", heure: SE.heureValide($("#ns-heure").value), auteur: profilActif() || "", lieu: $("#ns-lieu").value || "" });
    e.d.seances.push(s);
    enregistrerSeancesDe(id);
    reconstruireLignes();
    $("#form-seance").hidden = true;
    if (filtres.enfant && filtres.enfant !== id) filtres.enfant = id;
    if (!SE.filtrer([{ dossierId: id, enfant: "", s: s }], filtres, auj).lignes.length) {
      Object.assign(filtres, { periode: "semaine", decalage: SE.decalagePour("semaine", date, auj), statut: "", axe: "", auteur: "", lieu: "" });
    }
    seanceOuverte = id + "|" + s.id;
    sauverFiltres(); rendreFiltres(); rendreVue();
    const art = $(`[data-seance="${seanceOuverte}"]`);
    if (art) art.scrollIntoView({ block: "center" });
    annoncer(s.statut === "prevue" ? "Séance prévue ajoutée" : "Séance ajoutée");
  }

  async function programmerPlan() {
    const id = filtres.enfant, e = agenda.dossiers[id];
    if (!e) return;
    let plan;
    try { plan = U.planning(e.d, reglages); } catch (err) { annoncer("Le plan de suivi n'a pas pu être calculé."); return; }
    const auj = B.aujourdhui();
    const avecHeure = e.d.seances.filter((x) => x.heure).sort(SE.ordre).pop();
    const aVenir = plan.seances.filter((x) => x.date >= auj);
    const premiere = aVenir.length ? aVenir[0].date : SE.ajouterJours(auj, plan.parametres.frequence);
    const prenom = nomEnfant(e.infos);
    const lire = (fond) => {
      const v = (n) => fond.querySelector(`[name=${n}]`);
      const debut = v("debut").value, frequence = Number(v("frequence").value), nombre = Math.round(Number(v("nombre").value));
      const dates = debut && nombre >= 1 && nombre <= 60 ? Array.from({ length: nombre }, (_, i) => SE.ajouterJours(debut, i * frequence)) : [];
      return { debut: debut, frequence: frequence, nombre: nombre, heure: SE.heureValide(v("heure").value), majPlan: v("majPlan").checked, dates: dates };
    };
    let choix = null;
    const v = await ouvrirDialogue({
      titre: "Programmer les séances de " + prenom, classe: "boite-programmer",
      html: `<p class="note">Les séances prévues s'ajoutent au planning, chacune reste modifiable. Une date déjà occupée pour cet enfant n'est pas doublée.</p>
        <div class="grille2">
          <label class="champ"><span>Première séance</span><input type="date" name="debut" value="${esc(premiere)}"></label>
          <label class="champ"><span>Heure (facultatif)</span><input type="time" name="heure" value="${esc(avecHeure ? avecHeure.heure : "")}"></label>
          <label class="champ"><span>Fréquence</span><select name="frequence">${U.FREQUENCES.map((f) => `<option value="${f[0]}"${f[0] === plan.parametres.frequence ? " selected" : ""}>${esc(f[1])}</option>`).join("")}</select></label>
          <label class="champ"><span>Nombre de séances</span><input type="number" name="nombre" min="1" max="60" inputmode="numeric" value="${aVenir.length || plan.parametres.nombre}"></label>
        </div>
        <label class="case"><input type="checkbox" name="majPlan" checked><span>Mettre le plan de suivi à jour avec ce rythme</span></label>
        <p class="apercu-programme" aria-live="polite"></p>`,
      boutons: [{ valeur: "ok", libelle: "Programmer" }, { valeur: "annuler", libelle: "Annuler" }],
      init: (fond) => {
        const maj = () => {
          const c = lire(fond);
          const z = $(".apercu-programme", fond);
          if (!c.dates.length) { z.textContent = "Choisissez la date de début et un nombre de séances (1 à 60)."; return; }
          const prises = new Set(e.d.seances.map((x) => x.date));
          const libres = c.dates.filter((d) => d >= auj && !prises.has(d));
          const jour = SE.libelleJour(c.debut).split(" ")[0].toLowerCase();
          const freq = (U.FREQUENCES.find((f) => f[0] === c.frequence) || [0, ""])[1].toLowerCase();
          z.textContent = c.nombre + " séance" + (c.nombre > 1 ? "s" : "") + ", le " + jour + (c.nombre > 1 ? ", " + freq : "") + (c.heure ? " à " + heureTexte(c.heure) : "") +
            ", du " + B.dateCourte(c.dates[0]) + " au " + B.dateCourte(c.dates[c.dates.length - 1]) + "." +
            (libres.length < c.dates.length ? " " + (c.dates.length - libres.length) + " date" + (c.dates.length - libres.length > 1 ? "s" : "") + " déjà occupée" + (c.dates.length - libres.length > 1 ? "s" : "") + " ou passée" + (c.dates.length - libres.length > 1 ? "s" : "") + " : non ajoutée" + (c.dates.length - libres.length > 1 ? "s" : "") + "." : "");
        };
        fond.addEventListener("input", maj);
        fond.addEventListener("change", maj);
        maj();
      },
      valider: (fond) => {
        const c = lire(fond);
        if (!c.debut) return "Choisissez la date de la première séance.";
        if (!(c.nombre >= 1 && c.nombre <= 60)) return "Le nombre de séances va de 1 à 60.";
        choix = c;
        return "";
      },
    });
    if (v !== "ok" || !choix) return;
    const nouvelles = SE.planifier(e.d.seances, choix.dates, { aujourdhui: auj, heure: choix.heure, auteur: profilActif() || "" });
    if (!nouvelles.length) { annoncer("Ces dates sont déjà passées ou déjà dans le planning."); return; }
    const suiviAvant = JSON.parse(JSON.stringify(e.d.suivi || {}));
    nouvelles.forEach((x) => e.d.seances.push(x));
    if (choix.majPlan) {
      const faites = e.d.seances.filter((x) => x.statut === "faite").length;
      e.d.suivi = Object.assign({}, e.d.suivi || {}, { frequence: String(choix.frequence), nombre: String(faites + nouvelles.length) }, faites ? {} : { debut: choix.debut });
      if (e.d === dossier) remplirFormulaire();
    }
    enregistrerSeancesDe(id);
    reconstruireLignes();
    Object.assign(filtres, { periode: "avenir", decalage: 0 });
    sauverFiltres(); rendreFiltres(); rendreVue();
    proposerAnnulation(nouvelles.length + " séance" + (nouvelles.length > 1 ? "s" : "") + " programmée" + (nouvelles.length > 1 ? "s" : "") + ".", () => {
      nouvelles.forEach((x) => { const i = e.d.seances.indexOf(x); if (i >= 0) e.d.seances.splice(i, 1); });
      if (choix.majPlan) { e.d.suivi = suiviAvant; if (e.d === dossier) remplirFormulaire(); }
      enregistrerSeancesDe(id); reconstruireLignes(); rendreVue();
    });
  }

  // Résumé de l'enfant choisi dans le filtre.
  function rendreFicheEnfant() {
    const zone = $("#fiche-enfant-seances");
    const e = filtres.enfant && agenda.dossiers[filtres.enfant];
    if (!e) { zone.hidden = true; zone.innerHTML = ""; return; }
    const auj = B.aujourdhui();
    const d = B.normaliserDossier(e.d);
    const r = SE.resumeEnfant(d.seances, auj);
    const h = [`<div class="carte-tete"><h2>${esc(nomCompletEnfant(e.infos))}</h2><button type="button" class="bouton bouton-second bouton-petit" data-ouvrir-dossier-seance="${esc(filtres.enfant)}">Ouvrir le dossier</button></div>`];
    h.push(`<p><strong>${r.faites}</strong> séance${r.faites > 1 ? "s" : ""} faite${r.faites > 1 ? "s" : ""}${r.annulees ? ", " + r.annulees + " absence" + (r.annulees > 1 ? "s" : "") : ""} · ${r.prochaine ? "prochaine : " + esc(SE.libelleJour(r.prochaine.date).toLowerCase()) + (r.prochaine.heure ? " à " + esc(heureTexte(r.prochaine.heure)) : "") : "aucune séance prévue"}</p>`);
    if (d.pco.actif === "oui") h.push(`<div class="etat-pco">${htmlEtatPco(A.etatPco(d, auj))}</div>`);
    if (r.rappel) h.push(`<p class="rappel-prochaine"><span aria-hidden="true">📌</span> Noté le ${esc(B.dateCourte(r.rappel.date))} pour la fois suivante : <strong>${esc(r.rappel.prochaine)}</strong></p>`);
    if (d.adaptation.actif === "oui") {
      const paires = A.ceQuiAide(d);
      if (paires.length) h.push(`<details class="ce-qui-aide-court"><summary><span aria-hidden="true">💡</span> Ce qui aide ${esc(String(d.prenom || "").trim())}</summary><dl class="liste-aide">${paires.map((x) => `<div><dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd></div>`).join("")}</dl></details>`);
    }
    zone.hidden = false;
    zone.innerHTML = h.join("");
  }

  function surFiltre(el) {
    const k = el.dataset.filtre;
    if (k === "periode") { if (!el.checked) return; filtres.periode = el.value; filtres.decalage = 0; }
    else filtres[k] = el.value;
    seanceOuverte = "";
    sauverFiltres();
    rendreFiltres();
    rendreVue();
  }

  // Ouvre l'onglet Séances sur l'enfant du dossier en cours.
  function voirSeancesDuDossier() {
    if (!String(dossier.prenom || "").trim() && !String(dossier.nom || "").trim()) { annoncer("Écrivez d'abord le prénom de l'enfant."); return; }
    assurerId();
    Object.assign(filtres, { enfant: dossier.id, periode: "toutes", decalage: 0, statut: "", axe: "", auteur: "", lieu: "" });
    sauverFiltres();
    afficherOnglet("seances");
  }

  // Planning imprimable : la vue affichée, avec ses filtres.
  function modelePlanningSeances() {
    const auj = B.aujourdhui();
    const res = agendaVue || vueCourante();
    const e = filtres.enfant && agenda.dossiers[filtres.enfant];
    const c = (t, o) => B.cellule(t, o);
    const precisions = [res.periode.libelle, e ? nomCompletEnfant(e.infos) : "tous les enfants"];
    const st = SE.STATUTS.find((x) => x[0] === filtres.statut);
    if (st) precisions.push("séances " + st[1].toLowerCase() + "s");
    if (filtres.auteur) precisions.push(filtres.auteur);
    if (filtres.lieu) precisions.push(filtres.lieu);
    const ax = U.AXES.find((a) => a.id === filtres.axe);
    if (ax) precisions.push(ax.titre.toLowerCase());
    const blocs = [{ type: "titre", texte: "Planning des séances" }, { type: "p", runs: [{ t: precisions.join(" · "), i: true }] }];
    const jours = SE.grouperParJour(res, auj).filter((j) => j.lignes.length);
    if (!jours.length) blocs.push({ type: "p", runs: [{ t: "Aucune séance sur cette période." }] });
    else {
      const lignes = [{ entete: true, cellules: ["Jour", "Heure", "Enfant", "Statut", "Travaillé, notes"].map((t) => c(t, { gras: true, fond: "entete" })) }];
      jours.forEach((j) => j.lignes.forEach((x, k) => {
        const s = x.s, etat = SE.ETATS.find((y) => y[0] === s.etat), statut = SE.STATUTS.find((y) => y[0] === s.statut);
        const axes = U.AXES.filter((a) => s.axes[a.id] === "oui").map((a) => titreCourtAxe(a));
        const det = [axes.join(", "), s.fait, s.prochaine ? "Prochaine fois : " + s.prochaine : ""].filter(Boolean).join("\n");
        lignes.push({ cellules: [c(k ? "" : j.libelle, { gras: true }), c(heureTexte(s.heure)), c(nomCompletEnfant(agenda.dossiers[x.dossierId].infos)), c(s.statut === "faite" && etat ? etat[2] + " " + etat[1] : statut[1]), c(det || "")] });
      }));
      blocs.push({ type: "tableau", largeurs: [0.2, 0.1, 0.22, 0.16, 0.32], petit: true, entetes: true, lignes: lignes });
    }
    return Object.assign({ titre: "Planning des séances", blocs: blocs }, B.papier(reglages));
  }

  function dureeTexte(j) {
    if (j < 31) return j + " jour" + (j > 1 ? "s" : "");
    return Math.round(j / 30.4) + " mois";
  }

  function htmlEtatPco(e) {
    const m = [`<strong>${e.faites}</strong> séance${e.faites > 1 ? "s" : ""} notée${e.faites > 1 ? "s" : ""}` + (e.prevues ? ` sur environ ${e.prevues}` : "")];
    if (e.echeance) m.push(`fin du forfait le <strong>${esc(B.dateCourte(e.echeance))}</strong>` + (e.joursRestants !== null && e.joursRestants >= 0 ? ` (dans ${dureeTexte(e.joursRestants)})` : ""));
    else m.push("renseignez la date de début du parcours");
    return `<p><span aria-hidden="true">🧭</span> Plateforme TND : ${m.join(" · ")}</p>` +
      (e.prevues ? `<progress max="${e.prevues}" value="${Math.min(e.faites, e.prevues)}" aria-label="Séances faites"></progress>` : "") +
      (e.alerte ? `<p class="alerte-pco">${esc(e.alerte)}</p>` : "");
  }

  function majAccueil() {
    const d = B.normaliserDossier(dossier);
    const ad = d.adaptation;
    $("#champ-raison-autre").hidden = ad.raison !== "autre";
    $("#case-mention").hidden = ad.raison !== "tsa";
    $("#case-orientation").hidden = !ad.raison || !A.orientationPossible(d);

    // Fiche « Ce qui aide »
    const paires = A.ceQuiAide(d);
    const prenom = String(d.prenom || "").trim();
    $("#prenom-fiche").textContent = prenom;
    const liste = paires.length ? `<dl class="liste-aide">${paires.map((x) => `<div><dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd></div>`).join("")}</dl>` : "";
    $("#fiche-aide").innerHTML = liste || `<p class="note">Elle se remplit avec les réponses des parents (ci-dessous) et ce qui est noté dans les séances.</p>`;

    // Planning en images
    $("#planning-etapes").innerHTML = ad.planning.map((id, i) => {
      const e = A.ETAPES.find((x) => x.id === id);
      return `<li class="etape"><span class="picto" aria-hidden="true">${e.picto}</span><span class="etape-texte">${esc(e.texte)}</span>
        <span class="etape-actions"><button type="button" class="bouton-rond" data-etape-haut="${i}" aria-label="Avancer : ${esc(e.texte)}"${i === 0 ? " disabled" : ""}>↑</button><button type="button" class="bouton-rond" data-etape-bas="${i}" aria-label="Reculer : ${esc(e.texte)}"${i === ad.planning.length - 1 ? " disabled" : ""}>↓</button><button type="button" class="bouton-rond" data-etape-suppr="${i}" aria-label="Retirer : ${esc(e.texte)}">✕</button></span></li>`;
    }).join("") || `<li class="note">Aucune étape : touchez une image ci-dessous.</li>`;
    $$("[data-etape-ajout]").forEach((b) => { b.disabled = ad.planning.length >= A.MAX_ETAPES; });

    // Lieu du rendez-vous : villes du cabinet proposées, la première par défaut
    const villes = A.villesCabinet(reglages.cabinet.adresse);
    $("#lieu-visite").placeholder = villes[0] || "Ville du cabinet";
    $("#villes-cabinet").innerHTML = villes.map((v) => `<option value="${esc(v)}">`).join("");

    // Logo du cabinet (Réglages)
    const lg = $("#apercu-logo-cabinet"), lc = reglages.logoCabinet;
    if (lg) {
      lg.hidden = !lc;
      if (lc) { if (lg.getAttribute("src") !== lc.donnees) lg.src = lc.donnees; } else lg.removeAttribute("src");
      $("[data-action='retirer-logo-cabinet']").hidden = !lc;
    }
    // Photo du cabinet
    const img = $("#apercu-photo-cabinet"), ph = reglages.photoCabinet;
    img.hidden = !ph;
    if (ph) { if (img.getAttribute("src") !== ph.donnees) img.src = ph.donnees; } else img.removeAttribute("src");
    $("[data-action='retirer-photo-cabinet']").hidden = !ph;

    // Plateforme TND
    const html = d.pco.actif === "oui" ? htmlEtatPco(A.etatPco(d, B.aujourdhui())) : "";
    $("#etat-pco").innerHTML = html;

    // Passations adaptées : résumé dans chaque encadré
    $$("[data-passation-bloc]").forEach((el) => {
      const l = A.libellesPassation(d.passations[el.dataset.passationBloc]);
      $(".passation-resume", el).textContent = l.join(", ");
      el.classList.toggle("adaptee", l.length > 0);
    });

    // Nombre de séances dans le dossier
    const r = SE.resumeEnfant(d.seances, B.aujourdhui());
    $$(".resume-seances-dossier").forEach((z) => { z.textContent = d.seances.length ? r.faites + " séance" + (r.faites > 1 ? "s" : "") + " faite" + (r.faites > 1 ? "s" : "") + (r.prochaine ? ", prochaine le " + B.dateCourte(r.prochaine.date) : "") + "." : "Aucune séance notée pour l'instant."; });
  }

  function modifierPlanning(f) {
    const avant = dossier.adaptation.planning.slice();
    f(dossier.adaptation.planning);
    if (avant.join() === dossier.adaptation.planning.join()) return;
    nonEnregistre = true;
    majTout();
  }

  function majTdc() {
    const t = B.reperesTdc(dossier, reglages);
    $("#tdc-criteres").innerHTML = t.criteres.map((c) => `<li class="tdc-${c.etat === "?" ? "inconnu" : c.etat}"><span class="tdc-badge">${esc(B.ETATS_TDC[c.etat])}</span>
      <span><strong>Critère ${c.id} :</strong> ${esc(c.nom)}<br><small>${esc(c.texte)}</small></span></li>`).join("");
    $("#tdc-conclusion").textContent = t.conclusion + (t.avant5 ? " Avant 5 ans : atteinte sévère et deux évaluations à au moins trois mois d'intervalle." : "");
  }

  function majOccupation() {
    const d = B.normaliserDossier(dossier);
    const m = O.calculMcro(d.mcro);
    const f = (v) => (v === null ? "–" : B.formaterNombre(v, 1));
    $("#mcro-moyennes").textContent = m.problemes.length
      ? "Moyennes : rendement " + f(m.r1) + "/10, satisfaction " + f(m.s1) + "/10" + (m.reeval ? " ; réévaluation : rendement " + f(m.r2) + "/10, satisfaction " + f(m.s2) + "/10" : "") + "."
      : "";
    const q = O.calculDcdq(d.dcdq, B.ageMois(d));
    const zone = $("#dcdq-resultat");
    if (!q.n) zone.innerHTML = "";
    else {
      const interp = q.indication === true ? `<span class="niveau">En faveur d'un trouble développemental de la coordination (seuil ${q.bande.seuil}, ${esc(q.bande.libelle)})</span>`
        : q.indication === false ? `<span class="niveau">Probablement pas de trouble développemental de la coordination (seuil ${q.bande.seuil})</span>`
        : !q.complet ? `${q.n} réponses sur 15` : "Renseignez les dates de naissance et du bilan (5 à 15 ans).";
      zone.className = "resultat-dcdq" + (q.indication === true ? " niveau-patho" : q.indication === false ? " niveau-moyenne" : "");
      zone.innerHTML = `<p>${q.facteurs.map((x) => esc(B.maj(x.nom)) + " : <strong>" + x.total + "/" + x.max + "</strong>").join(" · ")}</p>
        <p>Score total : <strong>${q.total}/75</strong> · ${interp}</p>`;
    }
    majCartes(d);
  }

  function majCartes(d) {
    Object.keys(O.JEUX).forEach((jeu) => {
      const r = d.cartes[jeu];
      const total = O.cartesDuJeu(jeu, reglages.cartesPerso).length;
      const nb = total - r.exclues.filter((id) => O.cartesDuJeu(jeu, reglages.cartesPerso).some((c) => c.id === id)).length;
      $("#nb-cartes-" + jeu).textContent = nb + " sur " + total;
      $(`[data-action="effacer-tri"][data-jeu="${jeu}"]`).hidden = !r.resultats.length;
      $(`[data-action="lancer-tri"][data-jeu="${jeu}"]`).textContent = r.resultats.length ? "Refaire le tri avec l'enfant" : "Lancer le tri avec l'enfant";
      const zone = $("#resultat-tri-" + jeu);
      if (!r.resultats.length) { zone.innerHTML = ""; return; }
      zone.innerHTML = `<p class="calcule">Tri du ${esc(B.dateCourte(r.date) || "jour")} : ${r.resultats.length} cartes${r.choix.length ? ", ★ = choisie par l'enfant" : ""}.</p>` +
        O.pilesDe(jeu).map((p) => {
          const xs = r.resultats.filter((x) => x.pile === p.id);
          if (!xs.length) return "";
          return `<div class="pile-res" data-couleur="${p.id}"><h4><span aria-hidden="true">${p.emoji}</span> ${esc(p.label)} <small>(${xs.length})</small></h4>
            <div class="puces-cartes">${xs.map((x) => {
              const ch = r.choix.indexOf(x.id) >= 0;
              return `<span class="puce-carte${ch ? " choisie" : ""}">${x.emoji ? `<span aria-hidden="true">${esc(x.emoji)}</span> ` : ""}${esc(x.enfant)}${ch ? ' <span class="etoile" aria-label="choisie">★</span>' : ""}</span>`;
            }).join("")}</div></div>`;
        }).join("");
    });
  }

  async function lancerTri(jeu) {
    const r = dossier.cartes[jeu];
    if (r.resultats.length && !(await demander("Refaire le tri ? Les résultats actuels seront remplacés.", "Refaire le tri"))) return;
    const cartes = O.cartesDuJeu(jeu, reglages.cartesPerso).filter((c) => r.exclues.indexOf(c.id) < 0);
    if (!cartes.length) { annoncer("Aucune carte sélectionnée."); return; }
    const res = await window.TriCartes.lancer({ jeu: O.JEUX[jeu], cartes: cartes, prenom: dossier.prenom });
    if (!res) { annoncer("Tri arrêté, aucune carte rangée."); return; }
    r.resultats = res.resultats;
    r.choix = res.choix;
    r.fait = "oui";
    r.date = B.aujourdhui();
    nonEnregistre = true;
    majTout();
    annoncer("Tri enregistré : " + res.resultats.length + " cartes");
  }

  function construireCartesPerso() {
    const l = reglages.cartesPerso;
    $("#cartes-perso").innerHTML = l.length
      ? `<ul class="liste-cartes-perso">${l.map((c) => `<li>${c.photo ? `<img src="${esc(c.photo)}" alt="">` : `<span class="vignette" aria-hidden="true">🃏</span>`}
          <span class="carte-perso-texte"><strong>${esc(c.texte)}</strong><small>${esc(O.JEUX[c.jeu].titre)}</small></span>
          <button type="button" class="bouton-lien" data-suppr-carte="${esc(c.id)}">Retirer</button></li>`).join("")}</ul>`
      : `<p class="note">Aucune carte personnelle pour l'instant.</p>`;
  }
  function rafraichirListesCartes() {
    Object.keys(O.JEUX).forEach((jeu) => {
      const el = $("#liste-cartes-" + jeu);
      if (el) el.innerHTML = htmlListeCartes(jeu);
    });
    remplirCasesCartes();
  }
  function remplirCasesCartes() {
    $$("[data-carte-incluse]").forEach((el) => {
      const [jeu, id] = el.dataset.carteIncluse.split(":");
      el.checked = dossier.cartes[jeu].exclues.indexOf(id) < 0;
    });
  }

  let photoCarte = null;

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
          <legend class="critere-tete"><span class="num">${c.id}</span><span class="intitule"><span class="nom">${esc(c.nom)}</span><span class="aide-critere">${esc(c.aide)}</span></span></legend>
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
        ${htmlPassation(t.id)}
      </div>
    </fieldset>`;
  }

  function construireTests() {
    $("#tests").innerHTML = B.TESTS.filter((t) => t.id !== "evic" || (dossier.tests.evic && dossier.tests.evic.fait === "oui")).map(htmlTest).join("");
  }

  function reconstruireTest(id) {
    const t = B.TESTS.find((x) => x.id === id);
    const ancien = $(`[data-bloc-test="${id}"]`);
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlTest(t);
    ancien.replaceWith(tmp.firstElementChild);
  }

  function construireSections() {
    const html = (liste) => liste.map((s) =>
      `<div class="section-cr">
        <div class="section-tete">
          <h3 id="h-${s.id}">${esc(B.titreSection(s.titre, { prenom: "" }))}</h3>
          <button type="button" class="bouton-lien" data-retablir="${s.id}" hidden>Rétablir le texte généré</button>
        </div>
        <textarea data-section="${s.id}" aria-labelledby="h-${s.id}" rows="3"></textarea>
      </div>`).join("");
    // Texte du compte rendu en parties repliables : présentation, occupations, écriture, sensoriel, conclusion.
    const parties = { occupations: "🌱 Occupations", ecriture: "✏️ Écriture", sensoriel: "🌈 Sensoriel" };
    let partie = "", vuGroupe = false, h = "";
    B.SECTIONS.forEach((sec) => {
      const g = (sec.groupes || [])[0];
      if (g) vuGroupe = true;
      const p = g ? parties[g] || "" : vuGroupe ? "🎯 Conclusion et préconisations" : "📋 Présentation";
      if (p && p !== partie) { h += `<h4 class="sous-groupe">${p}</h4>`; partie = p; }
      h += html([sec]);
    });
    $("#sections").innerHTML = h;
    $("#sections-ecole").innerHTML = html(B.SECTIONS_ECOLE);
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
      ? (window.NORMES_INTEGREES ? "Normes intégrées à cette version personnelle (à ne pas publier)." : "Normes importées" + (n.source ? " : " + n.source : "") + ".")
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
    if ($("#phrases-reglages")) $("#phrases-reglages").value = reglages.phrases.join("\n");
    $("#questions-auto").innerHTML = reglages.autoQuestions.map((q, i) =>
      `<div class="question-auto-reglage"><label class="champ"><span>Question ${i + 1}</span><input type="text" data-reg-question="${i}" value="${esc(q)}"></label>
        <label class="champ"><span>Domaine</span><select data-reg-domaine="${i}"><option value="">–</option>${B.DOMAINES_AUTO.map((x) => `<option value="${x[0]}"${reglages.autoDomaines[i] === x[0] ? " selected" : ""}>${esc(x[1])}</option>`).join("")}</select></label></div>`).join("") +
      `<div class="barre-actions"><button type="button" class="bouton bouton-second" data-action="ajouter-question">Ajouter une question</button>` +
      (reglages.autoQuestions.length > 1 ? `<button type="button" class="bouton-lien" data-action="retirer-question">Retirer la dernière question</button>` : "") + `</div>`;
    construirePraticiens();
    construireNormes();
    construireCartesPerso();
    const lib = reglages.esoLibelles;
    const nEso = lib.sp.length + lib.p.length + lib.l.length;
    $("#etat-eso-libelles").textContent = nEso
      ? "Texte enregistré dans ce navigateur : " + lib.sp.length + " questions (soins personnels), " + lib.p.length + " (travail scolaire), " + lib.l.length + " (loisirs)."
      : "Aucun texte enregistré : la saisie se fait par numéro de question.";
    $("[data-action='effacer-eso']").hidden = !nEso;
    $("#etat-eso-libelles").textContent += reglages.esoCotation ? " Grille de cotation enregistrée : roues, systèmes et interprétation se calculent à partir des réponses." : " Grille de cotation absente : importez le fichier du cabinet pour calculer roues et systèmes à partir des réponses.";

    if ($("#profil")) majProfil();
    $("#note-brouillon").textContent = reglages.brouillon
      ? "Rien n'est envoyé en ligne : les dossiers restent dans ce navigateur, sur cet appareil. La copie de sécurité les met dans un fichier que vous pouvez ranger ou transférer sur un autre appareil."
      : "Enregistrement automatique désactivé (Réglages) : téléchargez chaque dossier pour le garder.";
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
      if (lab) lab.textContent = (i + 1) + ". " + (el.value || "Question " + (i + 1));
    } else if (el.dataset.regDomaine !== undefined) {
      if (e.type !== "change") return;
      reglages.autoDomaines[Number(el.dataset.regDomaine)] = el.value;
      sauverReglages(); construireAuto(); remplirFormulaire(); majTout();
      return;
    } else if (el.dataset.regPhrases !== undefined) {
      reglages.phrases = el.value.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 300);
    } else if (el.dataset.verrouDelai !== undefined) {
      if (e.type !== "change") return true;
      if (verrouActif()) { verrou.delai = P.normaliserDelai(el.value); ecrireStockage(CLE_VERROU, verrou); annoncer("Délai de verrouillage enregistré"); }
      return true;
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
    if ($$('[data-chemin^="othope.items."][type="text"]').length !== dossier.othope.items.length) $("#corps-othope").innerHTML = htmlOthope();
    remplirCasesCartes();
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
    $("[data-action='analyser-photo']").hidden = !dossier.photoCopie || !window.Analyse;
    if (!dossier.photoCopie) { const z = $("#analyse-photo"); z.hidden = true; z.innerHTML = ""; }
  }

  // Réduit la photo (1600 px au plus par défaut, JPEG) pour garder des dossiers légers.
  function chargerPhoto(fichier, cote) {
    const max = cote || 1600;
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onerror = () => ko(new Error("La photo n'a pas pu être lue."));
      lecteur.onload = () => {
        const img = new Image();
        img.onerror = () => ko(new Error("Ce fichier n'est pas une image lisible."));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
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

    if (el.id === "code-verrou") { if (e.type === "input" && verrou && el.value.length >= verrou.longueur) essayerCode(); return; }
    if (el.id === "filtre-dossiers") { filtreDossiers = el.value; afficherMesDossiers(); return; }
    if (el.dataset.ed !== undefined) { surSaisieSeance(e); return; }
    if (el.dataset.filtre !== undefined) { if (e.type === "change") surFiltre(el); return; }
    if (el.dataset.ns !== undefined) { majFormSeance(); return; }
    if (el.dataset.axe) {
      if (e.type !== "change") return;
      const ex = new Set(dossier.suivi.exclus || []);
      if (el.checked) ex.delete(el.dataset.axe); else ex.add(el.dataset.axe);
      dossier.suivi.exclus = Array.from(ex);
      nonEnregistre = true; majTout();
      return;
    }
    if (el.dataset.note10 !== undefined) {
      const v = el.value.trim();
      const ok = v === "" || (/^\d{1,2}$/.test(v) && +v <= 10);
      if (ok) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true");
    }
    if (el.dataset.chemin) {
      if (el.type === "radio" && !el.checked) return;
      if (el.tagName === "SELECT" && el.value === "" && el.dataset.chemin.indexOf("manip.") === 0) effacerChemin(dossier, el.dataset.chemin);
      else ecrireChemin(dossier, el.dataset.chemin, el.type === "checkbox" ? (el.checked ? "oui" : "") : el.value);
      if (/^senso\.eso\.(roues|systemes)\./.test(el.dataset.chemin) && e.type === "input") dossier.senso.eso.calcul = "manuel";
      if (el.dataset.chemin === "auto.notes" && e.type === "input") dossier.auto.notesAuto = "";
      if (el.dataset.chemin === "auto.synthese" && e.type === "input") dossier.auto.syntheseAuto = "";
      if (el.dataset.bascule) {
        const corps = $(el.dataset.bascule);
        if (corps) corps.hidden = !el.checked;
        const carte = el.closest("fieldset.groupe");
        if (el.checked && carte && carte.classList.contains("replie")) replier(carte, false);
      }
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
    } else if (el.dataset.carteIncluse) {
      if (e.type !== "change") return;
      const [jeu, id] = el.dataset.carteIncluse.split(":");
      const ex = new Set(dossier.cartes[jeu].exclues);
      if (el.checked) ex.delete(id); else ex.add(id);
      dossier.cartes[jeu].exclues = Array.from(ex);
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
    const n = TOUTES_SECTIONS.reduce((a, s) => a + ((cr[s.id] && cr[s.id].texte.match(/\[[^\]]*\]/g)) || []).length, 0);
    $("#a-completer").textContent = n
      ? `Il reste ${n} passage${n > 1 ? "s" : ""} à compléter, entre crochets dans le texte ci-dessous.`
      : "Tout est complété.";
  }

  // ESO : roues et systèmes calculés à partir des réponses et de la grille de cotation du cabinet, sauf saisie à la main.
  function majCotationEso() {
    const e = dossier.senso && dossier.senso.eso;
    if (!e) return;
    const c = reglages.esoCotation ? S.cotationEso(e, reglages.esoCotation) : null;
    const etat = $("#etat-cotation-eso"), bouton = $("[data-action='eso-recalculer']");
    if (c && c.n && e.calcul !== "manuel") {
      const txt = (v) => (v === undefined || v === null ? "" : String(v).replace(".", ","));
      S.DOMAINES_ESO.forEach((dm) => S.SECTEURS_ESO.forEach((sc) => ecrireChemin(dossier, "senso.eso.roues." + dm[0] + "." + sc, txt(c.roues[dm[0]][sc]))));
      S.SYSTEMES_ESO.forEach((sy) => ecrireChemin(dossier, "senso.eso.systemes." + sy.id, { sp: txt(c.systemes[sy.id].sp), p: txt(c.systemes[sy.id].p), l: txt(c.systemes[sy.id].l) }));
      ecrireChemin(dossier, "senso.eso.points", c.points);
      e.calcul = "auto";
      $$('[data-chemin^="senso.eso.roues."], [data-chemin^="senso.eso.systemes."]').forEach((el) => {
        if (document.activeElement === el) return;
        const v = lireChemin(dossier, el.dataset.chemin);
        el.value = v === undefined || v === null ? "" : String(v);
      });
    }
    if (!etat) return;
    const manque = c ? S.NB_ITEMS_ESO * 3 - c.n : 0;
    etat.textContent = !c ? (reglages.esoCotation ? "" : "Grille de cotation absente : importez le fichier du cabinet (Réglages) pour calculer roues et systèmes à partir des réponses.")
      : !c.n ? "Saisissez ou importez les réponses des parents : roues, systèmes et interprétation se calculeront tout seuls."
      : e.calcul === "manuel" ? "Valeurs saisies à la main (elles ne suivent plus les réponses)."
      : "✅ Roues et systèmes calculés à partir des " + c.n + " réponses des parents" + (manque ? " (" + manque + " sans réponse : calcul sur les réponses données)" : "") + ".";
    if (bouton) bouton.hidden = !(c && c.n && e.calcul === "manuel");
  }
  function majApercuEso() {
    const ap = $("#apercu-eso");
    if (!ap) return;
    const det = $("#detail-eso");
    if (det) {
      const t = S.detailEso(S.normaliser(dossier.senso).eso, B.accords(dossier), { libelles: reglages.esoLibelles });
      det.innerHTML = t ? t.split("\n").map((l) => `<p>${esc(l)}</p>`).join("") : `<p class="note">Saisissez ou importez les réponses.</p>`;
    }
    const t = genere.eso || "";
    ap.innerHTML = t ? t.split("\n").map((l) => `<p>${esc(l)}</p>`).join("") : `<p class="note">Saisissez ou importez les réponses.</p>`;
    if (cr.eso && cr.eso.modifie) ap.insertAdjacentHTML("beforeend", `<p class="note">Vous avez retouché cette section dans l'onglet Compte rendu : c'est votre version qui est utilisée.</p>`);
  }

  function majTout() {
    majCotationEso();
    // La synthèse proposée de l'auto-évaluation est mise à jour avant la rédaction du compte rendu.
    if (dossier.auto && dossier.auto.fait === "oui") majSyntheseAuto(false);
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
    ["otipis", "dunn-enfant", "dunn-scolaire", "eso-roues", "eso-systemes", "eso-items"].forEach((id) => {
      const zone = $("#g-" + id);
      if (!zone) return;
      const g = window.Graph.graphique(id, dossier.senso);
      zone.hidden = !g;
      zone.innerHTML = g ? g.svg : "";
    });
    $$(".vide-graphiques-eso").forEach((el) => { el.hidden = ["g-eso-roues", "g-eso-systemes", "g-eso-items"].some((id) => $("#" + id) && !$("#" + id).hidden); });
    // BHK : graphique des critères avec sa légende, sous les résultats
    const zoneBhk = $("#g-bhk-criteres");
    if (zoneBhk) {
      const gb = window.Graph.dessiner("bhk-criteres", B.donneesGraphiques(dossier, reglages)["bhk-criteres"]);
      zoneBhk.hidden = !gb;
      zoneBhk.innerHTML = gb ? gb.svg : "";
    }
    S.systemesEso(S.normaliser(dossier.senso).eso).forEach((sy) => {
      const o = $("#eso-pct-" + sy.id);
      if (o) o.textContent = sy.pourcentage === null ? "" : Math.round(sy.pourcentage) + " %";
    });
    majPreconisations();
    majOccupation();
    majTdc();
    majSuivi();
    majAccueil();
    majClavier();
    majAuto();
    majEtapes();
    majSousOnglets();
    majEnfantCourant();
    const items = S.itemsEso(S.normaliser(dossier.senso).eso);
    items.forEach((x) => { const o = $("#eso-n-" + x.id); if (o) o.textContent = x.n ? x.n + "/" + S.NB_ITEMS_ESO + " réponses, moyenne " + B.formaterNombre(x.moyenne, 1) + "/10" : ""; });
    majEtatQuestionnairesParents(items);

    // Réévaluation
    const p = dossier.precedent;
    $("#etat-precedent").textContent = p ? "Comparaison avec le bilan du " + (B.dateCourte(p.passation) || "?") + " : " + p.mesures.length + " mesure" + (p.mesures.length > 1 ? "s" : "") + " enregistrée" + (p.mesures.length > 1 ? "s" : "") + "." : "";
    $("[data-action='retirer-precedent']").hidden = !p;

    // Compte rendu
    genere = B.rediger(dossier, reglages);
    TOUTES_SECTIONS.forEach((s) => {
      const ta = $(`[data-section="${s.id}"]`);
      $(`#h-${s.id}`).textContent = B.titreSection(s.titre, dossier);
      if (!cr[s.id] || !cr[s.id].modifie) {
        cr[s.id] = { texte: genere[s.id], modifie: false };
        if (ta.value !== genere[s.id]) { ta.value = genere[s.id]; ajuster(ta); }
      }
      ta.placeholder = genere[s.id] ? "" : "Section vide : elle n'apparaîtra pas dans le compte rendu.";
      $(`[data-retablir="${s.id}"]`).hidden = !cr[s.id].modifie;
    });
    majAvqParents();
    majApercuEso();
    $$("fieldset.groupe.replie").forEach(majResumeRepli);
    majACompleter();
    majGalerie();
    sauverBrouillon();
  }

  /* ================= Rendu du document ================= */

  function textes() {
    const t = {};
    TOUTES_SECTIONS.forEach((s) => { t[s.id] = cr[s.id] ? cr[s.id].texte : ""; });
    return t;
  }

  function htmlRuns(runs) {
    return runs.map((r) => {
      let h = esc(r.t);
      if (r.taille) h = `<span style="font-size:${r.taille / 2}pt;line-height:1.15">${h}</span>`;
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
    const logo = m.entete.logo && m.entete.logo.donnees ? `<div class="doc-logo"><img src="${esc(m.entete.logo.donnees)}" alt="Logo du cabinet"></div>` : "";
    if (cols.length || logo) h += `<div class="doc-entete">${logo}${cols.map((c) => `<div><strong>${esc(c[0])}</strong>${c.slice(1).map((l) => "<br>" + esc(l)).join("")}</div>`).join("")}</div>`;
    m.blocs.forEach((b) => {
      if (b.type === "titre") h += `<h1>${esc(b.texte)}</h1>`;
      else if (b.type === "h") h += `<h${b.niveau}>${esc(b.texte)}</h${b.niveau}>`;
      else if (b.type === "p") h += `<p${b.petit ? ' class="petit"' : b.grand ? ' class="grand"' : ""}>${htmlRuns(b.runs)}</p>`;
      else if (b.type === "saut") h += `<div class="saut-page" aria-hidden="true"></div>`;
      else if (b.type === "puces") h += `<ul>${b.items.map((it) => `<li>${htmlRuns(it)}</li>`).join("")}</ul>`;
      else if (b.type === "signature") h += `<p class="doc-signature">${esc(b.texte)}</p>`;
      else if (b.type === "graphique") {
        const g = window.Graph.deBloc(b, dossier.senso);
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

  async function modeleAvecImages() { return avecImages(modele()); }
  async function avecImages(m) {
    for (const b of m.blocs) {
      if (b.type !== "graphique" || !window.Graph) continue;
      const g = window.Graph.deBloc(b, dossier.senso);
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
    await telecharger(nomFichier("Bilan_ergo", "docx"), octets, MIME_DOCX, "Word téléchargé");
  }

  function modeleEcole() { return B.modeleSyntheseEcole(dossier, reglages, textes()); }

  async function wordEcole() {
    let octets;
    try {
      octets = W.construire(modeleEcole());
    } catch (e) {
      annoncer("La synthèse n'a pas pu être créée : " + e.message);
      return;
    }
    await telecharger(nomFichier("Synthese_ecole", "docx"), octets, MIME_DOCX, "Synthèse pour l'école téléchargée");
  }

  const DOCS = {
    "compte-rendu": { titre: "Compte rendu de bilan", prefixe: "Bilan_ergo", modele: () => modele() },
    "bilan-synthese": { titre: "Bilan synthétique", prefixe: "Bilan_synthese", modele: () => B.modeleBilanSynthese(dossier, reglages, textes()) },
    ecole: { titre: "Synthèse pour l'école", prefixe: "Synthese_ecole", modele: () => modeleEcole() },
    suivi: { titre: "Plan de suivi", prefixe: "Plan_suivi", modele: () => U.modeleSuivi(dossier, reglages) },
    livret: { titre: "Carnet d'activités pour les parents", prefixe: "Carnet_activites", modele: () => U.modeleLivret(dossier, reglages) },
    questionnaire: { titre: "Questionnaire pour les parents", prefixe: "Questionnaire_accueil", modele: () => U.modeleQuestionnaire(dossier, reglages) },
    "ce-qui-aide": { titre: "Ce qui aide", prefixe: "Ce_qui_aide", modele: () => U.modeleCeQuiAide(dossier, reglages) },
    "planning-images": { titre: "Planning en images", prefixe: "Planning_seance", modele: () => U.modelePlanningImages(dossier, reglages) },
    visite: { titre: "Ma visite chez l'ergothérapeute", prefixe: "Ma_visite", modele: () => U.modeleVisite(dossier, reglages) },
    "planning-seances": { titre: "Planning des séances", prefixe: "Planning_seances", modele: () => modelePlanningSeances() },
    evic: { titre: "Feuille de passation EViC", prefixe: "EViC_passation", modele: () => U.modeleEvic(dossier, reglages) },
  };
  let docApercu = "compte-rendu";

  async function wordDoc(id) {
    const doc = DOCS[id];
    let octets;
    try { octets = W.construire(await avecImages(doc.modele())); } catch (e) { annoncer("Le document n'a pas pu être créé : " + e.message); return; }
    await telecharger(nomFichier(doc.prefixe, "docx"), octets, MIME_DOCX, doc.titre + " téléchargé");
  }

  // Styles du document pour la page à imprimer (version partagée, où l'impression directe n'est pas permise).
  const CSS_IMPRESSION = `@page{size:A4;margin:16mm 14mm}body{margin:0;background:#fff}.doc{font:11pt/1.4 Calibri,Arial,sans-serif;color:#222;max-width:180mm;margin:0 auto}
.doc h1{font-size:16pt;text-align:center;text-transform:uppercase;color:#1f3a5f;margin:12pt 0 16pt}.doc h2{font-size:13pt;color:#1f3a5f;border-bottom:1px solid #8ea3c2;padding-bottom:2pt;margin:16pt 0 6pt;break-after:avoid}
.doc h3{font-size:11.5pt;color:#2e5c8a;margin:12pt 0 4pt;break-after:avoid}.doc p{margin:0 0 4pt}.doc p.petit{font-size:9pt}.doc p.grand,.doc p.grand span{line-height:1.9!important}.doc .saut-page{break-after:page}.doc ul{margin:0 0 6pt;padding-left:18pt}.doc mark{background:#fff36b}
.doc-entete{display:flex;gap:12px;justify-content:space-around;text-align:center;font-size:8pt;border-bottom:1px solid #8ea3c2;padding-bottom:6pt;margin-bottom:8pt}
.doc-logo{flex:0 0 auto;text-align:left;align-self:center}.doc-logo img{display:block;max-height:1.7cm;max-width:4.2cm}
.doc-pied{text-align:center;font-size:8pt;color:#4a5568;border-top:1px solid #8ea3c2;padding-top:6pt;margin-top:18pt}.doc-signature{text-align:right;font-weight:700;margin-top:18pt}
.doc-table{width:100%;border-collapse:collapse;margin:4pt 0 8pt;font-size:10pt;table-layout:fixed}.doc-table.petit{font-size:9pt}.doc-table tr{break-inside:avoid}
.doc-table th,.doc-table td{border:1px solid #a6b4c8;padding:2pt 4pt;vertical-align:middle;text-align:left;overflow-wrap:anywhere;white-space:pre-line}.a-center{text-align:center!important}.gras{font-weight:700}
.fond-entete{background:#dce3f0}.fond-niveau-patho{background:#f4cccc}.fond-niveau-inferieur{background:#fce5cd}.fond-niveau-moyenne{background:#ddebd7}.fond-niveau-superieur{background:#d5e4f2}
.doc-figure{margin:8pt 0 10pt;text-align:center;break-inside:avoid}.doc-figure svg,.doc-figure img{display:block;width:100%;max-width:15cm;height:auto;margin:0 auto}.doc-figure figcaption{font-size:9pt;font-style:italic;color:#4a5568}`;

  let aImprimer = null;
  function imprimerDoc(id) {
    const doc = DOCS[id];
    const m = doc.modele();
    if (!dansClaude) {
      aImprimer = m;
      $("#impression").innerHTML = htmlModele(m);
      window.print();
      return;
    }
    // Balises écrites en morceaux : le fichier de l'outil est lui-même assemblé en une seule page.
    const b = (t) => "<" + t + ">";
    const page = b("!doctype html") + b('html lang="fr"') + b("head") + b('meta charset="utf-8"') + "<title>" + esc(doc.titre) + "</title><style>" + CSS_IMPRESSION + "</style>" + b("/head") +
      b("body") + '<div class="doc">' + htmlModele(m) + "</div>" + b("script") + 'window.addEventListener("load",function(){setTimeout(function(){window.print();},400);});' + b("/script") + b("/body") + b("/html");
    telecharger(nomFichier(doc.prefixe + "_a_imprimer", "html"), page, "text/html",
      "Ouvrez le fichier téléchargé : l'impression se lance toute seule.");
  }

  function apercuDoc(id) {
    docApercu = id;
    apercu(DOCS[id].modele(), DOCS[id].titre);
  }

  function apercu(m, titre) {
    $("#apercu-page").innerHTML = htmlModele(m || modele());
    $("#apercu .apercu-barre h2").textContent = titre || "Aperçu du compte rendu";
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

  /* ================= Mes dossiers : enregistrement automatique sur l'appareil ================= */

  // Base locale (IndexedDB, ou stockage du navigateur à défaut) : chaque dossier est gardé à chaque modification.
  const Base = (function () {
    const CLE = "outil-ergo:dossiers";
    const pret = new Promise((ok) => {
      try {
        const req = indexedDB.open("outil-ergo", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("dossiers", { keyPath: "id" });
        req.onsuccess = () => ok(req.result);
        req.onerror = () => ok(null);
        req.onblocked = () => ok(null);
      } catch (e) { ok(null); }
    });
    const ls = () => lireStockage(CLE) || {};
    const demande = (mode, f) => pret.then((db) => new Promise((ok, ko) => {
      if (!db) return ko(new Error("sans base"));
      try {
        const t = db.transaction("dossiers", mode);
        const r = f(t.objectStore("dossiers"));
        t.oncomplete = () => ok(r && r.result);
        t.onerror = () => ko(t.error);
        t.onabort = () => ko(t.error);
      } catch (e) { ko(e); }
    }));
    return {
      tous: () => demande("readonly", (st) => st.getAll()).then((l) => l || []).catch(() => Object.values(ls())),
      lire: (id) => demande("readonly", (st) => st.get(id)).catch(() => ls()[id]),
      mettre: (x) => demande("readwrite", (st) => st.put(x)).catch(() => { const t = ls(); t[x.id] = x; ecrireStockage(CLE, t); }),
      retirer: (id) => demande("readwrite", (st) => st.delete(id)).catch(() => { const t = ls(); delete t[id]; ecrireStockage(CLE, t); }),
    };
  })();

  function nouvelId() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function assurerId() {
    if (!dossier.id) dossier.id = nouvelId();
    if (!dossier.creeLe) dossier.creeLe = new Date().toISOString();
    if (!dossier.auteur && profilActif()) dossier.auteur = profilActif();
  }
  function dossierVierge() { return !dossier.prenom.trim() && !dossier.nom.trim() && !nonEnregistre; }

  let dernierEnregistrement = null;
  function enregistrerDansMesDossiers() {
    if (!reglages.brouillon || dossierVierge()) return;
    assurerId();
    const entree = {
      id: dossier.id, prenom: dossier.prenom, nom: dossier.nom, groupe: dossier.groupe, passation: dossier.passation, auteur: dossier.auteur,
      modifieLe: new Date().toISOString(), dossier: dossier, compteRendu: cr,
    };
    Base.mettre(JSON.parse(JSON.stringify(entree))).then(() => {
      dernierEnregistrement = new Date();
      majIndicateur();
      if ($("#p-dossier") && !$("#p-dossier").hidden) afficherMesDossiers();
    }).catch(() => majIndicateur(true));
  }

  function heure(d) { return String(d.getHours()).padStart(2, "0") + " h " + String(d.getMinutes()).padStart(2, "0"); }
  function majIndicateur(erreur) {
    majEtatEnregistrement(erreur ? "erreur" : !reglages.brouillon ? "desactive" : "ok");
    const el = $("#indicateur");
    if (!el) return;
    if (!reglages.brouillon) { el.textContent = "Enregistrement automatique désactivé"; el.className = "indicateur alerte"; return; }
    if (erreur) { el.textContent = "Enregistrement impossible : téléchargez le dossier"; el.className = "indicateur alerte"; return; }
    el.textContent = dernierEnregistrement ? "✓ Enregistré à " + heure(dernierEnregistrement) : "✓ Enregistrement automatique";
    el.className = "indicateur";
  }

  // Badge toujours visible dans la barre du haut : l'enregistrement se voit, d'où que l'on soit.
  function majEtatEnregistrement(etat) {
    const b = $("#etat-enregistrement");
    if (!b) return;
    const textes = {
      attente: ["…", "Enregistrement…", "Enregistrement en cours sur cet appareil"],
      ok: ["✓", dernierEnregistrement ? "Enregistré" : "Prêt", dernierEnregistrement ? "Enregistré sur cet appareil à " + heure(dernierEnregistrement) : "Les dossiers s'enregistrent tout seuls sur cet appareil"],
      erreur: ["⚠️", "Non enregistré", "L'enregistrement a échoué : touchez pour en savoir plus"],
      desactive: ["⚠️", "Sans enregistrement", "L'enregistrement automatique est désactivé dans les réglages"],
    };
    const t = textes[etat] || textes.ok;
    $(".etat-icone", b).textContent = t[0];
    $(".etat-texte", b).textContent = t[1] + (etat === "ok" && dernierEnregistrement ? " " + heure(dernierEnregistrement).replace(" h ", "h") : "");
    b.title = t[2];
    b.setAttribute("aria-label", t[2] + ". Touchez pour savoir où sont vos dossiers.");
    b.className = "etat-enregistrement etat-" + etat;
  }

  async function ouvrirInfosEnregistrement() {
    enregistrerDansMesDossiers();
    let l = [];
    try { l = await Base.tous(); } catch (e) { l = []; }
    const der = lireStockage(CLE_COPIE);
    let protege = null;
    try { protege = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch (e) { protege = null; }
    const v = await ouvrirDialogue({
      titre: "Où sont vos dossiers ?", classe: "boite-infos",
      html: `<ul class="infos-enregistrement">
          <li><span aria-hidden="true">💾</span><span><strong>Enregistrement automatique.</strong> Chaque modification est enregistrée toute seule, moins d'une seconde après. Il n'y a pas de bouton « Enregistrer » : en haut, le badge « ✓ Enregistré » donne l'heure du dernier enregistrement.</span></li>
          <li><span aria-hidden="true">📱</span><span><strong>Sur cet appareil.</strong> Les dossiers restent dans ce navigateur, sur cet appareil : rien n'est envoyé sur internet. Un autre appareil ou un autre navigateur ne les voit pas (pour les transmettre : « Envoyer à une collègue »).</span></li>
          <li><span aria-hidden="true">⚠️</span><span><strong>Le seul risque :</strong> perdre ou changer d'appareil, ou effacer les données du navigateur (historique et données des sites). D'où la copie de sécurité.</span></li>
          <li><span aria-hidden="true">🗂️</span><span><strong>Copie de sécurité :</strong> un fichier qui contient tous vos dossiers, à ranger ailleurs (clé USB, ordinateur du cabinet). Une fois par semaine suffit. Pour tout remettre : Dossier › Mes dossiers › Copies de sécurité › Restaurer.</span></li>
        </ul>
        <p class="etat-donnees"><strong>Sur cet appareil :</strong> ${l.length} dossier${l.length > 1 ? "s" : ""}${dernierEnregistrement ? " · dernier enregistrement à " + heure(dernierEnregistrement) : ""} · dernière copie de sécurité : ${der ? esc(quand(der)) : "aucune"}${protege ? " · espace protégé par le navigateur" : ""}.</p>
        ${!reglages.brouillon ? `<p class="alerte-pco">L'enregistrement automatique est désactivé dans les réglages : pensez à télécharger chaque dossier.</p>` : ""}
        ${dansClaude ? `<p class="alerte-pco">Vous êtes sur la version ouverte depuis le lien claude.ai : les dossiers y sont gardés dans le navigateur, mais peuvent se perdre plus facilement (navigation privée, données du site effacées). Pour les vrais dossiers, utilisez la version du cabinet ouverte dans Safari ou Chrome, avec des copies de sécurité.</p>` : ""}`,
      boutons: [{ valeur: "copie", libelle: "💾 Faire une copie de sécurité maintenant" }, { valeur: "annuler", libelle: "Fermer" }],
    });
    if (v === "copie") telechargerCopie();
  }

  function quand(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const j = new Date(); j.setHours(0, 0, 0, 0);
    const jour = new Date(d); jour.setHours(0, 0, 0, 0);
    const ecart = Math.round((j - jour) / 864e5);
    return (ecart === 0 ? "aujourd'hui" : ecart === 1 ? "hier" : "le " + B.dateCourte(d.toISOString().slice(0, 10))) + " à " + heure(d);
  }

  let filtreDossiers = "";
  function afficherMesDossiers() {
    const zone = $("#mes-dossiers");
    if (!zone) return;
    Base.tous().then((l) => {
      l.sort((a, b) => String(b.modifieLe).localeCompare(String(a.modifieLe)));
      const f = filtreDossiers.trim().toLowerCase();
      const vus = l.filter((x) => !f || (x.prenom + " " + x.nom + " " + (x.groupe || "")).toLowerCase().indexOf(f) >= 0);
      $("#nb-dossiers").textContent = l.length ? "(" + l.length + ")" : "";
      zone.innerHTML = !l.length
        ? `<p class="vide">Aucun dossier pour l'instant. Commencez par écrire le prénom de l'enfant ci-dessous : le dossier s'enregistre tout seul.</p>`
        : !vus.length ? `<p class="vide">Aucun dossier ne correspond à « ${esc(filtreDossiers)} ».</p>`
        : `<ul class="liste-dossiers">${vus.slice(0, 60).map((x) => {
          const nom = [x.prenom, (x.nom || "").toUpperCase()].filter((t) => t && t.trim()).join(" ") || "Sans nom";
          const actuel = x.id === dossier.id;
          return `<li class="${actuel ? "actuel" : ""}">
            <span class="dossier-avatar" aria-hidden="true">${esc((x.prenom || "?").trim().charAt(0).toUpperCase() || "?")}</span>
            <span class="dossier-infos"><strong>${esc(nom)}</strong>
              <small>${[x.groupe, x.passation ? "bilan du " + B.dateCourte(x.passation) : "", x.auteur ? "par " + x.auteur : ""].filter(Boolean).map(esc).join(" · ")}</small>
              <small>Modifié ${esc(quand(x.modifieLe))}${nbSeances(x) ? " · " + nbSeances(x) + " séance" + (nbSeances(x) > 1 ? "s" : "") : ""}</small></span>
            ${actuel ? `<span class="badge">En cours</span>` : `<button type="button" class="bouton bouton-petit" data-ouvrir-dossier="${esc(x.id)}">Ouvrir</button>`}
            <button type="button" class="bouton-icone" data-suppr-dossier="${esc(x.id)}" aria-label="Supprimer le dossier de ${esc(nom)}" title="Supprimer">🗑</button>
          </li>`;
        }).join("")}</ul>`;
    });
    majRappelSauvegarde();
  }

  function nbSeances(x) { return x && x.dossier && Array.isArray(x.dossier.seances) ? x.dossier.seances.filter((s) => s && s.statut !== "prevue" && s.statut !== "annulee").length : 0; }

  async function ouvrirDeMesDossiers(id, onglet) {
    await viderEcritures();
    const x = await Base.lire(id);
    if (!x || !x.dossier) { annoncer("Ce dossier est introuvable."); return; }
    enregistrerDansMesDossiers();
    charger({ dossier: x.dossier, compteRendu: x.compteRendu });
    nonEnregistre = false;
    if (filtres.enfant) { filtres.enfant = id; sauverFiltres(); }
    afficherOnglet(onglet || "dossier");
    afficherMesDossiers();
    annoncer("Dossier de " + (x.prenom || "l'enfant") + " ouvert");
  }

  async function supprimerDeMesDossiers(id) {
    const x = await Base.lire(id);
    if (!x) return;
    const nom = [x.prenom, x.nom].filter(Boolean).join(" ") || "ce dossier";
    if (!(await demander("Supprimer le dossier de " + nom + " de cet appareil ?", "Supprimer"))) return;
    await Base.retirer(id);
    if (id === dossier.id) { charger({ dossier: B.dossierVide() }); nonEnregistre = false; ecrireStockage(CLE_BROUILLON, null); }
    afficherMesDossiers();
    proposerAnnulation("Dossier de " + nom + " supprimé.", () => Base.mettre(x).then(afficherMesDossiers));
  }

  /* ---------- Copie de sécurité ---------- */

  const CLE_COPIE = "outil-ergo:derniere-copie";
  async function telechargerCopie() {
    enregistrerDansMesDossiers();
    const l = await Base.tous();
    const donnees = { type: "outil-ergo-sauvegarde", version: 1, le: new Date().toISOString(), dossiers: l, reglages: reglages };
    const ok = await telecharger("Sauvegarde_Outil_Ergo_" + B.aujourdhui() + ".json", JSON.stringify(donnees), "application/json",
      "Copie de sécurité téléchargée (" + l.length + " dossier" + (l.length > 1 ? "s" : "") + ")");
    if (ok) {
      ecrireStockage(CLE_COPIE, new Date().toISOString()); majRappelSauvegarde();
      const t = $("#p-tableau");
      if (t && !t.hidden) rendreTableau();
    }
  }

  async function restaurerCopie(obj) {
    if (obj && (obj.type === "bilan-ergo-dossier" || obj.type === "bhk-dossier")) { ouvrir(obj); return; }
    if (!obj || obj.type !== "outil-ergo-sauvegarde" || !Array.isArray(obj.dossiers)) throw new Error("Ce fichier n'est pas une copie de sécurité de l'outil.");
    const existants = {};
    (await Base.tous()).forEach((x) => { existants[x.id] = x; });
    let n = 0;
    for (const x of obj.dossiers) {
      if (!x || !x.id || !x.dossier) continue;
      const deja = existants[x.id];
      if (!deja || String(x.modifieLe) > String(deja.modifieLe)) { await Base.mettre(x); n++; }
    }
    if (obj.reglages && !reglages.praticiens.some((p) => p.nom.trim())) {
      reglages = avecNormesIntegrees(B.normaliserReglages(obj.reglages));
      sauverReglages(); remplirReglages(); construireAuto(); construireSenso(); rafraichirListesCartes(); remplirFormulaire(); majTout();
    }
    afficherMesDossiers();
    annoncer(n ? n + " dossier" + (n > 1 ? "s" : "") + " restauré" + (n > 1 ? "s" : "") : "Tous ces dossiers étaient déjà à jour");
  }

  function majRappelSauvegarde() {
    const el = $("#rappel-copie");
    if (!el) return;
    const der = lireStockage(CLE_COPIE);
    Base.tous().then((l) => {
      const vieux = !der || Date.now() - new Date(der).getTime() > 7 * 864e5;
      const modifies = l.some((x) => !der || String(x.modifieLe) > String(der));
      el.hidden = !(l.length && vieux && modifies);
      $("#date-copie").textContent = der ? "Dernière copie de sécurité : " + quand(der) + "." : "Aucune copie de sécurité pour l'instant.";
    });
  }

  /* ---------- Annuler la dernière action ---------- */

  let annulation = null, minuteurAnnulation = null;
  function proposerAnnulation(message, restaurer) {
    const el = $("#annulation");
    el.querySelector(".annulation-texte").textContent = message;
    el.hidden = false;
    annulation = restaurer;
    clearTimeout(minuteurAnnulation);
    minuteurAnnulation = setTimeout(() => { el.hidden = true; annulation = null; }, 10000);
  }
  function instantane() { return JSON.parse(JSON.stringify({ dossier: dossier, compteRendu: cr })); }
  function restaurerInstantane(x) {
    return () => { charger(x); nonEnregistre = true; sauverBrouillon(); };
  }

  /* ---------- Profils ---------- */

  const CLE_PROFIL = "outil-ergo:profil";
  function initiales(nom) { return nom.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m.charAt(0).toUpperCase()).join(""); }
  function profilActif() {
    const nom = lireStockage(CLE_PROFIL);
    return nom && reglages.praticiens.some((p) => p.nom === nom) ? nom : "";
  }
  function majProfil() {
    const b = $("#profil");
    const nom = profilActif();
    b.hidden = false;
    b.innerHTML = nom ? `<span class="profil-rond" aria-hidden="true">${esc(initiales(nom))}</span><span class="profil-nom">${esc(nom)}</span>`
      : reglages.praticiens.some((p) => p.nom.trim()) ? "Choisir mon profil" : "Créer mon profil";
  }
  function choisirProfil(i) {
    const p = reglages.praticiens[i];
    if (!p) return;
    ecrireStockage(CLE_PROFIL, p.nom);
    reglages.signataire = i;
    sauverReglages();
    if (!dossier.auteur) dossier.auteur = p.nom;
    remplirReglages();
    majProfil();
    majTout();
    if (panneauCourant() === "tableau") rendreTableau();
    annoncer("Bonjour " + p.nom.split(" ")[0] + " !");
  }
  function ouvrirChoixProfil(creer) {
    const avecNom = reglages.praticiens.map((p, i) => [p, i]).filter((x) => x[0].nom.trim());
    const creation = creer || !avecNom.length;
    const fond = document.createElement("div");
    fond.className = "demande";
    fond.setAttribute("role", "dialog");
    fond.setAttribute("aria-modal", "true");
    fond.setAttribute("aria-labelledby", "titre-profil");
    fond.innerHTML = creation
      ? `<form class="demande-boite boite-profil" novalidate><p class="profil-titre" id="titre-profil">Bienvenue ! Créez votre profil</p>
        <p class="note">Il sert à signer vos comptes rendus et à remplir leur en-tête. Il reste sur cet appareil ; vous pourrez le modifier dans les réglages (⚙️).</p>
        <div class="profil-formulaire">
          <label class="champ"><span>Prénom et nom</span><input type="text" name="nom" autocomplete="name" placeholder="Camille Durand" required></label>
          <label class="champ"><span>Titre</span><input type="text" name="titre" value="Ergothérapeute D.E."></label>
          <label class="champ"><span>Téléphone (facultatif)</span><input type="tel" name="tel" autocomplete="tel" placeholder="06 12 34 56 78"></label>
          <label class="champ"><span>E-mail (facultatif)</span><input type="email" name="email" autocomplete="email" placeholder="camille.durand@exemple.fr"></label>
        </div>
        <div class="barre-actions"><button type="submit" class="bouton">Créer mon profil</button><button type="button" class="bouton-lien" data-profil="plus-tard">Plus tard</button></div></form>`
      : `<div class="demande-boite boite-profil"><p class="profil-titre" id="titre-profil">Bonjour ! Qui utilise l'outil ?</p>
        <p class="note">Vos bilans seront signés à votre nom. Vous pourrez changer en touchant votre nom, en haut de la page.</p>
        <div class="profils">${avecNom.map(([p, i]) => `<button type="button" class="carte-profil" data-profil="${i}"><span class="profil-rond grand" aria-hidden="true">${esc(initiales(p.nom))}</span><strong>${esc(p.nom)}</strong><small>${esc(p.titre)}</small></button>`).join("")}
        ${reglages.praticiens.length < 4 ? `<button type="button" class="carte-profil carte-ajout" data-profil="nouveau"><span class="profil-rond grand" aria-hidden="true">＋</span><strong>Nouveau profil</strong><small>Créer un profil</small></button>` : ""}</div>
        <div class="barre-actions"><button type="button" class="bouton-lien" data-profil="plus-tard">Plus tard</button></div></div>`;
    const fermer = () => { fond.remove(); document.removeEventListener("keydown", clavier, true); };
    const plusTard = () => { try { sessionStorage.setItem("outil-ergo:profil-plus-tard", "1"); } catch (e) { /* rien */ } fermer(); };
    const clavier = (e) => { if (e.key === "Escape") { e.stopPropagation(); plusTard(); } };
    fond.addEventListener("click", (e) => {
      const b = e.target.closest("[data-profil]");
      if (!b) { if (e.target === fond) plusTard(); return; }
      if (b.dataset.profil === "plus-tard") return plusTard();
      if (b.dataset.profil === "nouveau") { fermer(); ouvrirChoixProfil(true); return; }
      choisirProfil(Number(b.dataset.profil));
      fermer();
    });
    const form = fond.querySelector("form");
    if (form) form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = (n) => form.elements[n].value.trim();
      if (!v("nom")) { form.elements.nom.setAttribute("aria-invalid", "true"); form.elements.nom.focus(); return; }
      const p = Object.assign(B.praticienVide(), { nom: v("nom"), titre: v("titre") || "Ergothérapeute D.E.", tel: v("tel"), email: v("email") });
      const vide = reglages.praticiens.findIndex((x) => !x.nom.trim());
      if (vide >= 0) reglages.praticiens[vide] = Object.assign(reglages.praticiens[vide], p);
      else reglages.praticiens.push(p);
      sauverReglages();
      choisirProfil(vide >= 0 ? vide : reglages.praticiens.length - 1);
      fermer();
    });
    document.addEventListener("keydown", clavier, true);
    document.body.appendChild(fond);
    (fond.querySelector("input[name='nom']") || fond.querySelector("[data-profil]")).focus();
  }

  /* ---------- Analyse locale de la photo du BHK ---------- */

  let derniereAnalyse = null;
  function chargerImage(src) {
    return new Promise((ok, ko) => { const img = new Image(); img.onload = () => ok(img); img.onerror = () => ko(new Error("La photo n'a pas pu être lue.")); img.src = src; });
  }

  async function analyserPhoto() {
    const zone = $("#analyse-photo");
    if (!dossier.photoCopie) return;
    zone.hidden = false;
    zone.innerHTML = `<p class="note">Analyse en cours, sur cet appareil…</p>`;
    let img;
    try { img = await chargerImage(dossier.photoCopie); } catch (e) { zone.innerHTML = `<p class="alerte">${esc(e.message)}</p>`; return; }
    await new Promise((r) => setTimeout(r, 30));
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const donnees = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const calques = reglages.normes.calques;
    const r = window.Analyse.analyser(donnees, { pentesMarge: calques ? calques.margeB : null });
    derniereAnalyse = r;
    if (!r.ok) { zone.innerHTML = `<p class="alerte">${esc(r.message)}</p>`; return; }

    // Image annotée : feuille, bandes des lettres troncs, base des lettres, marge.
    const f = r.feuille, t = Math.tan((r.inclinaisonPhoto * Math.PI) / 180), xc = (f.x0 + f.x1) / 2;
    const Y = (x, y) => y + t * (x - xc);
    ctx.lineWidth = Math.max(2, canvas.width / 500);
    ctx.strokeStyle = "rgba(47,107,79,.9)"; ctx.strokeRect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    r.lignes.forEach((L) => {
      ctx.fillStyle = L.nonPlane ? "rgba(200,85,61,.22)" : "rgba(244,188,76,.28)";
      ctx.beginPath();
      ctx.moveTo(L.boite.x0, Y(L.boite.x0, L.coeur.y0)); ctx.lineTo(L.boite.x1, Y(L.boite.x1, L.coeur.y0));
      ctx.lineTo(L.boite.x1, Y(L.boite.x1, L.coeur.y1)); ctx.lineTo(L.boite.x0, Y(L.boite.x0, L.coeur.y1)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(35,64,142,.9)";
      L.base.forEach((p) => { ctx.beginPath(); ctx.arc(p[0], Y(p[0], p[1]), ctx.lineWidth * 1.4, 0, 7); ctx.fill(); });
      ctx.font = `bold ${Math.round(canvas.width / 45)}px sans-serif`; ctx.fillStyle = "rgba(200,85,61,1)";
      ctx.fillText(String(L.numero), Math.max(4, L.boite.x0 - canvas.width / 30), Y(L.boite.x0, L.coeur.y1));
    });
    ctx.strokeStyle = "rgba(200,85,61,.95)"; ctx.beginPath();
    r.lignes.forEach((L, i) => { const x = L.boite.x0, y = Y(x, (L.coeur.y0 + L.coeur.y1) / 2); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
    const apercuAnnote = canvas.toDataURL("image/jpeg", 0.8);

    const enfant = B.versionBHK(dossier) === "enfant";
    const fmt = (v, d) => B.formaterNombre(v, d === undefined ? 1 : d);
    const taille = Math.round(r.tailleMm * 10) / 10;
    const nonPlanes = r.lignes.slice(0, 5).filter((L) => L.nonPlane);
    const points1 = B.pointsTaille(taille, dossier.groupe);
    zone.innerHTML = `<h3>Mesures proposées</h3>
      <p class="note">Analyse faite sur cet appareil : la photo n'est envoyée nulle part. Ce sont des mesures automatiques, à vérifier avec les calques du manuel avant de les utiliser.</p>
      ${r.avertissements.length ? `<ul class="avertissements">${r.avertissements.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
      <ul class="mesures">
        <li><span><strong>Taille moyenne des lettres troncs :</strong> ${fmt(taille)} mm${points1 !== null && enfant ? `, soit ${points1} point${points1 > 1 ? "s" : ""} au critère 1 en ${esc(dossier.groupe)}` : ""}.</span>
          ${enfant ? `<button type="button" class="bouton bouton-second bouton-petit" data-appliquer="taille">Utiliser pour le critère 1</button>` : ""}</li>
        <li><span><strong>Marge :</strong> ${r.marge.deriveMm >= 0 ? "elle se décale de " + fmt(Math.abs(r.marge.deriveMm)) + " mm vers la droite" : "elle se décale de " + fmt(Math.abs(r.marge.deriveMm)) + " mm vers la gauche"} entre la première et la dernière ligne (${fmt(r.marge.degres)}°)${r.marge.points !== null ? ", soit " + r.marge.points + " point" + (r.marge.points > 1 ? "s" : "") + " au critère 2 d'après les lignes du calque B" : " ; comparez avec le calque B"}.</span>
          ${enfant && r.marge.points !== null ? `<button type="button" class="bouton bouton-second bouton-petit" data-appliquer="marge">Utiliser pour le critère 2</button>` : ""}</li>
        <li><span><strong>Lignes non planes (5 premières lignes) :</strong> ${nonPlanes.length ? nonPlanes.map((L) => "ligne " + L.numero + " (la base s'écarte de " + fmt(L.ondulationMm) + " mm)").join(", ") : "aucune ligne nettement non plane repérée"}.</span>
          ${enfant && nonPlanes.length ? `<button type="button" class="bouton bouton-second bouton-petit" data-appliquer="lignes">Cocher ces lignes au critère 3</button>` : ""}</li>
        <li><span>${r.nbLignes} lignes d'écriture repérées${Math.abs(r.inclinaisonPhoto) >= 0.5 ? ", photo redressée de " + fmt(Math.abs(r.inclinaisonPhoto)) + "°" : ""}.</span></li>
      </ul>
      <figure class="doc-figure analyse-figure"><img src="${apercuAnnote}" alt="Photo annotée : lignes repérées, base des lettres et marge"><figcaption>En jaune : lettres troncs repérées (en rouge si la ligne n'est pas plane) ; points bleus : base des lettres ; trait rouge : marge.</figcaption></figure>`;
  }

  function appliquerAnalyse(quoi) {
    const r = derniereAnalyse;
    if (!r || !r.ok) return;
    const avant = instantane();
    if (quoi === "taille") dossier.tailleMm = B.formaterNombre(Math.round(r.tailleMm * 10) / 10, 1);
    if (quoi === "marge" && r.marge.points !== null) dossier.c2 = String(r.marge.points);
    if (quoi === "lignes") {
      const l = (dossier.lignes[3] || [0, 0, 0, 0, 0]).slice();
      r.lignes.slice(0, 5).forEach((L, i) => { if (L.nonPlane) l[i] = 1; });
      dossier.lignes[3] = l;
    }
    remplirFormulaire(); nonEnregistre = true; majTout();
    proposerAnnulation(quoi === "taille" ? "Taille reportée au critère 1." : quoi === "marge" ? "Points reportés au critère 2." : "Lignes cochées au critère 3.", restaurerInstantane(avant));
  }

  /* ---------- Mode jour ou nuit ---------- */

  const CLE_THEME = "outil-ergo:theme";
  function themeActuel() { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }
  function majBoutonTheme() {
    const b = $("#theme");
    const nuit = themeActuel() === "dark";
    b.textContent = nuit ? "☀️" : "🌙";
    b.setAttribute("aria-label", nuit ? "Passer en mode jour" : "Passer en mode nuit");
    b.title = nuit ? "Mode jour" : "Mode nuit";
  }
  function basculerTheme() {
    const t = themeActuel() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(CLE_THEME, t); } catch (e) { /* préférence non gardée */ }
    majBoutonTheme();
    annoncer(t === "dark" ? "Mode nuit" : "Mode jour");
  }

  /* ---------- Plan de suivi ---------- */

  const U = window.Suivi;
  let signatureAxes = "";
  function majSuivi() {
    if (!U) return;
    const d = B.normaliserDossier(dossier);
    const plan = U.planning(d, reglages);
    const p = plan.parametres;
    const freq = U.FREQUENCES.find((f) => f[0] === p.frequence)[1].toLowerCase();
    const derniere = plan.seances.length ? plan.seances[plan.seances.length - 1].date : p.debut;
    $("#resume-suivi").textContent = p.nombre + " séances de " + p.duree + " minutes, " + freq + ", du " + B.dateCourte(p.debut) + " au " + B.dateCourte(derniere) +
      (dossier.suivi.debut ? "." : " (première séance proposée deux semaines après le bilan).");
    const sig = JSON.stringify(plan.proposes.map((a) => [a.id, a.poids, a.raisons[0] || ""]).concat([p.s.exclus]));
    if (sig === signatureAxes) return;
    signatureAxes = sig;
    $("#axes-suivi").innerHTML = plan.proposes.map((a) => `<label class="preco${a.poids ? " proposee" : ""}"><input type="checkbox" data-axe="${a.id}"${p.s.exclus.indexOf(a.id) < 0 && (a.poids || plan.axes.some((x) => x.id === a.id)) ? " checked" : ""}>
      <span class="preco-texte"><span class="preco-label">${esc(a.titre)}</span>${a.raisons.length ? `<span class="preco-raison">Proposé : ${esc(a.raisons[0])}</span>` : ""}</span></label>`).join("");
  }

  function modeleSuivi() { return U.modeleSuivi(dossier, reglages); }
  async function wordSuivi() {
    let octets;
    try { octets = W.construire(await avecImages(modeleSuivi())); } catch (e) { annoncer("Le plan de suivi n'a pas pu être créé : " + e.message); return; }
    await telecharger(nomFichier("Plan_suivi", "docx"), octets, MIME_DOCX, "Plan de suivi téléchargé");
  }

  /* ---------- Graphiques du compte rendu ---------- */

  let minuteurGalerie = null;
  function majGalerie() {
    clearTimeout(minuteurGalerie);
    minuteurGalerie = setTimeout(() => {
      const zone = $("#galerie");
      if (!zone || $("#p-compte-rendu").hidden) return;
      const blocs = modele().blocs.filter((b) => b.type === "graphique");
      const figures = blocs.map((b) => { const g = window.Graph.deBloc(b, dossier.senso); return g ? `<figure class="vignette-graphique">${g.svg}<figcaption>${esc(b.alt)}</figcaption></figure>` : ""; }).join("");
      zone.innerHTML = figures || `<p class="vide">Les graphiques apparaissent ici dès que les résultats sont saisis (BHK, autres bilans, MCRO, DCDQ, bilan sensoriel).</p>`;
    }, 250);
  }

  /* ---------- Parties repliables : cartes et sous-parties ---------- */
  // Chaque carte (fieldset.groupe) se replie en touchant son titre ; les sous-parties (h4.sous-groupe) aussi.
  // Les blocs de bilans gardent leur case à cocher (faire / ne pas faire) et se replient avec la flèche une fois cochés.
  // L'état replié est gardé sur l'appareil (commodité, sans conséquence si le stockage est indisponible).
  const CLE_REPLIS = "outil-ergo:replis";
  let replis = lireStockage(CLE_REPLIS) || {};
  function titreDe(el) {
    const c = el.cloneNode(true);
    $$(".bouton-repli, .resume-repli", c).forEach((x) => x.remove());
    return c.textContent.replace(/\s+/g, " ").trim();
  }
  function cleRepli(el, titre) {
    const p = el.closest("[role=tabpanel]");
    const parent = el.matches("h4") ? el.closest("fieldset.groupe") : null;
    return (p ? p.id : "page") + ":" + (parent && parent.id ? parent.id + ":" : "") + (el.id || slug(titre).slice(0, 48));
  }
  function boutonRepli(titre) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bouton-repli";
    b.setAttribute("aria-label", "Replier ou déplier : " + titre);
    return b;
  }
  function ameliorerReplis() {
    $$("[role=tabpanel] fieldset.groupe").forEach((f) => {
      if (f.dataset.repli) return;
      const lg = f.querySelector(":scope > legend");
      if (!lg || f.classList.contains("sans-repli")) return;
      f.dataset.repli = "1";
      const titre = titreDe(lg);
      f.dataset.cleRepli = cleRepli(f, titre);
      if (!f.classList.contains("test")) lg.classList.add("legende-repliable");
      const resume = document.createElement("span");
      resume.className = "resume-repli";
      lg.appendChild(resume);
      lg.appendChild(boutonRepli(titre));
      if (replis[f.dataset.cleRepli]) replier(f, true, false);
      else majBoutonRepli(f);
    });
    $$("[role=tabpanel] h4.sous-groupe").forEach((h) => {
      if (h.dataset.repli || h.closest(".pas-de-repli")) return;
      h.dataset.repli = "1";
      const titre = titreDe(h);
      const corps = document.createElement("div");
      corps.className = "sous-corps";
      let n = h.nextSibling;
      while (n && !(n.nodeType === 1 && n.matches("h4.sous-groupe"))) { const suivant = n.nextSibling; corps.appendChild(n); n = suivant; }
      h.after(corps);
      h.classList.add("repliable");
      h.dataset.cleRepli = cleRepli(h, titre);
      h.appendChild(boutonRepli(titre));
      if (replis[h.dataset.cleRepli]) replier(h, true, false);
      else majBoutonRepli(h);
    });
    // « Tout replier / tout déplier » en haut des onglets qui ont plusieurs cartes
    $$("[role=tabpanel]").forEach((p) => {
      if (p.querySelector(":scope > .barre-replis") || p.querySelectorAll("fieldset.groupe[data-repli]").length < 3) return;
      const barre = document.createElement("div");
      barre.className = "barre-replis";
      barre.innerHTML = `<button type="button" class="bouton-lien" data-replis="replier">⊟ Tout replier</button><button type="button" class="bouton-lien" data-replis="deplier">⊞ Tout déplier</button>`;
      const aide = p.querySelector(":scope > details.aide");
      if (aide) aide.after(barre); else p.prepend(barre);
    });
  }
  function majBoutonRepli(el) {
    const b = el.matches("fieldset") ? el.querySelector(":scope > legend > .bouton-repli") : el.querySelector(":scope > .bouton-repli");
    if (b) b.setAttribute("aria-expanded", String(!el.classList.contains("replie")));
    if (el.matches("fieldset")) majResumeRepli(el);
  }
  // Résumé d'une carte repliée : nombre de réponses saisies.
  function majResumeRepli(f) {
    const r = f.querySelector(":scope > legend > .resume-repli");
    if (!r) return;
    if (!f.classList.contains("replie")) { r.textContent = ""; return; }
    let n = 0;
    const radios = new Set();
    $$("input, textarea, select", f).forEach((el) => {
      if (el.closest("legend") || el.type === "file" || el.type === "button" || !(el.dataset.chemin || el.dataset.champ || el.dataset.liste || el.dataset.grille || el.dataset.ligne)) return;
      if (el.type === "radio") { if (el.checked) radios.add(el.name); }
      else if (el.type === "checkbox") { if (el.checked) n++; }
      else if (String(el.value || "").trim()) n++;
    });
    n += radios.size;
    r.textContent = n ? n + (n > 1 ? " réponses" : " réponse") : "vide";
  }
  function replier(el, oui, garder) {
    el.classList.toggle("replie", oui);
    majBoutonRepli(el);
    if (garder === false) return;
    if (oui) replis[el.dataset.cleRepli] = 1; else delete replis[el.dataset.cleRepli];
    ecrireStockage(CLE_REPLIS, replis);
  }
  function surClicRepli(e) {
    const tout = e.target.closest("[data-replis]");
    if (tout) {
      const p = tout.closest("[role=tabpanel]");
      const oui = tout.dataset.replis === "replier";
      $$("fieldset.groupe[data-repli]", p).forEach((f) => { if (!f.classList.contains("test") || f.querySelector(":scope > legend input:checked")) replier(f, oui); });
      if (!oui) $$("h4.sous-groupe.repliable.replie", p).forEach((h) => replier(h, false));
      return true;
    }
    const b = e.target.closest(".bouton-repli");
    const lg = e.target.closest("legend.legende-repliable");
    const h = e.target.closest("h4.sous-groupe.repliable");
    if (!b && !lg && !h) return false;
    if (!b && e.target.closest("input, label, a, select, textarea")) return false;
    const el = h || (b ? (b.closest("h4.sous-groupe") || b.closest("fieldset.groupe")) : lg.parentElement);
    if (!el) return false;
    replier(el, !el.classList.contains("replie"));
    return true;
  }
  let minuteurReplis = 0;
  function surveillerReplis() {
    ameliorerReplis();
    try {
      new MutationObserver(() => {
        if (minuteurReplis) return;
        minuteurReplis = requestAnimationFrame(() => { minuteurReplis = 0; ameliorerReplis(); });
      }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
    } catch (e) { /* navigateur ancien : les cartes restent dépliées */ }
  }

  /* ---------- Étapes remplies (onglets) ---------- */

  function majEtapes() {
    const d = B.normaliserDossier(dossier);
    const t = (k) => String(d[k] || "").trim();
    const etat = {
      dossier: !!(t("prenom") || t("nom")),
      anamnese: ["devTrajectoire", "devMoteur", "devLangage", "envFamilial", "envSuivis", "envParcours", "occSommeil", "occHabillage", "occAlimentation", "ecoleAmenagements"].some(t),
      occupations: O.commence(d),
      ecriture: Object.keys(d.grille).length > 0 || d.auto.fait === "oui" || !!t("prise"),
      bhk: !!t("vitesse") || Object.keys(d.lignes).length > 0,
      clavier: d.clavier.fait === "oui",
      sensoriel: ["otipis", "dunnEnfant", "dunnScolaire", "eso", "sensot"].some((k) => d.senso[k].fait === "oui") || d.cartes.sensoriel.fait === "oui",
      bilans: B.TESTS.some((x) => d.tests[x.id].fait === "oui") || d.manip.fait === "oui" || d.dcdq.fait === "oui" || d.tdc.fait === "oui",
      "compte-rendu": d.amenagements.length > 0,
      accueil: A.accueilCommence(d),
      seances: d.seances.length > 0,
    };
    etatEtapes = etat;
    Object.keys(etat).forEach((k) => { const b = $("#t-" + k); if (b) b.classList.toggle("rempli", etat[k]); });
    GROUPES_ONGLETS.forEach((g) => { const b = $("#g-" + g.id); if (b) b.classList.toggle("rempli", g.panneaux.some((p) => etat[p[0]])); });
  }
  let etatEtapes = {};

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
    TOUTES_SECTIONS.forEach((s) => {
      if (src[s.id] && src[s.id].modifie && typeof src[s.id].texte === "string") cr[s.id] = { texte: src[s.id].texte, modifie: true };
      $(`[data-section="${s.id}"]`).value = cr[s.id] ? cr[s.id].texte : "";
    });
    remplirFormulaire();
    majTout();
    if ($("#p-seances") && !$("#p-seances").hidden) rendreAgenda();
  }

  function ouvrir(obj) {
    if (!obj || !obj.dossier || (obj.type !== "bilan-ergo-dossier" && obj.type !== "bhk-dossier")) throw new Error("Ce fichier n'est pas un dossier de bilan.");
    enregistrerDansMesDossiers();
    charger(obj);
    if (reglages.brouillon) { nonEnregistre = true; sauverBrouillon(); }
    nonEnregistre = false;
    afficherOnglet("dossier");
    annoncer("Dossier ouvert");
  }

  // Réévaluation : mesures du bilan précédent ; reprise de l'identité, de l'anamnèse et de la MCRO si le dossier est vide.
  function chargerPrecedent(obj) {
    if (!obj || !obj.dossier || (obj.type !== "bilan-ergo-dossier" && obj.type !== "bhk-dossier")) throw new Error("Ce fichier n'est pas un dossier de bilan.");
    const ancien = B.normaliserDossier(obj.dossier);
    const repris = [];
    if (!dossier.prenom.trim() && !dossier.nom.trim()) {
      ["prenom", "nom", "sexe", "naissance", "parents", "adresse", "prescripteur", "etablissement", "enseignant", "lateralite",
        "devTrajectoire", "devMoteur", "devLangage", "envFamilial", "envSuivis", "envParcours"].forEach((k) => { dossier[k] = ancien[k]; });
      repris.push("identité et anamnèse");
    }
    if (!dossier.motif.trim()) dossier.motif = "Réévaluation en ergothérapie, à la suite du bilan du " + B.dateCourte(ancien.passation) + ".";
    const m = O.calculMcro(ancien.mcro);
    if (ancien.mcro.fait === "oui" && m.problemes.length && !dossier.mcro.problemes.some((p) => p.activite.trim())) {
      dossier.mcro.fait = "oui";
      dossier.mcro.repondant = ancien.mcro.repondant;
      dossier.mcro.date = ancien.mcro.date2 || ancien.mcro.date;
      dossier.mcro.date2 = dossier.passation;
      dossier.mcro.problemes = ancien.mcro.problemes.map((p) => Object.assign(O.problemeVide(), {
        activite: p.activite, importance: p.importance, rendement1: p.rendement2 || p.rendement1, satisfaction1: p.satisfaction2 || p.satisfaction1,
      }));
      repris.push("activités de la MCRO");
    }
    dossier.precedent = B.instantane(ancien, reglages);
    remplirFormulaire();
    majTout();
    nonEnregistre = true;
    annoncer("Bilan précédent chargé" + (repris.length ? " (repris : " + repris.join(", ") + ")" : ""));
  }

  async function nouveau() {
    if (!reglages.brouillon && nonEnregistre && !(await demander("Le dossier en cours n'est pas enregistré. Commencer un nouveau dossier ?", "Commencer un nouveau dossier"))) return;
    const ancien = dossierVierge() ? "" : (dossier.prenom || "").trim();
    enregistrerDansMesDossiers();
    ecrireStockage(CLE_BROUILLON, null);
    charger({ dossier: B.dossierVide() });
    nonEnregistre = false;
    afficherOnglet("dossier");
    afficherMesDossiers();
    annoncer(reglages.brouillon && ancien ? "Nouveau dossier. Celui de " + ancien + " reste dans « Mes dossiers »." : "Nouveau dossier");
    const champ = $("[data-champ='prenom']");
    if (champ) champ.focus();
  }


  /* ================= Accueil, enfant ouvert, verrouillage, partage, phrases favorites ================= */

  const P = window.Partage;
  const CLE_VERROU = "outil-ergo:verrou";
  const estTactile = () => { try { return window.matchMedia("(pointer: coarse)").matches; } catch (e) { return false; } };

  function panneauCourant() { const p = $$("[role=tabpanel]").find((x) => !x.hidden); return p ? p.id.slice(2) : "tableau"; }
  function zoneActive() { return $$("[role=tabpanel]").find((x) => !x.hidden) || document; }
  function rafraichirSeances() { if (panneauCourant() === "tableau") rendreTableau(); else rendreVue(); }

  // Petite fenêtre générique : renvoie la valeur du bouton choisi (null si fermée).
  function ouvrirDialogue(o) {
    return new Promise((resoudre) => {
      const fond = document.createElement("div");
      fond.className = "demande";
      fond.setAttribute("role", "dialog");
      fond.setAttribute("aria-modal", "true");
      fond.setAttribute("aria-labelledby", "titre-dialogue");
      fond.innerHTML = `<form class="demande-boite ${o.classe || ""}" novalidate><p class="profil-titre" id="titre-dialogue">${esc(o.titre)}</p>${o.html || ""}
        <p class="dialogue-message" role="alert"></p>
        <div class="barre-actions">${o.boutons.map((b, i) => `<button type="${i === 0 ? "submit" : "button"}" class="${b.classe || (i === 0 ? "bouton" : "bouton-lien")}" data-valeur="${esc(b.valeur)}">${esc(b.libelle)}</button>`).join("")}</div></form>`;
      const form = $("form", fond);
      const fermer = (v) => { fond.remove(); document.removeEventListener("keydown", clavier, true); resoudre(v); };
      const clavier = (e) => { if (e.key === "Escape") { e.stopPropagation(); fermer(null); } };
      const choisir = async (v) => {
        if (o.valider) {
          const m = await o.valider(fond, v);
          if (m) { $(".dialogue-message", fond).textContent = m; return; }
        }
        fermer(v);
      };
      form.addEventListener("submit", (e) => { e.preventDefault(); choisir(o.boutons[0].valeur); });
      fond.addEventListener("click", (e) => {
        if (e.target === fond) return fermer(null);
        const b = e.target.closest("button[data-valeur]");
        if (b && b.type !== "submit") { e.preventDefault(); if (b.dataset.valeur === "annuler") fermer(null); else choisir(b.dataset.valeur); }
        if (o.clic) o.clic(e, fond);
      });
      document.addEventListener("keydown", clavier, true);
      document.body.appendChild(fond);
      if (o.init) o.init(fond);
      const premier = $("input:not([type=checkbox]), button", form);
      if (premier && !(estTactile() && premier.tagName === "INPUT")) premier.focus({ preventScroll: true });
      form.scrollTop = 0;
    });
  }

  /* ---------- Enfant ouvert ---------- */

  function majEnfantCourant() {
    const b = $("#enfant-courant");
    if (!b) return;
    const p = String(dossier.prenom || "").trim(), n = String(dossier.nom || "").trim();
    const vide = !p && !n;
    $(".enfant-avatar", b).textContent = vide ? "＋" : (p || n).charAt(0).toUpperCase();
    $(".enfant-nom", b).textContent = vide ? "Aucun enfant" : nomEnfant(dossier);
    b.classList.toggle("vide", vide);
    b.setAttribute("aria-label", vide ? "Aucun dossier ouvert. Choisir un enfant" : "Dossier ouvert : " + nomCompletEnfant(dossier) + ". Changer d'enfant");
  }

  async function ouvrirChoixEnfant() {
    enregistrerDansMesDossiers();
    const l = (await Base.tous()).filter((x) => x && x.id).sort((a, b) => String(b.modifieLe).localeCompare(String(a.modifieLe)));
    const ligne = (x) => `<li><button type="button" class="choix-enfant${x.id === dossier.id ? " actuel" : ""}" data-valeur="${esc(x.id)}">
        <span class="dossier-avatar" aria-hidden="true">${esc((x.prenom || x.nom || "?").trim().charAt(0).toUpperCase() || "?")}</span>
        <span class="choix-enfant-infos"><strong>${esc(nomCompletEnfant(x))}</strong><small>${[x.groupe, x.passation ? "bilan du " + B.dateCourte(x.passation) : "", nbSeances(x) ? nbSeances(x) + " séance" + (nbSeances(x) > 1 ? "s" : "") : ""].filter(Boolean).map(esc).join(" · ")}</small></span>
        ${x.id === dossier.id ? `<span class="badge">Ouvert</span>` : ""}</button></li>`;
    const v = await ouvrirDialogue({
      titre: "Quel enfant ?", classe: "boite-enfants",
      html: `${l.length > 6 ? `<input type="search" class="filtre-enfants" placeholder="Chercher un enfant" aria-label="Chercher un enfant" autocomplete="off">` : ""}
        <ul class="liste-enfants">${l.map(ligne).join("") || `<li class="vide">Aucun dossier pour l'instant.</li>`}</ul>`,
      boutons: [{ valeur: "nouveau", libelle: "＋ Nouveau dossier" }, { valeur: "annuler", libelle: "Fermer" }],
      init: (fond) => {
        const f = $(".filtre-enfants", fond);
        if (f) f.addEventListener("input", () => { const t = f.value.trim().toLowerCase(); $$(".liste-enfants li", fond).forEach((li) => { li.hidden = !!t && li.textContent.toLowerCase().indexOf(t) < 0; }); });
      },
    });
    if (!v) return;
    if (v === "nouveau") return nouveau();
    if (v === dossier.id) return;
    const onglet = panneauCourant();
    ouvrirDeMesDossiers(v, ["tableau", "reglages", "accueil"].indexOf(onglet) >= 0 ? null : onglet);
  }

  /* ---------- Page d'accueil ---------- */

  async function rendreTableau() {
    const prof = profilActif();
    $("#bonjour").textContent = "Bonjour" + (prof ? " " + prof.split(/\s+/)[0] : "") + " !";
    const auj = B.aujourdhui();
    $("#date-du-jour").textContent = SE.libelleJour(auj);
    await chargerAgenda();
    const jour = agenda.lignes.filter((x) => x.s.date === auj).sort((a, b) => SE.ordre(a.s, b.s));
    $("#accueil-jour").innerHTML = jour.length ? jour.map(htmlLigneSeance).join("")
      : `<p class="vide">Aucune séance prévue aujourd'hui. Après une séance, touchez « Noter une séance ».</p>`;

    const rappels = [];
    const nonNotees = agenda.lignes.filter((x) => x.s.statut === "prevue" && x.s.date && x.s.date < auj).length;
    if (nonNotees) rappels.push({ icone: "🗓️", texte: nonNotees + (nonNotees > 1 ? " séances prévues n'ont pas été notées (faite ou absent)." : " séance prévue n'a pas été notée (faite ou absent)."), bouton: "Voir", action: "voir-non-notees" });
    Object.keys(agenda.dossiers).forEach((id) => {
      const e = agenda.dossiers[id];
      if (!e.d.pco || e.d.pco.actif !== "oui") return;
      const et = A.etatPco(B.normaliserDossier(e.d), auj);
      if (et.alerte) rappels.push({ icone: "🧭", texte: nomEnfant(e.infos) + " : " + (et.joursRestants < 0 ? "forfait de la plateforme terminé le " : "fin du forfait de la plateforme le ") + B.dateCourte(et.echeance) + ".", bouton: "Ouvrir", dossier: id });
    });
    const tous = await Base.tous();
    const der = lireStockage(CLE_COPIE);
    if (tous.length && (!der || Date.now() - new Date(der).getTime() > 7 * 864e5) && tous.some((x) => !der || String(x.modifieLe) > String(der))) {
      rappels.push({ icone: "💾", texte: "Pensez à votre copie de sécurité. " + (der ? "Dernière : " + quand(der) + "." : "Aucune pour l'instant."), bouton: "Télécharger", action: "copie-securite" });
    }
    if (!verrouActif()) rappels.push({ icone: "🔒", texte: "Protégez l'outil par un code : il contient des données de santé.", bouton: "Choisir un code", action: "regler-verrou" });
    $("#carte-rappels").hidden = !rappels.length;
    $("#accueil-rappels").innerHTML = rappels.map((r) => `<li><span class="rappel-icone" aria-hidden="true">${r.icone}</span><span class="rappel-texte">${esc(r.texte)}</span>` +
      (r.dossier ? `<button type="button" class="bouton bouton-second bouton-petit" data-ouvrir-dossier-seance="${esc(r.dossier)}">${esc(r.bouton)}</button>`
        : `<button type="button" class="bouton bouton-second bouton-petit" data-action="${r.action}">${esc(r.bouton)}</button>`) + `</li>`).join("");

    $("#accueil-donnees").innerHTML = `<strong>${tous.length} dossier${tous.length > 1 ? "s" : ""}</strong> enregistré${tous.length > 1 ? "s" : ""} automatiquement sur cet appareil · dernière copie de sécurité : <strong>${der ? esc(quand(der)) : "aucune"}</strong>.`;
    const recents = tous.filter((x) => x && x.id).sort((a, b) => String(b.modifieLe).localeCompare(String(a.modifieLe))).slice(0, 5);
    $("#accueil-recents").innerHTML = recents.length ? `<ul class="liste-dossiers">${recents.map((x) => {
      const actuel = x.id === dossier.id;
      return `<li class="${actuel ? "actuel" : ""}"><span class="dossier-avatar" aria-hidden="true">${esc((x.prenom || "?").trim().charAt(0).toUpperCase() || "?")}</span>
        <span class="dossier-infos"><strong>${esc(nomCompletEnfant(x))}</strong><small>${[x.groupe, nbSeances(x) ? nbSeances(x) + " séance" + (nbSeances(x) > 1 ? "s" : "") : "", "modifié " + quand(x.modifieLe)].filter(Boolean).map(esc).join(" · ")}</small></span>
        ${actuel ? `<button type="button" class="bouton bouton-second bouton-petit" data-aller="dossier">Ouvert</button>` : `<button type="button" class="bouton bouton-petit" data-ouvrir-dossier="${esc(x.id)}">Ouvrir</button>`}</li>`;
    }).join("")}</ul>` : `<p class="vide">Aucun dossier pour l'instant : touchez « Nouveau bilan ».</p>`;
  }

  /* ---------- Code de verrouillage ---------- */

  let verrou = lireStockage(CLE_VERROU);
  let derniereActivite = Date.now(), cacheLe = 0, erreursCode = 0, bloqueJusqua = 0;
  function verrouActif() { return !!(verrou && verrou.empreinte && verrou.sel); }

  function verrouiller() {
    if (!verrouActif()) return;
    fermerPhrases();
    document.body.classList.add("verrouille");
    $("#verrou").hidden = false;
    $("#code-verrou").value = "";
    $("#verrou-message").textContent = "";
    $("#confirmer-effacement").value = "";
    if (!estTactile()) $("#code-verrou").focus();
  }

  function essayerCode() {
    const champ = $("#code-verrou");
    const msg = $("#verrou-message");
    if (Date.now() < bloqueJusqua) { msg.textContent = "Trop d'essais : patientez encore " + Math.ceil((bloqueJusqua - Date.now()) / 1000) + " secondes."; champ.value = ""; return; }
    if (!champ.value) return;
    if (P.verifierCode(verrou, champ.value)) {
      erreursCode = 0;
      document.body.classList.remove("verrouille");
      $("#verrou").hidden = true;
      champ.value = "";
      derniereActivite = Date.now();
      return;
    }
    erreursCode++;
    const attente = P.attenteApres(erreursCode);
    if (attente) bloqueJusqua = Date.now() + attente * 1000;
    msg.textContent = attente ? "Code incorrect. Réessayez dans " + attente + " secondes." : "Code incorrect.";
    champ.value = "";
    const boite = $(".verrou-boite");
    boite.classList.remove("secoue"); void boite.offsetWidth; boite.classList.add("secoue");
  }

  function rendreReglagesVerrou() {
    const actif = verrouActif();
    $("#verrou-delai").innerHTML = P.DELAIS.map((d) => `<option value="${d[0]}">${esc(d[1])}</option>`).join("");
    $("#verrou-delai").value = String(actif ? verrou.delai : 5);
    $("#verrou-etat").innerHTML = actif ? `<p class="ok-verrou">✓ Code actif (${verrou.longueur} chiffres).</p>
      <label class="champ champ-court"><span>Code actuel (pour le changer ou le retirer)</span><input type="password" id="verrou-actuel" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="current-password"></label>` : "";
    $("#verrou-actions").innerHTML = actif
      ? `<button type="button" class="bouton" data-action="activer-verrou">Changer le code</button><button type="button" class="bouton bouton-second" data-action="verrouiller">Verrouiller maintenant</button><button type="button" class="bouton-lien" data-action="retirer-verrou">Retirer le code</button>`
      : `<button type="button" class="bouton" data-action="activer-verrou">Activer le code</button>`;
    $("#bouton-verrou").hidden = !actif;
  }

  function activerVerrou() {
    const c1 = $("#verrou-code").value, c2 = $("#verrou-code-2").value;
    if (verrouActif() && !P.verifierCode(verrou, ($("#verrou-actuel") || {}).value || "")) { annoncer("Le code actuel n'est pas le bon."); return; }
    if (!P.codeValide(c1)) { annoncer("Le code doit compter de 4 à 8 chiffres."); $("#verrou-code").focus(); return; }
    if (c1 !== c2) { annoncer("Les deux codes sont différents."); $("#verrou-code-2").focus(); return; }
    verrou = P.creerVerrou(c1, $("#verrou-delai").value);
    ecrireStockage(CLE_VERROU, verrou);
    $("#verrou-code").value = ""; $("#verrou-code-2").value = "";
    rendreReglagesVerrou();
    annoncer("Code enregistré : il sera demandé à l'ouverture et après " + (verrou.delai ? verrou.delai + " minutes sans utilisation" : "chaque ouverture") + ".");
  }

  function retirerVerrou() {
    if (!P.verifierCode(verrou, ($("#verrou-actuel") || {}).value || "")) { annoncer("Saisissez d'abord le code actuel."); const c = $("#verrou-actuel"); if (c) c.focus(); return; }
    verrou = null;
    try { localStorage.removeItem(CLE_VERROU); } catch (e) { /* rien */ }
    rendreReglagesVerrou();
    annoncer("Code retiré.");
  }

  async function effacerAppareil() {
    if ($("#confirmer-effacement").value.trim().toUpperCase() !== "EFFACER") { $("#verrou-message").textContent = "Écrivez EFFACER pour confirmer."; return; }
    const l = await Base.tous();
    for (const x of l) { try { await Base.retirer(x.id); } catch (e) { /* rien */ } }
    ecrireStockage(CLE_BROUILLON, null);
    try { ["outil-ergo:dossiers", CLE_VERROU, CLE_FILTRES].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* rien */ }
    location.reload();
  }

  /* ---------- Partage entre praticiennes ---------- */

  async function ouvrirEnvoiPartage() {
    enregistrerDansMesDossiers();
    await viderEcritures();
    const l = (await Base.tous()).filter((x) => x && x.id && x.dossier).sort((a, b) => nomCompletEnfant(a).localeCompare(nomCompletEnfant(b), "fr"));
    if (!l.length) { annoncer("Aucun dossier à envoyer pour l'instant."); return; }
    const chiffrable = P.chiffrementDisponible();
    const coche = (x) => (agenda.dossiers[dossier.id] || String(dossier.prenom || "").trim() ? x.id === dossier.id : true);
    let contenu = null, motDePasse = "";
    const v = await ouvrirDialogue({
      titre: "Envoyer à une collègue", classe: "boite-partage",
      html: `<p class="note">Choisissez les dossiers. L'outil crée un fichier à transmettre par un moyen sûr (clé USB, messagerie sécurisée de santé). Donnez le mot de passe par un autre moyen (de vive voix, SMS).</p>
        <div class="barre-actions"><button type="button" class="bouton-lien" data-tout="1">Tout cocher</button><button type="button" class="bouton-lien" data-tout="0">Tout décocher</button></div>
        <div class="cases liste-partage">${l.map((x) => `<label><input type="checkbox" value="${esc(x.id)}"${coche(x) ? " checked" : ""}><span>${esc(nomCompletEnfant(x))}${x.groupe ? " · " + esc(x.groupe) : ""}${nbSeances(x) ? " · " + nbSeances(x) + " séance" + (nbSeances(x) > 1 ? "s" : "") : ""}</span></label>`).join("")}</div>
        ${chiffrable ? `<div class="grille2"><label class="champ"><span>Mot de passe (6 caractères au moins)</span><input type="password" name="mdp" autocomplete="new-password"></label>
          <label class="champ"><span>Le même, une seconde fois</span><input type="password" name="mdp2" autocomplete="new-password"></label></div>`
          : `<p class="alerte-pco">Ce navigateur ne permet pas de protéger le fichier par un mot de passe. Ouvrez l'outil dans un navigateur à jour (Safari, Chrome, Firefox) pour envoyer des dossiers.</p>`}`,
      boutons: chiffrable ? [{ valeur: "envoyer", libelle: "Créer le fichier" }, { valeur: "annuler", libelle: "Annuler" }] : [{ valeur: "annuler", libelle: "Fermer", classe: "bouton" }],
      clic: (e, fond) => { const t = e.target.closest("[data-tout]"); if (t) { e.preventDefault(); $$(".liste-partage input", fond).forEach((c) => { c.checked = t.dataset.tout === "1"; }); } },
      valider: (fond, valeur) => {
        if (valeur !== "envoyer") return "";
        const ids = $$(".liste-partage input:checked", fond).map((c) => c.value);
        if (!ids.length) return "Cochez au moins un dossier.";
        const m1 = fond.querySelector("[name=mdp]").value, m2 = fond.querySelector("[name=mdp2]").value;
        if (m1.length < 6) return "Le mot de passe doit compter 6 caractères au moins.";
        if (m1 !== m2) return "Les deux mots de passe sont différents.";
        motDePasse = m1;
        contenu = { de: profilActif() || "", le: new Date().toISOString(), dossiers: l.filter((x) => ids.indexOf(x.id) >= 0) };
        return "";
      },
    });
    if (v !== "envoyer" || !contenu) return;
    try {
      const obj = await P.emballer(contenu, motDePasse);
      const n = contenu.dossiers.length;
      await telecharger("Partage_Outil_Ergo_" + B.aujourdhui() + ".json", JSON.stringify(obj), "application/json", n + " dossier" + (n > 1 ? "s" : "") + " prêt" + (n > 1 ? "s" : "") + " à envoyer, protégé" + (n > 1 ? "s" : "") + " par le mot de passe");
    } catch (e) { annoncer("Le fichier n'a pas pu être créé : " + e.message); }
  }

  async function recevoirPartage(obj) {
    if (obj && obj.type === "outil-ergo-sauvegarde") return restaurerCopie(obj);
    if (!obj || obj.type !== P.TYPE) throw new Error("Ce fichier n'est pas un partage de l'outil.");
    let contenu = obj.chiffre ? null : obj.contenu;
    if (obj.chiffre) {
      await ouvrirDialogue({
        titre: "Fichier protégé",
        html: `<p class="note">Saisissez le mot de passe donné par votre collègue.</p><label class="champ"><span>Mot de passe</span><input type="password" name="mdp" autocomplete="off"></label>`,
        boutons: [{ valeur: "ouvrir", libelle: "Ouvrir" }, { valeur: "annuler", libelle: "Annuler" }],
        valider: async (fond) => {
          try { contenu = await P.deballer(obj, fond.querySelector("[name=mdp]").value); return ""; } catch (e) { return e.message; }
        },
      });
      if (!contenu) return;
    }
    const recus = contenu && Array.isArray(contenu.dossiers) ? contenu.dossiers : [];
    enregistrerDansMesDossiers();
    await viderEcritures();
    const locaux = await Base.tous();
    const f = P.fusionner(locaux, recus);
    if (!f.ecrire.length) { annoncer("Tout est déjà à jour : rien à ajouter."); return; }
    const libelles = { ajout: "nouveau dossier", maj: "version plus récente", seances: "séances ajoutées" };
    const v = await ouvrirDialogue({
      titre: "Ajouter à mes dossiers ?",
      html: `<p class="note">Envoyé par ${esc(contenu.de || "une collègue")}${contenu.le ? ", le " + esc(B.dateCourte(String(contenu.le).slice(0, 10))) : ""}. Pour un dossier que vous avez déjà, la version la plus récente est gardée et les séances des deux côtés sont réunies.</p>
        <ul class="liste-fusion">${f.lignes.map((x) => `<li><strong>${esc(x.nom)}</strong> : ${x.action === "inchange" ? "déjà à jour" : esc(libelles[x.action]) + (x.seances && x.action !== "ajout" ? " (" + x.seances + " séance" + (x.seances > 1 ? "s" : "") + " de plus)" : "")}</li>`).join("")}</ul>`,
      boutons: [{ valeur: "ok", libelle: "Ajouter à mes dossiers" }, { valeur: "annuler", libelle: "Annuler" }],
    });
    if (v !== "ok") return;
    const avant = {};
    locaux.forEach((x) => { avant[x.id] = x; });
    for (const x of f.ecrire) await Base.mettre(x);
    const courant = f.ecrire.find((x) => x.id === dossier.id);
    if (courant) { charger({ dossier: courant.dossier, compteRendu: courant.compteRendu }); nonEnregistre = false; }
    afficherMesDossiers();
    if (panneauCourant() === "tableau") rendreTableau();
    if (panneauCourant() === "seances") rendreAgenda();
    const r = f.resume;
    proposerAnnulation([r.ajouts ? r.ajouts + " ajouté" + (r.ajouts > 1 ? "s" : "") : "", r.misAJour ? r.misAJour + " mis à jour" : "", r.seancesAjoutees ? r.seancesAjoutees + " séance" + (r.seancesAjoutees > 1 ? "s" : "") + " de plus" : ""].filter(Boolean).join(", ") + ".", async () => {
      for (const x of f.ecrire) { if (avant[x.id]) await Base.mettre(avant[x.id]); else await Base.retirer(x.id); }
      if (courant && avant[courant.id]) charger({ dossier: avant[courant.id].dossier, compteRendu: avant[courant.id].compteRendu });
      afficherMesDossiers();
      if (panneauCourant() === "tableau") rendreTableau();
    });
  }

  /* ---------- Phrases favorites ---------- */

  let champPhrases = null, selectionPhrases = null;
  function acceptePhrases(el) {
    if (!el || !el.matches || el.closest("#p-reglages, .demande, #panneau-phrases, #verrou, .seances-barre, #ecran-frappe")) return false;
    if (el.matches("textarea")) return el.id !== "eso-coller";
    if (el.matches("input[type=text]")) return ["fait", "prochaine", "aide", "difficile"].indexOf(el.dataset.ed) >= 0 || /:commentaire$/.test(el.dataset.tl || "");
    return false;
  }
  function placerBoutonPhrases(el) {
    const b = $("#bouton-phrases"), r = el.getBoundingClientRect();
    b.style.top = Math.max(0, window.scrollY + r.top - 16) + "px";
    b.style.left = Math.max(4, window.scrollX + r.right - 44) + "px";
    b.hidden = false;
  }
  function masquerBoutonPhrases() { if ($("#panneau-phrases").hidden) $("#bouton-phrases").hidden = true; }
  function rendrePhrases() {
    const f = $("#filtre-phrases").value.trim().toLowerCase();
    const l = reglages.phrases.map((t, i) => [t, i]).filter((x) => !f || x[0].toLowerCase().indexOf(f) >= 0);
    $("#liste-phrases").innerHTML = l.length ? l.map((x) => `<li><button type="button" data-phrase="${x[1]}">${esc(x[0])}</button></li>`).join("")
      : `<li class="note">${f ? "Aucune phrase trouvée." : "Aucune phrase : ajoutez-en ci-dessous ou dans les réglages."}</li>`;
  }
  function ouvrirPhrases() {
    if (!champPhrases) return;
    const [a, b] = selectionPhrases || [champPhrases.value.length, champPhrases.value.length];
    const sel = champPhrases.value.slice(a, b).trim();
    const bouton = $("#ajouter-selection");
    bouton.hidden = !sel;
    bouton.textContent = "＋ Garder « " + (sel.length > 40 ? sel.slice(0, 40) + "…" : sel) + " »";
    $("#filtre-phrases").value = "";
    rendrePhrases();
    $("#panneau-phrases").hidden = false;
    if (!estTactile()) $("#filtre-phrases").focus();
  }
  function fermerPhrases() { const p = $("#panneau-phrases"); if (p) p.hidden = true; const b = $("#bouton-phrases"); if (b) b.hidden = true; }
  function insererPhrase(t) {
    const el = champPhrases;
    if (!el || !document.body.contains(el)) { fermerPhrases(); return; }
    const [a, b] = selectionPhrases || [el.value.length, el.value.length];
    const avant = el.value.slice(0, a), apres = el.value.slice(b);
    const ajout = (!avant || /\s$/.test(avant) ? "" : " ") + t;
    el.value = avant + ajout + apres;
    const pos = (avant + ajout).length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    fermerPhrases();
    el.focus();
    try { el.setSelectionRange(pos, pos); } catch (e) { /* rien */ }
    selectionPhrases = [pos, pos];
    if (el.tagName === "TEXTAREA") ajuster(el);
  }
  function ajouterPhrase(t) {
    const p = String(t || "").trim();
    if (!p) return;
    if (reglages.phrases.indexOf(p) < 0) reglages.phrases.push(p);
    sauverReglages();
    const z = $("#phrases-reglages");
    if (z) z.value = reglages.phrases.join("\n");
    rendrePhrases();
    annoncer("Phrase ajoutée aux favorites");
  }
  function initPhrases() {
    document.addEventListener("focusin", (e) => {
      if (acceptePhrases(e.target)) { champPhrases = e.target; placerBoutonPhrases(e.target); }
      else if (!e.target.closest || !e.target.closest("#panneau-phrases, #bouton-phrases")) masquerBoutonPhrases();
    });
    document.addEventListener("focusout", (e) => {
      if (e.target !== champPhrases) return;
      selectionPhrases = [e.target.selectionStart, e.target.selectionEnd];
      setTimeout(() => { const a = document.activeElement; if (!a || (!acceptePhrases(a) && !(a.closest && a.closest("#panneau-phrases, #bouton-phrases")))) masquerBoutonPhrases(); }, 200);
    });
    const b = $("#bouton-phrases");
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); if (champPhrases) selectionPhrases = [champPhrases.selectionStart, champPhrases.selectionEnd]; });
    b.addEventListener("click", ouvrirPhrases);
    $("#filtre-phrases").addEventListener("input", rendrePhrases);
    $("#liste-phrases").addEventListener("pointerdown", (e) => { if (e.target.closest("[data-phrase]")) e.preventDefault(); });
    window.addEventListener("resize", () => { if (champPhrases && !$("#bouton-phrases").hidden) placerBoutonPhrases(champPhrases); });
  }

  /* ================= Onglets ================= */

  // Six onglets ; chacun peut regrouper plusieurs pages (sous-onglets). Les réglages s'ouvrent depuis l'en-tête.
  const GROUPES_ONGLETS = [
    { id: "dossier", panneaux: [["dossier", "📁 Dossier"], ["accueil", "🤝 Accueil adapté"]] },
    { id: "entretien", panneaux: [["anamnese", "💬 Anamnèse"], ["occupations", "🌱 Autonomie et priorités"]] },
    { id: "ecrit", panneaux: [["ecriture", "✏️ Observation"], ["bhk", "📝 BHK"], ["clavier", "⌨️ Clavier"]] },
    { id: "evaluations", panneaux: [["sensoriel", "🌈 Sensoriel"], ["bilans", "🧩 Moteur et autres"]] },
    { id: "compte-rendu", panneaux: [["compte-rendu", "Compte rendu"]] },
    { id: "seances", panneaux: [["seances", "Séances"]] },
  ];
  const dernierPanneau = {};
  function groupeDe(nom) { return GROUPES_ONGLETS.find((g) => g.panneaux.some((p) => p[0] === nom)); }

  // L'accueil adapté n'apparaît que pour les dossiers qui en ont besoin.
  function panneauVisible(nom) {
    if (nom === "accueil") return !!dossier.adaptation && dossier.adaptation.actif === "oui";
    return true;
  }

  let sigSousOnglets = "";
  function rendreSousOnglets(nom) {
    const g = groupeDe(nom);
    const visibles = g ? g.panneaux.filter((p) => panneauVisible(p[0])) : [];
    const sous = $("#sous-onglets");
    sigSousOnglets = nom + "|" + visibles.map((p) => p[0]).join(",");
    if (visibles.length > 1) {
      sous.hidden = false;
      sous.innerHTML = visibles.map((p) => `<button type="button" id="t-${p[0]}" class="${etatEtapes[p[0]] ? "rempli" : ""}" data-aller="${p[0]}" aria-current="${p[0] === nom ? "page" : "false"}">${esc(p[1])}</button>`).join("");
    } else { sous.hidden = true; sous.innerHTML = ""; }
  }

  function majSousOnglets() {
    const actif = $$("[role=tabpanel]").find((p) => !p.hidden);
    const nom = actif ? actif.id.slice(2) : "dossier";
    if (!panneauVisible(nom)) { afficherOnglet("dossier"); return; }
    const g = groupeDe(nom);
    const sig = nom + "|" + (g ? g.panneaux.filter((p) => panneauVisible(p[0])).map((p) => p[0]).join(",") : "");
    if (sig !== sigSousOnglets) rendreSousOnglets(nom);
  }

  function afficherOnglet(nom, opts) {
    if (!panneauVisible(nom)) nom = "dossier";
    if (!$("#p-" + nom)) nom = "tableau";
    // Historique : le geste « retour » du téléphone ramène à l'onglet précédent.
    if (!(opts && opts.historique === false)) {
      try { if (!history.state || history.state.onglet !== nom) history.pushState({ onglet: nom }, ""); } catch (e) { /* page partagée : sans historique */ }
    }
    const g = groupeDe(nom);
    if (g) dernierPanneau[g.id] = nom;
    document.body.dataset.groupe = g ? g.id : nom;
    $$(".onglets [role=tab]").forEach((t) => {
      const actif = !!g && t.id === "g-" + g.id;
      t.setAttribute("aria-selected", String(actif));
      t.tabIndex = actif || (!g && t.id === "g-dossier") ? 0 : -1;
      if (actif) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    rendreSousOnglets(nom);
    $("#bouton-reglages").setAttribute("aria-pressed", String(nom === "reglages"));
    $$("[role=tabpanel]").forEach((p) => { p.hidden = p.id !== "p-" + nom; });
    window.scrollTo(0, 0);
    if (nom === "compte-rendu") { $$("[data-section]").forEach(ajuster); majGalerie(); }
    if (nom === "dossier") afficherMesDossiers();
    if (nom === "seances") agendaPret = rendreAgenda();
    if (nom === "tableau") rendreTableau();
    const maison = $(".bouton-maison");
    if (maison) maison.setAttribute("aria-current", nom === "tableau" ? "page" : "false");
    fermerPhrases();
  }
  let agendaPret = Promise.resolve();

  function allerAccueil() {
    if (!$("#apercu").hidden) fermerApercu();
    afficherOnglet("tableau");
    window.scrollTo({ top: 0 });
    const titre = $("#bonjour");
    if (titre) { titre.setAttribute("tabindex", "-1"); titre.focus({ preventScroll: true }); }
  }

  function initOnglets() {
    const onglets = $$(".onglets [role=tab]");
    onglets.forEach((t, i) => {
      const g = GROUPES_ONGLETS[i];
      t.addEventListener("click", () => afficherOnglet(dernierPanneau[g.id] || g.panneaux[0][0]));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const j = (i + (e.key === "ArrowRight" ? 1 : onglets.length - 1)) % onglets.length;
        onglets[j].focus();
        afficherOnglet(dernierPanneau[GROUPES_ONGLETS[j].id] || GROUPES_ONGLETS[j].panneaux[0][0]);
      });
    });
  }

  /* ================= Actions ================= */

  function surClic(e) {
    if (surClicRepli(e)) return;
    const el = e.target.closest("button");
    if (!el) return;
    if (el.dataset.aller) return afficherOnglet(el.dataset.aller);
    if (el.dataset.faire) {
      const id = el.dataset.docApercu !== undefined ? docApercu : el.dataset.doc;
      try {
        if (el.dataset.faire === "apercu") return apercuDoc(id);
        if (el.dataset.faire === "imprimer") return imprimerDoc(id);
        if (el.dataset.faire === "word") return wordDoc(id);
      } catch (err) {
        annoncer("Le document n'a pas pu être préparé : " + (err && err.message ? err.message : "erreur inconnue") + ".");
        return;
      }
    }
    if (el.dataset.appliquer) return appliquerAnalyse(el.dataset.appliquer);
    if (el.dataset.etapeAjout) return modifierPlanning((l) => { if (l.length < A.MAX_ETAPES) l.push(el.dataset.etapeAjout); });
    if (el.dataset.etapeHaut) return modifierPlanning((l) => { const i = +el.dataset.etapeHaut; if (i > 0) l.splice(i - 1, 0, l.splice(i, 1)[0]); });
    if (el.dataset.etapeBas) return modifierPlanning((l) => { const i = +el.dataset.etapeBas; if (i < l.length - 1) l.splice(i + 1, 0, l.splice(i, 1)[0]); });
    if (el.dataset.etapeSuppr) return modifierPlanning((l) => { l.splice(+el.dataset.etapeSuppr, 1); });
    if (el.dataset.ouvrirDossier) return ouvrirDeMesDossiers(el.dataset.ouvrirDossier);
    if (el.dataset.chiffre) {
      const c = $("#code-verrou");
      if (el.dataset.chiffre === "effacer") c.value = c.value.slice(0, -1);
      else if (c.value.length < 8) c.value += el.dataset.chiffre;
      if (verrou && c.value.length >= verrou.longueur) essayerCode();
      return;
    }
    if (el.dataset.phrase !== undefined) return insererPhrase(reglages.phrases[+el.dataset.phrase]);
    if (el.dataset.preparerEvic) return preparerEvic(el.dataset.preparerEvic);
    if (el.dataset.ouvrirSeance) return ouvrirEditeur(el.dataset.ouvrirSeance, true);
    if (el.dataset.statutRapide) return statutRapide(el.dataset.cle, el.dataset.statutRapide);
    if (el.dataset.retirerSeance) return retirerSeance(el.dataset.retirerSeance);
    if (el.dataset.ouvrirDossierSeance) {
      const id = el.dataset.ouvrirDossierSeance;
      if (id === dossier.id) return afficherOnglet("dossier");
      return ouvrirDeMesDossiers(id);
    }
    if (el.dataset.periodePas !== undefined) {
      const pas = +el.dataset.periodePas;
      filtres.decalage = pas ? filtres.decalage + pas : 0;
      seanceOuverte = "";
      return rendreVue();
    }
    if (el.dataset.seancesEnfant !== undefined) return voirSeancesDuDossier();
    if (el.dataset.supprDossier) return supprimerDeMesDossiers(el.dataset.supprDossier);
    if (el.dataset.annuler !== undefined) {
      const f = annulation;
      annulation = null;
      $("#annulation").hidden = true;
      if (f) { f(); annoncer("C'est annulé"); }
      return;
    }
    if (el.dataset.retablir) {
      const id = el.dataset.retablir;
      const avant = instantane();
      proposerAnnulation("Texte généré rétabli.", restaurerInstantane(avant));
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
    if (el.dataset.supprCarte) {
      const id = el.dataset.supprCarte;
      demander("Retirer cette carte personnelle ?", "Retirer").then((ok) => {
        if (!ok) return;
        reglages.cartesPerso = reglages.cartesPerso.filter((c) => c.id !== id);
        sauverReglages(); construireCartesPerso(); rafraichirListesCartes(); majTout();
      });
      return;
    }
    switch (el.dataset.action) {
      case "enregistrer": return enregistrer();
      case "nouveau": return nouveau();
      case "word": return wordDoc("compte-rendu");
      case "word-ecole": return wordDoc("ecole");
      case "apercu": return apercuDoc("compte-rendu");
      case "apercu-ecole": return apercuDoc("ecole");
      case "theme": return basculerTheme();
      case "analyser-photo": return analyserPhoto();
      case "lancer-tri": return lancerTri(el.dataset.jeu);
      case "effacer-tri": {
        const avant = instantane();
        Object.assign(dossier.cartes[el.dataset.jeu], { resultats: [], choix: [], date: "" });
        nonEnregistre = true; majTout();
        proposerAnnulation("Résultats du tri effacés.", restaurerInstantane(avant));
        return;
      }
      case "othope-lignes": {
        const n = Math.min(O.MAX_OTHOPE - dossier.othope.items.length, 4);
        for (let i = 0; i < n; i++) dossier.othope.items.push({ activite: "", niveau: "", objectif: "" });
        const premier = dossier.othope.items.length - n;
        remplirFormulaire();
        const champ = $(`[data-chemin="othope.items.${premier}.activite"]`);
        if (champ) champ.focus();
        return;
      }
      case "retirer-precedent": {
        const avant = instantane();
        dossier.precedent = null;
        nonEnregistre = true; majTout();
        proposerAnnulation("Comparaison retirée.", restaurerInstantane(avant));
        return;
      }
      case "ajouter-carte": {
        const t = $("#carte-texte").value.trim();
        if (!t) { annoncer("Écrivez le texte de la carte."); $("#carte-texte").focus(); return; }
        if (reglages.cartesPerso.length >= O.MAX_CARTES_PERSO) { annoncer(O.MAX_CARTES_PERSO + " cartes personnelles au plus."); return; }
        reglages.cartesPerso = O.normaliserCartesPerso(reglages.cartesPerso.concat([Object.assign({ id: "p-" + Date.now().toString(36), jeu: $("#carte-jeu").value, texte: t }, photoCarte || {})]));
        photoCarte = null;
        $("#carte-texte").value = "";
        $("#carte-photo-etat").textContent = "";
        sauverReglages(); construireCartesPerso(); rafraichirListesCartes(); majTout();
        annoncer("Carte ajoutée");
        return;
      }
      case "fermer-apercu": return fermerApercu();
      case "imprimer": return imprimerDoc("compte-rendu");
      case "copier": return copier();
      case "effacer-cotation": {
        const avant = instantane();
        dossier.lignes = {}; dossier.c1 = ""; dossier.c2 = ""; dossier.tailleMm = ""; dossier.adoTermine = "";
        remplirFormulaire(); nonEnregistre = true; majTout();
        proposerAnnulation("Cotation effacée.", restaurerInstantane(avant));
        return;
      }
      case "ajouter-praticien":
        if (reglages.praticiens.length >= 4) return annoncer("Quatre praticiens au plus dans l'en-tête.");
        reglages.praticiens.push(B.praticienVide());
        sauverReglages(); construirePraticiens();
        $$("#praticiens .praticien").pop().querySelector("input").focus();
        return;
      case "ajouter-question":
        reglages.autoQuestions.push("");
        reglages.autoDomaines.push("");
        sauverReglages(); remplirReglages(); construireAuto(); remplirFormulaire(); majTout();
        $$("[data-reg-question]").pop().focus();
        return;
      case "retirer-question":
        reglages.autoQuestions.pop();
        reglages.autoDomaines.pop();
        sauverReglages(); remplirReglages(); construireAuto(); remplirFormulaire(); majTout();
        return;
      case "retirer-photo": {
        const avant = instantane();
        dossier.photoCopie = ""; dossier.photoL = ""; dossier.photoH = "";
        majPhoto(); nonEnregistre = true; majTout();
        proposerAnnulation("Photo retirée.", restaurerInstantane(avant));
        return;
      }
      case "copie-securite": return telechargerCopie();
      case "planning-defaut": return modifierPlanning((l) => { l.splice(0, l.length, ...A.PLANNING_DEFAUT); });
      case "nouvelle-seance": return ouvrirFormSeance();
      case "choisir-enfant": return ouvrirChoixEnfant();
      case "infos-enregistrement": return ouvrirInfosEnregistrement();
      case "preparer-evic": return preparerEvic();
      case "compter-copie": return compterCopieMain();
      case "ouvrir-camera": return ouvrirCamera();
      case "fermer-camera": return fermerCamera();
      case "changer-camera": return changerCamera();
      case "declencher-camera": return declencherCamera();
      case "reprendre-cliche": afficherCliche(false); $("#camera-message").textContent = "Cadrez la feuille entière, bien à plat, de face, avec une bonne lumière."; return;
      case "garder-cliche": return garderCliche();
      case "reproposer-synthese-auto": return reproposerSyntheseAuto(el.dataset.quoi);
      case "nouveau-bilan": return nouveau();
      case "noter-seance": afficherOnglet("seances"); return agendaPret.then(ouvrirFormSeance);
      case "voir-planning": return afficherOnglet("seances");
      case "tous-dossiers": afficherOnglet("dossier"); { const t = $("#h-mes-dossiers"); if (t) t.scrollIntoView({ block: "start" }); } return;
      case "voir-non-notees":
        Object.assign(filtres, { enfant: "", periode: "passees", decalage: 0, statut: "prevue", auteur: "", axe: "", lieu: "" });
        sauverFiltres();
        return afficherOnglet("seances");
      case "regler-verrou": afficherOnglet("reglages"); { const f = $("#reglages-verrou"); if (f) f.scrollIntoView({ block: "start" }); } return;
      case "verrouiller": return verrouiller();
      case "activer-verrou": return activerVerrou();
      case "retirer-verrou": return retirerVerrou();
      case "effacer-appareil": return effacerAppareil();
      case "envoyer-partage": return ouvrirEnvoiPartage();
      case "fermer-phrases": fermerPhrases(); if (champPhrases) champPhrases.focus(); return;
      case "ajouter-selection": {
        if (!champPhrases || !selectionPhrases) return;
        ajouterPhrase(champPhrases.value.slice(selectionPhrases[0], selectionPhrases[1]));
        $("#ajouter-selection").hidden = true;
        return;
      }
      case "phrases-exemples":
        B.PHRASES_EXEMPLES.forEach((t) => { if (reglages.phrases.indexOf(t) < 0) reglages.phrases.push(t); });
        sauverReglages(); $("#phrases-reglages").value = reglages.phrases.join("\n");
        annoncer("Phrases d'exemple ajoutées");
        return;
      case "fermer-form-seance": $("#form-seance").hidden = true; return;
      case "programmer-seances": return programmerPlan();
      case "retirer-logo-cabinet":
        demander("Retirer le logo du cabinet des documents ?", "Retirer").then((ok) => {
          if (!ok) return;
          reglages.logoCabinet = null;
          sauverReglages(); majTout();
        });
        return;
      case "retirer-photo-cabinet":
        demander("Retirer la photo du cabinet de cet appareil ?", "Retirer").then((ok) => {
          if (!ok) return;
          reglages.photoCabinet = null;
          sauverReglages(); majTout();
        });
        return;
      case "profil": return ouvrirChoixProfil(false);
      case "word-suivi": return wordDoc("suivi");
      case "apercu-suivi": return apercuDoc("suivi");
      case "lire-eso": {
        const l = S.lireLibellesEso($("#eso-coller").value);
        const n = l.sp.length + l.p.length + l.l.length;
        if (!n) { annoncer("Aucune question trouvée : copiez tout le texte du questionnaire, titres compris."); return; }
        reglages.esoLibelles = l;
        $("#eso-coller").value = "";
        sauverReglages(); remplirReglages(); construireSenso(); remplirFormulaire(); majTout();
        annoncer(n + " questions enregistrées dans ce navigateur");
        return;
      }
      case "effacer-eso":
        reglages.esoLibelles = { sp: [], p: [], l: [] };
        sauverReglages(); remplirReglages(); construireSenso(); remplirFormulaire(); majTout();
        annoncer("Texte des questions effacé de ce navigateur");
        return;
      case "eso-recalculer":
        demander("Remplacer les valeurs saisies à la main par celles calculées à partir des réponses ?", "Recalculer").then((ok) => {
          if (!ok) return;
          dossier.senso.eso.calcul = "";
          nonEnregistre = true; majTout();
          annoncer("Roues et systèmes recalculés");
        });
        return;
      case "eso-pdf": return exporterPdfParents("eso");
      case "avq-pdf": return exporterPdfParents("avq");
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
      if (!nonEnregistre || reglages.brouillon) suite();
      else demander("Le dossier en cours n'est pas enregistré. Ouvrir l'autre dossier quand même ?", "Ouvrir le dossier")
        .then((ok) => { if (ok) suite(); else champ.value = ""; });
    } else if (action === "photo") {
      const f = e.target.files && e.target.files[0];
      if (!f) return true;
      chargerPhoto(f).then(garderPhotoCopie).catch((err) => annoncer(err.message)).finally(() => { e.target.value = ""; });
    } else if (action === "importer-pdf-parents") {
      const f = e.target.files && e.target.files[0];
      if (!f) return true;
      importerPdfParents(f).catch((err) => annoncer(err.message)).finally(() => { e.target.value = ""; });
    } else if (action === "restaurer") {
      lireFichier(e.target).then(restaurerCopie).catch((err) => annoncer(err.message));
    } else if (action === "precedent") {
      lireFichier(e.target).then(chargerPrecedent).catch((err) => annoncer(err.message));
    } else if (action === "recevoir-partage") {
      lireFichier(e.target).then(recevoirPartage).catch((err) => annoncer(err.message));
    } else if (action === "photo-cabinet") {
      const f = e.target.files && e.target.files[0];
      if (!f) return true;
      chargerPhoto(f, 1000).then((ph) => {
        reglages.photoCabinet = { donnees: ph.donnees, l: ph.l, h: ph.h };
        sauverReglages(); majTout();
        annoncer("Photo du cabinet enregistrée sur cet appareil");
      }).catch((err) => annoncer(err.message)).finally(() => { e.target.value = ""; });
    } else if (action === "logo-cabinet") {
      const f = e.target.files && e.target.files[0];
      if (!f) return true;
      chargerPhoto(f, 600).then((ph) => {
        reglages.logoCabinet = { donnees: ph.donnees, l: ph.l, h: ph.h };
        sauverReglages(); majTout();
        annoncer("Logo enregistré : il apparaît en haut des documents et des PDF pour les parents");
      }).catch((err) => annoncer(err.message)).finally(() => { e.target.value = ""; });
    } else if (action === "photo-carte") {
      const f = e.target.files && e.target.files[0];
      if (!f) return true;
      chargerPhoto(f, 480).then((p) => {
        photoCarte = { photo: p.donnees, l: p.l, h: p.h };
        $("#carte-photo-etat").textContent = "Photo prête.";
      }).catch((err) => annoncer(err.message)).finally(() => { e.target.value = ""; });
    } else if (action === "importer-normes") {
      lireFichier(e.target).then((obj) => {
        const faits = appliquerContenusCabinet(obj, true);
        if (!faits.length) throw new Error("Ce fichier ne contient ni normes du BHK ni texte de questionnaire.");
        sauverReglages(); construireNormes(); remplirReglages(); construireAuto(); construireSenso(); construireOccupation(); remplirFormulaire(); majTout();
        annoncer("Importé : " + faits.join(", "));
      }).catch((err) => annoncer(err.message));
    } else if (action === "importer-reglages") {
      lireFichier(e.target).then((obj) => {
        if (!obj || obj.type !== "bhk-reglages") throw new Error("Ce fichier ne contient pas de réglages.");
        reglages = avecNormesIntegrees(B.normaliserReglages(obj));
        sauverReglages(); remplirReglages(); construireAuto(); rafraichirListesCartes(); remplirFormulaire(); majTout();
        annoncer("Réglages importés");
      }).catch((err) => annoncer(err.message));
    } else return false;
    return true;
  }

  /* ================= Démarrage ================= */

  function init() {
    document.documentElement.lang = "fr";
    if (verrouActif()) verrouiller();
    construireListes();
    construireGrille();
    construireCriteres();
    construireCriteresAdo();
    construireSections();
    construireSenso();
    construireManip();
    construireOccupation();
    construireDcdq();
    construireAccueil();
    construireClavier();
    initFrappe();
    initOnglets();
    initPhrases();
    rendreReglagesVerrou();
    remplirReglages();
    construireAuto();
    surveillerReplis();

    const brouillon = reglages.brouillon ? lireStockage(CLE_BROUILLON) : null;
    if (brouillon && brouillon.dossier) {
      charger(brouillon);
      if (brouillon.dossier.prenom) annoncer("Vous reprenez le dossier de " + brouillon.dossier.prenom);
    } else {
      remplirFormulaire();
      majTout();
    }
    majIndicateur();
    afficherMesDossiers();
    majProfil();
    // Demande au navigateur de ne pas effacer les données de l'outil quand l'appareil manque de place.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* rien */ }
    // Premier lancement (ou profil pas encore choisi) : on demande qui utilise l'outil, ou on propose de créer son profil.
    let plusTard = false;
    try { plusTard = sessionStorage.getItem("outil-ergo:profil-plus-tard") === "1"; } catch (e) { /* rien */ }
    if (!profilActif() && !plusTard) setTimeout(() => ouvrirChoixProfil(), 500);
    majBoutonTheme();
    // Enregistrement immédiat quand on quitte la page ou qu'on change d'application.
    const toutDeSuite = () => { clearTimeout(minuteurBrouillon); if (reglages.brouillon) { ecrireStockage(CLE_BROUILLON, { dossier: dossier, compteRendu: cr, le: new Date().toISOString() }); enregistrerDansMesDossiers(); } };
    window.addEventListener("pagehide", toutDeSuite);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") toutDeSuite(); });

    afficherOnglet("tableau", { historique: false });
    try { history.replaceState({ onglet: "tableau" }, ""); } catch (e) { /* rien */ }
    // Verrouillage après un temps sans utilisation, et au retour dans l'application.
    ["pointerdown", "keydown", "input", "wheel", "touchstart"].forEach((t) => document.addEventListener(t, () => { derniereActivite = Date.now(); }, { passive: true, capture: true }));
    setInterval(() => {
      if (verrouActif() && verrou.delai && !evic && !document.body.classList.contains("verrouille") && Date.now() - derniereActivite > verrou.delai * 60000) verrouiller();
    }, 15000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") cacheLe = Date.now();
      else if (verrouActif() && verrou.delai && cacheLe && Date.now() - cacheLe > verrou.delai * 60000) verrouiller();
    });
    window.addEventListener("popstate", (e) => {
      // Pendant la passation de l'EViC, le geste « retour » ne fait pas sortir l'enfant.
      if (evic) { try { history.pushState({ onglet: panneauCourant(), evic: true }, ""); } catch (er) { /* rien */ } return; }
      if (!$("#apercu").hidden) { fermerApercu(); return; }
      if (e.state && e.state.onglet) afficherOnglet(e.state.onglet, { historique: false });
    });
    document.addEventListener("submit", (e) => {
      if (e.target && e.target.id === "form-seance") { e.preventDefault(); ajouterSeanceDepuisForm(); }
      if (e.target && e.target.id === "form-verrou") { e.preventDefault(); essayerCode(); }
      if (e.target && e.target.id === "form-phrase") { e.preventDefault(); ajouterPhrase($("#nouvelle-phrase").value); $("#nouvelle-phrase").value = ""; }
    });
    document.addEventListener("input", surSaisie);
    document.addEventListener("change", (e) => { if (!surFichier(e)) surSaisie(e); });
    document.addEventListener("click", (e) => {
      // Logo et nom de l'outil : retour à l'accueil (Mes dossiers), d'où que l'on soit.
      if (e.target.closest && e.target.closest("[data-accueil]")) { e.preventDefault(); allerAccueil(); return; }
      surClicRadio(e); surClic(e);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && camera) { fermerCamera(); return; }
      if (e.key === "Escape" && !$("#apercu").hidden) fermerApercu();
    });
    window.addEventListener("beforeprint", () => { $("#impression").innerHTML = htmlModele(aImprimer || modele()); });
    window.addEventListener("afterprint", () => { aImprimer = null; });
    window.addEventListener("beforeunload", (e) => {
      if (!nonEnregistre || reglages.brouillon) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  init();
})();
