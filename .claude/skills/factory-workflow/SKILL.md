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

### Brainiac — Deep Researcher

- **Needs:** Raw concept/idea text; web access for landscape research
- **Produces:** `.factory-run/research-brief.md`, `.factory-run/feature-request.json`
- **Tools:** Read, Glob, Grep, Write, WebSearch, WebFetch
- **Key behavior:** Researches abstract concepts through six phases (concept extraction,
  landscape survey, constraint discovery, shape definition, risk assessment, output
  crystallization). Only dispatched when input is vague or lacks a concrete feature
  request. First agent with web access.

### Martian Manhunter — Architect/Planner

- **Needs:** Feature request text + access to the project codebase
- **Produces:** `.factory-run/plan.json` + `.factory-run/architecture.md`
- **Tools:** Read, Glob, Grep, Write (read-heavy, write-only for artifacts)
- **Key behavior:** Decomposes features into tasks with `parallel_group` assignments
  and testable acceptance criteria. Each task scoped to max 3 files.

### Cyborg — Coder

- **Needs:** `.factory-run/plan.json` + `.factory-run/architecture.md` + assigned task ID
- **Produces:** Working code in the project repo + `.factory-run/briefings/cyborg-{task-id}.json`
- **Tools:** Read, Write, Edit, Bash (full implementation access)
- **Key behavior:** Implements exactly what the plan says. Follows existing codebase
  patterns. One Cyborg per task — multiple Cyborgs can run in parallel for
  tasks in the same `parallel_group`.

### Wonder Woman — Reviewer

- **Needs:** `.factory-run/plan.json` + `.factory-run/architecture.md` + code to review
- **Produces:** `.factory-run/review.json`
- **Tools:** Read, Glob, Grep, Write (can only write `.factory-run/review.json`)
- **Key behavior:** Evaluates code against plan and architecture. Verdict is "pass"
  or "fail." Only critical issues cause failure. She writes her own review artifact
  directly — no proxy writing needed. She cannot Edit code or run Bash.

### The Flash — QA/Tester

- **Needs:** `.factory-run/plan.json` + code to test
- **Produces:** Tests + `.factory-run/test-results.json`
- **Tools:** Read, Write, Edit, Bash (writes tests, runs test suite)
- **Key behavior:** Maps every test to a specific acceptance criterion from the plan.
  Verdict is deterministic — tests pass or they don't. Reports coverage gaps for
  criteria without tests.

### Green Lantern — Security

- **Needs:** `.factory-run/architecture.md` + code to audit + Cyborg briefings
- **Produces:** `.factory-run/security-review.json`
- **Tools:** Read, Glob, Grep, Write (can only write `.factory-run/security-review.json`)
- **Key behavior:** OWASP Top 10 + STRIDE analysis on new/changed code. Verdict is
  "fail" if any critical or high severity finding. Writes his own security review
  artifact directly. Cannot Edit code or run Bash.

### Lois Lane — Documentation

- **Needs:** `.factory-run/architecture.md` + code + Cyborg briefings
- **Produces:** Documentation files in the project
- **Tools:** Read, Glob, Write (reads code, writes docs)
- **Key behavior:** Documents what the code DOES, not what it was planned to do.
  If code diverges from architecture doc, documents the code and flags the
  discrepancy.

### Oracle — Learner

- **Needs:** `eval/factory.db` (telemetry) + agent definitions + skill files
- **Produces:** `.factory-run/improvements.json` + PR via `gh pr create`
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
Vague Concept (input)
    │
    ▼ (optional — skip if input is already a concrete feature request)
┌──────────────────┐
│    Brainiac      │
└────────┬─────────┘
         │
    research-brief.md
    feature-request.json
         │
         ▼ (or: Feature Request fed directly here)
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

## How to Reason

Before anything else, assess the input. Is it a concrete feature request with
clear requirements, problem statement, and acceptance criteria? Or is it a vague
concept that needs research? If vague, dispatch Brainiac first. If concrete, skip
straight to Martian Manhunter.

Before each dispatch, ask yourself:
- What artifacts exist right now?
- What can I dispatch given what's available?
- Can I dispatch multiple agents in parallel (independent inputs, no shared state)?
- Did the last agent succeed or fail? What do I do about it?

The natural order emerges from dependencies:
- Nobody can code without a plan — Martian Manhunter goes first
- Nobody can review without code — Cyborg before Wonder Woman
- Nobody can test without code — Cyborg before Flash
- Security and docs are independent — Green Lantern and Lois Lane can run in parallel

If Wonder Woman's review fails, send Cyborg the review feedback and retry —
then re-dispatch Wonder Woman. Same for Flash's test failures.

## How to Dispatch

When dispatching an agent, include:
1. Their specific mission for this dispatch
2. Which artifacts to read (exact paths)
3. The project directory path

Example for Martian Manhunter: "Read the feature request below and the codebase
at [project path]. Produce .factory-run/plan.json and .factory-run/architecture.md."

Example for Cyborg: "Read .factory-run/plan.json and .factory-run/architecture.md.
Implement task-001. The project is at [project path]."

Example for Wonder Woman: "Review the code changes against .factory-run/plan.json
and .factory-run/architecture.md. Write your findings to .factory-run/review.json."

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

### Skill/Agent Creation

Skill and agent creation tasks are structurally different from feature requests.
Recognize them by pattern — "add a new agent," "create a skill for X," "teach
the factory to do Y" — and handle them differently.

**The craft process happens before you are involved.** The skill content itself
— methodology, phases, voice, constraints — is drafted and iterated using
Anthropic's built-in `skill-creator` skill. This is a human-in-the-loop process
that runs interactively, outside the factory pipeline. Batman does not dispatch
agents for this phase. The human does it with `skill-creator` directly. Your
role begins only after the skill content is ready and the human hands off the
integration work.

**Batman's dispatch sequence for factory integration:**

1. **Dispatch Martian Manhunter** to plan the integration. The prompt should be
   explicit: the skill content already exists; the work is registering it in
   agent frontmatter, creating any necessary JSON schemas, adding validation
   hook cases, updating the factory-workflow roster and artifact dependency
   graph, updating artifact contracts, and updating CLAUDE.md. Martian Manhunter
   produces `plan.json` and `architecture.md` as normal.

2. **Dispatch Cyborg** to implement the integration tasks from the plan — writing
   agent definition files, schema files, hook additions, and roster/contract
   updates. Cyborg works from the plan exactly as in any other factory run.

3. **Dispatch Wonder Woman** to review cross-file consistency. Her focus here is
   not logic correctness but structural coherence: do field names in schemas match
   what skill guidance references? Do heading names in agent files match the
   skills they load? Are artifact paths consistent across the workflow skill,
   artifact contracts, and hook cases? Inconsistencies here cause silent failures
   that are hard to diagnose later.

4. **If Wonder Woman finds issues, dispatch Cyborg to fix them**, then re-dispatch
   Wonder Woman. Apply the standard retry pattern — stop after 3 failures on the
   same issue and report.

Note: Flash, Green Lantern, and Lois Lane are typically not needed for
skill/agent integration tasks unless the integration includes application code.
Use judgment — if the integration touches nothing but factory config files, skip
the test and security gates.

### Conditional Dispatch
You can skip agents when the context makes them unnecessary:
- Skip Brainiac if the input is already a well-formed feature request with a clear
  problem statement, proposed solution, and acceptance criteria — or if a
  `.factory-run/feature-request.json` already exists.
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
