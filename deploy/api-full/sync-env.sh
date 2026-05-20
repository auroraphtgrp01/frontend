#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/../.." && pwd)"
ENV_DIR="${SCRIPT_DIR}/env"

mkdir -p "${ENV_DIR}"

copy_env() {
  local module_name="$1"
  local src="${ROOT_DIR}/core/modules/${module_name}/.env.example"
  local dst="${ENV_DIR}/${module_name}.env"

  if [[ ! -f "${src}" ]]; then
    echo "missing env template: ${src}" >&2
    exit 1
  fi

  cp "${src}" "${dst}"
  echo "synced ${dst}"
}

copy_env "identity-service"
copy_env "email-service"
copy_env "notification-service"
copy_env "media-service"
copy_env "order-service"
copy_env "exam-service"

echo "env sync done."
