import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/validation/**/*.ts', 'src/clinical-tests/**/*.ts'],
      exclude: ['src/lib/types.ts', 'src/lib/mock-data.ts'],
      // RM-25: metas de cobertura na CAMADA DE DECISÃO/CANÔNICA (não no legado).
      // Protegem contra regressão dos módulos sob governança; `npm run test:coverage`.
      thresholds: {
        'src/lib/pharma-core/**/*.ts': { statements: 75, branches: 50, functions: 60, lines: 75 },
        'src/lib/safety-rules.ts': { statements: 88, branches: 72, functions: 90, lines: 88 },
        'src/validation/**/*.ts': { statements: 78, branches: 58, functions: 85, lines: 78 },
      },
    },
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
