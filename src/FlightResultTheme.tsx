import React,{createContext,useContext} from 'react';
import {Image,StyleSheet,Text as NativeText,View,type TextProps} from 'react-native';
import {useFonts} from 'expo-font';
const FontReady=createContext(false);
export function FlightResultFontProvider({children}:{children:React.ReactNode}){
 const [ready]=useFonts({PoppinsRegular:require('../assets/fonts/Poppins-Regular.ttf'),PoppinsMedium:require('../assets/fonts/Poppins-Medium.ttf'),PoppinsSemiBold:require('../assets/fonts/Poppins-SemiBold.ttf'),PoppinsBold:require('../assets/fonts/Poppins-Bold.ttf')});
 return <FontReady.Provider value={ready}>{children}</FontReady.Provider>;
}
export function FlightResultText({style,...props}:TextProps){const ready=useContext(FontReady);const weight=Number(StyleSheet.flatten(style)?.fontWeight)||400;const family=weight>=700?'PoppinsBold':weight>=600?'PoppinsSemiBold':weight>=500?'PoppinsMedium':'PoppinsRegular';return <NativeText {...props} style={[style,ready?{fontFamily:family,fontWeight:'normal'}:{}]}/>;}
const logos:Record<string,number>={IX:require('../assets/airlines/IX.png'),AI:require('../assets/airlines/AI.png'),'6E':require('../assets/airlines/6E.png'),QP:require('../assets/airlines/QP.png'),SG:require('../assets/airlines/SG.png')};
export function FlightAirlineLogo({code,size=24}:{code:string;size?:number}){const[failed,setFailed]=React.useState(false);return failed?<View style={{width:size,height:size,backgroundColor:'#fdf9f3',borderRadius:4,alignItems:'center',justifyContent:'center'}}><NativeText style={{fontSize:10,fontWeight:'700',color:'#7f6c4c'}}>{code}</NativeText></View>:<Image accessibilityLabel={`${code} airline logo`} source={logos[code]||{uri:`https://static.tripjack.com/img/airlineLogo/v1/${encodeURIComponent(code)}.png`}} onError={()=>setFailed(true)} style={{width:size,height:size,resizeMode:'contain'}}/>;}
