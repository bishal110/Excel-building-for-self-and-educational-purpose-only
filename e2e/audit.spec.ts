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
  const tab = (t: string) => page.getByTestId(`ribbon-tab-${t}`).click();

  // HOME tab controls
  await tab('home');
  const homeClicks: Array<[string, () => Promise<unknown>]> = [
    ['Bold', () => tb.getByTitle('Bold (Ctrl+B)').click()],
    ['Italic', () => tb.getByTitle('Italic (Ctrl+I)').click()],
    ['Underline', () => tb.getByTitle('Underline (Ctrl+U)').click()],
    ['Cut', () => tb.getByTitle('Cut (Ctrl+X)').click()],
    ['Copy', () => tb.getByTitle('Copy (Ctrl+C)').click()],
    ['Paste', () => tb.getByTitle('Paste (Ctrl+V)').click()],
    ['Align left', () => tb.getByTitle('Align left').click()],
    ['Align center', () => tb.getByTitle('Align center').click()],
    ['Align right', () => tb.getByTitle('Align right').click()],
    ['Format inr', () => page.getByTestId('format-select').selectOption('inr')],
    ['Format percent', () => page.getByTestId('format-select').selectOption('percent')],
    ['Format general', () => page.getByTestId('format-select').selectOption('general')],
    ['AutoSum', () => tb.getByTitle('AutoSum (Alt+=)').click()],
    ['Clear', () => tb.getByText('Clear').click()],
    ['Insert row', () => page.getByTestId('insert-row').click()],
    ['Undo', () => tb.getByTitle('Undo (Ctrl+Z)').click()],
    ['Redo', () => tb.getByTitle('Redo (Ctrl+Y)').click()],
  ];
  for (const [name, fn] of homeClicks) {
    await fn();
    await page.waitForTimeout(20);
    expect(errors, `error after "${name}": ${errors.join(' | ')}`).toEqual([]);
  }

  // DATA tab controls
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });
  await tab('data');
  for (const [name, fn] of [
    ['Sort A-Z', () => tb.getByTitle('Sort ascending').click()],
    ['Sort Z-A', () => tb.getByTitle('Sort descending').click()],
    ['Find & Replace', async () => {
      await page.getByTestId('open-find-replace').click();
      await page.getByTestId('fr-find').fill('alpha');
      await page.getByTestId('fr-replace').fill('beta');
      await page.getByTestId('fr-run').click();
      await expect(page.getByTestId('toast-host')).toContainText('Replaced in');
    }],
  ] as Array<[string, () => Promise<unknown>]>) {
    await fn();
    await page.waitForTimeout(20);
    expect(errors, `error after "${name}": ${errors.join(' | ')}`).toEqual([]);
  }

  // VIEW tab
  await tab('view');
  await tb.getByText('Freeze').click();
  await page.waitForTimeout(20);
  expect(errors, `freeze: ${errors.join(' | ')}`).toEqual([]);

  // Modals from their tabs.
  await page.getByTestId('open-macro').click(); // View tab
  await page.getByTestId('macro-run').click();
  await page.locator('.modal header button').click();
  expect(errors, `macro: ${errors.join(' | ')}`).toEqual([]);

  // Re-seed fresh numbers: earlier cut/clear/sort steps mangled A1:A3.
  await type('A1', '30');
  await type('A2', '10');
  await type('A3', '20');
  await page.locator('[data-cell="A1"]').click();
  await page.locator('[data-cell="A3"]').click({ modifiers: ['Shift'] });
  await tab('insert');
  await page.getByTestId('open-chart').click();
  await expect(page.getByTestId('chart-svg')).toBeVisible();
  await page.locator('.modal header button').click();

  await tab('view');
  await page.getByTestId('open-help').click();
  await page.locator('.modal header button').click();
  expect(errors, `modals: ${errors.join(' | ')}`).toEqual([]);

  // Sheet tabs: add, switch, rename (in-app dialog), delete (in-app confirm).
  await page.locator('.sheet-add').click();
  await page.locator('.sheet-tab').first().click();
  await page.locator('.sheet-tab').first().dblclick(); // opens rename dialog
  await page.getByTestId('input-dialog-field').fill('Renamed');
  await page.getByTestId('input-dialog-ok').click();
  await expect(page.locator('.sheet-tab').first()).toContainText('Renamed');
  await page.locator('.sheet-tab').last().locator('.sheet-close').click();
  await page.getByTestId('confirm-ok').click();
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
    ['Insert image', async () => {
      await rb.getByTitle('Insert image').click();
      await page.getByTestId('input-dialog-field').fill('https://example.com/img.png');
      await page.getByTestId('input-dialog-ok').click();
    }],
    ['Insert link', async () => {
      await editor.click();
      await rb.getByTitle('Insert link').click();
      await page.getByTestId('input-dialog-field').fill('https://example.com');
      await page.getByTestId('input-dialog-ok').click();
    }],
    ['Print', () => rb.getByText('Print / PDF').click()],
    ['Export docx', () => page.getByTestId('export-select').selectOption('docx')],
    ['Export md', () => page.getByTestId('export-select').selectOption('md')],
    ['Export html', () => page.getByTestId('export-select').selectOption('html')],
    ['Export txt', () => page.getByTestId('export-select').selectOption('txt')],
  ];

  for (const [name, fn] of clicks) {
    await fn();
    await page.waitForTimeout(30);
    expect(errors, `error after "${name}": ${errors.join(' | ')}`).toEqual([]);
  }

  // Word count reflects content.
  await expect(page.getByTestId('word-count')).toContainText('Words:');
});

test('AUDIT: every Slides control runs without a runtime error', async ({ page }) => {
  const errors = trackErrors(page);
  await page.getByTestId('nav-slides').click();
  await expect(page.getByTestId('slide-canvas')).toBeVisible();

  const clicks: Array<[string, () => Promise<unknown>]> = [
    ['Edit title', () => page.getByTestId('field-title').fill('Audit slide')],
    ['Edit body', () => page.getByTestId('field-body').fill('line 1\nline 2')],
    ['Edit notes', () => page.getByTestId('field-notes').fill('presenter notes')],
    ['Add slide', () => page.getByTestId('add-slide').click()],
    ['Duplicate', () => page.getByText('Duplicate').click()],
    ['Layout title', () => page.getByTestId('layout-select').selectOption('title')],
    ['Layout image', () => page.getByTestId('layout-select').selectOption('image')],
    ['Image URL', () => page.getByTestId('field-image').fill('https://example.com/x.png')],
    ['Layout titleBody', () => page.getByTestId('layout-select').selectOption('titleBody')],
    ['Theme dark', () => page.getByTestId('theme-select').selectOption('dark')],
    ['Theme ocean', () => page.getByTestId('theme-select').selectOption('ocean')],
    ['Theme sand', () => page.getByTestId('theme-select').selectOption('sand')],
    ['Theme light', () => page.getByTestId('theme-select').selectOption('light')],
    ['Reorder', () => page.getByTestId('thumb-1').dragTo(page.getByTestId('thumb-0'))],
    ['Export PDF', () => page.getByText('Export PDF').click()],
    ['Delete', () => page.getByTestId('delete-slide').click()],
  ];

  for (const [name, fn] of clicks) {
    await fn();
    await page.waitForTimeout(30);
    expect(errors, `error after "${name}": ${errors.join(' | ')}`).toEqual([]);
  }

  // Present mode: enter, navigate, exit.
  await page.getByTestId('present').click();
  await expect(page.getByTestId('present-mode')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('present-mode')).toBeHidden();
  expect(errors, `present: ${errors.join(' | ')}`).toEqual([]);
});
