import { expect, test } from '@playwright/test';
import Papa from 'papaparse';

async function readDownload(download: import('@playwright/test').Download) {
  const filePath = await download.path();
  if (!filePath) throw new Error('Downloaded file is unavailable.');
  return (await import('node:fs/promises')).readFile(filePath, 'utf8');
}

test('opens sample CSV through the local upload flow', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Проверьте CSV до импорта' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Этапы проверки CSV' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Использовать пример' }).click();

  await expect(page).toHaveURL(/#\/setup$/u);
  await expect(
    page.getByRole('heading', { name: 'Подтвердите схему' }),
  ).toBeVisible();
  await expect(page.getByText('tablelint-sample.csv')).toBeVisible();
  await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'email' })).toBeVisible();
  await expect(page.getByText('Email · 75% confidence')).toBeVisible();

  const externalRequests = requests.filter(
    (url) => !url.startsWith('http://127.0.0.1:4173/'),
  );
  expect(externalRequests).toEqual([]);
});

test('scans the sample locally and shows the deterministic quality summary', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('/');
  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await expect(
    page.getByRole('heading', { name: 'Подтвердите схему' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();

  await expect(page).toHaveURL(/#\/workspace$/u);
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '2 проблем найдено' }),
  ).toBeVisible();
  await expect(page.getByText('87', { exact: true })).toBeVisible();
  await expect(page.getByText(/15 непустых ячеек/u)).toBeVisible();
  const grid = page.getByRole('grid', { name: 'Данные CSV' });
  await expect(grid).toHaveAttribute('aria-rowcount', '5');
  await expect(
    page.getByRole('gridcell', {
      name: /email, строка 2: boris\.example\.com, 1 проблема, ошибка/u,
    }),
  ).toHaveAttribute('data-severity', 'error');

  const firstCell = page.getByRole('gridcell', {
    name: 'name, строка 1: Анна',
  });
  await firstCell.focus();
  await firstCell.press('ArrowRight');
  await expect(
    page.getByRole('gridcell', {
      name: 'email, строка 1: anna@example.com',
    }),
  ).toBeFocused();

  await grid.hover();
  const pageScrollBeforeWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -500);
  await expect
    .poll(async () => page.evaluate(() => window.scrollY))
    .toBeLessThan(pageScrollBeforeWheel);

  const externalRequests = requests.filter(
    (url) => !url.startsWith('http://127.0.0.1:4173/'),
  );
  expect(externalRequests).toEqual([]);
});

test('virtualizes a large CSV and keeps row identity after scrolling', async ({
  page,
}) => {
  const rowCount = 2_000;
  const lines = ['id,email'];
  for (let index = 1; index <= rowCount; index += 1) {
    lines.push(`${index},person-${index}@example.com`);
  }

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(lines.join('\n')),
    mimeType: 'text/csv',
    name: 'large-contacts.csv',
  });
  await expect(
    page.getByRole('heading', { name: 'Подтвердите схему' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'CSV готов к работе' }),
  ).toBeVisible();

  const grid = page.getByRole('grid', { name: 'Данные CSV' });
  await expect(grid).toHaveAttribute('aria-rowcount', `${rowCount + 1}`);
  await expect(
    page.getByRole('region', { name: 'Строки CSV' }).getByRole('status'),
  ).toContainText('Проблем не найдено');

  const initialRenderedRows = await grid.locator('[data-row-index]').count();
  expect(initialRenderedRows).toBeGreaterThan(0);
  expect(initialRenderedRows).toBeLessThan(50);

  await grid.press('End');
  await expect(grid.locator('[data-row-index="1999"]')).toBeVisible();
  await expect(
    page.getByRole('gridcell', {
      name: 'email, строка 2000: person-2000@example.com',
    }),
  ).toBeVisible();

  const finalRenderedRows = await grid.locator('[data-row-index]').count();
  expect(finalRenderedRows).toBeLessThan(50);
  await expect(page.getByRole('columnheader', { name: 'email' })).toBeVisible();
});

test('filters issues and navigates to the matching source cell', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: /Проблемы/u }).click();

  const issueList = page.getByRole('list', {
    name: 'Проблемы по текущим фильтрам',
  });
  await expect(issueList.getByRole('button')).toHaveCount(2);
  await issueList.getByRole('button').nth(1).click();
  await expect(page).toHaveURL(/issue=.*date.*row-2/u);
  await expect(
    page.getByRole('gridcell', {
      name: /joined_at, строка 2: 12\/02\/2025, 1 проблема, ошибка/u,
    }),
  ).toBeFocused();

  await page.getByRole('tab', { name: /Проблемы/u }).click();
  await page.getByRole('button', { name: 'С проблемами' }).click();
  await expect(page).toHaveURL(/rows=issues/u);
  await page.getByRole('tab', { name: /Данные/u }).click();
  await expect(page.getByRole('grid', { name: 'Данные CSV' })).toHaveAttribute(
    'aria-rowcount',
    '2',
  );

  await page.getByRole('tab', { name: /Проблемы/u }).click();
  await page.getByRole('button', { name: 'Без проблем' }).click();
  await expect(page.getByText('Нет совпадений')).toBeVisible();
  await page.getByRole('tab', { name: /Данные/u }).click();
  await expect(page.getByRole('grid', { name: 'Данные CSV' })).toHaveAttribute(
    'aria-rowcount',
    '4',
  );
});

test('manually edits a cell and restores issues and score through undo and redo', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(
      'name,email\nTest,bad\nAnna,anna@example.com\nBoris,boris@example.com\nVera,vera@example.com',
    ),
    mimeType: 'text/csv',
    name: 'manual-edit.csv',
  });
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: '1 проблем найдено' }),
  ).toBeVisible();

  const badCell = page.getByRole('gridcell', {
    name: /email, строка 1: bad, 1 проблема, ошибка/u,
  });
  await badCell.press('Enter');
  const inlineEditor = page.getByRole('textbox', {
    name: 'Редактировать email, строка 1',
  });
  await inlineEditor.fill('fixed@example.com');
  await inlineEditor.press('Enter');

  await expect(
    page.getByRole('heading', { name: 'Проблем не найдено' }),
  ).toBeVisible();
  await expect(
    page.getByRole('gridcell', {
      name: 'email, строка 1: fixed@example.com',
    }),
  ).toHaveAttribute('data-patched', 'true');
  await expect(page.getByText('100', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(
    page.getByRole('gridcell', {
      name: /email, строка 1: bad, 1 проблема, ошибка/u,
    }),
  ).toBeVisible();
  await expect(page.getByText('88', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(
    page.getByRole('gridcell', {
      name: 'email, строка 1: fixed@example.com',
    }),
  ).toBeVisible();
});

test('edits the selected cell through the formula bar', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(
      'name,email\nTest,bad\nAnna,anna@example.com\nBoris,boris@example.com\nVera,vera@example.com',
    ),
    mimeType: 'text/csv',
    name: 'formula-edit.csv',
  });
  await page.getByRole('button', { name: 'Запустить проверку' }).click();

  const badCell = page.getByRole('gridcell', {
    name: /email, строка 1: bad, 1 проблема, ошибка/u,
  });
  await badCell.click();
  const formula = page.getByRole('textbox', {
    name: 'Значение выбранной ячейки',
  });
  await formula.fill('fixed@example.com');
  await formula.press('Enter');

  await expect(
    page.getByRole('gridcell', {
      name: 'email, строка 1: fixed@example.com',
    }),
  ).toHaveAttribute('data-patched', 'true');
  await expect(
    page.getByRole('heading', { name: 'Проблем не найдено' }),
  ).toBeVisible();
});

test('previews safe fixes, cancels without changes and applies selected patches', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(
      'name,email\n Anna ,anna@example.com\n Anna ,anna@example.com',
    ),
    mimeType: 'text/csv',
    name: 'safe-fixes.csv',
  });
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'CSV готов к работе' }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Preview fixes · 3/u }).click();
  const preview = page.getByRole('dialog', {
    name: 'Preview безопасных исправлений',
  });
  await expect(preview.getByRole('checkbox')).toHaveCount(3);
  await expect(preview.getByRole('checkbox').nth(2)).not.toBeChecked();
  await preview.getByRole('button', { name: 'Отменить preview' }).click();
  await expect(
    page.getByRole('gridcell', { name: 'name, строка 1:  Anna ' }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Preview fixes · 3/u }).click();
  await page
    .getByRole('dialog', { name: 'Preview безопасных исправлений' })
    .getByRole('button', { name: 'Применить выбранные' })
    .click();
  await expect(
    page.getByRole('gridcell', { name: 'name, строка 1: Anna' }),
  ).toHaveAttribute('data-patched', 'true');
  await expect(page.getByRole('grid')).toHaveAttribute('aria-rowcount', '3');
});

test('edits rules, blocks invalid scan and keeps the draft across navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await expect(
    page.getByRole('heading', { name: 'Подтвердите схему' }),
  ).toBeVisible();

  await page.getByRole('button', { name: /status/u }).click();
  await page.getByText('Разрешённые значения', { exact: true }).click();
  await page.getByLabel('По одному значению на строку').fill('active\npending');
  await page.getByText('Минимальная длина', { exact: true }).click();
  await page.getByLabel('Символов').first().fill('8');
  await page.getByText('Максимальная длина', { exact: true }).click();
  await page.getByLabel('Символов').last().fill('3');

  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Максимальная длина должна быть не меньше минимальной.',
  );

  await page.getByLabel('Символов').last().fill('12');
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(page).toHaveURL(/#\/workspace$/u);
  await page.goBack();
  await expect(page).toHaveURL(/#\/setup$/u);
  await page.getByRole('button', { name: /status/u }).click();
  await expect(page.getByLabel('По одному значению на строку')).toHaveValue(
    'active\npending',
  );
});

test('reload cannot leave a partial in-memory setup session', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await expect(page).toHaveURL(/#\/setup$/u);

  await page.reload();

  await expect(page).toHaveURL(/#\/$/u);
  await expect(
    page.getByRole('heading', { name: 'Проверьте CSV до импорта' }),
  ).toBeVisible();
});

test('shows recoverable worker parsing errors', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from('name,name\nAnna,A'),
    mimeType: 'text/csv',
    name: 'duplicate-headers.csv',
  });

  await expect(page).toHaveURL(/#\/setup$/u);
  await expect(page.getByRole('alert')).toContainText(
    'Заголовки должны быть непустыми и уникальными',
  );
  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
  await page.getByRole('button', { name: 'Другой файл' }).click();
  await expect(page).toHaveURL(/#\/$/u);
});

test('shows an unsupported file error and recovers', async ({ page }) => {
  await page.goto('/');

  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from('not,a,csv'),
    mimeType: 'text/plain',
    name: 'contacts.txt',
  });

  await expect(page.getByRole('alert')).toContainText(
    'Выберите файл с расширением .csv.',
  );
  await page.getByRole('button', { name: 'Выбрать другой' }).click();
  await expect(
    page.getByRole('button', { name: 'Выбрать CSV', exact: true }),
  ).toBeFocused();
});

test('restores a completed local session after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();
  await page.waitForTimeout(600);

  await page.reload();
  await expect(page).toHaveURL(/#\/$/u);
  const recovery = page.getByRole('dialog', {
    name: 'Восстановить последнюю сессию?',
  });
  await expect(recovery).toContainText('tablelint-sample.csv');
  await recovery.getByRole('button', { name: 'Восстановить' }).click();

  await expect(page).toHaveURL(/#\/workspace$/u);
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();
  await expect(page.getByText('87', { exact: true })).toBeVisible();
});

test('exports a round-trippable CSV and a structured JSON report', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from('name,note\nAnna,=2+2\n"Bob, Jr.","hello,world"'),
    mimeType: 'text/csv',
    name: 'formula-values.csv',
  });
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'CSV готов к работе' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Перейти к экспорту' }).click();
  await expect(
    page.getByRole('heading', { name: 'Файлы готовы к передаче' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Скачать cleaned CSV' }),
  ).toBeEnabled();

  const csvDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать cleaned CSV' }).click();
  const csvDownload = await csvDownloadPromise;
  expect(csvDownload.suggestedFilename()).toBe('formula-values-cleaned.csv');
  const csv = await readDownload(csvDownload);
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(Papa.parse<string[]>(csv).data).toEqual([
    ['name', 'note'],
    ['Anna', "'=2+2"],
    ['Bob, Jr.', 'hello,world'],
  ]);

  const reportDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать JSON-отчёт' }).click();
  const report = JSON.parse(
    await readDownload(await reportDownloadPromise),
  ) as {
    counts: { remainingIssues: number; rowsExported: number };
    transformations: Array<{ type: string }>;
    version: number;
  };
  expect(report.version).toBe(1);
  expect(report.counts).toMatchObject({ remainingIssues: 0, rowsExported: 2 });
  expect(report.transformations).toContainEqual(
    expect.objectContaining({ type: 'csvInjectionProtection' }),
  );
});

test('clears an unsupported persisted schema without offering recovery', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('rowcheck-local-session', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('session');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB open failed'));
    });
    const transaction = database.transaction('session', 'readwrite');
    transaction.objectStore('session').put({ version: 0 }, 'latest');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB write failed'));
    });
    database.close();
  });

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Проверьте CSV до импорта' }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Восстановить последнюю сессию?' }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('rowcheck-local-session', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(request.error ?? new Error('IndexedDB open failed'));
        });
        const value = await new Promise<unknown>((resolve, reject) => {
          const request = database
            .transaction('session')
            .objectStore('session')
            .get('latest');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(request.error ?? new Error('IndexedDB read failed'));
        });
        database.close();
        return value === undefined;
      }),
    )
    .toBe(true);
});
