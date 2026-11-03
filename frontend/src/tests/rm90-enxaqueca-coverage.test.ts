// ============================================================
// RM-90 — Nova condição: Enxaqueca (Migrânea, G43)
//
// Expansão de cobertura clínica (direção escolhida pelo usuário após o
// fechamento de todos os itens do roadmap RM-60). Cobre as 3 camadas que
// precisam estar amarradas para a condição ser real/alcançável, mesmo
// padrão já cobrado em RMs anteriores (RM-58/66/69: dado real precisa
// estar em TODAS as camadas, nunca só numa fonte isolada):
//
// 1. Motor diagnóstico (clinical-decision-support.ts) — reconhece os
//    sintomas típicos (ICHD-3) e sinaliza red flags (SNOOP).
// 2. Motor terapêutico (clinical-therapeutics.ts) — protocolo real de
//    tratamento agudo + profilático.
// 3. O join entre os dois (`hipotese.id` → `getTherapeuticForCondition`),
//    exatamente como `DiagnosticPanel.tsx` faz na consulta real.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Anamnesis } from '@/lib/types';
import { analyzeClinical } from '@/lib/clinical-decision-support';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { CID_CONDITION_MAP } from '@/lib/explicabilidade-context';

function baseAnamnesis(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: '', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {},
    imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

describe('RM-90 — Enxaqueca: motor diagnóstico (clinical-decision-support.ts)', () => {
  it('quadro típico (cefaleia unilateral pulsátil + fotofobia/fonofobia + náusea) → sugere "Enxaqueca (Migrânea)" com CID G43', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Cefaleia unilateral pulsátil há 2 dias',
      hda: 'Paciente refere dor latejante, piora com luz (fotofobia) e som (fonofobia), associada a náusea. Episódios semelhantes no passado.',
    });
    const resultado = analyzeClinical(anamnese);
    const hip = resultado.hipoteses.find(h => h.id === 'enxaqueca');
    expect(hip).toBeDefined();
    expect(hip!.cid10).toBe('G43');
    expect(hip!.grau_confianca).toBeGreaterThan(0);
  });

  it('diagnóstico prévio registrado como comorbidade → entra nas hipóteses mesmo com HDA mínima', () => {
    const anamnese = baseAnamnesis({ comorbidades: ['Enxaqueca'], hda: 'Crise atual' });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.hipoteses.some(h => h.id === 'enxaqueca')).toBe(true);
  });

  it('anamnese vazia → nunca sugere enxaqueca (nenhum critério de ausência usado, só texto real)', () => {
    const resultado = analyzeClinical(baseAnamnesis());
    expect(resultado.hipoteses.some(h => h.id === 'enxaqueca')).toBe(false);
  });

  it('cefaleia "pior dor de cabeça da vida" / início súbito → red flag urgente, encaminhamento_urgente true', () => {
    // Red flags só são avaliados para hipóteses que já cruzaram o limiar de
    // inclusão (mesmo comportamento do motor para todas as condições) — por
    // isso o quadro também traz os critérios típicos de enxaqueca, não só o
    // sinal de alarme isolado.
    const anamnese = baseAnamnesis({
      queixa_principal: 'Cefaleia unilateral pulsátil, pior dor de cabeça da vida, início súbito',
      hda: 'Dor latejante com fotofobia e náusea, mas início súbito — nunca sentiu nada igual.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(true);
    expect(resultado.red_flags.some(f => f.toLowerCase().includes('súbito') || f.toLowerCase().includes('thunderclap'))).toBe(true);
  });

  it('déficit neurológico focal associado → red flag urgente', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Cefaleia latejante',
      hda: 'Cefaleia unilateral pulsátil com fraqueza em membro e dificuldade para falar associadas.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(true);
  });

  it('cefaleia típica SEM nenhum red flag → encaminhamento_urgente false', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Cefaleia unilateral pulsátil recorrente',
      hda: 'Crises recorrentes de cefaleia latejante com fotofobia, fonofobia e náusea, sem outros sintomas.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(false);
  });
});

describe('RM-90 — Enxaqueca: motor terapêutico (clinical-therapeutics.ts)', () => {
  const plano = getTherapeuticForCondition('enxaqueca', 'Enxaqueca (G43)');

  it('protocolo real existe e cobre tratamento agudo + profilático', () => {
    expect(plano).not.toBeNull();
    const moleculas = plano!.farmacologico.map(s => s.molecula);
    expect(moleculas).toContain('Naproxeno');
    expect(moleculas).toContain('Sumatriptano');
    expect(moleculas).toContain('Propranolol');
    expect(moleculas).toContain('Topiramato');
  });

  it('Sumatriptano contraindica doença coronariana e AVC prévio (segurança cardiovascular do triptano)', () => {
    const sumatriptano = plano!.farmacologico.find(s => s.molecula === 'Sumatriptano')!;
    expect(sumatriptano.contraindicacoes.some(c => c.toLowerCase().includes('coronária') || c.toLowerCase().includes('coronaria'))).toBe(true);
    expect(sumatriptano.contraindicacoes.some(c => c.toLowerCase().includes('avc'))).toBe(true);
  });

  it('Topiramato contraindica gravidez (teratogênico) — nunca omitido', () => {
    const topiramato = plano!.farmacologico.find(s => s.molecula === 'Topiramato')!;
    expect(topiramato.contraindicacoes.some(c => c.toLowerCase().includes('gravidez'))).toBe(true);
  });

  it('RM-93: todas as sugestões agora citam DOI real e verificado (AHS 2021 / AAN-AHS 2012) — upgrade do estado "sem DOI" original desta RM', () => {
    for (const s of plano!.farmacologico) {
      expect(s.evidencia.doi).toMatch(/^10\.\d{4,}/); // formato real de DOI, nunca string vazia/fabricada
    }
    const naproxeno = plano!.farmacologico.find(s => s.molecula === 'Naproxeno')!;
    expect(naproxeno.evidencia.doi).toBe('10.1111/head.14153'); // Ailani J et al., Headache 2021
    const topiramato = plano!.farmacologico.find(s => s.molecula === 'Topiramato')!;
    expect(topiramato.evidencia.doi).toBe('10.1212/WNL.0b013e3182535d20'); // Silberstein SD et al., Neurology 2012
  });

  it('CID não reconhecido (ex.: "G44") continua retornando null — nenhuma regressão no fallback padrão', () => {
    expect(getTherapeuticForCondition('g44_inexistente', 'teste')).toBeNull();
  });
});

describe('RM-90 — Join diagnóstico → terapêutico (mesmo padrão de DiagnosticPanel.tsx)', () => {
  it('hipótese "enxaqueca" gerada pelo motor diagnóstico encontra o protocolo real via getTherapeuticForCondition(hipotese.id, ...)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Cefaleia unilateral pulsátil',
      hda: 'Dor latejante com fotofobia, fonofobia e náusea, crises recorrentes.',
    });
    const hip = analyzeClinical(anamnese).hipoteses.find(h => h.id === 'enxaqueca')!;
    expect(hip).toBeDefined();

    const plano = getTherapeuticForCondition(hip.id, hip.nome) ?? getTherapeuticForCondition(hip.cid10 ?? '', hip.nome);
    expect(plano).not.toBeNull();
    expect(plano!.farmacologico.length).toBeGreaterThan(0);
  });

  it('CID_CONDITION_MAP (usado por /explicabilidade) mapeia G43 → "enxaqueca"', () => {
    expect(CID_CONDITION_MAP.G43).toBe('enxaqueca');
  });
});
