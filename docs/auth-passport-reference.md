# Authentication and passport form reference

Inspected ReasonToFlyy's public mobile sign-in modal, signup page and a fresh flight review's title, gender, nationality, passport issue date and expiry date controls on 26 October 2026. No external account or booking was created.

The app's shared authentication dialog now uses the reference's sign-in structure, email-or-mobile identifier, password visibility control, signup first/last names, optional email, country code/mobile, 10–26-character complexity checklist and offer-consent checkbox. Sign in and Create account are visible tabs at the top so signup is not hidden below the fold. The modal moves with the software keyboard and keeps its fields scrollable while typing.

The backend supports mobile-first registration and mobile sign-in while retaining email/password compatibility. Phone-only identities do not expose an internal email placeholder in responses. Duplicate mobile registrations are rejected. Offer consent is saved to preferences. The sign-in help screen offers ReasonToFlyy's support phone and email from its public site; it does not claim automatic email/SMS reset delivery, which requires an identity/delivery service.

Title and gender now use dropdowns. Nationality uses the complete ISO 3166-1 country/territory list with English Intl.DisplayNames labels and search; selected values remain ISO alpha-2 codes. Passport issue and expiry date controls use calendars with selectable month/year and bounded dates. The issue date cannot be in the future, and expiry must be after departure. Invalid date order and unknown nationality codes are rejected.

Passport fields are visible only after the traveller checks the non-Indian-passport box. Choosing a saved traveller does not automatically check it. Unchecked passport values are omitted from booking and profile submissions. When the fare requires passport information, an unchecked section blocks continuation with an explicit instruction rather than silently dropping the requirement. Issue date is validated and stored by this app API as passportIssue; no unverified new TripJack wire-field name was invented for its existing supplier booking contract.

Validation: all 76 regression tests passed, including mobile/email login, optional-email registration, duplicate mobile rejection, private identifier handling and consent storage. Updated checkout tests cover passport opt-in, issue/expiry ordering and actual country membership. Browser tests at 390px/320px verified dropdown choice, nationality search, issue/expiry calendars, checkbox visibility, title/gender consistency, show/hide password, signup with no email, mobile formatting, signup-to-owned-review continuation, saved passport data and booking payload. Test account/profile/booking responses were mocked in browser checks; API tests used in-memory stores. No real external account, booking or payment was submitted. TypeScript, web export and Android export passed.

[Sign in](previews/app-rtf-signin.png) · [Signup](previews/app-rtf-signup.png) · [Passport fields](previews/app-passport-controls.png) · [320px passport fields](previews/app-passport-controls-320.png)

## Titles, country flags, uppercase entry and account boundary

The website inspection confirmed that typing mixed-case traveller names changes the actual input value to uppercase. The app now normalizes traveller first/middle name, surname and passport number on input, including restored saved travellers. Email addresses and passwords are unaffected. Visible title options are Mr, Mrs and Ms only across checkout/profile forms; old saved Miss/Master values normalize to Ms/Mr when loaded. The supplier schema remains backward compatible with existing records.

Country selectors show the same country SVG source used by the reference (`cloud.common-cdn.com/images/country/flags/{iso}.svg`) beside both option labels and the current selection. A local Unicode-flag fallback handles unavailable assets. The long nationality list is virtualized to avoid eagerly fetching every flag. Country-code selection also shows the corresponding flag.

The live website and this app do not share an account database or identity provider. The app authenticates against its local SQLite users/scrypt hashes; website credentials therefore cannot be verified here. The login form/error now explains the account boundary rather than suggesting that a working website password is wrong. Sharing website accounts requires its supported authentication API/SSO configuration or an authorized backend integration. No credentials were sent to an unverified external login endpoint, and no website passwords were requested.

80 regression tests passed. Browser checks verified only three titles, real flag display, uppercase values, preserved password case/show-hide behavior, and correct passport data in the captured booking payload. TypeScript, web and Android builds passed. Existing reference/test screenshots were refreshed.
