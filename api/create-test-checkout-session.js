"use strict";

const Stripe = require("stripe");
const { PRODUCTS, makeLineItem } = require("../lib/checkout-products");

// Public test checkout runs ONLY on the production hostname but talks ONLY
// to Stripe test mode. It never has the capability to charge real cards.
module.exports = async function createPublicTestSession(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
  const enabled = process.env.VERCEL_ENV === "production" &&
    process.env.CHECKOUT_PUBLIC_TEST_ENABLED === "true" &&
    secretKey.startsWith("sk_test_") &&
    publishableKey.startsWith("pk_test_");

  if (!enabled) {
    return res.status(503).json({ error: "The sandbox checkout is not currently available." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (_) {
    return res.status(400).json({ error: "Invalid request." });
  }
  const sku = body && body.sku;
  if (typeof sku !== "string" || !Object.prototype.hasOwnProperty.call(PRODUCTS, sku)) {
    return res.status(400).json({ error: "Only the 1 kg and 20 kg test products are supported." });
  }

  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
      maxNetworkRetries: 1
    });
    const session = await stripe.checkout.sessions.create({
      ui_mode: "elements",
      mode: "payment",
      line_items: [makeLineItem(sku, false)],
      shipping_address_collection: { allowed_countries: ["GB"] },
      billing_address_collection: "auto",
      return_url: "https://www.commonwealthcentral.co.uk/checkout-test-result?session_id={CHECKOUT_SESSION_ID}",
      metadata: { site: "commonwealthcentral", checkout: "public_sandbox", sku },
      payment_intent_data: {
        metadata: { site: "commonwealthcentral", checkout: "public_sandbox", sku }
      }
    });
    if (!session.client_secret) throw new Error("Missing Stripe checkout client secret");
    return res.status(200).json({
      clientSecret: session.client_secret,
      publishableKey,
      amountTotal: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    // Do not disclose Stripe internals, key material, or customer details.
    console.error("Public sandbox checkout failed", {
      type: error.type || error.name || "Error",
      code: error.code || null,
      param: error.param || null
    });
    return res.status(502).json({
      error: "We could not start the test payment. Please contact the website administrator."
    });
  }
};
