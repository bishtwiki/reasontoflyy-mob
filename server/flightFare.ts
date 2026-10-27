import type {FlightFareBreakup,FlightQuery,PassengerFare} from '../shared/types';
import {AppError} from './errors';
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100||0;
function price(value:unknown):number|undefined{if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()==='')return;const n=Number(value);return Number.isFinite(n)&&n>=0?round(n):undefined;}
function required(value:unknown){const n=price(value);if(n===undefined)throw new AppError(502,'INVALID_PRICE','The supplier did not return a valid price. Please search again.');return n;}
const labels:Record<string,string>={MF:'Management fee',MFT:'Management fee tax',OT:'Other taxes and fees',YQ:'Fuel surcharge',YR:'Carrier surcharge',GST:'GST'};
function components(raw:any,count:number){return Object.entries(raw?.afC?.TAF||{}).flatMap(([code,value])=>{const n=price(value);return n===undefined?[]:[{code,label:labels[code]||code,amount:round(n*count)}];});}
/** TF is payable; BF and TAF are components. afC.TAF is already included in TAF.
 * NF/NCM are agency commercial amounts and must never replace the passenger total. */
export function normalizeFlightFare(fares:any,q:Pick<FlightQuery,'adults'|'children'|'infants'>):FlightFareBreakup{
 const passengers:PassengerFare[]=[];
 for(const [type,count] of [['ADULT',q.adults],['CHILD',q.children],['INFANT',q.infants]] as const){if(!count)continue;const raw=fares?.[type];if(!raw?.fC)throw new AppError(502,'INVALID_FARE','Supplier fare is missing a traveller type.');const unitTotal=required(raw.fC.TF),base=price(raw.fC.BF),tax=price(raw.fC.TAF);passengers.push({type,count,unitTotal,total:round(unitTotal*count),base:base===undefined?undefined:round(base*count),taxesAndFees:tax===undefined?undefined:round(tax*count),taxComponents:components(raw,count),bookingClass:raw.cB,fareBasis:raw.fB,cabin:raw.cc,baggage:raw.bI?.iB,cabinBaggage:raw.bI?.cB,mealIncluded:typeof raw.mI==='boolean'?raw.mI:undefined});}
 const sum=(key:'base'|'taxesAndFees')=>passengers.every(p=>p[key]!==undefined)?round(passengers.reduce((n,p)=>n+p[key]!,0)):undefined;
 const total=round(passengers.reduce((n,p)=>n+p.total,0)),base=sum('base'),taxesAndFees=sum('taxesAndFees');
 const grouped=new Map<string,{code:string;label:string;amount:number}>();for(const p of passengers)for(const c of p.taxComponents||[]){const previous=grouped.get(c.code);grouped.set(c.code,{...c,amount:round((previous?.amount||0)+c.amount)});}
 return {total,base,taxesAndFees,adjustment:base!==undefined&&taxesAndFees!==undefined?round(total-base-taxesAndFees):undefined,taxComponents:[...grouped.values()],passengers};
}
export function normalizeReviewedFlightFare(raw:any):FlightFareBreakup{const total=required(raw?.fC?.TF),base=price(raw?.fC?.BF),taxesAndFees=price(raw?.fC?.TAF);return {total,base,taxesAndFees,adjustment:base!==undefined&&taxesAndFees!==undefined?round(total-base-taxesAndFees):undefined,taxComponents:components(raw,1),passengers:[]};}
