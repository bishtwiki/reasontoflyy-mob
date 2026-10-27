import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Animated,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button,C,Icon,s} from './ui';
import {money} from '../shared/catalog';
import type {Flight,FlightQuery,FlightResults} from '../shared/types';

type Props={groups:FlightResults['groups'];query:FlightQuery;selected:Record<string,string>;active:number;onChange:(index:number)=>void;onContinue:()=>void;busy:boolean};
const departure=(f:Flight)=>f.segments[0]?.departure.slice(11,16)||'—';
const arrival=(f:Flight)=>f.segments[f.segments.length-1]?.arrival.slice(11,16)||'—';
export function FlightSelectionTray({groups,query,selected,active,onChange,onContinue,busy}:Props){
 const {height:windowHeight}=useWindowDimensions();const insets=useSafeAreaInsets();
 const bottom=Math.min(insets.bottom,30);const collapsed=150+bottom;const expandedHeight=Math.max(collapsed+90,Math.min(560,windowHeight*.66));
 const [expanded,setExpanded]=useState(false);const height=useRef(new Animated.Value(collapsed)).current;
 const pointer=useRef<{y:number;start:number}|null>(null);const lastPointer=useRef(0);
 const current=useRef(collapsed);const dragStart=useRef(collapsed);const userExpanded=useRef(false);
 const chosen=groups.map(g=>g.flights.find(f=>f.id===selected[g.key]));const count=chosen.filter(Boolean).length;const complete=count===groups.length;const total=chosen.reduce((n,f)=>n+(f?.amount||0),0);
 const snap=useCallback((open:boolean)=>{userExpanded.current=open;setExpanded(open);Animated.spring(height,{toValue:open?expandedHeight:collapsed,useNativeDriver:false,tension:90,friction:16,overshootClamping:true}).start();},[height,collapsed,expandedHeight]);
 useEffect(()=>{const listener=height.addListener(({value})=>{current.current=value;});return()=>height.removeListener(listener);},[height]);
 useEffect(()=>{height.setValue(userExpanded.current?expandedHeight:collapsed);},[height,expandedHeight,collapsed]);
 useEffect(()=>{if(count===groups.length&&count>0)snap(true);},[count,groups.length,snap]);
 const responder=useRef<ReturnType<typeof PanResponder.create>|null>(null);
 responder.current=PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onStartShouldSetPanResponderCapture:()=>true,
  onMoveShouldSetPanResponder:(_e,g)=>Math.abs(g.dy)>5&&Math.abs(g.dy)>Math.abs(g.dx),
  onMoveShouldSetPanResponderCapture:(_e,g)=>Math.abs(g.dy)>5&&Math.abs(g.dy)>Math.abs(g.dx),
  onPanResponderGrant:()=>{height.stopAnimation(value=>{current.current=value;dragStart.current=value;});},
  onPanResponderMove:(_e,g)=>{height.setValue(Math.max(collapsed,Math.min(expandedHeight,dragStart.current-g.dy)));},
  onPanResponderRelease:(_e,g)=>snap(Math.abs(g.dy)<6?!userExpanded.current:g.vy<-.35?true:g.vy>.35?false:current.current>(collapsed+expandedHeight)/2),
  onPanResponderTerminate:()=>snap(userExpanded.current),
 });
 const webHandlers=Platform.OS==='web'?{
  onPointerDown:(event:any)=>{event.preventDefault();height.stopAnimation();pointer.current={y:event.nativeEvent.clientY,start:current.current};event.currentTarget.setPointerCapture?.(event.nativeEvent.pointerId);},
  onPointerMove:(event:any)=>{if(!pointer.current)return;const dy=event.nativeEvent.clientY-pointer.current.y;height.setValue(Math.max(collapsed,Math.min(expandedHeight,pointer.current.start-dy)));},
  onPointerUp:(event:any)=>{if(!pointer.current)return;const dy=event.nativeEvent.clientY-pointer.current.y;const finalHeight=pointer.current.start-dy;pointer.current=null;lastPointer.current=Date.now();snap(Math.abs(dy)<6?!userExpanded.current:finalHeight>(collapsed+expandedHeight)/2);},
  onPointerCancel:()=>{pointer.current=null;snap(userExpanded.current);},
 }:responder.current.panHandlers;
 function change(index:number){snap(false);onChange(index);}
 return <Animated.View testID="flight-selection-tray" style={[styles.tray,{height,paddingBottom:bottom}]}>
  <View {...webHandlers} style={{height:26,...(Platform.OS==='web'?{touchAction:'none' as const}:{})}}><Pressable accessibilityRole="button" accessibilityLabel={expanded?'Collapse selected flights':'Expand selected flights'} accessibilityState={{expanded}} onPress={()=>{if(Platform.OS!=='web'||Date.now()-lastPointer.current>500)snap(!expanded);}} style={styles.handleTouch}><View style={styles.handle}/></Pressable></View>
  {expanded?<ScrollView nestedScrollEnabled contentContainerStyle={{paddingHorizontal:14,paddingBottom:12,gap:10}} showsVerticalScrollIndicator={false}>
   <View style={[s.row,{justifyContent:'space-between',marginBottom:3}]}><Text style={{fontSize:15,fontWeight:'700',color:C.navy}}>Selected Flights</Text><Text style={s.small}>{count} of {groups.length} selected</Text></View>
   {groups.map((g,index)=>{const flight=chosen[index];const route=query.routes[index];return <View key={g.key} style={[styles.leg,{borderColor:index===active?C.primary:C.line}]}><View style={[s.row,{justifyContent:'space-between'}]}><Text style={{fontSize:12,fontWeight:'700',color:C.ink}}>Flight {index+1} · {route?`${route.from} → ${route.to}`:g.label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${flight?'Change':'Select'} Flight ${index+1}`} onPress={()=>change(index)} hitSlop={8}><Text style={s.link}>{flight?'Change':'Select'}</Text></Pressable></View><Text style={s.small}>{route?.date}</Text>{flight?<><View style={[s.row,{justifyContent:'space-between',marginTop:9}]}><View><Text style={s.bodyBold}>{flight.airline}</Text><Text style={s.small}>{flight.segments[0]?.number}</Text></View><Text style={{fontSize:16,fontWeight:'700',color:C.navy}}>{money(flight.amount,flight.currency)}</Text></View><View style={[s.row,{justifyContent:'space-between',marginTop:10}]}><Text style={s.bodyBold}>{departure(flight)} — {arrival(flight)}</Text><Text style={s.small}>{Math.floor(flight.duration/60)}h {flight.duration%60}m · {flight.stops?`${flight.stops} stop(s)`:'Non-stop'}</Text></View></>:<Text style={[s.small,{paddingVertical:12}]}>Choose a flight for this journey</Text>}</View>;})}
  </ScrollView>:<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0}} contentContainerStyle={{paddingHorizontal:12,gap:7,paddingBottom:7}}>{groups.map((g,index)=>{const flight=chosen[index];return <Pressable key={g.key} accessibilityRole="button" accessibilityLabel={`View Flight ${index+1}`} onPress={()=>change(index)} style={[styles.mini,{borderColor:index===active?C.primary:C.line}]}><Text style={{fontSize:10,color:C.muted}}>Flight {index+1}{flight?' ✓':''}</Text><Text style={{fontSize:11,fontWeight:'700',color:C.navy}}>{flight?`${departure(flight)} · ${money(flight.amount,flight.currency)}`:'Select flight'}</Text></Pressable>;})}</ScrollView>}
  <View style={styles.footer}><View style={{flex:1}}><Text style={{fontSize:10,color:'#d6e6ef'}}>{count}/{groups.length} flights · total for all travellers</Text><Text testID="selected-flight-total" accessibilityLiveRegion="polite" style={{fontSize:23,fontWeight:'800',color:'white',marginTop:3}}>{money(total,chosen.find(Boolean)?.currency||'INR')}</Text></View><Button title="Continue" loading={busy} disabled={!complete} onPress={onContinue} style={{minHeight:42,borderRadius:5,backgroundColor:C.primary,paddingHorizontal:22}}/></View>
 </Animated.View>;
}
const styles=StyleSheet.create({tray:{position:'absolute',bottom:0,left:0,right:0,zIndex:10,backgroundColor:'white',borderTopLeftRadius:16,borderTopRightRadius:16,borderWidth:1,borderColor:'#d7e0e8',boxShadow:'0 -3px 18px #00000016',overflow:'hidden'},handleTouch:{height:26,alignItems:'center',justifyContent:'center'},handle:{width:44,height:4,borderRadius:3,backgroundColor:'#b6c3cd'},leg:{borderWidth:1,borderRadius:8,padding:12,backgroundColor:'white'},mini:{paddingVertical:5,paddingHorizontal:10,minWidth:118,borderWidth:1,borderRadius:5,gap:3},footer:{marginTop:'auto',backgroundColor:'#111827',paddingHorizontal:14,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12}});
