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

// setup traverse export (comme chez toi)
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
let scanFiles = candidateRel.map(exists).filter(Boolean);

// fallback scan
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
if(scanFiles.length === 0){
  const all = [];
  walkAll(root, all);
  scanFiles = all;
}

const ALLOW_PARENTS = new Set(["Text","ThemedText"]);

function isStringyExpr(expr){
  if(!expr) return null;
  switch(expr.type){
    case "StringLiteral": return "StringLiteral";
    case "TemplateLiteral": return "TemplateLiteral";
    case "BinaryExpression":
      if(expr.operator === "+"){
        const l = isStringyExpr(expr.left);
        const r = isStringyExpr(expr.right);
        if(l || r) return "Binary(+)";
      }
      return null;
    case "ConditionalExpression":
      return (isStringyExpr(expr.consequent) || isStringyExpr(expr.alternate)) ? "Conditional" : null;
    case "LogicalExpression":
      return isStringyExpr(expr.right) ? ("Logical(" + expr.operator + ")") : null;
    case "ParenthesizedExpression":
      return isStringyExpr(expr.expression);
    default:
      return null;
  }
}

function openingName(p){
  const el = p.findParent(pp => pp.isJSXElement && pp.node.openingElement);
  if(!el) return null;
  const n = el.node.openingElement.name;
  if(n?.type === "JSXIdentifier") return n.name;
  if(n?.type === "JSXMemberExpression") return n.property?.name ?? "Member";
  return "Unknown";
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
    JSXExpressionContainer(p){
      // IMPORTANT: on ne garde QUE les expressions qui sont des CHILDREN directs d'un JSXElement
      // et pas une value d'attribut (JSXAttribute)
      const parent = p.parent;
      if(!parent) return;

      const isChildOfElement = parent.type === "JSXElement" && Array.isArray(parent.children) && parent.children.includes(p.node);
      if(!isChildOfElement) return;

      const kind = isStringyExpr(p.node.expression);
      if(!kind) return;

      const parentName = openingName(p);
      if(parentName && ALLOW_PARENTS.has(parentName)) return;

      const loc = p.node.loc?.start;
      results.push({
        file: path.relative(root, fp),
        line: loc?.line ?? null,
        col: loc?.column ?? null,
        parent: parentName || "Unknown",
        kind
      });
    }
  });
}

results.sort((a,b) => a.file.localeCompare(b.file) || ((a.line||0)-(b.line||0)));

console.log("FOUND", results.length, "stringy JSXExpressionContainer CHILDREN outside <Text>/<ThemedText> (V4)");
for(const r of results.slice(0, 200)){
  console.log(`${r.file}:${r.line}:${r.col}  parent=<${r.parent}>  kind=${r.kind}`);
}
if(results.length > 200) console.log("... truncated, first 200 only");
