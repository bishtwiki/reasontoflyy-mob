import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFlightFare,normalizeReviewedFlightFare} from '../flightFare';
import {normalizeFlights} from '../travel';
import type {FlightQuery} from '../../shared/types';
import {dateAfter} from '../../shared/catalog';
const query:FlightQuery={mode:'tripjack',routes:[{from:'DEL',to:'BLR',date:dateAfter(1)}],adults:2,children:1,infants:1,cabin:'ECONOMY',direct:false,tripType:'oneway',fareType:'REGULAR'};
test('passenger totals use TF and counts without adding included fees or using agency net fares',()=>{
 const detail={fC:{TF:6798.8,BF:5050,TAF:1748.8,NF:6699.82,NCM:98.98},afC:{TAF:{MF:10,OT:1737,MFT:1.8},NCM:{OT:101,TDS:-2.02}},cB:'RS',fB:'USAV',mI:false,bI:{iB:'15 Kg',cB:'7 Kg'}};
 const result=normalizeFlightFare({ADULT:detail,CHILD:{fC:{TF:3500.25,BF:3000,TAF:500.25}},INFANT:{fC:{TF:1500,BF:1300,TAF:200}}},query);
 assert.equal(result.total,18597.85);assert.equal(result.base,14400);assert.equal(result.taxesAndFees,4197.85);assert.equal(result.adjustment,0);
 assert.equal(result.passengers[0].total,13597.6);assert.equal(result.passengers[0].unitTotal,6798.8);assert.equal(result.passengers[0].count,2);assert.equal(result.passengers[0].bookingClass,'RS');assert.equal(result.passengers[0].mealIncluded,false);
 assert.deepEqual(result.taxComponents.map(c=>[c.code,c.amount]),[['MF',20],['OT',3474],['MFT',3.6]]);
 assert.ok(!JSON.stringify(result).includes('NCM'));assert.ok(!JSON.stringify(result).includes('6699.82'));
});
test('missing amounts remain unknown and zero components remain actual zero',()=>{
 const fare=normalizeFlightFare({ADULT:{fC:{TF:0}}},{adults:1,children:0,infants:0});assert.equal(fare.total,0);assert.equal(fare.base,undefined);assert.equal(fare.taxesAndFees,undefined);
 assert.equal(normalizeFlightFare({ADULT:{fC:{TF:500,BF:500,TAF:0}}},{adults:1,children:0,infants:0}).taxesAndFees,0);
 assert.throws(()=>normalizeFlightFare({ADULT:{fC:{TF:-1}}},{adults:1,children:0,infants:0}),/valid price/);
 assert.throws(()=>normalizeFlightFare({ADULT:{fC:{TF:1}}},query),/traveller type/);
});
test('review amounts are already totals and preserve explicit adjustments without double charging',()=>{
 const reviewed=normalizeReviewedFlightFare({fC:{TF:10000,BF:9000,TAF:1100},afC:{TAF:{MF:20,MFT:3.6,OT:1076.4}}});assert.equal(reviewed.total,10000);assert.equal(reviewed.adjustment,-100);assert.deepEqual(reviewed.passengers,[]);assert.equal(reviewed.taxComponents.reduce((n,c)=>n+c.amount,0),1100);
});
test('normalization retains alternative fare identity, passenger breakdown and airport/technical metadata',()=>{
 const groups=normalizeFlights({searchResult:{tripInfos:{ONWARD:[{sI:[{id:'s1',fD:{aI:{name:'Carrier',code:'XX'},fN:'100',eT:'320'},da:{code:'DEL',name:'Delhi Airport',city:'Delhi',terminal:'T1'},aa:{code:'BLR',name:'Bengaluru Airport',city:'Bengaluru',terminal:'T2'},dt:'2026-10-27T23:00',at:'2026-10-28T02:00',duration:180}],totalPriceList:['saver','flex'].map((id,i)=>({id,fareIdentifier:id,fd:{ADULT:{fC:{TF:1000+i*100,BF:900,TAF:100+i*100},cB:'G',fB:'G123',mI:true}}}))}]}}},{...query,adults:1,children:0,infants:0});
 assert.equal(groups[0].flights[1].priceId,'flex');assert.equal(groups[0].flights[1].fareBreakup?.total,1100);assert.equal(groups[0].flights[0].segments[0].fromCity,'Delhi');assert.equal(groups[0].flights[0].segments[0].arrivalTerminal,'T2');assert.equal(groups[0].flights[0].fareBasis,'G123');assert.equal(groups[0].flights[0].mealIncluded,true);
});
