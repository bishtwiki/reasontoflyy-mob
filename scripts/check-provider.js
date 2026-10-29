"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tripjack_1 = require("../server/tripjack");
const config_1 = require("../server/config");
const catalog_1 = require("../shared/catalog");
async function main() {
    console.log(`Checking TripJack ${config_1.config.environment} access. These requests do not create bookings.`);
    const provider = new tripjack_1.TripJack();
    for (const product of ['flights', 'hotels']) {
        try {
            const r = product === 'hotels' ? await provider.request('hotel', '/hms/v3/content/fetch-countries') : await provider.request('flight', '/fms/v1/air-search-all', { searchQuery: { cabinClass: 'ECONOMY', paxInfo: { ADULT: 1, CHILD: 0, INFANT: 0 }, routeInfos: [{ fromCityOrAirport: { code: 'DEL' }, toCityOrAirport: { code: 'BOM' }, travelDate: (0, catalog_1.dateAfter)(14) }] } });
            console.log(JSON.stringify({ product, success: true, results: product === 'hotels' ? r.hotelCountries?.length ?? 0 : Object.keys(r.searchResult?.tripInfos || {}).length }));
        }
        catch (e) {
            console.error(JSON.stringify({ product, success: false, message: e instanceof Error ? e.message : 'Provider access failed' }));
            process.exitCode = 1;
        }
    }
}
void main();
