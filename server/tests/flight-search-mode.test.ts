import test from 'node:test';
import assert from 'node:assert/strict';
import {routesForFlightSearch} from '../../shared/flightSearchMode';
const routes=[{from:'DEL',to:'BLR',date:'2026-11-01'},{from:'BLR',to:'BOM',date:'2026-11-03'},{from:'BOM',to:'GOI',date:'2026-11-05'}];
test('one-way uses only its departure date, ignoring return date and hidden legs',()=>{assert.deepEqual(routesForFlightSearch('oneway',routes,'2026-11-10'),[routes[0]]);assert.deepEqual(routesForFlightSearch('oneway',routes,''),[routes[0]]);});
test('round-trip uses its selected departure/return dates and reverses the same airports',()=>{assert.deepEqual(routesForFlightSearch('return',routes,'2026-11-07'),[routes[0],{from:'BLR',to:'DEL',date:'2026-11-07'}]);assert.throws(()=>routesForFlightSearch('return',routes,''),/Choose a return date/);assert.throws(()=>routesForFlightSearch('return',routes,'2026-10-31'),/before departure/);});
test('multi-city uses every leg date and never uses the round-trip return date',()=>{assert.deepEqual(routesForFlightSearch('multi',routes,'2026-11-20'),routes);assert.throws(()=>routesForFlightSearch('multi',[routes[0]],''));assert.throws(()=>routesForFlightSearch('multi',[routes[1],routes[0]],''));});

test('all modes reject missing departure dates rather than filling them from another mode',()=>{for(const mode of ['oneway','return','multi'] as const)assert.throws(()=>routesForFlightSearch(mode,[{...routes[0],date:''},routes[1]],'2026-11-10'),/Choose a departure date/);});
