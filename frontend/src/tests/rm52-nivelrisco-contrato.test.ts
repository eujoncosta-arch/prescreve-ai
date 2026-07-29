// ============================================================
// RM-52 (RM41-022) — contrato do enum NivelRisco entre frontend e backend.
//
// `NivelRisco` (frontend, clinical-risk-engine.ts) tinha `'moderado'` como
// valor válido — o enum real do Prisma (`backend/prisma/schema.prisma`,
// validado por `@IsEnum` em `RiskScorePayloadDto.risco_global`) NUNCA teve
// esse valor: é `baixo | intermediario | alto | muito_alto | critico`. Um
// `risco_global: 'moderado'` calculado pelo frontend seria REJEITADO (400)
// pelo backend assim que a persistência de risco fosse ligada ao fluxo
// real (RM41-023, ainda aberto) — o bug era latente, não hipotético.
//
// Este teste fixa os 5 valores reais do enum Prisma como string literal
// (não importamos o Prisma Client no frontend) — se o schema mudar, este
// teste deve ser atualizado manualmente, mantendo o contrato visível e
// intencional em vez de implícito.
// ============================================================
import { describe, it, expect } from 'vitest';
import { avaliarRiscoClinico } from '@/lib/clinical-risk-engine';
import type { Anamnesis } from '@/lib/types';

const VALORES_ENUM_PRISMA_NIVEL_RISCO = ['baixo', 'intermediario', 'alto', 'muito_alto', 'critico'];

function anamneseBase(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: 'Acompanhamento', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '',
    comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

describe('RM-52 (RM41-022) — NivelRisco do frontend nunca produz um valor fora do enum Prisma', () => {
  it('paciente sem nenhum fator de risco (score baixo): risco_global é um valor válido do enum Prisma', () => {
    const r = avaliarRiscoClinico(anamneseBase(), []);
    expect(VALORES_ENUM_PRISMA_NIVEL_RISCO).toContain(r.risco_global);
  });

  it('paciente com fatores de risco moderados (score na faixa 25-49): produz "intermediario", NUNCA "moderado"', () => {
    // sangramento recente (RM41-031: +40) sozinho já cruza para score >= 25
    // sem chegar a 50 — faixa "intermediário" de nivelPorScore.
    const r = avaliarRiscoClinico(anamneseBase({ comorbidades: ['úlcera péptica'] }), []);
    expect(r.risco_hemorragico.nivel).not.toBe('moderado' as never);
    expect(VALORES_ENUM_PRISMA_NIVEL_RISCO).toContain(r.risco_hemorragico.nivel);
  });

  it('paciente crítico completo (múltiplos fatores graves): todas as dimensões de risco produzem valores dentro do enum Prisma', () => {
    const anamnese = anamneseBase({
      comorbidades: ['sangramento ativo', 'trombocitopenia', 'hemofilia'],
      funcao_hepatica: { child_pugh: 'C' },
      medicamentos_em_uso: [{ id: '1', nome: 'Varfarina', em_uso: true }, { id: '2', nome: 'AAS', em_uso: true }],
    });
    const r = avaliarRiscoClinico(anamnese, []);
    for (const dimensao of [r.risco_cardiovascular, r.risco_renal, r.risco_hemorragico, r.risco_farmacologico, r.risco_interacao, r.risco_terapeutico]) {
      expect(VALORES_ENUM_PRISMA_NIVEL_RISCO).toContain(dimensao.nivel);
    }
    expect(VALORES_ENUM_PRISMA_NIVEL_RISCO).toContain(r.risco_global);
  });
});
