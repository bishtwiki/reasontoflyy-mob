#!/usr/bin/env bash
set -euo pipefail

# Runtime values are loaded from Secret Manager; never enable shell tracing here.
PROJECT_ID="vertexai-467906"
REGION="asia-south1"
IMAGE="asia-south1-docker.pkg.dev/vertexai-467906/reasontoflyy/api:20261028"
PUBLIC_HOST="34-93-165-144.sslip.io"
APP_DIR="/opt/reasontoflyy"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io python3
systemctl enable --now docker
mkdir -p "$APP_DIR" /data
DATA_DEVICE="/dev/disk/by-id/google-persistent-disk-1"
for attempt in $(seq 1 30); do
  [[ -b "$DATA_DEVICE" ]] && break
  sleep 2
done
[[ -b "$DATA_DEVICE" ]] || { echo "Persistent data disk did not appear" >&2; exit 1; }
if ! blkid "$DATA_DEVICE" >/dev/null 2>&1; then
  mkfs.ext4 -F "$DATA_DEVICE"
fi
DATA_UUID="$(blkid -s UUID -o value "$DATA_DEVICE")"
grep -q "$DATA_UUID" /etc/fstab || echo "UUID=$DATA_UUID /data ext4 defaults,nofail 0 2" >> /etc/fstab
mountpoint -q /data || mount /data
mkdir -p /data/reasontoflyy
chmod 700 "$APP_DIR"
chown 1000:1000 /data/reasontoflyy
chmod 700 /data/reasontoflyy

cat > "$APP_DIR/fetch-secrets.py" <<'PY'
import base64
import json
import urllib.request

project = "vertexai-467906"
secrets = {
    "TRIPJACK_API_KEY": "tripjack-api-key",
    "PAYU_MERCHANT_KEY": "payu-merchant-key",
    "PAYU_SALT": "payu-salt",
}

metadata = urllib.request.Request(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    headers={"Metadata-Flavor": "Google"},
)
with urllib.request.urlopen(metadata, timeout=10) as response:
    token = json.load(response)["access_token"]

values = {}
for env_name, secret_name in secrets.items():
    request = urllib.request.Request(
        f"https://secretmanager.googleapis.com/v1/projects/{project}/secrets/{secret_name}/versions/latest:access",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.load(response)["payload"]["data"]
    values[env_name] = base64.b64decode(payload).decode("utf-8")

config = {
    **values,
    "PORT": "8788",
    "DATABASE_PATH": "/data/travel.sqlite",
    "TRIPJACK_ENV": "production",
    "TRIPJACK_FLIGHT_BASE_URL": "https://api.tripjack.com",
    "TRIPJACK_HOTEL_BASE_URL": "https://hms-search.tripjack.com",
    "TRIPJACK_HOTEL_BOOKING_BASE_URL": "https://hms-booker.tripjack.com",
    "PAYU_ENV": "production",
    "ALLOW_PROVIDER_BOOKINGS": "true",
    "ALLOW_LIVE_BOOKINGS": "true",
    "PUBLIC_API_URL": f"https://{ '34-93-165-144.sslip.io' }",
    "ALLOWED_ORIGINS": "https://reasontoflyy.com,https://www.reasontoflyy.com,https://reasontoflyy-mobile-app.netlify.app",
}
with open("/opt/reasontoflyy/api.env", "w", encoding="utf-8") as env_file:
    for key, value in config.items():
        if "\n" in value or "\r" in value:
            raise ValueError(f"Invalid newline in {key}")
        env_file.write(f"{key}={value}\n")
PY
chmod 700 "$APP_DIR/fetch-secrets.py"
python3 "$APP_DIR/fetch-secrets.py"
chmod 600 "$APP_DIR/api.env"

token="$(python3 -c 'import json,urllib.request; r=urllib.request.Request("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",headers={"Metadata-Flavor":"Google"}); print(json.load(urllib.request.urlopen(r))["access_token"])')"
printf '%s' "$token" | docker login -u oauth2accesstoken --password-stdin "https://${REGION}-docker.pkg.dev" >/dev/null
docker pull "$IMAGE"
rm -f /root/.docker/config.json
docker network inspect rtf-net >/dev/null 2>&1 || docker network create rtf-net
docker rm -f rtf-api >/dev/null 2>&1 || true
docker run -d --name rtf-api --restart unless-stopped \
  --network rtf-net --network-alias rtf-api \
  --env-file "$APP_DIR/api.env" \
  -v /data/reasontoflyy:/data \
  "$IMAGE"

cat > "$APP_DIR/Caddyfile" <<EOF
${PUBLIC_HOST} {
  encode zstd gzip
  reverse_proxy rtf-api:8788
}
EOF
docker rm -f rtf-caddy >/dev/null 2>&1 || true
docker run -d --name rtf-caddy --restart unless-stopped \
  --network rtf-net \
  -p 80:80 -p 443:443 -p 443:443/udp \
  -v "$APP_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v rtf-caddy-data:/data -v rtf-caddy-config:/config \
  caddy:2
