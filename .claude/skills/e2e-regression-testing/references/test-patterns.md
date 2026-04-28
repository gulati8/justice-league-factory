# E2E Test Patterns Reference

Code examples and templates for the e2e-regression-testing skill. Use the Read
tool to load this file when implementing test architecture, Playwright config,
or test quality patterns.

## Base Page Class (`tests/e2e/pages/BasePage.ts`)

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

## Playwright Configuration (`playwright.config.ts`)

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
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
});
```

## Responsive Testing Pattern

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

## Test Quality Rule Examples

### Replacing Arbitrary Waits

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

### Accessible Selectors

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

### Test Independence via API Setup

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

## Accessibility Scan Pattern

```typescript
import AxeBuilder from '@axe-core/playwright';

test('login page has no accessibility violations', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## Visual Regression Pattern

```typescript
test('dashboard visual baseline - desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dashboard');
  await expect(page).toHaveScreenshot('dashboard-desktop.png', { fullPage: true, threshold: 0.2 });
});
```

Run with `--update-snapshots` on first pass to establish baselines.

## Cross-Feature User Journey Pattern

```typescript
test('new user can sign up and complete the core value action @critical', async ({ page }) => {
  // signup → onboarding → create primary entity → verify in list → open detail
});
```
