import {AppError} from './errors';
import type {Store} from './store';
import type {TripJack,Vendor} from './tripjack';
import {distanceMeters,type HotelPlace,type HotelNear} from '../shared/hotelNearby';
import {normalizeHotel} from './travel';
export class HotelNearby{
 private tasks=new Map<string,Promise<any[]>>();
 constructor(private store:Store,private provider:TripJack){}
 async places(q:string,city:string,fetcher:typeof fetch=fetch):Promise<HotelPlace[]>{
  const key='hotel-place:'+q.toLowerCase()+':'+city.toLowerCase();const cached=this.store.get<HotelPlace[]>('catalog',key);if(cached)return cached;
  let r:Response;try{r=await fetcher('https://photon.komoot.io/api/?'+new URLSearchParams({q:`${q} ${city}`,limit:'6',lang:'en'}),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new AppError(502,'PLACE_UNAVAILABLE','Place search is unavailable. Please try again.');}
  if(!r.ok)throw new AppError(502,'PLACE_UNAVAILABLE','Place search is unavailable. Please try again.');let data:any;try{data=await r.json();}catch{throw new AppError(502,'PLACE_UNAVAILABLE','Place search returned an unreadable response.');}
  const rows=(data.features||[]).flatMap((f:any)=>{const p=f.properties||{},xy=f.geometry?.coordinates;if(!Array.isArray(xy)||!Number.isFinite(xy[0])||!Number.isFinite(xy[1]))return [];return [{id:String(p.osm_id||xy.join(',')),name:String(p.name||p.street||q),address:[p.street,p.district,p.city,p.state,p.country].filter(Boolean).join(', '),latitude:xy[1],longitude:xy[0]}];});this.store.put('catalog',key,'public',rows,Date.now()+86400000);return rows;
 }
 async catalog(regionId:string){const key='hotel-nearby-v1:'+regionId;const cached=this.store.get<any[]>('catalog',key);if(cached)return cached;let task=this.tasks.get(key);if(!task){task=this.load(regionId,key).finally(()=>this.tasks.delete(key));this.tasks.set(key,task);}return task;}
 private async load(regionId:string,key:string){const ids=new Set<string>();for(let page=0;page<1000;page++){const m=await this.provider.request('hotel','/hms/v3/content/fetch-hotel-mapping',{regionIds:[regionId],page,size:2000});const rows=m.hotels||[];rows.forEach((h:Vendor)=>ids.add(String(h.tjHotelId)));if(rows.length<2000||page+1>=Number(m.pageable?.totalPages||Infinity))break;if(page===999)throw new AppError(502,'HOTEL_CATALOG','This destination catalogue is too large to load.');}
  const all=[...ids],hotels:any[]=[];for(let start=0;start<all.length;start+=400){const chunks=[];for(let i=start;i<Math.min(start+400,all.length);i+=100)chunks.push(all.slice(i,i+100));const content=await Promise.all(chunks.map(hotelIds=>this.provider.request('hotel','/hms/v3/content/fetch-hotel-content',{hotelIds,isAllImagesRequired:false})));for(const batch of content)for(const h of batch.hotels||[]){const c=h.locale?.coordinates;const latitude=Number(c?.lat),longitude=Number(c?.long??c?.lng);if(c?.lat==null||(c?.long==null&&c?.lng==null)||!Number.isFinite(latitude)||!Number.isFinite(longitude))continue;const n=normalizeHotel(h,h);hotels.push({id:n.id,name:n.name,address:n.address,stars:n.stars,image:n.image,latitude,longitude});}}
  this.store.put('catalog',key,'public',hotels,Date.now()+86400000);return hotels;
 }
 async nearby(regionId:string,place:Pick<HotelPlace,'latitude'|'longitude'>,minStars=0):Promise<HotelNear[]>{return (await this.catalog(regionId)).map(h=>({...h,distanceMeters:Math.round(distanceMeters(place,h))})).filter(h=>h.distanceMeters<=10000&&h.stars>=minStars).sort((a,b)=>a.distanceMeters-b.distanceMeters);}
}
