---
name: Harbinger §11.7 Refinery Mineral Upkeep Error
description: Critical factual error in harbinger-alg.md §11.7 — refinery mineral upkeep is -10/100 WF not -2/100 WF
type: project
---

Harbinger §11.7 states: "Refineries consume minerals (−2 per 100 workers, per the 4.3 data)."

**Actual value (wiki-confirmed):** All three refinery jobs (Chemist/Translucer/Gas Refiner) consume -10 Minerals per 100 workforce. This is 5× the stated value.

**Why:** The error propagates into refinery_draw(w, τ) in D_min:

    refinery_draw(w, τ) = 0.5 · Σ_s softplus(10, Ψ_s(w, τ) − orbital_s(τ))

The comment explains "0.5 coefficient represents ~2 minerals per 100 workers." With correct upkeep of 10, the coefficient should be approximately 2.5 (not 0.5), assuming the same partial-coverage discount.

**Corrected formula:**

    refinery_draw(w, τ) = 2.5 · Σ_s softplus(10, Ψ_s(w, τ) − orbital_s(τ))

**How to apply:** When reviewing any formula that references refinery mineral demand, substitute -10 per 100 WF. The D_min upper clamp should be 40+ for high w_a mid-game empires once corrected. The G3 threshold (25/mo) is correct and was derived from the real -10 figure in gameflow_loops.md, not the wrong -2 in §11.7.

**Needs simulator validation** before the corrected coefficient is applied to templates.
