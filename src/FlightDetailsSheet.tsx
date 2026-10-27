import React from 'react';
import {ScrollView,Text,View,useWindowDimensions} from 'react-native';
import type {Flight} from '../shared/types';
export {seatsLabel} from '../shared/flightPresentation';
import {Button,Sheet,s} from './ui';
import {FlightDetailsContent} from './FlightDetailsContent';
export function FlightDetailsSheet({flights,onClose,onRules,mapOnly=false,fares=[],onChooseFare}:{flights:Flight[]|null;onClose:()=>void;onRules?:(flights:Flight[])=>void;mapOnly?:boolean;fares?:Flight[];onChooseFare?:(fare:Flight)=>void}){const{height}=useWindowDimensions();return <Sheet visible={!!flights?.length} onClose={onClose} title={mapOnly?'Show on map':'Flight details'}><ScrollView style={{maxHeight:Math.max(180,height*.9-140)}} contentContainerStyle={{gap:18,paddingBottom:20}}>{mapOnly&&<Text style={s.small}>Choose an airport to view its location on the map.</Text>}{flights?.map(f=><View key={f.id} style={{gap:12}}><Text style={s.heading}>{f.segments[0]?.from} → {f.segments.at(-1)?.to}</Text><FlightDetailsContent flight={f} fares={fares} onChooseFare={onChooseFare} mapOnly={mapOnly}/>{!mapOnly&&onRules&&<Button title="Fare rules" secondary onPress={()=>onRules([f])}/>}</View>)}</ScrollView></Sheet>;}
