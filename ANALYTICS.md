# WebM8 website analytics

The homepage and order-complete page load the shared consent-controlled WebM8 installer with public site ID `4462fe0c-beef-4ddf-ae26-0253da1ae08c`, registered to Commonwealth Central. Visitors choose whether to allow page, click and time measurement and can withdraw through Privacy choices in the footer. Browser privacy signals are respected. Named sections and buy links use fixed labels. A buy click or order-complete view does not assert that a payment succeeded. Payment links are unchanged.

The Content Security Policy admits `https://webm8-platform.vercel.app` in script-src, style-src and connect-src for this integration. Keep the remaining security policy in place. Deploys come from the `mrchreesa/fertelizer` main branch; the local .vercel metadata refers to an older project and should not be used to select a deployment target.
