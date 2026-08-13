import type { ReactNode } from 'react';

import type { AppStep } from '@app/store/workflowSlice';
import { AppHeader } from '@app/shell/AppHeader';
import { WorkflowStepper } from '@app/shell/WorkflowStepper';

import styles from './AppShell.module.css';

interface AppShellProps {
  children: ReactNode;
  currentStep: AppStep;
}

export function AppShell({ children, currentStep }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <WorkflowStepper currentStep={currentStep} />
      <main className={styles.main}>{children}</main>
      <footer className={`page-boundary ${styles.footer}`}>
        <p>TableLint · локальная проверка CSV</p>
        <p>Без аккаунта и отправки данных</p>
      </footer>
    </div>
  );
}
