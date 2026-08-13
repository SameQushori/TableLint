import type { ValidationIssue } from '@entities/issue/model/types';
import {
  parseWorkspaceLocation,
  serializeWorkspaceLocation,
} from '@features/workspace/model/workspaceQuery';

const issue: ValidationIssue = {
  columnId: 'column-email',
  columnIndex: 1,
  id: 'column-email:email:row-2',
  message: 'Неверный email',
  originalValue: 'bad',
  rowId: 'row-2',
  rowIndex: 1,
  ruleId: 'column-email:email',
  ruleType: 'email',
  severity: 'error',
  suggestedFix: null,
};

describe('workspace URL state', () => {
  it('accepts known values and round-trips a selected issue', () => {
    const parsed = parseWorkspaceLocation(
      new URLSearchParams(
        'rows=issues&rule=email&column=column-email&issue=column-email%3Aemail%3Arow-2',
      ),
      [issue],
      new Set(['column-email']),
    );

    expect(parsed).toEqual({
      filters: {
        columnId: 'column-email',
        rowScope: 'issues',
        ruleType: 'email',
      },
      selectedIssueId: issue.id,
    });
    expect(serializeWorkspaceLocation(parsed).get('issue')).toBe(issue.id);
  });

  it('drops unknown URL values and safely selects the first visible issue', () => {
    expect(
      parseWorkspaceLocation(
        new URLSearchParams(
          'rows=deleted&rule=script&column=missing&issue=missing',
        ),
        [issue],
        new Set(['column-email']),
      ),
    ).toEqual({
      filters: { columnId: null, rowScope: 'all', ruleType: null },
      selectedIssueId: issue.id,
    });
  });

  it('does not select an issue until the URL requests one', () => {
    expect(
      parseWorkspaceLocation(
        new URLSearchParams(),
        [issue],
        new Set(['column-email']),
      ).selectedIssueId,
    ).toBeNull();
  });
});
