import type { InferredColumn } from '@entities/column/model/types';

export interface FileMeta {
  name: string;
  size: number;
  lastModified: number;
}

export interface UploadSummary {
  file: FileMeta;
  provisionalRowCount: number;
}

export type CsvDelimiter = ',' | ';' | '\t' | '|';

export interface ParsedDataset {
  columns: InferredColumn[];
  delimiter: CsvDelimiter;
  headers: string[];
  previewRows: string[][];
  rowCount: number;
  rows: string[][];
}
