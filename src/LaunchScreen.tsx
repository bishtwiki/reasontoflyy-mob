import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,StatusBar,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {C,Icon} from './ui';

const logo=require('../assets/reference/image-0.png');

export function LaunchScreen({onDone}:{onDone:()=>void}){
 const {width}=useWindowDimensions();
 const insets=useSafeAreaInsets();
 const [loaded,setLoaded]=useState(false);
 const [reduceMotion,setReduceMotion]=useState<boolean|null>(null);
 const entrance=useRef(new Animated.Value(0)).current;
 const footer=useRef(new Animated.Value(0)).current;
 const logoScale=useRef(new Animated.Value(.82)).current;
 const screenOpacity=useRef(new Animated.Value(1)).current;
 const orbit=useRef(new Animated.Value(0)).current;
 const glow=useRef(new Animated.Value(0)).current;
 const progress=useRef(new Animated.Value(0)).current;
 const logoWidth=Math.min(width*.64,280);
 const heroSize=logoWidth+64;

 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);}).catch(()=>{if(mounted)setReduceMotion(true);});
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
  return()=>{mounted=false;listener.remove();};
 },[]);

 useEffect(()=>{
  const fallback=setTimeout(onDone,4500);
  return()=>clearTimeout(fallback);
 },[onDone]);

 useEffect(()=>{
  if(!loaded||reduceMotion===null)return;
  if(reduceMotion){onDone();return;}
  const orbitLoop=Animated.loop(Animated.timing(orbit,{toValue:1,duration:2600,easing:Easing.linear,useNativeDriver:true}));
  const glowLoop=Animated.loop(Animated.sequence([
   Animated.timing(glow,{toValue:1,duration:850,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   Animated.timing(glow,{toValue:0,duration:850,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
  ]));
  orbitLoop.start();
  glowLoop.start();
  const sequence=Animated.sequence([
   Animated.parallel([
    Animated.timing(entrance,{toValue:1,duration:520,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
    Animated.spring(logoScale,{toValue:1,damping:13,stiffness:125,mass:.8,useNativeDriver:true}),
   ]),
   Animated.parallel([
    Animated.timing(footer,{toValue:1,duration:340,easing:Easing.out(Easing.quad),useNativeDriver:true}),
    Animated.timing(progress,{toValue:1,duration:1750,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
   ]),
   Animated.delay(180),
   Animated.parallel([
    Animated.timing(screenOpacity,{toValue:0,duration:360,easing:Easing.in(Easing.quad),useNativeDriver:true}),
    Animated.timing(logoScale,{toValue:1.18,duration:360,easing:Easing.in(Easing.quad),useNativeDriver:true}),
    Animated.timing(footer,{toValue:0,duration:220,easing:Easing.in(Easing.quad),useNativeDriver:true}),
   ]),
  ]);
  sequence.start(({finished})=>{if(finished)onDone();});
  return()=>{sequence.stop();orbitLoop.stop();glowLoop.stop();};
 },[loaded,reduceMotion,onDone,entrance,footer,logoScale,screenOpacity,orbit,glow,progress]);

 const rotation=orbit.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
 const glowOpacity=glow.interpolate({inputRange:[0,1],outputRange:[.24,.72]});
 const sparkleScale=glow.interpolate({inputRange:[0,1],outputRange:[.8,1.15]});

 return <Animated.View accessibilityViewIsModal accessibilityLabel="Reason to Flyy is opening" style={[styles.screen,{opacity:screenOpacity}]}>
  <StatusBar barStyle="dark-content"/>
  <View style={styles.center}>
   <View style={{width:heroSize,height:heroSize,alignItems:'center',justifyContent:'center'}}>
    <Animated.View style={[styles.halo,{width:heroSize-8,height:heroSize-8,opacity:glowOpacity,transform:[{scale:sparkleScale}]}]}/>
    <View style={[styles.orbit,{width:heroSize-20,height:heroSize-20}]}/>
    <Animated.View style={[styles.orbiting,{width:heroSize-20,height:heroSize-20,transform:[{rotate:rotation}]}]}>
     <View style={styles.plane}><Icon name="airplane" size={17} color={C.ink}/></View>
    </Animated.View>
    <Animated.Image source={logo} accessibilityLabel="Reason to Flyy" onLoad={()=>setLoaded(true)} onError={onDone} resizeMode="contain" style={{width:logoWidth,height:logoWidth/1.125,opacity:entrance,transform:[{scale:logoScale}]}}/>
    <Animated.View style={[styles.sparkle,{top:heroSize*.17,left:heroSize*.08,opacity:glowOpacity,transform:[{scale:sparkleScale}]}]}><Icon name="sparkles" size={17} color={C.ink}/></Animated.View>
    <Animated.View style={[styles.sparkle,{right:heroSize*.06,bottom:heroSize*.2,opacity:glowOpacity,transform:[{scale:sparkleScale}]}]}><Icon name="sparkles" size={13} color={C.primaryHover}/></Animated.View>
   </View>
  </View>
  <Animated.View style={[styles.footer,{bottom:Math.max(insets.bottom,20)+34,opacity:footer,transform:[{translateY:footer.interpolate({inputRange:[0,1],outputRange:[12,0]})}]}]}>
   <Text style={styles.tagline}>Every Dream Has a Destination</Text>
   <View style={styles.progressTrack}><Animated.View style={[styles.progressFill,{transform:[{scaleX:progress}]}]}/></View>
   <Text style={styles.caption}>Getting your journey ready</Text>
  </Animated.View>
 </Animated.View>;
}

const styles=StyleSheet.create({
 screen:{position:'absolute',top:0,right:0,bottom:0,left:0,zIndex:100,backgroundColor:C.pale,overflow:'hidden'},
 center:{flex:1,alignItems:'center',justifyContent:'center'},
 halo:{position:'absolute',borderRadius:999,borderWidth:1,backgroundColor:'#f5e5c8',borderColor:'#d5b574'},
 orbit:{position:'absolute',borderRadius:999,borderWidth:1,borderStyle:'dashed',borderColor:'#cbb27a88'},
 orbiting:{position:'absolute',alignItems:'center',justifyContent:'flex-start'},
 plane:{width:31,height:31,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'white',borderWidth:1,borderColor:'#e6c58a',boxShadow:'0 3px 12px #7f6c4c22'},
 sparkle:{position:'absolute'},
 footer:{position:'absolute',left:25,right:25,alignItems:'center',gap:11},
 tagline:{fontSize:15,fontWeight:'700',color:C.ink,letterSpacing:.4,textAlign:'center'},
 progressTrack:{width:132,height:3,borderRadius:3,backgroundColor:'#e8ddc9',overflow:'hidden'},
 progressFill:{width:'100%',height:'100%',backgroundColor:C.ink,transformOrigin:'left'},
 caption:{fontSize:11,color:C.muted,letterSpacing:.2},
});
