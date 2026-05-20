#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin not found"
  exit 1
fi

if [[ -n "${GHCR_TOKEN:-}" && -n "${GHCR_USERNAME:-}" ]]; then
  echo "==> Refresh GHCR login from environment"
  if ! echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin >/dev/null 2>&1; then
    echo "warning: GHCR login refresh failed, will continue and rely on existing docker credentials"
  fi
fi

"${SCRIPT_DIR}/sync-env.sh"
"${SCRIPT_DIR}/sync-gateway.sh"

echo "==> Pull latest images"
PULL_OUTPUT="$(docker compose -f "${COMPOSE_FILE}" pull 2>&1)"
PULL_EXIT_CODE=$?
echo "${PULL_OUTPUT}"

if [[ ${PULL_EXIT_CODE} -ne 0 ]]; then
  if printf '%s\n' "${PULL_OUTPUT}" | rg -i "unauthorized|denied|authentication required" >/dev/null 2>&1; then
    echo
    echo "pull failed due to registry authentication."
    echo "set GHCR_USERNAME + GHCR_TOKEN (read:packages) and rerun, or docker login ghcr.io manually."
  fi
  exit ${PULL_EXIT_CODE}
fi

UPDATED_LINES="$(printf '%s\n' "${PULL_OUTPUT}" | rg "Downloaded newer image for" || true)"
UPTODATE_LINES="$(printf '%s\n' "${PULL_OUTPUT}" | rg "Image is up to date for" || true)"
NO_UPDATE_LINES="$(printf '%s\n' "${PULL_OUTPUT}" | rg "Skipped - No image to be pulled" || true)"

echo
echo "==> Pull summary"
if [[ -n "${UPDATED_LINES}" ]]; then
  echo "[updated]"
  printf '%s\n' "${UPDATED_LINES}"
else
  echo "[updated]"
  echo "none"
fi

if [[ -n "${UPTODATE_LINES}" || -n "${NO_UPDATE_LINES}" ]]; then
  echo "[unchanged]"
  [[ -n "${UPTODATE_LINES}" ]] && printf '%s\n' "${UPTODATE_LINES}"
  [[ -n "${NO_UPDATE_LINES}" ]] && printf '%s\n' "${NO_UPDATE_LINES}"
else
  echo "[unchanged]"
  echo "none"
fi

if [[ -n "${UPDATED_LINES}" ]]; then
  echo
  echo "==> Apply updated images (recreate only changed services)"
  docker compose -f "${COMPOSE_FILE}" up -d
else
  echo
  echo "==> No new images. Skip recreate."
fi

echo "==> Service status"
docker compose -f "${COMPOSE_FILE}" ps

echo
echo "Gateway: http://localhost:9080"
echo "RabbitMQ UI: http://localhost:15672 (guest/guest)"
