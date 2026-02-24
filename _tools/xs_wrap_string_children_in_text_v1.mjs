import fs from "node:fs";
import path from "node:path";

let babelParser, babelTraverse, t, generate;
try { babelParser = await import("@babel/parser"); } catch {}
try { babelTraverse = await import("@babel/traverse"); } catch {}
try { t = await import("@babel/types"); } catch {}
try { generate = (await import("@babel/generator")).default; } catch {}

if(!babelParser || !babelTraverse || !t || !generate){
  console.error("[ERR] Missing deps. Need: @babel/parser @babel/traverse @babel/types @babel/generator");
  process.exit(2);
}

const { parse } = babelParser;

// Dans ton setup: @babel/traverse exporte default=object et la fonction est default.default
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
  console.error("Usage: node _tools/xs_wrap_string_children_in_text_v1.mjs <file1> <file2> ...");
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
      if(expr.operator === "+") return isStringyExpr(expr.left) || isStringyExpr(expr.right);
      return false;
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
  // Cherche import { ... } from 'react-native'
  let rnImport = null;
  for(const node of ast.program.body){
    if(node.type === "ImportDeclaration" && node.source?.value === "react-native"){
      rnImport = node;
      break;
    }
  }
  if(!rnImport) return false;

  // si déjà Text importé -> ok
  const spec = rnImport.specifiers?.find(s => s.type === "ImportSpecifier" && s.imported?.name === "Text");
  if(spec) return false;

  // ajoute Text
  rnImport.specifiers.push(t.importSpecifier(t.identifier("Text"), t.identifier("Text")));
  return true;
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
  let needsTextImport = false;

  traverse(ast, {
    JSXElement(p){
      const opening = p.node.openingElement;
      const parentName = getName(opening.name);
      if(parentName && ALLOW_PARENTS.has(parentName)) return;

      const children = p.node.children || [];
      for(let i=0;i<children.length;i++){
        const ch = children[i];

        // On ne traite QUE les children JSXExpressionContainer (donc pas les props/styles)
        if(ch && ch.type === "JSXExpressionContainer"){
          const expr = ch.expression;
          if(isStringyExpr(expr)){
            // wrap: <Text>{expr}</Text>
            const textEl = t.jsxElement(
              t.jsxOpeningElement(t.jsxIdentifier("Text"), [], false),
              t.jsxClosingElement(t.jsxIdentifier("Text")),
              [t.jsxExpressionContainer(expr)],
              false
            );
            children[i] = textEl;
            changed = true;
            needsTextImport = true;
          }
        }
      }
      p.node.children = children;
    }
  });

  if(changed && needsTextImport){
    ensureTextImport(ast);
  }

  if(changed){
    const out = generate(ast, { retainLines: true, jsescOption: { minimal: true } }).code;
    fs.writeFileSync(fp, out, "utf8");
    console.log("[OK] patched", path.relative(root, fp));
  } else {
    console.log("[OK] nochange", path.relative(root, fp));
  }
}
