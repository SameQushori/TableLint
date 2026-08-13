import type { ValidationIssue } from '@entities/issue/model/types';

export interface GridCellIssueSummary {
  count: number;
  severity: ValidationIssue['severity'];
}

const MIN_COLUMN_WIDTH = 168;
const MAX_COLUMN_WIDTH = 288;
const APPROXIMATE_CHARACTER_WIDTH = 8;
const CELL_HORIZONTAL_SPACE = 36;

export function calculateColumnWidths(headers: string[], rows: string[][]) {
  return headers.map((header, columnIndex) => {
    const longestValueLength = rows
      .slice(0, 100)
      .reduce(
        (longest, row) => Math.max(longest, (row[columnIndex] ?? '').length),
        header.length,
      );
    return Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(
        MIN_COLUMN_WIDTH,
        longestValueLength * APPROXIMATE_CHARACTER_WIDTH +
          CELL_HORIZONTAL_SPACE,
      ),
    );
  });
}

export function createCellIssueIndex(issues: ValidationIssue[]) {
  const index = new Map<string, GridCellIssueSummary>();
  for (const issue of issues) {
    const key = `${issue.rowIndex}:${issue.columnIndex}`;
    const current = index.get(key);
    index.set(key, {
      count: (current?.count ?? 0) + 1,
      severity:
        current?.severity === 'error' || issue.severity === 'error'
          ? 'error'
          : 'warning',
    });
  }
  return index;
}
