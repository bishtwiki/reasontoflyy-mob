import {Text} from './i18n';
import {fareRuleWindow,orderedFareRuleRows,rtfRuleFee,fareRuleRestriction,fareRuleNoShowHint} from '../shared/fareRulePresentation';
import React from 'react';
import {Text as NativeText,View} from 'react-native';
import type {FareRuleDisplay,FareRuleRow} from '../shared/fareRules';
import {money} from '../shared/catalog';
import {C,Icon} from './ui';
const known=['Cancellation','Date change','No show','Seats','Baggage'];
const icons:Record<string,string>={Cancellation:'close-outline','Date change':'calendar-outline','No show':'time-outline',Seats:'grid-outline',Baggage:'bag-handle-outline'};
export function FareRuleSummary({data,currency}:{data:FareRuleDisplay;currency:string}){
 const routes=[...new Set(data.sections.filter(section=>known.includes(section.title)).map(section=>section.route))];
 return <View testID="fare-rule-summary" style={{gap:12}}>{routes.map(route=><View key={route} style={{borderWidth:1,borderColor:C.line,borderRadius:8,overflow:'hidden'}}>{!!route&&<View style={{backgroundColor:C.pale,padding:12}}><Text style={{fontSize:13,fontWeight:'700',color:C.navy}}>{route.replace(/-/g,' → ')}</Text></View>}{known.flatMap(title=>data.sections.filter(section=>section.route===route&&section.title===title)).map((section,i)=>{
 const rows=orderedFareRuleRows(section.rows);
 const priced=rows.filter(row=>row.amount!==undefined);const prices=[...new Set(priced.map(row=>row.amount!))];
 const change=priced.length===2&&priced[0].startHours!==undefined&&priced[0].startHours===priced[1].endHours&&priced[0].amount!==priced[1].amount?`${priced[1].amount!>priced[0].amount!?'Rises':'Falls'} ${priced[0].startHours} h before departure`:'Varies by departure time';
 const noShowHint=fareRuleNoShowHint(section.title,section.route,rows,data.sections);
 const restriction=fareRuleRestriction(section.title,rows);
 const textOnly=section.title==='Seats'||section.title==='Baggage';const policyNotes=[...new Set(rows.map(row=>row.note).filter(Boolean))];
 return <View key={`${section.title}-${i}`} style={{flexDirection:'row',gap:10,padding:12,borderTopWidth:1,borderTopColor:C.line,alignItems:'flex-start'}}><View style={{width:23,height:23,borderRadius:6,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name={icons[section.title]} size={15} color={C.ink}/></View><Text style={{fontSize:11,fontWeight:'600',color:C.navy,flex:1}}>{section.title}</Text><View style={{flex:1.5,gap:5,alignItems:'flex-end'}}>{textOnly?<Text style={{fontSize:11,color:C.navy,textAlign:'right'}}>{policyNotes.join(' · ')||'Not stated by the airline'}</Text>:<><Text style={{fontSize:12,fontWeight:'700',color:C.navy,textAlign:'right'}}>{restriction||(prices.length?prices.map(value=>money(value,currency)).join(' → '):'Not stated by the airline')}</Text>{rows.length===1&&(rows[0].startHours!==undefined||rows[0].endHours!==undefined)&&<Text style={{fontSize:10,color:C.muted,textAlign:'right'}}>{fareRuleWindow(rows[0].startHours,rows[0].endHours)}</Text>}{rows.length>1&&<Text style={{fontSize:10,color:C.muted,textAlign:'right'}}>{change}</Text>}{!!noShowHint&&<Text style={{fontSize:10,color:C.orange,textAlign:'right'}}>{noShowHint}</Text>}{!restriction&&rtfRuleFee(section.title)!==undefined&&<Text style={{fontSize:10,color:C.ink,textAlign:'right'}}>RTF fee: {money(rtfRuleFee(section.title)!,'INR')} per passenger per sector</Text>}{section.title==='Date change'&&policyNotes.some(note=>/fare difference/i.test(note))&&<Text style={{fontSize:10,color:C.ink,textAlign:'right'}}>+ fare difference</Text>}</>}</View></View>;
 })}</View>)}{routes.length===0&&<Text style={{fontSize:12,color:C.muted}}>No structured policy highlights were provided for this fare.</Text>}<Text style={{fontSize:10,lineHeight:16,color:C.muted}}>Exact time bands, all charges and the airline’s notes are in Fare rules.</Text></View>;
}
