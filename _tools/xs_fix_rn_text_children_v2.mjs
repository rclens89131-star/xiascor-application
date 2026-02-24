import fs from "node:fs";
import path from "node:path";

let babelParser, babelTraverse, t, generate;
try { babelParser = await import("@babel/parser"); } catch {}
try { babelTraverse = await import("@babel/traverse"); } catch {}
try { t = await import("@babel/types"); } catch {}
try {
  const genMod = await import("@babel/generator");
  // Compat exports: default fn OR { generate } OR nested default
  generate =
    (typeof genMod?.default === "function" ? genMod.default : null) ||
    (typeof genMod?.generate === "function" ? genMod.generate : null) ||
    (genMod?.default && typeof genMod.default.default === "function" ? genMod.default.default : null) ||
    (genMod?.default && typeof genMod.default.generate === "function" ? genMod.default.generate : null) ||
    null;
} catch {}

if(!babelParser || !babelTraverse || !t || !generate){
  console.error("[ERR] Missing deps. Need: @babel/parser @babel/traverse @babel/types @babel/generator");
  process.exit(2);
}

const { parse } = babelParser;

// traverse export shape (chez toi)
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
const files = process.argv.slice(2);
if(files.length === 0){
  console.error("Usage: node _tools/xs_fix_rn_text_children_v2.mjs <file1> <file2> ...");
  process.exit(4);
}

const ALLOW_PARENTS = new Set(["Text","ThemedText"]);

function getName(openingName){
  if(!openingName) return null;
  if(openingName.type === "JSXIdentifier") return openingName.name;
  if(openingName.type === "JSXMemberExpression") return openingName.property?.name ?? "Member";
  return "Unknown";
}

function isStringyExpr(expr){
  if(!expr) return false;
  switch(expr.type){
    case "StringLiteral":
    case "TemplateLiteral":
      return true;
    case "BinaryExpression":
      return expr.operator === "+" && (isStringyExpr(expr.left) || isStringyExpr(expr.right));
    case "ConditionalExpression":
      return isStringyExpr(expr.consequent) || isStringyExpr(expr.alternate);
    case "LogicalExpression":
      return isStringyExpr(expr.right);
    case "ParenthesizedExpression":
      return isStringyExpr(expr.expression);
    default:
      return false;
  }
}

function ensureTextImport(ast){
  let rnImport = null;
  for(const node of ast.program.body){
    if(node.type === "ImportDeclaration" && node.source?.value === "react-native"){
      rnImport = node;
      break;
    }
  }
  if(!rnImport) return false;

  const hasText = rnImport.specifiers?.some(s =>
    s.type === "ImportSpecifier" && s.imported?.name === "Text"
  );
  if(hasText) return false;

  rnImport.specifiers.push(t.importSpecifier(t.identifier("Text"), t.identifier("Text")));
  return true;
}

function makeTextElementFromLiteral(str){
  // <Text>str</Text> via JSXText
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier("Text"), [], false),
    t.jsxClosingElement(t.jsxIdentifier("Text")),
    [t.jsxText(str)],
    false
  );
}

function makeTextElementFromExpr(expr){
  // <Text>{expr}</Text>
  return t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier("Text"), [], false),
    t.jsxClosingElement(t.jsxIdentifier("Text")),
    [t.jsxExpressionContainer(expr)],
    false
  );
}

for(const fileArg of files){
  const fp = path.isAbsolute(fileArg) ? fileArg : path.join(root, fileArg);
  if(!fs.existsSync(fp)){
    console.error("[WARN] Missing file:", fp);
    continue;
  }

  const code = fs.readFileSync(fp, "utf8");
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript","jsx","classProperties","optionalChaining","nullishCoalescingOperator"],
    errorRecovery: true
  });

  let changed = false;
  let needTextImport = false;
  let wrappedCount = 0;
  let removedWsCount = 0;

  traverse(ast, {
    JSXElement(p){
      const opening = p.node.openingElement;
      const parentName = getName(opening.name);
      if(parentName && ALLOW_PARENTS.has(parentName)) return;

      const children = p.node.children || [];
      const next = [];

      for(const ch of children){
        if(!ch){ continue; }

        // 1) JSXText: peut déclencher RN error sous <View>
        if(ch.type === "JSXText"){
          const raw = ch.value ?? "";
          // whitespace-only: on supprime carrément (ça évite le bug)
          if(raw.trim().length === 0){
            removedWsCount++;
            changed = true;
            continue;
          }
          // non-whitespace: wrap dans <Text>
          next.push(makeTextElementFromLiteral(raw));
          wrappedCount++;
          needTextImport = true;
          changed = true;
          continue;
        }

        // 2) JSXExpressionContainer en child direct: si stringy -> wrap <Text>{expr}</Text>
        if(ch.type === "JSXExpressionContainer"){
          const expr = ch.expression;
          if(isStringyExpr(expr)){
            next.push(makeTextElementFromExpr(expr));
            wrappedCount++;
            needTextImport = true;
            changed = true;
            continue;
          }
        }

        // default: keep
        next.push(ch);
      }

      p.node.children = next;
    }
  });

  if(changed && needTextImport){
    ensureTextImport(ast);
  }

  if(changed){
    const out = generate(ast, { retainLines: true, jsescOption: { minimal: true } }).code;
    fs.writeFileSync(fp, out, "utf8");
    console.log(`[OK] patched ${path.relative(root, fp)}  wrapped=${wrappedCount}  removedWs=${removedWsCount}`);
  } else {
    console.log("[OK] nochange", path.relative(root, fp));
  }
}

