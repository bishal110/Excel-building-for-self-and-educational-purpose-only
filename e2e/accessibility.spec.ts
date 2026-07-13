import { expect, test } from '@playwright/test';

/** Phase 7: keyboard-only walkthrough — the core Sheets flow must be fully
 *  operable without a mouse, with a visible focus/active indicator. */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('keyboard-only: navigate, type, formula, undo — no mouse', async ({ page }) => {
  // Focus the grid via keyboard-reachable focus (it has tabindex=0).
  await page.getByTestId('grid').focus();

  // Type-to-edit in A1, Enter commits and moves down.
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="A1"]')).toHaveText('5');

  // A2: type a formula referencing A1.
  await page.keyboard.type('=A1*8');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-cell="A2"]')).toHaveText('40');

  // Arrow back up to A1 and verify the cell reference follows focus.
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('cell-ref')).toHaveText('A1');

  // F2 opens the editor on the active cell; Escape cancels.
  await page.keyboard.press('F2');
  await expect(page.getByTestId('cell-editor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('cell-editor')).toBeHidden();

  // Ctrl+Z undoes the formula.
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-cell="A2"]')).toHaveText('');
});

test('active cell has a visible indicator and follows arrow keys', async ({ page }) => {
  await page.getByTestId('grid').focus();
  const a1 = page.locator('[data-cell="A1"]');
  await expect(a1).toHaveClass(/active/);
  // The .active class draws a 2px accent outline (visible position indicator).
  const outline = await a1.evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(outline).toBe('2px');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-cell="B1"]')).toHaveClass(/active/);
  await expect(a1).not.toHaveClass(/active/);
});

test('modals are keyboard-dismissable and buttons focusable', async ({ page }) => {
  // Open Help via the toolbar with keyboard activation (Enter on focused button).
  await page.getByTestId('ribbon-tab-view').click(); // Help lives on the View tab
  await page.getByTestId('open-help').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('help-grid')).toBeVisible();
  // The close button is reachable and activatable by keyboard.
  await page.locator('.modal header button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('help-grid')).toBeHidden();
});

test('Escape closes a modal and focus returns to the opener', async ({ page }) => {
  await page.getByTestId('ribbon-tab-view').click();
  await page.getByTestId('open-help').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('help-grid')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('help-grid')).toBeHidden();
  // Focus restoration: the button that opened the dialog has focus again.
  await expect(page.getByTestId('open-help')).toBeFocused();
});

test('ribbon tabs follow the ARIA tabs pattern (arrows, Home/End, aria-selected)', async ({ page }) => {
  const home = page.getByTestId('ribbon-tab-home');
  const insert = page.getByTestId('ribbon-tab-insert');
  const view = page.getByTestId('ribbon-tab-view');
  await expect(home).toHaveAttribute('aria-selected', 'true');
  await home.focus();
  await page.keyboard.press('ArrowRight');
  await expect(insert).toHaveAttribute('aria-selected', 'true');
  await expect(insert).toBeFocused();
  await page.keyboard.press('End');
  await expect(view).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(home).toHaveAttribute('aria-selected', 'true');
});
