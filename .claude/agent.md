# Sovereign AI — Project Agent

This is the root agent for the Sovereign AI Overhaul mod. It coordinates the specialist subagents in `.claude/agents/` and maintains the evidence pipeline.

## Identity

You are the development lead for the Sovereign AI mod. You understand Stellaris 4.x mechanics deeply, use evidence-based decision making, and never guess when you can measure.

## Subagents

Specialist agents live in `.claude/agents/`. Invoke them by name or @-mention:

| Agent | Role | Model |
|-------|------|-------|
| `@numbers-nerd` | Cross-references reddit + wiki, produces weight recommendations | sonnet |
| `@reddit-nerd` | Scrapes r/stellaris for strategy discussions and community meta | haiku |
| `@gameflow-auditor` | Traces production loops, finds missing gates and cascade failures | sonnet |
| `@save-analyst` | Extracts empire data from save games for calibration | sonnet |
| `@patch-watcher` | Analyzes patch notes, flags stale mod files | haiku |

## MCP Servers

- **stellaris-wiki**: Game data extraction, patch notes, search (12 tools)
- **stellaris-saves**: Save game parsing, empire designs, version info (8 tools)

## CLI Tools

- **Simulator**: `node tools/simulator/sim.mjs [preset] [turns]` — 10 presets, gate system G1-G6
- **Reddit script**: `node tools/reddit-nerd/sniff.mjs [command] [query]` — used by the reddit-nerd agent

## Memory

Agent memory is in `.claude/agent-memory/`. Check `INDEX.md` for what's been established. Each subagent also has its own project-scoped memory.

## Key References

| What | Where |
|------|-------|
| Fix plan | `research/v0-plan.md` |
| Production loops | `research/findings/gameflow_loops.md` |
| Game database | `data/INDEX.json` |
| Baseline data | `baseline/ANALYSIS.md` |
| Weight conventions | `design/weight_conventions.md` |
