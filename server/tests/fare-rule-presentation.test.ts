import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fareRuleWindow,orderedFareRuleRows,rtfRuleFee,fareRuleRestriction,fareRuleNoShowHint} from '../../shared/fareRulePresentation';
test('one-year outer band displays an open-ended window without changing real cutoffs',()=>{
 assert.equal(fareRuleWindow(74,8760),'More than 74 hours before departure');
 assert.equal(fareRuleWindow(4,8760),'More than 4 hours before departure');
 assert.equal(fareRuleWindow(0,8760),'Before departure');
 assert.equal(fareRuleWindow(undefined,8760),'Before departure');
 assert.equal(fareRuleWindow(5,74),'5–74 hours before departure');
 assert.equal(fareRuleWindow(0,5),'Within 5 hours of departure');
 assert.equal(fareRuleWindow(74,9000),'74–9000 hours before departure');
 assert.equal(fareRuleWindow(),'Time window not stated');
});
test('different fares retain their own time bands, penalties and missing/no-show values',()=>{
 const a=[{startHours:4,endHours:96,amount:4899,note:''},{startHours:96,endHours:8760,amount:3899,note:''}];
 const b=[{startHours:0,endHours:5,note:'Only statutory taxes are refundable.'},{startHours:5,endHours:8760,amount:0,note:''}];
 assert.deepEqual(orderedFareRuleRows(a).map(r=>r.amount),[3899,4899]);
 assert.equal(a[0].amount,4899);assert.deepEqual(orderedFareRuleRows(b).map(r=>r.amount),[0,undefined]);
});

test('RTF fee is separate from fare-dependent airline penalties',()=>{assert.equal(rtfRuleFee('Cancellation'),300);assert.equal(rtfRuleFee('Date change'),300);assert.equal(rtfRuleFee('Seats'),undefined);assert.equal(rtfRuleFee('Baggage'),undefined);});

test('explicit restrictions are distinguished from unknown airline amounts',()=>{
 assert.equal(fareRuleRestriction('Cancellation',[{note:'Cancellation is not permitted | Contact us'}]),'Cancellation not permitted');
 assert.equal(fareRuleRestriction('Date change',[{note:'Changes are not permitted | Name change not permitted'}]),'Date change not permitted');
 assert.equal(fareRuleRestriction('Date change',[{note:'Name changes are not permitted.'}]),undefined);
 assert.equal(fareRuleRestriction('No show',[{note:'No Refund| Seats subject to availability'}]),'No refund');
 assert.equal(fareRuleRestriction('Cancellation',[{amount:0,note:'Free cancellation'}]),undefined);
});

test('no-show cross-reference requires matching route and exact API window',()=>{
 const rows=[{startHours:5,endHours:74,amount:5000,note:''},{startHours:74,endHours:8760,amount:4300,note:''}];
 const sections=[{title:'No show',route:'DEL-BLR',rows:[{startHours:0,endHours:5,note:'Only taxes refunded'}]}];
 assert.equal(fareRuleNoShowHint('Cancellation','DEL-BLR',rows,sections),'Last 5 hours — see No show');
 assert.equal(fareRuleNoShowHint('Date change','DEL-BLR',rows,sections),'Last 5 hours — see No show');
 assert.equal(fareRuleNoShowHint('Cancellation','BOM-BLR',rows,sections),undefined);
 assert.equal(fareRuleNoShowHint('Cancellation','DEL-BLR',[{startHours:4,endHours:8760,note:''}],sections),undefined);
 assert.equal(fareRuleNoShowHint('Seats','DEL-BLR',rows,sections),undefined);
});
