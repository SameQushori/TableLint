import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@shared/ui/Button/Button';

import styles from './AppErrorBoundary.module.css';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Privacy boundary: never log errors that could include CSV values.
    void error;
    void info;
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className={styles.screen}>
        <section className={styles.panel} role="alert">
          <p className={styles.eyebrow}>Локальная ошибка</p>
          <h1>TableLint не смог продолжить</h1>
          <p>
            Перезагрузите приложение и восстановите последнюю локальную сессию.
            Если ошибка повторяется на большом файле, попробуйте CSV меньшего
            размера. Содержимое файла не отправлялось по сети.
          </p>
          <Button onClick={() => window.location.reload()}>
            Перезагрузить приложение
          </Button>
        </section>
      </main>
    );
  }
}
