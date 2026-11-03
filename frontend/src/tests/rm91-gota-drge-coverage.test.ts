// ============================================================
// RM-91 — Novas condições: Gota (M10) e DRGE (K21)
//
// Mesma disciplina do RM-90: cobre as 3 camadas que precisam estar
// amarradas para a condição ser real/alcançável na consulta — motor
// diagnóstico, motor terapêutico, e o join entre os dois via
// `hipotese.id` (mesmo padrão de `DiagnosticPanel.tsx`).
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

// ─── GOTA ─────────────────────────────────────────────────────

describe('RM-91 — Gota: motor diagnóstico', () => {
  it('quadro típico (podagra + sinais inflamatórios + início súbito) → sugere "Gota" com CID M10', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Dor intensa no hálux (podagra) de início súbito',
      hda: 'Dor articular súbita no dedão do pé, com rubor, calor e edema articular importantes.',
    });
    const resultado = analyzeClinical(anamnese);
    const hip = resultado.hipoteses.find(h => h.id === 'gota');
    expect(hip).toBeDefined();
    expect(hip!.cid10).toBe('M10');
  });

  it('ácido úrico > 6,8 mg/dL contribui como critério laboratorial', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Podagra com rubor e calor articular',
      hda: 'Dor articular súbita no hálux.',
      laboratorio: { acido_urico: '9.2' },
    });
    const resultado = analyzeClinical(anamnese);
    const hip = resultado.hipoteses.find(h => h.id === 'gota');
    expect(hip?.criterios_favoraveis.some(c => c.toLowerCase().includes('hiperuricemia'))).toBe(true);
  });

  it('monoartrite aguda + febre → red flag urgente (excluir artrite séptica)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Podagra com febre',
      hda: 'Dor articular súbita no hálux, rubor e calor articular, acompanhada de febre.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(true);
  });

  it('anamnese vazia → nunca sugere gota', () => {
    const resultado = analyzeClinical(baseAnamnesis());
    expect(resultado.hipoteses.some(h => h.id === 'gota')).toBe(false);
  });
});

describe('RM-91 — Gota: motor terapêutico', () => {
  const plano = getTherapeuticForCondition('gota', 'Gota (M10)');

  it('protocolo real existe e cobre crise aguda + terapia hipouricemiante (ULT)', () => {
    expect(plano).not.toBeNull();
    const moleculas = plano!.farmacologico.map(s => s.molecula);
    expect(moleculas).toContain('Colchicina');
    expect(moleculas).toContain('Naproxeno');
    expect(moleculas).toContain('Alopurinol');
  });

  it('Alopurinol explicita no texto que NUNCA deve ser iniciado durante a crise aguda', () => {
    const alopurinol = plano!.farmacologico.find(s => s.molecula === 'Alopurinol')!;
    expect(alopurinol.indicacao.toLowerCase()).toContain('nunca iniciar durante crise aguda');
    expect(alopurinol.contraindicacoes.some(c => c.toLowerCase().includes('não iniciar durante crise') || c.toLowerCase().includes('nao iniciar durante crise'))).toBe(true);
  });

  it('Colchicina contraindica uso concomitante de inibidores potentes de CYP3A4 (interação grave)', () => {
    const colchicina = plano!.farmacologico.find(s => s.molecula === 'Colchicina')!;
    expect(colchicina.contraindicacoes.some(c => c.toLowerCase().includes('cyp3a4'))).toBe(true);
  });

  it('nenhuma sugestão desta RM tem DOI fabricado', () => {
    for (const s of plano!.farmacologico) {
      expect(s.evidencia.doi).toBeUndefined();
    }
  });
});

// ─── DRGE ─────────────────────────────────────────────────────

describe('RM-91 — DRGE: motor diagnóstico', () => {
  it('quadro típico (pirose + regurgitação + piora ao deitar) → sugere "DRGE" com CID K21', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Pirose e regurgitação frequentes',
      hda: 'Queimação retroesternal e regurgitação ácida, piora ao deitar à noite.',
    });
    const resultado = analyzeClinical(anamnese);
    const hip = resultado.hipoteses.find(h => h.id === 'drge');
    expect(hip).toBeDefined();
    expect(hip!.cid10).toBe('K21');
  });

  it('disfagia associada → red flag urgente (investigar EDA)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Pirose com disfagia',
      hda: 'Queimação retroesternal e regurgitação, com dificuldade para engolir recente.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(true);
  });

  it('sangramento GI associado → red flag urgente', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Pirose e vômito com sangue',
      hda: 'Queimação retroesternal e regurgitação, apresentou hematêmese hoje.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(true);
  });

  it('quadro típico sem nenhum sinal de alarme → encaminhamento_urgente false', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Pirose e regurgitação recorrentes',
      hda: 'Queimação retroesternal e regurgitação ácida, piora após comer, sem outros sintomas.',
    });
    const resultado = analyzeClinical(anamnese);
    expect(resultado.encaminhamento_urgente).toBe(false);
  });

  it('anamnese vazia → nunca sugere DRGE', () => {
    const resultado = analyzeClinical(baseAnamnesis());
    expect(resultado.hipoteses.some(h => h.id === 'drge')).toBe(false);
  });
});

describe('RM-91 — DRGE: motor terapêutico', () => {
  const plano = getTherapeuticForCondition('drge', 'DRGE (K21)');

  it('protocolo real existe com Omeprazol como 1ª linha', () => {
    expect(plano).not.toBeNull();
    expect(plano!.farmacologico.some(s => s.molecula === 'Omeprazol')).toBe(true);
  });

  it('medidas não farmacológicas incluem elevação de cabeceira e evitar deitar pós-prandial (1ª linha comportamental)', () => {
    expect(plano!.nao_farmacologico.some(m => m.toLowerCase().includes('elevação') || m.toLowerCase().includes('elevacao'))).toBe(true);
  });

  it('nenhuma sugestão desta RM tem DOI fabricado', () => {
    for (const s of plano!.farmacologico) {
      expect(s.evidencia.doi).toBeUndefined();
    }
  });
});

// ─── JOIN DIAGNÓSTICO → TERAPÊUTICO ────────────────────────────

describe('RM-91 — Join diagnóstico → terapêutico', () => {
  it('hipótese "gota" encontra o protocolo real via getTherapeuticForCondition(hipotese.id, ...)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Podagra com rubor e calor articular',
      hda: 'Dor articular súbita no hálux.',
    });
    const hip = analyzeClinical(anamnese).hipoteses.find(h => h.id === 'gota')!;
    const plano = getTherapeuticForCondition(hip.id, hip.nome) ?? getTherapeuticForCondition(hip.cid10 ?? '', hip.nome);
    expect(plano).not.toBeNull();
    expect(plano!.farmacologico.length).toBeGreaterThan(0);
  });

  it('hipótese "drge" encontra o protocolo real via getTherapeuticForCondition(hipotese.id, ...)', () => {
    const anamnese = baseAnamnesis({
      queixa_principal: 'Pirose e regurgitação',
      hda: 'Queimação retroesternal, regurgitação ácida, piora ao deitar.',
    });
    const hip = analyzeClinical(anamnese).hipoteses.find(h => h.id === 'drge')!;
    const plano = getTherapeuticForCondition(hip.id, hip.nome) ?? getTherapeuticForCondition(hip.cid10 ?? '', hip.nome);
    expect(plano).not.toBeNull();
    expect(plano!.farmacologico.length).toBeGreaterThan(0);
  });

  it('CID_CONDITION_MAP mapeia M10 → "gota" e K21 → "drge"', () => {
    expect(CID_CONDITION_MAP.M10).toBe('gota');
    expect(CID_CONDITION_MAP.K21).toBe('drge');
  });
});
