# Enterprise Factory Roadmap — Design Spec

**Date:** 2026-04-10
**Status:** Draft
**Goal:** Make the Justice League Factory enterprise-ready as both a production software factory and a teaching tool for agentic development, without adding new agents.

## Context

The factory has 9 well-scoped agents, 13 skills, JSON schema contracts, SQLite telemetry, and a basic dashboard. The primary quality problem is front-loaded: planning and architecture don't account for user experience, edge cases, or sound engineering principles. The factory builds what's specified but not what's *right*. Secondary problems are lack of configurable autonomy and limited observability.

### Design Constraints

- No new agents — improve quality through better skills and smarter Batman orchestration
- Preserve the factory's value as a teaching tool — changes must be legible and demonstrable
- No one-way doors against future multi-tenancy
- Interactive Claude Code usage is the primary interface; headless scripting is secondary
- Preserve the current dashboard visual design (dark theme, color palette, fonts)

## Layer 1: Quality

The core insight: quality is won or lost before a line of code is written. The fix is richer methodology via skills and smarter orchestration from Batman.

### 1.1 New Skill: product-thinking

**Used by:** Brainiac, Martian Manhunter (via Batman's prompting)

Injects user-centric reasoning into the research and planning phases:

- **User journey mapping** — for every feature, enumerate user flows: happy path, error states, empty states, edge cases, first-time vs. returning user
- **"What happens when..." checklist** — what happens when the user has no data? When permissions are wrong? When they share something — how does the recipient know? When they're offline? When concurrent users hit the same resource?
- **Notification and communication flows** — if a feature involves multiple users, map how information flows between them (in-app notifications, emails, real-time updates)
- **Outcome framing** — "what is the user trying to accomplish?" not "what does the code need to do?"

### 1.2 New Skill: architectural-principles

**Used by:** Martian Manhunter, Cyborg, Wonder Woman (shared single source of truth)

A cross-cutting skill that defines what good software looks like. When updated (manually or via Oracle), changes propagate to all consuming agents.

- **SOLID principles** — single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion. Applied contextually: MM uses them for task decomposition, Cyborg for class/module design, Wonder Woman for review criteria.
- **12-factor app** — externalize config, treat backing services as attached resources, store nothing in the process, logs as event streams, dev/prod parity
- **DRY** — don't repeat yourself, but don't over-abstract prematurely either
- **KISS** — simplest solution that meets the requirement
- **Migration-first mindset** — schema changes get migrations, not workarounds
- **Configuration over hardcoding** — values that could vary by environment or over time go in config
- **Data-driven over code-driven** — if it's a list of things that could change, it's data, not an enum
- **Defensive design** — validate inputs at system boundaries, handle edge cases, fail gracefully with useful error messages

**Audit existing implementation-standards:** Before creating this skill, audit the current `implementation-standards` skill and extract anything that's a universal principle (not Cyborg-specific) into `architectural-principles`. What remains in `implementation-standards` should be purely about how Cyborg writes code — file organization, pattern matching with the existing codebase, commit practices.

### 1.3 Enhanced Skill: implementation-standards

**Used by:** Cyborg

After the audit above, this skill retains only Cyborg-specific implementation concerns and references `architectural-principles` for shared principles. No duplication between the two skills.

### 1.4 Enhanced Skill: review-criteria

**Used by:** Wonder Woman

Updated to check against:
- `architectural-principles` — flag violations of SOLID, 12-factor, DRY, KISS
- Definition-of-done — verify each plan task's acceptance criteria are met
- Test coverage matrix — if acceptance criteria lack tests, the review fails

### 1.5 Enhanced Skill: testing-methodology

**Used by:** Flash

Updated to map tests to plan artifacts with a structured coverage hierarchy:

1. **Acceptance criteria tests** — every acceptance criterion in plan.json gets at least one test. If it doesn't have a test, it's not done.
2. **User journey tests** — each user flow identified by product-thinking gets an E2E Playwright test covering the happy path end-to-end.
3. **Edge case / error state tests** — each "what happens when..." scenario from product-thinking gets a test: empty states, permission failures, invalid input, concurrent access.
4. **Regression guardrails** — for brownfield work, identify existing functionality that could break and verify existing tests cover it (or add regression tests).

Flash's output (`test-results.json`) includes a **coverage matrix**: which acceptance criteria have tests, which user journeys are covered, which edge cases are tested, and what's missing.

### 1.6 Schema Change: definition-of-done in plan.json

Extend the `plan.schema.json` to require each task to include:

- **user_impact** — one sentence describing what this task enables for the end user
- **edge_cases** — list of edge cases considered and how they're handled
- **rollback_strategy** — how to undo this task if it causes problems
- **acceptance_criteria** — behavioral criteria that test outcomes, not implementation details

This is schema-enforced via the existing `validate-artifact.sh` hook — plans that omit these fields fail validation.

### 1.7 Multi-Phase Batman Orchestration

Batman's dispatch strategy changes from "send prompt, get artifact" to multi-phase engagement with the same agents. At the start of each run, Batman generates a unique `factory_run_id` (trace ID) and passes it to every agent dispatch for telemetry correlation.

1. **Brainiac phase** — Batman prompts Brainiac to produce research brief + product-thinking analysis (user journeys, edge cases, "what happens when..." scenarios). The `product-thinking` skill guides this.
2. **Martian Manhunter phase 1** — Plan + architecture as today. The `architectural-principles` and `product-thinking` skills are active. Definition-of-done schema enforces quality in plan.json.
3. **Martian Manhunter phase 2 (Devil's Advocate)** — Batman sends the plan back to MM: "Review your own plan as a devil's advocate — what did you miss? What user scenarios aren't covered? What engineering shortcuts will cause problems later?" MM revises the plan.
4. **Cyborg phase** — Implementation with `architectural-principles` and enhanced `implementation-standards` active.
5. **Quality gates** — Wonder Woman reviews against `architectural-principles` + definition-of-done + test coverage matrix. Flash maps tests to plan artifacts per the enhanced `testing-methodology`. Green Lantern unchanged.
6. **Lois Lane phase** — Documentation unchanged.

The key teaching concept: the orchestrator's job isn't just sequencing — it's driving quality through how it engages each agent.

## Layer 2: Autonomy

A configurable "dial" from pair programming to overnight autonomous runs.

### 2.1 Three Gates

The pipeline has three natural decision points:

| Gate | When | What you're approving |
|------|------|-----------------------|
| **spec** | After Brainiac's research | "Is this the right thing to build?" |
| **plan** | After MM's plan + devil's advocate | "Is this the right way to build it?" |
| **ship** | After implementation + all quality gates | "Is this ready to ship?" |

### 2.2 Three Modes Per Gate

| Mode | Behavior |
|------|----------|
| `auto` | Agent runs, output is logged, pipeline continues without pausing |
| `review` | Agent runs, Batman presents a summary and waits for human approval, rejection with feedback, or "approve and go auto for the rest" |
| `skip` | Stage is skipped entirely (e.g., skip spec for a well-defined feature request) |

### 2.3 How It Works

- **No defaults.** Batman always asks at the start of every run: "How hands-on do you want to be? I can pause for your review after the spec, after the plan, and/or before shipping — or run any of those autonomously. What do you want for this run?"
- **Conversational specification.** The user tells Batman in natural language: "let me approve the plan, rest is auto" or "full autonomy, I'll review the PR" or "I want to review everything."
- **Mid-run override.** The user can change gate settings mid-run: "actually, just finish, I'll review the PR."
- **Proactive escalation.** Regardless of gate settings, Batman surfaces problems rather than silently continuing — test failures, critical review findings, major plan revisions during devil's advocate. Full autonomy means "I trust you unless something is off," not "never ask me."

### 2.4 Headless Mode

When run via `run-factory.sh`, autonomy is passed in the initial prompt to Batman:

```bash
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md \
  --gates "spec=auto plan=auto ship=auto"
```

This is a secondary interface. Interactive Claude Code usage is the primary path.

## Layer 3: Observability

Full dashboard rebuild as a React SPA with FastAPI backend, preserving the current visual design.

### 3.1 Dashboard Views

**View 1: Run Summary (home page)**
- Stats bar: runs today, shipped, failed, awaiting review, total cost
- Run cards with: feature name, status (shipped/failed/awaiting/in-progress), PR link, task count, review iterations, test count, security findings, cost, duration
- Click any run to drill into the trace view

**View 2: Run Trace**
- Timeline showing every agent dispatch in chronological order
- Each node shows: agent name, phase, duration, cost, token count, artifacts produced
- Human gates appear inline with approval/rejection and comments
- Parallel quality gates (Wonder Woman, Flash, Green Lantern) shown side-by-side
- Cyborg tasks expandable to show individual task traces
- Devil's advocate pass highlighted with what changed

**View 3: Trends & Analytics**
- First-pass success rate over time (review iterations trending down = Oracle is helping)
- Cost per shipped feature over time
- Agent failure rate by role
- Test coverage trends
- Time-to-ship by feature complexity

**View 4: Log Viewer (preserved)**
- The existing log viewer from the current dashboard, accessible as a tab
- Retains current functionality: pagination, filtering by timestamp/agent, clickable transcript overlay

**View 5: Agent Transcript**
- Accessible from the trace view by clicking into any agent run
- Full LLM conversation: system prompt, user messages, assistant responses, tool calls and results
- Useful for debugging why an agent made a particular decision

### 3.2 Architecture

- **Frontend:** React SPA. Inherits current color scheme, fonts, and dark theme from `dashboard/style.css`. Use a charting library (Recharts or similar) for analytics.
- **Backend:** Lightweight FastAPI server exposing REST API over the existing SQLite telemetry DB. Replaces the current `serve-dashboard.sh` Python HTTP server.
- **Real-time:** WebSocket or SSE for live updates during active runs (agent status changes, gate pauses).
- **No separate database.** SQLite remains the single source of truth. The backend reads it; hooks write to it.

### 3.3 Telemetry Changes

To power the new dashboard views, the telemetry infrastructure needs these additions:

**Trace ID propagation:**
- Batman generates a unique `factory_run_id` at the start of each run
- This ID is passed to every agent dispatch and recorded in `agent_runs`
- All events, artifacts, and transcripts for a run are queryable by this single ID

**Cost tracking:**
- Telemetry hooks already capture token counts and model names
- Add a pricing lookup (model → cost per input/output token) to calculate cost per agent run
- Aggregate to cost per factory run

**Gate events:**
- New event type in the `events` table: `gate_review`
- Records: gate name (spec/plan/ship), action (approved/rejected/skipped), human comment, wait duration

**Coverage matrix:**
- Flash's `test-results.json` extended with a `coverage_matrix` field mapping acceptance criteria → test names
- Stored and queryable for trend analysis

**Extended agent_runs table:**
- Add columns: `gate_status`, `artifacts_produced` (JSON list), `artifacts_consumed` (JSON list), `phase` (e.g., "plan_v1", "devils_advocate")

## Phasing

This design should be implemented in order of impact:

**Phase 1: Quality (highest impact, addresses primary pain)**
1. Create `product-thinking` skill
2. Create `architectural-principles` skill (audit `implementation-standards` first)
3. Update `implementation-standards` (strip to Cyborg-specific, reference shared skill)
4. Update `testing-methodology` (coverage matrix, acceptance criteria mapping)
5. Update `review-criteria` (check against architectural-principles + coverage matrix)
6. Extend `plan.schema.json` with definition-of-done fields
7. Update Batman's `factory-workflow` skill with multi-phase orchestration and devil's advocate pass

**Phase 2: Autonomy**
1. Update Batman's agent definition and `factory-workflow` skill with gate logic
2. Update `run-factory.sh` to support `--gates` flag

**Phase 3: Observability**
1. Extend telemetry hooks (trace ID, cost tracking, gate events)
2. Extend SQLite schema (new columns, new event types)
3. Build FastAPI backend
4. Build React dashboard (run summary → trace → analytics → log viewer → transcript)
5. Retire old `dashboard/` static files (or keep as fallback)

## Out of Scope

- New agents (Product Thinker, Devil's Advocate as separate agents)
- Multi-tenancy, RBAC, billing
- Multi-model A/B testing framework
- CI/CD integration, webhook triggers
- Automated Oracle continuous improvement loop (Oracle stays manual for now)
- Skill versioning and rollback infrastructure
