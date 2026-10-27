import dotenv from 'dotenv';
dotenv.config({ path: '.env.server', quiet: true });
export const config = {
  port: Number(process.env.PORT || 4000), key: process.env.TRIPJACK_API_KEY || '',
  environment: process.env.TRIPJACK_ENV === 'production' ? 'production' : 'sandbox',
  flightBase: process.env.TRIPJACK_FLIGHT_BASE_URL || 'https://apitest.tripjack.com',
  hotelBase: process.env.TRIPJACK_HOTEL_BASE_URL || 'https://apitest-hms.tripjack.com',
  hotelBookingBase: process.env.TRIPJACK_HOTEL_BOOKING_BASE_URL || 'https://apitest-hotel-booker.tripjack.com',
  allowBookings: process.env.ALLOW_PROVIDER_BOOKINGS === 'true',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET || '',
  publicApiUrl: (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, ''),
  database: process.env.DATABASE_PATH || './data/travel.sqlite',
  origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:8085,http://127.0.0.1:8085').split(','),
};
for (const base of [config.flightBase,config.hotelBase,config.hotelBookingBase]) {
  const u=new URL(base);
  if(u.protocol!=='https:' || !(u.hostname==='tripjack.com'||u.hostname.endsWith('.tripjack.com'))) throw new Error('Provider hosts must be official HTTPS TripJack hosts.');
  if(config.environment==='sandbox' && !u.hostname.startsWith('apitest')) throw new Error('Sandbox mode must use apitest TripJack hosts.');
}
