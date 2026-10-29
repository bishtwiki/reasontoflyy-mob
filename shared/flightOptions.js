"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flightJourneyKey = flightJourneyKey;
exports.groupFlightOptions = groupFlightOptions;
/** One scheduled journey can have multiple supplier fare products. */
function flightJourneyKey(f) { return f.journeyId ? JSON.stringify([f.group, f.journeyId]) : JSON.stringify([f.group, f.segments.map(s => [s.airlineCode, s.number, s.from, s.to, s.departure, s.arrival])]); }
function groupFlightOptions(flights) { const groups = new Map(); for (const flight of flights) {
    const key = flightJourneyKey(flight);
    const fares = groups.get(key);
    if (fares)
        fares.push(flight);
    else
        groups.set(key, [flight]);
} return [...groups].map(([key, fares]) => { const unique = [...new Map(fares.map(f => [f.priceId || f.id, f])).values()].sort((a, b) => a.amount - b.amount); return { key, fares: unique, lead: unique[0] }; }); }
