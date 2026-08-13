import { screen } from '@testing-library/react';

import { AppRoutes } from '@app/router/AppRoutes';
import { renderWithApp } from '../../test/renderWithApp';

describe('AppRoutes', () => {
  it('renders the upload entry state', () => {
    renderWithApp(<AppRoutes />);

    expect(
      screen.getByRole('heading', { name: 'Проверьте CSV до импорта' }),
    ).toBeInTheDocument();
  });

  it.each(['/setup', '/workspace', '/report'])(
    'redirects an unavailable workflow route %s to upload',
    (route) => {
      renderWithApp(<AppRoutes />, { route });

      expect(
        screen.getByRole('heading', { name: 'Проверьте CSV до импорта' }),
      ).toBeInTheDocument();
    },
  );

  it('renders the setup route when a session exists', () => {
    renderWithApp(<AppRoutes />, {
      route: '/setup',
      workflow: {
        sessionId: 'local-session',
        parsedDataset: null,
        ruleSetupColumns: [],
        configuredColumns: [],
        validationRules: [],
        datasetReady: false,
        reportReady: false,
        step: 'rules',
        uploadSummary: {
          file: {
            lastModified: 0,
            name: 'contacts.csv',
            size: 128,
          },
          provisionalRowCount: 3,
        },
      },
    });

    expect(
      screen.getByRole('heading', { name: 'Разбираем структуру CSV' }),
    ).toBeInTheDocument();
  });
});
