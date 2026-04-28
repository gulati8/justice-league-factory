---
name: planning-methodology
description: >
  Methodology for decomposing features into implementation plans. How to write
  acceptance criteria, assess parallelizability, and structure architecture
  documents. Injected into Martian Manhunter's context.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
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
- Each task specifies exact file paths to create or modify in the `files` array
- Each task has its own acceptance criteria
- A task's success doesn't depend on another task running simultaneously

**Always populate the `files` array on each task.** Cyborg uses this to know
exactly which files to touch. If `files` is empty, Cyborg has to guess from the
description — which wastes tokens and risks touching the wrong files. List every
file the task creates or modifies.

**Assign parallel groups:**
- Tasks that touch different files with no shared interfaces get the same
  `parallel_group` value — Batman can dispatch Cyborgs for these simultaneously
- Tasks that depend on another task's output get a different group and list the
  dependency in `depends_on`
- When in doubt, make tasks sequential — incorrect parallelization causes
  merge conflicts

## Schema Change Planning

Migrations are not scary — they are the correct, reversible, auditable way to
evolve a schema. Never plan code workarounds for schema changes (field mappings,
SQL aliases, computed columns, application-level transforms). Always plan for a
migration.

When a task involves a database schema change, the task's `files` array must
include every layer affected. Use this checklist — skipping any item creates the
kind of name mismatch or runtime failure that is expensive to debug:

1. **Migration file** — `backend/src/db/migrate-{slug}.ts`
2. **npm scripts** — both `db:migrate:{slug}` and `db:migrate:{slug}:dev`
3. **TypeScript model interface** — `backend/src/models/{entity}.ts`
4. **SQL queries in model** — every SELECT, INSERT, UPDATE referencing the field
5. **Zod validation schema** — `backend/src/routes/{entity}.ts`
6. **Allowed fields list** — the `allowedFields` array in update functions
7. **Seed data** — `backend/src/db/seed.ts` if the field is seeded
8. **Frontend API types** — `frontend/src/api/client.ts`
9. **Frontend components** — every component that reads or writes the field
10. **E2E tests** — page objects, fixture data, and test specs
11. **Base schema DDL** — `backend/src/db/migrate.ts` for fresh installs

For rollback strategies on schema tasks: column renames reverse with
`RENAME COLUMN`; column additions reverse with `DROP COLUMN`; for destructive
migrations (dropping columns, transforming data), document the backup-and-restore
step explicitly.

The authoritative version of this checklist lives in the database-patterns
skill. Cyborg and Wonder Woman load that skill for SQL templates, migration
file structure, and implementation details.

## Frontend Task Planning

When a task involves frontend changes, the task's `files` array must reference
the correct locations in the project's component hierarchy:

- **Shared components** (`frontend/src/components/`) — UI patterns used across
  multiple pages: modals, form inputs, avatars, date pickers. If a pattern is
  used in two or more places, it belongs here.
- **Page-specific components** (`frontend/src/pages/{page}/`) — components,
  sections, and tabs specific to one page feature. Tabs live in a `tabs/`
  subdirectory, sections in `sections/`.
- **Field definitions** (`frontend/src/pages/{page}/constants.ts`) — form field
  definitions, select options, and shared config for a page. Never inline field
  definitions in component JSX.
- **API types** (`frontend/src/api/client.ts`) — ALL TypeScript types for API
  data live here. When a task adds a new data entity or field, `client.ts` must
  be in the file list. No inline type definitions for API data in components.

Cyborg and Wonder Woman load the full frontend-patterns skill for styling
conventions, theme tokens, and component implementation details.

## Architecture Document

Your `architecture.md` should give Cyborg and Wonder Woman enough context to
work without asking questions. Include:

1. **Approach** — Why this design, not just what. What alternatives were considered?
2. **Data flow** — How does data move through the system for this feature?
3. **Component boundaries** — Where does this feature end and adjacent systems begin?
4. **Interface definitions** — Data structures shared between tasks. Define them here so each Cyborg doesn't invent its own.
5. **Existing patterns to follow** — Concrete references to files in the codebase
   that demonstrate the pattern Cyborg should replicate

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

These fields embed product-thinking into the plan structure. Populate
`edge_cases` from the "what happens when..." analysis and `user_impact` from
user journey mapping.

**`user_impact`** — One sentence describing what this task enables for the end
user. Not a technical description ("adds a database column") but a user outcome
("allows users to see their share history"). This forces you to connect every
task to a real user need. If you can't write a user impact statement, the task
may be pure infrastructure — that's fine, but say "Infrastructure: enables X
for subsequent tasks."

**`edge_cases`** — Array of specific edge cases this task must handle. Each
edge case should be specific enough that Cyborg knows what to implement and
Flash knows what to test. "Handle errors" is not an edge case. "Return 404
with message when share target user does not exist" is.

**`rollback_strategy`** — How to undo this task if it causes problems. For
migrations: "revert migration NNN." For new files: "delete file, remove route
registration." For modifications: "revert changes to file X." This forces you
to think about reversibility during planning, not during a production incident.

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
