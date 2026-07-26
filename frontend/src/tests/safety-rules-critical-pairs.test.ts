import { describe, it, expect } from 'vitest';
import { runSafetyCheck } from '@/lib/safety-rules';

describe('runSafetyCheck() — CRITICAL_PAIRS não suprime pares críticos não relacionados', () => {
  it('IECA+Espironolactona (warning) seguido de IECA+BRA (critical) — ambos os alertas aparecem, sem supressão cruzada pela mol_a compartilhada', () => {
    const alerts = runSafetyCheck({
      moleculas: ['ieca', 'espironolactona', 'bra'],
    });

    const alertaHipercalemia = alerts.find((a) => a.titulo.includes('Espironolactona'));
    const alertaDuploBloqueio = alerts.find((a) => a.titulo.includes('Duplo bloqueio SRAA'));

    expect(alertaHipercalemia).toBeDefined();
    expect(alertaHipercalemia?.severidade).toBe('warning');

    // Regressão do bug real: antes da correção, o alerta crítico de duplo
    // bloqueio SRAA (IECA+BRA) era silenciosamente suprimido porque um
    // alerta anterior (IECA+Espironolactona) já continha "ieca" no título,
    // e a checagem de duplicata comparava apenas mol_a, não o par completo.
    expect(alertaDuploBloqueio).toBeDefined();
    expect(alertaDuploBloqueio?.severidade).toBe('critical');
  });

  it('ARNI (Sacubitril) + IECA — angioedema fatal — não é suprimido mesmo com outro alerta ieca+X já presente', () => {
    const alerts = runSafetyCheck({
      moleculas: ['ieca', 'aine', 'sacubitril'],
    });

    const alertaNefrotoxico = alerts.find((a) => a.titulo.includes('AINE'));
    const alertaAngioedema = alerts.find((a) => a.titulo.includes('Angioedema fatal'));

    expect(alertaNefrotoxico).toBeDefined();
    expect(alertaAngioedema).toBeDefined();
    expect(alertaAngioedema?.severidade).toBe('critical');
  });

  it('mesmo par nunca é duplicado (dedup real, não apenas ausência de supressão cruzada)', () => {
    const alerts = runSafetyCheck({
      moleculas: ['ieca', 'bra'],
    });
    const paresDuploBloqueio = alerts.filter((a) => a.titulo.includes('Duplo bloqueio SRAA'));
    expect(paresDuploBloqueio.length).toBe(1);
  });
});
