import {
  CSV_WORKER_VERSION,
  csvWorkerCommandSchema,
  csvWorkerEventSchema,
} from './csvWorkerContract';

describe('csvWorkerContract', () => {
  it('accepts a versioned parse command', () => {
    expect(
      csvWorkerCommandSchema.safeParse({
        file: new File(['a,b'], 'data.csv'),
        requestId: 'request-1',
        type: 'PARSE_FILE',
        version: CSV_WORKER_VERSION,
      }).success,
    ).toBe(true);
  });

  it('rejects unknown versions and malformed events', () => {
    expect(
      csvWorkerCommandSchema.safeParse({
        file: new File(['a,b'], 'data.csv'),
        requestId: 'request-1',
        type: 'PARSE_FILE',
        version: 99,
      }).success,
    ).toBe(false);
    expect(
      csvWorkerEventSchema.safeParse({
        progress: 120,
        requestId: 'request-1',
        type: 'PROGRESS',
        version: CSV_WORKER_VERSION,
      }).success,
    ).toBe(false);
  });

  it('accepts a recoverable encoding failure', () => {
    expect(
      csvWorkerEventSchema.safeParse({
        code: 'INVALID_ENCODING',
        message: 'CSV должен быть в UTF-8.',
        recoverable: true,
        requestId: 'request-1',
        type: 'FAILED',
        version: CSV_WORKER_VERSION,
      }).success,
    ).toBe(true);
  });

  it('accepts recoverable memory guidance without exposing row data', () => {
    expect(
      csvWorkerEventSchema.safeParse({
        code: 'MEMORY_LIMIT',
        message: 'Попробуйте файл меньшего размера.',
        recoverable: true,
        requestId: 'request-memory',
        type: 'FAILED',
        version: CSV_WORKER_VERSION,
      }).success,
    ).toBe(true);
  });

  it('validates the validation command and normalized completion event', () => {
    const validationCommand = {
      dataset: {
        columns: [
          { confidence: 1, header: 'email', id: 'column-1', type: 'email' },
        ],
        delimiter: ',',
        headers: ['email'],
        previewRows: [['bad']],
        rowCount: 1,
        rows: [['bad']],
      },
      requestId: 'validate-1',
      rules: [{ columnId: 'column-1', id: 'column-1:email', type: 'email' }],
      type: 'VALIDATE',
      version: CSV_WORKER_VERSION,
    };
    expect(csvWorkerCommandSchema.safeParse(validationCommand).success).toBe(
      true,
    );
    expect(
      csvWorkerCommandSchema.safeParse({
        ...validationCommand,
        rules: [{ ...validationCommand.rules[0], type: 'unknown' }],
      }).success,
    ).toBe(false);

    expect(
      csvWorkerEventSchema.safeParse({
        issues: [
          {
            columnId: 'column-1',
            columnIndex: 0,
            id: 'column-1:email:row-1',
            message: 'Invalid email',
            originalValue: 'bad',
            rowId: 'row-1',
            rowIndex: 0,
            ruleId: 'column-1:email',
            ruleType: 'email',
            severity: 'error',
            suggestedFix: null,
          },
        ],
        requestId: 'validate-1',
        summary: {
          errorCount: 1,
          issueCount: 1,
          nonEmptyCellCount: 1,
          score: 0,
          warningCount: 0,
        },
        type: 'VALIDATION_COMPLETE',
        version: CSV_WORKER_VERSION,
      }).success,
    ).toBe(true);
  });

  it('validates export commands and completed reports', () => {
    const summary = {
      errorCount: 0,
      issueCount: 0,
      nonEmptyCellCount: 1,
      score: 100,
      warningCount: 0,
    };
    const command = {
      batches: [],
      dataset: {
        columns: [
          { confidence: 1, header: 'name', id: 'column-1', type: 'string' },
        ],
        delimiter: ',',
        headers: ['name'],
        previewRows: [['Anna']],
        rowCount: 1,
        rows: [['Anna']],
      },
      fileName: 'data.csv',
      generatedAt: '2026-08-13T10:00:00.000Z',
      initialSummary: summary,
      options: { protectFormulas: true, quoting: 'minimal' },
      requestId: 'export-1',
      summary,
      type: 'EXPORT',
      version: CSV_WORKER_VERSION,
    };
    expect(csvWorkerCommandSchema.safeParse(command).success).toBe(true);
    expect(
      csvWorkerEventSchema.safeParse({
        csv: 'name\r\nAnna',
        report: {
          counts: {
            fixedIssues: 0,
            foundIssues: 0,
            remainingIssues: 0,
            rowsExported: 1,
          },
          delimiter: ',',
          fileName: 'data.csv',
          generatedAt: command.generatedAt,
          score: { after: 100, before: 100 },
          transformations: [],
          version: 1,
        },
        requestId: 'export-1',
        type: 'EXPORT_COMPLETE',
        version: CSV_WORKER_VERSION,
      }).success,
    ).toBe(true);
  });
});
