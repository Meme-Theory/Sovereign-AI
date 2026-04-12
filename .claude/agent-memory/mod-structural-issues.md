---
topic: Known structural issues in mod files requiring architectural fixes
confidence: high
source: Coverage audit + integration pipeline audit + trigger reality audit
date: 2026-04-12
supersedes: null
---

## Must Fix Before Expanding Coverage

1. **Full object redefinition** — mod redefines entire buildings/techs/ships/edicts including stats, not just ai_weight. Will conflict with vanilla and break on patches. Must refactor to ai_weight-only overrides.

2. **Pre-4.x district model** — 4.x changed districts with primary/secondary swap via planet specialization. Our district file uses old model.

3. **Missing Frigate ship class** — 4.x added Frigates between Corvette and Destroyer. Completely absent.

4. **Edict costs use Influence** — 4.x switched edicts to Unity upkeep. Our edicts will malfunction.

5. **Personality archetypes** — `00_personalities.txt` references archetypes (`technologist`, `propagator`) that may not exist in 4.x. Need verification against `data/ai_personalities.json`.

6. **Scripted triggers defined but unused** — `sovereign_triggers.txt` defines triggers, but most building/district files use raw `has_ethic` checks. Partially fixed in v0-plan priority 5 (SWE applied to 3 buildings).

## Partially Fixed (v0-plan priorities 1-6 applied)

- G1 mineral gate on foundries and CG factories — DONE
- G2 CG gate on research labs — DONE
- District thresholds aligned with research — DONE
- Personality factors on foundry + research lab — DONE (other buildings still need them)
- Simulator constants corrected — DONE
- Scripted trigger replacement — PARTIAL (3 of ~20 ethics checks replaced)
