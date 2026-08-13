import { z } from 'zod';

import type { WorkflowState } from '@app/store/workflowSlice';
import type { ChangesState } from '@features/fixes/model/changesSlice';
import type { WorkspaceUiState } from '@features/workspace/model/workspaceUiSlice';
import type {
  ValidationIssue,
  ValidationSummary,
} from '@entities/issue/model/types';

export const SESSION_SCHEMA_VERSION = 1 as const;

const delimiterSchema = z.enum([',', ';', '\t', '|']);
const columnTypeSchema = z.enum(['string', 'email', 'number', 'date']);
const dateFormatSchema = z.enum([
  'YYYY-MM-DD',
  'DD.MM.YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
]);
const fileMetaSchema = z.object({
  lastModified: z.number(),
  name: z.string().min(1),
  size: z.number().nonnegative(),
});
const inferredColumnSchema = z.object({
  confidence: z.number().min(0).max(1),
  header: z.string(),
  id: z.string().min(1),
  type: columnTypeSchema,
});
export const parsedDatasetSchema = z.object({
  columns: z.array(inferredColumnSchema),
  delimiter: delimiterSchema,
  headers: z.array(z.string()),
  previewRows: z.array(z.array(z.string())),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(z.array(z.string())),
});
const ruleSetupColumnSchema = z.object({
  columnId: z.string().min(1),
  rules: z.object({
    allowedValues: z.object({ enabled: z.boolean(), rawValues: z.string() }),
    date: z.object({
      enabled: z.boolean(),
      formats: z.array(dateFormatSchema),
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
  type: columnTypeSchema,
});
const ruleBaseSchema = z.object({
  columnId: z.string().min(1),
  id: z.string().min(1),
});
const validationRuleSchema = z.discriminatedUnion('type', [
  ruleBaseSchema.extend({ type: z.literal('required') }),
  ruleBaseSchema.extend({ type: z.literal('unique') }),
  ruleBaseSchema.extend({ type: z.literal('email') }),
  ruleBaseSchema.extend({
    decimalSeparator: z.enum(['.', ',']),
    type: z.literal('number'),
  }),
  ruleBaseSchema.extend({
    formats: z.array(dateFormatSchema).min(1),
    type: z.literal('date'),
  }),
  ruleBaseSchema.extend({
    type: z.literal('allowedValues'),
    values: z.array(z.string()).min(1),
  }),
  ruleBaseSchema.extend({
    type: z.literal('minLength'),
    value: z.number().int().nonnegative(),
  }),
  ruleBaseSchema.extend({
    type: z.literal('maxLength'),
    value: z.number().int().nonnegative(),
  }),
]);
export const persistedSummarySchema = z.object({
  errorCount: z.number().int().nonnegative(),
  issueCount: z.number().int().nonnegative(),
  nonEmptyCellCount: z.number().int().nonnegative(),
  score: z.number().int().min(0).max(100),
  warningCount: z.number().int().nonnegative(),
});
const suggestedFixSchema = z.discriminatedUnion('type', [
  z.object({ after: z.string(), type: z.literal('trim') }),
  z.object({ after: z.string(), type: z.literal('normalizeAllowedValue') }),
  z.object({ after: z.string(), type: z.literal('normalizeDate') }),
]);
const issueSchema = z.object({
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
const cellPatchSchema = z.object({
  after: z.string(),
  before: z.string(),
  columnId: z.string().min(1),
  columnIndex: z.number().int().nonnegative(),
  reason: z.enum([
    'manualEdit',
    'trim',
    'normalizeAllowedValue',
    'normalizeDate',
  ]),
  rowId: z.string().min(1),
  rowIndex: z.number().int().nonnegative(),
  type: z.literal('cell'),
});
const rowPatchSchema = z.object({
  after: z.literal(true),
  before: z.literal(false),
  reason: z.enum(['emptyRow', 'duplicateRow']),
  rowId: z.string().min(1),
  rowIndex: z.number().int().nonnegative(),
  type: z.literal('removeRow'),
});
export const patchBatchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  patches: z.array(
    z.discriminatedUnion('type', [cellPatchSchema, rowPatchSchema]),
  ),
  source: z.enum(['manual', 'safeFix']),
});

const workflowSchema = z.object({
  configuredColumns: z.array(
    z.object({ columnId: z.string().min(1), type: columnTypeSchema }),
  ),
  datasetReady: z.literal(true),
  parsedDataset: parsedDatasetSchema,
  reportReady: z.boolean(),
  ruleSetupColumns: z.array(ruleSetupColumnSchema),
  sessionId: z.string().min(1),
  step: z.enum(['workspace', 'report']),
  uploadSummary: z.object({
    file: fileMetaSchema,
    provisionalRowCount: z.number().int().nonnegative(),
  }),
  validationRules: z.array(validationRuleSchema),
});

export const persistedSessionSchema = z.object({
  changes: z.object({
    applied: z.array(patchBatchSchema),
    preview: z.null(),
    undone: z.array(patchBatchSchema),
  }),
  initialSummary: persistedSummarySchema,
  issues: z.array(issueSchema),
  savedAt: z.string().datetime(),
  summary: persistedSummarySchema,
  version: z.literal(SESSION_SCHEMA_VERSION),
  workflow: workflowSchema,
  workspaceUi: z.object({
    filters: z.object({
      columnId: z.string().nullable(),
      rowScope: z.enum(['all', 'issues', 'clean']),
      ruleType: z
        .enum([
          'required',
          'unique',
          'email',
          'number',
          'date',
          'allowedValues',
          'minLength',
          'maxLength',
        ])
        .nullable(),
    }),
    inspectorOpen: z.boolean(),
    leftPanelOpen: z.boolean(),
    selectedIssueId: z.string().nullable(),
  }),
});

export interface PersistedSession {
  changes: ChangesState;
  initialSummary: ValidationSummary;
  issues: ValidationIssue[];
  savedAt: string;
  summary: ValidationSummary;
  version: typeof SESSION_SCHEMA_VERSION;
  workflow: WorkflowState & {
    parsedDataset: NonNullable<WorkflowState['parsedDataset']>;
  };
  workspaceUi: WorkspaceUiState;
}

export function parsePersistedSession(value: unknown): PersistedSession | null {
  const parsed = persistedSessionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
