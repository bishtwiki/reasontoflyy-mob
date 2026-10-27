import React from 'react';
import {View} from 'react-native';
import type {FlightFareBreakup as Fare} from '../shared/types';
import {money} from '../shared/catalog';
import {C,s} from './ui';
import {FlightResultText as Text} from './FlightResultTheme';
export function FlightFareBreakup({fare,currency,compact=false}:{fare:Fare;currency:string;compact?:boolean}){
 const row=(label:string,value:number|undefined,strong=false)=><View key={label} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}}><Text style={{fontSize:12,color:C.navy,fontWeight:strong?'700':'400',flex:1}}>{label}</Text><Text style={{fontSize:strong?17:12,color:C.navy,fontWeight:strong?'700':'500'}}>{value===undefined?'Not provided':money(value,currency)}</Text></View>;
 return <View testID="flight-fare-breakup" style={{gap:12}}><Text style={s.label}>FARE BREAKUP</Text>{row(compact?'Base':'Base fare',fare.base)}{row('Taxes and fees',fare.taxesAndFees)}{!compact&&!!fare.taxComponents.length&&<View style={{gap:7,paddingLeft:12,borderLeftWidth:2,borderLeftColor:C.line}}><Text style={{fontSize:10,color:C.muted}}>Included in taxes and fees</Text>{fare.taxComponents.map(c=>row(c.label,c.amount))}</View>}{!compact&&fare.adjustment!==undefined&&fare.adjustment!==0&&row(fare.adjustment<0?'Fare adjustment / discount':'Other fare adjustments',fare.adjustment)}<View style={{borderTopWidth:1,borderTopColor:C.line,paddingTop:12}}>{row('You pay',fare.total,true)}</View>{fare.passengers.length>0&&<><Text style={[s.label,{marginTop:6}]}>PER PASSENGER</Text>{fare.passengers.map(p=><View key={p.type} style={{gap:5}}>{row(`${{ADULT:'Adult',CHILD:'Child',INFANT:'Infant'}[p.type]} × ${p.count}`,p.total)}<Text style={{fontSize:10,color:C.muted}}>{money(p.unitTotal,currency)} each</Text></View>)}</>}</View>;
}
