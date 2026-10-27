import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {api} from './api';
import {Button,C,Icon,Sheet,s} from './ui';
import {money} from '../shared/catalog';
import type {Quote,Segment,Traveller} from '../shared/types';

type SeatResponse={available?:boolean;message?:string;data?:unknown};
type ServicesResponse={available?:boolean;message?:string;data?:{flightId?:string;ssr?:unknown}[]};
type SeatOption={code:string;row:number;price?:number;currency:string;available:boolean;features:string[];segment?:string};
type SeatChoice={code:string;price?:number;currency:string;segmentKey:string;travellerIndex:number};
type AncillaryOption={name:string;code?:string;price?:number;currency:string;segment?:string};
const travellerLabel=(traveller:Traveller,index:number)=>`${traveller.type==='ADULT'?'Adult':traveller.type==='CHILD'?'Child':'Infant'} ${index+1}`;
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():undefined;
const number=(value:unknown)=>{const n=typeof value==='number'?value:typeof value==='string'?Number(value):NaN;return Number.isFinite(n)?n:undefined;};
const segmentKey=(segment:Segment,index:number)=>`${segment.from}-${segment.to}-${segment.number||index}`;
function availability(item:Record<string,unknown>){
 const yes=new Set(['true','yes','y','available','free','open','empty','unoccupied','unbooked','1']);
 const no=new Set(['false','no','n','unavailable','occupied','booked','blocked','reserved','sold','0']);
 for(const key of ['available','isAvailable','isFree','free','seatAvailable','seatAvailability','isEmpty','isSellable']){const value=item[key];if(typeof value==='boolean')return value;if(typeof value==='number'&&[0,1].includes(value))return value===1;if(typeof value==='string'&&yes.has(value.toLowerCase()))return true;if(typeof value==='string'&&no.has(value.toLowerCase()))return false;}
 for(const key of ['occupied','isOccupied','booked','isBooked','blocked','isBlocked','reserved','isReserved']){const value=item[key];if(typeof value==='boolean')return !value;if(typeof value==='number'&&[0,1].includes(value))return value===0;if(typeof value==='string'&&yes.has(value.toLowerCase()))return false;if(typeof value==='string'&&no.has(value.toLowerCase()))return true;}
 const state=String(item.status??item.state??item.seatStatus??item.availabilityStatus??item.availabilityType??'').toLowerCase().trim();
 if(/^(available|free|open|empty|unoccupied|unbooked|sellable)$/.test(state))return true;
 if(/(occupied|booked|blocked|unavailable|not available|reserved|sold|closed)/.test(state))return false;
 return false;
}

function readSeats(data:unknown):SeatOption[]{
 const found:SeatOption[]=[];const seen=new Set<string>();
 const walk=(value:unknown,inheritedSegment?:string)=>{
  if(Array.isArray(value)){value.forEach(item=>walk(item,inheritedSegment));return;}
  if(!value||typeof value!=='object')return;
  const item=value as Record<string,unknown>;
  const segment=text(item.segmentId)||text(item.segmentKey)||text(item.flightNumber)||text(item.flightNo)||inheritedSegment;
  const rawCode=item.seatNo??item.seatNumber??item.seatCode??item.seat_no??item.seatLabel??item.seatName??item.sn??item.code??item.number??item.name;
  let code=typeof rawCode==='string'||typeof rawCode==='number'?String(rawCode).trim():'';
  if(!/^[0-9]{1,3}[A-K]$/i.test(code)){const rowValue=item.rowNumber??item.rowNo??item.row;const columnValue=item.seatLetter??item.columnLetter??item.column??item.columnNo;const row=typeof rowValue==='string'||typeof rowValue==='number'?String(rowValue).trim():'';const column=typeof columnValue==='string'?columnValue.trim():'';if(/^\d{1,3}$/.test(row)&&/^[A-K]$/i.test(column))code=`${row}${column}`;}
  if(/^[0-9]{1,3}[A-K]$/i.test(code)){
   const key=`${segment||''}:${code}`;
   if(!seen.has(key)){
    seen.add(key);
    const rawPrice=item.price??item.amount??item.totalAmount??item.seatPrice;
    const price=number(rawPrice)??(rawPrice&&typeof rawPrice==='object'?number((rawPrice as Record<string,unknown>).amount??(rawPrice as Record<string,unknown>).value):undefined);
    const currency=text(item.currency)||text(item.cur)||'INR';
    const rawFeatures=item.features??item.characteristics??item.amenities??item.seatCharacteristics;
    const features=Array.isArray(rawFeatures)?rawFeatures.map(x=>typeof x==='string'?x:x&&typeof x==='object'?text((x as Record<string,unknown>).name)||text((x as Record<string,unknown>).description)||text((x as Record<string,unknown>).code):undefined).filter((x):x is string=>!!x):[];
    found.push({code,row:Number(item.rowNumber??item.rowNo??item.row??code.match(/^\d+/)?.[0]??0),price,currency,available:availability(item),features,segment});
   }
  }
  const nextSegment=text(item.segmentId)||text(item.segmentKey)||text(item.flightNumber)||text(item.flightNo)||inheritedSegment;
  for(const child of Object.values(item))if(child&&typeof child==='object')walk(child,nextSegment);
 };
 walk(data);
 return found.sort((a,b)=>a.row-b.row||a.code.localeCompare(b.code,undefined,{numeric:true}));
}
function readAncillaries(data:unknown,kind:'baggage'|'meal'):AncillaryOption[]{
 const found:AncillaryOption[]=[];const seen=new Set<string>();
 const walk=(value:unknown,path:string[]=[]):void=>{
  if(Array.isArray(value)){value.forEach(item=>walk(item,path));return;}
  if(!value||typeof value!=='object')return;
  const item=value as Record<string,unknown>;const current=path.join(' ').toLowerCase();
  const type=String(item.type??item.ssrType??item.serviceType??item.category??'').toLowerCase();
  const isKind=kind==='baggage'?/(baggage|bag|luggage)/.test(current+' '+type):/(meal|food|snack)/.test(current+' '+type);
  const name=text(item.description)||text(item.desc)||text(item.name)||text(item.title)||text(item.ssrName)||text(item.label);
  const code=text(item.code)||text(item.ssrCode)||text(item.ssrTypeCode);
  const rawPrice=item.amount??item.price??item.totalAmount??item.totalPrice??item.fare;
  const price=number(rawPrice)??(rawPrice&&typeof rawPrice==='object'?number((rawPrice as Record<string,unknown>).amount??(rawPrice as Record<string,unknown>).value):undefined);
  if(isKind&&(name||code)&&(name||price!==undefined)){
   const key=`${code||''}:${name||''}:${price??''}`;
   if(!seen.has(key)){seen.add(key);found.push({name:name||code!,code,price,currency:text(item.currency)||text(item.cur)||'INR',segment:text(item.segmentId)||text(item.flightNumber)||text(item.flightNo)||text(item.route)});}
  }
  for(const [key,child] of Object.entries(item))if(child&&typeof child==='object')walk(child,[...path,key]);
 };
 walk(data);return found;
}
export function AdditionalFlightServices({quote,travellers}:{quote:Quote;travellers:Traveller[]}){
 const[loading,setLoading]=useState(false);const[open,setOpen]=useState(false);const[seat,setSeat]=useState<SeatResponse>();const[seatError,setSeatError]=useState('');
 const[servicesLoading,setServicesLoading]=useState(false);const[services,setServices]=useState<ServicesResponse>();
 const[activeSegment,setActiveSegment]=useState(0);const[activeTraveller,setActiveTraveller]=useState(0);const[draft,setDraft]=useState<SeatOption>();const[choices,setChoices]=useState<SeatChoice[]>([]);
 const flights=quote.flights||[];const segments=flights.flatMap(flight=>flight.segments);
 const seatOptions=useMemo(()=>readSeats(seat?.data),[seat]);
 useEffect(()=>{let current=true;setServices(undefined);if(quote.preview||quote.mode==='demo')return()=>{current=false;};setServicesLoading(true);api<ServicesResponse>(`/quotes/${encodeURIComponent(quote.id)}/services`).then(result=>{if(current)setServices(result);}).catch(error=>{if(current)setServices({available:false,message:error?.message||'Airline service options could not be loaded.'});}).finally(()=>{if(current)setServicesLoading(false);});return()=>{current=false;};},[quote.id,quote.preview,quote.mode]);
 const mealSummary=(traveller:Traveller)=>flights.map(flight=>{const passenger=flight.fareBreakup?.passengers.find(item=>item.type===traveller.type);const included=passenger?.mealIncluded??(traveller.type==='ADULT'?flight.mealIncluded:undefined);return `${flight.segments[0]?.from||''}–${flight.segments.at(-1)?.to||''}: ${typeof included==='boolean'?(included?'included':'not included'):'not provided by API'}`;}).join(' · ')||'Meal information not provided by API.';
 const baggageSummary=(traveller:Traveller)=>flights.map(flight=>{const passenger=flight.fareBreakup?.passengers.find(item=>item.type===traveller.type);const allowance=passenger?.baggage??(traveller.type==='ADULT'?flight.baggage:undefined);return `${flight.segments[0]?.from||''}–${flight.segments.at(-1)?.to||''}: ${allowance||'not provided by API'}`;}).join(' · ')||'Baggage information not provided by API.';
 async function loadSeats(travellerIndex:number){setSeatError('');setSeat(undefined);setDraft(undefined);setActiveTraveller(travellerIndex);setActiveSegment(0);if(quote.preview){setSeatError('Sign in and continue to load seat information for this fare.');setOpen(true);return;}if(quote.mode==='demo'){setSeatError('Seat selection is not available for demo flights.');setOpen(true);return;}setLoading(true);setOpen(true);try{const result=await api<SeatResponse>(`/quotes/${encodeURIComponent(quote.id)}/seats`);setSeat(result);if(!result.available)setSeatError(result.message||'The airline has not made seat selection available for this fare.');else if(!readSeats(result.data).length)setSeatError('The airline did not return selectable seat rows for this fare. Try again later or continue without choosing a seat.');else if(segments[0]){const old=choices.find(choice=>choice.travellerIndex===travellerIndex&&choice.segmentKey===segmentKey(segments[0],0));if(old)setDraft(readSeats(result.data).find(option=>option.code===old.code));}}catch(e:any){setSeatError(e?.message||'Seat information is unavailable right now.');}finally{setLoading(false);}}
 const currentSegment=segments[activeSegment];const currentKey=currentSegment?segmentKey(currentSegment,activeSegment):'flight';
 const currentOptions=segments.length>1&&!seatOptions.some(option=>option.segment)?[]:seatOptions.filter(option=>!option.segment||segments.length===1||option.segment===currentKey||option.segment===currentSegment?.number||option.segment===currentSegment?.id);
 const confirmedForTraveller=(index:number)=>choices.filter(choice=>choice.travellerIndex===index);
 const confirmSeat=()=>{if(!draft||!currentSegment)return;setChoices(existing=>[...existing.filter(choice=>!(choice.travellerIndex===activeTraveller&&choice.segmentKey===currentKey)),{code:draft.code,price:draft.price,currency:draft.currency,segmentKey:currentKey,travellerIndex:activeTraveller}]);setOpen(false);};
 return <View style={{backgroundColor:'white',borderRadius:18,borderWidth:1,borderColor:'#eadfc9',overflow:'hidden',boxShadow:'0 3px 14px #172b3d0a'}} testID="additional-flight-services">
  <View style={{padding:15,gap:5,backgroundColor:'#fffdf9'}}><View style={{flexDirection:'row',alignItems:'center',gap:9}}><View style={{width:34,height:34,borderRadius:11,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name="briefcase-outline" size={18} color={C.ink}/></View><Text style={{fontSize:16,fontWeight:'700',color:C.navy,flex:1}}>Additional services</Text><Text style={{fontSize:10,fontWeight:'700',color:C.ink,backgroundColor:C.pale,paddingHorizontal:8,paddingVertical:5,borderRadius:20}}>{travellers.length} traveller{travellers.length===1?'':'s'}</Text></View><Text style={s.small}>Baggage and meal options from the airline · seat availability checked live</Text></View>
  <View style={{padding:12,gap:12}}>
   {flights.map(flight=>{const service=services?.data?.find(item=>item.flightId===flight.id)?.ssr;const bags=readAncillaries(service,'baggage');const meals=readAncillaries(service,'meal');const route=flight.segments.map(segment=>segment.from).concat(flight.segments.at(-1)?.to||[]).filter(Boolean).join(' → ');const renderOptions=(items:AncillaryOption[],empty:string)=>items.length?<View style={{gap:7}}>{items.slice(0,5).map((item,index)=><View key={`${item.code||item.name}-${index}`} style={{minHeight:43,paddingHorizontal:10,paddingVertical:8,borderRadius:11,borderWidth:1,borderColor:C.line,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:7,height:7,borderRadius:5,backgroundColor:C.primary}}/><Text numberOfLines={1} style={{fontSize:12,fontWeight:'600',color:C.navy,flex:1}}>{item.name}</Text><Text style={{fontSize:12,fontWeight:'700',color:C.navy}}>{item.price===undefined?'Price on request':money(item.price,item.currency)}</Text></View>)}</View>:<Text style={s.small}>{empty}</Text>;return <View key={flight.id} style={{gap:10}}><View style={{paddingHorizontal:3}}><Text style={{fontSize:13,fontWeight:'700',color:C.navy}}>{route}</Text><Text style={s.small}>{flight.segments.map(segment=>segment.number).filter(Boolean).join(' · ')}</Text></View>
    <View style={{borderRadius:14,borderWidth:1,borderColor:'#efd5c6',overflow:'hidden'}}><View style={{paddingHorizontal:12,paddingVertical:10,backgroundColor:'#fbefe8',flexDirection:'row',alignItems:'center',gap:8}}><Icon name="bag-handle-outline" size={17} color="#b65a12"/><Text style={{fontSize:13,fontWeight:'700',color:C.navy,flex:1}}>Extra baggage</Text><Text style={{fontSize:11,color:C.muted}}>{bags.length} options</Text></View><View style={{padding:10,gap:8}}>{servicesLoading?<Text style={s.small}>Loading airline baggage options…</Text>:renderOptions(bags,services?.message||'No extra baggage options were returned by the airline for this fare. Standard allowance: '+baggageSummary(travellers[0]))}</View></View>
    <View style={{borderRadius:14,borderWidth:1,borderColor:'#c9e2d8',overflow:'hidden'}}><View style={{paddingHorizontal:12,paddingVertical:10,backgroundColor:'#eaf5f0',flexDirection:'row',alignItems:'center',gap:8}}><Icon name="restaurant-outline" size={17} color={C.green}/><Text style={{fontSize:13,fontWeight:'700',color:C.navy,flex:1}}>Meals</Text><Text style={{fontSize:11,color:C.muted}}>{meals.length} options</Text></View><View style={{padding:10,gap:8}}>{servicesLoading?<Text style={s.small}>Loading airline meal options…</Text>:renderOptions(meals,services?.message||'No paid meal options were returned by the airline. Fare meal status: '+mealSummary(travellers[0]))}</View></View>
    {travellers.map((traveller,index)=>{const passengerChoices=confirmedForTraveller(index).filter(choice=>flight.segments.some((segment,i)=>segmentKey(segment,i)===choice.segmentKey));const seatStatus=passengerChoices.length?passengerChoices.map(choice=>`${choice.code}${choice.price?` · ${money(choice.price,choice.currency)}`:''}`).join(' · '):'No seat chosen';return <View key={`${flight.id}-${traveller.type}-${index}`} style={{padding:10,borderRadius:14,borderWidth:1,borderColor:'#dcebf2',backgroundColor:'#fbfdfe',gap:8}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name="bed-outline" size={17} color="#0877b9"/><Text style={{fontSize:13,fontWeight:'700',color:C.navy,flex:1}}>Seat · {travellerLabel(traveller,index)}</Text><Text style={{fontSize:11,color:C.muted}}>{flight.segments.length} {flight.segments.length===1?'leg':'legs'}</Text></View><Text style={s.small}>{seatStatus}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Select seat for ${travellerLabel(traveller,index)}, ${route}`} disabled={loading} onPress={()=>void loadSeats(index)} style={{minHeight:42,borderRadius:11,borderWidth:1,borderColor:'#cfe4ef',backgroundColor:'white',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,opacity:loading?.6:1}}><Icon name="bed-outline" size={15} color="#0877b9"/><Text style={{fontSize:12,fontWeight:'700',color:'#0877b9'}}>{loading?'Loading seats…':'Select seat'}</Text></Pressable></View>;})}
   </View>;})}
   {services?.available===false&&services.message&&<View style={{padding:10,borderRadius:10,backgroundColor:'#fff8ed'}}><Text style={s.small}>{services.message}</Text></View>}
   <Text style={{fontSize:10,lineHeight:15,color:C.muted}}>Baggage, meal choices, and prices are shown only when returned for this fare by the airline. Seat availability is checked when you open the seat map.</Text>
  </View>
  <Sheet visible={open} onClose={()=>setOpen(false)} title="Choose your seat"><View style={{maxHeight:'82%',gap:12}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{width:38,height:38,borderRadius:13,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'}}><Icon name="airplane-outline" size={20} color={C.ink}/></View><View style={{flex:1,gap:3}}><Text style={s.bodyBold}>{travellers[activeTraveller]?travellerLabel(travellers[activeTraveller],activeTraveller):'Traveller'}</Text><Text style={s.small}>{currentSegment?`${currentSegment.from} → ${currentSegment.to} · ${currentSegment.number}`:`${segments.length} flight segment${segments.length===1?'':'s'}`}</Text></View></View>
   {segments.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{segments.map((segment,index)=><Pressable key={`${segment.id}-${index}`} onPress={()=>{setActiveSegment(index);setDraft(seatOptions.find(option=>option.code===choices.find(choice=>choice.travellerIndex===activeTraveller&&choice.segmentKey===segmentKey(segment,index))?.code));}} style={{paddingHorizontal:12,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:activeSegment===index?C.primary:C.line,backgroundColor:activeSegment===index?C.pale:'white'}}><Text style={{fontSize:11,fontWeight:'700',color:activeSegment===index?C.ink:C.muted}}>{segment.from} → {segment.to}</Text></Pressable>)}</ScrollView>}
   {loading?<View style={{padding:35,alignItems:'center',gap:12}}><Icon name="airplane" size={30} color={C.ink}/><Text style={s.small}>Loading the airline seat map…</Text></View>:seatError?<View style={{padding:16,borderRadius:12,backgroundColor:'#fff8ed',gap:6}}><Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>Seat map unavailable</Text><Text style={s.small}>{seatError}</Text></View>:<>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[['#fff','Available'],['#e9dfcb','Unavailable'],[C.green,'Selected']].map(([color,label])=><View key={label as string} style={{flexDirection:'row',alignItems:'center',gap:5}}><View style={{width:11,height:11,borderRadius:4,backgroundColor:color as string,borderWidth:1,borderColor:C.line}}/><Text style={{fontSize:10,color:C.muted}}>{label}</Text></View>)}</View>
    {currentOptions.length===0?(
     <View style={{padding:16,borderRadius:12,backgroundColor:C.pale}}><Text style={s.small}>{segments.length>1&&!seatOptions.some(option=>option.segment)?'The API did not identify which flight segment these seats belong to, so they cannot be assigned safely.':'The API response contains no seat positions for this flight segment.'}</Text></View>
    ):(
     <View style={{borderWidth:1,borderColor:'#e8e2d8',borderTopLeftRadius:90,borderTopRightRadius:90,borderBottomLeftRadius:26,borderBottomRightRadius:26,backgroundColor:'#fdfcf9',paddingTop:15,paddingHorizontal:5}}>
      <View style={{alignItems:'center',paddingBottom:10}}><Icon name="airplane" size={26} color={C.ink}/><Text style={{fontSize:9,color:C.muted,letterSpacing:1}}>FRONT OF AIRCRAFT</Text><Text style={{fontSize:10,color:C.green,marginTop:3}}>{currentOptions.filter(option=>option.available).length} seats available</Text></View>
      <ScrollView style={{maxHeight:290}} contentContainerStyle={{padding:6,paddingBottom:15,gap:13}}>
       {Array.from(new Set(currentOptions.map(option=>option.row))).map(row=>{
       const rowSeats=currentOptions.filter(option=>option.row===row);
       return <View key={row} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}}>
        <Text style={{width:22,textAlign:'right',fontSize:10,color:C.muted}}>{row}</Text>
        {rowSeats.map((option,index)=>{
         const selected=draft?.code===option.code;
         const chosenByOther=choices.some(choice=>choice.segmentKey===currentKey&&choice.code===option.code&&choice.travellerIndex!==activeTraveller);
         const canChoose=option.available&&!chosenByOther;
         return <React.Fragment key={`${row}-${option.code}`}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Seat ${option.code}, ${canChoose?'available':'unavailable'}${option.price?`, ${money(option.price,option.currency)}`:''}`} accessibilityState={{selected,disabled:!canChoose}} disabled={!canChoose} onPress={()=>setDraft(option)} style={{minWidth:36,height:37,paddingHorizontal:4,borderRadius:9,alignItems:'center',justifyContent:'center',borderWidth:selected?2:1,borderColor:selected?C.green:canChoose?C.line:'#d9d5ce',backgroundColor:selected?'#e8f6f1':canChoose?'white':'#e9e5dc',opacity:canChoose?1:.72}}>
           <Text style={{fontSize:10,fontWeight:'700',color:selected?C.green:canChoose?C.navy:'#999'}}>{option.code}</Text>
          </Pressable>
          {index===2&&<View style={{width:13}}/>}
         </React.Fragment>;
        })}
        <Text style={{width:22,fontSize:10,color:C.muted}}>{row}</Text>
       </View>;
       })}
      </ScrollView>
     </View>
    )}
    {draft&&<View style={{padding:12,borderRadius:12,backgroundColor:'#f7faf8',flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={s.bodyBold}>Seat {draft.code}</Text><Text style={{fontSize:14,fontWeight:'700',color:C.green}}>{draft.price===undefined?'Price not returned':draft.price===0?'Included':money(draft.price,draft.currency)}</Text></View>}
    <Button title={draft?'Confirm seat':'Choose an available seat'} disabled={!draft||!currentSegment} onPress={confirmSeat}/>
   </>}
   {seatError&&<Button title="Close" secondary onPress={()=>setOpen(false)}/>} 
  </View></Sheet>
 </View>;
}
