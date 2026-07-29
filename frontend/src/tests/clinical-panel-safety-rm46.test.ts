import { describe, it, expect, vi } from 'vitest';
import { avaliarRiscoSeguro, avaliarConflitosSeguro } from '@/lib/clinical-panel-safety';
import * as riscoEngine from '@/lib/clinical-risk-engine';
import * as conflitosEngine from '@/lib/guideline-conflict-engine';
import type { Anamnesis } from '@/lib/types';

// ============================================================
// RM-46-01/02 — erro do motor clínico nunca se disfarça de "sem
// risco"/"sem conflito"
//
// Achado confirmado durante a auditoria de ciclo de vida (RM-46):
// `frontend/src/app/consulta/nova/page.tsx` capturava exceções de
// `avaliarRiscoClinico`/`detectarConflitos` em um `catch` que retornava
// exatamente o mesmo valor de "dado ausente"/"nenhum conflito
// encontrado" — a UI mostrava um card VERDE "Sem conflitos entre
// diretrizes — as principais sociedades científicas apresentam
// concordância" mesmo quando o motor nunca terminou de rodar. Isso é
// fallback clínico silencioso: uma falha de cálculo virava uma
// afirmação de segurança positiva. Este módulo garante os 3 estados
// (ausente / erro / calculado) nunca colapsam no mesmo valor.
// ============================================================

function anamneseCompleta(): Anamnesis {
  return {
    queixa_principal: 'Febre', hda: 'x', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {},
    imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
  };
}

describe('avaliarRiscoSeguro() — distingue anamnese ausente de erro do motor (RM-46-01)', () => {
  it('sem anamnese: status "sem_anamnese" — nunca tenta chamar o motor', () => {
    const spy = vi.spyOn(riscoEngine, 'avaliarRiscoClinico');
    const r = avaliarRiscoSeguro(undefined, []);
    expect(r).toEqual({ status: 'sem_anamnese' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('anamnese presente, motor calcula normalmente: status "ok" com os dados reais', () => {
    const r = avaliarRiscoSeguro(anamneseCompleta(), []);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.dados.risco_global).toBeDefined();
      expect(typeof r.dados.score_global).toBe('number');
    }
  });

  it('motor lança exceção: status "erro" — NUNCA "sem_anamnese" (a anamnese estava presente, o motor que quebrou)', () => {
    const spy = vi.spyOn(riscoEngine, 'avaliarRiscoClinico').mockImplementation(() => {
      throw new Error('bug interno simulado do motor de risco');
    });

    const r = avaliarRiscoSeguro(anamneseCompleta(), []);

    expect(r).toEqual({ status: 'erro' });
    expect(r.status).not.toBe('sem_anamnese'); // regressão-chave: nunca confundir erro com dado ausente
    spy.mockRestore();
  });
});

describe('avaliarConflitosSeguro() — distingue "sem diagnóstico"/"sem conflito real" de erro do motor (RM-46-02)', () => {
  it('sem diagnosticoId: status "ok" com array vazio real (não é erro, é ausência genuína de seleção)', () => {
    const spy = vi.spyOn(conflitosEngine, 'detectarConflitos');
    const r = avaliarConflitosSeguro('');
    expect(r).toEqual({ status: 'ok', dados: [] });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('diagnosticoId presente, motor roda normalmente: status "ok" com os conflitos reais (mesmo que vazio)', () => {
    const r = avaliarConflitosSeguro('cid-inexistente-sem-conflitos-cadastrados');
    expect(r.status).toBe('ok');
  });

  it('motor lança exceção: status "erro" — NUNCA "ok" com array vazio (que a UI leria como "sociedades concordam")', () => {
    const spy = vi.spyOn(conflitosEngine, 'detectarConflitos').mockImplementation(() => {
      throw new Error('bug interno simulado do motor de conflitos');
    });

    const r = avaliarConflitosSeguro('I10');

    expect(r).toEqual({ status: 'erro' });
    // Regressão-chave: o bug original fazia isto ser `{status:'ok', dados: []}`,
    // indistinguível de "sociedades científicas concordam".
    expect(r.status).not.toBe('ok');
    spy.mockRestore();
  });
});
