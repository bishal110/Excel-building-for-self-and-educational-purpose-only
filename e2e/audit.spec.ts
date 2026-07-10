import { expect, test, type Page } from '@playwright/test';

/**
 * Safety audit: click through EVERY toolbar/ribbon control and modal in both
 * Sheets and Docs, and fail if any of them throws an uncaught runtime error.
 * This guards against features that render but crash when used.
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      // Ignore benign network/devtools noise; keep real JS errors.
      if (/TypeError|ReferenceError|is not a function|Cannot read/.test(t)) {
        errors.push(`console: ${t}`);
      }
    }
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    // Stub print + file dialogs so the audit never blocks.
    window.print = () => {};
  });
  // Auto-answer prompt/confirm/alert; cancel file pickers.
  page.on('dialog', (d) => d.accept('https://example.com/img.png').catch(() => {}));
  page.on('filechooser', (fc) => fc.setFiles([]).catch(() => {}));
  await page.goto('/');
});

test('AUDIT: every Sheets control runs without a runtime error', async ({ page }) => {
  const errors = trackErrors(page);
  await expect(page.getByTestId('grid')).toBeVisible();

  // Seed data so features act on something.
  const type = async (cell: string, v: string) => {
    await page.locator(`[data-cell="${cell}"]`).dblclick();
    const ed = page.getByTestId('cell-editor');
    await ed.fill(v);
    await ed.press('Enter');
  };
  await type('A1', '30');
  await type('A2', '10');
  await type('A3', '20');
  await type('B1', 'alpha');

  // Select A1:A3 for range-based features.
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });

  const tb = page.getByTestId('toolbar');
  const clicks: Array<[string, () => Promise<unknown>]> = [
    ['Bold', () => tb.getByTitle('Bold (Ctrl+B)').click()],
    ['Italic', () => tb.getByTitle('Italic (Ctrl+I)').click()],
    ['Underline', () => tb.getByTitle('Underline (Ctrl+U)').click()],
    ['Align left', () => tb.getByTitle('Align left').click()],
    ['Align center', () => tb.getByTitle('Align center').click()],
    ['Align right', () => tb.getByTitle('Align right').click()],
    ['Format inr', () => page.getByTestId('format-select').selectOption('inr')],
    ['Format percent', () => page.getByTestId('format-select').selectOption('percent')],
    ['Format general', () => page.getByTestId('format-select').selectOption('general')],
    ['AutoSum', () => tb.getByTitle('AutoSum (Alt+=)').click()],
    ['Sort A-Z', () => tb.getByTitle('Sort ascending').click()],
    ['Sort Z-A', () => tb.getByTitle('Sort descending').click()],
    ['Insert row', () => page.getByTestId('insert-row').click()],
    ['Delete row', () => tb.getByText('Delete row').click()],
    ['Insert col', () => tb.getByText('Insert col').click()],
    ['Delete col', () => tb.getByText('Delete col').click()],
    ['Freeze', () => tb.getByText('Freeze', { exact: true }).click()],
    ['Undo', () => tb.getByTitle('Undo (Ctrl+Z)').click()],
    ['Redo', () => tb.getByTitle('Redo (Ctrl+Y)').click()],
    ['Find & Replace', () => tb.getByText('Find & Replace').click()],
    ['Export CSV', () => page.getByTestId('export-csv').click()],
    ['Export xlsx', () => tb.getByText('Export xlsx').click()],
    ['Save', () => tb.getByText('Save', { exact: true }).click()],
  ];

  for (const [name, fn] of clicks) {
    await fn();
    await page.waitForTimeout(30);
    expect(errors, `error after "${name}": ${errors.join(' | ')}`).toEqual([]);
  }

  // Modals: open + close each.
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });
  await page.getByTestId('open-macro').click();
  await page.getByTestId('macro-run').click();
  await page.locator('.modal header button').click();
  expect(errors, `macro: ${errors.join(' | ')}`).toEqual([]);

  await page.getByText('Chart', { exact: true }).click();
  await expect(page.getByTestId('chart-svg')).toBeVisible();
  await page.locator('.modal header button').click();

  await page.getByTestId('open-help').click();
  await page.locator('.modal header button').click();
  expect(errors, `modals: ${errors.join(' | ')}`).toEqual([]);

  // Sheet tabs: add, switch, rename (dialog), delete (confirm).
  await page.locator('.sheet-add').click();
  await page.locator('.sheet-tab').first().click();
  await page.locator('.sheet-tab').first().dblclick(); // rename via dialog
  await page.waitForTimeout(30);
  expect(errors, `sheet tabs: ${errors.join(' | ')}`).toEqual([]);
});

test('AUDIT: every Docs control runs without a runtime error', async ({ page }) => {
  const errors = trackErrors(page);
  await page.getByTestId('nav-docs').click();
  await expect(page.getByTestId('doc-page')).toBeVisible();

  const editor = page.locator('.doc-page .ProseMirror');
  await editor.click();
  await page.keyboard.type('Audit content for the document editor.');
  await page.keyboard.press('Control+a');

  const rb = page.getByTestId('doc-ribbon');
  const clicks: Array<[string, () => Promise<unknown>]> = [
    ['Style H1', () => page.getByTestId('style-select').selectOption('h1')],
    ['Style Normal', () => page.getByTestId('style-select').selectOption('p')],
    ['Font', () => rb.getByTitle('Font').selectOption('Georgia')],
    ['Bold', () => page.getByTestId('doc-bold').click()],
    ['Italic', () => rb.getByTitle('Italic (Ctrl+I)').click()],
    ['Underline', () => rb.getByTitle('Underline (Ctrl+U)').click()],
    ['Bullet list', () => rb.getByTitle('Bullet list').click()],
    ['Numbered list', () => rb.getByTitle('Numbered list').click()],
    ['Align center', () => rb.getByTitle('Align center').click()],
    ['Align right', () => rb.getByTitle('Align right').click()],
    ['Align left', () => rb.getByTitle('Align left').click()],
    ['Insert table', () => page.getByTestId('insert-table').click()],
    ['Insert image', () => rb.getByTitle('Insert image').click()],
    ['Insert link', () => { return editor.click().then(() => rb.getByTitle('Insert link').click()); }],
    ['Print', () => rb.getByText('Print / PDF').click()],
    ['Export docx', () => page.getByTestId('export-docx').click()],
  ];

  for (const [name, fn] of clicks) {
    await fn();
    await page.waitForTimeout(30);
    expect(errors, `error after "${name}": ${errors.join(' | ')}`).toEqual([]);
  }

  // Word count reflects content.
  await expect(page.getByTestId('word-count')).toContainText('Words:');
});
