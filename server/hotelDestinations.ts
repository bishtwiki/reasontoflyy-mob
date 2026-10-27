import {AppError} from './errors';
import type {Store} from './store';
import type {TripJack,Vendor} from './tripjack';
type Destination={id:string;name:string;country:string;label:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export class HotelDestinations{
 private loading?:Promise<void>;
 private failure?:unknown;
 private rows?:Destination[];
 private partial=new Map<string,Destination>();
 private expires=0;
 constructor(private store:Store,private provider:TripJack){}
 private async load(){
  const rows=this.partial;rows.clear();const seen=new Set<string>();let cursor:string|undefined;
  for(let page=0;page<2000;page++){
   const path='/hms/v3/content/fetch-city-regionIds?limit=2000'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
   let data=this.store.get<Vendor>('catalog',path);
   if(!data){data=await this.provider.request('hotel',path);this.store.put('catalog',path,'public',data,Date.now()+86400000);}
   if(!Array.isArray(data.hotelCityRegionIds))throw new AppError(502,'DESTINATION_CATALOG','TripJack returned an invalid destination catalogue. Please retry.');
   for(const row of data.hotelCityRegionIds){const name=String(row.cityName||row.regionName||'').trim();if(row.cityRegionId!=null&&name)rows.set(String(row.cityRegionId),{id:String(row.cityRegionId),name,country:String(row.countryName||''),label:String(row.fullRegionName||name)});}
   if(!data.nextCursor){if(data.hasMore)throw new AppError(502,'DESTINATION_CATALOG','TripJack did not return the next destination page. Please retry.');this.rows=[...rows.values()];this.expires=Date.now()+86400000;this.store.put('catalog','hotel-destination-index-v1','public',this.rows,Date.now()+86400000);return;}
   cursor=String(data.nextCursor);if(seen.has(cursor))throw new AppError(502,'DESTINATION_CATALOG','TripJack repeated a destination page. Please retry.');seen.add(cursor);
  }
  throw new AppError(502,'DESTINATION_CATALOG','The destination catalogue could not finish loading. Please retry.');
 }
 async search(query:string,cursor?:string){
  const q=normalize(query);if(q.length<2)return {cities:[],initializing:false};
  if(this.expires<=Date.now()){this.rows=this.store.get<Destination[]>('catalog','hotel-destination-index-v1');if(this.rows)this.expires=Date.now()+3600000;}
  if(!this.rows){if(this.failure){const error=this.failure;this.failure=undefined;throw error;}if(!this.loading)this.loading=this.load().catch(error=>{this.failure=error;}).finally(()=>{this.loading=undefined;});}
  const initializing=!this.rows;
  const tokens=q.split(' ');const rank=(row:Destination)=>{const name=normalize(row.name);return name===q?0:name.startsWith(q)?1:tokens.every(t=>name.includes(t))?2:3;};
  const matches=(this.rows||[...this.partial.values()]).filter(row=>{const text=normalize(row.name+' '+row.label+' '+row.country);return tokens.every(token=>text.includes(token));}).sort((a,b)=>Number(b.country.toUpperCase()==='INDIA')-Number(a.country.toUpperCase()==='INDIA')||rank(a)-rank(b)||a.name.localeCompare(b.name)||a.label.localeCompare(b.label));
  const offset=cursor&&/^\d+$/.test(cursor)?Number(cursor):0;return {cities:matches.slice(offset,offset+30),initializing,hasMore:offset+30<matches.length,nextCursor:offset+30<matches.length?String(offset+30):undefined};
 }
}
