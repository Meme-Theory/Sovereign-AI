# Sovereign AI — Research Index

Findings from the Numbers Nerd research agent. Each entry links to a detailed analysis comparing r/stellaris community strategies against official wiki game data, with `ai_weight` recommendations for the Sovereign AI mod.

## Findings

### 1. Early Game Economy & Building Priorities (Years 2200-2230)
**File:** [`findings/early_economy_building_priorities.md`](findings/early_economy_building_priorities.md)
**Date:** 2026-04-12
**Sources:** 8 reddit threads (posts 1s4mvo2, 168z4ev, 1r7kidi, 1o65izp, du875g, 1rqx8eu, mxgwfn, s8xw4h) + Stellaris Wiki (Buildings, Districts, Jobs, Resources)
**Summary:** Comprehensive analysis of what experienced players build first and why, mapped against actual game values. Establishes deficit thresholds for all early-game buildings/districts, personality-specific factor values, and a priority ranking table. Key findings: minerals are the true bottleneck (2:1 conversion to alloys), growth buildings are traps (community + numbers agree), vanilla AI fails at planet specialization and resource chain awareness. Includes complete `ai_weight` templates for Mining/Generator/Agriculture/City districts, Alloy Foundries, Research Labs, Civilian Industries, Unity buildings, Gene Clinics, Strongholds, and Capital upgrades.

### 2. Mod Coverage Audit
**File:** [`findings/mod_coverage_audit.md`](findings/mod_coverage_audit.md)
**Date:** 2026-04-12
**Sources:** All mod files cross-referenced against wiki game data (buildings, districts, techs, traditions, policies, edicts, ship_sizes, ai_personalities)
**Summary:** Comprehensive gap analysis. Mod covers ~3-10% of game content across most categories. Critical structural issues: full object redefinition instead of ai_weight-only overrides, pre-4.x district model, missing Frigate ship class, Unity-based edicts still using Influence costs. 9 custom personalities vs 49 vanilla. Zero coverage of ascension perks, decisions, megastructures, and DLC content.

### 3. Trigger vs Reality Audit
**File:** [`findings/trigger_reality_audit.md`](findings/trigger_reality_audit.md)
**Date:** 2026-04-12
**Sources:** Scripted triggers + weight files compared against save game data (sorannindex12, year 2229)
**Summary:** Nine threshold mismatches between mod files and research recommendations. Generator threshold 2x too eager (20 vs research's 10). Mineral-income gate for alloy foundries is MISSING — "the single most important fix over vanilla AI." Simulator uses wrong job production values (4 instead of 6 per worker) and wrong district build times (8 months instead of 16). 4.x per-100-pop scaling may affect all housing/pop triggers.

### 4. Integration Pipeline Audit
**File:** [`findings/integration_pipeline_audit.md`](findings/integration_pipeline_audit.md)
**Date:** 2026-04-12
**Sources:** Cross-comparison of research templates vs mod files vs simulator constants
**Summary:** Evidence chain breaks at research → mod files. The mineral-income gate, CG upkeep penalty, personality factors, and permanent gene clinic penalty all exist in research templates and simulator but NOT in mod files. Scripted triggers defined but never used. 10 prioritized fix recommendations. Key structural issue: simulator duplicates all constants from mod files and has already diverged (build times, weight thresholds, production values).
