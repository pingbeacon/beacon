#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Load .env from the same directory as this script
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.example and fill in API_TOKEN."
  exit 1
fi

# Parse .env manually — avoids shell interpolation of special chars (|, $, etc.)
while IFS= read -r line || [[ -n "$line" ]]; do
  # skip comments and blank lines
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  # split on first =
  key="${line%%=*}"
  val="${line#*=}"
  # strip surrounding quotes if present
  val="${val%\"}"
  val="${val#\"}"
  val="${val%\'}"
  val="${val#\'}"
  export "$key=$val"
done < "$ENV_FILE"

API_TOKEN="${API_TOKEN:?API_TOKEN not set in $ENV_FILE}"
BASE_URL="${BASE_URL:-http://localhost}"
CLEANUP="${CLEANUP:-true}"
API="$BASE_URL/api/v1"
RUN_ID="$(date +%s)-$$"
SP_SLUG="test-api-sh-sp-${RUN_ID}"
CURL_OPTS=(--connect-timeout 5 --max-time 30)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

PASS=0
FAIL=0

header() {
  echo
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${CYAN}  $1${RESET}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════${RESET}"
}

run() {
  local label="$1"
  shift
  local response http_code body

  response=$(curl -s "${CURL_OPTS[@]}" -w "\n__HTTP_CODE__%{http_code}" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "$@")

  http_code=$(echo "$response" | grep -o '__HTTP_CODE__[0-9]*' | sed 's/__HTTP_CODE__//')
  body=$(echo "$response" | sed 's/__HTTP_CODE__[0-9]*$//')

  if [[ "$http_code" =~ ^2 ]]; then
    echo -e "${GREEN}✓${RESET} ${BOLD}$label${RESET} → HTTP $http_code"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}✗${RESET} ${BOLD}$label${RESET} → HTTP $http_code"
    echo -e "  ${YELLOW}$body${RESET}"
    FAIL=$((FAIL + 1))
  fi

  echo "$body"
}

extract() {
  # extract JSON field: extract <field> <json>
  echo "$2" | grep -o "\"$1\":[^,}]*" | head -1 | sed 's/.*: *//;s/"//g'
}

# ---------------------------------------------------------------------------
# Auth check
# ---------------------------------------------------------------------------
header "Auth"

echo -e "${YELLOW}Auth:${RESET} token loaded"

bad_response=$(curl -s "${CURL_OPTS[@]}" -o /dev/null -w "%{http_code}" \
  --max-redirs 0 \
  -H "Accept: application/json" \
  "$API/monitors")

if [[ "$bad_response" =~ ^4 ]]; then
  echo -e "${GREEN}✓${RESET} Unauthenticated request blocked → HTTP $bad_response"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗${RESET} Unauthenticated request not blocked → HTTP $bad_response"
  FAIL=$((FAIL + 1))
fi

# ---------------------------------------------------------------------------
# Monitors — CRUD
# ---------------------------------------------------------------------------
header "Monitors"

# List
list_response=$(run "GET /monitors" "$API/monitors")

# Create
create_response=$(run "POST /monitors" -X POST "$API/monitors" \
  -d '{
    "name": "test-api-sh HTTP Monitor",
    "type": "http",
    "url": "https://example.com",
    "method": "GET",
    "interval": 60,
    "timeout": 30
  }')

MONITOR_ID=$(extract id "$create_response")

if [[ -z "$MONITOR_ID" || "$MONITOR_ID" == "null" ]]; then
  echo -e "${RED}  Could not extract monitor ID — skipping dependent tests${RESET}"
  MONITOR_ID=""
else
  echo -e "  Monitor ID: ${YELLOW}$MONITOR_ID${RESET}"

  # Show
  run "GET /monitors/$MONITOR_ID" "$API/monitors/$MONITOR_ID"

  # Update
  run "PUT /monitors/$MONITOR_ID" -X PUT "$API/monitors/$MONITOR_ID" \
    -d '{
      "name": "test-api-sh HTTP Monitor (updated)",
      "interval": 120
    }'

  # Show after update
  run "GET /monitors/$MONITOR_ID (after update)" "$API/monitors/$MONITOR_ID"
fi

# Create TCP monitor
tcp_response=$(run "POST /monitors (TCP)" -X POST "$API/monitors" \
  -d '{
    "name": "test-api-sh TCP Monitor",
    "type": "tcp",
    "host": "example.com",
    "port": 443,
    "interval": 60
  }')

TCP_MONITOR_ID=$(extract id "$tcp_response")
[[ -n "$TCP_MONITOR_ID" && "$TCP_MONITOR_ID" != "null" ]] && \
  echo -e "  TCP Monitor ID: ${YELLOW}$TCP_MONITOR_ID${RESET}"

# Create Push monitor
push_response=$(run "POST /monitors (Push)" -X POST "$API/monitors" \
  -d '{
    "name": "test-api-sh Push Monitor",
    "type": "push",
    "interval": 3600
  }')

PUSH_MONITOR_ID=$(extract id "$push_response")
[[ -n "$PUSH_MONITOR_ID" && "$PUSH_MONITOR_ID" != "null" ]] && \
  echo -e "  Push Monitor ID: ${YELLOW}$PUSH_MONITOR_ID${RESET}"

# Validation error test
header "Monitor Validation"

validation_response=$(curl -s "${CURL_OPTS[@]}" -w "\n__HTTP_CODE__%{http_code}" \
  -X POST "$API/monitors" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{}')

val_code=$(echo "$validation_response" | grep -o '__HTTP_CODE__[0-9]*' | sed 's/__HTTP_CODE__//')
val_body=$(echo "$validation_response" | sed 's/__HTTP_CODE__[0-9]*$//')

if [[ "$val_code" == "422" ]]; then
  echo -e "${GREEN}✓${RESET} ${BOLD}POST /monitors (missing fields)${RESET} → HTTP 422 (expected)"
  echo -e "  Code: $(extract code "$val_body")"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗${RESET} Expected 422, got $val_code"
  FAIL=$((FAIL + 1))
fi

# ---------------------------------------------------------------------------
# Heartbeats
# ---------------------------------------------------------------------------
header "Heartbeats"

if [[ -n "$MONITOR_ID" ]]; then
  run "GET /monitors/$MONITOR_ID/heartbeats" \
    "$API/monitors/$MONITOR_ID/heartbeats"

  run "GET /monitors/$MONITOR_ID/heartbeats?per_page=5" \
    "$API/monitors/$MONITOR_ID/heartbeats?per_page=5"
else
  echo -e "${YELLOW}  Skipped — no monitor ID${RESET}"
fi

# ---------------------------------------------------------------------------
# Incidents
# ---------------------------------------------------------------------------
header "Incidents"

if [[ -n "$MONITOR_ID" ]]; then
  run "GET /monitors/$MONITOR_ID/incidents" \
    "$API/monitors/$MONITOR_ID/incidents"
else
  echo -e "${YELLOW}  Skipped — no monitor ID${RESET}"
fi

# ---------------------------------------------------------------------------
# Status Pages — CRUD
# ---------------------------------------------------------------------------
header "Status Pages"

# List
run "GET /status-pages" "$API/status-pages"

# Create
sp_response=$(run "POST /status-pages" -X POST "$API/status-pages" \
  -d "{
    \"title\": \"test-api-sh Status Page\",
    \"slug\": \"$SP_SLUG\",
    \"description\": \"Created by test-api.sh\",
    \"is_published\": false
  }")

STATUS_PAGE_ID=$(extract id "$sp_response")

if [[ -z "$STATUS_PAGE_ID" || "$STATUS_PAGE_ID" == "null" ]]; then
  echo -e "${YELLOW}  Could not extract status page ID (slug may already exist)${RESET}"
  STATUS_PAGE_ID=""
else
  echo -e "  Status Page ID: ${YELLOW}$STATUS_PAGE_ID${RESET}"

  # Show
  run "GET /status-pages/$STATUS_PAGE_ID" "$API/status-pages/$STATUS_PAGE_ID"

  # Update
  run "PUT /status-pages/$STATUS_PAGE_ID" -X PUT "$API/status-pages/$STATUS_PAGE_ID" \
    -d "{
      \"title\": \"test-api-sh Status Page (updated)\",
      \"slug\": \"$SP_SLUG\",
      \"is_published\": true
    }"
fi

# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------
header "Tags"

run "GET /tags" "$API/tags"

# ---------------------------------------------------------------------------
# 404 check
# ---------------------------------------------------------------------------
header "Error Handling"

not_found_response=$(curl -s "${CURL_OPTS[@]}" -w "\n__HTTP_CODE__%{http_code}" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Accept: application/json" \
  "$API/monitors/999999")

nf_code=$(echo "$not_found_response" | grep -o '__HTTP_CODE__[0-9]*' | sed 's/__HTTP_CODE__//')
nf_body=$(echo "$not_found_response" | sed 's/__HTTP_CODE__[0-9]*$//')

if [[ "$nf_code" == "404" ]]; then
  echo -e "${GREEN}✓${RESET} ${BOLD}GET /monitors/999999${RESET} → HTTP 404 (expected)"
  echo -e "  Code: $(extract code "$nf_body")"
  PASS=$((PASS + 1))
else
  echo -e "${RED}✗${RESET} Expected 404, got $nf_code"
  FAIL=$((FAIL + 1))
fi

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
if [[ "$CLEANUP" != "true" ]]; then
  echo
  echo -e "${YELLOW}Cleanup skipped (CLEANUP=false). Resources left in DB:${RESET}"
  [[ -n "$MONITOR_ID" ]] && echo -e "  Monitor ID: $MONITOR_ID"
  [[ -n "$TCP_MONITOR_ID" && "$TCP_MONITOR_ID" != "null" ]] && echo -e "  TCP Monitor ID: $TCP_MONITOR_ID"
  [[ -n "$PUSH_MONITOR_ID" && "$PUSH_MONITOR_ID" != "null" ]] && echo -e "  Push Monitor ID: $PUSH_MONITOR_ID"
  [[ -n "$STATUS_PAGE_ID" ]] && echo -e "  Status Page ID: $STATUS_PAGE_ID"
else

header "Cleanup"

if [[ -n "$STATUS_PAGE_ID" ]]; then
  run "DELETE /status-pages/$STATUS_PAGE_ID" \
    -X DELETE "$API/status-pages/$STATUS_PAGE_ID"
fi

if [[ -n "$PUSH_MONITOR_ID" && "$PUSH_MONITOR_ID" != "null" ]]; then
  run "DELETE /monitors/$PUSH_MONITOR_ID (Push)" \
    -X DELETE "$API/monitors/$PUSH_MONITOR_ID"
fi

if [[ -n "$TCP_MONITOR_ID" && "$TCP_MONITOR_ID" != "null" ]]; then
  run "DELETE /monitors/$TCP_MONITOR_ID (TCP)" \
    -X DELETE "$API/monitors/$TCP_MONITOR_ID"
fi

if [[ -n "$MONITOR_ID" ]]; then
  run "DELETE /monitors/$MONITOR_ID" \
    -X DELETE "$API/monitors/$MONITOR_ID"
fi

fi # end CLEANUP block

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo -e "${BOLD}${CYAN}══════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Results: ${GREEN}$PASS passed${RESET}  ${RED}$FAIL failed${RESET}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════${RESET}"
echo

[[ "$FAIL" -eq 0 ]] && exit 0 || exit 1
