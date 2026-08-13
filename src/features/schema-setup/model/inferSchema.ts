import type {
  InferredColumn,
  InferredColumnType,
} from '@entities/column/model/types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/u;

function isValidCalendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (isoMatch) {
    return isValidCalendarDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const dayFirstMatch = /^(\d{2})[./](\d{2})[./](\d{4})$/u.exec(value);
  if (dayFirstMatch) {
    return isValidCalendarDate(
      Number(dayFirstMatch[3]),
      Number(dayFirstMatch[2]),
      Number(dayFirstMatch[1]),
    );
  }

  return false;
}

function inferValues(values: string[]): {
  confidence: number;
  type: InferredColumnType;
} {
  const populatedValues = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 100);

  if (populatedValues.length === 0) {
    return { confidence: 0, type: 'string' };
  }

  const candidates: ReadonlyArray<{
    matches: (value: string) => boolean;
    type: Exclude<InferredColumnType, 'string'>;
  }> = [
    { matches: (value) => EMAIL_PATTERN.test(value), type: 'email' },
    { matches: (value) => NUMBER_PATTERN.test(value), type: 'number' },
    { matches: isDate, type: 'date' },
  ];

  for (const candidate of candidates) {
    const matchCount = populatedValues.filter(candidate.matches).length;
    const confidence = matchCount / populatedValues.length;
    if (confidence >= 0.7) {
      return { confidence, type: candidate.type };
    }
  }

  return { confidence: 1, type: 'string' };
}

export function inferSchema(
  headers: string[],
  rows: string[][],
): InferredColumn[] {
  return headers.map((header, columnIndex) => {
    const inference = inferValues(rows.map((row) => row[columnIndex] ?? ''));

    return {
      confidence: Number(inference.confidence.toFixed(2)),
      header,
      id: `column-${columnIndex + 1}`,
      type: inference.type,
    };
  });
}
