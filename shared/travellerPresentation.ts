import type {Traveller} from './types';
export const travellerTitles=['Mr','Mrs','Ms'];
export function normalizeTraveller(value:Traveller):Traveller{return {...value,title:value.title==='Miss'?'Ms':value.title==='Master'?'Mr':value.title,firstName:value.firstName.toUpperCase(),lastName:value.lastName.toUpperCase(),...(value.passport?{passport:value.passport.toUpperCase()}:{}),...(value.nationality?{nationality:value.nationality.toUpperCase()}:{})};}
export function updateTraveller(value:Traveller,patch:Partial<Traveller>):Traveller{const next=normalizeTraveller({...value,...patch});if(patch.title)next.gender=next.title==='Mr'?'MALE':'FEMALE';if(patch.gender)next.title=patch.gender==='FEMALE'?(next.title==='Mrs'?'Mrs':'Ms'):'Mr';return next;}
export function countryFlag(code:string){return /^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(letter=>127397+letter.charCodeAt(0))):'';}
