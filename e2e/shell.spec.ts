import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
});

test('File menu: save whole-suite project and start new', async ({ page }) => {
  await page.goto('/');

  // Put content in Sheets and Slides.
  await page.locator('[data-cell="A1"]').dblclick();
  const ed = page.getByTestId('cell-editor');
  await ed.fill('123');
  await ed.press('Enter');

  // Save project → File → Save As → AI_Office project → download project.aioffice
  await page.getByTestId('file-menu').click();
  await page.getByTestId('file-saveas').hover();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('save-project').click(),
  ]);
  expect(download.suggestedFilename()).toBe('project.aioffice');

  // New project clears the grid (auto-accept the confirm dialog).
  page.on('dialog', (d) => d.accept());
  await page.getByTestId('file-menu').click();
  await page.getByTestId('file-new').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveText('');
});

const WIDTHS = [360, 768, 1366];
for (const width of WIDTHS) {
  test(`responsive: no horizontal page overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');

    for (const nav of ['nav-sheets', 'nav-docs', 'nav-slides']) {
      await page.getByTestId(nav).click();
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${nav} overflows horizontally at ${width}px by ${overflow}px`).toBeLessThanOrEqual(2);
      // The header stays usable.
      await expect(page.getByTestId('module-nav')).toBeVisible();
    }
  });
}
