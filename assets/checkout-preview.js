(() => {
  "use strict";
  const product = new URLSearchParams(window.location.search).get("sku");
  const products = {
    "1kg": {
      label: "Envirolizer 1 kg bag",
      image: "/assets/envirolizer-1kg.png",
      price: "£25.44",
      paymentLink: "https://buy.stripe.com/4gMbJ04fhbq80cB1OZfQI00"
    },
    "20kg": {
      label: "Envirolizer 20 kg bag",
      image: "/assets/envirolizer-20kg.png",
      price: "£305.69",
      paymentLink: "https://buy.stripe.com/5kQbJ08vxgKs9Nb51bfQI01"
    }
  };
  const selected = Object.prototype.hasOwnProperty.call(products, product) ?
    products[product] : products["1kg"];
  document.getElementById("product-name").textContent = selected.label;
  document.getElementById("product-image").src = selected.image;
  document.getElementById("product-image").alt = selected.label;
  document.getElementById("subtotal").textContent = selected.price;
  document.getElementById("total").textContent = selected.price;
  document.getElementById("existing-checkout-link").href = selected.paymentLink;
})();
