#!/usr/bin/env bash
# Files a governed change request that grants or revokes ONE realm role for a user.
# Nothing changes until a council member (tide-realm-admin) approves it in
# TideCloak Dashboard -> QEA Approvals -> View -> Authorize (Tide window: Y -> Submit Approvals).
# TideCloak allows one pending change per user, so approve each request before filing the next.
#
# Usage:  bash init/role.sh grant  corpus-reader   [username]
#         bash init/role.sh grant  _tide_decryptor [username]
#         bash init/role.sh revoke corpus-reader   [username]
#         bash init/role.sh status                 [username]
set -euo pipefail
ACTION="${1:?grant|revoke|status}"
TC="${TIDECLOAK_LOCAL_URL:-http://localhost:8080}"
REALM="${NEW_REALM_NAME:-langtrust}"
JQ="$(command -v jq || ls "$LOCALAPPDATA"/Microsoft/WinGet/Packages/jqlang.jq*/jq.exe 2>/dev/null | head -1)"

TOKEN=$(curl -s -X POST "$TC/realms/master/protocol/openid-connect/token" \
  -d username="${KC_USER:-admin}" -d password="${KC_PASSWORD:-password}" -d grant_type=password -d client_id=admin-cli | "$JQ" -r .access_token)
api() { curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"; }

if [[ "$ACTION" == "status" ]]; then
  USERNAME="${2:-admin}"
else
  ROLE="${2:?role name}"; USERNAME="${3:-admin}"
fi
USER_ID=$(api "$TC/admin/realms/$REALM/users?username=$USERNAME&exact=true" | "$JQ" -r '.[0].id')

if [[ "$ACTION" != "status" ]]; then
  PENDING=$(api "$TC/admin/realms/$REALM/iga/change-requests?status=PENDING" | "$JQ" 'length')
  if [[ "$PENDING" != "0" ]]; then
    echo "There is already $PENDING pending change request. Approve it in QEA Approvals first, then run this again."
    exit 1
  fi
  BODY=$(api "$TC/admin/realms/$REALM/roles/$ROLE" | "$JQ" -c '[{id, name}]')
  METHOD=POST; [[ "$ACTION" == "revoke" ]] && METHOD=DELETE
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$TC/admin/realms/$REALM/users/$USER_ID/role-mappings/realm" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY")
  echo "Filed: $ACTION '$ROLE' for '$USERNAME' (HTTP $CODE). Now approve it in TideCloak Dashboard -> QEA Approvals."
fi

echo "Pending change requests: $(api "$TC/admin/realms/$REALM/iga/change-requests?status=PENDING" | "$JQ" -c '[.[] | .actionType]')"
echo "Roles of '$USERNAME' now:  $(api "$TC/admin/realms/$REALM/users/$USER_ID/role-mappings/realm" | "$JQ" -c '[.[].name | select(startswith("default-roles") | not)]')"
