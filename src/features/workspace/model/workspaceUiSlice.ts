import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import {
  completeRuleSetup,
  startUploadSession,
} from '@app/store/workflowSlice';
import type { IssueFilters } from '@features/workspace/model/workspaceModel';
import { defaultIssueFilters } from '@features/workspace/model/workspaceModel';

export interface WorkspaceUiState {
  filters: IssueFilters;
  inspectorOpen: boolean;
  leftPanelOpen: boolean;
  selectedIssueId: string | null;
}

const initialState: WorkspaceUiState = {
  filters: defaultIssueFilters,
  inspectorOpen: false,
  leftPanelOpen: false,
  selectedIssueId: null,
};

const workspaceUiSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(startUploadSession, () => initialState)
      .addCase(completeRuleSetup, () => initialState);
  },
  initialState,
  name: 'workspaceUi',
  reducers: {
    closeInspector: (state) => {
      state.inspectorOpen = false;
    },
    closeIssuePanel: (state) => {
      state.leftPanelOpen = false;
    },
    openInspector: (state) => {
      state.inspectorOpen = true;
      state.leftPanelOpen = false;
    },
    openIssuePanel: (state) => {
      state.leftPanelOpen = true;
      state.inspectorOpen = false;
    },
    replaceWorkspaceUi: (_state, action: PayloadAction<WorkspaceUiState>) =>
      action.payload,
    workspaceLocationChanged: (
      state,
      action: PayloadAction<{
        filters: IssueFilters;
        selectedIssueId: string | null;
      }>,
    ) => {
      state.filters = action.payload.filters;
      state.selectedIssueId = action.payload.selectedIssueId;
    },
  },
});

export const {
  closeInspector,
  closeIssuePanel,
  openInspector,
  openIssuePanel,
  replaceWorkspaceUi,
  workspaceLocationChanged,
} = workspaceUiSlice.actions;
export const workspaceUiReducer = workspaceUiSlice.reducer;
