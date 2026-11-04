(function(){
  var f = document.getElementById("ctForm"); if (!f) return;
  var ok = document.getElementById("formOk"), err = document.getElementById("formErr");
  f.addEventListener("submit", function(e){
    var pasa = true;
    if (window.grecaptcha && grecaptcha.getResponse) { try { pasa = !!grecaptcha.getResponse(); } catch (x) { pasa = false; } }
    if (pasa) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (ok) { ok.hidden = true; }
    if (err) { err.textContent = "Marc\u00e1 \u00abNo soy un robot\u00bb para enviar la consulta."; err.hidden = false; }
  }, true);
  if (ok && window.MutationObserver) { new MutationObserver(function(){ if (!ok.hidden && window.grecaptcha) { try { grecaptcha.reset(); } catch (x) {} } }).observe(ok, {attributes: true, attributeFilter: ["hidden"]}); }
})();
