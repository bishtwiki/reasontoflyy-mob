"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotelPoints = hotelPoints;
exports.hotelAmenityGroups = hotelAmenityGroups;
// Preserve provider wording while breaking paragraphs into readable points.
function hotelPoints(text) { return text.replace(/\r/g, '').replace(/([.!?])\s+(?=[A-Z])/g, '$1\n').split(/\n+/).map(line => line.replace(/^\s*[•●▪]\s*/, '').trim()).filter(Boolean); }
function hotelAmenityGroups(values) { const groups = [{ title: 'Comfort & connectivity', pattern: /wifi|wi-fi|internet|air condition|heating|television|tv\b/i }, { title: 'Food & drink', pattern: /restaurant|breakfast|dining|bar\b|lounge|coffee|tea\b|food|fruits/i }, { title: 'Guest services', pattern: /front desk|reception|housekeep|laundry|luggage|concierge|room service|porter|ticket/i }, { title: 'Access & safety', pattern: /accessible|wheelchair|lift|elevator|parking|security|alarm|extinguisher|first aid|safe|cctv/i }, { title: 'More facilities', pattern: /.*/ }]; const buckets = new Map(); for (const value of values) {
    const title = groups.find(group => group.pattern.test(value)).title;
    buckets.set(title, [...(buckets.get(title) || []), value]);
} return [...buckets].map(([title, items]) => ({ title, text: items.join('\n') })); }
