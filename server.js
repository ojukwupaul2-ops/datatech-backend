// DATATECH BACKEND - HUSMO VERSION - NO CORS PACKAGE
// This version does NOT need 'cors' in package.json
// It handles CORS manually, so old package.json (express only) will work

const express = require('express');
const app = express();
app.use(express.json());

// --- Manual CORS (replaces cors package) ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, api-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || '';
const HUSMO_API_KEY = process.env.HUSMO_API_KEY || '';
const HUSMO_BASE = process.env.HUSMO_BASE || 'https://api.husmo.com/api';
const PORT = process.env.PORT || 3000;

async function callHusmo(endpoint, body) {
  const res = await fetch(HUSMO_BASE + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${HUSMO_API_KEY}`, 'api-key': HUSMO_API_KEY },
    body: JSON.stringify(body || {})
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e){ return { raw: text, status: res.status }; }
}
async function getHusmo(endpoint) {
  const res = await fetch(HUSMO_BASE + endpoint, {
    headers: { 'Authorization': `Bearer ${HUSMO_API_KEY}`, 'api-key': HUSMO_API_KEY }
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch(e){ return { raw: text, status: res.status }; }
}
function newRequestId(){ return 'DATATECH' + Date.now() + Math.floor(Math.random()*1000); }

app.get('/', (req,res)=> res.json({ ok:true, service:'DATATECH Backend - HUSMO NO-CORS', time: new Date().toISOString() }));
app.get('/api/health', (req,res)=> res.json({ ok:true, husmo_configured: !!HUSMO_API_KEY, paystack_configured: !!PAYSTACK_SECRET }));

app.get('/api/vendor-balance', async (req,res)=>{
  try{
    if(!HUSMO_API_KEY) return res.json({ ok:false, message:'HUSMO_API_KEY not set in Render' });
    const data = await getHusmo('/wallet/balance');
    res.json({ ok:true, provider:'HUSMO', data });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

app.get('/api/plans', async (req,res)=>{
  try{ const data = await getHusmo('/plans'); res.json({ ok:true, data }); }
  catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/buy', async (req,res)=>{
  try{
    const { network, phone, plan_id, amount, type } = req.body || {};
    if(!phone || !plan_id) return res.status(400).json({ ok:false, message:'phone and plan_id required' });
    if(!HUSMO_API_KEY) return res.status(500).json({ ok:false, message:'HUSMO_API_KEY not set' });
    const payload = { network: (network||'MTN').toUpperCase(), phone, plan_id, amount, type: type || 'data', request_id: newRequestId() };
    const data = await callHusmo('/buy', payload);
    res.json({ ok:true, provider:'HUSMO', request_id: payload.request_id, data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/verify-payment', async (req,res)=>{
  try{
    const { reference } = req.body || {};
    if(!reference) return res.status(400).json({ ok:false, message:'reference required' });
    const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
    const data = await r.json();
    const paid = data?.data?.status === 'success';
    res.json({ ok: paid, paid, amount: data?.data?.amount, data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/test-husmo', async (req,res)=>{
  try{
    if(!HUSMO_API_KEY) return res.json({ ok:false, message:'No Husmo key in backend' });
    const data = await getHusmo('/wallet/balance');
    res.json({ ok:true, message:'Connected to Husmo', data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.listen(PORT, ()=> console.log('DATATECH Husmo backend running on ' + PORT));
