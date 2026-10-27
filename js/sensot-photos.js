/*
 * Outil Ergo : photos des cartes SensOT-dir du cabinet.
 * L'ergothérapeute photographie une fois les cartes de son propre coffret ; le jeu à l'écran les affiche.
 * Les photos restent sur cet appareil (IndexedDB, base à part des dossiers) et ne sont jamais envoyées.
 * PhotosSensot.toutes() → Promise<{ id: { donnees, l, h } }> ; mettre(id, photo) ; retirer(id) ; vider()
 */
(function (racine) {
  "use strict";

  const BASE = "outil-ergo-cartes", MAGASIN = "photos";
  const pret = new Promise((ok) => {
    try {
      const req = racine.indexedDB.open(BASE, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ok(null);
      req.onblocked = () => ok(null);
    } catch (e) { ok(null); }
  });
  function demande(mode, f) {
    return pret.then((db) => new Promise((ok, ko) => {
      if (!db) return ko(new Error("Ce navigateur ne permet pas de garder les photos des cartes."));
      try {
        const t = db.transaction(MAGASIN, mode);
        const st = t.objectStore(MAGASIN);
        const r = f(st);
        t.oncomplete = () => ok(r && r.result);
        t.onerror = () => ko(t.error || new Error("Photo non enregistrée."));
        t.onabort = () => ko(t.error || new Error("Photo non enregistrée (espace plein ?)."));
      } catch (e) { ko(e); }
    }));
  }
  function toutes() {
    return pret.then((db) => new Promise((ok) => {
      if (!db) return ok({});
      const out = {};
      try {
        const req = db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).openCursor();
        req.onsuccess = () => {
          const c = req.result;
          if (!c) return ok(out);
          out[c.key] = c.value;
          c.continue();
        };
        req.onerror = () => ok(out);
      } catch (e) { ok(out); }
    }));
  }

  racine.PhotosSensot = {
    toutes: toutes,
    mettre: (id, photo) => demande("readwrite", (st) => st.put(photo, id)),
    retirer: (id) => demande("readwrite", (st) => st.delete(id)),
    vider: () => demande("readwrite", (st) => st.clear()),
  };
})(typeof self !== "undefined" ? self : this);
