#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/reports/results"
mkdir -p "${OUT_DIR}"

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "[i] Ensure the backend was started with LOADTEST=1 (bypasses the 200 req/15min rate limiter)."

k6 run \
  "${ROOT_DIR}/k6/spike.js" \
  --summary-export "${OUT_DIR}/spike-summary.json" \
  -e BASE_URL="${BASE_URL}"
