import { AlertTriangle, FileCheck2, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { AppShell } from '@app/shell/AppShell';
import { useAppDispatch, useAppSelector } from '@app/store/hooks';
import {
  initialWorkflowState,
  replaceWorkflow,
  storeParsedDataset,
} from '@app/store/workflowSlice';
import { RuleSetupScreen } from '@features/schema-setup/ui/RuleSetupScreen';
import {
  clearUploadFiles,
  getUploadFile,
} from '@features/upload/model/uploadFileRepository';
import { Button } from '@shared/ui/Button/Button';
import { Progress } from '@shared/ui/Progress/Progress';
import {
  CsvWorkerError,
  parseFileWithWorker,
} from '@shared/workers/csvWorkerClient';

import styles from './UploadPreparedScreen.module.css';

type WorkerViewState =
  | { progress: number; type: 'parsing' }
  | { message: string; type: 'error' }
  | { type: 'success' };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function UploadPreparedScreen() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const workflow = useAppSelector((state) => state.workflow);
  const summary = workflow.uploadSummary;
  const dataset = workflow.parsedDataset;
  const abortControllerRef = useRef<AbortController | null>(null);
  const [viewState, setViewState] = useState<WorkerViewState>(
    dataset ? { type: 'success' } : { progress: 0, type: 'parsing' },
  );

  const parseCurrentFile = useCallback(async () => {
    if (!workflow.sessionId) return;
    const file = getUploadFile(workflow.sessionId);
    if (!file) {
      setViewState({
        message: 'Исходный файл больше недоступен. Выберите его снова.',
        type: 'error',
      });
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setViewState({ progress: 0, type: 'parsing' });

    try {
      const parsedDataset = await parseFileWithWorker(file, {
        onProgress: (progress) => setViewState({ progress, type: 'parsing' }),
        signal: abortController.signal,
      });
      dispatch(storeParsedDataset(parsedDataset));
      setViewState({ type: 'success' });
    } catch (error: unknown) {
      if (error instanceof CsvWorkerError && error.code === 'CANCELLED') {
        setViewState({
          message: 'Разбор отменён. Можно запустить его снова.',
          type: 'error',
        });
        return;
      }
      setViewState({
        message:
          error instanceof CsvWorkerError && error.code === 'MEMORY_LIMIT'
            ? `${error.message} Лимит TableLint — 50 МБ; доступная память зависит от устройства и браузера.`
            : error instanceof CsvWorkerError
              ? error.message
              : 'Не удалось обработать CSV. Попробуйте ещё раз.',
        type: 'error',
      });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [dispatch, workflow.sessionId]);

  useEffect(() => {
    let active = true;
    if (!dataset) {
      queueMicrotask(() => {
        if (active) void parseCurrentFile();
      });
    }
    return () => {
      active = false;
      abortControllerRef.current?.abort();
    };
  }, [dataset, parseCurrentFile]);

  if (!summary || !workflow.sessionId) return <Navigate to="/" replace />;

  const chooseAnotherFile = async () => {
    abortControllerRef.current?.abort();
    clearUploadFiles();
    dispatch(replaceWorkflow(initialWorkflowState));
    await navigate('/');
  };

  if (viewState.type === 'success' && dataset) {
    return (
      <AppShell currentStep="rules">
        <RuleSetupScreen onChooseAnother={() => void chooseAnotherFile()} />
      </AppShell>
    );
  }

  return (
    <AppShell currentStep="rules">
      <section
        className={`page-boundary ${styles.screen}`}
        aria-labelledby="page-title"
      >
        <div className={styles.layout}>
          <div>
            <p className={styles.eyebrow}>Анализ структуры · шаг 02</p>
            <h1 className={styles.title} id="page-title">
              {viewState.type === 'success'
                ? 'Схема CSV определена'
                : 'Разбираем структуру CSV'}
            </h1>
            <p className={styles.description}>
              Dedicated Worker определяет разделитель, проверяет заголовки и
              предлагает типы колонок, не блокируя интерфейс.
            </p>
          </div>
          <aside
            className={styles.summary}
            aria-labelledby="file-summary-title"
          >
            <h2 className={styles.summaryTitle} id="file-summary-title">
              Локальная сессия
            </h2>
            <div className={styles.file}>
              <FileCheck2 aria-hidden="true" />
              <div>
                <strong className={styles.fileName}>{summary.file.name}</strong>
                <p className={styles.fileMeta}>
                  {formatBytes(summary.file.size)}
                </p>
              </div>
            </div>

            {viewState.type === 'parsing' ? (
              <div className={styles.workerPanel} aria-live="polite">
                <div className={styles.workerHeader}>
                  <LoaderCircle aria-hidden="true" />
                  <div>
                    <strong>Worker анализирует CSV</strong>
                    <p>Интерфейс остаётся доступным во время обработки.</p>
                  </div>
                </div>
                <Progress label="Разбор CSV" value={viewState.progress} />
                <Button
                  onClick={() => abortControllerRef.current?.abort()}
                  variant="secondary"
                >
                  Отменить анализ
                </Button>
              </div>
            ) : viewState.type === 'error' ? (
              <div className={styles.workerPanel} role="alert">
                <div className={styles.workerHeader}>
                  <AlertTriangle aria-hidden="true" />
                  <div>
                    <strong>Анализ не завершён</strong>
                    <p className={styles.errorMessage}>{viewState.message}</p>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button onClick={() => void parseCurrentFile()}>
                    Повторить
                  </Button>
                  <Button
                    onClick={() => void chooseAnotherFile()}
                    variant="secondary"
                  >
                    Другой файл
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
