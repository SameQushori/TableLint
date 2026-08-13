import type { ValidationIssue } from '@entities/issue/model/types';
import {
  calculateColumnWidths,
  createCellIssueIndex,
} from '@features/workspace/model/gridModel';

describe('workspace grid model', () => {
  it('calculates deterministic bounded column widths from headers and values', () => {
    expect(
      calculateColumnWidths(
        ['short', 'description'],
        [
          ['a', 'x'.repeat(100)],
          ['value', 'medium'],
        ],
      ),
    ).toEqual([168, 288]);
  });

  it('groups cell issues and preserves the strongest severity', () => {
    const issue = (
      id: string,
      severity: ValidationIssue['severity'],
    ): ValidationIssue => ({
      columnId: 'column-1',
      columnIndex: 0,
      id,
      message: 'Проблема',
      originalValue: 'value',
      rowId: 'row-1',
      rowIndex: 0,
      ruleId: `column-1:${id}`,
      ruleType: 'email',
      severity,
      suggestedFix: null,
    });

    expect(
      createCellIssueIndex([
        issue('warning', 'warning'),
        issue('error', 'error'),
      ]).get('0:0'),
    ).toEqual({ count: 2, severity: 'error' });
  });
});
