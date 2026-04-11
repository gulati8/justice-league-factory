# Justice League Factory

A multi-agent software factory built on Claude Code native primitives. Specialized AI agents collaborate to plan, build, review, test, secure, and document software — then improve themselves over time.

## Quick Start

```bash
# Clone the factory
git clone https://github.com/gulati8/justice-league-factory.git
cd justice-league-factory

# Install dependencies
pip install jsonschema  # artifact validation
pip install -r dashboard-api/requirements.txt  # dashboard API (optional)
cd dashboard-app && npm install && cd ..  # dashboard frontend (optional)

# Interactive mode: invoke Batman directly
claude --agent batman

# Headless mode: against a project with a feature request
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md

# Headless with autonomy gates
./scripts/run-factory.sh /path/to/project /path/to/request.md --gates "spec=auto plan=review ship=auto"

# Launch the observability dashboard
./scripts/serve-dashboard.sh
```

## How It Works

The factory uses Claude Code's native primitives:

- **Agents** (`.claude/agents/*.md`) — Specialized AI agents with scoped tools, models, and skills. Tool restrictions are system constraints, not prompt instructions.
- **Skills** (`.claude/skills/*/SKILL.md`) — Reusable methodology injected into agent context. Customize to match your team's standards.
- **Hooks** (`.claude/settings.json`) — Deterministic artifact validation and telemetry logging. Not probabilistic — guaranteed to fire.
- **Schemas** (`.claude/schemas/*.json`) — Structured contracts between agents.

Batman (orchestrator) dispatches specialized agents who communicate through structured artifacts. The pipeline uses multi-phase engagement — Brainiac researches and applies product thinking, Martian Manhunter plans then reviews his own plan as a devil's advocate, and configurable autonomy gates let you control how hands-on you want to be at each stage.

## Agents

| Agent | Role | Tools | Key Skills |
|-------|------|-------|------------|
| Batman | Orchestrator | Read, Write, Agent, Bash | factory-workflow |
| Brainiac | Deep Researcher | Read, Glob, Grep, Write, WebSearch, WebFetch | deep-research, product-thinking |
| Martian Manhunter | Planner | Read, Glob, Grep, Write | planning-methodology, product-thinking, architectural-principles |
| Cyborg | Coder | Read, Write, Edit, Bash | implementation-standards, architectural-principles |
| Wonder Woman | Reviewer | Read, Glob, Grep, Write | review-criteria, architectural-principles |
| Flash | QA/Tester | Read, Write, Edit, Bash | testing-methodology, e2e-regression-testing |
| Green Lantern | Security | Read, Glob, Grep, Write | security-checklist |
| Lois Lane | Docs | Read, Glob, Write | documentation-standards |
| Oracle | Learner | Read, Glob, Grep, Write, Bash | improvement-methodology |

## Scripts

```bash
# Run the full factory pipeline
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md

# Run Oracle to analyze telemetry and propose improvements
./scripts/run-oracle.sh

# Launch the observability dashboard
./scripts/serve-dashboard.sh
```

## Connecting to a Project

```bash
# Symlink the factory's .claude/ directory into your project
ln -s /path/to/justice-league-factory/.claude /path/to/your-project/.claude

# Then run batman from your project
cd /path/to/your-project
claude --agent batman
```

The `.factory-run/` directory is auto-created by the factory's hooks on the first
agent write. Add `.factory-run/` to your project's `.gitignore`.

## Customization

- **Add project-specific skills** — Create `.claude/skills/your-skill/SKILL.md`, reference it in an agent's `skills` frontmatter field
- **Change agent models** — Edit `model:` in agent frontmatter (`haiku` for cost savings, `opus` for quality)
- **Add new agents** — Create `.claude/agents/your-agent.md` with YAML frontmatter
- **Tighten tool access** — Edit the `tools:` field in agent frontmatter
- **Swap the theme** — Replace Justice League names with your own. The architecture is the same.
