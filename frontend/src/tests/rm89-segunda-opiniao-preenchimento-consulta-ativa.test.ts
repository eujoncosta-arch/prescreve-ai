// ============================================================
// RM-89 — Integração de /segunda-opiniao com a consulta ativa
//
// Testa `resolverPreenchimentoSegundaOpiniao` (second-opinion-context.ts)
// com dados REAIS — plano terapêutico de `getTherapeuticForCondition`
// (motor real, RM-26) e catálogo real `listarCondicoes()`
// (second-opinion.ts) — nunca mocks. Mesmo padrão de teste de integração
// de `explicabilidade-integration-rm65.test.ts` e
// `rm87-comparador-preenchimento-consulta-ativa.test.ts`.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Consultation } from '@/lib/types';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { listarCondicoes } from '@/lib/second-opinion';
import { resolverPreenchimentoSegundaOpiniao } from '@/lib/second-opinion-context';

const CONDICOES = listarCondicoes();

function baseConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'rm89-c1',
    status: 'terapeutico',
    paciente_nome: 'Paciente RM-89',
    data: new Date().toISOString(),
    ...overrides,
  };
}

describe('RM-89 — resolverPreenchimentoSegundaOpiniao', () => {
  it('consulta ativa com CID reconhecido (I10/HAS) + plano terapêutico real → resolve condição E conduta, fonte "consulta_ativa"', () => {
    const plano = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    expect(plano).not.toBeNull();
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'I10', descricao: 'Hipertensão Arterial Sistêmica', confianca: 0.8 },
      plano_terapeutico: plano,
    });

    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);

    expect(resultado.fonte).toBe('consulta_ativa');
    expect(resultado.condicaoId).toBe('has');
    // A sugestão de maior prioridade real (RM-26) para TFG 90 é Losartana → opção "bra".
    expect(resultado.condutaId).toBe('bra');
  });

  it('prioriza por prioridade clínica real (RM-26), não pela ordem bruta do plano', () => {
    const planoBase = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const plano = {
      ...planoBase,
      farmacologico: [
        { ...planoBase.farmacologico.find(s => s.molecula === 'Hidroclorotiazida')!, prioridade: { tier: 'contextual' as const, motivo: 'teste', fatores_considerados: [], evidencia_status: 'diretriz_estruturada' as const } },
        { ...planoBase.farmacologico.find(s => s.molecula === 'Enalapril')!, prioridade: { tier: 'preferencial' as const, motivo: 'teste', fatores_considerados: [], evidencia_status: 'diretriz_estruturada' as const } },
      ],
    };
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'I10', descricao: 'HAS', confianca: 0.8 },
      plano_terapeutico: plano,
    });

    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);

    // Enalapril (preferencial) vem antes mesmo estando em 2º lugar no array bruto → opção "ieca".
    expect(resultado.condutaId).toBe('ieca');
  });

  it('CID reconhecido mas nenhuma molécula do plano mapeada em nenhuma CondutaOpcao → resolve só a condição, conduta null', () => {
    const planoBase = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const plano = {
      ...planoBase,
      farmacologico: [
        { ...planoBase.farmacologico[0], molecula: 'Molécula Fora Do Catálogo De Segunda Opinião XYZ' },
      ],
    };
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'I10', descricao: 'HAS', confianca: 0.8 },
      plano_terapeutico: plano,
    });

    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);

    expect(resultado.fonte).toBe('consulta_ativa');
    expect(resultado.condicaoId).toBe('has');
    expect(resultado.condutaId).toBeNull();
  });

  it('CID da consulta sem CondicaoClinica correspondente (ex.: CID não coberto por /segunda-opiniao) → fonte "nenhuma"', () => {
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'J45', descricao: 'Asma', confianca: 0.8 },
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.fonte).toBe('nenhuma');
    expect(resultado.condicaoId).toBeNull();
    expect(resultado.condutaId).toBeNull();
  });

  it('sem consulta ativa → fonte "nenhuma"', () => {
    const resultado = resolverPreenchimentoSegundaOpiniao(null, CONDICOES);
    expect(resultado.fonte).toBe('nenhuma');
  });

  it('consulta ativa sem diagnóstico estruturado ainda → fonte "nenhuma", nunca adivinha o CID', () => {
    const consulta = baseConsultation();
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.fonte).toBe('nenhuma');
  });

  it('CID com sufixo (ex.: "I10.0") usa o CID principal para casar com CondicaoClinica.cid10', () => {
    const plano = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'I10.0', descricao: 'HAS', confianca: 0.8 },
      plano_terapeutico: plano,
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.condicaoId).toBe('has');
  });

  it('casamento por nome exato de molécula — nunca por substring (ex.: "Nifedipino" isolado não deve casar com "Nifedipino GITS")', () => {
    const planoBase = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const plano = {
      ...planoBase,
      farmacologico: [{ ...planoBase.farmacologico[0], molecula: 'Nifedipino' }],
    };
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'I10', descricao: 'HAS', confianca: 0.8 },
      plano_terapeutico: plano,
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    // "bcc" lista "Nifedipino GITS" (com sufixo), não "Nifedipino" isolado — não deve casar.
    expect(resultado.condutaId).toBeNull();
  });

  it('"Olmesartana" casa corretamente com a opção "bra" (nome exato presente na lista real)', () => {
    const planoBase = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const plano = {
      ...planoBase,
      farmacologico: [{ ...planoBase.farmacologico[0], molecula: 'Olmesartana' }],
    };
    const consulta = baseConsultation({
      diagnostico_estruturado: { cid: 'I10', descricao: 'HAS', confianca: 0.8 },
      plano_terapeutico: plano,
    });
    const resultado = resolverPreenchimentoSegundaOpiniao(consulta, CONDICOES);
    expect(resultado.condutaId).toBe('bra');
  });
});
