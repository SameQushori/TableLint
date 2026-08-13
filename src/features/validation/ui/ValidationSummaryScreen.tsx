import {
  AlertTriangle,
  FileDown,
  History,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Table2,
  TriangleAlert,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AppShell } from '@app/shell/AppShell';
import { openReport } from '@app/store/workflowSlice';
import { useAppDispatch, useAppSelector } from '@app/store/hooks';
import {
  issuesSelectors,
  validationCancelled,
  validationFailed,
  validationProgressed,
  validationStarted,
  validationSucceeded,
  validationUpdated,
} from '@features/validation/model/issuesSlice';
import type { DataPatch, PatchBatch } from '@entities/patch/model/types';
import {
  applyBatch,
  cancelPreview,
  redoBatch,
  startPreview,
  undoBatch,
} from '@features/fixes/model/changesSlice';
import { planSafeFixes } from '@features/fixes/model/fixPlanner';
import {
  createManualEditPatch,
  getActiveRowIndices,
  materializePatchedDataset,
} from '@features/fixes/model/patchOverlay';
import { FixPreviewDialog } from '@features/fixes/ui/FixPreviewDialog';
import { WorkspaceChangeActions } from '@features/fixes/ui/WorkspaceChangeActions';
import { revalidateAfterPatches } from '@features/validation/model/localizedRevalidation';
import { Button } from '@shared/ui/Button/Button';
import { Progress } from '@shared/ui/Progress/Progress';
import { VirtualizedDataGrid } from '@features/workspace/ui/VirtualizedDataGrid';
import {
  countIssueRows,
  createIssueRowIndex,
  createVisibleRowIndices,
  filterIssues,
  type IssueFilters,
} from '@features/workspace/model/workspaceModel';
import {
  parseWorkspaceLocation,
  serializeWorkspaceLocation,
} from '@features/workspace/model/workspaceQuery';
import {
  closeInspector,
  closeIssuePanel,
  openInspector,
  openIssuePanel,
  workspaceLocationChanged,
} from '@features/workspace/model/workspaceUiSlice';
import { WorkspaceIssueNavigator } from '@features/workspace/ui/WorkspaceIssueNavigator';
import {
  CsvWorkerError,
  validateWithWorker,
} from '@shared/workers/csvWorkerClient';

import styles from './ValidationSummaryScreen.module.css';

interface ValidationSummaryScreenProps {
  runValidation?: typeof validateWithWorker;
}

const WORKSPACE_TABS = ['data', 'issues', 'history'] as const;

export function ValidationSummaryScreen({
  runValidation: runValidationInWorker = validateWithWorker,
}: ValidationSummaryScreenProps = {}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const workflow = useAppSelector((state) => state.workflow);
  const validation = useAppSelector((state) => state.issues);
  const issues = useAppSelector(issuesSelectors.selectAll);
  const workspaceUi = useAppSelector((state) => state.workspaceUi);
  const changes = useAppSelector((state) => state.changes);
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaceTab, setWorkspaceTab] = useState<
    'data' | 'history' | 'issues'
  >('data');
  const [selectedGridCell, setSelectedGridCell] = useState<{
    columnIndex: number;
    header: string;
    rowIndex: number;
    value: string;
  } | null>(null);
  const [formulaDraft, setFormulaDraft] = useState('');
  const workspaceTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);
  const dataset = workflow.parsedDataset;
  const patchedDataset = useMemo(
    () =>
      dataset ? materializePatchedDataset(dataset, changes.applied) : null,
    [changes.applied, dataset],
  );
  const activeRowIndices = useMemo(
    () => (dataset ? getActiveRowIndices(dataset, changes.applied) : []),
    [changes.applied, dataset],
  );
  const activeRows = useMemo(
    () => new Set(activeRowIndices),
    [activeRowIndices],
  );
  const columnIds = useMemo(
    () => new Set(dataset?.columns.map((column) => column.id) ?? []),
    [dataset?.columns],
  );
  const location = useMemo(
    () => parseWorkspaceLocation(searchParams, issues, columnIds),
    [columnIds, issues, searchParams],
  );
  const groupFilteredIssues = useMemo(
    () =>
      filterIssues(issues, {
        ...location.filters,
        rowScope: 'all',
      }),
    [issues, location.filters],
  );
  const filteredIssues = useMemo(
    () => (location.filters.rowScope === 'clean' ? [] : groupFilteredIssues),
    [groupFilteredIssues, location.filters.rowScope],
  );
  const visibleRowIndices = useMemo(() => {
    const rowIssues =
      location.filters.rowScope === 'clean' ? issues : groupFilteredIssues;
    return createVisibleRowIndices(
      dataset?.rows.length ?? 0,
      createIssueRowIndex(rowIssues),
      location.filters.rowScope,
    ).filter((rowIndex) => activeRows.has(rowIndex));
  }, [
    activeRows,
    dataset?.rows.length,
    groupFilteredIssues,
    issues,
    location.filters.rowScope,
  ]);
  const selectedIssue =
    issues.find((issue) => issue.id === location.selectedIssueId) ?? null;
  const safeFixes = useMemo(
    () =>
      dataset
        ? planSafeFixes(
            dataset,
            changes.applied,
            issues,
            workflow.validationRules,
          )
        : [],
    [changes.applied, dataset, issues, workflow.validationRules],
  );
  const gridDataset = useMemo(
    () =>
      dataset && patchedDataset
        ? { ...dataset, rowCount: patchedDataset.rowCount }
        : dataset,
    [dataset, patchedDataset],
  );
  const batchCounterRef = useRef(0);
  const selectWorkspaceTab = useCallback(
    (tab: (typeof WORKSPACE_TABS)[number], focus = false) => {
      setWorkspaceTab(tab);
      if (focus) {
        requestAnimationFrame(() => {
          workspaceTabRefs.current[WORKSPACE_TABS.indexOf(tab)]?.focus();
        });
      }
    },
    [],
  );

  const handleWorkspaceTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: (typeof WORKSPACE_TABS)[number],
  ) => {
    const currentIndex = WORKSPACE_TABS.indexOf(currentTab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % WORKSPACE_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex - 1 + WORKSPACE_TABS.length) % WORKSPACE_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = WORKSPACE_TABS.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = WORKSPACE_TABS[nextIndex];
    if (nextTab) selectWorkspaceTab(nextTab, true);
  };

  const createBatch = useCallback(
    (
      label: string,
      patches: DataPatch[],
      source: PatchBatch['source'],
    ): PatchBatch => {
      batchCounterRef.current += 1;
      return {
        id: `change-${batchCounterRef.current}`,
        label,
        patches,
        source,
      };
    },
    [],
  );

  const updateValidationFor = useCallback(
    (nextApplied: PatchBatch[], patches: DataPatch[]) => {
      if (!dataset) return;
      dispatch(
        validationUpdated(
          revalidateAfterPatches(
            dataset,
            nextApplied,
            issues,
            workflow.validationRules,
            patches,
          ),
        ),
      );
    },
    [dataset, dispatch, issues, workflow.validationRules],
  );

  const applyPatches = useCallback(
    (patches: DataPatch[], label: string, source: PatchBatch['source']) => {
      if (patches.length === 0) return;
      const batch = createBatch(label, patches, source);
      const nextApplied = [...changes.applied, batch].slice(-50);
      dispatch(applyBatch(batch));
      updateValidationFor(nextApplied, patches);
    },
    [changes.applied, createBatch, dispatch, updateValidationFor],
  );

  const handleCellEdit = useCallback(
    (
      cell: {
        columnIndex: number;
        header: string;
        rowIndex: number;
        value: string;
      },
      value: string,
    ) => {
      if (!dataset) return;
      const patch = createManualEditPatch(
        dataset,
        changes.applied,
        cell.rowIndex,
        cell.columnIndex,
        value,
      );
      if (patch) {
        applyPatches([patch], 'Ручное изменение ячейки', 'manual');
      }
      setSelectedGridCell({ ...cell, value });
      setFormulaDraft(value);
    },
    [applyPatches, changes.applied, dataset],
  );

  const handleUndo = useCallback(() => {
    const batch = changes.applied.at(-1);
    if (!batch) return;
    const nextApplied = changes.applied.slice(0, -1);
    dispatch(undoBatch());
    updateValidationFor(nextApplied, batch.patches);
  }, [changes.applied, dispatch, updateValidationFor]);

  const handleRedo = useCallback(() => {
    const batch = changes.undone.at(-1);
    if (!batch) return;
    const nextApplied = [...changes.applied, batch].slice(-50);
    dispatch(redoBatch());
    updateValidationFor(nextApplied, batch.patches);
  }, [changes.applied, changes.undone, dispatch, updateValidationFor]);

  useEffect(() => {
    dispatch(workspaceLocationChanged(location));
    const canonical = serializeWorkspaceLocation(location).toString();
    if (canonical !== searchParams.toString()) {
      setSearchParams(canonical, { replace: true });
    }
  }, [dispatch, location, searchParams, setSearchParams]);

  const updateLocation = useCallback(
    (filters: IssueFilters, selectedIssueId?: string | null) => {
      const candidates = filterIssues(issues, filters);
      const nextIssueId =
        candidates.find((issue) => issue.id === selectedIssueId)?.id ??
        candidates[0]?.id ??
        null;
      setSearchParams(
        serializeWorkspaceLocation({ filters, selectedIssueId: nextIssueId }),
      );
    },
    [issues, setSearchParams],
  );

  const selectIssue = useCallback(
    (issueId: string) => {
      updateLocation(location.filters, issueId);
      selectWorkspaceTab('data');
      dispatch(closeIssuePanel());
      dispatch(openInspector());
    },
    [dispatch, location.filters, selectWorkspaceTab, updateLocation],
  );
  const handleCloseInspector = useCallback(
    () => dispatch(closeInspector()),
    [dispatch],
  );
  const handleCloseIssuePanel = useCallback(
    () => dispatch(closeIssuePanel()),
    [dispatch],
  );
  const handleOpenInspector = useCallback(
    () => dispatch(openInspector()),
    [dispatch],
  );
  const handleOpenIssuePanel = useCallback(
    () => dispatch(openIssuePanel()),
    [dispatch],
  );

  const navigateIssue = useCallback(
    (direction: -1 | 1) => {
      if (filteredIssues.length === 0) return;
      const currentIndex = filteredIssues.findIndex(
        (issue) => issue.id === location.selectedIssueId,
      );
      const nextIndex =
        (Math.max(0, currentIndex) + direction + filteredIssues.length) %
        filteredIssues.length;
      const nextIssue = filteredIssues[nextIndex];
      if (nextIssue) selectIssue(nextIssue.id);
    },
    [filteredIssues, location.selectedIssueId, selectIssue],
  );

  const runValidation = useCallback(async () => {
    if (!dataset) return;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    dispatch(validationStarted());

    try {
      const result = await runValidationInWorker(
        dataset,
        workflow.validationRules,
        {
          onProgress: (progress) => {
            if (attemptRef.current === attempt) {
              dispatch(validationProgressed(progress));
            }
          },
          signal: abortController.signal,
        },
      );
      if (attemptRef.current === attempt) dispatch(validationSucceeded(result));
    } catch (error: unknown) {
      if (attemptRef.current !== attempt) return;
      if (error instanceof CsvWorkerError && error.code === 'CANCELLED') {
        dispatch(validationCancelled());
      } else {
        dispatch(
          validationFailed(
            error instanceof CsvWorkerError && error.code === 'MEMORY_LIMIT'
              ? `${error.message} Закройте лишние вкладки или вернитесь к файлу меньшего размера.`
              : error instanceof CsvWorkerError
                ? error.message
                : 'Не удалось проверить CSV. Попробуйте ещё раз.',
          ),
        );
      }
    } finally {
      if (attemptRef.current === attempt) abortControllerRef.current = null;
    }
  }, [dispatch, runValidationInWorker, dataset, workflow.validationRules]);

  useEffect(() => {
    if (validation.status === 'idle') void runValidation();
  }, [runValidation, validation.status]);

  useEffect(() => {
    return () => {
      attemptRef.current += 1;
      abortControllerRef.current?.abort();
    };
  }, []);

  const summary = validation.summary;
  const fileName = workflow.uploadSummary?.file.name ?? 'CSV';

  return (
    <AppShell currentStep="workspace">
      <section
        className={`page-boundary ${styles.screen}`}
        aria-labelledby="page-title"
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Проверка данных · шаг 03</p>
            <h1 className={styles.title} id="page-title">
              {validation.status === 'complete'
                ? summary?.issueCount === 0
                  ? 'CSV готов к работе'
                  : 'Сканирование завершено'
                : 'Проверяем каждую строку'}
            </h1>
            <p className={styles.description}>
              {fileName} проверяется локально в Dedicated Worker. Исходные
              значения остаются без изменений.
            </p>
          </div>
          <div className={styles.localNote}>
            <ShieldCheck aria-hidden="true" />
            <span>Строки файла не отправляются и не журналируются</span>
          </div>
        </header>

        {validation.status === 'running' ? (
          <>
            <section className={styles.statePanel} aria-live="polite">
              <LoaderCircle className={styles.spinner} aria-hidden="true" />
              <div className={styles.stateCopy}>
                <h2>Worker выполняет проверку</h2>
                <p>
                  Строим уникальные индексы, применяем правила и считаем quality
                  score.
                </p>
                <Progress
                  label="Проверка строк CSV"
                  value={validation.progress}
                />
                <Button
                  onClick={() => abortControllerRef.current?.abort()}
                  variant="secondary"
                >
                  Отменить проверку
                </Button>
              </div>
            </section>
            <VirtualizedDataGrid state={{ status: 'loading' }} />
          </>
        ) : validation.status === 'error' ||
          validation.status === 'cancelled' ? (
          <>
            <section className={styles.statePanel} role="alert">
              <AlertTriangle aria-hidden="true" />
              <div className={styles.stateCopy}>
                <h2>
                  {validation.status === 'cancelled'
                    ? 'Проверка отменена'
                    : 'Проверка не завершена'}
                </h2>
                <p>
                  {validation.errorMessage ??
                    'Можно запустить сканирование заново без повторной настройки правил.'}
                </p>
                <Button
                  icon={<RotateCcw />}
                  onClick={() => void runValidation()}
                >
                  Повторить проверку
                </Button>
              </div>
            </section>
            <VirtualizedDataGrid
              state={{
                message:
                  validation.errorMessage ??
                  'Проверка отменена до подготовки строк.',
                status: 'error',
              }}
            />
          </>
        ) : summary ? (
          <>
            <section
              className={styles.productSummary}
              aria-label="Результат проверки"
            >
              <h2 className="sr-only" id="score-title">
                {summary.issueCount === 0
                  ? 'Проблем не найдено'
                  : `${summary.issueCount} проблем найдено`}
              </h2>
              <div className={styles.compactScore}>
                <strong>{summary.score}</strong>
                <small>/ 100</small>
                <span>Качество</span>
              </div>
              <p className="sr-only">
                Error весит 1, warning — 0,35. Вес проблем делится на{' '}
                {summary.nonEmptyCellCount} непустых ячеек; результат округлён
                до целого.
              </p>
              <dl className={styles.compactMetrics}>
                <div data-tone="danger">
                  <dt>Ошибки</dt>
                  <dd>{summary.errorCount}</dd>
                </div>
                <div data-tone="warning">
                  <dt>Предупреждения</dt>
                  <dd>{summary.warningCount}</dd>
                </div>
                <div>
                  <dt>Строки</dt>
                  <dd>{workflow.parsedDataset?.rowCount ?? 0}</dd>
                </div>
              </dl>
              <div className={styles.summaryPrivacy}>
                <ShieldCheck aria-hidden="true" />
                <span>Файл обрабатывается локально</span>
              </div>
              <div className={styles.scoreTrack} aria-hidden="true">
                <span style={{ width: `${summary.score}%` }} />
              </div>
            </section>
            <div
              className={styles.tabBar}
              role="tablist"
              aria-label="Разделы рабочей области"
            >
              <button
                aria-controls="workspace-panel-data"
                aria-selected={workspaceTab === 'data'}
                id="workspace-tab-data"
                onClick={() => selectWorkspaceTab('data')}
                onKeyDown={(event) => handleWorkspaceTabKeyDown(event, 'data')}
                ref={(element) => {
                  workspaceTabRefs.current[0] = element;
                }}
                role="tab"
                tabIndex={workspaceTab === 'data' ? 0 : -1}
                type="button"
              >
                <Table2 aria-hidden="true" />
                Данные <strong>{gridDataset?.rowCount ?? 0}</strong>
              </button>
              <button
                aria-controls="workspace-panel-issues"
                aria-selected={workspaceTab === 'issues'}
                id="workspace-tab-issues"
                onClick={() => selectWorkspaceTab('issues')}
                onKeyDown={(event) =>
                  handleWorkspaceTabKeyDown(event, 'issues')
                }
                ref={(element) => {
                  workspaceTabRefs.current[1] = element;
                }}
                role="tab"
                tabIndex={workspaceTab === 'issues' ? 0 : -1}
                type="button"
              >
                <TriangleAlert aria-hidden="true" />
                Проблемы <strong>{issues.length}</strong>
              </button>
              <button
                aria-controls="workspace-panel-history"
                aria-selected={workspaceTab === 'history'}
                id="workspace-tab-history"
                onClick={() => selectWorkspaceTab('history')}
                onKeyDown={(event) =>
                  handleWorkspaceTabKeyDown(event, 'history')
                }
                ref={(element) => {
                  workspaceTabRefs.current[2] = element;
                }}
                role="tab"
                tabIndex={workspaceTab === 'history' ? 0 : -1}
                type="button"
              >
                <History aria-hidden="true" />
                История <strong>{changes.applied.length}</strong>
              </button>
            </div>
            {dataset && workspaceTab === 'issues' ? (
              <div
                aria-labelledby="workspace-tab-issues"
                className={styles.workspaceTabPanel}
                id="workspace-panel-issues"
                role="tabpanel"
              >
                <WorkspaceIssueNavigator
                  allIssues={issues}
                  dataset={patchedDataset ?? dataset}
                  filters={location.filters}
                  filteredIssues={filteredIssues}
                  inspectorOpen={workspaceUi.inspectorOpen}
                  issueRowCount={countIssueRows(groupFilteredIssues)}
                  leftPanelOpen={workspaceUi.leftPanelOpen}
                  onCloseInspector={handleCloseInspector}
                  onCloseIssuePanel={handleCloseIssuePanel}
                  onFiltersChange={(filters) => updateLocation(filters)}
                  onNextIssue={() => navigateIssue(1)}
                  onOpenInspector={handleOpenInspector}
                  onOpenIssuePanel={handleOpenIssuePanel}
                  onPreviousIssue={() => navigateIssue(-1)}
                  onSelectIssue={selectIssue}
                  selectedIssue={selectedIssue}
                />
              </div>
            ) : null}
            {workspaceTab === 'history' ? (
              <section
                aria-labelledby="workspace-tab-history"
                className={styles.historyPanel}
                id="workspace-panel-history"
                role="tabpanel"
              >
                <div className={styles.historyHeading}>
                  <div>
                    <p className={styles.sectionIndex}>Обратимые изменения</p>
                    <h2>История правок</h2>
                  </div>
                  <Button
                    aria-label="Undo"
                    disabled={changes.applied.length === 0}
                    onClick={handleUndo}
                    variant="secondary"
                  >
                    Отменить последнее
                  </Button>
                </div>
                {changes.applied.length === 0 ? (
                  <p className={styles.historyEmpty}>
                    Изменений пока нет. Дважды кликните ячейку во вкладке
                    «Данные» или нажмите Enter.
                  </p>
                ) : (
                  <ol className={styles.historyList}>
                    {[...changes.applied].reverse().map((batch) => (
                      <li key={batch.id}>
                        <span>{batch.label}</span>
                        <strong>{batch.patches.length} patch</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ) : null}
            {workspaceTab === 'data' ? (
              <section
                aria-labelledby="workspace-tab-data"
                className={styles.editorWorkbench}
                id="workspace-panel-data"
                aria-label="Редактор CSV"
                role="tabpanel"
              >
                <div
                  className={styles.formulaBar}
                  aria-label="Строка редактирования"
                >
                  <span>
                    {selectedGridCell
                      ? `${String.fromCharCode(65 + selectedGridCell.columnIndex)}${selectedGridCell.rowIndex + 1}`
                      : 'A1'}
                  </span>
                  <strong aria-hidden="true">fx</strong>
                  <input
                    aria-label="Значение выбранной ячейки"
                    disabled={!selectedGridCell}
                    onChange={(event) => setFormulaDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        selectedGridCell &&
                        formulaDraft !== selectedGridCell.value
                      ) {
                        handleCellEdit(selectedGridCell, formulaDraft);
                      } else if (event.key === 'Escape' && selectedGridCell) {
                        setFormulaDraft(selectedGridCell.value);
                      }
                    }}
                    placeholder="Выберите ячейку для редактирования"
                    value={formulaDraft}
                  />
                </div>
                <WorkspaceChangeActions
                  appliedCount={changes.applied.length}
                  canRedo={changes.undone.length > 0}
                  canUndo={changes.applied.length > 0}
                  fixCount={safeFixes.length}
                  onPreview={() =>
                    dispatch(
                      startPreview(
                        createBatch(
                          'Безопасные исправления',
                          safeFixes,
                          'safeFix',
                        ),
                      ),
                    )
                  }
                  onRedo={handleRedo}
                  onUndo={handleUndo}
                />
                <VirtualizedDataGrid
                  appliedBatches={changes.applied}
                  onCellEdit={handleCellEdit}
                  onCellSelect={(cell) => {
                    setSelectedGridCell(cell);
                    setFormulaDraft(cell.value);
                  }}
                  onIssueSelect={selectIssue}
                  rowIndices={visibleRowIndices}
                  selectedIssue={selectedIssue}
                  state={
                    gridDataset
                      ? {
                          dataset: gridDataset,
                          issues,
                          status: 'ready',
                        }
                      : {
                          message: 'Набор данных больше недоступен.',
                          status: 'error',
                        }
                  }
                />
                <section
                  className={styles.exportCallout}
                  aria-label="Экспорт результата"
                >
                  <div>
                    <p className={styles.sectionIndex}>04 · Экспорт</p>
                    <strong>Правки сохранены локально</strong>
                    <span>
                      Перейдите к cleaned CSV и проверяемому JSON-отчёту.
                    </span>
                  </div>
                  <Button
                    disabled={changes.preview !== null}
                    icon={<FileDown />}
                    onClick={() => {
                      dispatch(openReport());
                      void navigate('/report');
                    }}
                  >
                    Перейти к экспорту
                  </Button>
                </section>
              </section>
            ) : null}
          </>
        ) : null}
        {dataset ? (
          <>
            <FixPreviewDialog
              dataset={dataset}
              onApply={(patches) =>
                applyPatches(
                  patches,
                  'Выбранные безопасные исправления',
                  'safeFix',
                )
              }
              onClose={() => dispatch(cancelPreview())}
              preview={changes.preview}
            />
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
