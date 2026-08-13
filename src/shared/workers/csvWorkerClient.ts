import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationRule } from '@entities/column/model/types';
import type {
  ValidationIssue,
  ValidationSummary,
} from '@entities/issue/model/types';
import type {
  ExportReport,
  ExportSnapshot,
} from '@features/export/model/exportModel';
import {
  CSV_WORKER_VERSION,
  csvWorkerEventSchema,
  type CsvWorkerFailureCode,
} from '@shared/workers/csvWorkerContract';

export class CsvWorkerError extends Error {
  constructor(
    public readonly code: CsvWorkerFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'CsvWorkerError';
  }
}

interface ParseWithWorkerOptions {
  createWorker?: () => Worker;
  onProgress: (progress: number) => void;
  requestId?: string;
  signal: AbortSignal;
}

export interface ValidationWorkerResult {
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

export interface ExportWorkerResult {
  csv: string;
  report: ExportReport;
}

export function createCsvWorker() {
  return new Worker(new URL('./csv.worker.ts', import.meta.url), {
    name: 'rowcheck-csv-worker',
    type: 'module',
  });
}

export function parseFileWithWorker(
  file: File,
  {
    createWorker = createCsvWorker,
    onProgress,
    requestId = crypto.randomUUID(),
    signal,
  }: ParseWithWorkerOptions,
): Promise<ParsedDataset> {
  return new Promise((resolve, reject) => {
    const worker = createWorker();
    let settled = false;

    const finish = () => {
      settled = true;
      signal.removeEventListener('abort', handleAbort);
      worker.terminate();
    };

    const handleAbort = () => {
      if (settled) {
        return;
      }
      worker.postMessage({
        requestId: crypto.randomUUID(),
        targetRequestId: requestId,
        type: 'CANCEL',
        version: CSV_WORKER_VERSION,
      });
      finish();
      reject(new CsvWorkerError('CANCELLED', 'Разбор CSV отменён.'));
    };

    worker.onmessage = (message: MessageEvent<unknown>) => {
      const parsedEvent = csvWorkerEventSchema.safeParse(message.data);
      if (!parsedEvent.success || parsedEvent.data.requestId !== requestId) {
        return;
      }

      const event = parsedEvent.data;
      if (event.type === 'PROGRESS') {
        onProgress(event.progress);
        return;
      }

      finish();
      if (event.type === 'FAILED') {
        reject(new CsvWorkerError(event.code, event.message));
        return;
      }
      if (event.type === 'PARSE_COMPLETE') resolve(event.dataset);
    };

    worker.onerror = () => {
      if (settled) {
        return;
      }
      finish();
      reject(
        new CsvWorkerError(
          'WORKER_ERROR',
          'Worker аварийно завершился. Повторите обработку файла.',
        ),
      );
    };

    signal.addEventListener('abort', handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }

    worker.postMessage({
      file,
      requestId,
      type: 'PARSE_FILE',
      version: CSV_WORKER_VERSION,
    });
  });
}

export function validateWithWorker(
  dataset: ParsedDataset,
  rules: ValidationRule[],
  {
    createWorker = createCsvWorker,
    onProgress,
    requestId = crypto.randomUUID(),
    signal,
  }: ParseWithWorkerOptions,
): Promise<ValidationWorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = createWorker();
    let settled = false;

    const finish = () => {
      settled = true;
      signal.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const handleAbort = () => {
      if (settled) return;
      worker.postMessage({
        requestId: crypto.randomUUID(),
        targetRequestId: requestId,
        type: 'CANCEL',
        version: CSV_WORKER_VERSION,
      });
      finish();
      reject(new CsvWorkerError('CANCELLED', 'Проверка CSV отменена.'));
    };

    worker.onmessage = (message: MessageEvent<unknown>) => {
      const parsedEvent = csvWorkerEventSchema.safeParse(message.data);
      if (!parsedEvent.success || parsedEvent.data.requestId !== requestId)
        return;
      const event = parsedEvent.data;
      if (event.type === 'PROGRESS') {
        onProgress(event.progress);
        return;
      }
      if (event.type !== 'VALIDATION_COMPLETE' && event.type !== 'FAILED')
        return;
      finish();
      if (event.type === 'FAILED') {
        reject(new CsvWorkerError(event.code, event.message));
        return;
      }
      resolve({ issues: event.issues, summary: event.summary });
    };
    worker.onerror = () => {
      if (settled) return;
      finish();
      reject(
        new CsvWorkerError(
          'WORKER_ERROR',
          'Worker аварийно завершился. Повторите проверку файла.',
        ),
      );
    };

    signal.addEventListener('abort', handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    worker.postMessage({
      dataset,
      requestId,
      rules,
      type: 'VALIDATE',
      version: CSV_WORKER_VERSION,
    });
  });
}

export function exportWithWorker(
  snapshot: ExportSnapshot,
  {
    createWorker = createCsvWorker,
    onProgress,
    requestId = crypto.randomUUID(),
    signal,
  }: ParseWithWorkerOptions,
): Promise<ExportWorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = createWorker();
    let settled = false;
    const finish = () => {
      settled = true;
      signal.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const handleAbort = () => {
      if (settled) return;
      worker.postMessage({
        requestId: crypto.randomUUID(),
        targetRequestId: requestId,
        type: 'CANCEL',
        version: CSV_WORKER_VERSION,
      });
      finish();
      reject(new CsvWorkerError('CANCELLED', 'Экспорт CSV отменён.'));
    };
    worker.onmessage = (message: MessageEvent<unknown>) => {
      const parsedEvent = csvWorkerEventSchema.safeParse(message.data);
      if (!parsedEvent.success || parsedEvent.data.requestId !== requestId)
        return;
      const event = parsedEvent.data;
      if (event.type === 'PROGRESS') {
        onProgress(event.progress);
        return;
      }
      if (event.type !== 'EXPORT_COMPLETE' && event.type !== 'FAILED') return;
      finish();
      if (event.type === 'FAILED') {
        reject(new CsvWorkerError(event.code, event.message));
        return;
      }
      resolve({ csv: event.csv, report: event.report });
    };
    worker.onerror = () => {
      if (settled) return;
      finish();
      reject(
        new CsvWorkerError(
          'WORKER_ERROR',
          'Worker аварийно завершился во время экспорта.',
        ),
      );
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    worker.postMessage({
      ...snapshot,
      requestId,
      type: 'EXPORT',
      version: CSV_WORKER_VERSION,
    });
  });
}
