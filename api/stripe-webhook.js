"use strict";
const Stripe = require("stripe");
module.exports.config = { api: { bodyParser: false } };
module.exports = async function stripeWebhook(req,res) {
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end();}
  const key=process.env.STRIPE_SECRET_KEY, secret=process.env.STRIPE_WEBHOOK_SECRET, signature=req.headers["stripe-signature"];
  if(!key||!secret||!signature)return res.status(503).end();
  try {
    const pieces=[];for await(const piece of req)pieces.push(piece);
    const raw=Buffer.concat(pieces);
    if(raw.length>131072)return res.status(413).end();
    const stripe=new Stripe(key);
    const event=stripe.webhooks.constructEvent(raw,signature,secret);
    if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)){
      const session=event.data.object;
      if(session.metadata?.site==="commonwealthcentral"&&session.metadata?.checkout==="card_first"&&session.payment_status==="paid"){
        // Diagnostics only: connect durable, idempotent order fulfilment before launch.
        console.info("Checkout payment confirmed",{eventId:event.id,sessionId:session.id,sku:session.metadata.sku});
      }
    }
    return res.status(200).json({received:true});
  }catch(err){console.warn("Webhook validation failed",err.type||err.name||"Error");return res.status(400).json({error:"Invalid webhook"});}
};