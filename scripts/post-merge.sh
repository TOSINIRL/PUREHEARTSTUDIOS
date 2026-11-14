#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# The site has no runtime dependencies; browser checks use the locked dev tools.
if [[ -f package-lock.json ]]; then
    npm ci --include=dev --no-audit --no-fund
fi

# Check the runtime files before workflow reconciliation restarts the server.
node --check server.mjs
for script in js/*.js; do
    node --check "$script"
done

printf 'Static site setup completed; browser test tools are ready.\n'
