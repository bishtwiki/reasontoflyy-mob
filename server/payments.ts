import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import type {Express,RequestHandler} from 'express';
import {z} from 'zod';
import {config} from './config';
import {AppError} from './errors';
import {Store} from './store';
import type {QuoteState} from './travel';

type PaymentStatus='CREATED'|'PENDING'|'PAID'|'FAILED';
interface Payment {
 id:string;owner:string;quoteId:string;amount:number;currency:'INR';status:PaymentStatus;
 token:string;expiresAt:number;firstname:string;email:string;phone:string;productinfo:string;
 payuId?:string;updatedAt:number;
}
const asyncRoute=(fn:any):RequestHandler=>(req,res,next)=>{Promise.resolve(fn(req,res)).catch(next);};
const sha512=(value:string)=>createHash('sha512').update(value,'utf8').digest('hex');
const safeJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const cents=(value:unknown)=>Number.isFinite(Number(value))?Math.round(Number(value)*100):NaN;
const amountText=(amount:number)=>(amount/100).toFixed(2);
const publicPayment=(p:Payment)=>({id:p.id,quoteId:p.quoteId,amount:p.amount,currency:p.currency,status:p.status,expiresAt:p.expiresAt});

export function validPayUResponse(input:Record<string,unknown>,salt:string,expectedKey:string){
 const text=(name:string)=>typeof input[name]==='string'?input[name] as string:'';
 const key=text('key'),status=text('status'),hash=text('hash');
 if(key!==expectedKey||!/^[a-f0-9]{128}$/i.test(hash)||!status)return false;
 const udf=[1,2,3,4,5].map(n=>text(`udf${n}`));
 let reverse=`${salt}|${status}||||||${udf[4]}|${udf[3]}|${udf[2]}|${udf[1]}|${udf[0]}|${text('email')}|${text('firstname')}|${text('productinfo')}|${text('amount')}|${text('txnid')}|${key}`;
 const additionalCharges=text('additional_charges');
 if(additionalCharges)reverse=`${additionalCharges}|${reverse}`;
 const expected=Buffer.from(sha512(reverse),'hex'),received=Buffer.from(hash,'hex');
 return expected.length===received.length&&timingSafeEqual(expected,received);
}

export class PayU {
 constructor(private fetcher:typeof fetch=fetch){}
 get paymentEndpoint(){return config.payuEnvironment==='production'?'https://secure.payu.in/_payment':'https://test.payu.in/_payment';}
 get verifyEndpoint(){return config.payuEnvironment==='production'?'https://info.payu.in/merchant/postservice.php?form=2':'https://test.payu.in/merchant/postservice.php?form=2';}
 async verifyPayment(txnid:string){
  if(!config.payuKey||!config.payuSalt)throw new AppError(503,'PAYMENT_NOT_CONFIGURED','PayU credentials are not configured on the booking server.');
  const command='verify_payment';
  const hash=sha512(`${config.payuKey}|${command}|${txnid}|${config.payuSalt}`);
  const body=new URLSearchParams({key:config.payuKey,command,var1:txnid,hash});
  let response:Response;
  try{response=await this.fetcher(this.verifyEndpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:body.toString(),signal:AbortSignal.timeout(20000),redirect:'error'});}
  catch{throw new AppError(502,'PAYMENT_UNREACHABLE','PayU could not verify this payment. Check its status before retrying.');}
  if(!response.ok)throw new AppError(502,'PAYMENT_VERIFY_FAILED','PayU could not verify this payment.');
  try{return await response.json() as Record<string,any>;}catch{throw new AppError(502,'PAYMENT_VERIFY_FAILED','PayU returned an unreadable verification response.');}
 }
}

// Kept as a source-compatible test fixture symbol only. Production routes use PayU.
export class Razorpay {constructor(_fetcher?:typeof fetch){}}
export function validPaymentSignature(orderId:string,paymentId:string,signature:string,secret:string){
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}

export function registerPayments(app:Express,store:Store,auth:RequestHandler,gateway:any=new PayU()){
 app.post('/api/payments/orders',auth,asyncRoute(async(req:any,res:any)=>{
  const input=z.object({quoteId:z.string().min(1).max(100),firstName:z.string().trim().min(1).max(60),email:z.email().max(160),phone:z.string().regex(/^\+?[0-9 ()-]{8,20}$/)}).parse(req.body);
  const qs=store.get<QuoteState>('quote',input.quoteId,req.user.id);
  if(!qs||qs.quote.expiresAt<=Date.now())throw new AppError(410,'QUOTE_EXPIRED','Review your fare again before payment.');
  if(qs.quote.mode!=='tripjack'||qs.quote.currency!=='INR')throw new AppError(400,'PAYMENT_QUOTE','PayU checkout is only available for a current INR supplier quote.');
  if(!config.payuKey||!config.payuSalt)throw new AppError(503,'PAYMENT_NOT_CONFIGURED','PayU production credentials are not configured on the server.');
  if(!config.payuCheckoutEnabled)throw new AppError(503,'LIVE_TICKETING_UNAVAILABLE','PayU is configured, but checkout is paused until TripJack production booking and payment confirmation are connected. No payment has been started.');
  const amount=Math.round(qs.quote.amount*100);
  if(!Number.isSafeInteger(amount)||amount<100||amount>100000000)throw new AppError(400,'PAYMENT_AMOUNT','A valid INR quote is required for payment.');
  const active=store.list<Payment>('payment',req.user.id).find(p=>p.quoteId===input.quoteId&&p.amount===amount&&p.currency==='INR'&&p.expiresAt>Date.now()&&p.status==='CREATED');
  let payment=active;
  if(!payment){
   const txnid=`RF${Date.now()}${randomBytes(5).toString('hex')}`;
   payment={id:txnid,owner:req.user.id,quoteId:input.quoteId,amount,currency:'INR',status:'CREATED',token:randomBytes(32).toString('hex'),expiresAt:Math.min(qs.quote.expiresAt,Date.now()+20*60000),firstname:input.firstName,email:input.email,phone:input.phone.replace(/[^+0-9]/g,''),productinfo:`ReasonToFlyy ${qs.quote.service==='flights'?'flight':'hotel'} booking`,updatedAt:Date.now()};
   store.put('payment',payment.id,payment.owner,payment,payment.expiresAt);
  }
  res.setHeader('Cache-Control','no-store');res.json({...publicPayment(payment),checkoutUrl:`${config.publicApiUrl}/api/payments/${payment.id}/checkout?token=${payment.token}`});
 }));

 app.get('/api/payments/:id/status',auth,asyncRoute(async(req:any,res:any)=>{
  const payment=store.get<Payment>('payment',req.params.id,req.user.id);
  if(!payment)throw new AppError(404,'PAYMENT_NOT_FOUND','Payment not found.');
  res.setHeader('Cache-Control','no-store');res.json(publicPayment(payment));
 }));

 app.get('/api/payments/:id/checkout',asyncRoute(async(req:any,res:any)=>{
  const payment=store.get<Payment>('payment',req.params.id);
  const token=req.query.token;
  if(!payment||typeof token!=='string'||!/^([a-f0-9]{64})$/.test(token)||!timingSafeEqual(Buffer.from(payment.token),Buffer.from(token)))throw new AppError(404,'PAYMENT_NOT_FOUND','Payment not found.');
  if(payment.expiresAt<=Date.now())throw new AppError(410,'PAYMENT_EXPIRED','This checkout link expired. Return to the app and review the fare again.');
  if(payment.status!=='CREATED')throw new AppError(409,'PAYMENT_ALREADY_PROCESSED','This payment has already been submitted. Check its status in the app.');
  const fields:Record<string,string>={
   key:config.payuKey,txnid:payment.id,amount:amountText(payment.amount),productinfo:payment.productinfo,firstname:payment.firstname,email:payment.email,phone:payment.phone,
   surl:`${config.publicApiUrl}/api/payments/payu/return`,furl:`${config.publicApiUrl}/api/payments/payu/return`,
   udf1:payment.quoteId,udf2:payment.id,udf3:'',udf4:'',udf5:'',
  };
  const requestHash=sha512(`${fields.key}|${fields.txnid}|${fields.amount}|${fields.productinfo}|${fields.firstname}|${fields.email}|${fields.udf1}|${fields.udf2}|${fields.udf3}|${fields.udf4}|${fields.udf5}||||||${config.payuSalt}`);
  fields.hash=requestHash;
  const nonce=randomBytes(18).toString('base64');
  const action=(gateway instanceof PayU?gateway.paymentEndpoint:config.payuEnvironment==='production'?'https://secure.payu.in/_payment':'https://test.payu.in/_payment');
  const form=Object.entries(fields).map(([key,value])=>`<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join('');
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',`default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; form-action ${new URL(action).origin}; base-uri 'none'; frame-ancestors 'none'`);
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Continue to PayU</title><style>body{font:16px system-ui;background:#fbf8f1;color:#17283a;display:grid;min-height:100vh;place-items:center;margin:0;padding:24px}.card{max-width:390px;padding:26px;border:1px solid #eadfc8;border-radius:20px;background:#fff;box-shadow:0 18px 55px #17283a18;text-align:center}.mark{font-size:30px;color:#b6955d}p{color:#667085;line-height:1.6}button{border:0;border-radius:14px;background:#d4b879;color:#17283a;font-weight:700;padding:14px 24px}</style></head><body><main class="card"><div class="mark">✦</div><h1>Secure PayU checkout</h1><p>Continue securely to PayU to pay <strong>₹${(payment.amount/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>.</p><form id="payu" method="post" action="${escapeHtml(action)}">${form}<button type="submit">Continue to PayU</button></form><p id="message" role="status">Opening secure payment…</p></main><script nonce="${nonce}">document.getElementById('payu').submit()</script></body></html>`);
 }));

 app.post('/api/payments/payu/return',asyncRoute(async(req:any,res:any)=>{
  const input=req.body as Record<string,unknown>;
  const txnid=typeof input.txnid==='string'?input.txnid:'';
  const payment=txnid?store.get<Payment>('payment',txnid):undefined;
  if(!payment)throw new AppError(404,'PAYMENT_NOT_FOUND','This PayU transaction was not found.');
  if(payment.status==='PAID')return paymentResult(res,'Payment verified','PayU has already confirmed this payment. Check the app for booking status.',true);
  if(!validPayUResponse(input,config.payuSalt,config.payuKey)||cents(input.amount)!==payment.amount||String(input.email||'').toLowerCase()!==payment.email.toLowerCase())throw new AppError(400,'PAYMENT_RESPONSE_INVALID','PayU response verification failed. Do not retry the payment yet.');
  if(String(input.status).toLowerCase()!=='success'){
   payment.status='FAILED';payment.updatedAt=Date.now();store.put('payment',payment.id,payment.owner,payment,payment.expiresAt);
   return paymentResult(res,'Payment not completed','PayU did not confirm this payment. No booking was created. You can return to the app.',false);
  }
  const verified=await gateway.verifyPayment(payment.id);
  const detail=verified?.transaction_details?.[payment.id];
  if(!detail||String(detail.status).toLowerCase()!=='success'||!['captured','success'].includes(String(detail.unmappedstatus).toLowerCase())||cents(detail.amt??detail.amount)!==payment.amount||String(detail.txnid||payment.id)!==payment.id){
   payment.status='PENDING';payment.updatedAt=Date.now();store.put('payment',payment.id,payment.owner,payment,payment.expiresAt);
   return paymentResult(res,'Payment verification pending','PayU has not confirmed the final payment status yet. Check the app before retrying.',false);
  }
  payment.status='PAID';payment.payuId=String(detail.mihpayid||'');payment.updatedAt=Date.now();store.put('payment',payment.id,payment.owner,payment,payment.expiresAt);
  return paymentResult(res,'Payment verified','PayU confirmed this payment. Return to ReasonToFlyy to check your booking status.',true);
 }));
}

function paymentResult(res:any,title:string,message:string,success:boolean){
 const color=success?'#087f5b':'#9b3a32';
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 return res.status(200).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · ReasonToFlyy</title><style>body{font:16px system-ui;background:#fbf8f1;color:#17283a;display:grid;min-height:100vh;place-items:center;margin:0;padding:24px}.card{max-width:430px;padding:28px;border:1px solid #eadfc8;border-radius:20px;background:#fff;box-shadow:0 18px 55px #17283a18;text-align:center}.status{color:${color};font-weight:800}</style></head><body><main class="card"><p class="status">${escapeHtml(title)}</p><h1>ReasonToFlyy</h1><p>${escapeHtml(message)}</p><a href="reasontoflyy://">Return to app</a></main></body></html>`);
}
