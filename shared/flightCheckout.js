"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFlightCheckout = validateFlightCheckout;
const countries_1 = require("./countries");
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
function validateFlightCheckout({ quote, travellers, email, phone, accept, foreign = {}, gst }) {
    const errors = {};
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const departure = quote.flights?.[0]?.segments[0]?.departure.slice(0, 10) || today;
    if (quote.expiresAt <= Date.now())
        errors.expired = 'This fare review has expired. Search again to continue.';
    if (travellers.length !== quote.travellers.length)
        errors.travellers = 'Traveller count must match the selected fare.';
    travellers.forEach((t, i) => {
        const set = (key, message) => { errors[`traveller.${i}.${key}`] = `${{ ADULT: 'Adult', CHILD: 'Child', INFANT: 'Infant' }[t.type]} ${i + 1}: ${message}`; };
        if (t.type !== quote.travellers[i]?.type)
            set('type', 'traveller type must match the selected fare.');
        if (!['Mr', 'Mrs', 'Ms'].includes(t.title))
            set('title', 'select a title.');
        if (t.firstName.trim().length < 2 || t.firstName.trim().length > 60 || !/^[\p{L} .'-]+$/u.test(t.firstName))
            set('firstName', 'enter the first and middle name as on the ID.');
        if (!t.lastName.trim() || t.lastName.trim().length > 60 || !/^[\p{L} .'-]+$/u.test(t.lastName))
            set('lastName', 'enter the last name as on the ID.');
        if (!t.gender)
            set('gender', 'select a gender.');
        if (t.type !== 'ADULT' && !t.dob)
            set('dob', 'date of birth is required.');
        if (t.dob && (!validDate(t.dob) || t.dob > today || t.dob > departure))
            set('dob', 'enter a valid date of birth.');
        if (quote.passportRequired && !foreign[i])
            set('passportOptIn', 'enable passport details to continue with this fare.');
        if (foreign[i]) {
            if (!t.passport?.trim() || t.passport.trim().length > 30)
                set('passport', 'enter the passport number.');
            if (!t.passportIssue || !validDate(t.passportIssue) || t.passportIssue > today)
                set('passportIssue', 'enter a valid passport issue date.');
            if (t.passportIssue && t.passportExpiry && t.passportIssue >= t.passportExpiry)
                set('passportIssue', 'issue date must be before expiry date.');
            if (!t.passportExpiry || !validDate(t.passportExpiry) || t.passportExpiry <= departure)
                set('passportExpiry', 'passport expiry must be after departure.');
            if (!countries_1.countries.some(country => country.value === t.nationality))
                set('nationality', 'select a nationality from the country list.');
        }
        if (quote.panRequired && !/^[A-Z]{5}\d{4}[A-Z]$/.test(t.pan || ''))
            set('pan', 'enter a valid PAN number.');
    });
    if (email.trim().length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        errors.email = 'Enter a valid email address.';
    if (!/^\+?[1-9]\d{7,14}$/.test(phone))
        errors.phone = 'Enter a valid mobile number with country code.';
    if (gst) {
        if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gst.gstNumber))
            errors.gstNumber = 'Enter a valid GSTIN.';
        if (gst.registeredName.trim().length < 2 || gst.registeredName.length > 100)
            errors.registeredName = 'Enter the registered business name.';
    }
    if (!accept)
        errors.accept = 'Please accept the fare and cancellation conditions.';
    return errors;
}
