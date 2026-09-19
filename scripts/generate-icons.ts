import fs from "node:fs";
import path from "node:path";
import subsetFont from "subset-font";

interface RemixGlyph {
  unicode: string;
}

type RemixGlyphMap = Record<string, RemixGlyph>;

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");
const OUTPUT_FONT_PATH = path.join(ROOT_DIR, "public", "remixicon.woff2");
const OUTPUT_CSS_PATH = path.join(SRC_DIR, "styles", "remixicon.css");

const REMIXICON_FONTS_DIR = path.join(ROOT_DIR, "node_modules", "remixicon", "fonts");
const MASTER_FONT_PATH = path.join(REMIXICON_FONTS_DIR, "remixicon.woff2");
const GLYPH_MAP_PATH = path.join(REMIXICON_FONTS_DIR, "remixicon.glyph.json");

// Explicit safelist for any icons created dynamically that cannot be detected by static scan
const SAFELIST: string[] = [];

/**
 * Recursively find all source code files in a directory
 */
function findSourceFiles(dir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
        continue;
      }
      files = files.concat(findSourceFiles(fullPath));
    } else if (
      /\.(tsx?|jsx?|html|css)$/.test(entry.name) &&
      path.resolve(fullPath) !== path.resolve(OUTPUT_CSS_PATH)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Scan source files to extract icon names
 */
function scanUsedIcons(glyphMap: RemixGlyphMap): Set<string> {
  const sourceFiles = findSourceFiles(SRC_DIR);
  const detectedIcons = new Set<string>(SAFELIST);

  // Matches any 'ri-<name>' occurrence
  const riRegex = /\bri-([a-z0-9-]+)\b/g;

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, "utf8");
    let match: RegExpExecArray | null;

    while ((match = riRegex.exec(content)) !== null) {
      const candidate = match[1];

      // 1. Direct match in RemixIcon (e.g. "youtube-fill", "sort-asc", "draggable", "thunderstorms-fill")
      if (candidate in glyphMap) {
        detectedIcons.add(candidate);
        continue;
      }

      // 2. Handle dynamic patterns like `ri-search-2-` + (fill/line) or `ri-calendar-schedule-${...}`
      const lineVariant = `${candidate}-line`;
      const fillVariant = `${candidate}-fill`;

      const hasLine = lineVariant in glyphMap;
      const hasFill = fillVariant in glyphMap;

      if (hasLine || hasFill) {
        if (hasLine) detectedIcons.add(lineVariant);
        if (hasFill) detectedIcons.add(fillVariant);
      }
    }
  }

  return detectedIcons;
}

async function main() {
  console.log("🔍 Scanning codebase for RemixIcon usages...");

  if (!fs.existsSync(MASTER_FONT_PATH) || !fs.existsSync(GLYPH_MAP_PATH)) {
    console.error("❌ 'remixicon' package not found in node_modules. Run: npm install -D remixicon");
    process.exit(1);
  }

  const glyphMap: RemixGlyphMap = JSON.parse(fs.readFileSync(GLYPH_MAP_PATH, "utf8"));
  const usedIconsSet = scanUsedIcons(glyphMap);

  // Validate and collect unicode points
  const matchedIcons: Array<{ name: string; hex: string }> = [];
  const unicodeChars: string[] = [];

  for (const iconName of Array.from(usedIconsSet).sort()) {
    const glyph = glyphMap[iconName];
    if (glyph && glyph.unicode) {
      const hex = glyph.unicode.replace(/[&#;x]/gi, "").toLowerCase();
      const codePoint = parseInt(hex, 16);
      unicodeChars.push(String.fromCodePoint(codePoint));
      matchedIcons.push({ name: iconName, hex });
    }
  }

  console.log(`✨ Found ${matchedIcons.length} active icons used in the project.`);
  console.log(matchedIcons.map((i) => i.name).join(", "));

  // 1. Subset the WOFF2 font
  console.log("⚡ Generating subsetted WOFF2 font...");
  const masterFontBuffer = fs.readFileSync(MASTER_FONT_PATH);
  const subsetBuffer = await subsetFont(masterFontBuffer, unicodeChars.join(""), {
    targetFormat: "woff2",
  });

  fs.writeFileSync(OUTPUT_FONT_PATH, subsetBuffer);
  console.log(`✅ Saved ${path.relative(ROOT_DIR, OUTPUT_FONT_PATH)} (${(subsetBuffer.length / 1024).toFixed(2)} KB)`);

  // 2. Generate matching CSS file
  console.log("📝 Generating remixicon.css...");
  const cssRules = matchedIcons
    .map((icon) => `.ri-${icon.name}:before {\n  content: "\\${icon.hex}";\n}`)
    .join("\n\n");

  const cssHeader = `/*
* Auto-generated RemixIcon subset
* Total icons: ${matchedIcons.length}
* Generated at: ${new Date().toISOString()}
*/

@font-face {
  font-family: "remixicon";
  src: url("/remixicon.woff2") format("woff2");
  font-display: swap;
}

[class^="ri-"],
[class*=" ri-"] {
  font-family: 'remixicon' !important;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

${cssRules}
`;

  fs.writeFileSync(OUTPUT_CSS_PATH, cssHeader, "utf8");
  console.log(`✅ Saved ${path.relative(ROOT_DIR, OUTPUT_CSS_PATH)}`);
  console.log("🎉 Done!");
}

main().catch((err) => {
  console.error("Error generating icon font:", err);
  process.exit(1);
});
