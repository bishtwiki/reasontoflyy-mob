"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fareDisplayName = fareDisplayName;
exports.layoverMinutes = layoverMinutes;
exports.flightSummary = flightSummary;
exports.compareFlightResults = compareFlightResults;
exports.availableSeats = availableSeats;
exports.seatsLabel = seatsLabel;
const acronyms = new Set(['SME', 'PNR', 'NDC', 'GDS', 'LCC', 'IATA', 'API']);
/** Readable formatting only: retain the exact supplier code separately for filters/review. */
function fareDisplayName(value) { if (!value?.trim())
    return 'Fare name unavailable'; return value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ').split(' ').map(word => acronyms.has(word.toUpperCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '); }
function layoverMinutes(flight) { const gaps = []; for (let i = 1; i < flight.segments.length; i++) {
    const before = flight.segments[i - 1], after = flight.segments[i];
    if (before.to !== after.from)
        return undefined;
    const gap = (Date.parse(after.departure) - Date.parse(before.arrival)) / 60000;
    if (!Number.isFinite(gap) || gap < 0)
        return undefined;
    gaps.push(gap);
} return gaps.length ? Math.min(...gaps) : undefined; }
function flightSummary(flights) { const prices = flights.map(f => f.amount).filter(Number.isFinite), durations = flights.map(f => f.duration).filter(Number.isFinite), layovers = flights.map(layoverMinutes).filter((n) => n !== undefined); return { cheapest: prices.length ? Math.min(...prices) : undefined, fastest: durations.length ? Math.min(...durations) : undefined, nonstop: flights.filter(f => f.stops === 0).length, shortestLayover: layovers.length ? Math.min(...layovers) : undefined }; }
function compareFlightResults(a, b, sort) { if (sort === 'duration')
    return a.duration - b.duration || a.amount - b.amount; if (sort === 'departure')
    return (a.segments[0]?.departure || '').localeCompare(b.segments[0]?.departure || '') || a.amount - b.amount; if (sort === 'layover') {
    const x = layoverMinutes(a), y = layoverMinutes(b);
    if (x === undefined && y !== undefined)
        return 1;
    if (y === undefined && x !== undefined)
        return -1;
    if (x !== undefined && y !== undefined && x !== y)
        return x - y;
} return a.amount - b.amount || a.duration - b.duration; }
function availableSeats(value) { if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '')
    return undefined; const n = Number(value); return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : undefined; }
function seatsLabel(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${value} left` : 'Seat availability not provided'; }
