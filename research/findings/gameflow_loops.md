# Stellaris 4.x Production Loop Schema

*Generated: 2026-04-12*
*Sources: Stellaris Wiki 4.3 (Jobs, Buildings, Districts, Resources, Megastructures pages), mod files, prior research findings*

---

## Loop Map

All resource values are per 100 workforce unless noted otherwise.

```
                    ENERGY (substrate)
                    Upkeep for everything
                    Technician: +6 EC / no upkeep
                        |
                        v
  FOOD ---------> POP GROWTH ---------> MORE WORKERS
  Farmer: +6 / no upkeep                    |
                                             |
                                    +--------+--------+
                                    |                 |
                                    v                 v
                              MINERALS           TRADE VALUE
                    Miner: +6 / no upkeep    Trader: +8 TV / -1 CG
                              |                      |
              +-------+-------+-------+              v
              |       |       |       |          EC / CG / Unity
              v       v       v       v          (via Trade Policy)
          ALLOYS    CG    STRAT.RES  BUILDINGS
            |       |       |
            v       v       v
         Ships   RESEARCH  Advanced
         Starbases  |      Buildings
         Megas      v      & Ships
                  TECH
                    |
                    v
                UNLOCKS
                    |
                    v
              UNITY --> TRADITIONS --> ASCENSION PERKS
        Bureaucrat: +3 / -2 CG
        Priest: +3 / -2 CG
```

### Conversion Chains (Standard Organic Empire)

```
TIER 0: Raw Extraction (no upkeep)
  Mining District  --> Miner     --> +6 Minerals
  Generator Dist.  --> Technician --> +6 Energy
  Agriculture Dist --> Farmer    --> +6 Food

TIER 1: Primary Conversion (mineral consumers)
  Alloy Foundry    --> Metallurgist --> +3 Alloys,   -6 Minerals
  Civilian Indust. --> Artisan      --> +6 CG,       -6 Minerals
  Chemical Plant   --> Chemist      --> +2 Vol.Motes, -10 Minerals
  Synth.Crystal Pl --> Translucer   --> +2 R.Crystals,-10 Minerals
  Exotic Gas Ref.  --> Gas Refiner  --> +2 Exotic Gas,-10 Minerals

TIER 2: Secondary Conversion (CG consumers)
  Research Lab     --> Researcher   --> +3 Research/field, -2 CG
  Admin. Office    --> Bureaucrat   --> +3 Unity,    -2 CG
  Temple           --> Priest       --> +3 Unity,    -2 CG (+amenities)
  Commercial Zone  --> Trader       --> +8 Trade,    -1 CG

TIER 3: Terminal Outputs
  Research --> Technology unlocks
  Unity   --> Traditions, Edicts, Leader recruitment
  Alloys  --> Ships, Starbases, Megastructures, Habitats
  Strategic Resources --> Advanced building/ship upgrades
```

---

## Per-Loop Analysis

### Loop 1: Minerals (Foundation Resource)

| Property | Value |
|----------|-------|
| **Job** | Miner |
| **Output** | +6 Minerals per 100 workforce (no upkeep) |
| **Source** | Mining District (300 min, 240 days, +200 Miners, -1 EC upkeep) |
| **Alt. Source** | Surface Quarry Depot building (+200 Miners, 400 min, -2 EC) |
| **Upstream Gate** | None -- minerals are a root resource |
| **Downstream Pressure** | Everything: alloys, CG, buildings, strategic resources |
| **Market** | Base price 1 EC, max stable buy rate 42/month |

**Gate Condition:** Minerals are the root resource with no upstream dependency. The gate here is *downstream* -- check if mineral income can sustain current specialist jobs before allowing more to be added.

**Recommended ai_weight:**
- Primary trigger: `minerals < 25` (add 100) -- accounts for 6 min/metallurgist drain
- Emergency: `minerals < 0` (add 200)
- Upstream alloy pressure: `alloys < 10 AND minerals < 50` (add 75) -- need minerals to make alloys
- Surplus penalty: `minerals > 100` (factor 0.25)
- **Current mod:** `minerals < 20` -- **5 too low per research findings**

---

### Loop 2: Energy (Upkeep Substrate)

| Property | Value |
|----------|-------|
| **Job** | Technician |
| **Output** | +6 Energy per 100 workforce (no upkeep) |
| **Source** | Generator District (300 min, 240 days, +200 Technicians, -1 EC upkeep) |
| **Alt. Source** | Voltaic Production Yard building (+200 Technicians, 400 min, -2 EC) |
| **Upstream Gate** | None -- energy is a root resource |
| **Downstream Pressure** | Universal upkeep: districts (-1 to -2 EC each), buildings (-1 to -8 EC each), ships, starbases |

**Gate Condition:** Energy just needs to stay positive. Over-investment wastes district slots.

**Energy Upkeep Budget (typical early game, 2210):**
- 6 districts: ~7 EC upkeep
- 4 buildings: ~8 EC upkeep
- 5 corvettes: ~5 EC upkeep
- Total: ~20 EC, so 4 generator districts (producing ~24 EC gross, ~20 net) is sufficient

**Recommended ai_weight:**
- Primary trigger: `energy < 10` (add 100) -- just needs buffer above zero
- Emergency: `energy < 0` (add 200)
- Surplus penalty: `energy > 50` (factor 0.25) -- tighter than minerals
- **Current mod:** `energy < 20` -- **10 too high, causes over-building (biggest single threshold error)**

---

### Loop 3: Food --> Pop Growth

| Property | Value |
|----------|-------|
| **Job** | Farmer |
| **Output** | +6 Food per 100 workforce (no upkeep) |
| **Source** | Agriculture District (300 min, 240 days, +200 Farmers, -1 EC upkeep) |
| **Alt. Source** | Hydroponics Farms building (+200 Farmers, 400 min, -2 EC) |
| **Upstream Gate** | None -- food is a root resource |
| **Downstream Pressure** | Pop growth only; excess food is wasted |

**Gate Condition:** Food only feeds pop growth. Unlike minerals, food surplus has almost no value -- pops grow at a rate determined by complex formulas, not linearly with food surplus.

**Recommended ai_weight:**
- Primary trigger: `food < 5` (add 100) -- just needs to stay positive
- Emergency: `food < 0` (add 200)
- Surplus penalty: `food > 30` (factor 0.1) -- aggressively prevent waste
- Machine empire hard block: factor 0
- **Current mod:** `food < 10`, surplus `> 50 @ 0.25` -- **both too lenient**

---

### Loop 4: Minerals --> Alloys (THE Critical Gate)

| Property | Value |
|----------|-------|
| **Job** | Metallurgist |
| **Output** | +3 Alloys per 100 workforce |
| **Upkeep** | -6 Minerals per 100 workforce |
| **Conversion Ratio** | 2:1 (6 minerals in, 3 alloys out) |
| **Source** | Alloy Foundry T1 (400 min, 360 days, +200 Metallurgists, -2 EC) |
| **T2** | Alloy Mega-Forge (600 min, 480 days, +400 Metallurgists, -5 EC) -- adds +1 alloy, -2 min per metallurgist |
| **T3** | Alloy Nano-Plant (600 min + 200 motes, +600 Metallurgists, -8 EC, -4 motes) -- adds +2 alloy, -4 min per metallurgist |
| **Machine Intelligence** | +4 Alloys, -8 Minerals (same 2:1 ratio) |
| **Catalytic Processing** | +3.75 Alloys, -9 Food (uses food instead of minerals) |

**Why This Is the Critical Gate:**
A single Alloy Foundry creates 200 metallurgist jobs. As those fill, each 100 workforce consumes 6 minerals. A fully staffed foundry on a planet with 200 workforce assigned consumes 12 minerals/month. With early game mineral income of ~25-30/month, one foundry consumes nearly half of all mineral production. Building a second foundry without expanding mining first will crash the mineral economy.

**The Cascade Failure:**
1. AI detects low alloy income (alloys < 10)
2. AI builds Alloy Foundry (weight triggered)
3. Metallurgist jobs fill, consuming 6+ minerals per 100 workforce
4. Mineral income drops below zero
5. AI detects low mineral income -- but foundry is already built
6. Mineral stockpile drains, construction stalls
7. Meanwhile, AI may build ANOTHER alloy building because alloys are still low
8. Death spiral

**Upstream Gate (MINERAL INCOME CHECK):**
```pdx
# GATE: mineral income must support existing + new metallurgists
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = minerals value < 15 }
    }
}
```

**Downstream Pressure (what triggers foundry building):**
```pdx
modifier = {
    add = 100
    owner = {
        has_monthly_income = { resource = alloys value < 10 }
    }
}
modifier = {
    add = 200
    owner = {
        has_monthly_income = { resource = alloys value < 3 }
    }
}
```

**Current mod status:**
- Alloy trigger: `alloys < 15` -- should be `< 10` (too eager at 15)
- Alloy emergency: `alloys < 5` -- should be `< 3`
- Mineral gate: `minerals < 15` factor 0.1 -- **EXISTS, this is correct**
- Alloy surplus: `alloys > 50` factor 0.25 -- reasonable

---

### Loop 5: Minerals --> Consumer Goods

| Property | Value |
|----------|-------|
| **Job** | Artisan |
| **Output** | +6 Consumer Goods per 100 workforce |
| **Upkeep** | -6 Minerals per 100 workforce |
| **Conversion Ratio** | 1:1 (6 minerals in, 6 CG out) |
| **Source** | Civilian Industries T1 (400 min, 360 days, +200 Artisans, -2 EC) |
| **T2** | Civilian Fabricators (600 min + 100 crystals, +400 Artisans, -5 EC, -2 crystals) |
| **T3** | Civilian Repli-Complexes (800 min + 200 crystals, +600 Artisans, -8 EC, -4 crystals) |
| **Gestalt** | Artisan Drone: +8 CG, -8 Minerals (same 1:1 ratio) |

**Upstream Gate (MINERAL INCOME CHECK):**
Same logic as alloy foundry -- artisans consume 6 minerals per 100 workforce.

```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = minerals value < 15 }
    }
}
```

**Current mod status:**
- CG trigger: `CG < 10` -- should be `< 5` (too eager)
- Mineral gate: exists (factor 0.1 at minerals < 15) -- **correct**
- Gestalt hard block: exists -- **correct**

---

### Loop 6: Consumer Goods --> Research

| Property | Value |
|----------|-------|
| **Job** | Researcher (Biologist/Physicist/Engineer) |
| **Output** | +3 per research field per 100 workforce |
| **Upkeep** | -2 Consumer Goods per 100 workforce (individualist); -6 Minerals (hive mind); -4 Energy (machine) |
| **Source** | Research Lab T1 (400 min, 360 days, +60 Bio/Eng/Phys each, -2 EC) |
| **T2** | Research Complex (600 min + 50 gas, +120 each, -5 EC, -1 gas) |
| **T3** | Advanced Research Complex (800 min + 100 gas, +180 each, -8 EC, -2 gas) |

**Upstream Gate (CG INCOME CHECK):**
Research Labs add 180 total researcher jobs (60 per field). As those fill, the CG drain is significant. Each 100 workforce assigned to research consumes 2 CG. If CG income is below 2, building a lab will crash the CG economy, which then cascades to mineral demand (need to build CG buildings which consume minerals).

```pdx
# GATE: CG income must support researcher jobs
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = consumer_goods value < 2 }
    }
}
```

**Current mod status:**
- Research trigger: `physics_research < 30` -- should be `< 20`
- Research surplus: `physics > 100` -- should be `> 80`
- **CG gate: MISSING** -- this is Priority 3 in v0-plan
- Only checks one field (physics) -- should check all three

---

### Loop 7: Consumer Goods --> Unity

| Property | Value |
|----------|-------|
| **Job (Admin)** | Bureaucrat: +3 Unity, -2 CG |
| **Job (Spirit)** | Priest: +3 Unity, -2 CG (+200 Amenities) |
| **Source (Admin)** | Administrative Offices (400 min, 360 days, +200 Bureaucrats, -2 EC) |
| **Source (Spirit)** | Temple (400 min, 360 days, +200 Priests, -2 EC) |
| **Gestalt** | Synapse Drone (hive) / Coordinator (machine) -- no CG upkeep, mineral/energy upkeep instead |

**Upstream Gate (CG INCOME CHECK):**
Same as research -- bureaucrats and priests consume 2 CG per 100 workforce.

```pdx
modifier = {
    factor = 0.1
    owner = {
        is_regular_empire = yes
        has_monthly_income = { resource = consumer_goods value < 3 }
    }
}
```

**Current mod status:**
- Unity buildings: not in current mod files (0% coverage per audit)
- **CG gate for unity buildings: MISSING**

---

### Loop 8: Minerals --> Strategic Resources

| Sub-loop | Job | Output | Mineral Upkeep | Building | Building Cost |
|----------|-----|--------|----------------|----------|---------------|
| Volatile Motes | Chemist | +2 Motes | -10 Minerals | Chemical Plant | 400 min + tech |
| Rare Crystals | Translucer | +2 Crystals | -10 Minerals | Synthetic Crystal Plant | 400 min + tech |
| Exotic Gases | Gas Refiner | +2 Gases | -10 Minerals | Exotic Gas Refinery | 400 min + tech |

**Critical observation:** Strategic resource refinery jobs consume 10 minerals per 100 workforce -- 67% more than metallurgists (6 min) or artisans (6 min). A single refinery building can drain 10+ minerals/month from a mid-game economy. These need even stricter mineral gates than foundries.

**Upstream Gate (MINERAL INCOME CHECK):**
```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = minerals value < 25 }
    }
}
```

**Downstream Pressure:** Strategic resources are needed for:
- T2/T3 building upgrades (construction cost + ongoing upkeep)
- Advanced ship components
- Edicts

**Current mod status:** Strategic resource buildings: **not in current mod files (0% coverage)**

---

### Loop 9: Alloys --> Military & Expansion

| Expenditure | Alloy Cost | Notes |
|------------|-----------|-------|
| Corvette | ~60 alloys | Base combat unit |
| Frigate | ~90 alloys | 4.x new class |
| Destroyer | ~120 alloys | Screen ship |
| Cruiser | ~480 alloys | Line ship |
| Battleship | ~960 alloys | Capital ship |
| Starbase (Outpost) | 100 alloys | System claim |
| Colony Ship | 200 alloys | Expansion |
| Habitat | 1500 alloys | Artificial planet |
| Megastructure site | 5000-10000 alloys | Late-game |

**This is a terminal consumption loop** -- alloys are consumed, not converted. The only feedback is that ships generate diplomatic weight and military victory.

**Gate Condition:** Alloy expenditure depends on game phase and threat level. No upstream gate needed (alloys are the product), but downstream (fleet management) AI needs to balance alloy production with actual military need.

---

### Loop 10: Trade Value --> Energy/CG/Unity

| Trade Policy | Conversion per 1 TV |
|-------------|-------------------|
| Wealth Creation | 1.0 EC |
| Consumer Benefits | 0.5 EC + 0.25 CG |
| Marketplace of Ideas | 0.5 EC + 0.25 Unity |

**Source:** Trader jobs (+8 TV, -1 CG, from Commercial Zones), Clerks (+2 TV from city districts)

**Gate Condition:** Traders consume 1 CG per 100 workforce -- lightest CG consumer.

**Current mod status:** Trade buildings: **not in current mod files (0% coverage)**

---

## Gate Registry

### Complete Gate Conditions for the Mod

Every gate below should be implemented as a `factor` modifier in the relevant building/district `ai_weight` block.

#### Gate G1: Mineral Income Gate (for all mineral-consuming buildings)

**Trigger:**
```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = minerals value < 15 }
    }
}
```

**Applies to:**
| Building/District | Current Status | Mineral Drain per 100 WF |
|-------------------|---------------|-------------------------|
| Alloy Foundry T1 | **HAS gate** (factor 0.1, min < 15) | -6 |
| Alloy Mega-Forge T2 | not in mod | -8 |
| Alloy Nano-Plant T3 | not in mod | -10 |
| Civilian Industries T1 | **HAS gate** (factor 0.1, min < 15) | -6 |
| Civilian Fabricators T2 | not in mod | -7 |
| Civilian Repli-Complexes T3 | not in mod | -8 |
| Industrial District | **MISSING gate** | -6 (mixed) |
| Chemical Plant | not in mod | -10 |
| Synthetic Crystal Plant | not in mod | -10 |
| Exotic Gas Refinery | not in mod | -10 |

**Justification:** With early game mineral income of 25-30/month, each foundry/factory/refinery can consume 6-10 minerals/month once fully staffed. Threshold of 15 means "don't build a new converter if minerals are already strained." The value 15 is correct because a single mining district produces ~6 minerals/month net of upkeep, so minerals < 15 means even adding one mining district may not cover the new drain.

#### Gate G2: Consumer Goods Income Gate (for all CG-consuming buildings)

**Trigger:**
```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = consumer_goods value < 2 }
    }
}
```

**Applies to:**
| Building | Current Status | CG Drain per 100 WF |
|----------|---------------|---------------------|
| Research Lab T1 | **MISSING gate** | -2 |
| Research Complex T2 | not in mod | -2 |
| Advanced Research Complex T3 | not in mod | -2 |
| Administrative Offices | not in mod | -2 |
| Temple | not in mod | -2 |
| Commercial Zones | not in mod | -1 |

**Justification:** CG income of 2 means a single new researcher assignment will consume the entire CG surplus. Building a research lab with 180 researcher jobs when CG is below 2 will crash the CG economy. Threshold of 2 is the tightest possible -- it means "you can barely afford one researcher slot, don't add 180 more."

#### Gate G3: Stricter Mineral Gate for Strategic Resource Buildings

**Trigger:**
```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = minerals value < 25 }
    }
}
```

**Applies to:**
| Building | Current Status | Mineral Drain per 100 WF |
|----------|---------------|-------------------------|
| Chemical Plant | not in mod | -10 |
| Synthetic Crystal Plant | not in mod | -10 |
| Exotic Gas Refinery | not in mod | -10 |

**Justification:** Refinery jobs consume 10 minerals per 100 WF -- 67% more than metallurgists. The gate threshold needs to be 25 (vs 15 for foundries) because these buildings add proportionally heavier mineral drain. An empire with minerals at 20 can probably sustain a foundry (-6) but not a refinery (-10).

#### Gate G4: Strategic Resource Gate for Advanced Buildings

**Trigger (example for Exotic Gases):**
```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = exotic_gases value < 1 }
    }
}
```

**Applies to:**
| Building | Strategic Resource Upkeep |
|----------|-------------------------|
| Research Complex T2 | -1 Exotic Gas |
| Advanced Research Complex T3 | -2 Exotic Gas |
| Alloy Nano-Plant T3 | -4 Volatile Motes |
| Civilian Fabricators T2 | -2 Rare Crystals |
| Civilian Repli-Complexes T3 | -4 Rare Crystals |
| Fortress T2 | -1 Volatile Motes |
| Energy Nexus | -1 Exotic Gas |
| Mineral Purification Hub | -1 Volatile Motes |
| Food Processing Center | -1 Volatile Motes |

**Justification:** Advanced buildings require strategic resource upkeep. Building them without strategic resource income will cause a deficit that shuts down the building entirely (shortage effects reduce output by 25-100%). The AI must check it has strategic resource income before upgrading.

#### Gate G5: Alloy Income Gate (for expansion decisions)

**Trigger:**
```pdx
modifier = {
    factor = 0.1
    owner = {
        has_monthly_income = { resource = alloys value < 5 }
    }
}
```

**Applies to:**
| Decision | Alloy Cost |
|----------|-----------|
| Colony Ship | 200 alloys |
| Starbase (Outpost) | 100 alloys |
| Habitat | 1500 alloys |

**Justification:** With alloy income below 5, building a starbase takes 20 months of savings. Colony ships at 200 alloys take 40 months. The AI should not be expanding when it can't afford the alloy drain.

#### Gate G6: Energy Surplus Gate (for high-upkeep buildings)

**Trigger:**
```pdx
modifier = {
    factor = 0.25
    owner = {
        has_monthly_income = { resource = energy value < 5 }
    }
}
```

**Applies to:**
| Building | Energy Upkeep |
|----------|--------------|
| Research Complex T2 | -5 EC |
| Advanced Research Complex T3 | -8 EC |
| Alloy Mega-Forge T2 | -5 EC |
| Alloy Nano-Plant T3 | -8 EC |
| Civilian Fabricators T2 | -5 EC |
| Civilian Repli-Complexes T3 | -8 EC |

**Justification:** T2/T3 buildings have 5-8 EC upkeep each. With energy income below 5, building these will push energy negative, triggering the energy shortage penalty (-25% to -100% researcher output). This is a softer gate (0.25 not 0.1) because energy deficits are less catastrophic than mineral/CG ones -- the AI can sell resources on the market to cover energy.

---

## Missing Gates in Current Mod

### Critical (will cause cascade failures)

| Gate | Building/District | Severity | Fix |
|------|-------------------|----------|-----|
| **G2 (CG gate) on Research Labs** | `building_research_lab_1` | **HIGH** -- labs crash CG economy | Add `factor = 0.1` when `consumer_goods < 2` |
| **G2 (CG gate) on Unity buildings** | Admin Offices, Temple | **MEDIUM** -- unity buildings drain CG | Add `factor = 0.1` when `consumer_goods < 3` |
| **G1 (mineral gate) on Industrial District** | `district_industrial` | **MEDIUM** -- industrial districts create metallurgist + artisan jobs that drain minerals | Add `factor = 0.1` when `minerals < 15` |

### Important (will cause suboptimal play)

| Gate | Building/District | Severity | Fix |
|------|-------------------|----------|-----|
| **G3 (strict mineral gate) on all refinery buildings** | Chemical Plant, Crystal Plant, Gas Refinery | **MEDIUM** -- 10 min/100 WF drain | Add `factor = 0.1` when `minerals < 25` |
| **G4 (strategic resource gate) on all T2/T3 buildings** | All advanced buildings | **MEDIUM** -- building T2 without strategic income wastes slot | Add `factor = 0.1` when relevant strategic < 1 |
| **G6 (energy gate) on T2/T3 buildings** | All advanced buildings | **LOW** -- energy deficits are recoverable | Add `factor = 0.25` when `energy < 5` |

### Threshold Corrections Needed

| Building/District | Current Threshold | Correct Threshold | Impact |
|-------------------|-------------------|-------------------|--------|
| Generator District | `energy < 20` | `energy < 10` | **Biggest fix** -- stops energy over-building |
| Agriculture District | `food < 10` | `food < 5` | Stops food over-building |
| Agriculture surplus | `food > 50, f=0.25` | `food > 30, f=0.1` | Tighter food waste prevention |
| Alloy Foundry trigger | `alloys < 15` | `alloys < 10` | Less eager alloy building |
| Alloy Foundry emergency | `alloys < 5` | `alloys < 3` | True emergency only |
| Civilian Industries | `CG < 10` | `CG < 5` | Less eager CG building |
| Research Lab trigger | `physics < 30` | `physics < 20` | Matches 4.x scaling |
| Research Lab surplus | `physics > 100` | `physics > 80` | Tighter surplus brake |
| Mining District | `minerals < 20` | `minerals < 25` | Higher threshold for mineral hunger |

---

## Late-Game Loop Changes

### Phase Transitions

The production loop structure changes significantly across game phases:

#### Early Game (2200-2230): District-Driven Economy
- All production comes from districts and T1 buildings
- Minerals are the binding constraint
- No strategic resources available
- Key ratios: 2 mining districts per foundry, 2 per CG factory
- Build order: Mining > Generator (breakeven) > Alloy Foundry > Farm (breakeven) > CG > Research > Unity

#### Mid Game (2230-2300): Building-Driven Specialization
- T2 buildings unlock via tech, requiring strategic resources
- Planet specialization becomes critical (Mixed/Heavy/Civilian Industry)
- Strategic resource refineries come online
- New constraint: strategic resource income gates T2 upgrades
- Trade becomes significant (commercial pacts, trade routes)
- Key change: city district specialization system replaces raw industrial districts
- Habitats add alloy-cost production capacity

#### Late Game (2300+): Megastructure Economy

**Dyson Sphere** (replaces generator districts):
- Completed: +4000 Energy/month (no workers needed)
- Cost: 50,000 alloys + 25,000 unity over 5 stages
- Effect: Energy ceases to be a constraint; can sell surplus for minerals/CG

**Matter Decompressor** (replaces mining districts):
- Produces massive mineral income (no workers needed)
- Cost: 50,000+ alloys + unity
- Effect: Mineral bottleneck disappears; alloy/CG production unconstrained

**Science Nexus** (supplements research labs):
- Produces +300 research per field (no workers needed)
- Cost: 15,000+ alloys + unity
- Effect: Research output decoupled from CG consumption

**Ring Worlds / Ecumenopolises** (replace normal planets):
- Specialized districts with higher job counts
- Ring World research segments: +30 Physicist/Biologist/Engineer per 100 WF
- Ecumenopolis foundry arcologies: massive alloy output
- New constraint: these cost enormous alloys to build

#### Late-Game Gate Changes

| Early-Game Gate | Late-Game Status | Why It Changes |
|-----------------|-----------------|----------------|
| Mineral gate on foundries | Relaxed (minerals abundant from Matter Decompressor) | Matter Decompressor removes mineral bottleneck |
| Energy gate on T2/T3 | Removed (energy from Dyson Sphere) | Dyson Sphere provides unlimited energy |
| CG gate on research | Relaxed (CG from megastructure planets) | Ecumenopolis factory arcologies mass-produce CG |
| Strategic resource gates | Relaxed (Nanite Transmuter, deposits) | Multiple strategic resource sources available |

**Recommendation:** Add game-phase awareness to gates:
```pdx
# Relax mineral gate in late game when Matter Decompressor exists
modifier = {
    factor = 1.0  # override the 0.1 gate
    owner = {
        has_megastructure = matter_decompressor_4
    }
}
```

### Repeatable Tech Impact

Late-game repeatables (+5% alloy output, +5% research speed, etc.) compound multiplicatively. At 10 repeatable levels:
- Metallurgists produce ~4.5 alloys (vs base 3) -- effectively changes the 2:1 mineral:alloy ratio toward 1.3:1
- Researchers produce ~4.5 research/field (vs base 3)
- This shifts the optimal mineral:specialist ratio, potentially relaxing mineral gates further

---

## Sovereign Trigger Proposals

Based on this analysis, the following scripted triggers should be added to `sovereign_triggers.txt`:

```pdx
# Can the mineral economy support adding a foundry?
sovereign_can_afford_foundry = {
    owner = {
        has_monthly_income = { resource = minerals value >= 15 }
    }
}

# Can the mineral economy support adding a strategic resource refinery?
sovereign_can_afford_refinery = {
    owner = {
        has_monthly_income = { resource = minerals value >= 25 }
    }
}

# Can the CG economy support adding research/unity jobs?
sovereign_can_afford_specialists = {
    owner = {
        OR = {
            # Regular empires need CG headroom
            AND = {
                is_regular_empire = yes
                has_monthly_income = { resource = consumer_goods value >= 3 }
            }
            # Hive minds need mineral headroom
            AND = {
                is_hive_empire = yes
                has_monthly_income = { resource = minerals value >= 20 }
            }
            # Machine empires need energy headroom
            AND = {
                is_machine_empire = yes
                has_monthly_income = { resource = energy value >= 15 }
            }
        }
    }
}

# Is this empire in the late game with megastructure economy?
sovereign_has_megastructure_economy = {
    owner = {
        OR = {
            has_megastructure = matter_decompressor_4
            has_megastructure = dyson_sphere_5
            any_owned_planet = { is_planet_class = pc_ringworld_habitable }
        }
    }
}
```

---

## Appendix: Wiki-Confirmed Job Output/Upkeep Table

All values per 100 workforce. Source: Stellaris Wiki 4.3 Jobs page.

| Job | Output | Upkeep | Source Building | Empire Type |
|-----|--------|--------|-----------------|-------------|
| Miner | +6 Minerals | none | Mining District | Any |
| Technician | +6 Energy | none | Generator District | Any |
| Farmer | +6 Food | none | Agriculture District | Any |
| Metallurgist | +3 Alloys | -6 Minerals | Alloy Foundry | Any |
| Metallurgist (MI) | +4 Alloys | -8 Minerals | Alloy Foundry | Machine |
| Catalytic Tech | +3.75 Alloys | -9 Food | Alloy Foundry | Catalytic |
| Artisan | +6 CG | -6 Minerals | Civilian Industries | Individualist |
| Artisan Drone | +8 CG | -8 Minerals | Civilian Industries | Gestalt |
| Artificer | +8 CG, +2 TV | -6 Minerals | Civilian Industries | Masterful Crafters |
| Researcher (Bio) | +3 Society | -2 CG | Research Lab | Individualist |
| Researcher (Phys) | +3 Physics | -2 CG | Research Lab | Individualist |
| Researcher (Eng) | +3 Engineering | -2 CG | Research Lab | Individualist |
| Brain Drone | +3/field | -6 Minerals | Research Lab | Hive Mind |
| Calculator | +3/field | -4 Energy | Research Lab | Machine |
| Bureaucrat | +3 Unity | -2 CG | Admin Offices | Individualist |
| Manager | +3 Unity, +2 TV | -2 CG | Admin Offices | Corporate |
| Priest | +3 Unity, +200 Amenities | -2 CG | Temple | Individualist |
| Synapse Drone | +3 Unity | none (mineral-based) | Synaptic Nodes | Hive Mind |
| Coordinator | +3 Unity | none (energy-based) | Uplink Node | Machine |
| Trader | +8 TV, +2 Amenities | -1 CG | Commercial Zones | Individualist |
| Chemist | +2 Volatile Motes | -10 Minerals | Chemical Plant | Any |
| Translucer | +2 Rare Crystals | -10 Minerals | Crystal Plant | Any |
| Gas Refiner | +2 Exotic Gases | -10 Minerals | Gas Refinery | Any |
| Enforcer | reduces crime | -2 CG (implied) | Precinct Houses | Any |
| Soldier | +2 Naval Cap | -1 CG (implied) | Stronghold | Any |
| Entertainer | +10 Amenities | -2 CG | Holo-Theatres | Individualist |

### Market Prices (for trade-based deficit recovery)

| Resource | Base Price (EC) | Max Stable Monthly Trade |
|----------|----------------|-------------------------|
| Energy | 1 | 42 |
| Minerals | 1 | 42 |
| Food | 1 | 42 |
| Consumer Goods | 2 | 21 |
| Alloys | 4 | 10 |
| Exotic Gases | 10 | 4 |
| Rare Crystals | 10 | 4 |
| Volatile Motes | 10 | 4 |
| Dark Matter | 20 | 2 |
| Living Metal | 20 | 2 |
| Zro | 20 | 2 |

### Building Tier Progression and Strategic Resource Dependencies

| Building Line | T1 | T2 Requires | T3 Requires |
|---------------|-----|------------|-------------|
| Research | 400 min | 600 min + 50 gas (ongoing: -1 gas) | 800 min + 100 gas (ongoing: -2 gas) |
| Alloy Foundry | 400 min | 600 min (ongoing: nothing extra) | 600 min + 200 motes (ongoing: -4 motes) |
| Civilian Industry | 400 min | 600 min + 100 crystals (ongoing: -2 crystals) | 800 min + 200 crystals (ongoing: -4 crystals) |
| Law Enforcement | 400 min | 600 min + 50 motes (ongoing: -1 motes) | N/A |
| Military (Stronghold) | 400 min | 600 min + 50 motes (ongoing: -1 motes) | N/A |
| Unity (Admin/Temple) | 400 min | 600 min + strategic | 800 min + strategic |
