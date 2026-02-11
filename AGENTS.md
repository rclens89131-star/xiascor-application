<!-- XS_CODEX_GUARDRAILS_V1_BEGIN -->
# Codex Guardrails (V1)

## Anti-fichiers fantômes (OBLIGATOIRE)
- Travailler uniquement depuis la racine du repo (dossier courant).
- Interdiction absolue de créer pp/app/*, src/src/* ou dossiers dupliqués.
- Avant de créer/modifier: prouver l'arbo réelle (liste pp/, pp/(tabs)/ etc.).
- Si un chemin est “introuvable”, ne jamais inventer: chercher et montrer la preuve.
<!-- XS_CODEX_GUARDRAILS_V1_END -->
<!-- XS_CODEX_GUARDRAILS_V1_BEGIN -->
# Codex Guardrails (V1)

## Anti-fichiers fantômes (OBLIGATOIRE)
- Travailler uniquement depuis la racine du repo (dossier courant).
- Interdiction absolue de créer pp/app/*, src/src/* ou dossiers dupliqués.
- Avant de créer/modifier: prouver l'arbo réelle (liste pp/, pp/(tabs)/ etc.).
- Si un chemin est “introuvable”, ne jamais inventer: chercher et montrer la preuve.

## Zéro casse
- Backup avant patch.
- Tests (app): 
px tsc --noEmit + 
px expo export --platform web.
- Commit/push seulement après tests OK.
<!-- XS_CODEX_GUARDRAILS_V1_END -->
