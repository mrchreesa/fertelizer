"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const live = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "checkout-preview.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/checkout.css"), "utf8");

test("real checkout collects contact and UK shipping in one compact panel", () => {
  const block = live.match(/<section class="form-section contact-shipping-section"[\s\S]*?<\/section>/);
  assert.ok(block, "merged contact/shipping panel must exist");
  assert.match(block[0], /Contact &amp; shipping details/);
  assert.match(block[0], /id="contact-element"/);
  assert.match(block[0], /id="shipping-element"/);
  assert.equal((live.match(/id="contact-element"/g) || []).length, 1);
  assert.equal((live.match(/id="shipping-element"/g) || []).length, 1);
  assert.doesNotMatch(live, /<h2>Contact details<\/h2>|<h2>Shipping information<\/h2>/);
  assert.match(live, /id="payment-element"/);
  assert.match(live, /id="express-element"/);
  assert.match(live, /id="terms"/);
});

test("both previews omit intro copy, enlarged logos and redundant explanatory text", () => {
  for (const markup of [live, preview]) {
    assert.doesNotMatch(markup, /Secure card payment is the default/);
    assert.doesNotMatch(markup, /class="intro"/);
    assert.doesNotMatch(markup, /class="card-brand-display"/);
    assert.doesNotMatch(markup, /card-brands-note/);
    assert.doesNotMatch(markup, /card-brand-title/);
    assert.match(markup, /class="payment-heading"/);
    assert.equal((markup.match(/class="card-brand"/g) || []).length, 4);
    assert.match(markup, /class="form-section contact-shipping-section"/);
    assert.match(markup, /id="contact-shipping-title"/);
    for (const brand of ["visa", "mastercard", "amex", "maestro"]) {
      assert.ok(markup.includes("/assets/payment-cards/" + brand + ".svg"));
    }
  }
});

test("small card-brand icons have no surrounding boxes and desktop columns remain reversed", () => {
  assert.match(css, /\.card-brand\{[^}]*width:52px;height:34px[^}]*border:0[^}]*box-shadow:none/);
  assert.match(css, /\.checkout-layout > \.summary\s*\{\s*grid-column: 1/);
  assert.match(css, /\.checkout-layout > \.checkout-main\s*\{\s*grid-column: 2/);
  assert.match(css, /\.contact-shipping-section #shipping-element\{/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.doesNotMatch(css, /\.card-brand-display/);
});
