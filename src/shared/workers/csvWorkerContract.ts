import { z } from 'zod';
import { exportReportSchema } from '@features/export/model/exportModel';
import {
  parsedDatasetSchema as persistedDatasetSchema,
  patchBatchSchema,
  persistedSummarySchema,
} from '@features/session-recovery/model/sessionSchema';

export const CSV_WORKER_VERSION = 1 as const;

const fileSchema = z.custom<File>(
  (value) => typeof File !== 'undefined' && value instanceof File,
  'Expected a File instance',
);

export const parseFileCommandSchema = z.object({
  file: fileSchema,
  requestId: z.string().min(1),
  type: z.literal('PARSE_FILE'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const cancelCommandSchema = z.object({
  requestId: z.string().min(1),
  targetRequestId: z.string().min(1),
  type: z.literal('CANCEL'),
  version: z.literal(CSV_WORKER_VERSION),
});

const delimiterSchema = z.union([
  z.literal(','),
  z.literal(';'),
  z.literal('\t'),
  z.literal('|'),
]);

const inferredColumnSchema = z.object({
  confidence: z.number().min(0).max(1),
  header: z.string(),
  id: z.string().min(1),
  type: z.union([
    z.literal('string'),
    z.literal('email'),
    z.literal('number'),
    z.literal('date'),
  ]),
});

const parsedDatasetSchema = z.object({
  columns: z.array(inferredColumnSchema),
  delimiter: delimiterSchema,
  headers: z.array(z.string()),
  previewRows: z.array(z.array(z.string())),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(z.array(z.string())),
});

const dateFormatSchema = z.enum([
  'YYYY-MM-DD',
  'DD.MM.YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
]);

const validationRuleBaseSchema = z.object({
  columnId: z.string().min(1),
  id: z.string().min(1),
});

const validationRuleSchema = z.discriminatedUnion('type', [
  validationRuleBaseSchema.extend({ type: z.literal('required') }),
  validationRuleBaseSchema.extend({ type: z.literal('unique') }),
  validationRuleBaseSchema.extend({ type: z.literal('email') }),
  validationRuleBaseSchema.extend({
    decimalSeparator: z.enum(['.', ',']),
    type: z.literal('number'),
  }),
  validationRuleBaseSchema.extend({
    formats: z.array(dateFormatSchema).min(1),
    type: z.literal('date'),
  }),
  validationRuleBaseSchema.extend({
    type: z.literal('allowedValues'),
    values: z.array(z.string()).min(1),
  }),
  validationRuleBaseSchema.extend({
    type: z.literal('minLength'),
    value: z.number().int().nonnegative(),
  }),
  validationRuleBaseSchema.extend({
    type: z.literal('maxLength'),
    value: z.number().int().nonnegative(),
  }),
]);

export const validateCommandSchema = z.object({
  dataset: parsedDatasetSchema,
  requestId: z.string().min(1),
  rules: z.array(validationRuleSchema),
  type: z.literal('VALIDATE'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const exportCommandSchema = z.object({
  batches: z.array(patchBatchSchema),
  dataset: persistedDatasetSchema,
  fileName: z.string().min(1),
  generatedAt: z.string().datetime(),
  initialSummary: persistedSummarySchema,
  options: z.object({
    protectFormulas: z.boolean(),
    quoting: z.enum(['minimal', 'all']),
  }),
  requestId: z.string().min(1),
  summary: persistedSummarySchema,
  type: z.literal('EXPORT'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const csvWorkerCommandSchema = z.discriminatedUnion('type', [
  parseFileCommandSchema,
  validateCommandSchema,
  exportCommandSchema,
  cancelCommandSchema,
]);

export const progressEventSchema = z.object({
  progress: z.number().min(0).max(100),
  requestId: z.string().min(1),
  type: z.literal('PROGRESS'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const parseCompleteEventSchema = z.object({
  dataset: parsedDatasetSchema,
  requestId: z.string().min(1),
  type: z.literal('PARSE_COMPLETE'),
  version: z.literal(CSV_WORKER_VERSION),
});

const suggestedFixSchema = z.discriminatedUnion('type', [
  z.object({ after: z.string(), type: z.literal('trim') }),
  z.object({ after: z.string(), type: z.literal('normalizeAllowedValue') }),
  z.object({ after: z.string(), type: z.literal('normalizeDate') }),
]);

const validationIssueSchema = z.object({
  columnId: z.string().min(1),
  columnIndex: z.number().int().nonnegative(),
  id: z.string().min(1),
  message: z.string().min(1),
  originalValue: z.string(),
  rowId: z.string().min(1),
  rowIndex: z.number().int().nonnegative(),
  ruleId: z.string().min(1),
  ruleType: z.enum([
    'required',
    'unique',
    'email',
    'number',
    'date',
    'allowedValues',
    'minLength',
    'maxLength',
  ]),
  severity: z.enum(['error', 'warning']),
  suggestedFix: suggestedFixSchema.nullable(),
});

const validationSummarySchema = z.object({
  errorCount: z.number().int().nonnegative(),
  issueCount: z.number().int().nonnegative(),
  nonEmptyCellCount: z.number().int().nonnegative(),
  score: z.number().int().min(0).max(100),
  warningCount: z.number().int().nonnegative(),
});

export const validationCompleteEventSchema = z.object({
  issues: z.array(validationIssueSchema),
  requestId: z.string().min(1),
  summary: validationSummarySchema,
  type: z.literal('VALIDATION_COMPLETE'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const exportCompleteEventSchema = z.object({
  csv: z.string(),
  report: exportReportSchema,
  requestId: z.string().min(1),
  type: z.literal('EXPORT_COMPLETE'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const failedEventSchema = z.object({
  code: z.union([
    z.literal('CANCELLED'),
    z.literal('EMPTY_FILE'),
    z.literal('INVALID_HEADERS'),
    z.literal('INVALID_ENCODING'),
    z.literal('MALFORMED_CSV'),
    z.literal('UNSUPPORTED_DELIMITER'),
    z.literal('WORKER_ERROR'),
    z.literal('EXPORT_ERROR'),
    z.literal('MEMORY_LIMIT'),
  ]),
  message: z.string().min(1),
  recoverable: z.boolean(),
  requestId: z.string().min(1),
  type: z.literal('FAILED'),
  version: z.literal(CSV_WORKER_VERSION),
});

export const csvWorkerEventSchema = z.discriminatedUnion('type', [
  progressEventSchema,
  parseCompleteEventSchema,
  validationCompleteEventSchema,
  exportCompleteEventSchema,
  failedEventSchema,
]);

export type CsvWorkerCommand = z.infer<typeof csvWorkerCommandSchema>;
export type CsvWorkerEvent = z.infer<typeof csvWorkerEventSchema>;
export type CsvWorkerFailureCode = z.infer<typeof failedEventSchema>['code'];
