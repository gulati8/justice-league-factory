---
name: skill-agent-planning
description: >
  Guidance for planning the creation of new skills and agents. Covers delivery
  vehicle decisions (skill vs agent vs both), validation strategy, integration
  checklists, and coordination with skill-creator. Load when the feature request
  involves creating a new skill or agent.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
---

# Skill and Agent Planning

This skill guides the decomposition of feature requests that involve creating
new factory infrastructure — a skill, an agent, or both. The same task
decomposition rules from planning-methodology apply, but skill and agent
additions require additional integration thinking. A poorly-integrated skill
creates confusion for every subsequent factory run.

## Delivery Vehicle Decision

The first question is what to build:

- **Skill only** — When the output is reusable methodology that multiple agents
  should share, or when the capability slots into an existing agent's workflow.
  Skills are the right vehicle when there is no distinct persona, no unique tool
  scope, and no need for an isolated execution context.
- **Agent only** — Rare. Only when the capability requires a fundamentally
  different tool set that cannot be expressed as a skill, AND when there is no
  reusable methodology worth extracting. A standalone agent with no backing skill
  is a code smell — it means the agent's approach cannot be explained or reused
  outside that agent's context.
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

## Reference Patterns

Reference any existing file in `.claude/agents/*.md` for agent frontmatter
structure and `.claude/skills/*/SKILL.md` for skill structure. Skills use
kebab-case directory names. Agent filenames are lowercase.

## Validation Strategy

Not every artifact needs a JSON Schema. Apply the right level of validation:

- **Machine-consumed artifacts** — Artifacts that flow from one agent to another
  as structured data (e.g., `plan.json`, `review.json`, `feature-request.json`)
  must have a schema in `.claude/schemas/` and a corresponding case in the
  validation hook. These are the handoff points where a malformed artifact will
  silently break downstream agents.
- **Human-consumed artifacts** — Narrative markdown outputs (e.g.,
  `architecture.md`, `research-brief.md`, documentation files) do not need JSON
  Schemas. Their structure is enforced through skill guidance: required headings,
  minimum content expectations, and examples. The skill itself is the
  specification.

Principle: **Schema the handoff, not the thinking.** The moment an artifact
crosses an agent boundary as structured data, schema it. Internal reasoning,
narrative summaries, and documentation live by convention, not machine
enforcement.

When planning a new agent whose output will be consumed by another agent as
JSON, include tasks for: (1) creating the schema file, (2) adding the
validation case to the hook script, and (3) updating the artifact contracts
reference.

## Integration Checklist

A new skill or agent rarely exists in isolation. Assess which existing
configuration, workflow, and documentation files need updates and include them
as explicit tasks in the plan. For each new addition, check whether these
categories of files require changes:

- **Orchestrator awareness** — Does the orchestrator (e.g., `batman.md`) need
  new dispatch logic? If the new agent slots into the standard pipeline, existing
  workflow coverage may suffice. If dispatch is conditional or the agent runs
  outside the normal sequence, add a constraint or note to the orchestrator's
  definition.
- **Workflow skill** — The workflow skill (e.g., `factory-workflow/SKILL.md`)
  typically contains a roster, an artifact dependency graph, and dispatch
  patterns. A new agent needs a roster entry, a graph node, and dispatch notes
  including any conditional rules.
- **Artifact contracts** — Every new artifact (input or output) needs a contract
  entry documenting path, producer, consumers, schema reference, and description
  (e.g., `factory-workflow/references/artifact-contracts.md`).
- **Validation hook** — Add a case for each new machine-consumed artifact.
  Hooks that silently pass on unmatched cases mean missing validation when cases
  are omitted (e.g., `.claude/hooks/validate-artifact.sh`).
- **Tool permissions** — If the new agent requires tool permissions not already
  listed, add them to the system settings file. The tools frontmatter field alone
  is not sufficient; the settings file enforces tool access at the system level
  (e.g., `.claude/settings.json`).
- **Human-facing index** — The project README or agent roster is the
  human-facing index of the factory. Add a row for every new agent with role,
  tools, skills, and output (e.g., `CLAUDE.md`).

Not every addition requires all six updates. Size the task list to what
actually changes — but check each item explicitly rather than assuming it's
unnecessary.

## Skill-Creator Note

Skill content is crafted interactively using skill-creator before the factory
pipeline runs. Do not include tasks for writing skill content — only include
integration tasks (schema creation, hook registration, roster updates,
documentation). By the time this plan is executed, the skill content already
exists and the integration work is what remains.
