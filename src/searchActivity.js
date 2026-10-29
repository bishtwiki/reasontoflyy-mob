"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchActivity = void 0;
exports.beginSearch = beginSearch;
const listeners = new Set();
const pending = new Map();
let snapshot = null;
function publish() { snapshot = [...pending.values()].at(-1) || null; listeners.forEach(listener => listener()); }
exports.searchActivity = { subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }, getSnapshot: () => snapshot };
function beginSearch(path) { const activities = { '/flights/search': { kind: 'flights', title: 'Finding your next flight', subtitle: 'Checking available flights and the latest fares.' }, '/hotels/search': { kind: 'hotels', title: 'Finding your perfect stay', subtitle: 'Checking hotels, room availability and live prices.' }, '/insurance/search': { kind: 'insurance', title: 'Finding cover for your journey', subtitle: 'Checking available plans and premiums.' }, '/hotels/nearby': { kind: 'nearby', title: 'Discovering nearby stays', subtitle: 'Finding hotels around your selected place.' } }; const activity = activities[path.split('?')[0]]; if (!activity)
    return () => { }; const id = Symbol(path); pending.set(id, activity); publish(); return () => { pending.delete(id); publish(); }; }
