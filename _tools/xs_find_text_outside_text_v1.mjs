import fs from "node:fs";
import path from "node:path";

let babelParser, babelTraverse;
try { babelParser = await import("@babel/parser"); } catch {}
try { babelTraverse = await import("@babel/traverse"); } catch {}

if(!babelParser || !babelTraverse){
  console.error("[ERR] Missing deps: @babel/parser and/or @babel/traverse.");
  console.error("      Fix: npm i -D @babel/parser @babel/traverse (dans sorare-app)");
  process.exit(2);
}

const { parse } = babelParser;
const traverse =
  // cas 1: ESM -> default est une fonction
  (typeof babelTraverse?.default === "function" ? babelTraverse.default : null) ||
  // cas 2: ESM -> default est un objet qui contient la vraie fonction dans default.default
  (babelTraverse?.default && typeof babelTraverse.default === "object" && typeof babelTraverse.default.default === "function"
    ? babelTraverse.default.default
    : null) ||
  // cas 3: ESM -> default est un objet qui expose traverse()
  (babelTraverse?.default && typeof babelTraverse.default === "object" && typeof babelTraverse.default.traverse === "function"
    ? babelTraverse.default.traverse
    : null) ||
  // cas 4: module export direct
  (typeof babelTraverse === "function" ? babelTraverse : null) ||
  // cas 5: export nommé traverse
  (typeof babelTraverse?.traverse === "function" ? babelTraverse.traverse : null);

if(!traverse){
  console.error("[ERR] Could not resolve traverse() from @babel/traverse exports.");
  console.error("      Debug: try `node -e \"import('@babel/traverse').then(m=>console.log(m))\"`");
  process.exit(3);
}
const root = process.cwd();

function walk(dir, out){
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
      walk(fp, out);
    } else if(e.isFile()){
      if(fp.endsWith(".tsx")) out.push(fp);
    }
  }
}

const files = [];
walk(root, files);

const results = [];
function isIgnorableText(s){
  const t = s.replace(/\s+/g," ").trim();
  if(!t) return true;          // whitespace only
  if(t === "," || t === ".") return true;
  return false;
}

for(const fp of files){
  let code;
  try { code = fs.readFileSync(fp, "utf8"); } catch { continue; }

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "typescript","jsx",
        "classProperties",
        "optionalChaining","nullishCoalescingOperator"
      ],
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

      // OK only if inside <Text>
      if(parentName === "Text") return;

      const loc = p.node.loc?.start;
      results.push({
        file: path.relative(root, fp),
        line: loc?.line ?? null,
        col: loc?.column ?? null,
        parent: parentName || "Unknown",
        text: raw.replace(/\s+/g," ").trim().slice(0,80),
      });
    }
  });
}

results.sort((a,b) => (a.file.localeCompare(b.file) || ((a.line||0)-(b.line||0))));

console.log("FOUND", results.length, "JSXText nodes outside <Text>");
for(const r of results.slice(0, 120)){
  console.log(`${r.file}:${r.line}:${r.col}  parent=<${r.parent}>  text="${r.text}"`);
}
if(results.length > 120) console.log("... truncated, first 120 only");


