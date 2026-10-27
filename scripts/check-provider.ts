import { TripJack } from '../server/tripjack';
import { config } from '../server/config';
import { dateAfter } from '../shared/catalog';
async function main(){
  console.log(`Checking TripJack ${config.environment} access. These requests do not create bookings.`);
  const provider=new TripJack();
  for(const product of ['flights','hotels']){
    try {const r=product==='hotels'?await provider.request('hotel','/hms/v3/content/fetch-countries'):await provider.request('flight','/fms/v1/air-search-all',{searchQuery:{cabinClass:'ECONOMY',paxInfo:{ADULT:1,CHILD:0,INFANT:0},routeInfos:[{fromCityOrAirport:{code:'DEL'},toCityOrAirport:{code:'BOM'},travelDate:dateAfter(14)}]}});console.log(JSON.stringify({product,success:true,results:product==='hotels'?r.hotelCountries?.length??0:Object.keys(r.searchResult?.tripInfos||{}).length}));}
    catch(e){console.error(JSON.stringify({product,success:false,message:e instanceof Error?e.message:'Provider access failed'}));process.exitCode=1;}
  }
}
void main();
