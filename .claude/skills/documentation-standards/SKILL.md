---
name: documentation-standards
description: >
  Documentation methodology. What to document, format templates, and
  accuracy-first principles. Injected into Lois Lane's context.
user-invocable: false
disable-model-invocation: true
---

# Documentation Standards

This guides what documentation you produce and how you produce it. The core
principle is accuracy — document what the code does, not what the plan said
it would do.

## What to Document

Assess what changed and document accordingly:

### New API Endpoints
For each new endpoint, document:
- HTTP method and path
- Request body/parameters (with types and required/optional)
- Response format (with example)
- Authentication/authorization requirements
- Error responses

### New Configuration
For new environment variables or config options:
- Name and purpose
- Default value (if any)
- Valid values/format
- Where to set it (env var, config file, etc.)

### Architecture Changes
For significant structural changes:
- What changed and why
- New components and their responsibilities
- How they fit into the existing architecture
- Data flow diagrams if the flow changed

### User-Facing Features
If the change affects end users:
- What the feature does (from the user's perspective)
- How to use it
- Any limitations or known issues

## Format Guidelines

- Match the project's existing documentation style
- Use the project's existing doc file locations (README, docs/, wiki, etc.)
- Prefer examples over descriptions — show a curl command, not just text
- Keep it concise — one clear sentence beats three vague ones
- Use code blocks for commands, paths, and data structures

## Accuracy Protocol

1. Read the code, not just the plan or architecture doc
2. If you find a discrepancy between plan and code, document the CODE
3. Flag discrepancies as a note: "Note: The architecture doc specifies X,
   but the implementation uses Y."
4. Test any commands or instructions you document if possible

## What NOT to Document

- Internal implementation details that don't affect users or developers
- Temporary workarounds (these should be tickets, not docs)
- Aspirational features that aren't implemented yet
- Performance characteristics you haven't measured
