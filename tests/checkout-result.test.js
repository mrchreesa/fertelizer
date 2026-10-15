"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "checkout-result.html"), "utf8");
const script = fs.readFileSync(path.join(root, "assets/checkout-result.js"), "utf8");

test("live payment confirmation runs under the deployed CSP", async () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const csp = config.headers.flatMap(rule => rule.headers)
    .find(header => header.key === "Content-Security-Policy").value;
  const scriptPolicy = csp.split(";").find(rule => rule.trim().startsWith("script-src"));
  assert.match(scriptPolicy, /'self'/);
  assert.doesNotMatch(page, /<script\s*>/);
  assert.match(page, /src="\/assets\/checkout-result\.js"/);
  for (const paymentStatus of ["paid", "unpaid"]) {
    const elements = { heading: {}, message: {}, retry: { hidden: true } };
    await vm.runInNewContext(script, {
      document: { getElementById: id => elements[id] },
      URLSearchParams,
      location: { search: "?session_id=cs_test_confirmation" },
      fetch: async url => {
        assert.equal(url, "/api/session-status?session_id=cs_test_confirmation");
        return { ok: true, json: async () => ({ paymentStatus, status: "open" }) };
      }
    });
    assert.equal(elements.heading.textContent, paymentStatus === "paid"
      ? "Thank you, your payment is confirmed" : "Your payment is not complete");
  }
});
