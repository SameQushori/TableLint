import Papa from 'papaparse';
import { z } from 'zod';

import type { ParsedDataset } from '@entities/dataset/model/types';
import type { PatchBatch } from '@entities/patch/model/types';
import type { ValidationSummary } from '@entities/issue/model/types';
import {
  getActiveRowIndices,
  getAppliedCellValue,
} from '@features/fixes/model/patchOverlay';

export const EXPORT_REPORT_VERSION = 1 as const;

export type ExportQuoting = 'minimal' | 'all';

export interface CsvExportOptions {
  protectFormulas: boolean;
  quoting: ExportQuoting;
}

export interface ExportSnapshot {
  batches: PatchBatch[];
  dataset: ParsedDataset;
  fileName: string;
  generatedAt: string;
  initialSummary: ValidationSummary;
  options: CsvExportOptions;
  summary: ValidationSummary;
}

const transformationSchema = z.object({
  affectedValues: z.number().int().nonnegative(),
  label: z.string().min(1),
  type: z.enum([
    'manualEdit',
    'trim',
    'normalizeAllowedValue',
    'normalizeDate',
    'emptyRow',
    'duplicateRow',
    'csvInjectionProtection',
  ]),
});

export const exportReportSchema = z.object({
  counts: z.object({
    fixedIssues: z.number().int().nonnegative(),
    foundIssues: z.number().int().nonnegative(),
    remainingIssues: z.number().int().nonnegative(),
    rowsExported: z.number().int().nonnegative(),
  }),
  delimiter: z.enum([',', ';', '\t', '|']),
  fileName: z.string().min(1),
  generatedAt: z.string().datetime(),
  score: z.object({
    after: z.number().int().min(0).max(100),
    before: z.number().int().min(0).max(100),
  }),
  transformations: z.array(transformationSchema),
  version: z.literal(EXPORT_REPORT_VERSION),
});

export type ExportReport = z.infer<typeof exportReportSchema>;

const formulaPrefix = /^[=+\-@]/u;

export function protectCsvValue(value: string) {
  return formulaPrefix.test(value) ? `'${value}` : value;
}

export function createExportRows(
  dataset: ParsedDataset,
  batches: PatchBatch[],
  protectFormulas: boolean,
) {
  let protectedValueCount = 0;
  const transform = (value: string) => {
    if (!protectFormulas) return value;
    const protectedValue = protectCsvValue(value);
    if (protectedValue !== value) protectedValueCount += 1;
    return protectedValue;
  };
  const rows = getActiveRowIndices(dataset, batches).map((rowIndex) =>
    dataset.headers.map((_header, columnIndex) =>
      transform(getAppliedCellValue(dataset, batches, rowIndex, columnIndex)),
    ),
  );
  return {
    protectedValueCount,
    rows: [dataset.headers.map(transform), ...rows],
  };
}

export function serializeCsv(snapshot: ExportSnapshot) {
  const { protectedValueCount, rows } = createExportRows(
    snapshot.dataset,
    snapshot.batches,
    snapshot.options.protectFormulas,
  );
  return {
    csv: `\uFEFF${Papa.unparse(rows, {
      delimiter: snapshot.dataset.delimiter,
      escapeFormulae: false,
      newline: '\r\n',
      quotes: snapshot.options.quoting === 'all',
    })}`,
    protectedValueCount,
  };
}

function transformationLabel(reason: PatchBatch['patches'][number]['reason']) {
  const labels: Record<typeof reason, string> = {
    duplicateRow: 'Удаление точных дубликатов строк',
    emptyRow: 'Удаление пустых строк',
    manualEdit: 'Ручное изменение значения',
    normalizeAllowedValue: 'Унификация регистра разрешённого значения',
    normalizeDate: 'Приведение даты к YYYY-MM-DD',
    trim: 'Удаление внешних пробелов',
  };
  return labels[reason];
}

export function createExportReport(
  snapshot: ExportSnapshot,
  protectedValueCount: number,
): ExportReport {
  const transformations = new Map<
    string,
    ExportReport['transformations'][number]
  >();
  for (const batch of snapshot.batches) {
    for (const patch of batch.patches) {
      const current = transformations.get(patch.reason);
      transformations.set(patch.reason, {
        affectedValues: (current?.affectedValues ?? 0) + 1,
        label: transformationLabel(patch.reason),
        type: patch.reason,
      });
    }
  }
  if (protectedValueCount > 0) {
    transformations.set('csvInjectionProtection', {
      affectedValues: protectedValueCount,
      label: 'Защита значений от CSV injection',
      type: 'csvInjectionProtection',
    });
  }
  return exportReportSchema.parse({
    counts: {
      fixedIssues: Math.max(
        0,
        snapshot.initialSummary.issueCount - snapshot.summary.issueCount,
      ),
      foundIssues: snapshot.initialSummary.issueCount,
      remainingIssues: snapshot.summary.issueCount,
      rowsExported: getActiveRowIndices(snapshot.dataset, snapshot.batches)
        .length,
    },
    delimiter: snapshot.dataset.delimiter,
    fileName: snapshot.fileName,
    generatedAt: snapshot.generatedAt,
    score: {
      after: snapshot.summary.score,
      before: snapshot.initialSummary.score,
    },
    transformations: [...transformations.values()],
    version: EXPORT_REPORT_VERSION,
  });
}

export function cleanedFileName(fileName: string) {
  const baseName = fileName.replace(/\.csv$/iu, '') || 'tablelint';
  return `${baseName}-cleaned.csv`;
}

export function reportFileName(fileName: string) {
  const baseName = fileName.replace(/\.csv$/iu, '') || 'tablelint';
  return `${baseName}-report.json`;
}
