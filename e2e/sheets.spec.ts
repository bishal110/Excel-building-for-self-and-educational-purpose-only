import { expect, test } from '@playwright/test';

async function editCell(page: import('@playwright/test').Page, cell: string, value: string) {
  await page.locator(`[data-cell="${cell}"]`).dblclick();
  const editor = page.getByTestId('cell-editor');
  await editor.fill(value);
  await editor.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('ai-office:autosave');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await expect(page.getByTestId('grid')).toBeVisible();
});

test('edit → formula → insert row → undo → export', async ({ page }) => {
  // 1. Enter values
  await editCell(page, 'A1', '10');
  await editCell(page, 'A2', '20');

  // 2. A formula that sums them
  await editCell(page, 'A3', '=A1+A2');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');

  // 3. Insert a row at the top — data shifts down, formula rewrites
  await page.locator('[data-cell="A1"]').click();
  await page.getByTestId('insert-row').click();
  await expect(page.locator('[data-cell="A2"]')).toHaveText('10');
  await expect(page.locator('[data-cell="A4"]')).toHaveText('30');

  // 4. Undo restores the pre-insert layout
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-cell="A1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');

  // 5. Export CSV triggers a download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-csv').click(),
  ]);
  expect(download.suggestedFilename()).toBe('ai-office.csv');
});

test('status bar shows sum/avg/count for a selection', async ({ page }) => {
  await editCell(page, 'A1', '10');
  await editCell(page, 'A2', '20');
  await editCell(page, 'A3', '30');
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });
  const status = page.getByTestId('status-bar');
  await expect(status).toContainText('Count: 3');
  await expect(status).toContainText('Sum: 60');
  await expect(status).toContainText('Avg: 20');
});

test('macro fills cells via the sheet API', async ({ page }) => {
  await page.getByTestId('open-macro').click();
  await page.getByTestId('macro-code').fill('for (let i=1;i<=3;i++){ sheet.set("A"+i, i*i); }');
  await page.getByTestId('macro-run').click();
  await page.locator('.modal header button').click();
  await expect(page.locator('[data-cell="A3"]')).toHaveText('9');
});

test('help panel lists only implemented shortcuts', async ({ page }) => {
  await page.getByTestId('open-help').click();
  const help = page.getByTestId('help-grid');
  await expect(help).toContainText('Ctrl+B');
  await expect(help).toContainText('AutoSum');
});
