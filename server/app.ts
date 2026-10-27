import {insuranceQuery,searchInsurance} from './insurance';
import {rtfCancellationFee,RTF_FEE_PER_PASSENGER_PER_SECTOR_INR} from '../shared/fareRulePresentation';
import {calendarFares} from './calendarFares';
import {lookupAirports} from './airportLookup';
import {homepage} from './homepage';
import compression from 'compression';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config } from './config';
import {Razorpay,registerPayments} from './payments';
import { Store } from './store';
import { TripJack, type Vendor } from './tripjack';
import { Travel, type QuoteState } from './travel';
import { AppError } from './errors';
import { flightQuery,hotelQuery,traveller,bookingInput } from './validation';
import { airports,services } from '../shared/catalog';
import type { Booking,User,Quote,Capabilities } from '../shared/types';

type Authed=Request & {user:User;tokenHash:string};
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const publicUser=(r:any):User=>({id:r.id,name:r.name,email:r.email.startsWith('mobile:')?'':r.email,phone:r.phone});
const asyncRoute=(fn:(req:any,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};
async function referenceFlightPost(path:'ssr'|'seat-map',payload:Record<string,string>){
 const response=await fetch(`https://reasontoflyy.com/api/b2c/flight/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 let body:any;try{body=await response.json();}catch{body={};}
 const apiError=body?.error||body?.data?.error||body?.message||body?.data?.message||body?.status?.message;
 const errorCode=body?.code||body?.errorCode||body?.data?.code||body?.status?.code;
 return {ok:response.ok&&body?.ok!==false&&body?.success!==false&&body?.status?.success!==false,body,status:response.status,error:typeof apiError==='string'?apiError:undefined,code:typeof errorCode==='string'?errorCode:undefined};
}
function supplierTrace(value:unknown):string|number|undefined{
 const wanted=new Set(['traceid','trace_id','trace','searchid','search_id']);const queue:unknown[]=[value];const seen=new Set<object>();
 while(queue.length){const current=queue.shift();if(!current||typeof current!=='object'||seen.has(current as object))continue;seen.add(current as object);
  for(const [key,item] of Object.entries(current as Record<string,unknown>)){
   if(wanted.has(key.toLowerCase())&&(typeof item==='string'||typeof item==='number')&&String(item).trim())return item;
   if(item&&typeof item==='object')queue.push(item);
  }
 }
 return undefined;
}
export function createApp(store=new Store(config.database),provider=new TripJack(),paymentGateway=new Razorpay()){
 const app=express();const travel=new Travel(store,provider);
 app.disable('x-powered-by');app.use(helmet());app.use(compression());
 app.use(cors({origin(origin,done){if(!origin||config.origins.includes(origin))done(null,true);else done(new AppError(403,'ORIGIN_BLOCKED','This website is not allowed to access the API.'));}}));
 app.use(express.json({limit:'100kb'}));
 app.use('/api',rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false}));
 const auth=(req:Request,res:Response,next:NextFunction)=>{
  const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token)return next(new AppError(401,'LOGIN_REQUIRED','Sign in to continue.'));
  const hash=sha(token);const row=store.db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash,Date.now());
  if(!row)return next(new AppError(401,'SESSION_EXPIRED','Your session has expired. Please sign in again.'));
  (req as Authed).user=publicUser(row);(req as Authed).tokenHash=hash;next();
 };
 registerPayments(app,store,auth,paymentGateway);
 const authenticate=(user:User,res:Response)=>{const token=randomBytes(32).toString('hex');store.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(sha(token),user.id,Date.now()+7*86400000);res.json({user,token});};
 const authLimiter=rateLimit({windowMs:15*60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});
 app.get('/api/homepage',asyncRoute(async(_req,res)=>{try{res.json(await homepage());}catch{res.status(503).json({error:{code:'HOMEPAGE_UNAVAILABLE',message:'Homepage content is temporarily unavailable. Please retry.'}});}}));
 app.get('/api/health',(_req,res)=>res.json({ok:true,provider:'TripJack',environment:config.environment}));
 app.get('/api/capabilities',(_req,res)=>res.json({provider:'TripJack',environment:config.environment,configured:!!config.key,bookingEnabled:config.allowBookings&&config.environment==='sandbox',livePayments:false,testPayments:config.razorpayKeyId.startsWith('rzp_test_')&&!!config.razorpaySecret,services:services.map(s=>({id:s.id,supported:['flights','hotels'].includes(s.id),note:['flights','hotels'].includes(s.id)?'TripJack integration; account access and UAT required.':s.id==='insurance'?'Insurance quotes use the ReasonToFlyy TripSafe service; policy issuance is not connected.':'No verified TripJack booking contract configured. Travel enquiries can be saved.'}))} satisfies Capabilities));
 app.get('/api/airports',asyncRoute(async(req,res)=>res.json(await lookupAirports(String(req.query.q||'')))));
 app.post('/api/auth/register',authLimiter,(req,res,next)=>{try{
  const input=z.object({name:z.string().trim().min(2).max(80),email:z.email().max(160).or(z.literal('')).default(''),marketingOptIn:z.boolean().optional(),password:z.string().min(10).max(128),phone:z.string().regex(/^\+?[1-9]\d{7,14}$/).or(z.literal('')).default('')}).parse(req.body);
  const normalizedPhone=input.phone?('+'+input.phone.replace(/\D/g,'')):'';if(!input.email&&!normalizedPhone)throw new AppError(400,'CONTACT_REQUIRED','Enter a mobile number or email address.');const email=input.email.toLowerCase()||`mobile:${normalizedPhone}`;if(store.db.prepare('SELECT id FROM users WHERE email=?').get(email)||(normalizedPhone&&store.db.prepare('SELECT id FROM users WHERE phone=?').get(normalizedPhone)))throw new AppError(409,'ACCOUNT_EXISTS','An account already exists for this email or mobile number. Please sign in.');
  const user={id:randomUUID(),email,name:input.name,phone:normalizedPhone};const salt=randomBytes(16).toString('hex');const hash=scryptSync(input.password,salt,64).toString('hex');
  store.db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(user.id,email,user.name,user.phone,hash,salt);store.put('preferences',user.id,user.id,{notifications:input.marketingOptIn??false,marketingOptIn:input.marketingOptIn??false,currency:'INR'});authenticate(publicUser(user),res);
 }catch(e){next(e);}});
 app.post('/api/auth/login',authLimiter,(req,res,next)=>{try{
  const input=z.object({email:z.string().trim().min(1).max(160),password:z.string().min(1).max(128)}).parse(req.body);const identifier=input.email.toLowerCase();const digits=identifier.replace(/\D/g,'');const phone='+'+(digits.length===10?'91'+digits:digits);const row=(identifier.includes('@')?store.db.prepare('SELECT * FROM users WHERE email=?').get(identifier):/^[+\d\s()-]+$/.test(identifier)?store.db.prepare('SELECT * FROM users WHERE phone IN (?,?,?)').get(phone,digits,identifier):undefined) as any;
  const actual=scryptSync(input.password,row?.salt||'non-existent-account',64);if(!row||!timingSafeEqual(actual,Buffer.from(row.hash,'hex')))throw new AppError(401,'INVALID_LOGIN','These credentials were not recognised by this app. ReasonToFlyy website accounts are not connected yet.');authenticate(publicUser(row),res);
 }catch(e){next(e);}});
 app.post('/api/auth/logout',auth,(req,res)=>{store.db.prepare('DELETE FROM sessions WHERE token=?').run((req as Authed).tokenHash);res.json({ok:true});});
 app.get('/api/me',auth,(req,res)=>res.json((req as Authed).user));
 app.patch('/api/me',auth,(req,res,next)=>{try{const p=z.object({name:z.string().trim().min(2).max(80),phone:z.string().regex(/^\+?[1-9]\d{7,14}$/).or(z.literal(''))}).parse(req.body);const u=(req as Authed).user;store.db.prepare('UPDATE users SET name=?,phone=? WHERE id=?').run(p.name,p.phone,u.id);res.json({...u,...p});}catch(e){next(e);}});
 app.get('/api/travellers',auth,(req,res)=>res.json(store.list('traveller',(req as Authed).user.id)));
 app.post('/api/travellers',auth,(req,res,next)=>{try{const t=traveller.parse(req.body);const id=randomUUID();store.put('traveller',id,(req as Authed).user.id,{...t,id});res.status(201).json({...t,id});}catch(e){next(e);}});
 app.delete('/api/travellers/:id',auth,(req,res)=>{store.remove('traveller',String(req.params.id),(req as Authed).user.id);res.json({ok:true});});
 app.get('/api/preferences',auth,(req,res)=>res.json(store.get('preferences',(req as Authed).user.id)||{notifications:true,currency:'INR'}));
 app.put('/api/preferences',auth,(req,res,next)=>{try{const p=z.object({notifications:z.boolean(),currency:z.literal('INR')}).parse(req.body);const preferences={...(store.get('preferences',(req as Authed).user.id,(req as Authed).user.id)||{}),...p};store.put('preferences',(req as Authed).user.id,(req as Authed).user.id,preferences);res.json(preferences);}catch(e){next(e);}});
 app.get('/api/wishlist',auth,(req,res)=>res.json(store.list('wishlist',(req as Authed).user.id)));
 app.post('/api/wishlist',auth,(req,res,next)=>{try{const p=z.object({name:z.string().min(1).max(100),image:z.url().max(500),code:z.string().max(10)}).parse(req.body);const id=sha((req as Authed).user.id+p.name);store.put('wishlist',id,(req as Authed).user.id,{id,...p});res.json({id,...p});}catch(e){next(e);}});
 app.delete('/api/wishlist/:id',auth,(req,res)=>{store.remove('wishlist',String(req.params.id),(req as Authed).user.id);res.json({ok:true});});
 app.get('/api/flights/calendar-fares',asyncRoute(async(req,res)=>{const input=z.object({from:z.string().regex(/^[A-Z]{3}$/),to:z.string().regex(/^[A-Z]{3}$/),month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)}).refine(v=>v.from!==v.to,'Choose different airports').parse(req.query);res.json(await calendarFares(input.from,input.to,input.month));}));
 app.post('/api/flights/search',asyncRoute(async(req,res)=>{const timing:{supplierMs?:number;processingMs?:number}={};const result=await travel.flights(flightQuery.parse(req.body),timing);res.set('Server-Timing',`supplier;dur=${timing.supplierMs||0}, processing;dur=${timing.processingMs||0}`).json(result);}));
 app.post('/api/flights/rules',asyncRoute(async(req,res)=>{const p=z.object({searchId:z.string().uuid(),flightId:z.string().uuid()}).parse(req.body);res.json(await travel.fareRules(p.searchId,p.flightId));}));
 app.get('/api/hotels/nationalities',asyncRoute(async(_req,res)=>res.json(await travel.nationalities())));
 app.get('/api/hotels/places',asyncRoute(async(req,res)=>{const q=z.object({q:z.string().trim().min(3).max(160),city:z.string().trim().min(2).max(120)}).parse(req.query);res.json({places:await travel.nearby.places(q.q,q.city)});}));
 app.post('/api/hotels/nearby',asyncRoute(async(req,res)=>{const q=z.object({regionId:z.string().regex(/^\d+$/),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),minStars:z.number().int().min(0).max(5).default(0)}).parse(req.body);res.json({hotels:await travel.nearby.nearby(q.regionId,q,q.minStars)});}));
 app.get('/api/hotels/regions',asyncRoute(async(req,res)=>res.json(await travel.regions(String(req.query.q||'').slice(0,100),typeof req.query.cursor==='string'?req.query.cursor:undefined))));
 app.post('/api/hotels/search',asyncRoute(async(req,res)=>res.json(await travel.hotels(hotelQuery.parse(req.body)))));
 app.post('/api/hotels/detail',asyncRoute(async(req,res)=>{const p=z.object({searchId:z.string().uuid(),hotelId:z.string().min(1).max(100)}).parse(req.body);res.json(await travel.hotelDetail(p.searchId,p.hotelId));}));
 app.post('/api/flights/preview',rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false}),asyncRoute(async(req:Request,res)=>{
  const input=z.object({searchId:z.string().uuid(),flightIds:z.array(z.string().uuid()).min(1).max(6)}).strict().parse(req.body);
  if(travel.search(input.searchId).type!=='flights')throw new AppError(400,'FLIGHT_REVIEW_REQUIRED','Choose a flight to review.');
  const owner=`preview:${randomUUID()}`;const reviewed=await travel.review(owner,input);
  store.remove('quote',reviewed.id,owner);
  const {providerBookingId,...quote}=reviewed;
  res.setHeader('Cache-Control','no-store');res.json({...quote,preview:true});
 }));
 app.post('/api/review',auth,asyncRoute(async(req:Authed,res)=>{const p=z.object({searchId:z.string().uuid(),flightIds:z.array(z.string().uuid()).max(6).optional(),hotelId:z.string().max(100).optional(),optionId:z.string().max(200).optional()}).parse(req.body);res.json(await travel.review(req.user.id,p));}));
 app.get('/api/quotes/:id/seats',auth,asyncRoute(async(req:Authed,res)=>{
  const qs=store.get<QuoteState>('quote',String(req.params.id),req.user.id);
  if(!qs)throw new AppError(410,'QUOTE_EXPIRED','Please select your flight again.');
  if(qs.quote.mode==='demo')return res.json({available:false,message:'Seat selection is not available for demo flights.'});
  const search=travel.search(qs.searchId);const rawSearch=search.raw||{};const trace=supplierTrace(rawSearch)||supplierTrace(qs.raw);
  // Use the fare records captured in the reviewed quote. Re-resolving them from
  // the search groups can fail after a refresh even though this quote is valid.
  const selected=qs.quote.flights||[];
  if(typeof trace!=='string'&&typeof trace!=='number'||!selected.length)return res.json({available:false,message:'This fare does not have a ReasonToFlyy seat-map reference. Search again and select a current fare.'});
  const seatMaps:any[]=[];const ssrData:any[]=[];
  for(const flight of selected){
   const resultIndex=flight.resultIndex||flight.priceId;
   if(typeof resultIndex!=='string'&&typeof resultIndex!=='number')return res.json({available:false,message:'The selected fare is missing its seat-map result index. Search again and select a current fare.'});
   const request={TraceId:String(trace),ResultIndex:String(resultIndex)};
   const ssr=await referenceFlightPost('ssr',request);ssrData.push(ssr.body);
   if(!ssr.ok)return res.json({available:false,message:ssr.error||'The airline has not provided additional-service details for this fare.',code:ssr.code});
   const map=await referenceFlightPost('seat-map',request);
   if(!map.ok)return res.json({available:false,message:map.error||'Seat selection is not available for this fare.',code:map.code});
   const singleSegment=flight.segments?.length===1?flight.segments[0]:undefined;
   seatMaps.push({segmentId:singleSegment?.id,flightNumber:singleSegment?.number,from:singleSegment?.from,to:singleSegment?.to,data:map.body});
  }
  res.setHeader('Cache-Control','no-store');res.json({available:true,ssr:ssrData,data:seatMaps});
 }));
 app.get('/api/quotes/:id/services',auth,asyncRoute(async(req:Authed,res)=>{
  const qs=store.get<QuoteState>('quote',String(req.params.id),req.user.id);
  if(!qs)throw new AppError(410,'QUOTE_EXPIRED','Please select your flight again.');
  if(qs.quote.mode==='demo')return res.json({available:false,message:'Optional baggage and meal services are not available for demo flights.'});
  const search=travel.search(qs.searchId);const raw=search.raw||{};const trace=supplierTrace(raw)||supplierTrace(qs.raw);
  const flights=qs.quote.flights||[];
  if((typeof trace!=='string'&&typeof trace!=='number')||!flights.length)return res.json({available:false,message:'The selected fare does not have a current ancillary-services reference. Search again and choose a current fare.'});
  const data:any[]=[];
  for(const flight of flights){
   const resultIndex=flight.resultIndex||flight.priceId;
   const response=await referenceFlightPost('ssr',{TraceId:String(trace),ResultIndex:String(resultIndex)});
   if(!response.ok)return res.json({available:false,message:response.error||'The airline has not returned baggage and meal options for this fare.',code:response.code});
   data.push({flightId:flight.id,segments:flight.segments,ssr:response.body});
  }
  res.setHeader('Cache-Control','no-store');res.json({available:true,data});
 }));
 app.post('/api/bookings',auth,asyncRoute(async(req:Authed,res)=>{
  const input=bookingInput.parse(req.body);const owner=req.user.id;
  const prior=store.db.prepare('SELECT * FROM idempotency WHERE owner=? AND key=?').get(owner,input.idempotencyKey) as any;
  if(prior){if(prior.quote_id!==input.quoteId)throw new AppError(409,'IDEMPOTENCY_CONFLICT','This request identifier belongs to another booking.');return res.json(store.get('booking',prior.booking_id,owner));}
  let qs=store.get<QuoteState>('quote',input.quoteId,owner);if(!qs)throw new AppError(410,'QUOTE_EXPIRED','The fare review expired. Please select your journey again.');
  const original=qs.quote;
  if(original.travellers.length!==input.travellers.length||original.travellers.some((t,i)=>t.type!==input.travellers[i].type))throw new AppError(400,'TRAVELLER_COUNT','Traveller details must match the search.');
  if(original.panRequired&&!input.travellers[0].pan)throw new AppError(400,'PAN_REQUIRED','PAN details are required for this booking.');
  for(const t of input.travellers){
   if(t.type!=='ADULT'&&!t.dob)throw new AppError(400,'DOB_REQUIRED','Date of birth is required for children and infants.');
   if(t.dob&&t.dob>new Date().toISOString().slice(0,10))throw new AppError(400,'DOB_INVALID','Date of birth cannot be in the future.');
   if(t.passportIssue&&(t.passportIssue>new Date().toISOString().slice(0,10)||(t.passportExpiry&&t.passportIssue>=t.passportExpiry)))throw new AppError(400,'PASSPORT_ISSUE_INVALID','Passport issue date must be in the past and before expiry.');
   if(original.passportRequired&&(!t.passport||!t.passportExpiry||!t.nationality))throw new AppError(400,'PASSPORT_REQUIRED','Passport number, expiry and nationality are required for each traveller.');
  }
  if(original.mode==='tripjack'){
   if(config.environment==='production')throw new AppError(503,'PAYMENT_NOT_CONFIGURED','Live booking requires a verified payment gateway and TripJack production certification. No funds have been collected.');
   if(!config.allowBookings)throw new AppError(503,'BOOKING_NOT_ENABLED','Supplier booking is not enabled for this installation. Complete TripJack sandbox access and UAT setup first.');
  }
  const locked=store.db.prepare('SELECT booking_id FROM booking_locks WHERE quote_id=?').get(input.quoteId) as any;
  if(locked)return res.json(store.get('booking',locked.booking_id,owner));
  const id=randomUUID();
  store.db.exec('BEGIN IMMEDIATE');try{store.db.prepare('INSERT INTO booking_locks VALUES (?,?)').run(input.quoteId,id);store.db.prepare('INSERT INTO idempotency VALUES (?,?,?,?)').run(owner,input.idempotencyKey,id,input.quoteId);store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
  const search=travel.search(qs.searchId);const departureDate=search.type==='flights'?(search.query as any).routes[0].date:(search.query as any).checkIn;
  let booking:Booking={id,providerBookingId:original.providerBookingId,service:original.service,mode:original.mode,status:'VALIDATING',title:original.title,subtitle:original.subtitle,amount:original.amount,currency:original.currency,createdAt:Date.now(),departureDate,travellers:input.travellers,contact:input.contact,quote:original};store.put('booking',id,owner,booking);
  if(original.mode==='demo'){booking.status='DEMO_CONFIRMED';store.put('booking',id,owner,booking);return res.status(201).json(booking);}
  let submitted=false;
  try{
   const revised=await travel.review(owner,qs,input.quoteId);qs=store.get<QuoteState>('quote',input.quoteId,owner)!;
   if(Math.abs(revised.amount-original.amount)>.009||revised.currency!==original.currency){booking.status='PRICE_CHANGED';booking.quote=revised;store.put('booking',id,owner,booking);store.db.prepare('DELETE FROM booking_locks WHERE quote_id=?').run(input.quoteId);throw new AppError(409,'PRICE_CHANGED','The supplier price changed. Review the updated total before continuing.',revised);}
   const people=input.travellers.map(t=>({ti:t.title,pt:t.type,fN:t.firstName,lN:t.lastName,...(t.dob?{dob:t.dob}:{}),...(t.passport?{pNum:t.passport,eD:t.passportExpiry,pNat:t.nationality}:{}),...(t.pan?{pan:t.pan}:{})}));
   const payload:Vendor={bookingId:revised.providerBookingId,deliveryInfo:{emails:[input.contact.email],contacts:[input.contact.phone]},paymentInfos:[{amount:revised.amount}],...(input.gst?{gstInfo:input.gst}:{} )};
   if(revised.service==='flights')payload.travellerInfo=people;
   else {payload.type='HOTEL';payload.deliveryInfo.code=['+91'];payload.roomTravellerInfo=(search.query as any).rooms.map((_r:any,i:number)=>({travellerInfo:people.filter((_p,j)=>revised.travellers[j].room===i)}));}
   booking={...booking,quote:revised,providerBookingId:revised.providerBookingId,status:'PENDING'};store.put('booking',id,owner,booking);
   submitted=true;
   const result=await provider.request(revised.service==='flights'?'flight':'hotelBooking',revised.service==='flights'?'/oms/v1/air/book':'/oms/v3/hotel/book',payload);
   if(result.bookingId)booking.providerBookingId=String(result.bookingId);
   // Acceptance is not ticketing confirmation. Only booking-details may confirm.
   store.put('booking',id,owner,booking);return res.status(202).json(booking);
  }catch(e){if(e instanceof AppError&&e.code==='PRICE_CHANGED')throw e;booking.status=submitted?'UNKNOWN':'FAILED';booking.lastError=e instanceof Error?e.message:'Booking status could not be determined.';store.put('booking',id,owner,booking);return res.status(202).json(booking);}
 }));
 app.get('/api/bookings',auth,(req,res)=>res.json(store.list('booking',(req as Authed).user.id)));
 const ownedBooking=(req:Authed)=>{const b=store.get<Booking>('booking',String(req.params.id),req.user.id);if(!b)throw new AppError(404,'BOOKING_NOT_FOUND','Booking not found.');return b;};
 app.get('/api/bookings/:id',auth,asyncRoute(async(req:Authed,res)=>{
  const b=ownedBooking(req);if(req.query.refresh==='true'&&b.mode==='tripjack'&&b.providerBookingId&&!['FAILED','PRICE_CHANGED'].includes(b.status)){
   const data=await provider.request(b.service==='flights'?'flight':'hotelBooking',b.service==='flights'?'/oms/v1/booking-details':'/oms/v3/hotel/booking-details',{bookingId:b.providerBookingId});
   if(data.order?.status)b.status=String(data.order.status);store.put('supplier-booking',b.id,req.user.id,data);store.put('booking',b.id,req.user.id,b);
  }res.json(b);
 }));
 app.post('/api/bookings/:id/cancellation-quote',auth,asyncRoute(async(req:Authed,res)=>{
  const b=ownedBooking(req);if(!['SUCCESS','CONFIRMED','DEMO_CONFIRMED'].includes(b.status))throw new AppError(409,'CANNOT_CANCEL','This booking is not in a cancellable state. Refresh the booking status first.');
  let charge=0,refund=b.amount,raw:Vendor={};let supplierCharge=0,rtfFee=0,passengerCount=0,sectorCount=0;
  if(b.mode==='tripjack'){
   if(b.service==='flights'){raw=await provider.request('flight','/oms/v1/air/amendment/amendment-charges',{bookingId:b.providerBookingId,type:'CANCELLATION',remarks:'Cancellation requested by traveller'});charge=Number(raw.amendmentCharges);refund=Number(raw.refundableAmount);if(!Number.isFinite(charge)||!Number.isFinite(refund))throw new AppError(502,'CANCELLATION_UNAVAILABLE','The supplier has not returned a cancellation quote.');}
   else{const slab=b.quote.option?.penalties.find(p=>Date.parse(p.from+'+05:30')<=Date.now()&&Date.parse(p.to+'+05:30')>Date.now());if(!slab)throw new AppError(409,'CANCELLATION_UNAVAILABLE','No current cancellation policy is available. Contact support.');charge=slab.amount;refund=Math.max(0,b.amount-charge);}
  }
  supplierCharge=charge;
  if(b.mode==='tripjack'&&b.service==='flights'){
   passengerCount=b.travellers.length;sectorCount=(b.quote.flights||[]).reduce((n,f)=>n+f.segments.length,0);
   if(!passengerCount||!sectorCount||b.currency!=='INR')throw new AppError(409,'CANCELLATION_UNAVAILABLE','Contact support to confirm the RTF fee for this booking.');
   rtfFee=rtfCancellationFee(passengerCount,sectorCount);charge=Math.round((supplierCharge+rtfFee)*100)/100;refund=Math.max(0,Math.round((refund-rtfFee)*100)/100);
  }
  const q={id:randomUUID(),bookingId:b.id,charge,refund,supplierCharge,rtfFee,passengerCount,sectorCount,rtfFeePerPassengerPerSector:rtfFee?RTF_FEE_PER_PASSENGER_PER_SECTOR_INR:0,currency:b.currency,expiresAt:Date.now()+5*60000};store.put('cancel',q.id,req.user.id,{...q,raw},q.expiresAt);res.json(q);
 }));
 app.post('/api/bookings/:id/cancel',auth,asyncRoute(async(req:Authed,res)=>{
  const b=ownedBooking(req);const p=z.object({cancellationId:z.string().uuid(),acceptCharges:z.literal(true)}).parse(req.body);const q=store.get<any>('cancel',p.cancellationId,req.user.id);
  if(!q||q.bookingId!==b.id)throw new AppError(410,'CANCELLATION_EXPIRED','Get a fresh cancellation quote.');
  if(!['SUCCESS','CONFIRMED','DEMO_CONFIRMED'].includes(b.status))throw new AppError(409,'CANCEL_ALREADY_REQUESTED','Cancellation is already requested or unavailable.');
  b.status=b.mode==='demo'?'DEMO_CANCELLED':'CANCELLATION_PENDING';b.cancellation={charge:q.charge,refund:q.refund,supplierCharge:q.supplierCharge,rtfFee:q.rtfFee,passengerCount:q.passengerCount,sectorCount:q.sectorCount};store.put('booking',b.id,req.user.id,b);
  if(b.mode==='tripjack'){try{const r=await provider.request(b.service==='flights'?'flight':'hotelBooking',b.service==='flights'?'/oms/v1/air/amendment/submit-amendment':`/oms/v3/hotel/cancel-booking/${encodeURIComponent(b.providerBookingId!)}`,b.service==='flights'?{bookingId:b.providerBookingId,type:'CANCELLATION',remarks:'Cancellation requested by traveller'}:{});b.cancellation={charge:q.charge,refund:q.refund,supplierCharge:q.supplierCharge,rtfFee:q.rtfFee,passengerCount:q.passengerCount,sectorCount:q.sectorCount,amendmentId:r.amendmentId};}catch(e){b.status='CANCELLATION_UNKNOWN';b.lastError=e instanceof Error?e.message:'Cancellation status unknown.';}}
  store.put('booking',b.id,req.user.id,b);res.json(b);
 }));
 app.post('/api/enquiries',auth,(req,res,next)=>{try{const p=z.object({service:z.string().min(2).max(40),subject:z.string().trim().min(3).max(160),message:z.string().trim().min(10).max(2000),date:z.string().max(20).optional()}).parse(req.body);const item={...p,id:randomUUID(),createdAt:Date.now(),status:'SAVED_LOCALLY'};store.put('enquiry',item.id,(req as Authed).user.id,item);res.status(201).json(item);}catch(e){next(e);}});
 app.get('/api/enquiries',auth,(req,res)=>res.json(store.list('enquiry',(req as Authed).user.id)));
 app.post('/api/insurance/search',asyncRoute(async(req,res)=>res.json(await searchInsurance(insuranceQuery.parse(req.body)))));
 app.use((_req,_res,next)=>next(new AppError(404,'NOT_FOUND','This API route does not exist.')));
 app.use((err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
  if(err instanceof z.ZodError)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:err.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')}});
  if(err instanceof AppError)return res.status(err.status).json({error:{code:err.code,message:err.message,...(err.details?{details:err.details}:{})}});
  if(err instanceof SyntaxError)return res.status(400).json({error:{code:'INVALID_JSON',message:'The request body is not valid JSON.'}});
  res.status(500).json({error:{code:'SERVER_ERROR',message:'Something went wrong. Please try again.'}});
 });
 return {app,store,travel};
}
