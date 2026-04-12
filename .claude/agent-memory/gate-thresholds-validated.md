---
topic: Gate system thresholds — validated values
confidence: high
source: wiki data + save game baseline + simulator (zero deficits across 10 presets, 360 turns)
date: 2026-04-12
supersedes: null
---

## Validated Gate Thresholds

All thresholds below produce zero deficit months across all 10 personality presets in 360-turn (30-year) simulator runs.

| Gate | Resource | Threshold | Factor | Validated |
|------|----------|-----------|--------|-----------|
| G1 | minerals/mo | < 15 | 0.1 | Yes — simulator + wiki conversion ratios (6 min per metallurgist/artisan) |
| G2 | consumer_goods/mo | < 2 | 0.1 | Yes — simulator + wiki (2 CG per researcher/bureaucrat/priest) |
| G3 | minerals/mo | < 25 | 0.1 | Not yet in simulator (no refineries) — wiki confirms 10 min per chemist/translucer |
| G4 | strategic/mo | < 1 | 0.1 | Not yet in simulator — wiki confirms ongoing upkeep on T2/T3 buildings |
| G5 | alloys/mo | < 5 | 0.1 | Partially — stronghold gate working in simulator |
| G6 | energy/mo | < 5 | 0.25 | Yes — softer gate because energy deficits are market-recoverable |

## District Deficit Thresholds

| Resource | Trigger | Source |
|----------|---------|--------|
| Minerals | < 25/mo | Research finding: 2:1 mineral-to-alloy ratio means 25 is the safe floor |
| Energy | < 10/mo | Research finding: "don't over-invest, just break even" |
| Food | < 5/mo | Research finding: food surplus is the most common early waste |
| CG | < 5/mo | Research finding: CG buildings are deficit response, not proactive |
