---
name: Harbinger §11.1 T2 Foundry Motes Error
description: T2 Alloy Mega-Forges have no motes upkeep — Harbinger §11 incorrectly gates T2 foundry upgrades on motes supply
type: project
---

Harbinger §11.1 table lists "T2 Foundry equivalent" with volatile_motes upkeep of 1/mo, driven by w_a.

**Actual value (wiki-confirmed):** Alloy Mega-Forges (T2) have upkeep of -5 Energy Credits only. No volatile motes. Only T3 Alloy Nano-Plants require motes: -4 Volatile Motes building upkeep.

**Impact on Ψ_motes formula (§11.2):**

The upgrade_rate term (fires at τ ≈ 0.25 when T2 techs arrive) incorrectly includes 1.0·w_a:

    Ψ_motes(w, τ) = upgrade_rate(τ) · (1.0·w_a + 0.5·w_m + 0.5) + ...

The 1.0·w_a term should only appear at t3_rate (τ ≈ 0.50). The correct formula:

    Ψ_motes(w, τ) = upgrade_rate(τ) · (0.5·w_m + 0.5)         [Fortress + base mining at T2]
                   + t3_rate(τ)     · (4.0·w_a)               [Nano-Plants at -4/mo]
                   + t4_rate(τ)     · (2.0·w_a)               [district expanders]

Note: Fortress T2 DOES correctly require -1 Volatile Motes upkeep (wiki confirmed). The 0.5·w_m term at upgrade_rate is correct.

**How to apply:** Any AI decision to gate T2 foundry upgrades on motes supply is wrong before τ ≈ 0.50. The G4_motes gate activating at T2 timing would be a false positive.
