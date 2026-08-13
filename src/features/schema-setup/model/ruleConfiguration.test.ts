import type { InferredColumn } from '@entities/column/model/types';
import {
  createRuleSetupDrafts,
  validateRuleConfiguration,
} from '@features/schema-setup/model/ruleConfiguration';

const columns: InferredColumn[] = [
  { confidence: 0.75, header: 'email', id: 'column-1', type: 'email' },
  { confidence: 1, header: 'status', id: 'column-2', type: 'string' },
];

describe('rule configuration', () => {
  it('creates deterministic drafts from inference without changing source columns', () => {
    const drafts = createRuleSetupDrafts(columns);

    expect(drafts[0]?.rules.email.enabled).toBe(true);
    expect(drafts[1]?.rules.email.enabled).toBe(false);
    expect(columns[0]?.type).toBe('email');
  });

  it('creates every v1 rule as a typed configuration', () => {
    const [draft] = createRuleSetupDrafts(columns);
    expect(draft).toBeDefined();
    if (!draft) return;

    draft.type = 'date';
    draft.rules = {
      allowedValues: { enabled: true, rawValues: 'active\npending' },
      date: { enabled: true, formats: ['YYYY-MM-DD', 'DD.MM.YYYY'] },
      email: { enabled: true },
      maxLength: { enabled: true, value: '80' },
      minLength: { enabled: true, value: '3' },
      number: { decimalSeparator: ',', enabled: true },
      required: { enabled: true },
      unique: { enabled: true },
    };

    const result = validateRuleConfiguration([draft]);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.columns).toEqual([{ columnId: 'column-1', type: 'date' }]);
    expect(result.rules.map((rule) => rule.type)).toEqual([
      'required',
      'unique',
      'email',
      'number',
      'date',
      'allowedValues',
      'minLength',
      'maxLength',
    ]);
    expect(result.rules).toContainEqual(
      expect.objectContaining({ decimalSeparator: ',', type: 'number' }),
    );
  });

  it.each([
    {
      configure: (draft: ReturnType<typeof createRuleSetupDrafts>[number]) => {
        draft.rules.date = { enabled: true, formats: [] };
      },
      message: 'Выберите хотя бы один формат даты.',
    },
    {
      configure: (draft: ReturnType<typeof createRuleSetupDrafts>[number]) => {
        draft.rules.allowedValues = {
          enabled: true,
          rawValues: 'Active\nactive',
        };
      },
      message: 'Удалите повторяющиеся значения без учёта регистра.',
    },
    {
      configure: (draft: ReturnType<typeof createRuleSetupDrafts>[number]) => {
        draft.rules.minLength = { enabled: true, value: '8' };
        draft.rules.maxLength = { enabled: true, value: '3' };
      },
      message: 'Максимальная длина должна быть не меньше минимальной.',
    },
  ])('rejects invalid settings: $message', ({ configure, message }) => {
    const [draft] = createRuleSetupDrafts(columns);
    expect(draft).toBeDefined();
    if (!draft) return;
    configure(draft);

    const result = validateRuleConfiguration([draft]);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.map((error) => error.message)).toContain(message);
  });
});
