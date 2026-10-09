/* bioBamboo · contenido autogestionable (lado público):
   datos de contacto y redes, ventana de promociones, catálogo, equipo y blog.
   Todo se lee de la base del sitio; si no está disponible, queda el contenido fijo de la página. */
(function(){
  "use strict";
  const BB = window.BB = window.BB || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const txt = v => String(v == null ? "" : v);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const byOrden = (a, b) => (+(a.orden ?? 999) - +(b.orden ?? 999)) || txt(a.nombre || a.titulo).localeCompare(txt(b.nombre || b.titulo), "es");
  const ISO = '<svg viewBox="0 0 58 118" aria-hidden="true"><path fill="currentColor" d="M37.6,116.6c9.3-4.3,20.3-20.9,4.2-35.9-.3-.3-18.4-15.6-23.1-20.3-8.3-8.2-5.7-17.5-5.5-18.6.6-1.2,2.1-5,2.3-6.2-7.3.3-24.1,18.4-10,34.6,2.5,2.9,17.8,16.8,21.3,19.9,13.6,8.9,10.3,22.2,7.6,27.9l3.3-1.3Z"/><path fill="currentColor" d="M44.5,77.3c8-3.5,17.6-17.6,4.2-30.6-.3-.3-15.5-13.6-19.5-17.7-7-7.1-4.6-15-4.5-16,.5-1,1.8-4.2,2-5.3-6.2.1-20.8,15.3-9.1,29.4,2.1,2.5,14.9,14.6,17.9,17.3,11.5,7.8,8.5,19.1,6.1,24l2.8-1Z"/></svg>';
  const safeUrl = u => { u = txt(u).trim(); if (!u) return ""; if (/^https?:\/\//i.test(u)) return u; if (/^[\w-]+\.html(#[\w-]+)?$/.test(u) || /^#[\w-]+$/.test(u)) return u; if (/^www\./i.test(u)) return "https://" + u; return ""; };
  const fecha = f => { if (!f) return ""; const d = new Date(f + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("es-AR", {day: "numeric", month: "long", year: "numeric"}); };

  let dbP = null, userP = null;
  BB.getDb = () => dbP || (dbP = (window.claude && window.claude.use) ? window.claude.use("db").catch(() => null) : Promise.resolve(null));
  BB.getUser = () => userP || (userP = (window.claude && window.claude.use) ? window.claude.use("user").catch(() => null) : Promise.resolve(null));
  BB.canEdit = async () => { const u = await BB.getUser(); if (!u) return false; try { return await u.canEdit(); } catch(e) { return false; } };
  const watch = (db, name, cb, onErr) => db.collection(name).onSnapshot(s => cb(s.docs.map(d => Object.assign({id: d.id}, d.data()))), e => onErr && onErr(e));
  const watchDoc = (db, path, cb) => db.doc(path).onSnapshot(s => cb(s.exists ? s.data() : null), () => {});

  /* ---------- Texto con formato simple (blog): ## títulos, - listas, **negrita**, *cursiva*, [enlace](https://…) ---------- */
  function inline(node, s){
    const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g; let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) node.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (m[1]) node.appendChild(el("strong", null, m[1]));
      else if (m[2]) node.appendChild(el("em", null, m[2]));
      else { const u = safeUrl(m[4]); if (u) { const a = el("a", null, m[3]); a.href = u; if (/^https?:/.test(u)) { a.target = "_blank"; a.rel = "noopener"; } node.appendChild(a); } else node.appendChild(document.createTextNode(m[3])); }
      last = re.lastIndex;
    }
    if (last < s.length) node.appendChild(document.createTextNode(s.slice(last)));
  }
  BB.renderTexto = function(dest, src){
    dest.replaceChildren(); let list = null, para = [];
    const flush = () => { if (para.length) { const p = el("p"); inline(p, para.join(" ")); dest.appendChild(p); para = []; } };
    txt(src).split(/\r?\n/).forEach(line => {
      const l = line.trim();
      if (!l) { flush(); list = null; return; }
      let m;
      if ((m = l.match(/^(#{2,3})\s+(.*)$/))) { flush(); list = null; const h = el(m[1].length === 2 ? "h2" : "h3"); inline(h, m[2]); dest.appendChild(h); return; }
      if ((m = l.match(/^[-•]\s+(.*)$/))) { flush(); if (!list) { list = el("ul"); dest.appendChild(list); } const li = el("li"); inline(li, m[1]); list.appendChild(li); return; }
      list = null; para.push(l);
    });
    flush();
  };

  /* ---------- Contacto y redes (en todas las páginas) ---------- */
  const RED_ICON = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.3-.6.6-.6Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h3.6v11H4zM5.8 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM10 9h3.4v1.6c.5-.9 1.7-1.9 3.6-1.9 3.6 0 4.3 2.3 4.3 5.4V20h-3.6v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H10z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.4 2.2 1.7 3.6 4 3.8v3.3a7.6 7.6 0 0 1-4-1.2v6.4A5.7 5.7 0 1 1 10.8 9.6v3.4a2.4 2.4 0 1 0 2.4 2.4V3Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.3l-7.2 8.2L22.4 21h-6.6l-5.2-6.8L4.6 21H1.3l7.7-8.8L.9 3h6.8l4.7 6.2Zm-1.2 16h1.8L6.5 4.9H4.6Z"/></svg>',
  };
  const RED_NOMBRE = {instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", youtube: "YouTube", tiktok: "TikTok", x: "X"};
  function aplicarContacto(c){
    if (!c) return;
    if (c.whatsapp) { const n = txt(c.whatsapp).replace(/\D/g, ""); if (n.length >= 8) { BB.WA_NUM = n; $$(".wa-link").forEach(a => a.href = BB.wa(a.dataset.msg || "Hola bioBamboo, quiero hacer una consulta sobre mi rodeo.")); } }
    [["telefono","telefono"],["email","email"],["zona","zona"],["horario","horario"]].forEach(([k]) => {
      if (!c[k]) return;
      $$('[data-cfg="' + k + '"]').forEach(n => { n.textContent = c[k]; const b = n.nextElementSibling; if (b && b.classList.contains("copiar")) b.dataset.copy = c[k]; });
      $$('[data-cfg-row="' + k + '"]').forEach(n => n.hidden = false);
    });
    if (c.telefono) $$('a[data-cfg-link="telefono"]').forEach(a => { a.href = "tel:+" + txt(c.telefono).replace(/\D/g, ""); a.title = c.telefono; a.setAttribute("aria-label", "Llamar al " + c.telefono); });
    if (c.email) $$('a[data-cfg-link="email"]').forEach(a => { a.href = "mailto:" + txt(c.email).trim(); a.title = c.email; a.setAttribute("aria-label", "Escribir a " + c.email); });
  }
  function aplicarRedes(r){
    const rail = $("#railLinks"), lista = $$('[data-cfg="redes"]');
    if (!r) return;
    const items = Object.keys(RED_NOMBRE).filter(k => safeUrl(r[k]));
    if (!items.length) return;
    if (rail) {
      rail.querySelectorAll("a.red").forEach(a => a.remove());
      const wa = rail.querySelector(".wa-link");
      items.forEach(k => { const a = el("a", "red"); a.href = safeUrl(r[k]); a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", RED_NOMBRE[k]); a.title = RED_NOMBRE[k]; a.innerHTML = RED_ICON[k]; rail.insertBefore(a, wa); });
    }
    $$('[data-cfg="redes-iconos"]').forEach(box => { box.replaceChildren(); items.forEach(k => { const a = el("a", "pie-ic"); a.href = safeUrl(r[k]); a.target = "_blank"; a.rel = "noopener"; a.setAttribute("aria-label", RED_NOMBRE[k]); a.title = RED_NOMBRE[k]; a.innerHTML = RED_ICON[k]; box.appendChild(a); }); });
    $$('[data-cfg="redes-pie"]').forEach(ul => { ul.replaceChildren(); items.forEach(k => { const li = el("li"), a = el("a", null, RED_NOMBRE[k]); a.href = safeUrl(r[k]); a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); ul.appendChild(li); }); });
    lista.forEach(dd => { dd.replaceChildren(); items.forEach((k, i) => { if (i) dd.appendChild(document.createTextNode(" · ")); const a = el("a", null, RED_NOMBRE[k]); a.href = safeUrl(r[k]); a.target = "_blank"; a.rel = "noopener"; dd.appendChild(a); }); });
  }

  /* ---------- Ventana de promociones ---------- */
  function promo(lista){
    const hoy = new Date().toISOString().slice(0, 10), pagina = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
    if (pagina === "admin" || pagina === "login") return;
    const p = lista.filter(x => x.activo !== false && (!x.desde || x.desde <= hoy) && (!x.hasta || x.hasta >= hoy) && (!x.donde || x.donde === "todas" || (x.donde === "inicio" && (pagina === "index" || pagina === ""))))
      .sort(byOrden)[0];
    if (!p) return;
    const clave = "bb-promo-" + p.id + "-" + (p.version || "");
    try { if (sessionStorage.getItem(clave)) return; } catch(e) {}
    setTimeout(() => {
      if ($("#promo")) return;
      const fondo = el("div", "promo-fondo"); fondo.id = "promo";
      const box = el("div", "promo glass"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", p.titulo || "Promoción");
      const cerrar = el("button", "promo-x"); cerrar.type = "button"; cerrar.setAttribute("aria-label", "Cerrar"); cerrar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      if (p.foto) { const im = el("img", "promo-img"); im.src = p.foto; im.alt = ""; box.appendChild(im); }
      const body = el("div", "promo-body");
      if (p.etiqueta) body.appendChild(el("span", "eyebrow", p.etiqueta));
      body.appendChild(el("h2", null, p.titulo || ""));
      if (p.texto) body.appendChild(el("p", null, p.texto));
      const acts = el("div", "promo-acts");
      let destino = txt(p.enlace).trim();
      const a = el("a", "btn btn-wa", p.boton || "Ver más");
      if (!destino || destino.toLowerCase() === "whatsapp") { a.href = BB.wa("Hola bioBamboo, me interesa la promoción: " + (p.titulo || "") + "."); a.target = "_blank"; a.rel = "noopener"; }
      else { const u = safeUrl(destino); a.href = u || "#"; if (/^https?:/.test(u)) { a.target = "_blank"; a.rel = "noopener"; } }
      acts.appendChild(a); body.appendChild(acts);
      box.append(cerrar, body); fondo.appendChild(box); document.body.appendChild(fondo);
      requestAnimationFrame(() => fondo.classList.add("on"));
      const quitar = () => { try { sessionStorage.setItem(clave, "1"); } catch(e) {} fondo.classList.remove("on"); setTimeout(() => fondo.remove(), 300); document.removeEventListener("keydown", esc); };
      const esc = e => { if (e.key === "Escape") quitar(); };
      cerrar.addEventListener("click", quitar); fondo.addEventListener("click", e => { if (e.target === fondo) quitar(); }); a.addEventListener("click", quitar);
      document.addEventListener("keydown", esc); cerrar.focus({preventScroll: true});
    }, 2200);
  }

  /* ---------- Catálogo ---------- */
  function catalogo(db){
    const grid = $("#prodGrid");
    const mUrl = location.pathname.match(/(gallagher|koppert)(\.html)?$/i);
    const secMarca = document.querySelector("#catalogo[data-marca]") || (mUrl ? document.getElementById("catalogo") : null);
    if (!grid && !secMarca) return;
    const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let cats = [], prods = [];
    const catPorId = id => cats.find(c => c.id === id);
    const ancestros = c => { const out = []; let p = c, n = 0; while (p && p.padre && n < 5) { const q = catPorId(p.padre); if (!q || q.id === c.id || out.includes(q)) break; out.unshift(q); p = q; n++; } return out; };
    const linea = id => { const c = catPorId(id); return c ? ancestros(c).concat([c]) : []; };
    const boton = (cont, nombre, activo, fn) => { const b = el("button", null, nombre); b.type = "button"; b.setAttribute("aria-pressed", activo); b.addEventListener("click", fn); cont.appendChild(b); };
    let nTarj = 0;
    function tarjeta(p){
      const ruta = linea(p.categoria).map(c => c.nombre).join(" \u203a ");
      const card = el("article", "prod glass specular"), im = el("div", "prod-img");
      if (p.foto) { const i = el("img"); i.src = p.foto; i.alt = p.nombre || ""; i.loading = "lazy"; im.appendChild(i); } else im.innerHTML = ISO;
      const body = el("div", "prod-body"), meta = el("div", "prod-meta");
      if (p.marca) meta.appendChild(el("span", "marca", p.marca));
      if (ruta) meta.appendChild(el("span", null, ruta));
      if (p.ejemplo) meta.appendChild(el("span", "ej", "Ejemplo"));
      body.append(meta, el("h3", null, p.nombre || "Producto"));
      if (p.descripcion) {
        const d = el("p", "prod-desc", p.descripcion), b = el("button", "ver-mas", "Ver m\u00e1s");
        d.id = "pd" + (++nTarj); d.hidden = true; b.type = "button"; b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", d.id);
        b.addEventListener("click", () => { const abrir = d.hidden; d.hidden = !abrir; b.textContent = abrir ? "Ver menos" : "Ver m\u00e1s"; b.setAttribute("aria-expanded", abrir); });
        body.append(b, d);
      }
      const a = el("a", "btn btn-wa", "Consultar por WhatsApp"); a.target = "_blank"; a.rel = "noopener";
      a.href = BB.wa("Hola bioBamboo, quiero consultar por: " + (p.nombre || "un producto") + (p.marca ? " (" + p.marca + ")" : "") + ".");
      body.appendChild(a); card.append(im, body); return card;
    }
    /* ---- Pagina de marca (Gallagher / Koppert): productos de esa marca ---- */
    if (!grid) {
      const marca = secMarca.dataset.marca || (mUrl[1].charAt(0).toUpperCase() + mUrl[1].slice(1).toLowerCase());
      const wrap = secMarca.querySelector(".wrap") || secMarca, viejo = wrap.querySelector(".estado");
      const g = el("div", "prod-grid"); g.setAttribute("aria-live", "polite");
      const est = el("div", "estado"), eb = el("b", null, "Cargando los productos " + marca + "\u2026"), es = el("span", null, "");
      est.append(eb, es);
      const pie = el("p", "marca-pie"), todo = el("a", "link-arrow", "Ver el cat\u00e1logo completo \u2192"); todo.href = "productos.html"; pie.appendChild(todo);
      if (viejo) viejo.replaceWith(g); else wrap.appendChild(g);
      g.after(est); est.after(pie);
      if (!db) { eb.textContent = "El cat\u00e1logo no est\u00e1 disponible en esta vista."; es.textContent = "Consultanos por WhatsApp y te asesoramos."; return; }
      const pintarMarca = () => {
        const lista = prods.filter(p => p.visible !== false && norm(p.marca).includes(norm(marca))).sort(byOrden);
        g.replaceChildren(); lista.forEach(p => g.appendChild(tarjeta(p)));
        est.hidden = lista.length > 0;
        eb.textContent = "Todav\u00eda no hay productos " + marca + " cargados."; es.textContent = "Consultanos por WhatsApp y te asesoramos sobre la l\u00ednea completa.";
      };
      watch(db, "categorias", d => { cats = d; pintarMarca(); });
      watch(db, "productos", d => { prods = d; pintarMarca(); });
      return;
    }
    /* ---- Catalogo completo: filtro por marca + categoria > subcategoria > segunda subcategoria ---- */
    const filtros = $("#filtros"), estado = $("#prodEstado");
    if (!db) { estado.querySelector("b").textContent = "El cat\u00e1logo no est\u00e1 disponible en esta vista."; estado.querySelector("span").textContent = "Consultanos por WhatsApp y te asesoramos."; return; }
    let sel = ["", "", ""], selMarca = "";
    const pedida = (location.hash.match(/marca=([^&]+)/) || location.search.match(/marca=([^&]+)/) || [])[1];
    if (pedida) selMarca = norm(decodeURIComponent(pedida));
    let marcas = $("#marcas");
    if (!marcas) { marcas = el("div", "filtros marcas"); marcas.id = "marcas"; marcas.setAttribute("aria-label", "Filtrar por marca"); filtros.before(marcas); }
    const filas = [filtros];
    ["subfiltros", "subfiltros2"].forEach((id, k) => { let f = document.getElementById(id); if (!f) { f = el("div", "filtros sub" + (k ? " sub2" : "")); f.id = id; f.setAttribute("aria-label", k ? "Segunda subcategor\u00eda" : "Subcategor\u00edas"); filas[filas.length - 1].after(f); } filas.push(f); });
    function pintar(){
      marcas.replaceChildren(); filas.forEach(f => f.replaceChildren());
      const vis = prods.filter(p => p.visible !== false);
      const listaMarcas = []; vis.forEach(p => { const m = (p.marca || "").trim(); if (m && !listaMarcas.some(x => norm(x) === norm(m))) listaMarcas.push(m); });
      listaMarcas.sort((a, b) => a.localeCompare(b, "es"));
      if (selMarca && !listaMarcas.some(m => norm(m).includes(selMarca) || selMarca.includes(norm(m)))) selMarca = "";
      marcas.hidden = listaMarcas.length < 1;
      if (listaMarcas.length) {
        marcas.appendChild(el("span", "filtros-tit", "Marca"));
        boton(marcas, "Todas", !selMarca, () => { selMarca = ""; pintar(); });
        listaMarcas.forEach(m => boton(marcas, m, !!selMarca && norm(m).includes(selMarca), () => { selMarca = norm(m); pintar(); }));
      }
      const porMarca = vis.filter(p => !selMarca || norm(p.marca).includes(selMarca));
      const conProductos = new Set(); porMarca.forEach(p => linea(p.categoria).forEach(c => conProductos.add(c.id)));
      const hijasDe = id => cats.filter(c => conProductos.has(c.id) && (id ? c.padre === id : ancestros(c).length === 0)).sort(byOrden);
      for (let k = 0; k < 3; k++) {
        const ops = k === 0 ? hijasDe("") : sel[k - 1] ? hijasDe(sel[k - 1]) : [];
        if (sel[k] && !ops.some(c => c.id === sel[k])) sel.fill("", k);
        if (k > 0) filas[k].hidden = !ops.length;
        if (!ops.length) continue;
        const padre = k ? catPorId(sel[k - 1]) : null;
        boton(filas[k], k ? "Todo " + padre.nombre : "Todas las categor\u00edas", !sel[k], () => { sel.fill("", k); pintar(); });
        ops.forEach(c => boton(filas[k], c.nombre, sel[k] === c.id, () => { sel.fill("", k); sel[k] = c.id; pintar(); }));
      }
      const elegido = sel[2] || sel[1] || sel[0];
      const lista = porMarca.filter(p => !elegido || linea(p.categoria).some(c => c.id === elegido)).sort(byOrden);
      grid.replaceChildren(); estado.hidden = lista.length > 0;
      if (!lista.length) { estado.querySelector("b").textContent = "Todav\u00eda no hay productos cargados."; estado.querySelector("span").textContent = "Mientras tanto, consultanos por WhatsApp y te asesoramos."; }
      lista.forEach(p => grid.appendChild(tarjeta(p)));
    }
    addEventListener("hashchange", () => { const m = location.hash.match(/marca=([^&]+)/); if (m) { selMarca = norm(decodeURIComponent(m[1])); sel = ["", "", ""]; pintar(); } });
    watch(db, "categorias", d => { cats = d; pintar(); });
    watch(db, "productos", d => { prods = d; pintar(); });
  }

  /* ---------- Equipo ---------- */
  function equipo(db){
    const grid = $("#equipoGrid"), estado = $("#equipoEstado");
    if (!grid || !db) return;
    watch(db, "equipo", lista => {
      lista = lista.filter(p => p.visible !== false).sort(byOrden);
      grid.replaceChildren(); estado.hidden = lista.length > 0;
      lista.forEach(p => {
        const c = el("article", "persona"), f = el("div", "foto");
        if (p.foto) { const i = el("img"); i.src = p.foto; i.alt = p.nombre || ""; i.loading = "lazy"; f.appendChild(i); }
        else f.appendChild(el("span", null, txt(p.nombre).trim().split(/\s+/).map(w => w[0] || "").slice(0, 2).join("").toUpperCase()));
        c.append(f, el("i", null, p.profesion || ""), el("b", null, p.nombre || ""));
        if (p.detalle) c.appendChild(el("p", null, p.detalle));
        grid.appendChild(c);
      });
    });
  }

  /* ---------- Blog ---------- */
  function blog(db){
    const lista = $("#blogLista"), nota = $("#blogNota"), estado = $("#blogEstado");
    if (!lista) return;
    if (!db) { estado.querySelector("b").textContent = "El blog no está disponible en esta vista."; return; }
    let posts = [];
    const visibles = () => posts.filter(p => p.publicado !== false).sort((a, b) => txt(b.fecha).localeCompare(txt(a.fecha)));
    function mostrar(){
      const slug = decodeURIComponent(location.hash.slice(1));
      const p = slug && visibles().find(x => x.slug === slug);
      $("#blogIndice").hidden = !!p; nota.hidden = !p;
      if (p) {
        nota.replaceChildren();
        const volver = el("a", "link-arrow", "← Volver al blog"); volver.href = "blog.html"; volver.addEventListener("click", e => { e.preventDefault(); history.pushState(null, "", "blog.html"); mostrar(); const sec = $("#notas"); BB.goTo && sec ? BB.goTo(sec) : scrollTo(0, 0); });
        const head = el("header", "nota-head");
        const meta = el("p", "nota-meta"); meta.textContent = [fecha(p.fecha), p.etiqueta].filter(Boolean).join(" · ");
        head.append(volver, meta, el("h1", null, p.titulo || ""));
        if (p.resumen) head.appendChild(el("p", "lead", p.resumen));
        nota.appendChild(head);
        if (p.foto) { const im = el("img", "nota-img"); im.src = p.foto; im.alt = p.titulo || ""; im.title = "Toc\u00e1 para ampliar"; im.addEventListener("click", () => { const lb = el("div", "lightbox"), big = el("img"), x = el("button", "lb-cerrar", "\u00d7"); big.src = p.foto; big.alt = im.alt; x.type = "button"; x.setAttribute("aria-label", "Cerrar"); lb.setAttribute("role", "dialog"); lb.append(big, x); const esc = e => { if (e.key === "Escape") cerrar(); }; const cerrar = () => { lb.remove(); document.removeEventListener("keydown", esc); }; lb.addEventListener("click", cerrar); document.addEventListener("keydown", esc); document.body.appendChild(lb); x.focus(); }); nota.appendChild(im); }
        const cuerpo = el("div", "nota-cuerpo prose"); BB.renderTexto(cuerpo, p.contenido); nota.appendChild(cuerpo);
        const cta = el("div", "nota-cta"); const a = el("a", "btn btn-wa", "Consultar por WhatsApp"); a.target = "_blank"; a.rel = "noopener"; a.href = BB.wa("Hola bioBamboo, leí la nota “" + (p.titulo || "") + "” y quiero consultar."); cta.appendChild(a); nota.appendChild(cta);
        document.title = (p.titulo || "Blog") + " · bioBamboo";
        return;
      }
      document.title = "Blog · bioBamboo";
      const vs = visibles(); lista.replaceChildren(); estado.hidden = vs.length > 0;
      if (!vs.length) estado.querySelector("b").textContent = "Todavía no hay notas publicadas.";
      vs.forEach(p => {
        const a = el("a", "post glass specular"); a.href = "blog.html#" + p.slug;
        a.addEventListener("click", e => { e.preventDefault(); history.pushState(null, "", "#" + p.slug); mostrar(); const sec = $("#notas"); BB.goTo && sec ? BB.goTo(sec) : scrollTo(0, 0); });
        const im = el("div", "prod-img post-img"); if (p.foto) { const i = el("img"); i.src = p.foto; i.alt = p.titulo || ""; i.loading = "lazy"; im.appendChild(i); } else im.innerHTML = ISO;
        const b = el("div", "prod-body"), meta = el("div", "prod-meta");
        if (p.etiqueta) meta.appendChild(el("span", null, p.etiqueta));
        if (p.ejemplo) meta.appendChild(el("span", "ej", "Ejemplo"));
        b.append(meta, el("small", "post-fecha", fecha(p.fecha)), el("h3", null, p.titulo || ""), el("p", null, p.resumen || ""), el("span", "link-arrow", "Leer la nota →"));
        a.append(im, b); lista.appendChild(a);
      });
    }
    addEventListener("popstate", mostrar); addEventListener("hashchange", mostrar);
    watch(db, "blog", d => { posts = d; mostrar(); });
  }

  /* ---------- Arranque ---------- */
  (async () => {
    const db = await BB.getDb();
    catalogo(db); blog(db);
    if (!db) return;
    equipo(db);
    if (await BB.canEdit()) $$(".edit-link").forEach(l => l.hidden = false);
    watchDoc(db, "config/contacto", aplicarContacto);
    watchDoc(db, "config/redes", aplicarRedes);
    watch(db, "promos", promo);
  })();
})();
