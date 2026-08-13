import type { ParsedDataset } from '@entities/dataset/model/types';
import type { PatchBatch } from '@entities/patch/model/types';
import type { DataPatch } from '@entities/patch/model/types';
import {
  createManualEditPatch,
  getActiveRowIndices,
  getAppliedCellValue,
  materializePatchedDataset,
} from '@features/fixes/model/patchOverlay';

const dataset: ParsedDataset = {
  columns: [{ confidence: 1, header: 'value', id: 'column-1', type: 'string' }],
  delimiter: ',',
  headers: ['value'],
  previewRows: [['base'], ['remove']],
  rowCount: 2,
  rows: [['base'], ['remove']],
};

const batch: PatchBatch = {
  id: 'batch-1',
  label: 'Правка',
  patches: [
    {
      after: 'edited',
      before: 'base',
      columnId: 'column-1',
      columnIndex: 0,
      reason: 'manualEdit',
      rowId: 'row-1',
      rowIndex: 0,
      type: 'cell',
    },
    {
      after: true,
      before: false,
      reason: 'emptyRow',
      rowId: 'row-2',
      rowIndex: 1,
      type: 'removeRow',
    },
  ],
  source: 'manual',
};

describe('patch overlay', () => {
  it('materializes edits without mutating base rows', () => {
    const before = structuredClone(dataset.rows);
    const patched = materializePatchedDataset(dataset, [batch]);

    expect(patched.rows).toEqual([['edited'], ['']]);
    expect(patched.rowCount).toBe(1);
    expect(dataset.rows).toEqual(before);
    expect(getActiveRowIndices(dataset, [batch])).toEqual([0]);
  });

  it('uses the latest overlay value as the next manual before value', () => {
    expect(getAppliedCellValue(dataset, [batch], 0, 0)).toBe('edited');
    expect(
      createManualEditPatch(dataset, [batch], 0, 0, 'again'),
    ).toMatchObject({ after: 'again', before: 'edited' });
    expect(createManualEditPatch(dataset, [batch], 0, 0, 'edited')).toBeNull();
  });

  it.each([
    ['trim', ' before ', 'before'],
    ['normalizeAllowedValue', 'ACTIVE', 'active'],
    ['normalizeDate', '02/29/2024', '2024-02-29'],
  ] as const)(
    'reverses the %s fix by removing its batch',
    (reason, before, after) => {
      const source = {
        ...dataset,
        previewRows: [[before]],
        rowCount: 1,
        rows: [[before]],
      };
      const patch: DataPatch = {
        after,
        before,
        columnId: 'column-1',
        columnIndex: 0,
        reason,
        rowId: 'row-1',
        rowIndex: 0,
        type: 'cell',
      };
      const fixBatch: PatchBatch = {
        id: reason,
        label: reason,
        patches: [patch],
        source: 'safeFix',
      };

      expect(getAppliedCellValue(source, [fixBatch], 0, 0)).toBe(after);
      expect(getAppliedCellValue(source, [], 0, 0)).toBe(before);
    },
  );

  it.each(['emptyRow', 'duplicateRow'] as const)(
    'reverses the %s row removal by removing its batch',
    (reason) => {
      const rowBatch: PatchBatch = {
        id: reason,
        label: reason,
        patches: [
          {
            after: true,
            before: false,
            reason,
            rowId: 'row-2',
            rowIndex: 1,
            type: 'removeRow',
          },
        ],
        source: 'safeFix',
      };
      expect(getActiveRowIndices(dataset, [rowBatch])).toEqual([0]);
      expect(getActiveRowIndices(dataset, [])).toEqual([0, 1]);
    },
  );
});
