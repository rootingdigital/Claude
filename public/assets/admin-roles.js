(function(){
  "use strict";
  function esperarPanel(cb){ var app = document.getElementById("admApp"); if (app && !app.hidden) cb(); else setTimeout(function(){ esperarPanel(cb); }, 250); }
  function aplicar(){
    var F = window.BB_FB; if (!F) return;
    F.ready.then(function(){
      var rol = F.rol(); if (!rol || rol === "admin-general") return;
      var ok = rol === "consultas" ? ["consultas", "acceso"] : ["consultas","productos","categorias","equipo","promos","blog","contacto","redes","acceso"];
      esperarPanel(function(){
        document.querySelectorAll("[role=tab]").forEach(function(b){ if (ok.indexOf(b.dataset.tab) === -1) b.style.display = "none"; });
        var h = (location.hash || "").slice(1);
        if (ok.indexOf(h || "productos") === -1) { var t = document.querySelector("[role=tab][data-tab=" + ok[0] + "]"); if (t) t.click(); }
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aplicar); else aplicar();
})();