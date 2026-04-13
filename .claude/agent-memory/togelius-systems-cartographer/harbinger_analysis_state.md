---
name: Harbinger Algorithm Analysis State
description: Key findings from first comprehensive Harbinger analysis — void regions, reward hacking surfaces, missing mechanics classifications, and cross-block coupling patterns
type: project
---

Completed full synthesis of Harbinger algorithm (design/harbinger-alg.md) on 2026-04-12.

**Key findings:**
- 8 axes are correct decomposition; aggression split deferred until template count > 30
- 4 void regions identified (not just the w_e void from spectral analysis): extreme colonizer, peaceful militarist, aggressive researcher, autarkic trader
- V(p) potential energy has exploitable spurious minima — Gaussian wells create plateau artifacts and boundary penalty is too weak
- Sigmoid flag composition creates reward-hacking surfaces (subjugator activates for pacifist empires via w_m OR branch)
- Kobayashi Maru exploits: 3 fit manifold, 2 need coupling extensions, 1 needs boolean flag, 1 needs production chain parameterization
- 6 missing mechanics classified: espionage (COUPLING_TERM), galactic community (COUPLING_TERM), federations (COUPLING_TERM), archaeology (GATE_MODIFIER), astral rifts (TAU_GATE), situations (IGNORE)
- Cross-block coupling from rare resources should be generalized to environmental pressure pattern
- MAP-Elites preferred over gradient descent for template discovery
- Crisis response mechanism needed in L-K dynamics (temporary potential shift, not permanent coordinate change)
- Player saves map cleanly to manifold (6/8 good fit, necrophage is problematic case)

**Why:** This is the foundational analysis. All future manifold extension proposals should reference these findings.

**How to apply:** Check new proposals against the void regions, reward hacking surfaces, and missing mechanic classifications before formalizing.
