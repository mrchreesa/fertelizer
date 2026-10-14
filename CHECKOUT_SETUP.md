# Commonwealth Central custom card-first Stripe checkout

This is an unmerged feature branch. Existing public Payment Links remain live.

## Setup and test
1. Set Preview Vercel environment values STRIPE_SECRET_KEY=sk_test_..., STRIPE_PUBLISHABLE_KEY=pk_test_..., and CHECKOUT_SITE_URL=https://your-preview-domain.
2. Deploy Vercel preview with Node 20+, installing npm dependencies.
3. Visit /checkout?sku=1kg and /checkout?sku=20kg. The Checkout Sessions (ui_mode=elements) Payment Element shows card first, then eligible Klarna and Revolut Pay. Apple Pay/Google Pay are placed lower down via Express Checkout Element.
4. Test successful, failed, and authentication-required payments; contact info and UK shipping; status results and mobile browsers. Test prices GBP 25.44 and GBP 305.69. Eligible payment methods vary by device, region and Stripe account configuration.
5. Create Stripe test webhook endpoint at /api/stripe-webhook, event types checkout.session.completed and checkout.session.async_payment_succeeded, and set STRIPE_WEBHOOK_SECRET=whsec_... in Preview.
6. IMPORTANT: Webhook currently verifies signatures and logs minimal IDs only; it does NOT fulfil orders. Before accepting real payments, connect signed events to a durable, idempotent order database and customer notification/fulfilment workflow.
7. Once verified and explicitly approved, set Production-only STRIPE_SECRET_KEY=sk_live_..., STRIPE_PUBLISHABLE_KEY=pk_live_..., STRIPE_WEBHOOK_SECRET=whsec_..., CHECKOUT_SITE_URL=https://commonwealthcentral.co.uk, CHECKOUT_ENABLE_LIVE=true. Live checkout is refused unless VERCEL_ENV=production and CHECKOUT_ENABLE_LIVE=true.
8. Merge only after tests and consent. Existing links can be restored by reverting four purchase button href values on index.html.

## Design / protections
- Current website and bag sales remain on main untouched; feature branch changes 4 buy links only.
- Bag purchase SKU allowlist, live Stripe Price IDs and test prices are server-side.
- UK shipping only, contact, GBP totals, consumer terms checkbox, mobile design, secure Stripe card fields.
- Pallet and container orders are quote-only.
- Browser success page checks actual Stripe Checkout Session status and never assumes success based on return alone.
- Never put Stripe secret keys in source control. Stripe Elements hosts card-input frames.
- Before merging: confirm delivery, refund, receipt, support, webhook fulfilment, wallet domain registration and CSP on production.
