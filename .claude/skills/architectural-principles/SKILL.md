---
name: architectural-principles
description: >
  Shared architectural and engineering principles for planning, implementing,
  and reviewing code. Single source of truth for SOLID, 12-factor, DRY, KISS,
  and defensive design. Referenced by Martian Manhunter, Cyborg, and Wonder Woman.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
---

# Architectural Principles

These are the engineering principles that define what good software looks like in
this factory. Every agent that plans, implements, or reviews code references this
skill. When these principles are updated (manually or via Oracle), changes
propagate to all consuming agents automatically.

This skill defines the *what* — what good software looks like. Individual agent
skills (implementation-standards, review-criteria, planning-methodology) define
the *how* — how each agent applies these principles in their specific role.

## SOLID Principles

Apply contextually based on your role:

**Single Responsibility** — Each module, class, or function should have one
reason to change. When planning: decompose tasks so each touches one concern.
When implementing: don't let a file grow to do two unrelated things. When
reviewing: flag files that mix concerns (e.g., a route handler that also
formats emails).

**Open/Closed** — Software entities should be open for extension but closed for
modification. Prefer adding new files over modifying existing ones when adding
new behavior. When the plan calls for "add a new type of X," check whether the
existing code has an extension point (plugin pattern, strategy pattern, registry)
before modifying the core.

**Liskov Substitution** — Subtypes must be substitutable for their base types.
If the codebase uses interfaces or abstract classes, new implementations must
honor the full contract — not just the method signatures, but the behavioral
expectations.

**Interface Segregation** — Don't force consumers to depend on methods they
don't use. Prefer small, focused interfaces over large ones. When planning API
endpoints, each endpoint should do one thing.

**Dependency Inversion** — Depend on abstractions, not concretions. When the
codebase uses dependency injection, follow that pattern. When it doesn't, don't
introduce it — but do keep high-level modules independent of low-level details
by using clear interfaces between layers.

## 12-Factor App Principles

**Externalize configuration** — Values that vary by environment (URLs, ports,
feature flags, API keys, thresholds) belong in environment variables or config
files, never hardcoded in source. If a value could be different in staging vs.
production, it's config.

**Treat backing services as attached resources** — Databases, caches, queues,
email services are swappable resources. Access them through configuration, not
hardcoded connection strings.

**Store nothing in the process** — Don't rely on in-memory state persisting
between requests. If state needs to persist, put it in a database or cache.

**Logs as event streams** — Write logs to stdout. Don't manage log files, log
rotation, or log shipping in application code.

**Dev/prod parity** — Keep development, staging, and production as similar as
possible. Don't use different databases, different queues, or different patterns
across environments.

## DRY — Don't Repeat Yourself

When you see the same logic in two or more places, extract it — but only when the
duplication is real, not coincidental. Two pieces of code that happen to look
similar today but serve different purposes and will evolve differently are not
duplication. Three similar lines of code is better than a premature abstraction.

**The test:** If changing the logic in one place means you MUST change it in the
other place too (or risk a bug), it's real duplication. Extract it.

## KISS — Keep It Simple

The simplest solution that meets the requirement is the right solution. Don't
add layers of abstraction "in case we need them later." Don't use a design
pattern because it's clever — use it because the code demands it.

Complexity is justified only when:
- The requirement is genuinely complex (not when the solution is over-engineered)
- The simpler alternative has a concrete, articulable drawback (not hypothetical)
- The complexity pays for itself in the current iteration (not in a future one)

## Migration-First Mindset

Schema changes get migrations. Always. Never work around a schema change with
field mappings, SQL aliases, computed columns, or application-level transforms.
Migrations are not scary — they are the correct, reversible, auditable way to
evolve a schema.

When planning a task that touches data models:
- Include a migration file in the task's file list
- Include migration runner registration (npm scripts, CLI commands)
- Include type/schema updates that match the migration

When implementing: write the migration first, run it, then update the
application code to match.

When reviewing: if a schema change exists without a migration, flag it as
critical.

## Configuration Over Hardcoding

Values that could vary by environment, change over time, or differ between
deployments go in configuration — not in source code. This includes:

- API URLs, ports, hostnames
- Feature flags and toggles
- Rate limits, timeouts, retry counts
- Email addresses, notification templates
- Lists of allowed/blocked values

**The test:** If changing this value requires a code change and redeployment,
it should be config instead.

## Data-Driven Over Code-Driven

If something is a list of things that could change — categories, status values,
permission levels, supported formats — make it data, not an enum or switch
statement in code. Data can be updated without redeployment. Code requires a
release.

This doesn't mean every list needs a database table. A config file or constants
file that's easy to update is often sufficient. The point is: don't scatter
these values across business logic where they're hard to find and update.

## Defensive Design

**Validate at system boundaries** — Every input from users, external APIs,
webhooks, or file uploads should be validated. Internal function calls between
trusted modules don't need redundant validation.

**Handle edge cases** — What happens with empty inputs? Missing data? Null
values? Zero-length arrays? Concurrent access? The code should handle these
gracefully, not crash.

**Fail with useful errors** — When something goes wrong, the error message
should tell the user (or developer) what happened, what they can do about it,
and where to look for more information. "Internal server error" helps nobody.
"Failed to connect to payment processor — check STRIPE_API_KEY is set" helps
everybody.

**Never silently swallow errors** — Catch blocks that ignore exceptions are
bugs. If you catch an error, either handle it meaningfully, re-throw it, or
log it. Empty catch blocks are never acceptable.

