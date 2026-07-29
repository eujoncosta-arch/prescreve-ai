// ============================================================
// RM-50 (RM41-031) — cobertura direta de risco hemorrágico e interação
// terapêutica. `avaliarRiscoHemorragico`/`avaliarRiscoInteracao` não são
// exportadas — testadas através de `avaliarRiscoClinico`, sua única
// superfície pública, assertando `.risco_hemorragico`/`.risco_interacao`.
// ============================================================
import { describe, it, expect } from 'vitest';
import { avaliarRiscoClinico } from '@/lib/clinical-risk-engine';
import { calcHASBLED } from '@/lib/clinical-calculators';
import type { Anamnesis, TherapeuticSuggestion } from '@/lib/types';

function anamneseBase(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: 'Acompanhamento', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '',
    comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

function medicamento(overrides: Partial<TherapeuticSuggestion> = {}): TherapeuticSuggestion {
  return {
    id: 'x', classe_terapeutica: 'Anti-hipertensivo', molecula: 'Losartana', nome_generico: 'losartana',
    indicacao: 'HAS', dose: { dose_padrao: '50', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
    posologia_completa: '50 mg VO 1x/dia',
    evidencia: { diretriz: 'x', sociedade: 'x', ano: 2024, citacao: 'x', nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'x' } },
    contraindicacoes: [], efeitos_adversos: [], monitoramento: [], alternativas: [],
    ...overrides,
  };
}

function medEmUso(nome: string) {
  return { id: '1', nome, em_uso: true };
}

describe('RM-50 — risco hemorrágico (avaliarRiscoClinico().risco_hemorragico)', () => {
  it('paciente sem nenhum fator de risco: score baixo, protecao explicita', () => {
    const r = avaliarRiscoClinico(anamneseBase(), [medicamento()]);
    expect(r.risco_hemorragico.score).toBeLessThan(20);
    expect(r.risco_hemorragico.protecoes).toContain('Sem fatores de risco hemorrágico identificados');
  });

  it('histórico de sangramento ativo: +40 no score, fator listado', () => {
    const r = avaliarRiscoClinico(anamneseBase({ comorbidades: ['sangramento gastrointestinal recente'] }), []);
    expect(r.risco_hemorragico.score).toBeGreaterThanOrEqual(40);
    expect(r.risco_hemorragico.fatores.some((f) => f.includes('Sangramento'))).toBe(true);
  });

  it('trombocitopenia: +25 no score', () => {
    const r = avaliarRiscoClinico(anamneseBase({ comorbidades: ['trombocitopenia'] }), []);
    expect(r.risco_hemorragico.score).toBeGreaterThanOrEqual(25);
  });

  it('AINE + anticoagulante (varfarina): interação hemorrágica grave detectada, com ação explícita de bloqueio', () => {
    const anamnese = anamneseBase({
      medicamentos_em_uso: [medEmUso('Varfarina 5mg'), medEmUso('Ibuprofeno 600mg')],
    });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_hemorragico.fatores.some((f) => f.includes('AINE') && f.includes('antitrombótico'))).toBe(true);
    expect(r.risco_hemorragico.acoes.some((a) => a.toLowerCase().includes('contraindicado'))).toBe(true);
  });

  it('AAS + anticoagulante (dupla antitrombótica): fator específico detectado', () => {
    const anamnese = anamneseBase({
      medicamentos_em_uso: [medEmUso('AAS 100mg'), medEmUso('Rivaroxabana 20mg')],
    });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_hemorragico.fatores.some((f) => f.includes('Dupla antitrombótica'))).toBe(true);
  });

  it('cirrose Child-Pugh C: +35 e ação de avaliar INR/TP', () => {
    const r = avaliarRiscoClinico(
      anamneseBase({ funcao_hepatica: { child_pugh: 'C' } }),
      [],
    );
    expect(r.risco_hemorragico.score).toBeGreaterThanOrEqual(35);
    expect(r.risco_hemorragico.acoes.some((a) => a.includes('INR'))).toBe(true);
  });

  it('idade >= 75 anos (extraída de hpp/hda via regex): +10 no score', () => {
    const r = avaliarRiscoClinico(anamneseBase({ hpp: 'paciente com 80 anos, hígido' }), []);
    expect(r.risco_hemorragico.fatores.some((f) => f.includes('80 anos'))).toBe(true);
  });

  it('score >= 50: dispara ação de solicitar hemograma + coagulograma', () => {
    const anamnese = anamneseBase({
      comorbidades: ['sangramento recente', 'trombocitopenia'], // 40 + 25 = 65
    });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_hemorragico.score).toBeGreaterThanOrEqual(50);
    expect(r.risco_hemorragico.acoes.some((a) => a.includes('hemograma'))).toBe(true);
  });

  it('score nunca ultrapassa 100 (clamp) mesmo com múltiplos fatores graves simultâneos', () => {
    const anamnese = anamneseBase({
      comorbidades: ['sangramento ativo', 'trombocitopenia', 'hemofilia'],
      funcao_hepatica: { child_pugh: 'C' },
      hpp: '80 anos',
      medicamentos_em_uso: [medEmUso('Varfarina'), medEmUso('AAS'), medEmUso('Ibuprofeno')],
    });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_hemorragico.score).toBeLessThanOrEqual(100);
  });
});

describe('RM-50 — HAS-BLED (calcHASBLED) — cobertura direta de todos os 9 campos', () => {
  const nenhumFator = {
    hipertensao_nao_controlada: false, disfuncao_renal: false, disfuncao_hepatica: false,
    avc_previo: false, sangramento_previo: false, inr_labil: false, idoso_ge_65: false,
    drogas_antiagregantes_ou_aines: false, alcool_ge_8_drinks_semana: false,
  };

  it('nenhum fator de risco: score 0, classificação Baixo', () => {
    const r = calcHASBLED(nenhumFator);
    expect(r.score).toBe(0);
    expect(r.classificacao).toBe('Baixo');
  });

  it('cada campo individualmente soma exatamente 1 ponto', () => {
    for (const campo of Object.keys(nenhumFator) as (keyof typeof nenhumFator)[]) {
      const r = calcHASBLED({ ...nenhumFator, [campo]: true });
      expect(r.score, `campo ${campo}`).toBe(1);
    }
  });

  it('fronteira score 2 → Moderado, score 3 → Alto (alto_risco = true)', () => {
    const r2 = calcHASBLED({ ...nenhumFator, hipertensao_nao_controlada: true, idoso_ge_65: true });
    expect(r2.classificacao).toBe('Moderado');
    expect(r2.recomendacao).toContain('Score < 3');

    const r3 = calcHASBLED({ ...nenhumFator, hipertensao_nao_controlada: true, idoso_ge_65: true, avc_previo: true });
    expect(r3.classificacao).toBe('Alto');
    expect(r3.recomendacao).toContain('Score ≥ 3');
  });

  it('todos os 9 fatores presentes: score 9, classificação Alto', () => {
    const todos = Object.fromEntries(Object.keys(nenhumFator).map((k) => [k, true])) as typeof nenhumFator;
    const r = calcHASBLED(todos);
    expect(r.score).toBe(9);
    expect(r.classificacao).toBe('Alto');
    expect(r.passo_a_passo).toHaveLength(9);
  });
});

describe('RM-50 — risco de interação (avaliarRiscoClinico().risco_interacao) — cobertura dos 10 pares de PARES_INTERACAO', () => {
  it('IECA + BRA: duplo bloqueio do SRAA detectado (par alto)', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Enalapril'), medEmUso('Losartana')] });
    const r = avaliarRiscoClinico(anamnese, [
      medicamento({ classe_terapeutica: 'IECA', molecula: 'Enalapril' }),
      medicamento({ classe_terapeutica: 'BRA', molecula: 'Losartana' }),
    ]);
    expect(r.risco_interacao.fatores.some((f) => /IECA.*BRA|BRA.*IECA/i.test(f))).toBe(true);
  });

  it('varfarina + AINE: par "muito_alto" (risco hemorrágico grave TGI) é detectado na dimensão de interação', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Varfarina'), medEmUso('Diclofenaco')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /varfarina/i.test(f) && /aine/i.test(f))).toBe(true);
  });

  it('amiodarona + azitromicina: prolongamento de QT (par muito_alto) é detectado', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Amiodarona'), medEmUso('Azitromicina')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /amiodarona/i.test(f) && /azitromicina/i.test(f))).toBe(true);
  });

  it('metformina + contraste iodado: risco de acidose lática detectado', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Metformina'), medEmUso('Contraste iodado')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /metformina/i.test(f) && /contraste/i.test(f))).toBe(true);
  });

  it('ISRS + tramadol: síndrome serotoninérgica detectada', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Fluoxetina (ISRS)'), medEmUso('Tramadol')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /isrs/i.test(f) && /tramadol/i.test(f))).toBe(true);
  });

  it('corticoide + AINE: risco de úlcera péptica/sangramento TGI detectado', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Prednisona (corticoide)'), medEmUso('Ibuprofeno (AINE)')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /corticoide/i.test(f) && /aine/i.test(f))).toBe(true);
  });

  it('IECA + espironolactona: risco de hipercalemia (par moderado) detectado', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Captopril (IECA)'), medEmUso('Espironolactona')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /ieca/i.test(f) && /espironolactona/i.test(f))).toBe(true);
  });

  it('BRA + AINE: mesma interação renal que IECA + AINE, detectada separadamente', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Losartana (BRA)'), medEmUso('Naproxeno (AINE)')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /bra/i.test(f) && /aine/i.test(f))).toBe(true);
  });

  it('IECA + AINE: redução do efeito anti-hipertensivo + nefrotoxicidade detectada', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Enalapril (IECA)'), medEmUso('Ibuprofeno (AINE)')] });
    const r = avaliarRiscoClinico(anamnese, []);
    expect(r.risco_interacao.fatores.some((f) => /ieca/i.test(f) && /aine/i.test(f))).toBe(true);
  });

  it('sem nenhum par de PARES_INTERACAO presente: nenhum fator de interação é fabricado', () => {
    const anamnese = anamneseBase({ medicamentos_em_uso: [medEmUso('Paracetamol')] });
    const r = avaliarRiscoClinico(anamnese, [medicamento({ molecula: 'Paracetamol', classe_terapeutica: 'Analgésico' })]);
    expect(r.risco_interacao.fatores).toHaveLength(0);
  });

  it('lista de medicamentos vazia: não lança erro, não fabrica interação', () => {
    expect(() => avaliarRiscoClinico(anamneseBase(), [])).not.toThrow();
    const r = avaliarRiscoClinico(anamneseBase(), []);
    expect(r.risco_interacao.fatores).toHaveLength(0);
  });
});
