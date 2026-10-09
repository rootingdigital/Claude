/* bioBamboo · Home: banner del rodeo, lente de ecografía, ciclo de 365 días, escenas con scroll */
(function(){
  "use strict";
  /* Primer cuadro del video: se ve desde el primer instante, mientras el video carga. */
  const MOVIL = matchMedia("(max-width:700px)").matches;
  const CONEXION = navigator.connection || {}, AHORRO = !!(CONEXION.saveData || /(^|-)2g$/.test(CONEXION.effectiveType || ""));
  const HERO_FOTO = MOVIL ? "assets/hero-poster-m.jpg" : "assets/hero-poster.jpg";
  /* Video del banner: archivo propio (p. ej. "assets/hero.mp4?v=20261009h") y el tramo que se repite en loop, en segundos. */
  // hero.mp4 / hero.webm ya son el tramo 0:25–0:40 del video original (15 s), así que el loop va de 0 a 15
  /* En celulares se usa una versión liviana (854 px, ~1,2 MB); con ahorro de datos o 2G no se carga el video y queda la foto. */
  const HERO_VIDEO = AHORRO ? "" : MOVIL ? "assets/hero-m.mp4?v=20261009h" : (() => { const t = document.createElement("video"); return t.canPlayType('video/webm; codecs="vp9"') ? "assets/hero.webm?v=20261009h" : "assets/hero.mp4?v=20261009h"; })(), VIDEO_DESDE = 0, VIDEO_HASTA = 15;
  const BB = window.BB, reduced = BB.reduced, clamp = BB.clamp, wa = BB.wa;
  const desktopMQ = matchMedia("(min-width:861px)");
  const ease = t => t<.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
  const fmt = n => Math.round(n).toLocaleString("es-AR");
  const hex = h => [1,3,5].map(i => parseInt(h.substr(i,2),16));
  const lerpC = (a,b,t) => { const pa = hex(a), pb = hex(b); return "rgb(" + pa.map((v,i) => Math.round(v + (pb[i]-v)*t)).join(",") + ")"; };
  /* =========================================================
     HERO: video del rodeo; la cámara se acerca con el scroll
     ========================================================= */
  const cv = document.getElementById("campo"), cx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, heroP = 0, heroVisible = true, foto = null;
  if (HERO_FOTO) { const im = new Image(); im.onload = () => { if (!foto) foto = im; }; im.src = HERO_FOTO; }
  /* el video empieza a descargarse cuando la página ya terminó de cargar, para no demorar el primer render */
  const arrancarVideo = () => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.setAttribute("aria-hidden", "true");
    v.addEventListener("loadedmetadata", () => { if (VIDEO_DESDE) v.currentTime = Math.min(VIDEO_DESDE, Math.max(0, v.duration - 1)); });
    v.addEventListener("timeupdate", () => { if (v.currentTime >= VIDEO_HASTA || v.ended) { v.currentTime = VIDEO_DESDE; v.play().catch(() => {}); } });
    v.addEventListener("canplay", () => { foto = v; document.getElementById("inicio").classList.add("con-video"); if (!reduced) v.play().catch(() => {}); }, {once: true});
    v.src = HERO_VIDEO;
  };
  if (HERO_VIDEO) { if (document.readyState === "complete") setTimeout(arrancarVideo, 200); else addEventListener("load", () => setTimeout(arrancarVideo, 200), {once: true}); }
  function seedHero(){
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  }
  function drawHero(t){
    if (!W || !H) return;
    const p = heroP, e = ease(p);
    cx.setTransform(DPR,0,0,DPR,0,0);
    cx.clearRect(0,0,W,H);
    // video (o su primer cuadro); la cámara se acerca con el scroll
    cx.save();
    const zoom = 1 + e*.55; cx.translate(W*.5, H*.95); cx.scale(zoom, zoom); cx.translate(-W*.5, -H*.95 + e*H*.08);
    if (foto) {
      const iw = foto.videoWidth || foto.width, ih = foto.videoHeight || foto.height;
      const s = Math.max(W/iw, H/ih), fw = iw*s, fh = ih*s;
      cx.drawImage(foto, (W-fw)/2, (H-fh)/2, fw, fh);
    }
    cx.restore();
    const v = cx.createLinearGradient(0,H*.3,0,H); v.addColorStop(0,"rgba(18,38,46,0)"); v.addColorStop(1,"rgba(18,38,46,.62)");
    cx.fillStyle = v; cx.fillRect(0,0,W,H);
    const v2 = cx.createLinearGradient(0,0,W*.75,0); v2.addColorStop(0,"rgba(18,38,46,.5)"); v2.addColorStop(1,"rgba(18,38,46,0)");
    cx.fillStyle = v2; cx.fillRect(0,0,W,H);
  }

  /* =========================================================
     Lente de ecografía
     ========================================================= */
  const eco = document.getElementById("eco"), eb = document.getElementById("ecoBase"), eu = document.getElementById("ecoUs"), lente = document.getElementById("lente");
  let lx = .66, ly = .55, userLens = false, ecoW = 0, ecoH = 0;
  function drawEco(){
    const w = eco.clientWidth, h = eco.clientHeight, d = Math.min(devicePixelRatio||1,2);
    if (!w || !h || (w === ecoW && h === ecoH)) return;
    ecoW = w; ecoH = h;
    [eb,eu].forEach(c => { c.width = Math.round(w*d); c.height = Math.round(h*d); });
    let c = eb.getContext("2d"); c.setTransform(d,0,0,d,0,0);
    const bg = c.createLinearGradient(0,0,w,h); bg.addColorStop(0,"#F3F7E8"); bg.addColorStop(1,"#E2EDC6");
    c.fillStyle = bg; c.fillRect(0,0,w,h);
    c.strokeStyle = "rgba(78,112,25,.35)"; c.lineWidth = 1;
    for (let k=0;k<14;k++){ c.beginPath(); for (let x=0;x<=w;x+=6){ const y = h*.1 + k*h*.07 + Math.sin(x*.018 + k*.7)*10 + Math.sin(x*.05+k)*3; x ? c.lineTo(x,y) : c.moveTo(x,y); } c.stroke(); }
    c = eu.getContext("2d"); c.setTransform(1,0,0,1,0,0);
    const img = c.createImageData(eu.width, eu.height);
    const ox = w*.62, oy = -h*.15, R = h*1.15, half = .62, vx = w*.66, vy = h*.55, vr = h*.2;
    for (let y=0;y<img.height;y++) for (let x=0;x<img.width;x++){
      const X = x/d, Y = y/d, i = (y*img.width + x)*4;
      const ang = Math.atan2(Y-oy, X-ox), rr = Math.hypot(X-ox, Y-oy);
      let v = 6;
      if (Math.abs(ang - Math.PI/2) < half && rr < R) {
        v = (40 + Math.random()*90*(.6 + .4*Math.sin(X*.09)*Math.sin(Y*.13))) * Math.max(.35, 1 - (Y/h)*.5);
        const dist = Math.hypot((X-vx)/1.35, Y-vy);
        if (dist < vr) v *= .08; else if (dist < vr*1.18) v = 150 + Math.random()*90;
        const ex = (X-(vx-vr*.25))/(vr*.42), ey = (Y-(vy+vr*.28))/(vr*.26);
        if (ex*ex + ey*ey < 1) v = 150 + Math.random()*80;
      }
      img.data[i] = img.data[i+1] = img.data[i+2] = v; img.data[i+3] = 255;
    }
    c.putImageData(img,0,0);
    c.setTransform(d,0,0,d,0,0);
    c.fillStyle = "rgba(220,230,220,.9)"; c.font = "10px Fira Mono, monospace";
    c.fillText("bB · 5.0 MHz · GEST 35 d", 12, 16); c.fillText("VES 21 mm", w-74, h-12);
  }
  function placeLens(fx, fy){
    const w = eco.clientWidth, h = eco.clientHeight;
    eu.style.clipPath = "circle(60px at " + (fx*w) + "px " + (fy*h) + "px)";
    lente.style.left = (fx*w) + "px"; lente.style.top = (fy*h) + "px";
  }
  eco.addEventListener("pointermove", e => { const r = eco.getBoundingClientRect(); userLens = true; lx = clamp((e.clientX-r.left)/r.width); ly = clamp((e.clientY-r.top)/r.height); placeLens(lx,ly); });
  eco.addEventListener("pointerleave", () => userLens = false);

  /* =========================================================
     Anillo 365
     ========================================================= */
  const arcG = document.getElementById("arcGest"), arcV = document.getElementById("arcVent"), arcP = document.getElementById("arcPuer"), cur = document.getElementById("cursor");
  const diaNum = document.getElementById("diaNum"), diaFase = document.getElementById("diaFase"), hitos = [...document.querySelectorAll(".hito")];
  const marcas = document.getElementById("marcas");
  [[0,"D0"],[30,"D30"],[283,"D283"],[328,"D328"]].forEach(([d,l]) => {
    const a = d/365*Math.PI*2 - Math.PI/2, P = r => [200 + Math.cos(a)*r, 200 + Math.sin(a)*r];
    const [x1,y1] = P(146), [x2,y2] = P(174), [x3,y3] = P(208);
    marcas.insertAdjacentHTML("beforeend", '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#305263" stroke-opacity=".45" stroke-width="1.5"/><text x="'+x3+'" y="'+(y3+4)+'" text-anchor="middle">'+l+'</text>');
  });
  let lastDia = -1;
  function setDia(day){
    day = clamp(day, 0, 365);
    arcG.setAttribute("stroke-dasharray", Math.min(day,283).toFixed(2) + " 365");
    arcV.setAttribute("stroke-dasharray", Math.max(0,day-283).toFixed(2) + " 365");
    arcP.setAttribute("stroke-dasharray", Math.min(Math.max(0,day-283),50).toFixed(2) + " 365");
    const a = day/365*Math.PI*2;
    cur.setAttribute("cx", 200 + Math.cos(a)*160); cur.setAttribute("cy", 200 + Math.sin(a)*160);
    const d = Math.round(day);
    if (d === lastDia) return; lastDia = d;
    diaNum.textContent = d;
    diaFase.textContent = d >= 365 ? "Un ternero por vaca por año" : d < 1 ? "Servicio" : d < 30 ? "Gestación temprana" : d < 283 ? "Gestación" : d < 333 ? "Puerperio" : "Ventana de servicio";
    hitos.forEach(h => h.classList.toggle("on", d >= +h.dataset.from && d <= +h.dataset.to));
  }

  /* =========================================================
     Calculadora y formulario
     ========================================================= */
  const cV = document.getElementById("cVientres"), cD = document.getElementById("cDias"), cP = document.getElementById("cPrecio");
  function calc(){
    const v = Math.max(0, Math.round(+cV.value || 0)), d = +cD.value, p = Math.max(0, +cP.value || 0);
    document.getElementById("cDiasOut").textContent = d + " días";
    const lo = v*(d/21)*15, hi = v*(d/21)*20;
    document.getElementById("cRes").textContent = fmt(lo) + " – " + fmt(hi) + " kg";
    document.getElementById("cPesos").textContent = p ? "Entre $ " + fmt(lo*p) + " y $ " + fmt(hi*p) + " de ternero que no se vende." : "Cargá el precio para verlo en pesos.";
    document.getElementById("cWa").href = wa("Hola bioBamboo. Según la calculadora, con " + v + " vientres que se preñan " + d + " días tarde pierdo entre " + fmt(lo) + " y " + fmt(hi) + " kg de destete. Quiero ver cómo reducirlo.");
  }
  [cV,cD,cP].forEach(i => i.addEventListener("input", calc)); calc();
  document.getElementById("calcForm").addEventListener("submit", e => e.preventDefault());

  /* =========================================================
     Escenas atadas al scroll (scrub reversible, sin librerías)
     ========================================================= */
  const scenes = [...document.querySelectorAll(".scene")].map(el => ({el, cur:0, tgt:0, top:0, len:1, active:true}));
  const track = document.getElementById("track"), celdas = [...document.querySelectorAll(".celda")];
  const isoSvg = document.getElementById("isoBig"), isoPaths = [...isoSvg.querySelectorAll("path")];
  isoPaths.forEach(p => { p._L = p.getTotalLength(); p.style.strokeDasharray = p._L; });
  const numGrid = document.getElementById("numGrid"), cnts = [...document.querySelectorAll("[data-cnt]")];
  const cana = document.getElementById("cana"), pasos = [...document.querySelectorAll(".paso")], canaFill = document.getElementById("canaFill");
  const heroLines = [...document.querySelectorAll(".hero h1 .ln")], heroPanel = document.getElementById("heroPanel"), heroEyebrow = document.getElementById("heroEyebrow");
  let hDist = 0;

  function applyScene(s){
    let p = s.cur; const id = s.el.id;
    if (id === "inicio") {
      if (!desktopMQ.matches) p = 0;   // en celulares el hero no se desvanece: se desplaza normal
      heroP = p;
      heroLines.forEach((l,i) => { const q = clamp((p - .1 - i*.08)/.45); l.style.transform = "translateY(" + (-q*60) + "%)"; l.style.opacity = 1 - q; l.style.filter = q ? "blur(" + (q*8) + "px)" : ""; });
      const q2 = clamp((p - .2)/.45);
      heroPanel.style.transform = "translateY(" + (-q2*40) + "px) scale(" + (1 - q2*.04) + ")"; heroPanel.style.opacity = 1 - q2;
      heroEyebrow.style.opacity = 1 - clamp((p - .05)/.3);
    } else if (id === "ciclo") {
      setDia(clamp((p - .04)/.9) * 365);
    } else if (id === "metodo") {
      canaFill.style.transform = "scaleX(" + clamp(p/.9) + ")";
      pasos.forEach((el,i) => { const q = clamp((p - i*.18)/.14); el.style.opacity = .25 + .75*q; el.style.transform = "translateY(" + ((1-q)*20) + "px)"; el.classList.toggle("off", q < .5); });
    } else if (id === "servicios") {
      const q = clamp((p - .06)/.84);
      track.style.transform = "translateX(" + (-q*hDist).toFixed(1) + "px)";
      const mid = innerWidth/2;
      celdas.forEach(c => { const r = c.getBoundingClientRect(); const f = clamp(1 - Math.abs(r.left + r.width/2 - mid)/(innerWidth*.5)); c.style.setProperty("--f", f.toFixed(3)); });
    }
  }

  BB.layoutHooks.push(function(){
    const vh = innerHeight, desk = desktopMQ.matches;
    scenes.forEach(s => {
      const el = s.el;
      s.active = !reduced && (!el.hasAttribute("data-desktop") || desk);
      el.classList.toggle("is-static", !s.active);
      if (!s.active) { el.style.height = ""; return; }
      if (el.hasAttribute("data-hscroll")) {
        const last = celdas[celdas.length-1];
        track.style.paddingRight = Math.max(0, (innerWidth - last.offsetWidth)/2) + "px";   // la última tarjeta termina centrada
        hDist = Math.max(0, track.scrollWidth - innerWidth);
        el.style.height = (hDist + vh*1.4) + "px";
      } else { const h = parseFloat(el.dataset.h); el.style.height = ((desk ? h : el.id === "inicio" ? 1 : Math.max(1.2, 1 + (h - 1)*.55)) * vh) + "px"; }   // en celulares las escenas son más cortas
    });
    if (!desk || reduced) { track.style.paddingRight = ""; track.style.transform = ""; celdas.forEach(c => c.style.removeProperty("--f")); pasos.forEach(p => { p.style.opacity = ""; p.style.transform = ""; p.classList.remove("off"); }); canaFill.style.transform = ""; }
    scenes.forEach(s => { s.top = s.el.getBoundingClientRect().top + scrollY; s.len = Math.max(1, s.el.offsetHeight - vh); s.cur = s.tgt = clamp((scrollY - s.top)/s.len); if (s.active) applyScene(s); });
    seedHero(); drawEco(); placeLens(lx, ly);
    if (reduced) { setDia(365); drawHero(0); }
  });

  BB.frameHooks.push(function(t){
    scenes.forEach(s => {
      if (!s.active) return;
      s.tgt = clamp((scrollY - s.top)/s.len);
      const diff = s.tgt - s.cur;
      if (Math.abs(diff) < .0004) { if (s.cur !== s.tgt) { s.cur = s.tgt; applyScene(s); } }
      else { s.cur += diff*.14; applyScene(s); }
    });
    if (!reduced) {
      if (!desktopMQ.matches) { const p = BB.elProg(cana, .85, .75); canaFill.style.transform = "scaleY(" + p + ")";
        pasos.forEach((el,i) => { const q = clamp((p - i*.18)/.14); el.style.opacity = .3 + .7*q; el.style.transform = "translateX(" + ((1-q)*14) + "px)"; el.classList.toggle("off", q < .5); }); }
      const ip = BB.elProg(isoSvg, .95, .75);
      isoPaths.forEach((el,i) => { const q = clamp((ip - i*.12)/.6); el.style.strokeDashoffset = el._L*(1-q); const f = clamp((ip - .7 - i*.06)/.2); el.style.fillOpacity = f; el.style.strokeOpacity = 1 - f*.9; });
      const np = ease(BB.elProg(numGrid, .95, .5)); cnts.forEach(el => { const v = Math.round(+el.dataset.cnt * np); if (el._v !== v) { el._v = v; el.textContent = v; } });
      if (!userLens) { lx = .62 + Math.sin(t*.0006)*.22; ly = .52 + Math.sin(t*.0011)*.18; placeLens(lx, ly); }
    } else { isoPaths.forEach(p => { p.style.fillOpacity = 1; p.style.strokeOpacity = 0; p.style.strokeDashoffset = 0; }); }
    if (heroVisible) drawHero(reduced ? 0 : t);
  });

  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; if (heroVisible && reduced) drawHero(0); }).observe(document.querySelector("#inicio .sticky"));
  BB.start();
})();
