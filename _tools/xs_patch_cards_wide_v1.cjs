const fs = require("fs");

function die(msg){ console.error("[ERR]", msg); process.exit(1); }
function ok(msg){ console.log("[OK]", msg); }

const file = process.argv[2];
if(!file) die("Usage: node xs_patch_cards_wide_v1.cjs <cards.tsx>");

let src = fs.readFileSync(file, "utf8");

// 1) Remove any existing XS_GRID blocks (any version)
src = src.replace(/const\s+XS_GRID_PADDING\s*=\s*\d+\s*;\s*const\s+XS_GRID_GAP\s*=\s*\d+\s*;\s*const\s+XS_TILE_WIDTH\s*=\s*Math\.floor\([\s\S]*?\)\s*;\s*/g, "");

// 2) Inject ONE clean block once
if(!src.includes("XS_CARDS_FORCE_WIDE_GRID_NODE_SCRIPT_V1")){
  const inject =
`/* XS_CARDS_FORCE_WIDE_GRID_NODE_SCRIPT_V1
   Objectif:
   - 2 colonnes qui remplissent l’écran (Mes cartes)
   - cible le FlatList numColumns={2}
*/
const XS_GRID_PADDING = 10;
const XS_GRID_GAP = 10;
const XS_TILE_WIDTH = Math.floor((Dimensions.get("window").width - (XS_GRID_PADDING * 2) - XS_GRID_GAP) / 2);

`;
  src = src.replace(/(\r?\n)(\s*export\s+default|\s*export\s*\{|\s*function\s+|\s*const\s+|\s*type\s+)/, `$1${inject}$2`);
  ok("Injected XS grid block");
} else {
  ok("XS marker already present");
}

// 3) Remove ALL duplicated FlatList styling props
src = src.replace(/^\s*contentContainerStyle=\{\{.*\}\}\s*.*\r?\n/gm, "");
src = src.replace(/^\s*columnWrapperStyle=\{\{.*\}\}\s*.*\r?\n/gm, "");

// 4) Re-inject styles next to FIRST numColumns={2}
if(/^\s*numColumns=\{2\}\s*$/m.test(src)){
  src = src.replace(/^\s*numColumns=\{2\}\s*$/m,
`        contentContainerStyle={{ paddingHorizontal: XS_GRID_PADDING, paddingBottom: 120 }}
        columnWrapperStyle={{ justifyContent: "space-between", gap: XS_GRID_GAP }}
        numColumns={2}`
  );
  ok("Injected FlatList styles near numColumns={2}");
} else {
  ok("numColumns={2} not found (skip)");
}

// 5) Wrap FIRST SorareCardTile
if(src.includes("<SorareCardTile") && !src.includes("XS_TILE_WRAP_WIDTH_V3")){
  src = src.replace("<SorareCardTile",
`{/* XS_TILE_WRAP_WIDTH_V3 */}
          <View style={{ width: XS_TILE_WIDTH }}>
            <SorareCardTile`);
  // close wrapper after first self-closing "/>"
  src = src.replace(/\/>\s*\r?\n/, "/>\n          </View>\n");
  ok("Wrapped first SorareCardTile");
} else {
  ok("Wrapper already present (or no tile)");
}

// 6) Add width prop to first tile
if(src.includes("<SorareCardTile") && !src.includes("width={XS_TILE_WIDTH}")){
  src = src.replace(/<SorareCardTile\s*/, `<SorareCardTile\n              width={XS_TILE_WIDTH}\n              `);
  ok("Added width={XS_TILE_WIDTH}");
}

fs.writeFileSync(file, src, "utf8");
ok("Wrote file");
