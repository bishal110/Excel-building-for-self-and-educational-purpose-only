import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('ai-office:deck');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await page.getByTestId('nav-slides').click();
  await expect(page.getByTestId('slide-canvas')).toBeVisible();
});

test('create → reorder → present → exit', async ({ page }) => {
  // 1. Create: rename slide 1, add a second slide, rename it.
  await page.getByTestId('field-title').fill('First');
  await page.getByTestId('add-slide').click();
  await page.getByTestId('field-title').fill('Second');
  await expect(page.getByTestId('slide-list').locator('.slide-thumb-row')).toHaveCount(2);

  // 2. Reorder: drag slide 2 (index 1) above slide 1 (index 0).
  await page.getByTestId('thumb-1').dragTo(page.getByTestId('thumb-0'));
  // Now the first slide should be "Second".
  await page.getByTestId('thumb-0').click();
  await expect(page.getByTestId('field-title')).toHaveValue('Second');

  // 3. Present: enter full-screen present mode.
  await page.getByTestId('present').click();
  await expect(page.getByTestId('present-mode')).toBeVisible();
  await expect(page.getByTestId('present-counter')).toHaveText('1 / 2');

  // Navigate with the keyboard.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('present-counter')).toHaveText('2 / 2');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('present-counter')).toHaveText('1 / 2');

  // 4. Exit with Escape.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('present-mode')).toBeHidden();
});

test('layout and theme changes render', async ({ page }) => {
  await page.getByTestId('layout-select').selectOption('image');
  await expect(page.getByTestId('field-image')).toBeVisible();
  await page.getByTestId('theme-select').selectOption('ocean');
  await expect(page.getByTestId('slide-canvas')).toHaveClass(/theme-ocean/);
});

test('delete keeps at least one slide', async ({ page }) => {
  await page.getByTestId('add-slide').click();
  await expect(page.getByTestId('slide-list').locator('.slide-thumb-row')).toHaveCount(2);
  await page.getByTestId('delete-slide').click();
  await expect(page.getByTestId('slide-list').locator('.slide-thumb-row')).toHaveCount(1);
  await page.getByTestId('delete-slide').click(); // ignored — last slide
  await expect(page.getByTestId('slide-list').locator('.slide-thumb-row')).toHaveCount(1);
});
