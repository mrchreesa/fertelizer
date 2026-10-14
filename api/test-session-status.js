"use strict";

const Stripe = require("stripe");

module.exports = async function testSessionStatus(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const id = req.query && req.query.session_id;
  if (typeof id !== "string" || !/^cs_test_[A-Za-z0-9_]{10,}$/.test(id)) {
    return res.status(400).json({ error: "Invalid test checkout reference." });
  }
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.CHECKOUT_PUBLIC_TEST_ENABLED !== "true" ||
      !key.startsWith("sk_test_")) {
    return res.status(503).json({ error: "The test checkout is unavailable." });
  }

  try {
    const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
    const session = await stripe.checkout.sessions.retrieve(id);
    if (session.livemode || session.metadata?.site !== "commonwealthcentral" ||
        session.metadata?.checkout !== "public_sandbox") {
      return res.status(404).json({ error: "Test checkout not found." });
    }
    return res.status(200).json({
      status: session.status,
      paymentStatus: session.payment_status,
      sku: session.metadata.sku,
      testMode: true
    });
  } catch (error) {
    if (error.type === "StripeInvalidRequestError" || error.statusCode === 404) {
      return res.status(404).json({ error: "Test checkout not found." });
    }
    console.error("Public sandbox lookup failed", error.type || error.name || "Error");
    return res.status(502).json({ error: "Unable to check test payment status." });
  }
};
