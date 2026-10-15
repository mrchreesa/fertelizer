(async function(){
  const h=document.getElementById("heading"), m=document.getElementById("message"), r=document.getElementById("retry");
  const id=new URLSearchParams(location.search).get("session_id");
  if(!id){h.textContent="Missing order reference";m.textContent="Please contact us if a payment has already been taken.";r.hidden=false;return;}
  try{
    const res=await fetch("/api/session-status?session_id="+encodeURIComponent(id),{cache:"no-store"});
    const data=await res.json();if(!res.ok)throw Error("Unable to verify your payment at the moment.");
    if(data.paymentStatus==="paid"){h.textContent="Thank you, your payment is confirmed";m.textContent="Your payment was received. Please retain your Stripe receipt. We will contact you if we need anything about your order.";}
    else if(data.status==="open"){h.textContent="Your payment is not complete";m.textContent="No confirmed payment was found. Please return to the shop to try again.";r.hidden=false;}
    else{h.textContent="Payment awaiting confirmation";m.textContent="Stripe has not confirmed your payment yet. Please check again shortly or contact us before placing another order.";}
  }catch(_){h.textContent="We cannot verify your payment yet";m.textContent="Please check your Stripe receipt or contact info@commonwealthcentral.co.uk before trying again, to avoid paying twice.";}
})();
