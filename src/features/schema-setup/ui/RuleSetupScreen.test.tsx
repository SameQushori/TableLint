import { fireEvent, screen } from '@testing-library/react';

import { AppRoutes } from '@app/router/AppRoutes';
import type { WorkflowState } from '@app/store/workflowSlice';
import { createRuleSetupDrafts } from '@features/schema-setup/model/ruleConfiguration';
import { renderWithApp } from '../../../test/renderWithApp';

const columns = [
  { confidence: 1, header: 'name', id: 'column-1', type: 'string' as const },
  { confidence: 0.75, header: 'email', id: 'column-2', type: 'email' as const },
];

function workflow(): WorkflowState {
  return {
    configuredColumns: [],
    datasetReady: false,
    parsedDataset: {
      columns,
      delimiter: ',',
      headers: ['name', 'email'],
      previewRows: [['Анна', 'anna@example.com']],
      rowCount: 1,
      rows: [['Анна', 'anna@example.com']],
    },
    reportReady: false,
    ruleSetupColumns: createRuleSetupDrafts(columns),
    sessionId: 'session-1',
    step: 'rules',
    uploadSummary: {
      file: { lastModified: 0, name: 'contacts.csv', size: 100 },
      provisionalRowCount: 1,
    },
    validationRules: [],
  };
}

describe('RuleSetupScreen', () => {
  it('shows preview, inference and all v1 rule controls', () => {
    renderWithApp(<AppRoutes />, { route: '/setup', workflow: workflow() });

    expect(
      screen.getByRole('heading', { name: 'Подтвердите схему' }),
    ).toBeVisible();
    expect(screen.getByRole('table')).toHaveTextContent('anna@example.com');
    expect(screen.getByText('Текст · 100% confidence')).toBeVisible();
    for (const label of [
      'Обязательное значение',
      'Уникальное значение',
      'Формат email',
      'Формат числа',
      'Формат даты',
      'Разрешённые значения',
      'Минимальная длина',
      'Максимальная длина',
    ]) {
      expect(screen.getByText(label, { exact: true })).toBeVisible();
    }
  });

  it('blocks scan and explains an invalid configuration', () => {
    renderWithApp(<AppRoutes />, { route: '/setup', workflow: workflow() });

    fireEvent.click(screen.getByText('Формат даты', { exact: true }));
    fireEvent.click(screen.getByLabelText('YYYY-MM-DD'));
    fireEvent.click(screen.getByRole('button', { name: 'Запустить проверку' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Выберите хотя бы один формат даты.',
    );
    expect(
      screen.getByRole('heading', { name: 'Подтвердите схему' }),
    ).toBeVisible();
  });
});
