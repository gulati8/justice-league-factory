---
name: planning-methodology
description: >
  Methodology for decomposing features into implementation plans. How to write
  acceptance criteria, assess parallelizability, and structure architecture
  documents. Injected into Martian Manhunter's context.
user-invocable: false
disable-model-invocation: true
---

# Planning Methodology

This guides how you decompose a feature request into a structured plan that
downstream agents can execute independently. The quality of your plan determines
the quality of everything that follows — a vague plan produces vague code.

## Reading the Codebase First

Before designing anything, understand what already exists. Use Glob and Grep to
map the project's patterns:

- **File structure:** Where do routes, models, services, and tests live?
- **Naming conventions:** How are files, functions, and variables named?
- **Patterns:** Does the project use repositories? Controllers? Middleware chains?
- **Dependencies:** What libraries are already installed? What test framework?
- **Configuration:** How are environment variables and config managed?

Your plan must follow these existing patterns. Downstream agents (especially
Cyborg) will match what the codebase already does. If you introduce a new
pattern, Cyborg will struggle to integrate it.

## Writing Acceptance Criteria

Every task needs acceptance criteria that The Flash can write tests against.
Good criteria are specific, testable, and behavioral.

**Good criteria:**
- "GET /api/health returns 200 with JSON body containing `status` and `timestamp` fields"
- "Uploading a file larger than 5MB returns 413 with error message"
- "When no avatar exists, the profile page shows the default avatar image"

**Bad criteria:**
- "The endpoint works correctly" (what does "correctly" mean?)
- "Error handling is implemented" (what errors? what handling?)
- "The code is clean and well-structured" (not testable)

The test is: could Flash write an automated test for this criterion without
asking any clarifying questions? If not, it's too vague.

## Task Decomposition

Each task should be independently completable by a single Cyborg agent. This
means:

**Size it right:**
- A task should touch 1-3 files. If it touches more, decompose further.
- A task should be completable in a single Cyborg session. If it requires
  understanding too much context, it's too big.
- A task should produce a testable unit of work. "Set up the database schema"
  is testable. "Start working on the feature" is not.

**Define clear boundaries:**
- Each task specifies exact file paths to create or modify
- Each task has its own acceptance criteria
- A task's success doesn't depend on another task running simultaneously

**Assign parallel groups:**
- Tasks that touch different files with no shared interfaces get the same
  `parallel_group` value — Batman can dispatch Cyborgs for these simultaneously
- Tasks that depend on another task's output get a different group and list the
  dependency in `depends_on`
- When in doubt, make tasks sequential — incorrect parallelization causes
  merge conflicts

## Architecture Document

Your `architecture.md` should give Cyborg and Wonder Woman enough context to
work without asking questions. Include:

1. **Approach** — Why this design, not just what. What alternatives were considered?
2. **Data flow** — How does data move through the system for this feature?
3. **Component boundaries** — What's new, what's modified, what's untouched?
4. **Interface definitions** — Function signatures, API contracts, data shapes
5. **Existing patterns to follow** — Concrete references to files in the codebase
   that demonstrate the pattern Cyborg should replicate

## Plan Schema Reference

Your output must conform to `schemas/plan.schema.json`. Key fields:

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
      "acceptance_criteria": ["Testable criterion 1", "..."],
      "parallel_group": "group-a",
      "depends_on": [],
      "files": ["exact/paths"]
    }
  ]
}
```

## Common Pitfalls

- **Over-decomposing:** 10 tasks for a simple feature creates coordination
  overhead. 2-4 tasks is usually right.
- **Under-specifying interfaces:** If two tasks share a data structure, define
  it in the architecture doc. Don't let each Cyborg invent its own.
- **Ignoring existing tests:** Check what test files and frameworks already exist.
  Flash needs to match the existing pattern.
- **Planning for perfection:** The plan goes through review (Wonder Woman) and
  testing (Flash). Plan for "correct and complete," not "perfect." The quality
  gates catch issues.
