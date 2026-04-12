# Planet Class System — Design Document

## Problem

The simulator treats every planet as a generic 20-slot world with mining/generator/agriculture/city districts. In reality, Stellaris 4.x has 10+ distinct planet classes, each with different available districts, district types, costs, and job outputs. This means our weight resolver doesn't know which districts are even *buildable* on a given planet.

## Planet Classes and Their District Availability

### Standard Habitable Worlds
**Types:** Continental, Ocean, Tropical, Arid, Desert, Savanna, Arctic, Tundra, Alpine
- Primary: City District (individualist) / Central Nexus (machine) / Hive Cluster (hive)
- Resource: Mining, Generator, Agriculture (capped by planet features)
- Secondary: Specialization swaps from city districts (Mixed Industry, Research Enclave, etc.)
- Size: 12-25 district slots
- Cost: 300 minerals / 240 days (resource), 500 minerals / 480 days (city)

### Volcanic Worlds
**Types:** pc_volcanic
- Primary: City District / Central Nexus / Hive Cluster
- Resource: Magma Conduit (mining), Geothermal Powerplant (energy), **NO agriculture**
- Special: Thermotechnic Forum (research+admin, 200 housing, -3 EC upkeep)
- Size: 12-20
- Key difference: **No food production from districts.** Must import food or use buildings.

### Habitats
- Primary: Habitation District (+1000 housing)
- Resource: Reactor District (energy, +100 technicians), Astro-Mining Bay (minerals, +100 miners), Research District (+30 each physicist/biologist/engineer)
- Cost: **Alloys** not minerals (300 alloys / 360 days)
- Size: 4-8 (tiny — very limited slots)
- Key difference: Alloy upkeep (-0.5 per district), small size, no agriculture.

### Ring World Segments
- Primary: City Segment (+2500 housing, +300 clerks, -5 EC)
- Resource: Generator Segment, Agricultural Segment (NO mining segment)
- Specialized: Research/Foundry/Factory/Admin/Commercial/Fortress Segments
- Cost: 1000 minerals / 360 days
- Size: 5-10 (but each district is 2.5x more productive than normal)
- Key difference: **No mining districts.** All resources are per-100 workers at 2.5x normal output.

### Ecumenopolis
- Primary: Residential Arcology (+1500 housing, +300 clerks, -5 EC)
- Specialized: Foundry/Factory/Research/Admin/Commercial/Fortress Arcologies
- Cost: 500-1000 alloys or minerals
- Size: 12-16
- Key difference: **No basic resource districts** (no mining, generator, agriculture). Pure specialist economy — must import all raw resources.

### Hive World
- Primary: Hive Cluster (+1200 housing, +600 on hive world)
- Resource: Mining/Generator/Agriculture Clusters (same as standard but renamed)
- Specialized: Research/Foundry/Factory/Synapse/Fortress Clusters
- Size: 15-25
- Key difference: Hive-only. Higher housing. No city district equivalent (Hive Cluster replaces it).

### Machine World
- Primary: Central Nexus (+1000 housing)
- Resource: Mining/Generator Nexuses (NO agriculture)
- Specialized: Research/Foundry/Factory/Coordination/Fortress Nexuses
- Size: 15-25
- Key difference: Machine-only. **No agriculture.** No food economy.

### Wilderness World (BioGenesis DLC)
- Primary: Communal Biome (+100 housing, costs Biomass)
- Resource: Photosynthesis Field (energy), Hollow Mountain (mining), Orchard Forest (food)
- Cost: 300 minerals + 50 Biomass
- Key difference: Hive-only origin. Unique job types. Biomass cost.

## District Availability Matrix

| Planet Class | City/Housing | Mining | Generator | Agriculture | Industrial Specs | Research Specs | Cost Currency |
|-------------|-------------|--------|-----------|-------------|-----------------|---------------|---------------|
| Standard | City District | Yes | Yes | Yes | Via specialization | Via specialization | Minerals |
| Volcanic | City District | Magma Conduit | Geothermal | **NO** | Via specialization | Thermotechnic Forum | Minerals |
| Habitat | Habitation | Astro-Mining | Reactor | **NO** | **NO** | Research District | **Alloys** |
| Ring World | City Segment | **NO** | Generator Seg | Agriculture Seg | Via specialization | Via specialization | Minerals (high) |
| Ecumenopolis | Residential Arc | **NO** | **NO** | **NO** | Via specialization | Via specialization | Alloys/Minerals |
| Hive World | Hive Cluster | Mining Cluster | Generator Cluster | Agri Cluster | Via specialization | Via specialization | Minerals |
| Machine World | Central Nexus | Mining Nexus | Generator Nexus | **NO** | Via specialization | Via specialization | Minerals |

## Impact on Weight Resolver

The weight resolver must check planet class before evaluating district weights:
1. **Don't weight agriculture districts on volcanic/habitat/machine worlds** — they don't exist
2. **Don't weight mining districts on ring worlds/ecumenopolis** — they don't exist
3. **Habitat districts cost alloys not minerals** — gate checks need different resources
4. **Ring world districts produce 2.5x but cost 3.3x** — different value calculations
5. **Ecumenopolis is pure specialist** — only arcology specializations, no raw resource extraction

## Simulator Integration

The simulator needs a `planet_class` field on each planet that determines:
- Which districts are available (the `available_districts` array)
- District cost currency (minerals vs alloys)
- District output multiplier (1.0 for standard, 2.5 for ring world)
- Housing per district type
- Special district types (Thermotechnic Forum, Research District, etc.)

```javascript
const PLANET_CLASSES = {
  standard:     { districts: ["mining","generator","agriculture","city"], cost: "minerals", multiplier: 1.0 },
  volcanic:     { districts: ["mining","generator","city","thermotechnic"], cost: "minerals", multiplier: 1.0 },
  habitat:      { districts: ["hab_mining","hab_energy","hab_research","hab_housing"], cost: "alloys", multiplier: 0.5 },
  ring_world:   { districts: ["generator","agriculture","city","specialization"], cost: "minerals", multiplier: 2.5 },
  ecumenopolis: { districts: ["arcology_housing","specialization"], cost: "alloys", multiplier: 1.5 },
  hive_world:   { districts: ["mining","generator","agriculture","hive_cluster"], cost: "minerals", multiplier: 1.0 },
  machine_world:{ districts: ["mining","generator","central_nexus"], cost: "minerals", multiplier: 1.0 },
};
```

## Template Integration

Each template's `starting_state` should specify the homeworld planet class. Origins that change the homeworld type:
- `origin_void_dwellers` → habitat
- `origin_shattered_ring` → ring_world
- `origin_life_seeded` → standard (Gaia, size 25)
- `origin_subterranean` → standard (with extra mining cap)
- Volcanic preference → volcanic

The `build_priority` arrays in templates should only reference districts available on that planet class.
