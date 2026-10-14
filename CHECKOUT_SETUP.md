# Commonwealth Central: card-first Stripe Checkout

## Current rollout state

The custom checkout is built on a feature branch. Existing public buy buttons continue to target their original, working Stripe-hosted Payment Links by default.

When merged, the storefront will check `/api/checkout-readiness`; only when all production activation flags and secrets are present will the **four** 1 kg / 20 kg buy buttons switch to `/checkout?sku=1kg` or `/checkout?sku=20kg`. If the readiness endpoint is unavailable or returns false, old Payment Links stay in use.

Direct visitors to `/checkout` can also use a fallback to the existing Stripe Payment Link if the custom checkout cannot initialise. No test-mode payments are permitted in Vercel Production.

## Visual layout

- Large, branded Visa, Mastercard, American Express and Maestro SVG icons are visible above card entry. **Maestro** is a legacy network that is being phased out and online acceptance is not guaranteed; the page expressly qualifies Maestro.
- The Stripe Payment Element accordion is configured with **card first**, then **Klarna**, then **Revolut Pay** where Stripe deems them eligible. Other methods remain dynamic.
- An Express Checkout Element is below the card-first form for **Apple Pay** and other eligible wallets. Apple Pay wallet availability depends on browser, device, country and domain registration.
- Contact details, UK-only shipping address, Consumer Terms consent, secure payment submission and Stripe-confirmed order status are included.
- Current live Stripe payment method configuration has cards, Klarna, Revolut Pay and Apple Pay enabled; Google Pay is not currently available.
- Existing public prices: GBP 25.44 for 1 kg and GBP 305.69 for 20 kg, VAT and postage/packing included. Bulk pallet/container purchases are quote-only.

## Safe preview testing

1. In Vercel Preview environment, configure:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `CHECKOUT_SITE_URL=https://your-preview-deployment-url`
2. Test both direct checkout URLs. Confirm render of all four card icons, payment choices, the contact form, UK shipping, successful/failed test cards, strong customer authentication (3D Secure) and return status.
3. Add a test Stripe webhook endpoint for `https://your-preview-host/api/stripe-webhook` with event types `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Configure its `STRIPE_WEBHOOK_SECRET=whsec_...` in Preview and confirm Stripe signed events are acknowledged.
4. Test mobile and desktop, wallet availability on a supported device, availability of Klarna and Revolut Pay, and consumer terms. A Stripe-enabled method is not guaranteed to show for every buyer.
5. CI runs unit tests for allowed products, prices, production gating and UI markup. These tests do **not** replace a real Stripe sandbox payment and webhook verification.

## Live activation prerequisites

Do **not** turn on the new checkout for buyers until each item is complete:
1. Set Vercel **Production** environment variables:
   - `STRIPE_SECRET_KEY=sk_live_...` and `STRIPE_PUBLISHABLE_KEY=pk_live_...` for Commonwealth Central's live Stripe account.
   - `STRIPE_WEBHOOK_SECRET=whsec_...` for the production endpoint `https://commonwealthcentral.co.uk/api/stripe-webhook`.
   - `CHECKOUT_SITE_URL=https://commonwealthcentral.co.uk`.
2. Configure a robust fulfilment process for paid orders. The included webhook validates signatures and logs payment/session IDs **only**. It does not save orders in a dedicated database or send fulfilment emails. If operating with manual fulfilment, an authorised operator must reliably review paid Checkout Sessions and shipping addresses in Stripe, ensure no order is missed or shipped twice, and contact buyers as required. For automated fulfilment, integrate an idempotent order store, notifications and retry monitoring.
3. Verify account receipt configuration, delivery policy, taxes, refunds, chargebacks, and the legal/consumer requirements. Register the website domain for Apple Pay in Stripe and test Safari/wallet.
4. After the merchant confirms the entire flow is safe and ready, set both **Production**-only flags:
   - `CHECKOUT_FULFILLMENT_READY=true`
   - `CHECKOUT_ENABLE_LIVE=true`
5. Redeploy, verify `GET /api/checkout-readiness` gives `{"enabled":true}`, and perform a controlled, authorised live transaction including verification of the webhook, shipping and receipt flow. Test the storefront's four links after activation.
6. Monitor Vercel function logs and Stripe events at launch. Original Stripe Payment Links remain active for rollback.

**Never** paste live Stripe secret API keys into browser code, public GitHub commits or this chat. Configure them in Vercel's encrypted environment settings.

## Rollback

Set either production flag to false and redeploy. The public buy buttons automatically remain at the existing Stripe Payment Links. Alternatively, revert the feature branch's storefront readiness script. Keep original Payment Links active until the new flow has demonstrated successful order processing.

## Brand artwork acknowledgement

Card icon artwork originates from [Datatrans payment-logos](https://github.com/datatrans/payment-logos), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The card-network marks and names are trademarks of their respective owners. The checkout footer includes the required attribution.
