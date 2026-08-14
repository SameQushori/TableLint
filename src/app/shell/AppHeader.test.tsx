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

  it('toggles and persists the color theme', async () => {
    renderHeader();

    fireEvent.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    );

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(window.localStorage.getItem('tablelint-color-theme')).toBe('dark');
    expect(
      await screen.findByRole('button', { name: 'Switch to light theme' }),
    ).toBeVisible();
  });

  it('defaults to English and persists a language change', () => {
    renderHeader();

    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByText('Files stay on your device')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'RU' }));

    expect(document.documentElement.lang).toBe('ru');
    expect(window.localStorage.getItem('tablelint-language')).toBe('ru');
    expect(screen.getByText('Файлы остаются на устройстве')).toBeVisible();
    expect(screen.getByRole('button', { name: 'RU' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
