"use strict";

const Stripe = require("stripe");
const { PRODUCTS, makeLineItem } = require("../lib/checkout-products");

function getSiteOrigin() {
  if (process.env.CHECKOUT_SITE_URL) {
    const url = new URL(process.env.CHECKOUT_SITE_URL);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
      throw new Error("CHECKOUT_SITE_URL must use HTTPS, or HTTP on localhost.");
    }
    return url.origin;
  }
  if (process.env.VERCEL_ENV === "production") return "https://commonwealthcentral.co.uk";
  if (process.env.VERCEL_URL) return "https://" + process.env.VERCEL_URL;
  return "http://localhost:3000";
}

module.exports = async function createCheckoutSession(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.STRIPE_SECRET_KEY || "";
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
  const isLive = secret.startsWith("sk_live_");
  const isTest = secret.startsWith("sk_test_");

  // Never permit test payments on the public production domain, or live payments in previews.
  // The live gate only opens after merchant sign-off and a signed webhook is configured.
  const production = process.env.VERCEL_ENV === "production";
  const keyPairMatches = (isLive && publishableKey.startsWith("pk_live_")) ||
                         (isTest && publishableKey.startsWith("pk_test_"));
  const webhookReady = /^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET || "");
  const liveApproved = process.env.CHECKOUT_ENABLE_LIVE === "true" &&
                       process.env.CHECKOUT_FULFILLMENT_READY === "true";
  if (!keyPairMatches || (production && (!isLive || !webhookReady || !liveApproved)) ||
      (!production && !isTest)) {
    return res.status(503).json({ error: "Checkout is not configured for this environment." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON." });
  }
  if (!body || !Object.prototype.hasOwnProperty.call(PRODUCTS, body.sku)) {
    return res.status(400).json({ error: "Choose the 1 kg or 20 kg bag." });
  }

  try {
    const stripe = new Stripe(secret, { apiVersion: "2026-03-25.dahlia", maxNetworkRetries: 1 });
    const session = await stripe.checkout.sessions.create({
      ui_mode: "elements",
      mode: "payment",
      line_items: [makeLineItem(body.sku, isLive)],
      shipping_address_collection: { allowed_countries: ["GB"] },
      billing_address_collection: "auto",
      return_url: getSiteOrigin() + "/checkout-result?session_id={CHECKOUT_SESSION_ID}",
      metadata: { site: "commonwealthcentral", sku: body.sku, checkout: "card_first" },
      payment_intent_data: { metadata: { site: "commonwealthcentral", sku: body.sku } }
    });

    return res.status(200).json({
      clientSecret: session.client_secret,
      publishableKey,
      amountTotal: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    console.error("Unable to create Stripe checkout session", error.type || error.name || "Error");
    return res.status(502).json({ error: "Payment setup is temporarily unavailable. Please try again." });
  }
};
