import snapshot from '../../assets/reference/homepage.json';
export interface HomeOffer {title:string;text:string;description:string;code:string;termsLabel:string;category:'Flight'|'Hotel'|'Holiday Offers';image:string;href:string}
export interface HomeHoliday {title:string;text:string;destination:string;origin:string;duration:string;priceLabel:string;image:string;href:string}
const offerSection=snapshot.sections.find(section=>section.title==='Save more on every booking')!;
const holidaySection=snapshot.sections.find(section=>section.title==='Pack a week, somewhere new')!;
export const homeOffers=offerSection.cards as unknown as HomeOffer[];
export const homeHolidays=holidaySection.cards as unknown as HomeHoliday[];
export const homeContent={name:snapshot.name,logo:snapshot.logo,offersHeading:offerSection.title,offersViewAll:offerSection.viewAllLabel,holidaysHeading:holidaySection.title};
