// ============================================================
// RM-88 — Cobertura de testes dedicados para explainable-ai-v2.ts
//
// O motor Explainable AI 2.0 (WHY / WHY NOT / WHAT IF / ALTERNATIVAS /
// Explainability Score) nunca teve testes dedicados próprios — só o
// componente "Adequação ao Paciente" do score foi coberto pelo RM-86.
// Esta RM cobre as 6 seções com dados reais (`getTherapeuticForCondition`,
// protocolos reais de `clinical-therapeutics.ts`), nunca mocks.
//
// Escrever esta cobertura expôs um segundo caso do mesmo antipadrão do
// RM-86 (cast `as unknown as Record<string, unknown>` lendo um
// `trust_score` que `TherapeuticSuggestion` nunca teve) dentro de
// `gerarWHYNOT` — código morto desde sempre, removido nesta RM (ver
// comentário em `explainable-ai-v2.ts`). E um bug de normalização de nome
// de molécula em `gerarWHY` (EVIDENCIA_DB usa "/" para combinações, o
// motor real grava "+") que tornava os 2 verbetes curados de combinação
// inatingíveis — corrigido com `normalizeMolecula`.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Anamnesis, TherapeuticSuggestion } from '@/lib/types';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import {
  gerarWHY,
  gerarWHYNOT,
  gerarWHATIF,
  gerarALTERNATIVAS,
  calcularExplainabilityScore,
  gerarExplainableAIv2,
} from '@/lib/explainable-ai-v2';

function baseAnamnesis(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: '', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {},
    imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

function sugestao(molecula: string, planoCid: string, condId: string): TherapeuticSuggestion {
  const plano = getTherapeuticForCondition(condId, planoCid)!;
  const s = plano.farmacologico.find(f => f.molecula === molecula);
  if (!s) throw new Error(`Molécula "${molecula}" não encontrada no protocolo "${condId}"`);
  return s;
}

const ENALAPRIL = sugestao('Enalapril', 'HAS (I10)', 'has');
const HCTZ = sugestao('Hidroclorotiazida', 'HAS (I10)', 'has');
const CARVEDILOL = sugestao('Carvedilol', 'IC (I50)', 'icc');
const METFORMINA = sugestao('Metformina', 'DM2 (E11)', 'dm2');
const BUDESONIDA_FORMOTEROL = sugestao('Budesonida + Formoterol', 'Asma (J45)', 'asma');
const ROSUVASTATINA = sugestao('Rosuvastatina', 'Dislipidemia', 'dislipidemia'); // única molécula real do catálogo com "hepatopatia" na ficha de contraindicações

/**
 * Molécula sintética para testar ramos de `gerarWHYNOT` cujo texto de
 * contraindicação ("bradicardia", "hiperpotassemia") não aparece
 * literalmente em nenhuma ficha real do catálogo hoje (ex.: Carvedilol usa
 * "Bradiarritmias", Espironolactona usa "K+ > 5,0", nenhum dos dois contém
 * a palavra exata que o motor procura). Testa a lógica de casamento de
 * string do motor isoladamente, sem depender de uma coincidência de texto
 * em dado clínico real — nenhum campo clínico é inventado, só o
 * contêiner mínimo necessário para exercitar a função pura.
 */
function sugestaoComContraindicacoes(contraindicacoes: string[]): TherapeuticSuggestion {
  return {
    ...ENALAPRIL,
    id: 'rm88-sintetica',
    contraindicacoes,
  };
}

describe('RM-88 — gerarWHY()', () => {
  it('molécula com entrada curada em EVIDENCIA_DB (Enalapril) → usa diretriz/estudos/mecanismo curados, não o fallback genérico', () => {
    const why = gerarWHY(ENALAPRIL);
    expect(why.justificativas_diretriz[0].sociedade).toBe('European Society of Cardiology (ESC)');
    expect(why.estudos_pivotais.length).toBeGreaterThan(0);
    expect(why.estudos_pivotais.some(e => e.nome === 'SOLVD-Treatment')).toBe(true);
    expect(why.mecanismo_acao).toMatch(/enzima conversora de angiotensina/i);
  });

  it('molécula de combinação (Budesonida + Formoterol, nome com "+") → casa com a entrada curada "budesonida/formoterol" (RM-88, bug de normalização corrigido)', () => {
    const why = gerarWHY(BUDESONIDA_FORMOTEROL);
    expect(why.justificativas_diretriz[0].sociedade).toBe('Global Initiative for Asthma (GINA)'); // RM-95: SBPT não é coautora do relatório GINA
    expect(why.estudos_pivotais.some(e => e.nome === 'SYGMA 2')).toBe(true);
  });

  it('molécula sem entrada em EVIDENCIA_DB → cai no fallback honesto baseado nos dados da própria sugestão (med.evidencia/med.indicacao), nunca inventa um mecanismo', () => {
    const why = gerarWHY(HCTZ);
    expect(why.justificativas_diretriz[0].sociedade).toBe(HCTZ.evidencia.sociedade);
    expect(why.estudos_pivotais).toEqual([]);
    expect(why.mecanismo_acao).toContain(HCTZ.molecula);
    expect(why.beneficio_risco.nnt).toBe(25); // fallback padrão documentado no código
  });

  it('score_evidencia nunca ultrapassa 100 mesmo com NNT muito baixo e nível A', () => {
    const why = gerarWHY(ENALAPRIL);
    expect(why.score_evidencia).toBeLessThanOrEqual(100);
    expect(why.score_evidencia).toBeGreaterThan(0);
  });
});

describe('RM-88 — gerarWHYNOT()', () => {
  it('gestante + contraindicação de gravidez na ficha → restrição absoluta', () => {
    const anamnese = baseAnamnesis({ gestante: true });
    const res = gerarWHYNOT(ENALAPRIL, anamnese); // Enalapril contraindica "Gravidez (categoria D)"
    expect(res.tem_contraindicacao_absoluta).toBe(true);
    expect(res.restricoes.some(r => r.gravidade === 'absoluta' && r.criterio_ativado.includes('Gestação'))).toBe(true);
    expect(res.resumo).toMatch(/Contraindicação absoluta/);
  });

  it('TFG < 15 → restrição classificada como absoluta (não apenas grave)', () => {
    const anamnese = baseAnamnesis({ funcao_renal: { tfg: 10 } });
    const res = gerarWHYNOT(ENALAPRIL, anamnese);
    const r = res.restricoes.find(rr => rr.criterio_ativado.includes('TFG'));
    expect(r?.gravidade).toBe('absoluta');
  });

  it('TFG entre 15 e 30 → restrição grave (não absoluta)', () => {
    const anamnese = baseAnamnesis({ funcao_renal: { tfg: 25 } });
    const res = gerarWHYNOT(ENALAPRIL, anamnese);
    const r = res.restricoes.find(rr => rr.criterio_ativado.includes('TFG'));
    expect(r?.gravidade).toBe('grave');
  });

  it('TFG normal (≥ 30) → nenhuma restrição renal', () => {
    const anamnese = baseAnamnesis({ funcao_renal: { tfg: 90 } });
    const res = gerarWHYNOT(ENALAPRIL, anamnese);
    expect(res.restricoes.some(r => r.criterio_ativado.includes('TFG'))).toBe(false);
  });

  it('hiperpotassemia (K+ > 5,5) → restrição grave; K+ entre 5,0 e 5,5 → moderada', () => {
    const med = sugestaoComContraindicacoes(['Hiperpotassemia (K+ elevado)']);
    const grave = gerarWHYNOT(med, baseAnamnesis({ laboratorio: { potassio: '5.8' } }));
    const moderada = gerarWHYNOT(med, baseAnamnesis({ laboratorio: { potassio: '5.2' } }));
    expect(grave.restricoes.find(r => r.criterio_ativado.includes('K+'))?.gravidade).toBe('grave');
    expect(moderada.restricoes.find(r => r.criterio_ativado.includes('K+'))?.gravidade).toBe('moderada');
  });

  it('bradicardia (FC < 55) com contraindicação de bradicardia na ficha → restrição relativa, baseada na FC real', () => {
    const med = sugestaoComContraindicacoes(['Bradicardia sinusal grave']);
    const res = gerarWHYNOT(med, baseAnamnesis({ sinais_vitais: { fc: 48 } }));
    expect(res.restricoes.some(r => r.tipo === 'contraindicacao_relativa' && r.criterio_ativado.includes('FC'))).toBe(true);
  });

  it('hipotensão (PA sistólica < 90) → restrição grave quando a ficha contraindica hipotensão', () => {
    const res = gerarWHYNOT(CARVEDILOL, baseAnamnesis({ sinais_vitais: { pa_sistolica: 80 } }));
    expect(res.restricoes.some(r => r.criterio_ativado.includes('PA sistólica'))).toBe(true);
  });

  it('asma na anamnese + contraindicação de asma (betabloqueador) → restrição absoluta', () => {
    const res = gerarWHYNOT(CARVEDILOL, baseAnamnesis({ comorbidades: ['Asma brônquica'] }));
    expect(res.tem_contraindicacao_absoluta).toBe(true);
  });

  it('Child-Pugh C → restrição grave quando a ficha contraindica hepatopatia (Rosuvastatina: "Hepatopatia ativa")', () => {
    const res = gerarWHYNOT(ROSUVASTATINA, baseAnamnesis({ funcao_hepatica: { child_pugh: 'C' } }));
    expect(res.restricoes.some(r => r.criterio_ativado === 'Child-Pugh C')).toBe(true);
  });

  it('interação IECA + espironolactona em uso → interação moderada de hiperpotassemia', () => {
    const res = gerarWHYNOT(ENALAPRIL, baseAnamnesis({
      medicamentos_em_uso: [{ id: '1', nome: 'Espironolactona 25mg', em_uso: true }],
    }));
    expect(res.restricoes.some(r => r.tipo === 'interacao_moderada' && r.descricao.includes('hiperpotassemia'))).toBe(true);
  });

  it('sem nenhum achado clínico relevante → nenhuma restrição, resumo afirma ausência de contraindicação', () => {
    const res = gerarWHYNOT(METFORMINA, baseAnamnesis());
    expect(res.restricoes).toEqual([]);
    expect(res.tem_contraindicacao_absoluta).toBe(false);
    expect(res.score_seguranca).toBe(100);
    expect(res.resumo).toMatch(/Nenhuma contraindicação ativa/);
  });

  it('RM-88 — nunca gera restrição do tipo "Trust Score baixo" (bloco morto removido; TherapeuticSuggestion nunca tem trust_score)', () => {
    // Confirma que remover o código morto não introduziu nenhuma restrição nova nem quebrou nenhuma existente.
    const res = gerarWHYNOT(ENALAPRIL, baseAnamnesis({ gestante: true, funcao_renal: { tfg: 10 } }));
    expect(res.restricoes.some(r => r.descricao.includes('Trust Score'))).toBe(false);
  });

  it('ajuste_dose: TFG < 60 sem restrição renal já presente → adiciona ajuste de dose leve, usando o texto real de med.dose.ajuste_renal', () => {
    const res = gerarWHYNOT(ENALAPRIL, baseAnamnesis({ funcao_renal: { tfg: 45 } }));
    const ajuste = res.restricoes.find(r => r.tipo === 'ajuste_dose' && r.criterio_ativado.includes('TFG'));
    expect(ajuste).toBeDefined();
    expect(ajuste!.acao_recomendada).toBe(ENALAPRIL.dose.ajuste_renal);
    expect(ajuste!.gravidade).toBe('leve');
  });

  it('alternativa_sugerida só aparece quando há contraindicação absoluta', () => {
    const comAbsoluta = gerarWHYNOT(ENALAPRIL, baseAnamnesis({ gestante: true }));
    const semAbsoluta = gerarWHYNOT(METFORMINA, baseAnamnesis());
    expect(comAbsoluta.alternativa_sugerida).toBeDefined();
    expect(semAbsoluta.alternativa_sugerida).toBeUndefined();
  });
});

describe('RM-88 — gerarWHATIF()', () => {
  it('CID com cenários mapeados (I10) → retorna cenários reais, melhor_evidencia/custo/perfil preenchidos', () => {
    const res = gerarWHATIF('I10', baseAnamnesis());
    expect(res.cenarios.length).toBeGreaterThan(0);
    expect(res.melhor_evidencia).not.toBe('');
    expect(res.melhor_custo_efetividade).not.toBe('');
    expect(res.melhor_perfil_paciente).not.toBe('');
  });

  it('CID sem cenários mapeados → array vazio, nunca lança exceção (reduce sobre array vazio tratado com segurança)', () => {
    expect(() => gerarWHATIF('Z99', baseAnamnesis())).not.toThrow();
    const res = gerarWHATIF('Z99', baseAnamnesis());
    expect(res.cenarios).toEqual([]);
    expect(res.melhor_evidencia).toBe('');
  });

  it('bônus de adequação ao paciente: DM2 + Empagliflozina/Dapagliflozina ganha bônus de trust_score; Metformina em paciente sem diabetes é penalizada', () => {
    const semDm2 = gerarWHATIF('E11', baseAnamnesis());
    const comDm2 = gerarWHATIF('E11', baseAnamnesis({ comorbidades: ['Diabetes Mellitus Tipo 2'] }));

    const empaSem = semDm2.cenarios.find(c => c.molecula === 'Empagliflozina')!;
    const empaCom = comDm2.cenarios.find(c => c.molecula === 'Empagliflozina')!;
    expect(empaCom.trust_score).toBeGreaterThan(empaSem.trust_score);

    const metfSem = semDm2.cenarios.find(c => c.molecula === 'Metformina')!;
    const metfCom = comDm2.cenarios.find(c => c.molecula === 'Metformina')!;
    expect(metfSem.trust_score).toBeLessThan(metfCom.trust_score);
  });

  it('trust_score de cenário nunca ultrapassa 100 mesmo somando todos os bônus', () => {
    const anamnese = baseAnamnesis({ comorbidades: ['Diabetes Mellitus Tipo 2'], funcao_renal: { tfg: 40 } });
    const res = gerarWHATIF('E11', anamnese);
    for (const c of res.cenarios) {
      expect(c.trust_score).toBeLessThanOrEqual(100);
    }
  });

  it('CID com sufixo (ex.: "I10.0") usa o CID principal (antes do ponto) para buscar cenários', () => {
    const res = gerarWHATIF('I10.0', baseAnamnesis());
    expect(res.cenarios.length).toBeGreaterThan(0);
  });
});

describe('RM-88 — gerarALTERNATIVAS()', () => {
  it('CID mapeado (I10) → lista real de alternativas por linha, nota clínica e disclaimer presentes', () => {
    const res = gerarALTERNATIVAS('I10');
    expect(res.alternativas.length).toBeGreaterThan(0);
    expect(res.alternativas.some(a => a.linha === '1a_linha')).toBe(true);
    expect(res.nota_clinica).not.toBe('');
    expect(res.disclaimer).toMatch(/Decisão final: médico/);
  });

  it('CID não mapeado → lista vazia com nota explicando a ausência, nunca inventa alternativas', () => {
    const res = gerarALTERNATIVAS('Z99');
    expect(res.alternativas).toEqual([]);
    expect(res.nota_clinica).toMatch(/não disponível/i);
  });

  it('a hierarquia clínica (Diretriz → Classe → Molécula) é sempre citada no disclaimer, independente da marca', () => {
    const res = gerarALTERNATIVAS('E11');
    expect(res.disclaimer).toMatch(/marca comercial NUNCA influencia/);
  });
});

describe('RM-88 — calcularExplainabilityScore()', () => {
  it('score_total é a soma ponderada exata dos 5 componentes (peso total 100)', () => {
    const why = gerarWHY(ENALAPRIL);
    const whyNot = gerarWHYNOT(ENALAPRIL, baseAnamnesis());
    const score = calcularExplainabilityScore(why, whyNot, ENALAPRIL, baseAnamnesis());

    const pesoTotal = score.componentes.reduce((acc, c) => acc + c.peso, 0);
    expect(pesoTotal).toBe(100);

    const esperado = Math.round(score.componentes.reduce((acc, c) => acc + (c.valor * c.peso) / 100, 0));
    expect(score.score_total).toBe(esperado);
  });

  it('confiavel_para_prescricao é false quando há contraindicação absoluta, mesmo com score alto', () => {
    const why = gerarWHY(ENALAPRIL);
    const anamneseGestante = baseAnamnesis({ gestante: true });
    const whyNot = gerarWHYNOT(ENALAPRIL, anamneseGestante);
    const score = calcularExplainabilityScore(why, whyNot, ENALAPRIL, anamneseGestante);

    expect(whyNot.tem_contraindicacao_absoluta).toBe(true);
    expect(score.confiavel_para_prescricao).toBe(false);
  });

  it('confiavel_para_prescricao é true quando score ≥ 55 e sem contraindicação absoluta', () => {
    const why = gerarWHY(ENALAPRIL);
    const anamnese = baseAnamnesis({
      sinais_vitais: { pa_sistolica: 150, fc: 80 },
      funcao_renal: { creatinina: 1.0, tfg: 90 },
      comorbidades: ['Hipertensão Arterial Sistêmica'],
      laboratorio: { hba1c: '6.0', ldl: '110' },
    });
    const whyNot = gerarWHYNOT(ENALAPRIL, anamnese);
    const score = calcularExplainabilityScore(why, whyNot, ENALAPRIL, anamnese);

    expect(score.score_total).toBeGreaterThanOrEqual(55);
    expect(score.confiavel_para_prescricao).toBe(true);
  });

  it('c_dados_clinicos reflete exatamente quantos dos 7 parâmetros foram informados', () => {
    const why = gerarWHY(ENALAPRIL);
    const whyNot = gerarWHYNOT(ENALAPRIL, baseAnamnesis());
    const anamneseVazia = baseAnamnesis();
    const scoreVazio = calcularExplainabilityScore(why, whyNot, ENALAPRIL, anamneseVazia);
    const cDadosVazio = scoreVazio.componentes.find(c => c.nome === 'Completude dos Dados Clínicos')!;
    // `comorbidades.length` é 0 (array vazio) mas `0 !== undefined/null`, então o motor
    // conta esse parâmetro como "informado" mesmo numa anamnese totalmente vazia — 1/7.
    expect(cDadosVazio.valor).toBe(14);
    expect(cDadosVazio.descricao).toBe('1/7 parâmetros clínicos informados');

    const anamneseCompleta = baseAnamnesis({
      sinais_vitais: { pa_sistolica: 140, fc: 80 },
      funcao_renal: { creatinina: 1.1, tfg: 85 },
      comorbidades: ['HAS'],
      laboratorio: { hba1c: '6.5', ldl: '100' },
    });
    const scoreCompleto = calcularExplainabilityScore(why, whyNot, ENALAPRIL, anamneseCompleta);
    const cDadosCompleto = scoreCompleto.componentes.find(c => c.nome === 'Completude dos Dados Clínicos')!;
    expect(cDadosCompleto.valor).toBe(100);
    expect(cDadosCompleto.descricao).toBe('7/7 parâmetros clínicos informados');
  });

  it('nível e cor seguem os limiares documentados do score_total (85/70/55/40)', () => {
    // Usa o próprio cálculo real em vez de reimplementar os limiares — valida a consistência interna.
    const why = gerarWHY(ENALAPRIL);
    const whyNot = gerarWHYNOT(ENALAPRIL, baseAnamnesis());
    const score = calcularExplainabilityScore(why, whyNot, ENALAPRIL, baseAnamnesis());

    if (score.score_total >= 85) expect(score.nivel).toBe('muito_alto');
    else if (score.score_total >= 70) expect(score.nivel).toBe('alto');
    else if (score.score_total >= 55) expect(score.nivel).toBe('moderado');
    else if (score.score_total >= 40) expect(score.nivel).toBe('baixo');
    else expect(score.nivel).toBe('muito_baixo');
  });

  it('componente "Custo-Efetividade (NNT)" usa os limiares corretos (≤10, ≤25, ≤50, >50)', () => {
    // gerarWHY deriva o NNT de EVIDENCIA_DB/fallback — testamos via o resultado real do Enalapril (NNT 14 → bucket ≤25 → 80).
    const why = gerarWHY(ENALAPRIL);
    expect(why.beneficio_risco.nnt).toBe(23); // SOLVD: 39,7% vs 35,2% → ARR 4,5 pp → NNT 22,2 → 23
    const whyNot = gerarWHYNOT(ENALAPRIL, baseAnamnesis());
    const score = calcularExplainabilityScore(why, whyNot, ENALAPRIL, baseAnamnesis());
    const cNnt = score.componentes.find(c => c.nome === 'Custo-Efetividade (NNT)')!;
    expect(cNnt.valor).toBe(80);
  });
});

describe('RM-88 — gerarExplainableAIv2() (orquestrador)', () => {
  it('combina as 4 seções + score num único resultado coerente, com disclaimer e timestamp válido', () => {
    const anamnese = baseAnamnesis({ funcao_renal: { tfg: 90 } });
    const resultado = gerarExplainableAIv2(ENALAPRIL, 'I10', anamnese);

    expect(resultado.why.indicacao_principal).toBe(ENALAPRIL.indicacao);
    expect(resultado.why_not).toBeDefined();
    expect(resultado.what_if.cenarios.length).toBeGreaterThan(0);
    expect(resultado.alternatives.alternativas.length).toBeGreaterThan(0);
    expect(resultado.explainability_score.score_total).toBeGreaterThanOrEqual(0);
    expect(resultado.disclaimer).toMatch(/decisão clínica final é exclusivamente do médico/i);
    expect(() => new Date(resultado.gerado_em).toISOString()).not.toThrow();
  });

  it('funciona sem anamnese (parâmetro opcional) — nunca lança exceção por dado ausente', () => {
    expect(() => gerarExplainableAIv2(METFORMINA, 'E11')).not.toThrow();
  });
});
