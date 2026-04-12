# Mod Coverage Audit
*Date: 2026-04-12*
*Stellaris Version: 4.3 (current)*
*Mod: SOVEREIGN AI Overhaul*

## Summary

| Category | Mod Covers | Game Total | Coverage | Severity |
|----------|-----------|------------|----------|----------|
| Buildings | 8 | ~80 | ~10% | CRITICAL |
| Districts | 5 | ~49 | ~10% | CRITICAL |
| Technology (Eng) | 8 | 204 | ~4% | CRITICAL |
| Technology (Phys) | 9 | 163 | ~6% | CRITICAL |
| Technology (Soc) | 7 | 314 | ~2% | CRITICAL |
| Traditions | 6 trees | 16+ trees | ~38% | HIGH |
| Policies | 3 categories | 44 categories | ~7% | CRITICAL |
| Edicts | 4 | 141 | ~3% | CRITICAL |
| Ship Classes | 4 | 6+ (regular) | ~57% | HIGH |
| Army Types | 4 | 20+ | ~20% | MODERATE |
| AI Personalities | 9 | 49 (vanilla) | ~18% | HIGH |
| Megastructures | 0 (comments only) | 128 entries | 0% | HIGH |
| Espionage Ops | 3 (conceptual) | many | LOW | MODERATE |
| Diplomatic Actions | 4 (conceptual) | 118 entries | LOW | MODERATE |
| Decisions | 0 (placeholder) | many | 0% | HIGH |
| Ascension Perks | 0 | 42 | 0% | HIGH |

**Overall Assessment**: The mod is in early-stage development with significant coverage gaps across nearly every category. The existing implementations follow sound design principles (deficit-driven, personality-coherent), but cover only a small fraction of the actual game content.

---

## Buildings

### What We Cover (8 buildings)
**Capital Buildings** (3):
- `building_planetary_administration` (Tier 1 capital upgrade)
- `building_planetary_capital` (Tier 2 capital upgrade)
- `building_system_capital` (Tier 3 capital upgrade)

**Resource/Pop Buildings** (5):
- `building_research_lab_1` (Tier 1 research)
- `building_research_lab_2` (Tier 2 research)
- `building_foundry_1` (Alloy foundry)
- `building_civilian_industries` (Consumer goods)
- `building_luxury_residence` (Housing + amenities)
- `building_clinic` (Gene clinic)

### What Exists in Game (~80 buildings across sections)

**Missing Building Categories (not covered at all)**:
- **Law Enforcement**: Precinct Houses, Hall of Judgment, State Academy, Center of Guidance, Sentinel Posts (Gestalt)
- **Unity Buildings**: Administrative Offices, Temple (+ upgrades), Sacrificial Temple, Synaptic Nodes (Hive), Uplink Node (Machine), Organic Sanctuary (Rogue Servitor)
- **Research Tier 3**: Advanced Research Complexes
- **Foundry Tier 2-3**: Alloy Mega-Forges, Alloy Nano-Plants
- **Factory Tier 2-3**: Civilian Fabricators, Civilian Repli-Complexes
- **Military Buildings**: Stronghold, Fortress (critical for defense-oriented AI)
- **Extraction Buildings**: Surface Quarry Depot, Voltaic Production Yard, Hydroponics Farms
- **Commercial Buildings**: Commercial Zones (important for trade-focused AI)
- **Amenity Buildings**: Holo-Theatres
- **Resource Silos**: Resource Silos
- **Gestalt-Specific Housing**: Communal Housing, Hive Warren, Drone Storage
- **Strategic Resource Buildings**: Exotic gas refineries, rare crystal plants, volatile motes plants (not listed in wiki buildings but exist in game)
- **Nanite Transmuter**: Special rare resource producer
- **Nanotech Cauldron**: Alloy producer from nanites
- **Fallen Empire Buildings**: ~20 buildings (Sky Dome, Class-3 Singularity, etc.) - relevant for Awakened Empires
- **Wilderness Buildings**: Cradle of Rebirth, Chemical Digester, Crystal Bed, Exotic Gas Filters (BioGenesis DLC)
- **Experimentation Buildings**: Experimentation Chambers/Complex/Nexus (Shadows of the Shroud DLC)
- **Overseer Residences**: Thrall-World specific
- **Logistics Hub**: Gestalt-specific

### Critical Missing Buildings for AI Behavior
1. **Stronghold/Fortress** - Defense AI literally cannot build planetary defenses
2. **Unity buildings** (Temple, Admin Offices, Synaptic Nodes) - AI cannot produce unity
3. **Commercial Zones** - Trade-focused AI cannot build trade infrastructure
4. **Holo-Theatres** - AI cannot address amenity deficits beyond Luxury Residences
5. **All Tier 2-3 upgrades for Foundry and Factory** - AI stuck at Tier 1
6. **All Gestalt housing** - Machine/Hive AI cannot build housing
7. **Strategic resource buildings** - AI cannot produce exotic gases, rare crystals, volatile motes

### Building Naming Issue
The mod uses old-style building names (e.g., `building_research_lab_1`, `building_foundry_1`). Stellaris 4.x renamed many buildings:
- Research Labs (not `building_research_lab_1`) - produces Biologists, Engineers, Physicists (not generic "researchers")
- Alloy Foundries (not `building_foundry_1`) - produces Metallurgists
- The mod's building definitions include full stat blocks which may conflict with vanilla - buildings should only contain `ai_weight` overrides unless intentionally replacing vanilla stats

---

## Districts

### What We Cover (5 districts)
- `district_city` (housing/urban)
- `district_mining` (minerals)
- `district_generator` (energy)
- `district_farming` (food/agriculture)
- `district_industrial` (alloys + consumer goods)

### What Exists in Game (~49 district types)

**Missing Primary Districts**:
- `Central Nexus` (Machine Intelligence housing - distinct from city)
- `Hive Cluster` (Hive Mind housing)
- `Communal Biome` (Wilderness origin housing)

**Missing Planet-Class Primary Districts**:
- `Habitation District` (Habitat housing)
- `Residential Arcology` (Ecumenopolis housing)
- `City Segment` / `Hive Segment` / `Nexus Segment` (Ring World housing)
- `Prison District` (Penal Colony)
- `Slave Domicile District` (Thrall-World)
- `Accommodation District` (Resort World)
- `Order's Demesne` (Toxic Knights)

**Missing Habitat Resource Districts**:
- `Reactor District` (Habitat energy)
- `Astro-Mining Bay` (Habitat minerals)
- `Research District` (Habitat research)

**Missing Volcanic Districts** (new in recent updates):
- `Geothermal Powerplant`
- `Magma Conduit`
- `Thermotechnic Forum`

**Missing Wilderness Districts** (BioGenesis):
- `Photosynthesis Field`
- `Hollow Mountain`
- `Orchard Forest`

**Missing Secondary Urban District Swaps** (Stellaris 4.x major change):
- Industrial Cluster/Nexus/Segment/Arcology (Mixed Industry specialization)
- Foundry variants (Heavy Industry specialization)
- Factory variants (Civilian Industry specialization)
- Research variants (Research Enclave + Physics/Society/Engineering specializations)
- Administrative/Synapse/Coordination variants (Administrative Hub)
- Ecclesiastical variants (Spiritual Enclave)
- Sanctuary variants (Rogue Servitor)
- Fortress variants (Planetary Defenses)
- Commercial/Logistics variants (Commercial Nexus)
- Generator/Mining/Farming variants for specialized worlds

**Missing Synaptic Lathe Districts** (Machine Age):
- Neural Gate
- Ampliative Speculator

### Critical 4.x District Change
Stellaris 4.x introduced the **Secondary Urban District Swap** system. City/Hive/Nexus districts are now "unspecialized" and can be converted to specialized variants (foundry, factory, research, administrative, etc.) based on planet specialization. This is a fundamental change to how districts work, and the mod does not account for it at all. The AI needs weights for choosing specializations.

---

## Technology

### What We Cover

**Engineering** (8 techs):
- `tech_destroyers`, `tech_cruisers`, `tech_battleships` (ship unlocks)
- `tech_starbase_2`, `tech_starbase_3` (starbase upgrades)
- `tech_mega_engineering` (megastructure prerequisite)
- `tech_basic_industry`, `tech_alloys_1` (industry chain)

**Physics** (9 techs):
- `tech_power_plant_1`, `tech_power_plant_2` (energy)
- `tech_shields_1`, `tech_shields_2`, `tech_shields_3` (shields)
- `tech_administrative_ai`, `tech_self_aware_logic` (computing)
- `tech_sensors_2`, `tech_sensors_3` (sensors)

**Society** (7 techs):
- `tech_planetary_government`, `tech_colonial_centralization`, `tech_galactic_administration` (governance)
- `tech_frontier_health`, `tech_gene_tailoring` (biology)
- `tech_centralized_command` (military theory)
- `tech_psionic_theory` (psionics)

### What Exists in Game

| Field | Game Total | Mod Covers | Coverage |
|-------|-----------|------------|----------|
| Engineering | 204 (incl. 19 event techs) | 8 | 4% |
| Physics | 163 (incl. 29 event techs) | 9 | 6% |
| Society | 314 (incl. 54 event techs) | 7 | 2% |
| **Total** | **681** | **24** | **3.5%** |

### Critical Missing Tech Categories
**Engineering**:
- **Frigate tech** (new in 4.x) - `tech_frigates` not weighted
- **Titan tech** - not weighted
- All weapon techs (lasers, kinetics, missiles, torpedoes, strike craft - ~30+ techs)
- All armor techs (~5 tiers)
- Thruster techs
- FTL techs (hyperlane, jump drive)
- Mining/energy station techs
- Robot assembly techs
- Habitat tech
- Gateway techs
- All repeatable techs

**Physics**:
- Shield techs beyond Tier 3
- All laser weapon techs
- All power plant techs beyond Tier 2
- Computing techs (AI, research speed bonuses)
- FTL inhibitor techs
- Dark matter techs
- All repeatable techs

**Society**:
- Gene modification techs beyond tailoring
- All military theory beyond centralized command
- Psionic techs beyond psionic theory
- New Worlds techs (terraforming, colonization)
- Statecraft techs (vast majority of 70 techs missing)
- Biology techs (vast majority of 43 techs missing)
- All biological ship techs (53 techs - BioGenesis)
- All repeatable techs

### Structural Issue with Tech Weights
The mod redefines entire tech entries (cost, tier, prerequisites, weight) instead of just overriding `ai_weight`. This means the mod is replacing vanilla tech definitions, which:
1. May break if vanilla changes tech costs, prerequisites, or effects
2. Could cause conflicts with other mods
3. Is unnecessary - only the `ai_weight` block needs overriding

---

## Traditions

### What We Cover (6 trees)
- Expansion (`tr_expansion_adopt`)
- Supremacy (`tr_supremacy_adopt`)
- Discovery (`tr_discovery_adopt`)
- Harmony (`tr_harmony_adopt`)
- Diplomacy (`tr_diplomacy_adopt`)
- Prosperity (`tr_prosperity_adopt`)

Note: Only the `_adopt` tradition is weighted in each tree. Individual traditions within trees have no weights.

### What Exists in Game (16+ trees)
From the wiki, tradition trees include:
1. **Adaptability** / Versatility (Gestalt) - NOT COVERED
2. **Harmony** / Synchronicity (Gestalt) - Harmony covered, Synchronicity NOT COVERED
3. **Commerce** / Logistics (Gestalt) - NOT COVERED
4. **Diplomacy** - COVERED (adopt only)
5. **Discovery** - COVERED (adopt only)
6. **Domination** - NOT COVERED
7. **Expansion** - COVERED (adopt only)
8. **Fortification** (renamed from Unyielding) - NOT COVERED
9. **Mercantile** - NOT COVERED (separate from Commerce)
10. **Prosperity** - COVERED (adopt only)
11. **Subterfuge** - NOT COVERED
12. **Supremacy** - COVERED (adopt only)
13. **Enmity** (BioGenesis) - NOT COVERED

**Ascension Path Tradition Trees** (unlocked by ascension perks):
14. **Psionics** - NOT COVERED
15. **Cybernetics** - NOT COVERED
16. **Genetics** / Cloning / Mutation / Purity - NOT COVERED
17. **Synthetics** / Modularity / Nanotech / Virtuality - NOT COVERED

### Critical Gaps
- No Gestalt-specific tradition alternatives (Synchronicity, Versatility, Logistics)
- No Domination tree (critical for authoritarian AI)
- No Fortification tree (critical for defensive AI)
- No Subterfuge tree (critical for espionage)
- No Commerce/Mercantile trees (critical for trade-focused AI)
- Individual tradition picks within trees are not weighted at all
- Ascension path traditions completely missing

---

## Policies & Edicts

### Policies

**What We Cover** (3 policy categories, ~9 options):
1. Economic Policy (civilian/mixed/military)
2. War Philosophy (unrestricted/liberation/no wars)
3. Orbital Bombardment (selective/indiscriminate/armageddon)

**What Exists in Game** (44 policy categories, ~155 options):
Missing categories include:
- **Diplomatic Stance** (Cooperative, Expansionist, Isolationist, Belligerent, Mercantile, Supremacist)
- **Trade Policy** (Wealth Creation, Consumer Benefits, Marketplace of Ideas)
- **Artificial Intelligence** (Allowed, Outlawed, Servitude, Citizenship)
- **Robotic Workers** (Allowed, Outlawed)
- **Slavery** (Allowed, Outlawed)
- **Purge** (Allowed, Outlawed, Processing, Displacement, etc.)
- **Refugees** (Allowed, Restricted, Outlawed)
- **Resettlement** (Allowed, Prohibited)
- **Population Controls** (Allowed, Prohibited)
- **Pre-FTL Interference/Enlightenment** policies
- **First Contact Protocol** (Proactive, Cautious, Aggressive)
- **Orbital Surrender Acceptance**
- **War Doctrine** policies
- **Leader Enhancement** policies
- **Research Focus** policies (Physics/Society/Engineering focus)
- **Production Policy** (Industrial/Foundry/Factory focus)
- **Genome Tailoring** policies
- **Cyberization Standards** (Machine Age)
- **Psionic Choir** (Shadows of the Shroud)
- Many civic-specific policies

### Edicts

**What We Cover** (4 edicts):
1. `edict_mining_subsidies`
2. `edict_energy_subsidies`
3. `edict_war_production`
4. `edict_research_focus`

**What Exists in Game** (141 edicts across 17 categories):
- **Unity Edicts** (35): Fortify the Border, Nutritional Plenitude, Fleet Supremacy, Capacity Subsidies, Mining Subsidies, Farming Subsidies, Forge Subsidies, Industrial Subsidies, and many more
- **Strategic Resources Edicts** (18): Various exotic gas/crystal/mote related
- **Campaigns** (6): Various temporary bonuses
- **Ambitions** (8): Powerful late-game edicts
- **Ethic Edicts** (5): Ethics-specific bonuses
- **Cybernetic Authority Edicts** (15): Machine Age specific
- **Dark Matter Edicts** (5)
- **Astral Edicts** (5)
- And more...

The mod's edicts also define full edict structures instead of just overriding `ai_weight`, which may conflict with vanilla definitions. In 4.x, edicts use **Unity upkeep** (not influence cost), but the mod uses `influence` costs.

---

## Ship Classes

### What We Cover (4 classes with full stat redefinition)
- Corvette
- Destroyer
- Cruiser
- Battleship

### What Exists in Game (6+ regular classes)
1. **Corvette** - COVERED
2. **Frigate** (NEW in 4.x) - NOT COVERED
3. **Destroyer** - COVERED
4. **Cruiser** - COVERED
5. **Battleship** - COVERED
6. **Titan** (Apocalypse DLC) - NOT COVERED

**Special/Super-Capital Ships** (not covered):
- **Juggernaut** (mobile starbase/shipyard) - NOT COVERED
- **Colossus** (planet killer) - NOT COVERED
- **Star-Eater** (Nemesis crisis) - NOT COVERED

**Non-Standard Ship Types** (not relevant to cover):
- Offspring ships (Progenitor Hive origin)
- Menacing ships (Nemesis crisis)
- Fallen Empire Battlecruisers/Escorts
- Biological ships (BioGenesis DLC shipset variants)

### Critical Issue
The mod **redefines entire ship_size entries** including stats (max_speed, hitpoints, sections, resources, etc.) instead of just overriding `ai_weight`. This will:
1. Override vanilla ship stats, potentially breaking game balance
2. Conflict with any DLC or patch that changes ship stats
3. Ship stats in the mod appear to be based on older game versions

The **Frigate** is a brand-new ship class added in Stellaris 4.x (BioGenesis) that sits between Corvette and Destroyer. It is completely absent from the mod.

---

## AI Personalities

### What We Cover (9 personalities)
**Vanilla Overrides** (1):
1. `aggressive_expansionist`

**New Sovereign Personalities** (8):
2. `sovereign_ruthless_industrialist`
3. `sovereign_diplomatic_hegemon`
4. `sovereign_fortress_guardian`
5. `sovereign_knowledge_seeker`
6. `sovereign_evangelizing_zealot`
7. `sovereign_xenophobic_purifier`
8. `sovereign_devouring_swarm`
9. `sovereign_adaptive_optimizer`

### What Exists in Vanilla (49 personalities)

**Playable Personalities** (18):
1. Hegemonic Imperialists
2. Federation Builders
3. Evangelizing Zealots
4. Spiritual Seekers
5. Erudite Explorers
6. Honorbound Warriors
7. Democratic Crusaders
8. Migratory Flock
9. Harmonious Collective
10. Xenophobic Isolationists
11. Decadent Hierarchy
12. Slaving Despots
13. Peaceful Traders
14. Ruthless Capitalists
15. Fanatical Purifiers
16. Fanatical Befrienders
17. Metalheads
18. Blazing Devastators (Infernals DLC)

**Gestalt Personalities** (8):
19. Hive Mind
20. Cooperative Multitude
21. Devouring Swarm
22. Harmonic Wilderness (BioGenesis)
23. Rampant Wilderness (BioGenesis)
24. Machine Intelligence
25. Rogue Servitors
26. Driven Assimilators
27. Determined Exterminators

**Crisis Personalities** (1):
28. Crisis Aspirant

**Thermophile Personalities** (1):
29. Thermarchy (Infernals DLC)

**Fallen Empire Personalities** (10):
30-39. Keepers of Knowledge, Watchful Regulators, Enigmatic Observers, etc.

**Special Personalities** (10+):
40-49. Galactic Custodians, Rampaging Machines, Mirror Empire, etc.

### Analysis
The mod's 9 personalities don't map cleanly to vanilla's 18+ playable personalities:
- **Not Represented**: Federation Builders, Spiritual Seekers, Erudite Explorers, Honorbound Warriors, Democratic Crusaders, Migratory Flock, Harmonious Collective, Decadent Hierarchy, Slaving Despots, Peaceful Traders, Ruthless Capitalists, Fanatical Befrienders, Metalheads, Blazing Devastators
- **Missing Gestalt**: Cooperative Multitude, Harmonic/Rampant Wilderness, Rogue Servitors, Driven Assimilators
- **Partially Covered**: Devouring Swarm, Fanatical Purifiers (have sovereign versions)
- **Missing DLC**: Thermarchy (Infernals), Wilderness personalities (BioGenesis)

The mod adds new personality archetypes (`technologist`, `propagator`, `devourer`, `purifier`) that don't exist in vanilla, which will cause errors.

---

## Scripted Triggers

### What We Cover (16 triggers)
**Empire Type** (7): `sovereign_is_standard_empire`, `sovereign_is_militaristic`, `sovereign_is_pacifist`, `sovereign_is_materialist`, `sovereign_is_spiritualist`, `sovereign_is_xenophobe`, `sovereign_is_xenophile`, `sovereign_is_genocidal`

**Economic State** (4): `sovereign_has_stable_economy`, `sovereign_economy_is_critical`, `sovereign_has_alloy_surplus`, `sovereign_needs_consumer_goods`

**Military State** (3): `sovereign_has_strong_fleet`, `sovereign_fleet_is_weak`, `sovereign_is_threatened`

**Planet State** (3): `sovereign_planet_has_growth_room`, `sovereign_planet_is_overcrowded`, `sovereign_planet_needs_jobs`

### Missing Trigger Categories
- **Egalitarian/Authoritarian ethics checks** - no triggers for these ethics
- **Gestalt sub-type checks** - no triggers for Hive Mind vs Machine Intelligence distinction
- **Authority checks** - no triggers for democratic/oligarchic/dictatorial/imperial/corporate
- **DLC-specific checks** - no triggers for Lithoid, Aquatic, Thermophile, Wilderness origin checks
- **Technology state checks** - no triggers for "has repeatables", "has ascension perk X"
- **Federation state checks** - no triggers for federation membership or type
- **Consumer goods state** - `sovereign_needs_consumer_goods` exists but no food equivalent for non-gestalt
- **Research state** - no triggers for research income levels
- **Unity state** - no triggers for unity income/tradition progress
- **Strategic resource checks** - no triggers for exotic gas/rare crystal/volatile mote availability
- **Pop growth checks** - no triggers for growth rate or assembly rate
- **War exhaustion checks** - no triggers for war exhaustion thresholds
- **Galactic Community checks** - no triggers for resolution status

---

## Decisions

### What We Cover
**Nothing** - the decisions file is a placeholder with commented-out examples.

### What Should Be Covered
- Planet designation decisions (AI choosing specializations)
- Planetary ascension decisions (4.x feature)
- Arcology Project decision
- Mastery of Nature decision
- Consecrate World decision
- Expand Planetary Sea decision (Aquatic)
- Various designation-related decisions

---

## Megastructures

### What We Cover
**Nothing functional** - the megastructures file contains only comments describing a priority strategy.

### What Exists in Game (128 entries, ~12+ distinct megastructures)
Multi-stage megastructures:
1. Gateway (+ Gateway Activation)
2. Dyson Sphere
3. Matter Decompressor
4. Science Nexus
5. Strategic Coordination Center
6. Sentry Array
7. Mega Art Installation
8. Interstellar Assembly
9. Mega Shipyard
10. Ring World
11. Quantum Catapult
12. Hyper Relay
13. Orbital Ring
14. Habitat
15. Galactic Crucible (Machine Age)

The mod's comment file describes a reasonable priority order but has no actual weight overrides.

---

## Ascension Perks

### What We Cover
**Nothing** - no ascension perk weights file exists.

### What Exists in Game (42 perks)
Ascension perks are critical for AI long-term strategy:
- Tier 0 (10+ perks): Executive Vigor, Technological Ascendancy, Interstellar Dominion, etc.
- Tier 1 (5+ perks): Grasp the Void, World Shaper, Enigmatic Engineering, etc.
- Tier 2 (6+ perks): Galactic Force Projection, Arcology Project, Master Builders, Hive Worlds, Machine Worlds, etc.
- Tier 3 (3+ perks): Defender of the Galaxy, Galactic Contender, Colossus Project
- Ascension Paths (6+): Mind Over Matter, Synthetic Evolution, The Flesh is Weak, Biomorphosis, Synthetic Age, Interdimensional Processing
- Crisis Perks (4): Galactic Nemesis, Cosmogenesis, Behemoth Fury, Galactic Hyperthermia

AI perk selection is one of the most impactful areas for long-term AI competence.

---

## Critical 4.x Changes Not Reflected

### 1. District Specialization System (4.0+)
Stellaris 4.x fundamentally changed how districts work. Planets now have "primary" and "secondary" districts, where secondary districts are swapped based on planet specialization. The mod's district file uses the pre-4.x system where districts are standalone. This is the single largest mechanical gap.

### 2. Frigate Ship Class (4.0+, BioGenesis)
A new ship class between Corvette and Destroyer. Completely absent from the mod. Affects fleet composition AI.

### 3. Biological Shipsets (4.0+, BioGenesis)
Entirely new ship construction paradigm using Food instead of Alloys. The mod's ship_sizes file hardcodes Alloy costs only.

### 4. Unity-Based Edicts (3.x+)
Edicts transitioned from Influence cost to Unity upkeep. The mod's edicts still use `influence` costs, which is incorrect for 4.x.

### 5. Wilderness Origin (4.0+, BioGenesis)
A new origin that changes fundamental mechanics (no colony ships, different buildings, symbiont jobs). No support in the mod.

### 6. Thermophile/Infernals (4.1+)
New species type and DLC with unique buildings, civics, and playstyle. No support.

### 7. Volcanic Worlds (4.1+)
New planet class with unique districts (Geothermal Powerplant, Magma Conduit, Thermotechnic Forum). No support.

### 8. Shadows of the Shroud (4.2+)
New DLC adding Mindwardens, psionic mechanics, experimentation buildings. No support.

### 9. Cosmic Storms (4.3)
New mechanic with storm-related edicts and ascension perks. No support.

### 10. Pop System Changes
4.x significantly changed how pops, jobs, and housing work. Building job numbers in the mod (e.g., `job_researcher_add = 2`) may not match 4.x values which often use hundreds (e.g., `+200 Biologists` in wiki data, representing 2.00 jobs in the new scaling).

### 11. Building Set System
4.x introduced "Building Sets" that control which buildings can coexist on a planet. The mod's buildings don't reference building sets, which could cause compatibility issues.

### 12. Planetary Ascension
4.x added planetary ascension tiers that provide scaling bonuses. No support in AI decision-making.

### 13. Astral Rifts and Astral Threads
New resource and exploration mechanic. No support.

### 14. Advanced Logic Resource
New resource from Machine Age DLC (Cosmogenesis crisis path). No support.

---

## Recommendations (Priority Order)

### P0 - Structural Issues (fix before adding content)
1. **Stop redefining full game objects** - Buildings, techs, ship sizes, and edicts should only override `ai_weight` blocks, not redefine the entire object. This prevents conflicts with vanilla updates.
2. **Update to 4.x edict system** - Edicts use Unity upkeep, not Influence costs.
3. **Understand 4.x district specialization** - The district system is fundamentally different; weights need to account for specialization swaps.
4. **Fix pop/job scaling** - Verify whether 4.x uses a different scale for job counts in building definitions.

### P1 - Critical Coverage Gaps
5. **Buildings**: Add weights for Stronghold/Fortress, Unity buildings, Commercial Zones, Holo-Theatres, all Gestalt housing, all Tier 2-3 upgrades
6. **Districts**: Add Habitat, Ring World, Ecumenopolis, Hive World, Machine World districts; add specialization swap weights
7. **Ship Classes**: Add Frigate and Titan weights
8. **Policies**: Add Diplomatic Stance, Trade Policy, AI Policy, Slavery, Refugees, War Doctrine weights
9. **Decisions**: Implement planet designation AI weights

### P2 - Important Gaps
10. **Traditions**: Add missing trees (Adaptability, Domination, Fortification, Commerce, Subterfuge); add individual tradition weights within trees
11. **Edicts**: Cover the 35 Unity edicts and 8 Ambitions at minimum
12. **Technology**: Prioritize weapon techs, armor, repeatable techs, and key unlock techs
13. **Ascension Perks**: Add weight overrides for all 42 perks
14. **AI Personalities**: Either override all 18+ vanilla playable personalities or ensure the mod's personalities don't create orphan archetype references

### P3 - Enhancement
15. **Megastructures**: Implement actual weight overrides instead of comments
16. **Army Types**: Add Psionic Army, Xenomorph, Gene Warriors, Machine-specific armies
17. **Espionage**: Implement actual operation weight overrides
18. **DLC Support**: Add Infernals, BioGenesis, Shadows of the Shroud, Machine Age content
