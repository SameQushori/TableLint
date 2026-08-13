import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '@app/store/hooks';
import { replaceWorkflow } from '@app/store/workflowSlice';
import { replaceChanges } from '@features/fixes/model/changesSlice';
import {
  clearSession,
  loadSession,
} from '@features/session-recovery/model/sessionRepository';
import type { PersistedSession } from '@features/session-recovery/model/sessionSchema';
import { validationRestored } from '@features/validation/model/issuesSlice';
import { replaceWorkspaceUi } from '@features/workspace/model/workspaceUiSlice';
import { Button } from '@shared/ui/Button/Button';
import { Dialog } from '@shared/ui/Dialog/Dialog';

import styles from './SessionRecoveryDialog.module.css';

export function SessionRecoveryDialog() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [session, setSession] = useState<PersistedSession | null>(null);

  useEffect(() => {
    if (typeof indexedDB === 'undefined') return undefined;
    let active = true;
    void loadSession().then((stored) => {
      if (active) setSession(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const discard = async () => {
    await clearSession();
    setSession(null);
  };

  if (!session) return null;

  return (
    <Dialog
      description="Данные хранятся только в IndexedDB этого браузера. Можно продолжить работу или безвозвратно удалить локальную копию."
      onClose={() => setSession(null)}
      open
      title="Восстановить последнюю сессию?"
    >
      <dl className={styles.details}>
        <div>
          <dt>Файл</dt>
          <dd>{session.workflow.uploadSummary?.file.name}</dd>
        </div>
        <div>
          <dt>Сохранено</dt>
          <dd>{new Date(session.savedAt).toLocaleString('ru-RU')}</dd>
        </div>
        <div>
          <dt>Осталось проблем</dt>
          <dd>{session.summary.issueCount}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <Button onClick={() => void discard()} variant="quiet">
          Удалить локальную сессию
        </Button>
        <Button
          onClick={() => {
            dispatch(replaceWorkflow(session.workflow));
            dispatch(replaceChanges(session.changes));
            dispatch(
              validationRestored({
                initialSummary: session.initialSummary,
                issues: session.issues,
                summary: session.summary,
              }),
            );
            dispatch(replaceWorkspaceUi(session.workspaceUi));
            void navigate(
              session.workflow.step === 'report' ? '/report' : '/workspace',
            );
          }}
        >
          Восстановить
        </Button>
      </div>
    </Dialog>
  );
}
