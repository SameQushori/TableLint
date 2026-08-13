import { useEffect } from 'react';

import { useAppSelector } from '@app/store/hooks';
import { saveSession } from '@features/session-recovery/model/sessionRepository';
import { SESSION_SCHEMA_VERSION } from '@features/session-recovery/model/sessionSchema';

export function SessionPersistence() {
  const changes = useAppSelector((state) => state.changes);
  const issues = useAppSelector((state) => state.issues);
  const workflow = useAppSelector((state) => state.workflow);
  const workspaceUi = useAppSelector((state) => state.workspaceUi);

  useEffect(() => {
    if (typeof indexedDB === 'undefined') return undefined;
    if (
      !workflow.datasetReady ||
      !workflow.parsedDataset ||
      !workflow.sessionId ||
      !workflow.uploadSummary ||
      issues.status !== 'complete' ||
      !issues.summary ||
      !issues.initialSummary
    ) {
      return undefined;
    }

    const dataset = workflow.parsedDataset;
    const summary = issues.summary;
    const initialSummary = issues.initialSummary;
    const timeout = window.setTimeout(() => {
      const restoredIssues = issues.ids.flatMap((id) => {
        const issue = issues.entities[id];
        return issue ? [issue] : [];
      });
      void saveSession({
        changes: {
          applied: changes.applied,
          preview: null,
          undone: changes.undone,
        },
        initialSummary,
        issues: restoredIssues,
        savedAt: new Date().toISOString(),
        summary,
        version: SESSION_SCHEMA_VERSION,
        workflow: {
          ...workflow,
          parsedDataset: dataset,
          step: workflow.reportReady ? workflow.step : 'workspace',
        },
        workspaceUi,
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [changes, issues, workflow, workspaceUi]);

  return null;
}
