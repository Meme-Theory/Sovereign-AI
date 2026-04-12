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

const DISTRICT_COST = { mining: 300, generator: 300, agriculture: 300, city: 500 };
const DISTRICT_BUILD_TIME = { mining: 8, generator: 8, agriculture: 8, city: 16 }; // months
const DISTRICT_HOUSING = { mining: 2, generator: 2, agriculture: 2, city: 5 };
const DISTRICT_JOBS = {
  mining: { miner: 2 },
  generator: { technician: 2 },
  agriculture: { farmer: 2 },
  city: { clerk: 1 }, // simplified — real specialization varies
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
  miner:        { minerals: 4 },
  technician:   { energy: 4 },
  farmer:       { food: 4 },
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

// Starting empire state
const BASE_START = {
  minerals: 200, energy: 200, food: 100, alloys: 100,
  consumer_goods: 100, unity: 0, research: 0,
  pops: 28,
  year: 2200, month: 1,
  capital_tier: 0, // 0=basic, 1=admin, 2=capital
  planets: [{
    name: "Homeworld",
    size: 20, // max district slots
    districts: { mining: 2, generator: 2, agriculture: 1, city: 1 },
    buildings: [],
    max_buildings: 4, // base building slots (increases with capital upgrades)
    pops: 28,
  }],
  building_queue: null, // { type, planet, turns_left }
  district_queue: null,
};

// ============================================================
// PERSONALITY PRESETS
// ============================================================

const PERSONALITIES = {
  default: {
    name: "Default (Balanced)",
    ethics: [],
    alloy_factor: 1.0, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.0, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 15,
  },
  materialist: {
    name: "Knowledge Seeker (Materialist)",
    ethics: ["materialist"],
    alloy_factor: 1.0, research_factor: 2.5, unity_factor: 1.0,
    military_factor: 0.75, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 10, // builds labs earlier
  },
  militarist: {
    name: "Aggressive Expansionist (Militarist)",
    ethics: ["militarist"],
    alloy_factor: 2.0, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.5, expansion_factor: 1.25,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 5, // wants alloys sooner
    cg_threshold: 5,
    research_threshold: 20,
  },
  industrialist: {
    name: "Ruthless Industrialist (Materialist)",
    ethics: ["materialist"],
    alloy_factor: 2.5, research_factor: 1.0, unity_factor: 1.0,
    military_factor: 1.0, expansion_factor: 1.5,
    mineral_threshold: 20, energy_threshold: 10,
    alloy_threshold: 8, cg_threshold: 5,
    research_threshold: 20,
  },
  spiritualist: {
    name: "Evangelizing Zealot (Spiritualist)",
    ethics: ["spiritualist"],
    alloy_factor: 1.25, research_factor: 0.75, unity_factor: 2.5,
    military_factor: 1.0, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 25,
  },
  pacifist: {
    name: "Fortress Guardian (Pacifist+Xenophobe)",
    ethics: ["pacifist", "xenophobe"],
    alloy_factor: 1.5, research_factor: 0.75, unity_factor: 1.0,
    military_factor: 2.0, expansion_factor: 0.5,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 10, cg_threshold: 5,
    research_threshold: 20,
  },
  diplomat: {
    name: "Diplomatic Hegemon (Xenophile)",
    ethics: ["xenophile"],
    alloy_factor: 1.0, research_factor: 1.5, unity_factor: 1.5,
    military_factor: 0.75, expansion_factor: 1.0,
    mineral_threshold: 25, energy_threshold: 10,
    alloy_threshold: 12, cg_threshold: 5,
    research_threshold: 15,
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
  }

  // Empire-level upkeep (simplified)
  income.energy -= 3; // base empire upkeep

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
    // Mining district
    {
      let w = 0;
      if (income.minerals < personality.mineral_threshold) w += 100;
      if (income.minerals < 0) w += 200;
      // Upstream pressure: need alloys but mineral base is too weak to support foundries
      if (income.alloys < personality.alloy_threshold && income.minerals < 30) w += 75;
      // Penalties
      if (income.minerals > 100) w *= 0.25;
      if (freeHousing < 0) w *= 0.1;
      if (state.minerals >= DISTRICT_COST.mining && w > 1) {
        candidates.push({ type: "district", id: "mining", weight: w, reason: `Minerals ${income.minerals.toFixed(0)}/mo (need ${personality.mineral_threshold})` });
      }
    }

    // Generator district
    {
      let w = 0;
      if (income.energy < personality.energy_threshold) w += 100;
      if (income.energy < 0) w += 200;
      if (income.energy > 50) w *= 0.25;
      if (freeHousing < 0) w *= 0.1;
      if (state.minerals >= DISTRICT_COST.generator && w > 1) {
        candidates.push({ type: "district", id: "generator", weight: w, reason: `Energy ${income.energy.toFixed(0)}/mo (need ${personality.energy_threshold})` });
      }
    }

    // Agriculture district
    {
      let w = 0;
      if (income.food < 5) w += 100;
      if (income.food < 0) w += 200;
      if (income.food > 30) w *= 0.1;
      if (freeHousing < 0) w *= 0.1;
      if (state.minerals >= DISTRICT_COST.agriculture && w > 1) {
        candidates.push({ type: "district", id: "agriculture", weight: w, reason: `Food ${income.food.toFixed(0)}/mo deficit` });
      }
    }

    // City district (housing + building slots)
    {
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
    // Alloy Foundry
    {
      let w = 0;
      if (income.alloys < personality.alloy_threshold) w += 100;
      if (income.alloys < 3) w += 200;
      w *= personality.alloy_factor;
      // War would add factor here (not modeled yet)
      if (income.alloys > 50) w *= 0.25;
      // THE critical fix: don't build foundries if mineral income can't sustain them
      // Each foundry drains 12 minerals/mo (2 metallurgists * 6 minerals each)
      if (income.minerals < 15) w *= 0.1;
      if (freeBuildingSlots < 2) w *= 0.5; // softer penalty — alloys are important
      if (state.minerals >= BUILDING_COST.alloy_foundry && w > 1) {
        candidates.push({ type: "building", id: "alloy_foundry", weight: w, reason: `Alloys ${income.alloys.toFixed(0)}/mo (${personality.alloy_factor}x factor)` });
      }
    }

    // Research Lab
    {
      let w = 0;
      if (income.research < personality.research_threshold) w += 100;
      w *= personality.research_factor;
      if (income.consumer_goods < 2) w *= 0.1; // CG gate — can't afford researcher upkeep
      if (income.research > 80) w *= 0.25;
      if (freeBuildingSlots < 2) w *= 0.5;
      if (state.minerals >= BUILDING_COST.research_lab && w > 1) {
        candidates.push({ type: "building", id: "research_lab", weight: w, reason: `Research ${income.research.toFixed(0)}/mo (${personality.research_factor}x factor)` });
      }
    }

    // Civilian Industries
    {
      let w = 0;
      if (income.consumer_goods < personality.cg_threshold) w += 100;
      if (income.consumer_goods < 0) w += 200;
      if (income.consumer_goods > 25) w *= 0.25;
      if (income.minerals < 15) w *= 0.1;
      if (freeBuildingSlots < 2) w *= 0.01;
      if (state.minerals >= BUILDING_COST.civilian_industries && w > 1) {
        candidates.push({ type: "building", id: "civilian_industries", weight: w, reason: `CG ${income.consumer_goods.toFixed(0)}/mo deficit` });
      }
    }

    // Temple / Unity building
    {
      let w = 0;
      if (income.unity < 15) w += 75;
      const hasUnityBuilding = planet.buildings.some(b => b === "temple" || b === "admin_office");
      if (!hasUnityBuilding && planet.pops > 5) w += 50;
      w *= personality.unity_factor;
      if (income.unity > 50) w *= 0.25;
      if (income.consumer_goods < 3) w *= 0.1;
      if (freeBuildingSlots < 2) w *= 0.01;
      const unityId = personality.ethics.includes("spiritualist") ? "temple" : "admin_office";
      if (state.minerals >= BUILDING_COST[unityId] && w > 1) {
        candidates.push({ type: "building", id: unityId, weight: w, reason: `Unity ${income.unity.toFixed(0)}/mo (${personality.unity_factor}x factor)` });
      }
    }

    // Gene Clinic (low priority)
    {
      let w = 0;
      if (planet.pops < 20 && freeHousing > 5 && freeBuildingSlots > 3) w += 25;
      w *= 0.25; // permanent penalty
      if (freeBuildingSlots < 4) w *= 0.01;
      if (state.minerals >= BUILDING_COST.gene_clinic && w > 1) {
        candidates.push({ type: "building", id: "gene_clinic", weight: w, reason: "Growth building (low priority)" });
      }
    }

    // Stronghold (situational — not modeled heavily in peacetime)
    {
      let w = 0;
      w *= personality.military_factor;
      // Only if fortress guardian personality
      if (personality.ethics.includes("pacifist")) w += 50;
      if (freeBuildingSlots < 3) w *= 0.01;
      if (state.minerals >= BUILDING_COST.stronghold && w > 1) {
        candidates.push({ type: "building", id: "stronghold", weight: w, reason: "Military building" });
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
// COMPARE MODE
// ============================================================

function runSim(presetName, turns, verbose = true) {
  const personality = PERSONALITIES[presetName] || PERSONALITIES.default;
  const state = deepClone(BASE_START);

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

function runCompare(turns) {
  const presets = Object.keys(PERSONALITIES);
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
    const p = PERSONALITIES[key];
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
    const p = PERSONALITIES[key];
    const planet = r.state.planets[0];
    console.log(`  ${p.name}:`);
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
for (const arg of args.slice(2)) {
  const m = arg.match(/^--(\w[\w-]*)=(.+)$/);
  if (m) overrides[m[1].replace(/-/g, "_")] = parseFloat(m[2]) || m[2];
}

if (preset === "compare") {
  runCompare(turns);
} else if (preset === "help") {
  console.log(`Sovereign AI Economy Simulator

Usage:
  node sim.mjs [preset] [turns] [--overrides]
  node sim.mjs compare [turns]

Presets: ${Object.keys(PERSONALITIES).join(", ")}

Examples:
  node sim.mjs materialist 360          30 years as Knowledge Seeker
  node sim.mjs militarist 120           10 years as Aggressive Expansionist
  node sim.mjs compare 360              Side-by-side all personalities
  node sim.mjs default 240 --alloy_factor=3.0 --mineral_threshold=30

Overrides (applied to the chosen preset):
  --alloy_factor=N       Alloy building weight multiplier
  --research_factor=N    Research building weight multiplier
  --unity_factor=N       Unity building weight multiplier
  --mineral_threshold=N  Mineral income below which AI builds mining districts
  --energy_threshold=N   Energy income threshold
  --alloy_threshold=N    Alloy income threshold for foundry building
  --cg_threshold=N       Consumer goods income threshold
  --research_threshold=N Research income threshold for lab building`);
} else {
  // Apply overrides
  const pers = { ...(PERSONALITIES[preset] || PERSONALITIES.default) };
  for (const [k, v] of Object.entries(overrides)) {
    if (k in pers) pers[k] = v;
  }
  if (Object.keys(overrides).length > 0) {
    PERSONALITIES[preset] = pers;
  }
  runSim(preset, turns, true);
}
