---
name: Harbinger Algorithm Audit — Key Findings
description: Structural gaps found in harbinger-alg.md during production loop cascade analysis (2026-04-12)
type: project
---

D_min cross-term (0.3·w_a·(w_r+w_u)) in §3.6 was calibrated WITHOUT refinery_draw active. When §11.7 adds refinery_draw, the cross-term double-counts refinery mineral pressure. Re-estimate γ_ff with LOO cross-validation excluding refinery_draw from the scope.

**Why:** Baptista §S4 flags the coefficient as phenomenological. The §11.7 formula explicitly breaks the scope assumption the cross-term was estimated under.

**How to apply:** When reviewing or calibrating D_min, check whether refinery_draw is already active in the formula. If yes, γ_ff should be ~0.15-0.20, not 0.31.

---

G3 concurrent-build cascade: when Δ_motes, Δ_gases, and Δ_crystals are all < 0 simultaneously, all three R_s priority scores activate together. Each individual G3 check (minerals < 25) can pass while the combined refinery mineral draw (3 × 10 min/100 WF) crashes the mineral economy. Add a sequential gating mechanism or raise G3_effective to 25 + 10 × n_refineries_building.

**Why:** G3 is a per-building static gate with no awareness of concurrent construction orders.

**How to apply:** Any refinery priority implementation must either serialize refinery construction or use an additive G3 threshold.

---

manifold.mjs TRIG.energy_deficit does NOT match harbinger-alg.md §3.6. Missing: w_a coefficient (1.5), w_t offset (−1.0). w_r coefficient is 2.5 in code vs 2.0 in spec. This reproduces the original 100% energy_deficit error for trade empires.

**Why:** The w_t null-mode fix documented in the spec was not applied to the simulator implementation.

**How to apply:** Before running simulator comparisons involving trade-weight empires, treat energy_deficit results as incorrect until manifold.mjs is patched.

---

Rare resource behavioral feedback (§11.9) δa_rare max is 0.3. Purifier entering threshold is a=1.84. Any aggressive non-purifier template with a > 1.55 and d < 0.1 can be pushed across the purifier boundary by simultaneous dark matter + zro deficits. Cap a_eff at 1.75 to prevent accidental phase transition.

**Why:** Purifier phase transition has a latent heat of ~915 alliance acceptance units — vastly larger than the 0.3 perturbation that triggered it. The feedback is disproportionate.

**How to apply:** When implementing §11.9 behavioral feedback, always clamp a_eff = min(a + δa_rare, 1.75).
