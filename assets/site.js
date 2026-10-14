(function () {
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('mnav');
  function setMenu(open) {
    nav.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { setMenu(nav.hidden); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !nav.hidden) { setMenu(false); btn.focus(); }
  });
  function revealTarget() {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.tagName === 'DETAILS') target.open = true;
  }
  window.addEventListener('hashchange', revealTarget);
  revealTarget();

  // Optional Vercel custom events follow the shared installer privacy state.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  function track(name, data) {
    if (window.WebM8Privacy && window.WebM8Privacy.isAllowed()) window.va('event', { name: name, data: data });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-buy], a[href^="mailto:"], a[href^="tel:"]');
    if (!el) return;
    if (el.hasAttribute('data-buy')) track('Buy click', { size: el.dataset.buy + ' kg' });
    else if (el.getAttribute('href').indexOf('mailto:') === 0) track(/quote/i.test(el.getAttribute('href')) ? 'Freight quote click' : 'Email click', {});
    else track('Call click', {});
  });
  // Progressive activation: purchase links stay on the verified hosted Stripe checkout
  // until the custom checkout is explicitly enabled on production.
  async function useCustomCheckoutWhenReady() {
    var links = document.querySelectorAll('a[data-buy]');
    if (!links.length) return;
    try {
      var response = await fetch('/api/checkout-readiness', {
        method: 'GET', cache: 'no-store', credentials: 'same-origin'
      });
      if (!response.ok) return;
      var status = await response.json();
      if (!status || status.enabled !== true) return;
      links.forEach(function (link) {
        var sku = link.getAttribute('data-buy') === '1' ? '1kg' :
                  link.getAttribute('data-buy') === '20' ? '20kg' : null;
        if (sku) {
          link.setAttribute('data-stripe-fallback', link.href);
          link.href = '/checkout?sku=' + sku;
        }
      });
    } catch (_) {
      // Never break an existing purchasing route on a network error.
    }
  }
  useCustomCheckoutWhenReady();
})();
