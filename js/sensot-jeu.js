/*
 * Outil Ergo : jeu de cartes du SensOT-dir, à l'écran, passé par l'enfant.
 * Reprend le protocole du livret : plateau 1 (j'aime, ça me gêne, ça ne me gêne pas, je ne sais pas,
 * ça ne me concerne pas), plateau 2 (fréquence de la gêne), gabarit (5 situations à travailler),
 * cartes « sensations » (type de gêne), réglette d'intensité (1 à 10), puis stimulations plaisantes et leur effet.
 * Intitulés des cartes repris du jeu, illustrations remplacées par des pictogrammes de l'outil.
 * SensotJeu.lancer({ prenom, cartes }) → Promise<{ cartes, genes, plaisirs } | null>
 */
(function (racine) {
  "use strict";

  const S = racine.Senso;
  const CLE_VOIX = "outil-ergo:tri-voix";
  const MAX = 5;
  const mouvementReduit = () => !!(racine.matchMedia && racine.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const COULEUR_THEME = { auditif: "orange", tactile: "vert", douleur: "vert", temperature: "vert", olfactif: "magenta", mouvement: "brique", gout: "rouge", oromoteur: "rouge", visuel: "bleu" };

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function lireVoix() { try { return localStorage.getItem(CLE_VOIX) === "1"; } catch (e) { return false; } }
  function ecrireVoix(v) { try { localStorage.setItem(CLE_VOIX, v ? "1" : "0"); } catch (e) { /* sans importance */ } }
  const voixDispo = typeof racine.speechSynthesis === "object" && typeof racine.SpeechSynthesisUtterance === "function";
  function dire(t) {
    if (!voixDispo || !t) return;
    try {
      racine.speechSynthesis.cancel();
      const u = new racine.SpeechSynthesisUtterance(t);
      u.lang = "fr-FR";
      u.rate = 0.92;
      const v = racine.speechSynthesis.getVoices().find((x) => /^fr/i.test(x.lang));
      if (v) u.voice = v;
      racine.speechSynthesis.speak(u);
    } catch (e) { /* lecture indisponible */ }
  }
  function carteHtml(c, classe, attrs) {
    return `<div class="${classe}" data-theme-carte="${COULEUR_THEME[c.theme] || "gris"}" ${attrs || ""}>
      <span class="sj-bandeau">${esc(c.nom)}</span>
      <span class="sj-emoji" aria-hidden="true">${esc(c.emoji)}</span></div>`;
  }
  function boite(p, i, n) {
    return `<button type="button" class="tri-pile" data-pile="${p.id}" data-couleur="${p.couleur}">
      <span class="tri-pile-emoji" aria-hidden="true">${p.emoji}</span><span class="tri-pile-label">${esc(p.label)}</span>
      <span class="tri-pile-n">${n || ""}</span><span class="tri-touche" aria-hidden="true">${i + 1}</span></button>`;
  }

  function lancer(opts) {
    const prenom = (opts.prenom || "").trim();
    const cartes = (opts.cartes && opts.cartes.length ? opts.cartes : S.CARTES_SENSOT).slice();
    const P1 = S.PLATEAU1_SENSOT, FREQ = S.FREQUENCES_SENSOT, SENS = S.SENSATIONS_SENSOT;
    const p1Grandes = P1.slice(0, 3), p1Petites = P1.slice(3);
    const fGrandes = FREQ.slice(0, 4), fPetite = FREQ[4];
    const R = { p1: {}, freq: {}, genes: [], sens: {}, inten: {}, plaisirs: [], effets: {} };
    const histoire = [];
    let ecran = { type: "accueil" };
    let voix = lireVoix();
    let occupe = false;

    const genees = () => cartes.filter((c) => R.p1[c.id] === "gene");
    const aimees = () => cartes.filter((c) => R.p1[c.id] === "aime");
    const carte = (id) => cartes.find((c) => c.id === id);

    const precedent = document.activeElement;
    const el = document.createElement("div");
    el.className = "tri sj";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Jeu de cartes SensOT-dir");
    el.innerHTML = `
      <div class="tri-haut">
        <button type="button" class="tri-rond" data-sj="quitter" aria-label="Arrêter le jeu">✕</button>
        <div class="tri-progres" aria-hidden="true"><span class="tri-jauge"><span></span></span><span class="tri-compte"></span></div>
        ${voixDispo ? `<button type="button" class="tri-rond" data-sj="voix" aria-pressed="${voix}" aria-label="Lire à voix haute">🔊</button>` : `<span class="tri-rond-vide"></span>`}
      </div>
      <div class="tri-scene" aria-live="polite"></div>`;
    document.body.appendChild(el);
    document.body.classList.add("sans-defilement");
    const scene = el.querySelector(".tri-scene");

    return new Promise((resoudre) => {
      function resultat() {
        const ids = Object.keys(R.p1).concat(Object.keys(R.freq));
        if (!ids.length) return null;
        const out = { cartes: {}, genes: [], plaisirs: [] };
        ids.forEach((id) => { out.cartes[id] = { p1: R.p1[id] || "", freq: R.freq[id] || "" }; });
        out.genes = R.genes.filter((id) => R.p1[id] === "gene").map((id) => ({ carte: id, sensation: R.sens[id] || "", intensite: R.inten[id] ? String(R.inten[id]) : "" }));
        out.plaisirs = R.plaisirs.filter((id) => R.p1[id] === "aime").map((id) => ({ carte: id, effet: R.effets[id] || "" }));
        return out;
      }
      function fin(v) {
        if (voixDispo) try { racine.speechSynthesis.cancel(); } catch (e) { /* rien */ }
        document.removeEventListener("keydown", clavier, true);
        el.remove();
        document.body.classList.remove("sans-defilement");
        if (precedent && precedent.focus) precedent.focus();
        resoudre(v);
      }

      /* ---------- Enchaînement des écrans ---------- */

      function suivant(e) {
        const g = genees(), a = aimees();
        switch (e.type) {
          case "accueil": return { type: "p1", i: 0 };
          case "p1": return e.i + 1 < cartes.length ? { type: "p1", i: e.i + 1 } : g.length ? { type: "intro2" } : apresGenes();
          case "intro2": return { type: "p2", i: 0 };
          case "p2": return e.i + 1 < g.length ? { type: "p2", i: e.i + 1 } : { type: "choixG" };
          case "choixG": return R.genes.length ? { type: "sens", i: 0 } : apresGenes();
          case "sens": return { type: "int", i: e.i };
          case "int": return e.i + 1 < R.genes.length ? { type: "sens", i: e.i + 1 } : apresGenes();
          case "choixP": return R.plaisirs.length ? { type: "effet", i: 0 } : { type: "fin" };
          case "effet": return e.i + 1 < R.plaisirs.length ? { type: "effet", i: e.i + 1 } : { type: "fin" };
          default: return { type: "fin" };
        }
        function apresGenes() { return a.length ? { type: "choixP" } : { type: "fin" }; }
      }
      function aller(e) { histoire.push(ecran); ecran = e; afficher(); }
      function avancer() { aller(suivant(ecran)); }
      function retour() {
        if (occupe || !histoire.length) return;
        ecran = histoire.pop();
        if (ecran.type === "p1") delete R.p1[cartes[ecran.i].id];
        if (ecran.type === "p2") { const c = genees()[ecran.i]; if (c) delete R.freq[c.id]; }
        afficher();
      }

      function progres(n, total, texte) {
        el.querySelector(".tri-jauge").style.visibility = total ? "visible" : "hidden";
        el.querySelector(".tri-jauge span").style.width = total ? (n / total) * 100 + "%" : "0";
        el.querySelector(".tri-compte").textContent = texte || (total ? n + " / " + total : "");
        el.querySelector(".tri-progres").style.visibility = texte || total ? "visible" : "hidden";
      }
      const bas = (droite) => `<div class="tri-bas"><button type="button" class="tri-lien" data-sj="retour"${histoire.length ? "" : " disabled"}>↶ Revenir</button>${droite || ""}</div>`;

      function afficher() {
        const e = ecran;
        if (e.type === "accueil") return accueil();
        if (e.type === "p1") return plateau(cartes[e.i], "Où ranges-tu cette carte ?", p1Grandes, p1Petites, (id) => cartes.filter((c) => R.p1[c.id] === id).length, e.i, cartes.length, "Plateau 1");
        if (e.type === "intro2") return intro("Maintenant, regardons les cartes qui te gênent.", "Est-ce que ça te gêne rarement, parfois, souvent ou presque toujours ?", "passer-p2", "Passer cette étape");
        if (e.type === "p2") {
          const g = genees();
          return plateau(g[e.i], "Ça te gêne rarement, parfois, souvent ou presque toujours ?", fGrandes, [fPetite], (id) => g.filter((c) => R.freq[c.id] === id).length, e.i, g.length, "Plateau 2");
        }
        if (e.type === "choixG") return choix(genees(), "genes", "Choisis 5 situations qui te gênent le plus et que tu voudrais voir s'améliorer.");
        if (e.type === "sens") return sensations(R.genes[e.i], R.sens, "Qu'est-ce que tu ressens dans cette situation ?", e.i, R.genes.length);
        if (e.type === "int") return reglette(R.genes[e.i], e.i);
        if (e.type === "choixP") return choix(aimees(), "plaisirs", "Peux-tu choisir les 5 cartes qui te font le plus de bien ?");
        if (e.type === "effet") return sensations(R.plaisirs[e.i], R.effets, "Quel effet ça te fait ?", e.i, R.plaisirs.length);
        return bravo();
      }

      function accueil() {
        scene.innerHTML = `<div class="tri-accueil">
          <h2 class="tri-bonjour">Bonjour${prenom ? " " + esc(prenom) : ""} !</h2>
          <p class="tri-phrase">Je vais te montrer des cartes avec des situations de tous les jours.<br>Range chaque carte dans la bonne boîte.</p>
          <div class="tri-apercu">${P1.map((p) => `<span class="tri-mini" data-couleur="${p.couleur}"><span aria-hidden="true">${p.emoji}</span>${esc(p.label)}</span>`).join("")}</div>
          <p class="tri-phrase tri-petit">Il n'y a pas de bonne ou de mauvaise réponse.</p>
          <button type="button" class="tri-go" data-sj="suite">C'est parti !</button>
        </div>`;
        progres(0, 0);
        scene.querySelector(".tri-go").focus();
        if (voix) dire("Bonjour" + (prenom ? " " + prenom : "") + ". Range chaque carte dans la bonne boîte. Il n'y a pas de bonne ou de mauvaise réponse.");
      }

      function intro(phrase, petit, action, lien) {
        scene.innerHTML = `<div class="tri-accueil">
          <p class="tri-fete" aria-hidden="true">👏</p>
          <p class="tri-phrase"><strong>${esc(phrase)}</strong></p>
          <p class="tri-phrase tri-petit">${esc(petit)}</p>
          <button type="button" class="tri-go" data-sj="suite">On continue</button>
          ${lien ? `<button type="button" class="tri-lien" data-sj="${action}">${esc(lien)}</button>` : ""}
        </div>${bas()}`;
        progres(0, 0);
        scene.querySelector(".tri-go").focus();
        if (voix) dire(phrase + " " + petit);
      }

      function plateau(c, consigne, grandes, petites, compte, i, total, etape) {
        scene.innerHTML = `<div class="tri-jeu">
          <p class="tri-consigne">${esc(consigne)}</p>
          <div class="tri-zone">${carteHtml(c, "tri-carte sj-carte", `tabindex="0" role="button" aria-label="${esc(c.nom)}. Touche pour l'entendre."`)}</div>
          <div class="tri-piles sj-piles-${grandes.length}">${grandes.map((p, k) => boite(p, k, compte(p.id))).join("")}</div>
          ${bas(petites.map((p) => `<button type="button" class="tri-lien sj-lien" data-pile="${p.id}" data-couleur="${p.couleur}">${p.emoji} ${esc(p.label)}</button>`).join(""))}
        </div>`;
        progres(i + 1, total, etape + " · " + (i + 1) + " / " + total);
        const ce = scene.querySelector(".tri-carte");
        if (!mouvementReduit()) ce.classList.add("arrive");
        glisser(ce);
        if (voix) dire(c.nom);
      }

      function ranger(pile, depuis) {
        if (occupe || (ecran.type !== "p1" && ecran.type !== "p2")) return;
        const c = ecran.type === "p1" ? cartes[ecran.i] : genees()[ecran.i];
        if (!c) return;
        if (ecran.type === "p1") { R.p1[c.id] = pile; if (pile !== "gene") delete R.freq[c.id]; } else R.freq[c.id] = pile;
        occupe = true;
        const ce = scene.querySelector(".tri-carte");
        const cible = scene.querySelector(`[data-pile="${pile}"]`);
        const suite = () => { occupe = false; avancer(); };
        if (mouvementReduit() || !ce || !cible) return suite();
        const a = ce.getBoundingClientRect(), b = cible.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2) + (depuis ? depuis.x : 0);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2) + (depuis ? depuis.y : 0);
        ce.classList.remove("arrive");
        ce.style.transition = "transform .32s cubic-bezier(.3,.7,.4,1), opacity .32s";
        ce.style.transform = `translate(${dx}px, ${dy}px) scale(.18) rotate(8deg)`;
        ce.style.opacity = "0.2";
        cible.classList.add("recoit");
        setTimeout(suite, 320);
      }

      function choix(liste, cle, consigne) {
        const ordre = { toujours: 0, souvent: 1, parfois: 2, rarement: 3 };
        const l = liste.slice().sort((x, y) => (ordre[R.freq[x.id]] === undefined ? 9 : ordre[R.freq[x.id]]) - (ordre[R.freq[y.id]] === undefined ? 9 : ordre[R.freq[y.id]]));
        R[cle] = R[cle].filter((id) => l.some((c) => c.id === id));
        scene.innerHTML = `<div class="tri-choix">
          <p class="tri-consigne">${esc(consigne)}</p>
          <p class="tri-phrase tri-petit sj-nb"></p>
          <div class="tri-grille sj-grille">${l.map((c) => `<button type="button" class="tri-petite sj-petite" data-choix="${esc(c.id)}" data-theme-carte="${COULEUR_THEME[c.theme] || "gris"}" aria-pressed="false">
            <span class="sj-bandeau">${esc(c.nom)}</span><span class="sj-emoji" aria-hidden="true">${esc(c.emoji)}</span><span class="tri-etoile" aria-hidden="true">★</span></button>`).join("")}</div>
          <button type="button" class="tri-go" data-sj="suite">J'ai choisi</button>
          ${bas()}
        </div>`;
        scene.dataset.cle = cle;
        progres(0, 0, cle === "genes" ? "Gabarit" : "Ce qui fait du bien");
        majChoix();
        if (voix) dire(consigne);
      }
      function majChoix() {
        const cle = scene.dataset.cle;
        scene.querySelectorAll("[data-choix]").forEach((b) => b.setAttribute("aria-pressed", String(R[cle].indexOf(b.dataset.choix) >= 0)));
        const n = R[cle].length;
        scene.querySelector(".sj-nb").textContent = n ? n + " / " + MAX + " choisie" + (n > 1 ? "s" : "") : "Touche une carte pour la choisir.";
        scene.querySelector("[data-sj='suite']").textContent = n ? "J'ai choisi" : "Je n'en choisis pas";
      }

      function sensations(id, cible, consigne, i, total) {
        const c = carte(id);
        scene.innerHTML = `<div class="tri-choix">
          <p class="tri-consigne">${esc(consigne)}</p>
          ${carteHtml(c, "sj-rappel")}
          <div class="tri-grille sj-sensations">${SENS.map((s) => `<button type="button" class="tri-petite sj-sensation" data-sensation="${s.id}" aria-pressed="${cible[id] === s.id}">
            <span class="tri-petite-emoji" aria-hidden="true">${s.emoji}</span><span class="tri-petite-texte">${esc(s.label)}</span></button>`).join("")}</div>
          ${bas(`<button type="button" class="tri-lien" data-sj="sans-sensation">Je ne sais pas</button>`)}
        </div>`;
        scene.dataset.cible = cible === R.sens ? "sens" : "effets";
        progres(i + 1, total, (cible === R.sens ? "Ce que je ressens" : "L'effet") + " · " + (i + 1) + " / " + total);
        if (voix) dire(c.nom + ". " + consigne);
      }

      function reglette(id, i) {
        const c = carte(id);
        scene.innerHTML = `<div class="tri-choix">
          <p class="tri-consigne">À combien ça te gêne ?</p>
          ${carteHtml(c, "sj-rappel")}
          <div class="sj-reglette" role="group" aria-label="De 1, ça ne me gêne pas du tout, à 10, je déteste">
            <div class="sj-bornes"><span>Ça ne me gêne<br>pas du tout</span><span>Je déteste,<br>c'est insupportable</span></div>
            <div class="sj-crans">${Array.from({ length: S.INTENSITE_MAX_SENSOT }, (_, k) => `<button type="button" class="sj-cran" data-intensite="${k + 1}" style="--n:${k}" aria-pressed="${R.inten[id] === k + 1}">${k + 1}</button>`).join("")}</div>
          </div>
          ${bas(`<button type="button" class="tri-lien" data-sj="sans-intensite">Je ne sais pas</button>`)}
        </div>`;
        progres(i + 1, R.genes.length, "Réglette · " + (i + 1) + " / " + R.genes.length);
        if (voix) dire("À combien ça te gêne ? 1, ça ne te gêne pas du tout. 10, tu détestes.");
      }

      function bravo() {
        scene.innerHTML = `<div class="tri-accueil">
          <p class="tri-fete" aria-hidden="true">🎉</p>
          <h2 class="tri-bonjour">Bravo${prenom ? " " + esc(prenom) : ""} !</h2>
          <p class="tri-phrase">Tu as rangé toutes les cartes.<br>Merci pour ton aide !</p>
          <button type="button" class="tri-go" data-sj="terminer">Terminer</button>
          ${bas()}
        </div>`;
        progres(1, 1, "Fini");
        scene.querySelector(".tri-go").focus();
        if (voix) dire("Bravo" + (prenom ? " " + prenom : "") + " ! Tu as rangé toutes les cartes.");
      }

      function demanderArret() {
        if (el.querySelector(".tri-arret")) return;
        const n = Object.keys(R.p1).length;
        const b = document.createElement("div");
        b.className = "tri-arret";
        b.innerHTML = `<div class="tri-arret-boite" role="alertdialog" aria-label="Arrêter le jeu">
          <p><strong>Arrêter le jeu ?</strong></p>
          <p>${n ? "Les " + n + " cartes déjà rangées et les choix faits seront gardés." : "Aucune carte n'est encore rangée."}</p>
          <div class="tri-arret-actions"><button type="button" class="bouton" data-sj="arreter">Arrêter</button>
          <button type="button" class="bouton bouton-second" data-sj="continuer">Continuer</button></div></div>`;
        el.appendChild(b);
        b.querySelector("[data-sj='continuer']").focus();
      }

      /* ---------- Glisser la carte vers une boîte ---------- */

      function glisser(ce) {
        let depart = null, deplace = false, survol = null;
        const sous = (x, y) => { ce.style.pointerEvents = "none"; const s = document.elementFromPoint(x, y); ce.style.pointerEvents = ""; return s && s.closest("[data-pile]"); };
        ce.addEventListener("pointerdown", (e) => {
          if (occupe || e.button > 0) return;
          depart = { x: e.clientX, y: e.clientY, id: e.pointerId };
          deplace = false;
          try { ce.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
        });
        ce.addEventListener("pointermove", (e) => {
          if (!depart || e.pointerId !== depart.id) return;
          const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
          if (!deplace && Math.hypot(dx, dy) < 8) return;
          deplace = true;
          ce.classList.remove("arrive");
          ce.classList.add("glisse");
          ce.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-12, Math.min(12, dx / 14))}deg)`;
          const p = sous(e.clientX, e.clientY);
          if (p !== survol) { if (survol) survol.classList.remove("survol"); survol = p; if (survol) survol.classList.add("survol"); }
        });
        const lacher = (e) => {
          if (!depart || e.pointerId !== depart.id) return;
          const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
          depart = null;
          ce.classList.remove("glisse");
          if (survol) survol.classList.remove("survol");
          if (!deplace) { ce.style.transform = ""; dire(ce.querySelector(".sj-bandeau").textContent); return; }
          const p = e.type === "pointerup" ? sous(e.clientX, e.clientY) : null;
          survol = null;
          if (p) { ce.style.transform = `translate(${dx}px, ${dy}px)`; ranger(p.dataset.pile, { x: dx, y: dy }); }
          else { ce.style.transition = "transform .25s"; ce.style.transform = ""; setTimeout(() => { ce.style.transition = ""; }, 260); }
        };
        ce.addEventListener("pointerup", lacher);
        ce.addEventListener("pointercancel", lacher);
      }

      /* ---------- Événements ---------- */

      el.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b || b.disabled || occupe) return;
        if (b.dataset.pile) return ranger(b.dataset.pile);
        if (b.dataset.choix) {
          const cle = scene.dataset.cle, id = b.dataset.choix, k = R[cle].indexOf(id);
          if (k >= 0) R[cle].splice(k, 1);
          else if (R[cle].length < MAX) R[cle].push(id);
          else { b.classList.add("refus"); setTimeout(() => b.classList.remove("refus"), 400); }
          return majChoix();
        }
        if (b.dataset.sensation) {
          const id = ecran.type === "sens" ? R.genes[ecran.i] : R.plaisirs[ecran.i];
          (ecran.type === "sens" ? R.sens : R.effets)[id] = b.dataset.sensation;
          b.setAttribute("aria-pressed", "true");
          if (voix) dire(b.textContent.trim());
          occupe = true;
          return setTimeout(() => { occupe = false; avancer(); }, mouvementReduit() ? 0 : 260);
        }
        if (b.dataset.intensite) {
          R.inten[R.genes[ecran.i]] = Number(b.dataset.intensite);
          b.setAttribute("aria-pressed", "true");
          occupe = true;
          return setTimeout(() => { occupe = false; avancer(); }, mouvementReduit() ? 0 : 260);
        }
        switch (b.dataset.sj) {
          case "suite": return avancer();
          case "passer-p2": return aller({ type: "choixG" });
          case "sans-sensation":
            delete (ecran.type === "sens" ? R.sens : R.effets)[ecran.type === "sens" ? R.genes[ecran.i] : R.plaisirs[ecran.i]];
            return avancer();
          case "sans-intensite": delete R.inten[R.genes[ecran.i]]; return avancer();
          case "retour": return retour();
          case "terminer": return fin(resultat());
          case "quitter": return demanderArret();
          case "continuer": el.querySelector(".tri-arret").remove(); return;
          case "arreter": return fin(resultat());
          case "voix":
            voix = !voix;
            ecrireVoix(voix);
            b.setAttribute("aria-pressed", String(voix));
            if (!voix && voixDispo) try { racine.speechSynthesis.cancel(); } catch (err) { /* rien */ }
            return;
        }
      });
      el.addEventListener("keydown", (e) => {
        if (e.target.classList && e.target.classList.contains("tri-carte") && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          dire(e.target.querySelector(".sj-bandeau").textContent);
        }
      });
      function clavier(e) {
        if (e.key === "Escape") {
          e.stopPropagation();
          const arret = el.querySelector(".tri-arret");
          if (arret) arret.remove(); else demanderArret();
          return;
        }
        if (el.querySelector(".tri-arret")) return;
        if (e.key === "Backspace" && e.target.tagName !== "INPUT") { e.preventDefault(); return retour(); }
        if (ecran.type !== "p1" && ecran.type !== "p2") return;
        const grandes = ecran.type === "p1" ? p1Grandes : fGrandes;
        const n = Number(e.key);
        if (n >= 1 && n <= grandes.length) { e.preventDefault(); ranger(grandes[n - 1].id); }
        else if (e.key === "0") { e.preventDefault(); ranger("nsp"); }
      }
      document.addEventListener("keydown", clavier, true);
      afficher();
    });
  }

  racine.SensotJeu = { lancer: lancer };
})(typeof self !== "undefined" ? self : this);
