#!/usr/bin/env node

/**
 * Token parity audit: verify that design tokens in three sources stay synchronized.
 *
 * NAMING RULE DISCOVERED:
 * DTCG paths are converted to CSS variable and tokens.json names by:
 * 1. Stripping the tier prefix (primitive, semantic, component)
 * 2. Replacing dots with dashes
 * 3. Special case: 'dimension' becomes 'dim'
 *
 * Additional mappings found:
 * - shadow-1…5 and shadow-inset map to elevation-1…5 and elevation-inset
 * - typography-* tokens are found under text-role-* patterns
 * - layout-* tokens declared in :root, [data-layout="..."] rules
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

  // Match rules where selector list includes :root (e.g., ":root, [data-layout="balanced"]")
  const ruleRegex = /([^{}]*:root[^{}]*)\s*\{([^}]+)\}/g;
  let ruleMatch;

  while ((ruleMatch = ruleRegex.exec(cssContent)) !== null) {
    const declarations = ruleMatch[2];
    const propRegex = /(--dt-[a-z0-9-]+)\s*:\s*([^;]+);/g;
    let match;

    while ((match = propRegex.exec(declarations)) !== null) {
      const name = match[1].slice(5); // Remove '--dt-' prefix
      const value = match[2].trim();
      if (!vars[name]) {
        vars[name] = value;
      }
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
      Object.assign(cssVars, vars);
    }
  }

  return cssVars;
}

// ============================================================================
// 2. EXTRACT DARK THEME CSS
// ============================================================================

function extractDarkThemeCss() {
  const darkCss = {};
  const darkFilePath = path.join(repoRoot, 'system/tokens/themes/base-dark.css');

  if (fs.existsSync(darkFilePath)) {
    const vars = extractCssVariables(darkFilePath);
    Object.assign(darkCss, vars);
  }

  return darkCss;
}

// ============================================================================
// 3. PARSE DTCG
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
// 4. PARSE TOKENS.JSON
// ============================================================================

function parseTokensJson() {
  const filePath = path.join(repoRoot, 'system/tokens.json');
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);

  const tokens = {};

  function collectFromGroup(group) {
    if (group.tokens && Array.isArray(group.tokens)) {
      for (const token of group.tokens) {
        if (token.name) {
          const name = token.name.startsWith('dt-') ? token.name.slice(3) : token.name;
          tokens[name] = token.value;
        }
      }
    }

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
// 5. DTCG NAME TO CSS NAME CONVERSION
// ============================================================================

function dtcgNameToCssName(dtcgPath) {
  let name = dtcgPath.replace(/^(primitive|semantic|component)\./, '');
  name = name.replace(/\./g, '-');
  name = name.replace(/^dimension-/, 'dim-');
  name = name.replace(/-dimension-/, '-dim-');
  return name;
}

// ============================================================================
// 6. MAPPING FOR ALIASES
// ============================================================================

function getDtcgAliasedName(dtcgName) {
  // In DTCG: shadow-1...5, shadow-inset (primitives)
  // In CSS: shadow-raw-1...5, shadow-raw-inset
  const shadowMatch = dtcgName.match(/^shadow-(.+)$/);
  if (shadowMatch) {
    return 'shadow-raw-' + shadowMatch[1];
  }

  // In DTCG: typography-display-lg, typography-heading-lg, etc. (semantics)
  // In CSS: text-display-lg, text-heading-lg, etc.
  const typographyMatch = dtcgName.match(/^typography-(.+)$/);
  if (typographyMatch) {
    return 'text-' + typographyMatch[1];
  }

  return null;
}

// ============================================================================
// 7. VALUE NORMALIZATION
// ============================================================================

function normalizeValue(value) {
  if (typeof value === 'object' && value !== null) {
    // DTCG color object
    if (value.colorSpace && value.components) {
      return `${value.colorSpace}(${value.components.join(' ')})`;
    }
    // DTCG dimension with unit
    if (value.value !== undefined && value.unit) {
      const v = value.value === 0 ? '0' : `${value.value}${value.unit}`;
      return v;
    }
    // DTCG easing function (array of numbers)
    if (Array.isArray(value) && value.every(v => typeof v === 'number')) {
      return `cubic-bezier(${value.join(', ')})`;
    }
    // Font family array
    if (Array.isArray(value)) {
      return value.join(', ');
    }
  }

  value = String(value);

  // Normalize pixel/unit values: 0px -> 0, 0ms -> 0, etc.
  if (value.match(/^0[a-z%]+$/i)) {
    return '0';
  }

  // Normalize oklch/rgb/cubic-bezier values: collapse spaces and normalize numbers
  if (value.includes('oklch') || value.includes('rgb') || value.includes('cubic-bezier')) {
    value = value.replace(/\s+/g, ' ').trim();

    // Normalize decimal numbers: 0.870 -> 0.87, 0.740 -> 0.74, etc.
    value = value.replace(/\b(\d+\.\d*?)0+\b/g, (match) => {
      return parseFloat(match).toString();
    });
  }

  // Collapse all whitespace
  value = value.replace(/\s+/g, ' ').trim();

  return value;
}

function compareValues(val1, val2) {
  // Check for non-comparable values BEFORE normalization
  // These are complex shadow/easing structures that can't be meaningfully compared
  if (typeof val1 === 'object' || typeof val2 === 'object') {
    if ((Array.isArray(val1) && val1.some(v => typeof v === 'object')) ||
        (Array.isArray(val2) && val2.some(v => typeof v === 'object'))) {
      return 'not-comparable';
    }
  }

  val1 = normalizeValue(val1);
  val2 = normalizeValue(val2);

  // Skip complex values that can't be compared
  if (val1.includes('calc(') || val2.includes('calc(')) return 'not-comparable';
  if (val1.includes('color-mix(') || val2.includes('color-mix(')) return 'not-comparable';
  if (val1.includes('linear-gradient(') || val2.includes('linear-gradient(')) return 'not-comparable';
  if (val1.includes('var(') || val2.includes('var(')) return 'not-comparable';
  if (val1.includes('[object Object]') || val2.includes('[object Object]')) return 'not-comparable';

  return val1 === val2 ? 'match' : 'mismatch';
}

// ============================================================================
// 8. MAIN AUDIT
// ============================================================================

const cssVars = collectCssVariables();
const darkVars = extractDarkThemeCss();
const dtcgTokens = parseDtcgFile();
const tokensJsonTokens = parseTokensJson();

// Normalize CSS names
const normalizedCssVars = {};
for (const [name, value] of Object.entries(cssVars)) {
  if (!name.startsWith('_')) {
    normalizedCssVars[name] = value;
  }
}

// Convert DTCG paths to CSS names
const normalizedDtcg = {};
for (const [path, value] of Object.entries(dtcgTokens)) {
  const cssName = dtcgNameToCssName(path);
  normalizedDtcg[cssName] = value;
}

// Add aliased mappings (shadow -> elevation, typography -> text)
const aliasedNames = new Map();
for (const name of Object.keys(normalizedDtcg)) {
  const aliased = getDtcgAliasedName(name);
  if (aliased && normalizedCssVars[aliased] && !normalizedDtcg[aliased]) {
    aliasedNames.set(name, aliased);
  }
}

// Get all unique token names
const allNames = new Set([
  ...Object.keys(normalizedCssVars),
  ...Object.keys(tokensJsonTokens),
  ...Object.keys(normalizedDtcg),
]);

// ============================================================================
// 9. COMPARE AND REPORT
// ============================================================================

const missingInCss = [];
const missingInTokensJson = [];
const missingInDtcg = [];
const mismatchesCssVsDtcg = [];
const mismatchesCssVsTokensJson = [];
const darkMismatches = [];

for (const name of allNames) {
  const inCss = name in normalizedCssVars;
  const inTokensJson = name in tokensJsonTokens;
  const inDtcg = name in normalizedDtcg;

  // Check for missing tokens
  if (!inCss && inDtcg && !aliasedNames.has(name)) {
    missingInCss.push(name);
  }
  if (!inTokensJson && inDtcg) {
    missingInTokensJson.push(name);
  }
  if (!inDtcg && (inCss || inTokensJson)) {
    missingInDtcg.push(name);
  }

  // Check for mismatches CSS vs DTCG
  if (inDtcg) {
    // Use aliased name if available, otherwise use direct name
    const cssName = aliasedNames.has(name) ? aliasedNames.get(name) : name;
    const cssVal = normalizedCssVars[cssName];

    if (cssVal) {
      const result = compareValues(
        cssVal,
        normalizedDtcg[name].$value || normalizedDtcg[name]
      );
      if (result === 'mismatch') {
        mismatchesCssVsDtcg.push({
          name,
          css: cssVal,
          dtcg: normalizedDtcg[name].$value || normalizedDtcg[name],
        });
      }
    }
  }

  // Check for mismatches CSS vs tokens.json (light theme)
  if (inCss && inTokensJson) {
    const tokenValue = tokensJsonTokens[name];
    let lightValue = tokenValue;

    // Extract light value if it's a theme-specific object
    if (typeof tokenValue === 'object' && tokenValue !== null && tokenValue.light) {
      lightValue = tokenValue.light;
    }

    const result = compareValues(normalizedCssVars[name], lightValue);
    if (result === 'mismatch') {
      mismatchesCssVsTokensJson.push({
        name,
        css: normalizedCssVars[name],
        tokensJson: lightValue,
      });
    }

    // Check dark theme if available
    if (typeof tokenValue === 'object' && tokenValue !== null && tokenValue.dark) {
      const darkValue = tokenValue.dark;
      if (name in darkVars) {
        const darkResult = compareValues(darkVars[name], darkValue);
        if (darkResult === 'mismatch') {
          darkMismatches.push({
            name,
            dark: darkVars[name],
            tokensJson: darkValue,
          });
        }
      }
    }
  }
}

// Group missing-in-DTCG by prefix
function groupByPrefix(names) {
  const groups = {};
  for (const name of names) {
    const prefix = name.split('-')[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(name);
  }
  return groups;
}

const missingDtcgByPrefix = groupByPrefix(missingInDtcg);

// ============================================================================
// 10. PRINT REPORT
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
console.log(`  Breakdown by prefix:`);
for (const [prefix, names] of Object.entries(missingDtcgByPrefix).sort()) {
  console.log(`    ${prefix}: ${names.length}`);
}
console.log(`Mismatches (CSS vs DTCG): ${mismatchesCssVsDtcg.length}`);
console.log(`Mismatches (CSS vs tokens.json): ${mismatchesCssVsTokensJson.length}`);
console.log(`Mismatches (dark theme): ${darkMismatches.length}`);
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
  console.log('By prefix:');
  for (const [prefix, names] of Object.entries(missingDtcgByPrefix).sort()) {
    console.log(`  ${prefix} (${names.length}):`);
    const display = names.slice(0, 10);
    display.forEach(name => console.log(`    ${name}`));
    if (names.length > 10) {
      console.log(`    ... and ${names.length - 10} more`);
    }
  }
  console.log('');
}

if (mismatchesCssVsDtcg.length > 0) {
  console.log('MISMATCHES: CSS vs DTCG (after normalization)');
  console.log('-'.repeat(80));
  const display = mismatchesCssVsDtcg.slice(0, 60);
  display.forEach(item => {
    console.log(`  ${item.name}`);
    console.log(`    CSS:  ${normalizeValue(item.css)}`);
    console.log(`    DTCG: ${normalizeValue(item.dtcg)}`);
  });
  if (mismatchesCssVsDtcg.length > 60) {
    console.log(`  ... and ${mismatchesCssVsDtcg.length - 60} more mismatches`);
  }
  console.log(`Total: ${mismatchesCssVsDtcg.length}`);
  console.log('');
}

if (mismatchesCssVsTokensJson.length > 0) {
  console.log('MISMATCHES: CSS vs tokens.json (light theme, after normalization)');
  console.log('-'.repeat(80));
  const display = mismatchesCssVsTokensJson.slice(0, 60);
  display.forEach(item => {
    console.log(`  ${item.name}`);
    console.log(`    CSS:        ${normalizeValue(item.css)}`);
    console.log(`    tokens.json: ${normalizeValue(item.tokensJson)}`);
  });
  if (mismatchesCssVsTokensJson.length > 60) {
    console.log(`  ... and ${mismatchesCssVsTokensJson.length - 60} more mismatches`);
  }
  console.log(`Total: ${mismatchesCssVsTokensJson.length}`);
  console.log('');
}

if (darkMismatches.length > 0) {
  console.log('MISMATCHES: dark theme (base-dark.css vs tokens.json)');
  console.log('-'.repeat(80));
  const display = darkMismatches.slice(0, 60);
  display.forEach(item => {
    console.log(`  ${item.name}`);
    console.log(`    dark CSS:   ${normalizeValue(item.dark)}`);
    console.log(`    tokens.json: ${normalizeValue(item.tokensJson)}`);
  });
  if (darkMismatches.length > 60) {
    console.log(`  ... and ${darkMismatches.length - 60} more mismatches`);
  }
  console.log('');
}

console.log('='.repeat(80));

// Exit with appropriate code
const hasIssues = missingInCss.length > 0 ||
                  missingInTokensJson.length > 0 ||
                  missingInDtcg.length > 0 ||
                  mismatchesCssVsDtcg.length > 0 ||
                  mismatchesCssVsTokensJson.length > 0 ||
                  darkMismatches.length > 0;

process.exit(strict && hasIssues ? 1 : 0);
