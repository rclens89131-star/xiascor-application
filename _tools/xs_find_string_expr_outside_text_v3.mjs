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

// dans ton setup: default=object et la fonction est default.default
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
const ALLOW_PARENTS = new Set(["Text","ThemedText"]);

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
  scanFiles = all.filter(fp => {
    const rel = fp.split(root).join("").replace(/^[/\\]/,"");
    return !rel.includes("app/(tabs)/explore.tsx") && !rel.includes("app/modal.tsx");
  });
}

function isStringyExpr(expr){
  if(!expr) return null;
  switch(expr.type){
    case "StringLiteral": return 'StringLiteral';
    case "TemplateLiteral": return 'TemplateLiteral';
    case "BinaryExpression":
      // "a" + x  OU  x + "a"
      if(expr.operator === "+"){
        const l = isStringyExpr(expr.left);
        const r = isStringyExpr(expr.right);
        if(l || r) return 'Binary(+)';
      }
      return null;
    case "ConditionalExpression": {
      const c1 = isStringyExpr(expr.consequent);
      const c2 = isStringyExpr(expr.alternate);
      if(c1 || c2) return 'Conditional';
      return null;
    }
    case "LogicalExpression": {
      // cond && "x"  /  cond || "x"
      const r = isStringyExpr(expr.right);
      if(r) return 'Logical(' + expr.operator + ')';
      return null;
    }
    case "ParenthesizedExpression":
      return isStringyExpr(expr.expression);
    default:
      return null;
  }
}

function nearestParentName(p){
  const parentEl = p.findParent(pp => pp.isJSXElement && pp.node.openingElement);
  if(!parentEl) return null;
  const nameNode = parentEl.node.openingElement.name;
  if(nameNode?.type === "JSXIdentifier") return nameNode.name;
  if(nameNode?.type === "JSXMemberExpression") return nameNode.property?.name ?? "Member";
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
      const expr = p.node.expression;
      const kind = isStringyExpr(expr);
      if(!kind) return;

      const parentName = nearestParentName(p);
      if(parentName && ALLOW_PARENTS.has(parentName)) return;

      const loc = p.node.loc?.start;
      results.push({
        file: path.relative(root, fp),
        line: loc?.line ?? null,
        col: loc?.column ?? null,
        parent: parentName || "Unknown",
        kind,
      });
    },

    ReturnStatement(p){
      // attrape: return "string";
      const arg = p.node.argument;
      if(!arg) return;
      const isStr = arg.type === "StringLiteral" || arg.type === "TemplateLiteral";
      if(!isStr) return;

      const loc = p.node.loc?.start;
      results.push({
        file: path.relative(root, fp),
        line: loc?.line ?? null,
        col: loc?.column ?? null,
        parent: "ReturnStatement",
        kind: arg.type,
      });
    }
  });
}

results.sort((a,b) => a.file.localeCompare(b.file) || ((a.line||0)-(b.line||0)));

console.log("FOUND", results.length, "string-producing JSX expressions outside <Text>/<ThemedText> (TARGET: Mes cartes)");
for(const r of results.slice(0, 160)){
  console.log(`${r.file}:${r.line}:${r.col}  parent=<${r.parent}>  kind=${r.kind}`);
}
if(results.length > 160) console.log("... truncated, first 160 only");
