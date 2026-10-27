import {flightConnections,itineraryConnections} from './itineraryConnections';
import {flightJourneyKey,groupFlightOptions} from './flightOptions';
import {matchesFlight,type FlightFilterState} from './flightFilters';
import type {Flight,FlightResults,Route} from './types';
export type ItinerarySort='price'|'duration'|'departure'|'layover';
export interface Itinerary {id:string;flights:Flight[];amount:number;currency:string;duration:number;refundable:boolean}
interface Filters {routes?:Route[];nonstop?:boolean;refundable?:boolean;airline?:string;legs?:number;flightFilters?:FlightFilterState}
interface Node {indices:number[];flights:Flight[];score:number[]}
const compare=(a:Node,b:Node)=>{for(let i=0;i<a.score.length;i++){const n=a.score[i]-b.score[i];if(n)return n;}return 0;};
class Heap {
 values:Node[]=[];
 push(node:Node){const a=this.values;a.push(node);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(compare(a[p],a[i])<=0)break;[a[p],a[i]]=[a[i],a[p]];i=p;}}
 pop(){const a=this.values;if(!a.length)return undefined;const first=a[0],last=a.pop()!;if(a.length){a[0]=last;let i=0;while(true){let next=i;for(const child of [i*2+1,i*2+2])if(child<a.length&&compare(a[child],a[next])<0)next=child;if(next===i)break;[a[i],a[next]]=[a[next],a[i]];i=next;}}return first;}
}
const departure=(f:Flight)=>Date.parse(f.segments[0]?.departure||'');
function score(flights:Flight[],sort:ItinerarySort,routes?:Route[]){const price=flights.reduce((n,f)=>n+f.amount,0),minutes=flights.reduce((n,f)=>n+f.duration,0);return sort==='layover'?[itineraryConnections(flights,routes)??Infinity,price,minutes]:sort==='departure'?[departure(flights[0]),price,minutes]:sort==='duration'?[minutes,price]:[price,minutes];}
function valid(flights:Flight[]){
 if(flights.some(f=>f.currency!==flights[0].currency||!Number.isFinite(f.amount)||!Number.isFinite(f.duration)||!Number.isFinite(departure(f))))return false;
 return flights.every((f,i)=>i===0||departure(f)>=Date.parse(flights[i-1].segments.at(-1)?.arrival||''));
}
function itinerary(flights:Flight[]):Itinerary{return {id:flights.map(f=>f.id).join('|'),flights,amount:Math.round(flights.reduce((n,f)=>n+f.amount,0)*100)/100,currency:flights[0].currency,duration:flights.reduce((n,f)=>n+f.duration,0),refundable:flights.every(f=>f.refundable)};}
/** Derive complete itineraries from independent supplier groups; never split priced bundles. */
export function buildItineraries(groups:FlightResults['groups'],sort:ItinerarySort='price',filters:Filters={},limit=30,descending=false){
 const direction=descending?-1:1;
 const count=Math.max(1,Math.min(1000,Math.floor(limit)||30));
 if(filters.legs&&groups.length>1&&groups.length!==filters.legs)return {items:[] as Itinerary[],hasMore:false,partial:false};
 const source=groups.map((group,index)=>groupFlightOptions(group.flights.filter(f=>(!filters.flightFilters||matchesFlight(groups.length===1&&filters.legs?{...f,stops:Math.max(0,f.segments.length-filters.legs)}:f,{...filters.flightFilters,minFare:undefined,maxFare:undefined,minDuration:undefined,maxDuration:undefined}))&&(groups.length>1||!filters.legs||f.segments.length>=filters.legs)&&(!filters.nonstop||f.stops<=(groups.length===1?Math.max(0,(filters.legs||1)-1):0))&&(!filters.refundable||f.refundable)&&(!filters.airline||filters.airline==='All'||f.segments.every(segment=>segment.airline===filters.airline)))).map(option=>option.lead).sort((a,b)=>{
  if(sort==='departure'&&index===0)return direction*(departure(a)-departure(b)||a.amount-b.amount||a.duration-b.duration);
  if(sort==='layover'){const gap=(f:Flight)=>flightConnections(f,groups.length===1?filters.routes:undefined)?.minutes??Infinity;return direction*(gap(a)-gap(b)||a.amount-b.amount||a.duration-b.duration);}
  return direction*(sort==='duration'?a.duration-b.duration||a.amount-b.amount:a.amount-b.amount||a.duration-b.duration);
 }));
 if(!source.length||source.some(flights=>!flights.length))return {items:[] as Itinerary[],hasMore:false,partial:false};
 const heap=new Heap(),seen=new Set<string>();
 function push(indices:number[]){const key=indices.join(',');if(seen.has(key))return;seen.add(key);const flights=indices.map((index,i)=>source[i][index]);heap.push({indices,flights,score:score(flights,sort,filters.routes).map(value=>value*direction)});}
 const root=source.map(()=>0);if(sort==='layover'&&itineraryConnections(source.map(g=>g[0]),filters.routes)===undefined){for(let i=0;i<source.length;i++){const first=source[i].findIndex(f=>(flightConnections(f,source.length===1?filters.routes:undefined)?.count||0)>0);if(first>=0){const indices=[...root];indices[i]=first;push(indices);}}}else push(root);const items:Itinerary[]=[];const journeys=new Set<string>();let inspected=0;const budget=Math.min(50000,Math.max(10000,count*200));
 while(heap.values.length&&items.length<=count&&inspected<budget){const node=heap.pop()!;inspected++;if(valid(node.flights)&&(sort!=='layover'||itineraryConnections(node.flights,filters.routes)!==undefined)){const item=itinerary(node.flights),v=filters.flightFilters;if(!v||((v.minFare===undefined||item.amount>=v.minFare)&&(v.maxFare===undefined||item.amount<=v.maxFare)&&(v.minDuration===undefined||item.duration>=v.minDuration)&&(v.maxDuration===undefined||item.duration<=v.maxDuration))){const journey=JSON.stringify(item.flights.map(flightJourneyKey));if(!journeys.has(journey)){journeys.add(journey);items.push(item);}}}for(let i=0;i<source.length;i++){if(node.indices[i]+1<source[i].length){const indices=[...node.indices];indices[i]++;push(indices);}}}
 return {items:items.slice(0,count),hasMore:items.length>count,partial:items.length<=count&&heap.values.length>0};
}
