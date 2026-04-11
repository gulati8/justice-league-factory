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

## When the Feature Is a New Skill or Agent

Some feature requests ask not for application code but for factory infrastructure
itself — a new skill, a new agent, or both. These follow the same decomposition
rules but require additional integration thinking. Plan them carefully; a
poorly-integrated skill creates confusion for every subsequent factory run.

### Delivery Vehicle Decision

The first question is what to build:

- **Skill only** — When the output is reusable methodology that multiple agents
  should share, or when the feature is user-invocable guidance (e.g., a
  `deep-research` skill that any agent can load). Skills are the right vehicle
  when there is no distinct persona, no unique tool scope, and no need for an
  isolated execution context.
- **Agent only** — Rare. Only when the capability requires a fundamentally
  different tool set that cannot be expressed as a skill, AND when there is no
  reusable methodology worth extracting. In practice, a standalone agent with no
  backing skill is a code smell — it means the agent's approach cannot be
  explained or reused outside that agent's context.
- **Both (the default)** — Every new agent should have a backing skill. The
  agent definition (frontmatter + persona) describes *who* does the work; the
  skill describes *how* they do it. The skill is also what Oracle can propose
  improvements to without touching agent identity. If you are planning a new
  agent, include a companion skill task unless you can articulate why the
  methodology is not reusable.

Concrete decision criteria:
- Does the capability require tools no existing agent has? → New agent.
- Does the capability codify a methodology others should follow? → New skill.
- Is this a named role with a distinct persona and tool scope? → Agent + skill.
- Is this a reusable process that slots into an existing agent? → Skill only,
  added to that agent's `skills` frontmatter.

### Factory Patterns to Follow

Point Cyborg to concrete reference files rather than describing patterns in the
abstract.

**Agent frontmatter pattern:** Any file in `.claude/agents/*.md` shows the
correct structure — YAML frontmatter with `name`, `description`, `tools`,
`model`, `skills`, `maxTurns`, and `effort` fields, followed by the persona
body. The `tools` field is the single source of truth for what the agent can
do; do not grant tools via the prompt body.

**Skill frontmatter pattern:** Any file in `.claude/skills/*/SKILL.md` shows
the correct structure — YAML frontmatter with `name`, `description`,
`user-invocable`, and `disable-model-invocation` fields. Skills injected into
agents (not user-invocable) should set `user-invocable: false`.

**Skill content structure:** H1 title, one intro paragraph stating the skill's
purpose and scope, `##` phase or topic sections, a `## Voice` section (if the
skill targets a persona agent), and a `## Constraints` section listing hard
limits. Match the depth and tone of adjacent skills.

**Naming conventions:** Skills use kebab-case directory names (e.g.,
`planning-methodology`). Agent filenames are lowercase (e.g., `batman.md`).
Skill names in frontmatter match the directory name. Agent names in frontmatter
match the filename stem.

### Validation Strategy

Not every artifact needs a JSON Schema. Apply the right level of validation:

- **Machine-consumed artifacts** — Artifacts that flow from one agent to
  another as structured data (e.g., `plan.json`, `review.json`,
  `feature-request.json`) must have a schema in `.claude/schemas/` and a
  corresponding case in `.claude/hooks/validate-artifact.sh`. These are the
  handoff points where a malformed artifact will silently break downstream
  agents.
- **Human-consumed artifacts** — Narrative markdown outputs (e.g.,
  `architecture.md`, `research-brief.md`, documentation files) do not need
  JSON Schemas. Their structure is enforced through skill guidance: required
  headings, minimum content expectations, and examples. The skill itself is
  the specification.

Principle: **Schema the handoff, not the thinking.** The moment an artifact
crosses an agent boundary as structured data, schema it. Internal reasoning,
narrative summaries, and documentation live by convention, not machine
enforcement.

When planning a new agent whose output will be consumed by another agent as
JSON, include tasks for: (1) creating the schema file, (2) adding the
validation case to the hook script, and (3) updating the artifact contracts
reference.

### Integration Checklist

A new skill or agent rarely exists in isolation. For each new addition, assess
whether these files need updates and include them as explicit tasks in the plan:

- **`.claude/agents/batman.md`** — Does Batman need new dispatch awareness?
  If the new agent slots into the standard pipeline (plan → implement → review →
  test), Batman's factory-workflow skill covers it. If dispatch is conditional
  or the agent runs outside the normal sequence, add a constraint or note to
  Batman's definition.
- **`.claude/skills/factory-workflow/SKILL.md`** — The roster section, artifact
  dependency graph, reasoning section, and dispatch patterns all reference the
  full team. A new agent needs a roster entry, a node in the graph, and notes on
  when to dispatch it (including any conditional dispatch rules).
- **`.claude/skills/factory-workflow/references/artifact-contracts.md`** — Every
  new artifact (input or output) produced by the new agent needs a contract
  entry: path, producer, consumers, schema reference, and description.
- **`.claude/hooks/validate-artifact.sh`** — Add a case for each new
  machine-consumed artifact. The hook runs after every Write to `.factory-run/`
  and will silently pass if no case matches — so missing cases mean missing
  validation.
- **`.claude/settings.json`** — If the new agent requires tool permissions not
  already listed, add them here. The tools frontmatter field alone is not
  sufficient; the settings file enforces tool access at the system level.
- **`CLAUDE.md`** — The agent roster table in CLAUDE.md is the human-facing
  index of the factory. Add a row for every new agent with role, tools, and
  output.

Not every addition requires all six updates. Size the task list to what
actually changes — but check each item explicitly rather than assuming it's
unnecessary.

### Anthropic's skill-creator Handles the Craft

The actual work of drafting skill content — writing the methodology, testing
it with subagents, benchmarking against baselines, iterating on phrasing, and
optimizing the description field for retrieval — is handled by Anthropic's
built-in `skill-creator` skill. That is a human-in-the-loop craft process
that happens interactively, outside the factory pipeline.

Martian Manhunter's job is to plan the **factory integration**, not the skill
content itself. By the time this plan is executed, the skill content already
exists. The plan tasks are: register the skill in the right agent's frontmatter,
create schemas for any new artifacts, add validation hooks, update the roster
and workflow references, and update CLAUDE.md.

The plan should therefore include integration tasks that Cyborg will execute
**after** the skill has been crafted and tested. Do not include tasks for
"write the skill content" — that work is already done upstream.

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
