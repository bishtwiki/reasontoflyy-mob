import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFlightCheckout} from '../../shared/flightCheckout';
import type {Quote,Traveller} from '../../shared/types';
const quote={id:'test',expiresAt:Date.now()+600000,travellers:[{type:'ADULT'}],passportRequired:false,panRequired:false} as Quote;
const adult:Traveller={type:'ADULT',title:'Mr',gender:'MALE',firstName:'Arjun',lastName:'Sharma'};
const valid={quote,travellers:[adult],email:'arjun@example.test',phone:'+919876543210',accept:true};
test('domestic checkout accepts valid traveller and normalized contact details',()=>{assert.deepEqual(validateFlightCheckout(valid),{});assert.ok(validateFlightCheckout({...valid,email:'a'.repeat(161)+'@example.test'}).email);});
test('checkout rejects incomplete names, gender, contact, consent and expired fare',()=>{
 const errors=validateFlightCheckout({...valid,quote:{...quote,expiresAt:1},travellers:[{...adult,firstName:'',lastName:'',gender:undefined}],email:'bad',phone:'12',accept:false});for(const key of ['expired','traveller.0.firstName','traveller.0.lastName','traveller.0.gender','email','phone','accept'])assert.ok(errors[key]);
});
test('children need a real birth date and requested traveller types cannot change',()=>{
 const childQuote={...quote,travellers:[{type:'CHILD' as const}]};assert.ok(validateFlightCheckout({...valid,quote:childQuote,travellers:[{...adult,type:'CHILD'}]})['traveller.0.dob']);
 assert.ok(validateFlightCheckout({...valid,travellers:[{...adult,dob:'2025-02-30'}]})['traveller.0.dob']);assert.ok(validateFlightCheckout({...valid,quote:childQuote})['traveller.0.type']);assert.ok(validateFlightCheckout({...valid,travellers:[]}).travellers);
});
test('international and foreign-passport flows validate document fields',()=>{
 assert.ok(validateFlightCheckout({...valid,quote:{...quote,passportRequired:true}})['traveller.0.passportOptIn']);
 for(const input of [{...valid,quote:{...quote,passportRequired:true},foreign:{0:true}},{...valid,foreign:{0:true}}]){const errors=validateFlightCheckout(input);for(const field of ['passport','passportIssue','passportExpiry','nationality'])assert.ok(errors[`traveller.0.${field}`]);}
 assert.deepEqual(validateFlightCheckout({...valid,foreign:{0:true},travellers:[{...adult,passport:'X1234567',passportIssue:'2020-01-01',passportExpiry:'2035-01-01',nationality:'US'}]}),{});
 assert.ok(validateFlightCheckout({...valid,foreign:{0:true},travellers:[{...adult,passport:'X1234567',passportIssue:'2036-01-01',passportExpiry:'2035-01-01',nationality:'ZZ'}]})['traveller.0.passportIssue']);
 assert.ok(validateFlightCheckout({...valid,foreign:{0:true},travellers:[{...adult,nationality:'ZZ'}]})['traveller.0.nationality']);
});
test('optional GST and mandatory PAN validate before submission',()=>{
 const errors=validateFlightCheckout({...valid,gst:{gstNumber:'bad',registeredName:''},quote:{...quote,panRequired:true}});assert.ok(errors.gstNumber);assert.ok(errors.registeredName);assert.ok(errors['traveller.0.pan']);
 assert.deepEqual(validateFlightCheckout({...valid,gst:{gstNumber:'27AAPFU0939F1ZV',registeredName:'Example Travels'},quote:{...quote,panRequired:true},travellers:[{...adult,pan:'ABCDE1234F'}]}),{});
});
