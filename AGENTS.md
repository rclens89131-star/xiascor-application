# AGENTS — Xiascor Monorepo (Codex-safe)

Chemins relatifs uniquement. (Codex = /workspace/<repo>)

- Backend Sorare: ./sorare-backend/server-companion.cjs
- Guard Codex:    ./scripts/guard-backend.sh
- Guard Windows:  .\scripts\guard-backend.ps1

Proof avant modif:
- pwd ; ls -la ; git branch --show-current
- test -f ./sorare-backend/server-companion.cjs && echo FOUND || echo MISSING

Si MISSING => STOP et changer repo/branche dans l'UI Codex.
