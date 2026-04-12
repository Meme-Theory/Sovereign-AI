# Trigger vs Reality Audit
*Date: 2026-04-12*
*Sources: Stellaris Wiki (4.3), mod files in sovereign_triggers.txt, weight files, simulator sim.mjs*

## Trigger Accuracy

### Empire Type Checks (all VALID)

| Trigger | What It Checks | API Valid? | Notes |
|---------|---------------|------------|-------|
| `sovereign_is_standard_empire` | `is_regular_empire = yes` AND `is_fallen_empire = no` | Yes | Both are valid Stellaris conditions |
| `sovereign_is_militaristic` | `has_ethic = ethic_militarist` OR `ethic_fanatic_militarist` | Yes | Standard ethic check |
| `sovereign_is_pacifist` | `has_ethic = ethic_pacifist` OR `ethic_fanatic_pacifist` | Yes | Standard ethic check |
| `sovereign_is_materialist` | `has_ethic = ethic_materialist` OR `ethic_fanatic_materialist` | Yes | Standard ethic check |
| `sovereign_is_spiritualist` | `has_ethic = ethic_spiritualist` OR `ethic_fanatic_spiritualist` | Yes | Standard ethic check |
| `sovereign_is_xenophobe` | `has_ethic = ethic_xenophobe` OR `ethic_fanatic_xenophobe` | Yes | Standard ethic check |
| `sovereign_is_xenophile` | `has_ethic = ethic_xenophile` OR `ethic_fanatic_xenophile` | Yes | Standard ethic check |
| `sovereign_is_genocidal` | Checks `civic_fanatic_purifiers`, `civic_hive_devouring_swarm`, `civic_machine_terminator` | Yes | Standard civic checks |

### Economic State Checks

| Trigger | What It Checks | API Valid? | Issues Found |
|---------|---------------|------------|-------------|
| `sovereign_has_stable_economy` | energy income > 10, minerals income > 10, energy stockpile > 200, minerals stockpile > 200 | Yes | **ISSUE: Income thresholds may be too low.** See Threshold Validation below. |
| `sovereign_economy_is_critical` | energy income < -10 OR minerals income < -10 OR energy < 50 OR minerals < 50 | Yes | Stockpile thresholds are reasonable. Income thresholds are correct -- -10/month is genuinely critical. |
| `sovereign_has_alloy_surplus` | alloy income > 20 AND alloy stockpile > 500 | Yes | **ISSUE: alloy income > 20 is mid-game territory.** Early game targets are 10-15 by 2210. A "surplus" at >20 is correct for mid-game but this trigger won't fire until well past early game. |
| `sovereign_needs_consumer_goods` | CG income < 5 (regular empire only) | Yes | Threshold is appropriate. See analysis below. |

### Military State Checks

| Trigger | What It Checks | API Valid? | Issues Found |
|---------|---------------|------------|-------------|
| `sovereign_has_strong_fleet` | `used_naval_capacity_percent > 0.7` | Yes | Reasonable threshold. |
| `sovereign_fleet_is_weak` | `used_naval_capacity_percent < 0.3` | Yes | Reasonable threshold. |
| `sovereign_is_threatened` | `highest_threat > 50` | Yes | **POTENTIAL ISSUE: 50 is quite high.** Threat accumulates slowly. Most early/mid-game AI interactions have threat in the 10-30 range. Consider adding a `sovereign_is_somewhat_threatened` at > 25 for earlier military buildup responses. |

### Planet Checks

| Trigger | What It Checks | API Valid? | Issues Found |
|---------|---------------|------------|-------------|
| `sovereign_planet_has_growth_room` | `free_housing > 3` AND `free_district_slots > 0` | Yes | Reasonable. |
| `sovereign_planet_is_overcrowded` | `free_housing < 0` AND `num_pops > 20` | Yes | **ISSUE: In 4.x, pops are measured per 100 workforce, not individual pops.** The wiki confirms housing is measured in units of 100 (e.g., mining district provides +200 housing). `num_pops > 20` likely means 2000+ workforce units. This needs verification -- if the game still reports `num_pops` in raw count, the threshold is wrong for 4.x where planets start with ~2800 pops. |
| `sovereign_planet_needs_jobs` | `num_unemployed > 3` AND `free_building_slots > 0` | Yes | Same pop-scale concern as above. 3 unemployed in 4.x units may mean 300 workforce, which is a tiny amount. |

### Missing Triggers (Things We Should Check But Don't)

1. **`sovereign_has_mineral_surplus_for_foundry`** -- We penalize foundry building when minerals < 15 in the weight files, but there's no reusable trigger for "can my mineral economy support adding a foundry?" This should be: `minerals income > 20 AND minerals stockpile > 400` (enough to build the foundry + sustain the 12 mineral/month drain for a few months).

2. **`sovereign_needs_alloys`** -- We check alloy income in weight files but have no trigger. The alloy foundry weight checks `alloys < 15` and `alloys < 5` separately. A trigger at `alloys < 10` would match the Numbers Nerd's recommended threshold.

3. **`sovereign_is_early_game`** -- No trigger for game phase. Many of our weight decisions should be phase-aware. Consider: `years_passed < 30` for early game.

4. **`sovereign_planet_needs_building_slots`** -- We check `free_building_slots < 2` as a penalty but never check "does this planet urgently need more building slots" as a positive trigger for city districts.

5. **`sovereign_has_cg_headroom_for_research`** -- The CG gate for research buildings (checked inline) should be a trigger: `consumer_goods income > 4` (enough to sustain 2 new researcher jobs).

6. **`sovereign_is_egalitarian`** / **`sovereign_is_authoritarian`** -- We check most ethics pairs but miss egalitarian and authoritarian, which affect worker/specialist output and unity preferences.

7. **Market trading conditions** -- No triggers related to market state, but the wiki confirms max stable buy rate of 42 minerals/month at base prices.

---

## Threshold Validation

### Mineral Income Thresholds

**Our mod uses:**
- Mining district trigger: `minerals < 20` (add 100)
- Mining district emergency: `minerals < 0` (add 200)
- Mining district surplus penalty: `minerals > 100` (factor 0.25)
- Stable economy trigger: `minerals > 10`
- Numbers Nerd recommendation: `minerals < 25` (primary trigger)

**Wiki reality:**
- Mining district costs 300 minerals, 240 days build time
- Each mining district provides +200 Miner jobs
- Miner output is base resource production (no explicit per-100 number in filtered results, but research findings doc says "pure production")
- Metallurgist consumes 6 minerals per 100 workforce to produce 3 alloys
- With 2 mining districts at start (the simulator assumes this), initial mineral income depends on pop fill rate

**Analysis:**
- The mod's `minerals < 20` threshold is **too low** compared to the Numbers Nerd's recommendation of `< 25`. The reasoning: with a single alloy foundry (200 metallurgist jobs consuming 6 minerals per 100 workforce once filled), the AI needs at least 25 mineral income to sustain the foundry AND have minerals left over for construction. At < 20, the AI is already in mineral trouble if it has any metallurgist jobs active.
- The surplus penalty at `> 100` is reasonable for early game but may be too high for mid-game when mineral income naturally reaches 50-80.

**RECOMMENDATION:** Change mining district primary trigger from `minerals < 20` to `minerals < 25` to match research findings.

### Energy Income Thresholds

**Our mod uses:**
- Generator district trigger: `energy < 20` (add 100)
- Generator district emergency: `energy < 0` (add 200)
- Generator district surplus penalty: `energy > 100` (factor 0.25)
- Stable economy trigger: `energy > 10`
- Numbers Nerd recommendation: `energy < 10` (primary trigger)

**Wiki reality:**
- Generator district: 300 minerals, 240 days, +200 Technician jobs
- Technician produces +6 Energy per 100 workforce
- District upkeep: -1 Energy
- Building upkeep: -2 Energy each for most buildings
- All resource districts have -1 Energy upkeep

**Analysis:**
- The mod's `energy < 20` threshold is **too high** compared to the Numbers Nerd's recommendation of `< 10`. The community consensus is clear: "don't over-invest in energy early, just stay positive." Energy income of 10-20 is already healthy for early game. A threshold of 20 causes the AI to over-build generator districts, wasting district slots that should go to mining.
- The surplus penalty at `> 100` is reasonable.

**RECOMMENDATION:** Change generator district primary trigger from `energy < 20` to `energy < 10` to match research findings. The current threshold causes energy over-investment.

### Alloy Income Thresholds

**Our mod uses:**
- Foundry building trigger: `alloys < 15` (add 100)
- Foundry emergency: `alloys < 5` (add 200)
- Foundry surplus penalty: `alloys > 50` (factor 0.25)
- Industrial district trigger: `alloys < 15` (add 100)
- Numbers Nerd recommendation: `alloys < 10` (primary trigger for buildings), `alloys < 3` (emergency)

**Wiki reality:**
- Metallurgist: +3 Alloys output, -6 Minerals upkeep per 100 workforce
- Alloy Foundry T1: 400 minerals, 360 days, +200 Metallurgist jobs
- Community targets: 10-15 alloys/month by 2210, 25-30 by 2220
- Machine Intelligence metallurgists get +4 Alloys, -8 Minerals (slightly better ratio)

**Analysis:**
- The mod's foundry trigger at `alloys < 15` is **too high** for early game. At game start, alloy income is typically around 5-8 from starting jobs. A threshold of 15 means the AI will try to build foundries even when its alloy income is already adequate for early expansion (starbases cost 100 alloys each). This could cause mineral starvation.
- The emergency at `alloys < 5` is **too high** compared to the Numbers Nerd's `< 3`. At < 5 alloys, the AI can still build starbases (one every 20 months). True emergency is < 3 where the AI "can't build a starbase" territory.
- The mod's building file `building_foundry_1` and the Numbers Nerd recommendation disagree: mod uses `< 15` and `< 5`, research says `< 10` and `< 3`.

**RECOMMENDATION:** Change foundry trigger from `alloys < 15` to `alloys < 10`, and emergency from `alloys < 5` to `alloys < 3`.

### Consumer Goods Income Thresholds

**Our mod uses:**
- Civilian Industries trigger: `CG < 10` (add 100)
- Civilian Industries emergency: `CG < 0` (add 200)
- `sovereign_needs_consumer_goods` trigger: `CG < 5`
- Numbers Nerd recommendation: `CG < 5` (primary trigger), `CG < 0` (emergency)

**Wiki reality:**
- Artisan: +6 Consumer Goods, -6 Minerals per 100 workforce
- Researcher upkeep: -2 CG per 100 workforce (Individualist)
- Bureaucrat/Priest upkeep: -2 CG per 100 workforce

**Analysis:**
- The mod's `CG < 10` trigger in the building file is **too high** compared to the Numbers Nerd's `< 5`. City district specializations (Mixed Industry) already provide CG, so dedicated CG buildings should only appear when there's a genuine deficit. At CG income of 5-10, the empire is still functional.
- The emergency at `CG < 0` is correct.
- The trigger `sovereign_needs_consumer_goods` at `< 5` is correct and matches the research.

**RECOMMENDATION:** Change Civilian Industries trigger from `CG < 10` to `CG < 5` to match both the trigger file and research findings. The building weight and the trigger should be consistent.

### Food Income Thresholds

**Our mod uses:**
- Agriculture district trigger: `food < 10` (add 100)
- Agriculture district emergency: `food < 0` (add 200)
- Agriculture district surplus penalty: `food > 50` (factor 0.25)
- Numbers Nerd recommendation: `food < 5` (primary), `food < 0` (emergency), `food > 30` (surplus at factor 0.1)

**Wiki reality:**
- Farmer: +6 Food per 100 workforce
- Agriculture district: 300 minerals, 240 days, +200 Farmer jobs
- Food only feeds pop growth -- unlike minerals which feed production chains

**Analysis:**
- The mod's `food < 10` trigger is **too high** compared to the Numbers Nerd's `< 5`. Food only needs to stay positive for pop growth. Over-investing in food is one of the most common AI mistakes.
- The surplus penalty at `food > 50` with factor 0.25 is **too lenient**. The Numbers Nerd recommends `> 30` with factor 0.1. Food surplus above 30 is pure waste.

**RECOMMENDATION:** Change food trigger from `food < 10` to `food < 5`. Change surplus penalty from `food > 50, factor 0.25` to `food > 30, factor 0.1`.

### Research Income Thresholds

**Our mod uses:**
- Research lab trigger: `physics_research < 30` (add 100)
- Research lab surplus penalty: `physics_research > 100` (factor 0.25)
- Numbers Nerd recommendation: `physics_research < 20` (primary trigger), `> 80` (surplus)

**Wiki reality:**
- Researcher: +3 per field per 100 workforce
- Research Labs T1: +60 each Biologist/Engineer/Physicist (meaning 60 jobs of each type)
- Research Complexes T2: +120 each

**Analysis:**
- The mod's `physics_research < 30` trigger is **slightly too high** for early game. In 4.x with per-100-pop scaling, early game research numbers are smaller. The Numbers Nerd's `< 20` accounts for this.
- More importantly, the mod only checks `physics_research` but research has three fields (physics, society, engineering). If physics is fine but society is lagging, the trigger won't fire.

**RECOMMENDATION:** Change research lab trigger from `physics_research < 30` to `physics_research < 20`. Consider adding checks for all three research fields, not just physics.

---

## Simulator vs Reality

### Job Production Rates

| Job | Simulator Value | Wiki Value | Match? | Notes |
|-----|----------------|------------|--------|-------|
| Miner | +4 minerals | Not explicit in filtered data | **UNCERTAIN** | Wiki shows miners as "base resource" producers. The research findings doc says "pure production" without a number. The 4 value may be correct for older versions but in 4.x with per-100 workforce scaling, production values have changed. |
| Technician | +4 energy | **+6 Energy** per 100 workforce | **WRONG** | Wiki explicitly shows +6. Simulator underestimates energy production by 33%. |
| Farmer | +4 food | **+6 Food** per 100 workforce | **WRONG** | Wiki explicitly shows +6. Simulator underestimates food production by 33%. |
| Metallurgist | +3 alloys, -6 minerals | **+3 Alloys, -6 Minerals** | **CORRECT** | Wiki confirms these exact values. |
| Artisan | +6 CG, -6 minerals | **+6 CG, -6 Minerals** | **CORRECT** | Wiki confirms. Gestalt gets +8 CG, -8 Minerals. |
| Researcher | +3 research, -2 CG | **+3 per field, -2 CG** | **CORRECT** | Wiki confirms +3 per field per 100 workforce, -2 CG (Individualist). Hive Minds pay -6 Minerals instead. Machine Intelligence pays -4 Energy instead. |
| Bureaucrat | +3 unity, -2 CG | **Not explicitly shown** | **UNCERTAIN** | Wiki shows Bureaucrat jobs exist but filtered data didn't include output numbers. |
| Priest | +4 unity, -2 CG | **Not explicitly shown** | **UNCERTAIN** | Wiki confirms Priest jobs. Temple provides +200 Priests. |
| Clerk | +2 energy, +1 CG | **Not explicitly shown** | **UNCERTAIN** | Wiki confirms Clerk jobs from city districts. |
| Politician | +3 unity, +1 housing | **Not standard** | **UNCERTAIN** | Wiki shows capital buildings provide Politician jobs. Output not shown in filtered data. |
| Enforcer | +1 unity, -5 crime | **Not explicitly shown** | **UNCERTAIN** | Wiki shows +200 Enforcers from Precinct Houses. |
| Soldier | +1 unity, +2 naval_cap | **Not explicitly shown** | **UNCERTAIN** | Wiki shows +200 Soldiers from Stronghold. |

**Critical finding: Technician and Farmer production values are WRONG in the simulator.** The simulator uses +4 for both, but the wiki shows +6 for both in 4.x. This means the simulator underestimates basic resource income by 33%, which cascades into incorrect deficit threshold timing. The AI in simulation will build more resource districts than a real game would need.

### District Costs and Build Times

| District | Simulator Cost | Wiki Cost | Match? | Simulator Build Time | Wiki Build Time | Match? |
|----------|---------------|-----------|--------|---------------------|-----------------|--------|
| Mining | 300 minerals | **300 minerals** | **CORRECT** | 8 months | **240 days (~8 months)** | **CORRECT** |
| Generator | 300 minerals | **300 minerals** | **CORRECT** | 8 months | **240 days (~8 months)** | **CORRECT** |
| Agriculture | 300 minerals | **300 minerals** | **CORRECT** | 8 months | **240 days (~8 months)** | **CORRECT** |
| City | 500 minerals | **500 minerals** | **CORRECT** | 16 months | **480 days (~16 months)** | **CORRECT** |

### District Housing

| District | Simulator Housing | Wiki Housing | Match? |
|----------|------------------|-------------|--------|
| Mining | 2 | **+200** | **SCALE MISMATCH** |
| Generator | 2 | **+200** | **SCALE MISMATCH** |
| Agriculture | 2 | **+200** | **SCALE MISMATCH** |
| City | 5 | **+1000** | **SCALE MISMATCH** |

**Note:** The wiki shows 4.x housing values in hundreds (200 = 200 housing units in the per-100-pop system). The simulator appears to use an older scale where 2 housing = 2 pops. This is internally consistent within the simulator (pops start at 28, not 2800), so the simulator is modeling the OLD pop system, not the 4.x per-100 system. This doesn't affect relative decision-making but means absolute numbers in the simulator can't be directly compared to 4.x save game data.

### District Upkeep

| District | Simulator Upkeep | Wiki Upkeep | Match? |
|----------|-----------------|-------------|--------|
| Mining | 0 (not modeled) | **-1 Energy** | **MISSING** |
| Generator | 0 (not modeled) | **-1 Energy** | **MISSING** |
| Agriculture | 0 (not modeled) | **-1 Energy** | **MISSING** |
| City | 0 (not modeled) | **-2 Energy** | **MISSING** |

**Critical finding: The simulator does not model district energy upkeep.** Every resource district costs 1 Energy/month, and city districts cost 2 Energy/month. With 6+ districts on a planet, that's 6-10 Energy/month in upkeep that the simulator ignores. This makes energy income look healthier than it actually is, which combined with the inflated technician production (+4 instead of +6, partially canceling out), creates compounding inaccuracies.

### District Jobs

| District | Simulator Jobs | Wiki Jobs | Match? |
|----------|---------------|-----------|--------|
| Mining | 2 Miners | **+200 Miners** | **SCALE MISMATCH** (internally consistent) |
| Generator | 2 Technicians | **+200 Technicians** | **SCALE MISMATCH** (internally consistent) |
| Agriculture | 2 Farmers | **+200 Farmers** | **SCALE MISMATCH** (internally consistent) |
| City | 1 Clerk | **Not explicit in base** | City districts in 4.x provide jobs through specialization system, not base clerk jobs for Individualist empires. **The simulator's "1 clerk" is an oversimplification.** |

### Building Costs

| Building | Simulator Cost | Wiki Cost | Match? |
|----------|---------------|-----------|--------|
| Alloy Foundry | 400 minerals | **400 minerals** | **CORRECT** |
| Research Lab | 400 minerals | **400 minerals** | **CORRECT** |
| Civilian Industries | 400 minerals | **400 minerals** | **CORRECT** |
| Temple | 400 minerals | **400 minerals** | **CORRECT** |
| Admin Office | 400 minerals | **400 minerals** | **CORRECT** |
| Stronghold | 400 minerals | **400 minerals** | **CORRECT** |
| Gene Clinic | 400 minerals | **Not in standard building data** | **UNCERTAIN** - Gene Clinics may have been removed or renamed in 4.x |
| Capital T1 | 500 minerals | **Wiki doesn't show explicit cost** | **UNCERTAIN** |
| Capital T2 | 800 minerals | **Wiki doesn't show explicit cost** | **UNCERTAIN** |

### Building Jobs

| Building | Simulator Jobs | Wiki Jobs | Match? |
|----------|---------------|-----------|--------|
| Alloy Foundry | 2 Metallurgists | **+200 Metallurgists** | **SCALE MISMATCH** (internally consistent) |
| Research Lab | 2 Researchers | **+60 Biologists, +60 Engineers, +60 Physicists** | **DIFFERENT** - Wiki shows 60 per field (180 total research jobs), not a generic "2 researchers." The simulator collapses three fields into one. |
| Civilian Industries | 2 Artisans | **+200 Artisans** | **SCALE MISMATCH** (internally consistent) |
| Stronghold | 2 Soldiers | **+200 Soldiers** | **SCALE MISMATCH** (internally consistent) |
| Temple | 2 Priests | **+200 Priests** | **SCALE MISMATCH** (internally consistent) |

**Important finding on Research Labs:** The wiki shows Research Labs provide 60 jobs of each research type (Biologist, Engineer, Physicist) -- 180 total. This is not "2 researchers" but rather three separate specialist job slots. The simulator's simplification of "+2 researchers producing +3 research each = +6 total" doesn't capture that research labs produce ALL THREE fields simultaneously. This matters because our weight files only check `physics_research` -- but a Research Lab boosts all three fields equally.

### Building Energy Upkeep

| Building | Simulator Upkeep | Wiki Upkeep | Match? |
|----------|-----------------|-------------|--------|
| Alloy Foundry | -2 Energy | **-2 Energy** | **CORRECT** |
| Research Lab | -2 Energy | **-2 Energy** | **CORRECT** |
| Civilian Industries | -2 Energy | **-2 Energy** | **CORRECT** |
| Stronghold | -1 Energy | **-1 Energy** | **CORRECT** |
| Temple | -2 Energy | **-2 Energy** | **CORRECT** |
| Admin Office | -2 Energy | **-2 Energy** | **CORRECT** |

### Starting State

| Parameter | Simulator Value | Expected 4.x Reality | Match? |
|-----------|----------------|----------------------|--------|
| Starting pops | 28 | ~2800 (4.x per-100 system) | **SCALE MISMATCH** |
| Starting minerals | 200 | Typically 200-400 | **REASONABLE** |
| Starting energy | 200 | Typically 200-400 | **REASONABLE** |
| Starting alloys | 100 | Typically 100-200 | **REASONABLE** |
| Starting CG | 100 | Typically 100 | **REASONABLE** |
| Starting food | 100 | Typically 100-200 | **REASONABLE** |
| Starting districts | 2 mining, 2 generator, 1 agriculture, 1 city | Varies by origin | **REASONABLE** |
| Planet size | 20 | 16-25 typical | **REASONABLE** |
| Base building slots | 4 | Varies, ~4-6 | **REASONABLE** |
| Pop growth rate | 0.8/month | Complex formula in 4.x | **OVERSIMPLIFIED** |

---

## Mod Weight File Inconsistencies

### Weight Files vs Research Findings (Numbers Nerd Recommendations)

| Resource Check | Current Mod Value | Numbers Nerd Rec | Discrepancy |
|---------------|-------------------|-----------------|-------------|
| Mining district trigger | minerals < 20 | minerals < 25 | Mod threshold too low by 5 |
| Generator district trigger | energy < 20 | energy < 10 | **Mod threshold too high by 10** (causes over-building) |
| Agriculture district trigger | food < 10 | food < 5 | **Mod threshold too high by 5** (causes over-farming) |
| Agriculture surplus penalty | food > 50, factor 0.25 | food > 30, factor 0.1 | **Mod too lenient** |
| Alloy foundry trigger | alloys < 15 | alloys < 10 | Mod threshold too high by 5 |
| Alloy foundry emergency | alloys < 5 | alloys < 3 | Mod threshold too high by 2 |
| CG building trigger | CG < 10 | CG < 5 | **Mod threshold too high by 5** |
| Research lab trigger | physics < 30 | physics < 20 | Mod threshold too high by 10 |
| Research lab surplus | physics > 100 | physics > 80 | Mod too lenient |

### Weight Files vs sovereign_triggers.txt (Internal Inconsistencies)

1. **`sovereign_needs_consumer_goods`** checks `CG < 5`, but `building_civilian_industries` triggers at `CG < 10`. These should be consistent. The trigger is correct; the building weight is too aggressive.

2. **`sovereign_has_stable_economy`** checks `minerals > 10` and `energy > 10`, but mining districts trigger at `minerals < 20` and generator districts at `energy < 20`. This means the AI considers its economy "stable" (minerals > 10) while simultaneously believing it needs more mining districts (minerals < 20). The stable economy trigger should use `minerals > 25` and `energy > 15` to be consistent with the district triggers.

3. **`sovereign_economy_is_critical`** checks `minerals < -10` but the mining district emergency only fires at `minerals < 0`. The trigger considers -5 minerals/month to be "fine" while -10 is "critical," but there's a gap: the -5 to 0 range gets no emergency response from either system.

4. The weight files reference `sovereign_is_militaristic` in the research findings recommendations but the actual building files use inline `has_ethic = ethic_militarist` checks instead of the trigger. This is technically fine but defeats the purpose of having reusable triggers.

---

## Recommended Fixes

### Priority 1: Simulator Accuracy (Affects All Analysis)

1. **Fix Technician production:** Change from 4 to 6 energy per worker in `JOB_PRODUCTION.technician`.
2. **Fix Farmer production:** Change from 4 to 6 food per worker in `JOB_PRODUCTION.farmer`.
3. **Add district energy upkeep:** Each resource district should subtract 1 energy, city districts 2 energy. Add this to `calculateIncome()`.
4. **Fix Research Lab jobs:** Model three separate research fields instead of a single "research" output. Research Labs provide 60 jobs per field (Biologist, Engineer, Physicist), not "2 researchers."

### Priority 2: Threshold Alignment (Mod Weight Files)

5. **Mining district trigger:** Change `minerals < 20` to `minerals < 25` in `00_districts.txt`.
6. **Generator district trigger:** Change `energy < 20` to `energy < 10` in `00_districts.txt`. This is the single most impactful fix -- it will prevent the AI from over-building generators.
7. **Agriculture district trigger:** Change `food < 10` to `food < 5` in `00_districts.txt`.
8. **Agriculture surplus penalty:** Change `food > 50, factor 0.25` to `food > 30, factor 0.1` in `00_districts.txt`.
9. **Alloy foundry trigger:** Change `alloys < 15` to `alloys < 10` in `01_pop_buildings.txt`.
10. **Alloy foundry emergency:** Change `alloys < 5` to `alloys < 3` in `01_pop_buildings.txt`.
11. **Civilian Industries trigger:** Change `CG < 10` to `CG < 5` in `01_pop_buildings.txt`.
12. **Research lab trigger:** Change `physics_research < 30` to `physics_research < 20` in `01_pop_buildings.txt`.
13. **Research lab surplus:** Change `physics_research > 100` to `physics_research > 80` in `01_pop_buildings.txt`.

### Priority 3: Trigger Consistency

14. **Update `sovereign_has_stable_economy`:** Change `minerals > 10` to `minerals > 25` and `energy > 10` to `energy > 15` to align with district triggers.
15. **Add upstream pressure modifier** to mining districts (from Numbers Nerd): `add = 75` when `alloys < 10 AND minerals < 50`. This prevents the "build foundry, crash mineral economy" problem.
16. **Add mineral income gate** to alloy foundry building: `factor = 0.1` when `minerals < 15`. Currently only in the Numbers Nerd recommendations, not in the actual mod building file.

### Priority 4: Missing Triggers

17. **Add `sovereign_is_early_game`:** `years_passed < 30`
18. **Add `sovereign_is_mid_game`:** `years_passed >= 30` AND `years_passed < 100`
19. **Add `sovereign_is_somewhat_threatened`:** `highest_threat > 25` (lower threshold for earlier military response)
20. **Add `sovereign_is_egalitarian`** and **`sovereign_is_authoritarian`** ethic triggers.
21. **Add `sovereign_has_cg_headroom`:** `consumer_goods income > 4` -- use this as a gate for research lab building.

### Priority 5: 4.x Pop System

22. **Audit all `num_pops` thresholds** in triggers and weight files against the 4.x per-100 workforce system. If `num_pops` still reports old-style counts, the thresholds may be fine. If it reports in 100s, all thresholds need to be multiplied by 100.
23. **Verify `free_housing` scale** -- the wiki shows housing in units of 100, but the scripting API may still use a different scale. Test in-game.

---

## Summary of Critical Findings

1. **Generator district threshold is the biggest problem.** At `energy < 20`, the AI over-builds generators, wasting district slots. Should be `< 10`.
2. **Simulator technician/farmer production is wrong** (+4 instead of +6), making all economy projections 33% pessimistic on basic resources.
3. **Simulator ignores district energy upkeep**, making energy balance look better than reality.
4. **Multiple weight file thresholds don't match the research findings** -- the mod was not updated to reflect the Numbers Nerd's recommendations.
5. **Internal inconsistency** between `sovereign_needs_consumer_goods` (CG < 5) and the civilian industries building weight (CG < 10).
6. **The 4.x per-100-pop scale change** may affect `num_pops`, `free_housing`, and `num_unemployed` checks throughout the mod. This needs in-game verification.
7. **Missing foundry mineral gate** in actual building file -- the Numbers Nerd recommended `factor = 0.1` when `minerals < 15` to prevent cascading deficits, but the current `building_foundry_1` doesn't have this check.
