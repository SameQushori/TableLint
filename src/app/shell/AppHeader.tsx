import { Moon, ShieldCheck, Sun } from 'lucide-react';
import { useState } from 'react';

import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  storeTheme,
  type ColorTheme,
} from '@shared/lib/theme';
import { useLanguage } from '@shared/lib/languageContext';

import styles from './AppHeader.module.css';

export function AppHeader() {
  const { language, setLanguage } = useLanguage();
  const [theme, setTheme] = useState<ColorTheme>(
    () => getStoredTheme() ?? getSystemTheme(),
  );

  const toggleTheme = () => {
    const nextTheme: ColorTheme = theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    storeTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <header className={styles.header}>
      <div className={`page-boundary ${styles.inner}`}>
        <a
          className={styles.brand}
          href="#/"
          aria-label="TableLint, на главную"
        >
          <img
            alt=""
            className={styles.mark}
            src={`${import.meta.env.BASE_URL}tablelint-mark.svg`}
          />
          TableLint
        </a>
        <div className={styles.headerActions}>
          <div className={styles.privacy}>
            <ShieldCheck aria-hidden="true" />
            <span>Файлы остаются на устройстве</span>
          </div>
          <div
            className={styles.languageSwitch}
            aria-label="Выбор языка"
            role="group"
          >
            {(['ru', 'en'] as const).map((option) => (
              <button
                aria-pressed={language === option}
                className={styles.languageOption}
                key={option}
                onClick={() => setLanguage(option)}
                type="button"
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            aria-label={
              theme === 'light'
                ? 'Включить тёмную тему'
                : 'Включить светлую тему'
            }
            className={styles.themeToggle}
            onClick={toggleTheme}
            type="button"
          >
            {theme === 'light' ? (
              <Moon aria-hidden="true" />
            ) : (
              <Sun aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
