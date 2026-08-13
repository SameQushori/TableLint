import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type {
  ValidationIssue,
  ValidationSummary,
} from '@entities/issue/model/types';
import {
  completeRuleSetup,
  startUploadSession,
} from '@app/store/workflowSlice';

const issuesAdapter = createEntityAdapter<ValidationIssue>();

type ValidationStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled';

export const initialIssuesState = issuesAdapter.getInitialState<{
  errorMessage: string | null;
  initialSummary: ValidationSummary | null;
  progress: number;
  status: ValidationStatus;
  summary: ValidationSummary | null;
}>({
  errorMessage: null as string | null,
  initialSummary: null as ValidationSummary | null,
  progress: 0,
  status: 'idle',
  summary: null as ValidationSummary | null,
});

const issuesSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(startUploadSession, () => initialIssuesState)
      .addCase(completeRuleSetup, () => initialIssuesState);
  },
  initialState: initialIssuesState,
  name: 'issues',
  reducers: {
    validationCancelled: (state) => {
      state.status = 'cancelled';
      state.errorMessage = null;
    },
    validationFailed: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.errorMessage = action.payload;
    },
    validationProgressed: (state, action: PayloadAction<number>) => {
      state.progress = Math.min(100, Math.max(0, action.payload));
    },
    validationReset: () => initialIssuesState,
    validationStarted: (state) => {
      issuesAdapter.removeAll(state);
      state.errorMessage = null;
      state.progress = 0;
      state.status = 'running';
      state.summary = null;
      state.initialSummary = null;
    },
    validationSucceeded: (
      state,
      action: PayloadAction<{
        issues: ValidationIssue[];
        summary: ValidationSummary;
      }>,
    ) => {
      issuesAdapter.setAll(state, action.payload.issues);
      state.errorMessage = null;
      state.progress = 100;
      state.status = 'complete';
      state.summary = action.payload.summary;
      state.initialSummary = action.payload.summary;
    },
    validationUpdated: (
      state,
      action: PayloadAction<{
        issues: ValidationIssue[];
        summary: ValidationSummary;
      }>,
    ) => {
      issuesAdapter.setAll(state, action.payload.issues);
      state.summary = action.payload.summary;
      state.status = 'complete';
    },
    validationRestored: (
      state,
      action: PayloadAction<{
        initialSummary: ValidationSummary;
        issues: ValidationIssue[];
        summary: ValidationSummary;
      }>,
    ) => {
      issuesAdapter.setAll(state, action.payload.issues);
      state.errorMessage = null;
      state.initialSummary = action.payload.initialSummary;
      state.progress = 100;
      state.status = 'complete';
      state.summary = action.payload.summary;
    },
  },
});

export const {
  validationCancelled,
  validationFailed,
  validationProgressed,
  validationReset,
  validationRestored,
  validationStarted,
  validationSucceeded,
  validationUpdated,
} = issuesSlice.actions;
export const issuesReducer = issuesSlice.reducer;
export const issuesSelectors = issuesAdapter.getSelectors(
  (state: { issues: ReturnType<typeof issuesReducer> }) => state.issues,
);
