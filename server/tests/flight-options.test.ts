import {buildItineraries} from '../../shared/itineraries';
import test from 'node:test';
import assert from 'node:assert/strict';
import {groupFlightOptions} from '../../shared/flightOptions';
import {normalizeFlights} from '../travel';
import {dateAfter} from '../../shared/catalog';
import {emptyFlightFilters,matchesFlight} from '../../shared/flightFilters';
const price=(id:string,value:number,fareIdentifier='REGULAR')=>({id,fareIdentifier,fd:{ADULT:{fC:{TF:value,BF:value-100,TAF:100},cc:'ECONOMY',rT:1}}});
const trip=(prices:any[])=>({sI:[{id:'same-segment',fD:{aI:{code:'TA',name:'Test Air'},fN:'123'},da:{code:'DEL'},aa:{code:'BLR'},dt:dateAfter(1)+'T10:00:00',at:dateAfter(1)+'T12:00:00',duration:120}],totalPriceList:prices});
const query={mode:'tripjack' as const,routes:[{from:'DEL',to:'BLR',date:dateAfter(1)}],adults:1,children:0,infants:0,cabin:'ECONOMY',direct:false,tripType:'oneway' as const,fareType:'REGULAR'};
test('counts supplier flights once, retains every priced fare and preserves distinct identical-schedule supplier trips',()=>{const flights=normalizeFlights({searchResult:{tripInfos:{ONWARD:[trip([price('expensive',6000,'FLEX'),price('cheap',5000)]),trip([price('other',7000)])]}}},query)[0].flights;const options=groupFlightOptions(flights);assert.equal(flights.length,3);assert.equal(options.length,2);assert.equal(options[0].lead.priceId,'cheap');assert.deepEqual(options[0].fares.map(f=>f.priceId),['cheap','expensive']);assert.equal(options[1].lead.priceId,'other');const filtered=groupFlightOptions(flights.filter(f=>matchesFlight(f,{...emptyFlightFilters(),families:['FLEX']})));assert.equal(filtered.length,1);assert.equal(filtered[0].lead.priceId,'expensive');});

test('multi-city fare variants do not multiply itinerary counts',()=>{const first=normalizeFlights({searchResult:{tripInfos:{ONWARD:[trip([price('one',5000),price('two',6000,'FLEX')])]}}},query)[0].flights;const next={...first[0],id:'next',priceId:'next-price',group:'1',journeyId:'1:0',segments:first[0].segments.map(segment=>({...segment,departure:dateAfter(2)+'T10:00:00',arrival:dateAfter(2)+'T12:00:00'}))};const result=buildItineraries([{key:'0',label:'First',flights:first},{key:'1',label:'Second',flights:[next]}]);assert.equal(result.items.length,1);assert.equal(result.items[0].amount,10000);assert.equal(result.items[0].flights[0].priceId,'one');assert.equal(result.hasMore,false);});
