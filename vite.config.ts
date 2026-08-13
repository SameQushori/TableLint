import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const sourceDirectory = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@app': path.join(sourceDirectory, 'app'),
      '@features': path.join(sourceDirectory, 'features'),
      '@entities': path.join(sourceDirectory, 'entities'),
      '@shared': path.join(sourceDirectory, 'shared'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
