import type { ValidationRule } from '@entities/column/model/types';
import type { ParsedDataset } from '@entities/dataset/model/types';
import type { PatchBatch } from '@entities/patch/model/types';
import { revalidateAfterPatches } from '@features/validation/model/localizedRevalidation';
import { validateDataset } from '@features/validation/model/validationEngine';

const dataset: ParsedDataset = {
  columns: [{ confidence: 1, header: 'email', id: 'column-1', type: 'email' }],
  delimiter: ',',
  headers: ['email'],
  previewRows: [['bad'], ['ok@example.com']],
  rowCount: 2,
  rows: [['bad'], ['ok@example.com']],
};
const rules: ValidationRule[] = [
  { columnId: 'column-1', id: 'column-1:email', type: 'email' },
];
const patch = {
  after: 'fixed@example.com',
  before: 'bad',
  columnId: 'column-1',
  columnIndex: 0,
  reason: 'manualEdit' as const,
  rowId: 'row-1',
  rowIndex: 0,
  type: 'cell' as const,
};
const batch: PatchBatch = {
  id: 'batch-1',
  label: 'Правка email',
  patches: [patch],
  source: 'manual',
};

describe('localized revalidation', () => {
  it('updates issues and restores them when the applied overlay is undone', () => {
    const initial = validateDataset(dataset, rules);
    const applied = revalidateAfterPatches(
      dataset,
      [batch],
      initial.issues,
      rules,
      [patch],
    );
    expect(applied.summary).toMatchObject({ issueCount: 0, score: 100 });

    const undone = revalidateAfterPatches(dataset, [], applied.issues, rules, [
      patch,
    ]);
    expect(undone.summary).toMatchObject({ issueCount: 1, score: 50 });
  });
});
