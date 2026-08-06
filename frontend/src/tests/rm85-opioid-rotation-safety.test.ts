// ============================================================
// RM-85 — calcOpioidRotation() nunca pode assumir equipotência com morfina
// oral (fator 1) para uma via sem fator de conversão cadastrado.
//
// Achado da varredura RM-85: `TO_MORFINA_ORAL` só define fatores para
// combinações opioide/via realmente documentadas (ex.: fentanil só tem
// TD/IV, buprenorfina só TD, codeína/tramadol só VO/SC). O código antigo
// usava `?? 1` quando a via não estava mapeada — silenciosamente tratando
// QUALQUER opioide não mapeado como equipotente à morfina oral. Para
// fentanil (fator real ~100), isso subestimaria a dose equianalgésica em
// ~100x — o mesmo antipadrão "dado ausente tratado como normal/neutro" já
// corrigido em clinical-decision-support.ts (RM-82), clinical-risk-engine.ts
// (RM-39) e no motor de ICU, aqui aplicado a uma calculadora de rotação de
// opioides.
// ============================================================

import { describe, it, expect } from 'vitest';
import { calcOpioidRotation } from '@/lib/palliative-engine';

describe('calcOpioidRotation() — nunca assume fator 1 (equipotência com morfina) para via sem conversão cadastrada (RM-85)', () => {
  it('morfina VO → morfina VO: cálculo normal, não bloqueado', () => {
    const r = calcOpioidRotation('morfina', 60, 'VO', 'morfina', 'VO');
    expect(r.bloqueado).toBe(false);
    expect(r.dose_equi_mg).toBe(60);
    expect(r.instrucoes.some(i => i.startsWith('🚨'))).toBe(false);
  });

  it('fentanil por via SC (sem fator cadastrado — só existe TD/IV): BLOQUEADO, nunca calcula com fator 1', () => {
    const r = calcOpioidRotation('morfina', 60, 'VO', 'fentanil', 'SC');
    expect(r.bloqueado).toBe(true);
    expect(r.dose_equi_mg).toBe(0);
    expect(r.instrucoes.some(i => i.startsWith('🚨'))).toBe(true);
    expect(r.instrucoes.join(' ')).toMatch(/fentanil via SC/);
  });

  it('buprenorfina por via IV (sem fator cadastrado — só existe TD): BLOQUEADO', () => {
    const r = calcOpioidRotation('morfina', 60, 'VO', 'buprenorfina', 'IV');
    expect(r.bloqueado).toBe(true);
    expect(r.dose_equi_mg).toBe(0);
  });

  it('codeína por via IV (sem fator cadastrado — só existe VO): BLOQUEADO na origem, não só no alvo', () => {
    const r = calcOpioidRotation('codeina', 240, 'IV', 'morfina', 'VO');
    expect(r.bloqueado).toBe(true);
    expect(r.instrucoes.join(' ')).toMatch(/codeina via IV/);
  });

  it('fentanil TD → fentanil TD (via real e mapeada): calcula normalmente, sem bloqueio', () => {
    const r = calcOpioidRotation('fentanil', 100, 'TD', 'fentanil', 'TD');
    expect(r.bloqueado).toBe(false);
    expect(r.dose_equi_mg).toBe(100);
  });

  it('rotação real morfina VO → oxicodona VO: fatores corretos (1 → 1,5), dose ajustada com redução de 25%', () => {
    const r = calcOpioidRotation('morfina', 60, 'VO', 'oxicodona', 'VO');
    expect(r.bloqueado).toBe(false);
    // 60mg morfina VO (fator 1) = 60mg morfina oral equiv. / fator oxicodona 1.5 = 40mg oxicodona
    expect(r.dose_equi_mg).toBe(40);
    expect(r.dose_ajustada_mg).toBe(30); // 40 * 0.75
  });
});
