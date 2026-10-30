"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const script = fs.readFileSync(path.join(__dirname, "../assets/checkout.js"), "utf8");
const flush = () => new Promise(setImmediate);

function checkoutHarness({ fetchPending = false, loadActions } = {}) {
  const elements = new Map();
  const timers = new Map();
  let nextTimer = 0;
  const get = id => {
    if (!elements.has(id)) elements.set(id, {
      hidden: ["fallback-wrap", "checkout-fields"].includes(id),
      disabled: id === "pay-button",
      classList: { add() {}, remove() {} },
      addEventListener() {}
    });
    return elements.get(id);
  };
  const element = () => ({ mount() {}, on() {} });
  vm.runInNewContext(script, {
    URLSearchParams, Intl,
    document: { getElementById: get },
    window: {
      location: { search: "?sku=20kg" },
      Stripe: () => ({ initCheckoutElementsSdk: () => ({
        createContactDetailsElement: element,
        createShippingAddressElement: element,
        createPaymentElement: element,
        createExpressCheckoutElement: element,
        loadActions: loadActions || (() => Promise.resolve({ type: "success", actions: {} }))
      }) })
    },
    fetch: () => fetchPending ? new Promise(() => {}) : Promise.resolve({
      ok: true,
      json: async () => ({ clientSecret: "test-secret", publishableKey: "pk_test_example", amountTotal: 30569 })
    }),
    setTimeout: (callback, delay) => {
      assert.equal(delay, 20000);
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimeout: timer => timers.delete(timer)
  });
  return { get, timers };
}

test("a stalled session request offers the correct hosted checkout", async () => {
  const { get, timers } = checkoutHarness({ fetchPending: true });
  for (const callback of timers.values()) callback();
  await flush();
  assert.equal(get("fallback-wrap").hidden, false);
  assert.equal(get("fallback-link").href, "https://buy.stripe.com/5kQbJ08vxgKs9Nb51bfQI01");
  assert.match(get("status").textContent, /taking longer than expected/);
  assert.equal(get("pay-button").disabled, true);
});

test("a stalled Stripe initialization offers fallback and ignores late completion", async () => {
  let resolveActions;
  const { get, timers } = checkoutHarness({
    loadActions: () => new Promise(resolve => { resolveActions = resolve; })
  });
  await flush();
  assert.equal(timers.size, 1);
  for (const callback of timers.values()) callback();
  await flush();
  assert.equal(get("fallback-wrap").hidden, false);
  assert.equal(get("checkout-fields").hidden, true);
  resolveActions({ type: "success", actions: {} });
  await flush();
  assert.equal(get("checkout-fields").hidden, true);
  assert.equal(get("pay-button").disabled, true);
});

test("a ready checkout clears its timers and enables payment normally", async () => {
  const { get, timers } = checkoutHarness();
  await flush();
  assert.equal(timers.size, 0);
  assert.equal(get("status").hidden, true);
  assert.equal(get("fallback-wrap").hidden, true);
  assert.equal(get("checkout-fields").hidden, false);
  assert.equal(get("pay-button").disabled, false);
});
