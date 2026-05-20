# API Full Deploy Bundle

This folder contains everything needed to run the full backend API stack.

## What is included

- `docker-compose.yml`: full stack (krakend + infra + API services by image)
- `sync-env.sh`: copy env templates from module `.env.example` files
- `sync-gateway.sh`: copy KrakenD runtime config into this deploy bundle
- `up.sh`: sync env, pull latest images, then start stack
- `down.sh`: stop stack

## Important

App service env is not hardcoded in compose.  
Compose reads only from files in `deploy/api-full/env/*.env`, and those files are copied from module `.env.example`.

Krakend also uses only local deploy folder path: `deploy/api-full/gateway`.

## Start

Run directly:

```bash
chmod +x deploy/api-full/*.sh
deploy/api-full/up.sh
```

Optional (recommended): set env once so `up.sh` can auto-refresh GHCR login:

```bash
export GHCR_USERNAME="<your-github-username>"
export GHCR_TOKEN="<token-with-read-packages>"
```

If you hit GHCR auth error (first time login / token expired), run manual login:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

For portable bundle to another machine:

```bash
deploy/api-full/sync-env.sh
deploy/api-full/sync-gateway.sh
tar -czf api-full-bundle.tgz deploy/api-full
```

Then copy and run on target machine:

```bash
tar -xzf api-full-bundle.tgz
chmod +x deploy/api-full/*.sh
deploy/api-full/up.sh
```

## Stop

```bash
deploy/api-full/down.sh
```

## Exam attempts (`POST /api/v1/attempts`)

The bundled KrakenD config forwards `/api/v1/attempts*` to **host port 8087** (see `gateway/partials/exam_attempt_endpoints.tmpl`), so it does not hit **order-service** on 8085. **exam-attempt-service** defaults to `APP_PORT=8087`; apply its DB migrations before calling those routes, or you get errors from a missing upstream.

## Optional: pin image tags

Default is `latest`. You can set tags before `up.sh`:

```bash
export IDENTITY_TAG=v0.0.123
export EMAIL_TAG=v0.0.123
export NOTIFICATION_TAG=v0.0.123
export MEDIA_TAG=v0.0.123
export ORDER_TAG=v0.0.123
export EXAM_TAG=v0.0.123
deploy/api-full/up.sh
```
