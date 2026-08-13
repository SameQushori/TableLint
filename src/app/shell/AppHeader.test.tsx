import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppHeader } from './AppHeader';

describe('AppHeader theme switcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  });

  it('toggles and persists the color theme', () => {
    render(<AppHeader />);

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
});
