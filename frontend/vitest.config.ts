import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.spec.ts', 'src/tests/**/*.test.tsx'],
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
        // RM-52 (RM41-034): os 5 motores clínicos diretos no escopo desta
        // auditoria não tinham NENHUM threshold configurado — uma queda de
        // cobertura neles nunca falhava `test:coverage`. Valores fixados
        // logo abaixo da cobertura real medida nesta rodada (gate de
        // regressão, não meta aspiracional).
        'src/lib/dose-calculator.ts': { statements: 65, branches: 58, functions: 70, lines: 68 },
        'src/lib/dosing-engine.ts': { statements: 50, branches: 48, functions: 38, lines: 52 },
        'src/lib/icu-engine.ts': { statements: 92, branches: 88, functions: 100, lines: 93 },
        'src/lib/pediatric-engine.ts': { statements: 74, branches: 75, functions: 65, lines: 78 },
        'src/lib/clinical-risk-engine.ts': { statements: 65, branches: 65, functions: 75, lines: 78 },
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
