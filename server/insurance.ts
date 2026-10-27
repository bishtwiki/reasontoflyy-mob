import {AppError} from './errors';
import {z} from 'zod';
const date=z.iso.date();
export const insuranceQuery=z.object({startDate:date,endDate:date,travellerDobs:z.array(date).min(1).max(9),destination:z.string().regex(/^[A-Z]{2}$/).optional(),destinations:z.array(z.object({key:z.string().regex(/^[A-Z]{2,5}$/),type:z.enum(['COUNTRY','REGION'])})).min(1).max(5).optional(),tenureInMonths:z.number().int().min(1).max(24).optional(),maxTripDays:z.number().int().min(1).max(365).optional(),planType:z.enum(['regular','STUDENT','AMT']).default('regular')}).superRefine((input,ctx)=>{const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});if(input.startDate<today)ctx.addIssue({code:'custom',message:'Cover must start today or later.'});if(input.endDate<input.startDate)ctx.addIssue({code:'custom',message:'Cover end date must not precede the start date.'});if(!input.destination&&!input.destinations?.length)ctx.addIssue({code:'custom',message:'Select at least one destination.'});if(input.travellerDobs.some(dob=>dob>today||dob>input.startDate))ctx.addIssue({code:'custom',message:'Enter a valid date of birth for every traveller.'});});
const text=(value:any)=>typeof value==='string'||typeof value==='number'?String(value):'';
function number(value:any){if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()==='')return;const n=Number(value);return Number.isFinite(n)&&n>=0?n:undefined;}
function firstValue(sources:any[],keys:string[]){const wanted=new Set(keys.map(key=>key.toLowerCase()));const pending=[...sources];const seen=new Set<any>();while(pending.length){const source=pending.shift();if(!source||typeof source!=='object'||seen.has(source))continue;seen.add(source);for(const [key,value] of Object.entries(source)){if(wanted.has(key.toLowerCase())&&(typeof value==='string'||typeof value==='number'||typeof value==='boolean')&&value!=='')return value;if(value&&typeof value==='object')pending.push(value);}}}
function quoteSeconds(value:any){if(typeof value==='number'&&Number.isFinite(value))return Math.max(0,Math.round(value>100000?value/1000:value));if(typeof value!=='string')return;const input=value.trim();const clock=input.match(/^(\d{1,3}):(\d{2})$/);if(clock)return Number(clock[1])*60+Number(clock[2]);const minutes=input.match(/(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i);if(minutes&&(minutes[1]||minutes[2]))return Number(minutes[1]||0)*60+Number(minutes[2]||0);const parsed=Number(input);return Number.isFinite(parsed)&&parsed>=0?Math.round(parsed>100000?parsed/1000:parsed):undefined;}
function quoteTime(value:any){if(typeof value==='number'&&Number.isFinite(value)){const ms=value<100000000000?value*1000:value;return new Date(ms).toISOString();}if(typeof value==='string'&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString();}
export function insuranceBenefits(raw:any):string[]{if(!raw)return [];if(typeof raw==='string')return [raw];if(Array.isArray(raw))return raw.flatMap(insuranceBenefits);if(typeof raw!=='object')return [];const name=text(raw.displayName||raw.name||raw.title||raw.Coverage),desc=text(raw.description||raw.desc||raw.Description),limit=text(raw.sumInsured||raw.limit||raw.coverage||raw.SumInsured);if(name||desc)return [[name,limit,desc].filter(Boolean).join(' · ')];return Object.entries(raw).flatMap(([key,value])=>{if(typeof value==='string'||typeof value==='number')return [`${key.replace(/_/g,' ')}: ${value}`];return insuranceBenefits(value);});}
export function normalizeInsurancePlans(raw:any){
 const rows=raw.data?.productInfo||raw.productInfo||raw.plans||[];if(!Array.isArray(rows))return [];
 const quoteSources=[raw,raw.data,raw.meta,raw.quote,raw.data?.quote,raw.searchResult,raw.data?.searchResult];
 const quoteValidForSeconds=quoteSeconds(firstValue(quoteSources,['quoteValidForSeconds','validForSeconds','validitySeconds','quoteValiditySeconds','quoteValidity','ttlSeconds','expiresIn','quoteValidFor','validity']));
 const quoteExpiresAt=quoteTime(firstValue(quoteSources,['quoteExpiresAt','quoteValidUntil','quoteValidTill','validUntil','validTill','expiryTime','expiresAt','expiryDate']));
 const allowedValue=firstValue(quoteSources,['onlinePaymentAllowed','canPayOnline','paymentAllowed','isPaymentAllowed','paymentAvailable']);
 const onlinePaymentAllowed=typeof allowedValue==='boolean'?allowedValue:typeof allowedValue==='string'?['true','yes','1','allowed'].includes(allowedValue.toLowerCase()):undefined;
 const paymentMessage=firstValue(quoteSources,['onlinePaymentMessage','paymentEligibilityMessage','paymentMessage','paymentReason']);
 const insufficientPaymentTime=firstValue(quoteSources,['notEnoughTimeToPayOnline','insufficientTimeForOnlinePayment']);
 const onlinePaymentMessage=typeof paymentMessage==='string'?paymentMessage:insufficientPaymentTime===true||insufficientPaymentTime==='true'?'Not enough time left to pay online':undefined;
 return rows.map((plan:any,i:number)=>{
  const coverage=plan.coverageLabel||plan.SumInsured||plan.planCoverage||plan.sumInsured||plan.coverage||plan.PlanName;
  const coverageLabel=typeof coverage==='object'?insuranceBenefits(coverage).join(' · '):text(coverage);
  const insurer=plan.insuranceProvider;
  const provider=typeof insurer==='object'?text(insurer?.name||insurer?.displayName||insurer?.code):text(insurer||plan.provider||plan.InsuranceProvider||plan.insurerName||plan.companyName);
  const providerFullName=typeof insurer==='object'?text(insurer?.fullName||insurer?.legalName||insurer?.companyName||insurer?.displayName):text(plan.insurerFullName||plan.insuranceCompanyName||plan.companyFullName);
  const sources=[plan,plan.quote,plan.validity,...quoteSources];
  const planAllowedValue=firstValue(sources,['onlinePaymentAllowed','canPayOnline','paymentAllowed','isPaymentAllowed','paymentAvailable']);
  const planPaymentAllowed=typeof planAllowedValue==='boolean'?planAllowedValue:typeof planAllowedValue==='string'?['true','yes','1','allowed'].includes(planAllowedValue.toLowerCase()):onlinePaymentAllowed;
  const planPaymentMessage=firstValue(sources,['onlinePaymentMessage','paymentEligibilityMessage','paymentMessage','paymentReason']);
  const planInsufficientTime=firstValue(sources,['notEnoughTimeToPayOnline','insufficientTimeForOnlinePayment']);
  return {id:text(plan.productId||plan.ResultIndex||plan.id||plan.PlanId)||String(i),name:text(plan.productName||plan.PlanTier||plan.PlanCode||plan.planName||plan.name)||'Insurance plan',provider,providerFullName,price:number(plan.fareDetails?.totalFare??plan.CustomerFare??plan.price),currency:plan.fareDetails?.currency||plan.Price?.Currency||plan.currency||'INR',coverageLabel,coverageAmount:number(typeof coverage==='object'?coverage.amount||coverage.sumInsured:typeof coverage==='string'?coverage.replace(/[$,]/g,''):coverage),region:text(plan.regionName||plan.region||plan.PlanCoverage),planType:text(plan.planType||plan.planKind||plan.PlanType),benefits:[...new Set(insuranceBenefits(plan.benefits||plan.CoverageDetails||plan.planBenefits||plan.features||plan.inclusions||(typeof plan.planCoverage==='object'?plan.planCoverage:undefined)))],quoteValidForSeconds:quoteSeconds(firstValue(sources,['quoteValidForSeconds','validForSeconds','validitySeconds','quoteValiditySeconds','quoteValidity','ttlSeconds','expiresIn','quoteValidFor','validity']))??quoteValidForSeconds,quoteExpiresAt:quoteTime(firstValue(sources,['quoteExpiresAt','quoteValidUntil','quoteValidTill','validUntil','validTill','expiryTime','expiresAt','expiryDate']))||quoteExpiresAt,onlinePaymentAllowed:planAllowedValue===undefined?onlinePaymentAllowed:planPaymentAllowed,onlinePaymentMessage:typeof planPaymentMessage==='string'?planPaymentMessage:planInsufficientTime===true||planInsufficientTime==='true'?'Not enough time left to pay online':onlinePaymentMessage};
 });
}

export function insurancePayload(input:z.infer<typeof insuranceQuery>){
 const destinations=input.destinations||[{key:input.destination!,type:'COUNTRY'}];
 const start=new Date(input.startDate+'T12:00:00Z');
 const ages=input.travellerDobs.map(dob=>{const birth=new Date(dob+'T12:00:00Z');let age=start.getUTCFullYear()-birth.getUTCFullYear();if(start.getUTCMonth()<birth.getUTCMonth()||(start.getUTCMonth()===birth.getUTCMonth()&&start.getUTCDate()<birth.getUTCDate()))age--;return age;});
 return {PlanType:input.planType==='AMT'?2:1,PlanCoverage:destinations[0].key,TravelStartDate:input.startDate,TravelEndDate:input.endDate,NoOfPax:ages.length,PaxAge:ages,...(destinations.length>1?{Destinations:destinations.map(d=>d.key)}:{}),...(input.planType==='STUDENT'?{PolicyType:'STUDENT',TenureInMonths:input.tenureInMonths||12}:{}),...(input.planType==='AMT'?{MaxTripDays:input.maxTripDays||45}:{})};
}
export async function searchInsurance(input:z.infer<typeof insuranceQuery>,fetcher:typeof fetch=fetch){
 let response:Response;
 try{response=await fetcher('https://reasontoflyy.com/api/b2c/insurance/search',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(insurancePayload(input)),signal:AbortSignal.timeout(45000),redirect:'error'});}
 catch{throw new AppError(502,'INSURANCE_UNAVAILABLE','Insurance quotes are temporarily unavailable. Please try again.');}
 let raw:any;try{raw=await response.json();}catch{throw new AppError(502,'INSURANCE_UNAVAILABLE','The insurance service returned an unreadable response.');}
 if(!response.ok||!raw||raw.ok===false)throw new AppError(502,'INSURANCE_UNAVAILABLE','Insurance quotes are temporarily unavailable. Please try again or change the trip details.');
 if(!Array.isArray(raw.plans))throw new AppError(502,'INSURANCE_UNAVAILABLE','The insurance service returned an unexpected response.');
 return {source:'reasontoflyy-tripsafe',traceId:raw.traceId,plans:normalizeInsurancePlans(raw)};
}
