import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('ai-office:doc');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await page.getByTestId('nav-docs').click();
  await expect(page.getByTestId('doc-page')).toBeVisible();
});

test('type, format bold, insert table, export .docx', async ({ page }) => {
  const editor = page.locator('.doc-page .ProseMirror');

  // 1. Type into the document
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Field report for well A-1');
  await expect(editor).toContainText('Field report for well A-1');

  // 2. Word count updates
  await expect(page.getByTestId('word-count')).toContainText('Words: 5');

  // 3. Bold formatting toggles the active state
  await page.keyboard.press('Control+a');
  await page.getByTestId('doc-bold').click();
  await expect(page.getByTestId('doc-bold')).toHaveClass(/active/);
  await expect(editor.locator('strong')).toContainText('Field report');

  // 4. Insert a table
  await page.getByTestId('insert-table').click();
  await expect(editor.locator('table')).toBeVisible();

  // 5. Export to .docx triggers a download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-select').selectOption('docx'),
  ]);
  expect(download.suggestedFilename()).toBe('document.docx');
});

test('Word-style Save As: markdown, html, and txt downloads', async ({ page }) => {
  const editor = page.locator('.doc-page .ProseMirror');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Export me');

  for (const [format, filename] of [
    ['md', 'document.md'],
    ['html', 'document.html'],
    ['txt', 'document.txt'],
  ] as const) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-select').selectOption(format),
    ]);
    expect(download.suggestedFilename()).toBe(filename);
  }
});

test('switching modules keeps Sheets and Docs independent', async ({ page }) => {
  const editor = page.locator('.doc-page .ProseMirror');
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Doc content');

  await page.getByTestId('nav-sheets').click();
  await expect(page.getByTestId('grid')).toBeVisible();
  await page.getByTestId('nav-docs').click();
  await expect(editor).toContainText('Doc content');
});
