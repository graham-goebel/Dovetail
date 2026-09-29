#!/usr/bin/env node

/**
 * Token parity audit: verify that design tokens in three sources stay synchronized.
 *
 * NAMING RULE DISCOVERED:
 * DTCG paths are converted to CSS variable and tokens.json names by replacing dots with dashes,
 * with one abbreviation exception: 'dimension' becomes 'dim'. Examples:
 *   primitive.color.white -> --dt-color-white (CSS) / dt-color-white (tokens.json)
 *   primitive.dimension.4 -> --dt-dim-4 (CSS) / dt-dim-4 (tokens.json)
 *   semantic.space.inset-sm -> --dt-space-inset-sm (CSS) / dt-space-inset-sm (tokens.json)
 *   component.button.padding -> --dt-button-padding (CSS) / dt-button-padding (tokens.json)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const strict = process.argv.includes('--strict');

// ============================================================================
// 1. EXTRACT CSS VARIABLES FROM FILES
// ============================================================================

function extractCssVariables(filePath) {
  const cssContent = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  // Match custom properties on :root declarations
  const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
  if (!rootMatch) return vars;

  const declarations = rootMatch[1];
  // Match --dt-* declarations: --name: value;
  const propRegex = /(--dt-[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = propRegex.exec(declarations)) !== null) {
    const name = match[1].slice(5); // Remove '--dt-' prefix to get the name
    const value = match[2].trim();
    // First declaration wins
    if (!vars[name]) {
      vars[name] = value;
    }
  }

  return vars;
}

function collectCssVariables() {
  const cssVars = {};
  const tokenDirs = [
    path.join(repoRoot, 'system/tokens/primitive'),
    path.join(repoRoot, 'system/tokens/semantic'),
    path.join(repoRoot, 'system/tokens/component'),
  ];

  for (const dir of tokenDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.css'));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const vars = extractCssVariables(filePath);
      for (const [name, value] of Object.entries(vars)) {
        if (cssVars[name]) {
          // Record duplicates
          if (!cssVars._duplicates) cssVars._duplicates = {};
          if (!cssVars._duplicates[name]) {
            cssVars._duplicates[name] = [cssVars[name]];
          }
          cssVars._duplicates[name].push(value);
        } else {
          cssVars[name] = value;
        }
      }
    }
  }

  return cssVars;
}

// ============================================================================
// 2. PARSE DTCG AND FLATTEN
// ============================================================================

function flattenDtcg(obj, prefix = '') {
  const tokens = {};

  for (const key in obj) {
    if (key.startsWith('$')) continue;

    const pathPart = prefix ? prefix + '.' + key : key;
    const item = obj[key];

    if (item.$value !== undefined) {
      tokens[pathPart] = item;
    } else if (typeof item === 'object') {
      Object.assign(tokens, flattenDtcg(item, pathPart));
    }
  }

  return tokens;
}

function parseDtcgFile() {
  const filePath = path.join(repoRoot, 'system/tokens/dovetail.tokens.json');
  const content = fs.readFileSync(filePath, 'utf8');
  const dtcg = JSON.parse(content);

  const tokens = {};
  for (const tier of ['primitive', 'semantic', 'component']) {
    if (dtcg[tier]) {
      Object.assign(tokens, flattenDtcg(dtcg[tier], tier));
    }
  }

  return tokens;
}

// ============================================================================
// 3. PARSE TOKENS.JSON
// ============================================================================

function parseTokensJson() {
  const filePath = path.join(repoRoot, 'system/tokens.json');
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  const tokens = {};

  // Collect all token names from the grouped structure
  function collectFromGroup(group) {
    if (group.tokens && Array.isArray(group.tokens)) {
      for (const token of group.tokens) {
        if (token.name) {
          // Remove 'dt-' prefix to normalize
          const name = token.name.startsWith('dt-') ? token.name.slice(3) : token.name;
          tokens[name] = token.value;
        }
      }
    }

    // Recursively check nested objects
    for (const key in group) {
      if (typeof group[key] === 'object' && group[key] !== null && !Array.isArray(group[key])) {
        collectFromGroup(group[key]);
      }
    }
  }

  collectFromGroup(data);
  return tokens;
}

// ============================================================================
// 4. DTCG NAME TO CSS NAME CONVERSION
// ============================================================================

function dtcgNameToCssName(dtcgPath) {
  // Strip tier prefix (primitive, semantic, component)
  let name = dtcgPath.replace(/^(primitive|semantic|component)\./, '');

  // Replace dots with dashes
  name = name.replace(/\./g, '-');

  // Handle special abbreviations
  name = name.replace(/^dimension-/, 'dim-');
  name = name.replace(/-dimension-/, '-dim-');

  return name;
}

// ============================================================================
// 5. RESOLVE REFERENCES
// ============================================================================

function resolveReference(ref, dtcgTokens) {
  // Handle DTCG references like {primitive.color.white}
  const dtcgMatch = ref.match(/^\{([a-zA-Z0-9.-]+)\}$/);
  if (dtcgMatch) {
    const refPath = dtcgMatch[1];
    if (dtcgTokens[refPath] && dtcgTokens[refPath].$value) {
      return dtcgTokens[refPath].$value;
    }
    return null;
  }

  // Handle CSS var() references like var(--dt-dim-1)
  const cssMatch = ref.match(/^var\((--dt-[a-z0-9-]+)\)$/);
  if (cssMatch) {
    return cssMatch[1]; // Return as reference, will be resolved separately
  }

  return ref; // Return as-is if no reference pattern
}

function valueToComparable(value, dtcgTokens, cssVars) {
  if (!value) return value;

  value = String(value).trim();

  // Try to resolve DTCG reference
  const dtcgResolved = resolveReference(value, dtcgTokens);
  if (dtcgResolved && dtcgResolved !== value) {
    return valueToComparable(dtcgResolved, dtcgTokens, cssVars);
  }

  // Try to resolve CSS var() reference
  const cssMatch = value.match(/^var\((--dt-([a-z0-9-]+))\)$/);
  if (cssMatch) {
    const refName = cssMatch[2];
    if (cssVars[refName]) {
      return cssVars[refName];
    }
  }

  return value;
}

function dtcgColorToString(color) {
  if (typeof color === 'object' && color !== null && color.colorSpace && color.components) {
    return `${color.colorSpace}(${color.components.join(' ')})`;
  }
  return color;
}

function formatValue(value) {
  if (typeof value === 'object' && value !== null) {
    if (value.colorSpace && value.components) {
      return `${value.colorSpace}(${value.components.join(' ')})`;
    }
    // For theme-specific values
    const keys = Object.keys(value);
    if (keys.length <= 3) {
      return JSON.stringify(value);
    }
  }
  return String(value);
}

function normalizeColorValue(value) {
  // Normalize oklch values: remove extra spaces
  value = String(value).replace(/\s+/g, ' ').trim();
  return value;
}

function compareValues(val1, val2, dtcgTokens, cssVars) {
  // Convert DTCG color objects to strings first
  val1 = dtcgColorToString(val1);
  val2 = dtcgColorToString(val2);

  // Skip comparison for complex values
  if (String(val1).includes('calc(') || String(val2).includes('calc(')) {
    return 'not-comparable';
  }
  if (String(val1).includes('color-mix(') || String(val2).includes('color-mix(')) {
    return 'not-comparable';
  }
  if (String(val1).includes('linear-gradient(') || String(val2).includes('linear-gradient(')) {
    return 'not-comparable';
  }

  val1 = valueToComparable(val1, dtcgTokens, cssVars);
  val2 = valueToComparable(val2, dtcgTokens, cssVars);

  // Convert again if they're still DTCG objects
  val1 = dtcgColorToString(val1);
  val2 = dtcgColorToString(val2);

  val1 = normalizeColorValue(val1);
  val2 = normalizeColorValue(val2);

  if (val1 === val2) return 'match';

  return 'mismatch';
}

// ============================================================================
// 6. MAIN AUDIT
// ============================================================================

const cssVars = collectCssVariables();
const dtcgTokens = parseDtcgFile();
const tokensJsonTokens = parseTokensJson();

// Normalize all names
const normalizedCssVars = {};
for (const [name, value] of Object.entries(cssVars)) {
  if (!name.startsWith('_')) {
    normalizedCssVars[name] = value;
  }
}

const normalizedDtcg = {};
for (const [path, value] of Object.entries(dtcgTokens)) {
  const cssName = dtcgNameToCssName(path);
  normalizedDtcg[cssName] = value;
}

// Get all unique token names
const allNames = new Set([
  ...Object.keys(normalizedCssVars),
  ...Object.keys(tokensJsonTokens),
  ...Object.keys(normalizedDtcg),
]);

// ============================================================================
// 7. COMPARE AND REPORT
// ============================================================================

const missingInCss = [];
const missingInTokensJson = [];
const missingInDtcg = [];
const mismatchesCssVsDtcg = [];
const mismatchesCssVsTokensJson = [];

for (const name of allNames) {
  const inCss = name in normalizedCssVars;
  const inTokensJson = name in tokensJsonTokens;
  const inDtcg = name in normalizedDtcg;

  // Check for missing tokens
  if (!inCss && inDtcg) {
    missingInCss.push(name);
  }
  if (!inTokensJson && inDtcg) {
    missingInTokensJson.push(name);
  }
  if (!inDtcg && (inCss || inTokensJson)) {
    missingInDtcg.push(name);
  }

  // Check for mismatches
  if (inCss && inDtcg) {
    const result = compareValues(
      normalizedCssVars[name],
      normalizedDtcg[name].$value || normalizedDtcg[name],
      dtcgTokens,
      normalizedCssVars
    );
    if (result === 'mismatch') {
      mismatchesCssVsDtcg.push({
        name,
        css: normalizedCssVars[name],
        dtcg: normalizedDtcg[name].$value || normalizedDtcg[name],
      });
    }
  }

  if (inCss && inTokensJson) {
    const result = compareValues(
      normalizedCssVars[name],
      tokensJsonTokens[name],
      dtcgTokens,
      normalizedCssVars
    );
    if (result === 'mismatch') {
      mismatchesCssVsTokensJson.push({
        name,
        css: normalizedCssVars[name],
        tokensJson: tokensJsonTokens[name],
      });
    }
  }
}

// ============================================================================
// 8. PRINT REPORT
// ============================================================================

console.log('='.repeat(80));
console.log('TOKEN PARITY AUDIT');
console.log('='.repeat(80));
console.log('');

console.log('SUMMARY COUNTS');
console.log('-'.repeat(80));
console.log(`Total unique token names: ${allNames.size}`);
console.log(`Declared in CSS: ${Object.keys(normalizedCssVars).length}`);
console.log(`Declared in tokens.json: ${Object.keys(tokensJsonTokens).length}`);
console.log(`Declared in DTCG: ${Object.keys(normalizedDtcg).length}`);
console.log('');

console.log(`Missing in CSS (but in DTCG): ${missingInCss.length}`);
console.log(`Missing in tokens.json (but in DTCG): ${missingInTokensJson.length}`);
console.log(`Missing in DTCG (but in CSS/tokens.json): ${missingInDtcg.length}`);
console.log(`Mismatches (CSS vs DTCG): ${mismatchesCssVsDtcg.length}`);
console.log(`Mismatches (CSS vs tokens.json): ${mismatchesCssVsTokensJson.length}`);
console.log('');

if (missingInCss.length > 0) {
  console.log('MISSING IN CSS (from DTCG)');
  console.log('-'.repeat(80));
  const display = missingInCss.slice(0, 60);
  display.forEach(name => console.log(`  ${name}`));
  if (missingInCss.length > 60) {
    console.log(`  ... and ${missingInCss.length - 60} more`);
  }
  console.log('');
}

if (missingInTokensJson.length > 0) {
  console.log('MISSING IN TOKENS.JSON (from DTCG)');
  console.log('-'.repeat(80));
  const display = missingInTokensJson.slice(0, 60);
  display.forEach(name => console.log(`  ${name}`));
  if (missingInTokensJson.length > 60) {
    console.log(`  ... and ${missingInTokensJson.length - 60} more`);
  }
  console.log('');
}

if (missingInDtcg.length > 0) {
  console.log('MISSING IN DTCG (from CSS/tokens.json)');
  console.log('-'.repeat(80));
  const display = missingInDtcg.slice(0, 60);
  display.forEach(name => console.log(`  ${name}`));
  if (missingInDtcg.length > 60) {
    console.log(`  ... and ${missingInDtcg.length - 60} more`);
  }
  console.log('');
}

if (mismatchesCssVsDtcg.length > 0) {
  console.log('MISMATCHES: CSS vs DTCG');
  console.log('-'.repeat(80));
  const display = mismatchesCssVsDtcg.slice(0, 60);
  display.forEach(item => {
    console.log(`  ${item.name}`);
    console.log(`    CSS:  ${formatValue(item.css)}`);
    console.log(`    DTCG: ${formatValue(item.dtcg)}`);
  });
  if (mismatchesCssVsDtcg.length > 60) {
    console.log(`  ... and ${mismatchesCssVsDtcg.length - 60} more mismatches`);
  }
  console.log('');
}

if (mismatchesCssVsTokensJson.length > 0) {
  console.log('MISMATCHES: CSS vs tokens.json');
  console.log('-'.repeat(80));
  const display = mismatchesCssVsTokensJson.slice(0, 60);
  display.forEach(item => {
    console.log(`  ${item.name}`);
    console.log(`    CSS:        ${formatValue(item.css)}`);
    console.log(`    tokens.json: ${formatValue(item.tokensJson)}`);
  });
  if (mismatchesCssVsTokensJson.length > 60) {
    console.log(`  ... and ${mismatchesCssVsTokensJson.length - 60} more mismatches`);
  }
  console.log('');
}

console.log('='.repeat(80));

// Exit with appropriate code
const hasIssues = missingInCss.length > 0 ||
                  missingInTokensJson.length > 0 ||
                  missingInDtcg.length > 0 ||
                  mismatchesCssVsDtcg.length > 0 ||
                  mismatchesCssVsTokensJson.length > 0;

process.exit(strict && hasIssues ? 1 : 0);
