# Integration Pipeline Audit
*Date: 2026-04-12*

## Evidence Flow Map

The intended pipeline is:

```
stellaris-wiki MCP  -->  Numbers Nerd agent  -->  research/findings/*.md  -->  mod/common/**/*.txt
          ^                     |                                                    |
          |               reddit-nerd                                                v
          |                     |                                          tools/simulator/sim.mjs
stellaris-saves MCP        (strategy data)                               (validates weight behavior)
  (real AI behavior)
```

**Current state of each link:**

| Link | Status | Notes |
|------|--------|-------|
| Wiki MCP -> Numbers Nerd | Working | MCP tools available, AGENT.md documents the workflow |
| Reddit-nerd -> Numbers Nerd | Working | sniff.mjs CLI used to pull community strategy |
| Numbers Nerd -> research/findings/ | Working | One finding produced (`early_economy_building_priorities.md`) |
| research/findings/ -> mod files | **BROKEN** | Manual, no tooling, values already diverge |
| mod files -> simulator | **BROKEN** | Constants are duplicated and divergent |
| stellaris-saves MCP -> feedback | **NOT CONNECTED** | Save reader exists but no loop back to weight validation |
| wiki_patch_notes -> mod file review | **NOT CONNECTED** | Tool exists but no process to flag stale mod files |

## Research vs Mod Divergence

The Numbers Nerd produced specific `ai_weight` templates in `research/findings/early_economy_building_priorities.md`. These differ from the actual mod files in `mod/common/buildings/` and `mod/common/districts/` in the following concrete ways:

### Mining District (`mod/common/districts/00_districts.txt` lines 121-168)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Primary trigger threshold | `minerals < 25` | `minerals < 20` | Mod triggers 25% later than research recommends; AI will tolerate tighter mineral income before building |
| Upstream alloy-mineral pressure | `add = 75` when `alloys < 10 AND minerals < 50` | **MISSING entirely** | The mod file has no concept of "I need alloys but my mineral base is too weak." This was a key research finding about resource chain awareness |
| Mining world designation | `add = 75` (hardcoded) | `add = @district_designation_bonus` (= 75) | Equivalent - match |
| Surplus penalty threshold | `minerals > 100` | `minerals > 100` | Match |
| Housing penalty factor | `0.1` | `0.1` | Match |

### Generator District (`mod/common/districts/00_districts.txt` lines 207-253)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Primary trigger threshold | `energy < 10` | `energy < 20` | Mod builds generators TWICE as eagerly as research recommends. Research explicitly says "don't over-invest in energy early" |
| Surplus penalty threshold | `energy > 50` | `energy > 100` | Mod allows 2x the energy surplus before penalizing. This directly contradicts the research finding that energy has diminishing value beyond upkeep coverage |

### Agriculture District (`mod/common/districts/00_districts.txt` lines 293-346)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Primary trigger threshold | `food < 5` | `food < 10` | Mod builds farms at double the research threshold. Research says food surplus is the most common early waste |
| Surplus penalty factor | `0.1` (aggressive) | `0.25` (standard) | Mod is 2.5x more permissive of food surplus. Research specifically calls out that "you have loads of food for no reason" is a common AI mistake |
| Surplus penalty threshold | `food > 30` | `food > 50` | Mod tolerates 67% more food surplus before even the mild 0.25 penalty kicks in |

### Alloy Foundry (`mod/common/buildings/01_pop_buildings.txt` lines 163-228)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Primary trigger threshold | `alloys < 10` | `alloys < 15` | Mod is slightly more eager on alloys (reasonable for a critical resource, but divergent) |
| Emergency threshold | `alloys < 3` | `alloys < 5` | Mod triggers emergency 67% earlier. Research says <3 is "can't build a starbase" territory |
| Personality: Aggressive Expansionist | `factor = 2.0` on `has_personality = sovereign_aggressive_expansionist` | **MISSING** | Mod only checks `ethic_militarist` (factor 1.5), not personality |
| Personality: Ruthless Industrialist | `factor = 2.5` on `has_personality = sovereign_ruthless_industrialist` | **MISSING** | No personality-specific factors in the mod file at all |
| Threat detection | `factor = 1.5` when `highest_threat > 50` | **MISSING** | No threat-responsive alloy production in the mod |
| Mineral-income gate | `factor = 0.1` when `minerals < 15` | **MISSING** | This is described in research as "the single most important fix over vanilla AI" and it is NOT in the mod file. The mod file has no mineral check for foundries |
| Building slot penalty | `factor = 0.01` when `free_building_slots < 2` | `factor = @low_slots_penalty` (= 0.01) when `free_building_slots < 2` | Match |

**Critical gap:** The mineral-income gate for foundries -- the one fix the research calls "the single most important" -- is absent from the mod. The vanilla AI problem of "build foundry, crash mineral economy" is not addressed.

### Research Lab (`mod/common/buildings/01_pop_buildings.txt` lines 42-90)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Primary trigger threshold | `physics_research < 20` | `physics_research < 30` | Mod triggers research lab building 50% earlier than research recommends |
| Materialist factor | `2.0` for regular, `3.0` for fanatic | `2.0` for regular, `3.0` for fanatic | Match |
| Technocracy factor | `2.0` | `2.5` | Mod is 25% more aggressive for technocracy (exceeds research recommendation) |
| Knowledge Seeker personality | `factor = 2.5` | **MISSING** | No personality-based research factor |
| CG upkeep penalty | `factor = 0.1` when `consumer_goods < 2` | **MISSING** | Research calls this "critical" -- labs add researcher jobs consuming 2 CG each. Without this, AI can build labs while CG-negative |
| Surplus threshold | `physics_research > 80` | `physics_research > 100` | Mod is 25% more permissive of research surplus |
| Mineral stockpile check | `factor = 0.1` when `minerals < 300` | **MISSING** | No check on whether the AI can afford to build the lab |

### Civilian Industries (`mod/common/buildings/01_pop_buildings.txt` lines 233-293)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Primary trigger threshold | `consumer_goods < 5` | `consumer_goods < 10` | Mod builds CG buildings at double the research threshold. Research says CG buildings are a "deficit response, not a proactive build" |
| Gestalt hard block | `factor = 0` when `is_gestalt = yes` | `factor = 0` when `is_gestalt = yes` | Match |
| Mineral-income gate | `factor = 0.1` when `minerals < 15` | **MISSING** | Artisans consume 6 minerals per 100 workforce, same concern as foundries |

### Gene Clinic (`mod/common/buildings/01_pop_buildings.txt` lines 344-389)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Activation conditions | `num_pops < 20 AND free_housing > 5 AND free_building_slots > 3` with `add = 25` | `num_pops < 30 AND free_housing > 3` with `add = 75` | Mod is 3x more enthusiastic about gene clinics (add 75 vs 25). Research consensus is "growth buildings are traps." Pop threshold is 50% higher (30 vs 20) |
| Permanent penalty | `factor = 0.25` with `always = yes` | **MISSING** | Research recommends a permanent 0.25 factor to ensure clinics never outprioritize production buildings. The mod has no such brake |
| Building slot strictness | `factor = 0.01` when `free_building_slots < 4` | `factor = 0.01` when `free_building_slots < 2` | Mod uses the standard 2-slot threshold; research recommends 4 to protect slots for production |

### Capital Buildings (`mod/common/buildings/00_capital_buildings.txt` lines 68-84)

| Parameter | Research Template | Mod File | Impact |
|-----------|------------------|----------|--------|
| Base weight | `weight = 200` | `weight = @capital_accrual_weight` (= 150) | Mod uses 150 vs research's 200. Both are non-zero (correct for capitals), but mod is 25% less urgent |
| Pop-threshold add | `add = 200` | `add = @capital_upgrade_urgency` (= 200) | Match |
| Max weight when eligible | 400 (200 + 200) | 350 (150 + 200) | Mod's maximum capital weight (350) can be beaten by an emergency foundry (300). Research intended capitals to always outprioritize regular buildings |

### Unity Buildings (Temple / Administrative Offices)

Research provides a full template. **No dedicated unity building file exists in the mod.** The template with `add = 75` at `unity < 15`, `add = 50` for "one per colony" logic, and `factor = 2.5` for spiritualists is entirely unimplemented.

### Stronghold / Precinct Houses

Research provides a crime-gated template. **No stronghold/precinct building file exists in the mod.** The template ensuring these only build when `planet_crime > 30` is not implemented, meaning vanilla weights likely apply.

## Simulator vs Mod Divergence

The simulator (`tools/simulator/sim.mjs`) duplicates weight logic in JavaScript rather than referencing mod files. Specific divergences:

### Constants

| Constant | Simulator (`sim.mjs`) | Mod File | Line |
|----------|----------------------|----------|------|
| Mining district build time | 8 months (line 20) | `base_buildtime = 480` days (= 16 months at 30d/mo) | districts line 89 |
| Generator district build time | 8 months | `base_buildtime = 480` days (= 16 months) | districts line 175 |
| City district cost | 500 minerals | 500 minerals | Match |
| City district build time | 16 months | `base_buildtime = 480` days (= 16 months) | Match |
| Alloy foundry build time | 12 months | `base_buildtime = 360` (= 12 months) | Match |
| Capital T1 housing | +5 (line 203) | `planet_housing_add = 5` (line 49) | Match |
| Capital T2 housing | +8 (line 203) | `planet_housing_add = 8` (line 125) | Match |
| District housing: mining | 2 (line 22) | `planet_housing_add = 2` (line 98) | Match |
| District housing: city | 5 (line 22) | `planet_housing_add = 5` (line 35) | Match |

**Critical:** The simulator uses 8-month build times for resource districts (line 20), but the mod files specify `base_buildtime = 480` which is 480 days = ~16 months. This means the simulator models districts being built TWICE as fast as they actually are in the mod. All simulator extrapolations are based on this error.

### Weight Decision Logic

| Decision | Simulator (`sim.mjs`) | Mod File | Divergent? |
|----------|----------------------|----------|-----------|
| Mining trigger | `minerals < personality.mineral_threshold` (default 25) | `minerals < 20` | Yes - simulator uses research value (25), mod uses 20 |
| Generator trigger | `energy < personality.energy_threshold` (default 10) | `energy < 20` | Yes - inverse: simulator uses research value (10), mod is 2x higher |
| Agriculture trigger | `food < 5` hardcoded (line 344) | `food < 10` | Yes - simulator uses research value, mod is 2x higher |
| Food surplus penalty | `food > 30` -> `* 0.1` | `food > 50` -> `* 0.25` | Yes - both threshold and factor differ |
| Alloy foundry mineral gate | `income.minerals < 15` -> `w *= 0.1` (line 376) | **MISSING** | Simulator has it, mod does not |
| Alloy foundry slot penalty | `freeBuildingSlots < 2` -> `w *= 0.5` (line 377) | `free_building_slots < 2` -> `factor = 0.01` | Factor differs: 0.5 vs 0.01. Simulator is 50x more permissive |
| Research lab CG gate | `income.consumer_goods < 2` -> `w *= 0.1` (line 388) | **MISSING** | Simulator has it, mod does not |
| Research lab slot penalty | `freeBuildingSlots < 2` -> `w *= 0.5` (line 390) | `free_building_slots < 2` -> `factor = 0.01` | Factor differs: 0.5 vs 0.01 |
| Gene clinic permanent penalty | `w *= 0.25` (line 429) | **MISSING** | Simulator has it, mod does not |
| Capital weight | `w = 400` hardcoded (line 299) | `weight = 150, add = 200` (= 350 when eligible) | 400 vs 350 |

### Personality Factors

| Personality | Simulator Alloy Factor | Research Recommendation | Mod File Reference |
|-------------|----------------------|------------------------|-------------------|
| Default | 1.0 | 1.0 | N/A |
| Knowledge Seeker | 1.0 | 1.0 | No personality factors in building files |
| Aggressive Expansionist | 2.0 | 2.0 | Only `ethic_militarist = 1.5` |
| Ruthless Industrialist | 2.5 | 2.5 | **MISSING** from mod files entirely |
| Evangelizing Zealot | 1.25 | 1.25 | **MISSING** from mod files entirely |
| Fortress Guardian | 1.5 | 1.5 | **MISSING** from mod files entirely |
| Diplomatic Hegemon | 1.0 | 1.0 | **MISSING** from mod files entirely |

The simulator models personality-driven factors correctly (matching the research), but the mod files only check ethics, not personalities. Since personalities are defined in `mod/common/personalities/00_personalities.txt`, the building weights should be checking `has_personality = sovereign_*` in addition to ethics.

## Convention Compliance

Checked against rules in `design/weight_conventions.md`:

### Rule: "Add before Factor"

**COMPLIANT** in all mod files. Every `ai_weight` block puts `add` modifiers before `factor` modifiers.

### Rule: "Max 3 factor modifiers"

**COMPLIANT.** No building or district weight block exceeds 3 cascading factors. The most complex is Research Lab T1 with 5 factor blocks, but they are mutually exclusive (materialist/fanatic_materialist/technocracy) or conditional, so at most 3 would fire simultaneously.

### Rule: "Always include a penalty"

| File | Building/District | Has Penalty? | Issue |
|------|-------------------|-------------|-------|
| `01_pop_buildings.txt` | Research Lab T1 | Yes (surplus + low slots) | Missing: CG upkeep penalty, mineral stockpile check |
| `01_pop_buildings.txt` | Alloy Foundry | Yes (surplus + low slots) | **Missing: mineral income penalty** (the most important one) |
| `01_pop_buildings.txt` | Civilian Industries | Yes (gestalt block + low slots) | Missing: mineral income penalty, surplus penalty |
| `01_pop_buildings.txt` | Gene Clinic | Yes (overcrowded + low slots) | Missing: permanent 0.25 penalty |
| `01_pop_buildings.txt` | Luxury Residence | Yes (surplus housing + low slots) | Compliant |
| `00_districts.txt` | Mining | Yes (surplus + housing) | Compliant |
| `00_districts.txt` | Generator | Yes (surplus + housing) | Surplus threshold too high (100 vs research's 50) |
| `00_districts.txt` | Agriculture | Yes (surplus + housing + machine block) | Surplus threshold too high and factor too lenient |
| `00_districts.txt` | Industrial | Yes (housing) | **Missing: surplus penalty** entirely. No alloy or CG surplus check. No mineral income gate |
| `00_districts.txt` | City | Yes (surplus housing) | Compliant |

### Rule: "Every weight should consider relevant ethics/civics via factor modifiers"

**PARTIALLY VIOLATED.** The research lab correctly checks materialist/technocracy. But:
- Alloy Foundry: checks `ethic_militarist` but not `sovereign_aggressive_expansionist` or `sovereign_ruthless_industrialist` personalities
- Civilian Industries: **no ethics/personality modifiers at all**
- Gene Clinic: checks `ethic_xenophile` but not personality
- No building file references any `sovereign_*` personality via `has_personality`

### Rule: "Use scripted triggers"

The `sovereign_triggers.txt` file defines useful triggers like `sovereign_is_militaristic`, `sovereign_is_materialist`, `sovereign_needs_consumer_goods`, etc. **None of these are used in any building or district file.** Every building file uses raw `has_ethic` checks instead of the scripted triggers. This means:
- If ethics checks need updating, every file must be changed individually
- The triggers `sovereign_economy_is_critical`, `sovereign_has_stable_economy`, and `sovereign_needs_consumer_goods` are defined but never referenced

### Variable Naming

All scripted variables follow the `@<category>_<specific>_<type>` convention. District files use `@district_base`, `@district_need`, `@district_surplus_penalty`, `@district_designation_bonus`. Building files use `@resource_building_base`, `@resource_building_need`, `@resource_building_surplus_penalty`, `@low_slots_penalty`. **COMPLIANT.**

## Missing Automation Opportunities

### 1. Wiki Data -> Mod File Validator

**What:** A script that calls `wiki_game_data` for types like `buildings`, `districts`, `jobs` and cross-references against mod file identifiers.

**Why:** The mod uses identifiers like `building_research_lab_1`, `district_mining`, `job_miner_add`. If Stellaris renames these in a patch (e.g., 4.x renamed many building IDs), the mod silently breaks. The wiki MCP already extracts structured data with IDs.

**Effort:** Medium. Parse mod .txt files for identifiers, call wiki MCP, diff.

### 2. Patch Notes -> Stale File Flagger

**What:** Run `wiki_patch_notes` with filter `sovereign`, then match each change's `tags` array against a mapping of `{ buildings: ["mod/common/buildings/*"], districts: ["mod/common/districts/*"], economy: ["mod/common/ai_budget/*"], ai: ["mod/common/personalities/*", "mod/events/*"], ... }`.

**Why:** The `wiki_patch_notes` tool already classifies changes by game system and direction (buff/nerf/rework). It already has a `sovereign_relevant` boolean. But there is zero process connecting a patch release to "which of our mod files need review." This is a simple mapping.

**Effort:** Low. The CHANGE_TAGS system in the wiki MCP (index.ts lines 983-1004) already does all the classification. Just need a consumer script.

### 3. Simulator -> Mod File Sync

**What:** Extract constants from `sim.mjs` into a shared JSON config that both the simulator and a Paradox script generator can consume. Or better: have the simulator parse the mod .txt files directly and use those values.

**Why:** The simulator currently duplicates every constant (costs, build times, job outputs, weight thresholds) and is already divergent from the mod files. The two-source-of-truth problem will only get worse as the mod evolves.

**Effort:** High for parsing Paradox syntax in JS. Medium if we standardize on a JSON config and generate both sim constants and .txt templates from it.

### 4. Research Finding -> Mod File Diff Generator

**What:** A script that reads the `## Weight Recommendations` section from a research finding, parses the Paradox-syntax code blocks, and generates a diff against the corresponding mod file.

**Why:** The current process is entirely manual: someone reads the research finding, mentally compares it to the mod file, and manually edits. As this audit shows, that process has already produced significant drift. The research findings already contain valid Paradox script blocks -- they just need to be extracted and compared.

**Effort:** Medium. The research templates are already in code blocks with identifiable headers ("Mining District", "Research Labs (T1)"). Regex extraction + text diff is straightforward.

### 5. Save Game -> Weight Validation Loop

**What:** Use `stellaris-saves MCP` to extract real AI empire data (what buildings they built, their economy state, their personality) and compare against what the Sovereign weights *should* have produced given those conditions.

**Why:** The save reader already exists and can parse empire budgets, tech, and stats. But there is no loop from "here's what the AI actually did" back to "here's what our weights predicted it should do." This is the only way to validate weights in practice vs theory.

**Effort:** High. Requires replaying the weight evaluation logic against save-extracted state, accounting for all the conditions the AI evaluated.

### 6. Scripted Trigger Usage Enforcement

**What:** A linter that checks mod files use `sovereign_is_militaristic` instead of raw `has_ethic = ethic_militarist OR has_ethic = ethic_fanatic_militarist` blocks.

**Why:** The scripted triggers exist but are unused. This means ethics checks are duplicated across files and will drift.

**Effort:** Low. Regex scan for `has_ethic = ethic_*` in building/district files, flag any that have a corresponding `sovereign_is_*` trigger.

## Recommended Next Steps

**Priority 1 -- Fix the mineral-income gate (immediate, high-impact):**
Add `factor = 0.1` when `minerals < 15` to `building_foundry_1` and `building_civilian_industries` in `01_pop_buildings.txt`. The research calls this "the single most important fix over vanilla AI" and it is not in the mod. This is a one-line addition to each building.

**Priority 2 -- Align district thresholds with research (immediate, medium-impact):**
- Mining: change `minerals < 20` to `minerals < 25` (line 131)
- Generator: change `energy < 20` to `energy < 10` (line 218)
- Agriculture: change `food < 10` to `food < 5` (line 300), surplus from `50` to `30` (line 332), factor from `0.25` to `0.1` (line 331)
These are the research's core early-economy findings and directly address the "over-investing in energy/food" pattern.

**Priority 3 -- Add CG upkeep penalty to Research Lab (immediate, low-effort):**
Add `factor = 0.1` when `consumer_goods < 2` to `building_research_lab_1`. Without this, the AI can build labs while CG-negative and crash the consumer goods economy.

**Priority 4 -- Add personality factors to building weights (medium-effort, high-value):**
The personalities are defined in `00_personalities.txt` but no building weight references them. Add `has_personality = sovereign_*` factor modifiers to foundries, research labs, and unity buildings per the research template.

**Priority 5 -- Replace raw ethics checks with scripted triggers (low-effort, maintenance win):**
Change `has_ethic = ethic_militarist` to `sovereign_is_militaristic = yes` etc. The triggers already exist and handle both regular and fanatic variants.

**Priority 6 -- Fix simulator build times (low-effort, accuracy):**
Change `DISTRICT_BUILD_TIME` values in `sim.mjs` line 20 from `{ mining: 8, generator: 8, agriculture: 8, city: 16 }` to `{ mining: 16, generator: 16, agriculture: 16, city: 16 }` to match the mod's `base_buildtime = 480` (days, not months).

**Priority 7 -- Build the patch-notes-to-mod-files mapping (medium-effort, long-term value):**
Create a simple script that runs `wiki_patch_notes`, takes the sovereign-relevant changes, and maps them to mod files. This prevents the mod from silently going stale when Paradox releases a patch.

**Priority 8 -- Add missing penalty modifiers (medium-effort):**
Industrial district (`district_industrial`) has no surplus penalty. Gene Clinic needs a permanent `factor = 0.25`. Civilian Industries needs a surplus CG check.

**Priority 9 -- Single source of truth for constants (high-effort, long-term):**
Either make the simulator parse mod files, or create a shared JSON config that generates both. The current duplication guarantees future divergence.

**Priority 10 -- Save game feedback loop (high-effort, highest long-term value):**
This is the only way to close the loop from "we think these weights are correct" to "here's what the AI actually does with them." Build incrementally: start with a simple "extract AI build orders from save, compare to our priority table" report.
