"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flightConnections = flightConnections;
exports.itineraryConnections = itineraryConnections;
function connections(segments) { let minutes = 0, count = 0; for (let i = 1; i < segments.length; i++) {
    const a = segments[i - 1], b = segments[i];
    const gap = (Date.parse(b.departure) - Date.parse(a.arrival)) / 60000;
    if (a.to !== b.from || !Number.isFinite(gap) || gap < 0)
        return;
    minutes += gap;
    count++;
} return { minutes, count }; }
/** Ignore stays between requested cities; only count connections within a leg. */
function flightConnections(flight, routes) { if (!routes || routes.length <= 1)
    return connections(flight.segments); let index = 0, minutes = 0, count = 0; for (const route of routes) {
    const first = flight.segments[index];
    if (!first || first.from !== route.from || first.departure.slice(0, 10) !== route.date)
        return;
    const leg = [];
    while (index < flight.segments.length) {
        const segment = flight.segments[index++];
        leg.push(segment);
        if (segment.to === route.to)
            break;
    }
    if (leg.at(-1)?.to !== route.to)
        return;
    const gap = connections(leg);
    if (!gap)
        return;
    minutes += gap.minutes;
    count += gap.count;
} return index === flight.segments.length ? { minutes, count } : undefined; }
function itineraryConnections(flights, routes) { const values = flights.map(f => flightConnections(f, flights.length === 1 ? routes : undefined)); if (values.some(v => !v))
    return; const count = values.reduce((n, v) => n + v.count, 0); return count ? values.reduce((n, v) => n + v.minutes, 0) : undefined; }
