#!/usr/bin/env node
// ============================================================
// Sovereign AI — Economy Simulator
// Turn-based extrapolation of Stellaris 4.x economy
// using the Sovereign weight convention system.
//
// Usage:
//   node sim.mjs [preset] [turns] [flags]
//   node sim.mjs materialist 360       # 30 years as materialist
//   node sim.mjs militarist 240        # 20 years as militarist
//   node sim.mjs compare 360           # side-by-side all presets
//   node sim.mjs custom 360 --alloy-weight=150 --mineral-threshold=30
// ============================================================

// ============================================================
// GAME CONSTANTS (from wiki + research findings)
// ============================================================

// ============================================================
// PLANET CLASS SYSTEM — determines which districts are available
// From design/planet_classes.md and wiki district data
// ============================================================

const PLANET_CLASSES = {
  standard: {
    name: "Standard World",
    available_districts: ["mining", "generator", "agriculture", "city"],
    cost_currency: "minerals",
    output_multiplier: 1.0,
    notes: "Continental, Ocean, Tropical, Arid, Desert, Savanna, Arctic, Tundra, Alpine",
  },
  volcanic: {
    name: "Volcanic World",
    available_districts: ["mining", "generator", "city"], // NO agriculture
    cost_currency: "minerals",
    output_multiplier: 1.0,
    notes: "Magma Conduit (mining), Geothermal Powerplant (energy), Thermotechnic Forum (research). No food districts.",
  },
  habitat: {
    name: "Habitat",
    available_districts: ["hab_mining", "hab_energy", "hab_research", "hab_housing"],
    cost_currency: "alloys",
    output_multiplier: 0.5, // fewer jobs per district
    notes: "Alloy cost. 4-8 slots. Research district unique to habitats.",
  },
  ring_world: {
    name: "Ring World",
    available_districts: ["generator", "agriculture", "city"], // NO mining
    cost_currency: "minerals",
    output_multiplier: 2.5, // 2.5x output per district
    notes: "No mining. 2.5x output. High cost (1000 min). Specialized segments.",
  },
  ecumenopolis: {
    name: "Ecumenopolis",
    available_districts: ["city"], // NO basic resource districts — all specialization
    cost_currency: "alloys",
    output_multiplier: 1.5,
    notes: "Pure specialist economy. Arcology specializations only. Must import raw resources.",
  },
  hive_world: {
    name: "Hive World",
    available_districts: ["mining", "generator", "agriculture", "city"],
    cost_currency: "minerals",
    output_multiplier: 1.0,
    notes: "Hive-only. +600 housing per Hive Cluster. Same resource districts as standard.",
  },
  machine_world: {
    name: "Machine World",
    available_districts: ["mining", "generator", "city"], // NO agriculture
    cost_currency: "minerals",
    output_multiplier: 1.0,
    notes: "Machine-only. No food districts. Central Nexus replaces city.",
  },
};

const DISTRICT_COST = { mining: 300, generator: 300, agriculture: 300, city: 500, hab_mining: 300, hab_energy: 300, hab_research: 300, hab_housing: 300 };
const DISTRICT_BUILD_TIME = { mining: 16, generator: 16, agriculture: 16, city: 16, hab_mining: 12, hab_energy: 12, hab_research: 12, hab_housing: 12 };
const DISTRICT_HOUSING = { mining: 2, generator: 2, agriculture: 2, city: 5, hab_mining: 3, hab_energy: 3, hab_research: 3, hab_housing: 10 };
const DISTRICT_JOBS = {
  mining: { miner: 2 },
  generator: { technician: 2 },
  agriculture: { farmer: 2 },
  city: { clerk: 1 }, // simplified — real specialization varies
  hab_mining: { miner: 1 },
  hab_energy: { technician: 1 },
  hab_research: { researcher: 1 },
  hab_housing: {},
};

const BUILDING_COST = {
  alloy_foundry: 400, research_lab: 400, civilian_industries: 400,
  temple: 400, admin_office: 400, stronghold: 400, gene_clinic: 400,
  capital_1: 500, capital_2: 800,
};
const BUILDING_BUILD_TIME = {
  alloy_foundry: 12, research_lab: 12, civilian_industries: 12,
  temple: 12, admin_office: 12, stronghold: 8, gene_clinic: 12,
  capital_1: 12, capital_2: 16,
};
const BUILDING_UPKEEP_ENERGY = {
  alloy_foundry: 2, research_lab: 2, civilian_industries: 2,
  temple: 2, admin_office: 2, stronghold: 1, gene_clinic: 2,
  capital_1: 0, capital_2: 0,
};
const BUILDING_JOBS = {
  alloy_foundry: { metallurgist: 2 },
  research_lab: { researcher: 2 },
  civilian_industries: { artisan: 2 },
  temple: { priest: 2 },
  admin_office: { bureaucrat: 2 },
  stronghold: { soldier: 2 },
  gene_clinic: { healthcare: 2 },
  capital_1: { politician: 1, enforcer: 1 },
  capital_2: { politician: 2, enforcer: 1 },
};

// Job production per worker per month
const JOB_PRODUCTION = {
  miner:        { minerals: 6 },
  technician:   { energy: 6 },
  farmer:       { food: 6 },
  metallurgist: { alloys: 3, minerals: -6 },   // 2:1 mineral sink
  artisan:      { consumer_goods: 6, minerals: -6 },
  researcher:   { research: 3, consumer_goods: -2 },
  bureaucrat:   { unity: 3, consumer_goods: -2 },
  priest:       { unity: 4, consumer_goods: -2 },
  clerk:        { energy: 2, consumer_goods: 1 },
  politician:   { unity: 3, housing: 1 },
  enforcer:     { unity: 1, crime_reduction: 5 },
  soldier:      { unity: 1, naval_cap: 2 },
  healthcare:   { pop_growth: 0.05 },  // 5% growth bonus
};

// Pop growth: base per month (simplified — real formula depends on many factors)
const BASE_POP_GROWTH_PER_MONTH = 0.8; // ~10 pops per year at start
const POP_PER_HOUSING = 1;

// ============================================================
// STARTING TEMPLATES — derived from baseline save game
// unitednationsofearth5_505588286 / 2200.01.05.sav (4.3.3)
// 34 empires profiled, values are averages from real game data.
//
// The simulator uses "sim pops" (~28-52 range) not 4.x display
// pops (4800-5200). Conversion: sim_pops ≈ display_pops / 100.
// Income values are calibrated so that the COMPUTED income from
// districts + jobs matches the OBSERVED save game income.
// ============================================================

/** Base empire income that all empires receive regardless of districts/jobs.
 *  Derived from "country_base" income in save game budget breakdowns.
 *  This represents the empire's inherent production before any pops work. */
const EMPIRE_BASE_INCOME = {
  energy: 20, minerals: 20, food: 20,
  alloys: 5, consumer_goods: 15,
  physics_research: 10, society_research: 10, engineering_research: 10,
  unity: 11, influence: 3,
};

/** Additional income sources not modeled by districts/jobs (trade, orbits, starbases).
 *  Averaged from 26 regular empires at game start. */
const EMPIRE_PASSIVE_INCOME = {
  energy: 16,    // trade_policy (36) + starbase_modules (6) + orbital (10) - already counted
  minerals: 10,  // orbital_mining_deposits
};

const STARTING_TEMPLATES = {
  /** Standard organic empire (non-gestalt, non-corporate). 26/34 baseline empires. */
  regular: {
    name: "Regular Empire",
    stockpiles: { minerals: 200, energy: 200, food: 100, alloys: 100, consumer_goods: 100 },
    unity: 0, research: 0,
    pops: 52,
    year: 2200, month: 1,
    capital_tier: 0,
    planets: [{
      name: "Homeworld",
      planet_class: "standard",
      size: 20,
      districts: { mining: 2, generator: 2, agriculture: 2, city: 2 },
      buildings: [],
      max_buildings: 4,
      pops: 52,
    }],
    // Observed net income at year 2200 (for validation):
    // energy +65, minerals +28, food +30, alloys +9, CG +10
    // research +14/+15/+16, unity +30, influence +4
  },

  /** Hive Mind empire (gestalt, no CG, higher alloys, more food). 8/34 baseline empires. */
  hive_mind: {
    name: "Hive Mind",
    stockpiles: { minerals: 200, energy: 200, food: 200, alloys: 100, consumer_goods: 0 },
    unity: 0, research: 0,
    pops: 55,
    year: 2200, month: 1,
    capital_tier: 0,
    planets: [{
      name: "Homeworld",
      planet_class: "hive_world",
      size: 20,
      districts: { mining: 2, generator: 2, agriculture: 3, city: 2 },
      buildings: [],
      max_buildings: 4,
      pops: 55,
    }],
    // Observed: energy +39, minerals +18, food +15, alloys +15,
    // CG 0, research +13/+13/+15, unity +22, influence +5
  },

  /** Machine Intelligence (gestalt, no food/CG, energy-intensive). Not in baseline but derived. */
  machine: {
    name: "Machine Intelligence",
    stockpiles: { minerals: 200, energy: 300, food: 0, alloys: 100, consumer_goods: 0 },
    unity: 0, research: 0,
    pops: 50,
    year: 2200, month: 1,
    capital_tier: 0,
    planets: [{
      name: "Homeworld",
      planet_class: "machine_world",
      size: 20,
      districts: { mining: 2, generator: 3, agriculture: 0, city: 2 },
      buildings: [],
      max_buildings: 4,
      pops: 50,
    }],
  },

  /** Corporate empire (trade-focused variant of regular). 4/34 baseline empires. */
  corporate: {
    name: "Corporate Empire",
    stockpiles: { minerals: 200, energy: 200, food: 100, alloys: 100, consumer_goods: 100 },
    unity: 0, research: 0,
    pops: 52,
    year: 2200, month: 1,
    capital_tier: 0,
    planets: [{
      name: "Homeworld",
      planet_class: "standard",
      size: 20,
      districts: { mining: 2, generator: 2, agriculture: 2, city: 2 },
      buildings: [],
      max_buildings: 4,
      pops: 52,
    }],
  },

  /** Fanatic Purifier (front-loaded threat start). 2/34, notably empire 170 with 12800 pops. */
  purifier: {
    name: "Fanatic Purifier",
    stockpiles: { minerals: 200, energy: 200, food: 100, alloys: 200, consumer_goods: 50 },
    unity: 0, research: 0,
    pops: 52,
    year: 2200, month: 1,
    capital_tier: 0,
    planets: [{
      name: "Homeworld",
      planet_class: "standard",
      size: 20,
      districts: { mining: 3, generator: 2, agriculture: 1, city: 2 },
      buildings: [],
      max_buildings: 4,
      pops: 52,
    }],
  },
};

// ============================================================
// ORIGIN MODIFIERS — applied on top of starting templates
// Origins change starting conditions: pops, districts, stockpiles,
// planet size, and sometimes economy weights.
// ============================================================

const ORIGIN_MODIFIERS = {
  origin_default: {}, // Prosperous Unification — no changes (baseline)
  origin_prosperous_unification: {
    pops_add: 4, extra_districts: { generator: 1, agriculture: 1 },
    happiness_years: 20, notes: "Extra pops + districts + 20yr happiness/amenities bonus",
  },
  origin_mechanists: {
    extra_techs: 3, extra_pops: 4, // robot assembly from day 1
    stockpile_add: { alloys: -50 }, // alloys spent on initial robots
    economy_overrides: { research: 1.5 },
    notes: "Robots assemble alongside bio pops; doubles effective pop growth",
  },
  origin_doomsday: {
    homeworld_years: 40, // planet explodes in 35-45 years
    economy_overrides: { expansion: 3.0, alloy: 1.5 },
    notes: "Must colonize before homeworld dies; extreme expansion pressure",
  },
  origin_void_dwellers: {
    planet_size_override: 6, // habitats are small
    extra_districts: { city: -1 }, // different district layout
    stockpile_add: { alloys: 200 },
    economy_overrides: { expansion: 0.5 },
    notes: "Habitat start; small planets, specialized production, low expansion",
  },
  origin_shattered_ring: {
    planet_size_override: 10, // ring world segment
    stockpile_add: { alloys: 100 },
    economy_overrides: { research: 2.0 },
    notes: "Single ring world segment; excellent research, limited districts",
  },
  origin_clone_army: {
    pops_add: 6, // clone soldier pops
    notes: "Free armies; pop growth capped later but strong early",
  },
  origin_hegemon: {
    economy_overrides: { expansion: 0.5 },
    notes: "Starts as federation president with 2 subjects; diplomatic leverage",
  },
  origin_common_ground: {
    economy_overrides: { expansion: 0.5 },
    notes: "Starts in a federation; mutual defense from day 1",
  },
  origin_tree_of_life: {
    pops_add: 2,
    economy_overrides: { expansion: 1.5 },
    notes: "Hive mind origin; Tree of Life planetary feature boosts growth",
  },
  origin_necrophage: {
    economy_overrides: { unity: 1.5 },
    notes: "Necrophage pops convert other species; unique pop growth mechanic",
  },
  origin_syncretic_evolution: {
    pops_add: 6, // servile species pops
    notes: "Extra worker pops (servile species) from day 1",
  },
  origin_life_seeded: {
    planet_size_override: 25, pops_add: 10,
    notes: "Massive Gaia world; excellent start but only 1 habitable planet class",
  },
  origin_remnants: {
    economy_overrides: { research: 1.5 },
    notes: "Relic world start with research bonuses",
  },
  origin_lost_colony: {
    notes: "Advanced empire exists; diplomatic relationship from start",
  },
  origin_subterranean: {
    economy_overrides: { military: 1.5 },
    notes: "Underground empire; defensive bonuses, fewer districts",
  },
  origin_teachers_of_the_shroud: {
    economy_overrides: { unity: 2.0 },
    notes: "Psionic origin; strong unity and shroud access",
  },
  origin_imperial_fiefdom: {
    economy_overrides: { alloy: 0.75 },
    notes: "Start as vassal; limited expansion until independence",
  },
  origin_fear_of_the_dark: {
    notes: "Flavor origin with minor archaeological bonuses",
  },
  origin_galactic_doorstep: {
    economy_overrides: { expansion: 1.25 },
    notes: "Dormant gateway; early megastructure access",
  },
  origin_riftworld: {
    economy_overrides: { research: 1.25 },
    notes: "Astral rift on homeworld; research and astral thread bonuses",
  },
  origin_ocean_paradise: {
    planet_size_override: 30, pops_add: 5,
    notes: "Huge ocean world; excellent start for aquatic species",
  },
  origin_primal_calling: {
    economy_overrides: { expansion: 2.0, military: 1.5 },
    notes: "Wild hive mind; aggressive expansion with beasts",
  },
};

/** Resolve a starting template by name, with optional origin modifier. */
function getStartingState(templateName, originId) {
  const template = STARTING_TEMPLATES[templateName] || STARTING_TEMPLATES.regular;
  const origin = ORIGIN_MODIFIERS[originId] || {};

  const state = {
    minerals: template.stockpiles.minerals + (origin.stockpile_add?.minerals || 0),
    energy: template.stockpiles.energy + (origin.stockpile_add?.energy || 0),
    food: template.stockpiles.food + (origin.stockpile_add?.food || 0),
    alloys: template.stockpiles.alloys + (origin.stockpile_add?.alloys || 0),
    consumer_goods: template.stockpiles.consumer_goods + (origin.stockpile_add?.consumer_goods || 0),
    unity: template.unity,
    research: template.research,
    pops: template.pops + (origin.pops_add || 0),
    year: template.year,
    month: template.month,
    capital_tier: template.capital_tier,
    planets: JSON.parse(JSON.stringify(template.planets)),
    building_queue: null,
    district_queue: null,
    origin: originId || "origin_default",
  };

  // Apply planet size override
  if (origin.planet_size_override) {
    state.planets[0].size = origin.planet_size_override;
  }

  // Apply extra districts
  if (origin.extra_districts) {
    for (const [dtype, count] of Object.entries(origin.extra_districts)) {
      state.planets[0].districts[dtype] = (state.planets[0].districts[dtype] || 0) + count;
    }
  }

  // Apply pops to planet too
  state.planets[0].pops = state.pops;

  return state;
}

// Legacy alias
const BASE_START = getStartingState("regular");

// ============================================================
// PERSONALITY PRESETS
// ============================================================

const PERSONALITIES = {
  default: {
    name: "Default (Balanced)",
    template: "regular", origin: "origin_default",
    ethics: [],
    alloy_factor: 1.0, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.0, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 15,
  },
  materialist: {
    name: "Knowledge Seeker (Materialist)",
    template: "regular", origin: "origin_default",
    ethics: ["materialist"],
    alloy_factor: 1.0, research_factor: 2.5, unity_factor: 1.0,
    military_factor: 0.75, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 10,
  },
  materialist_mechanist: {
    name: "Knowledge Seeker (Mechanist Origin)",
    template: "regular", origin: "origin_mechanists",
    ethics: ["materialist"],
    alloy_factor: 1.0, research_factor: 3.0, unity_factor: 1.0,
    military_factor: 0.75, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 8,
  },
  militarist: {
    name: "Aggressive Expansionist (Militarist)",
    template: "regular", origin: "origin_default",
    ethics: ["militarist"],
    alloy_factor: 2.0, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.5, expansion_factor: 1.25,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 5, cg_threshold: 5,
    research_threshold: 20,
  },
  militarist_doomsday: {
    name: "Aggressive Expansionist (Doomsday Origin)",
    template: "regular", origin: "origin_doomsday",
    ethics: ["militarist"],
    alloy_factor: 2.0, research_factor: 0.75, unity_factor: 1.0,
    military_factor: 1.5, expansion_factor: 3.0,
    mineral_threshold: 20, energy_threshold: 10,
    alloy_threshold: 3, cg_threshold: 5,
    research_threshold: 30,
  },
  industrialist: {
    name: "Ruthless Industrialist (Materialist)",
    template: "regular", origin: "origin_prosperous_unification",
    ethics: ["materialist"],
    alloy_factor: 2.5, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.0, expansion_factor: 1.5,
    mineral_threshold: 20, energy_threshold: 10,
    alloy_threshold: 8, cg_threshold: 5,
    research_threshold: 20,
  },
  spiritualist: {
    name: "Evangelizing Zealot (Spiritualist)",
    template: "regular", origin: "origin_default",
    ethics: ["spiritualist"],
    alloy_factor: 1.25, research_factor: 0.75, unity_factor: 2.5,
    military_factor: 1.0, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 25,
  },
  pacifist: {
    name: "Fortress Guardian (Pacifist+Xenophobe)",
    template: "regular", origin: "origin_default",
    ethics: ["pacifist", "xenophobe"],
    alloy_factor: 1.5, research_factor: 0.75, unity_factor: 1.0,
    military_factor: 2.0, expansion_factor: 0.5,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 20,
  },
  pacifist_void: {
    name: "Fortress Guardian (Void Dwellers Origin)",
    template: "regular", origin: "origin_void_dwellers",
    ethics: ["pacifist", "xenophobe"],
    alloy_factor: 1.5, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 2.0, expansion_factor: 0.25,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 15,
  },
  diplomat: {
    name: "Diplomatic Hegemon (Xenophile)",
    template: "regular", origin: "origin_default",
    ethics: ["xenophile"],
    alloy_factor: 1.0, research_factor: 1.5, unity_factor: 1.5,
    military_factor: 0.75, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 12, cg_threshold: 5,
    research_threshold: 15,
  },
  hive: {
    name: "Hive Mind (Gestalt)",
    template: "hive_mind", origin: "origin_tree_of_life",
    ethics: ["gestalt"],
    alloy_factor: 1.5, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.0, expansion_factor: 1.25,
    mineral_threshold: 20, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 0,
    research_threshold: 15,
  },
  machine: {
    name: "Machine Intelligence (Gestalt)",
    template: "machine", origin: "origin_default",
    ethics: ["gestalt"],
    alloy_factor: 1.5, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.0, expansion_factor: 1.25,
    mineral_threshold: 20, energy_threshold: 15,
    alloy_threshold: 10, cg_threshold: 0,
    research_threshold: 15,
  },
  purifier: {
    name: "Fanatic Purifier",
    template: "purifier", origin: "origin_default",
    ethics: ["xenophobe", "militarist"],
    alloy_factor: 2.5, research_factor: 0.75, unity_factor: 1.0,
    military_factor: 2.0, expansion_factor: 1.5,
    mineral_threshold: 20, energy_threshold: 10,
    alloy_threshold: 5, cg_threshold: 5,
    research_threshold: 25,
  },
};

// ============================================================
// SIMULATION ENGINE
// ============================================================

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getPlanetJobs(planet) {
  const jobs = {};
  // District jobs
  for (const [type, count] of Object.entries(planet.districts)) {
    const djobs = DISTRICT_JOBS[type];
    for (const [job, perDistrict] of Object.entries(djobs)) {
      jobs[job] = (jobs[job] || 0) + perDistrict * count;
    }
  }
  // Building jobs
  for (const btype of planet.buildings) {
    const bjobs = BUILDING_JOBS[btype];
    if (bjobs) {
      for (const [job, count] of Object.entries(bjobs)) {
        jobs[job] = (jobs[job] || 0) + count;
      }
    }
  }
  return jobs;
}

function getPlanetHousing(planet) {
  let housing = 0;
  for (const [type, count] of Object.entries(planet.districts)) {
    housing += (DISTRICT_HOUSING[type] || 0) * count;
  }
  // Capital building housing
  const capTier = planet.buildings.filter(b => b.startsWith("capital_")).length;
  housing += capTier >= 2 ? 8 : capTier >= 1 ? 5 : 3; // base capital housing
  return housing;
}

function calculateIncome(state) {
  const income = {
    minerals: 0, energy: 0, food: 0, alloys: 0,
    consumer_goods: 0, unity: 0, research: 0,
  };

  for (const planet of state.planets) {
    const jobs = getPlanetJobs(planet);
    const housing = getPlanetHousing(planet);
    const availablePops = planet.pops;

    // Fill jobs by priority: specialists first, then workers
    const specialistJobs = ["politician", "enforcer", "researcher", "metallurgist",
                            "artisan", "bureaucrat", "priest", "soldier", "healthcare"];
    const workerJobs = ["miner", "technician", "farmer", "clerk"];

    let remainingPops = availablePops;
    const filledJobs = {};

    // Fill specialist jobs first (up to available)
    for (const job of specialistJobs) {
      const available = jobs[job] || 0;
      const filled = Math.min(available, remainingPops);
      if (filled > 0) {
        filledJobs[job] = filled;
        remainingPops -= filled;
      }
    }
    // Fill worker jobs
    for (const job of workerJobs) {
      const available = jobs[job] || 0;
      const filled = Math.min(available, remainingPops);
      if (filled > 0) {
        filledJobs[job] = filled;
        remainingPops -= filled;
      }
    }

    // Calculate production
    for (const [job, workers] of Object.entries(filledJobs)) {
      const prod = JOB_PRODUCTION[job];
      if (!prod) continue;
      for (const [resource, perWorker] of Object.entries(prod)) {
        if (resource in income) {
          income[resource] += perWorker * workers;
        }
      }
    }

    // Building energy upkeep
    for (const btype of planet.buildings) {
      income.energy -= BUILDING_UPKEEP_ENERGY[btype] || 0;
    }

    // District energy upkeep: -1 for resource districts, -2 for city
    for (const [dtype, count] of Object.entries(planet.districts)) {
      if (dtype === "city") {
        income.energy -= 2 * count;
      } else {
        income.energy -= 1 * count;
      }
    }
  }

  // Empire base income (country_base from save game data)
  income.energy += EMPIRE_BASE_INCOME.energy;
  income.minerals += EMPIRE_BASE_INCOME.minerals;
  income.food += EMPIRE_BASE_INCOME.food;
  income.alloys += EMPIRE_BASE_INCOME.alloys;
  income.consumer_goods += EMPIRE_BASE_INCOME.consumer_goods;
  income.unity += EMPIRE_BASE_INCOME.unity;
  income.research += EMPIRE_BASE_INCOME.physics_research; // simplified: use physics as proxy

  // Passive income from trade, orbital deposits, starbases
  income.energy += EMPIRE_PASSIVE_INCOME.energy;
  income.minerals += EMPIRE_PASSIVE_INCOME.minerals;

  // Empire-level upkeep (buildings, ships, leaders, etc. — averaged from baseline)
  income.energy -= 43;  // observed average expenses for regular empire
  income.minerals -= 15; // pop upkeep + building maintenance
  income.food -= 20;     // pop food consumption
  income.consumer_goods -= 15; // pop CG needs (living standards)

  return income;
}

function getTotalDistricts(planet) {
  return Object.values(planet.districts).reduce((s, n) => s + n, 0);
}

function getFreeDistricts(planet) {
  return planet.size - getTotalDistricts(planet);
}

function getFreeBuildingSlots(planet) {
  return planet.max_buildings - planet.buildings.length;
}

// ============================================================
// GATE SYSTEM — from research/findings/gameflow_loops.md
// Each gate prevents building a downstream converter when its
// upstream resource can't sustain the drain.
// ============================================================

const GATES = {
  /** G1: Mineral income gate for mineral-consuming buildings.
   *  Metallurgists drain 6 min/100 WF, artisans drain 6 min/100 WF.
   *  Threshold 15 = "one mining district can't cover a new foundry." */
  mineral: (income) => income.minerals < 15 ? 0.1 : 1.0,

  /** G2: Consumer Goods income gate for CG-consuming buildings.
   *  Researchers/bureaucrats/priests drain 2 CG/100 WF.
   *  Threshold 2 = "barely afford one specialist slot, don't add 200 more." */
  consumer_goods: (income) => income.consumer_goods < 2 ? 0.1 : 1.0,

  /** G3: Stricter mineral gate for strategic resource refineries.
   *  Chemists/translucers/gas refiners drain 10 min/100 WF (67% more than metallurgists).
   *  Threshold 25 = "an empire at 20 minerals can sustain a foundry but not a refinery." */
  mineral_strict: (income) => income.minerals < 25 ? 0.1 : 1.0,

  /** G4: Strategic resource gate for T2/T3 building upgrades.
   *  Buildings require ongoing strategic resource upkeep; deficit shuts them down.
   *  Returns gate factor for a given strategic resource income. */
  strategic: (income, resource) => (income[resource] || 0) < 1 ? 0.1 : 1.0,

  /** G5: Alloy income gate for expansion decisions (colony ships, starbases).
   *  Below 5 alloys/mo, a starbase takes 20 months of savings.
   *  This gates expansion, not production buildings. */
  alloy_expansion: (income) => income.alloys < 5 ? 0.1 : 1.0,

  /** G6: Energy surplus gate for high-upkeep T2/T3 buildings (5-8 EC each).
   *  Softer gate (0.25 not 0.1) because energy deficits are recoverable via market. */
  energy_high_upkeep: (income) => income.energy < 5 ? 0.25 : 1.0,
};

/** Conversion ratios from gameflow_loops.md — used for upstream pressure detection. */
const CONVERSION_RATIOS = {
  // Tier 1: mineral consumers
  metallurgist:  { input: "minerals", output: "alloys",         ratio: 0.5 },  // 6 min → 3 alloys
  artisan:       { input: "minerals", output: "consumer_goods", ratio: 1.0 },  // 6 min → 6 CG
  chemist:       { input: "minerals", output: "volatile_motes", ratio: 0.2 },  // 10 min → 2 motes
  translucer:    { input: "minerals", output: "rare_crystals",  ratio: 0.2 },  // 10 min → 2 crystals
  gas_refiner:   { input: "minerals", output: "exotic_gases",   ratio: 0.2 },  // 10 min → 2 gases
  // Tier 2: CG consumers
  researcher:    { input: "consumer_goods", output: "research",  ratio: 1.5 },  // 2 CG → 3 research
  bureaucrat:    { input: "consumer_goods", output: "unity",     ratio: 1.5 },  // 2 CG → 3 unity
  priest:        { input: "consumer_goods", output: "unity",     ratio: 2.0 },  // 2 CG → 4 unity
  trader:        { input: "consumer_goods", output: "trade",     ratio: 8.0 },  // 1 CG → 8 trade
};

/** Detect if the economy is in a specific game phase based on state.
 *  From gameflow_loops.md "Phase Transitions" section. */
function getGamePhase(state) {
  const year = state.year;
  if (year < 2230) return "early";     // District-driven economy
  if (year < 2300) return "mid";       // Building-driven specialization
  return "late";                        // Megastructure economy
}

// ============================================================
// WEIGHT RESOLVER — The Sovereign AI decision engine
// ============================================================

function evaluateWeights(state, personality) {
  const income = calculateIncome(state);
  const planet = state.planets[0]; // homeworld focus for early game
  const freeDistricts = getFreeDistricts(planet);
  const freeBuildingSlots = getFreeBuildingSlots(planet);
  const freeHousing = getPlanetHousing(planet) - planet.pops;

  const candidates = [];

  // Skip if both queues are full
  if (state.building_queue && state.district_queue) return null;

  // --- CAPITAL UPGRADES (highest priority — doesn't consume building slot) ---
  if (!state.building_queue) {
    if (state.capital_tier === 0 && planet.pops >= 10 && state.minerals >= BUILDING_COST.capital_1) {
      let w = 400; // Always top priority when eligible
      if (state.minerals < 200) w *= 0.1;
      candidates.push({ type: "building", id: "capital_1", weight: w, reason: `Capital upgrade (${Math.floor(planet.pops)} pops) → +2 building slots` });
    }
    if (state.capital_tier === 1 && planet.pops >= 25 && state.minerals >= BUILDING_COST.capital_2) {
      let w = 400;
      if (state.minerals < 300) w *= 0.1;
      candidates.push({ type: "building", id: "capital_2", weight: w, reason: `Capital T2 (${Math.floor(planet.pops)} pops) → +2 building slots` });
    }
  }

  // --- DISTRICTS (only if no district is building and slots available) ---
  if (!state.district_queue && freeDistricts > 0) {
    const planetClass = PLANET_CLASSES[planet.planet_class || "standard"] || PLANET_CLASSES.standard;
    const availableDistricts = new Set(planetClass.available_districts);
    const districtCostCurrency = planetClass.cost_currency; // "minerals" or "alloys"

    // Mining district — Loop 1 foundation: feeds ALL Tier 1 converters
    if (availableDistricts.has("mining") || availableDistricts.has("hab_mining")) {
      let w = 0;
      if (income.minerals < personality.mineral_threshold) w += 100;
      if (income.minerals < 0) w += 200;
      // Downstream pressure: mineral gates are blocking converters
      // If foundries/factories WANT to build but G1 is blocking them, we need more minerals
      if (GATES.mineral(income) < 1.0 && income.alloys < personality.alloy_threshold) w += 100;
      if (GATES.mineral(income) < 1.0 && income.consumer_goods < personality.cg_threshold) w += 75;
      // Penalties
      if (income.minerals > 100) w *= 0.25;
      if (freeHousing < 0) w *= 0.1;
      if (state.minerals >= DISTRICT_COST.mining && w > 1) {
        candidates.push({ type: "district", id: "mining", weight: w, reason: `Minerals ${income.minerals.toFixed(0)}/mo (need ${personality.mineral_threshold})${GATES.mineral(income) < 1 ? " [G1 BLOCKING]" : ""}` });
      }
    }

    // Generator district — Energy is substrate for everything (building upkeep)
    if (availableDistricts.has("generator") || availableDistricts.has("hab_energy")) {
      let w = 0;
      if (income.energy < personality.energy_threshold) w += 100;
      if (income.energy < 0) w += 200;
      // Downstream pressure: G6 blocking T2/T3 buildings
      if (GATES.energy_high_upkeep(income) < 1.0) w += 75;
      // Surplus brake — energy has diminishing value beyond upkeep coverage
      if (income.energy > 50) w *= 0.25;
      if (freeHousing < 0) w *= 0.1;
      if (state.minerals >= DISTRICT_COST.generator && w > 1) {
        candidates.push({ type: "district", id: "generator", weight: w, reason: `Energy ${income.energy.toFixed(0)}/mo (need ${personality.energy_threshold})${GATES.energy_high_upkeep(income) < 1 ? " [G6 BLOCKING]" : ""}` });
      }
    }

    // Agriculture district — Loop 1: Food → Pop Growth → more workers
    if (availableDistricts.has("agriculture")) {
      let w = 0;
      if (income.food < 5) w += 100;
      if (income.food < 0) w += 200;
      // Gestalt hive minds consume more food (no CG economy, food is the pop resource)
      if (personality.ethics.includes("gestalt") && income.food < 10) w += 50;
      // Surplus brake — food surplus is the most common early waste
      if (income.food > 30) w *= 0.1;
      // Hard block: machine empires don't use food
      if (personality.template === "machine") w = 0;
      if (freeHousing < 0) w *= 0.1;
      if (state.minerals >= DISTRICT_COST.agriculture && w > 1) {
        candidates.push({ type: "district", id: "agriculture", weight: w, reason: `Food ${income.food.toFixed(0)}/mo` });
      }
    }

    // City district (housing + building slots)
    if (availableDistricts.has("city") || availableDistricts.has("hab_housing")) {
      let w = 0;
      if (freeHousing < 0) w += 200;
      if (freeHousing < 3 && planet.pops > 10) w += 100;
      if (freeBuildingSlots < 1 && planet.pops > 15) w += 100;
      if (freeHousing > 15) w *= 0.01;
      if (state.minerals >= DISTRICT_COST.city && w > 1) {
        candidates.push({ type: "district", id: "city", weight: w, reason: `Housing ${freeHousing.toFixed(0)}, bldg slots ${freeBuildingSlots}` });
      }
    }
  }

  // --- BUILDINGS (only if no building is constructing and slots available) ---
  if (!state.building_queue && freeBuildingSlots > 0) {
    const phase = getGamePhase(state);

    // Alloy Foundry — Loop 2: Minerals → Alloys (metallurgist: 6 min in, 3 alloys out)
    {
      let w = 0;
      if (income.alloys < personality.alloy_threshold) w += 100;
      if (income.alloys < 3) w += 200;
      w *= personality.alloy_factor;
      // Surplus brake
      if (income.alloys > 50) w *= 0.25;
      // G1: Mineral income gate — prevents cascade deficit
      w *= GATES.mineral(income);
      // G6: Energy gate (foundries cost 2 EC upkeep)
      w *= GATES.energy_high_upkeep(income);
      if (freeBuildingSlots < 2) w *= 0.5;
      if (state.minerals >= BUILDING_COST.alloy_foundry && w > 1) {
        candidates.push({ type: "building", id: "alloy_foundry", weight: w, reason: `Alloys ${income.alloys.toFixed(0)}/mo (${personality.alloy_factor}x) [G1:${GATES.mineral(income)}]` });
      }
    }

    // Research Lab — Loop 5: CG → Research (researcher: 2 CG in, 3 research out)
    {
      let w = 0;
      if (income.research < personality.research_threshold) w += 100;
      w *= personality.research_factor;
      // G2: CG income gate — researchers consume 2 CG each
      w *= GATES.consumer_goods(income);
      // Surplus brake
      if (income.research > 80) w *= 0.25;
      if (freeBuildingSlots < 2) w *= 0.5;
      if (state.minerals >= BUILDING_COST.research_lab && w > 1) {
        candidates.push({ type: "building", id: "research_lab", weight: w, reason: `Research ${income.research.toFixed(0)}/mo (${personality.research_factor}x) [G2:${GATES.consumer_goods(income)}]` });
      }
    }

    // Civilian Industries — Loop 3: Minerals → CG (artisan: 6 min in, 6 CG out)
    {
      let w = 0;
      if (income.consumer_goods < personality.cg_threshold) w += 100;
      if (income.consumer_goods < 0) w += 200;
      // Upstream pressure: if research/unity buildings are gated on CG, boost CG priority
      if (income.research < personality.research_threshold && income.consumer_goods < 5) w += 50;
      // Surplus brake
      if (income.consumer_goods > 25) w *= 0.25;
      // G1: Mineral income gate — artisans consume 6 minerals each
      w *= GATES.mineral(income);
      if (freeBuildingSlots < 2) w *= 0.01;
      if (state.minerals >= BUILDING_COST.civilian_industries && w > 1) {
        candidates.push({ type: "building", id: "civilian_industries", weight: w, reason: `CG ${income.consumer_goods.toFixed(0)}/mo [G1:${GATES.mineral(income)}]` });
      }
    }

    // Temple / Admin Office — Loop 6: CG → Unity (bureaucrat/priest: 2 CG in, 3-4 unity out)
    {
      let w = 0;
      if (income.unity < 15) w += 75;
      const hasUnityBuilding = planet.buildings.some(b => b === "temple" || b === "admin_office");
      if (!hasUnityBuilding && planet.pops > 5) w += 50;
      w *= personality.unity_factor;
      // Surplus brake
      if (income.unity > 50) w *= 0.25;
      // G2: CG income gate — priests/bureaucrats consume 2 CG each
      w *= GATES.consumer_goods(income);
      // G1: Mineral gate (CG production itself consumes minerals upstream)
      if (income.minerals < 20) w *= 0.5;
      if (freeBuildingSlots < 2) w *= 0.01;
      const unityId = personality.ethics.includes("spiritualist") ? "temple" : "admin_office";
      if (state.minerals >= BUILDING_COST[unityId] && w > 1) {
        candidates.push({ type: "building", id: unityId, weight: w, reason: `Unity ${income.unity.toFixed(0)}/mo (${personality.unity_factor}x) [G2:${GATES.consumer_goods(income)}]` });
      }
    }

    // Gene Clinic (low priority — Loop 1: Food → Pop Growth)
    {
      let w = 0;
      if (planet.pops < 20 && freeHousing > 5 && freeBuildingSlots > 3) w += 25;
      w *= 0.25; // permanent penalty — growth buildings are traps
      if (freeBuildingSlots < 4) w *= 0.01;
      if (state.minerals >= BUILDING_COST.gene_clinic && w > 1) {
        candidates.push({ type: "building", id: "gene_clinic", weight: w, reason: "Growth building (low priority)" });
      }
    }

    // Stronghold — Loop 9: Alloys → Military (soldiers add naval cap)
    {
      let w = 0;
      // Crime-gated in real mod; here simplified to personality-driven
      if (personality.ethics.includes("pacifist")) w += 50;
      w *= personality.military_factor;
      // G5: Don't invest in military buildings when alloy income is critical
      w *= GATES.alloy_expansion(income);
      if (freeBuildingSlots < 3) w *= 0.01;
      if (state.minerals >= BUILDING_COST.stronghold && w > 1) {
        candidates.push({ type: "building", id: "stronghold", weight: w, reason: `Military (${personality.military_factor}x) [G5:${GATES.alloy_expansion(income)}]` });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Pick highest weight
  candidates.sort((a, b) => b.weight - a.weight);
  return candidates[0];
}

// ============================================================
// TURN TICK
// ============================================================

function tick(state, personality) {
  const events = [];
  const income = calculateIncome(state);
  const planet = state.planets[0];

  // --- Apply income ---
  state.minerals += income.minerals;
  state.energy += income.energy;
  state.food += income.food;
  state.alloys += income.alloys;
  state.consumer_goods += income.consumer_goods;
  state.unity += income.unity;
  state.research += income.research;

  // Floor resources at 0 (deficit tracking)
  const deficits = {};
  for (const r of ["minerals", "energy", "food", "alloys", "consumer_goods"]) {
    if (state[r] < 0) {
      deficits[r] = state[r];
      state[r] = 0;
    }
  }
  if (Object.keys(deficits).length > 0) {
    events.push(`DEFICIT: ${Object.entries(deficits).map(([r, v]) => `${r} ${v.toFixed(0)}`).join(", ")}`);
  }

  // --- Pop growth ---
  const housing = getPlanetHousing(planet);
  const freeHousing = housing - planet.pops;
  let growthRate = BASE_POP_GROWTH_PER_MONTH;
  if (freeHousing <= 0) growthRate *= 0.25;   // severely reduced when overcrowded
  if (state.food < 0) growthRate *= 0.1;      // starvation
  const hasClinic = planet.buildings.includes("gene_clinic");
  if (hasClinic) growthRate *= 1.05;

  planet.pops += growthRate;
  state.pops = Math.floor(planet.pops);

  // --- Process build queues ---
  if (state.building_queue) {
    state.building_queue.turns_left--;
    if (state.building_queue.turns_left <= 0) {
      const b = state.building_queue;
      if (b.id === "capital_1") {
        state.capital_tier = 1;
        planet.max_buildings = 6; // +2 slots
      } else if (b.id === "capital_2") {
        state.capital_tier = 2;
        planet.max_buildings = 8; // +2 more slots
      } else {
        planet.buildings.push(b.id); // only non-capital buildings consume slots
      }
      events.push(`BUILT: ${b.id}`);
      state.building_queue = null;
    }
  }

  if (state.district_queue) {
    state.district_queue.turns_left--;
    if (state.district_queue.turns_left <= 0) {
      const d = state.district_queue;
      planet.districts[d.id] = (planet.districts[d.id] || 0) + 1;
      events.push(`BUILT: ${d.id} district`);
      state.district_queue = null;
    }
  }

  // --- AI decision ---
  const decision = evaluateWeights(state, personality);
  if (decision) {
    if (decision.type === "district" && !state.district_queue) {
      state.minerals -= DISTRICT_COST[decision.id];
      state.district_queue = {
        id: decision.id,
        turns_left: DISTRICT_BUILD_TIME[decision.id],
      };
      events.push(`QUEUE district: ${decision.id} (w=${decision.weight.toFixed(0)}) — ${decision.reason}`);
    } else if (decision.type === "building" && !state.building_queue) {
      state.minerals -= BUILDING_COST[decision.id];
      state.building_queue = {
        id: decision.id,
        turns_left: BUILDING_BUILD_TIME[decision.id],
      };
      events.push(`QUEUE building: ${decision.id} (w=${decision.weight.toFixed(0)}) — ${decision.reason}`);
    }
  }

  // --- Advance time ---
  state.month++;
  if (state.month > 12) {
    state.month = 1;
    state.year++;
  }

  return { income, events, deficits: Object.keys(deficits).length };
}

// ============================================================
// OUTPUT FORMATTING
// ============================================================

function fmtNum(n) {
  return n >= 0 ? ` +${n.toFixed(1)}`.slice(-6) : `${n.toFixed(1)}`.padStart(6);
}

function fmtStock(n) {
  return Math.floor(n).toString().padStart(5);
}

function printHeader() {
  console.log(
    "  Date   | Pops | Min/mo  Eng/mo  Fod/mo  Aly/mo  CG/mo  Uni/mo  Res/mo | Min$   Eng$   Aly$   CG$  | Events"
  );
  console.log("—".repeat(140));
}

function printTurn(state, result) {
  const date = `${state.year}.${String(state.month).padStart(2, "0")}`;
  const inc = result.income;
  const line = [
    date,
    String(state.pops).padStart(4),
    fmtNum(inc.minerals), fmtNum(inc.energy), fmtNum(inc.food),
    fmtNum(inc.alloys), fmtNum(inc.consumer_goods), fmtNum(inc.unity), fmtNum(inc.research),
    fmtStock(state.minerals), fmtStock(state.energy), fmtStock(state.alloys), fmtStock(state.consumer_goods),
  ];
  const events = result.events.length > 0 ? result.events.join("; ") : "";
  console.log(`${line[0]} | ${line[1]} | ${line.slice(2, 9).join(" ")} | ${line.slice(9).join(" ")} | ${events}`);
}

function printSummary(state, personality, totalDeficits) {
  const income = calculateIncome(state);
  const planet = state.planets[0];
  console.log("\n" + "=".repeat(80));
  console.log(`SUMMARY: ${personality.name}`);
  console.log(`Origin: ${state.origin || "origin_default"}`);
  console.log("=".repeat(80));
  console.log(`Final date: ${state.year}.${String(state.month).padStart(2, "0")}`);
  console.log(`Pops: ${state.pops} | Capital tier: ${state.capital_tier}`);
  console.log(`Districts: ${JSON.stringify(planet.districts)}`);
  console.log(`Buildings: [${planet.buildings.join(", ")}]`);
  console.log(`Building slots: ${getFreeBuildingSlots(planet)} free of ${planet.max_buildings}`);
  console.log(`\nStockpiles: minerals=${Math.floor(state.minerals)} energy=${Math.floor(state.energy)} alloys=${Math.floor(state.alloys)} CG=${Math.floor(state.consumer_goods)}`);
  console.log(`Income/mo: minerals=${income.minerals.toFixed(1)} energy=${income.energy.toFixed(1)} food=${income.food.toFixed(1)} alloys=${income.alloys.toFixed(1)} CG=${income.consumer_goods.toFixed(1)} unity=${income.unity.toFixed(1)} research=${income.research.toFixed(1)}`);
  console.log(`Total research accumulated: ${Math.floor(state.research)}`);
  console.log(`Total unity accumulated: ${Math.floor(state.unity)}`);
  console.log(`Total deficit months: ${totalDeficits}`);
}

// ============================================================
// TEMPLATE LOADER — reads JSON templates from templates/
// ============================================================

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, "..", "..", "templates");

/** Load a template JSON file and convert it to a simulator personality + starting state. */
function loadTemplate(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  return templateToPersonality(raw);
}

/** Convert a Sovereign template JSON object into the simulator's internal format.
 *  This is the bridge between the template schema and the simulator engine.
 *  Works both for loading from files and for receiving templates programmatically. */
function templateToPersonality(tmpl) {
  const eco = tmpl.economy || {};
  const wf = eco.weight_factors || {};
  const dt = eco.deficit_thresholds || {};
  const origins = tmpl.origins || {};

  return {
    name: tmpl.name || tmpl.id,
    template: tmpl.starting_state?.template || "regular",
    origin: origins.default || "origin_default",
    ethics: tmpl.identity?.ethics_match?.required || [],
    // Weight factors
    alloy_factor: wf.alloy || 1.0,
    research_factor: wf.research || 1.0,
    unity_factor: wf.unity || 1.0,
    military_factor: wf.military || 1.0,
    expansion_factor: wf.expansion || 1.0,
    trade_factor: wf.trade || 1.0,
    // Deficit thresholds
    mineral_threshold: dt.minerals || 25,
    energy_threshold: dt.energy || 10,
    alloy_threshold: dt.alloys || 10,
    cg_threshold: dt.consumer_goods || 5,
    research_threshold: dt.research || 15,
    // Starting state overrides from template
    _starting_state: tmpl.starting_state || null,
    _phase_overrides: tmpl.phase_overrides || null,
    _gates: tmpl.gates || null,
    _template_id: tmpl.id || null,
  };
}

/** Discover all template files in the templates/ directory. */
function discoverTemplates() {
  if (!existsSync(TEMPLATE_DIR)) return {};
  const files = readdirSync(TEMPLATE_DIR).filter(f =>
    f.endsWith(".json") && f !== "INDEX.json" && !f.startsWith("sovereign-template")
  );
  const loaded = {};
  for (const file of files) {
    try {
      const tmpl = JSON.parse(readFileSync(join(TEMPLATE_DIR, file), "utf-8"));
      const id = tmpl.id || file.replace(".json", "");
      loaded[id] = templateToPersonality(tmpl);
    } catch { /* skip invalid */ }
  }
  return loaded;
}

/** Resolve a personality by name — checks hardcoded presets first, then template files. */
function resolvePersonality(name) {
  // 1. Hardcoded presets (fast, always available)
  if (PERSONALITIES[name]) return { ...PERSONALITIES[name] };

  // 2. Template file by ID
  const templates = discoverTemplates();
  if (templates[name]) return { ...templates[name] };

  // 3. Template file by filename (without .json)
  const byFile = Object.values(templates).find(t => t._template_id === name);
  if (byFile) return { ...byFile };

  // 4. Direct file path
  if (name.endsWith(".json") && existsSync(name)) {
    return loadTemplate(name);
  }

  // Fallback
  return { ...PERSONALITIES.default };
}

/** List all available personality names (hardcoded + discovered templates). */
function listAllPersonalities() {
  const hardcoded = Object.keys(PERSONALITIES);
  const templates = Object.keys(discoverTemplates());
  // Deduplicate
  return [...new Set([...hardcoded, ...templates])];
}

// ============================================================
// COMPARE MODE
// ============================================================

function runSim(presetNameOrTemplate, turns, verbose = true) {
  // Accept either a preset name string or a raw template object
  let personality;
  if (typeof presetNameOrTemplate === "object") {
    personality = templateToPersonality(presetNameOrTemplate);
  } else {
    personality = resolvePersonality(presetNameOrTemplate);
  }

  const originId = personality.origin || "origin_default";
  const originMod = ORIGIN_MODIFIERS[originId] || {};

  // Apply origin economy overrides to personality weight factors
  if (originMod.economy_overrides) {
    for (const [key, val] of Object.entries(originMod.economy_overrides)) {
      const factorKey = key + "_factor";
      if (factorKey in personality) {
        personality[factorKey] = personality[factorKey] * val;
      } else if (key === "expansion") {
        personality.expansion_factor = (personality.expansion_factor || 1.0) * val;
      }
    }
  }

  // Build starting state — template overrides take precedence
  let state;
  if (personality._starting_state) {
    const ss = personality._starting_state;
    state = {
      minerals: ss.stockpiles?.minerals ?? 200,
      energy: ss.stockpiles?.energy ?? 200,
      food: ss.stockpiles?.food ?? 100,
      alloys: ss.stockpiles?.alloys ?? 100,
      consumer_goods: ss.stockpiles?.consumer_goods ?? 100,
      unity: 0, research: 0,
      pops: ss.pops || 52,
      year: 2200, month: 1,
      capital_tier: ss.capital_tier || 0,
      planets: [{
        name: "Homeworld",
        planet_class: ss.planet_class || personality.template || "standard",
        size: ss.planet_size || 20,
        districts: { ...(ss.districts || { mining: 2, generator: 2, agriculture: 2, city: 2 }) },
        buildings: [],
        max_buildings: ss.max_buildings || 4,
        pops: ss.pops || 52,
      }],
      building_queue: null,
      district_queue: null,
      origin: originId,
    };
    // Apply origin modifiers on top
    const oMod = ORIGIN_MODIFIERS[originId] || {};
    if (oMod.pops_add) { state.pops += oMod.pops_add; state.planets[0].pops = state.pops; }
    if (oMod.planet_size_override) state.planets[0].size = oMod.planet_size_override;
    if (oMod.extra_districts) {
      for (const [d, c] of Object.entries(oMod.extra_districts)) {
        state.planets[0].districts[d] = (state.planets[0].districts[d] || 0) + c;
      }
    }
    if (oMod.stockpile_add) {
      for (const [r, v] of Object.entries(oMod.stockpile_add)) {
        if (r in state) state[r] += v;
      }
    }
  } else {
    state = getStartingState(personality.template || "regular", originId);
  }

  if (verbose) {
    console.log(`\n${"#".repeat(80)}`);
    console.log(`# Sovereign AI Simulator — ${personality.name}`);
    console.log(`# ${turns} turns (${(turns / 12).toFixed(1)} years)`);
    console.log(`${"#".repeat(80)}\n`);
    printHeader();
  }

  let totalDeficits = 0;
  for (let t = 0; t < turns; t++) {
    const result = tick(state, personality);
    totalDeficits += result.deficits;

    if (verbose) {
      // Print every month that has events, or every 6 months for status
      if (result.events.length > 0 || t % 6 === 0) {
        printTurn(state, result);
      }
    }
  }

  if (verbose) {
    printSummary(state, personality, totalDeficits);
  }

  return { state, totalDeficits, income: calculateIncome(state) };
}

function runCompare(turns, filter) {
  const allNames = listAllPersonalities();
  // If filter provided, only compare matching names
  const presets = filter
    ? allNames.filter(n => n.toLowerCase().includes(filter.toLowerCase()))
    : allNames;
  const results = {};

  for (const preset of presets) {
    results[preset] = runSim(preset, turns, false);
  }

  console.log(`\n${"#".repeat(100)}`);
  console.log(`# COMPARISON — ${turns} turns (${(turns / 12).toFixed(1)} years)`);
  console.log(`${"#".repeat(100)}\n`);

  // Header
  const nameWidth = 35;
  const colWidth = 10;
  const cols = ["Pops", "Min/mo", "Eng/mo", "Aly/mo", "CG/mo", "Res/mo", "Uni/mo", "Tot.Res", "Tot.Uni", "Deficits"];
  console.log("Personality".padEnd(nameWidth) + cols.map(c => c.padStart(colWidth)).join(""));
  console.log("—".repeat(nameWidth + cols.length * colWidth));

  for (const [key, r] of Object.entries(results)) {
    const p = resolvePersonality(key);
    const s = r.state;
    const i = r.income;
    const vals = [
      s.pops, i.minerals.toFixed(1), i.energy.toFixed(1), i.alloys.toFixed(1),
      i.consumer_goods.toFixed(1), i.research.toFixed(1), i.unity.toFixed(1),
      Math.floor(s.research), Math.floor(s.unity), r.totalDeficits,
    ];
    console.log(p.name.padEnd(nameWidth) + vals.map(v => String(v).padStart(colWidth)).join(""));
  }

  // Build order comparison
  console.log(`\n${"—".repeat(100)}`);
  console.log("BUILD ORDERS:\n");
  for (const [key, r] of Object.entries(results)) {
    const p = resolvePersonality(key);
    const planet = r.state.planets[0];
    console.log(`  ${p.name} [${r.state.origin}]:`);
    console.log(`    Planet: ${planet.planet_class || "standard"} (size ${planet.size})`);
    console.log(`    Districts: ${JSON.stringify(planet.districts)}`);
    console.log(`    Buildings: [${planet.buildings.join(", ")}]`);
    console.log(`    Capital tier: ${r.state.capital_tier}`);
    console.log();
  }
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);
const preset = args[0] || "default";
const turns = parseInt(args[1]) || 360;

// Parse --flag=value overrides
const overrides = {};
let compareFilter = null;
for (const arg of args.slice(2)) {
  const m = arg.match(/^--(\w[\w-]*)=(.+)$/);
  if (m) {
    const key = m[1].replace(/-/g, "_");
    if (key === "filter") { compareFilter = m[2]; }
    else { overrides[key] = parseFloat(m[2]) || m[2]; }
  }
}

if (preset === "compare") {
  runCompare(turns, compareFilter);
} else if (preset === "help") {
  const allNames = listAllPersonalities();
  console.log(`Sovereign AI Economy Simulator

Usage:
  node sim.mjs [preset|template_id|file.json] [turns] [--overrides]
  node sim.mjs compare [turns] [--filter=keyword]

Hardcoded presets (${Object.keys(PERSONALITIES).length}):
  ${Object.keys(PERSONALITIES).join(", ")}

Template files (${allNames.length - Object.keys(PERSONALITIES).length} from templates/):
  ${allNames.filter(n => !PERSONALITIES[n]).join(", ") || "(none found)"}

Starting templates: ${Object.keys(STARTING_TEMPLATES).join(", ")}

Examples:
  node sim.mjs materialist 360                 Hardcoded preset
  node sim.mjs cooked_well_done 360            Load from templates/cooked_well_done.json
  node sim.mjs AI_knowledge_seeker 240         Load from templates/AI_knowledge_seeker.json
  node sim.mjs pax_romana 360                  Load from templates/pax_romana.json
  node sim.mjs compare 360                     All presets + all templates
  node sim.mjs compare 360 --filter=AI_        Only AI_ templates
  node sim.mjs compare 360 --filter=church     Only templates matching "church"
  node sim.mjs ./custom_template.json 360      Load from arbitrary JSON file
  node sim.mjs default 240 --alloy_factor=3.0  Override preset values

  echo '{"name":"test","economy":{"weight_factors":{"alloy":5}}}' | node sim.mjs --stdin 360
                                               Pipe template JSON via stdin

Overrides (applied to the chosen preset):
  --alloy_factor=N       Alloy building weight multiplier
  --research_factor=N    Research building weight multiplier
  --unity_factor=N       Unity building weight multiplier
  --mineral_threshold=N  Mineral income below which AI builds mining districts
  --energy_threshold=N   Energy income threshold
  --alloy_threshold=N    Alloy income threshold for foundry building
  --cg_threshold=N       Consumer goods income threshold
  --research_threshold=N Research income threshold for lab building
  --filter=KEYWORD       (compare mode) Only compare templates matching keyword`);
} else if (preset === "--stdin") {
  // Read template JSON from stdin for programmatic use
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", chunk => { input += chunk; });
  process.stdin.on("end", () => {
    try {
      const tmpl = JSON.parse(input);
      const result = runSim(tmpl, turns, true);
      // Output machine-readable result on stderr for piping
      console.error(JSON.stringify({
        template_id: tmpl.id,
        turns,
        final_pops: result.state.pops,
        deficits: result.totalDeficits,
        income: result.income,
        districts: result.state.planets[0].districts,
        buildings: result.state.planets[0].buildings,
      }));
    } catch (e) {
      console.error("Failed to parse stdin template:", e.message);
      process.exit(1);
    }
  });
} else {
  // Resolve personality from preset name, template ID, or file path
  const pers = resolvePersonality(preset);

  // Apply CLI overrides
  for (const [k, v] of Object.entries(overrides)) {
    if (k in pers) pers[k] = v;
  }

  // Temporarily inject into PERSONALITIES so runSim can find it
  PERSONALITIES[preset] = pers;
  runSim(preset, turns, true);
}
