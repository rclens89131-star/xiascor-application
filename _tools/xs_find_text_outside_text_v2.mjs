import fs from "node:fs";
import path from "node:path";

let babelParser, babelTraverse;
try { babelParser = await import("@babel/parser"); } catch {}
try { babelTraverse = await import("@babel/traverse"); } catch {}

if(!babelParser || !babelTraverse){
  console.error("[ERR] Missing deps: @babel/parser and/or @babel/traverse.");
  console.error("      Fix: npm i -D @babel/parser @babel/traverse");
  process.exit(2);
}

const { parse } = babelParser;

// IMPORTANT: dans ton setup, @babel/traverse exporte default=object et la fn est default.default
const traverse =
  (typeof babelTraverse?.default === "function" ? babelTraverse.default : null) ||
  (babelTraverse?.default && typeof babelTraverse.default === "object" && typeof babelTraverse.default.default === "function"
    ? babelTraverse.default.default
    : null);

if(!traverse){
  console.error("[ERR] Could not resolve traverse() from @babel/traverse exports.");
  process.exit(3);
}

const root = process.cwd();

// Whitelist: ces composants rendent du texte (donc JSXText OK dedans)
const ALLOW_PARENTS = new Set(["Text", "ThemedText"]);

// Ciblage: uniquement les fichiers liés à "Mes cartes" / "fiche carte" / composants utilisés
const candidateRel = [
  "app/(tabs)/cards.tsx",
  "app/card/[id].tsx",
  "src/components/SorareCardTile.tsx",
  "src/components/SorarePerformanceChart.tsx",
  "src/scoutApi.ts",
];

function exists(rel){
  const fp = path.join(root, rel);
  return fs.existsSync(fp) ? fp : null;
}

const files = candidateRel.map(exists).filter(Boolean);

// fallback: si un chemin a bougé, on scanne tous les TSX/TS mais on ignore explore/modal
function walkAll(dir, out){
  const ents = fs.readdirSync(dir, { withFileTypes: true });
  for(const e of ents){
    const fp = path.join(dir, e.name);
    if(e.isDirectory()){
      if(fp.includes("\\node_modules\\") || fp.includes("/node_modules/")) continue;
      if(fp.includes("\\.expo\\") || fp.includes("/.expo/")) continue;
      if(fp.includes("\\dist\\") || fp.includes("/dist/")) continue;
      if(fp.includes("\\build\\") || fp.includes("/build/")) continue;
      if(fp.includes("\\_backups\\") || fp.includes("/_backups/")) continue;
      if(fp.includes("\\_tools\\") || fp.includes("/_tools/")) continue;
      walkAll(fp, out);
    } else if(e.isFile()){
      if(fp.endsWith(".tsx") || fp.endsWith(".ts")) out.push(fp);
    }
  }
}

let scanFiles = files;
if(scanFiles.length === 0){
  const all = [];
  walkAll(root, all);
  scanFiles = all.filter(fp => {
    const rel = fp.split(root).join("").replace(/^[/\\]/,"");
    return !rel.includes("app/(tabs)/explore.tsx") && !rel.includes("app/modal.tsx");
  });
}

function isIgnorableText(s){
  const t = (s ?? "").replace(/\s+/g," ").trim();
  if(!t) return true;
  if(t === "," || t === "." ) return true;
  return false;
}

const results = [];

for(const fp of scanFiles){
  let code;
  try { code = fs.readFileSync(fp, "utf8"); } catch { continue; }

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript","jsx","classProperties","optionalChaining","nullishCoalescingOperator"],
      errorRecovery: true
    });
  } catch {
    continue;
  }

  traverse(ast, {
    JSXText(p){
      const raw = p.node.value ?? "";
      if(isIgnorableText(raw)) return;

      const parentEl = p.findParent(pp => pp.isJSXElement && pp.node.openingElement);
      if(!parentEl) return;

      const nameNode = parentEl.node.openingElement.name;
      let parentName = null;
      if(nameNode?.type === "JSXIdentifier") parentName = nameNode.name;
      else if(nameNode?.type === "JSXMemberExpression") parentName = nameNode.property?.name ?? "Member";

      if(parentName && ALLOW_PARENTS.has(parentName)) return;

      const loc = p.node.loc?.start;
      results.push({
        file: path.relative(root, fp),
        line: loc?.line ?? null,
        col: loc?.column ?? null,
        parent: parentName || "Unknown",
        text: raw.replace(/\s+/g," ").trim().slice(0,120),
      });
    }
  });
}

results.sort((a,b) => a.file.localeCompare(b.file) || ((a.line||0)-(b.line||0)));

console.log("FOUND", results.length, "JSXText nodes outside <Text>/<ThemedText> (TARGET: Mes cartes)");
for(const r of results.slice(0, 120)){
  console.log(`${r.file}:${r.line}:${r.col}  parent=<${r.parent}>  text="${r.text}"`);
}
if(results.length > 120) console.log("... truncated, first 120 only");
