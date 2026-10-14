"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checkout = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "checkout-preview.html"), "utf8");
const stripeClient = fs.readFileSync(path.join(root, "assets/checkout.js"), "utf8");
const stripeServer = fs.readFileSync(path.join(root, "api/create-checkout-session.js"), "utf8");

test("UK shipping collection is mandated by Checkout Session and contact phone is enabled", () => {
  assert.match(stripeServer, /shipping_address_collection:\s*\{\s*allowed_countries:\s*\[\s*"GB"\s*\]\s*\}/);
  assert.match(stripeServer, /phone_number_collection:\s*\{\s*enabled:\s*true\s*\}/);
  assert.match(stripeServer, /billing_address_collection:\s*"auto"/);
});

test("real checkout mounts the native Shipping Address Element in its single address panel", () => {
  const shippingPanel = checkout.match(/<section class="form-section contact-shipping-section"[\s\S]*?<\/section>/);
  assert.ok(shippingPanel, "Contact and shipping must remain one panel");
  assert.match(shippingPanel[0], /id="contact-element"/);
  assert.match(shippingPanel[0], /id="shipping-element"/);
  assert.match(shippingPanel[0], /full name, house number and street, town\/city and postcode/);
  assert.match(stripeClient, /checkout\.createShippingAddressElement\(\)\.mount\("#shipping-element"\)/);
  assert.match(stripeClient, /checkout\.createContactDetailsElement\(\)\.mount\("#contact-element"\)/);
  assert.match(stripeClient, /actions\.confirm\(\)/);
  assert.ok(!shippingPanel[0].includes('type="text"'), "Don't duplicate Stripe's editable address fields");
});

test("non-payment preview shows every essential UK delivery field", () => {
  const panel = preview.match(/<section class="form-section contact-shipping-section"[\s\S]*?<\/section>/);
  assert.ok(panel, "Preview address panel exists");
  for (const label of ["Email address", "Contact phone number", "Recipient full name", "Address line 1",
    "Address line 2 (optional)", "Town / city", "UK postcode", "Country", "United Kingdom"]) {
    assert.ok(panel[0].includes(label), "Missing label: " + label);
  }
  assert.match(panel[0], /Flat, apartment, unit or building name/);
  assert.doesNotMatch(preview, /<input\b|<form\b|js\.stripe\.com/i, "Visual preview must never accept card payments");
});
