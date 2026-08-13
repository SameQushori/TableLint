/// <reference lib="webworker" />

import {
  parseCsvText,
  CsvParseError,
} from '@features/schema-setup/model/parseCsv';
import { validateDatasetIncrementally } from '@features/validation/model/validationEngine';
import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationRule } from '@entities/column/model/types';
import {
  createExportReport,
  serializeCsv,
  type ExportSnapshot,
} from '@features/export/model/exportModel';
import {
  CSV_WORKER_VERSION,
  csvWorkerCommandSchema,
  type CsvWorkerEvent,
} from '@shared/workers/csvWorkerContract';

const workerScope: DedicatedWorkerGlobalScope =
  self as DedicatedWorkerGlobalScope;
const cancelledRequestIds = new Set<string>();

function postEvent(event: CsvWorkerEvent) {
  workerScope.postMessage(event);
}

async function parseFile(requestId: string, file: File) {
  try {
    postEvent({
      progress: 5,
      requestId,
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    let text: string;
    try {
      const bytes = await file.arrayBuffer();
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error: unknown) {
      postEvent({
        code: error instanceof RangeError ? 'MEMORY_LIMIT' : 'INVALID_ENCODING',
        message:
          error instanceof RangeError
            ? 'Браузеру не хватило памяти для этого CSV. Закройте лишние вкладки или выберите файл меньшего размера.'
            : 'CSV должен быть сохранён в кодировке UTF-8 или UTF-8 BOM.',
        recoverable: true,
        requestId,
        type: 'FAILED',
        version: CSV_WORKER_VERSION,
      });
      return;
    }

    if (cancelledRequestIds.has(requestId)) {
      cancelledRequestIds.delete(requestId);
      postEvent({
        code: 'CANCELLED',
        message: 'Разбор CSV отменён.',
        recoverable: true,
        requestId,
        type: 'FAILED',
        version: CSV_WORKER_VERSION,
      });
      return;
    }

    postEvent({
      progress: 55,
      requestId,
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    const dataset = parseCsvText(text);

    if (cancelledRequestIds.has(requestId)) {
      cancelledRequestIds.delete(requestId);
      postEvent({
        code: 'CANCELLED',
        message: 'Разбор CSV отменён.',
        recoverable: true,
        requestId,
        type: 'FAILED',
        version: CSV_WORKER_VERSION,
      });
      return;
    }

    postEvent({
      progress: 100,
      requestId,
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    postEvent({
      dataset,
      requestId,
      type: 'PARSE_COMPLETE',
      version: CSV_WORKER_VERSION,
    });
  } catch (error: unknown) {
    const memoryLimit = error instanceof RangeError;
    postEvent({
      code: memoryLimit
        ? 'MEMORY_LIMIT'
        : error instanceof CsvParseError
          ? error.code
          : 'WORKER_ERROR',
      message: memoryLimit
        ? 'Браузеру не хватило памяти для разбора CSV. Попробуйте файл меньшего размера.'
        : error instanceof CsvParseError
          ? error.message
          : 'Worker не смог обработать CSV. Попробуйте ещё раз.',
      recoverable: true,
      requestId,
      type: 'FAILED',
      version: CSV_WORKER_VERSION,
    });
  }
}

async function validate(
  requestId: string,
  dataset: ParsedDataset,
  rules: ValidationRule[],
) {
  try {
    const result = await validateDatasetIncrementally(dataset, rules, {
      isCancelled: () => cancelledRequestIds.has(requestId),
      onProgress: (progress) =>
        postEvent({
          progress,
          requestId,
          type: 'PROGRESS',
          version: CSV_WORKER_VERSION,
        }),
    });
    cancelledRequestIds.delete(requestId);
    postEvent({
      ...result,
      requestId,
      type: 'VALIDATION_COMPLETE',
      version: CSV_WORKER_VERSION,
    });
  } catch (error: unknown) {
    const cancelled =
      error instanceof DOMException && error.name === 'AbortError';
    const memoryLimit = error instanceof RangeError;
    cancelledRequestIds.delete(requestId);
    postEvent({
      code: cancelled
        ? 'CANCELLED'
        : memoryLimit
          ? 'MEMORY_LIMIT'
          : 'WORKER_ERROR',
      message: cancelled
        ? 'Проверка CSV отменена.'
        : memoryLimit
          ? 'Браузеру не хватило памяти для проверки CSV. Попробуйте файл меньшего размера.'
          : 'Worker не смог проверить CSV. Попробуйте ещё раз.',
      recoverable: true,
      requestId,
      type: 'FAILED',
      version: CSV_WORKER_VERSION,
    });
  }
}

function exportCsv(requestId: string, snapshot: ExportSnapshot) {
  try {
    postEvent({
      progress: 10,
      requestId,
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    const { csv, protectedValueCount } = serializeCsv(snapshot);
    const report = createExportReport(snapshot, protectedValueCount);
    postEvent({
      progress: 100,
      requestId,
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    postEvent({
      csv,
      report,
      requestId,
      type: 'EXPORT_COMPLETE',
      version: CSV_WORKER_VERSION,
    });
  } catch (error: unknown) {
    const memoryLimit = error instanceof RangeError;
    postEvent({
      code: memoryLimit ? 'MEMORY_LIMIT' : 'EXPORT_ERROR',
      message: memoryLimit
        ? 'Браузеру не хватило памяти для экспорта. Попробуйте файл меньшего размера.'
        : 'Worker не смог подготовить экспорт. Попробуйте ещё раз.',
      recoverable: true,
      requestId,
      type: 'FAILED',
      version: CSV_WORKER_VERSION,
    });
  }
}

workerScope.addEventListener('message', (message: MessageEvent<unknown>) => {
  const parsedCommand = csvWorkerCommandSchema.safeParse(message.data);
  if (!parsedCommand.success) {
    return;
  }

  const command = parsedCommand.data;
  if (command.type === 'CANCEL') {
    cancelledRequestIds.add(command.targetRequestId);
    return;
  }

  if (command.type === 'VALIDATE') {
    void validate(command.requestId, command.dataset, command.rules);
    return;
  }

  if (command.type === 'EXPORT') {
    exportCsv(command.requestId, command);
    return;
  }

  void parseFile(command.requestId, command.file);
});

export {};
