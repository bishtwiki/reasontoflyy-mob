import {Text} from './i18n';
import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Linking,Modal,Platform,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {api} from './api';
import {useApp} from './context';
import {C,Field,Icon,Notice,s} from './ui';
import {SelectField} from './SelectField';
import type {User} from '../shared/types';

const callingCodes=[{value:'+91',countryCode:'IN',label:'+91 India'},{value:'+1',countryCode:'US',label:'+1 US / Canada'},{value:'+44',countryCode:'GB',label:'+44 United Kingdom'},{value:'+971',countryCode:'AE',label:'+971 UAE'},{value:'+61',countryCode:'AU',label:'+61 Australia'},{value:'+65',countryCode:'SG',label:'+65 Singapore'},{value:'+49',countryCode:'DE',label:'+49 Germany'},{value:'+33',countryCode:'FR',label:'+33 France'},{value:'+81',countryCode:'JP',label:'+81 Japan'},{value:'+86',countryCode:'CN',label:'+86 China'}];
type AuthMode='login'|'register'|'recover';

export function AuthDialog(){
 const{authOpen,authRequired,startupReady,closeAuth,authenticated}=useApp();
 const{height}=useWindowDimensions();
 const[mode,setMode]=useState<AuthMode>('login');
 const[first,setFirst]=useState('');const[last,setLast]=useState('');const[identifier,setIdentifier]=useState('');const[email,setEmail]=useState('');const[phone,setPhone]=useState('');const[code,setCode]=useState('+91');const[password,setPassword]=useState('');
 const[show,setShow]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[errors,setErrors]=useState<Record<string,string>>({});
 const sending=useRef(false);const formScroll=useRef<ScrollView>(null);

 useEffect(()=>{if(!authOpen){setPassword('');setShow(false);setError('');setErrors({});setMode('login');}},[authOpen]);
 useEffect(()=>{formScroll.current?.scrollTo({y:0,animated:false});},[mode,authOpen]);
 const checks=[{label:'10–26 characters',ok:password.length>=10&&password.length<=26},{label:'Uppercase',ok:/[A-Z]/.test(password)},{label:'Lowercase',ok:/[a-z]/.test(password)},{label:'Number',ok:/\d/.test(password)},{label:'Symbol',ok:/[^\w\s]/.test(password)}];

 function switchMode(next:AuthMode){setMode(next);setErrors({});setError('');setPassword('');setShow(false);}
 async function submit(){
  if(sending.current||mode==='recover')return;
  const fields:Record<string,string>={};const register=mode==='register';const mobile=phone.trim().startsWith('+')?phone.replace(/[\s()-]/g,''):code+phone.replace(/[\s()-]/g,'');
  if(register){if(first.trim().length<2)fields.first='Enter your first name.';if(!/^\+?[1-9]\d{7,14}$/.test(mobile))fields.phone='Enter a valid mobile number.';if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))fields.email='Enter a valid email address.';if(!checks.every(check=>check.ok))fields.password='Use 10–26 characters with uppercase, lowercase, a number and a symbol.';}
  else{if(!identifier.trim())fields.identifier='Enter your email address or mobile number.';if(!password)fields.password='Enter your password.';}
  setErrors(fields);setError('');if(Object.keys(fields).length)return;
  sending.current=true;setBusy(true);
  try{const result=await api<{user:User;token:string}>(register?'/auth/register':'/auth/login',register?{name:[first.trim(),last.trim()].filter(Boolean).join(' '),email:email.trim(),phone:mobile,password}:{email:identifier.trim(),password});await authenticated(result.user,result.token);setPassword('');}
  catch(e:any){setError(e.message);}finally{sending.current=false;setBusy(false);}
 }
 async function contactSupport(url:string){try{await Linking.openURL(url);}catch{setError('Could not open your phone or email app. Please contact ReasonToFlyy support directly.');}}

 const passwordField=<View style={{gap:6}}><Text style={s.label}>PASSWORD{mode==='register'?' *':''}</Text><View style={{position:'relative'}}><Field accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry={!show} placeholder={mode==='register'?'Create a password':'Password'} autoCapitalize="none" maxLength={mode==='register'?26:128} error={errors.password} style={{paddingRight:54}}/><Pressable accessibilityRole="button" accessibilityLabel={show?'Hide password':'Show password'} accessibilityState={{selected:show}} onPress={()=>setShow(value=>!value)} hitSlop={10} style={{position:'absolute',right:13,top:0,bottom:0,justifyContent:'center',alignItems:'center',width:32}}><Icon name={show?'eye-outline':'eye-off-outline'} size={21} color={C.muted}/></Pressable></View></View>;

 return <Modal visible={authOpen&&startupReady} transparent animationType="slide" onRequestClose={closeAuth} statusBarTranslucent>
  <View style={{flex:1,backgroundColor:'#0008'}}>
   <Pressable accessibilityLabel="Close sign in dialog" onPress={closeAuth} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}/>
   <KeyboardAvoidingView pointerEvents="box-none" style={{flex:1,width:'100%',justifyContent:'flex-end',alignItems:'center'}} behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined} keyboardVerticalOffset={0}>
    <View style={{width:'100%',maxWidth:620,maxHeight:height*.94,backgroundColor:'white',borderTopLeftRadius:24,borderTopRightRadius:24,overflow:'hidden',borderTopWidth:3,borderTopColor:C.primary}}>
     {!authRequired&&<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={closeAuth} style={{position:'absolute',right:13,top:12,zIndex:2,padding:7,borderRadius:20,backgroundColor:'#f6f5f2'}}><Icon name="close" size={20}/></Pressable>}
     <ScrollView ref={formScroll} keyboardShouldPersistTaps="always" keyboardDismissMode={Platform.OS==='ios'?'interactive':'on-drag'} automaticallyAdjustKeyboardInsets={Platform.OS==='ios'} contentContainerStyle={{paddingHorizontal:22,paddingTop:24,paddingBottom:30,gap:16}}>
      <View style={{gap:5,paddingRight:38}}><Text style={{fontSize:24,lineHeight:31,fontWeight:'700',color:C.navy}}>{mode==='login'?'Welcome back':mode==='register'?'Create your account':'Sign-in help'}</Text><Text style={{fontSize:13,lineHeight:19,color:C.muted}}>{mode==='login'?'Sign in to continue with your trip.':mode==='register'?'Create your ReasonToFlyy account.':'Get help accessing your ReasonToFlyy account.'}</Text></View>

      <View accessibilityRole="tablist" style={{flexDirection:'row',padding:4,backgroundColor:'#f4f2ee',borderRadius:12,gap:5}}>
       <Pressable accessibilityRole="tab" accessibilityState={{selected:mode!=='register'}} onPress={()=>switchMode('login')} style={{flex:1,minHeight:42,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:mode!=='register'?'white':'transparent',borderWidth:mode!=='register'?1:0,borderColor:C.line}}><Text style={{fontSize:13,fontWeight:mode!=='register'?'700':'600',color:mode!=='register'?C.navy:C.muted}}>Sign in</Text></Pressable>
       <Pressable accessibilityRole="tab" accessibilityState={{selected:mode==='register'}} onPress={()=>switchMode('register')} style={{flex:1,minHeight:42,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:mode==='register'?'white':'transparent',borderWidth:mode==='register'?1:0,borderColor:C.line}}><Text style={{fontSize:13,fontWeight:mode==='register'?'700':'600',color:mode==='register'?C.navy:C.muted}}>Create account</Text></Pressable>
      </View>

      {mode==='recover'?<View style={{gap:14}}>
       <View style={{padding:15,borderRadius:14,backgroundColor:C.pale,borderWidth:1,borderColor:C.line,gap:7}}><Text style={{fontSize:15,fontWeight:'700',color:C.navy}}>Forgot your email, mobile number, or password?</Text><Text style={{fontSize:13,lineHeight:19,color:C.muted}}>Contact ReasonToFlyy support and they can help you recover access. For your security, the app does not send password-reset links or ask you to share your password here.</Text></View>
       <Pressable accessibilityRole="button" onPress={()=>void contactSupport('tel:+918285587107')} style={{minHeight:48,borderRadius:11,borderWidth:1,borderColor:C.line,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:11}}><Icon name="call-outline" size={20} color={C.ink}/><View style={{flex:1}}><Text style={{fontSize:11,color:C.muted}}>Call support</Text><Text style={{fontSize:14,fontWeight:'700',color:C.navy}}>+91 82855 87107</Text></View><Icon name="arrow-forward" size={18} color={C.ink}/></Pressable>
       <Pressable accessibilityRole="button" onPress={()=>void contactSupport('mailto:hello@reasontoflyy.com?subject=Help%20with%20my%20ReasonToFlyy%20account')} style={{minHeight:48,borderRadius:11,borderWidth:1,borderColor:C.line,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:11}}><Icon name="mail-outline" size={20} color={C.ink}/><View style={{flex:1}}><Text style={{fontSize:11,color:C.muted}}>Email support</Text><Text style={{fontSize:14,fontWeight:'700',color:C.navy}}>hello@reasontoflyy.com</Text></View><Icon name="arrow-forward" size={18} color={C.ink}/></Pressable>
       <Pressable accessibilityRole="button" onPress={()=>switchMode('login')} style={{alignSelf:'center',paddingVertical:5}}><Text style={{fontSize:13,fontWeight:'700',color:C.ink}}>Back to sign in</Text></Pressable>
      </View>:mode==='register'?<>
       <Field label="FIRST NAME *" placeholder="First name" value={first} onChangeText={setFirst} autoCapitalize="words" maxLength={40} error={errors.first}/>
       <Field label="LAST NAME" placeholder="Last name" value={last} onChangeText={setLast} autoCapitalize="words" maxLength={39}/>
       <Field label="EMAIL ADDRESS (OPTIONAL)" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={160} error={errors.email}/>
       <View style={{gap:6}}><Text style={s.label}>MOBILE NUMBER *</Text><View style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}><View style={{width:95}}><SelectField label="Country code" showFlags hideLabel displayValue={code} value={code} options={callingCodes} onChange={setCode} searchable/></View><Field accessibilityLabel="Mobile number" placeholder="98765 43210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={18} error={errors.phone}/></View></View>
       {passwordField}<Text style={{fontSize:10,lineHeight:16,color:C.muted}}>10–26 characters · uppercase · lowercase · number · symbol</Text>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{checks.map(check=><Text key={check.label} style={{fontSize:9,color:check.ok?C.green:C.muted,backgroundColor:check.ok?'#edf7f2':'#f3f4f6',paddingHorizontal:8,paddingVertical:5,borderRadius:12}}>{check.ok?'✓ ':''}{check.label}</Text>)}</View>
      </>:<>
       <Field label="EMAIL OR MOBILE NUMBER" placeholder="Email or mobile number" value={identifier} onChangeText={setIdentifier} keyboardType="email-address" autoCapitalize="none" maxLength={160} error={errors.identifier}/>
       {passwordField}
       <Pressable accessibilityRole="button" onPress={()=>switchMode('recover')} style={{alignSelf:'flex-end',paddingVertical:2}}><Text style={{fontSize:12,fontWeight:'700',color:C.ink}}>Forgot email or password?</Text></Pressable>
      </>}

      {!!error&&<Notice kind="error" text={error}/>}
      {mode!=='recover'&&<Pressable accessibilityRole="button" accessibilityLabel={mode==='register'?'Create account':'Sign in'} disabled={busy} onPress={()=>void submit()} style={{backgroundColor:C.primary,minHeight:50,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,opacity:busy?.6:1}}>{busy?<ActivityIndicator color={C.primaryText}/>:<><Text style={{fontSize:15,fontWeight:'700',color:C.primaryText}}>{mode==='register'?'Create account':'Sign in'}</Text><Icon name="arrow-forward" size={18} color={C.primaryText}/></>}</Pressable>}
     </ScrollView>
    </View>
   </KeyboardAvoidingView>
  </View>
 </Modal>;
}
