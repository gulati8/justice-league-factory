# Enterprise Factory — Quality & Autonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve factory output quality through better skills, richer schema contracts, and multi-phase Batman orchestration — then add configurable autonomy gates.

**Architecture:** No new agents. Quality improvements come from two new skills (`product-thinking`, `architectural-principles`), enhanced existing skills (`implementation-standards`, `testing-methodology`, `review-criteria`), an extended `plan.schema.json` with definition-of-done fields, and a rewritten `factory-workflow` skill that drives multi-phase agent engagement with devil's advocate passes. Autonomy comes from three configurable gates (spec, plan, ship) that Batman asks about at the start of every run.

**Tech Stack:** Markdown skill files, JSON Schema, Bash scripts, YAML frontmatter

**Spec:** `docs/superpowers/specs/2026-04-10-enterprise-factory-roadmap-design.md`

**Follow-up plan:** Phase 3 (Observability — React dashboard, FastAPI backend, telemetry extensions) will be planned separately once this plan ships. See spec sections 3.1–3.3.

---

### Task 1: Create architectural-principles skill

This is the shared single source of truth for what good software looks like. Used by Martian Manhunter (task decomposition), Cyborg (implementation), and Wonder Woman (review). Content is audited from the existing `implementation-standards` skill — anything that's a universal principle (not Cyborg-specific) lives here.

**Files:**
- Create: `.claude/skills/architectural-principles/SKILL.md`

- [ ] **Step 1: Read existing implementation-standards skill**

Read `.claude/skills/implementation-standards/SKILL.md` to identify which content is universal (should move to architectural-principles) vs. Cyborg-specific (stays). The following are universal and should NOT appear in implementation-standards after the audit:
- "Follow existing patterns" guidance (universal — all agents should respect codebase conventions)
- Error handling philosophy
- Any implicit references to SOLID, DRY, KISS, config management

The following are Cyborg-specific and stay:
- Reading the plan (task assignment)
- Briefing format
- Verification checklist
- "What NOT to Do" list (Cyborg-specific constraints)
- "When Something Doesn't Match" (Cyborg decision-making)

- [ ] **Step 2: Create the architectural-principles skill**

Create `.claude/skills/architectural-principles/SKILL.md`:

```markdown
---
name: architectural-principles
description: >
  Shared architectural and engineering principles for planning, implementing,
  and reviewing code. Single source of truth for SOLID, 12-factor, DRY, KISS,
  and defensive design. Referenced by Martian Manhunter, Cyborg, and Wonder Woman.
user-invocable: false
disable-model-invocation: true
---

# Architectural Principles

These are the engineering principles that define what good software looks like in
this factory. Every agent that plans, implements, or reviews code references this
skill. When these principles are updated (manually or via Oracle), changes
propagate to all consuming agents automatically.

This skill defines the *what* — what good software looks like. Individual agent
skills (implementation-standards, review-criteria, planning-methodology) define
the *how* — how each agent applies these principles in their specific role.

## SOLID Principles

Apply contextually based on your role:

**Single Responsibility** — Each module, class, or function should have one
reason to change. When planning: decompose tasks so each touches one concern.
When implementing: don't let a file grow to do two unrelated things. When
reviewing: flag files that mix concerns (e.g., a route handler that also
formats emails).

**Open/Closed** — Software entities should be open for extension but closed for
modification. Prefer adding new files over modifying existing ones when adding
new behavior. When the plan calls for "add a new type of X," check whether the
existing code has an extension point (plugin pattern, strategy pattern, registry)
before modifying the core.

**Liskov Substitution** — Subtypes must be substitutable for their base types.
If the codebase uses interfaces or abstract classes, new implementations must
honor the full contract — not just the method signatures, but the behavioral
expectations.

**Interface Segregation** — Don't force consumers to depend on methods they
don't use. Prefer small, focused interfaces over large ones. When planning API
endpoints, each endpoint should do one thing.

**Dependency Inversion** — Depend on abstractions, not concretions. When the
codebase uses dependency injection, follow that pattern. When it doesn't, don't
introduce it — but do keep high-level modules independent of low-level details
by using clear interfaces between layers.

## 12-Factor App Principles

**Externalize configuration** — Values that vary by environment (URLs, ports,
feature flags, API keys, thresholds) belong in environment variables or config
files, never hardcoded in source. If a value could be different in staging vs.
production, it's config.

**Treat backing services as attached resources** — Databases, caches, queues,
email services are swappable resources. Access them through configuration, not
hardcoded connection strings.

**Store nothing in the process** — Don't rely on in-memory state persisting
between requests. If state needs to persist, put it in a database or cache.

**Logs as event streams** — Write logs to stdout. Don't manage log files, log
rotation, or log shipping in application code.

**Dev/prod parity** — Keep development, staging, and production as similar as
possible. Don't use different databases, different queues, or different patterns
across environments.

## DRY — Don't Repeat Yourself

When you see the same logic in two or more places, extract it — but only when the
duplication is real, not coincidental. Two pieces of code that happen to look
similar today but serve different purposes and will evolve differently are not
duplication. Three similar lines of code is better than a premature abstraction.

**The test:** If changing the logic in one place means you MUST change it in the
other place too (or risk a bug), it's real duplication. Extract it.

## KISS — Keep It Simple

The simplest solution that meets the requirement is the right solution. Don't
add layers of abstraction "in case we need them later." Don't use a design
pattern because it's clever — use it because the code demands it.

Complexity is justified only when:
- The requirement is genuinely complex (not when the solution is over-engineered)
- The simpler alternative has a concrete, articulable drawback (not hypothetical)
- The complexity pays for itself in the current iteration (not in a future one)

## Migration-First Mindset

Schema changes get migrations. Always. Never work around a schema change with
field mappings, SQL aliases, computed columns, or application-level transforms.
Migrations are not scary — they are the correct, reversible, auditable way to
evolve a schema.

When planning a task that touches data models:
- Include a migration file in the task's file list
- Include migration runner registration (npm scripts, CLI commands)
- Include type/schema updates that match the migration

When implementing: write the migration first, run it, then update the
application code to match.

When reviewing: if a schema change exists without a migration, flag it as
critical.

## Configuration Over Hardcoding

Values that could vary by environment, change over time, or differ between
deployments go in configuration — not in source code. This includes:

- API URLs, ports, hostnames
- Feature flags and toggles
- Rate limits, timeouts, retry counts
- Email addresses, notification templates
- Lists of allowed/blocked values

**The test:** If changing this value requires a code change and redeployment,
it should be config instead.

## Data-Driven Over Code-Driven

If something is a list of things that could change — categories, status values,
permission levels, supported formats — make it data, not an enum or switch
statement in code. Data can be updated without redeployment. Code requires a
release.

This doesn't mean every list needs a database table. A config file or constants
file that's easy to update is often sufficient. The point is: don't scatter
these values across business logic where they're hard to find and update.

## Defensive Design

**Validate at system boundaries** — Every input from users, external APIs,
webhooks, or file uploads should be validated. Internal function calls between
trusted modules don't need redundant validation.

**Handle edge cases** — What happens with empty inputs? Missing data? Null
values? Zero-length arrays? Concurrent access? The code should handle these
gracefully, not crash.

**Fail with useful errors** — When something goes wrong, the error message
should tell the user (or developer) what happened, what they can do about it,
and where to look for more information. "Internal server error" helps nobody.
"Failed to connect to payment processor — check STRIPE_API_KEY is set" helps
everybody.

**Never silently swallow errors** — Catch blocks that ignore exceptions are
bugs. If you catch an error, either handle it meaningfully, re-throw it, or
log it. Empty catch blocks are never acceptable.

## How Each Agent Applies These Principles

**Martian Manhunter (planning):** Use SOLID for task decomposition. Use 12-factor
to ensure config is externalized in the plan. Use defensive design to include
edge cases in acceptance criteria. Use migration-first to include migration tasks
for schema changes.

**Cyborg (implementation):** Follow all principles during coding. When the plan
doesn't specify how to handle something, default to these principles. Note any
principle-based decisions in your briefing under `notes_for_reviewer`.

**Wonder Woman (review):** Flag violations of these principles using the
appropriate severity. Migration-first violations are critical. Config-over-
hardcoding violations are warnings. KISS violations (over-engineering) are info.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/architectural-principles/SKILL.md
git commit -m "feat: add architectural-principles shared skill

Single source of truth for SOLID, 12-factor, DRY, KISS, migration-first,
config-over-hardcoding, data-driven design, and defensive design.
Referenced by Martian Manhunter, Cyborg, and Wonder Woman."
```

---

### Task 2: Update implementation-standards skill

Strip universal principles that now live in `architectural-principles`. Add a reference to the shared skill. Keep only Cyborg-specific guidance.

**Files:**
- Modify: `.claude/skills/implementation-standards/SKILL.md`

- [ ] **Step 1: Update the skill content**

Replace the entire contents of `.claude/skills/implementation-standards/SKILL.md` with:

```markdown
---
name: implementation-standards
description: >
  Standards for implementing code changes from a plan. Briefing format,
  verification steps, pattern-following guidance. Injected into Cyborg's context.
user-invocable: false
disable-model-invocation: true
---

# Implementation Standards

This guides how you turn a plan task into working code. Your job is precise
execution — not creative interpretation.

For shared engineering principles (SOLID, DRY, KISS, 12-factor, migration-first,
defensive design), see the `architectural-principles` skill — it's loaded into
your context alongside this one. When the plan doesn't specify how to handle
something, default to those principles and note your decision in the briefing.

## Reading the Plan

Your assigned task in `plan.json` contains everything you need:
- `description` — What to build
- `acceptance_criteria` — What "done" looks like (Flash tests against these)
- `user_impact` — Why this matters to the end user
- `edge_cases` — Edge cases to handle (not optional — implement them)
- `rollback_strategy` — How to undo this if it causes problems
- `files` — What files to create or modify
- `depends_on` — Tasks that should have completed before yours

Read the full plan to understand context, but only implement YOUR assigned task.
Other tasks belong to other Cyborgs.

## Following Existing Patterns

Before writing new code, read 2-3 existing files that do similar things in the
codebase. Your code should look like it was written by the same developer:

- Same file structure (imports at top, exports at bottom, etc.)
- Same naming conventions (camelCase vs snake_case, singular vs plural)
- Same error handling patterns (try/catch style, error response format)
- Same middleware/decorator usage
- Same test patterns (though you don't write tests — just be aware of them)

## Verification Checklist

Before declaring your task complete, verify:

1. **Compilation/syntax** — Does the code compile? Run type checks if TypeScript.
2. **Imports** — Are all imports valid? No missing dependencies?
3. **Integration** — Is the new code wired into the application? (Routes
   registered, middleware applied, exports added)
4. **Existing tests** — Do existing tests still pass? Run the test suite if one
   exists. (Don't fix failing NEW tests — that's Flash's domain. But you
   shouldn't break EXISTING tests.)
5. **Edge cases** — Did you implement the edge cases listed in the task? Each
   one should be handled, not ignored.

## Briefing Format

Your briefing (`.factory-run/briefings/cyborg-{task-id}.json`) is consumed by
Wonder Woman (reviewer) and Batman (orchestrator). Include:

- **files_created / files_modified** — Exact paths. Wonder Woman reads these.
- **summary** — What you built and any decisions you made. Keep it factual.
- **notes_for_reviewer** — Anything non-obvious: "Used the existing middleware
  chain pattern from src/middleware/auth.ts", "Plan said 'validate input' but
  didn't specify rules — used the same Joi schema pattern as other endpoints.
  Applied architectural-principles: config-over-hardcoding for the threshold
  value."

## When Something Doesn't Match

If the plan says one thing but the codebase says another:
- Follow the codebase pattern, not the plan
- Note the discrepancy in your briefing under `notes_for_reviewer`
- Wonder Woman will catch it if it matters

If the plan is genuinely ambiguous:
- Implement the simplest interpretation (KISS from architectural-principles)
- Note what you chose and why in the briefing

## What NOT to Do

- Don't refactor code outside your task scope
- Don't add error handling the plan didn't specify (unless edge_cases lists it)
- Don't add logging, comments, or documentation (Lois Lane handles docs)
- Don't write tests (Flash handles tests)
- Don't optimize for performance unless the plan explicitly says to
- Don't install new dependencies unless the plan specifies them
- Don't hardcode values that should be config — check architectural-principles
- Don't skip migrations for schema changes — check architectural-principles
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/implementation-standards/SKILL.md
git commit -m "refactor: strip shared principles from implementation-standards

Universal principles (SOLID, DRY, KISS, 12-factor, etc.) now live in the
shared architectural-principles skill. Implementation-standards retains only
Cyborg-specific guidance: plan reading, pattern following, verification,
briefing format. References architectural-principles for shared concerns.

Also adds references to new plan.json definition-of-done fields
(user_impact, edge_cases, rollback_strategy)."
```

---

### Task 3: Create product-thinking skill

Injects user-centric reasoning into research and planning. Used by Brainiac and Martian Manhunter via Batman's prompting.

**Files:**
- Create: `.claude/skills/product-thinking/SKILL.md`

- [ ] **Step 1: Create the product-thinking skill**

Create `.claude/skills/product-thinking/SKILL.md`:

```markdown
---
name: product-thinking
description: >
  User-centric reasoning for research and planning. User journey mapping,
  edge case enumeration, notification flows, and outcome framing. Injected
  into Brainiac and Martian Manhunter to ensure features are designed for
  real users, not just technical correctness.
user-invocable: false
disable-model-invocation: true
---

# Product Thinking

This guides how you think about features from the user's perspective. Technical
correctness is necessary but not sufficient — a feature that works but doesn't
serve the user's actual need is a failure. Your job is to ensure every feature
is designed with the end user in mind.

## Outcome Framing

Before designing anything, answer: **"What is the user trying to accomplish?"**

Not "what does the code need to do" — that comes later. Start with the human
outcome. A user doesn't want "a POST endpoint that creates a share record."
A user wants "to let a colleague see their profile so they can collaborate."
The difference matters because the technical implementation that serves the
outcome includes things the endpoint-focused framing misses: How does the
colleague find out? What do they see when they open it? What if they don't
have an account?

Write the outcome as a single sentence in your output. Every decision downstream
should be traceable to this outcome.

## User Journey Mapping

For every feature, enumerate the complete user flows. Don't stop at the happy
path — the happy path is usually obvious and rarely where quality breaks down.

**For each flow, walk through:**

1. **Entry point** — How does the user discover/access this feature? Is it a
   button, a menu item, a URL, a notification? Is it obvious or hidden?
2. **Happy path** — The ideal flow from start to finish. What does the user
   see at each step? What actions do they take?
3. **First-time experience** — What does a new user see? Is there an empty
   state? Onboarding? A tutorial? If the feature depends on having data (e.g.,
   "view your history"), what happens when there's no history yet?
4. **Error states** — What happens when something goes wrong? Network failure?
   Invalid input? Permission denied? The user should always know what happened
   and what to do about it.
5. **Edge cases** — What happens at the boundaries? Zero items? Maximum items?
   Concurrent users? Very long text? Special characters? What happens when the
   user tries to do the wrong thing?
6. **Exit point** — How does the user know they're done? Is there confirmation?
   Can they undo?

## "What Happens When..." Checklist

For every feature, systematically ask these questions. If you can't answer one,
it's an open question that must be addressed in the plan — not silently ignored.

**Data states:**
- What happens when the user has no data? (Empty state)
- What happens when the user has too much data? (Pagination, truncation, search)
- What happens when the data is stale or out of date?
- What happens when two users modify the same data concurrently?

**User states:**
- What happens when the user is not logged in?
- What happens when the user doesn't have permission?
- What happens when the user's session expires mid-action?
- What happens when the user is on a slow connection?
- What happens when the user is on a mobile device?

**Multi-user flows:**
- If this feature involves multiple users, how does each user find out about
  the other's action? (Notification, email, real-time update, next-login prompt)
- What happens if the target user doesn't exist?
- What happens if the target user declines or ignores the action?
- What happens if the initiating user revokes the action before the target responds?

**System states:**
- What happens when an external dependency is down? (API, email service, payment processor)
- What happens when the operation partially succeeds? (3 of 5 items processed)
- What happens when the operation times out?
- What happens when the user retries an operation that already succeeded?

## Notification and Communication Flows

When a feature involves more than one user, map the communication flow explicitly.
A feature that creates a "share" is useless if the recipient has no way to
discover they were shared with.

For each cross-user interaction:
- **Trigger:** What action creates the notification?
- **Channel:** How is the recipient notified? (In-app, email, push, SMS)
- **Timing:** Immediately? On next login? Batched daily?
- **Content:** What does the notification say? Is it actionable? (Link to the shared item)
- **Fallback:** If the primary channel fails (email bounce, no push token), what happens?
- **Degraded mode:** If no notification channel is available yet (email service not configured), what's the minimum viable experience? (e.g., show pending shares on the recipient's dashboard)

## How to Apply This

**Brainiac (research phase):** When producing the research brief and feature
request, include a "User Journeys" section in the research brief that maps the
flows above. The feature-request.json acceptance criteria should cover not just
the happy path but the critical edge cases and error states.

**Martian Manhunter (planning phase):** When decomposing into tasks, ensure
each user flow has tasks that cover it. Empty states, error states, and
notification flows are not "nice to haves" — they are tasks in the plan.
The definition-of-done fields on each task (`user_impact`, `edge_cases`)
force you to think about this for every task, not just the feature overall.

## Anti-Patterns

- **"We'll add error handling later"** — No. Error states are part of the
  feature, not polish. Plan them now.
- **"The user will figure it out"** — If the user needs to "figure out" how
  to use the feature, the feature is incomplete.
- **"We'll add notifications when we have an email provider"** — Design the
  notification flow now, with a degraded-mode fallback (dashboard prompt, in-app
  indicator) that works without external services.
- **"That's an edge case"** — Edge cases are where users lose trust. A single
  unhandled edge case (data loss, silent failure, confusing error) can undo all
  the happy-path polish.
- **"Users won't do that"** — They will.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/product-thinking/SKILL.md
git commit -m "feat: add product-thinking skill

User-centric reasoning for Brainiac and Martian Manhunter: user journey
mapping, edge case enumeration, notification flows, outcome framing.
Ensures features are designed for real users, not just technical correctness."
```

---

### Task 4: Extend plan.schema.json with definition-of-done fields

Add `user_impact`, `edge_cases`, and `rollback_strategy` as required fields on every task in plan.json. This is schema-enforced via the existing validate-artifact.sh hook.

**Files:**
- Modify: `.claude/schemas/plan.schema.json`

- [ ] **Step 1: Update the schema**

Replace the contents of `.claude/schemas/plan.schema.json` with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Plan",
  "description": "Implementation plan produced by Martian Manhunter",
  "type": "object",
  "required": ["feature", "summary", "architecture", "tasks"],
  "properties": {
    "feature": {
      "type": "string",
      "description": "Name of the feature being implemented"
    },
    "summary": {
      "type": "string",
      "description": "One-paragraph summary of what will be built and why"
    },
    "architecture": {
      "type": "object",
      "required": ["approach", "files_to_create", "files_to_modify", "interfaces"],
      "properties": {
        "approach": { "type": "string", "description": "High-level technical approach" },
        "files_to_create": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path", "purpose"],
            "properties": {
              "path": { "type": "string" },
              "purpose": { "type": "string" }
            }
          }
        },
        "files_to_modify": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["path", "changes"],
            "properties": {
              "path": { "type": "string" },
              "changes": { "type": "string" }
            }
          }
        },
        "interfaces": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "contract"],
            "properties": {
              "name": { "type": "string" },
              "contract": { "type": "string" }
            }
          }
        }
      }
    },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "description", "acceptance_criteria", "parallel_group", "user_impact", "edge_cases", "rollback_strategy"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "acceptance_criteria": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Behavioral criteria that test outcomes, not implementation details"
          },
          "user_impact": {
            "type": "string",
            "description": "One sentence describing what this task enables for the end user"
          },
          "edge_cases": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Edge cases considered and how they are handled"
          },
          "rollback_strategy": {
            "type": "string",
            "description": "How to undo this task if it causes problems"
          },
          "depends_on": {
            "type": "array",
            "items": { "type": "string" }
          },
          "parallel_group": {
            "type": "string",
            "description": "Tasks in the same group can run in parallel"
          },
          "files": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude/schemas/plan.schema.json
git commit -m "feat: add definition-of-done fields to plan.json schema

Every task now requires user_impact (why this matters to the user),
edge_cases (what could go wrong), and rollback_strategy (how to undo).
Schema-enforced via validate-artifact.sh hook."
```

---

### Task 5: Extend test-results.schema.json with coverage matrix

Add a `coverage_matrix` field that maps acceptance criteria to test names, user journeys to E2E tests, and edge cases to test coverage.

**Files:**
- Modify: `.claude/schemas/test-results.schema.json`

- [ ] **Step 1: Update the schema**

Replace the contents of `.claude/schemas/test-results.schema.json` with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Test Results",
  "description": "Test results produced by The Flash",
  "type": "object",
  "required": ["verdict", "summary", "tests_written", "test_run"],
  "properties": {
    "verdict": {
      "type": "string",
      "enum": ["pass", "fail"]
    },
    "summary": { "type": "string" },
    "tests_written": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["file", "test_name", "covers"],
        "properties": {
          "file": { "type": "string" },
          "test_name": { "type": "string" },
          "covers": { "type": "string", "description": "Which acceptance criterion this test covers" }
        }
      }
    },
    "test_run": {
      "type": "object",
      "required": ["total", "passed", "failed"],
      "properties": {
        "total": { "type": "integer" },
        "passed": { "type": "integer" },
        "failed": { "type": "integer" },
        "skipped": { "type": "integer" },
        "command": { "type": "string", "description": "The exact command used to run tests" },
        "output": { "type": "string", "description": "Raw test runner output" }
      }
    },
    "coverage_matrix": {
      "type": "object",
      "description": "Maps plan artifacts to test coverage",
      "properties": {
        "acceptance_criteria": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["criterion", "test_names"],
            "properties": {
              "criterion": { "type": "string", "description": "The acceptance criterion text from plan.json" },
              "test_names": {
                "type": "array",
                "items": { "type": "string" },
                "description": "Test names that cover this criterion"
              }
            }
          },
          "description": "Every acceptance criterion and which tests cover it"
        },
        "user_journeys": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["journey", "test_names"],
            "properties": {
              "journey": { "type": "string", "description": "The user journey being tested" },
              "test_names": {
                "type": "array",
                "items": { "type": "string" },
                "description": "E2E test names that cover this journey"
              }
            }
          },
          "description": "User journeys from product-thinking and their E2E test coverage"
        },
        "edge_cases": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["edge_case", "test_names"],
            "properties": {
              "edge_case": { "type": "string", "description": "The edge case from plan.json task" },
              "test_names": {
                "type": "array",
                "items": { "type": "string" },
                "description": "Tests that cover this edge case"
              }
            }
          },
          "description": "Edge cases from plan tasks and their test coverage"
        },
        "uncovered": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Criteria, journeys, or edge cases with no test coverage"
        }
      }
    },
    "coverage_gaps": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Acceptance criteria from the plan that lack test coverage"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude/schemas/test-results.schema.json
git commit -m "feat: add coverage_matrix to test-results.json schema

Maps acceptance criteria, user journeys, and edge cases to their test
coverage. Enables Wonder Woman to verify test completeness and the
dashboard to show coverage trends."
```

---

### Task 6: Update testing-methodology skill

Add the coverage hierarchy (acceptance criteria tests, user journey E2E tests, edge case tests, regression guardrails) and coverage matrix output requirement.

**Files:**
- Modify: `.claude/skills/testing-methodology/SKILL.md`

- [ ] **Step 1: Update the skill content**

Replace the contents of `.claude/skills/testing-methodology/SKILL.md` with:

```markdown
---
name: testing-methodology
description: >
  Testing methodology for writing tests against plan acceptance criteria,
  user journeys, and edge cases. Framework detection, coverage hierarchy,
  coverage matrix output, and test quality guidance.
  Injected into Flash's context.
user-invocable: false
disable-model-invocation: true
---

# Testing Methodology

This guides how you turn acceptance criteria, user journeys, and edge cases into
tests. Your tests are the deterministic eval layer — they pass or they don't,
and that verdict drives the pipeline.

## Framework Detection

Before writing any tests, understand the project's existing test setup:

1. Look for test config files: `jest.config.*`, `vitest.config.*`, `pytest.ini`,
   `setup.cfg`, `.mocharc.*`, `tsconfig.test.json`, `playwright.config.*`
2. Look for existing test files: `**/*.test.*`, `**/*.spec.*`, `**/test_*`,
   `**/__tests__/**`, `**/e2e/**`
3. Check `package.json` for test scripts and devDependencies
4. Read 2-3 existing test files to understand patterns:
   - Import style (what assertion library?)
   - Test organization (describe/it? test()? class-based?)
   - Fixtures and setup patterns
   - How API tests are done (supertest? direct fetch?)
   - How E2E tests are done (Playwright? Cypress?)

Match whatever you find. If there are no existing tests, use the most common
framework for the project's language.

## Coverage Hierarchy

Tests are organized in a hierarchy of priority. Work through each level in order.

### Level 1: Acceptance Criteria Tests (required)

Every acceptance criterion from plan.json becomes at least one test. This is the
non-negotiable baseline — if an acceptance criterion doesn't have a test, the
feature is not done.

### Level 2: User Journey E2E Tests (required when E2E framework exists)

If the plan or research brief includes user journeys (from product-thinking),
each journey gets an E2E Playwright test covering the happy path end-to-end.
These test the full flow a user would experience, not isolated units.

Only write E2E tests if:
- The project has a Playwright (or similar) setup, OR
- The plan explicitly requests E2E tests

If no E2E framework exists, list these journeys in the coverage matrix under
`uncovered` with the note "no E2E framework configured."

### Level 3: Edge Case Tests (required)

Each task in plan.json now includes an `edge_cases` array. Every edge case
listed gets a test. These are not optional "nice to haves" — they were
identified during planning specifically because they represent risk.

Common edge case categories:
- Empty states (no data, empty arrays, null values)
- Permission failures (unauthorized, forbidden)
- Invalid input (wrong types, missing fields, too long, special characters)
- Boundary conditions (zero, maximum, one-off)
- Concurrent access (if applicable)

### Level 4: Regression Guardrails (brownfield only)

For brownfield work (modifying existing code), before writing new tests:

1. Identify existing functionality that could break from the changes
2. Check if existing tests cover those areas
3. If not, add targeted regression tests for the most critical paths

This prevents the "new feature works, old feature broke" problem.

## Coverage Matrix Output

Your `test-results.json` must include a `coverage_matrix` object that maps
plan artifacts to tests. This is how Wonder Woman verifies completeness and
how the dashboard tracks coverage trends.

```json
{
  "coverage_matrix": {
    "acceptance_criteria": [
      {
        "criterion": "GET /api/shares returns 200 with list of active shares",
        "test_names": ["test_list_shares_returns_active"]
      }
    ],
    "user_journeys": [
      {
        "journey": "User shares profile with colleague",
        "test_names": ["e2e_share_profile_happy_path"]
      }
    ],
    "edge_cases": [
      {
        "edge_case": "Share target user does not exist",
        "test_names": ["test_share_nonexistent_user_returns_404"]
      }
    ],
    "uncovered": [
      "Real-time notification delivery (no WebSocket test infrastructure)"
    ]
  }
}
```

Build the matrix BEFORE writing tests — scan all acceptance criteria, user
journeys, and edge cases from the plan first, then write tests to fill each
slot. This prevents the common failure of writing tests that feel productive
but miss critical criteria.

## Efficiency

Write focused tests and move on. You are a speed agent — your value is fast,
deterministic verdicts, not exhaustive edge case coverage beyond what the plan
specifies.

- Write one test per acceptance criterion. Add a second only if the criterion
  has an obvious sad-path that the plan explicitly calls out.
- Edge case tests should be concise — test the specific boundary, not the
  entire flow.
- E2E tests should cover the critical path, not every permutation.
- **Hard limit: total test count must not exceed 2x the number of acceptance
  criteria + edge cases combined.** Every extra test adds context tokens that
  slow you down and cost money.
- Keep test code concise. Reuse setup/fixtures across tests rather than
  duplicating setup in every test.
- Run the test suite once at the end. Do not run tests after writing each
  individual test file.

## Test Quality

**Test behavior, not implementation:**
- Good: "submitting the form with empty email shows an error message"
- Bad: "the validateEmail function returns false for empty string"

**Test one thing per test:**
- Each test should have one clear assertion (or a small group of related assertions)
- If a test name has "and" in it, consider splitting it

**Use realistic data:**
- Don't test with "foo", "bar", "test123"
- Use data that resembles real usage (realistic names, emails, IDs)

## Coverage Gaps

If an acceptance criterion or edge case can't be tested with automated tests,
list it in `coverage_gaps` AND in `coverage_matrix.uncovered` with an
explanation. This is honest reporting, not a failure.

Common un-testable criteria:
- Visual/design requirements (needs manual review or screenshot comparison)
- Performance requirements (needs load testing, not unit tests)
- Third-party integrations (needs mocking or live environment)
- Real-time features (needs WebSocket test infrastructure)

## Test Results Schema Reference

Your output must conform to `.claude/schemas/test-results.schema.json`. Key
addition: the `coverage_matrix` field is now expected. If you omit it, Wonder
Woman will flag incomplete test coverage.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/testing-methodology/SKILL.md
git commit -m "feat: add coverage hierarchy and coverage matrix to testing-methodology

Flash now maps tests to acceptance criteria, user journeys, and edge cases
in a structured coverage matrix. Four-level hierarchy: acceptance criteria
tests, user journey E2E tests, edge case tests, regression guardrails."
```

---

### Task 7: Update review-criteria skill

Add architectural-principles checks, definition-of-done verification, and coverage matrix verification.

**Files:**
- Modify: `.claude/skills/review-criteria/SKILL.md`

- [ ] **Step 1: Update the skill content**

Replace the contents of `.claude/skills/review-criteria/SKILL.md` with:

```markdown
---
name: review-criteria
description: >
  Code review methodology. Severity classification, plan compliance checklist,
  architectural principles compliance, definition-of-done verification, and
  test coverage matrix checks. Injected into Wonder Woman's context.
user-invocable: false
disable-model-invocation: true
---

# Review Criteria

This guides how you evaluate code produced by Cyborg. Your review determines
whether code moves forward to testing or goes back for fixes. Accuracy matters
— false positives waste Cyborg's time, false negatives let bugs through.

For the shared engineering principles you check against, see the
`architectural-principles` skill loaded alongside this one.

## Severity Classification

The most important decision you make is severity. Get this wrong and the whole
pipeline suffers.

### Critical (blocks merge — verdict: fail)

Issues that would cause real harm if deployed:
- **Bugs:** Logic errors that produce wrong results
- **Security:** SQL injection, XSS, unsanitized input, exposed secrets
- **Data loss:** Operations that could corrupt or lose user data
- **Crashes:** Unhandled errors that crash the process
- **Missing migrations:** Schema changes without migration files (architectural-principles violation)

A critical finding means the code goes back to Cyborg. Be sure before flagging
critical — false positives add a full retry cycle.

### Warning (should fix — verdict: pass)

Issues that don't break things but will cause problems:
- Swallowed errors (catch blocks that ignore exceptions)
- Missing input validation on external-facing endpoints
- Hardcoded values that should be configurable (architectural-principles: config-over-hardcoding)
- Race conditions that are unlikely but possible
- Missing null/undefined checks on data that could be absent
- Edge cases listed in the task's `edge_cases` array that weren't implemented

### Info (nice to have — verdict: pass)

Style and improvement suggestions:
- Better variable naming
- Extracting a helper function
- More descriptive error messages
- Over-engineering that violates KISS (architectural-principles)

Info items are opinions, not requirements. Use sparingly — 10 info items
clutter the review without adding value.

## Plan Compliance Checklist

For each task in the plan:
1. Were all acceptance criteria met? (Check each one individually)
2. Were the specified files created/modified? (Check against task's `files` list)
3. Does the implementation match the architecture? (Interfaces, data flow, patterns)
4. Were any extra features added that weren't in the plan? (Flag as info — not
   necessarily bad, but worth noting)

## Definition-of-Done Verification

Each task in plan.json now includes definition-of-done fields. Verify:

1. **user_impact** — Does the implementation actually deliver the stated user
   impact? If the task says "enables users to share profiles" but the share
   endpoint exists without any way for the recipient to discover the share,
   the user impact is not delivered.
2. **edge_cases** — Were all listed edge cases handled? Check each one. An
   edge case listed in the plan but not handled in code is a warning. An edge
   case that causes a crash or data loss is critical.
3. **rollback_strategy** — Is the stated rollback strategy actually viable?
   If it says "revert the migration" but there's no down migration, flag it.

## Architectural Principles Compliance

Check the code against the `architectural-principles` skill. Key checks:

- **Migration-first:** Any schema change must have a migration file. No
  workarounds, aliases, or application-level transforms. Violation = critical.
- **Config-over-hardcoding:** Values that vary by environment should not be
  hardcoded. Violation = warning.
- **DRY:** Duplicated logic across files should be extracted — but only if it's
  real duplication (same logic, same reason to change). Violation = info.
- **Defensive design:** External inputs validated at system boundaries. Error
  messages are useful, not generic. Violation = warning.
- **SOLID — Single Responsibility:** Files/classes that mix unrelated concerns.
  Violation = info (unless it causes a bug, then critical).

## Test Coverage Matrix Verification

If Flash has produced `test-results.json` with a `coverage_matrix`, verify:

1. **Acceptance criteria coverage** — Every acceptance criterion in plan.json
   appears in the coverage matrix with at least one test. Missing criteria =
   flag in review as warning.
2. **Edge case coverage** — Every edge case listed in plan tasks appears in the
   coverage matrix with at least one test. Missing edge cases = flag as warning.
3. **Uncovered items** — Review the `uncovered` list. Are the reasons for no
   coverage legitimate? (Visual tests, third-party integrations = legitimate.
   "Didn't have time" = not legitimate.)

If Flash has NOT produced a coverage matrix, note this as a warning in your
review — the testing methodology now requires it.

## Code Quality Checks

Beyond plan compliance, evaluate:
- **Error handling:** Are errors caught and handled appropriately for the
  project's patterns?
- **Edge cases:** Does the code handle empty inputs, missing data, boundary
  values?
- **Naming:** Are names clear and consistent with the codebase?
- **Duplication:** Is there copy-pasted code that should be extracted?
- **Integration:** Is the new code properly wired into the application?

## What NOT to Flag

- Style preferences that don't affect correctness (tabs vs spaces, etc.)
- "I would have done it differently" — unless the alternative avoids a bug
- Patterns that are already established in the codebase (even if you disagree)
- Missing optimizations unless there's a clear performance problem
- Missing tests (that's Flash's domain, not yours — but missing coverage
  matrix IS your domain)

## Quality Gates

In addition to the above, you MUST flag the following as the specified severity:

### Database Patterns
- Schema changes implemented as SQL aliases or field mappings instead of migrations — CRITICAL
- Missing migration file for any schema change — CRITICAL
- Migration exists but npm scripts not registered — WARNING
- TypeScript interfaces or Zod schemas not updated to match migration — CRITICAL

### Frontend Patterns
- Buttons built from raw Tailwind utilities instead of `.btn-*` classes — WARNING
- Default Tailwind color palette instead of theme tokens — WARNING
- Inline `style={{}}` with CSS variables or hardcoded colors — WARNING
- Field definitions inline in components instead of in `constants.ts` — INFO
- API types defined outside `frontend/src/api/client.ts` — WARNING
- Duplicated UI patterns across tabs instead of shared components — WARNING

## Review Schema Reference

Your output must conform to `.claude/schemas/review.schema.json`:

```json
{
  "verdict": "pass|fail",
  "summary": "One-paragraph assessment",
  "issues": [
    {
      "severity": "critical|warning|info",
      "file": "exact/path",
      "line": 42,
      "description": "What's wrong",
      "suggestion": "How to fix it"
    }
  ],
  "plan_compliance": {
    "all_tasks_implemented": true,
    "architecture_followed": true,
    "missing_items": []
  }
}
```
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/review-criteria/SKILL.md
git commit -m "feat: add architectural-principles, definition-of-done, and coverage matrix checks to review-criteria

Wonder Woman now checks against architectural-principles (SOLID, 12-factor,
DRY, KISS), verifies definition-of-done fields (user_impact, edge_cases,
rollback_strategy), and validates Flash's test coverage matrix."
```

---

### Task 8: Update agent frontmatter to reference new skills

Add `architectural-principles` to Martian Manhunter, Cyborg, and Wonder Woman. Add `product-thinking` to Brainiac and Martian Manhunter.

**Files:**
- Modify: `.claude/agents/martian-manhunter.md` (line 9, skills field)
- Modify: `.claude/agents/cyborg.md` (line 9, skills field)
- Modify: `.claude/agents/wonder-woman.md` (line 9, skills field)
- Modify: `.claude/agents/brainiac.md` (line 7, skills field)

- [ ] **Step 1: Update Martian Manhunter's skills**

In `.claude/agents/martian-manhunter.md`, change line 9 from:
```
skills: planning-methodology, database-patterns, frontend-patterns
```
to:
```
skills: planning-methodology, product-thinking, architectural-principles, database-patterns, frontend-patterns
```

- [ ] **Step 2: Update Cyborg's skills**

In `.claude/agents/cyborg.md`, change line 9 from:
```
skills: implementation-standards, database-patterns, frontend-patterns
```
to:
```
skills: implementation-standards, architectural-principles, database-patterns, frontend-patterns
```

- [ ] **Step 3: Update Wonder Woman's skills**

In `.claude/agents/wonder-woman.md`, change line 9 from:
```
skills: review-criteria, database-patterns, frontend-patterns
```
to:
```
skills: review-criteria, architectural-principles, database-patterns, frontend-patterns
```

- [ ] **Step 4: Update Brainiac's skills**

In `.claude/agents/brainiac.md`, change line 7 from:
```
skills: deep-research
```
to:
```
skills: deep-research, product-thinking
```

- [ ] **Step 5: Commit**

```bash
git add .claude/agents/martian-manhunter.md .claude/agents/cyborg.md .claude/agents/wonder-woman.md .claude/agents/brainiac.md
git commit -m "feat: wire new skills into agent frontmatter

- Martian Manhunter: +product-thinking, +architectural-principles
- Cyborg: +architectural-principles
- Wonder Woman: +architectural-principles
- Brainiac: +product-thinking"
```

---

### Task 9: Update planning-methodology skill

Add references to product-thinking and definition-of-done fields. Update the plan schema reference to include the new required fields.

**Files:**
- Modify: `.claude/skills/planning-methodology/SKILL.md`

- [ ] **Step 1: Update the Plan Schema Reference section**

In `.claude/skills/planning-methodology/SKILL.md`, replace the `## Plan Schema Reference` section (lines 94-118) with:

```markdown
## Plan Schema Reference

Your output must conform to `.claude/schemas/plan.schema.json`. Key fields:

```json
{
  "feature": "Feature name",
  "summary": "One-paragraph summary",
  "architecture": {
    "approach": "High-level technical approach",
    "files_to_create": [{"path": "...", "purpose": "..."}],
    "files_to_modify": [{"path": "...", "changes": "..."}],
    "interfaces": [{"name": "...", "contract": "..."}]
  },
  "tasks": [
    {
      "id": "task-001",
      "title": "Short description",
      "description": "What to implement",
      "acceptance_criteria": ["Testable behavioral criterion 1", "..."],
      "user_impact": "One sentence: what this enables for the end user",
      "edge_cases": ["Empty state when no data exists", "Permission denied for non-owner"],
      "rollback_strategy": "Revert migration 003, remove route from app.ts",
      "parallel_group": "group-a",
      "depends_on": [],
      "files": ["exact/paths"]
    }
  ]
}
```

### Definition-of-Done Fields (required on every task)

**`user_impact`** — One sentence describing what this task enables for the end
user. Not a technical description ("adds a database column") but a user outcome
("allows users to see their share history"). This forces you to connect every
task to a real user need. If you can't write a user impact statement, the task
may be pure infrastructure — that's fine, but say "Infrastructure: enables X
for subsequent tasks."

**`edge_cases`** — Array of edge cases this task must handle. Derived from the
product-thinking skill's "What happens when..." analysis. Each edge case should
be specific enough that Cyborg knows what to implement and Flash knows what to
test. "Handle errors" is not an edge case. "Return 404 with message when share
target user does not exist" is.

**`rollback_strategy`** — How to undo this task if it causes problems. For
migrations: "revert migration NNN." For new files: "delete file, remove route
registration." For modifications: "revert changes to file X." This forces you
to think about reversibility during planning, not during a production incident.
```

- [ ] **Step 2: Add product-thinking reference**

In the same file, after the "## Reading the Codebase First" section (after line 27), add:

```markdown
## Product Thinking

Before decomposing tasks, apply the product-thinking skill loaded alongside
this one. Your plan must account for the full user experience, not just the
technical implementation:

- Map user journeys (happy path, error states, empty states, first-time experience)
- Answer "what happens when..." questions for each user flow
- Map notification/communication flows for multi-user features
- Ensure edge cases and error states appear as explicit tasks or acceptance
  criteria — not as afterthoughts

The definition-of-done fields on each task (`user_impact`, `edge_cases`,
`rollback_strategy`) are your mechanism for embedding product thinking into
the plan structure. Every task must have these fields populated.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/planning-methodology/SKILL.md
git commit -m "feat: add product-thinking and definition-of-done to planning-methodology

Martian Manhunter now applies product-thinking before decomposing tasks.
Plan schema reference updated with required definition-of-done fields:
user_impact, edge_cases, rollback_strategy."
```

---

### Task 10: Update factory-workflow skill with multi-phase orchestration and autonomy gates

This is the biggest change — rewriting Batman's orchestration playbook with multi-phase engagement, devil's advocate passes, trace ID generation, and configurable autonomy gates.

**Files:**
- Modify: `.claude/skills/factory-workflow/SKILL.md`

- [ ] **Step 1: Update the factory-workflow skill**

Replace the entire contents of `.claude/skills/factory-workflow/SKILL.md` with:

```markdown
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
- **Skills:** deep-research, product-thinking
- **Key behavior:** Researches abstract concepts through six phases. Now also
  applies product-thinking: user journey mapping, edge case enumeration, and
  notification flow analysis. First agent with web access.

### Martian Manhunter — Architect/Planner

- **Needs:** Feature request text + access to the project codebase
- **Produces:** `.factory-run/plan.json` + `.factory-run/architecture.md`
- **Tools:** Read, Glob, Grep, Write (read-heavy, write-only for artifacts)
- **Skills:** planning-methodology, product-thinking, architectural-principles, database-patterns, frontend-patterns
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
- **Key behavior:** Analyzes telemetry across runs. Not dispatched during normal
  factory runs — run separately.

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
planning-methodology skill's "When the Feature Is a New Skill or Agent" section.
The key difference: skill content is crafted interactively using skill-creator,
then Batman dispatches Martian Manhunter to plan the factory integration.

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
[references/artifact-contracts.md](references/artifact-contracts.md).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/factory-workflow/SKILL.md
git commit -m "feat: rewrite factory-workflow with multi-phase orchestration and autonomy gates

- Multi-phase dispatch: Brainiac with product-thinking, MM plan + devil's
  advocate pass, quality gates all in parallel
- Three autonomy gates (spec, plan, ship) with three modes (auto, review, skip)
- Batman always asks for gate preferences at run start
- Proactive escalation regardless of gate settings
- Trace ID generation for telemetry correlation
- Updated team roster with new skill references"
```

---

### Task 11: Update Batman's agent definition

Add gate behavior to the constraints and update the voice section.

**Files:**
- Modify: `.claude/agents/batman.md`

- [ ] **Step 1: Update Batman's constraints**

In `.claude/agents/batman.md`, replace the `## Constraints` section (lines 25-31) with:

```markdown
## Constraints

- **Always ask about gates.** At the start of every factory run, if the user
  hasn't specified gate preferences, ask which gates they want: spec, plan,
  and/or ship — set to auto, review, or skip. No defaults. No assumptions.
- If the input is vague, abstract, or lacks a concrete feature request, dispatch Brainiac first to research and produce a structured feature-request.json — then dispatch Martian Manhunter with that artifact as input.
- Always run a devil's advocate pass after Martian Manhunter's initial plan — dispatch MM a second time to review their own plan adversarially.
- Never plan or architect yourself — always dispatch Martian Manhunter first
- Never implement code yourself — always dispatch Cyborg
- Never review code yourself — always dispatch Wonder Woman
- Never skip an agent your playbook says to dispatch
- If an agent fails 3 times on the same task, stop and report — don't loop forever
- Proactively escalate problems even in auto mode — test failures, critical review findings, major plan changes during devil's advocate
- For skill or agent creation tasks, the skill content is crafted interactively using Anthropic's skill-creator — your role is factory integration only.
- Generate a factory_run_id at the start of each run and pass it to every agent dispatch.
```

- [ ] **Step 2: Update Batman's voice**

In the same file, replace the `## Voice` section (lines 33-40) with:

```markdown
## Voice

Terse, strategic, commanding. Narrate your decisions briefly as you work:
- "How hands-on do you want to be? I can pause for your review after the spec, after the plan, and/or before shipping."
- "Gates confirmed — spec: auto, plan: review, ship: auto. Run ID: run_a7f3b2c1. Dispatching Brainiac."
- "Plan received. Running devil's advocate pass — sending it back to Martian Manhunter for adversarial review."
- "Devil's advocate added 3 tasks: notification flow, empty state handling, rate limiting. Plan revised to 14 tasks."
- "Plan gate: here's the summary. [presents plan]. Approve, reject with feedback, or go full auto from here?"
- "Review failed — one critical issue in auth middleware. Sending Cyborg back with the finding."
- "All agents complete. Mission successful."
```

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/batman.md
git commit -m "feat: update Batman with autonomy gates, devil's advocate, and trace ID

Batman now asks about gate preferences at every run start, runs devil's
advocate passes, generates trace IDs, and proactively escalates problems
even in auto mode."
```

---

### Task 12: Update artifact-contracts.md

Update the plan.json and test-results.json contract entries with new fields.

**Files:**
- Modify: `.claude/skills/factory-workflow/references/artifact-contracts.md`

- [ ] **Step 1: Update plan.json contract**

In `.claude/skills/factory-workflow/references/artifact-contracts.md`, replace the `## plan.json` section (lines 47-68) with:

```markdown
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
```

- [ ] **Step 2: Update test-results.json contract**

In the same file, replace the `## test-results.json` section (lines 88-100) with:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/factory-workflow/references/artifact-contracts.md
git commit -m "docs: update artifact contracts for definition-of-done and coverage matrix

plan.json contract now includes user_impact, edge_cases, rollback_strategy.
test-results.json contract now includes coverage_matrix."
```

---

### Task 13: Update run-factory.sh with --gates flag

Add support for passing autonomy gate settings via command line.

**Files:**
- Modify: `scripts/run-factory.sh`

- [ ] **Step 1: Update the script**

Replace the contents of `scripts/run-factory.sh` with:

```bash
#!/usr/bin/env bash
# Run the Justice League factory headless against a project.
# Usage: ./scripts/run-factory.sh /path/to/project /path/to/feature-request.md [--gates "spec=auto plan=auto ship=auto"]
#
# Set FACTORY_TRUST=true to run with --dangerously-skip-permissions
# (no permission prompts, fully autonomous). Only use in trusted environments.
set -euo pipefail

PROJECT_DIR="${1:?Usage: run-factory.sh <project-dir> <feature-request.md> [--gates \"spec=auto plan=auto ship=auto\"]}"
FEATURE_REQUEST="${2:?Usage: run-factory.sh <project-dir> <feature-request.md> [--gates \"spec=auto plan=auto ship=auto\"]}"
FACTORY_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Parse optional --gates flag
GATES_INSTRUCTION=""
shift 2
while [[ $# -gt 0 ]]; do
  case "$1" in
    --gates)
      GATES_INSTRUCTION="Autonomy gates for this run: $2. Do not ask the user — use these settings."
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

echo "=== Justice League Factory ==="
echo "Project: $PROJECT_DIR"
echo "Feature: $FEATURE_REQUEST"
echo "Factory: $FACTORY_DIR"
if [ -n "$GATES_INSTRUCTION" ]; then
  echo "Gates:   specified via --gates"
fi

FEATURE=$(cat "$FEATURE_REQUEST")

# Initialize telemetry DB
sqlite3 "$FACTORY_DIR/eval/factory.db" < "$FACTORY_DIR/eval/init-db.sql" 2>/dev/null || true

# Trust mode: skip all permission prompts
TRUST_FLAG=""
if [ "${FACTORY_TRUST:-false}" = "true" ]; then
  TRUST_FLAG="--dangerously-skip-permissions"
  echo "Mode: TRUSTED (no permission prompts)"
else
  echo "Mode: STANDARD (set FACTORY_TRUST=true for autonomous)"
fi

echo "Log: tail -f $FACTORY_DIR/eval/last-run.log"
echo ""

# Run Batman headless with streaming output.
claude -p "You are running the Justice League Factory.

Project directory: $PROJECT_DIR
Factory directory: $FACTORY_DIR

$GATES_INSTRUCTION

Feature request:
$FEATURE

Execute the full factory workflow. Dispatch agents to plan, implement, review,
test, secure, and document this feature. Write all artifacts to $FACTORY_DIR/.factory-run/.

When dispatching agents, use their names (e.g., martian-manhunter, cyborg, wonder-woman).
Each agent's tools and skills are configured in their agent definitions." \
  --agent batman \
  --allowedTools "Read,Write,Agent,Bash,Glob,Grep,Edit" \
  --output-format stream-json \
  --verbose \
  $TRUST_FLAG \
  >> "$FACTORY_DIR/eval/last-run.log" 2>&1

echo ""
echo "=== Factory run complete ==="
echo "Artifacts: $FACTORY_DIR/.factory-run/"
echo "Telemetry: $FACTORY_DIR/eval/factory.db"
echo "Log: $FACTORY_DIR/eval/last-run.log"
```

- [ ] **Step 2: Commit**

```bash
git add scripts/run-factory.sh
git commit -m "feat: add --gates flag to run-factory.sh

Supports passing autonomy gate settings for headless runs:
./scripts/run-factory.sh project/ request.md --gates 'spec=auto plan=auto ship=auto'"
```

---

### Task 14: Update CLAUDE.md agent roster

Update the project CLAUDE.md to reflect the new skills on each agent.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the agent roster table**

In `CLAUDE.md`, replace the agent roster table (the one under `## Agent Roster`) with:

```markdown
## Agent Roster

| Agent | Role | Tools | Skills | Output |
|-------|------|-------|--------|--------|
| Batman | Orchestrator | Read, Write, Agent, Bash | factory-workflow | Coordinates all agents |
| Brainiac | Deep Researcher | Read, Glob, Grep, Write, WebSearch, WebFetch | deep-research, product-thinking | .factory-run/research-brief.md + feature-request.json |
| Martian Manhunter | Planner | Read, Glob, Grep, Write | planning-methodology, product-thinking, architectural-principles, database-patterns, frontend-patterns | .factory-run/plan.json + architecture.md |
| Cyborg | Coder | Read, Write, Edit, Bash | implementation-standards, architectural-principles, database-patterns, frontend-patterns | Working code + briefings |
| Wonder Woman | Reviewer | Read, Glob, Grep, Write | review-criteria, architectural-principles, database-patterns, frontend-patterns | .factory-run/review.json |
| Flash | QA/Tester | Read, Write, Edit, Bash | testing-methodology, e2e-regression-testing | Tests + .factory-run/test-results.json |
| Green Lantern | Security | Read, Glob, Grep, Write | security-checklist | .factory-run/security-review.json |
| Lois Lane | Docs | Read, Glob, Write | documentation-standards | Documentation files |
| Oracle | Learner | Read, Glob, Grep, Write, Bash | improvement-methodology | improvements.json + PR |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md agent roster with new skills

Added skills column. Reflects product-thinking on Brainiac and MM,
architectural-principles on MM, Cyborg, and Wonder Woman."
```
