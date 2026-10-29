# Mobile flight review and checkout

The supplied ReasonToFlyy review URL (trace 2634744) returned This fare is no longer available. Inspected a fresh public DEL–BOM fare review on 26 October 2026 through the site's search → Book flow (trace 2634780). No website account, payment or booking was created.

Observed mobile sections: flight/traveller/payment/ticket progress; itinerary and fare-rule action; one expandable traveller block per priced passenger with lead badge, title/names/gender and optional foreign-passport details; shared contact details and country code; payment/account status; fare/offers; and You pay. The fresh selected reference fare exposed no paid extras. The reference requires sign-in before payment; this app already authenticates before its supplier review.

## Implementation

Flight checkout now uses `src/screens/FlightCheckout.tsx`; hotel checkout retains its existing component. Flight review has warm gold/cream panels, itinerary/availability context, traveller accordions, document fields, saved-traveller selection and explicit profile saving, contact/GST fields, expandable reviewed fare breakup, conditions modal and fixed You pay/action footer. The main navigation is hidden during flight checkout to give the form and sticky footer space. Existing Flight details and Fare rules modals are reused unchanged.

`shared/flightCheckout.ts` validates names, title/gender, exact requested passenger types/count, contact, real DOB values, child/infant DOB requirements, passport requirements/expiry/nationality, PAN, GST, consent and review expiry. Gender is stored as optional traveller metadata for compatibility; the UI keeps gender and supplier title consistent. Supplier booking continues to use its existing traveller/title contract. Passport fields are omitted from submission when not requested and not opted into. The reviewed quote now includes its searchId so the selected fare's rules remain reachable.

Duplicate submits are guarded and use the same idempotency key. PRICE_CHANGED updates the quote, opens the fare breakup, resets consent and rotates the idempotency key; it requires explicit acceptance before a new request. Expiry offers a working return to flight search. Test payments use the existing test-payment integration and status polling. Production ticketing remains disabled according to backend capabilities.

The UI does not invent coupon eligibility, paid seat/meal/baggage purchase, a payment funded by test transactions, or live ticketing. Coupons and paid extras need additional supported backend contracts. Search passenger prices are not claimed to be revalidated passenger totals when the review response does not supply those totals. Baggage context uses the passenger-type API allowance when present.

## Validation

72 tests passed with consistent sandbox configuration, including five new checkout-validation cases. TypeScript, web export and Android export passed. Targeted validation tests also cover the final email-length guard.

Chrome checks at 320px and 390px verified Book → review navigation, fixed action visibility, no global bottom navigation, incomplete-form blocking, gender, passport fields, saved-traveller save/restore, GST, reviewed fare expansion, normalized contact payload, PRICE_CHANGED acceptance/idempotency-key rotation and demo-confirmation navigation. A separate browser test verified expired-review search recovery, production-action disabling, mocked test-checkout popup opening and status polling to TEST_PAID. All writes/payments/bookings in browser checks were intercepted; supplier/payment regression tests used mocks. No real booking, payment or cancellation was submitted.

[390px review](previews/flight-checkout-390.png) · [320px review](previews/flight-checkout-320.png) · [Fare section](previews/flight-checkout-fare.png)

## Review before sign-in

Book now opens flight review for guests in one-way, round-trip and multi-city results. `/api/flights/preview` accepts only flight-search/fare IDs, revalidates the selected fare, returns a preview without the supplier booking reference, and removes its temporary quote. Preview IDs cannot be used for bookings, seat access or payments. The authenticated `/api/review` and private booking/payment routes retain authentication and owner checks.

The checkout footer requests sign-in only when continuing. After authentication it requests a fresh owned review for the exact flight IDs, preserves entered traveller/contact/GST fields and requires another explicit confirmation before booking. A changed price resets acceptance. Saved-traveller writes and PayU checkout require sign-in; checkout appears only after an owned review is obtained and remains disabled until live supplier booking is available.

74 regression tests passed. Browser tests confirmed anonymous Book → review without a login modal, sign-in at Continue, authenticated revalidation, preserved entered names/contact, and no booking/payment submission. TypeScript and web export passed. This supersedes the earlier note that authentication happens before the supplier review.
