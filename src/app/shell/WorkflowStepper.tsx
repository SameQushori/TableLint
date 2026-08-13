import type { AppStep } from '@app/store/workflowSlice';

import styles from './WorkflowStepper.module.css';

const workflowSteps: ReadonlyArray<{ id: AppStep; label: string }> = [
  { id: 'upload', label: 'Загрузка' },
  { id: 'rules', label: 'Правила' },
  { id: 'workspace', label: 'Проверка' },
  { id: 'report', label: 'Результат' },
];

interface WorkflowStepperProps {
  currentStep: AppStep;
}

export function WorkflowStepper({ currentStep }: WorkflowStepperProps) {
  return (
    <nav className={styles.nav} aria-label="Этапы проверки CSV">
      <ol className={`page-boundary ${styles.list}`}>
        {workflowSteps.map((step, index) => (
          <li
            aria-current={step.id === currentStep ? 'step' : undefined}
            className={styles.step}
            key={step.id}
          >
            <span className={styles.number} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className={styles.label}>{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
