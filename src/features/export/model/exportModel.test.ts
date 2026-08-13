import Papa from 'papaparse';

import type { ParsedDataset } from '@entities/dataset/model/types';
import type { PatchBatch } from '@entities/patch/model/types';
import {
  createExportReport,
  exportReportSchema,
  serializeCsv,
  type ExportSnapshot,
} from './exportModel';

const dataset: ParsedDataset = {
  columns: [
    { confidence: 1, header: 'name', id: 'column-1', type: 'string' },
    { confidence: 1, header: 'note', id: 'column-2', type: 'string' },
  ],
  delimiter: ';',
  headers: ['name', 'note'],
  previewRows: [],
  rowCount: 3,
  rows: [
    [' Анна ', '=2+2'],
    ['Борис', 'содержит;разделитель'],
    ['Удалить', ''],
  ],
};

const batches: PatchBatch[] = [
  {
    id: 'batch-1',
    label: 'Исправления',
    patches: [
      {
        after: 'Анна',
        before: ' Анна ',
        columnId: 'column-1',
        columnIndex: 0,
        reason: 'trim',
        rowId: 'row-1',
        rowIndex: 0,
        type: 'cell',
      },
      {
        after: true,
        before: false,
        reason: 'emptyRow',
        rowId: 'row-3',
        rowIndex: 2,
        type: 'removeRow',
      },
    ],
    source: 'safeFix',
  },
];

const summary = {
  errorCount: 0,
  issueCount: 0,
  nonEmptyCellCount: 4,
  score: 100,
  warningCount: 0,
};
const snapshot: ExportSnapshot = {
  batches,
  dataset,
  fileName: 'contacts.csv',
  generatedAt: '2026-08-13T10:00:00.000Z',
  initialSummary: { ...summary, errorCount: 2, issueCount: 2, score: 60 },
  options: { protectFormulas: true, quoting: 'minimal' },
  summary,
};

describe('CSV export', () => {
  it('round-trips patched active rows with the original delimiter and safe formulas', () => {
    const result = serializeCsv(snapshot);
    const reparsed = Papa.parse<string[]>(result.csv, { delimiter: ';' });

    expect(result.csv.charCodeAt(0)).toBe(0xfeff);
    expect(reparsed.errors).toEqual([]);
    expect(reparsed.data).toEqual([
      ['name', 'note'],
      ['Анна', "'=2+2"],
      ['Борис', 'содержит;разделитель'],
    ]);
    expect(result.protectedValueCount).toBe(1);
  });

  it('creates a report accepted by the public Zod boundary', () => {
    const report = createExportReport(snapshot, 1);
    expect(exportReportSchema.parse(report)).toEqual(report);
    expect(report.counts).toEqual({
      fixedIssues: 2,
      foundIssues: 2,
      remainingIssues: 0,
      rowsExported: 2,
    });
    expect(report.transformations.map((item) => item.type)).toEqual([
      'trim',
      'emptyRow',
      'csvInjectionProtection',
    ]);
  });
});
