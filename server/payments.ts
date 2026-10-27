import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import type {Express,RequestHandler} from 'express';
import {z} from 'zod';
import {config} from './config';
import {AppError} from './errors';
import {Store} from './store';
import type {QuoteState} from './travel';

export class Razorpay {
 constructor(private fetcher:typeof fetch=fetch){}
 async request(path:string,body?:unknown){
  if(!config.razorpayKeyId.startsWith('rzp_test_')||!config.razorpaySecret)throw new AppError(503,'PAYMENT_NOT_CONFIGURED','Razorpay test credentials are required.');
  let response:Response;
  try{response=await this.fetcher(`https://api.razorpay.com/v1${path}`,{method:body?'POST':'GET',headers:{Authorization:`Basic ${Buffer.from(`${config.razorpayKeyId}:${config.razorpaySecret}`).toString('base64')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000),redirect:'error'});}catch{throw new AppError(502,'PAYMENT_UNREACHABLE','Razorpay did not respond. Please check the payment status before retrying.');}
  if(!response.ok)throw new AppError(502,'PAYMENT_REJECTED',response.status===401?'Razorpay did not accept the configured test credentials.':'Razorpay could not complete this request.');
  return await response.json() as Record<string,any>;
 }
}
export function validPaymentSignature(orderId:string,paymentId:string,signature:string,secret:string){
 if(!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest();
 return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
interface Payment {id:string;owner:string;quoteId:string;amount:number;currency:string;status:'CREATED'|'TEST_AUTHORIZED'|'TEST_PAID';token:string;expiresAt:number;paymentId?:string}
const asyncRoute=(fn:any):RequestHandler=>(req,res,next)=>{Promise.resolve(fn(req,res)).catch(next);};
const safeJson=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
const publicPayment=(p:Payment)=>({id:p.id,quoteId:p.quoteId,amount:p.amount,currency:p.currency,status:p.status,testMode:true,expiresAt:p.expiresAt});
export function registerPayments(app:Express,store:Store,auth:RequestHandler,gateway=new Razorpay()){
 app.post('/api/payments/orders',auth,asyncRoute(async(req:any,res:any)=>{
  const {quoteId}=z.object({quoteId:z.string().min(1).max(100)}).parse(req.body);
  const qs=store.get<QuoteState>('quote',quoteId,req.user.id);
  if(!qs||qs.quote.expiresAt<=Date.now())throw new AppError(410,'QUOTE_EXPIRED','Review your fare again before testing payment.');
  const quote=qs.quote;const amount=Math.round(quote.amount*100);
  if(quote.currency!=='INR'||!Number.isSafeInteger(amount)||amount<100||amount>100000000)throw new AppError(400,'PAYMENT_AMOUNT','A valid INR quote is required for this test payment.');
  let p=store.list<Payment>('payment',req.user.id).find(p=>p.quoteId===quoteId&&p.expiresAt>Date.now()&&p.amount===amount&&p.currency===quote.currency);
  if(!p){
   const order=await gateway.request('/orders',{amount,currency:quote.currency,receipt:randomBytes(16).toString('hex'),notes:{purpose:'TEST ONLY - no supplier ticket',quoteId}});
   if(!/^order_[a-zA-Z0-9]+$/.test(order.id)||order.amount!==amount||order.currency!==quote.currency)throw new AppError(502,'PAYMENT_ORDER','Razorpay returned an unexpected order.');
   p={id:order.id,owner:req.user.id,quoteId,amount,currency:quote.currency,status:'CREATED',token:randomBytes(32).toString('hex'),expiresAt:Date.now()+30*60000};store.put('payment',p.id,p.owner,p);
  }
  res.json({...publicPayment(p),checkoutUrl:`${config.publicApiUrl}/api/payments/${p.id}/checkout?token=${p.token}`});
 }));
 app.get('/api/payments/:id/status',auth,asyncRoute(async(req:any,res:any)=>{
  const p=store.get<Payment>('payment',req.params.id,req.user.id);if(!p)throw new AppError(404,'PAYMENT_NOT_FOUND','Payment not found.');
  res.setHeader('Cache-Control','no-store');res.json(publicPayment(p));
 }));
 const authorized=(id:string,token:unknown)=>{
  const p=store.get<Payment>('payment',id);
  if(!p||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!timingSafeEqual(Buffer.from(p.token),Buffer.from(token)))throw new AppError(404,'PAYMENT_NOT_FOUND','Payment not found.');
  if(p.expiresAt<=Date.now())throw new AppError(410,'PAYMENT_EXPIRED','This checkout link expired. Return to the app.');
  return p;
 };
 app.post('/api/payments/:id/verify',asyncRoute(async(req:any,res:any)=>{
  const input=z.object({token:z.string(),razorpay_order_id:z.string().regex(/^order_[a-zA-Z0-9]+$/),razorpay_payment_id:z.string().regex(/^pay_[a-zA-Z0-9]+$/),razorpay_signature:z.string()}).parse(req.body);
  const p=authorized(req.params.id,input.token);
  if(input.razorpay_order_id!==p.id||!validPaymentSignature(p.id,input.razorpay_payment_id,input.razorpay_signature,config.razorpaySecret))throw new AppError(400,'PAYMENT_SIGNATURE','Payment signature verification failed.');
  const payment=await gateway.request(`/payments/${input.razorpay_payment_id}`);
  if(payment.order_id!==p.id||payment.amount!==p.amount||payment.currency!==p.currency||!['authorized','captured'].includes(payment.status))throw new AppError(409,'PAYMENT_UNCONFIRMED','Razorpay has not confirmed this payment amount and status.');
  p.paymentId=payment.id;p.status=payment.status==='captured'?'TEST_PAID':'TEST_AUTHORIZED';store.put('payment',p.id,p.owner,p);res.json(publicPayment(p));
 }));
 app.get('/api/payments/:id/checkout',asyncRoute(async(req:any,res:any)=>{
  const p=authorized(req.params.id,req.query.token);const nonce=randomBytes(16).toString('base64');
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}' https://checkout.razorpay.com; frame-src https://*.razorpay.com https://*.razorpay.in; connect-src 'self' https://*.razorpay.com https://*.razorpay.in; img-src 'self' data: https:; style-src 'unsafe-inline' https:; form-action 'self' https://*.razorpay.com https://*.razorpay.in`);
  const options={key:config.razorpayKeyId,order_id:p.id,amount:p.amount,currency:p.currency,name:'Reason to Flyy',description:'Test payment only — no ticket issued',theme:{color:'#e6c58a'}};
  res.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Razorpay test checkout</title><style>body{font:16px system-ui;background:#fdf9f3;color:#111827;padding:30px;max-width:500px;margin:auto}button{background:#e6c58a;border:0;padding:16px;border-radius:12px;font-size:16px}p{line-height:1.6}</style></head><body><h1>Test payment</h1><p>This uses Razorpay test mode. No real money is collected and no flight or hotel booking is created.</p><p>Amount: INR ${(p.amount/100).toFixed(2)}</p><button id="pay">Open Razorpay test checkout</button><p id="status" role="status"></p><script src="https://checkout.razorpay.com/v1/checkout.js"></script><script nonce="${nonce}">const button=document.getElementById('pay'),status=document.getElementById('status');button.onclick=()=>{if(!window.Razorpay){status.textContent='Checkout failed to load. Check your internet connection.';return;}button.disabled=true;const options=${safeJson(options)};options.modal={ondismiss:()=>{button.disabled=false;status.textContent='Checkout closed. No booking was created.';}};options.handler=async(result)=>{status.textContent='Verifying payment...';try{const response=await fetch(${safeJson(`/api/payments/${p.id}/verify`)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...result,token:${safeJson(p.token)}})});const data=await response.json();if(!response.ok)throw Error(data.error?.message||'Verification failed');status.textContent=data.status==='TEST_PAID'?'Test payment verified. Return to Expo Go. No ticket was issued.':'Test payment authorized. Capture is pending in Razorpay. No ticket was issued.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};const checkout=new Razorpay(options);checkout.on('payment.failed',()=>{status.textContent='Test payment failed. You may retry.';button.disabled=false;});checkout.open();};</script></body></html>`);
 }));
}
