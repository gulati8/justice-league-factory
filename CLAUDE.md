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
- **Schemas** (`schemas/`) — Structured contracts between agents.
- **Telemetry** (`eval/factory.db`) — SQLite database with per-agent metrics
  and transcripts. Oracle queries this to propose improvements.

## Agent Roster

| Agent | Role | Tools | Output |
|-------|------|-------|--------|
| Batman | Orchestrator | Read, Write, Agent, Bash | Coordinates all agents |
| Martian Manhunter | Planner | Read, Glob, Grep, Write | artifacts/plan.json + architecture.md |
| Cyborg | Coder | Read, Write, Edit, Bash | Working code + briefings |
| Wonder Woman | Reviewer (read-only) | Read, Glob, Grep | artifacts/review.json |
| Flash | QA/Tester | Read, Write, Edit, Bash | Tests + artifacts/test-results.json |
| Green Lantern | Security (read-only) | Read, Glob, Grep | artifacts/security-review.json |
| Lois Lane | Docs | Read, Glob, Write | Documentation files |
| Oracle | Learner | Read, Glob, Grep, Write, Bash | improvements.json + PR |

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
