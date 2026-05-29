# Quick smoke test against a running Worker (default: local dev server).
#   npm run dev   # in another terminal
#   ./scripts/test.ps1
param(
  [string]$Base = "http://127.0.0.1:8787",
  [string]$Token = ""
)

$headers = @{ "content-type" = "application/json" }
if ($Token) { $headers["Authorization"] = "Bearer $Token" }
$body = '{"tool":"claude","task":"demo"}'

Write-Host "POST $Base/coding-now"
Invoke-RestMethod -Method Post -Uri "$Base/coding-now" -Headers $headers -Body $body | ConvertTo-Json -Depth 5

Write-Host "`nGET $Base/status"
Invoke-RestMethod -Uri "$Base/status" | ConvertTo-Json -Depth 5

Write-Host "`nMascot is now CODING. Open in a browser:"
Write-Host "  $Base/mascot.svg"
Write-Host "`nWhen done, flip to idle with:"
Write-Host "  Invoke-RestMethod -Method Post -Uri $Base/coding-stopped -Headers @{'content-type'='application/json'}"
