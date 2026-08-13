import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type {
  ParsedDataset,
  UploadSummary,
} from '@entities/dataset/model/types';
import type {
  ConfiguredColumn,
  RuleSetupColumnDraft,
  ValidationRule,
} from '@entities/column/model/types';
import { createRuleSetupDrafts } from '@features/schema-setup/model/ruleConfiguration';

export type AppStep = 'upload' | 'rules' | 'workspace' | 'report';

export interface WorkflowState {
  sessionId: string | null;
  parsedDataset: ParsedDataset | null;
  ruleSetupColumns: RuleSetupColumnDraft[];
  configuredColumns: ConfiguredColumn[];
  validationRules: ValidationRule[];
  datasetReady: boolean;
  reportReady: boolean;
  step: AppStep;
  uploadSummary: UploadSummary | null;
}

export const initialWorkflowState: WorkflowState = {
  sessionId: null,
  parsedDataset: null,
  ruleSetupColumns: [],
  configuredColumns: [],
  validationRules: [],
  datasetReady: false,
  reportReady: false,
  step: 'upload',
  uploadSummary: null,
};

const workflowSlice = createSlice({
  name: 'workflow',
  initialState: initialWorkflowState,
  reducers: {
    startUploadSession: (
      state,
      action: PayloadAction<{ sessionId: string; summary: UploadSummary }>,
    ) => {
      state.sessionId = action.payload.sessionId;
      state.uploadSummary = action.payload.summary;
      state.parsedDataset = null;
      state.ruleSetupColumns = [];
      state.configuredColumns = [];
      state.validationRules = [];
      state.datasetReady = false;
      state.reportReady = false;
      state.step = 'rules';
    },
    storeParsedDataset: (state, action: PayloadAction<ParsedDataset>) => {
      state.parsedDataset = action.payload;
      state.ruleSetupColumns = createRuleSetupDrafts(action.payload.columns);
      state.configuredColumns = [];
      state.validationRules = [];
      state.datasetReady = false;
    },
    updateRuleSetupColumn: (
      state,
      action: PayloadAction<RuleSetupColumnDraft>,
    ) => {
      const index = state.ruleSetupColumns.findIndex(
        (column) => column.columnId === action.payload.columnId,
      );
      if (index >= 0) state.ruleSetupColumns[index] = action.payload;
    },
    completeRuleSetup: (
      state,
      action: PayloadAction<{
        columns: ConfiguredColumn[];
        rules: ValidationRule[];
      }>,
    ) => {
      state.configuredColumns = action.payload.columns;
      state.validationRules = action.payload.rules;
      state.datasetReady = true;
      state.step = 'workspace';
    },
    openReport: (state) => {
      if (!state.datasetReady) return;
      state.reportReady = true;
      state.step = 'report';
    },
    returnToWorkspace: (state) => {
      if (!state.datasetReady) return;
      state.step = 'workspace';
    },
    replaceWorkflow: (_state, action: PayloadAction<WorkflowState>) =>
      action.payload,
  },
});

export const {
  completeRuleSetup,
  openReport,
  replaceWorkflow,
  returnToWorkspace,
  startUploadSession,
  storeParsedDataset,
  updateRuleSetupColumn,
} = workflowSlice.actions;
export const workflowReducer = workflowSlice.reducer;
