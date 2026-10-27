export interface FareRuleRow {startHours?:number;endHours?:number;amount?:number;additionalFee?:number;note:string}
export interface FareRuleSection {route:string;title:string;rows:FareRuleRow[]}
export interface FareRuleDisplay {sections:FareRuleSection[];notes:string[]}
export interface FareRulesResponse {display:FareRuleDisplay}
