# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOVEREIGN AI Overhaul is a Stellaris 4.x mod that replaces the game's AI decision-making with smarter, non-cheating behavior. The AI plays like a competent human: deficit-driven building, personality-coherent strategy, and adaptive responses to changing circumstances. No bonus resources or hidden modifiers — all improvements come from better `ai_weight` tuning and event-based corrections.

## Build & Test

There is no build system for the mod itself. Stellaris loads mod files directly from `mod/`. The toolchain requires Node.js.

### Mod Testing
1. Symlink or copy `mod/` contents into your Stellaris mod folder
2. Enable "Sovereign AI Overhaul" in the Paradox launcher
3. Start a game on Ensign difficulty (no AI bonuses) with 10+ AI empires, then use console `observe`
4. Key console commands: `debugtooltip`, `fast_forward 365`, `instant_build`, `play <id>`, `script_profiler`
5. Check `error.log` for zero entries from SOVEREIGN files; `script_profiler` should show <5% usage

### Toolchain
```bash
# MCP servers (auto-connect in Claude Code sessions)
cd tools/stellaris-wiki-mcp && npm install && npm run build
cd tools/stellaris-save-mcp && npm install && npm run build

# Economy simulator
node tools/simulator/sim.mjs compare 360        # Side-by-side all personalities
node tools/simulator/sim.mjs materialist 240     # Detailed 20-year log
node tools/simulator/sim.mjs help                # All presets and overrides

# Reddit strategy scraper
node tools/reddit-nerd/sniff.mjs deep "fleet composition"
node tools/reddit-nerd/sniff.mjs search "AI economy"
```

## Architecture

### Repository Layout

- `design/` — Design documents (philosophy, weight conventions, personality profiles, planet classes, sovereign templates)
- `mod/` — The actual Stellaris mod, standard Paradox mod structure
- `tools/` — Development toolchain (MCP servers, simulator, scrapers)
- `templates/` — Sovereign template system: 9 AI-derived + 8 player-derived personality templates as JSON, with schema validation
- `data/` — Complete Stellaris 4.3 game database (2,594 items across 22 JSON files, extracted from wiki)
- `research/` — Numbers Nerd findings, audits, and the v0-plan
- `baseline/` — Empire profiles from a 34-empire baseline save game at year 2200, plus 8 player save profiles
- `testing/` — Manual test scenario checklists
- `.claude/agents/` — 5 subagent definitions (numbers-nerd, reddit-nerd, gameflow-auditor, save-analyst, patch-watcher)
- `.claude/agent-memory/` — Persistent agent memory (validated thresholds, baseline data, calibration)

### Toolchain

**stellaris-wiki MCP** (`tools/stellaris-wiki-mcp/`): 12 tools for wiki interaction — structured game data extraction (`wiki_game_data` with 23 data types), patch notes classification (`wiki_patch_notes`, `wiki_patch_diff`), search, page reading, category browsing.

**stellaris-saves MCP** (`tools/stellaris-save-mcp/`): 8 tools for save game parsing — clausewitz text parser, empire extraction with budget/tech breakdowns, empire design parser, version discriminator with staleness grading.

**Economy Simulator** (`tools/simulator/sim.mjs`): Turn-based economy simulator using the Sovereign weight resolver. 13 hardcoded presets + 17 dynamic template files auto-discovered from `templates/`. 5 starting templates (regular, hive_mind, machine, corporate, purifier) calibrated from baseline save data. Formal gate system (G1-G6) from gameflow loop analysis. Planet class system (7 classes: standard, volcanic, habitat, ring_world, ecumenopolis, hive_world, machine_world). Origin modifiers (23 origins with starting state and economy overrides). Accepts templates via CLI name, JSON file path, or stdin pipe.

**Reddit script** (`tools/reddit-nerd/sniff.mjs`): r/stellaris scraper with strategy-signal scoring, used by the `@reddit-nerd` agent.

### Subagents (`.claude/agents/`)

| Agent | Role |
|-------|------|
| `@numbers-nerd` | Cross-references reddit + wiki data, produces validated weight recommendations |
| `@reddit-nerd` | Scrapes r/stellaris for strategy discussions and community meta |
| `@gameflow-auditor` | Traces production loops, finds missing gates and cascade failures |
| `@save-analyst` | Extracts empire data from save games for simulator calibration |
| `@patch-watcher` | Analyzes patch notes, flags stale mod files |

### Template System

Templates live in `templates/` as JSON files conforming to `sovereign-template-v1.json` schema. Each template defines a complete empire archetype:

- **identity** — personality key, archetype, ethics/authority/civic matching
- **origins** — default origin, preferred origins with economy overrides, compatibility lists
- **behavior** — aggressiveness, spending, diplomacy, behavior flags (from mod personality definitions)
- **economy** — weight factors, deficit thresholds, surplus thresholds
- **gates** — G1-G6 thresholds (can be personality-specific)
- **starting_state** — template type, stockpiles, districts, planet class, pops
- **build_priority** — ordered build lists per game phase
- **phase_overrides** — weight/threshold changes for early/mid/late game

Two classes: `AI_` prefixed (derived from baseline save AI empires) and unprefixed (derived from player playthroughs with named strategies like "Shrouded From Clay", "Pax Romana", "Cooked Well Done").

The simulator loads templates dynamically: `node sim.mjs cooked_well_done 360` or `node sim.mjs compare 360 --filter=AI_`.

### Core Mod Systems

**Scripted Triggers** (`mod/common/scripted_triggers/sovereign_triggers.txt`): Reusable conditions prefixed `sovereign_` — empire type checks, economic state, military state, planet state. All weight files should reference these instead of raw `has_ethic` checks.

**AI Budget** (`mod/common/ai_budget/`): Resource allocation between military, economy, research, and expansion.

**Personalities** (`mod/common/personalities/`): 9 distinct personalities (5 new, 4 vanilla overrides). Building weights should check `has_personality = sovereign_*` for differentiation.

**Events** (`mod/events/`): Three-tier system — game start (sovereign.100), periodic master check (sovereign.1), per-empire evaluation (sovereign.2).

**Defines** (`mod/common/defines/`): Overrides to vanilla AI constants.

### Gate System

The weight resolver uses 6 upstream resource gates (from `research/findings/gameflow_loops.md`) to prevent cascade deficits:

| Gate | Check | Factor | Prevents |
|------|-------|--------|----------|
| G1 | minerals < 15/mo | 0.1 | Foundry/factory mineral crash |
| G2 | consumer_goods < 2/mo | 0.1 | Research/unity CG crash |
| G3 | minerals < 25/mo | 0.1 | Strategic resource refinery drain |
| G4 | strategic_resource < 1/mo | 0.1 | T2/T3 building without upkeep |
| G5 | alloys < 5/mo | 0.1 | Expansion when can't afford it |
| G6 | energy < 5/mo | 0.25 | High-upkeep T2/T3 buildings |

Every mineral-consuming building must have G1. Every CG-consuming building must have G2. These are the most critical weight modifiers in the entire mod.

### How AI Weights Work

Every `ai_weight` block follows `design/weight_conventions.md`:

1. `weight` (base 0-200) — 0 means "only build when conditions activate"
2. `add` modifiers (25-200) — need-based activation (deficit detected, crisis state)
3. `factor` modifiers for personality (1.25-3.0 for alignment, 0.01-0.5 for penalty)
4. `factor` for gates (G1-G6 upstream resource checks)
5. `factor = 0` — hard block for incompatible empire types

Modifier ordering: base weight → need adds → personality factors → situational factors → gate penalties → surplus penalties → hard blocks. Max 3 cascading factors per option.

## Conventions

### Naming
- Trigger names: `sovereign_is_<condition>` or `sovereign_<state>_<quality>`
- Event IDs: sequential `sovereign.N`
- Personality names: `sovereign_<adjective>_<noun>`
- Variables: `@<category>_<specific>_<type>` (e.g., `@resource_building_base`)
- Localization keys: lowercase with underscores, `:0` suffix

### File Format
All mod files are `.txt` using Paradox script syntax. Localization is `.yml` with UTF-8 BOM. Number prefixes in filenames (`00_`, `01_`) control load order.

### Design Principles
- **No cheating**: Never add hidden bonuses, resource grants, or information the AI shouldn't have
- **Deficit-driven**: Buildings/districts start at weight 0 and activate via `add` when actual deficits are detected
- **Gate-aware**: Every converter building must check its upstream resource via the gate system
- **Personality-coherent**: Every weight should use `has_personality = sovereign_*` and `sovereign_is_*` triggers
- **Every weight needs a penalty**: At least one penalty modifier (low resources, full slots, surplus) to prevent infinite building
- **Add before factor**: `add` modifiers come before `factor` modifiers so factors multiply the accumulated total
- **Use scripted triggers**: Never write raw `has_ethic = ethic_militarist` — use `sovereign_is_militaristic = yes`

### Factor Reference

| Factor | Meaning |
|--------|---------|
| 0 | Never (incompatible) |
| 0.01 | Almost never |
| 0.1 | Rarely / gate blocked |
| 0.25 | Reduced / permanent brake |
| 0.5 | Somewhat reduced |
| 1.0 | Neutral |
| 1.5 | Clear preference |
| 2.0 | Strong preference |
| 2.5 | Core identity |
| 3.0 | Defining behavior |
| 5.0 | Maximum (use sparingly) |

## Research & Evidence

The mod is developed using an evidence-based pipeline:

```
Wiki MCP → Numbers Nerd → research/findings/ → mod files
Reddit Nerd ↗                                    ↕
Save Game MCP → baseline/ → simulator → validates weights
Patch Notes → version discriminator → flags stale mod files
Templates ← simulator ← save game feedback loop (planned)
```

Key research outputs:
- `research/v0-plan.md` — Prioritized fix list from the initial audit
- `research/findings/gameflow_loops.md` — Production loop schema with gate registry
- `research/findings/early_economy_building_priorities.md` — Weight templates from community + wiki cross-reference
- `data/INDEX.json` — Complete game item database (2,594 items)
- `data/origins_parsed.json` — 61 origins with personality affinities and starting modifiers
- `baseline/ANALYSIS.md` — 34-empire baseline analysis at year 2200
- `baseline/player_saves.md` — 8 player playthrough profiles across early/mid/late game
- `baseline/player_calibration.json` — Machine-readable income snapshots for simulator calibration

### Known Gaps (from v0-plan.md)
- Mod covers ~3-10% of game content across most categories
- 4.x district specialization system not yet reflected (city → research enclave, foundry arcology, etc.)
- No T2/T3 building coverage, no strategic resource buildings
- Personalities defined but only partially wired into building weights
- Mod redefines full objects instead of ai_weight-only overrides (structural issue)
- Simulator models single-planet economy; no colony expansion or multi-planet management
- No market trading simulation
- Automated in-game testing possible via Nervve (../Nervve) keyboard automation — not yet integrated
