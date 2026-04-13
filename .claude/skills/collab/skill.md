---
name: collab
description: Generate synthesis or workshop documents from source docs using project agents — solo (independent analyses) or workshop (2-agent iterative debate)
argument-hint: "[doc(s)] --agents <type1[,type2,...]> [--type solo|workshop] [--rounds <N>] [--output <path>] [--context <text>]"
---

# Collab-Synthesis — Sovereign AI Research Pipeline

Two modes:

- **Solo** (default): 1+ agents independently read sources and write analysis reports. Each produces its own file.
- **Workshop**: Exactly 2 agents iterate on a shared document for N rounds. Sequential debate with convergence tracking.

## Usage

```
# Solo — one agent analyzes source docs
/collab-synthesis design/harbinger-alg.md --agents numbers-nerd

# Solo — multiple agents each independently write a synthesis
/collab-synthesis design/manifold*.md --agents numbers-nerd,gameflow-auditor,save-analyst

# Workshop — 2 agents, 2 rounds, with focus topics
/collab-synthesis design/harbinger-alg.md --agents amari-manifold-maintainer,togelius-systems-cartographer --type workshop --context "strategic resource projection, gate relaxation"

# Workshop — 3 rounds, explicit output
/collab-synthesis design/harbinger-alg.md --agents numbers-nerd,gameflow-auditor --type workshop --rounds 3 --output design/workshop-deficit-validation.md

# Review mode — agents review an existing doc
/collab-synthesis design/harbinger-alg.md --agents amari-manifold-maintainer,togelius-systems-cartographer --type workshop --context "peer review, find errors"
```

---

## Agent Roster

| Short Name | Type | Domain | Role |
|------------|------|--------|------|
| numbers-nerd | numbers-nerd | Wiki + Reddit cross-ref | Weight validation, community meta |
| reddit-nerd | reddit-nerd | r/stellaris scraping | Community strategies, exploit discovery |
| gameflow-auditor | gameflow-auditor | Production loops | Cascade failures, gate validation |
| save-analyst | save-analyst | Save game parsing | Empirical calibration, baseline data |
| patch-watcher | patch-watcher | Patch notes | Version staleness, mechanic changes |
| amari | amari-manifold-maintainer | Information geometry | Fisher metric, natural gradient, symmetry verification |
| togelius | togelius-systems-cartographer | Game AI systems | Mechanism classification, manifold extension, reward hacking |

---

## Phase 0: Parse & Validate

### 0a. Extract Arguments

| Arg | Required | Default | Notes |
|:----|:---------|:--------|:------|
| `[doc(s)]` | yes (1+) | — | Source doc paths or globs |
| `--agents` | yes | — | Comma-separated agent types or short names |
| `--type` | no | `solo` | `solo` or `workshop` |
| `--rounds` | no | `2` | Workshop only. Range: 1-5 |
| `--output` | no | auto-detect | Output path |
| `--context` | no | — | Focus topics or instructions |

### 0b. Mode Detection

- `--type workshop` → **workshop** (requires exactly 2 agents)
- Everything else → **solo**

### 0c. Validate

1. **Source docs**: Glob-resolve paths. Verify existence. Report missing and stop.
2. **Agent types**: Resolve short names via the roster table above. If invalid, list available types and stop.
3. **Workshop constraints**: Exactly 2 agents. `--rounds` 1-5.

### 0d. Output Path Defaults

- **Solo, 1 agent**: `design/{agent-short}-synthesis.md`
- **Solo, N agents**: `design/{agent-short}-synthesis.md` per agent
- **Workshop**: `design/workshop-{agentA-short}-{agentB-short}.md`

---

## Phase 1: Collision Check

If any output file exists, ask: "Output file exists at `{path}`. Overwrite / New name / Cancel?"

---

## Phase 2: Execute

### Solo Mode

For each agent in `--agents`, spawn a **background agent** in parallel:

- `subagent_type`: the agent type
- `run_in_background`: true
- `name`: `synthesis-{short-name}`
- `mode`: `auto`

**Solo agent prompt:**

```
You are writing an analysis report for the Sovereign AI Overhaul project.

## Source Documents (read ALL of these FIRST)
{numbered list of source doc paths}

Also read your agent memory: `.claude/agent-memory/{your-type}/` (if it exists)

{If --context provided:}
## Focus
{context text}

## Project Context

This project builds AI personality management for Stellaris 4.x using an 8-dimensional
manifold (the Harbinger algorithm). Key references:
- `design/harbinger-alg.md` — the core algorithm specification
- `design/manifold_specification.md` — the original manifold spec
- `templates/` — 17 empire archetype templates
- `research/findings/gameflow_loops.md` — production chain analysis
- `tools/simulator/manifold.mjs` — working manifold implementation

## Your Task

Read all source documents, then write your synthesis to: `{output_path}`

## Document Structure

### Executive Summary
2-3 sentences: what you found, what it means.

### Findings
Numbered findings. Each must include:
- **Claim**: What you found
- **Evidence**: Data source (wiki page, reddit thread, save game, game data)
- **Impact on Harbinger**: Which section/equation/coupling this affects
- **Recommendation**: Specific change with equation or code

### Cross-References
Which other agents should validate your findings? Tag them.

### Open Questions
What you couldn't resolve. Be specific enough that another agent can pick it up.

## Rules
- Production chain ratios are authoritative game constants — do not dispute.
- Gate thresholds (G1-G6) require simulator validation before modification.
- Every coefficient must cite its derivation source (production chain, empirical fit, or phenomenological estimate).
- Write ONLY the output file.
- Use production-chain-first framing: upstream resources constrain downstream consumers.
```

---

### Workshop Mode

Sequential 2-agent debate on a shared document. Each agent reads the running state, fills their sections, completes before the next spawns.

#### Step 1: Build Document Skeleton

**MANDATORY.** Build the COMPLETE skeleton BEFORE launching any agent.

```markdown
# Workshop: {Agent A Short} × {Agent B Short}
**Date**: {date}
**Source Documents**: {list}
**Focus**: {context or "General analysis"}
**Rounds**: {N}

---

## Round 1 — {Agent A Short}

### {A}1: {topic or "Opening Analysis"}
*[NOT STARTED]*

### {A}2: {topic or "Production Chain Implications"}
*[NOT STARTED]*

### {A}3: {topic or "Gate System Review"}
*[NOT STARTED]*

---

## Round 1 — {Agent B Short}

### Re: {A}1
*[NOT STARTED]*

### Re: {A}2
*[NOT STARTED]*

### Re: {A}3
*[NOT STARTED]*

### {B}1: {topic or "Independent Findings"}
*[NOT STARTED]*

### {B}2: {topic or "Manifold Impact Assessment"}
*[NOT STARTED]*

---

{For each additional round:}

## Round {r} — {Agent A Short}

### CONVERGENCE
*[NOT STARTED]*

### DISSENT
*[NOT STARTED]*

### EMERGENCE
*[NOT STARTED]*

---

## Round {r} — {Agent B Short}

### CONVERGENCE
*[NOT STARTED]*

### DISSENT
*[NOT STARTED]*

### EMERGENCE
*[NOT STARTED]*

{FINAL ROUND Agent B also gets:}

---

## Workshop Verdict

| Topic | Status | Details |
|-------|--------|---------|
| *[NOT STARTED]* | | |

## What Changed
*[NOT STARTED]*

## What Holds
*[NOT STARTED]*

## What Breaks or Strains
*[NOT STARTED]*

## Carry-Forward Items
*[NOT STARTED]*
```

Write this skeleton in one Write call. Agents fill placeholders via Edit — they never create structure.

#### Step 2: Round Loop

For each round `r` from 1 to `--rounds`:

##### Turn A

Spawn agent (foreground — must complete before B):

- `subagent_type`: first agent from `--agents`
- `name`: `workshop-{a-short}-r{r}`
- `mode`: `auto`

**R1 Turn A prompt:**

```
You are writing the OPENING ANALYSIS for a 2-agent workshop on the Sovereign AI project.

## Source Documents (read ALL FIRST)
{numbered list}

Also read your agent memory if it exists.

{If --context:}
## Focus Topics
{context text}

## Your Task

Read all sources, then FILL IN your sections in: `{output_path}`

The file has a pre-built skeleton with `*[NOT STARTED]*` placeholders.
Use the Edit tool to replace each placeholder in "Round 1 — {a-short}".
Do NOT overwrite the header, other sections, or later round skeletons.

For each section:
- State your finding clearly
- Cite evidence (game data, wiki, save games, production chain ratios)
- Identify impact on the Harbinger algorithm (which section, equation, coupling)
- Pose specific questions for {b-short}

## Rules
- REPLACE `*[NOT STARTED]*` placeholders in YOUR sections only.
- Production-chain-first framing. Upstream constrains downstream.
- Every coefficient needs a derivation source.
- Write ONLY to the workshop file.
```

**R2+ Turn A prompt:**

```
You are writing ROUND {r} FOLLOW-UP for a 2-agent workshop.

## Workshop Document (read FIRST — contains all prior rounds)
`{output_path}`

## Source Documents (reference)
{numbered list}

## Your Task

Read the full workshop document, then FILL IN Round {r} — {a-short} placeholders:

### CONVERGENCE — Where you now agree with {b-short}. State what changed your assessment.
### DISSENT — Where you still disagree. New evidence only; don't restate prior rounds.
### EMERGENCE — New insights from cross-pollination. These are the most valuable outputs.

## Rules
- REPLACE placeholders in YOUR Round {r} sections only.
- Reference {b-short}'s sections by label.
- Production-chain-first framing.
- Write ONLY to the workshop file.
```

**Wait for Agent A to complete before Turn B.**

##### Turn B

Spawn agent:

- `subagent_type`: second agent from `--agents`
- `name`: `workshop-{b-short}-r{r}`
- `mode`: `auto`

**R1 Turn B prompt:**

```
You are writing the RESPONSE for a 2-agent workshop.

## Source Documents (read ALL FIRST)
{numbered list}

## Workshop Document (read AFTER sources)
`{output_path}`

This file contains the header and {a-short}'s opening analysis.

## Your Task

Read all sources AND the workshop document, then FILL IN your sections.

### Part 1: Response to {a-short}
For EACH "Re:" placeholder:
- **AGREE**: Why, plus supporting evidence from your domain
- **DISAGREE**: Why, with counter-evidence
- **MISSED**: What your domain reveals that theirs doesn't
- **EMERGES**: Cross-domain insights

### Part 2: Original Analysis
Fill your labeled sections with findings {a-short} did not address.

## Rules
- REPLACE placeholders in YOUR sections only.
- Reference {a-short}'s sections by label.
- Production-chain-first framing.
- Write ONLY to the workshop file.
```

**R2+ Turn B prompt (FINAL ROUND includes verdict):**

```
You are writing ROUND {r} RESPONSE for a 2-agent workshop.
{If final round: "This is the FINAL TURN — you must also fill the Workshop Verdict and summary sections."}

## Workshop Document (read FIRST)
`{output_path}`

## Your Task

Read the full workshop document, then FILL IN Round {r} — {b-short} placeholders:

### CONVERGENCE — Where you accept {a-short}'s corrections.
### DISSENT — Sharpen, don't repeat.
### EMERGENCE — New cross-domain insights.

{FINAL ROUND ONLY — also fill:}

## Workshop Verdict — For each discussed topic, assign:
- **Converged**: Both agree after exchange
- **Dissent**: Disagreement persists with stated reasons
- **Partial**: Structure agreed, coefficients disputed
- **Emerged**: New finding from the exchange itself

## What Changed — 1-3 bullets on what this workshop changed in the Harbinger.
## What Holds — 1-3 bullets on what survived scrutiny.
## What Breaks or Strains — 1-3 bullets on unresolved threats.
## Carry-Forward Items — Numbered list of follow-up work: what to compute/validate, which agent should do it, what Harbinger section it feeds.

## Rules
- REPLACE placeholders in YOUR sections only.
- The verdict and summary sections are NON-NEGOTIABLE on final round.
- Production-chain-first framing.
- Write ONLY to the workshop file.
```

#### Step 3: Inter-Round Status

After each complete round, report:

```
=== WORKSHOP ROUND {r}/{N} COMPLETE ===
{a-short}: {word count}
{b-short}: {word count}
Document: {output_path} ({total lines} lines)
```

Before launching Round 2+, audit Round 1 for **production-chain violations**:
- Treating deficit thresholds as independent of weight factors (they're coupled)
- Ignoring the gate system when proposing building weights
- Suggesting coefficients without derivation source
- Proposing manifold changes without Fisher metric impact assessment

Include corrections in Round 2 agent prompts.

---

## Phase 3: Verify & Report

### Solo

```
=== COLLAB-SYNTHESIS COMPLETE ===
Mode: solo
Agent(s): {list}
Output: {path(s)} ({lines} lines each)
Source documents: {N}
```

### Workshop

```
=== COLLAB-SYNTHESIS COMPLETE (WORKSHOP) ===
Rounds: {N} ({N*2} turns)
Agent A: {a-short} ({type})
Agent B: {b-short} ({type})
Convergence: {count} | Partial: {count} | Dissent: {count} | Emerged: {count}
Output: {path} ({lines} lines)
```

---

## Rules

1. **Never overwrite files** without user confirmation.
2. **Never execute game changes** — analysis and synthesis documents only.
3. **Gate thresholds require simulator validation** — never modify G1-G6 on paper alone.
4. **Workshop skeleton is MANDATORY** — build ALL sections before ANY agent launches.
5. **Workshop is purely sequential** — never spawn B before A completes within a turn.
6. **Production-chain-first framing** — upstream resources constrain downstream. Minerals before alloys. CG before research. Always.
7. **Every coefficient needs a source** — production chain ratio, empirical fit, or flagged as phenomenological.
8. **Manifold changes need Amari** — any proposed change to coupling functions, metric, or symmetry claims must be checked by amari-manifold-maintainer before implementation.

## Error Handling

| Condition | Action |
|:----------|:-------|
| No source docs | Show usage and stop |
| Source doc missing | Report which, stop |
| No `--agents` | Show usage and stop |
| Agent type invalid | List roster, stop |
| Workshop + agents != 2 | Error: "Workshop requires exactly 2 agents" |
| `--rounds` outside 1-5 | Error: "Rounds must be 1-5" |
| `--rounds` without workshop | Warn: ignored |
| Output collision | Ask: overwrite / rename / cancel |
| Agent fails to produce output | Report, suggest different agent |
| Agent overwrites workshop file | Report corruption, offer restart from last good round |

## Recommended Pairings

| Pairing | Use When |
|---------|----------|
| numbers-nerd + gameflow-auditor | Validating deficit thresholds, new building weights |
| numbers-nerd + reddit-nerd | Community meta vs actual game data discrepancies |
| amari + togelius | Manifold structural changes, new mechanics classification |
| gameflow-auditor + save-analyst | Calibrating simulator against real save data |
| patch-watcher + numbers-nerd | New patch drops, checking for stale mod files |
| amari + gameflow-auditor | Verifying coupling function changes preserve metric health |
| togelius + reddit-nerd | Identifying player strategies worth encoding as templates |
