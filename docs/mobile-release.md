# Android and iOS release builds

The app uses Expo managed builds. EAS profiles are provided for a device-installable Android APK (`preview`), a Google Play Android App Bundle (`production`), and an App Store iOS build (`production`).

## Required before a release build

1. Deploy the API on a public host with HTTPS and persistent storage for `DATABASE_PATH`. A phone installed from an app store cannot reach the development LAN URL. The app base URL must end in `/api`. A Render Blueprint and Docker image are included. Connect the repo to Render and create the Blueprint; enter the production TripJack API key in Render's secret prompt. The blueprint uses TripJack production endpoints. Its plan includes a paid Starter web service and a 1 GB persistent disk, because Render disks require a paid service. Review Render's current pricing before creating it.
2. In the Expo project, set `EXPO_PUBLIC_API_URL` for the `preview` and `production` EAS environments. It is a public app setting, not a secret. Example:

   ```sh
   eas env:set --name EXPO_PUBLIC_API_URL --value https://api.example.com/api --environment production --visibility plaintext
   ```

3. Keep TripJack and PayU credentials on the API server only. Do not create `EXPO_PUBLIC_` variables for credentials.
4. Sign in to EAS and initialize this project once with `eas init`. Review and retain the generated EAS project ID.
5. Confirm that `com.reasontoflyy.app` is available and is the intended permanent Android package / iOS bundle ID. If the app already exists in either store, use that store listing's exact identifier instead before the first build.
6. For iOS device and App Store builds, configure an Apple Developer team and signing credentials in EAS. For Play submission, configure a Google Play service account and create the app listing first.

After the API deployment is healthy, set its public URL with `/api` as the EAS `EXPO_PUBLIC_API_URL`. PayU Hosted Checkout is connected, but live checkout stays disabled until TripJack can confirm production bookings.

The pre-install hook rejects preview and production builds if `EXPO_PUBLIC_API_URL` is missing, private-network, non-HTTPS, or missing the `/api` prefix.

## Build commands

```sh
npm install -g eas-cli
eas login
eas init

# Install on an Android device
npm run build:android:apk

# Google Play upload artifact (.aab)
npm run build:android:store

# App Store signed iOS artifact (.ipa)
npm run build:ios:store
```

EAS provides the completed artifact download URL after each remote build. App Store and Play submissions remain separate steps:

```sh
npm run submit:android
npm run submit:ios
```

Review store listing details, privacy policy, data safety disclosures, screenshots, age ratings, and payment/ticketing readiness in each console before submitting. Builds do not deploy the API or enable live ticket issuance by themselves.

## Current supplier/payment gate

The server can use production TripJack endpoints for search, but deliberately rejects live booking and reports live payment as unavailable. That gate must remain until TripJack production access and UAT certification are approved and a production payment flow is implemented and verified. Store binaries can be built and distributed before that, but live ticket purchase cannot be advertised as enabled yet.
