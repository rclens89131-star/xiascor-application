#!/usr/bin/env node
/* XS_START_GUARD_V1 */
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const appJson = path.join(cwd, "app.json");
const pkgJson = path.join(cwd, "package.json");

if (!fs.existsSync(appJson) || !fs.existsSync(pkgJson)) {
  console.error("[sorare-app] Mauvais dossier: exécute la commande depuis la racine du projet Expo (dossier contenant app.json + package.json).");
  process.exit(1);
}
console.log(`[sorare-app] Répertoire validé: ${cwd}`);
