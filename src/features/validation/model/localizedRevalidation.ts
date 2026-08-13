import type { ValidationRule } from '@entities/column/model/types';
import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationIssue } from '@entities/issue/model/types';
import type { DataPatch, PatchBatch } from '@entities/patch/model/types';
import {
  getRemovedRowIndices,
  materializePatchedDataset,
} from '@features/fixes/model/patchOverlay';
import {
  calculateValidationSummary,
  countNonEmptyCells,
  validateDataset,
} from '@features/validation/model/validationEngine';

export function revalidateAfterPatches(
  baseDataset: ParsedDataset,
  applied: PatchBatch[],
  previousIssues: ValidationIssue[],
  rules: ValidationRule[],
  patches: DataPatch[],
) {
  const patchedDataset = materializePatchedDataset(baseDataset, applied);
  const removedRows = getRemovedRowIndices(applied);
  const removedAnyRow = patches.some((patch) => patch.type === 'removeRow');
  const changedColumns = new Set(
    patches.flatMap((patch) => (patch.type === 'cell' ? [patch.columnId] : [])),
  );
  const affectedRules = removedAnyRow
    ? rules
    : rules.filter((rule) => changedColumns.has(rule.columnId));
  const affectedRuleIds = new Set(affectedRules.map((rule) => rule.id));
  const retainedIssues = previousIssues.filter(
    (issue) =>
      !affectedRuleIds.has(issue.ruleId) && !removedRows.has(issue.rowIndex),
  );
  const refreshedIssues = validateDataset(
    patchedDataset,
    affectedRules,
  ).issues.filter((issue) => !removedRows.has(issue.rowIndex));
  const issues = [...retainedIssues, ...refreshedIssues].sort(
    (left, right) =>
      left.rowIndex - right.rowIndex ||
      left.columnIndex - right.columnIndex ||
      left.ruleId.localeCompare(right.ruleId),
  );
  const activeRows = patchedDataset.rows.filter(
    (_row, rowIndex) => !removedRows.has(rowIndex),
  );
  return {
    issues,
    summary: calculateValidationSummary(issues, countNonEmptyCells(activeRows)),
  };
}
