import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import {
  initialWorkflowState,
  workflowReducer,
  type WorkflowState,
} from '@app/store/workflowSlice';
import { issuesReducer } from '@features/validation/model/issuesSlice';
import { changesReducer } from '@features/fixes/model/changesSlice';
import { workspaceUiReducer } from '@features/workspace/model/workspaceUiSlice';

interface RenderWithAppOptions {
  route?: string;
  workflow?: WorkflowState;
}

export function renderWithApp(
  element: ReactElement,
  { route = '/', workflow = initialWorkflowState }: RenderWithAppOptions = {},
) {
  const store = configureStore({
    reducer: {
      changes: changesReducer,
      issues: issuesReducer,
      workspaceUi: workspaceUiReducer,
      workflow: workflowReducer,
    },
    preloadedState: { workflow },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
    </Provider>,
  );
}
