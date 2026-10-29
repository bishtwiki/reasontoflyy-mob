import {Text} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Platform,StatusBar,View} from 'react-native';
import {Asset} from 'expo-asset';
import {WebView} from 'react-native-webview';
import {C,Icon} from './ui';

const launchVideo=Asset.fromModule(require('../assets/brand/launching.mp4'));
export function LaunchScreen({onDone}:{onDone:()=>void}){
 const[uri,setUri]=useState<string>();const finished=useRef(false);const fallback=useRef<ReturnType<typeof setTimeout>|null>(null);
 const finish=()=>{if(finished.current)return;finished.current=true;if(fallback.current)clearTimeout(fallback.current);onDone();};
 useEffect(()=>{let active=true;void launchVideo.downloadAsync().then(asset=>{if(active)setUri(asset.localUri||asset.uri);}).catch(()=>{});fallback.current=setTimeout(finish,10000);return()=>{active=false;if(fallback.current)clearTimeout(fallback.current);};},[]);
 const source=uri?JSON.stringify(uri):'';
 const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head><body style="margin:0;background:#faf9f6;overflow:hidden"><video id="launch" src=${source} autoplay muted playsinline webkit-playsinline style="width:100vw;height:100vh;object-fit:contain"></video><script>const v=document.getElementById('launch');v.onended=()=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('ended');v.onerror=()=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('error');v.play().catch(()=>{});</script></body></html>`;
 return <View accessibilityViewIsModal accessibilityLabel="Reason to Flyy is opening" style={{position:'absolute',top:0,right:0,bottom:0,left:0,zIndex:100,backgroundColor:C.pale,overflow:'hidden'}}><StatusBar barStyle="dark-content"/>{uri&&Platform.OS==='web'?React.createElement('video',{src:uri,autoPlay:true,muted:true,playsInline:true,onEnded:finish,onError:finish,style:{width:'100%',height:'100%',objectFit:'contain',backgroundColor:C.pale}}):uri?<WebView source={{html,baseUrl:'file:///'}} originWhitelist={['*']} javaScriptEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs scrollEnabled={false} bounces={false} onMessage={event=>{if(event.nativeEvent.data==='ended'||event.nativeEvent.data==='error')finish();}} style={{flex:1,backgroundColor:C.pale}}/>:<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:14}}><View style={{width:86,height:86,borderRadius:44,backgroundColor:'white',borderWidth:1,borderColor:C.primary,alignItems:'center',justifyContent:'center'}}><Icon name="airplane" size={42} color={C.ink}/></View><ActivityIndicator color={C.ink}/><Text style={{fontSize:13,fontWeight:'600',color:C.ink}}>Getting your journey ready</Text></View>}</View>;
}
