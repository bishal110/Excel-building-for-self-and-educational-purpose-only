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

  // New project clears the grid (confirm via the in-app dialog — native
  // browser confirms are gone).
  await page.getByTestId('file-menu').click();
  await page.getByTestId('file-new').click();
  await expect(page.getByTestId('confirm-dialog')).toBeVisible();
  await page.getByTestId('confirm-ok').click();
  await expect(page.locator('[data-cell="A1"]')).toHaveText('');
});

test('File menu is fully keyboard operable', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('file-menu').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('file-new')).toBeVisible();
  await page.keyboard.press('ArrowDown'); // -> New
  await expect(page.getByTestId('file-new')).toBeFocused();
  await page.keyboard.press('ArrowDown'); // -> Open
  await page.keyboard.press('ArrowDown'); // -> Save As
  await expect(page.getByTestId('file-saveas')).toBeFocused();
  await page.keyboard.press('ArrowRight'); // open submenu
  await expect(page.getByTestId('save-project')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); // close submenu, back to Save As
  await expect(page.getByTestId('file-saveas')).toBeFocused();
  await page.keyboard.press('Escape'); // close menu, focus returns to trigger
  await expect(page.getByTestId('file-new')).toBeHidden();
  await expect(page.getByTestId('file-menu')).toBeFocused();
});

test('Save As .xlsx exports EVERY sheet, not just the active one', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-cell="A1"]').dblclick();
  await page.getByTestId('cell-editor').fill('first-sheet');
  await page.getByTestId('cell-editor').press('Enter');
  await page.locator('.sheet-add').click(); // adds + activates Sheet2
  await page.locator('[data-cell="A1"]').dblclick();
  await page.getByTestId('cell-editor').fill('second-sheet');
  await page.getByTestId('cell-editor').press('Enter');

  await page.getByTestId('file-menu').click();
  await page.getByTestId('file-saveas').hover();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('save-xlsx').click(),
  ]);
  expect(download.suggestedFilename()).toBe('workbook.xlsx');
  // Parse the actual bytes: both sheets must be present with their data.
  const path = await download.path();
  const XLSX = await import('xlsx');
  const fs = await import('node:fs');
  const wb = XLSX.read(fs.readFileSync(path!), { type: 'buffer' });
  expect(wb.SheetNames.length).toBe(2);
  const s1 = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]!]!).trim();
  const s2 = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[1]!]!).trim();
  expect(s1).toContain('first-sheet');
  expect(s2).toContain('second-sheet');
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
