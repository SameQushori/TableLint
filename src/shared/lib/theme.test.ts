import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  initializeTheme,
  storeTheme,
} from './theme';

describe('color theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  });

  it('uses and applies a saved theme', () => {
    storeTheme('dark');

    expect(getStoredTheme()).toBe('dark');
    expect(initializeTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('falls back to the system preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    expect(getSystemTheme()).toBe('dark');
    expect(initializeTheme()).toBe('dark');
  });

  it('applies light theme directly', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
