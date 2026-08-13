import {
  ArrowLeft,
  Download,
  FileJson,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppShell } from '@app/shell/AppShell';
import { useAppDispatch, useAppSelector } from '@app/store/hooks';
import { returnToWorkspace } from '@app/store/workflowSlice';
import {
  cleanedFileName,
  reportFileName,
  type CsvExportOptions,
} from '@features/export/model/exportModel';
import { clearSession } from '@features/session-recovery/model/sessionRepository';
import {
  exportWithWorker,
  type ExportWorkerResult,
} from '@shared/workers/csvWorkerClient';
import { Button } from '@shared/ui/Button/Button';
import { Progress } from '@shared/ui/Progress/Progress';

import styles from './ReportScreen.module.css';

function downloadBlob(content: BlobPart, type: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ReportScreen({
  runExport = exportWithWorker,
}: { runExport?: typeof exportWithWorker } = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const workflow = useAppSelector((state) => state.workflow);
  const changes = useAppSelector((state) => state.changes);
  const issues = useAppSelector((state) => state.issues);
  const [options, setOptions] = useState<CsvExportOptions>({
    protectFormulas: true,
    quoting: 'minimal',
  });
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportWorkerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    const dataset = workflow.parsedDataset;
    const summary = issues.summary;
    const initialSummary = issues.initialSummary;
    const fileName = workflow.uploadSummary?.file.name;
    if (!dataset || !summary || !initialSummary || !fileName || changes.preview)
      return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setResult(null);
    setError(null);
    setProgress(0);
    try {
      setResult(
        await runExport(
          {
            batches: changes.applied,
            dataset,
            fileName,
            generatedAt: new Date().toISOString(),
            initialSummary,
            options,
            summary,
          },
          { onProgress: setProgress, signal: controller.signal },
        ),
      );
    } catch (reason: unknown) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : 'Не удалось подготовить экспорт.',
        );
    }
  }, [
    changes.applied,
    changes.preview,
    issues.initialSummary,
    issues.summary,
    options,
    runExport,
    workflow.parsedDataset,
    workflow.uploadSummary?.file.name,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void generate(), 0);
    return () => {
      window.clearTimeout(timeout);
      abortRef.current?.abort();
    };
  }, [generate]);

  const fileName = workflow.uploadSummary?.file.name ?? 'tablelint.csv';

  return (
    <AppShell currentStep="report">
      <section
        className={`page-boundary ${styles.screen}`}
        aria-labelledby="report-title"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Готовность данных · шаг 04</p>
            <h1 className={styles.title} id="report-title">
              Файлы готовы к передаче
            </h1>
          </div>
          <div>
            <p className={styles.lead}>
              Cleaned CSV сохраняет исходный разделитель и добавляет UTF-8 BOM
              для корректного открытия кириллицы в табличных редакторах, а JSON
              фиксирует score, counts и применённые преобразования.
            </p>
            <p className={styles.privacy}>
              <ShieldCheck aria-hidden="true" />
              <span>Экспорт создаётся локально в Dedicated Worker.</span>
            </p>
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.panel} aria-labelledby="options-title">
            <p className={styles.index}>01 · Параметры</p>
            <h2 id="options-title">Совместимость CSV</h2>
            <div className={styles.options}>
              <label>
                Quoting
                <select
                  value={options.quoting}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      quoting: event.target.value === 'all' ? 'all' : 'minimal',
                    }))
                  }
                >
                  <option value="minimal">Только когда требуется</option>
                  <option value="all">Все значения</option>
                </select>
              </label>
              <label className={styles.checkbox}>
                <input
                  checked={options.protectFormulas}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      protectFormulas: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>
                  Защищать значения, начинающиеся с =, +, − или @, ведущим
                  апострофом
                </span>
              </label>
            </div>
            <Button
              disabled={progress > 0 && progress < 100}
              onClick={() => void generate()}
              variant="secondary"
            >
              Пересобрать файлы
            </Button>
            <p className={styles.hint}>
              Разделитель:{' '}
              {workflow.parsedDataset?.delimiter === '\t'
                ? 'Tab'
                : workflow.parsedDataset?.delimiter}
            </p>
          </section>

          <section className={styles.panel} aria-labelledby="summary-title">
            <p className={styles.index}>02 · Итог</p>
            <h2 id="summary-title">Отчёт проверки</h2>
            {!result && !error ? (
              <div aria-live="polite">
                <LoaderCircle aria-hidden="true" />
                <Progress label="Подготовка экспорта" value={progress} />
              </div>
            ) : error ? (
              <div role="alert">
                <p className={styles.error}>{error}</p>
                <Button onClick={() => void generate()}>Повторить</Button>
              </div>
            ) : result ? (
              <>
                <dl className={styles.metrics}>
                  <div>
                    <dt>Score</dt>
                    <dd>{result.report.score.after}</dd>
                  </div>
                  <div>
                    <dt>Исправлено</dt>
                    <dd>{result.report.counts.fixedIssues}</dd>
                  </div>
                  <div>
                    <dt>Осталось</dt>
                    <dd>{result.report.counts.remainingIssues}</dd>
                  </div>
                </dl>
                <ul
                  className={styles.transformations}
                  aria-label="Применённые преобразования"
                >
                  {result.report.transformations.length === 0 ? (
                    <li>
                      <span>Изменения не применялись</span>
                      <strong>0</strong>
                    </li>
                  ) : (
                    result.report.transformations.map((item) => (
                      <li key={item.type}>
                        <span>{item.label}</span>
                        <strong>{item.affectedValues}</strong>
                      </li>
                    ))
                  )}
                </ul>
                <div className={styles.downloads}>
                  <Button
                    icon={<Download />}
                    onClick={() =>
                      downloadBlob(
                        result.csv,
                        'text/csv;charset=utf-8',
                        cleanedFileName(fileName),
                      )
                    }
                  >
                    Скачать cleaned CSV
                  </Button>
                  <Button
                    icon={<FileJson />}
                    onClick={() =>
                      downloadBlob(
                        JSON.stringify(result.report, null, 2),
                        'application/json;charset=utf-8',
                        reportFileName(fileName),
                      )
                    }
                    variant="secondary"
                  >
                    Скачать JSON-отчёт
                  </Button>
                </div>
              </>
            ) : null}
          </section>
        </div>
        <div className={styles.actions}>
          <Button
            icon={<ArrowLeft />}
            onClick={() => {
              dispatch(returnToWorkspace());
              void navigate('/workspace');
            }}
            variant="quiet"
          >
            Вернуться в workspace
          </Button>
          <Button onClick={() => void clearSession()} variant="quiet">
            Удалить локальную сессию
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
