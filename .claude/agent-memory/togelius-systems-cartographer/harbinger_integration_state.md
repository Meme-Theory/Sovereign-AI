---
name: Harbinger Four-Agent Integration
description: Record of all findings integrated, deferred, or rejected from the four-agent synthesis into harbinger-alg.md on 2026-04-12
type: project
---

Completed integration of 4 agent reports (Numbers-nerd, Gameflow, Amari, Togelius) into design/harbinger-alg.md.

**Integrated (17 findings):**
- Numbers-nerd F3: Refinery mineral upkeep 5x fix (0.5 -> 2.5 coefficient)
- Numbers-nerd F4: T2 foundry motes removed, w_a moved to t3_rate in Psi_motes
- Numbers-nerd F10: Nanite Transmuter footnote added to 11.3
- Gameflow F2: G3_concurrent gate for simultaneous refinery construction
- Gameflow F3: G3 sharpening double-sigmoid bell for early->mid transition
- Gameflow F6: G7 stability/amenities gate
- Gameflow F8: a_eff cap at 1.75 to prevent accidental purifier transition
- Amari F1: Updated sensitivity hierarchy with corrected eigenvalues (kappa ~2,809)
- Amari F2: Riemann curvature corrected to exactly zero for polynomial couplings
- Amari F4: Tikhonov regularization added to natural gradient (section 7.1)
- Amari F7: Ledoit-Wolf shrinkage added to Mahalanobis (section 6.2)
- Amari F8: Baptista G_{d,w_t} corrected 0.40 -> 0.35
- Togelius F2: Trade policy coupling (CG/unity offsets via sigmoid mixtures)
- Togelius F3: V(p) anti-exploitation measures (3 exploit classes + fixes)
- Togelius F4: Four void regions (V1-V4) with proposed templates
- Togelius F10: MAP-Elites replaces gradient descent as primary template discovery
- Togelius F11: Crisis response mechanism (PHASE_OVERRIDE) in new section 4.7

**Deferred to Appendix C (11 items):**
- Gameflow F1: Cross-term gamma re-derivation (needs LOO cross-validation)
- Gameflow F4: D_all expansion-pace modifier (coefficient needs calibration)
- Gameflow F5: G4 split for rare vs standard strategics (needs save data)
- Gameflow F7: D_eng simulator divergence (code fix, not spec)
- Togelius F1: Aggression axis split (deferred until templates > 30)
- Togelius F5: Sigmoid flag conjunction floors (needs regression testing)
- Togelius F7 partial: Espionage/galcom coupling implementation
- Togelius F8: Necrophage civic coupling
- Togelius F9: Environmental pressure couplings generalization
- Numbers-nerd Q1: T2 metallurgist upkeep tau-dependent scaling
- Numbers-nerd Q2: Machine Intelligence deficit variants

**Confirmed (no change needed):**
- Numbers-nerd F1: Production chain ratios verified (2:1, 1:1, 3:2)
- Numbers-nerd F2: Research/CG ratio confirmed (notation clarification only)
- Numbers-nerd F5: Civilian Fabricators T2 crystal upkeep confirmed at 2/mo
- Numbers-nerd F6: Research Complex gas upkeep confirmed
- Numbers-nerd F7: Gate thresholds defensible
- Numbers-nerd F8: Alloy Nano-Plant stockpile concern (implicitly handled)
- Numbers-nerd F9: Shortage penalties correctly modeled
- Amari F3: Sigmoid sharpness approved (flags well-conditioned, purifier corridor documented)
- Amari F5: Softmax flow preserves metric structure
- Amari F6: Strategic resource layer preserves all symmetries to <1%

**New sections added:**
- Section 4.7: Crisis Response Mechanism
- Section 12: Unrepresented Mechanics Classification
- Appendix C: Deferred Items

**Why:** This is the first multi-agent synthesis integration. All future edits should check Appendix C for items awaiting resolution.

**How to apply:** When proposing new manifold extensions, check that they don't conflict with the integrated corrections. The eigenvalue table, curvature claim, and refinery coefficient are the most critical factual corrections.
