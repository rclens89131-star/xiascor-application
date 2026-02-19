$ErrorActionPreference = 'Stop'
$ROOT = (git rev-parse --show-toplevel).Trim()
Set-Location $ROOT
$TARGET = Join-Path $ROOT 'sorare-backend\server-companion.cjs'
if(-not (Test-Path -LiteralPath $TARGET)){
  Write-Host "MISSING: .\sorare-backend\server-companion.cjs" -ForegroundColor Red
  Write-Host "Tu n'es pas sur le bon repo/branche ou pas synchro." -ForegroundColor Yellow
  exit 2
}
Write-Host "FOUND: .\sorare-backend\server-companion.cjs" -ForegroundColor Green
