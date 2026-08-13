import {
  initialWorkflowState,
  startUploadSession,
  workflowReducer,
  type WorkflowState,
} from '@app/store/workflowSlice';

describe('workflowSlice', () => {
  it('starts a new upload without retaining the previous dataset or rules', () => {
    const previous: WorkflowState = {
      ...initialWorkflowState,
      configuredColumns: [{ columnId: 'old-column', type: 'email' }],
      datasetReady: true,
      parsedDataset: {
        columns: [
          {
            confidence: 1,
            header: 'old',
            id: 'old-column',
            type: 'email',
          },
        ],
        delimiter: ',',
        headers: ['old'],
        previewRows: [['old@example.com']],
        rowCount: 1,
        rows: [['old@example.com']],
      },
      reportReady: true,
      sessionId: 'old-session',
      step: 'report',
      validationRules: [
        { columnId: 'old-column', id: 'old-column:email', type: 'email' },
      ],
    };

    const next = workflowReducer(
      previous,
      startUploadSession({
        sessionId: 'new-session',
        summary: {
          file: { lastModified: 1, name: 'new.csv', size: 12 },
          provisionalRowCount: 0,
        },
      }),
    );

    expect(next).toMatchObject({
      configuredColumns: [],
      datasetReady: false,
      parsedDataset: null,
      reportReady: false,
      ruleSetupColumns: [],
      sessionId: 'new-session',
      step: 'rules',
      validationRules: [],
    });
  });
});
