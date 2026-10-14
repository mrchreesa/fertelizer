(async function(){
  const h=document.getElementById("heading"), m=document.getElementById("message"), r=document.getElementById("retry");
  const id=new URLSearchParams(location.search).get("session_id");
  if(!id){h.textContent="Missing order reference";m.textContent="Please contact us if a payment has already been taken.";r.hidden=false;return;}
  try{
    const res=await fetch("/api/test-session-status?session_id="+encodeURIComponent(id),{cache:"no-store"});
    const data=await res.json();if(!res.ok)throw Error("Unable to verify your payment at the moment.");
    if(data.paymentStatus==="paid"){h.textContent="Test payment successful";m.textContent="Stripe recorded the test transaction successfully. No money has been taken, and no physical order will be shipped.";}
    else if(data.status==="open"){h.textContent="Test payment was not completed";m.textContent="No successful test transaction was found. You may try again.";r.hidden=false;}
    else{h.textContent="Test payment awaiting confirmation";m.textContent="The test transaction is still pending. Do not interpret this as a successful payment.";}
  }catch(_){h.textContent="Unable to verify the test payment";m.textContent="Please contact the website administrator to check Stripe test transactions. No real money is at risk.";}
})();
