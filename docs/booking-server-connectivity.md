# Mobile app booking server connectivity

The mobile app reads `EXPO_PUBLIC_API_URL` when the app bundle is built. Changing `.env.server` or `.env` does not update an APK that is already installed. The URL must include the API prefix, for example `http://192.168.1.15:8788/api`.

## Local network preview APK

Set the EAS **preview** environment URL to the host running the API:

```sh
eas env:set --name EXPO_PUBLIC_API_URL --value http://192.168.1.15:8788/api --environment preview --visibility plaintext
npm run build:android:apk
```

The phone and server must be on the same Wi-Fi network, the server must be running on port `8788`, and the router/firewall must allow the phone to connect. Check the API from the phone browser at `http://192.168.1.15:8788/api/health`. This LAN URL is for preview builds only.

## Store release

Store builds need an internet-reachable HTTPS API origin. Set that URL in the EAS **production** environment, ending in `/api`, before building. A private `192.168.x.x` address cannot be reached by users outside your local network. The preview build enables HTTP only for its LAN testing target; production still requires public HTTPS.

After changing an EAS environment value, build and reinstall the app because the API URL is embedded into the JavaScript bundle at build time.
