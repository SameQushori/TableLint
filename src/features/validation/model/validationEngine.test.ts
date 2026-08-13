import type { ValidationRule } from '@entities/column/model/types';
import type { ParsedDataset } from '@entities/dataset/model/types';
import { parseCsvText } from '@features/schema-setup/model/parseCsv';
import { SAMPLE_CSV } from '@features/upload/model/sampleDataset';
import {
  calculateValidationSummary,
  validateDataset,
  validateDatasetIncrementally,
} from '@features/validation/model/validationEngine';

function dataset(values: string[]): ParsedDataset {
  return {
    columns: [
      { confidence: 1, header: 'value', id: 'column-1', type: 'string' },
    ],
    delimiter: ',',
    headers: ['value'],
    previewRows: values.map((value) => [value]),
    rowCount: values.length,
    rows: values.map((value) => [value]),
  };
}

type RuleConfiguration = ValidationRule extends infer Candidate
  ? Candidate extends ValidationRule
    ? Omit<Candidate, 'columnId' | 'id'>
    : never
  : never;

function rule(configuration: RuleConfiguration): ValidationRule {
  return {
    ...configuration,
    columnId: 'column-1',
    id: `column-1:${configuration.type}`,
  };
}

describe('validation engine rules', () => {
  it.each([
    ['required', rule({ type: 'required' }), ['ok'], ['', '  ']],
    [
      'email',
      rule({ type: 'email' }),
      ['anna@example.com'],
      ['anna', 'a @b.io'],
    ],
    [
      'number dot',
      rule({ decimalSeparator: '.', type: 'number' }),
      ['-12.50', '.5'],
      ['12,5', 'Infinity'],
    ],
    [
      'number comma',
      rule({ decimalSeparator: ',', type: 'number' }),
      ['-12,50', ',5'],
      ['12.5', 'NaN'],
    ],
    [
      'date ISO',
      rule({ formats: ['YYYY-MM-DD'], type: 'date' }),
      ['2024-02-29'],
      ['2023-02-29', '29.02.2024'],
    ],
    [
      'date locale',
      rule({ formats: ['DD.MM.YYYY', 'MM/DD/YYYY'], type: 'date' }),
      ['29.02.2024', '02/29/2024'],
      ['31.04.2024', '2/29/2024'],
    ],
    [
      'allowed values',
      rule({ type: 'allowedValues', values: ['active', 'pending'] }),
      ['active'],
      ['closed'],
    ],
    [
      'min length',
      rule({ type: 'minLength', value: 3 }),
      ['abc', ' abc '],
      ['ab'],
    ],
    [
      'max length',
      rule({ type: 'maxLength', value: 3 }),
      ['abc', ' ab '],
      ['abcd'],
    ],
  ] as const)(
    '%s accepts positive values and reports negative/edge values',
    (_name, validationRule, valid, invalid) => {
      expect(
        validateDataset(dataset([...valid]), [validationRule]).issues,
      ).toHaveLength(0);
      expect(
        validateDataset(dataset([...invalid]), [validationRule]).issues,
      ).toHaveLength(invalid.length);
    },
  );

  it('reports every non-empty duplicate and ignores empty unique values', () => {
    const result = validateDataset(
      dataset(['same', '', 'same', 'other', '  ']),
      [rule({ type: 'unique' })],
    );

    expect(result.issues.map((issue) => issue.rowIndex)).toEqual([0, 2]);
  });

  it('skips optional blank values for format and length rules', () => {
    const rules: ValidationRule[] = [
      rule({ type: 'email' }),
      rule({ decimalSeparator: '.', type: 'number' }),
      rule({ formats: ['YYYY-MM-DD'], type: 'date' }),
      rule({ type: 'allowedValues', values: ['yes'] }),
      rule({ type: 'minLength', value: 2 }),
      rule({ type: 'maxLength', value: 3 }),
    ];

    expect(validateDataset(dataset(['', '  ']), rules).issues).toHaveLength(0);
  });

  it('adds safe, unambiguous allowed-value normalization suggestions', () => {
    const result = validateDataset(dataset([' ACTIVE ']), [
      rule({ type: 'allowedValues', values: ['active', 'pending'] }),
    ]);

    expect(result.issues[0]).toMatchObject({
      severity: 'warning',
      suggestedFix: { after: 'active', type: 'normalizeAllowedValue' },
    });
  });
});

describe('validation result and score', () => {
  it('uses the documented weighted formula and clamps the score to zero', () => {
    const baseIssue = validateDataset(dataset(['bad']), [
      rule({ type: 'email' }),
    ]).issues[0];
    expect(baseIssue).toBeDefined();
    if (!baseIssue) return;

    expect(calculateValidationSummary([baseIssue], 4)).toEqual({
      errorCount: 1,
      issueCount: 1,
      nonEmptyCellCount: 4,
      score: 75,
      warningCount: 0,
    });
    expect(
      calculateValidationSummary([baseIssue, baseIssue, baseIssue], 1).score,
    ).toBe(0);
  });

  it('produces stable ordering, ids and output for identical input', () => {
    const source = dataset(['duplicate', 'duplicate']);
    const rules = [rule({ type: 'unique' }), rule({ type: 'email' })];

    expect(validateDataset(source, rules)).toEqual(
      validateDataset(source, rules),
    );
  });

  it('creates the expected summary for the product sample', () => {
    const sample = parseCsvText(SAMPLE_CSV);
    const rules: ValidationRule[] = [
      { columnId: 'column-2', id: 'column-2:email', type: 'email' },
      {
        columnId: 'column-3',
        formats: ['YYYY-MM-DD'],
        id: 'column-3:date',
        type: 'date',
      },
    ];

    const result = validateDataset(sample, rules);

    expect(result.summary).toEqual({
      errorCount: 2,
      issueCount: 2,
      nonEmptyCellCount: 15,
      score: 87,
      warningCount: 0,
    });
    expect(result.issues.map((issue) => issue.ruleType)).toEqual([
      'email',
      'date',
    ]);
  });

  it('reports progress and treats cancellation as a normal state', async () => {
    const progress: number[] = [];
    await expect(
      validateDatasetIncrementally(dataset(['a']), [rule({ type: 'email' })], {
        isCancelled: () => false,
        onProgress: (value) => progress.push(value),
      }),
    ).resolves.toMatchObject({ summary: { issueCount: 1 } });
    expect(progress).toEqual([100]);

    await expect(
      validateDatasetIncrementally(dataset(['a']), [], {
        isCancelled: () => true,
        onProgress: () => undefined,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
