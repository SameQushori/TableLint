import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import type { WorkflowState } from '@app/store/workflowSlice';
import { ValidationSummaryScreen } from '@features/validation/ui/ValidationSummaryScreen';
import { CsvWorkerError } from '@shared/workers/csvWorkerClient';
import { renderWithApp } from '../../../test/renderWithApp';

const workflow: WorkflowState = {
  configuredColumns: [{ columnId: 'column-1', type: 'email' }],
  datasetReady: true,
  parsedDataset: {
    columns: [
      { confidence: 1, header: 'email', id: 'column-1', type: 'email' },
    ],
    delimiter: ',',
    headers: ['email'],
    previewRows: [['bad'], ['ok@example.com']],
    rowCount: 2,
    rows: [['bad'], ['ok@example.com']],
  },
  reportReady: false,
  ruleSetupColumns: [],
  sessionId: 'session-1',
  step: 'workspace',
  uploadSummary: {
    file: { lastModified: 0, name: 'contacts.csv', size: 20 },
    provisionalRowCount: 2,
  },
  validationRules: [
    { columnId: 'column-1', id: 'column-1:email', type: 'email' },
  ],
};

describe('ValidationSummaryScreen', () => {
  it('shows progress, real summary and the documented score explanation', async () => {
    let resolveValidation:
      | ((value: {
          issues: [];
          summary: {
            errorCount: number;
            issueCount: number;
            nonEmptyCellCount: number;
            score: number;
            warningCount: number;
          };
        }) => void)
      | undefined;
    const runValidation = vi.fn(
      () =>
        new Promise<{
          issues: [];
          summary: {
            errorCount: number;
            issueCount: number;
            nonEmptyCellCount: number;
            score: number;
            warningCount: number;
          };
        }>((resolve) => {
          resolveValidation = resolve;
        }),
    );

    renderWithApp(
      <Routes>
        <Route
          path="/workspace"
          element={<ValidationSummaryScreen runValidation={runValidation} />}
        />
      </Routes>,
      { route: '/workspace', workflow },
    );

    expect(screen.getByText('Worker выполняет проверку')).toBeVisible();
    resolveValidation?.({
      issues: [],
      summary: {
        errorCount: 0,
        issueCount: 0,
        nonEmptyCellCount: 2,
        score: 100,
        warningCount: 0,
      },
    });

    expect(
      await screen.findByRole('heading', { name: 'CSV готов к работе' }),
    ).toBeVisible();
    expect(screen.getByText('/ 100')).toBeVisible();
    expect(screen.getByText(/Error весит 1, warning — 0,35/u)).toBeVisible();
  });

  it('offers retry after a recoverable worker failure', async () => {
    const runValidation = vi
      .fn()
      .mockRejectedValueOnce(new CsvWorkerError('WORKER_ERROR', 'Сбой Worker'))
      .mockResolvedValueOnce({
        issues: [],
        summary: {
          errorCount: 0,
          issueCount: 0,
          nonEmptyCellCount: 2,
          score: 100,
          warningCount: 0,
        },
      });

    renderWithApp(
      <Routes>
        <Route
          path="/workspace"
          element={<ValidationSummaryScreen runValidation={runValidation} />}
        />
      </Routes>,
      { route: '/workspace', workflow },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Сбой Worker');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить проверку' }));
    await waitFor(() => expect(runValidation).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'CSV готов к работе' }),
    ).toBeVisible();
  });

  it('explains a recoverable browser memory limit without exposing data', async () => {
    const runValidation = vi
      .fn()
      .mockRejectedValue(
        new CsvWorkerError(
          'MEMORY_LIMIT',
          'Браузеру не хватило памяти для проверки CSV.',
        ),
      );

    renderWithApp(
      <Routes>
        <Route
          path="/workspace"
          element={<ValidationSummaryScreen runValidation={runValidation} />}
        />
      </Routes>,
      { route: '/workspace', workflow },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Закройте лишние вкладки или вернитесь к файлу меньшего размера.',
    );
    expect(screen.queryByText('bad', { exact: true })).not.toBeInTheDocument();
  });

  it('moves between workspace tabs with arrow, Home and End keys', async () => {
    const runValidation = vi.fn().mockResolvedValue({
      issues: [],
      summary: {
        errorCount: 0,
        issueCount: 0,
        nonEmptyCellCount: 2,
        score: 100,
        warningCount: 0,
      },
    });

    renderWithApp(
      <Routes>
        <Route
          path="/workspace"
          element={<ValidationSummaryScreen runValidation={runValidation} />}
        />
      </Routes>,
      { route: '/workspace', workflow },
    );

    const dataTab = await screen.findByRole('tab', { name: /Данные/u });
    const issuesTab = screen.getByRole('tab', { name: /Проблемы/u });
    const historyTab = screen.getByRole('tab', { name: /История/u });

    dataTab.focus();
    fireEvent.keyDown(dataTab, { key: 'ArrowRight' });
    await waitFor(() => expect(document.activeElement).toBe(issuesTab));
    expect(issuesTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(issuesTab, { key: 'End' });
    await waitFor(() => expect(document.activeElement).toBe(historyTab));
    expect(historyTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(historyTab, { key: 'Home' });
    await waitFor(() => expect(document.activeElement).toBe(dataTab));
    expect(dataTab).toHaveAttribute('aria-selected', 'true');
  });
});
