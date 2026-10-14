"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { PRODUCTS, makeLineItem } = require("../lib/checkout-products");

test("only the two bag products can be bought online", () => {
  assert.deepEqual(Object.keys(PRODUCTS).sort(), ["1kg", "20kg"]);
  assert.throws(() => makeLineItem("pallet", false), RangeError);
  assert.throws(() => makeLineItem("container", true), RangeError);
  assert.throws(() => makeLineItem("__proto__", true), RangeError);
});

test("test checkout prices exactly match the published VAT-and-postage-inclusive prices", () => {
  const small = makeLineItem("1kg", false);
  const large = makeLineItem("20kg", false);
  assert.equal(small.price_data.unit_amount, 2544);
  assert.equal(large.price_data.unit_amount, 30569);
  assert.equal(small.price_data.currency, "gbp");
  assert.equal(large.price_data.currency, "gbp");
  assert.equal(small.quantity, 1);
  assert.equal(large.quantity, 1);
});

test("live checkout uses the verified Stripe catalogue price IDs", () => {
  assert.deepEqual(makeLineItem("1kg", true), {
    price: "price_1UL4kyD3BMmQJOY65pxZniWb",
    quantity: 1
  });
  assert.deepEqual(makeLineItem("20kg", true), {
    price: "price_1UL59xD3BMmQJOY6nexVuGvM",
    quantity: 1
  });
});
