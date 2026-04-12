# Baseline Empire Profiles Analysis

**Source:** `unitednationsofearth5_505588286/2200.01.05.sav` (Cetus v4.3.3)
**Date:** Year 2200, Day 5 (game start)
**Empires extracted:** 34 regular empires (excludes fallen empires, marauders, enclaves)

## Summary

At game start, all 34 regular empires begin with nearly identical conditions. The starting state is highly uniform with minor variations driven by authority type, ethics, origin, and civics. Empire 170 (fanatic purifier with `origin_life_seeded_ai_only`) is the notable outlier.

## Starting Uniformity

| Metric | Range | Notes |
|--------|-------|-------|
| Victory Score | 210-264 | Tight cluster; 170 is outlier at 495 |
| Military Power | 177-242 | Narrow; slight variation from ship loadout |
| Tech Power | 253-428 | Most at 253, higher = more starting techs |
| Fleet Size | 15-16 | Effectively identical (3 corvettes) |
| Pops | 4000-5700 | Most at 4800-5200; 170 has 12800 |
| Empire Size | 50 | Universal |

## Technology

### Universal Starting Techs (26 techs, all 34 empires)

These techs define the absolute baseline every empire begins with:

```
tech_assault_armies, tech_basic_industry, tech_basic_science_lab_1,
tech_colonization_1, tech_fission_power, tech_flak_batteries_1,
tech_hydroponics, tech_hyper_drive_1, tech_industrial_farming,
tech_lasers_1, tech_mass_drivers_1, tech_mechanized_mining,
tech_pd_tracking_1, tech_planetary_defenses, tech_planetary_government,
tech_power_plant_1, tech_reactor_boosters_1, tech_shields_1,
tech_ship_armor_1, tech_solar_panel_network, tech_space_construction,
tech_space_defense_station_1, tech_space_exploration,
tech_starbase_1, tech_starbase_2, tech_thrusters_1
```

### Authority-Driven Tech Differences

| Tech Group | Who Gets It | Count |
|------------|-------------|-------|
| tech_corvettes + tech_missiles_1 | All non-mechanist regular empires | 30/34 |
| tech_interplanetary_commerce + tech_holo_entertainment + tech_basic_health | All non-hive-mind empires | 24-26/34 |
| tech_hive_node | Hive minds only | 8/34 |
| Weaver/mauler bio-techs | Empires with bio-ship origins | 4/34 |
| Gravity wells + alien cloning + bio-integration techs | Specific origins (mechanists, evolutionary_predators, etc.) | 4/34 |

**Key finding:** The standard regular empire starts with **31 techs** (26 universal + corvettes + missiles + commerce + health + holo). Hive minds start with **29 techs** (26 universal + corvettes + missiles + hive_node). Special origins add 2-10 more techs.

## Resource Income (Monthly, Year 2200)

### Regular Empires (26 non-hive-mind, averages)

| Resource | Income | Expenses | Net |
|----------|--------|----------|-----|
| Energy | 108.3 | 43.0 | **+65.3** |
| Minerals | 67.0 | 38.5 | **+28.5** |
| Food | 69.7 | 39.7 | **+30.1** |
| Alloys | 12.8 | 4.1 | **+8.6** |
| Consumer Goods | 44.4 | 34.7 | **+9.7** |
| Physics Research | 14.1 | 0.0 | **+14.1** |
| Society Research | 14.5 | 0.0 | **+14.5** |
| Engineering Research | 15.6 | 0.0 | **+15.6** |
| Unity | 38.0 | 7.7 | **+30.3** |
| Influence | 4.3 | 0.0 | **+4.3** |

### Hive Mind Empires (8 empires, averages)

| Resource | Income | Expenses | Net |
|----------|--------|----------|-----|
| Energy | 79.7 | 40.4 | **+39.4** |
| Minerals | 51.0 | 32.6 | **+18.4** |
| Food | 88.9 | 73.6 | **+15.4** |
| Alloys | 17.7 | 2.4 | **+15.4** |
| Consumer Goods | 0.0 | 0.0 | **0.0** |
| Physics Research | 13.7 | 0.0 | **+13.7** |
| Society Research | 12.9 | 0.0 | **+12.9** |
| Engineering Research | 15.1 | 0.0 | **+15.1** |
| Unity | 28.0 | 6.3 | **+21.7** |
| Influence | 5.3 | 0.0 | **+5.3** |

### Income Sources (Empire 0, UNE, representative)

| Source | Key Resources |
|--------|---------------|
| country_base | 20 energy, 20 minerals, 20 food, 10 each research, 15 CG, 5 alloys, 11 unity, 3 influence |
| planet_farmers | 67 food |
| planet_technician | 50 energy |
| trade_policy | 36 energy (from trade) |
| planet_artisans | 32 CG |
| planet_miners | 22 minerals |
| planet_politicians | 15 unity |
| orbital deposits | 10 energy, 10 minerals |
| planet_metallurgists | 7 alloys |
| starbase_modules | 6 energy |
| planet_bureaucrats | 6 unity |

## Personality Distribution

| Personality | Count |
|-------------|-------|
| hegemonic_imperialists | 9 |
| hive_mind | 5 |
| evangelising_zealots | 4 |
| ruthless_capitalists | 3 |
| federation_builders | 2 |
| fanatic_purifiers | 2 |
| peaceful_traders | 2 |
| hive_mind_friend | 2 |
| democratic_crusaders | 1 |
| devouring_swarm | 1 |
| harmonious_hierarchy | 1 |
| erudite_explorers | 1 |
| spiritual_seekers | 1 |

## Authority Distribution

| Authority | Count |
|-----------|-------|
| auth_hive_mind | 8 (24%) |
| auth_dictatorial | 7 (21%) |
| auth_democratic | 6 (18%) |
| auth_oligarchic | 5 (15%) |
| auth_imperial | 4 (12%) |
| auth_corporate | 4 (12%) |

## Origin Distribution

21 empires (62%) use `origin_default`. The remaining 13 each use a unique origin: lost_colony, lithoid, life_seeded_ai_only, mechanists, evolutionary_predators, fear_of_the_dark, ocean_paradise, galactic_doorstep, necrophage, riftworld, primal_calling, tree_of_life, syncretic_evolution.

## Empire 170 Outlier

Fanatic purifier with `origin_life_seeded_ai_only`:
- 12,800 pops (vs 4800-5700 normal)
- 35 starting techs (vs 29-31 typical)
- Victory score 495 (vs 210-264 typical)
- 0 military power but net alloy income of -1.6 and CG deficit of -19.5
- Represents a front-loaded AI threat start

## Implications for Sovereign AI Mod

### BASE_START Calibration

The simulator's BASE_START should use these net monthly values for a standard regular empire at year 2200:

- energy: +65, minerals: +28, food: +30, alloys: +9, consumer_goods: +10
- physics/society/engineering research: +14/+15/+16
- unity: +30, influence: +4
- pops: 5200, fleet_size: 15, naval_capacity: 15, tech_count: 31, empire_size: 50

### Weight System Validation

1. Energy surplus is large (+65 net) -- AI should NOT build energy districts at game start; deficit-driven approach confirmed correct
2. Minerals are the tightest basic resource (+28 net) -- mining districts should be early priority
3. Consumer goods and alloys are both tight (~+9 net each) -- these constrain expansion
4. Research is low but growing (~14-16 per category) -- first research upgrades are high priority
5. Hive minds need different thresholds -- no CG, higher alloys, more food consumption
6. All empires start with identical fleet (3 corvettes, 15 naval cap) -- fleet building should wait for border pressure
