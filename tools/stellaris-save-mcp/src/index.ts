#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ============================================================
// Configuration — auto-detect Stellaris data folder
// ============================================================

const STELLARIS_PATHS = [
  path.join(process.env.USERPROFILE || process.env.HOME || "", "OneDrive/Documents/Paradox Interactive/Stellaris"),
  path.join(process.env.USERPROFILE || process.env.HOME || "", "Documents/Paradox Interactive/Stellaris"),
  path.join(process.env.HOME || "", ".local/share/Paradox Interactive/Stellaris"),
];

function findStellarisDir(): string {
  // Check env override first
  if (process.env.STELLARIS_DIR && fs.existsSync(process.env.STELLARIS_DIR)) {
    return process.env.STELLARIS_DIR;
  }
  for (const p of STELLARIS_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Stellaris data folder not found. Set STELLARIS_DIR environment variable.");
}

let STELLARIS_DIR: string;
try {
  STELLARIS_DIR = findStellarisDir();
  console.error(`Stellaris dir: ${STELLARIS_DIR}`);
} catch (e) {
  console.error(`Warning: ${(e as Error).message}`);
  STELLARIS_DIR = "";
}

const SAVE_DIR = path.join(STELLARIS_DIR, "save games");

// ============================================================
// Version Detection & Comparison
// ============================================================

interface GameVersion {
  raw: string;          // "Cetus v4.3.3"
  codename: string;     // "Cetus"
  major: number;        // 4
  minor: number;        // 3
  patch: number;        // 3
  numeric: number;      // 40303 — for comparison
}

function parseVersion(raw: string): GameVersion {
  const match = raw.match(/^(\w+)\s+v?(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return { raw, codename: "", major: 0, minor: 0, patch: 0, numeric: 0 };
  const [, codename, maj, min, pat] = match;
  const major = parseInt(maj);
  const minor = parseInt(min);
  const patch = parseInt(pat || "0");
  return { raw, codename, major, minor, patch, numeric: major * 10000 + minor * 100 + patch };
}

function getInstalledVersion(): GameVersion | null {
  const settingsPath = path.join(STELLARIS_DIR, "settings.txt");
  if (!fs.existsSync(settingsPath)) return null;
  const text = fs.readFileSync(settingsPath, "utf-8");
  const match = text.match(/show_startup_game_info="([^"]+)"/);
  if (!match) return null;
  return parseVersion(match[1]);
}

function versionStaleness(saveVer: GameVersion, installedVer: GameVersion): { stale: boolean; severity: "current" | "patch" | "minor" | "major"; message: string } {
  if (saveVer.numeric === installedVer.numeric) {
    return { stale: false, severity: "current", message: "current" };
  }
  if (saveVer.major !== installedVer.major) {
    return { stale: true, severity: "major", message: `MAJOR version mismatch: save=${saveVer.raw}, installed=${installedVer.raw} — game mechanics likely changed significantly` };
  }
  if (saveVer.minor !== installedVer.minor) {
    return { stale: true, severity: "minor", message: `Minor version mismatch: save=${saveVer.raw}, installed=${installedVer.raw} — balance/mechanics may have changed` };
  }
  return { stale: true, severity: "patch", message: `Patch mismatch: save=${saveVer.raw}, installed=${installedVer.raw} — minor fixes, data likely still valid` };
}

/** Detect version of empire designs file by format heuristics. */
function detectDesignFileVersion(): { file: string; format_version: string; estimated_game_version: string; stale: boolean; message: string } {
  const currentPath = path.join(STELLARIS_DIR, "user_empire_designs.txt");
  const legacyPath = path.join(STELLARIS_DIR, "user_empire_designs_v3.4.txt");
  const installed = getInstalledVersion();

  const hasCurrent = fs.existsSync(currentPath);
  const hasLegacy = fs.existsSync(legacyPath);

  if (!hasCurrent) {
    return { file: "", format_version: "none", estimated_game_version: "none", stale: true, message: "No empire designs file found" };
  }

  // Check format: v3.4 uses nested key objects (ship_prefix={ key="" }), v4.x uses inline (ship_prefix="")
  const sample = fs.readFileSync(currentPath, "utf-8").substring(0, 2000);
  const usesNestedKeys = /ship_prefix=\s*\{/.test(sample);

  if (usesNestedKeys) {
    return {
      file: currentPath,
      format_version: "3.x",
      estimated_game_version: "3.x (pre-4.0)",
      stale: installed ? installed.major >= 4 : true,
      message: installed && installed.major >= 4
        ? `STALE: Empire designs use 3.x format but game is ${installed.raw} — designs may need recreation`
        : "Empire designs use 3.x format",
    };
  }

  // Current format — check mtime as proxy for when designs were last edited
  const stat = fs.statSync(currentPath);
  const daysSinceModified = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);

  return {
    file: currentPath,
    format_version: "4.x",
    estimated_game_version: "4.x (current format)",
    stale: false,
    message: `4.x format, last modified ${Math.floor(daysSinceModified)} days ago${hasLegacy ? " (legacy v3.4 backup also exists)" : ""}`,
  };
}

// ============================================================
// Clausewitz Text Parser
// ============================================================

type CWValue = string | number | boolean | CWObject | CWValue[];
interface CWObject { [key: string]: CWValue; }

/** Lightweight clausewitz parser. Handles nested {}, quoted strings, bare tokens. */
function parseCW(text: string): CWObject {
  let pos = 0;
  const len = text.length;

  function skipWhitespace() {
    while (pos < len) {
      const ch = text[pos];
      if (ch === '#') { // comment
        while (pos < len && text[pos] !== '\n') pos++;
      } else if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        pos++;
      } else break;
    }
  }

  function readQuotedString(): string {
    pos++; // skip opening "
    let s = "";
    while (pos < len && text[pos] !== '"') {
      s += text[pos++];
    }
    pos++; // skip closing "
    return s;
  }

  function readToken(): string {
    let s = "";
    while (pos < len && !/[\s={}"]/.test(text[pos]) && text[pos] !== '#') {
      s += text[pos++];
    }
    return s;
  }

  function readValue(): CWValue {
    skipWhitespace();
    if (pos >= len) return "";

    if (text[pos] === '"') return readQuotedString();
    if (text[pos] === '{') return readBlock();

    const tok = readToken();
    if (tok === "yes") return true;
    if (tok === "no") return false;
    const num = Number(tok);
    if (!isNaN(num) && tok !== "") return num;
    return tok;
  }

  function readBlock(): CWObject {
    pos++; // skip {
    const obj: CWObject = {};
    const list: CWValue[] = [];
    let isList = false;

    while (true) {
      skipWhitespace();
      if (pos >= len || text[pos] === '}') { pos++; break; }

      // Check if this is key=value or a bare value
      const startPos = pos;
      let key: string;

      if (text[pos] === '"') {
        key = readQuotedString();
      } else if (text[pos] === '{') {
        // Nested anonymous block
        list.push(readBlock());
        isList = true;
        continue;
      } else {
        key = readToken();
      }

      skipWhitespace();

      if (pos < len && text[pos] === '=') {
        // key=value pair
        pos++; // skip =
        skipWhitespace();
        const val = readValue();

        // Handle duplicate keys by converting to array
        if (key in obj) {
          const existing = obj[key];
          if (Array.isArray(existing)) {
            existing.push(val);
          } else {
            obj[key] = [existing, val];
          }
        } else {
          obj[key] = val;
        }
      } else {
        // Bare value in a list
        let val: CWValue;
        if (key === "yes") val = true;
        else if (key === "no") val = false;
        else {
          const num = Number(key);
          val = (!isNaN(num) && key !== "") ? num : key;
        }
        list.push(val);
        isList = true;
      }
    }

    if (isList && Object.keys(obj).length === 0) {
      return { _list: list } as any;
    }
    if (isList) {
      obj._list = list;
    }
    return obj;
  }

  return readBlock().constructor === Object ? (() => {
    // Parse top-level as implicit block
    const obj: CWObject = {};
    while (pos < len) {
      skipWhitespace();
      if (pos >= len) break;

      let key: string;
      if (text[pos] === '"') {
        key = readQuotedString();
      } else {
        key = readToken();
      }
      if (!key) break;

      skipWhitespace();
      if (pos < len && text[pos] === '=') {
        pos++;
        skipWhitespace();
        const val = readValue();
        if (key in obj) {
          const existing = obj[key];
          if (Array.isArray(existing)) existing.push(val);
          else obj[key] = [existing, val];
        } else {
          obj[key] = val;
        }
      }
    }
    return obj;
  })() : {};
}

// Reset parser state and do it right
function parseClausewitz(text: string): CWObject {
  let pos = 0;
  const len = text.length;

  function skip() {
    while (pos < len) {
      if (text[pos] === '#') { while (pos < len && text[pos] !== '\n') pos++; }
      else if (" \t\r\n".includes(text[pos])) pos++;
      else break;
    }
  }

  function readStr(): string {
    pos++; let s = "";
    while (pos < len && text[pos] !== '"') s += text[pos++];
    pos++; return s;
  }

  function readTok(): string {
    let s = "";
    while (pos < len && !" \t\r\n={}\"#".includes(text[pos])) s += text[pos++];
    return s;
  }

  function toVal(s: string): CWValue {
    if (s === "yes") return true;
    if (s === "no") return false;
    const n = Number(s);
    return (!isNaN(n) && s !== "") ? n : s;
  }

  function readVal(): CWValue {
    skip();
    if (text[pos] === '"') return readStr();
    if (text[pos] === '{') return readObj();
    return toVal(readTok());
  }

  function readObj(): CWValue {
    pos++; // skip {
    const obj: CWObject = {};
    const list: CWValue[] = [];

    while (true) {
      skip();
      if (pos >= len || text[pos] === '}') { pos++; break; }

      if (text[pos] === '{') {
        list.push(readObj());
        continue;
      }

      const mark = pos;
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

  // Top-level is an implicit object
  const root: CWObject = {};
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
        if (Array.isArray(ex)) (ex as CWValue[]).push(val); else root[tok] = [ex, val];
      } else root[tok] = val;
    }
  }
  return root;
}

// ============================================================
// Save Game File Handling
// ============================================================

function listSaveGames(): Array<{ name: string; folder: string; files: string[]; latest: string; size: number }> {
  if (!fs.existsSync(SAVE_DIR)) return [];
  const folders = fs.readdirSync(SAVE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  return folders.map(folder => {
    const fullPath = path.join(SAVE_DIR, folder);
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith(".sav"));
    // Sort by mtime descending
    const withStats = files.map(f => {
      const stat = fs.statSync(path.join(fullPath, f));
      return { name: f, mtime: stat.mtimeMs, size: stat.size };
    }).sort((a, b) => b.mtime - a.mtime);

    return {
      name: folder.replace(/_-?\d+$/, "").replace(/_/g, " "),
      folder,
      files: withStats.map(f => f.name),
      latest: withStats[0]?.name || "",
      size: withStats[0]?.size || 0,
    };
  }).sort((a, b) => {
    // Sort by latest file mtime
    const aPath = path.join(SAVE_DIR, a.folder, a.latest);
    const bPath = path.join(SAVE_DIR, b.folder, b.latest);
    try {
      return fs.statSync(bPath).mtimeMs - fs.statSync(aPath).mtimeMs;
    } catch { return 0; }
  });
}

function extractFromZip(savePath: string, entryName: string): string {
  // Use unzip command (available on Windows via git bash / msys)
  try {
    const result = execSync(`unzip -p "${savePath}" ${entryName}`, {
      maxBuffer: 256 * 1024 * 1024, // 256MB buffer for large gamestates
      encoding: "utf-8",
    });
    return result;
  } catch (e) {
    throw new Error(`Failed to extract ${entryName} from ${savePath}: ${(e as Error).message}`);
  }
}

function readSaveMeta(savePath: string): CWObject {
  const metaText = extractFromZip(savePath, "meta");
  return parseClausewitz(metaText);
}

/** Extract a section from gamestate by line range. Avoids loading entire 130MB file into JS. */
function extractGamestateSection(savePath: string, sectionName: string, maxLines = 5000): string {
  try {
    // Find section start line, then extract that many lines
    const cmd = `unzip -p "${savePath}" gamestate | grep -n "^${sectionName}=" | head -1`;
    const lineResult = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }).trim();
    if (!lineResult) throw new Error(`Section "${sectionName}" not found`);

    const startLine = parseInt(lineResult.split(":")[0]);
    const extractCmd = `unzip -p "${savePath}" gamestate | sed -n '${startLine},${startLine + maxLines}p'`;
    return execSync(extractCmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    throw new Error(`Failed to extract section ${sectionName}: ${(e as Error).message}`);
  }
}

/** Extract specific country block by ID */
function extractCountry(savePath: string, countryId: number): string {
  // Find the country= section, then find the specific country ID within it
  const cmd = `unzip -p "${savePath}" gamestate | grep -n "^country=" | head -1`;
  const lineResult = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }).trim();
  if (!lineResult) throw new Error("country section not found");

  const countryStart = parseInt(lineResult.split(":")[0]);
  // Extract a window and search for the country ID block within it
  // Each country can be thousands of lines, so we extract generously
  const extractCmd = `unzip -p "${savePath}" gamestate | sed -n '${countryStart},${countryStart + 500000}p'`;
  const bigChunk = execSync(extractCmd, { encoding: "utf-8", maxBuffer: 128 * 1024 * 1024 });

  // Find the specific country ID block
  const idPattern = new RegExp(`^\\t${countryId}=\\s*$`, "m");
  const match = idPattern.exec(bigChunk);
  if (!match) throw new Error(`Country ${countryId} not found`);

  // Extract from the match position, tracking brace depth
  const startIdx = match.index;
  let depth = 0;
  let foundOpen = false;
  let endIdx = startIdx;

  for (let i = startIdx; i < bigChunk.length; i++) {
    if (bigChunk[i] === '{') { depth++; foundOpen = true; }
    if (bigChunk[i] === '}') { depth--; }
    if (foundOpen && depth === 0) { endIdx = i + 1; break; }
  }

  return bigChunk.substring(startIdx, endIdx);
}

// ============================================================
// Data Extraction Helpers
// ============================================================

interface EmpireSummary {
  id: number;
  name: string;
  type: string;
  military_power: number;
  economy_power: number;
  tech_power: number;
  fleet_size: number;
  naval_capacity: number;
  pops: number;
  systems: number;
  victory_score: number;
}

function extractEmpireSummaries(savePath: string): EmpireSummary[] {
  // Extract the country section and scan it line-by-line in JS
  // Much more reliable than piping through awk with shell escaping issues
  const cmd = `unzip -p "${savePath}" gamestate`;
  let raw: string;
  try {
    raw = execSync(cmd, { encoding: "utf-8", maxBuffer: 256 * 1024 * 1024, timeout: 120000 });
  } catch (e) {
    console.error("Failed to extract gamestate:", (e as Error).message);
    return [];
  }

  // Find the country= section
  const countryIdx = raw.indexOf("\ncountry=\n");
  if (countryIdx === -1) return [];

  const empires: EmpireSummary[] = [];
  let current: Partial<EmpireSummary> | null = null;

  // Scan from country= onwards
  const lines = raw.substring(countryIdx).split("\n");
  let depth = 0;
  let inCountry = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track brace depth
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }

    // Top-level country= section start
    if (line === "country=") { inCountry = true; continue; }

    // Exit country section when we hit another top-level key
    if (inCountry && depth === 0 && /^[a-z]/.test(line) && line.includes("=")) break;

    if (!inCountry) continue;

    // Country ID line: \tNUMBER=
    const idMatch = line.match(/^\t(\d+)=$/);
    if (idMatch && depth <= 2) {
      if (current && current.id !== undefined) empires.push(current as EmpireSummary);
      current = {
        id: parseInt(idMatch[1]), name: "", type: "default",
        military_power: 0, economy_power: 0, tech_power: 0,
        fleet_size: 0, naval_capacity: 0, pops: 0, systems: 0, victory_score: 0,
      };
      continue;
    }

    if (!current) continue;

    // Key=value lines at depth 2 (inside a country block)
    const kvMatch = line.match(/^\t\t(\w+)=(.+)/);
    if (!kvMatch) continue;
    const [, key, val] = kvMatch;
    const numVal = parseFloat(val);

    switch (key) {
      case "military_power": current.military_power = numVal; break;
      case "economy_power": current.economy_power = numVal; break;
      case "tech_power": current.tech_power = numVal; break;
      case "fleet_size": current.fleet_size = numVal; break;
      case "used_naval_capacity": current.naval_capacity = numVal; break;
      case "num_sapient_pops": current.pops = numVal; break;
      case "victory_score": current.victory_score = numVal; break;
      case "type": current.type = val.replace(/"/g, "").trim(); break;
    }
  }
  if (current && current.id !== undefined) empires.push(current as EmpireSummary);

  return empires.filter(e =>
    e.type === "default" || e.type === "fallen_empire" ||
    e.type === "awakened_fallen_empire"
  );
}

function extractEmpireDetail(savePath: string, countryId: number): CWObject {
  // Load the full gamestate and extract the specific country block
  const cmd = `unzip -p "${savePath}" gamestate`;
  const raw = execSync(cmd, { encoding: "utf-8", maxBuffer: 256 * 1024 * 1024, timeout: 120000 });

  // Find the country= section
  const countryIdx = raw.indexOf("\ncountry=\n");
  if (countryIdx === -1) throw new Error("country section not found");

  // Find the specific country ID: \tID=\n\t{
  const idPattern = `\t${countryId}=\n`;
  const idIdx = raw.indexOf(idPattern, countryIdx);
  if (idIdx === -1) throw new Error(`Country ${countryId} not found`);

  // Track brace depth to find end of this country block
  const blockStart = raw.indexOf("{", idIdx);
  if (blockStart === -1) throw new Error(`No block start for country ${countryId}`);

  let depth = 0;
  let endIdx = blockStart;
  for (let i = blockStart; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    if (raw[i] === '}') depth--;
    if (depth === 0) { endIdx = i + 1; break; }
  }

  const countryText = `country_${countryId}=\n${raw.substring(blockStart, endIdx)}`;
  const parsed = parseClausewitz(countryText);
  return (parsed[`country_${countryId}`] as CWObject) || {};
}

function extractBudget(empireData: CWObject): CWObject | null {
  const budget = empireData.budget as CWObject;
  if (!budget) return null;
  return budget;
}

function extractTechs(empireData: CWObject): string[] {
  const techStatus = empireData.tech_status as CWObject;
  if (!techStatus) return [];

  // tech_status contains interleaved technology="name" level=1 pairs
  const techs: string[] = [];
  const entries = Object.entries(techStatus);
  for (const [key, val] of entries) {
    if (key === "technology") {
      if (Array.isArray(val)) {
        techs.push(...(val as string[]));
      } else if (typeof val === "string") {
        techs.push(val);
      }
    }
  }
  return techs;
}

// ============================================================
// Empire Designs Parser
// ============================================================

interface EmpireDesign {
  name: string;
  authority: string;
  ethics: string[];
  civics: string[];
  origin: string;
  species_class: string;
  species_name: string;
  traits: string[];
  planet_class: string;
  government: string;
  spawn_enabled: boolean;
}

function parseEmpireDesigns(): EmpireDesign[] {
  const designsPath = path.join(STELLARIS_DIR, "user_empire_designs.txt");
  if (!fs.existsSync(designsPath)) return [];

  const text = fs.readFileSync(designsPath, "utf-8");
  const parsed = parseClausewitz(text);
  const designs: EmpireDesign[] = [];

  for (const [name, data] of Object.entries(parsed)) {
    if (typeof data !== "object" || data === null) continue;
    const d = data as CWObject;

    const species = (d.species as CWObject) || {};
    const civicsBlock = d.civics;
    let civics: string[] = [];
    if (Array.isArray(civicsBlock)) {
      civics = civicsBlock as string[];
    } else if (typeof civicsBlock === "object" && civicsBlock !== null) {
      const list = (civicsBlock as any)._list || (civicsBlock as any);
      if (Array.isArray(list)) civics = list as string[];
    }

    // Collect ethics — can be single or multiple ethic= keys
    const ethicVal = d.ethic;
    let ethics: string[] = [];
    if (Array.isArray(ethicVal)) {
      ethics = ethicVal as string[];
    } else if (typeof ethicVal === "string") {
      ethics = [ethicVal];
    }

    // Collect traits from species
    const traitVal = species.trait;
    let traits: string[] = [];
    if (Array.isArray(traitVal)) {
      traits = traitVal as string[];
    } else if (typeof traitVal === "string") {
      traits = [traitVal];
    }

    designs.push({
      name,
      authority: String(d.authority || ""),
      ethics,
      civics,
      origin: String(d.origin || "origin_default"),
      species_class: String(species.class || ""),
      species_name: String(species.name || ""),
      traits,
      planet_class: String(d.planet_class || ""),
      government: String(d.government || ""),
      spawn_enabled: d.spawn_enabled === true || d.spawn_enabled === "yes",
    });
  }

  return designs;
}

// ============================================================
// MCP Server
// ============================================================

const server = new McpServer({
  name: "stellaris-saves",
  version: "1.0.0",
});

// --- Tool: game_version ---
server.tool(
  "game_version",
  "Get the installed Stellaris game version, empire design format version, and version info for recent saves. Use this first to understand whether data from saves and designs is current or stale.",
  {},
  async () => {
    try {
      const installed = getInstalledVersion();
      const designInfo = detectDesignFileVersion();

      // Get version from 5 most recent saves
      const saves = listSaveGames().slice(0, 5);
      const saveVersions: Array<{ name: string; version: string; date: string; staleness: string }> = [];

      for (const save of saves) {
        try {
          const savePath = path.join(SAVE_DIR, save.folder, save.latest);
          const meta = readSaveMeta(savePath);
          const saveVer = parseVersion(String(meta.version || ""));
          const date = String(meta.date || "");
          const staleness = installed ? versionStaleness(saveVer, installed) : null;
          saveVersions.push({
            name: save.name,
            version: saveVer.raw,
            date,
            staleness: staleness ? staleness.message : "unknown",
          });
        } catch { /* skip unreadable saves */ }
      }

      const lines = [
        `## Installed Game Version`,
        installed ? `**${installed.raw}** (${installed.codename} ${installed.major}.${installed.minor}.${installed.patch})` : "Could not detect (settings.txt not found)",
        "",
        `## Empire Designs`,
        `Format: ${designInfo.format_version}`,
        `Status: ${designInfo.message}`,
        "",
        `## Recent Saves`,
      ];

      for (const sv of saveVersions) {
        const icon = sv.staleness === "current" ? "[OK]"
          : sv.staleness.startsWith("Patch") ? "[~]"
          : sv.staleness.startsWith("Minor") ? "[!]"
          : sv.staleness.startsWith("MAJOR") ? "[!!]"
          : "[?]";
        lines.push(`${icon} **${sv.name}** — ${sv.version} (in-game ${sv.date}) — ${sv.staleness}`);
      }

      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: list_saves ---
server.tool(
  "list_saves",
  "List all Stellaris save games, sorted by most recent. Shows empire name, save files, sizes, and version staleness vs installed game.",
  {
    limit: z.number().int().default(20).describe("Max saves to list (default 20)"),
    filter: z.string().optional().describe("Filter save names containing this text (case-insensitive)"),
  },
  async ({ limit, filter }) => {
    try {
      let saves = listSaveGames();
      if (filter) {
        const lf = filter.toLowerCase();
        saves = saves.filter(s => s.name.toLowerCase().includes(lf) || s.folder.toLowerCase().includes(lf));
      }
      saves = saves.slice(0, limit);

      const installed = getInstalledVersion();
      const lines = saves.map((s, i) => {
        const sizeMB = (s.size / 1024 / 1024).toFixed(1);
        let versionTag = "";
        try {
          const savePath = path.join(SAVE_DIR, s.folder, s.latest);
          const meta = readSaveMeta(savePath);
          const saveVer = parseVersion(String(meta.version || ""));
          const staleness = installed ? versionStaleness(saveVer, installed) : null;
          const icon = !staleness ? "" : staleness.severity === "current" ? "" : staleness.severity === "patch" ? " [~patch]" : staleness.severity === "minor" ? " [!minor]" : " [!!MAJOR]";
          versionTag = ` | ${saveVer.raw} @ ${meta.date}${icon}`;
        } catch { /* skip */ }
        return `${i + 1}. **${s.name}** (${s.files.length} saves, ${sizeMB}MB${versionTag})\n   folder: ${s.folder}`;
      });

      const header = installed ? `Installed: **${installed.raw}**\n\n` : "";
      return { content: [{ type: "text" as const, text: `${header}${saves.length} save games:\n\n${lines.join("\n\n")}` }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: save_meta ---
server.tool(
  "save_meta",
  "Read metadata from a save game file — game version, date, player empire, DLCs, ironman status.",
  {
    folder: z.string().describe("Save game folder name (from list_saves)"),
    file: z.string().optional().describe("Specific .sav file (defaults to latest)"),
  },
  async ({ folder, file }) => {
    try {
      const saveDir = path.join(SAVE_DIR, folder);
      if (!fs.existsSync(saveDir)) {
        return { content: [{ type: "text" as const, text: `Save folder "${folder}" not found` }], isError: true };
      }

      const saveFile = file || fs.readdirSync(saveDir)
        .filter(f => f.endsWith(".sav"))
        .sort((a, b) => fs.statSync(path.join(saveDir, b)).mtimeMs - fs.statSync(path.join(saveDir, a)).mtimeMs)[0];

      const savePath = path.join(saveDir, saveFile);
      const meta = readSaveMeta(savePath);

      return { content: [{ type: "text" as const, text: JSON.stringify(meta, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: save_empires ---
server.tool(
  "save_empires",
  "List all empires in a save game with key stats: military power, economy, tech, fleet size, pops, score. Sorted by victory score.",
  {
    folder: z.string().describe("Save game folder name"),
    file: z.string().optional().describe("Specific .sav file (defaults to latest)"),
  },
  async ({ folder, file }) => {
    try {
      const saveDir = path.join(SAVE_DIR, folder);
      const saveFile = file || fs.readdirSync(saveDir)
        .filter(f => f.endsWith(".sav"))
        .sort((a, b) => fs.statSync(path.join(saveDir, b)).mtimeMs - fs.statSync(path.join(saveDir, a)).mtimeMs)[0];
      const savePath = path.join(saveDir, saveFile);

      // Version check
      const meta = readSaveMeta(savePath);
      const saveVer = parseVersion(String(meta.version || ""));
      const installed = getInstalledVersion();
      const staleness = installed ? versionStaleness(saveVer, installed) : null;
      const versionLine = `Save: ${saveVer.raw} @ ${meta.date}${staleness && staleness.stale ? ` — ${staleness.message}` : ""}`;

      const empires = extractEmpireSummaries(savePath);
      empires.sort((a, b) => b.victory_score - a.victory_score);

      const header = "Rank | ID | Military | Economy | Tech | Fleet | Naval Cap | Pops | Score";
      const sep = "—".repeat(90);
      const rows = empires.map((e, i) =>
        `${(i + 1).toString().padStart(4)} | ${e.id.toString().padStart(3)} | ${Math.floor(e.military_power).toString().padStart(10)} | ${Math.floor(e.economy_power).toString().padStart(9)} | ${Math.floor(e.tech_power).toString().padStart(7)} | ${e.fleet_size.toString().padStart(5)} | ${e.naval_capacity.toString().padStart(9)} | ${e.pops.toString().padStart(7)} | ${Math.floor(e.victory_score).toString().padStart(8)}`
      );

      return {
        content: [{
          type: "text" as const,
          text: `${versionLine}\n${empires.length} empires in ${saveFile}:\n\n${header}\n${sep}\n${rows.join("\n")}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: save_empire_detail ---
server.tool(
  "save_empire_detail",
  "Get detailed data for a specific empire from a save game — budget (income/expenses by source), tech list, fleet info, and AI strategy data.",
  {
    folder: z.string().describe("Save game folder name"),
    country_id: z.number().int().describe("Country ID (from save_empires)"),
    file: z.string().optional().describe("Specific .sav file (defaults to latest)"),
    section: z.enum(["all", "budget", "techs", "summary"]).default("summary").describe("What to extract: 'summary' (key stats), 'budget' (income/expenses), 'techs' (tech list), 'all' (everything)"),
  },
  async ({ folder, country_id, file, section }) => {
    try {
      const saveDir = path.join(SAVE_DIR, folder);
      const saveFile = file || fs.readdirSync(saveDir)
        .filter(f => f.endsWith(".sav"))
        .sort((a, b) => fs.statSync(path.join(saveDir, b)).mtimeMs - fs.statSync(path.join(saveDir, a)).mtimeMs)[0];
      const savePath = path.join(saveDir, saveFile);

      // Version info
      const meta = readSaveMeta(savePath);
      const saveVer = parseVersion(String(meta.version || ""));
      const installed = getInstalledVersion();
      const staleness = installed ? versionStaleness(saveVer, installed) : null;

      const empire = extractEmpireDetail(savePath, country_id);

      const result: Record<string, unknown> = {
        _version: saveVer.raw,
        _game_date: meta.date,
        _staleness: staleness ? staleness.severity : "unknown",
        _version_warning: staleness && staleness.stale ? staleness.message : undefined,
        country_id,
        military_power: empire.military_power,
        economy_power: empire.economy_power,
        tech_power: empire.tech_power,
        fleet_size: empire.fleet_size,
        naval_capacity: empire.used_naval_capacity,
        pops: empire.num_sapient_pops,
        victory_score: empire.victory_score,
        victory_rank: empire.victory_rank,
        empire_size: empire.empire_size,
        graphical_culture: empire.graphical_culture,
      };

      if (section === "budget" || section === "all") {
        result.budget = extractBudget(empire);
      }

      if (section === "techs" || section === "all") {
        result.technologies = extractTechs(empire);
      }

      // Truncate large outputs
      let text = JSON.stringify(result, null, 2);
      if (text.length > 50000) {
        text = text.substring(0, 50000) + "\n\n... [truncated — use section='budget' or section='techs' for focused extraction]";
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: empire_designs ---
server.tool(
  "empire_designs",
  "Parse user_empire_designs.txt — all custom empire templates with authority, ethics, civics, origin, traits, and species info.",
  {
    filter: z.string().optional().describe("Filter designs by name, ethic, civic, origin, or authority (case-insensitive)"),
  },
  async ({ filter }) => {
    try {
      let designs = parseEmpireDesigns();
      if (filter) {
        const lf = filter.toLowerCase();
        designs = designs.filter(d =>
          d.name.toLowerCase().includes(lf) ||
          d.authority.toLowerCase().includes(lf) ||
          d.ethics.some(e => e.toLowerCase().includes(lf)) ||
          d.civics.some(c => c.toLowerCase().includes(lf)) ||
          d.origin.toLowerCase().includes(lf) ||
          d.species_name.toLowerCase().includes(lf)
        );
      }

      const lines = designs.map(d =>
        `**${d.name}** ${d.spawn_enabled ? "" : "(disabled)"}
  Authority: ${d.authority}
  Ethics: ${d.ethics.join(", ")}
  Civics: ${d.civics.join(", ")}
  Origin: ${d.origin}
  Species: ${d.species_name} (${d.species_class}) — ${d.traits.join(", ")}
  Homeworld: ${d.planet_class}`
      );

      const designVer = detectDesignFileVersion();
      const versionHeader = `Designs format: ${designVer.format_version} — ${designVer.message}\n\n`;

      return {
        content: [{
          type: "text" as const,
          text: `${versionHeader}${designs.length} empire designs:\n\n${lines.join("\n\n")}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: empire_design_raw ---
server.tool(
  "empire_design_raw",
  "Get the raw parsed data for a specific empire design as JSON — useful for template building and simulator integration.",
  {
    name: z.string().describe("Empire design name (from empire_designs)"),
  },
  async ({ name }) => {
    try {
      const designs = parseEmpireDesigns();
      const design = designs.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (!design) {
        const suggestions = designs
          .filter(d => d.name.toLowerCase().includes(name.toLowerCase()))
          .map(d => d.name)
          .slice(0, 5);
        return {
          content: [{
            type: "text" as const,
            text: `Design "${name}" not found.${suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}?` : ""}`,
          }],
          isError: true,
        };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(design, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: save_raw_section ---
server.tool(
  "save_raw_section",
  "Extract a raw top-level section from a save game's gamestate file. Returns parsed clausewitz data as JSON. Useful for examining specific game data (species_db, planets, galactic_object, etc.).",
  {
    folder: z.string().describe("Save game folder name"),
    section: z.string().describe("Top-level section name (e.g. 'species_db', 'planets', 'galactic_object', 'nebula')"),
    max_lines: z.number().int().default(2000).describe("Max lines to extract from section (default 2000)"),
    file: z.string().optional().describe("Specific .sav file (defaults to latest)"),
  },
  async ({ folder, section: sectionName, max_lines, file }) => {
    try {
      const saveDir = path.join(SAVE_DIR, folder);
      const saveFile = file || fs.readdirSync(saveDir)
        .filter(f => f.endsWith(".sav"))
        .sort((a, b) => fs.statSync(path.join(saveDir, b)).mtimeMs - fs.statSync(path.join(saveDir, a)).mtimeMs)[0];
      const savePath = path.join(saveDir, saveFile);

      const raw = extractGamestateSection(savePath, sectionName, max_lines);
      const parsed = parseClausewitz(raw);

      let text = JSON.stringify(parsed, null, 2);
      if (text.length > 80000) {
        text = text.substring(0, 80000) + "\n\n... [truncated — reduce max_lines]";
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// ============================================================
// Start server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Stellaris Save MCP server running on stdio (data: ${STELLARIS_DIR})`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
