# Justice League Factory

A multi-agent software factory built on Claude Code native primitives. Specialized AI agents collaborate to plan, build, review, test, secure, and document software — then improve themselves over time.

## Quick Start

```bash
# Clone the factory
git clone https://github.com/gulati8/justice-league-factory.git
cd justice-league-factory

# Install optional dependency for artifact validation
pip install jsonschema

# Interactive mode: invoke Batman directly
claude --agent batman

# Headless mode: against a project with a feature request
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md
```

## How It Works

The factory uses Claude Code's native primitives:

- **Agents** (`.claude/agents/*.md`) — Specialized AI agents with scoped tools, models, and skills. Tool restrictions are system constraints, not prompt instructions.
- **Skills** (`.claude/skills/*/SKILL.md`) — Reusable methodology injected into agent context. Customize to match your team's standards.
- **Hooks** (`.claude/settings.json`) — Deterministic artifact validation and telemetry logging. Not probabilistic — guaranteed to fire.
- **Schemas** (`schemas/*.json`) — Structured contracts between agents.

Batman (orchestrator) dispatches specialized agents who communicate through structured artifacts. The LLM drives the loop — Batman reasons about what to dispatch based on artifact state, not a hardcoded pipeline.

## Agents

| Agent | Role | Tools |
|-------|------|-------|
| Batman | Orchestrator | Read, Write, Agent, Bash |
| Martian Manhunter | Planner | Read, Glob, Grep, Write |
| Cyborg | Coder | Read, Write, Edit, Bash |
| Wonder Woman | Reviewer (read-only) | Read, Glob, Grep |
| The Flash | QA/Tester | Read, Write, Edit, Bash |
| Green Lantern | Security (read-only) | Read, Glob, Grep |
| Lois Lane | Docs | Read, Glob, Write |
| Oracle | Learner | Read, Glob, Grep, Write, Bash |

## Scripts

```bash
# Run the full factory pipeline
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md

# Run Oracle to analyze telemetry and propose improvements
./scripts/run-oracle.sh

# Launch the observability dashboard
./scripts/serve-dashboard.sh
```

## Customization

- **Add project-specific skills** — Create `.claude/skills/your-skill/SKILL.md`, reference it in an agent's `skills` frontmatter field
- **Change agent models** — Edit `model:` in agent frontmatter (`haiku` for cost savings, `opus` for quality)
- **Add new agents** — Create `.claude/agents/your-agent.md` with YAML frontmatter
- **Tighten tool access** — Edit the `tools:` field in agent frontmatter
- **Swap the theme** — Replace Justice League names with your own. The architecture is the same.
