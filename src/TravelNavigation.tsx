import {Text} from './i18n';
import React from 'react';
import {Pressable,Text as NativeText,View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {useApp} from './context';
import {C,Icon,s} from './ui';
import {serviceArtwork} from './reference/easemytrip';
export function TravelArtwork({name,size=30}:{name:string;size?:number}){
 const xml=(serviceArtwork as Record<string,string>)[name];
 return xml?<SvgXml xml={['bus','holidays','cabs','activities','visa'].includes(name)?xml.replace(/#112d55/gi,C.ink).replace(/#2093ef/gi,C.primary):xml} width={size} height={size}/>:<Icon name={name==='insurance'?'shield-checkmark-outline':'boat-outline'} size={size} color={C.ink}/>;
}
export function TravelNavigation({active}:{active:'flights'|'hotels'|'insurance'}){
 const {go}=useApp();
 return <View style={{backgroundColor:'white',borderBottomWidth:1,borderColor:'#e5e5e5',paddingHorizontal:12,paddingVertical:10,flexDirection:'row',gap:5}}>{[['flights','Flights'],['hotels','Hotels'],['insurance','Insurance'],['trains','Trains'],['bus','Bus'],['holidays','Holidays']].map(([id,label])=><Pressable key={id} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:active===id}} onPress={()=>{if(id===active)return;go(id==='flights'?'flight-search':id==='hotels'?'hotel-search':'service',{service:id});}} style={{flex:1,minHeight:68,alignItems:'center',justifyContent:'center',gap:7,borderRadius:9,borderWidth:1,borderColor:active===id?C.primary:'transparent',backgroundColor:active===id?C.pale:'white'}}><Icon name={id==='flights'?'airplane-outline':id==='hotels'?'business-outline':id==='insurance'?'shield-checkmark-outline':id==='trains'?'train-outline':id==='bus'?'bus-outline':'umbrella-outline'} size={28} color={C.ink}/><Text style={{fontSize:9,color:C.navy,fontWeight:'500'}}>{label}</Text></Pressable>)}</View>;
}
export function CountryLabel(){return <View style={[s.row,{gap:5}]}><Text style={{fontSize:15}}>🇮🇳</Text><Text style={{fontSize:12,color:'#777'}}>India</Text><Icon name="chevron-down" size={12} color="#999"/></View>;}
