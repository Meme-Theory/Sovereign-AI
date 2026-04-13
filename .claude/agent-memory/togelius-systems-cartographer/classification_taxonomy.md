---
name: Manifold Extension Classification Taxonomy
description: Standard categories for classifying new Stellaris mechanics against the Harbinger manifold, with examples from the first analysis
type: reference
---

# Classification Categories (established 2026-04-12)

| Category | Definition | Example |
|----------|-----------|---------|
| BASE_COORDINATE | New independent strategic dimension in [a, d] space | Aggression split (deferred) |
| FIBER_COORDINATE | New independent economic weight in [w_*] space | None proposed yet |
| COUPLING_TERM | Function of existing coordinates that enters dependent variables | Espionage investment, galactic community engagement, trade policy selection |
| TAU_GATE | Time-dependent activation/deactivation of mechanics | Astral rift exploration, strategic resource demand (Section 11) |
| BOOLEAN_FLAG | Civic/identity flag that modifies coupling coefficients | is_necrophage, is_psionic (psi), war_economy_mode |
| PHASE_OVERRIDE | Temporary coordinate shift triggered by game events | Crisis response, war economy pivot |
| CROSS_BLOCK_COUPLING | Economic state perturbing behavioral coordinates (or vice versa) | Rare resource deficit -> aggression, economic crisis -> desperation |
| GATE_BYPASS | Deliberate suspension of gate constraints | Kobayashi Maru deficit cascade weaponization |
| TEMPLATE_VOID | Region of existing manifold with no templates | V1-V4 (extreme colonizer, peaceful militarist, aggressive researcher, autarkic trader) |
| COUPLING_OVERRIDE | Modification of coupling coefficients by civic/difficulty | Catalytic Processing changing mineral:alloy ratio |

**Decision procedure:**
1. Does it change NO existing observables? -> Not a coupling, maybe new axis or dead variable
2. Does it change MANY observables? -> Likely BASE/FIBER coordinate
3. Only activates under conditions? -> TAU_GATE or BOOLEAN_FLAG
4. Depends on game time? -> TAU_GATE or PHASE_OVERRIDE
5. Bridges behavior/economy divide? -> CROSS_BLOCK_COUPLING
