/* bioBamboo · comportamiento compartido: tema, header de vidrio, menú, revelados, dock, índice */
(function(){
  "use strict";
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
  const BB = window.BB = window.BB || {};
  BB.reduced = reduced; BB.clamp = clamp;
  BB.frameHooks = BB.frameHooks || []; BB.layoutHooks = BB.layoutHooks || [];
  BB.WA_NUM = "5493462654315";
  BB.wa = t => "https://wa.me/" + BB.WA_NUM + "?text=" + encodeURIComponent(t);

  /* ---------- Tema (claro / noche) ---------- */
  const darkMQ = matchMedia("(prefers-color-scheme: dark)");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : darkMQ.matches;
  function setTheme(t){ root.dataset.theme = t; try { localStorage.setItem("bb-theme", t); } catch(e){} syncThemeBtns(); }
  function syncThemeBtns(){ document.querySelectorAll(".theme-btn").forEach(b => { const d = isDark(); b.setAttribute("aria-pressed", d); b.setAttribute("aria-label", d ? "Cambiar a modo claro" : "Cambiar a modo noche"); b.title = d ? "Modo claro" : "Modo noche"; }); }
  document.querySelectorAll(".theme-btn").forEach(b => b.addEventListener("click", () => setTheme(isDark() ? "light" : "dark")));
  syncThemeBtns();
  darkMQ.addEventListener && darkMQ.addEventListener("change", syncThemeBtns);

  /* ---------- WhatsApp ---------- */
  document.querySelectorAll(".wa-link").forEach(a => a.href = BB.wa(a.dataset.msg || "Hola bioBamboo, quiero hacer una consulta sobre mi rodeo."));

  /* ---------- Luz especular ---------- */
  document.querySelectorAll(".specular").forEach(el => el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px"); el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }));

  /* ---------- Copiar ---------- */
  function selectText(el){ const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  document.querySelectorAll(".copiar").forEach(b => b.addEventListener("click", () => {
    const ok = () => { b.textContent = "Copiado"; setTimeout(() => b.textContent = "Copiar", 1600); };
    try { navigator.clipboard.writeText(b.dataset.copy).then(ok, () => selectText(b.previousElementSibling)); } catch(e) { selectText(b.previousElementSibling); }
  }));

  /* ---------- Formulario de contacto (servicio preseleccionado por enlace o por #ancla) ---------- */
  const sel = document.getElementById("fServ");
  const pick = name => { if (!sel || !name) return; [...sel.options].forEach(o => { if (o.dataset.k === name || o.text === name) sel.value = o.value; }); };
  document.querySelectorAll("[data-servicio]").forEach(a => a.addEventListener("click", () => pick(a.dataset.servicio)));
  if (location.hash.length > 1) pick(location.hash.slice(1));
  const form = document.getElementById("ctForm");
  if (form) form.addEventListener("submit", e => { e.preventDefault(); document.getElementById("formOk").hidden = false; });

  /* =========================================================
     Menú dinámico: un panel que cambia de forma y posición
     ========================================================= */
  const menu = document.getElementById("menu"), ind = menu && menu.querySelector(".menu-ind"), mega = document.getElementById("mega");
  const triggers = menu ? [...menu.querySelectorAll("[data-mega]")] : [];
  let openId = null, closeT = null, lastIdx = -1;
  function moveInd(el){
    if (!ind || !el) return;
    const mr = menu.getBoundingClientRect(), r = el.getBoundingClientRect();
    ind.style.width = r.width + "px"; ind.style.transform = "translateX(" + (r.left - mr.left) + "px)"; ind.style.opacity = 1;
  }
  function openMega(btn){
    clearTimeout(closeT);
    const id = btn.dataset.mega, sec = document.getElementById(id);
    if (!sec) return;
    const idx = triggers.indexOf(btn);
    mega.querySelectorAll(".mega-sec").forEach(s => { const on = s === sec; s.style.setProperty("--dx", (idx > lastIdx ? 30 : -30) + "px"); s.classList.toggle("on", on); s.setAttribute("aria-hidden", !on); });
    triggers.forEach(t => t.setAttribute("aria-expanded", t === btn));
    const w = sec.offsetWidth, h = sec.offsetHeight, br = btn.getBoundingClientRect();
    let left = br.left + br.width/2 - w/2; left = clamp(left, 16, innerWidth - w - 16);
    if (!mega.classList.contains("open")) { mega.style.transition = "none"; mega.style.left = left + "px"; mega.style.width = w + "px"; mega.style.height = h + "px"; mega.offsetWidth; mega.style.transition = ""; }
    mega.style.top = (document.getElementById("chrome").getBoundingClientRect().bottom + 10) + "px";
    mega.style.left = left + "px"; mega.style.width = w + "px"; mega.style.height = h + "px";
    mega.classList.add("open"); openId = id; lastIdx = idx; moveInd(btn);
  }
  function closeMega(){
    mega && mega.classList.remove("open"); openId = null; lastIdx = -1;
    triggers.forEach(t => t.setAttribute("aria-expanded", "false"));
    if (ind) ind.style.opacity = 0;
  }
  const later = () => { clearTimeout(closeT); closeT = setTimeout(closeMega, 180); };
  if (menu) {
    triggers.forEach(t => {
      t.addEventListener("pointerenter", e => { if (e.pointerType !== "touch") openMega(t); });
      t.addEventListener("click", () => { openId === t.dataset.mega ? closeMega() : openMega(t); });
      t.addEventListener("keydown", e => { if (e.key === "ArrowDown") { e.preventDefault(); openMega(t); const f = document.querySelector("#" + t.dataset.mega + " a"); f && f.focus(); } });
    });
    menu.querySelectorAll("a.menu-it").forEach(a => a.addEventListener("pointerenter", () => { closeMega(); moveInd(a); }));
    menu.addEventListener("pointerleave", later);
    mega.addEventListener("pointerenter", () => clearTimeout(closeT));
    mega.addEventListener("pointerleave", later);
    menu.addEventListener("pointerleave", () => { if (!openId && ind) ind.style.opacity = 0; });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && openId) { const t = triggers.find(x => x.dataset.mega === openId); closeMega(); t && t.focus(); } });
    document.addEventListener("pointerdown", e => { if (openId && !mega.contains(e.target) && !menu.contains(e.target)) closeMega(); });
    mega.addEventListener("focusout", e => { if (!mega.contains(e.relatedTarget) && !menu.contains(e.relatedTarget)) closeMega(); });
  }

  /* ---------- Hoja móvil ---------- */
  const sheet = document.getElementById("sheet"), burger = document.getElementById("burger");
  if (sheet && burger) {
    const close = sheet.querySelector(".sheet-close");
    const items = [...sheet.querySelectorAll("details,.sheet-link")];
    items.forEach((el,i) => el.style.transitionDelay = (i*45) + "ms");
    const setOpen = o => { sheet.classList.toggle("open", o); burger.setAttribute("aria-expanded", o); sheet.setAttribute("aria-hidden", !o); document.body.style.overflow = o ? "hidden" : ""; if (o) close.focus(); else burger.focus(); };
    burger.addEventListener("click", () => setOpen(true));
    close.addEventListener("click", () => setOpen(false));
    sheet.addEventListener("click", e => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && sheet.classList.contains("open")) setOpen(false); });
  }

  /* =========================================================
     Anclas: desplazamiento suave que aterriza justo al inicio
     ========================================================= */
  const chromeEl = document.getElementById("chrome");
  let anim = null;
  const easeIO = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
  function targetY(el){
    // una <section> ya trae su propio aire arriba: aterriza exactamente en su borde;
    // un bloque interno (un servicio) queda justo debajo de la barra del menú
    const off = el.tagName === "SECTION" ? 0 : (innerWidth > 1080 ? 100 : 84);   // alto de la barra ya convertida en vidrio + aire
    return Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - off));
  }
  function stopAnim(){ if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
  const goTo = BB.goTo = function(el, opts){
    opts = opts || {};
    stopAnim();
    const from = scrollY, to = targetY(el), d = to - from;
    const done = () => { if (opts.flash) { el.classList.remove("llegada"); void el.offsetWidth; el.classList.add("llegada"); } };
    if (reduced || Math.abs(d) < 4) { scrollTo(0, to); done(); return; }
    const dur = clamp(Math.abs(d)/2.4, 450, 1200), t0 = performance.now();
    anim = {raf:0};
    const step = now => {
      const k = clamp((now - t0)/dur), y = from + (targetY(el) - from)*easeIO(k);
      scrollTo(0, y);
      if (k < 1 && anim) anim.raf = requestAnimationFrame(step); else { anim = null; scrollTo(0, targetY(el)); done(); }
    };
    anim.raf = requestAnimationFrame(step);
  };
  ["wheel","touchstart","keydown"].forEach(ev => addEventListener(ev, stopAnim, {passive:true}));
  const here = location.pathname.split("/").pop() || "index.html";
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank") return;
    const href = a.getAttribute("href");
    const [file, hash] = href.split("#");
    // ancla dentro de la misma página
    if ((file === "" || file === here) && hash) {
      const el = document.getElementById(hash);
      if (el) { e.preventDefault(); goTo(el, {flash: a.hasAttribute("data-flash")}); history.replaceState(null, "", "#" + hash); }
      return;
    }
    // otra página del sitio: transición de salida y luego navegar
    if (/^[\w-]+\.html$/.test(file) && !reduced) {
      e.preventDefault();
      root.classList.add("leaving");
      setTimeout(() => { location.href = href; }, 260);
    }
  });
  addEventListener("pageshow", () => root.classList.remove("leaving"));
  BB.hashLanding = function(){
    if (location.hash.length < 2) return;
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el && !(el.tagName === "OPTION")) scrollTo(0, targetY(el));
  };

  /* ---------- Barra lateral de redes: se esconde mientras se usa la página ---------- */
  const rail = document.getElementById("rail");
  if (rail) {
    const tab = rail.querySelector(".rail-tab"); let quieto, fijada = false, lastS = scrollY;
    const ocultar = o => { rail.classList.toggle("oculta", o); tab.setAttribute("aria-expanded", !o); };
    const movil = () => innerWidth < 700;   // en celular arranca escondida para no tapar el contenido
    if (movil()) ocultar(true);
    addEventListener("scroll", () => {
      if (Math.abs(scrollY - lastS) < 6) return; lastS = scrollY;
      if (!fijada) ocultar(true);
      clearTimeout(quieto); quieto = setTimeout(() => { if (!fijada && !movil()) ocultar(false); }, 1600);
    }, {passive: true});
    tab.addEventListener("click", () => { fijada = false; ocultar(false); });
    rail.addEventListener("pointerenter", () => { clearTimeout(quieto); ocultar(false); });
  }

  /* =========================================================
     Bucle de scroll: vidrio del header, revelados, dock, índice
     ========================================================= */
  const elProg = BB.elProg = (el, start, span) => clamp((innerHeight*start - el.getBoundingClientRect().top)/(innerHeight*span));
  const rvEls = [...document.querySelectorAll("[data-rv]")].map(el => ({el, cur:-1}));
  const secciones = [...document.querySelectorAll("[data-label]")];
  const culm = document.getElementById("culm"), culmFill = document.getElementById("culmFill"), dockLabel = document.getElementById("dockLabel");
  const nudos = culm ? secciones.map((s,i) => { const n = document.createElement("i"); n.style.left = (secciones.length > 1 ? i/(secciones.length-1)*100 : 0) + "%"; culm.appendChild(n); return n; }) : [];
  const tocLinks = [...document.querySelectorAll(".toc a")];
  let lastLabel = "", lastG = -1, lastToc = -1;

  function frame(t){
    // transición progresiva a vidrio al empezar a bajar
    const g = document.body.hasAttribute("data-solid") ? 1 : reduced ? (scrollY > 40 ? 1 : 0) : clamp(scrollY/160);
    if (Math.abs(g - lastG) > .003) { root.style.setProperty("--g", g.toFixed(3)); root.classList.toggle("solid", g > .55); lastG = g; }
    if (!reduced) rvEls.forEach(o => { const tg = elProg(o.el, 1, .3); if (o.cur < 0) o.cur = tg; if (Math.abs(tg - o.cur) > .002) { o.cur += (tg - o.cur)*.18; o.el.style.setProperty("--rv", o.cur.toFixed(3)); } else if (o.cur !== tg) { o.cur = tg; o.el.style.setProperty("--rv", tg); } });
    // dock
    if (culm) {
      const max = root.scrollHeight - innerHeight, gp = max > 0 ? scrollY/max : 0;
      culmFill.style.transform = "scaleX(" + gp + ")";
      let idx = 0; secciones.forEach((s,i) => { if (s.getBoundingClientRect().top < innerHeight*.5) idx = i; });
      nudos.forEach((n,i) => n.classList.toggle("on", i <= idx));
      const lb = secciones[idx] ? secciones[idx].dataset.label : "";
      if (lb !== lastLabel) { lastLabel = lb; dockLabel.textContent = lb; }
    }
    // índice lateral
    if (tocLinks.length) {
      let k = 0; tocLinks.forEach((a,i) => { const s = document.getElementById(a.hash.slice(1)); if (s && s.getBoundingClientRect().top < innerHeight*.4) k = i; });
      if (k !== lastToc) { tocLinks.forEach((a,i) => a.classList.toggle("on", i === k)); lastToc = k;
        const a = tocLinks[k]; if (a && a.parentElement.scrollWidth > a.parentElement.clientWidth) a.parentElement.scrollTo({left: a.offsetLeft - 20, behavior: "smooth"}); }
    }
    BB.frameHooks.forEach(f => f(t));
    if (!reduced) requestAnimationFrame(frame);
  }
  function layout(){ BB.layoutHooks.forEach(f => f()); }
  BB.start = function(){
    root.classList.add("motion");
    layout(); BB.hashLanding();
    if (reduced) { frame(0); addEventListener("scroll", () => frame(0), {passive:true}); }
    else requestAnimationFrame(frame);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (openId) closeMega(); }, 150); });
    addEventListener("load", () => { layout(); BB.hashLanding(); setTimeout(BB.hashLanding, 350); });
    if (document.fonts) document.fonts.ready.then(() => { layout(); BB.hashLanding(); });
  };
  // las páginas sin escenas propias arrancan solas
  if (!document.querySelector("[data-home]")) BB.start();
})();
