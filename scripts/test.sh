#!/usr/bin/env bash
# Quick smoke test against a running Worker (default: local dev server).
#   npm run dev   # in another terminal
#   ./scripts/test.sh
set -euo pipefail
BASE="${1:-http://127.0.0.1:8787}"
TOKEN="${2:-}"

AUTH=()
[ -n "$TOKEN" ] && AUTH=(-H "Authorization: Bearer $TOKEN")

echo "POST $BASE/coding-now"
curl -s "${AUTH[@]}" -H 'content-type: application/json' -d '{"tool":"claude","task":"demo"}' "$BASE/coding-now"
echo

echo "GET $BASE/status"
curl -s "$BASE/status"
echo

echo "Mascot is now CODING. Open: $BASE/mascot.svg"
echo "Flip to idle: curl -s -X POST $BASE/coding-stopped"
