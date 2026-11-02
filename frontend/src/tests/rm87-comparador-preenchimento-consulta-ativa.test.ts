// ============================================================
// RM-87 — Pré-preenchimento de /comparador a partir da consulta ativa
//
// Testa `resolverPreenchimentoComparador` (comparador-context.ts) com dados
// REAIS — plano terapêutico de `getTherapeuticForCondition` (motor real,
// RM-26) e catálogo real `MOLECULES_DB` (drug-comparator.ts) — nunca mocks.
// Mesmo padrão de teste de integração usado em
// `explicabilidade-integration-rm65.test.ts`.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Consultation } from '@/lib/types';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { MOLECULES_DB, getMoleculeById } from '@/lib/drug-comparator';
import { resolverPreenchimentoComparador } from '@/lib/comparador-context';

function baseConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'rm87-c1',
    status: 'terapeutico',
    paciente_nome: 'Paciente RM-87',
    data: new Date().toISOString(),
    ...overrides,
  };
}

describe('RM-87 — resolverPreenchimentoComparador', () => {
  it('consulta ativa com plano terapêutico real (HAS) → pré-preenche A e B com moléculas reais do catálogo, fonte "consulta_ativa"', () => {
    const plano = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    expect(plano).not.toBeNull();
    const consulta = baseConsultation({ plano_terapeutico: plano });

    const resultado = resolverPreenchimentoComparador(consulta, MOLECULES_DB);

    expect(resultado.fonte).toBe('consulta_ativa');
    expect(resultado.molA).not.toBeNull();
    // A sugestão de maior prioridade real (RM-26) para este contexto (TFG 90) é
    // Losartana — o motor de priorização (não este resolver) decide a ordem;
    // o resolver só precisa respeitá-la e casar com uma molécula real do catálogo.
    expect(resultado.molA!.id).toBe('losartana');
  });

  it('prioriza a sugestão com prioridade clínica mais alta (RM-26), não a ordem bruta do array', () => {
    const enalapril = getMoleculeById('enalapril')!;
    const hctz = getMoleculeById('hidroclorotiazida')!;
    expect(enalapril).toBeDefined();
    expect(hctz).toBeDefined();

    const planoBase = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const plano = {
      ...planoBase,
      farmacologico: [
        { ...planoBase.farmacologico.find(s => s.molecula === 'Hidroclorotiazida')!, prioridade: { tier: 'contextual' as const, motivo: 'teste', fatores_considerados: [], evidencia_status: 'diretriz_estruturada' as const } },
        { ...planoBase.farmacologico.find(s => s.molecula === 'Enalapril')!, prioridade: { tier: 'preferencial' as const, motivo: 'teste', fatores_considerados: [], evidencia_status: 'diretriz_estruturada' as const } },
      ],
    };
    const consulta = baseConsultation({ plano_terapeutico: plano });

    const resultado = resolverPreenchimentoComparador(consulta, MOLECULES_DB);

    // Enalapril (preferencial) vem em A mesmo estando em 2º lugar no array bruto.
    expect(resultado.molA!.id).toBe('enalapril');
    expect(resultado.molB!.id).toBe('hidroclorotiazida');
  });

  it('casamento por nome exato — nunca por substring (ex.: "Valsartana" não deve casar com a combinação "Sacubitril + Valsartana")', () => {
    const plano = {
      ...getTherapeuticForCondition('has', 'HAS (I10)')!,
      farmacologico: [
        { id: 't1', classe_terapeutica: 'teste', molecula: 'Valsartana', nome_generico: 'Valsartana', indicacao: '', dose: { dose_padrao: '', dose_min: '', dose_max: '', unidade: '', via: '', frequencia: '', duracao: '' }, posologia_completa: '', evidencia: { diretriz: '', sociedade: '', ano: 2025, nivel_evidencia: { nivel: 'A' as const, grau: 'I' as const, descricao: '' }, citacao: '' }, contraindicacoes: [], efeitos_adversos: [], monitoramento: [], alternativas: [] },
      ],
    };
    const consulta = baseConsultation({ plano_terapeutico: plano });

    const resultado = resolverPreenchimentoComparador(consulta, MOLECULES_DB);

    expect(resultado.fonte).toBe('nenhuma');
    expect(resultado.molA).toBeNull();
  });

  it('sem consulta ativa → fonte "nenhuma", nenhuma molécula pré-selecionada', () => {
    const resultado = resolverPreenchimentoComparador(null, MOLECULES_DB);
    expect(resultado.fonte).toBe('nenhuma');
    expect(resultado.molA).toBeNull();
    expect(resultado.molB).toBeNull();
  });

  it('consulta ativa sem plano terapêutico ainda (etapa não alcançada) → fonte "nenhuma", nunca inventa seleção', () => {
    const consulta = baseConsultation({ plano_terapeutico: undefined });
    const resultado = resolverPreenchimentoComparador(consulta, MOLECULES_DB);
    expect(resultado.fonte).toBe('nenhuma');
    expect(resultado.molA).toBeNull();
  });

  it('só 1 sugestão do plano tem correspondência no catálogo → preenche só A, nunca inventa B', () => {
    const planoBase = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const plano = {
      ...planoBase,
      farmacologico: [
        planoBase.farmacologico.find(s => s.molecula === 'Enalapril')!,
        { id: 't2', classe_terapeutica: 'teste', molecula: 'Molécula Fora Do Catálogo XYZ', nome_generico: '', indicacao: '', dose: { dose_padrao: '', dose_min: '', dose_max: '', unidade: '', via: '', frequencia: '', duracao: '' }, posologia_completa: '', evidencia: { diretriz: '', sociedade: '', ano: 2025, nivel_evidencia: { nivel: 'A' as const, grau: 'I' as const, descricao: '' }, citacao: '' }, contraindicacoes: [], efeitos_adversos: [], monitoramento: [], alternativas: [] },
      ],
    };
    const consulta = baseConsultation({ plano_terapeutico: plano });

    const resultado = resolverPreenchimentoComparador(consulta, MOLECULES_DB);

    expect(resultado.fonte).toBe('consulta_ativa');
    expect(resultado.molA!.id).toBe('enalapril');
    expect(resultado.molB).toBeNull();
  });
});
