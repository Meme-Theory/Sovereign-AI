# Sovereign Template System — Design Document

## Problem

Personality data, weight factors, gate thresholds, and starting conditions are scattered across 15+ files with no single source of truth. The same values are defined in mod personality files, duplicated in the simulator, referenced differently in research findings, and approximated in design docs. Changes in one place don't propagate.

## Solution

A single JSON template per empire archetype that defines everything that varies by empire type. All downstream consumers — mod files, simulator, agents, validators — read from these templates.

## Template Schema

Each template is a JSON file in `templates/` named `<archetype>.json`:

```json
{
  "$schema": "sovereign-template-v1",
  "id": "ruthless_industrialist",
  "name": "Ruthless Industrialist",
  "description": "Out-produce everyone. Economic supremacy leads to military supremacy.",

  "identity": {
    "personality_key": "sovereign_ruthless_industrialist",
    "archetype": "expansionist",
    "ethics_match": {
      "required": ["materialist"],
      "preferred": [],
      "forbidden": ["spiritualist", "pacifist"]
    },
    "authority_match": {
      "preferred": ["auth_oligarchic", "auth_dictatorial"],
      "forbidden": []
    },
    "civic_affinity": ["civic_mining_guilds", "civic_functional_architecture"]
  },

  "behavior": {
    "aggressiveness": 0.75,
    "trade_willingness": 0.9,
    "bravery": 0.8,
    "military_spending": 1.0,
    "colony_spending": 1.8,
    "threat_modifier": 1.0,
    "friction_modifier": 0.75,
    "alliance_acceptance": 0,
    "federation_acceptance": 10,
    "flags": {
      "conqueror": false,
      "subjugator": true,
      "liberator": false,
      "opportunist": true,
      "slaver": false,
      "uplifter": false,
      "purger": false,
      "dominator": false,
      "infiltrator": false,
      "robot_exploiter": true,
      "robot_liberator": false,
      "migrator": true
    }
  },

  "economy": {
    "weight_factors": {
      "alloy": 2.5,
      "research": 1.0,
      "unity": 1.0,
      "military": 1.0,
      "expansion": 1.5,
      "trade": 1.0
    },
    "deficit_thresholds": {
      "minerals": 20,
      "energy": 10,
      "alloys": 8,
      "consumer_goods": 5,
      "food": 5,
      "research": 20,
      "unity": 15
    },
    "surplus_thresholds": {
      "minerals": 100,
      "energy": 50,
      "food": 30,
      "alloys": 50,
      "consumer_goods": 25,
      "research": 80,
      "unity": 50
    }
  },

  "gates": {
    "G1_mineral": { "threshold": 15, "factor": 0.1 },
    "G2_consumer_goods": { "threshold": 2, "factor": 0.1 },
    "G3_mineral_strict": { "threshold": 25, "factor": 0.1 },
    "G4_strategic": { "threshold": 1, "factor": 0.1 },
    "G5_alloy_expansion": { "threshold": 5, "factor": 0.1 },
    "G6_energy_high_upkeep": { "threshold": 5, "factor": 0.25 }
  },

  "starting_state": {
    "template": "regular",
    "stockpiles": {
      "minerals": 200, "energy": 200, "food": 100,
      "alloys": 100, "consumer_goods": 100
    },
    "pops": 52,
    "districts": { "mining": 2, "generator": 2, "agriculture": 2, "city": 2 },
    "planet_size": 20,
    "max_buildings": 4,
    "capital_tier": 0,
    "starting_techs": 31
  },

  "build_priority": {
    "early": ["mining_district", "alloy_foundry", "mining_district", "civilian_industries", "capital_upgrade", "alloy_foundry"],
    "mid": ["research_lab", "city_district", "alloy_foundry", "admin_office"],
    "late": ["megastructure", "research_lab", "alloy_foundry"]
  },

  "phase_overrides": {
    "early": {},
    "mid": {
      "weight_factors": { "research": 1.5 }
    },
    "late": {
      "gates": { "G1_mineral": { "threshold": 5, "factor": 0.25 } }
    }
  }
}
```

## Template Registry

### Core Archetypes (map to Sovereign personalities)

| Template ID | Personality Key | Empire Type | Key Trait |
|-------------|----------------|-------------|-----------|
| `aggressive_expansionist` | `sovereign_aggressive_expansionist` | regular | Alloy rush, early wars |
| `ruthless_industrialist` | `sovereign_ruthless_industrialist` | regular | Production supremacy |
| `diplomatic_hegemon` | `sovereign_diplomatic_hegemon` | regular | Federation builder |
| `fortress_guardian` | `sovereign_fortress_guardian` | regular | Defensive turtle |
| `knowledge_seeker` | `sovereign_knowledge_seeker` | regular | Tech rush |
| `evangelizing_zealot` | `sovereign_evangelizing_zealot` | regular | Unity/liberation |
| `xenophobic_purifier` | `sovereign_xenophobic_purifier` | regular | Total war |
| `devouring_swarm` | `sovereign_devouring_swarm` | hive_mind | Consume everything |
| `adaptive_optimizer` | `sovereign_adaptive_optimizer` | machine | Efficient expansion |

### Starting Templates (map to empire type)

| Template | Authority | Key Difference |
|----------|-----------|---------------|
| `regular` | Any non-gestalt | Standard CG economy |
| `hive_mind` | auth_hive_mind | No CG, mineral-based specialists |
| `machine` | auth_machine_intelligence | No food, energy-based specialists |
| `corporate` | auth_corporate | Trade value focus |
| `purifier` | Fanatic purifier | Front-loaded alloys, no diplomacy |

## Consumers

### 1. Simulator (`tools/simulator/sim.mjs`)
Reads `economy.weight_factors`, `economy.deficit_thresholds`, `gates`, and `starting_state` directly. No more hardcoded PERSONALITIES object — load from template JSON.

### 2. Mod Weight Files (`mod/common/buildings/*.txt`, `mod/common/districts/*.txt`)
A generator script reads templates and produces the `has_personality = sovereign_*` modifier blocks with correct factor values. Or: agents reference templates when writing/reviewing weight blocks.

### 3. Personality Definitions (`mod/common/personalities/00_personalities.txt`)
A generator reads `behavior` section and produces the Paradox personality block (aggressiveness, spending, flags).

### 4. Numbers Nerd Agent
References templates when producing weight recommendations. Validates proposed thresholds against the template's gate values.

### 5. Save Game Analyst
Compares real empire behavior against template predictions. "This empire has personality X — does its budget match template X's weight_factors?"

### 6. Gameflow Auditor
Uses `gates` section as the authoritative gate registry. No more scattered threshold values.

## File Layout

```
templates/
├── aggressive_expansionist.json
├── ruthless_industrialist.json
├── diplomatic_hegemon.json
├── fortress_guardian.json
├── knowledge_seeker.json
├── evangelizing_zealot.json
├── xenophobic_purifier.json
├── devouring_swarm.json
├── adaptive_optimizer.json
└── _schema.json              # JSON Schema for validation
```

## Migration Path

1. Create `templates/` with all 9 archetype JSONs populated from current sources
2. Refactor `sim.mjs` to load from template files instead of hardcoded objects
3. Agents read templates instead of scattered reference files
4. Eventually: generator scripts produce mod file weight blocks from templates
5. Eventually: save-game comparison tool diffs real behavior against template predictions
