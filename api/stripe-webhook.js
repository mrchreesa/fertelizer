"use strict";
const Stripe = require("stripe");
module.exports = async function stripeWebhook(req,res) {
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).end();}
  const key=process.env.STRIPE_SECRET_KEY, secret=process.env.STRIPE_WEBHOOK_SECRET, signature=req.headers["stripe-signature"];
  if(!key||!secret||!signature)return res.status(503).end();
  try {
    const pieces=[];
    let size=0;
    for await(const piece of req){
      const chunk=Buffer.isBuffer(piece)?piece:Buffer.from(piece);
      size+=chunk.length;
      if(size>131072)return res.status(413).end();
      pieces.push(chunk);
    }
    const raw=Buffer.concat(pieces);
    const stripe=new Stripe(key);
    const event=stripe.webhooks.constructEvent(raw,signature,secret);
    if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)){
      const session=event.data.object;
      if(session.metadata?.site==="commonwealthcentral"&&session.metadata?.checkout==="card_first"&&session.payment_status==="paid"){
        // Diagnostics only: paid orders are fulfilled manually from the Stripe Dashboard.
        console.info("Checkout payment confirmed",{eventId:event.id,sessionId:session.id,sku:session.metadata.sku});
      }
    }
    return res.status(200).json({received:true});
  }catch(err){console.warn("Webhook validation failed",err.type||err.name||"Error");return res.status(400).json({error:"Invalid webhook"});}
};

// Attach this after exporting the handler so the raw-body setting is preserved.
module.exports.config = { api: { bodyParser: false } };
