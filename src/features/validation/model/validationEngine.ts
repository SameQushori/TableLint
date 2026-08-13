import type { ValidationRule } from '@entities/column/model/types';
import type { ParsedDataset } from '@entities/dataset/model/types';
import type {
  IssueSeverity,
  SuggestedFix,
  ValidationIssue,
  ValidationSummary,
} from '@entities/issue/model/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const SEVERITY_BY_RULE: Record<ValidationRule['type'], IssueSeverity> = {
  allowedValues: 'warning',
  date: 'error',
  email: 'error',
  maxLength: 'warning',
  minLength: 'warning',
  number: 'error',
  required: 'error',
  unique: 'error',
};

interface DateParts {
  day: number;
  month: number;
  year: number;
}

interface ValidationContext {
  columnIndexById: ReadonlyMap<string, number>;
  uniqueCounts: ReadonlyMap<string, ReadonlyMap<string, number>>;
}

function normalizedValue(value: string) {
  return value.trim();
}

function isValidCalendarDate({ day, month, year }: DateParts) {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseDate(value: string, format: ValidationRule & { type: 'date' }) {
  for (const candidate of format.formats) {
    const separator = candidate === 'YYYY-MM-DD' ? '-' : (candidate[2] ?? '/');
    const parts = value.split(separator);
    if (parts.length !== 3 || parts.some((part) => !/^\d+$/u.test(part))) {
      continue;
    }

    const numbers = parts.map(Number);
    const dateParts: DateParts =
      candidate === 'YYYY-MM-DD'
        ? {
            day: numbers[2] ?? 0,
            month: numbers[1] ?? 0,
            year: numbers[0] ?? 0,
          }
        : candidate === 'MM/DD/YYYY'
          ? {
              day: numbers[1] ?? 0,
              month: numbers[0] ?? 0,
              year: numbers[2] ?? 0,
            }
          : {
              day: numbers[0] ?? 0,
              month: numbers[1] ?? 0,
              year: numbers[2] ?? 0,
            };

    const expectedWidths = candidate === 'YYYY-MM-DD' ? [4, 2, 2] : [2, 2, 4];
    if (
      parts.some((part, index) => part.length !== expectedWidths[index]) ||
      !isValidCalendarDate(dateParts)
    ) {
      continue;
    }
    return dateParts;
  }
  return null;
}

export function normalizeDateValue(
  value: string,
  rule: ValidationRule & { type: 'date' },
) {
  const parsed = parseDate(value.trim(), rule);
  if (!parsed) return null;
  return `${parsed.year.toString().padStart(4, '0')}-${parsed.month
    .toString()
    .padStart(2, '0')}-${parsed.day.toString().padStart(2, '0')}`;
}

function isValidNumber(value: string, decimalSeparator: '.' | ',') {
  const escapedSeparator = decimalSeparator === '.' ? '\\.' : ',';
  const pattern = new RegExp(
    `^[+-]?(?:\\d+(?:${escapedSeparator}\\d+)?|${escapedSeparator}\\d+)$`,
    'u',
  );
  if (!pattern.test(value)) return false;
  const parsed = Number(
    decimalSeparator === ',' ? value.replace(',', '.') : value,
  );
  return Number.isFinite(parsed);
}

function suggestedTrim(
  original: string,
  normalized: string,
): SuggestedFix | null {
  return original === normalized ? null : { after: normalized, type: 'trim' };
}

function validateRule(
  rule: ValidationRule,
  original: string,
  context: ValidationContext,
): { message: string; suggestedFix: SuggestedFix | null } | null {
  const value = normalizedValue(original);
  if (rule.type === 'required') {
    return value.length === 0
      ? { message: 'Обязательное значение отсутствует.', suggestedFix: null }
      : null;
  }
  if (value.length === 0) return null;

  if (rule.type === 'unique') {
    const count = context.uniqueCounts.get(rule.columnId)?.get(value) ?? 0;
    return count > 1
      ? {
          message: 'Значение повторяется в этой колонке.',
          suggestedFix: suggestedTrim(original, value),
        }
      : null;
  }
  if (rule.type === 'email') {
    return EMAIL_PATTERN.test(value)
      ? null
      : {
          message: 'Значение не похоже на корректный email.',
          suggestedFix: suggestedTrim(original, value),
        };
  }
  if (rule.type === 'number') {
    return isValidNumber(value, rule.decimalSeparator)
      ? null
      : {
          message: `Ожидается конечное число с десятичным знаком «${rule.decimalSeparator}».`,
          suggestedFix: suggestedTrim(original, value),
        };
  }
  if (rule.type === 'date') {
    const parsedDate = parseDate(value, rule);
    if (!parsedDate) {
      return {
        message: `Дата не соответствует форматам: ${rule.formats.join(', ')}.`,
        suggestedFix: suggestedTrim(original, value),
      };
    }
    return null;
  }
  if (rule.type === 'allowedValues') {
    if (rule.values.includes(value)) return null;
    const matches = rule.values.filter(
      (candidate) =>
        candidate.toLocaleLowerCase() === value.toLocaleLowerCase(),
    );
    return {
      message: 'Значение не входит в список разрешённых.',
      suggestedFix:
        matches.length === 1
          ? { after: matches[0] ?? value, type: 'normalizeAllowedValue' }
          : suggestedTrim(original, value),
    };
  }
  if (rule.type === 'minLength') {
    return value.length < rule.value
      ? {
          message: `Длина значения должна быть не меньше ${rule.value}.`,
          suggestedFix: suggestedTrim(original, value),
        }
      : null;
  }
  return value.length > rule.value
    ? {
        message: `Длина значения должна быть не больше ${rule.value}.`,
        suggestedFix: suggestedTrim(original, value),
      }
    : null;
}

function buildContext(
  dataset: ParsedDataset,
  rules: ValidationRule[],
): ValidationContext {
  const columnIndexById = new Map(
    dataset.columns.map((column, index) => [column.id, index]),
  );
  const uniqueCounts = new Map<string, Map<string, number>>();
  for (const rule of rules) {
    if (rule.type !== 'unique' || uniqueCounts.has(rule.columnId)) continue;
    const columnIndex = columnIndexById.get(rule.columnId);
    if (columnIndex === undefined) continue;
    const counts = new Map<string, number>();
    for (const row of dataset.rows) {
      const value = normalizedValue(row[columnIndex] ?? '');
      if (value.length > 0) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    uniqueCounts.set(rule.columnId, counts);
  }
  return { columnIndexById, uniqueCounts };
}

function issueFrom(
  rule: ValidationRule,
  rowIndex: number,
  columnIndex: number,
  originalValue: string,
  failure: { message: string; suggestedFix: SuggestedFix | null },
): ValidationIssue {
  const rowId = `row-${rowIndex + 1}`;
  return {
    columnId: rule.columnId,
    columnIndex,
    id: `${rule.id}:${rowId}`,
    message: failure.message,
    originalValue,
    rowId,
    rowIndex,
    ruleId: rule.id,
    ruleType: rule.type,
    severity: SEVERITY_BY_RULE[rule.type],
    suggestedFix: failure.suggestedFix,
  };
}

export function countNonEmptyCells(rows: string[][]) {
  return rows.reduce(
    (total, row) =>
      total + row.filter((value) => normalizedValue(value).length > 0).length,
    0,
  );
}

export function calculateValidationSummary(
  issues: ValidationIssue[],
  nonEmptyCellCount: number,
): ValidationSummary {
  const errorCount = issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const warningCount = issues.length - errorCount;
  const weightedIssues = errorCount + warningCount * 0.35;
  return {
    errorCount,
    issueCount: issues.length,
    nonEmptyCellCount,
    score: Math.max(
      0,
      Math.round(100 * (1 - weightedIssues / Math.max(1, nonEmptyCellCount))),
    ),
    warningCount,
  };
}

export function validateDataset(
  dataset: ParsedDataset,
  rules: ValidationRule[],
) {
  const context = buildContext(dataset, rules);
  const issues: ValidationIssue[] = [];
  for (let rowIndex = 0; rowIndex < dataset.rows.length; rowIndex += 1) {
    const row = dataset.rows[rowIndex] ?? [];
    for (const rule of rules) {
      const columnIndex = context.columnIndexById.get(rule.columnId);
      if (columnIndex === undefined) continue;
      const originalValue = row[columnIndex] ?? '';
      const failure = validateRule(rule, originalValue, context);
      if (failure)
        issues.push(
          issueFrom(rule, rowIndex, columnIndex, originalValue, failure),
        );
    }
  }
  const nonEmptyCellCount = countNonEmptyCells(dataset.rows);
  return {
    issues,
    summary: calculateValidationSummary(issues, nonEmptyCellCount),
  };
}

export async function validateDatasetIncrementally(
  dataset: ParsedDataset,
  rules: ValidationRule[],
  options: {
    isCancelled: () => boolean;
    onProgress: (progress: number) => void;
    yieldToEventLoop?: () => Promise<void>;
  },
) {
  const context = buildContext(dataset, rules);
  const issues: ValidationIssue[] = [];
  const yieldToEventLoop =
    options.yieldToEventLoop ??
    (() => new Promise((resolve) => setTimeout(resolve, 0)));
  const chunkSize = 500;
  for (let rowIndex = 0; rowIndex < dataset.rows.length; rowIndex += 1) {
    if (options.isCancelled())
      throw new DOMException('Validation cancelled', 'AbortError');
    const row = dataset.rows[rowIndex] ?? [];
    for (const rule of rules) {
      const columnIndex = context.columnIndexById.get(rule.columnId);
      if (columnIndex === undefined) continue;
      const originalValue = row[columnIndex] ?? '';
      const failure = validateRule(rule, originalValue, context);
      if (failure)
        issues.push(
          issueFrom(rule, rowIndex, columnIndex, originalValue, failure),
        );
    }
    if ((rowIndex + 1) % chunkSize === 0) {
      options.onProgress(
        Math.round(((rowIndex + 1) / Math.max(1, dataset.rows.length)) * 100),
      );
      await yieldToEventLoop();
    }
  }
  options.onProgress(100);
  const nonEmptyCellCount = countNonEmptyCells(dataset.rows);
  return {
    issues,
    summary: calculateValidationSummary(issues, nonEmptyCellCount),
  };
}
