import {
  issuesReducer,
  validationStarted,
  validationSucceeded,
} from '@features/validation/model/issuesSlice';

describe('issuesSlice', () => {
  it('stores issues normalized and replaces stale scan results', () => {
    const issue = {
      columnId: 'column-1',
      columnIndex: 0,
      id: 'issue-1',
      message: 'Invalid email',
      originalValue: 'bad',
      rowId: 'row-1',
      rowIndex: 0,
      ruleId: 'column-1:email',
      ruleType: 'email' as const,
      severity: 'error' as const,
      suggestedFix: null,
    };
    const completed = issuesReducer(
      undefined,
      validationSucceeded({
        issues: [issue],
        summary: {
          errorCount: 1,
          issueCount: 1,
          nonEmptyCellCount: 1,
          score: 0,
          warningCount: 0,
        },
      }),
    );

    expect(completed.ids).toEqual(['issue-1']);
    expect(completed.initialSummary).toEqual(completed.summary);
    expect(completed.entities['issue-1']).toEqual(issue);
    expect(issuesReducer(completed, validationStarted())).toMatchObject({
      entities: {},
      ids: [],
      status: 'running',
      summary: null,
    });
  });
});
