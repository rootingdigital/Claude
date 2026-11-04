(function(){
  "use strict";
  function __fn(n){ const f = firebase.app().functions("us-central1").httpsCallable(n); return function(d){ return f(d || {}).then(function(r){ return r.data; }); }; }
  const ROLES = [
    {v: "admin-general", t: "Administrador general"},
    {v: "editor",        t: "Editor de contenido"},
    {v: "consultas",     t: "Consultas"}
  ];

  const $ = s => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  function esAdminGeneralCliente(email){
    const admins = (window.BB_FB && window.BB_FB.admins) || [];
    return admins.includes(String(email || "").toLowerCase());
  }

  async function cargarUsuarios(){
    
    const r = await __fn("listarUsuarios")({});
    return (r && r.usuarios) || [];
  }

  async function crearUsuario(data){ return await __fn("crearUsuario")(data); }
  async function eliminarUsuario(uid){ return await __fn("eliminarUsuario")({uid}); }

  function renderPanel(){
    const cont = document.getElementById("panelUsuarios");
    if (!cont) return;
    cont.replaceChildren();

    const h = el("div", "u-head");
    h.append(el("h2", null, "Usuarios del panel"),
             el("p", "muted", "Dá de alta, listá y eliminá usuarios. Solo visible para el administrador general."));
    cont.appendChild(h);

    const form = el("form", "u-form glass");
    form.innerHTML = "" +
      '<div class="u-row"><label>Email<input type="email" name="email" required autocomplete="off"></label></div>' +
      '<div class="u-row"><label>Nombre (opcional)<input type="text" name="nombre" autocomplete="off"></label></div>' +
      '<div class="u-row"><label>Contraseña (mínimo 6)<input type="text" name="password" minlength="6" required autocomplete="new-password"></label></div>' +
      '<div class="u-row"><label>Rol<select name="rol" required>' +
      ROLES.map(r => '<option value="' + r.v + '">' + r.t + '</option>').join("") +
      '</select></label></div>' +
      '<div class="u-row"><button class="btn btn-wa" type="submit">Crear usuario</button><span class="u-msg" data-msg></span></div>';
    cont.appendChild(form);

    const tablaBox = el("div", "u-tabla");
    tablaBox.innerHTML = '<h3>Usuarios existentes</h3><table><thead><tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Creado</th><th></th></tr></thead><tbody id="uTbody"><tr><td colspan="5" class="muted">Cargando…</td></tr></tbody></table>';
    cont.appendChild(tablaBox);

    form.addEventListener("submit", onCrear);
    refrescarTabla();
  }

  function pintarFila(u, miUid){
    const tr = el("tr");
    tr.append(el("td", null, u.email || ""), el("td", null, u.nombre || ""), el("td", null, (ROLES.find(r=>r.v===u.rol)||{}).t || u.rol || ""), el("td", null, (u.creado||"").slice(0,10)));
    const tdAcc = el("td");
    if (u.uid !== miUid) {
      const b = el("button", "mini peligro", "Eliminar"); b.type = "button";
      b.addEventListener("click", () => onEliminar(u.uid, u.email, b));
      tdAcc.appendChild(b);
    } else { tdAcc.appendChild(el("span", "muted", "(vos)")); }
    const ed = el("button", "mini", "Editar"); ed.type = "button"; ed.addEventListener("click", () => abrirEditor(u, miUid)); tdAcc.insertBefore(ed, tdAcc.firstChild); tr.appendChild(tdAcc);
    return tr;
  }

  async function refrescarTabla(){
    const tbody = document.getElementById("uTbody"); if (!tbody) return;
    try {
      const lista = await cargarUsuarios();
      const miUid = (window.BB_FB && window.BB_FB.auth && window.BB_FB.auth.currentUser) ? window.BB_FB.auth.currentUser.uid : null;
      tbody.replaceChildren();
      if (!lista.length) { const tr = el("tr"); const td = el("td", "muted", "No hay usuarios cargados todavía."); td.colSpan = 5; tr.appendChild(td); tbody.appendChild(tr); return; }
      lista.forEach(u => tbody.appendChild(pintarFila(u, miUid)));
    } catch (e) {
      tbody.replaceChildren();
      const tr = el("tr"); const td = el("td", "muted", "No se pudieron cargar: " + (e.message || e.code || "error")); td.colSpan = 5; tr.appendChild(td); tbody.appendChild(tr);
    }
  }

  async function onCrear(ev){
    ev.preventDefault();
    const f = ev.target, msg = f.querySelector("[data-msg]"), btn = f.querySelector("button[type=submit]");
    msg.textContent = ""; msg.className = "u-msg";
    const data = {
      email: f.email.value.trim().toLowerCase(),
      password: f.password.value,
      rol: f.rol.value,
      nombre: f.nombre.value.trim()
    };
    btn.disabled = true; btn.textContent = "Creando…";
    try {
      await crearUsuario(data);
      msg.textContent = "✓ Usuario creado. Pasale email y contraseña por un canal seguro.";
      msg.className = "u-msg ok";
      f.reset();
      refrescarTabla();
    } catch (e) {
      msg.textContent = "No se pudo crear: " + (e.message || e.code || "error");
      msg.className = "u-msg err";
    } finally {
      btn.disabled = false; btn.textContent = "Crear usuario";
    }
  }

  async function onEliminar(uid, email, btn){
    if (!btn.classList.contains("conf")) {
      btn.classList.add("conf"); btn.textContent = "Confirmar eliminar";
      setTimeout(() => { btn.classList.remove("conf"); btn.textContent = "Eliminar"; }, 4000);
      return;
    }
    btn.disabled = true;
    try { await eliminarUsuario(uid); refrescarTabla(); }
    catch (e) { alert("No se pudo eliminar: " + (e.message || e.code || "error")); btn.disabled = false; btn.classList.remove("conf"); btn.textContent = "Eliminar"; }
  }

  function abrirEditor(u, miUid){
    const yo = u.uid === miUid;
    const fondo = el("div", "u-modal"); const f = el("form", "u-modal-caja");
    f.innerHTML = `<h3>Editar usuario</h3>` +
      `<label>Email<input type="email" name="email" required></label>` +
      `<label>Nombre<input type="text" name="nombre"></label>` +
      `<label>Nueva contraseña (dejar vacío para no cambiarla)<input type="text" name="password" minlength="6" autocomplete="new-password"></label>` +
      `<label>Rol<select name="rol">` + ROLES.map(r => `<option value="${r.v}">${r.t}</option>`).join("") + `</select></label>` +
      `<label class="u-check"><input type="checkbox" name="off"> Acceso deshabilitado</label>` +
      `<div class="u-modal-acc"><button class="btn btn-wa" type="submit">Guardar cambios</button><button class="mini" type="button" data-cancel>Cancelar</button><span class="u-msg" data-msg></span></div>`;
    f.email.value = u.email || ""; f.nombre.value = u.nombre || ""; f.rol.value = u.rol || "editor"; f.off.checked = !!u.deshabilitado;
    if (yo) { f.rol.disabled = true; f.off.disabled = true; }
    fondo.appendChild(f); document.body.appendChild(fondo);
    const cerrar = () => fondo.remove();
    f.querySelector("[data-cancel]").addEventListener("click", cerrar);
    fondo.addEventListener("click", e => { if (e.target === fondo) cerrar(); });
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      const msg = f.querySelector("[data-msg]"), btn = f.querySelector("button[type=submit]");
      const data = {uid: u.uid, email: f.email.value.trim().toLowerCase(), nombre: f.nombre.value.trim()};
      if (f.password.value) data.password = f.password.value;
      if (!yo) { data.rol = f.rol.value; data.deshabilitado = f.off.checked; }
      btn.disabled = true; btn.textContent = "Guardando…"; msg.textContent = ""; msg.className = "u-msg";
      try { await __fn("editarUsuario")(data); cerrar(); refrescarTabla(); }
      catch (e) { msg.textContent = "No se pudo guardar: " + (e.message || e.code || "error"); msg.className = "u-msg err"; btn.disabled = false; btn.textContent = "Guardar cambios"; }
    });
  }

  function activar(){
    if (!window.BB_FB || !window.BB_FB.auth || !window.BB_FB.auth.currentUser) return;
    const email = window.BB_FB.auth.currentUser.email;
    if (window.BB_FB.rol() !== "admin-general") return;
    document.querySelectorAll('[data-admin-only="1"]').forEach(e => e.hidden = false);
    const tabs = document.querySelectorAll('[role="tab"]');
    tabs.forEach(b => b.addEventListener("click", () => {
      if (b.dataset.tab === "acceso") { setTimeout(renderPanel, 0); }
    }));
    if (location.hash === "#acceso") setTimeout(renderPanel, 500);
  }

  function esperarAuth(){
    if (window.BB_FB && window.BB_FB.auth) {
      window.BB_FB.ready.then(() => { if (window.BB_FB.auth.currentUser) activar(); });
    } else { setTimeout(esperarAuth, 300); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", esperarAuth); else esperarAuth();
})();
