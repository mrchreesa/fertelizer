"use strict";

// This is the sole server-side product allowlist. Never accept an amount or Price ID from the browser.
// Live Price IDs have been checked against the Commonwealth Central Stripe account.
const PRODUCTS = Object.freeze({
  "1kg": Object.freeze({
    label: "Envirolizer 1 kg bag",
    amountPence: 2544,
    currency: "gbp",
    livePriceId: "price_1UL4kyD3BMmQJOY65pxZniWb"
  }),
  "20kg": Object.freeze({
    label: "Envirolizer 20 kg bag",
    amountPence: 30569,
    currency: "gbp",
    livePriceId: "price_1UL59xD3BMmQJOY6nexVuGvM"
  })
});

function makeLineItem(sku, live) {
  const product = PRODUCTS[sku];
  if (!product) throw new RangeError("Unsupported product");
  if (live) {
    return { price: product.livePriceId, quantity: 1 };
  }
  // Inline test prices avoid creating persistent test-mode products.
  return {
    price_data: {
      currency: product.currency,
      unit_amount: product.amountPence,
      product_data: { name: product.label }
    },
    quantity: 1
  };
}

module.exports = { PRODUCTS, makeLineItem };
