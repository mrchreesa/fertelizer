"use strict";

const Stripe = require("stripe");

module.exports = async function sessionStatus(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const id = req.query && req.query.session_id;
  if (typeof id !== "string" || !/^cs_(test_)?[A-Za-z0-9_]{10,}$/.test(id)) {
    return res.status(400).json({ error: "Invalid checkout reference" });
  }

  const secret = process.env.STRIPE_SECRET_KEY || "";
  if (!(secret.startsWith("sk_test_") || secret.startsWith("sk_live_"))) {
    return res.status(503).json({ error: "Checkout is not configured" });
  }

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(id);
    if (!session.metadata || session.metadata.site !== "commonwealthcentral" ||
        session.metadata.checkout !== "card_first") {
      return res.status(404).json({ error: "Checkout not found" });
    }
    // Intentionally omit customer details, shipping address and email.
    return res.status(200).json({
      status: session.status,
      paymentStatus: session.payment_status,
      sku: session.metadata.sku
    });
  } catch (error) {
    if (error.statusCode === 404 || error.type === "StripeInvalidRequestError") {
      return res.status(404).json({ error: "Checkout not found" });
    }
    console.error("Unable to retrieve Stripe checkout status", error.type || error.name || "Error");
    return res.status(502).json({ error: "Unable to check payment status" });
  }
};
