"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Readable } = require("node:stream");
const Stripe = require("stripe");

const signingSecret = "whsec_unit_test_only";
const stripe = new Stripe("sk_test_unit_test_only");
const source = fs.readFileSync(path.join(__dirname, "../api/stripe-webhook.js"), "utf8");

function loadHandler() {
  const mod = { exports: {} };
  const confirmations = [];
  vm.runInNewContext(source, {
    module: mod, require, Buffer,
    process: { env: { STRIPE_SECRET_KEY: "sk_test_unit_test_only", STRIPE_WEBHOOK_SECRET: signingSecret } },
    console: { info: (...args) => confirmations.push(args), warn() {} }
  });
  return { handler: mod.exports, confirmations };
}

async function deliver(handler, body, signedBody = body) {
  const req = Readable.from([Buffer.from(body)]);
  req.method = "POST";
  req.headers = { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload: signedBody, secret: signingSecret }) };
  const res = {
    code: 200, body: null,
    setHeader() {},
    status(code) { this.code = code; return this; },
    end() { return this; },
    json(body) { this.body = body; return this; }
  };
  await handler(req, res);
  return res;
}

const paidEvent = {
  id: "evt_unit_test_only", type: "checkout.session.completed",
  data: { object: {
    id: "cs_test_unit_test_only", payment_status: "paid",
    metadata: { site: "commonwealthcentral", checkout: "card_first", sku: "1kg" }
  } }
};

test("webhook preserves raw-body configuration and acknowledges a Stripe-signed paid checkout", async () => {
  const { handler, confirmations } = loadHandler();
  assert.equal(handler.config.api.bodyParser, false);
  const res = await deliver(handler, JSON.stringify(paidEvent));
  assert.equal(res.code, 200);
  assert.equal(res.body.received, true);
  assert.equal(confirmations.length, 1);
  assert.equal(confirmations[0][1].sessionId, paidEvent.data.object.id);
});

test("webhook rejects a modified payload and oversized request", async () => {
  const { handler, confirmations } = loadHandler();
  const body = JSON.stringify(paidEvent);
  assert.equal((await deliver(handler, body + " ", body)).code, 400);
  assert.equal((await deliver(handler, "x".repeat(131073))).code, 413);
  assert.equal(confirmations.length, 0);
});

test("unpaid or unrelated events never confirm a paid order", async () => {
  const { handler, confirmations } = loadHandler();
  const unpaid = structuredClone(paidEvent);
  unpaid.data.object.payment_status = "unpaid";
  const unrelated = structuredClone(paidEvent);
  unrelated.data.object.metadata.site = "another_site";
  for (const event of [unpaid, unrelated]) {
    assert.equal((await deliver(handler, JSON.stringify(event))).code, 200);
  }
  assert.equal(confirmations.length, 0);
});
