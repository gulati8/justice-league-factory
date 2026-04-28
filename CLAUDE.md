# Justice League Factory

An agentic software factory built on Claude Code native primitives. Specialized
AI agents collaborate to plan, implement, review, test, secure, and document
software changes — then improve themselves over time.

## Architecture

- **Agents** (`.claude/agents/`) — Each agent has YAML frontmatter defining
  their name, tools, model, and skills. Tool restrictions are constraints
  enforced by the system, not instructions in a prompt.
- **Skills** (`.claude/skills/`) — Reusable methodology injected into agent
  context. Customize these to match your team's standards.
- **Hooks** (`.claude/settings.json`) — Deterministic guarantees: artifact
  validation against JSON schemas, telemetry logging to SQLite.
- **Schemas** (`.claude/schemas/`) — Structured contracts between agents.
- **Telemetry** (`eval/factory.db`) — SQLite database with per-agent metrics
  and transcripts. Oracle queries this to propose improvements.

## Agent Roster

| Agent | Role | Tools | Skills | Output |
|-------|------|-------|--------|--------|
| Batman | Orchestrator | Read, Write, Agent, Bash | factory-workflow | Coordinates all agents |
| Brainiac | Deep Researcher | Read, Glob, Grep, Write, WebSearch, WebFetch | deep-research, product-thinking, infrastructure-patterns | .factory-run/research-brief.md + feature-request.json |
| Martian Manhunter | Planner | Read, Glob, Grep, Write | planning-methodology, product-thinking, architectural-principles, infrastructure-patterns, skill-agent-planning | .factory-run/plan.json + architecture.md |
| Cyborg | Coder | Read, Write, Edit, Bash | implementation-standards, architectural-principles, database-patterns, frontend-patterns | Working code + briefings |
| Wonder Woman | Reviewer | Read, Glob, Grep, Write | review-criteria, architectural-principles, database-patterns, frontend-patterns | .factory-run/review.json |
| Flash | QA/Tester | Read, Write, Edit, Bash | testing-methodology, e2e-regression-testing | Tests + .factory-run/test-results.json |
| Green Lantern | Security | Read, Glob, Grep, Write | security-checklist | .factory-run/security-review.json |
| Lois Lane | Docs | Read, Glob, Write | documentation-standards | Documentation files |
| Oracle | Learner | Read, Glob, Grep, Write, Bash | improvement-methodology, skill-review | improvements.json + PR |

## Running the Factory

```bash
# Interactive: open Claude Code in this directory, then @batman
claude --agent batman

# Headless: against a project with a feature request
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md

# Self-improvement: run Oracle against telemetry history
./scripts/run-oracle.sh

# Dashboard: observe factory runs in real time
./scripts/serve-dashboard.sh
```

## Customization

- Add project-specific skills (e.g., `django-patterns`) — agents load them via
  the `skills` frontmatter field
- Adjust agent models in their frontmatter (`model: haiku` for cost savings)
- Add new agents by creating `.claude/agents/<name>.md`
- Tighten or loosen tool access in agent frontmatter
