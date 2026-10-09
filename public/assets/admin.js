/* bioBamboo · ingreso de administración y panel de contenido.
   Seguridad real: la base solo acepta escrituras de quien tiene permiso de edición del sitio.
   El usuario y la contraseña (guardada como hash PBKDF2 en un documento que solo leen los editores)
   suman una segunda llave para entrar al panel. */
(function(){
  "use strict";
  const BB = window.BB || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const txt = v => String(v == null ? "" : v);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const byOrden = (a, b) => (+(a.orden ?? 999) - +(b.orden ?? 999)) || txt(a.nombre || a.titulo).localeCompare(txt(b.nombre || b.titulo), "es");
  const SES = "bb-admin";
  const sesion = () => { try { const s = JSON.parse(sessionStorage.getItem(SES) || "null"); return s && s.exp > Date.now() ? s : null; } catch(e) { return null; } };
  const abrirSesion = email => { try { sessionStorage.setItem(SES, JSON.stringify({email, exp: Date.now() + 8*3600e3})); } catch(e) {} };
  const cerrarSesion = () => { try { sessionStorage.removeItem(SES); } catch(e) {} };
  function toast(msg){ const t = $("#toast"); if (!t) return; t.textContent = msg; t.classList.add("on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2400); }

  /* ---------- Hash de contraseña (PBKDF2-SHA256) ---------- */
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  async function derivar(pass, saltHex, iter){
    const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
    return hex(await crypto.subtle.deriveBits({name: "PBKDF2", salt, iterations: iter, hash: "SHA-256"}, key, 256));
  }
  async function credencial(email, pass){
    const salt = hex(crypto.getRandomValues(new Uint8Array(16))), iter = 210000;
    return {email: email.trim().toLowerCase(), salt, iter, hash: await derivar(pass, salt, iter), actualizado: new Date().toISOString()};
  }

  /* ---------- Verificación anti-robots ---------- */
  function captcha(box){
    if (!box) return () => true;
    const q = $(".cap-q", box), inp = $("input", box), otra = $(".cap-otra", box);
    let res = 0, t0 = Date.now();
    const nueva = () => { const a = 2 + Math.floor(Math.random()*8), b = 2 + Math.floor(Math.random()*8), suma = Math.random() < .5; res = suma ? a + b : a*b; q.textContent = suma ? a + " + " + b : a + " × " + b; inp.value = ""; t0 = Date.now(); };
    otra.addEventListener("click", nueva); nueva();
    return () => { const ok = +inp.value === res && Date.now() - t0 > 1200 && !$("#fWeb").value; if (!ok) nueva(); return ok; };
  }

  /* =========================================================
     Página de ingreso
     ========================================================= */
  async function login(){
    const form = $("#loginForm"); if (!form) return;
    const msg = $("#loginMsg"), setup = $("#setupForm");
    const di = t => { msg.textContent = t; msg.hidden = !t; };
    const FB = window.BB_FB, CFG = window.BIOBAMBOO_FIREBASE;
    const diag = $("#loginDiag"), extra = $("#loginExtra");
    const nota = t => { if (diag) { diag.textContent = t; diag.hidden = !t; } };
    if (CFG && !FB) {
      // Versión Firebase con la configuración sin completar
      di("Falta completar assets/firebase-config.js con los datos del proyecto de Firebase. Volvé a ejecutar el script de subida.");
      form.querySelector("button[type=submit]").disabled = true; return;
    }
    if (FB) {
      // Versión Firebase: Firebase Auth valida usuario y contraseña
      await FB.ready;
      if (FB.esAdmin()) { location.replace("admin.html"); return; }
      const admins = FB.admins || [];
      nota("Proyecto: " + (FB.projectId || "?") + (admins.length ? "" : " · sin administradores en firebase-config.js"));
      const okCapF = captcha($("#cap")); let fallosF = 0, bloqueoF = 0;
      const datos = () => ({email: $("#lEmail").value.trim().toLowerCase(), pass: $("#lPass").value});
      const MSG = {
        "auth/invalid-credential": "El email o la contraseña no coinciden con un usuario de Firebase. Si es la primera vez en esta web, tocá «Crear mi contraseña».",
        "auth/invalid-login-credentials": "El email o la contraseña no coinciden con un usuario de Firebase. Si es la primera vez en esta web, tocá «Crear mi contraseña».",
        "auth/user-not-found": "Ese usuario todavía no existe en Firebase. Tocá «Crear mi contraseña».",
        "auth/wrong-password": "La contraseña no es correcta. Si no la recordás, tocá «Olvidé mi contraseña».",
        "auth/invalid-email": "El email no tiene un formato válido.",
        "auth/user-disabled": "Ese usuario está deshabilitado en Firebase (Authentication → Users).",
        "auth/operation-not-allowed": "El ingreso con email y contraseña no está activado. En la consola de Firebase: Authentication → Sign-in method → Correo electrónico/contraseña → Habilitar.",
        "auth/configuration-not-found": "Authentication no está iniciado en este proyecto. En la consola de Firebase: Authentication → Comenzar → activá Correo electrónico/contraseña.",
        "auth/too-many-requests": "Firebase bloqueó temporalmente los intentos. Esperá unos minutos o usá «Olvidé mi contraseña».",
        "auth/network-request-failed": "No hay conexión con Firebase. Revisá internet y volvé a intentar.",
        "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "La apiKey de assets/firebase-config.js no es válida para este proyecto.",
        "auth/invalid-api-key": "La apiKey de assets/firebase-config.js no es válida para este proyecto.",
        "auth/email-already-in-use": "Ese usuario ya existe, así que la contraseña no coincide. Tocá «Olvidé mi contraseña» para cambiarla.",
        "auth/weak-password": "La contraseña es muy débil: usá al menos 10 caracteres.",
        "no-admin": "Ese email no está en la lista de administradores (admins) de assets/firebase-config.js."
      };
      const explicar = err => MSG[err && (err.code || err.message)] || ("No se pudo ingresar (" + ((err && (err.code || err.message)) || "error") + ").");
      const habilitado = email => !admins.length || admins.includes(email);
      form.addEventListener("submit", async e => {
        e.preventDefault(); di("");
        if (Date.now() < bloqueoF) { di("Demasiados intentos. Esperá un minuto."); return; }
        const {email, pass} = datos();
        if (!email || !pass) { di("Completá el usuario y la contraseña."); return; }
        if (!okCapF()) { di("La verificación no es correcta. Probá con la nueva cuenta."); return; }
        if (!habilitado(email)) { di(MSG["no-admin"]); return; }
        const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Verificando…";
        try { await FB.auth.signInWithEmailAndPassword(email, pass); if (!FB.esAdmin()) { await FB.auth.signOut(); throw new Error("no-admin"); } location.href = "admin.html"; }
        catch(err) { console.warn("bioBamboo login:", err); fallosF++; if (fallosF >= 5) { bloqueoF = Date.now() + 60e3; fallosF = 0; } di(explicar(err)); if (extra) extra.hidden = false; }
        finally { btn.disabled = false; btn.textContent = "Ingresar"; }
      });
      if (extra) {
        extra.hidden = false;
        $("#lCrear").addEventListener("click", async () => {
          const {email, pass} = datos(); di("");
          if (!email || !pass) { di("Escribí el email y la contraseña nueva (mínimo 10 caracteres) y tocá «Crear mi contraseña»."); return; }
          if (!habilitado(email)) { di(MSG["no-admin"]); return; }
          if (pass.length < 10) { di("La contraseña nueva necesita al menos 10 caracteres."); return; }
          if (!okCapF()) { di("Resolvé la verificación (la cuenta) y volvé a tocar «Crear mi contraseña»."); return; }
          try { await FB.auth.createUserWithEmailAndPassword(email, pass); location.href = "admin.html"; }
          catch(err) { console.warn("bioBamboo alta:", err); di(explicar(err)); }
        });
        $("#lOlvido").addEventListener("click", async () => {
          const {email} = datos(); di("");
          if (!email) { di("Escribí tu email y tocá «Olvidé mi contraseña»."); return; }
          if (!habilitado(email)) { di(MSG["no-admin"]); return; }
          try { FB.auth.languageCode = "es"; await FB.auth.sendPasswordResetEmail(email); di("Listo: si ese usuario existe, te llegó un correo de Firebase para elegir una contraseña nueva (revisá también spam)."); }
          catch(err) { console.warn("bioBamboo reset:", err); di(explicar(err)); }
        });
      }
      return;
    }
    if (sesion()) { location.replace("admin.html"); return; }
    const db = await BB.getDb();
    if (!db) { di("El ingreso necesita la base de datos del sitio. Abrí la página desde claude.ai con tu cuenta."); form.querySelector("button[type=submit]").disabled = true; return; }
    const editor = await BB.canEdit();
    let acceso = null;
    try { const s = await db.doc("privado/acceso").get(); acceso = s.exists ? s.data() : null; } catch(e) {}
    if (!acceso && editor) { form.hidden = true; setup.hidden = false; }
    else if (!acceso) di("Todavía no hay un administrador creado. Abrí esta página desde claude.ai con la cuenta dueña del sitio para crearlo.");
    else if (!editor) di("Para ingresar en esta versión, abrí la página desde claude.ai con la cuenta dueña del sitio.");
    const okCap = captcha($("#cap")), okCap2 = captcha($("#cap2"));
    let fallos = 0, bloqueo = 0;
    form.addEventListener("submit", async e => {
      e.preventDefault(); di("");
      if (Date.now() < bloqueo) { di("Demasiados intentos. Esperá un minuto."); return; }
      const email = $("#lEmail").value.trim().toLowerCase(), pass = $("#lPass").value;
      if (!email || !pass) { di("Completá el usuario y la contraseña."); return; }
      if (!okCap()) { di("La verificación no es correcta. Probá con la nueva cuenta."); return; }
      const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Verificando…";
      let ok = false;
      try { ok = !!(acceso && editor && acceso.email === email && await derivar(pass, acceso.salt, acceso.iter) === acceso.hash); } catch(err) {}
      btn.disabled = false; btn.textContent = "Ingresar";
      if (ok) { abrirSesion(email); location.href = "admin.html"; return; }
      fallos++; if (fallos >= 5) { bloqueo = Date.now() + 60e3; fallos = 0; }
      di("Usuario o contraseña incorrectos.");
    });
    setup.addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("#sEmail").value.trim(), p1 = $("#sPass").value, p2 = $("#sPass2").value, m = $("#setupMsg");
      const di2 = t => { m.textContent = t; m.hidden = !t; };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return di2("Ingresá un email válido.");
      if (p1.length < 10) return di2("La contraseña necesita al menos 10 caracteres.");
      if (p1 !== p2) return di2("Las contraseñas no coinciden.");
      if (!okCap2()) return di2("La verificación no es correcta. Probá con la nueva cuenta.");
      try { await db.doc("privado/acceso").set(await credencial(email, p1)); abrirSesion(email.toLowerCase()); location.href = "admin.html"; }
      catch(err) { di2("No se pudo guardar el acceso (" + (err.code || "error") + ")."); }
    });
  }

  /* =========================================================
     Panel
     ========================================================= */
  function achicar(file, max){
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        let q = .84, out = c.toDataURL("image/jpeg", q);
        while (out.length > 180000 && q > .4) { q -= .1; out = c.toDataURL("image/jpeg", q); }
        res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("No se pudo leer la imagen.")); };
      img.src = url;
    });
  }
  const slugify = s => txt(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "nota";
  const hoy = () => new Date().toISOString().slice(0, 10);

  const ESQ = {
    productos: {t: "Producto", col: "productos", campos: [
      {k: "nombre", l: "Nombre", t: "text", req: true}, {k: "categoria", l: "Categoría", t: "cat"},
      {k: "marca", l: "Marca", t: "text", ph: "Gallagher, Koppert…"}, {k: "descripcion", l: "Descripción", t: "area"},
      {k: "foto", l: "Foto", t: "foto", max: 900}, {k: "orden", l: "Orden", t: "num"}, {k: "visible", l: "Mostrar en la web", t: "chk"}],
      sub: p => [p.marca, p.descripcion].filter(Boolean).join(" · ")},
    categorias: {t: "Categoría", col: "categorias", campos: [
      {k: "nombre", l: "Nombre", t: "text", req: true}, {k: "padre", l: "Es subcategor\u00eda de", t: "padre", ayuda: "Dejalo en \u00abNinguna\u00bb para que sea una categor\u00eda principal. Eleg\u00ed una categor\u00eda para que esta quede como subcategor\u00eda suya."}, {k: "descripcion", l: "Descripción", t: "area"}, {k: "orden", l: "Orden", t: "num"}],
      sub: c => c.descripcion || ""},
    equipo: {t: "Integrante", col: "equipo", campos: [
      {k: "nombre", l: "Nombre y apellido", t: "text", req: true},
      {k: "profesion", l: "Profesión", t: "text", req: true, ph: "Médico veterinario, especialista en nutrición bovina…"},
      {k: "detalle", l: "Especialidad o reseña breve", t: "area"}, {k: "foto", l: "Foto", t: "foto", max: 640},
      {k: "orden", l: "Orden", t: "num"}, {k: "visible", l: "Mostrar en la web", t: "chk"}],
      sub: p => p.profesion || ""},
    promos: {t: "Promoción", col: "promos", campos: [
      {k: "titulo", l: "Título", t: "text", req: true}, {k: "etiqueta", l: "Etiqueta corta", t: "text", ph: "Promo de temporada, Nuevo producto…"},
      {k: "texto", l: "Texto", t: "area"}, {k: "foto", l: "Imagen", t: "foto", max: 900},
      {k: "boton", l: "Texto del botón", t: "text", ph: "Ver más"},
      {k: "enlace", l: "Destino del botón", t: "text", ph: "whatsapp, productos.html o https://…"},
      {k: "donde", l: "Mostrar en", t: "sel", op: [["todas","Todas las páginas"],["inicio","Solo el inicio"]]},
      {k: "desde", l: "Desde", t: "date", half: 1}, {k: "hasta", l: "Hasta", t: "date", half: 1},
      {k: "orden", l: "Prioridad (1 = primera)", t: "num"}, {k: "activo", l: "Activa", t: "chk"}],
      sub: p => [p.activo === false ? "Pausada" : "Activa", p.desde || p.hasta ? (p.desde || "…") + " a " + (p.hasta || "…") : "sin fechas"].join(" · ")},
    blog: {t: "Nota", col: "blog", campos: [
      {k: "titulo", l: "Título", t: "text", req: true}, {k: "resumen", l: "Resumen (aparece en el listado)", t: "area"},
      {k: "contenido", l: "Contenido", t: "area", big: 1, ayuda: "## para subtítulos, - para listas, **negrita**, [texto](https://enlace)"},
      {k: "foto", l: "Imagen principal", t: "foto", max: 1200},
      {k: "etiqueta", l: "Tema", t: "text", ph: "Reproducción, Sanidad…", half: 1}, {k: "fecha", l: "Fecha", t: "date", half: 1},
      {k: "publicado", l: "Publicada", t: "chk"}],
      sub: p => [p.publicado === false ? "Borrador" : "Publicada", p.fecha, p.etiqueta].filter(Boolean).join(" · ")},
    contacto: {t: "Datos de contacto", doc: "config/contacto", campos: [
      {k: "telefono", l: "Teléfono (como se muestra)", t: "text", ph: "+54 9 3462 654315"},
      {k: "whatsapp", l: "WhatsApp (solo números, con código de país)", t: "text", ph: "5493462654315"},
      {k: "email", l: "Email", t: "text"}, {k: "zona", l: "Zona de trabajo", t: "text"}, {k: "horario", l: "Horario de atención", t: "text"}],
      ayuda: "Estos datos reemplazan a los del pie, la página de contacto y todos los botones de WhatsApp."},
    redes: {t: "Redes sociales", doc: "config/redes", campos: [
      {k: "instagram", l: "Instagram", t: "text", ph: "https://www.instagram.com/…"}, {k: "facebook", l: "Facebook", t: "text", ph: "https://www.facebook.com/…"},
      {k: "linkedin", l: "LinkedIn", t: "text"}, {k: "youtube", l: "YouTube", t: "text"}, {k: "tiktok", l: "TikTok", t: "text"}, {k: "x", l: "X (Twitter)", t: "text"}],
      ayuda: "Las redes con enlace aparecen en la barra lateral de vidrio y en la página de contacto. Dejá vacía la que no uses."},
    acceso: {t: "Usuario administrador", acceso: true},
  };

  async function panel(){
    const root = $("#admin"); if (!root) return;
    const aviso = $("#admAviso");
    const FB = window.BB_FB;
    if (FB) await FB.ready;
    const s = FB ? (FB.esAdmin() ? {email: FB.auth.currentUser.email} : null) : sesion();
    if (!s) { location.replace("login.html"); return; }
    const db = await BB.getDb();
    if (!db) { aviso.textContent = "El panel necesita la base de datos del sitio. Abrí la página desde claude.ai con tu cuenta."; return; }
    if (!(await BB.canEdit())) { cerrarSesion(); aviso.textContent = "Tu cuenta no tiene permiso de edición en este sitio."; return; }
    aviso.hidden = true; $("#admApp").hidden = false; $("#admUser").textContent = s.email;
    $("#admSalir").addEventListener("click", async () => { cerrarSesion(); if (FB) await FB.auth.signOut(); location.href = "login.html"; });
    if (FB) {
      // contenido inicial: se ofrece cuando la base de Firebase está vacía
      const sb = $("#admSeed");
      if (sb) {
        db.collection("productos").onSnapshot(sn => { sb.hidden = sn.docs.length > 0; }, () => {});
        sb.addEventListener("click", async () => {
          sb.disabled = true; sb.textContent = "Cargando…";
          try {
            const seed = await (await fetch("assets/seed.json")).json();
            for (const col of Object.keys(seed)) for (const id of Object.keys(seed[col])) await db.collection(col).doc(id).set(seed[col][id]);
            toast("Contenido inicial cargado"); sb.hidden = true;
          } catch(err) { toast("No se pudo cargar (" + (err.code || err.message || "error") + ")"); sb.disabled = false; sb.textContent = "Cargar contenido inicial"; }
        });
      }
    }

    const data = {productos: [], categorias: [], equipo: [], promos: [], blog: []}, docs = {contacto: null, redes: null};
    let tab = (location.hash || "#productos").slice(1); if (!ESQ[tab]) tab = "productos";
    let editando = null, fotoNueva;
    const tabs = [...root.querySelectorAll(".tabs button")];
    const lista = $("#admLista"), form = $("#admForm"), campos = $("#admCampos"), tit = $("#admTit"), btnNuevo = $("#admNuevo"), btnCancel = $("#admCancel");

    function selTab(t){ tab = t; editando = null; tabs.forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t)); history.replaceState(null, "", "#" + t); pintarLista(); armarForm(null); }
    tabs.forEach(b => b.addEventListener("click", () => selTab(b.dataset.tab)));

    function pintarLista(){
      tabs.forEach(b => { const n = b.querySelector("span"); if (n && data[b.dataset.tab]) n.textContent = data[b.dataset.tab].length; });
      const E = ESQ[tab]; lista.replaceChildren();
      if (E.doc || E.acceso) {
        const v = el("div", "estado"); v.append(el("b", null, E.t), el("span", null, E.acceso ? "Cambiá el email o la contraseña con la que se entra al panel. La contraseña se guarda cifrada." : E.ayuda));
        lista.appendChild(v); return;
      }
      const items = tab === "categorias" ? arbol() : data[tab].slice().sort(tab === "blog" ? (a, b) => txt(b.fecha).localeCompare(txt(a.fecha)) : byOrden);
      if (!items.length) { const v = el("div", "estado"); v.append(el("b", null, "Todavía no hay registros."), el("span", null, "Usá el formulario para cargar el primero.")); lista.appendChild(v); return; }
      items.forEach(it => {
        const f = el("div", "fila"), th = el("div", "th"), nombre = it.nombre || it.titulo || "Sin nombre";
        if (it.foto) { const i = el("img"); i.src = it.foto; i.alt = ""; th.appendChild(i); } else th.textContent = txt(nombre).slice(0, 1).toUpperCase();
        const tx = el("div"); tx.append(el("b", null, nombre + (it.visible === false ? " (oculto)" : "") + (it.ejemplo ? " · ejemplo" : "")));
        let sub = E.sub(it);
        if (tab === "productos") { const c = catPorId(it.categoria); if (c) sub = rutaCat(c) + (sub ? " · " + sub : ""); }
        if (tab === "categorias") {
          const n = data.productos.filter(p => p.categoria === it.id).length, hs = hijas(it.id).length, nv = nivel(it);
          sub = (nv ? (nv === 1 ? "Subcategor\u00eda de " : "Segunda subcategor\u00eda de ") + rutaCat(catPorId(it.padre)) + " \u00b7 " : "")
            + (hs ? hs + (hs === 1 ? " subcategor\u00eda \u00b7 " : " subcategor\u00edas \u00b7 ") : "")
            + n + (n === 1 ? " producto" : " productos") + (sub ? " \u00b7 " + sub : "");
          if (nv) f.classList.add(nv === 1 ? "sub" : "sub2");
        }
        tx.appendChild(el("small", null, sub));
        const acc = el("div", "acc"), ed = el("button", "mini", "Editar"), del = el("button", "mini peligro", "Borrar");
        ed.type = del.type = "button";
        ed.addEventListener("click", () => { armarForm(it); form.scrollIntoView({behavior: "smooth", block: "start"}); });
        del.addEventListener("click", async () => {
          if (!del.classList.contains("conf")) {
            let m = "¿Confirmás?";
            if (tab === "categorias") { const n = data.productos.filter(p => p.categoria === it.id).length, hs = hijas(it.id).length; if (hs) m = "Tiene " + hs + " subcategor\u00edas (quedan como principales). \u00bfBorrar?"; if (n) m = "Tiene " + n + " productos. ¿Borrar?"; }
            del.classList.add("conf"); del.textContent = m; setTimeout(() => { del.classList.remove("conf"); del.textContent = "Borrar"; }, 4000); return;
          }
          try { await db.collection(E.col).doc(it.id).delete(); toast("Borrado"); if (editando && editando.id === it.id) armarForm(null); }
          catch(e) { toast("No se pudo borrar (" + (e.code || "error") + ")"); }
        });
        acc.append(ed, del); f.append(th, tx, acc); lista.appendChild(f);
      });
    }

    function armarForm(it){
      const E = ESQ[tab]; fotoNueva = undefined;
      if (E.doc) it = docs[tab] || {};
      editando = it; btnNuevo.hidden = btnCancel.hidden = !!(E.doc || E.acceso);
      if (!E.doc && !E.acceso) btnCancel.hidden = !it;
      tit.textContent = E.doc || E.acceso ? E.t : (it ? "Editar " : "Nuevo ") + E.t.toLowerCase();
      campos.replaceChildren();
      if (E.acceso) {
        [["aEmail","Email de ingreso","email"],["aPass","Nueva contraseña (mínimo 10 caracteres)","password"],["aPass2","Repetir contraseña","password"]].forEach(([id, l, t]) => {
          const w = el("div", "campo"), lb = el("label", null, l), i = el("input"); lb.htmlFor = id; i.id = id; i.type = t; i.autocomplete = t === "email" ? "username" : "new-password";
          if (t === "email") { i.value = FB ? FB.auth.currentUser.email : (sesion() || {}).email || ""; if (FB) i.disabled = true; } w.append(lb, i); campos.appendChild(w);
        });
        return;
      }
      let fila = null;
      E.campos.forEach(c => {
        const id = "f_" + tab + "_" + c.k; let v = it ? it[c.k] : undefined;
        if (v === undefined && !it) { if (c.t === "date" && c.k === "fecha") v = hoy(); }
        if (c.t === "chk") { const w = el("label", "chk"), i = el("input"); i.type = "checkbox"; i.id = id; i.checked = v !== false; w.append(i, document.createTextNode(c.l)); campos.appendChild(w); return; }
        const w = el("div", "campo"), lb = el("label", null, c.l + (c.req ? " *" : "")); lb.htmlFor = id; w.appendChild(lb);
        let i;
        if (c.t === "area") { i = el("textarea"); i.value = v || ""; if (c.big) i.rows = 14; }
        else if (c.t === "cat") { i = el("select"); i.hidden = true; lb.hidden = true; llenarCats(i, v); const box = el("div", "cascada"); i._box = box; w.appendChild(box); cascada(box, i); }
        else if (c.t === "padre") { i = el("select"); llenarPadres(i, v); }
        else if (c.t === "sel") { i = el("select"); c.op.forEach(([k, l]) => { const o = el("option", null, l); o.value = k; i.appendChild(o); }); i.value = v || c.op[0][0]; }
        else if (c.t === "foto") {
          const prev = el("div", "foto-prev"), th = el("div", "th");
          const pinta = src => { th.replaceChildren(); if (src) { const im = el("img"); im.src = src; im.alt = ""; th.appendChild(im); } else th.textContent = "Sin imagen"; };
          pinta(v); i = el("input"); i.type = "file"; i.accept = "image/png,image/jpeg,image/webp"; i.id = id;
          i.addEventListener("change", async () => { const f = i.files[0]; if (!f) return; try { fotoNueva = await achicar(f, c.max); pinta(fotoNueva); } catch(e) { toast(e.message); } });
          const quitar = el("button", "mini", "Quitar imagen"); quitar.type = "button"; quitar.addEventListener("click", () => { fotoNueva = ""; i.value = ""; pinta(""); });
          const col = el("div"); col.style.cssText = "display:grid;gap:8px;min-width:0"; col.append(i, quitar); prev.append(th, col); w.appendChild(prev); campos.appendChild(w); return;
        }
        else { i = el("input"); i.type = c.t === "num" ? "number" : c.t === "date" ? "date" : "text"; if (c.ph) i.placeholder = c.ph; i.value = v == null ? "" : v; }
        i.id = id; if (c.req) i.required = true; w.appendChild(i);
        if (c.ayuda) w.appendChild(el("small", "ayuda", c.ayuda));
        if (c.half) { if (!fila) { fila = el("div", "fila2"); campos.appendChild(fila); } fila.appendChild(w); if (fila.children.length === 2) fila = null; }
        else { fila = null; campos.appendChild(w); }
      });
    }
    /* Categorias en arbol: principal > subcategoria > segunda subcategoria (maximo 2 niveles de subcategoria) */
    const catPorId = id => data.categorias.find(c => c.id === id);
    const ancestros = c => { const out = []; let p = c, n = 0; while (p && p.padre && n < 5) { const q = catPorId(p.padre); if (!q || q.id === c.id || out.includes(q)) break; out.unshift(q); p = q; n++; } return out; };
    const nivel = c => ancestros(c).length;
    const esPrincipal = c => nivel(c) === 0;
    const hijas = id => data.categorias.filter(c => c.padre === id && c.id !== id && catPorId(id)).sort(byOrden);
    const altura = c => { const hs = hijas(c.id); return hs.length ? 1 + Math.max(...hs.map(altura)) : 0; };
    const desciende = (c, de) => ancestros(c).some(a => a.id === de);
    const arbol = () => { const out = [], ver = (c, d) => { if (d > 2 || out.includes(c)) return; out.push(c); hijas(c.id).forEach(h => ver(h, d + 1)); }; data.categorias.filter(esPrincipal).sort(byOrden).forEach(c => ver(c, 0)); return out; };
    const rutaCat = c => c ? ancestros(c).concat([c]).map(x => x.nombre).join(" \u203a ") : "";
    const sangria = c => "\u2003".repeat(nivel(c)) + (nivel(c) ? "\u203a " : "");
    function llenarPadres(sel, v){
      sel.replaceChildren(); const o0 = el("option", null, "Ninguna (categor\u00eda principal)"); o0.value = ""; sel.appendChild(o0);
      const yo = editando && editando.id ? catPorId(editando.id) : null, alto = yo ? altura(yo) : 0;
      arbol().filter(c => nivel(c) + 1 + alto <= 2 && (!yo || (c.id !== yo.id && !desciende(c, yo.id)))).forEach(cat => { const o = el("option", null, sangria(cat) + cat.nombre); o.value = cat.id; sel.appendChild(o); });
      sel.value = v && [...sel.options].some(o => o.value === v) ? v : "";
    }
    /* Selector en cascada para productos: Categoria > Subcategoria > Segunda subcategoria, con alta rapida */
    function cascada(box, sel){
      box.replaceChildren();
      const actual = catPorId(sel.value), camino = actual ? ancestros(actual).concat([actual]) : [];
      const titulos = ["Categor\u00eda", "Subcategor\u00eda (opcional)", "Segunda subcategor\u00eda (opcional)"];
      for (let k = 0; k < 3; k++) {
        const padreId = k ? (camino[k - 1] ? camino[k - 1].id : "") : "";
        if (k && !padreId) break;
        const ops = k ? hijas(padreId) : data.categorias.filter(esPrincipal).sort(byOrden);
        const fila = el("div", "cas-fila"), lb = el("label", null, titulos[k]), s = el("select");
        s.id = "cas_" + k; lb.htmlFor = s.id;
        const o0 = el("option", null, k ? "Ninguna" : "Sin categor\u00eda"); o0.value = ""; s.appendChild(o0);
        ops.forEach(c => { const o = el("option", null, c.nombre); o.value = c.id; s.appendChild(o); });
        s.value = camino[k] ? camino[k].id : "";
        s.addEventListener("change", () => { sel.value = s.value || padreId; cascada(box, sel); });
        const nuevo = el("button", "mini", k ? "+ Nueva" : "+ Nueva"); nuevo.type = "button";
        nuevo.title = k ? "Crear una subcategor\u00eda dentro de " + camino[k - 1].nombre : "Crear una categor\u00eda principal";
        const crear = el("div", "cas-nueva"), inp = el("input"), ok = el("button", "mini ok", "Crear"), no = el("button", "mini", "Cancelar");
        inp.type = "text"; inp.placeholder = k ? "Nombre de la subcategor\u00eda" : "Nombre de la categor\u00eda"; ok.type = no.type = "button"; crear.hidden = true; crear.append(inp, ok, no);
        nuevo.addEventListener("click", () => { crear.hidden = false; inp.focus(); });
        no.addEventListener("click", () => { crear.hidden = true; inp.value = ""; });
        const hacer = async () => {
          const nombre = inp.value.trim(); if (!nombre) { inp.focus(); return; }
          ok.disabled = true;
          try {
            const ref = await db.collection("categorias").add({nombre, padre: padreId, descripcion: "", orden: 999});
            if (!catPorId(ref.id)) data.categorias.push({id: ref.id, nombre, padre: padreId, descripcion: "", orden: 999});
            llenarCats(sel, ref.id); cascada(box, sel); toast("Creada: " + nombre);
          } catch(e) { toast("No se pudo crear (" + (e.code || "error") + ")"); ok.disabled = false; }
        };
        ok.addEventListener("click", hacer);
        inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); hacer(); } });
        const linea = el("div", "cas-linea"); linea.append(s, nuevo);
        fila.append(lb, linea, crear); box.appendChild(fila);
      }
    }
    function llenarCats(sel, v){
      sel.replaceChildren(); const o0 = el("option", null, "Sin categor\u00eda"); o0.value = ""; sel.appendChild(o0);
      arbol().forEach(cat => { const o = el("option", null, sangria(cat) + cat.nombre); o.value = cat.id; sel.appendChild(o); });
      sel.value = v || "";
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const E = ESQ[tab], btn = form.querySelector("[type=submit]");
      if (E.acceso && FB) {
        const p1 = $("#aPass").value, p2 = $("#aPass2").value;
        if (p1.length < 10) return toast("La contraseña necesita al menos 10 caracteres");
        if (p1 !== p2) return toast("Las contraseñas no coinciden");
        btn.disabled = true;
        try { await FB.auth.currentUser.updatePassword(p1); toast("Contraseña actualizada"); armarForm(null); }
        catch(err) { toast(err.code === "auth/requires-recent-login" ? "Por seguridad, cerrá sesión y volvé a entrar antes de cambiarla" : "No se pudo cambiar (" + (err.code || "error") + ")"); }
        finally { btn.disabled = false; }
        return;
      }
      if (E.acceso) {
        const email = $("#aEmail").value.trim(), p1 = $("#aPass").value, p2 = $("#aPass2").value;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast("Ingresá un email válido");
        if (p1.length < 10) return toast("La contraseña necesita al menos 10 caracteres");
        if (p1 !== p2) return toast("Las contraseñas no coinciden");
        btn.disabled = true;
        try { await db.doc("privado/acceso").set(await credencial(email, p1)); abrirSesion(email.toLowerCase()); $("#admUser").textContent = email.toLowerCase(); toast("Acceso actualizado"); armarForm(null); }
        catch(err) { toast("No se pudo guardar (" + (err.code || "error") + ")"); }
        finally { btn.disabled = false; }
        return;
      }
      const body = E.doc ? Object.assign({}, docs[tab] || {}) : {};
      for (const c of E.campos) {
        const i = document.getElementById("f_" + tab + "_" + c.k);
        if (c.t === "foto") { body[c.k] = fotoNueva !== undefined ? fotoNueva : (editando && editando[c.k]) || ""; continue; }
        if (c.t === "chk") { body[c.k] = i.checked; continue; }
        if (c.t === "num") { body[c.k] = i.value === "" ? 999 : +i.value; continue; }
        body[c.k] = i.value.trim();
        if (c.req && !body[c.k]) { i.focus(); toast("Completá " + c.l.toLowerCase()); return; }
      }
      if (tab === "blog") {
        let slug = editando && editando.slug ? editando.slug : slugify(body.titulo), n = 2;
        while (data.blog.some(p => p.slug === slug && (!editando || p.id !== editando.id))) slug = slugify(body.titulo) + "-" + n++;
        body.slug = slug;
      }
      if (tab === "promos") body.version = Date.now();
      if (tab === "categorias" && body.padre) {
        const pa = catPorId(body.padre), yo = editando ? catPorId(editando.id) : null;
        if (yo && (body.padre === yo.id || desciende(pa, yo.id))) { toast("Una categor\u00eda no puede depender de s\u00ed misma ni de sus subcategor\u00edas"); return; }
        if (pa && nivel(pa) + 1 + (yo ? altura(yo) : 0) > 2) { toast("M\u00e1ximo dos niveles de subcategor\u00eda"); return; }
      }
      if (editando && editando.ejemplo) body.ejemplo = false;
      btn.disabled = true;
      try {
        if (E.doc) await db.doc(E.doc).set(body);
        else if (editando) await db.collection(E.col).doc(editando.id).set(body);
        else await db.collection(E.col).add(body);
        toast(E.doc || editando ? "Cambios guardados" : "Guardado");
        if (!E.doc) armarForm(null);
      } catch(err) {
        toast(err.code === "quota_exceeded" ? "Se llenó el espacio disponible. Borrá registros que no uses." : "No se pudo guardar (" + (err.code || "error") + ")");
      } finally { btn.disabled = false; }
    });
    btnNuevo.addEventListener("click", () => armarForm(null));
    btnCancel.addEventListener("click", () => armarForm(null));

    Object.keys(data).forEach(n => db.collection(n).onSnapshot(sn => {
      data[n] = sn.docs.map(d => Object.assign({id: d.id}, d.data())); pintarLista();
      if (n === "categorias") { const sel = document.getElementById("f_productos_categoria"); if (sel) llenarCats(sel, sel.value || (editando && editando.categoria)); if (sel && sel._box) cascada(sel._box, sel); const sp = document.getElementById("f_categorias_padre"); if (sp) llenarPadres(sp, sp.value || (editando && editando.padre)); }
    }, () => {}));
    Object.keys(docs).forEach(n => db.doc(ESQ[n].doc).onSnapshot(sn => { docs[n] = sn.exists ? sn.data() : null; if (tab === n) armarForm(null); }, () => {}));
    selTab(tab);
  }

  login(); panel();
})();
