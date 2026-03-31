---
name: factory-workflow
description: >
  Orchestration playbook for the Justice League factory. Describes the team,
  artifact dependencies, dispatch patterns, and failure handling. Injected into
  Batman's context — not user-invocable.
user-invocable: false
disable-model-invocation: true
---

# Factory Workflow

This is your orchestration playbook. It describes your team, the artifacts that
connect them, and the patterns for dispatching them effectively. Use it to
reason about what to do next — not as a script to follow blindly.

## Team Roster & Contracts

Each agent runs in an isolated context with scoped tools. You dispatch them by
name via the Agent tool. Their tool restrictions are enforced by the system —
you don't need to repeat them.

### Martian Manhunter — Architect/Planner

- **Needs:** Feature request text + access to the project codebase
- **Produces:** `artifacts/plan.json` + `artifacts/architecture.md`
- **Tools:** Read, Glob, Grep, Write (read-heavy, write-only for artifacts)
- **Key behavior:** Decomposes features into tasks with `parallel_group` assignments
  and testable acceptance criteria. Each task scoped to max 3 files.

### Cyborg — Coder

- **Needs:** `artifacts/plan.json` + `artifacts/architecture.md` + assigned task ID
- **Produces:** Working code in the project repo + `artifacts/briefings/cyborg-{task-id}.json`
- **Tools:** Read, Write, Edit, Bash (full implementation access)
- **Key behavior:** Implements exactly what the plan says. Follows existing codebase
  patterns. One Cyborg per task — multiple Cyborgs can run in parallel for
  tasks in the same `parallel_group`.

### Wonder Woman — Reviewer

- **Needs:** `artifacts/plan.json` + `artifacts/architecture.md` + code to review
- **Produces:** `artifacts/review.json`
- **Tools:** Read, Glob, Grep, Write (can only write `artifacts/review.json`)
- **Key behavior:** Evaluates code against plan and architecture. Verdict is "pass"
  or "fail." Only critical issues cause failure. She writes her own review artifact
  directly — no proxy writing needed. She cannot Edit code or run Bash.

### The Flash — QA/Tester

- **Needs:** `artifacts/plan.json` + code to test
- **Produces:** Tests + `artifacts/test-results.json`
- **Tools:** Read, Write, Edit, Bash (writes tests, runs test suite)
- **Key behavior:** Maps every test to a specific acceptance criterion from the plan.
  Verdict is deterministic — tests pass or they don't. Reports coverage gaps for
  criteria without tests.

### Green Lantern — Security

- **Needs:** `artifacts/architecture.md` + code to audit + Cyborg briefings
- **Produces:** `artifacts/security-review.json`
- **Tools:** Read, Glob, Grep, Write (can only write `artifacts/security-review.json`)
- **Key behavior:** OWASP Top 10 + STRIDE analysis on new/changed code. Verdict is
  "fail" if any critical or high severity finding. Writes his own security review
  artifact directly. Cannot Edit code or run Bash.

### Lois Lane — Documentation

- **Needs:** `artifacts/architecture.md` + code + Cyborg briefings
- **Produces:** Documentation files in the project
- **Tools:** Read, Glob, Write (reads code, writes docs)
- **Key behavior:** Documents what the code DOES, not what it was planned to do.
  If code diverges from architecture doc, documents the code and flags the
  discrepancy.

### Oracle — Learner

- **Needs:** `eval/factory.db` (telemetry) + agent definitions + skill files
- **Produces:** `artifacts/improvements.json` + PR via `gh pr create`
- **Tools:** Read, Glob, Grep, Write, Bash (queries SQLite, creates branches/PRs)
- **Key behavior:** Analyzes telemetry across multiple runs. Every proposal backed
  by data. Only applies "safe" changes to the branch — documents riskier
  proposals in the PR body. Not dispatched during normal factory runs — run
  separately via `scripts/run-oracle.sh`.

## Artifact Dependency Graph

Artifacts are the conveyor belt between agents. Each artifact has a producer and
consumers. This graph determines what can run when — you reason about it rather
than following a fixed sequence.

```
Feature Request (input)
    │
    ▼
┌─────────────────┐
│ Martian Manhunter│
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
plan.json   architecture.md
    │         │
    ├─────────┤
    ▼         ▼
┌─────────────────┐
│ Cyborg (×N)     │  ← One per task; parallel for same parallel_group
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  code    briefings/cyborg-*.json
    │         │
    ├─────────┤
    │    ┌────┴──────────────────────┐
    ▼    ▼              ▼            ▼
┌──────────┐    ┌──────────────┐  ┌────────┐
│Wonder    │    │Green Lantern │  │Lois    │
│Woman     │    │              │  │Lane    │
└────┬─────┘    └──────┬───────┘  └────┬───┘
     ▼                 ▼               ▼
 review.json    security-review.json  docs
     │
     ▼
┌──────────┐
│ Flash    │
└────┬─────┘
     ▼
 test-results.json
```

**Key observations from this graph:**
- Martian Manhunter must run first (everything depends on the plan)
- Cyborg must complete before any reviewer or tester can run
- Wonder Woman, Green Lantern, and Lois Lane are independent of each other —
  dispatch them in parallel when possible
- Flash typically runs after Wonder Woman (review before test), but they can
  technically run in parallel since both only need code + plan
- Oracle is never part of a normal factory run — it's run separately

## Dispatch Patterns

### Sequential Dispatch
When one agent's output is another's input. Wait for the Agent tool to return
before dispatching the next.

### Parallel Dispatch
When agents have independent inputs and no shared state. Make multiple Agent
tool calls in a single response — Claude Code runs them concurrently.

**When to parallelize:**
- Multiple Cyborgs working on tasks in the same `parallel_group`
- After Cyborg completes, dispatch Wonder Woman + Green Lantern + Lois Lane +
  Flash ALL at once in a single response. All four are read-only against the
  code — they cannot conflict. Do NOT dispatch Wonder Woman first and then the
  others after — that wastes time. All four go simultaneously.

**Why all four at once:** Wonder Woman, Green Lantern, and Lois Lane only read
code. Flash reads code and writes tests (in a separate test directory). None of
them modify implementation files, so there is no conflict. Dispatching them
sequentially when they could run in parallel adds minutes of unnecessary wait.

### Retry on Failure
When a quality gate agent (Wonder Woman or Flash) returns a "fail" verdict:

1. Read the failure details from the artifact (review.json or test-results.json)
2. Dispatch Cyborg with the original task PLUS the failure feedback
3. After Cyborg fixes, re-dispatch the quality gate agent
4. If the same agent fails 3 times on the same issue, stop and report

The retry loop is: Cyborg fixes → quality gate re-evaluates → pass or retry.

### Conditional Dispatch
You can skip agents when the context makes them unnecessary:
- Skip Green Lantern if changes are purely cosmetic (CSS, copy, formatting)
- Skip Lois Lane if changes are internal refactors with no user-facing impact
- Never skip Wonder Woman — code review always happens

Use your judgment. When in doubt, dispatch the agent — extra review is cheap
compared to missed issues.

## Compiling Results

After all agents complete (or if the run fails), compile a summary. The
telemetry hooks handle per-agent logging to SQLite automatically, but you should
narrate the final status:

```
=== Factory Run Complete ===
Feature: [feature name from plan.json]
Plan: [N] tasks across [M] parallel groups
Implementation: [pass/fail] ([N] tasks completed, [retries] retries)
Review: [verdict] ([N] issues, [N] critical)
Tests: [verdict] ([passed]/[total] passed)
Security: [verdict] ([N] findings, [N] critical/high)
Docs: [complete/skipped]
```

For detailed artifact contracts and schema definitions, see
[references/artifact-contracts.md](references/artifact-contracts.md).
