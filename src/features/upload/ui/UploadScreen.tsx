import {
  AlertTriangle,
  Check,
  FilePlus2,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { AppShell } from '@app/shell/AppShell';
import { useAppDispatch } from '@app/store/hooks';
import { startUploadSession } from '@app/store/workflowSlice';
import type { FileMeta } from '@entities/dataset/model/types';
import { validateCsvFile } from '@features/upload/model/fileValidation';
import { createSampleFile } from '@features/upload/model/sampleDataset';
import { saveUploadFile } from '@features/upload/model/uploadFileRepository';
import { Button } from '@shared/ui/Button/Button';
import { SessionRecoveryDialog } from '@features/session-recovery/ui/SessionRecoveryDialog';

import styles from './UploadScreen.module.css';

type UploadViewState =
  | { type: 'idle' }
  | {
      code: 'unsupported' | 'too-large';
      message: string;
      type: 'error';
    };

function createSessionId() {
  return crypto.randomUUID();
}

function toFileMeta(file: File): FileMeta {
  return {
    lastModified: file.lastModified,
    name: file.name,
    size: file.size,
  };
}

export function UploadScreen() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [viewState, setViewState] = useState<UploadViewState>({ type: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickerButtonRef = useRef<HTMLButtonElement>(null);
  const focusPickerAfterResetRef = useRef(false);

  useEffect(() => {
    if (viewState.type === 'idle' && focusPickerAfterResetRef.current) {
      pickerButtonRef.current?.focus();
      focusPickerAfterResetRef.current = false;
    }
  }, [viewState.type]);

  const processFile = useCallback(
    (file: File) => {
      const guard = validateCsvFile(file);
      if (!guard.ok) {
        setViewState({
          code: guard.code,
          message: guard.message,
          type: 'error',
        });
        return;
      }

      const sessionId = createSessionId();
      saveUploadFile(sessionId, file);
      dispatch(
        startUploadSession({
          sessionId,
          summary: {
            file: toFileMeta(file),
            provisionalRowCount: 0,
          },
        }),
      );
      void navigate('/setup');
    },
    [dispatch, navigate],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void processFile(file);
    }
  };

  const resetPicker = () => {
    focusPickerAfterResetRef.current = true;
    setViewState({ type: 'idle' });
  };

  return (
    <AppShell currentStep="upload">
      <SessionRecoveryDialog />
      <section
        className={`page-boundary ${styles.screen}`}
        aria-labelledby="page-title"
      >
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>Подготовка данных · шаг 01</p>
            <h1 className={styles.title} id="page-title">
              Проверьте CSV до импорта
            </h1>
          </div>
          <div>
            <p className={styles.lead}>
              Найдите пропуски, дубликаты и неверные форматы — спокойно,
              последовательно и без отправки файла на сервер.
            </p>
            <p className={styles.privacy}>
              <LockKeyhole aria-hidden="true" />
              <span>
                Всё происходит на этом устройстве. Содержимое файла не
                отправляется по сети.
              </span>
            </p>
          </div>
        </div>

        <div className={styles.workbench}>
          <section className={styles.primary} aria-labelledby="upload-title">
            <h2 className={styles.sectionLabel} id="upload-title">
              Выберите исходный файл
            </h2>
            <div
              className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget === event.target) {
                  setDragging(false);
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              {viewState.type === 'idle' ? (
                <div className={styles.dropContent}>
                  <span className={styles.dropIcon} aria-hidden="true">
                    <FilePlus2 />
                  </span>
                  <h3 className={styles.dropTitle}>Перетащите CSV сюда</h3>
                  <p className={styles.dropDescription}>
                    или выберите его с устройства. Принимается один файл.
                  </p>
                  <input
                    accept=".csv,text/csv"
                    aria-label="CSV файл на устройстве"
                    className={styles.fileInput}
                    id="csv-file"
                    onChange={handleInputChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  <button
                    className={styles.picker}
                    onClick={() => fileInputRef.current?.click()}
                    ref={pickerButtonRef}
                    type="button"
                  >
                    <FileText aria-hidden="true" />
                    Выбрать CSV
                  </button>
                </div>
              ) : (
                <div className={styles.errorPanel} role="alert">
                  <span className={styles.dropIcon} aria-hidden="true">
                    <AlertTriangle />
                  </span>
                  <h3 className={styles.errorTitle}>Файл не принят</h3>
                  <p className={styles.errorText}>{viewState.message}</p>
                  <div className={styles.errorActions}>
                    <Button onClick={resetPicker}>Выбрать другой</Button>
                    <Button
                      onClick={() => void processFile(createSampleFile())}
                      variant="secondary"
                    >
                      Открыть пример
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className={styles.aside} aria-labelledby="requirements-title">
            <h2 className={styles.sectionLabel} id="requirements-title">
              Перед началом
            </h2>
            <ul className={styles.requirements}>
              <li className={styles.requirement}>
                <Check aria-hidden="true" />
                <span>Формат CSV в кодировке UTF-8 или UTF-8 BOM</span>
              </li>
              <li className={styles.requirement}>
                <Check aria-hidden="true" />
                <span>Размер файла — не больше 50 МБ</span>
              </li>
              <li className={styles.requirement}>
                <ShieldCheck aria-hidden="true" />
                <span>
                  Чтение выполняется через File API без upload endpoint
                </span>
              </li>
            </ul>

            <section className={styles.sample}>
              <h3 className={styles.sampleTitle}>Нет файла под рукой?</h3>
              <p className={styles.asideText}>
                Откройте небольшой пример с типичными проблемами. Он проходит
                тот же локальный pipeline.
              </p>
              <Button
                onClick={() => void processFile(createSampleFile())}
                variant="secondary"
              >
                Использовать пример
              </Button>
            </section>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
