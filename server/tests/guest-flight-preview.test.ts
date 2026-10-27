import {test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app';
import {Store} from '../store';
import {dateAfter} from '../../shared/catalog';
test('guests can preview flights; booking requires a new authenticated owned quote',async()=>{
 const store=new Store(':memory:');try{const {app}=createApp(store);
 const search=await request(app).post('/api/flights/search').send({mode:'demo',routes:[{from:'DEL',to:'BOM',date:dateAfter(1)}],adults:1,children:0,infants:0,cabin:'ECONOMY',direct:false,tripType:'oneway',fareType:'REGULAR'});assert.equal(search.status,200);
 const input={searchId:search.body.searchId,flightIds:[search.body.groups[0].flights[0].id]};
 const preview=await request(app).post('/api/flights/preview').send(input);assert.equal(preview.status,200);assert.equal(preview.body.preview,true);assert.equal(preview.body.searchId,input.searchId);assert.equal(preview.body.flights[0].id,input.flightIds[0]);assert.equal(preview.body.providerBookingId,undefined);assert.equal(preview.headers['cache-control'],'no-store');assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM documents WHERE kind='quote'").get()!.n,0);
 const booking={quoteId:preview.body.id,travellers:[{title:'Mr',firstName:'Test',lastName:'Guest',type:'ADULT'}],contact:{email:'guest@example.test',phone:'+919876543210'},idempotencyKey:randomUUID(),acceptRules:true};
 assert.equal((await request(app).post('/api/bookings').send(booking)).status,401);
 const auth=await request(app).post('/api/auth/register').send({name:'Guest Test',email:randomUUID()+'@example.test',password:'long-test-password'});const token=auth.body.token;
 assert.equal((await request(app).post('/api/bookings').auth(token,{type:'bearer'}).send(booking)).status,410);
 const owned=await request(app).post('/api/review').auth(token,{type:'bearer'}).send(input);assert.equal(owned.status,200);assert.notEqual(owned.body.id,preview.body.id);assert.equal(owned.body.preview,undefined);assert.equal(store.get('quote',owned.body.id,auth.body.user.id)!.quote.amount,owned.body.amount);
 }finally{store.close();}
});
test('guest preview rejects missing or unrelated fare identities',async()=>{const store=new Store(':memory:');try{const{app}=createApp(store);for(const body of [{},{searchId:randomUUID(),flightIds:[]},{searchId:randomUUID(),flightIds:[randomUUID()],hotelId:'hotel'}])assert.equal((await request(app).post('/api/flights/preview').send(body)).status,400);}finally{store.close();}});
