---
name: Gate Threshold Derivation and Validation Status
description: G1-G6 gate thresholds with derivation sources and validation status
type: reference
---

Source: research/findings/gameflow_loops.md + wiki job data, verified 2026-04-12

## Gate Registry

| Gate | Threshold | Factor | Applies To | Derivation | Status |
|------|-----------|--------|------------|------------|--------|
| G1 | minerals < 15/mo | 0.1 | All mineral consumers (foundries, factories) | Metallurgist -6 min/100 WF; 15 = ~2.5 full foundry jobs worth | Confirmed valid; needs simulator validation for late-game relaxation |
| G2 | CG < 2/mo | 0.1 | All CG consumers (research labs, admin offices, temples) | Researcher -2 CG/100 WF; 2 = tightest possible buffer | Confirmed valid |
| G3 | minerals < 25/mo | 0.1 | Strategic resource refineries | Chemist -10 min/100 WF; 25 = stricter floor for 67% higher drain | Confirmed valid (G3 correctly uses -10 even though §11.7 incorrectly states -2) |
| G4 | strat_resource < 1/mo | 0.1 | T2/T3 buildings needing that resource | Prevents building without upkeep coverage | Valid; replaced by projected-demand gate in §11.5 |
| G5 | alloys < 5/mo | 0.1 | Expansion decisions (colony ships, starbases) | Colony ship = 200 alloys = 40 months at 5/mo income | Confirmed valid |
| G6 | energy < 5/mo | 0.25 | T2/T3 high-upkeep buildings | T2 buildings have -5 EC upkeep; softer factor because market recovery possible | Confirmed valid |

## Open Validation Needs

- G1 late-game relaxation (§4.5): threshold drops 15→5 as τ→1. Needs simulator check that this doesn't drop below 10 before megastructure economy is present. Consider adding sovereign_has_megastructure_economy check.
- G2 gestalt variant: hive mind researchers use -6 minerals not -2 CG. Machine researchers use -4 energy. Need gestalt-specific G2 analog.

**How to apply:** These thresholds are the authoritative floors for all ai_weight gate modifiers. Do not change without simulator validation. The §4.5 time-dependent relaxation is a model feature, not a verified game mechanic — it needs in-game testing.
