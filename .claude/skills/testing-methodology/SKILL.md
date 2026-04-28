---
name: testing-methodology
description: >
  Testing methodology for writing tests against plan acceptance criteria,
  user journeys, and edge cases. Framework detection, coverage hierarchy,
  coverage matrix output, and test quality guidance.
  Injected into Flash's context.
user-invocable: false
disable-model-invocation: true
last_reviewed: 2026-04-28
---

# Testing Methodology

This guides how you turn acceptance criteria, user journeys, and edge cases into
tests. Your tests are the deterministic eval layer — they pass or they don't,
and that verdict drives the pipeline.

## Framework Detection

Before writing any tests, understand the project's existing test setup:

1. Look for test config files: `jest.config.*`, `vitest.config.*`, `pytest.ini`,
   `setup.cfg`, `.mocharc.*`, `tsconfig.test.json`, `playwright.config.*`
2. Look for existing test files: `**/*.test.*`, `**/*.spec.*`, `**/test_*`,
   `**/__tests__/**`, `**/e2e/**`
3. Check `package.json` for test scripts and devDependencies
4. Read 2-3 existing test files to understand patterns:
   - Import style (what assertion library?)
   - Test organization (describe/it? test()? class-based?)
   - Fixtures and setup patterns
   - How API tests are done (supertest? direct fetch?)
   - How E2E tests are done (Playwright? Cypress?)

Match whatever you find. If there are no existing tests, use the most common
framework for the project's language.

## Coverage Hierarchy

Tests are organized in a hierarchy of priority. Work through each level in order.

### Level 1: Acceptance Criteria Tests (required)

Every acceptance criterion from plan.json becomes at least one test. This is the
non-negotiable baseline — if an acceptance criterion doesn't have a test, the
feature is not done.

### Level 2: User Journey E2E Tests (required when E2E framework exists)

If the plan or research brief includes user journeys (from product-thinking),
each journey gets an E2E Playwright test covering the happy path end-to-end.
These test the full flow a user would experience, not isolated units.

Only write E2E tests if:
- The project has a Playwright (or similar) setup, OR
- The plan explicitly requests E2E tests

If no E2E framework exists, list these journeys in the coverage matrix under
`uncovered` with the note "no E2E framework configured."

### Level 3: Edge Case Tests (required)

Each task in plan.json now includes an `edge_cases` array. Every edge case
listed gets a test. These are not optional "nice to haves" — they were
identified during planning specifically because they represent risk.

Common edge case categories:
- Empty states (no data, empty arrays, null values)
- Permission failures (unauthorized, forbidden)
- Invalid input (wrong types, missing fields, too long, special characters)
- Boundary conditions (zero, maximum, one-off)
- Concurrent access (if applicable)

### Level 4: Regression Guardrails (brownfield only)

For brownfield work (modifying existing code), before writing new tests:

1. Identify existing functionality that could break from the changes
2. Check if existing tests cover those areas
3. If not, add targeted regression tests for the most critical paths

This prevents the "new feature works, old feature broke" problem.

## Coverage Matrix Output

Your `test-results.json` must include a `coverage_matrix` object that maps
plan artifacts to tests. This is how Wonder Woman verifies completeness and
how the dashboard tracks coverage trends.

```json
{
  "coverage_matrix": {
    "acceptance_criteria": [
      {
        "criterion": "GET /api/shares returns 200 with list of active shares",
        "test_names": ["test_list_shares_returns_active"]
      }
    ],
    "user_journeys": [
      {
        "journey": "User shares profile with colleague",
        "test_names": ["e2e_share_profile_happy_path"]
      }
    ],
    "edge_cases": [
      {
        "edge_case": "Share target user does not exist",
        "test_names": ["test_share_nonexistent_user_returns_404"]
      }
    ],
    "uncovered": [
      "Real-time notification delivery (no WebSocket test infrastructure)"
    ]
  }
}
```

Build the matrix BEFORE writing tests — scan all acceptance criteria, user
journeys, and edge cases from the plan first, then write tests to fill each
slot. This prevents the common failure of writing tests that feel productive
but miss critical criteria.

## Efficiency

Write focused tests and move on. You are a speed agent — your value is fast,
deterministic verdicts, not exhaustive edge case coverage beyond what the plan
specifies.

- Write one test per acceptance criterion. Add a second only if the criterion
  has an obvious sad-path that the plan explicitly calls out.
- Edge case tests should be concise — test the specific boundary, not the
  entire flow.
- E2E tests should cover the critical path, not every permutation.
- **Hard limit: total test count must not exceed 2x the number of acceptance
  criteria + edge cases combined.** Every extra test adds context tokens that
  slow you down and cost money.
- Keep test code concise. Reuse setup/fixtures across tests rather than
  duplicating setup in every test.
- Run the test suite once at the end. Do not run tests after writing each
  individual test file.

## Test Quality

**Test behavior, not implementation:**
- Good: "submitting the form with empty email shows an error message"
- Bad: "the validateEmail function returns false for empty string"

**Test one thing per test:**
- Each test should have one clear assertion (or a small group of related assertions)
- If a test name has "and" in it, consider splitting it

**Use realistic data:**
- Don't test with "foo", "bar", "test123"
- Use data that resembles real usage (realistic names, emails, IDs)

## Coverage Gaps

If an acceptance criterion or edge case can't be tested with automated tests,
list it in `coverage_gaps` AND in `coverage_matrix.uncovered` with an
explanation. This is honest reporting, not a failure.

Common un-testable criteria:
- Visual/design requirements (needs manual review or screenshot comparison)
- Performance requirements (needs load testing, not unit tests)
- Third-party integrations (needs mocking or live environment)
- Real-time features (needs WebSocket test infrastructure)

## Test Results Schema Reference

Your output must conform to `.claude/schemas/test-results.schema.json`. Key
addition: the `coverage_matrix` field is now expected. If you omit it, Wonder
Woman will flag incomplete test coverage.
