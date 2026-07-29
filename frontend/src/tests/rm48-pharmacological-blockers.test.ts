import { describe, it, expect } from 'vitest';
import { calcularDosagem, MEDICAMENTOS_DOSAGEM } from '@/lib/dosing-engine';
import { calcDosePediatrica } from '@/lib/pediatric-engine';
import { avaliarRiscoClinico } from '@/lib/clinical-risk-engine';
import type { Anamnesis, TherapeuticSuggestion } from '@/lib/types';

// ============================================================
// RM-48 — Regressão dos bloqueadores críticos confirmados na auditoria
// RM-41 e corrigidos nesta rodada de prontidão pré-expansão clínica.
//
// Nenhum protocolo/dose/recomendação NOVO foi adicionado — estas
// correções fazem contraindicações e normalizações JÁ DOCUMENTADAS nos
// próprios dados (`observacao`/`alerta_especial`) serem efetivamente
// aplicadas pelo código, que antes as ignorava silenciosamente.
// ============================================================

function medicamento(id: string) {
  const m = MEDICAMENTOS_DOSAGEM.find((x) => x.id === id);
  if (!m) throw new Error(`fixture ausente: ${id}`);
  return m;
}

describe('RM-48-01 — SMX-TMP: contraindicação de neonato/lactente jovem agora é aplicada', () => {
  const smxtmp = medicamento('sulfametoxazol-trimetoprim');

  it('lactente de 45 dias (< 60 dias, "evitar < 2 meses"): BLOQUEADO — nunca calcula uma dose aplicável', () => {
    const r = calcularDosagem(4.5, undefined, 45, smxtmp, 'smxtmp-susp');
    expect(r?.ok).toBe(false);
    expect(r?.erro).toMatch(/CONTRAINDICADO/);
  });

  it('neonato de 10 dias: também BLOQUEADO (bucket populacional "neonato")', () => {
    const r = calcularDosagem(3.2, undefined, 10, smxtmp, 'smxtmp-susp');
    expect(r?.ok).toBe(false);
  });

  it('lactente de 90 dias (>= 60 dias): dose calculada normalmente — o fix não bloqueia além do necessário', () => {
    const r = calcularDosagem(6, undefined, 90, smxtmp, 'smxtmp-susp');
    expect(r?.ok).toBe(true);
  });
});

describe('RM-48-02 — Dipirona: contraindicação < 3 meses (90 dias) agora é aplicada dentro do bucket "lactente"', () => {
  const dipirona = medicamento('dipirona');

  it('lactente de 60 dias (< 90 dias, dentro do bucket "lactente" mas contraindicado): BLOQUEADO', () => {
    const r = calcularDosagem(5, undefined, 60, dipirona, 'dip-gotas');
    expect(r?.ok).toBe(false);
    expect(r?.erro).toMatch(/CONTRAINDICADO/);
  });

  it('lactente de 100 dias (>= 90 dias): dose calculada normalmente', () => {
    const r = calcularDosagem(7, undefined, 100, dipirona, 'dip-gotas');
    expect(r?.ok).toBe(true);
  });
});

describe('RM-48-03 — pediatric-engine: alerta de contraindicação de idade usa prefixo "🚨" (gating real da UI), não "⚠"', () => {
  it('idade fora de idadeMinMeses/idadeMaxMeses: alerta de contraindicação começa com "🚨"', () => {
    // aciclovir tem indicação "Herpes neonatal" com idadeMaxMeses baixo —
    // forçar essa indicação para uma criança de 5 anos aciona o alerta.
    const r = calcDosePediatrica('aciclovir', { pesoKg: 20, idadeMeses: 60 }, 'Herpes neonatal');
    const alertaContraindicacao = r?.alertas.find((a) => a.includes('CONTRAINDICADO'));
    expect(alertaContraindicacao).toBeDefined();
    expect(alertaContraindicacao?.startsWith('🚨')).toBe(true);
    expect(alertaContraindicacao?.startsWith('⚠')).toBe(false);
  });
});

describe('RM-48-04 — clinical-risk-engine: interação lítio+diurético é detectada mesmo sem acento na digitação', () => {
  function anamneseComMedicamento(nome: string): Anamnesis {
    return {
      queixa_principal: 'Acompanhamento', hda: '', hpp: '', historia_familiar: '',
      habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '',
      comorbidades: [], medicamentos_em_uso: [{ id: '1', nome, em_uso: true }], alergias: [],
      gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    };
  }

  function prescricaoDiuretico(): TherapeuticSuggestion {
    return {
      id: 'x', classe_terapeutica: 'Diurético tiazídico', molecula: 'Hidroclorotiazida', nome_generico: 'hidroclorotiazida',
      indicacao: 'HAS', dose: { dose_padrao: '25', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
      posologia_completa: '25 mg VO 1x/dia',
      evidencia: { diretriz: 'x', sociedade: 'x', ano: 2024, citacao: 'x', nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'x' } },
      contraindicacoes: [], efeitos_adversos: [], monitoramento: [], alternativas: [],
    };
  }

  it('"Litio" (SEM acento, digitação comum) + diurético: fator de interação é detectado', () => {
    const r = avaliarRiscoClinico(anamneseComMedicamento('Litio 900mg'), [prescricaoDiuretico()]);
    expect(r.risco_interacao.fatores.some((f) => /L[ÍI]TIO.*DIUR[ÉE]TICO/i.test(f))).toBe(true);
  });

  it('"Lítio" (COM acento) + diurético: continua funcionando (não regride)', () => {
    const r = avaliarRiscoClinico(anamneseComMedicamento('Lítio 900mg'), [prescricaoDiuretico()]);
    expect(r.risco_interacao.fatores.some((f) => /L[ÍI]TIO.*DIUR[ÉE]TICO/i.test(f))).toBe(true);
  });
});
