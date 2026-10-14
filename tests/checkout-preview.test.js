"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "checkout-preview.html"), "utf8");
const script = fs.readFileSync(path.join(root, "assets/checkout-preview.js"), "utf8");
const ignore = fs.readFileSync(path.join(root, ".vercelignore"), "utf8");

test("public checkout preview shows branding without collecting card data", () => {
  assert.match(html, /Design preview only/);
  assert.match(html, /Fields below are illustrations and cannot accept payment/);
  // The illustration contains disabled, non-submitting address inputs only.
  const previewInputs = html.match(/<input\b[^>]*>/g) || [];
  assert.equal(previewInputs.length, 7);
  assert.ok(previewInputs.every(input => /\sdisabled(?:\s|>)/.test(input)));
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /js\.stripe\.com/);
  for (const brand of ["visa", "mastercard", "amex", "maestro"]) {
    assert.ok(html.includes("/assets/payment-cards/" + brand + ".svg"));
  }
  assert.ok(html.includes("/assets/checkout.css"));
  assert.ok(html.includes("assets/checkout-preview.js"));
});

test("preview has direct paths for two valid products and points to old payment links", () => {
  assert.match(script, /"1kg":/);
  assert.match(script, /"20kg":/);
  assert.match(script, /"£25\.44"/);
  assert.match(script, /"£305\.69"/);
  assert.ok(script.includes("https://buy.stripe.com/4gMbJ04fhbq80cB1OZfQI00"));
  assert.ok(script.includes("https://buy.stripe.com/5kQbJ08vxgKs9Nb51bfQI01"));
  assert.ok(ignore.includes("!checkout-preview.html"));
  assert.doesNotMatch(html, /CHECKOUT_ENABLE_LIVE/);
});
