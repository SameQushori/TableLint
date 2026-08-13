import type { ValidationIssue } from '@entities/issue/model/types';
import {
  countIssueRows,
  createIssueRowIndex,
  createVisibleRowIndices,
  filterIssues,
} from '@features/workspace/model/workspaceModel';

const issues: ValidationIssue[] = [
  issue('email-1', 0, 'column-email', 'email'),
  issue('required-1', 0, 'column-name', 'required'),
  issue('email-3', 2, 'column-email', 'email'),
];

describe('workspace issue filters', () => {
  it('keeps row index lists small and tied to source row coordinates', () => {
    const issueRows = createIssueRowIndex(issues);

    expect(createVisibleRowIndices(5, issueRows, 'all')).toEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(createVisibleRowIndices(5, issueRows, 'issues')).toEqual([0, 2]);
    expect(createVisibleRowIndices(5, issueRows, 'clean')).toEqual([1, 3, 4]);
    expect(countIssueRows(issues)).toBe(2);
  });

  it('combines rule and column groups and returns no issues for clean rows', () => {
    expect(
      filterIssues(issues, {
        columnId: 'column-email',
        rowScope: 'issues',
        ruleType: 'email',
      }).map((issue) => issue.id),
    ).toEqual(['email-1', 'email-3']);
    expect(
      filterIssues(issues, {
        columnId: null,
        rowScope: 'clean',
        ruleType: null,
      }),
    ).toEqual([]);
  });
});

function issue(
  id: string,
  rowIndex: number,
  columnId: string,
  ruleType: ValidationIssue['ruleType'],
): ValidationIssue {
  return {
    columnId,
    columnIndex: columnId === 'column-email' ? 1 : 0,
    id,
    message: 'Проблема',
    originalValue: 'bad',
    rowId: `row-${rowIndex + 1}`,
    rowIndex,
    ruleId: `${columnId}:${ruleType}`,
    ruleType,
    severity: 'error',
    suggestedFix: null,
  };
}
