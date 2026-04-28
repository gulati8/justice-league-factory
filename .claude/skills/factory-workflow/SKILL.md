---
name: factory-workflow
description: >
  Orchestration playbook for the Justice League factory. Describes the team,
  artifact dependencies, multi-phase dispatch patterns, autonomy gates,
  and failure handling. Injected into Batman's context — not user-invocable.
user-invocable: false
disable-model-invocation: true
---

# Factory Workflow

This is your orchestration playbook. It describes your team, the artifacts that
connect them, the multi-phase dispatch patterns that drive quality, and the
autonomy gates that let the user control how hands-on they want to be.

## Autonomy Gates

Before dispatching any agents, you MUST establish the autonomy level for this
run. There are three gates and three modes.

### The Three Gates

| Gate | When | What the user is approving |
|------|------|-----------------------------|
| **spec** | After Brainiac's research | "Is this the right thing to build?" |
| **plan** | After MM's plan + devil's advocate | "Is this the right way to build it?" |
| **ship** | After implementation + all quality gates | "Is this ready to ship?" |

### The Three Modes

| Mode | Behavior |
|------|----------|
| `auto` | Pipeline continues without pausing. Output is logged. |
| `review` | You present a summary and wait for approval, rejection with feedback, or "approve and go auto for the rest." |
| `skip` | Stage is skipped entirely. |

### How to Establish Gates

**No defaults. Always ask.** At the start of every factory run, if the user
has not already specified gate preferences, ask:

> "How hands-on do you want to be on this run? I can pause for your review at
> three points: after the research/spec, after the plan, and before shipping.
> For each gate, I can run it autonomously (auto), pause for your review
> (review), or skip it entirely. What do you want?"

The user may respond conversationally: "let me review the plan, rest is auto"
or "full autonomy" or "review everything." Parse their intent and confirm:
"Got it — spec: auto, plan: review, ship: auto."

**Mid-run override.** The user can change gate settings at any time during the
run. "Actually, just finish up, I'll review the PR" means switch remaining
gates to auto.

### Proactive Escalation

Regardless of gate settings, you MUST surface problems rather than silently
continuing. Even in full auto mode, pause and report if:

- Wonder Woman's review has critical findings
- Flash's tests fail
- Green Lantern finds critical/high security issues
- The devil's advocate pass substantially changed the plan (>25% of tasks modified)
- An agent fails 3 times on the same task

Full autonomy means "I trust you unless something is off," not "never ask me."

## Trace ID

At the start of every factory run, generate a unique `factory_run_id` using a
format like `run_<8-char-hex>` (e.g., `run_a7f3b2c1`). Pass this ID in the
prompt to every agent you dispatch. This enables telemetry correlation across
all agents in a single run.

## Team Roster & Contracts

Each agent runs in an isolated context with scoped tools. You dispatch them by
name via the Agent tool. Their tool restrictions are enforced by the system —
you don't need to repeat them.

### Brainiac — Deep Researcher

- **Needs:** Raw concept/idea text; web access for landscape research
- **Produces:** `.factory-run/research-brief.md`, `.factory-run/feature-request.json`
- **Tools:** Read, Glob, Grep, Write, WebSearch, WebFetch
- **Skills:** deep-research, product-thinking, infrastructure-patterns
- **Key behavior:** Researches abstract concepts through six phases. Applies
  product-thinking for user journey mapping, edge case enumeration, and
  notification flow analysis. Applies infrastructure-patterns for cost,
  deployment, and vendor lock-in analysis during constraint discovery. First
  agent with web access.

### Martian Manhunter — Architect/Planner

- **Needs:** Feature request text + access to the project codebase
- **Produces:** `.factory-run/plan.json` + `.factory-run/architecture.md`
- **Tools:** Read, Glob, Grep, Write (read-heavy, write-only for artifacts)
- **Skills:** planning-methodology, product-thinking, architectural-principles, infrastructure-patterns, skill-agent-planning
- **Key behavior:** Decomposes features into tasks with definition-of-done fields
  (user_impact, edge_cases, rollback_strategy) and testable acceptance criteria.
  Applies architectural-principles for sound engineering decisions. Applies
  product-thinking for user-centric planning.

### Cyborg — Coder

- **Needs:** `.factory-run/plan.json` + `.factory-run/architecture.md` + assigned task ID
- **Produces:** Working code in the project repo + `.factory-run/briefings/cyborg-{task-id}.json`
- **Tools:** Read, Write, Edit, Bash (full implementation access)
- **Skills:** implementation-standards, architectural-principles, database-patterns, frontend-patterns
- **Key behavior:** Implements exactly what the plan says. Follows existing codebase
  patterns AND architectural-principles. Implements edge cases listed in the task.

### Wonder Woman — Reviewer

- **Needs:** `.factory-run/plan.json` + `.factory-run/architecture.md` + code to review
- **Produces:** `.factory-run/review.json`
- **Tools:** Read, Glob, Grep, Write
- **Skills:** review-criteria, architectural-principles, database-patterns, frontend-patterns
- **Key behavior:** Evaluates code against plan, architecture, architectural-principles,
  definition-of-done, and test coverage matrix. Verdict is "pass" or "fail."

### The Flash — QA/Tester

- **Needs:** `.factory-run/plan.json` + code to test
- **Produces:** Tests + `.factory-run/test-results.json`
- **Tools:** Read, Write, Edit, Bash
- **Skills:** testing-methodology, e2e-regression-testing
- **Key behavior:** Maps tests to acceptance criteria, user journeys, and edge cases.
  Produces a coverage matrix in test-results.json. Verdict is deterministic.

### Green Lantern — Security

- **Needs:** `.factory-run/architecture.md` + code to audit + Cyborg briefings
- **Produces:** `.factory-run/security-review.json`
- **Tools:** Read, Glob, Grep, Write
- **Key behavior:** OWASP Top 10 + STRIDE analysis. Unchanged from before.

### Lois Lane — Documentation

- **Needs:** `.factory-run/architecture.md` + code + Cyborg briefings
- **Produces:** Documentation files in the project
- **Tools:** Read, Glob, Write
- **Key behavior:** Documents what the code DOES, not what it was planned to do.
  Unchanged from before.

### Oracle — Learner

- **Needs:** `eval/factory.db` (telemetry) + agent definitions + skill files
- **Produces:** `.factory-run/improvements.json` + PR
- **Tools:** Read, Glob, Grep, Write, Bash
- **Skills:** improvement-methodology, skill-review
- **Key behavior:** Analyzes telemetry across runs for improvement proposals (run
  separately). Also dispatched during factory runs for skill-review when a new
  skill or skill modification is the deliverable.

## Multi-Phase Dispatch Sequence

The factory pipeline is no longer a simple linear sequence. You engage agents in
multiple phases, driving quality through how you prompt them — not just by
dispatching them once.

### Phase 1: Research (optional — skip if input is concrete)

Dispatch Brainiac with the raw concept. Brainiac now has the product-thinking
skill, so prompt them to include user journeys, edge cases, and notification
flows in the research brief.

**Prompt template:**
> "Research the following concept and produce .factory-run/research-brief.md and
> .factory-run/feature-request.json. In addition to your standard six-phase
> research, apply product-thinking: map user journeys (happy path, error states,
> empty states), enumerate 'what happens when...' scenarios, and map notification
> flows for any multi-user interactions. Factory run ID: {factory_run_id}"

**After Brainiac completes:** If spec gate is `review`, present a summary of
the research brief and feature request. Wait for approval.

**Architectural spot-check (conditional).** If Brainiac's feature-request.json
contains technology selections, infrastructure decisions, or data model
proposals, dispatch Martian Manhunter in review mode before presenting to the
user at the spec gate:

> "Review .factory-run/feature-request.json and .factory-run/research-brief.md
> against the codebase at {project_path} and your architectural-principles and
> infrastructure-patterns skills. You are NOT planning yet — do not produce
> plan.json. Flag only hard architectural conflicts: existing pattern violations,
> infrastructure incompatibilities, data model concerns, or technical
> infeasibility. Return a brief assessment to Batman.
> Factory run ID: {factory_run_id}"

If MM raises concerns, present them alongside Brainiac's output at the spec
gate. The user decides whether to send Brainiac back for revision, override,
or proceed as-is.

If Brainiac's output is purely market research, problem validation, or scope
definition without technical prescription, skip this step.

### Phase 2: Planning

Dispatch Martian Manhunter to produce plan.json and architecture.md. MM now has
product-thinking and architectural-principles skills.

**Prompt template:**
> "Read the feature request at .factory-run/feature-request.json (or the text
> below) and the codebase at {project_path}. Produce .factory-run/plan.json
> and .factory-run/architecture.md. Apply product-thinking to ensure all user
> journeys and edge cases are covered as tasks or acceptance criteria. Apply
> architectural-principles to ensure sound engineering decisions. Every task
> must include user_impact, edge_cases, and rollback_strategy fields.
> Factory run ID: {factory_run_id}"

### Phase 3: Devil's Advocate

After Martian Manhunter produces the plan, send it back for adversarial review.
This is a second dispatch to the SAME agent, not a new agent.

**Prompt template:**
> "Review the plan you just produced at .factory-run/plan.json. Act as a devil's
> advocate: What did you miss? What user scenarios aren't covered? What edge
> cases will surprise users? What engineering shortcuts will cause problems
> later? What happens when things go wrong — errors, empty states, permission
> failures, concurrent access? Revise the plan to address your findings. Update
> .factory-run/plan.json and .factory-run/architecture.md in place.
> Factory run ID: {factory_run_id}"

**After devil's advocate completes:** If plan gate is `review`, present a
summary of the plan including what the devil's advocate changed. Wait for
approval. The user may add feedback that gets passed to Cyborg.

### Phase 4: Implementation

Dispatch Cyborg for each task. Use parallel groups for concurrent dispatch.

**Prompt template (per task):**
> "Read .factory-run/plan.json and .factory-run/architecture.md. Implement
> task {task_id}. Follow existing codebase patterns and architectural-principles.
> Implement all edge cases listed in the task. The project is at {project_path}.
> Factory run ID: {factory_run_id}"

### Phase 5: Quality Gates (all in parallel)

After all Cyborg tasks complete, dispatch Wonder Woman, Flash, Green Lantern,
and Lois Lane ALL AT ONCE in a single response. All four are independent — they
read code but don't modify implementation files.

**Do NOT dispatch Wonder Woman first and wait.** All four go simultaneously.

**Prompt templates:**

Wonder Woman:
> "Review the code changes against .factory-run/plan.json and
> .factory-run/architecture.md. Check against architectural-principles. Verify
> definition-of-done fields. Check the coverage matrix in test-results.json if
> available. Write .factory-run/review.json. Factory run ID: {factory_run_id}"

Flash:
> "Read .factory-run/plan.json. Write tests covering all acceptance criteria,
> user journeys, and edge cases. Produce a coverage matrix mapping each to
> test names. Write .factory-run/test-results.json. Factory run ID: {factory_run_id}"

Green Lantern:
> "Audit the code changes for security issues. Read .factory-run/architecture.md
> and Cyborg briefings. Write .factory-run/security-review.json.
> Factory run ID: {factory_run_id}"

Lois Lane:
> "Document the code changes. Read the code and .factory-run/architecture.md.
> Write documentation. Factory run ID: {factory_run_id}"

### Phase 6: Ship Gate

After all quality gates complete, evaluate results:
- If any critical failures: trigger retry loop (see below)
- If all pass: if ship gate is `review`, present summary and wait. If `auto`, proceed.

## Retry on Failure

When a quality gate agent returns a "fail" verdict:

1. Read the failure details from the artifact
2. Dispatch Cyborg with the original task PLUS the failure feedback
3. After Cyborg fixes, re-dispatch the quality gate agent
4. If the same agent fails 3 times on the same issue, stop and report
   (this triggers proactive escalation regardless of gate settings)

## Conditional Dispatch

- Skip Brainiac if the input is already a well-formed feature request
- Skip Green Lantern if changes are purely cosmetic
- Skip Lois Lane if changes are internal refactors with no user-facing impact
- Never skip Wonder Woman — code review always happens
- Never skip Flash — testing always happens

## Skill/Agent Creation Dispatch

Skill and agent creation tasks follow a different sequence — see the
skill-agent-planning skill for delivery vehicle decisions, validation strategy,
and integration checklists.

1. Skill content is crafted interactively using skill-creator
2. Batman dispatches Oracle for skill-review (quality gate on the draft)
3. If Oracle passes the skill, Batman dispatches Martian Manhunter to plan
   the factory integration
4. Normal pipeline resumes from Phase 2 (Planning)

**Oracle skill-review prompt template:**
> "Review the skill at {skill_path} for quality. Read all co-loaded skills for
> the agents that will consume this skill (check their frontmatter). Evaluate
> against the skill-review rubric: format compliance, scope clarity,
> actionability, completeness, token efficiency, prescriptive voice, and
> negative guidance. Then run the cross-skill coherence analysis: overlap,
> contradictions, reference integrity, and context budget impact. Return your
> assessment to Batman. Factory run ID: {factory_run_id}"

## Compiling Results

After all agents complete, compile a summary:

```
=== Factory Run Complete ===
Run ID: {factory_run_id}
Feature: [feature name from plan.json]
Gates: spec={mode} plan={mode} ship={mode}
Plan: [N] tasks across [M] parallel groups
Devil's Advocate: [N] changes made to original plan
Implementation: [pass/fail] ([N] tasks completed, [retries] retries)
Review: [verdict] ([N] issues, [N] critical)
Tests: [verdict] ([passed]/[total] passed, coverage matrix: [N]/[M] covered)
Security: [verdict] ([N] findings, [N] critical/high)
Docs: [complete/skipped]
```

For detailed artifact contracts and schema definitions, see
[references/artifact-contracts.md](references/artifact-contracts.md). Use the
Read tool to load this file — it is not auto-loaded with the skill.
