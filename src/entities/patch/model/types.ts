export type CellPatchReason =
  'manualEdit' | 'trim' | 'normalizeAllowedValue' | 'normalizeDate';

export interface CellPatch {
  after: string;
  before: string;
  columnId: string;
  columnIndex: number;
  reason: CellPatchReason;
  rowId: string;
  rowIndex: number;
  type: 'cell';
}

export type RowPatchReason = 'emptyRow' | 'duplicateRow';

export interface RowPatch {
  after: true;
  before: false;
  reason: RowPatchReason;
  rowId: string;
  rowIndex: number;
  type: 'removeRow';
}

export type DataPatch = CellPatch | RowPatch;

export interface PatchBatch {
  id: string;
  label: string;
  patches: DataPatch[];
  source: 'manual' | 'safeFix';
}
