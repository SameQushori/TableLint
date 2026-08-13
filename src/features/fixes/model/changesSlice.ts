import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { PatchBatch } from '@entities/patch/model/types';
import {
  completeRuleSetup,
  startUploadSession,
} from '@app/store/workflowSlice';

const HISTORY_LIMIT = 50;

export interface ChangesState {
  applied: PatchBatch[];
  preview: PatchBatch | null;
  undone: PatchBatch[];
}

const initialState: ChangesState = {
  applied: [],
  preview: null,
  undone: [],
};

const changesSlice = createSlice({
  extraReducers: (builder) => {
    builder
      .addCase(startUploadSession, () => initialState)
      .addCase(completeRuleSetup, () => initialState);
  },
  initialState,
  name: 'changes',
  reducers: {
    applyBatch: (state, action: PayloadAction<PatchBatch>) => {
      if (action.payload.patches.length === 0) return;
      state.applied.push(action.payload);
      if (state.applied.length > HISTORY_LIMIT) state.applied.shift();
      state.undone = [];
      state.preview = null;
    },
    cancelPreview: (state) => {
      state.preview = null;
    },
    redoBatch: (state) => {
      const batch = state.undone.pop();
      if (!batch) return;
      state.applied.push(batch);
    },
    replaceChanges: (_state, action: PayloadAction<ChangesState>) => ({
      applied: action.payload.applied,
      preview: null,
      undone: action.payload.undone,
    }),
    startPreview: (state, action: PayloadAction<PatchBatch>) => {
      state.preview = action.payload;
    },
    undoBatch: (state) => {
      const batch = state.applied.pop();
      if (!batch) return;
      state.undone.push(batch);
      state.preview = null;
    },
  },
});

export const {
  applyBatch,
  cancelPreview,
  redoBatch,
  replaceChanges,
  startPreview,
  undoBatch,
} = changesSlice.actions;
export const changesReducer = changesSlice.reducer;
