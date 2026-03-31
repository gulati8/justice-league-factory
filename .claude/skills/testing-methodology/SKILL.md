---
name: testing-methodology
description: >
  Testing methodology for writing tests against plan acceptance criteria.
  Framework detection, coverage mapping, and test quality guidance.
  Injected into Flash's context.
user-invocable: false
disable-model-invocation: true
---

# Testing Methodology

This guides how you turn acceptance criteria into tests. Your tests are the
deterministic eval layer — they pass or they don't, and that verdict drives
the pipeline.

## Framework Detection

Before writing any tests, understand the project's existing test setup:

1. Look for test config files: `jest.config.*`, `vitest.config.*`, `pytest.ini`,
   `setup.cfg`, `.mocharc.*`, `tsconfig.test.json`
2. Look for existing test files: `**/*.test.*`, `**/*.spec.*`, `**/test_*`,
   `**/__tests__/**`
3. Check `package.json` for test scripts and devDependencies
4. Read 2-3 existing test files to understand patterns:
   - Import style (what assertion library?)
   - Test organization (describe/it? test()? class-based?)
   - Fixtures and setup patterns
   - How API tests are done (supertest? direct fetch?)

Match whatever you find. If there are no existing tests, use the most common
framework for the project's language.

## Acceptance Criteria Mapping

Every acceptance criterion from the plan becomes at least one test. The mapping
should be explicit:

```json
{
  "tests_written": [
    {
      "file": "tests/api/health.test.ts",
      "test_name": "GET /api/health returns 200 with status and timestamp",
      "covers": "GET /api/health returns 200 with JSON body containing status and timestamp fields"
    }
  ]
}
```

The `covers` field should quote or closely paraphrase the acceptance criterion
so anyone reading test-results.json can trace each test back to a requirement.

## Efficiency

Write focused tests and move on. You are a speed agent — your value is fast,
deterministic verdicts, not exhaustive edge case coverage.

- Write one test per acceptance criterion. Add a second only if the criterion
  has an obvious sad-path that the plan explicitly calls out.
- Do NOT write extra tests beyond what the acceptance criteria require. If the
  plan has 8 criteria, you should have roughly 8-12 tests, not 40.
- Keep test code concise. Reuse setup/fixtures across tests rather than
  duplicating setup in every test.
- Run the test suite once at the end. Do not run tests after writing each
  individual test file.
- Your output artifact (test-results.json) should be concise. Include the test
  run output summary, not the full verbose log.

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

**Test the sad path too:**
- Invalid input (wrong types, missing fields, too long)
- Boundary conditions (empty arrays, zero values, max values)
- Error responses (404, 403, 500)

## Coverage Gaps

If an acceptance criterion can't be tested with automated tests (e.g., "the UI
looks correct"), list it in `coverage_gaps` with an explanation. This is honest
reporting, not a failure.

Common un-testable criteria:
- Visual/design requirements (needs manual review or screenshot comparison)
- Performance requirements (needs load testing, not unit tests)
- Third-party integrations (needs mocking or live environment)

## Test Results Schema

Your output must conform to `schemas/test-results.schema.json`:

```json
{
  "verdict": "pass|fail",
  "summary": "Brief summary of results",
  "tests_written": [...],
  "test_run": {
    "total": 14,
    "passed": 14,
    "failed": 0,
    "skipped": 0,
    "command": "npm test",
    "output": "raw test runner output here"
  },
  "coverage_gaps": []
}
```

Include the raw `output` from the test runner — this is evidence. Batman and
Oracle both benefit from seeing exactly what happened, not just the numbers.
