---
name: e2e-regression-testing
description: >
  Comprehensive Playwright E2E regression testing methodology. Activate this
  skill when Flash needs to create a full regression test suite by auditing an
  entire codebase from scratch — not when testing specific acceptance criteria
  from a plan. That is testing-methodology's domain. This skill applies when
  the instruction is "regression test this application", "write a full E2E suite",
  or "test coverage from scratch". It covers codebase discovery, live app
  exploration via Playwright MCP tools, Page Object Model architecture,
  multi-viewport testing (375px / 768px / 1280px), measurable coverage
  thresholds, and output artifact production.
user-invocable: false
disable-model-invocation: true
---

# E2E Regression Testing

This guides how you create a comprehensive Playwright E2E regression test suite
from scratch. You are not reading a plan — you are auditing the application
itself and turning what you discover into tests. This skill supplements
`testing-methodology`; it does not replace it. When a plan with acceptance
criteria exists, use `testing-methodology`. When you need full regression
coverage of an entire codebase, use this skill.

Execute all nine phases in order. Do not skip or merge phases.

## Phase 1: Codebase Discovery

Map the entire application surface before writing any tests.

### Route and Page Inventory

Find every user-reachable URL:

```bash
# React Router / Next.js file-based routing
glob "**/*.{tsx,jsx}" --include routes, pages, app directories
grep -r "path=\|createBrowserRouter\|<Route" src/

# Express / Fastify / Hono
grep -r "app\.get\|app\.post\|router\.get\|router\.post" src/

# Next.js app directory
ls -R pages/ app/
```

Produce a manifest: one row per URL pattern with expected page content.

### API Endpoint Inventory

Map every API endpoint the frontend calls:

```bash
grep -r "fetch(\|axios\.\|useQuery\|useMutation" src/
grep -r "app\.get\|app\.post\|app\.put\|app\.delete\|app\.patch" src/
```

For each endpoint, note: HTTP method, path, request shape, response shape.

### Workflow Identification

Trace user journeys through the route inventory. Identify at minimum:

- **Onboarding** — signup, email verification, initial setup
- **Authentication** — login, logout, password reset, session management
- **Core value loop** — create, read, update, delete the primary entity
- **Settings** — profile edits, billing, preferences
- **Admin paths** — if an admin role exists
- **Error and recovery flows** — what happens when something goes wrong

### Critical Path Prioritization

| Priority | Definition | Examples |
|----------|------------|---------|
| Critical | App unusable or revenue lost if broken | auth, payment, core value action |
| High | Major feature broken, affects most users | CRUD on primary entity, navigation |
| Medium | Secondary feature or edge case | Advanced filters, export, settings |
| Low | Edge case, rarely used path | Accessibility shortcut, legacy page |

Test critical paths first. All paths must still be covered; priority governs
authoring order, not inclusion.

## Phase 2: Live App Exploration with Playwright MCP

Use the Playwright MCP server tools to explore the running application. This
phase produces the selector knowledge, state dependency map, and visual baselines
needed to write accurate tests.

Confirm the app is running before starting: `browser_navigate` to the base URL
and verify a valid page load.

### Exploration Protocol

For every discovered route:

1. `browser_navigate` to the route
2. `browser_snapshot` — read the accessibility tree; record roles, labels, and
   text content you will use as selectors
3. `browser_network_requests` — record which API calls fire on load
4. `browser_console_messages` — log any errors (note them, do not block authoring)
5. `browser_click` buttons; `browser_type` into forms; observe state changes
6. `browser_resize` to 375px, 768px, 1280px — note layout shifts and hidden elements
7. `browser_take_screenshot` at each breakpoint for visual baseline capture

For forms: additionally submit empty, submit with invalid data (one rule at a
time), then submit with valid data. Observe every validation message location
and text.

For error states: use `browser_route` to mock 401, 403, 404, and 500 responses.
Observe the resulting UI at each status code.

## Phase 3: Test Architecture Setup

Every test file imports page objects. No test file uses raw Playwright `page`
locators directly.

### Directory Structure

```
tests/
  e2e/
    auth/           # login.spec.ts, logout.spec.ts, signup.spec.ts, etc.
    navigation/     # routing.spec.ts, deep-linking.spec.ts
    [feature-area]/ # one directory per major feature
    user-journeys/  # cross-feature end-to-end flows
    pages/          # Page Object Model classes
      BasePage.ts
      LoginPage.ts
      [Feature]Page.ts
    fixtures/       # shared auth state, test data factories
    utils/          # API helpers, data seeding
playwright.config.ts
```

### Base Page Class (`tests/e2e/pages/BasePage.ts`)

```typescript
import { type Page, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async expectHeading(text: string): Promise<void> {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible();
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }
}
// Follow this pattern for page-specific classes like LoginPage, DashboardPage, etc.
// Each extends BasePage and adds page-specific goto(), action helpers, and assertion helpers.
```

Naming: `*.spec.ts` for test files, `*Page.ts` (PascalCase) for page objects.

### What Gets Committed

The test suite is the primary deliverable of this skill — not the run report. These files are permanent project assets designed for repeated execution in CI:

| Committed (project source) | Ephemeral (gitignored) |
|---------------------------|----------------------|
| `tests/e2e/**/*.spec.ts` — test files | `tmp/playwright/` — reports, traces, screenshots, videos |
| `tests/e2e/pages/**` — page objects | `.factory-run/test-results.json` — factory run report |
| `tests/e2e/fixtures/**` — test data and setup | |
| `tests/e2e/utils/**` — helpers | |
| `tests/e2e/__snapshots__/**` — visual baselines | |
| `playwright.config.ts` — runner configuration | |

Install Playwright as a dev dependency and add test scripts to `package.json`:

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install --with-deps
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:desktop": "playwright test --project=desktop-chrome",
    "test:e2e:mobile": "playwright test --project=mobile-chrome --project=mobile-safari"
  }
}
```

These scripts enable CI pipelines and developers to run the suite independently of the factory.

## Phase 4: Playwright Configuration

Create `playwright.config.ts` at the project root:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: './tmp/playwright/results',
  reporter: [
    ['html', { outputFolder: './tmp/playwright/report' }],
    ['json', { outputFile: './tmp/playwright/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'mobile-chrome',  use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari',  use: { ...devices['iPhone 15'] } },
    { name: 'tablet',         use: { ...devices['iPad Pro 11'] } },
  ],
  globalSetup: './tests/e2e/utils/setup.ts',
});
```

Retry count (2 CI / 0 local), both reporters, screenshot on failure, and trace
on first retry are mandatory. Do not remove any of these.

### Artifact Hygiene

All non-persisted Playwright output — reports, traces, screenshots, videos, and
test runner artifacts — goes into `tmp/playwright/` at the project root. This
directory must be gitignored. Never write transient test output to the project
root or alongside source files.

Before running the suite, verify:

```bash
# Confirm tmp/ and tmp/playwright/ are gitignored
grep -q "tmp/" .gitignore || echo "tmp/" >> .gitignore
```

If `.gitignore` does not already contain `tmp/`, append it. The `tmp/` entry
covers `tmp/playwright/` and any other ephemeral working directories.

## Phase 5: Multi-Viewport Testing

Every critical flow must run at mobile AND desktop. The four Playwright projects
enforce this automatically for all `*.spec.ts` files.

### Breakpoints

| Breakpoint | Width | Project |
|------------|-------|---------|
| Mobile | 375px | mobile-chrome, mobile-safari |
| Tablet | 768px | tablet |
| Desktop | 1280px | desktop-chrome |

### Responsive-Specific Tests

Write dedicated tests for elements that transform across breakpoints:

```typescript
const viewports = [
  { label: 'mobile', width: 375, height: 812 },
  { label: 'desktop', width: 1280, height: 720 },
];

for (const vp of viewports) {
  test(`nav is correct at ${vp.label}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    if (vp.width < 768) {
      await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation').getByRole('link').first()).toBeVisible();
    }
  });
}
```

Test explicitly: hamburger menus (hidden by default, opens on click, closes on
ESC and backdrop), stacked layouts (no overflow), touch targets (minimum 44x44px
on mobile — verify with `getBoundingClientRect` via `browser_evaluate`).

## Phase 6: Test Authoring Standards

Every test maps to a user workflow, not an implementation detail. Group with
`test.describe` by feature area. Tag critical tests `@critical`.

### Auth Flows

Write one test for each:

- Login with valid credentials — verify redirect to authenticated home
- Login with wrong password — verify error message, no redirect
- Login with unregistered email — verify error message
- Logout — verify redirect to login, session cleared
- Signup with valid data — verify account created, next step shown
- Signup with duplicate email — verify error message
- Password reset request — verify confirmation shown
- Password reset with invalid/expired token — verify error state
- Protected route redirect — navigate while logged out, verify redirect with
  return URL preserved
- Session expiry — mock expired token, verify re-authentication prompt

### Forms

For every form:

- Valid submission — verify success state and side effects
- Empty submission — verify required field errors appear for each required field
- Each validation rule individually — one test per rule
- Partial data — verify only unfilled required fields show errors
- Special characters — apostrophes, ampersands, emoji in text fields

### Navigation

- Every route reachable via UI (follow the critical path first)
- Deep linking — navigate directly to each route by URL, verify correct content
- Back and forward browser history — verify state preserved or reset correctly
- 404 handling — navigate to non-existent URL, verify error page or redirect

### Data Display

For every list or data display page: loading state (intercept API with delay),
empty state (mock empty response), error state (mock 500), populated state with
realistic data, pagination (if present — next/previous work, URL reflects page).

### Interactive Elements

- **Modals** — opens on trigger; closes on button click, ESC key, and backdrop
  click; does not close on modal body click
- **Dropdowns** — opens on trigger; closes on selection and outside click;
  selected value reflected in label
- **Tabs** — active tab shows content; inactive tabs are hidden; active state is
  visually indicated
- **Accordions** — toggle behavior correct (single or multi-open per design)
- **Tooltips** — appear on hover and focus with correct text

### Cross-Feature User Journeys

Write at minimum one test per major workflow spanning feature areas:

```typescript
test('new user can sign up and complete the core value action @critical', async ({ page }) => {
  // signup → onboarding → create primary entity → verify in list → open detail
});
```

## Phase 7: Coverage Expectations

Cross-reference written tests against the Phase 1 discovery manifest before
declaring the suite complete.

| Metric | Threshold |
|--------|-----------|
| Critical user journeys with at least one test | 100% |
| All discovered workflows with at least one test | >= 80% |
| Routes visited by at least one test | 100% |
| Features with a happy path test | 100% |
| Features with a primary error path test | 100% |
| Form validation rules explicitly tested | 100% |
| API error states tested (401, 403, 404, 500) | All four |
| Pages with accessibility scan (axe-core) | 100% |
| Key pages with visual regression baseline | 100%, at each breakpoint |

### Accessibility

Install `@axe-core/playwright`. Add a scan to every page-level test:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('login page has no accessibility violations', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Visual Regression

```typescript
test('dashboard visual baseline - desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard-desktop.png', { fullPage: true, threshold: 0.2 });
});
```

Add these fields to `playwright.config.ts` to consolidate snapshots under
`tests/e2e/__snapshots__/`:

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.02,
  },
},
snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
```

Snapshot baselines ARE committed to version control — they are reference images
that document expected UI appearance. Only the ephemeral `tmp/playwright/`
artifacts are excluded via `.gitignore`.

Run with `--update-snapshots` on first pass to establish baselines.

### Coverage Audit Command

```bash
grep -r "goto(" tests/e2e/ | sed "s/.*goto('//" | sed "s/').*//" | sort | uniq
```

Compare extracted URLs against the Phase 1 manifest. Every uncovered route is a
gap to document.

## Phase 8: Test Quality Rules

These are hard constraints. Fix violations before declaring the suite complete.

### No Arbitrary Waits

`page.waitForTimeout()` is banned. If you think you need `waitForTimeout`, you
need a better assertion. Playwright's auto-retry handles timing — you need to
tell it WHAT to wait for, not HOW LONG.

```typescript
// Wrong — arbitrary wait for animation
await page.waitForTimeout(400);
await expect(page.getByText('Filtered results')).toBeVisible();

// Right — wait for animation to complete via CSS
await page.locator('.results').evaluate(el =>
  el.getAnimations().length > 0
    ? Promise.all(el.getAnimations().map(a => a.finished))
    : Promise.resolve()
);
await expect(page.getByText('Filtered results')).toBeVisible();

// Right — wait for network idle after triggering action
await page.getByRole('combobox', { name: 'Filter' }).selectOption('happy-hour');
await page.waitForLoadState('networkidle');
await expect(page.getByText('Filtered results')).toBeVisible();

// Right — wait for element count to stabilize (jQuery filter pattern)
await expect(page.locator('.place-card')).not.toHaveCount(previousCount);

// Right — simplest: just use a web-first assertion (auto-retries for 5s)
await expect(page.getByText('No results')).toBeVisible();
```

For jQuery animations (fade, slide, toggle), wait for the animated element's
final state rather than guessing the duration.

Use web-first assertions: `expect(locator).toBeVisible()`,
`expect(locator).toHaveText()`, `expect(page).toHaveURL()`. Playwright retries
these automatically.

### No Hardcoded Selectors

```typescript
// Wrong
await page.click('.btn-primary');
await page.click('div:nth-child(3) > button');

// Right
await page.getByRole('button', { name: 'Save Changes' }).click();
await page.getByLabel('Email address').fill('...');
await page.getByTestId('submit-button').click();
```

If an element lacks an accessible label or test ID, add a `data-testid`
attribute to the implementation before writing the test.

### Test Independence

Each test creates all required state itself and leaves no side effects. Use
`beforeEach` with direct API calls for setup — never click through the UI to
create prerequisite state.

```typescript
// Wrong: assumes previous test created a record
test('user can delete a record', async ({ page }) => {
  await page.goto('/records');
  await page.getByRole('button', { name: 'Delete' }).first().click();
});

// Right: create via API in beforeEach
test.beforeEach(async ({ request }) => {
  await request.post('/api/records', {
    data: { name: 'Meridian Analytics' },
    headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` },
  });
});
```

### Realistic Test Data

```typescript
// Wrong
await loginPage.login('test@test.com', 'password');

// Right
await loginPage.login('sarah.chen@example.com', 'Str0ng!Pass#99');
```

Use plausible names, emails, and values. Realistic data surfaces real rendering
issues.

### Flaky Test Policy

Zero tolerance. Options in order:

1. Fix the root cause (race condition, missing `await`, non-deterministic selector)
2. Add a more specific web-first assertion to wait for correct state
3. Quarantine with `test.skip` and a linked issue — never leave a flaky test
   silently masked by `retries: 2`

### Test Run Time

Full suite must complete in under 15 minutes with `fullyParallel: true`. If it
exceeds this: increase `workers`, move slow setup to `globalSetup`, replace
UI-based setup with API-driven setup.

## Phase 9: Output Artifact

The test suite you wrote in Phases 3-8 is the primary deliverable — it lives in
the project permanently and runs in CI. This phase produces a secondary artifact:
a run report for the factory.

Run the full suite (`npx playwright test`), then write
`.factory-run/test-results.json` conforming to
`.claude/schemas/test-results.schema.json`.

The HTML report and traces in `tmp/playwright/` are useful for local debugging
but are ephemeral — do not treat them as factory artifacts. Only
`.factory-run/test-results.json` is consumed by Batman, Wonder Woman, and Oracle.

### covers Field Convention

In regression mode, `covers` maps to a discovered workflow or page — not a
plan acceptance criterion. Use the format `"[Area]: [workflow description]"`:

```json
{
  "file": "tests/e2e/auth/login.spec.ts",
  "test_name": "user can log in with valid credentials",
  "covers": "Auth flow: login with valid email and password"
}
```

### summary Field

State: total test count, spec file count, project count and names, coverage
percentage against Phase 7 thresholds, number of gaps.

Example: `"52 tests across 14 spec files. 4 projects. 100% of critical journeys covered. 85% workflow coverage (11/13). All 7 routes visited. 2 gaps documented."`

### coverage_gaps Field

List every discovered workflow or route without test coverage, with a brief
explanation. Do not leave this array empty if gaps exist. Batman and Wonder
Woman read this field to assess risk.

```json
{
  "coverage_gaps": [
    "OAuth login: requires third-party provider not available in test environment",
    "Payment checkout: Stripe test mode not configured in test environment"
  ]
}
```

Include raw `output` from the Playwright test runner in `test_run.output` —
evidence, not just numbers.
