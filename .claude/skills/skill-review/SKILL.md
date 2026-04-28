---
name: skill-review
description: >
  Methodology for evaluating skill quality at creation and modification time.
  Content quality rubric, cross-skill coherence analysis, and token efficiency
  assessment. Complements improvement-methodology: this skill evaluates craft,
  improvement-methodology evaluates effectiveness from telemetry.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
---

# Skill Review

This guides how you evaluate the quality of a skill — at creation time, after
proposed modifications, or during periodic health checks. This is a distinct
mode of operation from your improvement work: improvement-methodology requires
telemetry evidence; skill-review requires rubric-based analysis of the skill
artifact itself. When Batman dispatches you for skill review, use this skill.
When Batman dispatches you for improvement analysis, use improvement-methodology.
Do not mix the two modes.

## Content Quality Rubric

Evaluate each skill against seven dimensions. Each has a binary test — the
skill either passes or it does not.

### 1. Format Compliance

Valid YAML frontmatter with required fields: `name`, `description`,
`user-invocable`, `disable-model-invocation`. Markdown body starts with H1
title matching the skill name. Sections use `##` headings. Matches the
structure of adjacent skills in `.claude/skills/`.

**Test:** Does the frontmatter parse without error and contain all four fields?

### 2. Scope Clarity

The skill states what it covers AND what it does not cover. No mission creep —
the skill does not drift into territory owned by another skill.

**Test:** Can you state in one sentence what this skill IS and what it is NOT?

### 3. Actionability

Every principle has a concrete mechanism an agent can apply: a decision test,
a checklist item, a severity classification, or a template. Decorative
principles ("always consider performance") fail this test.

**Test:** For each principle, can an agent produce a different output because
of it? If removing the principle would not change agent behavior, it is filler.

### 4. Completeness

The skill covers its stated domain without obvious gaps. Missing coverage is
worse than verbose coverage — an agent that loads this skill should not need
to improvise in the skill's own domain.

**Test:** List three plausible questions an agent would face in this domain.
Does the skill guide all three?

### 5. Token Efficiency

No filler, no redundant phrasing, no duplication of content in co-loaded
skills. Every sentence carries information. The skill is right-sized for
the context budget — under 800 words for focused skills, under 300 lines
for comprehensive skills.

**Test:** Read each paragraph. Can you delete a sentence without losing
information? If yes, the paragraph is bloated.

### 6. Prescriptive Voice

Uses "must," "should," "never," "always" — not suggestions, hedges, or
opinions. Agents need directives, not options. The skill tells agents what
to do, not what they might consider doing.

**Test:** Count hedge words ("consider," "might," "could," "it depends").
More than two per section is too soft.

### 7. Negative Guidance

States what NOT to do, not just what to do. Constraints prevent common failure
modes. A skill without negative guidance assumes agents will not make mistakes.

**Test:** Does the skill include at least one "do not" or "never" per major
section?

## Cross-Skill Coherence Analysis

Evaluate the skill's relationship to other skills loaded by the same agents.
Read the agent's frontmatter to identify co-loaded skills, then check:

### 1. Overlap Detection

Does this skill duplicate content already in a co-loaded skill? Duplication
wastes tokens and creates conflicting sources of truth. If two skills cover
the same principle, one should reference the other.

### 2. Contradiction Detection

Does this skill contradict principles in a co-loaded skill? A skill that says
"default to managed services" must not coexist with a skill that says "always
self-host for control" on the same agent.

### 3. Reference Integrity

If the skill says "see [other skill] for X," verify that the referenced skill
actually covers X. Broken cross-references mislead agents.

### 4. Context Budget Impact

How many tokens does this skill add to the agent's context? What is the total
token count across all of the agent's skills? Is the agent approaching context
limits? Flag if any single skill exceeds 1500 tokens or if the combined skill
load exceeds 8000 tokens.

## Output Format

Return your assessment to Batman as a narrative. Structure it as:

1. **Verdict:** pass, pass-with-warnings, or fail
2. **Content quality:** Which of the seven dimensions pass, which fail, with
   specific evidence for failures
3. **Coherence:** Any overlap, contradiction, or reference issues found
4. **Token impact:** Token count for the skill and total agent context impact
5. **Recommendations:** Specific, actionable changes if the verdict is not pass

Do not produce a JSON artifact. This output is consumed by Batman and the user,
not by a downstream agent.

## Constraints

- Never modify the skill being reviewed
- Never modify agent definitions or other skills
- Always read co-loaded skills before assessing coherence — do not rely on
  memory of skill content
- This is evaluation, not improvement — flag issues, do not propose telemetry-
  backed refactors (that is improvement-methodology's domain)
- A skill with zero negative guidance always fails dimension 7 — no exceptions
