# Sovereign AI v0 Plan — Audit Summary & Prioritized Fixes

*Date: 2026-04-12*
*Based on: Coverage Audit, Trigger vs Reality Audit, Integration Pipeline Audit*

---

## The Verdict: Three Layers of Problems

### 1. Coverage — The mod barely touches the surface

| Category | Covered | Total | Coverage |
|----------|---------|-------|----------|
| Buildings | 8 | ~80 | ~10% |
| Districts | 5 | ~49 | ~10% |
| Technologies | 24 | 681 | ~3.5% |
| Policies | 3 | 44 | ~7% |
| Edicts | 4 | 141 | ~3% |
| Traditions | 6 trees | 16+ | ~38% |
| Ascension Perks | 0 | 42 | 0% |
| Decisions | 0 | many | 0% |

The mod also has **structural problems**: it redefines full game objects instead of just overriding `ai_weight` blocks, uses a pre-4.x district model, and its edicts use Influence costs when 4.x switched to Unity. Missing Frigate ship class entirely.

### 2. Fidelity — What exists doesn't match our own research

The Numbers Nerd produced carefully researched weight templates. **The mod files diverge from them in 9+ places:**

| What | Research Says | Mod Has | Problem |
|------|-------------|---------|---------|
| Mineral-income gate on foundries | `factor = 0.1` when minerals < 15 | Missing entirely | "Single most important fix" — unimplemented |
| Generator threshold | energy < 10 | energy < 20 | 2x too eager, wastes districts |
| Food threshold | food < 5 | food < 10 | 2x too eager, common AI waste |
| CG upkeep gate on labs | `factor = 0.1` when CG < 2 | Missing | Labs crash CG economy |
| Gene clinic enthusiasm | add 25, permanent 0.25 factor | add 75, no brake | 3x too eager on trap buildings |
| Personality factors | `has_personality = sovereign_*` | Missing from all buildings | Personalities defined but never referenced |
| Scripted triggers | Defined in sovereign_triggers.txt | Never used | Raw `has_ethic` duplicated everywhere |

### 3. Integration — The pipeline is broken in the middle

```
Wiki MCP → Numbers Nerd → research/findings/ → [BROKEN] → mod/common/
                                                              ↑ ↓
                                                         [BROKEN]
Simulator ←──── [DIVERGENT CONSTANTS] ────→ mod/common/
```

The simulator already has the research-recommended weights but uses **wrong build times** (8 months instead of 16 for districts) and **wrong job production** (+4/worker instead of +6). The mod files have neither the research weights nor the simulator's corrections.

---

## The Fix — 10 Priorities, Ordered by Impact/Effort

### Priority 1 — Add mineral-income gate to foundries + CG factories
**Effort:** One-liner each | **Impact:** Highest — prevents cascade deficits

Add `factor = 0.1` when `minerals < 15` to `building_foundry_1` and `building_civilian_industries` in `01_pop_buildings.txt`. The research calls this "the single most important fix over vanilla AI." The vanilla AI problem of "build foundry, crash mineral economy" is not addressed without this.

### Priority 2 — Align district thresholds with research
**Effort:** 6 line changes | **Impact:** High — fixes over-building

- Mining: change `minerals < 20` to `minerals < 25`
- Generator: change `energy < 20` to `energy < 10`
- Agriculture: change `food < 10` to `food < 5`, surplus from `50` to `30`, factor from `0.25` to `0.1`

These directly address the "over-investing in energy/food" pattern confirmed by both community consensus and game math.

### Priority 3 — Add CG upkeep penalty to Research Lab
**Effort:** One-liner | **Impact:** High — prevents CG crash

Add `factor = 0.1` when `consumer_goods < 2` to `building_research_lab_1`. Labs add researcher jobs consuming 2 CG each. Without this, AI can build labs while CG-negative.

### Priority 4 — Add personality factors to building weights
**Effort:** ~20 lines across files | **Impact:** High — makes 9 personalities actually differentiate

The personalities are defined in `00_personalities.txt` but no building weight references them. Add `has_personality = sovereign_*` factor modifiers per the research templates:

| Personality | Alloy Factor | Research Factor | Unity Factor |
|-------------|-------------|-----------------|-------------|
| Aggressive Expansionist | 2.0 | 1.0 | 1.0 |
| Ruthless Industrialist | 2.5 | 1.0 | 1.0 |
| Knowledge Seeker | 1.0 | 2.5 | 1.0 |
| Evangelizing Zealot | 1.25 | 0.75 | 2.5 |
| Fortress Guardian | 1.5 | 0.75 | 1.0 |
| Diplomatic Hegemon | 1.0 | 1.5 | 1.5 |

### Priority 5 — Replace raw ethics checks with scripted triggers
**Effort:** Find/replace | **Impact:** Medium — consistency, maintenance

Change `has_ethic = ethic_militarist` to `sovereign_is_militaristic = yes` etc. The triggers already exist in `sovereign_triggers.txt` and handle both regular and fanatic variants. Currently no building or district file references them.

### Priority 6 — Fix simulator constants
**Effort:** ~5 line changes | **Impact:** Medium — makes sim accurate

- District build times: change from `{ mining: 8, generator: 8, agriculture: 8 }` to `{ mining: 16, generator: 16, agriculture: 16 }` to match `base_buildtime = 480` days
- Job production: change Miner/Technician/Farmer from +4 to +6 per worker to match 4.x wiki values
- Add district energy upkeep (-1/mo per resource district, -2 for city)

### Priority 7 — Build patch-notes → mod-files mapping script
**Effort:** New tool | **Impact:** Medium — prevents silent staleness

The `wiki_patch_notes` tool already classifies changes by game system and sovereign-relevance. Create a consumer script that maps `{ buildings: "mod/common/buildings/*", districts: "mod/common/districts/*", economy: "mod/common/ai_budget/*", ai: "mod/common/personalities/*" }` and flags which mod files need review when a patch drops.

### Priority 8 — Add missing penalties
**Effort:** ~10 lines | **Impact:** Medium — convention compliance

- Industrial district: add surplus penalty (currently none)
- Gene Clinic: add permanent `factor = 0.25` brake, reduce `add` from 75 to 25, tighten slot requirement from `< 2` to `< 4`
- Civilian Industries: add surplus CG penalty

### Priority 9 — Single source of truth for constants
**Effort:** Architecture change | **Impact:** Long-term — eliminates divergence

Either make the simulator parse mod .txt files directly, or create a shared JSON config that generates both sim constants and Paradox script templates. Current duplication guarantees future divergence.

### Priority 10 — Save game feedback loop
**Effort:** New tool | **Impact:** Highest long-term — closes the evidence loop

Use `stellaris-saves MCP` to extract real AI empire data (what buildings they built, economy state, personality) and compare against what the Sovereign weights should have produced. Start with: "extract AI build orders from save, compare to our priority table."

---

## Structural Issues to Address Alongside

These aren't numbered priorities — they're architectural decisions that affect how we approach everything above.

### Full Object Redefinition vs ai_weight-Only Overrides
The mod currently redefines entire buildings, techs, ship sizes, and edicts including stats. This will conflict with vanilla and break on patches. **Fix: refactor all mod files to only contain `ai_weight` blocks**, letting vanilla handle stats, costs, and prerequisites.

### 4.x District Specialization System
Stellaris 4.x fundamentally changed districts with a primary/secondary swap system based on planet specialization. The mod uses the old pre-4.x district model. **Fix: research the new specialization system and update district weights accordingly.**

### Missing Ship Classes
4.x added Frigates between Corvette and Destroyer. Bio-ships (Maulers, Weavers, Harbingers, Stingers) exist for BioGenesis DLC. **Fix: add Frigate weights at minimum, bio-ships if scope allows.**

### Unity-Based Edicts
The mod's edicts use Influence costs, but 4.x switched to Unity upkeep. **Fix: update edict costs and AI evaluation to use Unity.**

### Personality Archetype References
The mod's personality definitions reference archetypes (`technologist`, `propagator`) that may not exist in 4.x. **Fix: verify archetypes against the wiki `ai_personalities` data and correct.**

---

## Supporting Evidence

| Finding | File |
|---------|------|
| Early economy research | `research/findings/early_economy_building_priorities.md` |
| Mod coverage audit | `research/findings/mod_coverage_audit.md` |
| Trigger vs reality audit | `research/findings/trigger_reality_audit.md` |
| Integration pipeline audit | `research/findings/integration_pipeline_audit.md` |
