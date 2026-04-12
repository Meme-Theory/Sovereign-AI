#!/usr/bin/env node
// Reddit r/stellaris strategy sniffer
// Usage:
//   node sniff.mjs search "AI economy strategy"
//   node sniff.mjs top [week|month|year|all] [limit]
//   node sniff.mjs hot [limit]
//   node sniff.mjs post <post_id>
//   node sniff.mjs deep "fleet composition meta"   -- search + fetch top comments

const UA = "SovereignAI/1.0 (Stellaris Mod Research; github.com/sovereign-ai)";
const SUB = "stellaris";
const BASE = `https://www.reddit.com/r/${SUB}`;

// Strategy-signal keywords — posts/comments with these get boosted
const SIGNAL_WORDS = [
  "ai_weight", "weight", "modifier", "factor", "multiplier",
  "deficit", "surplus", "economy", "alloy", "mineral", "energy",
  "fleet power", "naval capacity", "fleet composition",
  "corvette", "destroyer", "cruiser", "battleship",
  "build order", "opening", "rush", "snowball", "meta",
  "optimal", "efficiency", "min-max", "minmax",
  "dps", "damage", "evasion", "tracking", "fire rate",
  "tradition", "ascension", "perk", "tech rush",
  "crisis", "endgame", "midgame", "early game",
  "habitat", "ecumenopolis", "ring world", "megastructure",
  "pop growth", "assembly", "immigration",
  "influence", "unity", "research speed",
  "personality", "diplomacy", "federation", "subjugation",
  "ensign", "admiral", "grand admiral", "scaling",
  "starbase", "chokepoint", "fortification",
  "war exhaustion", "claims", "casus belli",
  "%", "per month", "/month", "+", "−",
];

function strategyScore(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of SIGNAL_WORDS) {
    if (lower.includes(w.toLowerCase())) score++;
  }
  // Bonus for numbers — raw stats discussions
  const numberMatches = text.match(/\d+\.?\d*%|\+\d+|\-\d+|\d+\/month|\d+k/gi);
  if (numberMatches) score += Math.min(numberMatches.length, 10);
  return score;
}

async function reddit(path, params = {}) {
  const url = new URL(path.startsWith("http") ? path : `https://www.reddit.com${path}`);
  if (!url.pathname.endsWith(".json")) url.pathname += ".json";
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  url.searchParams.set("raw_json", "1");

  const resp = await fetch(url.toString(), { headers: { "User-Agent": UA } });
  if (!resp.ok) throw new Error(`Reddit ${resp.status}: ${resp.statusText}`);
  return resp.json();
}

function formatPost(p, idx) {
  const sig = strategyScore(p.title + " " + (p.selftext || ""));
  const sigBar = sig > 0 ? ` [strategy:${sig}]` : "";
  const lines = [
    `${idx !== undefined ? `${idx + 1}. ` : ""}[${p.score}↑ | ${p.num_comments}c]${sigBar} ${p.title}`,
    `   id:${p.id} | ${p.url}`,
  ];
  if (p.selftext) {
    const body = p.selftext.length > 500 ? p.selftext.slice(0, 500) + "..." : p.selftext;
    lines.push(`   ${body.replace(/\n/g, "\n   ")}`);
  }
  return lines.join("\n");
}

function flattenComments(node, depth = 0, results = []) {
  if (!node || node.kind !== "t1") return results;
  const c = node.data;
  const sig = strategyScore(c.body || "");
  results.push({ author: c.author, score: c.score, body: c.body, depth, sig });
  if (c.replies && c.replies.data) {
    for (const child of c.replies.data.children) {
      flattenComments(child, depth + 1, results);
    }
  }
  return results;
}

function formatComment(c) {
  const indent = "  ".repeat(c.depth);
  const sigTag = c.sig > 2 ? ` **[strategy:${c.sig}]**` : "";
  const body = c.body.length > 600 ? c.body.slice(0, 600) + "..." : c.body;
  return `${indent}[${c.score}↑] u/${c.author}${sigTag}\n${indent}${body.replace(/\n/g, `\n${indent}`)}`;
}

// ---- Commands ----

async function cmdSearch(query, limit = 20) {
  const data = await reddit(`/r/${SUB}/search`, {
    q: query, restrict_sr: "on", sort: "relevance", t: "all", limit,
  });
  const posts = data.data.children.map((c) => c.data);
  // Sort by strategy signal
  posts.sort((a, b) => {
    const sa = strategyScore(a.title + " " + (a.selftext || ""));
    const sb = strategyScore(b.title + " " + (b.selftext || ""));
    return sb - sa || b.score - a.score;
  });
  console.log(`=== r/${SUB} search: "${query}" (${posts.length} results) ===\n`);
  for (let i = 0; i < posts.length; i++) {
    console.log(formatPost(posts[i], i));
    console.log();
  }
}

async function cmdTop(time = "month", limit = 20) {
  const data = await reddit(`/r/${SUB}/top`, { t: time, limit });
  const posts = data.data.children.map((c) => c.data);
  console.log(`=== r/${SUB} top (${time}, ${posts.length} posts) ===\n`);
  for (let i = 0; i < posts.length; i++) {
    console.log(formatPost(posts[i], i));
    console.log();
  }
}

async function cmdHot(limit = 20) {
  const data = await reddit(`/r/${SUB}/hot`, { limit });
  const posts = data.data.children.map((c) => c.data).filter((p) => !p.stickied);
  console.log(`=== r/${SUB} hot (${posts.length} posts) ===\n`);
  for (let i = 0; i < posts.length; i++) {
    console.log(formatPost(posts[i], i));
    console.log();
  }
}

async function cmdPost(postId) {
  const data = await reddit(`/r/${SUB}/comments/${postId}`);
  const post = data[0].data.children[0].data;
  const comments = [];
  for (const child of data[1].data.children) {
    flattenComments(child, 0, comments);
  }
  // Sort: strategy-rich comments first, then by score
  comments.sort((a, b) => (b.sig * 10 + b.score) - (a.sig * 10 + a.score));

  console.log(`=== ${post.title} ===`);
  console.log(`[${post.score}↑ | ${post.num_comments}c] by u/${post.author}`);
  if (post.selftext) {
    console.log(`\n${post.selftext}\n`);
  }
  console.log(`--- Top ${Math.min(comments.length, 30)} comments (strategy-ranked) ---\n`);
  for (const c of comments.slice(0, 30)) {
    console.log(formatComment(c));
    console.log();
  }
}

async function cmdDeep(query, limit = 10) {
  // Search, then auto-fetch comments from the highest-signal posts
  const data = await reddit(`/r/${SUB}/search`, {
    q: query, restrict_sr: "on", sort: "relevance", t: "all", limit,
  });
  const posts = data.data.children.map((c) => c.data);
  posts.sort((a, b) => {
    const sa = strategyScore(a.title + " " + (a.selftext || ""));
    const sb = strategyScore(b.title + " " + (b.selftext || ""));
    return sb - sa || b.score - a.score;
  });

  // Take top 5 most strategy-relevant posts and fetch their comments
  const targets = posts.slice(0, 5);
  console.log(`=== Deep dive: "${query}" — fetching comments from ${targets.length} top posts ===\n`);

  for (const post of targets) {
    const sig = strategyScore(post.title + " " + (post.selftext || ""));
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[${post.score}↑ | ${post.num_comments}c | strategy:${sig}] ${post.title}`);
    console.log(`id:${post.id}`);
    if (post.selftext) {
      const body = post.selftext.length > 800 ? post.selftext.slice(0, 800) + "..." : post.selftext;
      console.log(`\n${body}`);
    }

    try {
      const cdata = await reddit(`/r/${SUB}/comments/${post.id}`);
      const comments = [];
      for (const child of cdata[1].data.children) {
        flattenComments(child, 0, comments);
      }
      // Only show comments with strategy signal or high score
      const good = comments.filter((c) => c.sig > 1 || c.score > 10);
      good.sort((a, b) => (b.sig * 10 + b.score) - (a.sig * 10 + a.score));

      if (good.length > 0) {
        console.log(`\n--- ${good.length} strategy-relevant comments ---\n`);
        for (const c of good.slice(0, 15)) {
          console.log(formatComment(c));
          console.log();
        }
      } else {
        console.log("\n(no high-signal comments)\n");
      }
    } catch (e) {
      console.log(`(failed to fetch comments: ${e.message})`);
    }

    // Tiny delay between post fetches
    await new Promise((r) => setTimeout(r, 1500));
  }
}

// ---- Main ----

const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case "search":
    await cmdSearch(args.join(" "), 20);
    break;
  case "top":
    await cmdTop(args[0] || "month", parseInt(args[1]) || 20);
    break;
  case "hot":
    await cmdHot(parseInt(args[0]) || 20);
    break;
  case "post":
    if (!args[0]) { console.error("Usage: sniff.mjs post <post_id>"); process.exit(1); }
    await cmdPost(args[0]);
    break;
  case "deep":
    await cmdDeep(args.join(" "), 10);
    break;
  default:
    console.log(`reddit-nerd: r/stellaris strategy sniffer

Commands:
  search <query>              Search posts, ranked by strategy signal
  top [week|month|year|all]   Top posts by time period
  hot                         Current hot posts
  post <id>                   Full post + comments, strategy-ranked
  deep <query>                Search + auto-fetch comments from top hits

Strategy scoring: posts/comments are scored by presence of
meta keywords (ai_weight, fleet composition, build order, etc.)
and raw numbers (+5%, /month, etc.). Higher = more useful.`);
}
