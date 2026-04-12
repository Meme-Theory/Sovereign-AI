# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SOVEREIGN AI Overhaul is a Stellaris 4.x mod that replaces the game's AI decision-making with smarter, non-cheating behavior. The AI plays like a competent human: deficit-driven building, personality-coherent strategy, and adaptive responses to changing circumstances. No bonus resources or hidden modifiers — all improvements come from better `ai_weight` tuning and event-based corrections.

## Build & Test

There is no build system. Stellaris loads mod files directly from the `mod/` directory. To test:

1. Symlink or copy `mod/` contents into your Stellaris mod folder
2. Enable "Sovereign AI Overhaul" in the Paradox launcher
3. Start a game on Ensign difficulty (no AI bonuses) with 10+ AI empires, then use console `observe`
4. Key console commands: `debugtooltip`, `fast_forward 365`, `instant_build`, `play <id>`, `script_profiler`
5. Check `error.log` for zero entries from SOVEREIGN files; `script_profiler` should show <5% usage

Detailed test scenarios are in `testing/test_scenarios.md`.

## Architecture

### Repository Layout

- `design/` — Design documents (philosophy, weight conventions, personality profiles). Read these first.
- `mod/` — The actual Stellaris mod, following standard Paradox mod structure
- `mod/common/` — All game rule overrides: AI budgets, buildings, districts, diplomacy, personalities, policies, technology weights, scripted triggers, etc.
- `mod/events/` — Event-based AI corrections (periodic evaluation, crisis response)
- `mod/localisation/english/` — English text strings (YAML with UTF-8 BOM)
- `testing/` — Manual test scenario checklists
- `sovereign_ai_overhaul.mod` — Root mod descriptor

### Core Systems

**Scripted Triggers** (`mod/common/scripted_triggers/sovereign_triggers.txt`): Reusable conditions prefixed `sovereign_` — empire type checks, economic state, military state, planet state. All weight files reference these for consistency.

**AI Budget** (`mod/common/ai_budget/`): Controls resource allocation between military, economy, research, and expansion. Budgets shift based on ethics, war status, and threat level.

**Personalities** (`mod/common/personalities/`): 9 distinct personalities (5 new, 4 vanilla overrides) with specific aggressiveness, spending, and diplomacy modifiers. Profiles documented in `design/personality_profiles.md`.

**Events** (`mod/events/`): Three-tier system — game start initialization (sovereign.100), periodic master check (sovereign.1 every 24 months), and per-empire evaluation (sovereign.2) with staggered delays. On-action hooks in `mod/common/on_actions/`.

**Defines** (`mod/common/defines/`): Overrides to vanilla AI constants (threat decay, border friction, naval capacity targets, reserve thresholds).

### How AI Weights Work

Every `ai_weight` block follows the pattern in `design/weight_conventions.md`:

1. `weight` (base 0-200) — 0 means "only build when conditions activate"
2. `add` modifiers (25-200) — need-based activation (deficit detected, crisis state)
3. `factor` modifiers for personality (1.25-3.0 for alignment, 0.01-0.5 for penalty)
4. `factor = 0` — hard block for incompatible empire types

Modifier ordering: base weight -> need-based adds -> personality factors -> situational factors -> penalties -> hard blocks. Max 3 cascading factors per option to prevent runaway weights.

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
- **Personality-coherent**: Every weight should consider relevant ethics/civics via factor modifiers
- **Every weight needs a penalty**: Include at least one penalty modifier (low resources, full slots) to prevent infinite building
- **Add before factor**: `add` modifiers come before `factor` modifiers so factors multiply the accumulated total

### Factor Reference

| Factor | Meaning |
|--------|---------|
| 0 | Never (incompatible) |
| 0.01 | Almost never |
| 0.1 | Rarely |
| 0.25 | Reduced |
| 0.5 | Somewhat reduced |
| 1.0 | Neutral |
| 1.5 | Clear preference |
| 2.0 | Strong preference |
| 2.5 | Core identity |
| 3.0 | Defining behavior |
| 5.0 | Maximum (use sparingly) |
