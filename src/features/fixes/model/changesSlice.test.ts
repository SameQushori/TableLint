import type { PatchBatch } from '@entities/patch/model/types';
import {
  applyBatch,
  cancelPreview,
  changesReducer,
  redoBatch,
  startPreview,
  undoBatch,
} from '@features/fixes/model/changesSlice';

const batch: PatchBatch = {
  id: 'batch-1',
  label: 'Правка',
  patches: [
    {
      after: 'after',
      before: 'before',
      columnId: 'column-1',
      columnIndex: 0,
      reason: 'manualEdit',
      rowId: 'row-1',
      rowIndex: 0,
      type: 'cell',
    },
  ],
  source: 'manual',
};

describe('changes history', () => {
  it('cancels preview without applying data and supports undo/redo', () => {
    const previewed = changesReducer(undefined, startPreview(batch));
    const cancelled = changesReducer(previewed, cancelPreview());
    expect(cancelled).toMatchObject({ applied: [], preview: null, undone: [] });

    const applied = changesReducer(cancelled, applyBatch(batch));
    const undone = changesReducer(applied, undoBatch());
    expect(undone.applied).toEqual([]);
    expect(undone.undone).toEqual([batch]);
    expect(changesReducer(undone, redoBatch()).applied).toEqual([batch]);
  });

  it('limits applied history and clears redo after a new command', () => {
    let state = changesReducer(undefined, { type: 'init' });
    for (let index = 0; index < 55; index += 1) {
      state = changesReducer(
        state,
        applyBatch({ ...batch, id: `batch-${index}` }),
      );
    }
    expect(state.applied).toHaveLength(50);
    state = changesReducer(state, undoBatch());
    expect(state.undone).toHaveLength(1);
    state = changesReducer(state, applyBatch({ ...batch, id: 'new' }));
    expect(state.undone).toEqual([]);
  });
});
