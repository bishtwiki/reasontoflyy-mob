"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyHotelFilters = void 0;
exports.hotelPolicyTimestamp = hotelPolicyTimestamp;
exports.cancellationKind = cancellationKind;
exports.applyHotelFilters = applyHotelFilters;
const emptyHotelFilters = () => ({ name: '', area: '', minPrice: '', maxPrice: '', stars: [], cancellation: [], meals: [], types: [], amenities: [] });
exports.emptyHotelFilters = emptyHotelFilters;
function hotelPolicyTimestamp(value) { return Date.parse(/Z$|[+-]\d{2}:?\d{2}$/.test(value) ? value : value + '+05:30'); }
function cancellationKind(option) { if (option.cancellationKnown === false)
    return 'unknown'; if (option.refundable) {
    const deadline = option.cancellationDeadline ? hotelPolicyTimestamp(option.cancellationDeadline) : NaN;
    if (Number.isFinite(deadline) && deadline > Date.now())
        return 'free';
    const current = option.penalties.find(p => hotelPolicyTimestamp(p.from) <= Date.now() && hotelPolicyTimestamp(p.to) > Date.now());
    if (current?.amount === 0)
        return 'free';
    return current ? 'partial' : 'refundable';
} return 'non-refundable'; }
function applyHotelFilters(hotels, filters, sort = 'price') {
    return hotels.flatMap(hotel => {
        if (filters.name && !hotel.name.toLowerCase().includes(filters.name.toLowerCase()))
            return [];
        if (filters.area && !`${hotel.name} ${hotel.address} ${hotel.city || ''}`.toLowerCase().includes(filters.area.toLowerCase()))
            return [];
        if (filters.stars.length && !filters.stars.includes(Math.round(hotel.stars)))
            return [];
        if (filters.types.length && !filters.types.includes(hotel.propertyType || ''))
            return [];
        if (filters.amenities.length && !filters.amenities.every(value => hotel.amenities.includes(value)))
            return [];
        const options = hotel.options.filter(option => (!filters.meals.length || filters.meals.includes(option.meal)) && (!filters.cancellation.length || filters.cancellation.includes(cancellationKind(option))) && (filters.minPrice === '' || option.amount >= Number(filters.minPrice)) && (filters.maxPrice === '' || option.amount <= Number(filters.maxPrice)));
        if (!options.length)
            return [];
        return [{ ...hotel, options, amount: Math.min(...options.map(option => option.amount)) }];
    }).sort((a, b) => sort === 'distance' ? (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity) : sort === 'price-desc' ? b.amount - a.amount : sort === 'rating' ? b.stars - a.stars : sort === 'name' ? a.name.localeCompare(b.name) : a.amount - b.amount);
}
