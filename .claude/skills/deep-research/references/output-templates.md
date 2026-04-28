# Deep Research Output Templates

Templates and detailed guidance for Phase 5 (Risk Assessment) and Phase 6
(Output Crystallization). Use the Read tool to load this file when producing
final research artifacts.

## Risk Assessment Details (Phase 5)

### Technical Risks: Can we build it?

For each risk, specify:
- Likelihood: Low / Medium / High
- Impact: Low / Medium / High (what breaks if this risk materializes?)
- Mitigation: What would reduce this risk before implementation begins?

Examples:
- "The third-party API we depend on has a 10 req/sec rate limit, which may be
  insufficient at scale. Likelihood: Medium. Impact: High (feature unusable
  under load). Mitigation: Load test with realistic traffic simulation before
  commit."
- "WebSocket support in the existing infrastructure is untested. Likelihood:
  Low. Impact: Medium (would require infrastructure change). Mitigation: Spike
  with a proof-of-concept before including in the plan."

### Adoption Risks: Will anyone use it?

The feature may be technically correct but deliver no value if nobody uses it,
or if it solves a problem users don't actually have.

- Did the landscape survey reveal that existing solutions are "good enough"?
  If so, what differentiates this?
- Is the core tension validated by real users, or is it assumed by the
  requester?
- Are there switching costs or behavioral barriers that make adoption difficult
  even if the product is better?
- Does the feature require users to change an existing habit? Habit change is
  a high-adoption-risk signal.

### Unknown Unknowns: What don't we know we don't know?

Apply a structured probe:

- What would a senior engineer with 10 years in this domain know that you
  haven't surfaced yet? What questions would they ask?
- What edge cases are invisible from the happy path? Payments, auth, file
  uploads, real-time features, and i18n are common sources of hidden complexity.
- What happens at 10x the expected scale? At 100x?
- What happens when the external dependency this feature relies on goes down,
  returns unexpected data, or changes its API?

Document unknown unknowns as questions, not risks. "We do not know how existing
sessions are invalidated when a user changes their email. This needs
investigation before implementation." That is a useful unknown. "There may be
things we don't know" is not.

## Research Brief Template (Phase 6)

**Artifact: `.factory-run/research-brief.md`**

This is the human-readable artifact. Written for a product manager, a senior
engineer, or a founder who wants to understand the research findings and
recommendation in narrative form. Not a list of bullet points. Not a JSON dump.
Prose that tells the story of what you found and what you recommend.

Required headings, in order:

```
## Concept
## Landscape
## Constraints
## Risks
## Recommendation
```

- **## Concept** — The plain-language restatement from Phase 1, expanded with
  the core tension. Answers: "What are we talking about and why does it matter?"
- **## Landscape** — What exists, what the market has validated, and what is
  missing. Answers: "What does the world already know about this problem?"
- **## Constraints** — The constraint inventory from Phase 3, summarized.
  Technical, business, user, and scope constraints. Answers: "What are the hard
  limits we must work within?"
- **## Risks** — The top 3–5 risks from Phase 5, with likelihood/impact/
  mitigation. Answers: "What could go wrong, and what do we do about it?"
- **## Recommendation** — A clear, opinionated conclusion. Should this be
  built? What is the MVP boundary (from Phase 4)? What is the one thing
  that must work? What is the t-shirt estimate? Answers: "Given everything,
  what should we actually do?"

The recommendation must be evidence-based. Cite specific findings from the
landscape survey, specific constraints, or specific risks. "Based on the
landscape survey, no existing tool addresses X within the Y constraint" is
evidence. "This seems like a good idea" is not.

Minimum length: 500 characters.

## Feature Request Schema (Phase 6)

**Artifact: `.factory-run/feature-request.json`**

Machine-readable artifact consumed by Martian Manhunter. Must conform to
`.claude/schemas/feature-request.schema.json`.

Required fields:

```json
{
  "title": "Short, imperative feature name (5–10 words)",
  "problem_statement": "One paragraph describing the problem or opportunity this feature addresses",
  "proposed_solution": "High-level description of the proposed approach to solve the problem",
  "constraints": [
    "Technical, business, or time constraint from Phase 3",
    "Another constraint from Phase 3"
  ],
  "mvp_scope": {
    "in": ["Capability explicitly included in the MVP"],
    "out": ["Capability explicitly excluded from the MVP"]
  },
  "acceptance_criteria": [
    "Specific, testable behavioral criterion",
    "Another specific, testable behavioral criterion"
  ],
  "risks": [
    "Known risk or unknown that could affect delivery or correctness",
    "Another risk from Phase 5"
  ],
  "effort_estimate": "M",
  "research_brief_path": ".factory-run/research-brief.md"
}
```

Acceptance criteria follow the same standard as planning-methodology requires:
each one must be specific enough that Flash could write an automated test
without asking clarifying questions. "The feature works" fails this test.
"GET /api/suggestions returns an array of at most 5 items within 200ms" passes.

Do not populate `acceptance_criteria` from the original request verbatim.
The original request is rarely specific enough. Derive the criteria from the
MVP boundary defined in Phase 4 and the "one thing that must work" statement.

## Effort Estimate Scale

- **XS:** Less than a day. A single file change, no new dependencies.
- **S:** 1–3 days. A few files, one new component or route.
- **M:** 3–10 days. Multiple components, a new data model, some integration work.
- **L:** 2–4 weeks. New subsystem, significant refactoring, external service
  integration.
- **XL:** More than a month. Architectural change, multi-team dependency, or
  fundamentally unknown implementation path.

Include a justification sentence. "M: Requires a new database table, a
background job, and two new API endpoints — all within existing patterns, no
new infrastructure." Estimates without justification are opinions.
