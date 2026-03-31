# Artifact Contracts

Every structured artifact follows a JSON schema in `schemas/`. Agents produce
artifacts that downstream agents consume. This document summarizes the contracts.

## plan.json (Producer: Martian Manhunter)

**Schema:** `schemas/plan.schema.json`

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
- `acceptance_criteria` — Array of testable criteria (Flash writes tests against these)
- `parallel_group` — Tasks with the same group can run concurrently
- `depends_on` — Array of task IDs that must complete first (optional)
- `files` — Array of file paths this task touches (optional)

**Consumed by:** Cyborg (implementation), Wonder Woman (review), Flash (testing)

## review.json (Producer: Wonder Woman)

**Schema:** `schemas/review.schema.json`

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

**Schema:** `schemas/test-results.schema.json`

Top-level required fields: `verdict`, `summary`, `tests_written`, `test_run`

- `verdict` — "pass" or "fail" (binary — tests pass or they don't)
- `tests_written` — Array mapping each test to an acceptance criterion:
  - `file`, `test_name`, `covers` (which criterion)
- `test_run` — Results: `total`, `passed`, `failed`, `skipped`, `command`, `output`
- `coverage_gaps` — Acceptance criteria without test coverage

**Consumed by:** Batman (dispatch decision — retry Cyborg if fail)

## security-review.json (Producer: Green Lantern)

**Schema:** `schemas/security-review.schema.json`

Top-level required fields: `verdict`, `summary`, `owasp_findings`, `stride_analysis`

- `verdict` — "fail" if ANY critical or high severity finding
- `owasp_findings` — Array with `category` (A01-A10), `severity`, `file`, `line`,
  `description`, `remediation`
- `stride_analysis` — Object with arrays for each STRIDE category
- `secrets_scan` — Object with `clean` boolean and `findings` array

**Consumed by:** Batman (security gate — may block deployment)

## improvements.json (Producer: Oracle)

**Schema:** `schemas/improvement.schema.json`

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
Feature Request → plan.json + architecture.md
                       ↓
              code + briefings/*.json
                       ↓
         ┌─────────────┼─────────────┐
         ↓             ↓             ↓
    review.json  security-review  docs
         ↓
  test-results.json
```

All artifacts live in the factory's `artifacts/` directory. Schemas live in
`schemas/`. The validation hook (`PostToolUse` on `Write`) automatically
validates artifacts against their schemas when agents write them.
