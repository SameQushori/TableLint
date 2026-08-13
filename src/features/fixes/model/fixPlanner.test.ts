import type { ValidationRule } from '@entities/column/model/types';
import type { ParsedDataset } from '@entities/dataset/model/types';
import { planSafeFixes } from '@features/fixes/model/fixPlanner';
import { validateDataset } from '@features/validation/model/validationEngine';

const dataset: ParsedDataset = {
  columns: [
    { confidence: 1, header: 'status', id: 'column-1', type: 'string' },
    { confidence: 1, header: 'date', id: 'column-2', type: 'date' },
  ],
  delimiter: ',',
  headers: ['status', 'date'],
  previewRows: [],
  rowCount: 5,
  rows: [
    [' ACTIVE ', '02/29/2024'],
    ['same', '2024-01-01'],
    ['same', '2024-01-01'],
    ['', ''],
    [' pending ', '2024-02-01'],
  ],
};
const rules: ValidationRule[] = [
  {
    columnId: 'column-1',
    id: 'column-1:allowedValues',
    type: 'allowedValues',
    values: ['active', 'pending'],
  },
  {
    columnId: 'column-2',
    formats: ['YYYY-MM-DD', 'MM/DD/YYYY'],
    id: 'column-2:date',
    type: 'date',
  },
];

describe('safe fix planner', () => {
  it('plans reversible cell, date, empty-row and duplicate-row operations', () => {
    const issues = validateDataset(dataset, rules).issues;
    const patches = planSafeFixes(dataset, [], issues, rules);

    expect(patches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          before: ' ACTIVE ',
          after: 'active',
          reason: 'normalizeAllowedValue',
        }),
        expect.objectContaining({
          before: '02/29/2024',
          after: '2024-02-29',
          reason: 'normalizeDate',
        }),
        expect.objectContaining({
          rowIndex: 2,
          reason: 'duplicateRow',
          type: 'removeRow',
        }),
        expect.objectContaining({
          rowIndex: 3,
          reason: 'emptyRow',
          type: 'removeRow',
        }),
        expect.objectContaining({
          before: ' pending ',
          after: 'pending',
          reason: 'trim',
        }),
      ]),
    );
  });
});
