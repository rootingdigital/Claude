/* bioBamboo · conexión con Firebase (Firestore + Auth + App Check con reCAPTCHA).
   Expone la misma interfaz que usa el resto del sitio (window.claude.use("db"/"user")),
   así el código de la web no cambia entre la demo y el sitio publicado en Firebase. */
(function(){
  "use strict";
  const cfg = window.BIOBAMBOO_FIREBASE || {};
  if (!window.firebase || !cfg.apiKey || cfg.apiKey.indexOf("PEGAR") === 0) {
    console.warn("bioBamboo: falta completar assets/firebase-config.js");
    window.claude = {use: async () => null};
    return;
  }
  firebase.initializeApp(cfg);
  if (cfg.recaptchaSiteKey && firebase.appCheck) {
    try { firebase.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider(cfg.recaptchaSiteKey), true); } catch(e) { console.warn("App Check:", e); }
  }
  const fs = firebase.firestore(), auth = firebase.auth();
  const admins = (cfg.admins || []).map(e => String(e).toLowerCase());
  const esAdmin = () => !!(auth.currentUser && admins.includes(String(auth.currentUser.email).toLowerCase()));
  const ready = new Promise(res => { const off = auth.onAuthStateChanged(() => { off(); res(); }); });

  const docSnap = d => ({id: d.id, exists: d.exists, data: () => d.exists ? d.data() : undefined, metadata: {fromCache: d.metadata.fromCache, hasPendingWrites: d.metadata.hasPendingWrites}});
  const err = e => ({code: e && e.code === "permission-denied" ? "invalid_argument" : (e && e.code) || "unavailable", message: e && e.message});
  function docRef(ref){
    return {id: ref.id, path: ref.path,
      get: () => ref.get().then(docSnap),
      set: d => ref.set(d).catch(e => { throw err(e); }),
      update: d => ref.update(d).catch(e => { throw err(e); }),
      delete: () => ref.delete().catch(e => { throw err(e); }),
      onSnapshot: (next, onErr) => ref.onSnapshot(d => next(docSnap(d)), e => onErr && onErr(err(e))),
      collection: p => colRef(ref.collection(p))};
  }
  function colRef(ref){
    return {path: ref.path,
      doc: id => docRef(id ? ref.doc(id) : ref.doc()),
      add: d => ref.add(d).then(r => docRef(r)).catch(e => { throw err(e); }),
      get: () => ref.get().then(q => ({docs: q.docs.map(docSnap), size: q.size, empty: q.empty})),
      onSnapshot: (next, onErr) => ref.onSnapshot(q => next({docs: q.docs.map(docSnap), size: q.size, empty: q.empty, docChanges: () => []}), e => onErr && onErr(err(e)))};
  }
  const db = {doc: p => docRef(fs.doc(p)), collection: p => colRef(fs.collection(p))};
  const user = {
    isOwner: async () => { await ready; return esAdmin(); },
    canEdit: async () => { await ready; return esAdmin(); },
    can: async n => { await ready; return n === "data.write" ? esAdmin() : false; },
    id: async () => { await ready; return auth.currentUser ? auth.currentUser.uid : null; },
  };
  window.BB_FB = {auth, fs, ready, esAdmin, admins, projectId: cfg.projectId};
  window.claude = {use: async name => name === "db" ? db : name === "user" ? user : null};
})();
