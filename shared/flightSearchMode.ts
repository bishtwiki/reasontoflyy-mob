import type {FlightQuery,Route} from './types';
/** Dates never infer trip mode: only the explicitly selected mode controls routes. */
export function routesForFlightSearch(mode:FlightQuery['tripType'],routes:Route[],returnDate:string):Route[]{
 const first=routes[0];if(!first)throw new Error('Choose your departure and arrival airports.');
 if((mode==='multi'?routes:[first]).some(route=>!route.date))throw new Error('Choose a departure date for every flight.');
 if(mode==='oneway')return [{...first}];
 if(mode==='return'){if(!returnDate)throw new Error('Choose a return date.');if(returnDate<first.date)throw new Error('Return date cannot be before departure.');return [{...first},{from:first.to,to:first.from,date:returnDate}];}
 if(routes.length<2||routes.length>4)throw new Error('Multi-city requires 2 to 4 flights.');
 if(routes.some((route,index)=>index>0&&route.date<routes[index-1].date))throw new Error('Multi-city dates must be in order.');
 return routes.map(route=>({...route}));
}
