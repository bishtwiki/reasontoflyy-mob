import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../store';
import {TripJack,type Vendor} from '../tripjack';
import {Travel} from '../travel';
import {HotelNearby} from '../hotelNearby';
import {hotelQuery} from '../validation';
import {dateAfter} from '../../shared/catalog';
import {distanceMeters} from '../../shared/hotelNearby';
const place={id:'place',name:'Meeting venue',address:'Mumbai',latitude:19,longitude:72.8,radiusMeters:1000};
const query={mode:'tripjack' as const,city:'Mumbai',regionId:'699261',checkIn:dateAfter(1),checkOut:dateAfter(2),rooms:[{adults:1,children:0,childAge:[]}],nationality:'106',location:place};
const content=(id:string,lat:number|null)=>({tjHotelId:id,name:'Hotel '+id,star_rating:4,locale:{address:{fulladdr:'Mumbai'},coordinates:{lat,long:72.8}}});
class Provider extends TripJack{calls:string[]=[];async request(_group:any,path:string,body?:any):Promise<Vendor>{this.calls.push(path);if(path.includes('mapping'))return {hotels:['1','2','3'].map(tjHotelId=>({tjHotelId})),pageable:{totalPages:1}};if(path.includes('content'))return {hotels:[content('1',19.002),content('2',19.2),content('3',null)]};if(path.includes('listing')){assert.deepEqual(body.hids,[1]);return {hotels:[{hotelId:'1',name:'Near hotel',options:[{optionId:'rate',pricing:{totalPrice:1800}}]}]};}return {};}}
test('nearby search uses real coordinates, excludes missing locations and caches the mapped catalogue',async()=>{const store=new Store(':memory:');const provider=new Provider();try{const nearby=new HotelNearby(store,provider);const rows=await nearby.nearby('699261',place,4);assert.equal(rows.length,1);assert(rows[0].distanceMeters>200&&rows[0].distanceMeters<300);await nearby.nearby('699261',place,4);assert.equal(provider.calls.length,2);assert.equal((await nearby.nearby('699261',place,5)).length,0);}finally{store.close();}});
test('advanced search sends only hotels in the selected radius to TripJack live pricing',async()=>{const store=new Store(':memory:');try{const result=await new Travel(store,new Provider()).hotels(query);assert.equal(result.hotels.length,1);assert.equal(result.hotels[0].amount,1800);assert.equal(result.hotels[0].id,'1');assert(result.hotels[0].distanceMeters!>0);}finally{store.close();}});
test('advanced hotel search validates coordinates and distance',()=>{assert(hotelQuery.safeParse(query).success);for(const location of [{...place,radiusMeters:199},{...place,radiusMeters:10001},{...place,latitude:100}])assert(!hotelQuery.safeParse({...query,location}).success);assert.equal(distanceMeters(place,place),0);});
test('landmark autocomplete preserves real coordinates and caches results without provider credentials',async()=>{const store=new Store(':memory:');let calls=0;try{const nearby=new HotelNearby(store,new Provider());const fetcher=(async(url:any,init:any)=>{calls++;assert(String(url).startsWith('https://photon.komoot.io/api/'));assert.deepEqual(init.headers,{Accept:'application/json'});return new Response(JSON.stringify({features:[{geometry:{coordinates:[72.8,19]},properties:{osm_id:123,name:'Venue',city:'Mumbai',country:'India'}}]}));}) as typeof fetch;const rows=await nearby.places('Venue','Mumbai',fetcher);assert.equal(rows[0].latitude,19);assert.equal(rows[0].longitude,72.8);await nearby.places('Venue','Mumbai',fetcher);assert.equal(calls,1);}finally{store.close();}});
