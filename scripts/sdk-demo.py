#!/usr/bin/env python3
"""
Justice League Factory — Agent SDK Demo

Shows the same factory pattern using the Claude Agent SDK for programmatic
orchestration. This is the "graduation path" from Claude Code native primitives
to coded control.

Usage:
    pip install claude-agent-sdk
    python scripts/sdk-demo.py "Add a search bar to the dashboard"
"""

import sys
import anyio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition, ResultMessage, AssistantMessage, TextBlock


PLANNER_PROMPT = """You are Martian Manhunter, the Architect/Planner.
Read the feature request and the codebase. Produce a structured implementation
plan as JSON with tasks, acceptance criteria, and file paths. Output ONLY the
JSON plan — no commentary."""

CODER_PROMPT = """You are Cyborg, the Coder.
Read the plan provided and implement exactly what it says. Follow existing
codebase patterns. Do not deviate from the plan."""

REVIEWER_PROMPT = """You are Wonder Woman, the Reviewer.
Review the code changes against the plan. List issues as JSON with severity
(critical/warning/info), file, and description. Be concise. Output ONLY JSON."""


async def run_factory(feature_request: str, project_dir: str):
    print("=== Justice League Factory (SDK) ===\n")

    # --- Phase 1: Plan ---
    print("[Batman] Dispatching Martian Manhunter to plan...")
    plan = None
    async for message in query(
        prompt=f"Feature request:\n{feature_request}\n\nProject directory: {project_dir}",
        options=ClaudeAgentOptions(
            cwd=project_dir,
            allowed_tools=["Read", "Glob", "Grep"],
            system_prompt=PLANNER_PROMPT,
            max_turns=15,
        ),
    ):
        if isinstance(message, ResultMessage):
            plan = message.result
            print(f"[Martian Manhunter] Plan complete.\n")

    if not plan:
        print("[Batman] Planning failed. Aborting.")
        return

    # --- Phase 2: Implement ---
    print("[Batman] Dispatching Cyborg to implement...")
    async for message in query(
        prompt=f"Here is the plan:\n{plan}\n\nImplement it in {project_dir}",
        options=ClaudeAgentOptions(
            cwd=project_dir,
            allowed_tools=["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
            system_prompt=CODER_PROMPT,
            max_turns=30,
        ),
    ):
        if isinstance(message, ResultMessage):
            print(f"[Cyborg] Implementation complete.\n")

    # --- Phase 3: Review ---
    print("[Batman] Dispatching Wonder Woman to review...")
    review = None
    async for message in query(
        prompt=f"Review the code changes in {project_dir} against this plan:\n{plan}",
        options=ClaudeAgentOptions(
            cwd=project_dir,
            allowed_tools=["Read", "Glob", "Grep"],
            system_prompt=REVIEWER_PROMPT,
            max_turns=15,
        ),
    ):
        if isinstance(message, ResultMessage):
            review = message.result
            print(f"[Wonder Woman] Review complete.\n")

    # --- Summary ---
    print("=== Factory Run Complete ===")
    print(f"Feature: {feature_request[:80]}")
    print(f"Plan: delivered")
    print(f"Implementation: delivered")
    print(f"Review: {'delivered' if review else 'skipped'}")


async def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/sdk-demo.py <feature-request>")
        print('Example: python scripts/sdk-demo.py "Add dark mode toggle"')
        sys.exit(1)

    feature_request = sys.argv[1]
    project_dir = sys.argv[2] if len(sys.argv) > 2 else "."

    await run_factory(feature_request, project_dir)


if __name__ == "__main__":
    anyio.run(main)
