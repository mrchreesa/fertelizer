"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Stripe browser and server use the same Dahlia release train", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "checkout.html"), "utf8");
  const backend = fs.readFileSync(path.join(root, "api/create-checkout-session.js"), "utf8");
  const frontend = fs.readFileSync(path.join(root, "assets/checkout.js"), "utf8");

  assert.match(html, /<script src="https:\/\/js\.stripe\.com\/dahlia\/stripe\.js"><\/script>/);
  assert.doesNotMatch(html, /https:\/\/js\.stripe\.com\/v3\//);
  assert.match(backend, /apiVersion: "2026-03-25\.dahlia"/);
  assert.match(frontend, /stripe\.initCheckoutElementsSdk\(/);
});
