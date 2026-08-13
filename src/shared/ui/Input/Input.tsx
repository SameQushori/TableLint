import { useId, type InputHTMLAttributes } from 'react';

import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
  label: string;
}

export function Input({
  className,
  error,
  hint,
  id,
  label,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = hint || error ? `${inputId}-description` : undefined;
  const classes = [styles.input, error ? styles.invalid : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={classes}
        id={inputId}
        {...props}
      />
      {error ? (
        <p className={styles.error} id={descriptionId}>
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint} id={descriptionId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
