import { parsePersistedSession, SESSION_SCHEMA_VERSION } from './sessionSchema';

const summary = {
  errorCount: 0,
  issueCount: 0,
  nonEmptyCellCount: 1,
  score: 100,
  warningCount: 0,
};

function validSession() {
  return {
    changes: { applied: [], preview: null, undone: [] },
    initialSummary: summary,
    issues: [],
    savedAt: '2026-08-13T10:00:00.000Z',
    summary,
    version: SESSION_SCHEMA_VERSION,
    workflow: {
      configuredColumns: [{ columnId: 'column-1', type: 'string' }],
      datasetReady: true,
      parsedDataset: {
        columns: [
          { confidence: 1, header: 'name', id: 'column-1', type: 'string' },
        ],
        delimiter: ',',
        headers: ['name'],
        previewRows: [['Анна']],
        rowCount: 1,
        rows: [['Анна']],
      },
      reportReady: false,
      ruleSetupColumns: [],
      sessionId: 'session-1',
      step: 'workspace',
      uploadSummary: {
        file: { lastModified: 0, name: 'contacts.csv', size: 10 },
        provisionalRowCount: 1,
      },
      validationRules: [],
    },
    workspaceUi: {
      filters: { columnId: null, rowScope: 'all', ruleType: null },
      inspectorOpen: false,
      leftPanelOpen: false,
      selectedIssueId: null,
    },
  };
}

describe('persisted session boundary', () => {
  it('accepts the current complete workflow', () => {
    expect(parsePersistedSession(validSession())?.workflow.sessionId).toBe(
      'session-1',
    );
  });

  it('rejects stale versions and partial sessions', () => {
    expect(parsePersistedSession({ ...validSession(), version: 0 })).toBeNull();
    expect(
      parsePersistedSession({
        ...validSession(),
        workflow: { step: 'workspace' },
      }),
    ).toBeNull();
  });
});
