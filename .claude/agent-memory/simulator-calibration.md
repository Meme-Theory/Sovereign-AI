---
topic: Simulator constants and calibration status
confidence: high
source: Wiki job data + baseline save game cross-reference + v0-plan priority 6
date: 2026-04-12
supersedes: null
---

## Confirmed Constants (wiki + save verified)

| Constant | Value | Source |
|----------|-------|--------|
| Miner output | +6 minerals/worker/mo | Wiki Jobs page |
| Technician output | +6 energy/worker/mo | Wiki Jobs page |
| Farmer output | +6 food/worker/mo | Wiki Jobs page |
| Metallurgist | +3 alloys, -6 minerals | Wiki (2:1 conversion) |
| Artisan | +6 CG, -6 minerals | Wiki (1:1 conversion) |
| Researcher | +3 research/field, -2 CG | Wiki |
| Priest | +4 unity, -2 CG | Wiki |
| Bureaucrat | +3 unity, -2 CG | Wiki |
| Mining district cost | 300 minerals | Wiki |
| District build time | 480 days (~16 months) | Wiki + mod files |
| Building cost (T1) | 400 minerals | Wiki + mod files |
| Building build time (T1) | 360 days (~12 months) | Wiki + mod files |

## Pop Scale

4.x uses display pops in hundreds. Save shows 5200 = simulator 52. Housing values also in hundreds (mining district = +200 housing display = +2 sim). The scripting API scale for triggers like `num_pops` and `free_housing` needs in-game verification — may use display scale or internal scale.

## Known Approximations

- Empire base income is static in sim (should scale with empire size)
- Passive income (trade, orbital) is a flat average (should vary by system count)
- Pop growth rate is simplified (real formula has many modifiers)
- No market trading simulation
- No colony management (single-planet model)
