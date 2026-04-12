#!/usr/bin/env node
/**
 * Extract all regular empire profiles from a Stellaris save game.
 * Parses the gamestate once and outputs structured JSON for all target empires.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const SAVE_PATH = path.join(
  process.env.USERPROFILE || "",
  "OneDrive/Documents/Paradox Interactive/Stellaris/save games",
  "unitednationsofearth5_505588286/2200.01.05.sav"
);

// Target empire IDs (regular empires from summary)
const TARGET_IDS = new Set([
  0, 1, 8, 21, 40, 161, 170,
  16777218, 16777219, 16777220, 16777221, 16777222, 16777223,
  16777225, 16777226, 16777227, 16777228, 16777229, 16777230,
  16777231, 16777232, 16777233, 16777234, 16777235, 16777236,
  16777238, 16777239, 16777240, 16777241, 16777242, 16777243,
  16777244, 16777245, 16777246
]);

console.error("Extracting gamestate from save...");
const raw = execSync(`unzip -p "${SAVE_PATH}" gamestate`, {
  encoding: "utf-8",
  maxBuffer: 256 * 1024 * 1024,
  timeout: 120000,
});
console.error(`Gamestate loaded: ${(raw.length / 1024 / 1024).toFixed(1)} MB`);

// Also extract meta
const metaRaw = execSync(`unzip -p "${SAVE_PATH}" meta`, {
  encoding: "utf-8",
  maxBuffer: 10 * 1024 * 1024,
});

// Simple meta parse
function parseMeta(text) {
  const result = {};
  for (const m of text.matchAll(/(\w+)="([^"]*)"/g)) {
    result[m[1]] = m[2];
  }
  for (const m of text.matchAll(/(\w+)=(\d+(?:\.\d+)?)\s/g)) {
    if (!result[m[1]]) result[m[1]] = parseFloat(m[2]);
  }
  return result;
}

const meta = parseMeta(metaRaw);
console.error(`Save: ${meta.version} @ ${meta.date}`);

// ============================================================
// Clausewitz parser (simplified, handles the country blocks)
// ============================================================

function parseClausewitz(text) {
  let pos = 0;
  const len = text.length;

  function skip() {
    while (pos < len) {
      if (text[pos] === '#') { while (pos < len && text[pos] !== '\n') pos++; }
      else if (" \t\r\n".includes(text[pos])) pos++;
      else break;
    }
  }

  function readStr() {
    pos++; let s = "";
    while (pos < len && text[pos] !== '"') s += text[pos++];
    pos++; return s;
  }

  function readTok() {
    let s = "";
    while (pos < len && !" \t\r\n={}\"#".includes(text[pos])) s += text[pos++];
    return s;
  }

  function toVal(s) {
    if (s === "yes") return true;
    if (s === "no") return false;
    const n = Number(s);
    return (!isNaN(n) && s !== "") ? n : s;
  }

  function readVal() {
    skip();
    if (pos >= len) return "";
    if (text[pos] === '"') return readStr();
    if (text[pos] === '{') return readObj();
    return toVal(readTok());
  }

  function readObj() {
    pos++; // skip {
    const obj = {};
    const list = [];

    while (true) {
      skip();
      if (pos >= len || text[pos] === '}') { pos++; break; }

      if (text[pos] === '{') {
        list.push(readObj());
        continue;
      }

      const tok = text[pos] === '"' ? readStr() : readTok();
      skip();

      if (pos < len && text[pos] === '=') {
        pos++; skip();
        const val = readVal();
        if (tok in obj) {
          const ex = obj[tok];
          if (Array.isArray(ex)) ex.push(val); else obj[tok] = [ex, val];
        } else obj[tok] = val;
      } else {
        list.push(toVal(tok));
      }
    }

    if (list.length > 0 && Object.keys(obj).length === 0) return list;
    if (list.length > 0) obj._list = list;
    return obj;
  }

  // Top-level implicit object
  const root = {};
  while (pos < len) {
    skip();
    if (pos >= len) break;
    const tok = text[pos] === '"' ? readStr() : readTok();
    if (!tok) { pos++; continue; }
    skip();
    if (pos < len && text[pos] === '=') {
      pos++; skip();
      const val = readVal();
      if (tok in root) {
        const ex = root[tok];
        if (Array.isArray(ex)) ex.push(val); else root[tok] = [ex, val];
      } else root[tok] = val;
    }
  }
  return root;
}

// ============================================================
// Extract individual country blocks by brace-matching
// ============================================================

console.error("Finding country section...");
const countryIdx = raw.indexOf("\ncountry=\n");
if (countryIdx === -1) {
  console.error("ERROR: country section not found");
  process.exit(1);
}

// Find the opening brace of the country section
const countrySectionBrace = raw.indexOf("{", countryIdx);

// Pre-scan: find all top-level country IDs and their block boundaries
// Top-level country IDs are at depth=1 inside country={...}
console.error("Pre-scanning country blocks at depth 1...");
const countryBlocks = new Map(); // id -> { start, end }
{
  let depth = 0;
  let i = countrySectionBrace;
  const rawLen = raw.length;

  // Skip opening brace of country={}
  depth++; i++;

  while (i < rawLen && depth > 0) {
    const ch = raw[i];

    if (ch === '{') {
      depth++;
      i++;
    } else if (ch === '}') {
      depth--;
      i++;
    } else if (depth === 1 && (ch >= '0' && ch <= '9')) {
      // At depth 1, we might be seeing a country ID like \tNUMBER=\n\t{
      // Read backwards to check we're at start of line (after \t)
      if (i > 0 && raw[i - 1] === '\t') {
        // Read the number
        let numStr = "";
        let j = i;
        while (j < rawLen && raw[j] >= '0' && raw[j] <= '9') {
          numStr += raw[j]; j++;
        }
        // Check for =\n
        if (j < rawLen && raw[j] === '=') {
          const countryId = parseInt(numStr);
          // Skip to opening brace
          let k = j + 1;
          while (k < rawLen && (raw[k] === ' ' || raw[k] === '\t' || raw[k] === '\r' || raw[k] === '\n')) k++;
          if (k < rawLen && raw[k] === '{') {
            const blockStart = k;
            // Brace match to find end
            let bd = 0;
            let endIdx = k;
            for (let m = k; m < rawLen; m++) {
              if (raw[m] === '{') bd++;
              if (raw[m] === '}') bd--;
              if (bd === 0) { endIdx = m + 1; break; }
            }
            countryBlocks.set(countryId, { start: blockStart, end: endIdx });
            i = endIdx; // skip past this country block
            continue;
          }
        }
      }
      i++;
    } else {
      i++;
    }
  }
}
console.error(`Found ${countryBlocks.size} country blocks`);

const empireProfiles = [];

for (const targetId of TARGET_IDS) {
  console.error(`Extracting empire ${targetId}...`);

  const block = countryBlocks.get(targetId);
  if (!block) {
    console.error(`  WARNING: Country ${targetId} not found, skipping`);
    continue;
  }

  const countryText = raw.substring(block.start, block.end);
  console.error(`  Block size: ${(countryText.length / 1024).toFixed(0)} KB`);

  // Parse the country block
  let parsed;
  try {
    parsed = parseClausewitz(`root=${countryText}`);
    parsed = parsed.root || {};
  } catch (e) {
    console.error(`  ERROR parsing country ${targetId}: ${e.message}`);
    continue;
  }

  // Extract key fields
  const profile = {
    country_id: targetId,
    name: parsed.name || null,
    type: parsed.type || "default",
    government: parsed.government || null,
    graphical_culture: parsed.graphical_culture || null,

    // Power scores
    military_power: parsed.military_power || 0,
    economy_power: parsed.economy_power || 0,
    tech_power: parsed.tech_power || 0,
    fleet_size: parsed.fleet_size || 0,
    naval_capacity: parsed.used_naval_capacity || 0,
    num_pops: parsed.num_sapient_pops || 0,
    victory_score: parsed.victory_score || 0,
    victory_rank: parsed.victory_rank || 0,
    empire_size: parsed.empire_size || 0,

    // Ethics
    ethics: null,
    // Civics
    civics: null,
    // Authority
    authority: null,
    // Origin
    origin: null,
    // Personality
    personality: null,

    // Budget
    budget: null,

    // Technologies
    technologies: [],

    // Species info
    species_name: null,
  };

  // Extract ethics
  if (parsed.ethos && typeof parsed.ethos === "object") {
    const ethic = parsed.ethos.ethic;
    if (ethic) {
      if (Array.isArray(ethic)) {
        profile.ethics = ethic.map(e => typeof e === "object" ? e.ethic : String(e)).filter(Boolean);
      } else if (typeof ethic === "string") {
        profile.ethics = [ethic];
      } else if (typeof ethic === "object") {
        profile.ethics = [ethic.ethic].filter(Boolean);
      }
    }
  }

  // Extract government info
  if (parsed.government && typeof parsed.government === "object") {
    const gov = parsed.government;
    profile.authority = gov.authority || null;
    // civics can be an array (bare list) or object with civic= keys
    if (gov.civics) {
      if (Array.isArray(gov.civics)) {
        profile.civics = gov.civics.filter(c => typeof c === "string");
      } else if (typeof gov.civics === "object") {
        const civic = gov.civics.civic;
        if (civic) {
          profile.civics = Array.isArray(civic) ? civic : [civic];
        }
        // Also check _list
        if (gov.civics._list && Array.isArray(gov.civics._list)) {
          profile.civics = gov.civics._list.filter(c => typeof c === "string");
        }
      }
    }
    profile.origin = gov.origin || null;
    profile.government = gov.type || null;
  }

  // Extract personality (top-level field, not inside ai block)
  profile.personality = parsed.personality || null;

  // Extract techs
  if (parsed.tech_status && typeof parsed.tech_status === "object") {
    const ts = parsed.tech_status;
    const tech = ts.technology;
    if (tech) {
      if (Array.isArray(tech)) {
        profile.technologies = tech.filter(t => typeof t === "string");
      } else if (typeof tech === "string") {
        profile.technologies = [tech];
      }
    }
  }

  // Extract budget
  if (parsed.budget && typeof parsed.budget === "object") {
    profile.budget = extractBudgetSummary(parsed.budget);
  }

  // Extract species name from first species
  if (parsed.species_index !== undefined) {
    profile.species_index = parsed.species_index;
  }

  empireProfiles.push(profile);
  console.error(`  Done: ${profile.technologies.length} techs, ethics=${JSON.stringify(profile.ethics)}`);
}

function extractBudgetSummary(budget) {
  // The budget structure has current_month with income and expenses
  const result = { income: {}, expenses: {} };

  const current = budget.current_month;
  if (!current || typeof current !== "object") return result;

  const income = current.income;
  const expenses = current.expenses;

  if (income && typeof income === "object") {
    result.income = flattenBudgetCategory(income);
  }
  if (expenses && typeof expenses !== "undefined") {
    result.expenses = flattenBudgetCategory(expenses);
  }

  return result;
}

function flattenBudgetCategory(cat) {
  if (typeof cat !== "object" || cat === null) return {};
  const result = {};

  for (const [source, resources] of Object.entries(cat)) {
    if (typeof resources === "object" && resources !== null && !Array.isArray(resources)) {
      result[source] = {};
      for (const [resName, amount] of Object.entries(resources)) {
        if (typeof amount === "number" && amount !== 0) {
          result[source][resName] = amount;
        }
      }
      // Remove empty sources
      if (Object.keys(result[source]).length === 0) delete result[source];
    }
  }
  return result;
}

// Sort by country_id
empireProfiles.sort((a, b) => a.country_id - b.country_id);

console.error(`\nExtracted ${empireProfiles.length} empire profiles`);

// Write output
const outputPath = path.join("C:", "sandbox", "Sovereign-AI", "baseline", "empire_profiles.json");
fs.writeFileSync(outputPath, JSON.stringify({
  _meta: {
    save_file: "unitednationsofearth5_505588286/2200.01.05.sav",
    game_version: meta.version,
    game_date: meta.date,
    extraction_date: new Date().toISOString(),
    empire_count: empireProfiles.length,
  },
  empires: empireProfiles,
}, null, 2));

console.error(`Written to ${outputPath}`);
console.log(JSON.stringify({ success: true, count: empireProfiles.length }));
