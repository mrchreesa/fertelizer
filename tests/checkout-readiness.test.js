"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const readiness = require("../api/checkout-readiness");

function callReadiness(method = "GET") {
  let httpStatus = 200;
  const response = {
    setHeader() {},
    status(number) { httpStatus = number; return this; },
    json(data) { return { httpStatus, data }; }
  };
  return readiness({ method }, response);
}
function withEnvironment(changes, run) {
  const prev = {};
  for (const [key, value] of Object.entries(changes)) {
    prev[key] = process.env[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  try { return run(); }
  finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value == null) delete process.env[key]; else process.env[key] = value;
    }
  }
}
const full = {
  VERCEL_ENV: "production",
  STRIPE_SECRET_KEY: "sk_live_dummy_does_not_work",
  STRIPE_PUBLISHABLE_KEY: "pk_live_dummy_does_not_work",
  STRIPE_WEBHOOK_SECRET: "whsec_dummy_does_not_work",
  CHECKOUT_ENABLE_LIVE: "true",
  CHECKOUT_FULFILLMENT_READY: "true"
};
test("production checkout remains disabled unless all independent gates are present", () => {
  for (const key of Object.keys(full)) {
    withEnvironment({ ...full, [key]: undefined }, () => {
      assert.deepEqual(callReadiness(), { httpStatus: 200, data: { enabled: false } }, key);
    });
  }
  withEnvironment({ ...full, VERCEL_ENV: "preview" }, () => {
    assert.equal(callReadiness().data.enabled, false);
  });
});
test("enables only after all production prerequisites are explicitly configured", () => {
  withEnvironment(full, () => {
    assert.deepEqual(callReadiness(), { httpStatus: 200, data: { enabled: true } });
  });
  withEnvironment(full, () => {
    assert.equal(callReadiness("POST").httpStatus, 405);
  });
});
test("restricted live keys are accepted while restricted test keys cannot activate production", () => {
  withEnvironment({ ...full, STRIPE_SECRET_KEY: "rk_live_unit_test_only" }, () => {
    assert.equal(callReadiness().data.enabled, true);
  });
  withEnvironment({ ...full, STRIPE_SECRET_KEY: "rk_test_unit_test_only" }, () => {
    assert.equal(callReadiness().data.enabled, false);
  });
});
test("public buy buttons still point at working hosted payment links by default", () => {
  const page = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.equal((page.match(/https:\/\/buy\.stripe\.com\/4gMbJ04fhbq80cB1OZfQI00/g) || []).length, 2);
  assert.equal((page.match(/https:\/\/buy\.stripe\.com\/5kQbJ08vxgKs9Nb51bfQI01/g) || []).length, 2);
  assert.ok(!page.includes('href="/checkout?sku=1kg"'));
});
test("checkout displays prominent card brands and optional fallback", () => {
  const page = fs.readFileSync(path.join(__dirname, "../checkout.html"), "utf8");
  for (const card of ["visa", "mastercard", "amex", "maestro"]) {
    assert.ok(page.includes("/assets/payment-cards/" + card + ".svg"), card);
  }
  assert.ok(page.indexOf('class="card-brand-display"') < page.indexOf('id="payment-element"'));
  assert.ok(page.indexOf('id="payment-element"') < page.indexOf('id="express-element"'));
  assert.ok(page.includes('id="fallback-wrap"'));
});
