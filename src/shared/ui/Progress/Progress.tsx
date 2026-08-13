import styles from './Progress.module.css';

interface ProgressProps {
  label: string;
  value: number;
}

export function Progress({ label, value }: ProgressProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={styles.root}>
      <div className={styles.meta}>
        <span>{label}</span>
        <span className={styles.value}>{boundedValue}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={boundedValue}
        className={styles.track}
        role="progressbar"
      >
        <div className={styles.bar} style={{ width: `${boundedValue}%` }} />
      </div>
    </div>
  );
}
