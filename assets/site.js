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
  var checkout = document.getElementById('order-information');
  document.querySelectorAll('[data-buy]').forEach(function (button) {
    button.addEventListener('click', function () {
      document.getElementById('checkout-title').textContent = 'Envirolizer ' + button.dataset.buy + ' kg';
      document.getElementById('checkout-price').textContent = '£' + button.dataset.price + ' · Includes VAT and P&P';
      checkout.showModal();
    });
  });
  function revealTarget() {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.tagName === 'DETAILS') target.open = true;
  }
  window.addEventListener('hashchange', revealTarget);
  revealTarget();

  // Vercel Web Analytics (cookieless). Calls queue until /_vercel/insights/script.js loads.
  // Custom events are recorded on Vercel Pro; page views work on every plan.
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  function track(name, data) { window.va('event', { name: name, data: data }); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-buy], a[href^="mailto:"], a[href^="tel:"]');
    if (!el) return;
    if (el.hasAttribute('data-buy')) track('Buy click', { size: el.dataset.buy + ' kg' });
    else if (el.getAttribute('href').indexOf('mailto:') === 0) track(/quote/i.test(el.getAttribute('href')) ? 'Freight quote click' : 'Email click', {});
    else track('Call click', {});
  });
})();
