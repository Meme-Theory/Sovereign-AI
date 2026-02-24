# SOVEREIGN AI — Weight Conventions

## ai_weight Block Structure

Every `ai_weight` block in SOVEREIGN follows this template:

```pdx
ai_weight = {
    weight = <base>           # 0 for conditional, 50-200 for always-relevant

    # NEED-BASED (add)
    modifier = {
        add = <value>         # Activate when specific need detected
        <conditions>
    }

    # PERSONALITY (factor)
    modifier = {
        factor = <1.0-3.0>   # Ethics/civic alignment
        <ethic_or_civic_check>
    }

    # SITUATIONAL (factor)
    modifier = {
        factor = <0.5-2.0>   # Current game state
        <situational_check>
    }

    # PENALTIES (factor)
    modifier = {
        factor = <0.01-0.5>  # Resource scarcity, slot pressure
        <penalty_conditions>
    }

    # HARD BLOCKS (factor = 0)
    modifier = {
        factor = 0            # Incompatible empire type
        <block_conditions>
    }
}
```

## Factor Reference Card

| Factor | Meaning | When to Use |
|--------|---------|-------------|
| 0 | Never | Empire type incompatible |
| 0.01 | Almost never | Extreme penalty, edge case |
| 0.1 | Rarely | Strong discouragement |
| 0.25 | Reduced | Moderate penalty |
| 0.5 | Somewhat reduced | Mild penalty |
| 0.75 | Slightly reduced | Subtle discouragement |
| 1.0 | No change | Default/neutral |
| 1.25 | Slightly increased | Mild preference |
| 1.5 | Moderately increased | Clear preference |
| 2.0 | Doubled | Strong preference |
| 2.5 | Heavily increased | Core identity choice |
| 3.0 | Tripled | Defining behavior |
| 5.0 | Maximum | Overwhelming priority (use sparingly) |

## Add Value Guidelines

| Add Value | Meaning | When to Use |
|-----------|---------|-------------|
| 25 | Minor bonus | Nice to have |
| 50 | Moderate bonus | Meaningful preference |
| 75 | Significant bonus | Important need |
| 100 | Standard need | Active economic deficit |
| 150 | High priority | Urgent but manageable |
| 200 | Emergency | Critical deficit or crisis |

## Stacking Rules

1. **Add before Factor**: `add` modifiers should come before `factor` modifiers so factors multiply the accumulated total.
2. **Max 3 factor modifiers**: Avoid cascading more than 3 multiplicative factors on any single option to prevent runaway weights.
3. **Always include a penalty**: Every building/district weight should have at least one penalty modifier (low resources, full slots, etc.) to prevent infinite building.

## Naming Convention for @variables

```
@<category>_<specific>_<type>
```

Examples:
- `@resource_building_base` — base weight for resource buildings
- `@district_designation_bonus` — bonus for matching planet designation
- `@capital_upgrade_urgency` — priority boost for capital upgrades
- `@ship_early_game_years` — threshold for early game ship composition
