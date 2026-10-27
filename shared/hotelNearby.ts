export interface HotelPlace {id:string;name:string;address:string;latitude:number;longitude:number}
export interface HotelNear {id:string;name:string;address:string;stars:number;image?:string;distanceMeters:number;latitude:number;longitude:number}
export interface HotelLocation extends HotelPlace {radiusMeters:number;hotelId?:string}
export const hotelRadii=[200,500,1000,2000,5000,10000];
export function distanceLabel(metres:number){return metres<1000?`${Math.round(metres)} m`:`${(metres/1000).toFixed(metres%1000?1:0)} km`;}
export function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const rad=(n:number)=>n*Math.PI/180;const dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
