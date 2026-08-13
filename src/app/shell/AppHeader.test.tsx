import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppHeader } from './AppHeader';
import { LanguageProvider } from '@shared/lib/locale';

function renderHeader() {
  return render(
    <LanguageProvider>
      <AppHeader />
    </LanguageProvider>,
  );
}

describe('AppHeader theme switcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  });

  it('toggles and persists the color theme', () => {
    renderHeader();

    fireEvent.click(
      screen.getByRole('button', { name: 'Включить тёмную тему' }),
    );

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem('tablelint-color-theme')).toBe('dark');
    expect(
      screen.getByRole('button', { name: 'Включить светлую тему' }),
    ).toBeVisible();
  });

  it('switches to English and persists the language', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem('tablelint-language')).toBe('en');
    expect(screen.getByText('Files stay on your device')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
