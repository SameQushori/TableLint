import { AlertCircle, CheckCircle2, LoaderCircle, Table2 } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationIssue } from '@entities/issue/model/types';
import type { PatchBatch } from '@entities/patch/model/types';
import { getAppliedCellValue } from '@features/fixes/model/patchOverlay';
import {
  calculateColumnWidths,
  createCellIssueIndex,
} from '@features/workspace/model/gridModel';

import styles from './VirtualizedDataGrid.module.css';

type GridState =
  | { status: 'loading' }
  | { message: string; status: 'error' }
  | {
      dataset: ParsedDataset;
      issues: ValidationIssue[];
      status: 'ready';
    };

interface VirtualizedDataGridProps {
  appliedBatches?: PatchBatch[];
  onCellEdit?: (
    cell: {
      columnIndex: number;
      header: string;
      rowIndex: number;
      value: string;
    },
    nextValue: string,
  ) => void;
  onIssueSelect?: (issueId: string) => void;
  onCellSelect?: (cell: {
    columnIndex: number;
    header: string;
    rowIndex: number;
    value: string;
  }) => void;
  rowIndices?: number[];
  selectedIssue?: ValidationIssue | null;
  state: GridState;
}

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 46;
const ROW_NUMBER_WIDTH = 58;

export function VirtualizedDataGrid({
  appliedBatches = [],
  onCellEdit,
  onCellSelect,
  onIssueSelect,
  rowIndices,
  selectedIssue,
  state,
}: VirtualizedDataGridProps) {
  if (state.status === 'loading') {
    return (
      <GridStatePanel
        icon={<LoaderCircle className={styles.spinner} aria-hidden="true" />}
        message="Строки появятся после завершения локальной проверки."
        title="Готовим таблицу"
      />
    );
  }

  if (state.status === 'error') {
    return (
      <GridStatePanel
        icon={<AlertCircle aria-hidden="true" />}
        message={state.message}
        title="Таблица недоступна"
      />
    );
  }

  if (state.dataset.rows.length === 0) {
    return (
      <GridStatePanel
        icon={<Table2 aria-hidden="true" />}
        message="В CSV есть заголовки, но нет строк данных. Выберите другой файл."
        title="Нет строк для отображения"
      />
    );
  }

  return (
    <ReadyGrid
      dataset={state.dataset}
      issues={state.issues}
      appliedBatches={appliedBatches}
      onCellEdit={onCellEdit}
      onCellSelect={onCellSelect}
      onIssueSelect={onIssueSelect}
      rowIndices={rowIndices}
      selectedIssue={selectedIssue}
    />
  );
}

function ReadyGrid({
  dataset,
  issues,
  appliedBatches,
  onCellEdit,
  onCellSelect,
  onIssueSelect,
  rowIndices,
  selectedIssue,
}: {
  dataset: ParsedDataset;
  issues: ValidationIssue[];
  appliedBatches: PatchBatch[];
  onCellEdit:
    | ((
        cell: {
          columnIndex: number;
          header: string;
          rowIndex: number;
          value: string;
        },
        nextValue: string,
      ) => void)
    | undefined;
  onCellSelect:
    | ((cell: {
        columnIndex: number;
        header: string;
        rowIndex: number;
        value: string;
      }) => void)
    | undefined;
  onIssueSelect: ((issueId: string) => void) | undefined;
  rowIndices: number[] | undefined;
  selectedIssue: ValidationIssue | null | undefined;
}) {
  'use no memo';

  const scrollElementRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const [editingCell, setEditingCell] = useState<{
    columnIndex: number;
    originalValue: string;
    rowIndex: number;
    value: string;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState({
    columnIndex: 0,
    rowIndex: 0,
  });
  const visibleRowIndices = useMemo(
    () =>
      rowIndices ??
      Array.from({ length: dataset.rows.length }, (_, index) => index),
    [dataset.rows.length, rowIndices],
  );
  const columnWidths = useMemo(
    () => calculateColumnWidths(dataset.headers, dataset.rows),
    [dataset.headers, dataset.rows],
  );
  const cellIssueIndex = useMemo(() => createCellIssueIndex(issues), [issues]);
  const gridTemplateColumns = useMemo(
    () =>
      `${ROW_NUMBER_WIDTH}px ${columnWidths.map((width) => `${width}px`).join(' ')}`,
    [columnWidths],
  );
  const gridWidth =
    ROW_NUMBER_WIDTH + columnWidths.reduce((total, width) => total + width, 0);
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: visibleRowIndices.length,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => `row-${(visibleRowIndices[index] ?? index) + 1}`,
    getScrollElement: () => scrollElementRef.current,
    initialOffset: 0,
    initialRect: { height: 480, width: 960 },
    overscan: 6,
    paddingStart: HEADER_HEIGHT,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const scrollToIndex = rowVirtualizer.scrollToIndex;

  useEffect(() => {
    if (!selectedIssue) return;
    const visibleIndex = visibleRowIndices.indexOf(selectedIssue.rowIndex);
    if (visibleIndex < 0) return;
    scrollToIndex(visibleIndex, { align: 'center' });
    setSelectedCell((current) => {
      if (
        current.columnIndex === selectedIssue.columnIndex &&
        current.rowIndex === selectedIssue.rowIndex
      ) {
        return current;
      }
      return {
        columnIndex: selectedIssue.columnIndex,
        rowIndex: selectedIssue.rowIndex,
      };
    });
    pendingFocusRef.current = true;
  }, [scrollToIndex, selectedIssue, visibleRowIndices]);

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    const frame = requestAnimationFrame(() => {
      const selected = scrollElementRef.current?.querySelector<HTMLElement>(
        `[data-grid-cell="${selectedCell.rowIndex}:${selectedCell.columnIndex}"]`,
      );
      if (selected) {
        selected.focus();
        pendingFocusRef.current = false;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedCell, virtualRows]);

  const selectCell = (
    rowIndex: number,
    columnIndex: number,
    focus: boolean,
  ) => {
    setSelectedCell({ columnIndex, rowIndex });
    pendingFocusRef.current = focus;
    const header = dataset.headers[columnIndex];
    if (header) {
      onCellSelect?.({
        columnIndex,
        header,
        rowIndex,
        value: getAppliedCellValue(
          dataset,
          appliedBatches,
          rowIndex,
          columnIndex,
        ),
      });
    }
  };

  const startEditing = (
    rowIndex: number,
    columnIndex: number,
    value: string,
  ) => {
    if (!onCellEdit) return;
    setSelectedCell({ columnIndex, rowIndex });
    setEditingCell({ columnIndex, originalValue: value, rowIndex, value });
  };

  const finishEditing = (save: boolean) => {
    if (!editingCell) return;
    const header = dataset.headers[editingCell.columnIndex];
    if (save && header && editingCell.value !== editingCell.originalValue) {
      onCellEdit?.(
        {
          columnIndex: editingCell.columnIndex,
          header,
          rowIndex: editingCell.rowIndex,
          value: editingCell.originalValue,
        },
        editingCell.value,
      );
      setAnnouncement(
        `Значение сохранено: строка ${editingCell.rowIndex + 1}, ${header}`,
      );
    } else if (!save) {
      setAnnouncement('Редактирование отменено');
    }
    setEditingCell(null);
    pendingFocusRef.current = true;
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    rowIndex: number,
    columnIndex: number,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      startEditing(
        rowIndex,
        columnIndex,
        getAppliedCellValue(dataset, appliedBatches, rowIndex, columnIndex),
      );
      return;
    }
    if (event.key === 'PageDown' || event.key === 'PageUp') {
      const currentVisibleIndex = Math.max(
        0,
        visibleRowIndices.indexOf(rowIndex),
      );
      const direction = event.key === 'PageDown' ? 1 : -1;
      const targetVisibleIndex = Math.min(
        visibleRowIndices.length - 1,
        Math.max(0, currentVisibleIndex + direction * 10),
      );
      const targetRowIndex = visibleRowIndices[targetVisibleIndex] ?? rowIndex;
      event.preventDefault();
      rowVirtualizer.scrollToIndex(targetVisibleIndex, { align: 'center' });
      selectCell(targetRowIndex, columnIndex, true);
      setAnnouncement(
        `Строка ${targetRowIndex + 1}, ${dataset.headers[columnIndex] ?? `колонка ${columnIndex + 1}`}`,
      );
      return;
    }
    let nextRowIndex = rowIndex;
    let nextColumnIndex = columnIndex;
    switch (event.key) {
      case 'ArrowDown':
        nextRowIndex =
          visibleRowIndices[
            Math.min(
              visibleRowIndices.length - 1,
              Math.max(0, visibleRowIndices.indexOf(rowIndex) + 1),
            )
          ] ?? rowIndex;
        break;
      case 'ArrowUp':
        nextRowIndex =
          visibleRowIndices[
            Math.max(0, visibleRowIndices.indexOf(rowIndex) - 1)
          ] ?? rowIndex;
        break;
      case 'ArrowRight':
        nextColumnIndex = Math.min(dataset.headers.length - 1, columnIndex + 1);
        break;
      case 'ArrowLeft':
        nextColumnIndex = Math.max(0, columnIndex - 1);
        break;
      case 'Home':
        if (event.ctrlKey || event.metaKey) {
          nextRowIndex = visibleRowIndices[0] ?? rowIndex;
        } else {
          nextColumnIndex = 0;
        }
        break;
      case 'End':
        if (event.ctrlKey || event.metaKey) {
          nextRowIndex = visibleRowIndices.at(-1) ?? rowIndex;
        } else {
          nextColumnIndex = dataset.headers.length - 1;
        }
        break;
      default:
        return;
    }
    event.preventDefault();
    if (nextRowIndex !== rowIndex) {
      rowVirtualizer.scrollToIndex(visibleRowIndices.indexOf(nextRowIndex), {
        align: 'auto',
      });
    }
    selectCell(nextRowIndex, nextColumnIndex, true);
    setAnnouncement(
      `Строка ${nextRowIndex + 1}, ${dataset.headers[nextColumnIndex] ?? `колонка ${nextColumnIndex + 1}`}`,
    );
  };

  return (
    <section className={styles.gridSection} aria-labelledby="data-grid-title">
      <div className={styles.gridHeading}>
        <div>
          <p>04 · Данные</p>
          <h2 id="data-grid-title">Строки CSV</h2>
        </div>
        <span>
          {dataset.rowCount} строк · {dataset.headers.length} колонок
        </span>
      </div>

      {issues.length === 0 ? (
        <div className={styles.cleanState} role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>
            Проблем не найдено — все ячейки показаны без issue-маркеров.
          </span>
        </div>
      ) : (
        <p className={styles.gridHint}>
          Ячейки с проблемами отмечены цветом. Стрелки перемещают по ячейкам,
          Home/End — по строке, Ctrl+Home/End — к началу или концу, Page Up/Down
          — на десять строк. Enter открывает редактирование.
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {visibleRowIndices.length === 0 ? (
        <div className={styles.filteredEmpty} role="status">
          <AlertCircle aria-hidden="true" />
          <div>
            <strong>Строк по фильтру нет</strong>
            <span>
              Выберите другой режим строк или сбросьте группы проблем.
            </span>
          </div>
        </div>
      ) : null}

      <div
        aria-colcount={dataset.headers.length + 1}
        aria-label="Данные CSV"
        aria-rowcount={visibleRowIndices.length + 1}
        className={styles.scrollport}
        ref={scrollElementRef}
        role="grid"
        style={{
          height: `${Math.min(544, HEADER_HEIGHT + visibleRowIndices.length * ROW_HEIGHT)}px`,
        }}
        tabIndex={-1}
      >
        <div
          className={styles.virtualCanvas}
          style={
            {
              '--grid-width': `${gridWidth}px`,
              height: rowVirtualizer.getTotalSize(),
            } as CSSProperties
          }
        >
          <div
            className={styles.headerRow}
            role="row"
            style={{ gridTemplateColumns }}
          >
            <div className={styles.rowNumberHeader} role="columnheader">
              #
            </div>
            {dataset.headers.map((header) => (
              <div key={header} role="columnheader" title={header}>
                {header}
              </div>
            ))}
          </div>

          {virtualRows.map((virtualRow) => {
            const sourceRowIndex = visibleRowIndices[virtualRow.index];
            if (sourceRowIndex === undefined) return null;
            const row = dataset.rows[sourceRowIndex] ?? [];
            return (
              <div
                aria-rowindex={virtualRow.index + 2}
                className={styles.dataRow}
                data-row-index={sourceRowIndex}
                key={virtualRow.key}
                role="row"
                style={{
                  gridTemplateColumns,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className={styles.rowNumber} role="rowheader">
                  {sourceRowIndex + 1}
                </div>
                {dataset.headers.map((header, columnIndex) => {
                  const value = getAppliedCellValue(
                    dataset,
                    appliedBatches,
                    sourceRowIndex,
                    columnIndex,
                  );
                  const isPatched = value !== (row[columnIndex] ?? '');
                  const issue = cellIssueIndex.get(
                    `${sourceRowIndex}:${columnIndex}`,
                  );
                  const isSelected =
                    selectedCell.rowIndex === sourceRowIndex &&
                    selectedCell.columnIndex === columnIndex;
                  const isEditing =
                    editingCell?.rowIndex === sourceRowIndex &&
                    editingCell.columnIndex === columnIndex;
                  const issueDescription = issue
                    ? `, ${issue.count} ${issue.count === 1 ? 'проблема' : 'проблемы'}, ${issue.severity === 'error' ? 'ошибка' : 'предупреждение'}`
                    : '';
                  return (
                    <div
                      aria-label={`${header}, строка ${sourceRowIndex + 1}: ${value || 'пусто'}${issueDescription}`}
                      aria-selected={isSelected}
                      className={styles.cell}
                      data-grid-cell={`${sourceRowIndex}:${columnIndex}`}
                      data-patched={isPatched ? 'true' : undefined}
                      data-severity={issue?.severity}
                      data-selected={isSelected ? 'true' : undefined}
                      key={`${header}-${sourceRowIndex + 1}`}
                      onClick={() => {
                        selectCell(sourceRowIndex, columnIndex, false);
                        const firstIssue = issues.find(
                          (candidate) =>
                            candidate.rowIndex === sourceRowIndex &&
                            candidate.columnIndex === columnIndex,
                        );
                        if (firstIssue) onIssueSelect?.(firstIssue.id);
                      }}
                      onFocus={() =>
                        selectCell(sourceRowIndex, columnIndex, false)
                      }
                      onDoubleClick={() =>
                        startEditing(sourceRowIndex, columnIndex, value)
                      }
                      onKeyDown={(event) =>
                        handleCellKeyDown(event, sourceRowIndex, columnIndex)
                      }
                      role="gridcell"
                      tabIndex={isSelected ? 0 : -1}
                      title={value || 'Пустое значение'}
                    >
                      {isEditing ? (
                        <input
                          aria-label={`Редактировать ${header}, строка ${sourceRowIndex + 1}`}
                          autoFocus
                          className={styles.cellEditor}
                          onBlur={(event: FocusEvent<HTMLInputElement>) => {
                            if (
                              event.currentTarget.value !==
                              editingCell.originalValue
                            ) {
                              finishEditing(true);
                            } else {
                              finishEditing(false);
                            }
                          }}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setEditingCell((current) =>
                              current
                                ? { ...current, value: event.target.value }
                                : current,
                            )
                          }
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              finishEditing(true);
                            } else if (event.key === 'Escape') {
                              event.preventDefault();
                              finishEditing(false);
                            }
                          }}
                          value={editingCell.value}
                        />
                      ) : (
                        <span>{value || <em>пусто</em>}</span>
                      )}
                      {issue ? (
                        <span className={styles.issueCount} aria-hidden="true">
                          {issue.count}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GridStatePanel({
  icon,
  message,
  title,
}: {
  icon: ReactNode;
  message: string;
  title: string;
}) {
  return (
    <section className={styles.gridSection} aria-labelledby="data-grid-title">
      <div className={styles.gridHeading}>
        <div>
          <p>04 · Данные</p>
          <h2 id="data-grid-title">Строки CSV</h2>
        </div>
      </div>
      <div className={styles.statePanel} role="status">
        {icon}
        <div>
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}
