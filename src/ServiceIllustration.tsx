import React from 'react';
import {View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {C} from './ui';
import {serviceArtwork} from './reference/easemytrip';
import {TravelArtwork} from './TravelNavigation';
const drawings:Record<string,string>={
 insurance:'<path d="M27 10l18 6v17c0 12-8 19-18 24C17 52 9 45 9 33V16z" fill="#f1e6d0"/><path d="M34 6l18 6v17c0 12-8 19-18 24-10-5-18-12-18-24V12z" fill="white"/><path d="M34 16v23m-10-12h20" stroke="#e6c58a" stroke-width="5"/>',
 cruise:'<path d="M5 37l25-7 29 8-11 15-20 6-18-10z" fill="#e6c58a"/><path d="M19 18l23-6 9 8v18l-21-6-15 5V22z" fill="white"/><path d="M29 13V5l10 3v9" fill="#f1e6d0"/><path d="M8 38l22 8 26-8m-26 8v12M23 24l5-1m8-1l5 2m3 5l4 1"/><path d="M5 58q6-5 12 0t12 0 12 0 12 0" fill="none"/>',
 forex:'<path d="M9 22L43 7l13 7v34L22 62 9 54z" fill="#e6c58a"/><path d="M18 17L52 3v36L18 53z" fill="white"/><path d="M26 18l18-8m-18 34l18-8"/><text x="29" y="35" fill="#7f6c4c" stroke="none" font-size="20" font-family="sans-serif">$</text>',
 groups:'<ellipse cx="21" cy="56" rx="18" ry="5" fill="#e9e2d6" stroke="none"/><path d="M4 47v-7c0-9 20-10 20 0v7z" fill="#e6c58a"/><circle cx="14" cy="25" r="8" fill="white"/><path d="M36 46v-7c0-9 20-10 20 0v7z" fill="#f1e6d0"/><circle cx="46" cy="24" r="8" fill="white"/><path d="M16 55V44c0-13 27-13 27 0v11z" fill="white"/><circle cx="30" cy="24" r="10" fill="#f1e6d0"/>',
};
export function ServiceIllustration({name}:{name:string}){const drawing=drawings[name];const artwork=name==='flights'?serviceArtwork.flight:name==='hotels'?serviceArtwork.hotel:undefined;
 const goldArtwork=artwork?.replace(/#[a-f0-9]{6}\b/gi,color=>{const key=color.toLowerCase();if(key==='#112d55')return C.ink;if(['#e6f2fb','#e4f3ff'].includes(key))return '#f1e6d0';if(['#2093ef','#2c90f4','#ff7300'].includes(key))return C.primary;return '#cabb9a';});return <View style={{width:54,height:54,alignItems:'center',justifyContent:'center'}}>{drawing?<SvgXml width={50} height={50} xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 66"><g stroke="#7f6c4c" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${drawing}</g></svg>`}/>:goldArtwork?<SvgXml width={52} height={52} xml={goldArtwork}/>:<TravelArtwork name={name==='flights'?'flight':name==='hotels'?'hotel':name} size={52}/>}</View>;}
