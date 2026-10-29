"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.travellerTitles = void 0;
exports.normalizeTraveller = normalizeTraveller;
exports.updateTraveller = updateTraveller;
exports.countryFlag = countryFlag;
exports.travellerTitles = ['Mr', 'Mrs', 'Ms'];
function normalizeTraveller(value) { return { ...value, title: value.title === 'Miss' ? 'Ms' : value.title === 'Master' ? 'Mr' : value.title, firstName: value.firstName.toUpperCase(), lastName: value.lastName.toUpperCase(), ...(value.passport ? { passport: value.passport.toUpperCase() } : {}), ...(value.nationality ? { nationality: value.nationality.toUpperCase() } : {}) }; }
function updateTraveller(value, patch) { const next = normalizeTraveller({ ...value, ...patch }); if (patch.title)
    next.gender = next.title === 'Mr' ? 'MALE' : 'FEMALE'; if (patch.gender)
    next.title = patch.gender === 'FEMALE' ? (next.title === 'Mrs' ? 'Mrs' : 'Ms') : 'Mr'; return next; }
function countryFlag(code) { return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0))) : ''; }
