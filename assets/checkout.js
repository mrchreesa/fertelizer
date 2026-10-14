(() => {
  "use strict";

  const sku = new URLSearchParams(window.location.search).get("sku");
  const catalogue = {
    "1kg": { label: "Envirolizer 1 kg bag", image: "/assets/envirolizer-1kg.png" },
    "20kg": { label: "Envirolizer 20 kg bag", image: "/assets/envirolizer-20kg.png" }
  };
  const $ = (id) => document.getElementById(id);
  const status = $("status");
  const paymentError = $("payment-error");
  let busy = false;

  function fail(message) {
    status.hidden = false;
    status.classList.add("error");
    status.textContent = message;
  }
  function formatGBP(pence) {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
  }

  async function start() {
    if (!Object.prototype.hasOwnProperty.call(catalogue, sku)) {
      fail("Invalid product. Please select a bag from the shop.");
      return;
    }
    $("product-name").textContent = catalogue[sku].label;
    $("product-image").src = catalogue[sku].image;
    $("product-image").alt = catalogue[sku].label;

    if (typeof window.Stripe !== "function") {
      fail("Stripe could not load. Please check your connection or browser settings.");
      return;
    }

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ sku })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to prepare checkout.");
      if (!data.clientSecret || !data.publishableKey || !Number.isInteger(data.amountTotal)) {
        throw new Error("The payment service returned an incomplete response.");
      }
      $("subtotal").textContent = formatGBP(data.amountTotal);
      $("total").textContent = formatGBP(data.amountTotal);

      const stripe = window.Stripe(data.publishableKey);
      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret: data.clientSecret,
        elementsOptions: {
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#0e4a2f",
              colorText: "#141d17",
              colorBackground: "#ffffff",
              borderRadius: "7px",
              fontFamily: "Arial, sans-serif"
            }
          }
        }
      });

      checkout.createContactDetailsElement().mount("#contact-element");
      checkout.createShippingAddressElement().mount("#shipping-element");

      const paymentElement = checkout.createPaymentElement({
        layout: { type: "accordion", defaultCollapsed: false },
        paymentMethodOrder: ["card", "klarna", "revolut_pay"]
      });
      paymentElement.mount("#payment-element");

      // Wallet methods are intentionally BELOW the main card-first form.
      // Availability and order depend on Stripe, country, browser and device eligibility.
      const expressElement = checkout.createExpressCheckoutElement({
        paymentMethods: { link: "never", klarna: "never" }
      });
      expressElement.on("availablepaymentmethodschange", (event) => {
        const any = event && event.availablePaymentMethods &&
          Object.values(event.availablePaymentMethods).some(Boolean);
        $("wallet-section").hidden = !any;
      });
      expressElement.on("confirm", async () => {
        if (!$("terms").checked) {
          fail("Please accept the Consumer Terms before using a wallet.");
          return;
        }
        const result = await checkout.loadActions();
        if (result.type === "error") {
          fail(result.error.message || "Unable to confirm payment.");
          return;
        }
        const confirmation = await result.actions.confirm();
        if (confirmation.type === "error") fail(confirmation.error.message || "Payment could not be confirmed.");
      });
      expressElement.mount("#express-element");

      const loaded = await checkout.loadActions();
      if (loaded.type === "error") throw new Error(loaded.error.message || "Checkout failed to load.");
      status.hidden = true;
      $("checkout-fields").hidden = false;
      $("pay-button").disabled = false;

      $("payment-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (busy || !$("terms").checked) return;
        busy = true;
        $("pay-button").disabled = true;
        $("pay-button").textContent = "Processing securely…";
        paymentError.hidden = true;
        try {
          const result = await loaded.actions.confirm();
          if (result.type === "error") {
            paymentError.textContent = result.error.message || "Payment failed. Please try again.";
            paymentError.hidden = false;
          }
        } catch (_) {
          paymentError.textContent = "Unable to confirm payment. Please try again.";
          paymentError.hidden = false;
        } finally {
          busy = false;
          $("pay-button").disabled = false;
          $("pay-button").textContent = "Pay securely";
        }
      });
    } catch (error) {
      fail(error.message || "Unable to load the payment form.");
    }
  }

  start();
})();
