/*
 * Outil Ergo : tri de cartes à l'écran, fait par l'enfant.
 * L'enfant range chaque carte dans une boîte (en la glissant ou en touchant la boîte),
 * puis choisit les cartes qui comptent le plus pour lui. Lecture à voix haute possible.
 * TriCartes.lancer({ jeu, cartes, prenom }) → Promise<{ resultats, choix } | null>
 */
(function (racine) {
  "use strict";

  const COULEURS = { facile: "vert", aime: "vert", moyen: "ambre", egal: "bleu", difficile: "corail", naime: "corail", non: "gris" };
  const CLE_VOIX = "outil-ergo:tri-voix";
  const mouvementReduit = () => !!(racine.matchMedia && racine.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function melanger(l) {
    const t = l.slice();
    for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = t[i]; t[i] = t[j]; t[j] = x; }
    return t;
  }
  function lireVoix() { try { return localStorage.getItem(CLE_VOIX) === "1"; } catch (e) { return false; } }
  function ecrireVoix(v) { try { localStorage.setItem(CLE_VOIX, v ? "1" : "0"); } catch (e) { /* sans importance */ } }
  const voixDispo = typeof racine.speechSynthesis === "object" && typeof racine.SpeechSynthesisUtterance === "function";
  function dire(t) {
    if (!voixDispo) return;
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
  function visuel(c, classe) {
    if (c.photo) return `<img class="${classe}-photo" src="${esc(c.photo)}" alt="">`;
    return `<span class="${classe}-emoji" aria-hidden="true">${esc(c.emoji || "🃏")}</span>`;
  }

  function lancer(opts) {
    const J = opts.jeu;
    const cartes = melanger(opts.cartes);
    const piles = J.piles;
    const prenom = (opts.prenom || "").trim();
    const resultats = [];
    let choix = [];
    let voix = lireVoix();
    let ecran = "accueil";
    let occupe = false;

    const precedent = document.activeElement;
    const racineEl = document.createElement("div");
    racineEl.className = "tri";
    racineEl.setAttribute("role", "dialog");
    racineEl.setAttribute("aria-modal", "true");
    racineEl.setAttribute("aria-label", J.titre);
    racineEl.innerHTML = `
      <div class="tri-haut">
        <button type="button" class="tri-rond" data-tri="quitter" aria-label="Arrêter le tri">✕</button>
        <div class="tri-progres" aria-hidden="true"><span class="tri-jauge"><span></span></span><span class="tri-compte"></span></div>
        ${voixDispo ? `<button type="button" class="tri-rond" data-tri="voix" aria-pressed="${voix}" aria-label="Lire les cartes à voix haute">🔊</button>` : `<span class="tri-rond-vide"></span>`}
      </div>
      <div class="tri-scene" aria-live="polite"></div>`;
    document.body.appendChild(racineEl);
    document.body.classList.add("sans-defilement");
    const scene = racineEl.querySelector(".tri-scene");

    return new Promise((resoudre) => {
      function fin(valeur) {
        if (voixDispo) try { racine.speechSynthesis.cancel(); } catch (e) { /* rien */ }
        document.removeEventListener("keydown", clavier, true);
        racineEl.remove();
        document.body.classList.remove("sans-defilement");
        if (precedent && precedent.focus) precedent.focus();
        resoudre(valeur);
      }
      function resultat() {
        return resultats.length ? { resultats: resultats.map((r) => ({ id: r.carte.id, enfant: r.carte.enfant, rapport: r.carte.rapport, emoji: r.carte.emoji || "", theme: r.carte.theme || "", pile: r.pile })), choix: choix.slice() } : null;
      }

      function majProgres() {
        const n = Math.min(resultats.length, cartes.length);
        racineEl.querySelector(".tri-jauge span").style.width = (cartes.length ? (n / cartes.length) * 100 : 0) + "%";
        racineEl.querySelector(".tri-compte").textContent = ecran === "tri" ? Math.min(n + 1, cartes.length) + " / " + cartes.length : "";
        racineEl.querySelector(".tri-progres").style.visibility = ecran === "tri" ? "visible" : "hidden";
      }

      /* ---------- Écrans ---------- */

      function accueil() {
        ecran = "accueil";
        scene.innerHTML = `<div class="tri-accueil">
          <h2 class="tri-bonjour">Bonjour${prenom ? " " + esc(prenom) : ""} !</h2>
          <p class="tri-phrase">Je vais te montrer des cartes.<br>Range chaque carte dans la bonne boîte.</p>
          <div class="tri-apercu">${piles.map((p) => `<span class="tri-mini" data-couleur="${COULEURS[p.id] || "gris"}"><span aria-hidden="true">${p.emoji}</span>${esc(p.label)}</span>`).join("")}</div>
          <p class="tri-phrase tri-petit">Il n'y a pas de bonne ou de mauvaise réponse.</p>
          <button type="button" class="tri-go" data-tri="commencer">C'est parti !</button>
        </div>`;
        majProgres();
        scene.querySelector("[data-tri='commencer']").focus();
        if (voix) dire("Bonjour" + (prenom ? " " + prenom : "") + ". Range chaque carte dans la bonne boîte. Il n'y a pas de bonne ou de mauvaise réponse.");
      }

      function carteCourante() { return cartes[resultats.length]; }

      function tri() {
        ecran = "tri";
        const c = carteCourante();
        if (!c) return apresTri();
        const compte = (id) => resultats.filter((r) => r.pile === id).length;
        scene.innerHTML = `<div class="tri-jeu">
          <p class="tri-consigne">${esc(J.consigne)}</p>
          <div class="tri-zone">
            <div class="tri-carte${c.photo ? " avec-photo" : ""}" tabindex="0" role="button" aria-label="${esc(c.enfant)}. Touche pour l'entendre.">
              ${visuel(c, "tri-carte")}
              <span class="tri-carte-texte">${esc(c.enfant)}</span>
            </div>
          </div>
          <div class="tri-piles">${piles.map((p, i) => `<button type="button" class="tri-pile" data-pile="${p.id}" data-couleur="${COULEURS[p.id] || "gris"}">
              <span class="tri-pile-emoji" aria-hidden="true">${p.emoji}</span><span class="tri-pile-label">${esc(p.label)}</span>
              <span class="tri-pile-n" aria-label="${compte(p.id)} cartes">${compte(p.id) || ""}</span><span class="tri-touche" aria-hidden="true">${i + 1}</span></button>`).join("")}</div>
          <div class="tri-bas">
            <button type="button" class="tri-lien" data-tri="retour"${resultats.length ? "" : " disabled"}>↶ Revenir</button>
            <button type="button" class="tri-lien" data-pile="${J.passer.id}">${J.passer.emoji} ${esc(J.passer.label)}</button>
          </div>
        </div>`;
        majProgres();
        const el = scene.querySelector(".tri-carte");
        if (!mouvementReduit()) el.classList.add("arrive");
        brancherGlisser(el);
        if (voix) dire(c.enfant);
      }

      function classer(pileId, depuis) {
        if (occupe || ecran !== "tri") return;
        const c = carteCourante();
        if (!c) return;
        occupe = true;
        const el = scene.querySelector(".tri-carte");
        const cible = scene.querySelector(`.tri-pile[data-pile="${pileId}"]`) || scene.querySelector(`[data-pile="${pileId}"]`);
        resultats.push({ carte: c, pile: pileId });
        const suite = () => { occupe = false; tri(); };
        if (mouvementReduit() || !el || !cible) return suite();
        const a = el.getBoundingClientRect(), b = cible.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2) + (depuis ? depuis.x : 0);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2) + (depuis ? depuis.y : 0);
        el.classList.remove("arrive");
        el.style.transition = "transform .32s cubic-bezier(.3,.7,.4,1), opacity .32s";
        el.style.transform = `translate(${dx}px, ${dy}px) scale(.18) rotate(${pileId === J.passer.id ? 0 : 8}deg)`;
        el.style.opacity = "0.2";
        cible.classList.add("recoit");
        setTimeout(suite, 320);
      }

      function retour() {
        if (occupe || !resultats.length) return;
        resultats.pop();
        tri();
      }

      function apresTri() {
        const candidates = resultats.filter((r) => J.choix.piles.indexOf(r.pile) >= 0);
        if (!candidates.length) return bravo();
        ecran = "choix";
        choix = choix.filter((id) => candidates.some((r) => r.carte.id === id));
        scene.innerHTML = `<div class="tri-choix">
          <p class="tri-consigne">${esc(J.choix.consigne)}</p>
          <p class="tri-phrase tri-petit"><span class="tri-nb-choix"></span></p>
          <div class="tri-grille">${candidates.map((r) => `<button type="button" class="tri-petite" data-choix="${esc(r.carte.id)}" aria-pressed="false">
            ${visuel(r.carte, "tri-petite")}<span class="tri-petite-texte">${esc(r.carte.enfant)}</span><span class="tri-etoile" aria-hidden="true">★</span></button>`).join("")}</div>
          <button type="button" class="tri-go" data-tri="fini">J'ai fini</button>
        </div>`;
        majProgres();
        majChoix();
        if (voix) dire(J.choix.consigne);
      }

      function majChoix() {
        scene.querySelectorAll("[data-choix]").forEach((b) => {
          const on = choix.indexOf(b.dataset.choix) >= 0;
          b.setAttribute("aria-pressed", String(on));
        });
        const n = scene.querySelector(".tri-nb-choix");
        if (n) n.textContent = choix.length ? choix.length + " / " + J.choix.max + " choisie" + (choix.length > 1 ? "s" : "") : "Touche une carte pour la choisir.";
      }

      function bravo() {
        ecran = "fin";
        scene.innerHTML = `<div class="tri-accueil">
          <p class="tri-fete" aria-hidden="true">🎉</p>
          <h2 class="tri-bonjour">Bravo${prenom ? " " + esc(prenom) : ""} !</h2>
          <p class="tri-phrase">Tu as rangé toutes les cartes.<br>Merci pour ton aide !</p>
          <button type="button" class="tri-go" data-tri="terminer">Terminer</button>
        </div>`;
        majProgres();
        scene.querySelector("[data-tri='terminer']").focus();
        if (voix) dire("Bravo" + (prenom ? " " + prenom : "") + " ! Tu as rangé toutes les cartes.");
      }

      function demanderArret() {
        if (racineEl.querySelector(".tri-arret")) return;
        const boite = document.createElement("div");
        boite.className = "tri-arret";
        boite.innerHTML = `<div class="tri-arret-boite" role="alertdialog" aria-label="Arrêter le tri">
          <p><strong>Arrêter le tri ?</strong></p>
          <p>${resultats.length ? "Les " + resultats.length + " cartes déjà rangées seront gardées." : "Aucune carte n'est encore rangée."}</p>
          <div class="tri-arret-actions"><button type="button" class="bouton" data-tri="arreter">Arrêter</button>
          <button type="button" class="bouton bouton-second" data-tri="continuer">Continuer</button></div></div>`;
        racineEl.appendChild(boite);
        boite.querySelector("[data-tri='continuer']").focus();
      }

      /* ---------- Glisser la carte vers une boîte ---------- */

      function brancherGlisser(el) {
        let depart = null, deplace = false, survol = null;
        const pileSous = (x, y) => {
          el.style.pointerEvents = "none";
          const sous = document.elementFromPoint(x, y);
          el.style.pointerEvents = "";
          return sous && sous.closest("[data-pile]");
        };
        el.addEventListener("pointerdown", (e) => {
          if (occupe || e.button > 0) return;
          depart = { x: e.clientX, y: e.clientY, id: e.pointerId };
          deplace = false;
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
        });
        el.addEventListener("pointermove", (e) => {
          if (!depart || e.pointerId !== depart.id) return;
          const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
          if (!deplace && Math.hypot(dx, dy) < 8) return;
          deplace = true;
          el.classList.remove("arrive");
          el.classList.add("glisse");
          el.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-12, Math.min(12, dx / 14))}deg)`;
          const p = pileSous(e.clientX, e.clientY);
          if (p !== survol) {
            if (survol) survol.classList.remove("survol");
            survol = p;
            if (survol) survol.classList.add("survol");
          }
        });
        const lacher = (e) => {
          if (!depart || e.pointerId !== depart.id) return;
          const dx = e.clientX - depart.x, dy = e.clientY - depart.y;
          depart = null;
          el.classList.remove("glisse");
          if (survol) survol.classList.remove("survol");
          if (!deplace) { el.style.transform = ""; dire(carteCourante() ? carteCourante().enfant : ""); return; }
          const p = e.type === "pointerup" ? pileSous(e.clientX, e.clientY) : null;
          survol = null;
          if (p) {
            el.style.transform = `translate(${dx}px, ${dy}px)`;
            classer(p.dataset.pile, { x: dx, y: dy });
          } else {
            el.style.transition = "transform .25s";
            el.style.transform = "";
            setTimeout(() => { el.style.transition = ""; }, 260);
          }
        };
        el.addEventListener("pointerup", lacher);
        el.addEventListener("pointercancel", lacher);
      }

      /* ---------- Événements ---------- */

      racineEl.addEventListener("click", (e) => {
        const b = e.target.closest("button, [data-pile]");
        if (!b || b.disabled) return;
        if (b.dataset.pile && ecran === "tri") return classer(b.dataset.pile);
        if (b.dataset.choix) {
          const id = b.dataset.choix, i = choix.indexOf(id);
          if (i >= 0) choix.splice(i, 1);
          else if (choix.length < J.choix.max) choix.push(id);
          else { b.classList.add("refus"); setTimeout(() => b.classList.remove("refus"), 400); }
          majChoix();
          return;
        }
        switch (b.dataset.tri) {
          case "commencer": return tri();
          case "retour": return retour();
          case "fini": return bravo();
          case "terminer": return fin(resultat());
          case "quitter": return demanderArret();
          case "continuer": racineEl.querySelector(".tri-arret").remove(); return;
          case "arreter": return fin(resultat());
          case "voix":
            voix = !voix;
            ecrireVoix(voix);
            b.setAttribute("aria-pressed", String(voix));
            if (voix && ecran === "tri" && carteCourante()) dire(carteCourante().enfant);
            else if (!voix && voixDispo) try { racine.speechSynthesis.cancel(); } catch (err) { /* rien */ }
            return;
        }
      });
      racineEl.addEventListener("keydown", (e) => {
        if (e.target.classList && e.target.classList.contains("tri-carte") && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (carteCourante()) dire(carteCourante().enfant);
        }
      });
      function clavier(e) {
        if (e.key === "Escape") {
          e.stopPropagation();
          const arret = racineEl.querySelector(".tri-arret");
          if (arret) arret.remove(); else demanderArret();
          return;
        }
        if (ecran !== "tri" || racineEl.querySelector(".tri-arret")) return;
        const n = Number(e.key);
        if (n >= 1 && n <= piles.length) { e.preventDefault(); classer(piles[n - 1].id); }
        else if (e.key === "0") { e.preventDefault(); classer(J.passer.id); }
        else if (e.key === "Backspace") { e.preventDefault(); retour(); }
      }
      document.addEventListener("keydown", clavier, true);
      accueil();
    });
  }

  racine.TriCartes = { lancer: lancer };
})(typeof self !== "undefined" ? self : this);
