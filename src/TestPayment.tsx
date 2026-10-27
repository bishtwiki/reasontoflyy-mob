import React,{useEffect,useState} from 'react';
import {AppState,Linking,Text} from 'react-native';
import {api} from './api';
import {Button,Card,Notice,s} from './ui';
interface Payment {id:string;status:string;checkoutUrl:string;expiresAt:number}
export function TestPayment({quoteId}:{quoteId:string}){
 const [payment,setPayment]=useState<Payment|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{setPayment(null);setError('');},[quoteId]);
 useEffect(()=>{
  if(!payment||payment.status!=='CREATED')return;
  let disposed=false;
  const refresh=async()=>{try{const p=await api<Payment>(`/payments/${payment.id}/status`);if(!disposed)setPayment(old=>old?{...old,...p}:old);}catch{/* Keep checkout retry available during brief network interruptions. */}};
  const timer=setInterval(()=>{if(Date.now()<payment.expiresAt)void refresh();else clearInterval(timer);},5000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{disposed=true;clearInterval(timer);listener.remove();};
 },[payment?.id,payment?.status]);
 async function open(){setBusy(true);setError('');try{const p=await api<Payment>('/payments/orders',{quoteId});setPayment(p);if(p.status==='CREATED')await Linking.openURL(p.checkoutUrl);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 const verified=payment?.status==='TEST_PAID'||payment?.status==='TEST_AUTHORIZED';
 return <Card><Text style={s.heading}>Razorpay test payment</Text><Text style={s.sub}>Test checkout opens in your browser. No real money is collected and this payment does not issue a flight ticket or reserve a hotel.</Text>{!!error&&<Notice kind="error" text={error}/>}{verified?<Notice kind="success" text={payment.status==='TEST_PAID'?'Test payment verified. No ticket was issued.':'Test payment authorized. Capture is pending in Razorpay. No ticket was issued.'}/>:<Button title={payment?'Reopen Razorpay test checkout':'Try Razorpay test payment'} secondary loading={busy} onPress={open}/>}</Card>;
}
