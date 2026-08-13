import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function openSampleWorkspace(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();
}

test('keyboard happy path reaches export without a mouse', async ({ page }) => {
  await page.goto('/');
  const picker = page.getByRole('button', { name: 'Выбрать CSV', exact: true });
  let pickerReached = false;
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    if (
      await picker.evaluate((element) => element === document.activeElement)
    ) {
      pickerReached = true;
      break;
    }
  }
  expect(pickerReached).toBe(true);

  await page.getByRole('button', { name: 'Использовать пример' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Подтвердите схему' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Запустить проверку' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();

  const firstCell = page.getByRole('gridcell', {
    name: 'name, строка 1: Анна',
  });
  await firstCell.focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('gridcell', {
      name: 'email, строка 1: anna@example.com',
    }),
  ).toBeFocused();
  await page.keyboard.press('PageDown');

  await page.getByRole('button', { name: 'Перейти к экспорту' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Файлы готовы к передаче' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Скачать cleaned CSV' }),
  ).toBeEnabled();
});

test('mobile drawers trap focus, close with Escape and restore focus', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await openSampleWorkspace(page);
  await page.getByRole('tab', { name: /Проблемы/u }).click();

  const trigger = page.getByRole('button', { name: 'Проблемы' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Группы проблем' });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole('button', { name: 'Закрыть группы проблем' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('workspace tabs support roving keyboard navigation', async ({ page }) => {
  await openSampleWorkspace(page);

  const dataTab = page.getByRole('tab', { name: /Данные/u });
  const issuesTab = page.getByRole('tab', { name: /Проблемы/u });
  const historyTab = page.getByRole('tab', { name: /История/u });

  await dataTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(issuesTab).toBeFocused();
  await expect(issuesTab).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('End');
  await expect(historyTab).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'История правок' }),
  ).toBeVisible();

  await page.keyboard.press('Home');
  await expect(dataTab).toBeFocused();
  await expect(page.getByRole('grid', { name: 'Данные CSV' })).toBeVisible();
});

test('dark theme persists and passes the workspace accessibility audit', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Использовать пример' }).click();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
});

test('axe reports no serious violations across the complete workflow', async ({
  page,
}) => {
  await page.goto('/');
  for (const routeName of ['upload'] as const) {
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
      routeName,
    ).toEqual([]);
  }

  await page.getByRole('button', { name: 'Использовать пример' }).click();
  let results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);

  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'Сканирование завершено' }),
  ).toBeVisible();
  results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);

  await page.getByRole('button', { name: 'Перейти к экспорту' }).click();
  await expect(
    page.getByRole('button', { name: 'Скачать cleaned CSV' }),
  ).toBeEnabled();
  results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
});

test('100k-row benchmark keeps the UI responsive and DOM bounded', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const rowCount = 100_000;
  const lines = ['id,email'];
  for (let index = 1; index <= rowCount; index += 1) {
    lines.push(`${index},person-${index}@example.com`);
  }
  const startedAt = Date.now();
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(lines.join('\n')),
    mimeType: 'text/csv',
    name: 'benchmark-100k.csv',
  });
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(
    page.getByRole('heading', { name: 'CSV готов к работе' }),
  ).toBeVisible({ timeout: 60_000 });
  const elapsedMs = Date.now() - startedAt;
  const grid = page.getByRole('grid', { name: 'Данные CSV' });
  expect(await grid.locator('[data-row-index]').count()).toBeLessThan(50);
  await grid.press('Control+End');
  await expect(grid.locator('[data-row-index="99999"]')).toBeVisible();
  expect(elapsedMs).toBeLessThan(60_000);
  test.info().annotations.push({
    description: `${elapsedMs} ms from local file selection to validated workspace`,
    type: 'benchmark-100k',
  });
});
