import { ArrowRight, FileCheck2, TableProperties } from 'lucide-react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@app/store/hooks';
import {
  completeRuleSetup,
  updateRuleSetupColumn,
} from '@app/store/workflowSlice';
import type {
  DateFormat,
  InferredColumnType,
  RuleSetupColumnDraft,
} from '@entities/column/model/types';
import {
  countEnabledRules,
  validateRuleConfiguration,
  type RuleConfigurationError,
} from '@features/schema-setup/model/ruleConfiguration';
import { Button } from '@shared/ui/Button/Button';

import styles from './RuleSetupScreen.module.css';

interface RuleSetupScreenProps {
  onChooseAnother: () => void;
}

const TYPE_LABELS: Record<InferredColumnType, string> = {
  date: 'Дата',
  email: 'Email',
  number: 'Число',
  string: 'Текст',
};

const DATE_FORMATS: readonly DateFormat[] = [
  'YYYY-MM-DD',
  'DD.MM.YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDelimiter(delimiter: ',' | ';' | '\t' | '|') {
  return delimiter === '\t' ? 'Tab' : delimiter;
}

function errorFor(
  errors: RuleConfigurationError[],
  columnId: string,
  field: RuleConfigurationError['field'],
) {
  return errors.find(
    (error) => error.columnId === columnId && error.field === field,
  )?.message;
}

export function RuleSetupScreen({ onChooseAnother }: RuleSetupScreenProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const workflow = useAppSelector((state) => state.workflow);
  const dataset = workflow.parsedDataset;
  const drafts = workflow.ruleSetupColumns;
  const [selectedColumnId, setSelectedColumnId] = useState(
    drafts[0]?.columnId ?? '',
  );
  const [errors, setErrors] = useState<RuleConfigurationError[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const selectedDraft = useMemo(
    () => drafts.find((column) => column.columnId === selectedColumnId),
    [drafts, selectedColumnId],
  );
  const selectedColumn = dataset?.columns.find(
    (column) => column.id === selectedColumnId,
  );

  if (
    !dataset ||
    !workflow.uploadSummary ||
    !selectedDraft ||
    !selectedColumn
  ) {
    return null;
  }

  const updateDraft = (next: RuleSetupColumnDraft) => {
    dispatch(updateRuleSetupColumn(next));
    setErrors((current) =>
      current.filter((error) => error.columnId !== next.columnId),
    );
  };

  const patchRules = (rules: RuleSetupColumnDraft['rules']) =>
    updateDraft({ ...selectedDraft, rules });

  const submit = async () => {
    const result = validateRuleConfiguration(drafts);
    if (!result.success) {
      setErrors(result.errors);
      setSelectedColumnId(result.errors[0]?.columnId ?? selectedColumnId);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    dispatch(
      completeRuleSetup({ columns: result.columns, rules: result.rules }),
    );
    await navigate('/workspace');
  };

  return (
    <div className={styles.screen}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>Настройка правил · шаг 02</p>
          <h1 className={styles.title} id="page-title">
            Подтвердите схему
          </h1>
          <p className={styles.description}>
            Проверьте первые строки, уточните типы и включите правила перед
            локальным сканированием.
          </p>
        </div>
        <aside className={styles.fileSummary} aria-label="Сводка файла">
          <FileCheck2 aria-hidden="true" />
          <div>
            <strong>{workflow.uploadSummary.file.name}</strong>
            <span>
              {formatBytes(workflow.uploadSummary.file.size)} ·{' '}
              {dataset.rowCount} строк · {dataset.headers.length} колонок ·{' '}
              {formatDelimiter(dataset.delimiter)}
            </span>
          </div>
        </aside>
      </header>

      <section className={styles.preview} aria-labelledby="preview-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionIndex}>01</p>
            <h2 id="preview-title">Первые строки</h2>
          </div>
          <span>
            {Math.min(dataset.previewRows.length, 8)} из {dataset.rowCount}
          </span>
        </div>
        <div className={styles.tableScroller} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                {dataset.headers.map((header) => (
                  <th scope="col" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataset.previewRows.map((row, rowIndex) => (
                <tr key={`preview-${rowIndex + 1}`}>
                  <th scope="row">{rowIndex + 1}</th>
                  {dataset.headers.map((header, columnIndex) => (
                    <td key={`${header}-${rowIndex + 1}`}>
                      {row[columnIndex] || (
                        <span className={styles.empty}>пусто</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.rulesSection} aria-labelledby="rules-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionIndex}>02</p>
            <h2 id="rules-title">Колонки и правила</h2>
          </div>
          <span>Изменения сохраняются в текущей сессии</span>
        </div>

        {errors.length > 0 ? (
          <div
            className={styles.errorSummary}
            ref={errorSummaryRef}
            role="alert"
            tabIndex={-1}
          >
            <strong>Проверку пока нельзя запустить</strong>
            <p>Исправьте настройки отмеченной колонки: {errors[0]?.message}</p>
          </div>
        ) : null}

        <div className={styles.ruleWorkbench}>
          <nav className={styles.columnList} aria-label="Колонки CSV">
            {dataset.columns.map((column) => {
              const draft = drafts.find((item) => item.columnId === column.id);
              if (!draft) return null;
              const enabledCount = countEnabledRules(draft);
              return (
                <button
                  aria-current={
                    column.id === selectedColumnId ? 'true' : undefined
                  }
                  className={
                    column.id === selectedColumnId ? styles.selectedColumn : ''
                  }
                  key={column.id}
                  onClick={() => setSelectedColumnId(column.id)}
                  type="button"
                >
                  <span>
                    <strong>{column.header}</strong>
                    <small>
                      {TYPE_LABELS[draft.type]} ·{' '}
                      {Math.round(column.confidence * 100)}% confidence
                    </small>
                  </span>
                  <span className={styles.ruleCount}>{enabledCount}</span>
                </button>
              );
            })}
          </nav>

          <div className={styles.editor} aria-labelledby="editor-title">
            <div className={styles.editorHeader}>
              <div>
                <p>Колонка</p>
                <h3 id="editor-title">{selectedColumn.header}</h3>
              </div>
              <label className={styles.typeField}>
                <span>Тип данных</span>
                <select
                  value={selectedDraft.type}
                  onChange={(event) =>
                    updateDraft({
                      ...selectedDraft,
                      type: event.target.value as InferredColumnType,
                    })
                  }
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.ruleGrid}>
              <RuleToggle
                checked={selectedDraft.rules.required.enabled}
                description="Значение не пустое после удаления крайних пробелов."
                label="Обязательное значение"
                onChange={(enabled) =>
                  patchRules({ ...selectedDraft.rules, required: { enabled } })
                }
              />
              <RuleToggle
                checked={selectedDraft.rules.unique.enabled}
                description="Непустое значение не повторяется в колонке."
                label="Уникальное значение"
                onChange={(enabled) =>
                  patchRules({ ...selectedDraft.rules, unique: { enabled } })
                }
              />
              <RuleToggle
                checked={selectedDraft.rules.email.enabled}
                description="Практическая проверка структуры email."
                label="Формат email"
                onChange={(enabled) =>
                  patchRules({ ...selectedDraft.rules, email: { enabled } })
                }
              />
              <RuleToggle
                checked={selectedDraft.rules.number.enabled}
                description="Конечное число с выбранным десятичным знаком."
                label="Формат числа"
                onChange={(enabled) =>
                  patchRules({
                    ...selectedDraft.rules,
                    number: { ...selectedDraft.rules.number, enabled },
                  })
                }
              >
                <label className={styles.inlineField}>
                  <span>Десятичный знак</span>
                  <select
                    disabled={!selectedDraft.rules.number.enabled}
                    value={selectedDraft.rules.number.decimalSeparator}
                    onChange={(event) =>
                      patchRules({
                        ...selectedDraft.rules,
                        number: {
                          ...selectedDraft.rules.number,
                          decimalSeparator: event.target.value as '.' | ',',
                        },
                      })
                    }
                  >
                    <option value=".">Точка (12.5)</option>
                    <option value=",">Запятая (12,5)</option>
                  </select>
                </label>
              </RuleToggle>

              <RuleToggle
                checked={selectedDraft.rules.date.enabled}
                description="Значение соответствует одному из явных форматов."
                label="Формат даты"
                onChange={(enabled) =>
                  patchRules({
                    ...selectedDraft.rules,
                    date: { ...selectedDraft.rules.date, enabled },
                  })
                }
              >
                <fieldset
                  className={styles.formatChoices}
                  disabled={!selectedDraft.rules.date.enabled}
                >
                  <legend>Допустимые форматы</legend>
                  {DATE_FORMATS.map((format) => (
                    <label key={format}>
                      <input
                        checked={selectedDraft.rules.date.formats.includes(
                          format,
                        )}
                        onChange={(event) => {
                          const formats = event.target.checked
                            ? [...selectedDraft.rules.date.formats, format]
                            : selectedDraft.rules.date.formats.filter(
                                (value) => value !== format,
                              );
                          patchRules({
                            ...selectedDraft.rules,
                            date: { ...selectedDraft.rules.date, formats },
                          });
                        }}
                        type="checkbox"
                      />
                      {format}
                    </label>
                  ))}
                </fieldset>
                <FieldError
                  message={errorFor(errors, selectedDraft.columnId, 'date')}
                />
              </RuleToggle>

              <RuleToggle
                checked={selectedDraft.rules.allowedValues.enabled}
                description="Значение входит в заданный список без повторов."
                label="Разрешённые значения"
                onChange={(enabled) =>
                  patchRules({
                    ...selectedDraft.rules,
                    allowedValues: {
                      ...selectedDraft.rules.allowedValues,
                      enabled,
                    },
                  })
                }
              >
                <label className={styles.stackField}>
                  <span>По одному значению на строку</span>
                  <textarea
                    disabled={!selectedDraft.rules.allowedValues.enabled}
                    onChange={(event) =>
                      patchRules({
                        ...selectedDraft.rules,
                        allowedValues: {
                          ...selectedDraft.rules.allowedValues,
                          rawValues: event.target.value,
                        },
                      })
                    }
                    rows={4}
                    value={selectedDraft.rules.allowedValues.rawValues}
                  />
                </label>
                <FieldError
                  message={errorFor(
                    errors,
                    selectedDraft.columnId,
                    'allowedValues',
                  )}
                />
              </RuleToggle>

              <RuleToggle
                checked={selectedDraft.rules.minLength.enabled}
                description="Минимальная длина нормализованной строки."
                label="Минимальная длина"
                onChange={(enabled) =>
                  patchRules({
                    ...selectedDraft.rules,
                    minLength: { ...selectedDraft.rules.minLength, enabled },
                  })
                }
              >
                <label className={styles.inlineField}>
                  <span>Символов</span>
                  <input
                    disabled={!selectedDraft.rules.minLength.enabled}
                    inputMode="numeric"
                    min="0"
                    onChange={(event) =>
                      patchRules({
                        ...selectedDraft.rules,
                        minLength: {
                          ...selectedDraft.rules.minLength,
                          value: event.target.value,
                        },
                      })
                    }
                    type="number"
                    value={selectedDraft.rules.minLength.value}
                  />
                </label>
                <FieldError
                  message={errorFor(
                    errors,
                    selectedDraft.columnId,
                    'minLength',
                  )}
                />
              </RuleToggle>

              <RuleToggle
                checked={selectedDraft.rules.maxLength.enabled}
                description="Максимальная длина нормализованной строки."
                label="Максимальная длина"
                onChange={(enabled) =>
                  patchRules({
                    ...selectedDraft.rules,
                    maxLength: { ...selectedDraft.rules.maxLength, enabled },
                  })
                }
              >
                <label className={styles.inlineField}>
                  <span>Символов</span>
                  <input
                    disabled={!selectedDraft.rules.maxLength.enabled}
                    inputMode="numeric"
                    min="0"
                    onChange={(event) =>
                      patchRules({
                        ...selectedDraft.rules,
                        maxLength: {
                          ...selectedDraft.rules.maxLength,
                          value: event.target.value,
                        },
                      })
                    }
                    type="number"
                    value={selectedDraft.rules.maxLength.value}
                  />
                </label>
                <FieldError
                  message={errorFor(
                    errors,
                    selectedDraft.columnId,
                    'maxLength',
                  )}
                />
              </RuleToggle>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <TableProperties aria-hidden="true" />
          <p>
            <strong>
              {drafts.reduce((sum, draft) => sum + countEnabledRules(draft), 0)}{' '}
              правил включено
            </strong>
            <span>Исходные строки остаются без изменений.</span>
          </p>
        </div>
        <div className={styles.actions}>
          <Button onClick={onChooseAnother} variant="secondary">
            Другой файл
          </Button>
          <Button icon={<ArrowRight />} onClick={() => void submit()}>
            Запустить проверку
          </Button>
        </div>
      </footer>
    </div>
  );
}

interface RuleToggleProps {
  checked: boolean;
  children?: ReactNode;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}

function RuleToggle({
  checked,
  children,
  description,
  label,
  onChange,
}: RuleToggleProps) {
  return (
    <section className={`${styles.rule} ${checked ? styles.ruleEnabled : ''}`}>
      <label className={styles.ruleToggle}>
        <input
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </label>
      {children ? <div className={styles.ruleOptions}>{children}</div> : null}
    </section>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className={styles.fieldError}>{message}</p> : null;
}
