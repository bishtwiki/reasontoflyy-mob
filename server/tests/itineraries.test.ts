import {itineraryConnections} from '../../shared/itineraryConnections';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildItineraries,type ItinerarySort} from '../../shared/itineraries';
import type {Flight,FlightResults} from '../../shared/types';
function fare(id:string,amount:number,day:number,time='08:00',minutes=120,patch:Partial<Flight>={}):Flight{
 const departure=`2026-11-${String(day).padStart(2,'0')}T${time}:00`,arrival=new Date(Date.parse(departure+'Z')+minutes*60000).toISOString().slice(0,19);
 return {id,priceId:id,group:id[0],airline:'Test Air',airlineCode:'TA',segments:[{id,airline:'Test Air',airlineCode:'TA',number:'TA 123',from:'DEL',to:'BOM',departure,arrival,duration:minutes}],amount,base:amount,tax:0,currency:'INR',duration:minutes,stops:0,refundable:true,baggage:'15 kg',cabinBaggage:'7 kg',fareName:'Regular',...patch};
}
function groups(flights:Flight[][]):FlightResults['groups']{return flights.map((f,i)=>({key:String(i),label:`Flight ${i+1}`,flights:f}));}
test('complete multi-city cards match exhaustive combinations in each sort direction',()=>{
 const data=groups([[fare('a1',200,1,'09:00',100),fare('a2',100,1,'08:00',120),fare('a3',150,1,'10:00',90)],[fare('b1',210,3,'09:00',100),fare('b2',110,3,'08:00',130),fare('b3',160,3,'10:00',80)],[fare('c1',220,5,'09:00',100),fare('c2',120,5,'08:00',140),fare('c3',170,5,'10:00',70)]]);
 const all=data[0].flights.flatMap(a=>data[1].flights.flatMap(b=>data[2].flights.map(c=>[a,b,c])));
 for(const sort of ['price','duration','departure'] as ItinerarySort[])for(const descending of [false,true]){
  const key=(f:Flight[])=>sort==='price'?[f.reduce((n,x)=>n+x.amount,0),f.reduce((n,x)=>n+x.duration,0)]:sort==='duration'?[f.reduce((n,x)=>n+x.duration,0),f.reduce((n,x)=>n+x.amount,0)]:[Date.parse(f[0].segments[0].departure),f.reduce((n,x)=>n+x.amount,0),f.reduce((n,x)=>n+x.duration,0)];
  const expected=[...all].sort((a,b)=>{const x=key(a),y=key(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return (x[i]-y[i])*(descending?-1:1);return 0;}).slice(0,8).map(key);
  const actual=buildItineraries(data,sort,{},8,descending);assert.deepEqual(actual.items.map(item=>key(item.flights)),expected);assert.equal(actual.hasMore,true);assert.equal(new Set(actual.items.map(item=>item.id)).size,8);
 }
});
test('itineraries exclude overlapping legs and incompatible currencies',()=>{
 const data=groups([[fare('a1',100,1,'20:00',180)],[fare('b1',50,1,'21:00'),fare('b2',150,2,'08:00'),fare('b3',80,2,'09:00',120,{currency:'USD'})]]);
 const results=buildItineraries(data);assert.equal(results.items.length,1);assert.deepEqual(results.items[0].flights.map(f=>f.id),['a1','b2']);assert.equal(results.items[0].amount,250);assert.equal(results.hasMore,false);
});
test('refundability and nonstop filters apply to every itinerary leg',()=>{
 const data=groups([[fare('a1',100,1),fare('a2',80,1,'09:00',120,{refundable:false})],[fare('b1',100,3),fare('b2',80,3,'09:00',160,{stops:1})]]);
 const r=buildItineraries(data,'price',{refundable:true,nonstop:true});assert.equal(r.items.length,1);assert.deepEqual(r.items[0].flights.map(f=>f.id),['a1','b1']);
});
test('priced supplier bundles retain their single amount and review ID',()=>{
 const bundle=fare('combo',999,1);bundle.segments=[...fare('leg1',1,1).segments,...fare('leg2',1,3).segments];bundle.stops=1;
 const r=buildItineraries(groups([[bundle]]),'price',{nonstop:true,legs:2});assert.equal(r.items.length,1);assert.equal(r.items[0].amount,999);assert.deepEqual(r.items[0].flights.map(f=>f.id),['combo']);
});
test('empty supplier groups do not create partial itineraries',()=>{assert.deepEqual(buildItineraries(groups([[fare('a',100,1)],[]])).items,[]);});

test('partial supplier responses are not presented as complete multi-city itineraries',()=>{
 const data=groups([[fare('a',100,1)],[fare('b',100,3)]]);assert.equal(buildItineraries(data,'price',{legs:3}).items.length,0);assert.equal(buildItineraries(groups([[fare('bundle',200,1)]]),'price',{legs:2}).items.length,0);
});

test('layover highlights order actual connections and exclude all-nonstop combinations',()=>{const connecting=(id:string,day:number,gap:number)=>{const f=fare(id,200,day,'08:00',120+gap,{stops:1});const first={...f.segments[0],to:'HYD',arrival:`2026-11-${String(day).padStart(2,'0')}T09:00:00`,duration:60};const start=new Date(Date.parse(first.arrival+'Z')+gap*60000).toISOString().slice(0,19);const second={...f.segments[0],id:id+'-b',from:'HYD',departure:start,duration:60};return {...f,segments:[first,second]};};const data=groups([[fare('direct-a',100,1),connecting('a45',1,45),connecting('a90',1,90)],[fare('direct-b',100,3),connecting('b30',3,30)]]);const result=buildItineraries(data,'layover',{},10);assert.deepEqual(result.items.map(item=>itineraryConnections(item.flights)),[30,45,75,90,120]);assert.equal(itineraryConnections(buildItineraries(data,'layover',{},1).items[0].flights),30);assert.deepEqual(buildItineraries(data,'layover',{},10,true).items.map(item=>itineraryConnections(item.flights)),[120,90,75,45,30]);});
test('connection metrics exclude multi-city stays from supplier bundles',()=>{const a=fare('a',100,1),b=fare('b',100,3);b.segments[0]={...b.segments[0],from:'BOM',to:'BLR'};const bundle={...a,id:'bundle',segments:[...a.segments,...b.segments]};const routes=[{from:'DEL',to:'BOM',date:'2026-11-01'},{from:'BOM',to:'BLR',date:'2026-11-03'}];assert.equal(itineraryConnections([bundle],routes),undefined);assert.equal(buildItineraries(groups([[bundle]]),'layover',{legs:2,routes}).items.length,0);const connection={...a.segments[0],to:'HYD',arrival:'2026-11-01T09:00:00'};const onward={...a.segments[0],id:'connection-b',from:'HYD',departure:'2026-11-01T09:30:00',arrival:'2026-11-01T10:30:00'};const withConnection={...bundle,segments:[connection,onward,...b.segments]};assert.equal(itineraryConnections([withConnection],routes),30);const match=buildItineraries(groups([[withConnection]]),'layover',{legs:2,routes}).items[0];assert.equal(match.amount,bundle.amount);assert.equal(itineraryConnections(match.flights,routes),30);});
