import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationRule } from '@entities/column/model/types';
import type { ValidationIssue } from '@entities/issue/model/types';
import type { DataPatch, PatchBatch } from '@entities/patch/model/types';
import {
  getActiveRowIndices,
  getAppliedCellValue,
} from '@features/fixes/model/patchOverlay';
import { normalizeDateValue } from '@features/validation/model/validationEngine';

const FIX_REASON_LABELS = {
  normalizeAllowedValue: 'Нормализовать разрешённое значение',
  normalizeDate: 'Привести дату к YYYY-MM-DD',
  trim: 'Убрать пробелы по краям',
} as const;

export function planSafeFixes(
  dataset: ParsedDataset,
  applied: PatchBatch[],
  issues: ValidationIssue[],
  rules: ValidationRule[],
): DataPatch[] {
  const activeRowIndices = getActiveRowIndices(dataset, applied);
  const activeRows = new Set(activeRowIndices);
  const patches: DataPatch[] = [];
  const patchedCells = new Set<string>();

  for (const issue of issues) {
    if (!issue.suggestedFix || !activeRows.has(issue.rowIndex)) continue;
    const key = `${issue.rowIndex}:${issue.columnIndex}`;
    if (patchedCells.has(key)) continue;
    const before = getAppliedCellValue(
      dataset,
      applied,
      issue.rowIndex,
      issue.columnIndex,
    );
    if (before === issue.suggestedFix.after) continue;
    patches.push({
      after: issue.suggestedFix.after,
      before,
      columnId: issue.columnId,
      columnIndex: issue.columnIndex,
      reason: issue.suggestedFix.type,
      rowId: issue.rowId,
      rowIndex: issue.rowIndex,
      type: 'cell',
    });
    patchedCells.add(key);
  }

  for (const rowIndex of activeRowIndices) {
    for (
      let columnIndex = 0;
      columnIndex < dataset.headers.length;
      columnIndex += 1
    ) {
      const key = `${rowIndex}:${columnIndex}`;
      if (patchedCells.has(key)) continue;
      const before = getAppliedCellValue(
        dataset,
        applied,
        rowIndex,
        columnIndex,
      );
      const after = before.trim();
      const column = dataset.columns[columnIndex];
      if (!column || before === after) continue;
      patches.push({
        after,
        before,
        columnId: column.id,
        columnIndex,
        reason: 'trim',
        rowId: `row-${rowIndex + 1}`,
        rowIndex,
        type: 'cell',
      });
      patchedCells.add(key);
    }
  }

  for (const rule of rules) {
    if (rule.type !== 'date') continue;
    const columnIndex = dataset.columns.findIndex(
      (column) => column.id === rule.columnId,
    );
    if (columnIndex < 0) continue;
    for (const rowIndex of activeRowIndices) {
      const key = `${rowIndex}:${columnIndex}`;
      if (patchedCells.has(key)) continue;
      const before = getAppliedCellValue(
        dataset,
        applied,
        rowIndex,
        columnIndex,
      );
      const after = normalizeDateValue(before, rule);
      if (!after || after === before) continue;
      patches.push({
        after,
        before,
        columnId: rule.columnId,
        columnIndex,
        reason: 'normalizeDate',
        rowId: `row-${rowIndex + 1}`,
        rowIndex,
        type: 'cell',
      });
      patchedCells.add(key);
    }
  }

  const firstRowByValue = new Map<string, number>();
  for (const rowIndex of activeRowIndices) {
    const values = dataset.headers.map((_header, columnIndex) =>
      getAppliedCellValue(dataset, applied, rowIndex, columnIndex),
    );
    if (values.every((value) => value.trim().length === 0)) {
      patches.push({
        after: true,
        before: false,
        reason: 'emptyRow',
        rowId: `row-${rowIndex + 1}`,
        rowIndex,
        type: 'removeRow',
      });
      continue;
    }
    const rowKey = JSON.stringify(values);
    if (firstRowByValue.has(rowKey)) {
      patches.push({
        after: true,
        before: false,
        reason: 'duplicateRow',
        rowId: `row-${rowIndex + 1}`,
        rowIndex,
        type: 'removeRow',
      });
    } else {
      firstRowByValue.set(rowKey, rowIndex);
    }
  }
  return patches;
}

export function describePatch(patch: DataPatch, dataset: ParsedDataset) {
  if (patch.type === 'removeRow') {
    return patch.reason === 'emptyRow'
      ? `Удалить пустую строку ${patch.rowIndex + 1}`
      : `Удалить точный дубликат — строку ${patch.rowIndex + 1}`;
  }
  const header = dataset.headers[patch.columnIndex] ?? patch.columnId;
  return `${FIX_REASON_LABELS[patch.reason === 'manualEdit' ? 'trim' : patch.reason]} · строка ${patch.rowIndex + 1}, ${header}`;
}
