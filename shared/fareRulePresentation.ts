import type {FareRuleRow} from './fareRules';
/** TripJack uses a one-year ceiling for its outer pre-departure policy band. */
export function fareRuleWindow(start?:number,end?:number){
 if(start===undefined&&end===undefined)return 'Time window not stated';
 if(end===8760)return start===undefined||start===0?'Before departure':`More than ${start} hours before departure`;
 if(end===undefined)return `${start} hours or more before departure`;
 if(start===undefined||start===0)return `Within ${end} hours of departure`;
 return `${start}–${end} hours before departure`;
}
export function orderedFareRuleRows(rows:FareRuleRow[]){return [...rows].sort((a,b)=>(b.startHours??-1)-(a.startHours??-1));}

/** RTF's displayed service fee replaces the supplier additional-fee line.
 * Airline penalties remain the exact selected fare's API amounts. */
export const RTF_FEE_PER_PASSENGER_PER_SECTOR_INR=300;
export function rtfRuleFee(title:string):number|undefined{return title==='Cancellation'||title==='Date change'?RTF_FEE_PER_PASSENGER_PER_SECTOR_INR:undefined;}
export function rtfCancellationFee(passengers:number,sectors:number){if(!Number.isSafeInteger(passengers)||passengers<1||!Number.isSafeInteger(sectors)||sectors<1)throw new Error('Passenger and sector counts are required to calculate the RTF fee.');return RTF_FEE_PER_PASSENGER_PER_SECTOR_INR*passengers*sectors;}
/** Only explicit supplier prohibitions qualify; refundability alone is not a prohibition. */
export function fareRuleRestriction(title:string,rows:FareRuleRow[]):string|undefined{
 const note=rows.map(row=>row.note).join('\n');
 if(title==='Cancellation'&&/\bcancellation\s+(?:(?:is|are)\s+)?not\s+(?:permitted|allowed)\b/i.test(note))return 'Cancellation not permitted';
 if(title==='Date change'&&/(?:^|[|.;\n])\s*(?:date\s+changes?|changes?)\s+(?:(?:is|are)\s+)?not\s+(?:permitted|allowed)\b/i.test(note))return 'Date change not permitted';
 if(title==='No show'&&/\bno\s+refund\b/i.test(note))return 'No refund';
}
export function fareRuleNoShowHint(title:string,route:string,rows:FareRuleRow[],sections:{title:string;route:string;rows:FareRuleRow[]}[]):string|undefined{
 if(title!=='Cancellation'&&title!=='Date change')return;
 const starts=rows.flatMap(row=>row.startHours===undefined?[]:[row.startHours]);if(!starts.length)return;
 const cutoff=Math.min(...starts);if(cutoff<=0)return;
 const matches=sections.some(section=>section.title==='No show'&&section.route===route&&section.rows.some(row=>row.startHours===0&&row.endHours===cutoff));
 return matches?`Last ${cutoff} hours — see No show`:undefined;
}
