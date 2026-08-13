import type { ParsedDataset } from '@entities/dataset/model/types';
import type {
  CellPatch,
  DataPatch,
  PatchBatch,
} from '@entities/patch/model/types';

export function getAppliedCellValue(
  dataset: ParsedDataset,
  batches: PatchBatch[],
  rowIndex: number,
  columnIndex: number,
) {
  let value = dataset.rows[rowIndex]?.[columnIndex] ?? '';
  for (const batch of batches) {
    for (const patch of batch.patches) {
      if (
        patch.type === 'cell' &&
        patch.rowIndex === rowIndex &&
        patch.columnIndex === columnIndex
      ) {
        value = patch.after;
      }
    }
  }
  return value;
}

export function getRemovedRowIndices(batches: PatchBatch[]) {
  const removed = new Set<number>();
  for (const batch of batches) {
    for (const patch of batch.patches) {
      if (patch.type === 'removeRow') removed.add(patch.rowIndex);
    }
  }
  return removed;
}

export function getActiveRowIndices(
  dataset: ParsedDataset,
  batches: PatchBatch[],
) {
  const removed = getRemovedRowIndices(batches);
  return dataset.rows.flatMap((_row, rowIndex) =>
    removed.has(rowIndex) ? [] : [rowIndex],
  );
}

export function materializePatchedDataset(
  dataset: ParsedDataset,
  batches: PatchBatch[],
): ParsedDataset {
  const removedRows = getRemovedRowIndices(batches);
  const cellPatches = new Map<string, CellPatch>();
  for (const batch of batches) {
    for (const patch of batch.patches) {
      if (patch.type === 'cell') {
        cellPatches.set(`${patch.rowIndex}:${patch.columnIndex}`, patch);
      }
    }
  }
  const rows = dataset.rows.map((row, rowIndex) =>
    removedRows.has(rowIndex)
      ? row.map(() => '')
      : row.map(
          (value, columnIndex) =>
            cellPatches.get(`${rowIndex}:${columnIndex}`)?.after ?? value,
        ),
  );
  const activeRowCount = getActiveRowIndices(dataset, batches).length;
  return {
    ...dataset,
    previewRows: rows.slice(0, 8),
    rowCount: activeRowCount,
    rows,
  };
}

export function invertPatch(patch: DataPatch): DataPatch {
  if (patch.type === 'removeRow') {
    return patch;
  }
  return { ...patch, after: patch.before, before: patch.after };
}

export function createManualEditPatch(
  dataset: ParsedDataset,
  batches: PatchBatch[],
  rowIndex: number,
  columnIndex: number,
  after: string,
): CellPatch | null {
  const before = getAppliedCellValue(dataset, batches, rowIndex, columnIndex);
  const column = dataset.columns[columnIndex];
  if (!column || before === after) return null;
  return {
    after,
    before,
    columnId: column.id,
    columnIndex,
    reason: 'manualEdit',
    rowId: `row-${rowIndex + 1}`,
    rowIndex,
    type: 'cell',
  };
}
