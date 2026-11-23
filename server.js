// DATATECH BACKEND - HUSMO CORRECT VERSION
// Base: https://husmodataapi.com/api
// Auth: Token <token>  (NOT Bearer)
// Buy Data: POST /data/ {network, mobile_number, plan}
// Buy Airtime: POST /topup/ {network, mobile_number, amount}
// Balance: GET /user/

const express = require('express');
const app = express();
app.use(express.json());
app.use((req,res,next)=>{
  res.header('Access-Control-Allow-Origin','*');
  res.header('Access-Control-Allow-Headers','Content-Type, Authorization, api-key');
  res.header('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

const PAYSTACK_SECRET = (process.env.PAYSTACK_SECRET||'').trim();
const HUSMO_API_KEY = (process.env.HUSMO_API_KEY||'').trim();
const HUSMO_BASE = (process.env.HUSMO_BASE||'https://husmodataapi.com/api').trim().replace(/\/$/,'');
const PORT = process.env.PORT||3000;

async function callHusmo(path, body){
  const res = await fetch(HUSMO_BASE+path, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Token ${HUSMO_API_KEY}`},
    body: JSON.stringify(body||{})
  });
  const t = await res.text();
  try{return JSON.parse(t);}catch(e){return {raw:t,status:res.status};}
}
async function getHusmo(path){
  const res = await fetch(HUSMO_BASE+path, {headers:{'Authorization':`Token ${HUSMO_API_KEY}`}});
  const t = await res.text();
  try{return JSON.parse(t);}catch(e){return {raw:t,status:res.status};}
}
function newId(){return 'DATATECH'+Date.now()+Math.floor(Math.random()*1000);}

app.get('/',(req,res)=>res.json({ok:true,service:'DATATECH Backend - HUSMO CORRECT',base:HUSMO_BASE,time:new Date().toISOString()}));
app.get('/api/health',(req,res)=>res.json({ok:true,husmo_configured:!!HUSMO_API_KEY,paystack_configured:!!PAYSTACK_SECRET,base:HUSMO_BASE}));

// Balance / User - Husmo GET /user/
app.get('/api/vendor-balance', async (req,res)=>{
  try{
    if(!HUSMO_API_KEY) return res.json({ok:false,message:'HUSMO_API_KEY not set'});
    const data = await getHusmo('/user/');
    res.json({ok:true,provider:'HUSMO',data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.get('/api/test-husmo', async (req,res)=>{
  try{
    if(!HUSMO_API_KEY) return res.json({ok:false,message:'No Husmo key'});
    const data = await getHusmo('/user/');
    res.json({ok:true,message:'Connected to Husmo',data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

// Plans - GET /network/ (data plans list)
app.get('/api/plans', async (req,res)=>{
  try{ const data = await getHusmo('/network/'); res.json({ok:true,data}); }
  catch(e){res.status(500).json({ok:false,error:e.message});}
});

// Networks - GET /get/network/
app.get('/api/networks', async (req,res)=>{
  try{ const data = await getHusmo('/get/network/'); res.json({ok:true,data}); }
  catch(e){res.status(500).json({ok:false,error:e.message});}
});

// Buy Data - POST /data/ {network, mobile_number, plan, Ported_number?}
app.post('/api/buy', async (req,res)=>{
  try{
    const {network, phone, mobile_number, plan, plan_id, amount, type} = req.body||{};
    const phoneNum = mobile_number||phone;
    const planId = plan||plan_id;
    if(!phoneNum||!planId) return res.status(400).json({ok:false,message:'mobile_number and plan required'});
    if(!HUSMO_API_KEY) return res.status(500).json({ok:false,message:'HUSMO_API_KEY not set'});
    const payload = {network, mobile_number:phoneNum, plan:planId, Ported_number:'', request_id:newId()};
    // If type is airtime, route to topup
    if(type==='airtime'){
      const a = await callHusmo('/topup/', {network, mobile_number:phoneNum, amount});
      return res.json({ok:true,provider:'HUSMO',request_id:payload.request_id,data:a});
    }
    const data = await callHusmo('/data/', payload);
    res.json({ok:true,provider:'HUSMO',request_id:payload.request_id,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

// Buy Airtime - POST /topup/
app.post('/api/buy-airtime', async (req,res)=>{
  try{
    const {network, phone, mobile_number, amount} = req.body||{};
    const phoneNum = mobile_number||phone;
    if(!phoneNum||!amount) return res.status(400).json({ok:false,message:'mobile_number and amount required'});
    const data = await callHusmo('/topup/', {network, mobile_number:phoneNum, amount});
    res.json({ok:true,provider:'HUSMO',data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

// Verify Paystack
app.post('/api/verify-payment', async (req,res)=>{
  try{
    const {reference}=req.body||{};
    if(!reference) return res.status(400).json({ok:false,message:'reference required'});
    const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`,{headers:{Authorization:`Bearer ${PAYSTACK_SECRET}`}});
    const data = await r.json();
    const paid = data?.data?.status==='success';
    res.json({ok:paid,paid,amount:data?.data?.amount,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.listen(PORT,()=>console.log('DATATECH Husmo correct backend on '+PORT));
