# Justice League Factory

A multi-agent software factory built on Claude Code. Specialized AI agents collaborate to build, review, test, and secure software — then improve themselves over time.

## Quick Start

1. Clone this repo
2. Symlink into your project: `ln -s /path/to/justice-league-factory/.claude/skills your-project/.claude/skills`
3. In your project, run: `claude` and invoke the Batman workflow

## Agents

See `agents/` for each agent's identity, role, tools, and output contract.

## Schemas

See `schemas/` for the structured contracts between agents.

## Running the Factory

```bash
# Run the full factory against a project
./scripts/run-factory.sh /path/to/project /path/to/feature-request.md

# Run Oracle to analyze and improve the factory
./scripts/run-oracle.sh
```

## Customization

- Swap Justice League for your own theme by editing agent files
- Add new agents by creating a new `.md` file in `agents/`
- Adjust tool scoping per agent to tighten or loosen constraints
