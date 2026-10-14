"use strict";

// This endpoint does not reveal API keys or allow the browser to enable live payments.
// Public storefront links stay on the existing Payment Links until all live gates are set.
module.exports = function checkoutReadiness(req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const enabled = process.env.VERCEL_ENV === "production" &&
    process.env.CHECKOUT_ENABLE_LIVE === "true" &&
    process.env.CHECKOUT_FULFILLMENT_READY === "true" &&
    /^sk_live_/.test(process.env.STRIPE_SECRET_KEY || "") &&
    /^pk_live_/.test(process.env.STRIPE_PUBLISHABLE_KEY || "") &&
    /^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET || "");
  return res.status(200).json({ enabled });
};
