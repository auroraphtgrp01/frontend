#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
SRC_GATEWAY="${ROOT_DIR}/core/gateway"
DST_GATEWAY="${SCRIPT_DIR}/gateway"

has_bundled_gateway() {
  [[ -f "${DST_GATEWAY}/krakend.tmpl" ]] && [[ -d "${DST_GATEWAY}/partials" ]] && [[ -d "${DST_GATEWAY}/settings" ]]
}

if [[ -d "${SRC_GATEWAY}" ]]; then
  mkdir -p "${DST_GATEWAY}"
  rm -rf "${DST_GATEWAY}/partials" "${DST_GATEWAY}/settings"
  cp "${SRC_GATEWAY}/krakend.tmpl" "${DST_GATEWAY}/krakend.tmpl"
  cp -R "${SRC_GATEWAY}/partials" "${DST_GATEWAY}/partials"
  cp -R "${SRC_GATEWAY}/settings" "${DST_GATEWAY}/settings"
  echo "synced gateway config to ${DST_GATEWAY}"
  exit 0
fi

if has_bundled_gateway; then
  echo "source core/gateway not found, using bundled gateway config in ${DST_GATEWAY}"
  exit 0
fi

echo "gateway config missing."
echo "on source machine, run deploy/api-full/sync-gateway.sh first, then copy deploy/api-full to target machine."
exit 1
