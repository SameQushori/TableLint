import Papa from 'papaparse';

import type {
  CsvDelimiter,
  ParsedDataset,
} from '@entities/dataset/model/types';
import { inferSchema } from '@features/schema-setup/model/inferSchema';
import type { CsvWorkerFailureCode } from '@shared/workers/csvWorkerContract';

const SUPPORTED_DELIMITERS: readonly CsvDelimiter[] = [',', ';', '\t', '|'];
const DELIMITER_SAMPLE_SIZE = 64 * 1024;

export class CsvParseError extends Error {
  constructor(
    public readonly code: CsvWorkerFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'CsvParseError';
  }
}

function countDelimiterInLine(line: string, delimiter: CsvDelimiter) {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (!insideQuotes && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

export function detectDelimiter(text: string): CsvDelimiter {
  const sampleLines = text
    .slice(0, DELIMITER_SAMPLE_SIZE)
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .slice(0, 12);

  const candidates = SUPPORTED_DELIMITERS.map((delimiter) => {
    const counts = sampleLines.map((line) =>
      countDelimiterInLine(line, delimiter),
    );
    const populatedCounts = counts.filter((count) => count > 0);
    const consistentCount = populatedCounts[0] ?? 0;
    const consistent =
      populatedCounts.length >= Math.min(2, sampleLines.length) &&
      populatedCounts.every((count) => count === consistentCount);

    return {
      delimiter,
      score: consistent
        ? consistentCount * 100 + populatedCounts.length
        : populatedCounts.reduce((sum, count) => sum + count, 0),
    };
  });

  const winner = candidates.sort((left, right) => right.score - left.score)[0];
  if (!winner || winner.score === 0) {
    throw new CsvParseError(
      'UNSUPPORTED_DELIMITER',
      'Не удалось определить разделитель. Используйте запятую, точку с запятой, tab или |.',
    );
  }

  return winner.delimiter;
}

function validateHeaders(headers: string[]) {
  const normalizedHeaders = headers.map((header) => header.trim());
  const duplicateHeaders = new Set<string>();
  const seenHeaders = new Set<string>();

  normalizedHeaders.forEach((header) => {
    const key = header.toLocaleLowerCase();
    if (seenHeaders.has(key)) {
      duplicateHeaders.add(header);
    }
    seenHeaders.add(key);
  });

  if (
    normalizedHeaders.length === 0 ||
    normalizedHeaders.some((header) => header.length === 0) ||
    duplicateHeaders.size > 0
  ) {
    throw new CsvParseError(
      'INVALID_HEADERS',
      'Заголовки должны быть непустыми и уникальными. Исправьте первую строку CSV.',
    );
  }
}

export function parseCsvText(text: string): ParsedDataset {
  const normalizedText = text.startsWith('\uFEFF') ? text.slice(1) : text;
  if (normalizedText.trim().length === 0) {
    throw new CsvParseError('EMPTY_FILE', 'CSV пуст. Выберите файл с данными.');
  }

  const delimiter = detectDelimiter(normalizedText);
  const result = Papa.parse<string[]>(normalizedText, {
    delimiter,
    skipEmptyLines: 'greedy',
  });

  const fatalError = result.errors.find(
    (error) => error.code !== 'UndetectableDelimiter',
  );
  if (fatalError) {
    throw new CsvParseError(
      'MALFORMED_CSV',
      'Не удалось разобрать CSV. Проверьте кавычки и количество полей в строках.',
    );
  }

  const [headerRow, ...dataRows] = result.data;
  if (!headerRow || headerRow.length === 0) {
    throw new CsvParseError('EMPTY_FILE', 'CSV пуст. Выберите файл с данными.');
  }

  const headers = headerRow.map((header) => String(header));
  validateHeaders(headers);

  const rows = dataRows.map((row) =>
    headers.map((_, columnIndex) => String(row[columnIndex] ?? '')),
  );

  return {
    columns: inferSchema(headers, rows),
    delimiter,
    headers,
    previewRows: rows.slice(0, 8),
    rowCount: rows.length,
    rows,
  };
}
