"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p), "utf8");
const checkout = read("checkout-test.html");
const client = read("assets/checkout-test.js");
const resultPage = read("checkout-test-result.html");
const resultClient = read("assets/checkout-test-result.js");
const production = read("checkout.html");
const front = read("index.html");
const backend = read("api/create-test-checkout-session.js");
const statusBackend = read("api/test-session-status.js");
const vercelIgnore = read(".vercelignore");

test("public checkout is clearly a separate Stripe test-only experience", () => {
  assert.match(checkout, /Test payment only[^<]*no real money is taken/);
  assert.match(checkout, /id="payment-element"/);
  assert.match(checkout, /id="shipping-element"/);
  assert.match(checkout, /id="contact-element"/);
  assert.match(checkout, /src="https:\/\/js\.stripe\.com\/dahlia\/stripe\.js"/);
  assert.match(checkout, /src="\/assets\/checkout-test\.js"/);
  assert.match(client, /\/api\/create-test-checkout-session/);
  assert.match(client, /initCheckoutElementsSdk/);
  assert.match(client, /checkout\.createShippingAddressElement/);
  assert.match(client, /mode:\s*"disabled"/);
  assert.doesNotMatch(checkout + client, /buy\.stripe\.com|\/api\/create-checkout-session/);
  assert.match(resultPage, /assets\/checkout-test-result\.js/);
  assert.doesNotMatch(resultPage, /<script>/);
  assert.match(resultClient, /\/api\/test-session-status/);
  assert.match(vercelIgnore, /!checkout-test\.html/);
  assert.match(vercelIgnore, /!checkout-test-result\.html/);
  assert.match(front, /https:\/\/buy\.stripe\.com/);
  assert.doesNotMatch(front, /checkout-test/);
  assert.doesNotMatch(production, /TEST PAYMENT ONLY|Test payment only/);
});

function fakeResponse() {
  return {
    code: 200,
    response: null,
    headers: {},
    setHeader(k,v) { this.headers[k] = v; return this; },
    status(code) { this.code = code; return this; },
    json(body) { this.response = body; return this; }
  };
}

function makeHandler(source, env, stripe) {
  const mod = { exports: {} };
  const requireStub = (id) => {
    if (id === "stripe") return stripe;
    if (id === "../lib/checkout-products") return require("../lib/checkout-products");
    throw new Error("Unexpected require " + id);
  };
  vm.runInNewContext(source,{
    module:mod,
    exports:mod.exports,
    require:requireStub,
    process:{env},
    console:{error(){}}
  },{timeout:1000});
  return mod.exports;
}

const testEnv={
  VERCEL_ENV:"production",
  CHECKOUT_PUBLIC_TEST_ENABLED:"true",
  STRIPE_SECRET_KEY:"sk_test_fake_unit_tests_only",
  STRIPE_PUBLISHABLE_KEY:"pk_test_fake_unit_tests_only"
};

test("test-session endpoint is unusable with live keys or without explicit opt-in",async()=>{
  class NoStripe { constructor(){ throw new Error("Stripe should never be instantiated"); } }
  const variations=[
    {...testEnv, STRIPE_SECRET_KEY:"sk_live_FAKE"},
    {...testEnv, STRIPE_PUBLISHABLE_KEY:"pk_live_FAKE"},
    {...testEnv, VERCEL_ENV:"preview"},
    {...testEnv, CHECKOUT_PUBLIC_TEST_ENABLED:"false"},
    {...testEnv, STRIPE_SECRET_KEY:undefined}
  ];
  for(const env of variations) {
    const handler=makeHandler(backend,env,NoStripe);
    const res=fakeResponse();
    await handler({method:"POST",body:{sku:"1kg"}},res);
    assert.equal(res.code,503);
    assert.ok(!JSON.stringify(res.response).includes("sk_"));
  }
});

test("test endpoint never trusts browser amounts and only accepts two bag SKUs",async()=>{
  const capture={};
  class FakeStripe {
    constructor(key,options) {
      capture.key=key;
      capture.version=options.apiVersion;
      this.checkout={sessions:{create:async (params) => {
        capture.params=params;
        return {client_secret:"cs_test_fake_client_secret",amount_total:params.line_items[0].price_data.unit_amount,currency:"gbp"};
      }}};
    }
  }
  const handler=makeHandler(backend,testEnv,FakeStripe);
  for(const sku of ["pallet","container","__proto__",null]) {
    const res=fakeResponse();
    await handler({method:"POST",body:{sku,amount:1}},res);
    assert.equal(res.code,400);
  }
  for(const [sku,expected] of [["1kg",2544],["20kg",30569]]) {
    const res=fakeResponse();
    await handler({method:"POST",body:{sku,amount:1,price:"price_FAKE_live"}},res);
    assert.equal(res.code,200);
    assert.equal(res.response.amountTotal,expected);
    assert.equal(capture.params.line_items[0].price_data.unit_amount,expected);
    assert.equal(capture.params.shipping_address_collection.allowed_countries[0],"GB");
    assert.equal(capture.params.metadata.checkout,"public_sandbox");
    assert.match(capture.params.return_url,/^https:\/\/www\.commonwealthcentral\.co\.uk\/checkout-test-result\?/);
    assert.equal(capture.version,"2026-03-25.dahlia");
  }
});

test("payment-result lookup rejects a live-mode session and other merchant sessions",async()=>{
  let fakeSession={livemode:false,metadata:{site:"commonwealthcentral",checkout:"public_sandbox",sku:"1kg"},status:"complete",payment_status:"paid"};
  class FakeStripe{
    constructor(){this.checkout={sessions:{retrieve:async()=>fakeSession}};}
  }
  const handler=makeHandler(statusBackend,testEnv,FakeStripe);
  const sid="cs_test_abcdefghijklmnopqrstuvwxyz";
  let res=fakeResponse(); await handler({method:"GET",query:{session_id:sid}},res);
  assert.equal(res.code,200);
  assert.equal(res.response.testMode,true);
  assert.equal(res.response.paymentStatus,"paid");
  fakeSession={...fakeSession,livemode:true};
  res=fakeResponse();await handler({method:"GET",query:{session_id:sid}},res);assert.equal(res.code,404);
  fakeSession={...fakeSession,livemode:false,metadata:{...fakeSession.metadata,checkout:"card_first"}};
  res=fakeResponse();await handler({method:"GET",query:{session_id:sid}},res);assert.equal(res.code,404);
  res=fakeResponse();await handler({method:"GET",query:{session_id:"cs_live_FOO"}},res);assert.equal(res.code,400);
});
