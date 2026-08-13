import { HashRouter } from 'react-router-dom';

import { AppRoutes } from '@app/router/AppRoutes';

export function AppRouter() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
