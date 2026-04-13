---
name: Fisher Metric Audit Results (2026-04-12)
description: Complete eigenvalue table, condition number, and symmetry verification for the Harbinger algorithm post-corrections (sections 3.3, 3.6, 11)
type: project
---

## Fisher Metric Audit Snapshot

Corrected eigenvalue table (at template centroid, all Harbinger corrections applied):

| Axis | Eigenvalue (est.) | Original | Change |
|------|-------------------|----------|--------|
| d (diplomacy) | ~33,708 | 33,707 | negligible |
| w_r (research) | ~1,050 | 821 | +28% |
| w_u (unity) | ~740 | 471 | +57% |
| w_a (alloy) | ~527 | 376 | +40% |
| w_m (military) | ~191 | 59 | +224% |
| w_e (expansion) | ~85 | 85 | negligible |
| a (aggression) | ~46.5 | 47 | negligible |
| w_t (trade) | ~26 | 0 | was null |

**Condition number:** kappa ~ 2,809 (post all corrections). Operational bound: 10,000. Status: OK.

**Key finding:** D_min quadratic cross-term 0.3*w_a*(w_r+w_u) creates position-dependent connection (nonzero Christoffel symbols) but ZERO Riemann curvature. Polynomial couplings cannot produce intrinsic curvature via J^T J. Baptista's O(0.3) curvature claim is incorrect.

**Purifier corridor:** kappa spikes to ~10^7 within width 0.1 of (a=1.8, d=0.1). No current template in corridor.

**Baptista error:** G_{d,w_t} = 0.35, not 0.40. Threat modifier has no w_t dependence.

**Why:** This is the baseline metric state for all future manifold changes.
**How to apply:** Compare any proposed coupling change against these eigenvalues. If kappa exceeds 10,000 after the change, condemn it.
