// ============================================================
// RM-83 — Escalonamento contextual: Holmes H® e Zart H® (associações fixas
// BRA + tiazídico já cadastradas em pharma-database-cardio.ts) nunca
// apareciam em NENHUM lugar do sistema como sugestão — nem na busca de
// classe terapêutica (`expandTherapeuticPlan`), porque a classe
// "BRA + Diurético Tiazídico (Associação)" não existia em CLASS_KEY_MAP.
//
// Achado do usuário: pediu que ambas aparecessem como opção de
// escalonamento para HAS não controlada em monoterapia. Mesmo raciocínio
// do RM-30 (classes contextuais): mostrar a associação fixa a TODO
// paciente com HAS seria clinicamente errado — só faz sentido quando o
// paciente já está em monoterapia com um dos componentes (IECA/BRA ou
// tiazídico), sinal real obtido de `Anamnesis.medicamentos_em_uso`
// (campo já existente, nenhum dado novo).
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';

const hasPlan = (ctx: Parameters<typeof getTherapeuticForCondition>[2] = {}) =>
  getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;

describe('RM-83 · HAS não complicada (sem medicamento em uso)', () => {
  it('NÃO promove a associação fixa BRA + tiazídico a todo paciente com HAS', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeUndefined();
  });

  it('lista de medicamentos em uso vazia também não habilita', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: [] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeUndefined();
  });
});

describe('RM-83 · HAS em monoterapia (BRA ou tiazídico já em uso)', () => {
  it('paciente já em uso de Losartana → Holmes H® e Zart H® aparecem como opção de escalonamento', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Losartana'] });
    const holmesH = plan.farmacologico.find((s) => s.molecula.includes('Olmesartana') && s.molecula.includes('Hidroclorotiazida'));
    const zartH = plan.farmacologico.find((s) => s.molecula.includes('Losartana') && s.molecula.includes('Hidroclorotiazida'));
    expect(holmesH).toBeDefined();
    expect(zartH).toBeDefined();
    expect(holmesH!.marcas?.some((m) => m.nome_comercial.includes('Holmes H'))).toBe(true);
    expect(zartH!.marcas?.some((m) => m.nome_comercial.includes('Zart H'))).toBe(true);
  });

  it('paciente já em uso de Hidroclorotiazida (tiazídico isolado) também habilita a associação', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Hidroclorotiazida'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeDefined();
  });

  it('paciente em uso de Enalapril (IECA, não BRA) também habilita — associação BRA+tiazídico é escalonamento válido mesmo vindo de IECA', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Enalapril'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeDefined();
  });

  it('medicamento em uso não relacionado (ex.: Anlodipino/BCC) NÃO habilita a associação BRA+tiazídico', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Anlodipino'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeUndefined();
  });

  it('a mesma escalação não some quando o paciente também tem HAS resistente documentada (múltiplos contextos simultâneos, sem interferência)', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Losartana'], comorbidades: ['HAS resistente'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeDefined();
    expect(plan.farmacologico.find((s) => s.molecula === 'Espironolactona')).toBeDefined();
  });

  it('gestante em monoterapia com Losartana: a associação fixa é excluída pela mesma checagem de elegibilidade (contraindicada na gestação), não aparece', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Losartana'], gestante: true });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Associação Fixa'))).toBeUndefined();
  });
});
