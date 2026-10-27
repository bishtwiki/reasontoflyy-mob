export interface HomeCard {title:string;text:string;description:string;image:string;href:string;code?:string;category?:string;duration?:string;destination?:string;priceLabel?:string;termsLabel?:string}
export interface HomeSection {title:string;label:string;description:string;cards:HomeCard[]}
export interface HomepageContent {services:{id:string;name:string}[];source:string;fetchedAt:string;stale:boolean;name:string;logo:string;hero:{title:string;description:string;image:string};sections:HomeSection[];contact:{phone:string;email:string;address:string;description:string}}
