#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// ============================================================
// Wiki API Client
// ============================================================

const WIKI_API = "https://stellaris.paradoxwikis.com/api.php";
const WIKI_BASE = "https://stellaris.paradoxwikis.com";
const USER_AGENT = "StellarisWikiMCP/1.0 (Sovereign AI Mod Tool)";

interface CacheEntry<T> {
  data: T;
  expires: number;
}

class WikiCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlMinutes: number = 30) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, expires: Date.now() + this.ttlMs });
  }
}

const cache = new WikiCache(60);

async function wikiApi(params: Record<string, string>): Promise<unknown> {
  const cacheKey = JSON.stringify(params);
  const cached = cache.get<unknown>(cacheKey);
  if (cached) return cached;

  const url = new URL(WIKI_API);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!resp.ok) {
    throw new Error(`Wiki API HTTP ${resp.status}: ${resp.statusText}`);
  }
  const data = await resp.json();
  cache.set(cacheKey, data);
  return data;
}

async function wikiGetHtml(title: string, section?: string): Promise<{ title: string; pageid: number; html: string; sections: PageSection[] }> {
  const params: Record<string, string> = {
    action: "parse",
    page: title,
    prop: "text|sections",
    disabletoc: "true",
  };
  if (section !== undefined) {
    params.section = section;
  }

  const data = (await wikiApi(params)) as {
    parse: { title: string; pageid: number; text: { "*": string }; sections: PageSection[] };
    error?: { code: string; info: string };
  };

  if ((data as any).error) {
    throw new Error((data as any).error.info);
  }

  return {
    title: data.parse.title,
    pageid: data.parse.pageid,
    html: data.parse.text["*"],
    sections: data.parse.sections || [],
  };
}

// ============================================================
// Cheerio-based structured data extraction
// ============================================================

/** Clean a cell's HTML into a compact text value. */
function cleanCell($: cheerio.CheerioAPI, el: cheerio.Cheerio<AnyNode>): string {
  // Remove edit sections and hidden elements
  el.find(".mw-editsection, .noprint").remove();

  // Convert effect-green/red spans to +/- prefixed values
  el.find("span.effect-green").each((_, e) => {
    const $e = $(e);
    const val = $e.text().trim();
    if (!val.startsWith("+") && !val.startsWith("−")) {
      $e.text(`+${val}`);
    }
  });
  el.find("span.effect-red").each((_, e) => {
    const $e = $(e);
    const val = $e.text().trim();
    if (!val.startsWith("−") && !val.startsWith("-") && !val.startsWith("+")) {
      $e.text(`−${val}`);
    }
  });

  // Convert images to their alt text or icon name
  el.find("img").each((_, img) => {
    const $img = $(img);
    let alt = $img.attr("alt") || "";
    // Strip .png/.svg suffix from icon alt text
    alt = alt.replace(/\.(png|svg|jpg)$/i, "").replace(/_/g, " ");
    $img.replaceWith(alt ? `[${alt}]` : "");
  });

  // Convert list items to semicolon-separated values
  const items: string[] = [];
  el.find("li").each((_, li) => {
    const text = $(li).text().trim();
    if (text) items.push(text);
  });
  if (items.length > 0) {
    // Remove the list elements so they don't double-count
    el.find("ul, ol").remove();
    const remaining = el.text().trim();
    const allParts = remaining ? [remaining, ...items] : items;
    return allParts.join("; ").replace(/\s+/g, " ").trim();
  }

  let text = el.text();
  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

/** Normalize a header name to a clean key. */
function normalizeHeader(raw: string): string {
  return raw
    .replace(/\.(png|svg|jpg)$/i, "")
    .replace(/\[.*?\]/g, "")   // remove [icon] leftovers
    .replace(/\s+/g, " ")
    .trim();
}

interface ExtractedTable {
  section: string;
  headers: string[];
  rows: Record<string, string>[];
  row_count: number;
}

/** Extract all data tables from an HTML string. Returns array of tables with header-keyed rows. */
function extractTables(html: string, sectionHint?: string): ExtractedTable[] {
  const $ = cheerio.load(html);
  const results: ExtractedTable[] = [];

  // Find all data tables (mildtable, wikitable, or standard tables with th/td)
  $("table").each((_, tbl) => {
    const $tbl = $(tbl);
    const classes = $tbl.attr("class") || "";

    // Skip navbox, navigation, and toc tables
    if (/navbox|navboxes|toc|sidebar/i.test(classes)) return;

    // Determine section context — find nearest preceding heading
    let section = sectionHint || "";
    if (!section) {
      const prev = $tbl.prevAll("h2, h3, h4").first();
      if (prev.length) {
        section = prev.text().replace(/\[edit.*?\]/g, "").trim();
      }
    }

    // Extract headers
    const headers: string[] = [];
    const headerRow = $tbl.find("tr").first();
    headerRow.find("th").each((_, th) => {
      headers.push(normalizeHeader(cleanCell($, $(th))));
    });

    // Skip tables with no headers or only 1 column
    if (headers.length < 2) return;

    // Extract data rows
    const rows: Record<string, string>[] = [];
    $tbl.find("tr").each((i, tr) => {
      if (i === 0 && headerRow.find("th").length > 0) return; // skip header row

      const $tr = $(tr);
      // Skip rows that are sub-headers (all th, no td)
      if ($tr.find("td").length === 0 && $tr.find("th").length > 0) {
        // This might be a section sub-header within the table — skip
        return;
      }

      const cells: string[] = [];
      // Handle rows with a leading th (row header) + td cells
      $tr.find("th, td").each((_, cell) => {
        cells.push(cleanCell($, $(cell)));
      });

      if (cells.length === 0) return;

      const row: Record<string, string> = {};
      // Get row ID if present (e.g., id="Prosperous_Unification")
      const rowId = $tr.attr("id");
      if (rowId) {
        row["_id"] = rowId.replace(/_/g, " ");
      }

      for (let c = 0; c < Math.min(cells.length, headers.length); c++) {
        if (headers[c] && cells[c]) {
          row[headers[c]] = cells[c];
        }
      }

      // Only add rows with actual data
      if (Object.keys(row).filter((k) => k !== "_id").length > 0) {
        rows.push(row);
      }
    });

    if (rows.length > 0) {
      results.push({ section, headers, rows, row_count: rows.length });
    }
  });

  return results;
}

/** Special extractor for the Ethics page which uses card layouts, not tables. */
function extractEthicsCards(html: string): Record<string, string>[] {
  const $ = cheerio.load(html);
  const ethics: Record<string, string>[] = [];

  // Ethics are in a faketable layout with styled card divs
  // Each ethic block has a heading + bonus list
  // Try to find ethic entries by looking for ethic names as headings or bold text
  const ethicNames = [
    "Authoritarian", "Fanatic Authoritarian",
    "Egalitarian", "Fanatic Egalitarian",
    "Materialist", "Fanatic Materialist",
    "Spiritualist", "Fanatic Spiritualist",
    "Militarist", "Fanatic Militarist",
    "Pacifist", "Fanatic Pacifist",
    "Xenophobe", "Fanatic Xenophobe",
    "Xenophile", "Fanatic Xenophile",
    "Gestalt Consciousness",
  ];

  // The page uses <b> or heading elements for ethic names
  // and <ul> lists for bonuses. Extract by scanning text nodes.
  const fullText = $.html() || "";

  for (const name of ethicNames) {
    const entry: Record<string, string> = { name };

    // Find the ethic's ID in the HTML (used as anchor)
    const anchor = name.replace(/ /g, "_");
    const anchorEl = $(`#${anchor}, [id="${anchor}"]`);

    if (anchorEl.length) {
      // Get the parent container and extract bonuses
      const container = anchorEl.closest("td, div, section") || anchorEl.parent();
      const bonuses: string[] = [];
      container.find("li").each((_, li) => {
        const text = $(li).text().trim();
        if (text && !text.includes("Principles:")) {
          bonuses.push(text);
        }
      });
      if (bonuses.length > 0) {
        entry.effects = bonuses.join("; ");
      }
    }

    // Determine the game key
    const prefix = name.startsWith("Fanatic ") ? "ethic_fanatic_" : name === "Gestalt Consciousness" ? "ethic_gestalt_" : "ethic_";
    const suffix = name.replace(/^Fanatic /, "").replace(/ /g, "_").toLowerCase();
    entry.game_id = prefix + suffix;

    // Determine tier
    if (name.startsWith("Fanatic ")) {
      entry.tier = "fanatic";
    } else if (name === "Gestalt Consciousness") {
      entry.tier = "gestalt";
    } else {
      entry.tier = "regular";
    }

    // Determine axis
    if (/Authoritarian|Egalitarian/.test(name)) entry.axis = "authority";
    else if (/Materialist|Spiritualist/.test(name)) entry.axis = "knowledge";
    else if (/Militarist|Pacifist/.test(name)) entry.axis = "war";
    else if (/Xenophobe|Xenophile/.test(name)) entry.axis = "diplomacy";
    else if (/Gestalt/.test(name)) entry.axis = "gestalt";

    ethics.push(entry);
  }

  return ethics;
}

// ============================================================
// Game data type registry
// ============================================================

interface GameDataType {
  page: string;
  section?: string;       // section index to fetch (for large pages)
  description: string;
  extractor?: "ethics";   // special extractor name
}

const GAME_DATA_TYPES: Record<string, GameDataType> = {
  origins: {
    page: "Origin",
    description: "Empire origins — starting conditions, effects, requirements",
  },
  ethics: {
    page: "Ethics",
    description: "Empire ethics — ideological bonuses and restrictions",
    extractor: "ethics",
  },
  civics: {
    page: "Civics",
    description: "Empire civics — government perks, effects, requirements",
  },
  authority: {
    page: "Government",
    section: "0",
    description: "Authority types — government structures, elections, effects",
  },
  traits_biological: {
    page: "Biological_traits",
    description: "Biological species traits — positive, negative, and special traits",
  },
  traits_machine: {
    page: "Machine_traits",
    description: "Machine species traits — positive, negative, and special traits",
  },
  buildings: {
    page: "Buildings",
    description: "Planetary buildings — effects, costs, requirements, jobs",
  },
  districts: {
    page: "Districts",
    description: "Planetary districts — effects, costs, jobs, requirements",
  },
  tech_physics: {
    page: "Physics_research",
    description: "Physics technologies — costs, tiers, effects, prerequisites",
  },
  tech_society: {
    page: "Society_research",
    description: "Society technologies — costs, tiers, effects, prerequisites",
  },
  tech_engineering: {
    page: "Engineering_research",
    description: "Engineering technologies — costs, tiers, effects, prerequisites",
  },
  traditions: {
    page: "Traditions",
    section: "2",
    description: "Tradition trees — adoption, individual traditions, finisher effects",
  },
  ai_personalities: {
    page: "AI_personalities",
    description: "AI personality types — behavior modifiers, ship composition, prerequisites",
  },
  policies: {
    page: "Policies",
    description: "Empire policies — war philosophy, economic, trade, species rights",
  },
  edicts: {
    page: "Edicts",
    description: "Empire edicts — temporary bonuses, costs, effects",
  },
  megastructures: {
    page: "Megastructures",
    description: "Megastructures — costs, stages, effects, requirements",
  },
  ship_sizes: {
    page: "Ship",
    description: "Ship classes — sizes, stats, costs, fleet composition",
  },
  armies: {
    page: "Army",
    description: "Army types — ground combat units, stats, costs",
  },
  ascension_perks: {
    page: "Ascension_perks",
    description: "Ascension perks — powerful empire-wide bonuses",
  },
  diplomatic_actions: {
    page: "Diplomacy",
    description: "Diplomatic actions — agreements, pacts, federations",
  },
  jobs: {
    page: "Jobs",
    description: "Pop jobs — resource production, requirements, strata",
  },
  resources: {
    page: "Resources",
    description: "Game resources — production, storage, trade value",
  },
  pop_management: {
    page: "Planetary_management",
    description: "Planet management — designation, housing, amenities, stability",
  },
};

// ============================================================
// HTML to clean text conversion (kept for wiki_page tool)
// ============================================================

function htmlToText(html: string): string {
  let text = html;

  text = text.replace(/<div[^>]*class="[^"]*(?:navbox|mw-editsection|noprint|toc)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  text = text.replace(/<span[^>]*class="[^"]*mw-editsection[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");

  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n#### $1\n");
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, "\n##### $1\n");

  text = text.replace(/<caption[^>]*>([\s\S]*?)<\/caption>/gi, "\nTable: $1\n");
  text = text.replace(/<th[^>]*>([\s\S]*?)<\/th>/gi, " | $1");
  text = text.replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, " | $1");
  text = text.replace(/<tr[^>]*>/gi, "\n");
  text = text.replace(/<\/?table[^>]*>/gi, "\n");
  text = text.replace(/<\/?thead[^>]*>/gi, "");
  text = text.replace(/<\/?tbody[^>]*>/gi, "");

  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  text = text.replace(/<\/?[ou]l[^>]*>/gi, "\n");
  text = text.replace(/<dd[^>]*>([\s\S]*?)<\/dd>/gi, "\n  $1");
  text = text.replace(/<dt[^>]*>([\s\S]*?)<\/dt>/gi, "\n$1: ");
  text = text.replace(/<\/?dl[^>]*>/gi, "\n");

  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1");

  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<p[^>]*>/gi, "");

  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*\/?>/gi, "[$1]");
  text = text.replace(/<img[^>]*\/?>/gi, "");

  text = text.replace(/<[^>]+>/g, "");

  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#039;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));

  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

// ============================================================
// Wiki data extraction functions
// ============================================================

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  pageid: number;
}

async function wikiSearch(query: string, limit: number): Promise<SearchResult[]> {
  const data = (await wikiApi({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    srprop: "snippet",
  })) as { query: { search: Array<{ title: string; snippet: string; pageid: number }> } };

  return data.query.search.map((r) => ({
    title: r.title,
    snippet: htmlToText(r.snippet),
    url: `${WIKI_BASE}/${encodeURIComponent(r.title.replace(/ /g, "_"))}`,
    pageid: r.pageid,
  }));
}

interface PageSection {
  index: string;
  level: string;
  heading: string;
  anchor: string;
}

interface PageContent {
  title: string;
  pageid: number;
  url: string;
  content: string;
  categories: string[];
  sections: PageSection[];
}

async function wikiGetPage(title: string): Promise<PageContent> {
  const data = (await wikiApi({
    action: "parse",
    page: title,
    prop: "text|categories|sections",
    disabletoc: "true",
  })) as {
    parse: {
      title: string;
      pageid: number;
      text: { "*": string };
      categories: Array<{ "*": string }>;
      sections: PageSection[];
    };
    error?: { code: string; info: string };
  };

  if ((data as any).error) {
    throw new Error(`Page not found: ${(data as any).error.info}`);
  }

  return {
    title: data.parse.title,
    pageid: data.parse.pageid,
    url: `${WIKI_BASE}/${encodeURIComponent(data.parse.title.replace(/ /g, "_"))}`,
    content: htmlToText(data.parse.text["*"]),
    categories: data.parse.categories.map((c) => c["*"]),
    sections: data.parse.sections,
  };
}

async function wikiGetSection(title: string, sectionIndex: string): Promise<{ title: string; section: string; content: string }> {
  const data = (await wikiApi({
    action: "parse",
    page: title,
    prop: "text",
    section: sectionIndex,
    disabletoc: "true",
  })) as {
    parse: { title: string; text: { "*": string } };
    error?: { code: string; info: string };
  };

  if ((data as any).error) {
    throw new Error(`Section not found: ${(data as any).error.info}`);
  }

  return {
    title: data.parse.title,
    section: sectionIndex,
    content: htmlToText(data.parse.text["*"]),
  };
}

interface PageLink {
  title: string;
  url: string;
  ns: number;
  exists: boolean;
}

async function wikiGetLinks(title: string): Promise<PageLink[]> {
  const data = (await wikiApi({
    action: "parse",
    page: title,
    prop: "links",
  })) as {
    parse: { links: Array<{ "*": string; ns: number; exists?: string }> };
    error?: { code: string; info: string };
  };

  if ((data as any).error) {
    throw new Error(`Page not found: ${(data as any).error.info}`);
  }

  return data.parse.links
    .filter((l) => l.ns === 0)
    .map((l) => ({
      title: l["*"],
      url: `${WIKI_BASE}/${encodeURIComponent(l["*"].replace(/ /g, "_"))}`,
      ns: l.ns,
      exists: l.exists !== undefined,
    }));
}

interface CategoryMember {
  title: string;
  url: string;
  pageid: number;
  type: string;
}

async function wikiBrowseCategory(category: string, limit: number): Promise<CategoryMember[]> {
  const categoryTitle = category.startsWith("Category:") ? category : `Category:${category}`;

  const data = (await wikiApi({
    action: "query",
    list: "categorymembers",
    cmtitle: categoryTitle,
    cmlimit: String(limit),
    cmprop: "ids|title|type",
  })) as {
    query: { categorymembers: Array<{ pageid: number; title: string; type: string }> };
    error?: { code: string; info: string };
  };

  if ((data as any).error) {
    throw new Error(`Category error: ${(data as any).error.info}`);
  }

  return data.query.categorymembers.map((m) => ({
    title: m.title,
    url: `${WIKI_BASE}/${encodeURIComponent(m.title.replace(/ /g, "_"))}`,
    pageid: m.pageid,
    type: m.type,
  }));
}

async function wikiListCategories(prefix: string, limit: number): Promise<string[]> {
  const params: Record<string, string> = {
    action: "query",
    list: "allcategories",
    aclimit: String(limit),
  };
  if (prefix) {
    params.acprefix = prefix;
  }

  const data = (await wikiApi(params)) as {
    query: { allcategories: Array<{ "*": string }> };
  };

  return data.query.allcategories.map((c) => c["*"]);
}

// ============================================================
// MCP Server
// ============================================================

const server = new McpServer({
  name: "stellaris-wiki",
  version: "2.0.0",
});

// --- Tool: wiki_search ---
server.tool(
  "wiki_search",
  "Search the Stellaris Wiki for pages matching a query. Returns titles, snippets, and URLs.",
  {
    query: z.string().describe("Search query (e.g. 'buildings', 'fleet composition', 'ethics')"),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results to return (default: 10)"),
  },
  async ({ query, limit }) => {
    try {
      const results = await wikiSearch(query, limit);
      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: `No results found for "${query}".` }] };
      }
      const formatted = results
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`)
        .join("\n\n");
      return {
        content: [{ type: "text" as const, text: `Found ${results.length} results for "${query}":\n\n${formatted}` }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Search error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_page ---
server.tool(
  "wiki_page",
  "Get the full content of a Stellaris Wiki page as cleaned readable text. Also returns the page's section table of contents and categories.",
  {
    title: z.string().describe("Page title (e.g. 'Buildings', 'AI', 'Ethics and Civics')"),
    max_length: z.number().int().default(15000).describe("Max characters of content to return (default: 15000). Use lower values for quick overviews."),
  },
  async ({ title, max_length }) => {
    try {
      const page = await wikiGetPage(title);
      let content = page.content;
      if (content.length > max_length) {
        content = content.substring(0, max_length) + "\n\n... [truncated — use wiki_page_section to read specific sections]";
      }

      const sectionsText = page.sections.length > 0
        ? "\n\nSections:\n" + page.sections.map((s) => `  ${"  ".repeat(parseInt(s.level) - 2)}${s.index}. ${s.heading}`).join("\n")
        : "";

      const categoriesText = page.categories.length > 0
        ? "\n\nCategories: " + page.categories.join(", ")
        : "";

      return {
        content: [{
          type: "text" as const,
          text: `# ${page.title}\nURL: ${page.url}${sectionsText}${categoriesText}\n\n---\n\n${content}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error fetching page: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_page_section ---
server.tool(
  "wiki_page_section",
  "Get a specific section of a Stellaris Wiki page by section index. Use wiki_page first to see available section indices.",
  {
    title: z.string().describe("Page title"),
    section: z.string().describe("Section index number (e.g. '1', '2', '3.1'). Get these from wiki_page's section list."),
  },
  async ({ title, section }) => {
    try {
      const result = await wikiGetSection(title, section);
      return {
        content: [{ type: "text" as const, text: `# ${result.title} — Section ${result.section}\n\n${result.content}` }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_links ---
server.tool(
  "wiki_links",
  "Get all internal wiki links from a page. Useful for discovering related pages and crawling the wiki graph.",
  {
    title: z.string().describe("Page title to extract links from"),
  },
  async ({ title }) => {
    try {
      const links = await wikiGetLinks(title);
      const existing = links.filter((l) => l.exists);
      const formatted = existing.map((l) => `- ${l.title}`).join("\n");
      return {
        content: [{
          type: "text" as const,
          text: `Links from "${title}" (${existing.length} pages):\n\n${formatted}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_browse_category ---
server.tool(
  "wiki_browse_category",
  "List all pages in a specific wiki category.",
  {
    category: z.string().describe("Category name (e.g. 'Economy', 'Warfare'). 'Category:' prefix is optional."),
    limit: z.number().int().min(1).max(500).default(50).describe("Max pages to list (default: 50)"),
  },
  async ({ category, limit }) => {
    try {
      const members = await wikiBrowseCategory(category, limit);
      if (members.length === 0) {
        return { content: [{ type: "text" as const, text: `No pages found in category "${category}". Try wiki_categories to see available categories.` }] };
      }

      const subcats = members.filter((m) => m.type === "subcat");
      const pages = members.filter((m) => m.type === "page");

      let text = `Category "${category}" — ${members.length} items:\n\n`;
      if (subcats.length > 0) {
        text += `Subcategories:\n${subcats.map((s) => `  - ${s.title.replace("Category:", "")}`).join("\n")}\n\n`;
      }
      if (pages.length > 0) {
        text += `Pages:\n${pages.map((p) => `  - ${p.title}`).join("\n")}`;
      }
      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_categories ---
server.tool(
  "wiki_categories",
  "List available wiki categories, optionally filtered by prefix.",
  {
    prefix: z.string().default("").describe("Filter categories starting with this prefix (e.g. 'G' for Governance, Gameplay, etc.)"),
    limit: z.number().int().min(1).max(500).default(50).describe("Max categories to list (default: 50)"),
  },
  async ({ prefix, limit }) => {
    try {
      const categories = await wikiListCategories(prefix, limit);
      if (categories.length === 0) {
        return { content: [{ type: "text" as const, text: `No categories found${prefix ? ` with prefix "${prefix}"` : ""}.` }] };
      }
      return {
        content: [{
          type: "text" as const,
          text: `Wiki categories${prefix ? ` (prefix: "${prefix}")` : ""} — ${categories.length} found:\n\n${categories.map((c) => `- ${c}`).join("\n")}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_data ---
server.tool(
  "wiki_data",
  "Extract structured table data from any Stellaris Wiki page as JSON. Parses all HTML tables into arrays of header-keyed row objects. Handles effect values (+/-), icons, and nested lists. Use this for pages not covered by wiki_game_data.",
  {
    title: z.string().describe("Wiki page title (e.g. 'Starbase', 'Megastructures')"),
    section: z.string().optional().describe("Optional section index to extract from (e.g. '2'). Omit to extract from entire page."),
  },
  async ({ title, section }) => {
    try {
      const { html, title: resolvedTitle, sections } = await wikiGetHtml(title, section);
      const tables = extractTables(html);

      if (tables.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `No data tables found on "${resolvedTitle}"${section ? ` section ${section}` : ""}.\n\nAvailable sections:\n${sections.map((s) => `  ${s.index}. ${s.heading}`).join("\n")}\n\nTry a specific section, or use wiki_page for prose content.`,
          }],
        };
      }

      const totalRows = tables.reduce((s, t) => s + t.row_count, 0);
      const output = {
        page: resolvedTitle,
        url: `${WIKI_BASE}/${encodeURIComponent(resolvedTitle.replace(/ /g, "_"))}`,
        tables_found: tables.length,
        total_rows: totalRows,
        tables: tables,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_game_data ---
server.tool(
  "wiki_game_data",
  `Extract structured game data for a specific Stellaris data type. Returns JSON arrays of game entities with their properties parsed from wiki tables. Available types: ${Object.keys(GAME_DATA_TYPES).join(", ")}`,
  {
    type: z.enum(Object.keys(GAME_DATA_TYPES) as [string, ...string[]]).describe(
      "Game data type to extract. Each maps to the correct wiki page and section."
    ),
    filter: z.string().optional().describe("Optional text filter — only return rows where any column contains this string (case-insensitive). E.g. 'militarist' or 'alloy'."),
  },
  async ({ type, filter }) => {
    try {
      const spec = GAME_DATA_TYPES[type];
      if (!spec) {
        return { content: [{ type: "text" as const, text: `Unknown data type: ${type}` }], isError: true };
      }

      const { html, title: resolvedTitle } = await wikiGetHtml(spec.page, spec.section);

      let rows: Record<string, string>[];
      let headers: string[] = [];

      if (spec.extractor === "ethics") {
        rows = extractEthicsCards(html);
        headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      } else {
        const tables = extractTables(html);
        if (tables.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No data tables found for "${type}" on page "${resolvedTitle}". The page may use a non-table layout. Try wiki_page or wiki_data with a specific section.`,
            }],
          };
        }

        // Merge all tables from the page (many pages split data across multiple tables by category)
        rows = [];
        const headerSet = new Set<string>();
        for (const table of tables) {
          for (const h of table.headers) headerSet.add(h);
          for (const row of table.rows) {
            // Tag each row with its table section for context
            if (table.section && !row._section) {
              row._section = table.section;
            }
            rows.push(row);
          }
        }
        headers = [...headerSet];
      }

      // Apply filter
      if (filter) {
        const lowerFilter = filter.toLowerCase();
        rows = rows.filter((row) =>
          Object.values(row).some((v) => v.toLowerCase().includes(lowerFilter))
        );
      }

      const output = {
        type,
        description: spec.description,
        source_page: resolvedTitle,
        url: `${WIKI_BASE}/${encodeURIComponent(resolvedTitle.replace(/ /g, "_"))}`,
        columns: headers,
        count: rows.length,
        data: rows,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error extracting ${type}: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
);

// --- Tool: wiki_game_data_types ---
server.tool(
  "wiki_game_data_types",
  "List all available game data types that can be extracted with wiki_game_data, with their descriptions and source pages.",
  {},
  async () => {
    const lines = Object.entries(GAME_DATA_TYPES).map(
      ([key, spec]) => `- **${key}** → ${spec.page}${spec.section ? ` (section ${spec.section})` : ""}\n  ${spec.description}`
    );
    return {
      content: [{
        type: "text" as const,
        text: `Available game data types for wiki_game_data:\n\n${lines.join("\n\n")}`,
      }],
    };
  }
);

// ============================================================
// Patch Notes Extraction & Change Classification
// ============================================================

/** Tags for classifying what game system a change affects. */
const CHANGE_TAGS: Record<string, RegExp> = {
  buildings:     /building|foundry|factory|lab|temple|clinic|stronghold|precinct|capital building/i,
  districts:     /district|city district|mining district|generator|agriculture|industrial/i,
  jobs:          /job|worker|specialist|miner|technician|farmer|metallurgist|artisan|researcher|bureaucrat|priest|clerk|soldier|enforcer|drone/i,
  ships:         /ship|corvette|frigate|destroyer|cruiser|battleship|titan|juggernaut|coloss|fleet|naval capacity|naval cap/i,
  combat:        /weapon|armor|shield|hull|damage|fire rate|evasion|tracking|torpedo|laser|kinetic|missile|strike craft|point.?def|combat computer/i,
  economy:       /mineral|energy|alloy|consumer.?good|food|trade|market|upkeep|cost|production|income|resource/i,
  research:      /research|tech|science|physics|society|engineering|rare tech/i,
  pops:          /pop|growth|assembly|migration|resettlement|housing|amenities|habitability|unemployment|demotion|living standard/i,
  traditions:    /tradition|unity|ascension|perk/i,
  ethics:        /ethic|materialist|spiritualist|militarist|pacifist|xenoph|authoritarian|egalitarian|gestalt/i,
  civics:        /civic|authority/i,
  diplomacy:     /diplomacy|federation|vassal|subject|pact|treaty|envoy|opinion|trust|relation/i,
  war:           /war|claim|casus.?belli|exhaustion|bombardment|army|invasion|occupation/i,
  ai:            /\bai\b|ai_weight|ai budget|ai personality|ai empire|ai behavior|ai decision/i,
  crisis:        /crisis|prethoryn|contingency|extradimensional|unbidden|tempest|khan|endgame/i,
  megastructure: /megastructure|dyson|ring.?world|matter decompressor|science nexus|gateway|mega.?shipyard|sentry|hyper.?relay/i,
  starbase:      /starbase|anchorage|shipyard module|orbital ring/i,
  traits:        /trait|species trait/i,
  origins:       /origin/i,
  espionage:     /espionage|spy|infiltrat|intel|cloaking/i,
};

interface PatchChange {
  section: string;          // "Balance", "Improvement", "Bugfix", etc.
  text: string;             // The raw changelog line
  direction: "buff" | "nerf" | "rework" | "fix" | "add" | "remove" | "unknown";
  numeric: boolean;         // Has explicit numeric values
  values: string[];         // Extracted numeric snippets ("+10%", "reduced to 5", "from 3 to 6")
  tags: string[];           // Which game systems this affects
  sovereign_relevant: boolean; // Directly relevant to Sovereign AI mod
}

function classifyDirection(text: string): PatchChange["direction"] {
  const lower = text.toLowerCase();
  if (/\bremoved\b|\bno longer\b|\bdisabled\b|\bdeleted\b/.test(lower)) return "remove";
  if (/\badded\b|\bnew\b|\bnow also\b|\bnow grant|introduced\b/.test(lower)) return "add";
  if (/\bfix(?:ed)?\b|\bcorrect(?:ed)?\b|\bresolved\b|\bno longer incorrectly\b/.test(lower)) return "fix";
  if (/\bincreas(?:ed|e)\b|\bbuff(?:ed)?\b|\bimprov(?:ed|e)\b|\bhigher\b|\bmore\b|\bbetter\b|\bgrant(?:s|ed)?\b|\bgain(?:s|ed)?\b/.test(lower)) return "buff";
  if (/\breduced?\b|\blower(?:ed)?\b|\bnerf(?:ed)?\b|\bdecreas(?:ed|e)\b|\bless\b|\bfewer\b|\bweaker\b/.test(lower)) return "nerf";
  if (/\brebalan(?:ced|cing)\b|\brefactor(?:ed)?\b|\bredesign(?:ed)?\b|\breplace(?:d|s)?\b|\bchange(?:d|s)?\b|\badjust(?:ed)?\b|\brework(?:ed)?\b|\brename(?:d|s)?\b/.test(lower)) return "rework";
  return "unknown";
}

function extractNumericValues(text: string): string[] {
  const values: string[] = [];
  // Match patterns like +10%, -5, "from 3 to 6", "reduced to 50", "5x", "0.75x"
  const patterns = [
    /[+-]?\d+(?:\.\d+)?%/g,                           // +10%, -5%, 25%
    /\d+(?:\.\d+)?x\b/g,                              // 1.5x, 5x, 0.75x
    /(?:from|was)\s+\d+(?:\.\d+)?\s+to\s+\d+(?:\.\d+)?/gi,  // from 3 to 6
    /(?:to|now)\s+\d+(?:\.\d+)?(?:\s+(?:per|each|\/month))?/gi, // to 50, now 10 per
    /\b\d{2,}(?:\.\d+)?\s+(?:minerals?|energy|alloys?|food|unity|consumer)/gi, // 400 minerals
    /\b(?:tier|level|rank)\s*[-–]?\s*\d+/gi,           // tier 3
  ];
  for (const pat of patterns) {
    const matches = text.match(pat);
    if (matches) values.push(...matches);
  }
  return [...new Set(values)];
}

function tagChange(text: string): string[] {
  const tags: string[] = [];
  for (const [tag, pattern] of Object.entries(CHANGE_TAGS)) {
    if (pattern.test(text)) tags.push(tag);
  }
  return tags;
}

function isSovereignRelevant(tags: string[]): boolean {
  const relevantTags = new Set(["buildings", "districts", "jobs", "economy", "pops", "ai", "ships", "combat", "traditions", "ethics", "civics", "traits", "origins", "diplomacy", "war"]);
  return tags.some(t => relevantTags.has(t));
}

function parsePatchNotes(html: string): PatchChange[] {
  const $ = cheerio.load(html);
  const changes: PatchChange[] = [];

  // Remove navbox
  $(".navbox, .mw-editsection, .noprint").remove();

  let currentSection = "General";

  // Walk through all elements in mw-parser-output
  $(".mw-parser-output").children().each((_, el) => {
    const $el = $(el);
    const tagName = (el as any).tagName || "";

    // Track section headings
    if (/^h[23]$/i.test(tagName)) {
      currentSection = $el.text().replace(/\[?\s*edit.*$/i, "").trim();
      return;
    }

    // Process list items
    if (tagName === "ul" || tagName === "ol") {
      $el.find("> li").each((_, li) => {
        const $li = $(li);
        // Get direct text (not sub-lists)
        const fullText = $li.clone().children("ul, ol").remove().end().text().trim();
        if (!fullText || fullText.length < 5) return;

        // Also get sub-items as context
        const subItems: string[] = [];
        $li.find("> ul > li, > ol > li").each((_, sub) => {
          const subText = $(sub).text().trim();
          if (subText) subItems.push(subText);
        });

        const combinedText = subItems.length > 0
          ? fullText + " | " + subItems.join(" | ")
          : fullText;

        const direction = classifyDirection(combinedText);
        const values = extractNumericValues(combinedText);
        const tags = tagChange(combinedText);

        changes.push({
          section: currentSection,
          text: fullText,
          direction,
          numeric: values.length > 0,
          values,
          tags,
          sovereign_relevant: isSovereignRelevant(tags),
        });
      });
    }
  });

  return changes;
}

/** List available patch versions from the Patches index page. */
async function listPatchVersions(): Promise<string[]> {
  const { html } = await wikiGetHtml("Patches");
  const $ = cheerio.load(html);
  const versions: string[] = [];

  // Patch links are like /Patch_4.3, /Patch_4.3.1, etc.
  $("a").each((_, a) => {
    const href = $(a).attr("href") || "";
    const match = href.match(/\/Patch[_ ](\d+\.\d+(?:\.\d+)*)/);
    if (match && !versions.includes(match[1])) {
      versions.push(match[1]);
    }
  });

  return versions;
}

// --- Tool: wiki_patch_notes ---
server.tool(
  "wiki_patch_notes",
  "Extract and classify changes from a Stellaris patch. Each change is tagged by game system (buildings, ships, economy, AI, etc.), direction (buff/nerf/rework/fix/add/remove), and whether it has explicit numeric values. Filter to only Sovereign-relevant changes to see what affects our mod's weight templates.",
  {
    version: z.string().describe("Patch version (e.g. '4.3', '4.0', '3.6'). Use wiki_patch_list to see available versions."),
    filter: z.enum(["all", "sovereign", "numeric", "balance", "ai"]).default("sovereign").describe(
      "'sovereign' = only changes relevant to our mod, 'numeric' = only changes with explicit numbers, 'balance' = only Balance section, 'ai' = only AI-tagged changes, 'all' = everything"
    ),
  },
  async ({ version, filter }) => {
    try {
      const pageTitle = `Patch ${version}`;
      const { html, title } = await wikiGetHtml(pageTitle);
      const changes = parsePatchNotes(html);

      let filtered = changes;
      switch (filter) {
        case "sovereign": filtered = changes.filter(c => c.sovereign_relevant); break;
        case "numeric": filtered = changes.filter(c => c.numeric); break;
        case "balance": filtered = changes.filter(c => /balance/i.test(c.section)); break;
        case "ai": filtered = changes.filter(c => c.tags.includes("ai")); break;
      }

      // Group by section
      const bySection = new Map<string, PatchChange[]>();
      for (const c of filtered) {
        const arr = bySection.get(c.section) || [];
        arr.push(c);
        bySection.set(c.section, arr);
      }

      // Summary stats
      const directionCounts: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};
      for (const c of filtered) {
        directionCounts[c.direction] = (directionCounts[c.direction] || 0) + 1;
        for (const t of c.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
      }

      let text = `# Patch ${version} — ${filtered.length} changes (${filter} filter, ${changes.length} total)\n\n`;

      // Stats line
      const dirStr = Object.entries(directionCounts).map(([d, n]) => `${d}:${n}`).join(" ");
      const tagStr = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, n]) => `${t}:${n}`).join(" ");
      text += `Directions: ${dirStr}\nTop tags: ${tagStr}\n`;

      for (const [section, sectionChanges] of bySection) {
        text += `\n## ${section}\n\n`;
        for (const c of sectionChanges) {
          const dirIcon = c.direction === "buff" ? "[+]" : c.direction === "nerf" ? "[-]" : c.direction === "add" ? "[NEW]" : c.direction === "remove" ? "[DEL]" : c.direction === "fix" ? "[FIX]" : c.direction === "rework" ? "[~]" : "[?]";
          const tagStr = c.tags.length > 0 ? ` {${c.tags.join(",")}}` : "";
          const numStr = c.values.length > 0 ? ` <<${c.values.join(", ")}>>` : "";
          text += `${dirIcon} ${c.text}${tagStr}${numStr}\n`;
        }
      }

      return { content: [{ type: "text" as const, text }] };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: wiki_patch_list ---
server.tool(
  "wiki_patch_list",
  "List all available Stellaris patch versions that can be analyzed with wiki_patch_notes.",
  {},
  async () => {
    try {
      const versions = await listPatchVersions();
      return {
        content: [{
          type: "text" as const,
          text: `${versions.length} patch versions available:\n\n${versions.join(", ")}`,
        }],
      };
    } catch (err) {
      return { content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }], isError: true };
    }
  }
);

// --- Tool: wiki_patch_diff ---
server.tool(
  "wiki_patch_diff",
  "Compare two patch versions and show what changed between them that affects the Sovereign AI mod. Useful for understanding what shifted between the version your save was made in and the current version.",
  {
    from_version: z.string().describe("Older patch version (e.g. '4.0')"),
    to_version: z.string().describe("Newer patch version (e.g. '4.3')"),
  },
  async ({ from_version, to_version }) => {
    try {
      // Get all patch versions between from and to
      const allVersions = await listPatchVersions();

      const fromNum = from_version.split(".").map(Number);
      const toNum = to_version.split(".").map(Number);

      const inRange = allVersions.filter(v => {
        const parts = v.split(".").map(Number);
        const cmpFrom = parts[0] > fromNum[0] || (parts[0] === fromNum[0] && (parts[1] || 0) > (fromNum[1] || 0)) ||
          (parts[0] === fromNum[0] && (parts[1] || 0) === (fromNum[1] || 0) && (parts[2] || 0) >= (fromNum[2] || 0));
        const cmpTo = parts[0] < toNum[0] || (parts[0] === toNum[0] && (parts[1] || 0) < (toNum[1] || 0)) ||
          (parts[0] === toNum[0] && (parts[1] || 0) === (toNum[1] || 0) && (parts[2] || 0) <= (toNum[2] || 0));
        return cmpFrom && cmpTo;
      });

      let text = `# Changes from ${from_version} → ${to_version} (Sovereign-relevant)\n\n`;
      text += `Patches in range: ${inRange.join(", ")}\n`;

      let totalChanges = 0;

      // Fetch each patch (limit to avoid rate limiting)
      const patchesToFetch = inRange.slice(0, 6);
      if (inRange.length > 6) {
        text += `\n(Showing first 6 of ${inRange.length} patches — fetch individually for the rest)\n`;
      }

      for (const ver of patchesToFetch) {
        try {
          const { html } = await wikiGetHtml(`Patch ${ver}`);
          const changes = parsePatchNotes(html);
          const relevant = changes.filter(c => c.sovereign_relevant);

          if (relevant.length === 0) continue;
          totalChanges += relevant.length;

          text += `\n## Patch ${ver} (${relevant.length} relevant changes)\n\n`;
          for (const c of relevant) {
            const dirIcon = c.direction === "buff" ? "[+]" : c.direction === "nerf" ? "[-]" : c.direction === "add" ? "[NEW]" : c.direction === "remove" ? "[DEL]" : c.direction === "fix" ? "[FIX]" : c.direction === "rework" ? "[~]" : "[?]";
            const tagStr = ` {${c.tags.join(",")}}`;
            const numStr = c.values.length > 0 ? ` <<${c.values.join(", ")}>>` : "";
            text += `${dirIcon} ${c.text}${tagStr}${numStr}\n`;
          }
        } catch { /* skip unavailable patches */ }
      }

      text += `\n---\nTotal Sovereign-relevant changes: ${totalChanges}`;

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
  console.error("Stellaris Wiki MCP server v2.0 running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
