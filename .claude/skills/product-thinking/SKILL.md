---
name: product-thinking
description: >
  User-centric reasoning for research and planning. User journey mapping,
  edge case enumeration, notification flows, and outcome framing. Injected
  into Brainiac and Martian Manhunter to ensure features are designed for
  real users, not just technical correctness.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
---

# Product Thinking

This guides how you think about features from the user's perspective. Technical
correctness is necessary but not sufficient — a feature that works but doesn't
serve the user's actual need is a failure. Your job is to ensure every feature
is designed with the end user in mind.

## Outcome Framing

Before designing anything, answer: **"What is the user trying to accomplish?"**

Not "what does the code need to do" — that comes later. Start with the human
outcome. A user doesn't want "a POST endpoint that creates a share record."
A user wants "to let a colleague see their profile so they can collaborate."
The difference matters because the technical implementation that serves the
outcome includes things the endpoint-focused framing misses: How does the
colleague find out? What do they see when they open it? What if they don't
have an account?

Write the outcome as a single sentence in your output. Every decision downstream
should be traceable to this outcome.

## User Journey Mapping

For every feature, enumerate the complete user flows. Don't stop at the happy
path — the happy path is usually obvious and rarely where quality breaks down.

**For each flow, walk through:**

1. **Entry point** — How does the user discover/access this feature? Is it a
   button, a menu item, a URL, a notification? Is it obvious or hidden?
2. **Happy path** — The ideal flow from start to finish. What does the user
   see at each step? What actions do they take?
3. **First-time experience** — What does a new user see? Is there an empty
   state? Onboarding? A tutorial? If the feature depends on having data (e.g.,
   "view your history"), what happens when there's no history yet?
4. **Error states** — What happens when something goes wrong? Network failure?
   Invalid input? Permission denied? The user should always know what happened
   and what to do about it.
5. **Edge cases** — What happens at the boundaries? Zero items? Maximum items?
   Concurrent users? Very long text? Special characters? What happens when the
   user tries to do the wrong thing?
6. **Exit point** — How does the user know they're done? Is there confirmation?
   Can they undo?

## "What Happens When..." Checklist

For every feature, systematically ask these questions. If you can't answer one,
it's an open question that must be addressed in the plan — not silently ignored.

**Data states:**
- What happens when the user has no data? (Empty state)
- What happens when the user has too much data? (Pagination, truncation, search)
- What happens when the data is stale or out of date?
- What happens when two users modify the same data concurrently?

**User states:**
- What happens when the user is not logged in?
- What happens when the user doesn't have permission?
- What happens when the user's session expires mid-action?
- What happens when the user is on a slow connection?
- What happens when the user is on a mobile device?

**Multi-user flows:**
- If this feature involves multiple users, how does each user find out about
  the other's action? (Notification, email, real-time update, next-login prompt)
- What happens if the target user doesn't exist?
- What happens if the target user declines or ignores the action?
- What happens if the initiating user revokes the action before the target responds?

**System states:**
- What happens when an external dependency is down? (API, email service, payment processor)
- What happens when the operation partially succeeds? (3 of 5 items processed)
- What happens when the operation times out?
- What happens when the user retries an operation that already succeeded?

## Notification and Communication Flows

When a feature involves more than one user, map the communication flow explicitly.
A feature that creates a "share" is useless if the recipient has no way to
discover they were shared with.

For each cross-user interaction:
- **Trigger:** What action creates the notification?
- **Channel:** How is the recipient notified? (In-app, email, push, SMS)
- **Timing:** Immediately? On next login? Batched daily?
- **Content:** What does the notification say? Is it actionable? (Link to the shared item)
- **Fallback:** If the primary channel fails (email bounce, no push token), what happens?
- **Degraded mode:** If no notification channel is available yet (email service not configured), what's the minimum viable experience? (e.g., show pending shares on the recipient's dashboard)

## How to Apply This

**Brainiac (research phase):** When producing the research brief and feature
request, include a "User Journeys" section in the research brief that maps the
flows above. The feature-request.json acceptance criteria should cover not just
the happy path but the critical edge cases and error states.

**Martian Manhunter (planning phase):** When decomposing into tasks, ensure
each user flow has tasks that cover it. Empty states, error states, and
notification flows are not "nice to haves" — they are tasks in the plan.
The definition-of-done fields on each task (`user_impact`, `edge_cases`)
force you to think about this for every task, not just the feature overall.

## Anti-Patterns

- **"We'll add error handling later"** — No. Error states are part of the
  feature, not polish. Plan them now.
- **"The user will figure it out"** — If the user needs to "figure out" how
  to use the feature, the feature is incomplete.
- **"We'll add notifications when we have an email provider"** — Design the
  notification flow now, with a degraded-mode fallback (dashboard prompt, in-app
  indicator) that works without external services.
- **"That's an edge case"** — Edge cases are where users lose trust. A single
  unhandled edge case (data loss, silent failure, confusing error) can undo all
  the happy-path polish.
- **"Users won't do that"** — They will.
