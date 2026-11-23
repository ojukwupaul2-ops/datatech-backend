// DATATECH BACKEND - HUSMO VERSION
// Replace old VTPass server.js with this one
// Keys go in Render -> Environment Variables, NEVER inside code

const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// --- Keys from Environment (Render) ---
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET || '';
const HUSMO_API_KEY = process.env.HUSMO_API_KEY || '';
const HUSMO_BASE = process.env.HUSMO_BASE || 'https://api.husmo.com/api';
const PORT = process.env.PORT || 3000;

// --- Helper: Talk to Husmo ---
async function callHusmo(endpoint, body) {
  const res = await fetch(HUSMO_BASE + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${HUSMO_API_KEY}`,
      'api-key': HUSMO_API_KEY
    },
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

// --- 1. Health check ---
app.get('/', (req,res)=> res.json({ ok:true, service:'DATATECH Backend - HUSMO', time: new Date().toISOString() }));
app.get('/api/health', (req,res)=> res.json({ ok:true, husmo_configured: !!HUSMO_API_KEY, paystack_configured: !!PAYSTACK_SECRET }));

// --- 2. Husmo Balance (for Admin) ---
app.get('/api/vendor-balance', async (req,res)=>{
  try{
    if(!HUSMO_API_KEY) return res.json({ ok:false, message:'HUSMO_API_KEY not set in Render' });
    const data = await getHusmo('/wallet/balance');
    res.json({ ok:true, provider:'HUSMO', data });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }); }
});

// --- 3. Husmo Plans (optional - front can use this) ---
app.get('/api/plans', async (req,res)=>{
  try{
    const data = await getHusmo('/plans');
    res.json({ ok:true, data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// --- 4. Buy Data / Airtime via Husmo ---
// Front sends: { network:'MTN', phone:'0803...', plan_id:'...', amount:450, type:'data' }
app.post('/api/buy', async (req,res)=>{
  try{
    const { network, phone, plan_id, amount, type } = req.body || {};
    if(!phone || !plan_id) return res.status(400).json({ ok:false, message:'phone and plan_id required' });
    if(!HUSMO_API_KEY) return res.status(500).json({ ok:false, message:'HUSMO_API_KEY not set' });

    const payload = {
      network: (network||'MTN').toUpperCase(),
      phone,
      plan_id,
      amount,
      type: type || 'data',
      request_id: newRequestId()
    };
    const data = await callHusmo('/buy', payload);
    // Husmo returns different shapes - forward it
    res.json({ ok:true, provider:'HUSMO', request_id: payload.request_id, data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// --- 5. Verify Paystack Payment ---
// Front sends: { reference:'...' }
app.post('/api/verify-payment', async (req,res)=>{
  try{
    const { reference } = req.body || {};
    if(!reference) return res.status(400).json({ ok:false, message:'reference required' });
    const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });
    const data = await r.json();
    const paid = data?.data?.status === 'success';
    res.json({ ok: paid, paid, amount: data?.data?.amount, data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// --- 6. Test Connection - used by Admin Test button via backend ---
app.get('/api/test-husmo', async (req,res)=>{
  try{
    if(!HUSMO_API_KEY) return res.json({ ok:false, message:'No Husmo key in backend' });
    const data = await getHusmo('/wallet/balance');
    res.json({ ok:true, message:'Connected to Husmo', data });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.listen(PORT, ()=> console.log('DATATECH Husmo backend running on ' + PORT));
