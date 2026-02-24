# SOVEREIGN AI — Testing Scenarios

## Quick Start Testing

1. Launch Stellaris
2. Enable "Sovereign AI Overhaul" in the mod launcher
3. Start a new game with these settings:
   - Galaxy size: Medium (600 stars)
   - AI empires: 10+
   - Difficulty: Ensign (no AI bonuses to isolate weight changes)
   - Pre-generated empires: Include at least one of each personality type
4. Open console (`~`) and enter `observe`
5. Set speed to fastest and let it run

## Test Scenarios

### Scenario 1: Early Game Expansion (Years 2200–2220)
**What to check:**
- [ ] AI empires are colonizing within first 10 years
- [ ] AI is building appropriate districts (mining when minerals low, etc.)
- [ ] AI is building colony ships when economy supports it
- [ ] AI personalities are choosing expansion traditions at appropriate rates
- [ ] Aggressive Expansionists are claiming systems near neighbors

### Scenario 2: Economic Management (Years 2220–2260)
**What to check:**
- [ ] AI is not running negative resources for extended periods
- [ ] AI switches building priorities based on deficits
- [ ] Ruthless Industrialists have visibly higher production output
- [ ] AI is upgrading capital buildings when population supports it
- [ ] AI is specializing planets (mining worlds, generator worlds, etc.)

### Scenario 3: Military Buildup (Years 2230–2280)
**What to check:**
- [ ] AI fleet sizes are proportional to personality (militarists > pacifists)
- [ ] Fleet composition evolves with tech (corvettes → destroyers → cruisers → battleships)
- [ ] AI is not building ships when economy can't support it
- [ ] Fortress Guardians have strong defensive starbases

### Scenario 4: Diplomacy (Years 2220–2300)
**What to check:**
- [ ] Diplomatic Hegemons are forming pacts and federations
- [ ] Xenophobes reject most diplomatic proposals
- [ ] Genocidal empires (Purifiers, Swarms) have no diplomatic relations
- [ ] Research agreements form between compatible empires
- [ ] AI declares war based on personality (conquerors yes, guardians no)

### Scenario 5: War Behavior (When Wars Occur)
**What to check:**
- [ ] AI switches to military economy during war
- [ ] AI builds armies for planetary invasion
- [ ] Losing empires try to rebuild rather than collapse
- [ ] AI accepts peace when war exhaustion is high
- [ ] AI prioritizes alloy production when fleet is destroyed

### Scenario 6: Late Game (Years 2350+)
**What to check:**
- [ ] AI is building megastructures when economy allows
- [ ] Fleet composition is battleship-heavy
- [ ] AI is maintaining economic stability with large empires
- [ ] Knowledge Seekers have a visible tech advantage
- [ ] Federations are functioning and coordinating

### Scenario 7: Event System Verification
**What to check:**
- [ ] No errors in `error.log` from sovereign events
- [ ] sovereign.100 fires on game start (check with `debugtooltip`)
- [ ] Annual and monthly pulses are triggering
- [ ] Job re-evaluation events aren't causing lag (check `script_profiler`)

## Console Commands for Testing

```
observe                    # Watch AI play
debugtooltip               # See internal values
fast_forward 365           # Skip 1 year
instant_build              # Test building AI
play <empire_id>           # Inspect specific AI
script_profiler            # Check performance
```

## Performance Targets

- No visible frame drops from SOVEREIGN events
- `script_profiler` should show sovereign events using < 5% of script time
- `error.log` should have zero entries from SOVEREIGN files
- AI should outperform vanilla AI in observer mode (subjective assessment)

## Reporting Issues

When a test fails, document:
1. Which scenario failed
2. Which AI empire exhibited the problem
3. Approximate game year
4. Screenshot if applicable
5. Relevant `error.log` entries
