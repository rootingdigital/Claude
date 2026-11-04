(function(){
  var f = document.getElementById("loginForm"); if (!f) return;
  f.addEventListener("submit", function(e){
    var ok = true;
    if (window.grecaptcha && grecaptcha.getResponse) { try { ok = !!grecaptcha.getResponse(); } catch (x) { ok = false; } }
    if (ok) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var m = document.getElementById("loginMsg");
    if (m) { m.textContent = "Marc\u00e1 \u00abNo soy un robot\u00bb para continuar."; m.hidden = false; }
  }, true);
})();
