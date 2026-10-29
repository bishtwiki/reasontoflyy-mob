import {Text} from './i18n';
import React,{useEffect,useState} from 'react';
import {AppState,Linking,Text as NativeText} from 'react-native';
import {api} from './api';
import {Button,Card,Notice,s} from './ui';
interface Payment {id:string;status:'CREATED'|'PENDING'|'PAID'|'FAILED';checkoutUrl?:string;expiresAt:number}
export function PayUCheckout({quoteId,firstName,email,phone,enabled}:{quoteId:string;firstName:string;email:string;phone:string;enabled:boolean}){
 const [payment,setPayment]=useState<Payment|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{setPayment(null);setError('');},[quoteId]);
 useEffect(()=>{
  if(!payment||!['CREATED','PENDING'].includes(payment.status))return;
  let disposed=false;
  const refresh=async()=>{try{const p=await api<Payment>(`/payments/${payment.id}/status`);if(!disposed)setPayment(old=>old?{...old,...p}:old);}catch{/* Status can be checked again when the app resumes. */}};
  const timer=setInterval(()=>{if(Date.now()<payment.expiresAt)void refresh();else clearInterval(timer);},5000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{disposed=true;clearInterval(timer);listener.remove();};
 },[payment?.id,payment?.status]);
 async function open(){
  if(!enabled||busy)return;
  setBusy(true);setError('');
  try{const p=await api<Payment>('/payments/orders',{quoteId,firstName,email,phone});setPayment(p);if(p.status==='CREATED'&&p.checkoutUrl)await Linking.openURL(p.checkoutUrl);}
  catch(e:any){setError(e.message);}
  finally{setBusy(false);}
 }
 if(payment?.status==='PAID')return <Card><Text style={s.heading}>PayU payment verified</Text><Text style={s.sub}>PayU confirmed the payment. Check the app for your booking status.</Text></Card>;
 return <Card><Text style={s.heading}>Pay securely with PayU</Text><Text style={s.sub}>Your payment opens on PayU’s secure checkout page.</Text>{!enabled&&<Notice text="PayU checkout is connected but paused until TripJack production booking can be confirmed. No payment will be taken."/>}{!!error&&<Notice kind="error" text={error}/>}<Button title={payment?'Continue to PayU':'Continue to secure payment'} secondary loading={busy} disabled={!enabled} onPress={open}/></Card>;
}
