import { config } from './config';
import { AppError } from './errors';
export type Vendor = Record<string,any>;
export class TripJack {
  constructor(private fetcher:typeof fetch=fetch){}
  async request(group:'flight'|'hotel'|'hotelBooking',path:string,body?:unknown):Promise<Vendor>{
    if(!config.key)throw new AppError(503,'PROVIDER_NOT_CONFIGURED','TripJack access is not configured. You can explore the app in demo mode.');
    const base=group==='hotel'?config.hotelBase:group==='hotelBooking'?config.hotelBookingBase:config.flightBase;
    let response:Response;
    try {response=await this.fetcher(base+path,{method:body===undefined?'GET':'POST',headers:{apikey:config.key,'Content-Type':'application/json',Accept:'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000),redirect:'error'});}
    catch {throw new AppError(502,'PROVIDER_UNREACHABLE','TripJack did not respond. Please try again. No booking has been confirmed.');}
    let data:Vendor;
    try {data=await response.json() as Vendor;} catch {throw new AppError(502,'PROVIDER_RESPONSE','TripJack returned an unreadable response.');}
    if(!response.ok||data.status?.success===false||data.success===false||data.errors?.length){
      const raw=String(data.errors?.[0]?.message||data.errors?.[0]?.msg||data.message||data.msg||data.errMsg||data.error?.message||data.error?.msg||data.status?.message||data.status?.msg||'');
      const code=String(data.errors?.[0]?.errCode||data.errors?.[0]?.code||data.error?.code||data.errorCode||data.errCode||data.status?.code||response.status);
      const access=[401,403].includes(response.status)||/api.?key|unauthor|white.?list|access denied|authentication|invalid key/i.test(raw);
      const safeCode=code.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,30);
      const safeMessage=raw.replaceAll(config.key,'[redacted]').replace(/\s+/g,' ').trim().slice(0,180);
      throw new AppError(access?503:502,access?'PROVIDER_ACCESS':'PROVIDER_REJECTED',access?'TripJack has not accepted this server’s credentials or IP address. Check the key environment, product access and IP allowlist.':`TripJack could not complete this request (code ${safeCode})${safeMessage?`: ${safeMessage}`:''}. Try again or change your selection.`);
    }
    return data;
  }
}
