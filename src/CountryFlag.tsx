import React,{useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {SvgUri} from 'react-native-svg';
import {countryFlag} from '../shared/travellerPresentation';
export function CountryFlag({code}:{code:string}){const[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[code]);if(!/^[A-Z]{2}$/.test(code))return null;return <View accessibilityRole="image" accessibilityLabel={`${code} flag`} style={{width:26,height:18,alignItems:'center',justifyContent:'center',overflow:'hidden',borderRadius:2}}>{failed?<Text style={{fontSize:19}}>{countryFlag(code)}</Text>:<SvgUri width={26} height={18} uri={`https://cloud.common-cdn.com/images/country/flags/${code.toLowerCase()}.svg`} onError={()=>setFailed(true)}/>}</View>;}
