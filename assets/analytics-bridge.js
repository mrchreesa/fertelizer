/* Keep optional Vercel measurement aligned with the shared WebM8 privacy state. */
(function () {
  "use strict";
  var loading = false, loaded = false;
  function isAllowed() {
    return Boolean(window.WebM8Privacy && window.WebM8Privacy.isAllowed());
  }
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va("beforeSend", function (event) { return isAllowed() ? event : null; });
  function sync() {
    if (!isAllowed() || loading || loaded) return;
    loading = true;
    var script = document.createElement("script");
    script.src = "/_vercel/insights/script.js";
    script.onload = function () { loading = false; loaded = true; };
    script.onerror = function () { loading = false; script.remove(); };
    document.head.appendChild(script);
  }
  window.addEventListener("webm8:privacy", sync);
  sync();
})();
