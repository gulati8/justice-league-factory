# Justice League Factory

This is an agentic software factory powered by Claude Code. It coordinates specialized AI agents to plan, implement, review, test, secure, and document software changes.

## How It Works

Each agent is defined in `agents/`. Each has a specific role, scoped tools, and a structured output contract. Batman (the orchestrator) dispatches agents via Claude Code's Agent tool. Agents communicate through structured artifacts in `artifacts/`.

## Agent Roster

| Agent | Role | Output |
|-------|------|--------|
| Batman | Orchestrator | Coordinates all agents |
| Martian Manhunter | Architect/Planner | artifacts/plan.json + artifacts/architecture.md |
| Cyborg | Coder | Working code in the project repo |
| Wonder Woman | Reviewer | artifacts/review.json |
| The Flash | QA/Tester | Tests + artifacts/test-results.json |
| Green Lantern | Security | artifacts/security-review.json |
| Lois Lane | Docs | Documentation files |
| Oracle | Learner | Improved agent files + PR |

## Artifact Contracts

All structured artifacts follow schemas defined in `schemas/`. Agents MUST validate their output against the relevant schema.

## Eval Log

Every factory run appends results to `eval/eval-log.jsonl`. Oracle reads this history to propose improvements.
