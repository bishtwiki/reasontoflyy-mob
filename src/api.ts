import {beginSearch} from './searchActivity';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const BASE=process.env.EXPO_PUBLIC_API_URL||'http://localhost:4000/api';
let token='';
export class ApiError extends Error {constructor(message:string,public code:string,public details?:any){super(message);}}
export const tokenStore={
 async get(){return Platform.OS==='web'?globalThis.sessionStorage?.getItem('travel-session')||'':await SecureStore.getItemAsync('travel-session')||'';},
 async set(value:string){token=value;if(Platform.OS==='web'){if(value)globalThis.sessionStorage?.setItem('travel-session',value);else globalThis.sessionStorage?.removeItem('travel-session');}else if(value)await SecureStore.setItemAsync('travel-session',value);else await SecureStore.deleteItemAsync('travel-session');},
};
export async function api<T=any>(path:string,body?:unknown,method?:string):Promise<T>{
 const finishSearch=beginSearch(path);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
 try{const r=await fetch(BASE+path,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});let data:any;try{data=await r.json();}catch{throw new ApiError('The server returned an unexpected response.','INVALID_RESPONSE');}if(!r.ok)throw new ApiError(data.error?.message||'The request could not be completed.',data.error?.code||'REQUEST_FAILED',data.error?.details);return data;}
 catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Cannot reach the booking server. Make sure the API is running. On a phone, set the API URL to your computer’s network address.','NETWORK_ERROR');}finally{clearTimeout(timer);finishSearch();}
}
