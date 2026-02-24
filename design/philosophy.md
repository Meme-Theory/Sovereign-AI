# SOVEREIGN AI — Design Philosophy

## Core Principle
The AI should play Stellaris **like a competent human player** — making rational decisions based on available information, responding to threats, and pursuing coherent long-term strategies.

## Non-Cheating Guarantee
SOVEREIGN never gives AI empires unfair advantages. No bonus resources, no hidden modifiers, no information the AI shouldn't have. Every AI improvement comes from **better decision-making through weights and event-based corrections.**

## Decision-Making Principles

### 1. Context-Sensitivity
AI decisions should respond to the empire's current state:
- Economic health (surplus/deficit detection)
- Military posture (threat level, fleet status)
- Diplomatic landscape (allies, rivals, federation status)
- Game phase (early expansion vs mid-game development vs late-game dominance)

### 2. Personality Coherence
Each AI personality should produce recognizable, distinct behavior:
- A Ruthless Industrialist should visibly out-produce neighbors
- A Fortress Guardian should have noticeably stronger defenses
- A Knowledge Seeker should tech faster than other empires
- An Evangelizing Zealot should actively spread ideology

### 3. Deficit-Driven Building
AI should build structures based on actual need, not arbitrary priority:
- Base weight of 0 for most resource buildings
- `add` modifiers that activate when specific deficits are detected
- `factor` modifiers for personality/ethics alignment
- Emergency weights for critical shortages (negative income)

### 4. Adaptive Behavior
AI should adjust strategy when circumstances change:
- Switch to military economy when war is declared
- Prioritize alloy production when fleet is destroyed
- Focus on expansion when few planets are owned
- Turtle and rebuild after a devastating loss

### 5. Avoid Over-Optimization
Perfect play isn't the goal. AI should:
- Make reasonable decisions, not mathematically optimal ones
- Occasionally make "personality-driven" suboptimal choices
- Not exploit game mechanics that feel gamey
- Maintain the illusion of a thinking opponent

## Weight Convention Standards

| Weight Type | Range | Usage |
|-------------|-------|-------|
| `weight` (base) | 0–200 | Starting score. 0 = conditional build only |
| `add` | 25–200 | Conditional bonuses based on need |
| `factor` | 0.01–5.0 | Multipliers for personality/context |
| `factor = 0` | — | Hard block (empire type incompatible) |
| `factor = 0.01` | — | Soft block (almost never, not impossible) |

## Modifier Ordering Convention
1. Base `weight` or `factor`
2. `add` modifiers for need-based activation (economic deficits, etc.)
3. `factor` modifiers for personality alignment (ethics, civics)
4. `factor` modifiers for situational context (at war, threatened)
5. `factor` modifiers for penalties/blocks (gestalt, low resources)
