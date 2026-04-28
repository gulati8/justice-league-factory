---
name: improvement-methodology
description: >
  Methodology for analyzing factory telemetry and proposing evidence-based
  improvements. Query patterns, evidence standards, and risk classification.
  Injected into Oracle's context.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
---

# Improvement Methodology

This guides how you analyze the factory's performance and propose changes.
Every proposal must be backed by evidence from the telemetry database — not
intuition, not best practices, not "I think this would be better."

## Querying Telemetry

The telemetry database is at `eval/factory.db` (SQLite). Use Bash to query it.

### Common Queries

**Agent failure rates:**
```sql
SELECT agent, 
       COUNT(*) as total_runs,
       SUM(CASE WHEN verdict='fail' THEN 1 ELSE 0 END) as failures,
       ROUND(100.0 * SUM(CASE WHEN verdict='fail' THEN 1 ELSE 0 END) / COUNT(*), 1) as fail_rate
FROM agent_runs 
GROUP BY agent 
ORDER BY fail_rate DESC;
```

**Token usage by agent (cost optimization):**
```sql
SELECT agent, model,
       AVG(output_tokens) as avg_tokens,
       MIN(output_tokens) as min_tokens,
       MAX(output_tokens) as max_tokens
FROM agent_runs
GROUP BY agent, model;
```

**Duration trends:**
```sql
SELECT agent,
       AVG(duration_ms) as avg_duration,
       MAX(duration_ms) as max_duration
FROM agent_runs
GROUP BY agent
ORDER BY avg_duration DESC;
```

**Failed run transcripts (for root cause analysis):**
```sql
SELECT ar.agent, ar.verdict, at.prompt_text, at.response_text
FROM agent_runs ar
JOIN agent_transcripts at ON ar.id = at.agent_run_id
WHERE ar.verdict = 'fail'
ORDER BY ar.started_at DESC;
```

## Evidence Standards

### What Counts as a Pattern
- A single failure is noise — don't propose changes for one-off issues
- Two similar failures are suspicious — note them but don't propose yet
- Three or more similar failures are a pattern — propose a change
- A consistent behavior across ALL runs (e.g., token waste) is a pattern
  even if no individual run "failed"

### Citing Evidence
Every proposal must reference specific data:
- "Wonder Woman failed in 4 of 8 runs (50% failure rate)"
- "In runs #3, #5, #7, the failure was TypeScript 'any' types flagged as critical"
- "Cyborg averages 45,000 tokens on Opus vs 38,000 tokens on Sonnet with no
  quality difference (both 100% pass rate from Wonder Woman)"

### Reading Transcripts
When metrics show a pattern, read the transcripts to understand WHY:
- What did the agent actually say/do?
- Was the issue in the prompt, the skill, or the task itself?
- Would a prompt change fix it, or is this a fundamental limitation?

## Bumping last_reviewed When You Modify a Skill

Every skill carries a `last_reviewed: YYYY-MM-DD` field in frontmatter. When
your improvements.json proposes changing a skill, the `proposed_value` MUST
also update `last_reviewed` to today's date. This is non-negotiable: without
the bump, the field stops tracking validation cadence and decays into noise
within a few cycles.

If a proposal modifies skill text but leaves `last_reviewed` unchanged, the
proposal is incomplete. Wonder Woman should reject the resulting PR.

## Skill Attribution

Skills are loaded statically per agent through `.claude/agents/<name>.md`
frontmatter (`skills:` line, comma-separated). To attribute a run's outcome
to the skills that shaped it, two paths are available:

**1. From the `skills_loaded` column (preferred when present):**
The telemetry hook records the skills active at the time of each agent run.

```sql
SELECT agent, skills_loaded FROM agent_runs WHERE id = ?;
```

**2. From current agent frontmatter (fallback):**
Read `.claude/agents/<agent_name>.md`, extract the `skills:` line, split on
commas. Use this when analyzing runs older than the column's introduction or
when validating recent changes against the latest config.

## Staleness as Evidence Weight

`last_reviewed` is a prior on improvement priority, not a signal on its own.
Combine staleness with metrics before proposing:

| Skill state | Metrics on agents that load it | Action |
|---|---|---|
| Stale (>90d), high failure rate | Two signals agreeing | Propose change — high priority |
| Stale (>90d), healthy metrics | Don't fix what isn't broken | No proposal — staleness alone isn't evidence |
| Recent (<14d edit), high failure rate | Edit hasn't soaked yet | Wait one or two more runs before re-proposing |
| Recent (<14d edit), healthy metrics | Working as intended | No proposal |

Compute staleness from `last_reviewed` first. If the field is missing or you
suspect a recent edit didn't bump it:

```bash
git log -1 --format=%ai -- .claude/skills/<name>/SKILL.md
```

## Skill Health Pass

Before producing improvements.json, build a per-skill health snapshot:

```sql
SELECT
  json_each.value AS skill,
  COUNT(*)        AS runs,
  SUM(CASE WHEN verdict='fail' THEN 1 ELSE 0 END) AS fails,
  MAX(started_at) AS last_run
FROM agent_runs, json_each(agent_runs.skills_loaded)
WHERE skills_loaded IS NOT NULL
GROUP BY skill;
```

(SQLite ships `json_each` since 3.38. If `skills_loaded` is unavailable for a
given run, fall back to grouping by agent and joining via current frontmatter.)

For each skill, join the resulting rate with its `last_reviewed` and emit a
`skill_health` entry in improvements.json. Sort by
`(staleness_days × failure_rate)` descending — the top of that list is where
to focus next analysis cycle. A skill's appearance there does NOT itself
constitute a proposal; it's a pointer to where to look harder.

## Risk Classification

### Safe (auto-apply to branch)
Changes that can only help, never hurt:
- Adding examples to prompts (shows desired behavior)
- Clarifying ambiguous instructions (reduces misinterpretation)
- Tightening severity definitions (reduces false positives)
- Adding a constraint that prevents observed errors

### Needs Review (document in PR body only)
Changes that could affect other agents:
- Modifying output schema fields
- Changing workflow steps
- Altering what artifacts an agent produces
- Changing model assignments

### Dangerous (document in PR body with warning)
Changes that weaken safety:
- Expanding tool access for any agent
- Removing constraints
- Adding a new agent to the roster
- Changing read-only agents to read-write

## PR Format

Your PR should be structured for easy human review:

**Title:** "Oracle: [N] improvements based on [M] factory runs"

**Body:**
```markdown
## Applied Changes (safe)
- [Change 1]: [rationale] — Evidence: [citation]
- [Change 2]: [rationale] — Evidence: [citation]

## Proposed Changes (needs review)
- [Change 3]: [rationale] — Evidence: [citation]

## Flagged Concerns (dangerous)
- [Change 4]: [rationale] — Evidence: [citation]

## Telemetry Summary
- Runs analyzed: [N]
- Overall pass rate: [X]%
- Most frequent failures: [agent] ([rate]%)
```

## Improvement Schema

Your output must conform to `.claude/schemas/improvement.schema.json`:

```json
{
  "run_count_analyzed": 8,
  "patterns_detected": ["description of each pattern"],
  "proposals": [
    {
      "target_agent": "wonder-woman",
      "change_type": "prompt",
      "current_value": "current text",
      "proposed_value": "proposed text",
      "rationale": "why this change helps",
      "evidence": ["run #3: ...", "run #5: ..."],
      "risk_level": "safe"
    }
  ]
}
```
