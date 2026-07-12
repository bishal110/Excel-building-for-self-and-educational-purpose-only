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

test('import a real CSV file populates the grid', async ({ page }) => {
  // Provide a real file to the OS file dialog when it opens.
  page.on('filechooser', (chooser) =>
    chooser.setFiles({
      name: 'wells.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Well,WHP\nA-1,3200\nA-2,3185\n'),
    }),
  );
  // Open via File → Open (Excel/CSV/project all recognized here).
  await page.getByTestId('file-menu').click();
  await page.getByTestId('file-open').click();

  await expect(page.locator('[data-cell="A1"]')).toHaveText('Well');
  await expect(page.locator('[data-cell="B1"]')).toHaveText('WHP');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('3200');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('A-2');
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
  await page.getByTestId('insert-row').click(); // Home tab, Cells group
  await expect(page.locator('[data-cell="A2"]')).toHaveText('10');
  await expect(page.locator('[data-cell="A4"]')).toHaveText('30');

  // 4. Undo restores the pre-insert layout
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-cell="A1"]')).toHaveText('10');
  await expect(page.locator('[data-cell="A3"]')).toHaveText('30');

  // 5. File → Save As → CSV triggers a download
  await page.getByTestId('file-menu').click();
  await page.getByTestId('file-saveas').hover();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('save-csv').click(),
  ]);
  expect(download.suggestedFilename()).toBe('sheet.csv');
});

test('PivotTable summarizes a selection into a new sheet', async ({ page }) => {
  // Header row + data
  const rows = [
    ['Well', 'Shift', 'Prod'],
    ['A-1', 'Day', '100'],
    ['A-1', 'Night', '120'],
    ['A-2', 'Day', '200'],
  ];
  for (let r = 0; r < rows.length; r++)
    for (let c = 0; c < 3; c++)
      await editCell(page, `${String.fromCharCode(65 + c)}${r + 1}`, rows[r]![c]!);

  // Select A1:C4
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="C4"]').click({ modifiers: ['Shift'] });

  // Insert tab → PivotTable
  await page.getByTestId('ribbon-tab-insert').click();
  page.on('dialog', (d) => d.accept());
  await page.getByTestId('open-pivot').click();
  await page.getByTestId('pivot-row').selectOption('0'); // Well
  await page.getByTestId('pivot-value').selectOption('2'); // Prod
  await page.getByTestId('pivot-agg').selectOption('sum');
  await page.getByTestId('pivot-build').click();

  // A new Pivot sheet is active; A-1 sums to 220
  await expect(page.locator('[data-cell="A1"]')).toHaveText('Well');
  await expect(page.locator('[data-cell="B2"]')).toHaveText('220');
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
  await page.getByTestId('ribbon-tab-view').click(); // Macros live on the View tab
  await page.getByTestId('open-macro').click();
  await page.getByTestId('macro-code').fill('for (let i=1;i<=3;i++){ sheet.set("A"+i, i*i); }');
  await page.getByTestId('macro-run').click();
  await page.locator('.modal header button').click();
  await expect(page.locator('[data-cell="A3"]')).toHaveText('9');
});

test('freeze keeps the header row visible while scrolling', async ({ page }) => {
  // Header row + enough data rows to scroll.
  await editCell(page, 'A1', 'Header');
  for (let r = 2; r <= 25; r++) await editCell(page, `A${r}`, String(r));

  const grid = page.getByTestId('grid');
  await grid.evaluate((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
  await page.locator('[data-cell="A2"]').click();
  await page.getByTestId('ribbon-tab-view').click(); // Freeze lives on the View tab
  await page.getByRole('button', { name: 'Freeze' }).click();

  // Scroll down; the frozen header cell A1 must remain visible near the top.
  await grid.evaluate((el) => {
    el.scrollTop = 300;
  });
  const a1 = page.locator('[data-cell="A1"]');
  await expect(a1).toBeVisible();
  await expect(a1).toHaveText('Header');
  // A1 must stay pinned within the top band of the grid (not scrolled away).
  const a1Box = await a1.boundingBox();
  const gridBox = await grid.boundingBox();
  expect(a1Box!.y - gridBox!.y).toBeLessThan(40);
});

test('help panel lists only implemented shortcuts', async ({ page }) => {
  await page.getByTestId('ribbon-tab-view').click(); // Help lives on the View tab
  await page.getByTestId('open-help').click();
  const help = page.getByTestId('help-grid');
  await expect(help).toContainText('Ctrl+B');
  await expect(help).toContainText('AutoSum');
});
