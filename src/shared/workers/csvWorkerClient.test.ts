import type { ParsedDataset } from '@entities/dataset/model/types';
import { CSV_WORKER_VERSION } from './csvWorkerContract';
import { parseFileWithWorker, validateWithWorker } from './csvWorkerClient';

class MockWorker {
  onerror: ((this: AbstractWorker, event: ErrorEvent) => unknown) | null = null;
  onmessage: ((this: Worker, event: MessageEvent<unknown>) => unknown) | null =
    null;
  readonly messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(data: unknown) {
    this.onmessage?.call(
      this as unknown as Worker,
      new MessageEvent('message', { data }),
    );
  }

  emitError() {
    this.onerror?.call(
      this as unknown as AbstractWorker,
      new ErrorEvent('error'),
    );
  }
}

const dataset: ParsedDataset = {
  columns: [{ confidence: 1, header: 'name', id: 'column-1', type: 'string' }],
  delimiter: ',',
  headers: ['name'],
  previewRows: [['Анна']],
  rowCount: 1,
  rows: [['Анна']],
};

describe('parseFileWithWorker', () => {
  it('ignores stale and invalid responses before accepting current result', async () => {
    const worker = new MockWorker();
    const progress: number[] = [];
    const promise = parseFileWithWorker(new File(['name\nАнна'], 'data.csv'), {
      createWorker: () => worker as unknown as Worker,
      onProgress: (value) => progress.push(value),
      requestId: 'current',
      signal: new AbortController().signal,
    });

    worker.emitMessage({
      progress: 40,
      requestId: 'stale',
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    worker.emitMessage({
      progress: 200,
      requestId: 'current',
      type: 'PROGRESS',
    });
    worker.emitMessage({
      progress: 55,
      requestId: 'current',
      type: 'PROGRESS',
      version: CSV_WORKER_VERSION,
    });
    worker.emitMessage({
      dataset,
      requestId: 'current',
      type: 'PARSE_COMPLETE',
      version: CSV_WORKER_VERSION,
    });

    await expect(promise).resolves.toEqual(dataset);
    expect(progress).toEqual([55]);
    expect(worker.terminated).toBe(true);
  });

  it('cancels normally and terminates the worker', async () => {
    const worker = new MockWorker();
    const abortController = new AbortController();
    const promise = parseFileWithWorker(new File(['a,b'], 'data.csv'), {
      createWorker: () => worker as unknown as Worker,
      onProgress: () => undefined,
      requestId: 'current',
      signal: abortController.signal,
    });

    abortController.abort();

    await expect(promise).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    expect(worker.messages).toContainEqual(
      expect.objectContaining({
        targetRequestId: 'current',
        type: 'CANCEL',
      }),
    );
    expect(worker.terminated).toBe(true);
  });

  it('turns crashes into recoverable worker errors', async () => {
    const worker = new MockWorker();
    const promise = parseFileWithWorker(new File(['a,b'], 'data.csv'), {
      createWorker: () => worker as unknown as Worker,
      onProgress: () => undefined,
      requestId: 'current',
      signal: new AbortController().signal,
    });

    worker.emitError();

    await expect(promise).rejects.toMatchObject({
      code: 'WORKER_ERROR',
    });
  });
});

describe('validateWithWorker', () => {
  it('ignores stale results and resolves a validated completion event', async () => {
    const worker = new MockWorker();
    const promise = validateWithWorker(
      dataset,
      [{ columnId: 'column-1', id: 'column-1:required', type: 'required' }],
      {
        createWorker: () => worker as unknown as Worker,
        onProgress: () => undefined,
        requestId: 'current-validation',
        signal: new AbortController().signal,
      },
    );

    worker.emitMessage({
      issues: [],
      requestId: 'stale-validation',
      summary: {
        errorCount: 0,
        issueCount: 0,
        nonEmptyCellCount: 1,
        score: 100,
        warningCount: 0,
      },
      type: 'VALIDATION_COMPLETE',
      version: CSV_WORKER_VERSION,
    });
    worker.emitMessage({
      issues: [],
      requestId: 'current-validation',
      summary: {
        errorCount: 0,
        issueCount: 0,
        nonEmptyCellCount: 1,
        score: 100,
        warningCount: 0,
      },
      type: 'VALIDATION_COMPLETE',
      version: CSV_WORKER_VERSION,
    });

    await expect(promise).resolves.toMatchObject({
      issues: [],
      summary: { score: 100 },
    });
    expect(worker.messages).toContainEqual(
      expect.objectContaining({ type: 'VALIDATE' }),
    );
    expect(worker.terminated).toBe(true);
  });
});
