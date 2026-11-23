// DATATECH BACKEND - HUSMO FINAL v3 - ALL NETWORKS
// Network IDs: 1=MTN, 2=GLO, 3=9MOBILE, 4=AIRTEL
// Buy Data: POST /data/ {network:1, mobile_number, plan:369}
// Buy Airtime: POST /topup/ {network:1, mobile_number, amount}
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
function mapNetwork(net){
  if(net===undefined||net===null) return 1;
  var s=String(net).toLowerCase().trim();
  if(s==='1'||s.indexOf('mtn')>=0) return 1;
  if(s==='2'||s.indexOf('glo')>=0) return 2;
  if(s==='3'||s.indexOf('9mobile')>=0||s.indexOf('etisalat')>=0) return 3;
  if(s==='4'||s.indexOf('airtel')>=0) return 4;
  var n=parseInt(s,10); if(!isNaN(n)&&n>=1&&n<=4) return n;
  return 1;
}
function mapPlan(plan, networkId){
  if(plan===undefined||plan===null) return plan;
  var s=String(plan).trim();
  if(/^\d+$/.test(s)) return parseInt(s,10);
  var low=s.toLowerCase().replace(/\s+/g,' ').trim();
  // --- MTN ---
  var mtn={'mtn sme 500mb':369,'mtn 500mb':369,'mtn sme 1gb':51,'mtn 1gb':51,'mtn sme 2gb':50,'mtn 2gb':50,'mtn sme 3gb':225,'mtn 3gb':225,'mtn sme 10gb':466,'mtn 10gb':466,'mtn sme2 500mb':267,'mtn sme2 1gb':262,'mtn sme2 1.5gb':301,'mtn sme2 2gb':263,'mtn sme2 3gb':264,'mtn sme2 5gb':265,'mtn sme2 10gb':266,'mtn sme2 100mb':302,'mtn corporate gifting 500mb':99,'mtn corporate 1gb':100,'mtn gifting 500mb':373,'mtn gifting 1.5gb':61,'mtn gifting 2gb':283,'mtn gifting 5gb':309,'mtn awoof 500mb':500,'mtn awoof 4gb':499,'mtn awoof 5gb':498};
  // --- AIRTEL ---
  var airtel={'airtel gifting 500mb':387,'airtel 500mb':431,'airtel corporate 500mb':372,'airtel gifting 1gb':125,'airtel 1gb':125,'airtel corporate 1gb':213,'airtel gifting 1.5gb':282,'airtel gifting 2gb':126,'airtel 2gb':126,'airtel corporate 2gb':214,'airtel gifting 3gb':133,'airtel 3gb':133,'airtel gifting 4gb':134,'airtel 4gb':134,'airtel gifting 8gb':135,'airtel awoof 1gb':404,'airtel awoof 1.5gb':425,'airtel awoof 2gb':430,'airtel awoof 500mb':431,'airtel awoof 150mb':442,'airtel awoof 300mb':443,'airtel awoof 600mb':444,'airtel awoof 5gb':445,'airtel awoof 3gb':446,'airtel awoof 10gb':448,'airtel corporate 3gb':464,'airtel gifting 6gb':486,'airtel gifting 100mb':383,'airtel gifting 300mb':385};
  // --- GLO ---
  var glo={'glo corporate 500mb':255,'glo 500mb':255,'glo corporate 1gb':256,'glo 1gb':256,'glo corporate 2gb':257,'glo 2gb':257,'glo corporate 3gb':258,'glo 3gb':258,'glo corporate 5gb':259,'glo 5gb':259,'glo corporate 10gb':260,'glo 10gb':260,'glo corporate 200mb':261,'glo 200mb':261,'glo gifting 1.5gb':37,'glo gifting 2.6gb':32,'glo gifting 5.2gb':31,'glo gifting 1.1gb':295,'glo awoof 750mb':326,'glo awoof 1.5gb':327,'glo awoof 2.5gb':328,'glo awoof 10gb':329,'glo corporate 1gb night':438,'glo corporate 3gb night':439,'glo corporate 5gb night':440,'glo corporate 10gb night':441};
  // --- 9MOBILE ---
  var nine={'9mobile sme 500mb':268,'9mobile 500mb':268,'9mobile sme 1gb':241,'9mobile 1gb':241,'9mobile sme 1.5gb':243,'9mobile 1.5gb':243,'9mobile sme 2gb':242,'9mobile 2gb':242,'9mobile sme 3gb':244,'9mobile 3gb':244,'9mobile sme 4gb':245,'9mobile 4gb':245,'9mobile sme 5gb':247,'9mobile 5gb':247,'9mobile sme 10gb':248,'9mobile 10gb':248,'9mobile gifting 500mb':123,'9mobile gifting 250mb':122,'9mobile gifting 100mb':118,'9mobile corporate 1gb':269,'9mobile corporate 2gb':271,'9mobile awoof 3gb':497};
  var table = {};
  if(networkId===1) table=mtn;
  else if(networkId===4) table=airtel;
  else if(networkId===2) table=glo;
  else if(networkId===3) table=nine;
  else table=Object.assign({},mtn,airtel,glo,nine);
  // Extra 9Mobile/Airtel big plans from last screenshot
  var extra={'9mobile corporate 7.5gb':280,'9mobile corporate 11gb':281,'9mobile awoof 2gb 1day':284,'9mobile corporate 10gb':291,'9mobile corporate 5gb':295,'9mobile awoof 1gb 1day':310,'9mobile gifting 200mb':321,'9mobile gifting 2.5gb':322,'9mobile gifting 35gb':323,'9mobile gifting 22gb':324,'9mobile awoof 2.5gb 1day':340,'9mobile awoof 1.5gb 7days':367,'9mobile corporate 40gb':458,'9mobile corporate 250mb':478,'9mobile awoof 1gb 30days':495,'9mobile awoof 2gb 30days':496,'airtel gifting 35gb':132,'airtel gifting 13gb':138,'airtel gifting 75gb':139,'airtel gifting 100gb':140,'airtel gifting 160gb':141,'airtel corporate 5gb':215};
  Object.assign(table, extra);
  if(table[low]!==undefined) return table[low];
  // Generic fallback by size + network
  if(low.indexOf('500mb')>=0){ if(networkId===1) return 369; if(networkId===4) return 431; if(networkId===2) return 255; if(networkId===3) return 268; }
  if(low.indexOf('1gb')>=0){ if(networkId===1) return 51; if(networkId===4) return 125; if(networkId===2) return 256; if(networkId===3) return 241; }
  if(low.indexOf('2gb')>=0){ if(networkId===1) return 50; if(networkId===4) return 126; if(networkId===2) return 257; if(networkId===3) return 242; }
  if(low.indexOf('3gb')>=0){ if(networkId===1) return 225; if(networkId===4) return 133; if(networkId===2) return 258; if(networkId===3) return 244; }
  if(low.indexOf('5gb')>=0){ if(networkId===1) return 265; if(networkId===2) return 259; if(networkId===3) return 247; if(networkId===4) return 445; }
  if(low.indexOf('10gb')>=0){ if(networkId===1) return 466; if(networkId===2) return 260; if(networkId===3) return 248; if(networkId===4) return 448; }
  return s;
}
async function callHusmo(path, body){
  const res = await fetch(HUSMO_BASE+path, {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Token ${HUSMO_API_KEY}`},body:JSON.stringify(body||{})});
  const t = await res.text(); try{return JSON.parse(t);}catch(e){return {raw:t,status:res.status};}
}
async function getHusmo(path){
  const res = await fetch(HUSMO_BASE+path, {headers:{'Authorization':`Token ${HUSMO_API_KEY}`}});
  const t = await res.text(); try{return JSON.parse(t);}catch(e){return {raw:t,status:res.status};}
}
function newId(){return 'DATATECH'+Date.now()+Math.floor(Math.random()*1000);}
function husmoOk(d){
  if(!d) return false;
  if(d.status==='success'||d.success===true||d.code==='000'||d.code===200) return true;
  if(d.message && String(d.message).toLowerCase().indexOf('success')>=0) return true;
  if(d.data && (d.data.status==='success'||d.data.success===true)) return true;
  return false;
}
app.get('/',(req,res)=>res.json({ok:true,service:'DATATECH Backend - HUSMO FINAL v3 ALL NETWORKS',base:HUSMO_BASE,time:new Date().toISOString()}));
app.get('/api/health',(req,res)=>res.json({ok:true,husmo_configured:!!HUSMO_API_KEY,paystack_configured:!!PAYSTACK_SECRET,base:HUSMO_BASE}));
app.get('/api/vendor-balance', async (req,res)=>{ try{ if(!HUSMO_API_KEY) return res.json({ok:false,message:'HUSMO_API_KEY not set'}); const data=await getHusmo('/user/'); res.json({ok:true,provider:'HUSMO',data}); }catch(e){res.status(500).json({ok:false,error:e.message});} });
app.get('/api/test-husmo', async (req,res)=>{ try{ if(!HUSMO_API_KEY) return res.json({ok:false,message:'No Husmo key'}); const data=await getHusmo('/user/'); res.json({ok:true,message:'Connected to Husmo',data}); }catch(e){res.status(500).json({ok:false,error:e.message});} });
app.get('/api/plans', async (req,res)=>{ try{const data=await getHusmo('/network/'); res.json({ok:true,data});}catch(e){res.status(500).json({ok:false,error:e.message});} });
app.get('/api/networks', async (req,res)=>{ try{const data=await getHusmo('/get/network/'); res.json({ok:true,data});}catch(e){res.status(500).json({ok:false,error:e.message});} });
app.post('/api/buy', async (req,res)=>{
  try{
    const {network, phone, mobile_number, plan, plan_id, amount, type} = req.body||{};
    const phoneNum = mobile_number||phone; const planRaw = plan||plan_id;
    if(!phoneNum||!planRaw) return res.status(400).json({ok:false,message:'mobile_number and plan required'});
    if(!HUSMO_API_KEY) return res.status(500).json({ok:false,message:'HUSMO_API_KEY not set'});
    const netId = mapNetwork(network);
    if(type==='airtime'){
      const a = await callHusmo('/topup/', {network:netId, mobile_number:phoneNum, amount});
      if(!husmoOk(a)) return res.json({ok:false,provider:'HUSMO',message:'Husmo rejected airtime',data:a});
      return res.json({ok:true,provider:'HUSMO',data:a});
    }
    const planId = mapPlan(planRaw, netId);
    const payload = {network:netId, mobile_number:phoneNum, plan:planId, Ported_number:false, request_id:newId()};
    const data = await callHusmo('/data/', payload);
    if(!husmoOk(data)){ return res.json({ok:false,provider:'HUSMO',message:'Husmo rejected - check Plan ID / balance',sent:payload,data}); }
    res.json({ok:true,provider:'HUSMO',request_id:payload.request_id,sent:payload,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.post('/api/buy-airtime', async (req,res)=>{
  try{
    const {network, phone, mobile_number, amount} = req.body||{};
    const phoneNum = mobile_number||phone;
    if(!phoneNum||!amount) return res.status(400).json({ok:false,message:'mobile_number and amount required'});
    const netId = mapNetwork(network);
    const data = await callHusmo('/topup/', {network:netId, mobile_number:phoneNum, amount});
    if(!husmoOk(data)) return res.json({ok:false,provider:'HUSMO',message:'Husmo rejected airtime',data});
    res.json({ok:true,provider:'HUSMO',data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.post('/api/verify-payment', async (req,res)=>{
  try{
    const {reference}=req.body||{};
    if(!reference) return res.status(400).json({ok:false,message:'reference required'});
    const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`,{headers:{Authorization:`Bearer ${PAYSTACK_SECRET}`}});
    const data = await r.json(); const paid = data?.data?.status==='success';
    res.json({ok:paid,paid,amount:data?.data?.amount,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

// --- Cable TV: POST /cablesub/ {cablename, smart_card_number, plan} ---
function mapCablePlan(plan){
  if(plan===undefined||plan===null) return plan;
  var s=String(plan).trim();
  if(/^\d+$/.test(s)) return parseInt(s,10);
  var low=s.toLowerCase().replace(/\s+/g,' ').trim();
  var c={'gotv max':2,'dstv yanga':6,'dstv compact':7,'dstv compact plus':8,'dstv premium':9,'classic':11,'basic':12,'smart':13,'nova':14,'super':15,'goeasy':16,'gostarter':17,'dstv confam':19,'dstv padi':20,'dstv asia':23,'dstv premium french':24,'dstv premium asia':25,'dstv compact + extra view':29,'dstv premium + extra view':30,'gotv smallie monthly':34,'gotv smallie quarterly':35,'gotv smallie yearly':36,'nova weekly':37,'basic weekly':38,'smart weekly':39,'classic weekly':40,'super weekly':41,'goselect':47,'gosports':51,'gotv smallie':34,'gotv jolli':47};
  if(c[low]!==undefined) return c[low];
  return s;
}
function mapCableName(name){
  if(name===undefined||name===null) return 1;
  var s=String(name).toLowerCase();
  if(s.indexOf('gotv')>=0||s==='1') return 1;
  if(s.indexOf('dstv')>=0||s.indexOf('dstv')>=0||s==='2') return 2;
  if(s.indexOf('startime')>=0||s.indexOf('startimes')>=0||s==='3') return 3;
  var n=parseInt(s,10); if(!isNaN(n)) return n; return 1;
}
app.post('/api/buy-cable', async (req,res)=>{
  try{
    const {cablename, cable, smart_card_number, iuc, plan, plan_id} = req.body||{};
    const card = smart_card_number||iuc;
    const planRaw = plan||plan_id;
    if(!card||!planRaw) return res.status(400).json({ok:false,message:'smart_card_number and plan required'});
    const cabId = mapCableName(cablename||cable);
    const planId = mapCablePlan(planRaw);
    const payload = {cablename:cabId, smart_card_number:card, plan:planId, request_id:newId()};
    const data = await callHusmo('/cablesub/', payload);
    if(!husmoOk(data)) return res.json({ok:false,provider:'HUSMO',message:'Husmo rejected cable',sent:payload,data});
    res.json({ok:true,provider:'HUSMO',sent:payload,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.get('/api/validate-iuc', async (req,res)=>{
  try{
    const {smart_card_number, cablename} = req.query||{};
    const data = await getHusmo(`/validateiuc?smart_card_number=${smart_card_number}&cablename=${mapCableName(cablename)}`);
    res.json({ok:true,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
// --- Electricity / Bill: POST /billpayment/ {disconame, meternumber, mtype, amount} ---
function mapDisco(d){
  if(d===undefined||d===null) return d;
  var s=String(d).trim().toLowerCase();
  if(/^\d+$/.test(s)) return parseInt(s,10);
  var m={'ikeja':1,'ikeja electric':1,'eko':2,'eko electric':2,'abuja':3,'abuja electric':3,'kano':4,'kano electric':4,'enugu':5,'enugu electric':5,'eedc':5,'port harcourt':6,'port harcourt electric':6,'ibadan':7,'ibadan electric':7,'kaduna':8,'kaduna electric':8,'jos':9,'jos electric':9,'benin':10,'benin electric':10,'yola':11,'yola electric':11,'aba':12,'aba electric':12};
  if(m[s]!==undefined) return m[s];
  return d;
}
app.post('/api/buy-bill', async (req,res)=>{
  try{
    const {disconame, disco, meternumber, meter, mtype, amount} = req.body||{};
    const meterNum = meternumber||meter;
    if(!meterNum||!amount) return res.status(400).json({ok:false,message:'meternumber and amount required'});
    const payload = {disconame:mapDisco(disconame||disco), meternumber:meterNum, mtype:mtype||'prepaid', amount, request_id:newId()};
    const data = await callHusmo('/billpayment/', payload);
    if(!husmoOk(data)) return res.json({ok:false,provider:'HUSMO',message:'Husmo rejected bill',sent:payload,data});
    res.json({ok:true,provider:'HUSMO',sent:payload,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.get('/api/validate-meter', async (req,res)=>{
  try{
    const {meternumber, disconame, mtype} = req.query||{};
    const data = await getHusmo(`/validatemeter?meternumber=${meternumber}&disconame=${disconame}&mtype=${mtype||'prepaid'}`);
    res.json({ok:true,data});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.listen(PORT,()=>console.log('DATATECH Husmo FINAL v3 on '+PORT));
