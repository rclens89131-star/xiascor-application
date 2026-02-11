$ErrorActionPreference="Stop"
Set-Location (Split-Path -Parent $(Resolve-Path "\.."))
Write-Host "Codex launched from repo root:" (Get-Location)
codex --full-auto