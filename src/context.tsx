import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import { BackHandler,Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api,tokenStore } from './api';
import type { Capabilities,Mode,User } from '../shared/types';
export type Screen={name:string;params?:any};
type AppContextValue={screen:Screen;go:(name:string,params?:any)=>void;back:()=>void;tab:(name:string,params?:any)=>void;mode:Mode;setMode:(m:Mode)=>void;user:User|null;setUser:(u:User|null)=>void;capabilities:Capabilities|null;notify:(message:string)=>void;toast:string;requireAuth:(fn?:()=>void)=>void;authOpen:boolean;authRequired:boolean;startupReady:boolean;finishStartup:()=>void;closeAuth:()=>void;authenticated:(u:User,token:string)=>Promise<void>;logout:()=>Promise<void>};
const AppContext=createContext<AppContextValue>(null!);
export const useApp=()=>useContext(AppContext);
export function AppProvider({children}:{children:React.ReactNode}){
 const [stack,setStack]=useState<Screen[]>([{name:'home'}]);const [mode,setModeState]=useState<Mode>('tripjack');const [user,setUser]=useState<User|null>(null);const [capabilities,setCapabilities]=useState<Capabilities|null>(null);const [toast,setToast]=useState('');const [authRequired,setAuthRequired]=useState(true);const [authOpen,setAuthOpen]=useState(true);const [startupReady,setStartupReady]=useState(false);const pending=useRef<(()=>void)|undefined>(undefined);
 const go=(name:string,params?:any)=>setStack(s=>[...s,{name,params}]);const back=()=>setStack(s=>s.length>1?s.slice(0,-1):[{name:'home'}]);const tab=(name:string,params?:any)=>setStack([{name,params}]);
 const setMode=(m:Mode)=>{setModeState(m);void AsyncStorage.setItem('travel-mode',m);};
 useEffect(()=>{void (async()=>{try{const m=await AsyncStorage.getItem('travel-mode');if(m==='demo')setModeState('demo');const t=await tokenStore.get();if(t){try{setUser(await api('/me'));setAuthRequired(false);setAuthOpen(false);}catch{await tokenStore.set('');setAuthRequired(true);setAuthOpen(true);}}else{setAuthRequired(true);setAuthOpen(true);}}catch{setAuthRequired(true);setAuthOpen(true); /* Device storage can be unavailable in private browsing. */ }})();void api<Capabilities>('/capabilities').then(setCapabilities).catch(()=>{});},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{if(Platform.OS==='web')return;const s=BackHandler.addEventListener('hardwareBackPress',()=>{if(authOpen){if(!authRequired)setAuthOpen(false);return true;}if(stack.length>1){back();return true;}return false;});return()=>s.remove();},[stack,authOpen,authRequired]);
 const requireAuth=(fn?:()=>void)=>{if(user){fn?.();return;}pending.current=fn;setAuthOpen(true);};
 const authenticated=async(u:User,t:string)=>{await tokenStore.set(t);setUser(u);setAuthRequired(false);setAuthOpen(false);pending.current?.();pending.current=undefined;};
 const logout=async()=>{try{await api('/auth/logout',{});}catch{}await tokenStore.set('');setUser(null);setAuthRequired(true);setAuthOpen(true);tab('home');};
 const closeAuth=()=>{if(!authRequired)setAuthOpen(false);};
 const finishStartup=useCallback(()=>setStartupReady(true),[]);
 return <AppContext.Provider value={{screen:stack[stack.length-1],go,back,tab,mode,setMode,user,setUser,capabilities,toast,notify:setToast,requireAuth,authOpen,authRequired,startupReady,finishStartup,closeAuth,authenticated,logout}}>{children}</AppContext.Provider>;
}
