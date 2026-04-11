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
