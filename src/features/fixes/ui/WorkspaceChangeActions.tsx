import { Redo2, RotateCcw, Sparkles, Undo2 } from 'lucide-react';

import { Button } from '@shared/ui/Button/Button';

import styles from './WorkspaceChangeActions.module.css';

export function WorkspaceChangeActions({
  appliedCount,
  canRedo,
  canUndo,
  fixCount,
  onPreview,
  onRedo,
  onUndo,
}: {
  appliedCount: number;
  canRedo: boolean;
  canUndo: boolean;
  fixCount: number;
  onPreview: () => void;
  onRedo: () => void;
  onUndo: () => void;
}) {
  return (
    <section className={styles.actions} aria-label="Изменения данных">
      <div>
        <p>Обратимые изменения</p>
        <strong>
          {appliedCount === 0
            ? 'Base rows не изменены'
            : `${appliedCount} batch в истории`}
        </strong>
      </div>
      <div className={styles.buttons}>
        <Button
          disabled={!canUndo}
          icon={<Undo2 />}
          onClick={onUndo}
          variant="secondary"
        >
          Undo
        </Button>
        <Button
          disabled={!canRedo}
          icon={<Redo2 />}
          onClick={onRedo}
          variant="secondary"
        >
          Redo
        </Button>
        <Button
          disabled={fixCount === 0}
          icon={fixCount === 0 ? <RotateCcw /> : <Sparkles />}
          onClick={onPreview}
        >
          Preview fixes · {fixCount}
        </Button>
      </div>
    </section>
  );
}
