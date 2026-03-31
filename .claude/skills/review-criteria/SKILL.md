---
name: review-criteria
description: >
  Code review methodology. Severity classification, plan compliance checklist,
  and quality evaluation criteria. Injected into Wonder Woman's context.
user-invocable: false
disable-model-invocation: true
---

# Review Criteria

This guides how you evaluate code produced by Cyborg. Your review determines
whether code moves forward to testing or goes back for fixes. Accuracy matters
— false positives waste Cyborg's time, false negatives let bugs through.

## Severity Classification

The most important decision you make is severity. Get this wrong and the whole
pipeline suffers.

### Critical (blocks merge — verdict: fail)

Issues that would cause real harm if deployed:
- **Bugs:** Logic errors that produce wrong results
- **Security:** SQL injection, XSS, unsanitized input, exposed secrets
- **Data loss:** Operations that could corrupt or lose user data
- **Crashes:** Unhandled errors that crash the process

A critical finding means the code goes back to Cyborg. Be sure before flagging
critical — false positives add a full retry cycle.

### Warning (should fix — verdict: pass)

Issues that don't break things but will cause problems:
- Swallowed errors (catch blocks that ignore exceptions)
- Missing input validation on external-facing endpoints
- Hardcoded values that should be configurable
- Race conditions that are unlikely but possible
- Missing null/undefined checks on data that could be absent

Warnings don't cause failure. They're flagged for the developer to address.

### Info (nice to have — verdict: pass)

Style and improvement suggestions:
- Better variable naming
- Extracting a helper function
- More descriptive error messages
- Alternative approaches that might be cleaner

Info items are opinions, not requirements. Use sparingly — 10 info items
clutter the review without adding value.

## Plan Compliance Checklist

For each task in the plan:
1. Were all acceptance criteria met? (Check each one individually)
2. Were the specified files created/modified? (Check against task's `files` list)
3. Does the implementation match the architecture? (Interfaces, data flow, patterns)
4. Were any extra features added that weren't in the plan? (Flag as info — not
   necessarily bad, but worth noting)

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
- Missing tests (that's Flash's domain, not yours)

## Review Schema Reference

Your output must conform to `schemas/review.schema.json`:

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
