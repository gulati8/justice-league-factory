# Artifact Contracts

Every structured artifact follows a JSON schema in `.claude/schemas/`. Agents produce
artifacts that downstream agents consume. This document summarizes the contracts.

## feature-request.json (Producer: Brainiac)

**Schema:** `.claude/schemas/feature-request.schema.json`

Top-level required fields: `title`, `problem_statement`, `proposed_solution`,
`constraints`, `mvp_scope`, `acceptance_criteria`, `risks`, `effort_estimate`,
`research_brief_path`

- `title` — Short name for the feature
- `problem_statement` — What problem this solves
- `proposed_solution` — Brainiac's recommended approach
- `constraints` — Array of strings describing hard limits (technical, business, timeline)
- `mvp_scope` — Object with two arrays:
  - `in` — Capabilities included in MVP
  - `out` — Explicitly deferred capabilities
- `acceptance_criteria` — Array of strings describing testable done conditions
- `risks` — Array of strings identifying known risks
- `effort_estimate` — Enum: "XS", "S", "M", "L", or "XL"
- `research_brief_path` — Path to the accompanying research-brief.md

**Consumed by:** Martian Manhunter (primary input for planning), Batman (reads to
understand scope)

## research-brief.md (Producer: Brainiac)

**Schema:** None — structural requirements only

A free-form Markdown document that provides research context for a feature. Must
contain all of the following headings, in order:

- `## Concept` — What the feature is and why it matters
- `## Landscape` — Existing solutions, prior art, relevant ecosystem context
- `## Constraints` — Technical, organizational, or regulatory constraints
- `## Risks` — Known unknowns, failure modes, dependencies
- `## Recommendation` — Brainiac's go/no-go stance with supporting rationale

**Minimum length:** 500 characters

**Consumed by:** Humans (review and go/no-go decisions), optionally Martian
Manhunter (additional context)

## plan.json (Producer: Martian Manhunter)

**Schema:** `.claude/schemas/plan.schema.json`

Top-level required fields: `feature`, `summary`, `architecture`, `tasks`

The `architecture` object contains:
- `approach` — High-level technical approach
- `files_to_create` — Array of `{path, purpose}` objects
- `files_to_modify` — Array of `{path, changes}` objects
- `interfaces` — Array of `{name, contract}` objects

Each task in `tasks` array contains:
- `id` — Unique task identifier (e.g., "task-001")
- `title` — Short description
- `description` — What to implement
- `acceptance_criteria` — Array of testable behavioral criteria
- `user_impact` — One sentence: what this task enables for the end user
- `edge_cases` — Array of edge cases this task must handle
- `rollback_strategy` — How to undo this task if it causes problems
- `parallel_group` — Tasks with the same group can run concurrently
- `depends_on` — Array of task IDs that must complete first (optional)
- `files` — Array of file paths this task touches (optional)

**Consumed by:** Cyborg (implementation), Wonder Woman (review), Flash (testing)

## review.json (Producer: Wonder Woman)

**Schema:** `.claude/schemas/review.schema.json`

Top-level required fields: `verdict`, `issues`, `summary`

- `verdict` — "pass" or "fail" (fail if ANY critical issue exists)
- `summary` — One-paragraph assessment
- `issues` — Array of findings, each with:
  - `severity` — "critical", "warning", or "info"
  - `file` — Exact file path
  - `line` — Line number (optional)
  - `description` — What's wrong
  - `suggestion` — How to fix it
- `plan_compliance` — Object with `all_tasks_implemented`, `architecture_followed`,
  `missing_items`

**Consumed by:** Batman (dispatch decision — retry Cyborg if fail)

## test-results.json (Producer: Flash)

**Schema:** `.claude/schemas/test-results.schema.json`

Top-level required fields: `verdict`, `summary`, `tests_written`, `test_run`

- `verdict` — "pass" or "fail" (binary — tests pass or they don't)
- `tests_written` — Array mapping each test to an acceptance criterion:
  - `file`, `test_name`, `covers` (which criterion)
- `test_run` — Results: `total`, `passed`, `failed`, `skipped`, `command`, `output`
- `coverage_matrix` — Maps plan artifacts to test coverage:
  - `acceptance_criteria` — Array of `{criterion, test_names}` objects
  - `user_journeys` — Array of `{journey, test_names}` objects
  - `edge_cases` — Array of `{edge_case, test_names}` objects
  - `uncovered` — Array of items with no test coverage and reasons
- `coverage_gaps` — Acceptance criteria without test coverage (legacy field, kept for backwards compatibility)

**Consumed by:** Batman (dispatch decision), Wonder Woman (coverage matrix verification)

## security-review.json (Producer: Green Lantern)

**Schema:** `.claude/schemas/security-review.schema.json`

Top-level required fields: `verdict`, `summary`, `owasp_findings`, `stride_analysis`

- `verdict` — "fail" if ANY critical or high severity finding
- `owasp_findings` — Array with `category` (A01-A10), `severity`, `file`, `line`,
  `description`, `remediation`
- `stride_analysis` — Object with arrays for each STRIDE category
- `secrets_scan` — Object with `clean` boolean and `findings` array

**Consumed by:** Batman (security gate — may block deployment)

## improvements.json (Producer: Oracle)

**Schema:** `.claude/schemas/improvement.schema.json`

Top-level required fields: `run_count_analyzed`, `proposals`

- `run_count_analyzed` — Number of factory runs analyzed
- `patterns_detected` — Recurring patterns observed
- `proposals` — Array of proposed changes:
  - `target_agent` — Which agent to modify
  - `change_type` — "prompt", "tools", "contract", or "new_agent"
  - `current_value` / `proposed_value` — What to change
  - `rationale` — Why
  - `evidence` — References to specific telemetry data
  - `risk_level` — "safe", "needs_review", or "dangerous"

**Consumed by:** Humans (via PR review). Only "safe" changes are auto-applied to branches.

## Artifact Flow Summary

```
[Optional Brainiac pre-phase]
Feature Request (raw) → research-brief.md + feature-request.json
                                    ↓
               plan.json + architecture.md
                                    ↓
                       code + briefings/*.json
                                    ↓
              ┌─────────────────────┼─────────────┐
              ↓                     ↓             ↓
         review.json       security-review      docs
              ↓
     test-results.json
```

All artifacts live in the factory's `.factory-run/` directory. Schemas live in
`.claude/schemas/`. The validation hook (`PostToolUse` on `Write`) automatically
validates artifacts against their schemas when agents write them.
