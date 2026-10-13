/* Shared WebM8 statistics installer. No banner, pop-up or preference controls.
   Site owners must provide the required analytics transparency separately. */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.WebM8Privacy) return;
  var site = script.getAttribute("data-site");
  if (!/^[0-9a-f-]{36}$/i.test(site || "")) return;
  var origin = new URL(script.getAttribute("data-origin") || script.src).origin;
  var key = "webm8_consent_" + site;
  var prefix = "webm8_" + site + "_";
  var choice = readChoice(), loading = false;

  function readChoice() {
    try {
      var saved = JSON.parse(localStorage.getItem(key) || "null");
      // Removing the controls must not silently override an existing objection.
      if (saved && saved.allowed === false) return false;
      return saved && saved.expires > Date.now() && saved.allowed === true ? true : null;
    } catch (_) { return null; }
  }
  function isAllowed() {
    return choice !== false && navigator.doNotTrack !== "1" && navigator.globalPrivacyControl !== true;
  }
  function clearIdentifiers() {
    try {
      localStorage.removeItem(prefix + "visitor");
      localStorage.removeItem(prefix + "session");
    } catch (_) { /* Collection still stops when browser storage is unavailable. */ }
  }
  window.WebM8Privacy = { isAllowed: isAllowed };
  function sync() {
    if (window.WebM8Analytics) window.WebM8Analytics.consent(isAllowed());
    if (!isAllowed()) clearIdentifiers();
    window.dispatchEvent(new Event("webm8:privacy"));
  }
  function loadTracker() {
    if (!isAllowed() || window.WebM8Analytics || loading) return;
    loading = true;
    var tracker = document.createElement("script");
    tracker.src = origin + "/tracker.js";
    tracker.setAttribute("data-site", site);
    tracker.setAttribute("data-paths", script.getAttribute("data-paths") || "");
    tracker.onload = function () {
      loading = false;
      if (!window.WebM8Analytics) tracker.remove();
      sync();
    };
    tracker.onerror = function () { loading = false; tracker.remove(); };
    document.head.appendChild(tracker);
  }
  window.addEventListener("webm8:ready", sync);
  window.addEventListener("storage", function (event) {
    if (event.key !== key && event.key !== null) return;
    choice = readChoice();
    sync(); loadTracker();
  });
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    choice = readChoice();
    sync(); loadTracker();
  });
  sync(); loadTracker();
})();
