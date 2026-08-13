import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import { AppRouter } from '@app/router/AppRouter';
import { AppErrorBoundary } from '@app/errors/AppErrorBoundary';
import { store } from '@app/store/store';
import { SessionPersistence } from '@features/session-recovery/ui/SessionPersistence';
import { initializeTheme } from '@shared/lib/theme';
import { LanguageProvider } from '@shared/lib/locale';
import '@shared/styles/global.css';

initializeTheme();

const rootElement = document.querySelector<HTMLDivElement>('#root');

if (!rootElement) {
  throw new Error('TableLint root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <LanguageProvider>
      <AppErrorBoundary>
        <Provider store={store}>
          <SessionPersistence />
          <AppRouter />
        </Provider>
      </AppErrorBoundary>
    </LanguageProvider>
  </StrictMode>,
);
