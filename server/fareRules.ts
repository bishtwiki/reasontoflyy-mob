import {parseDocument,DomUtils} from 'htmlparser2';
import type {FareRuleDisplay,FareRuleRow,FareRuleSection} from '../shared/fareRules';
const names:Record<string,string>={CANCELLATION:'Cancellation',NO_SHOW:'No show',NOSHOW:'No show',DATECHANGE:'Date change',DATE_CHANGE:'Date change',SEAT_CHARGEABLE:'Seats',BAGGAGE:'Baggage'};
function plain(value:unknown){if(typeof value!=='string')return '';return DomUtils.textContent(parseDocument(value.replace(/<\s*br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|li|tr|h[1-6])\s*>/gi,'\n'))).replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n\s*\n/g,'\n\n').trim();}
function number(value:unknown){if((typeof value!=='number'&&typeof value!=='string')||value==='')return undefined;const n=Number(value);return Number.isFinite(n)&&n>=0?n:undefined;}
export function normalizeFareRules(raw:any,messages:unknown=[]):FareRuleDisplay{
 const sections:FareRuleSection[]=[],notes:string[]=[],seen=new Set<string>();
 const add=(route:string,title:string,rows:FareRuleRow[])=>{if(!rows.length)return;const key=JSON.stringify([route,title,rows]);if(seen.has(key))return;seen.add(key);sections.push({route,title,rows});};
 function read(route:string,node:any){if(typeof node==='string'){const text=plain(node);if(text)notes.push(route?`${route}\n${text}`:text);return;}if(!node||typeof node!=='object')return;
 for(const [key,value]of Object.entries(node)){if(key==='status'||value===null)continue;const title=names[key]||key.replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase());if(Array.isArray(value)){const rows=value.map((item:any)=>typeof item==='string'?{note:plain(item)}:{startHours:number(item?.st),endHours:number(item?.et),amount:number(item?.amount),additionalFee:number(item?.additionalFee),note:plain(item?.policyInfo||item?.message||item?.text||'')}).filter(row=>row.note||row.amount!==undefined||row.additionalFee!==undefined);add(route,title,rows);}else if(typeof value==='string'){const note=plain(value);if(note)add(route,title,[{note}]);}else if(value&&typeof value==='object'){if('amount'in value||'policyInfo'in value)add(route,title,[{startHours:number((value as any).st),endHours:number((value as any).et),amount:number((value as any).amount),additionalFee:number((value as any).additionalFee),note:plain((value as any).policyInfo)}]);else read(route,value);}}
 }
 if(typeof raw?.rules==='string')read('',raw.rules);
 for(const [route,value]of Object.entries(raw?.fareRule||{})){const v=value as any;if(typeof v==='string')read(route,v);else{read(route,v?.tfr);read(route,v?.fr);}}
 for(const item of Array.isArray(messages)?messages:[]){const note=plain(typeof item==='string'?item:item?.message||item?.text||item?.content);if(note)notes.push(note);}
 const order=['Cancellation','No show','Date change','Seats','Baggage'];sections.sort((a,b)=>(order.includes(a.title)?order.indexOf(a.title):99)-(order.includes(b.title)?order.indexOf(b.title):99));return {sections,notes:[...new Set(notes)]};
}
