# Sovereign AI Overhaul

**Stellaris 4.x mod that makes the AI play like a competent human.**

No bonus resources. No hidden modifiers. No cheating. The AI simply makes better decisions — building what it needs, when it needs it, based on the same information a human player has.

## What It Does

Vanilla Stellaris AI builds alloy foundries when it can't afford the mineral drain. It spams gene clinics instead of research labs. It over-invests in energy when it should be mining. It ignores planet specialization and builds a little of everything everywhere.

Sovereign AI fixes this with three systems:

### Deficit-Driven Building
Every building and district starts at weight 0. The AI only builds when it detects an actual need — mineral income dropping, alloy deficit emerging, housing running out. No more proactive waste.

### Gate System
Before the AI builds a converter (alloy foundry, research lab, consumer goods factory), it checks whether the upstream resource can sustain the drain. If mineral income is below 15/month, it won't build another foundry no matter how much it wants alloys. This prevents the cascade failures that cripple vanilla AI economies.

| Gate | What It Checks | What It Prevents |
|------|---------------|-----------------|
| G1 | Mineral income | Foundries crashing mineral economy |
| G2 | Consumer goods income | Research labs crashing CG economy |
| G3 | Mineral income (strict) | Strategic resource refineries draining minerals |
| G4 | Strategic resource income | T2/T3 buildings without upkeep source |
| G5 | Alloy income | Expanding when can't afford it |
| G6 | Energy income | High-upkeep buildings tanking energy |

### Personality-Coherent Strategy
9 distinct AI personalities that actually play differently:

| Personality | Strategy | You'll Notice |
|-------------|----------|--------------|
| **Aggressive Expansionist** | Alloy rush, early wars | Large fleets, frequent conquest |
| **Ruthless Industrialist** | Production supremacy | Highest resource output in the galaxy |
| **Diplomatic Hegemon** | Federation builder | Many pacts, early federations |
| **Fortress Guardian** | Defensive turtle | Fortress starbases, never attacks first |
| **Knowledge Seeker** | Tech rush | Research labs everywhere, tech lead |
| **Evangelizing Zealot** | Unity rush, liberation wars | Temples, tradition dominance |
| **Xenophobic Purifier** | Total war | Constant aggression, no diplomacy |
| **Devouring Swarm** | Consume everything | Rapid expansion, biological warfare |
| **Adaptive Optimizer** | Efficient machine expansion | Balanced, methodical, diplomatic when useful |

Each personality has distinct weight factors that shift building priorities — a Knowledge Seeker values research labs at 2.5x while deprioritizing military buildings, and a Ruthless Industrialist pumps alloy foundries at 2.5x.

## Installation

1. Download or clone this repo
2. Copy the `mod/` folder contents to your Stellaris mod directory:
   - **Windows**: `Documents\Paradox Interactive\Stellaris\mod\sovereign_ai_overhaul\`
   - **Linux**: `~/.local/share/Paradox Interactive/Stellaris/mod/sovereign_ai_overhaul/`
   - **macOS**: `~/Documents/Paradox Interactive/Stellaris/mod/sovereign_ai_overhaul/`
3. Copy `sovereign_ai_overhaul.mod` to the parent `mod/` directory
4. Enable "Sovereign AI Overhaul" in the Paradox launcher
5. Start a game on **Ensign difficulty** (no AI bonuses) for the intended experience

## Testing It

The best way to see Sovereign AI in action:

1. Start a game with 10+ AI empires on Ensign difficulty
2. Open console (`` ` ``) and type `observe`
3. Set game speed to fastest
4. Watch the AI empires develop — you should see distinct economic patterns per personality
5. Use `debugtooltip` to inspect AI decision values

## Compatibility

- **Stellaris version**: 4.x
- **DLC**: Works with all DLC, none required
- **Other mods**: Should be compatible with mods that don't modify AI weights or personality definitions
- **Save compatible**: Can be added to existing saves (AI will start making better decisions immediately)

## Current State

This is **v0.1.0** — the foundation is solid but coverage is still expanding:

- Core building and district weights for the early game are implemented and validated
- 9 personalities are defined with distinct behavior profiles
- Gate system prevents cascade economic failures
- Scripted triggers provide consistent ethics/authority checking

See `research/v0-plan.md` in the development branch for the full roadmap.

## Development

This mod is developed using an evidence-based pipeline with custom tooling:

- **[stellaris-wiki-mcp](https://github.com/Meme-Theory/stellaris-wiki-mcp)** — MCP server for structured Stellaris Wiki access (game data, patch notes, search)
- **[stellaris-save-mcp](https://github.com/Meme-Theory/stellaris-save-mcp)** — MCP server for save game analysis (empire budgets, tech trees, version tracking)
- **Economy simulator** — turn-based weight resolver that validates AI building decisions before they go into the mod
- **Template system** — 17 JSON archetype templates (AI-derived + player-derived) that define complete personality profiles

The development toolchain is in the `claude/init-stellaris-ai-project-0mhnc` branch. The `main` branch contains only the mod files and templates.

## Philosophy

> The AI should play Stellaris like a competent human player — making rational decisions based on available information, responding to threats, and pursuing coherent long-term strategies.

Read more in `design/philosophy.md` on the development branch.

## License

MIT
