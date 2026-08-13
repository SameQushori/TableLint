import type { ValidationIssue } from '@entities/issue/model/types';

export type RowScope = 'all' | 'issues' | 'clean';

export interface IssueFilters {
  columnId: string | null;
  rowScope: RowScope;
  ruleType: ValidationIssue['ruleType'] | null;
}

export const defaultIssueFilters: IssueFilters = {
  columnId: null,
  rowScope: 'all',
  ruleType: null,
};

export const issueRuleTypes: ValidationIssue['ruleType'][] = [
  'required',
  'unique',
  'email',
  'number',
  'date',
  'allowedValues',
  'minLength',
  'maxLength',
];

export function createIssueRowIndex(issues: ValidationIssue[]) {
  return new Set(issues.map((issue) => issue.rowIndex));
}

export function createVisibleRowIndices(
  rowCount: number,
  issueRows: ReadonlySet<number>,
  scope: RowScope,
) {
  const indices: number[] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    if (
      scope === 'all' ||
      (scope === 'issues' && issueRows.has(rowIndex)) ||
      (scope === 'clean' && !issueRows.has(rowIndex))
    ) {
      indices.push(rowIndex);
    }
  }
  return indices;
}

export function filterIssues(issues: ValidationIssue[], filters: IssueFilters) {
  if (filters.rowScope === 'clean') return [];
  return issues.filter(
    (issue) =>
      (filters.columnId === null || issue.columnId === filters.columnId) &&
      (filters.ruleType === null || issue.ruleType === filters.ruleType),
  );
}

export function countIssueRows(issues: ValidationIssue[]) {
  return createIssueRowIndex(issues).size;
}
