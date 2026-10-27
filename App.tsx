import {SearchLoader} from './src/SearchLoader';
import React,{useCallback,useState} from 'react';
import {MobileNavigation} from './src/MobileNavigation';
import {Ginni} from './src/screens/Ginni';
import {LaunchScreen} from './src/LaunchScreen';
import { Platform,Pressable,StatusBar,StyleSheet,Text,View } from 'react-native';
import { SafeAreaProvider,SafeAreaView } from 'react-native-safe-area-context';
import { AppProvider,useApp } from './src/context';
import { Button,C,Icon,s } from './src/ui';
import { Home,Offers } from './src/screens/Home';
import { FlightSearch,FlightResultsScreen } from './src/screens/Flights';
import { HotelSearch,HotelResultsScreen,HotelDetail } from './src/screens/Hotels';
import { Checkout,Trips,BookingDetail } from './src/screens/Bookings';
import { Account,AuthModal,Profile,Travellers,Wishlist } from './src/screens/Account';
import { Support,ServiceScreen,Enquiries } from './src/screens/Support';
const screens:Record<string,React.ComponentType>={ginni:Ginni,home:Home,offers:Offers,'flight-search':FlightSearch,'flight-results':FlightResultsScreen,'hotel-search':HotelSearch,'hotel-results':HotelResultsScreen,'hotel-detail':HotelDetail,checkout:Checkout,trips:Trips,booking:BookingDetail,account:Account,profile:Profile,travellers:Travellers,wishlist:Wishlist,support:Support,service:ServiceScreen,enquiries:Enquiries};
function Shell(){const{screen,tab,toast}=useApp();const Screen=screens[screen.name]||Home;const bottom=!(screen.name==='checkout'&&screen.params?.quote?.service==='flights');return <View style={{flex:1,backgroundColor:'#f4efe6',alignItems:'center'}}><SafeAreaView style={{flex:1,width:'100%',maxWidth:620,backgroundColor:screen.name==='home'?'white':C.bg,paddingTop:Platform.OS==='android'?StatusBar.currentHeight||0:0,boxShadow:Platform.OS==='web'?'0 0 50px rgba(23,45,71,0.06)':undefined}}><StatusBar barStyle="dark-content"/><View style={{flex:1}}><Screen key={screen.name}/></View>{bottom&&<MobileNavigation/>}{!!toast&&<View accessibilityLiveRegion="polite" style={[styles.toast,{bottom:bottom?85:20}]}><Text style={{color:'white',fontSize:13,lineHeight:20}}>{toast}</Text></View>}<AuthModal/><SearchLoader/></SafeAreaView></View>;}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true};}render(){return this.state.failed?<View style={{flex:1,justifyContent:'center',padding:25,gap:20,backgroundColor:'white'}}><Text style={s.heading}>This screen could not load</Text><Text style={s.sub}>Please restart the screen and try again.</Text><Button title="Try again" onPress={()=>this.setState({failed:false})}/></View>:this.props.children;}}
export default function App(){const [launch,setLaunch]=useState(true);const finishLaunch=useCallback(()=>setLaunch(false),[]);return <SafeAreaProvider><ErrorBoundary><AppProvider><View style={{flex:1}}><View style={{flex:1}} accessibilityElementsHidden={launch} importantForAccessibility={launch?'no-hide-descendants':'auto'}><Shell/></View>{launch&&<LaunchScreen onDone={finishLaunch}/>}</View></AppProvider></ErrorBoundary></SafeAreaProvider>;}
const styles=StyleSheet.create({nav:{flexDirection:'row',backgroundColor:'white',borderTopWidth:1,borderTopColor:C.line,paddingBottom:Platform.OS==='ios'?4:0},toast:{position:'absolute',left:18,right:18,backgroundColor:'#111827',borderRadius:12,padding:15,boxShadow:'0 4px 18px #00000020'}});
