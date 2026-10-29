# PayU Hosted Checkout

PayU Hosted Checkout is the configured payment gateway. The app requests a payment session from the API; the API builds the signed PayU form and sends the customer to PayU. The merchant salt and key stay on the server. On return, the API checks PayU's response hash and independently calls PayU's `verify_payment` API before recording a successful payment.

Server configuration uses `PAYU_MERCHANT_KEY`, `PAYU_SALT`, and `PAYU_ENV=production` (or `test` for a PayU test account). Never put these values in an `EXPO_PUBLIC_` variable or the mobile bundle.

Live checkout is intentionally disabled until TripJack production booking can be confirmed and payment failure/refund handling is connected. The API reports whether credentials are configured, but does not create a PayU payment session while this gate is closed. This avoids collecting money for an unconfirmed ticket.

When TripJack production access is approved, finish the booking-to-payment sequence, payment reconciliation, cancellation/refund behavior, then enable the checkout gate and verify the full flow with PayU before accepting customer payments.
