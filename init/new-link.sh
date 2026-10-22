#!/usr/bin/env bash
# Mints a fresh Tide enrolment ("link your Tide account") URL for a realm user.
# Usage: bash init/new-link.sh [username]   (default: admin)
set -euo pipefail
TC="${TIDECLOAK_LOCAL_URL:-http://localhost:8080}"
REALM="${NEW_REALM_NAME:-langtrust}"
USERNAME="${1:-admin}"
JQ="$(command -v jq || ls "$LOCALAPPDATA"/Microsoft/WinGet/Packages/jqlang.jq*/jq.exe 2>/dev/null | head -1)"

TOKEN=$(curl -s -X POST "$TC/realms/master/protocol/openid-connect/token" \
  -d username="${KC_USER:-admin}" -d password="${KC_PASSWORD:-password}" -d grant_type=password -d client_id=admin-cli | "$JQ" -r .access_token)
USER_ID=$(curl -s "$TC/admin/realms/$REALM/users?username=$USERNAME&exact=true" -H "Authorization: Bearer $TOKEN" | "$JQ" -r '.[0].id')
LINK=$(curl -s -X POST "$TC/admin/realms/$REALM/tideAdminResources/get-required-action-link?userId=$USER_ID&lifespan=3600" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -H "Accept: text/plain" -d '["link-tide-account-action"]')
echo "Enrolment link for '$USERNAME' (valid 1 hour):"
echo "$LINK"
