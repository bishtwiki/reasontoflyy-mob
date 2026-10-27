import {afterEach,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import request from 'supertest';
import {createApp} from '../app';
import {Store} from '../store';
import {Razorpay,validPaymentSignature} from '../payments';
import {config} from '../config';
const stores:Store[]=[];
const saved={key:config.razorpayKeyId,secret:config.razorpaySecret};
beforeEach(()=>{config.razorpayKeyId='rzp_test_mock';config.razorpaySecret='mock-secret';});
afterEach(()=>{for(const s of stores.splice(0))s.close();config.razorpayKeyId=saved.key;config.razorpaySecret=saved.secret;});
async function setup(){
 const store=new Store(':memory:');stores.push(store);let amount=0;let returnedAmount:number|undefined;
 const gateway=new Razorpay((async(url:any,options:any)=>{
  let data:any;if(String(url).endsWith('/orders')){const input=JSON.parse(options.body);amount=input.amount;data={id:'order_mock123',amount,currency:'INR'};}else data={id:'pay_mock123',order_id:'order_mock123',amount:returnedAmount??amount,currency:'INR',status:'captured'};
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 }) as typeof fetch);
 const {app}=createApp(store,undefined,gateway);
 const registered=await request(app).post('/api/auth/register').send({name:'Payment Tester',email:`${randomUUID()}@example.test`,password:'strong-test-password'});
 assert.equal(registered.status,200);const {user,token}=registered.body;
 const quoteId=randomUUID();store.put('quote',quoteId,user.id,{quote:{id:quoteId,amount:123.45,currency:'INR',expiresAt:Date.now()+60000}});
 return {app,store,user,token,quoteId,setReturnedAmount:(v:number)=>{returnedAmount=v;}};
}
const signed=(token:string)=>({token,razorpay_order_id:'order_mock123',razorpay_payment_id:'pay_mock123',razorpay_signature:createHmac('sha256','mock-secret').update('order_mock123|pay_mock123').digest('hex')});
test('payment signatures reject tampering and invalid lengths',()=>{
 const signature=createHmac('sha256','secret').update('order_a|pay_b').digest('hex');
 assert.ok(validPaymentSignature('order_a','pay_b',signature,'secret'));
 assert.equal(validPaymentSignature('order_other','pay_b',signature,'secret'),false);
 assert.equal(validPaymentSignature('order_a','pay_b','abc','secret'),false);
});
test('orders use the owned server quote amount, hide secrets and reuse an existing order',async()=>{
 const {app,token,quoteId}=await setup();
 const first=await request(app).post('/api/payments/orders').auth(token,{type:'bearer'}).send({quoteId,amount:1});
 assert.equal(first.status,200);assert.equal(first.body.amount,12345);assert.ok(!JSON.stringify(first.body).includes('mock-secret'));
 const again=await request(app).post('/api/payments/orders').auth(token,{type:'bearer'}).send({quoteId});assert.equal(again.body.id,first.body.id);
});
test('payments require authentication and quote ownership',async()=>{
 const {app,token}=await setup();assert.equal((await request(app).post('/api/payments/orders').send({})).status,401);
 assert.equal((await request(app).post('/api/payments/orders').auth(token,{type:'bearer'}).send({quoteId:'another-user-quote'})).status,410);
});
test('verified test payments are recorded without creating supplier bookings',async()=>{
 const {app,token,quoteId,store,user}=await setup();const order=await request(app).post('/api/payments/orders').auth(token,{type:'bearer'}).send({quoteId});
 const capability=new URL(order.body.checkoutUrl).searchParams.get('token')!;
 const paid=await request(app).post('/api/payments/order_mock123/verify').send(signed(capability));assert.equal(paid.status,200);assert.equal(paid.body.status,'TEST_PAID');
 assert.equal(store.list('booking',user.id).length,0);
 const state=await request(app).get('/api/payments/order_mock123/status').auth(token,{type:'bearer'});assert.equal(state.body.status,'TEST_PAID');assert.equal(state.body.token,undefined);
});
test('verification rejects an invalid signature, token and mismatched gateway amount',async()=>{
 const {app,token,quoteId,setReturnedAmount}=await setup();const order=await request(app).post('/api/payments/orders').auth(token,{type:'bearer'}).send({quoteId});
 const capability=new URL(order.body.checkoutUrl).searchParams.get('token')!;
 assert.equal((await request(app).post('/api/payments/order_mock123/verify').send({...signed(capability),razorpay_signature:'0'.repeat(64)})).status,400);
 assert.equal((await request(app).post('/api/payments/order_mock123/verify').send(signed('0'.repeat(64)))).status,404);
 setReturnedAmount(1);assert.equal((await request(app).post('/api/payments/order_mock123/verify').send(signed(capability))).status,409);
 const state=await request(app).get('/api/payments/order_mock123/status').auth(token,{type:'bearer'});assert.equal(state.body.status,'CREATED');
});
test('checkout uses a nonce CSP and rejects expired links',async()=>{
 const {app,token,quoteId,store,user}=await setup();const order=await request(app).post('/api/payments/orders').auth(token,{type:'bearer'}).send({quoteId});
 const url=new URL(order.body.checkoutUrl);const page=await request(app).get(url.pathname+url.search);assert.equal(page.status,200);assert.ok(page.headers['content-security-policy'].includes('nonce-'));assert.ok(!page.text.includes('mock-secret'));
 const p=store.get('payment',order.body.id,user.id);p.expiresAt=Date.now()-1;store.put('payment',p.id,user.id,p);
 assert.equal((await request(app).get(url.pathname+url.search)).status,410);
});
