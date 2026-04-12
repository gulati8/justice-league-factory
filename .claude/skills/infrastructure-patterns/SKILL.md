---
name: infrastructure-patterns
description: >
  Decision frameworks for infrastructure choices: cost modeling, managed vs
  self-hosted, deployment topology, observability, reliability, security
  posture, and vendor lock-in. Teaches agents HOW to evaluate infrastructure
  decisions, not WHAT to choose. Vendor-agnostic.
user-invocable: false
disable-model-invocation: true
---

# Infrastructure Patterns

Principles and decision frameworks for infrastructure decisions. This skill
covers the layer beneath application architecture: where code runs, how it is
observed, how it fails gracefully, and how much it costs.

This skill does not duplicate architectural-principles — it extends it.
12-Factor Factors III (config), X (dev/prod parity), and XI (logs as streams)
are covered there. This skill covers what architectural-principles does not.

## Cost Reasoning

Calculate TCO, not sticker price. Include compute, egress, storage, engineer
time for operations, and monitoring overhead.

For teams under 10 engineers, engineer time dominates. A $50/month managed
service that saves 4 hours/month of operations is a 10x return at $100/hour
loaded cost.

Audit free tiers for graduation cliffs: egress fees, log retention charges,
per-seat pricing that scales with team growth.

**Decision test:** "What does this cost at 10x our current usage? What is the
exit cost if we outgrow it?"

## Managed vs Self-Hosted

Default to managed unless: compliance requires data plane control, the managed
option lacks a critical capability, or the team has dedicated infrastructure
expertise.

Evaluate by: operational burden (patching, backups, monitoring, upgrades),
blast radius of failure, and availability of the team to respond to incidents.

Self-hosting is cheaper at scale but more expensive at small scale when you
account for engineer time.

**Decision test:** "Who gets paged when this breaks at 3 AM? If the answer is
'the only developer,' use managed."

## Deployment Topology

Start monolithic. Split only when: deployment coordination is a bottleneck,
components have genuinely different scaling requirements, or team size exceeds
10-15 and ownership boundaries demand independent deploys.

Containers for packaging consistency. Orchestration only when you have multiple
services or need auto-scaling beyond what a single compute tier provides.

One deployable unit is simpler to reason about, debug, and operate than N
deployable units communicating over a network.

**Decision test:** "Does splitting this into separate services solve a problem
I have today, or a problem I imagine having later?"

## Observability Architecture

Instrument the three pillars: structured logs (with correlation IDs), metrics
(request rate, error rate, latency), traces (for cross-service or
cross-boundary calls).

Use OpenTelemetry for vendor-neutral instrumentation. Choose the backend
separately from the instrumentation.

Alert on symptoms (error rate, latency), not causes (CPU, memory). Every alert
must be actionable — a runbook or at minimum a "first thing to check."

**Decision test:** "If this service fails silently at 2 AM, how long until we
know? What data do we need to diagnose it?"

## Secrets, Config, and Environment Parity

Extends architectural-principles Factor III. Configuration in environment
variables. Secrets in a vault — not environment variables in CI, not .env files
in production.

Rotate secrets on a schedule. Design for rotation: no hardcoded tokens, no
secrets baked into images.

Local development mirrors production topology: container-based backing services
locally, managed equivalents in production. Same environment variable names,
same connection abstractions.

**Decision test:** "Can a new developer run this application locally in under
15 minutes with only `docker compose up` and an `.env.example` file?"

## CI/CD and Deployment Strategy

Rolling deployments for small teams. Blue-green when zero-downtime is required.
Canary only when traffic volume supports statistical significance.

Infrastructure as Code for everything that is not the application itself:
network config, IAM policies, database provisioning. The infrastructure must be
reproducible from a single command.

Environment promotion: dev → staging → production. Never deploy to production
what has not run in staging.

**Decision test:** "Can I recreate this entire environment from scratch using
only code in the repository and secrets in the vault?"

## Reliability and Resilience

Retries with exponential backoff and jitter for transient failures. Circuit
breakers for persistent downstream failures. Dead-letter queues for async work
that must not be lost.

Health checks: liveness (is the process running?) and readiness (can it serve
traffic?). Separate endpoints, separate concerns.

Graceful degradation: identify which features can fail without taking down the
whole application. Design fallbacks for non-critical paths.

Design for failure. Every external dependency will fail. The question is not
"if" but "what happens when."

**Decision test:** "What happens to the user experience when [dependency X] is
down for 5 minutes?"

## Vendor Lock-In and Portability

Assess three forms of lock-in for every vendor dependency: technical
(proprietary API), commercial (committed spend), operational (team expertise).

Prefer open standards and portable formats. Containerize workloads. Keep data
in standard formats not vendor-proprietary formats.

Maintain an exit cost estimate: "If we had to leave this vendor in 6 months,
what would it cost in engineering time?"

Acceptable lock-in: when the vendor's capability is transformative and the exit
cost is bounded. Unacceptable lock-in: when the vendor's capability is
commodity and the exit cost is unbounded.

**Decision test:** "If this vendor doubles their price tomorrow, what is our
plan?"

## Security Posture

TLS everywhere — no exceptions, including internal service-to-service
communication.

Least privilege IAM: services get only the permissions they need. Review
permissions quarterly.

Audit logging on authentication events, data access, and administrative
actions. Logs are append-only and tamper-evident.

Network segmentation: databases are not publicly accessible. Application
services communicate through defined network boundaries.

**Decision test:** "If an attacker compromises this service, what else can they
reach?"

## Data Residency and Compliance

Matters when: processing personal data of EU residents, handling healthcare
data, serving government clients, or operating in jurisdictions with data
sovereignty laws.

Choose a cloud region early. Design for single-region first. Multi-region
residency is an architectural decision that cannot be retrofitted cheaply.

If compliance is not a current requirement, design for it to be addable: keep
personal data in identifiable stores, avoid scattering PII across caches and
logs.

**Decision test:** "If a regulator asks 'where is user X's data stored,' can
we answer in under an hour?"
