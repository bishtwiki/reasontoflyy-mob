"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeBands = exports.emptyFlightFilters = void 0;
exports.matchesFlight = matchesFlight;
const emptyFlightFilters = () => ({ stops: [], departure: [], arrival: [], airlines: [], refundability: [], families: [], cabins: [] });
exports.emptyFlightFilters = emptyFlightFilters;
exports.timeBands = ['12 AM – 6 AM', '6 AM – 12 PM', '12 PM – 6 PM', '6 PM – 12 AM'];
const hour = (date) => { const h = Number(date?.slice(11, 13)); return Number.isFinite(h) && date ? Math.floor(h / 6) : -1; };
function matchesFlight(f, v) { return (!v.stops.length || v.stops.includes(Math.min(2, f.stops))) && (!v.departure.length || v.departure.includes(hour(f.segments[0]?.departure))) && (!v.arrival.length || v.arrival.includes(hour(f.segments.at(-1)?.arrival))) && (!v.airlines.length || v.airlines.includes(f.airline)) && (!v.refundability.length || v.refundability.includes(f.refundable ? 'refundable' : 'nonrefundable')) && (!v.families.length || v.families.includes(f.fareName)) && (!v.cabins.length || v.cabins.includes(f.cabin || '')) && (v.minFare === undefined || f.amount >= v.minFare) && (v.maxFare === undefined || f.amount <= v.maxFare) && (v.minDuration === undefined || f.duration >= v.minDuration) && (v.maxDuration === undefined || f.duration <= v.maxDuration); }
