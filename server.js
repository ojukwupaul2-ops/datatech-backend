const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || "PUT_YOUR_PAYSTACK_SECRET_HERE";
const VTPASS_API_KEY = process.env.VTPASS_API_KEY || "PUT_YOUR_VTPASS_API_KEY_HERE";
const VTPASS_SECRET_KEY = process.env.VTPASS_SECRET_KEY || "PUT_YOUR_VTPASS_SECRET_HERE";
const VTPASS_BASE = "https://api.vtpass.com/api";
async function callVTPass(endpoint, body){
  const res = await fetch(VTPASS_BASE + endpoint, {
    method:'POST',
    headers:{'Content-Type':'application/json','api-key':VTPASS_API_KEY,'secret-key':VTPASS_SECRET_KEY},
    body: JSON.stringify(body)
  });
  return await res.json();
}
function newRequestId(){ return 'DATATECH-'+Date.now()+'-'+Math.floor(Math.random()*100000); }
app.get('/api/vendor-balance', async (req,res)=>{
  try{ const d = await callVTPass('/balance', {}); res.json(d); }catch(e){ res.json({error:e.message}); }
});
app.post('/api/buy-data', async (req,res)=>{
  const {phone, network, planCode, amount} = req.body;
  const serviceMap = {'MTN':'MTN','GLO':'GLO','AIRTEL':'AIRTEL','9MOBILE':'9MOBILE'};
  try{
    const result = await callVTPass('/pay',{request_id:newRequestId(), serviceID: serviceMap[network]||'MTN', billersCode: phone, variation_code: planCode, amount: amount, phone: phone});
    if(result.code==='000') res.json({success:true, message:'Data sent', vtpass:result});
    else res.json({success:false, message: result.response_description||'VTPass failed', vtpass:result});
  }catch(e){ res.json({success:false, message:e.message}); }
});
app.post('/api/pay-bill', async (req,res)=>{
  const {disco, meter, meterType, amount, phone} = req.body;
  try{
    const result = await callVTPass('/pay',{request_id:newRequestId(), serviceID: disco, billersCode: meter, variation_code: meterType, amount: amount, phone: phone});
    if(result.code==='000') res.json({success:true, token: result.purchased_code||result.token, vtpass:result});
    else res.json({success:false, message: result.response_description, vtpass:result});
  }catch(e){ res.json({success:false, message:e.message}); }
});
app.post('/api/cable', async (req,res)=>{
  const {cable, iuc, packageCode, amount, phone} = req.body;
  try{
    const result = await callVTPass('/pay',{request_id:newRequestId(), serviceID: cable, billersCode: iuc, variation_code: packageCode, amount: amount, phone: phone});
    if(result.code==='000') res.json({success:true, vtpass:result});
    else res.json({success:false, message: result.response_description, vtpass:result});
  }catch(e){ res.json({success:false, message:e.message}); }
});
app.post('/api/verify-paystack', async (req,res)=>{
  const {reference} = req.body;
  try{
    const r = await fetch('https://api.paystack.co/transaction/verify/'+reference,{headers:{Authorization:'Bearer '+PAYSTACK_SECRET}});
    const data = await r.json();
    if(data.data && data.data.status==='success') res.json({success:true, amount: data.data.amount/100});
    else res.json({success:false});
  }catch(e){ res.json({success:false, message:e.message}); }
});
app.post('/api/paystack-webhook', async (req,res)=>{
  console.log('WEBHOOK', req.body.event, req.body.data?.amount);
  res.json({ok:true});
});
app.get('/', (req,res)=> res.send('DATATECH Backend is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Running on '+PORT));
