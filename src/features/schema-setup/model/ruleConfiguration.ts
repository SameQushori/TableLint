import { z } from 'zod';

import type {
  ConfiguredColumn,
  DateFormat,
  InferredColumn,
  RuleSetupColumnDraft,
  ValidationRule,
} from '@entities/column/model/types';

export interface RuleConfigurationError {
  columnId: string;
  field: 'allowedValues' | 'date' | 'maxLength' | 'minLength';
  message: string;
}

export interface ValidRuleConfiguration {
  columns: ConfiguredColumn[];
  rules: ValidationRule[];
}

export type RuleConfigurationResult =
  | { errors: RuleConfigurationError[]; success: false }
  | ({ success: true } & ValidRuleConfiguration);

const DATE_FORMATS: readonly DateFormat[] = [
  'YYYY-MM-DD',
  'DD.MM.YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
];

const ruleSetupDraftSchema = z.array(
  z.object({
    columnId: z.string().min(1),
    rules: z.object({
      allowedValues: z.object({ enabled: z.boolean(), rawValues: z.string() }),
      date: z.object({
        enabled: z.boolean(),
        formats: z.array(z.enum(DATE_FORMATS)),
      }),
      email: z.object({ enabled: z.boolean() }),
      maxLength: z.object({ enabled: z.boolean(), value: z.string() }),
      minLength: z.object({ enabled: z.boolean(), value: z.string() }),
      number: z.object({
        decimalSeparator: z.enum(['.', ',']),
        enabled: z.boolean(),
      }),
      required: z.object({ enabled: z.boolean() }),
      unique: z.object({ enabled: z.boolean() }),
    }),
    type: z.enum(['string', 'email', 'number', 'date']),
  }),
);

function ruleId(columnId: string, type: ValidationRule['type']) {
  return `${columnId}:${type}`;
}

function parseLength(value: string) {
  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseAllowedValues(rawValues: string) {
  return rawValues
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function createRuleSetupDrafts(
  columns: InferredColumn[],
): RuleSetupColumnDraft[] {
  return columns.map((column) => ({
    columnId: column.id,
    type: column.type,
    rules: {
      allowedValues: { enabled: false, rawValues: '' },
      date: {
        enabled: column.type === 'date',
        formats: ['YYYY-MM-DD'],
      },
      email: { enabled: column.type === 'email' },
      maxLength: { enabled: false, value: '' },
      minLength: { enabled: false, value: '' },
      number: {
        decimalSeparator: '.',
        enabled: column.type === 'number',
      },
      required: { enabled: false },
      unique: { enabled: false },
    },
  }));
}

export function countEnabledRules(column: RuleSetupColumnDraft) {
  return Object.values(column.rules).filter((rule) => rule.enabled).length;
}

export function validateRuleConfiguration(
  drafts: RuleSetupColumnDraft[],
): RuleConfigurationResult {
  const boundary = ruleSetupDraftSchema.safeParse(drafts);
  if (!boundary.success) {
    return {
      errors: [
        {
          columnId: drafts[0]?.columnId ?? 'unknown',
          field: 'date',
          message: 'Конфигурация правил повреждена. Настройте правила заново.',
        },
      ],
      success: false,
    };
  }

  const errors: RuleConfigurationError[] = [];

  for (const column of boundary.data) {
    const { rules } = column;
    if (rules.date.enabled && rules.date.formats.length === 0) {
      errors.push({
        columnId: column.columnId,
        field: 'date',
        message: 'Выберите хотя бы один формат даты.',
      });
    }

    if (rules.allowedValues.enabled) {
      const values = parseAllowedValues(rules.allowedValues.rawValues);
      const normalized = values.map((value) => value.toLocaleLowerCase());
      if (values.length === 0) {
        errors.push({
          columnId: column.columnId,
          field: 'allowedValues',
          message: 'Добавьте хотя бы одно разрешённое значение.',
        });
      } else if (new Set(normalized).size !== normalized.length) {
        errors.push({
          columnId: column.columnId,
          field: 'allowedValues',
          message: 'Удалите повторяющиеся значения без учёта регистра.',
        });
      }
    }

    const minLength = rules.minLength.enabled
      ? parseLength(rules.minLength.value)
      : null;
    const maxLength = rules.maxLength.enabled
      ? parseLength(rules.maxLength.value)
      : null;

    if (rules.minLength.enabled && minLength === null) {
      errors.push({
        columnId: column.columnId,
        field: 'minLength',
        message: 'Введите целое число от 0.',
      });
    }
    if (rules.maxLength.enabled && maxLength === null) {
      errors.push({
        columnId: column.columnId,
        field: 'maxLength',
        message: 'Введите целое число от 0.',
      });
    }
    if (minLength !== null && maxLength !== null && minLength > maxLength) {
      errors.push({
        columnId: column.columnId,
        field: 'maxLength',
        message: 'Максимальная длина должна быть не меньше минимальной.',
      });
    }
  }

  if (errors.length > 0) return { errors, success: false };

  const rules: ValidationRule[] = [];
  for (const column of boundary.data) {
    const draftRules = column.rules;
    const addSimpleRule = (type: 'required' | 'unique' | 'email') =>
      rules.push({
        columnId: column.columnId,
        id: ruleId(column.columnId, type),
        type,
      });

    if (draftRules.required.enabled) addSimpleRule('required');
    if (draftRules.unique.enabled) addSimpleRule('unique');
    if (draftRules.email.enabled) addSimpleRule('email');
    if (draftRules.number.enabled) {
      rules.push({
        columnId: column.columnId,
        decimalSeparator: draftRules.number.decimalSeparator,
        id: ruleId(column.columnId, 'number'),
        type: 'number',
      });
    }
    if (draftRules.date.enabled) {
      rules.push({
        columnId: column.columnId,
        formats: draftRules.date.formats,
        id: ruleId(column.columnId, 'date'),
        type: 'date',
      });
    }
    if (draftRules.allowedValues.enabled) {
      rules.push({
        columnId: column.columnId,
        id: ruleId(column.columnId, 'allowedValues'),
        type: 'allowedValues',
        values: parseAllowedValues(draftRules.allowedValues.rawValues),
      });
    }
    if (draftRules.minLength.enabled) {
      rules.push({
        columnId: column.columnId,
        id: ruleId(column.columnId, 'minLength'),
        type: 'minLength',
        value: parseLength(draftRules.minLength.value) ?? 0,
      });
    }
    if (draftRules.maxLength.enabled) {
      rules.push({
        columnId: column.columnId,
        id: ruleId(column.columnId, 'maxLength'),
        type: 'maxLength',
        value: parseLength(draftRules.maxLength.value) ?? 0,
      });
    }
  }

  return {
    columns: boundary.data.map(({ columnId, type }) => ({ columnId, type })),
    rules,
    success: true,
  };
}
