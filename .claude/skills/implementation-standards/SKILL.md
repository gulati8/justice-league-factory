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

## Reading the Plan

Your assigned task in `plan.json` contains everything you need:
- `description` — What to build
- `acceptance_criteria` — What "done" looks like (Flash tests against these)
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

## Briefing Format

Your briefing (`artifacts/briefings/cyborg-{task-id}.json`) is consumed by
Wonder Woman (reviewer) and Batman (orchestrator). Include:

- **files_created / files_modified** — Exact paths. Wonder Woman reads these.
- **summary** — What you built and any decisions you made. Keep it factual.
- **notes_for_reviewer** — Anything non-obvious: "Used the existing middleware
  chain pattern from src/middleware/auth.ts", "Plan said 'validate input' but
  didn't specify rules — used the same Joi schema pattern as other endpoints."

## When Something Doesn't Match

If the plan says one thing but the codebase says another:
- Follow the codebase pattern, not the plan
- Note the discrepancy in your briefing under `notes_for_reviewer`
- Wonder Woman will catch it if it matters

If the plan is genuinely ambiguous:
- Implement the simplest interpretation
- Note what you chose and why in the briefing

## What NOT to Do

- Don't refactor code outside your task scope
- Don't add error handling the plan didn't specify
- Don't add logging, comments, or documentation (Lois Lane handles docs)
- Don't write tests (Flash handles tests)
- Don't optimize for performance unless the plan explicitly says to
- Don't install new dependencies unless the plan specifies them
