import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ListFilter,
  PanelLeftClose,
  PanelRightClose,
  SearchX,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationIssue } from '@entities/issue/model/types';
import type {
  IssueFilters,
  RowScope,
} from '@features/workspace/model/workspaceModel';
import { RULE_LABELS } from '@features/workspace/model/workspaceLabels';
import { Button } from '@shared/ui/Button/Button';
import { useMediaQuery } from '@shared/lib/useMediaQuery';

import styles from './WorkspaceIssueNavigator.module.css';

const ROW_SCOPE_LABELS: Record<RowScope, string> = {
  all: 'Все строки',
  clean: 'Без проблем',
  issues: 'С проблемами',
};

interface WorkspaceIssueNavigatorProps {
  allIssues: ValidationIssue[];
  dataset: ParsedDataset;
  filters: IssueFilters;
  filteredIssues: ValidationIssue[];
  inspectorOpen: boolean;
  issueRowCount: number;
  leftPanelOpen: boolean;
  onCloseInspector: () => void;
  onCloseIssuePanel: () => void;
  onFiltersChange: (filters: IssueFilters) => void;
  onNextIssue: () => void;
  onOpenInspector: () => void;
  onOpenIssuePanel: () => void;
  onPreviousIssue: () => void;
  onSelectIssue: (issueId: string) => void;
  selectedIssue: ValidationIssue | null;
}

export function WorkspaceIssueNavigator({
  allIssues,
  dataset,
  filters,
  filteredIssues,
  inspectorOpen,
  issueRowCount,
  leftPanelOpen,
  onCloseInspector,
  onCloseIssuePanel,
  onFiltersChange,
  onNextIssue,
  onOpenInspector,
  onOpenIssuePanel,
  onPreviousIssue,
  onSelectIssue,
  selectedIssue,
}: WorkspaceIssueNavigatorProps) {
  const isDrawerLayout = useMediaQuery('(max-width: 70rem)');
  const issuePanelId = useId();
  const inspectorId = useId();
  const issuePanelRef = useRef<HTMLElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const issueTriggerRef = useRef<HTMLButtonElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);
  const openDrawer = leftPanelOpen
    ? 'issues'
    : inspectorOpen
      ? 'inspector'
      : null;

  useEffect(() => {
    if (!isDrawerLayout || !openDrawer) return undefined;
    const drawer =
      openDrawer === 'issues' ? issuePanelRef.current : inspectorRef.current;
    const trigger =
      openDrawer === 'issues'
        ? issueTriggerRef.current
        : inspectorTriggerRef.current;
    const close =
      openDrawer === 'issues' ? onCloseIssuePanel : onCloseInspector;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = drawer?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isDrawerLayout, onCloseInspector, onCloseIssuePanel, openDrawer]);

  const selectedPosition = selectedIssue
    ? filteredIssues.findIndex((issue) => issue.id === selectedIssue.id)
    : -1;
  const ruleCounts = countBy(allIssues, (issue) => issue.ruleType);
  const columnCounts = countBy(allIssues, (issue) => issue.columnId);
  const cleanRowCount =
    dataset.rowCount - new Set(allIssues.map((issue) => issue.rowIndex)).size;

  const changeFilter = <Key extends keyof IssueFilters>(
    key: Key,
    value: IssueFilters[Key],
  ) => onFiltersChange({ ...filters, [key]: value });

  return (
    <section className={styles.workbench} aria-labelledby="workbench-title">
      <div className={styles.toolbar}>
        <div>
          <p>03 · Поиск проблем</p>
          <h2 id="workbench-title">Рабочая область</h2>
        </div>
        <div className={styles.drawerButtons}>
          <Button
            aria-controls={issuePanelId}
            aria-expanded={leftPanelOpen}
            icon={<ListFilter />}
            onClick={onOpenIssuePanel}
            ref={issueTriggerRef}
            variant="secondary"
          >
            Проблемы
          </Button>
          <Button
            aria-controls={inspectorId}
            aria-expanded={inspectorOpen}
            disabled={!selectedIssue}
            icon={<Filter />}
            onClick={onOpenInspector}
            ref={inspectorTriggerRef}
            variant="secondary"
          >
            Инспектор
          </Button>
        </div>
      </div>

      {isDrawerLayout && openDrawer ? (
        <button
          aria-label="Закрыть боковую панель"
          className={styles.backdrop}
          onClick={
            openDrawer === 'issues' ? onCloseIssuePanel : onCloseInspector
          }
          type="button"
        />
      ) : null}

      <div className={styles.rowFilters} aria-label="Фильтр строк" role="group">
        {(Object.keys(ROW_SCOPE_LABELS) as RowScope[]).map((scope) => {
          const count =
            scope === 'all'
              ? dataset.rowCount
              : scope === 'issues'
                ? issueRowCount
                : cleanRowCount;
          return (
            <button
              aria-pressed={filters.rowScope === scope}
              key={scope}
              onClick={() => changeFilter('rowScope', scope)}
              type="button"
            >
              <span>{ROW_SCOPE_LABELS[scope]}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      <div className={styles.columns}>
        <aside
          aria-label="Группы проблем"
          aria-modal={isDrawerLayout && leftPanelOpen ? 'true' : undefined}
          className={styles.issuePanel}
          data-open={leftPanelOpen ? 'true' : undefined}
          id={issuePanelId}
          ref={issuePanelRef}
          role={isDrawerLayout && leftPanelOpen ? 'dialog' : undefined}
        >
          <div className={styles.drawerHeading}>
            <div>
              <p>Фильтры</p>
              <h3>Группы проблем</h3>
            </div>
            <button
              aria-label="Закрыть группы проблем"
              className={styles.closeButton}
              onClick={onCloseIssuePanel}
              type="button"
            >
              <PanelLeftClose aria-hidden="true" />
            </button>
          </div>

          <FilterGroup
            activeValue={filters.ruleType}
            allLabel="Все правила"
            counts={ruleCounts}
            labels={RULE_LABELS}
            onChange={(value) =>
              changeFilter(
                'ruleType',
                value as ValidationIssue['ruleType'] | null,
              )
            }
            title="По правилам"
          />
          <FilterGroup
            activeValue={filters.columnId}
            allLabel="Все колонки"
            counts={columnCounts}
            labels={Object.fromEntries(
              dataset.columns.map((column) => [column.id, column.header]),
            )}
            onChange={(value) => changeFilter('columnId', value)}
            title="По колонкам"
          />
        </aside>

        <div className={styles.issueList}>
          <div className={styles.listHeading}>
            <div>
              <p>Найдено по фильтрам</p>
              <strong>{filteredIssues.length}</strong>
            </div>
            {filters.ruleType || filters.columnId ? (
              <button
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    columnId: null,
                    ruleType: null,
                  })
                }
                type="button"
              >
                <X aria-hidden="true" /> Сбросить группы
              </button>
            ) : null}
          </div>

          {allIssues.length === 0 ? (
            <EmptyList
              message="Сканирование не нашло проблем. Можно просмотреть все строки или строки без замечаний."
              title="Датасет чист"
            />
          ) : filteredIssues.length === 0 ? (
            <EmptyList
              message="Измените фильтр строк, правила или колонки — исходные данные остаются на месте."
              title="Нет совпадений"
            />
          ) : (
            <ol aria-label="Проблемы по текущим фильтрам">
              {filteredIssues.map((issue) => {
                const header =
                  dataset.headers[issue.columnIndex] ?? issue.columnId;
                return (
                  <li key={issue.id}>
                    <button
                      aria-current={
                        selectedIssue?.id === issue.id ? 'true' : undefined
                      }
                      onClick={() => onSelectIssue(issue.id)}
                      type="button"
                    >
                      <span className={styles.issueMeta}>
                        Строка {issue.rowIndex + 1} · {header}
                      </span>
                      <strong>{RULE_LABELS[issue.ruleType]}</strong>
                      <span>{issue.message}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <aside
          aria-label="Инспектор проблемы"
          aria-modal={isDrawerLayout && inspectorOpen ? 'true' : undefined}
          className={styles.inspector}
          data-open={inspectorOpen ? 'true' : undefined}
          id={inspectorId}
          ref={inspectorRef}
          role={isDrawerLayout && inspectorOpen ? 'dialog' : undefined}
        >
          <div className={styles.drawerHeading}>
            <div>
              <p>Инспектор</p>
              <h3>Выбранная проблема</h3>
            </div>
            <button
              aria-label="Закрыть инспектор"
              className={styles.closeButton}
              onClick={onCloseInspector}
              type="button"
            >
              <PanelRightClose aria-hidden="true" />
            </button>
          </div>

          {selectedIssue ? (
            <>
              <div className={styles.issueNavigation}>
                <button
                  aria-label="Предыдущая проблема"
                  disabled={filteredIssues.length < 2}
                  onClick={onPreviousIssue}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" />
                </button>
                <span>
                  {selectedPosition + 1} из {filteredIssues.length}
                </span>
                <button
                  aria-label="Следующая проблема"
                  disabled={filteredIssues.length < 2}
                  onClick={onNextIssue}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
              <dl className={styles.inspectorDetails}>
                <div>
                  <dt>Координаты</dt>
                  <dd>
                    Строка {selectedIssue.rowIndex + 1},{' '}
                    {dataset.headers[selectedIssue.columnIndex]}
                  </dd>
                </div>
                <div>
                  <dt>Правило</dt>
                  <dd>{RULE_LABELS[selectedIssue.ruleType]}</dd>
                </div>
                <div>
                  <dt>Исходное значение</dt>
                  <dd className={styles.originalValue}>
                    {selectedIssue.originalValue || 'пусто'}
                  </dd>
                </div>
                <div>
                  <dt>Сообщение</dt>
                  <dd>{selectedIssue.message}</dd>
                </div>
              </dl>
              <div className={styles.fixNote}>
                <Wrench aria-hidden="true" />
                <span>
                  {selectedIssue.suggestedFix
                    ? 'Для проблемы доступно безопасное исправление. Откройте Preview fixes и выберите его перед применением.'
                    : 'Автоматическое исправление не предлагается — значение потребует ручной проверки.'}
                </span>
              </div>
            </>
          ) : (
            <EmptyList
              message="Выберите проблему в списке, чтобы увидеть правило и исходное значение."
              title="Проблема не выбрана"
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function FilterGroup({
  activeValue,
  allLabel,
  counts,
  labels,
  onChange,
  title,
}: {
  activeValue: string | null;
  allLabel: string;
  counts: Record<string, number>;
  labels: Record<string, string>;
  onChange: (value: string | null) => void;
  title: string;
}) {
  return (
    <div className={styles.filterGroup}>
      <h4>{title}</h4>
      <ul>
        <li>
          <button
            aria-pressed={activeValue === null}
            onClick={() => onChange(null)}
            type="button"
          >
            <span>{allLabel}</span>
            <strong>
              {Object.values(counts).reduce((sum, count) => sum + count, 0)}
            </strong>
          </button>
        </li>
        {Object.entries(counts).map(([value, count]) => (
          <li key={value}>
            <button
              aria-pressed={activeValue === value}
              onClick={() => onChange(value)}
              type="button"
            >
              <span>{labels[value] ?? value}</span>
              <strong>{count}</strong>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyList({ message, title }: { message: string; title: string }) {
  return (
    <div className={styles.emptyList} role="status">
      <SearchX aria-hidden="true" />
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

function countBy(
  issues: ValidationIssue[],
  getKey: (issue: ValidationIssue) => string,
) {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    const key = getKey(issue);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
