#!/usr/bin/env sh
# Run Playwright e2e tests in Docker.
# Build the static site first if dist/ doesn't exist.
set -e

cd "$(dirname "$0")/.."

if [ ! -d "dist" ]; then
  echo "dist/ not found. Building static site..."
  npm run build
fi

echo "Running Playwright e2e tests in Docker..."
docker compose -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from playwright
