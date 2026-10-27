import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import request from 'supertest';
import {createApp} from '../app';
import {Store} from '../store';
import {TripJack,type Vendor} from '../tripjack';
import {rtfCancellationFee} from '../../shared/fareRulePresentation';

test('RTF fee counts every passenger and flown sector exactly once',()=>{
 assert.equal(rtfCancellationFee(1,1),300);assert.equal(rtfCancellationFee(4,2),2400);assert.equal(rtfCancellationFee(2,4),2400);
 assert.throws(()=>rtfCancellationFee(2,0),/counts/);assert.throws(()=>rtfCancellationFee(0,1),/counts/);
});
for(const supplierRefund of [8000,0])test(`cancellation quote separates supplier charge and RTF fee; supplier refund ${supplierRefund}`,async()=>{
 const store=new Store(':memory:');let submitted=0;
 class Supplier extends TripJack{async request(_group:any,path:string):Promise<Vendor>{if(path.endsWith('amendment-charges'))return {amendmentCharges:supplierRefund?2000:10000,refundableAmount:supplierRefund};if(path.endsWith('submit-amendment')){submitted++;return {amendmentId:'test-amendment'};}throw new Error('Unexpected supplier endpoint');}}
 try{
  const {app}=createApp(store,new Supplier());const auth=await request(app).post('/api/auth/register').send({name:'Fee Test',email:randomUUID()+'@example.test',password:'test-password-123'});assert.equal(auth.status,200);const {user,token}=auth.body;
  const id=randomUUID();store.put('booking',id,user.id,{id,service:'flights',mode:'tripjack',status:'CONFIRMED',amount:10000,currency:'INR',providerBookingId:'test-only',travellers:[{type:'ADULT'},{type:'CHILD'}],quote:{flights:[{segments:[{id:'one'},{id:'two'}]}]}});
  const result=await request(app).post(`/api/bookings/${id}/cancellation-quote`).auth(token,{type:'bearer'}).send({});assert.equal(result.status,200);const q=result.body;
  assert.equal(q.rtfFee,1200);assert.equal(q.passengerCount,2);assert.equal(q.sectorCount,2);assert.equal(q.rtfFeePerPassengerPerSector,300);assert.equal(q.supplierCharge,supplierRefund?2000:10000);assert.equal(q.charge,q.supplierCharge+1200);assert.equal(q.refund,Math.max(0,supplierRefund-1200));assert.equal(submitted,0);
  const accepted=await request(app).post(`/api/bookings/${id}/cancel`).auth(token,{type:'bearer'}).send({cancellationId:q.id,acceptCharges:true});assert.equal(accepted.status,200);assert.equal(accepted.body.cancellation.rtfFee,1200);assert.equal(accepted.body.cancellation.refund,q.refund);assert.equal(submitted,1);
  const duplicate=await request(app).post(`/api/bookings/${id}/cancel`).auth(token,{type:'bearer'}).send({cancellationId:q.id,acceptCharges:true});assert.equal(duplicate.status,409);assert.equal(submitted,1);
 }finally{store.close();}
});
