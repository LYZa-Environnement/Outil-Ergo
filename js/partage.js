/*
 * Outil Ergo : partage de dossiers entre praticiennes et code de verrouillage.
 * - Fichier de partage, protégé par un mot de passe (AES-GCM 256 bits, clé dérivée par PBKDF2-SHA-256).
 * - Fusion des dossiers reçus : la version la plus récente est gardée, les séances des deux côtés sont réunies.
 * - Empreinte du code de verrouillage (SHA-256 itéré, calculé ici pour fonctionner partout, même hors https).
 * Aucune donnée ne quitte l'appareil : le fichier est remis à la main (clé USB, messagerie sécurisée…).
 */
(function (racine, fabrique) {
  if (typeof module === "object" && module.exports) module.exports = fabrique(require("./seances.js"));
  else racine.Partage = fabrique(racine.Seances);
})(typeof self !== "undefined" ? self : this, function (SE) {
  "use strict";

  const TYPE = "outil-ergo-partage";
  const ITERATIONS_PARTAGE = 210000;
  const ITERATIONS_CODE = 12000;

  /* ================= Outils ================= */

  const enc = (t) => new TextEncoder().encode(t);
  function versB64(o) { let s = ""; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(s); }
  function depuisB64(b) { const s = atob(String(b || "")); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
  function crypto_() { return typeof crypto !== "undefined" && crypto ? crypto : null; }
  function subtil() { const c = crypto_(); return c && c.subtle ? c.subtle : null; }
  function aleatoire(n) { const o = new Uint8Array(n); const c = crypto_(); if (c && c.getRandomValues) c.getRandomValues(o); else for (let i = 0; i < n; i++) o[i] = Math.floor(Math.random() * 256); return o; }
  function chiffrementDisponible() { return !!subtil(); }

  /* ================= SHA-256 (pour le code de verrouillage) ================= */

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const ror = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(octets) {
    const l = octets.length, nb = ((l + 9 + 63) >> 6) << 6;
    const m = new Uint8Array(nb);
    m.set(octets);
    m[l] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(nb - 4, (l * 8) >>> 0);
    dv.setUint32(nb - 8, Math.floor((l * 8) / 0x100000000));
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64);
    for (let i = 0; i < nb; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = ror(w[t - 15], 7) ^ ror(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = ror(w[t - 2], 17) ^ ror(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
        const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), dvo = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) dvo.setUint32(i * 4, H[i]);
    return out;
  }
  function concat(a, b) { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; }

  /* ================= Code de verrouillage ================= */

  function empreinteCode(code, selB64, iterations) {
    const sel = depuisB64(selB64);
    let h = sha256(concat(sel, enc(String(code))));
    for (let i = 1; i < (iterations || ITERATIONS_CODE); i++) h = sha256(concat(h, sel));
    return versB64(h);
  }
  function codeValide(code) { return /^\d{4,8}$/.test(String(code)); }
  function creerVerrou(code, delai) {
    if (!codeValide(code)) throw new Error("Le code doit compter de 4 à 8 chiffres.");
    const sel = versB64(aleatoire(16));
    return { version: 1, sel: sel, iterations: ITERATIONS_CODE, empreinte: empreinteCode(code, sel, ITERATIONS_CODE), longueur: String(code).length, delai: normaliserDelai(delai) };
  }
  function verifierCode(verrou, code) {
    if (!verrou || !verrou.sel || !verrou.empreinte) return false;
    return empreinteCode(code, verrou.sel, verrou.iterations || ITERATIONS_CODE) === verrou.empreinte;
  }
  // Délai d'inactivité avant verrouillage, en minutes (0 : seulement à l'ouverture de l'outil).
  const DELAIS = [[2, "2 minutes"], [5, "5 minutes"], [10, "10 minutes"], [30, "30 minutes"], [0, "Seulement à l'ouverture"]];
  function normaliserDelai(v) { const n = Number(v); return DELAIS.some((d) => d[0] === n) ? n : 5; }
  // Attente après des erreurs : 5 essais libres, puis 30 s, 60 s, 120 s…
  function attenteApres(erreurs) { return erreurs < 5 ? 0 : Math.min(15 * 60, 30 * Math.pow(2, erreurs - 5)); }

  /* ================= Fichier de partage ================= */

  async function cle(motDePasse, sel, iterations) {
    const s = subtil();
    const base = await s.importKey("raw", enc(motDePasse), "PBKDF2", false, ["deriveKey"]);
    return s.deriveKey({ name: "PBKDF2", salt: sel, iterations: iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  async function emballer(contenu, motDePasse) {
    if (!motDePasse) return { type: TYPE, version: 1, chiffre: false, contenu: contenu };
    if (!subtil()) throw new Error("La protection par mot de passe n'est pas possible dans ce navigateur.");
    const sel = aleatoire(16), iv = aleatoire(12);
    const k = await cle(motDePasse, sel, ITERATIONS_PARTAGE);
    const c = new Uint8Array(await subtil().encrypt({ name: "AES-GCM", iv: iv }, k, enc(JSON.stringify(contenu))));
    return { type: TYPE, version: 1, chiffre: true, methode: "AES-GCM-256, PBKDF2-SHA-256", iterations: ITERATIONS_PARTAGE, sel: versB64(sel), iv: versB64(iv), donnees: versB64(c) };
  }

  async function deballer(obj, motDePasse) {
    if (!obj || obj.type !== TYPE) throw new Error("Ce fichier n'est pas un partage de l'outil.");
    if (!obj.chiffre) return obj.contenu;
    if (!subtil()) throw new Error("Ce navigateur ne sait pas ouvrir un fichier protégé : ouvrez l'outil dans un navigateur à jour (Safari, Chrome, Firefox).");
    if (!motDePasse) { const e = new Error("Ce fichier est protégé : saisissez le mot de passe."); e.code = "mot-de-passe"; throw e; }
    try {
      const k = await cle(motDePasse, depuisB64(obj.sel), obj.iterations || ITERATIONS_PARTAGE);
      const clair = await subtil().decrypt({ name: "AES-GCM", iv: depuisB64(obj.iv) }, k, depuisB64(obj.donnees));
      return JSON.parse(new TextDecoder().decode(clair));
    } catch (e) {
      const err = new Error("Mot de passe incorrect, ou fichier abîmé.");
      err.code = "mot-de-passe";
      throw err;
    }
  }

  /* ================= Fusion ================= */

  // locaux, recus : entrées de « Mes dossiers » ({ id, prenom, nom, groupe, modifieLe, dossier, compteRendu… }).
  // Retourne les entrées à écrire et un résumé ; rien n'est écrit ici.
  function fusionner(locaux, recus) {
    const parId = {};
    (locaux || []).forEach((x) => { if (x && x.id) parId[x.id] = x; });
    const ecrire = [], lignes = [];
    const resume = { ajouts: 0, misAJour: 0, seancesAjoutees: 0, inchanges: 0 };
    (recus || []).forEach((r) => {
      if (!r || !r.id || !r.dossier || typeof r.dossier !== "object") return;
      const nom = [r.prenom, r.nom].filter(Boolean).join(" ") || "Sans nom";
      const l = parId[r.id];
      if (!l) {
        ecrire.push(r);
        resume.ajouts++;
        lignes.push({ id: r.id, nom: nom, action: "ajout", seances: SE.normaliserListe(r.dossier.seances).length });
        return;
      }
      const plusRecent = String(r.modifieLe || "") > String(l.modifieLe || "");
      const base = plusRecent ? r : l, autre = plusRecent ? l : r;
      const sBase = SE.normaliserListe(base.dossier.seances), sAutre = SE.normaliserListe(autre.dossier.seances);
      const ids = new Set(sBase.map((s) => s.id));
      const seances = sBase.concat(sAutre.filter((s) => !ids.has(s.id))).sort(SE.ordre);
      const idsLocaux = new Set(SE.normaliserListe(l.dossier.seances).map((s) => s.id));
      const nouvelles = seances.filter((s) => !idsLocaux.has(s.id)).length;
      if (!plusRecent && !nouvelles) { resume.inchanges++; lignes.push({ id: r.id, nom: nom, action: "inchange", seances: 0 }); return; }
      const entree = JSON.parse(JSON.stringify(base));
      entree.dossier.seances = seances;
      entree.modifieLe = plusRecent ? r.modifieLe : l.modifieLe;
      ecrire.push(entree);
      if (plusRecent) resume.misAJour++;
      resume.seancesAjoutees += nouvelles;
      lignes.push({ id: r.id, nom: nom, action: plusRecent ? "maj" : "seances", seances: nouvelles });
    });
    return { ecrire: ecrire, resume: resume, lignes: lignes };
  }

  return {
    TYPE, DELAIS, ITERATIONS_CODE, chiffrementDisponible, sha256, versB64, depuisB64,
    empreinteCode, codeValide, creerVerrou, verifierCode, normaliserDelai, attenteApres,
    emballer, deballer, fusionner,
  };
});
