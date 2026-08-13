import { useState } from 'react';

import type { ParsedDataset } from '@entities/dataset/model/types';
import type { DataPatch, PatchBatch } from '@entities/patch/model/types';
import { describePatch } from '@features/fixes/model/fixPlanner';
import { Button } from '@shared/ui/Button/Button';
import { Dialog } from '@shared/ui/Dialog/Dialog';

import styles from './FixPreviewDialog.module.css';

interface FixPreviewDialogProps {
  dataset: ParsedDataset;
  onApply: (patches: DataPatch[]) => void;
  onClose: () => void;
  preview: PatchBatch | null;
}

export function FixPreviewDialog({
  dataset,
  onApply,
  onClose,
  preview,
}: FixPreviewDialogProps) {
  return (
    <Dialog
      description="Проверьте before/after. Удаление строк требует отдельного выбора."
      onClose={onClose}
      open={preview !== null}
      title="Preview безопасных исправлений"
    >
      {preview ? (
        <FixPreviewContent
          dataset={dataset}
          key={preview.id}
          onApply={onApply}
          onClose={onClose}
          preview={preview}
        />
      ) : null}
    </Dialog>
  );
}

function FixPreviewContent({
  dataset,
  onApply,
  onClose,
  preview,
}: {
  dataset: ParsedDataset;
  onApply: (patches: DataPatch[]) => void;
  onClose: () => void;
  preview: PatchBatch;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () =>
      new Set(
        preview.patches.flatMap((patch, index) =>
          patch.type === 'cell' ? [index] : [],
        ),
      ),
  );

  const selectedPatches = preview.patches.filter((_patch, index) =>
    selected.has(index),
  );

  return (
    <>
      <p className={styles.summary}>
        Предложено {preview.patches.length}; выбрано {selectedPatches.length}.
      </p>
      <ul className={styles.list}>
        {preview.patches.map((patch, index) => (
          <li key={patchKey(patch)}>
            <label>
              <input
                checked={selected.has(index)}
                onChange={(event) => {
                  setSelected((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(index);
                    else next.delete(index);
                    return next;
                  });
                }}
                type="checkbox"
              />
              <span>
                <strong>{describePatch(patch, dataset)}</strong>
                {patch.type === 'cell' ? (
                  <span className={styles.diff}>
                    <del>{patch.before || 'пусто'}</del>
                    <span aria-hidden="true">→</span>
                    <ins>{patch.after || 'пусто'}</ins>
                  </span>
                ) : (
                  <small>
                    Строка останется в base data и будет скрыта overlay‑патчем.
                  </small>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button onClick={onClose} variant="secondary">
          Отменить preview
        </Button>
        <Button
          disabled={selectedPatches.length === 0}
          onClick={() => onApply(selectedPatches)}
        >
          Применить выбранные
        </Button>
      </div>
    </>
  );
}

function patchKey(patch: DataPatch) {
  return patch.type === 'cell'
    ? `${patch.rowIndex}:${patch.columnIndex}:${patch.reason}`
    : `${patch.rowIndex}:${patch.reason}`;
}
