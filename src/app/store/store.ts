import { configureStore } from '@reduxjs/toolkit';

import { workflowReducer } from '@app/store/workflowSlice';
import { issuesReducer } from '@features/validation/model/issuesSlice';
import { changesReducer } from '@features/fixes/model/changesSlice';
import { workspaceUiReducer } from '@features/workspace/model/workspaceUiSlice';

export const store = configureStore({
  reducer: {
    changes: changesReducer,
    issues: issuesReducer,
    workspaceUi: workspaceUiReducer,
    workflow: workflowReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
