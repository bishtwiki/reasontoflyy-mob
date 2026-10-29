"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotelStay = hotelStay;
exports.hotelPolicyDate = hotelPolicyDate;
exports.hotelCancellation = hotelCancellation;
const hotelFilters_1 = require("./hotelFilters");
function hotelStay(query) { const nights = Math.max(1, Math.round((Date.parse(query.checkOut) - Date.parse(query.checkIn)) / 86400000)); const rooms = query.rooms.length; const guests = query.rooms.reduce((n, r) => n + r.adults + r.children, 0); return { nights, rooms, guests, nightsLabel: `${nights} night${nights === 1 ? '' : 's'}`, guestsLabel: `${rooms} room${rooms === 1 ? '' : 's'}, ${guests} guest${guests === 1 ? '' : 's'}` }; }
function hotelPolicyDate(value) { if (!value)
    return ''; const d = new Date((0, hotelFilters_1.hotelPolicyTimestamp)(value)); return Number.isFinite(d.getTime()) ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : value; }
function hotelCancellation(option) { const kind = (0, hotelFilters_1.cancellationKind)(option); if (kind === 'non-refundable')
    return { title: 'Non-refundable from the moment it is booked', note: 'No free window on this rate', kind }; if (kind === 'free')
    return { title: option.cancellationDeadline ? `Free cancellation until ${hotelPolicyDate(option.cancellationDeadline)}` : 'Free cancellation available', note: 'Charges apply after the free cancellation period. See the rate policy.', kind }; if (kind === 'partial')
    return { title: 'Cancellation charges apply', note: 'A partial refund may be available under this rate’s policy.', kind }; if (kind === 'refundable')
    return { title: 'Refundable rate', note: 'Check the cancellation schedule for applicable charges.', kind }; return { title: 'Cancellation terms not supplied', note: 'Confirm the cancellation policy before booking.', kind }; }
