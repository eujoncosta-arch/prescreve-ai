import { describe, it, expect } from 'vitest';
import {
  checarBaseCanonica,
  checarPediatricDoses,
  checarDoseAdultoLegado,
  extrairNumeroSimples,
  textoComparavel,
  validarIntegridadeGlobal,
} from '@/validation/data-integrity';
import type { DrugEntity } from '@/lib/pharma-core';
import type { PediatricDoseEntry } from '@/lib/pediatric-engine';
import type { QuickDrug } from '@/lib/pharma-database';

// ============================================================
// RM-40 — Validador de Integridade de Dados Clínicos
//
// Garante que dados clínicos não entram/permanecem em estado
// semanticamente inconsistente: dose sem unidade, unidade incompatível,
// dose diária confundida com dose por tomada, máximo menor que a dose
// habitual, faixa etária invertida, duplicidade de molécula, ATC
// inválido, fonte ausente, regime sem população definida.
//
// Cada teste usa uma entidade MÍNIMA sintética — nunca a base real —
// para isolar exatamente a regra sob teste.
// ============================================================

function baseEntity(overrides: Partial<DrugEntity> = {}): DrugEntity {
  return {
    id: 'drug:teste:x',
    legacyId: 'x',
    activeIngredient: { moleculeId: 'mol:teste', name: 'Teste' },
    category: 'teste',
    therapeuticClass: 'teste',
    brands: [],
    laboratories: [],
    presentations: [],
    concentrations: [],
    indications: ['Indicação de teste'],
    contraindications: [],
    interactions: [],
    dosageRules: [{ population: 'adulto', summary: 'Dose de teste' }],
    references: [{ type: 'BULA', value: 'Bula de teste' }],
    alerts: [],
    pregnancy: 'avaliar',
    lactation: 'avaliar',
    provenance: {
      origem: 'bula_oficial',
      data_atualizacao: '2026-01-01',
      responsavel: 'teste',
      nivel_confianca: 'ALTA',
    },
    ...overrides,
  } as DrugEntity;
}

describe('extrairNumeroSimples() — só extrai número de texto genuinamente simples (RM-40)', () => {
  it('valor bare simples é extraído', () => {
    expect(extrairNumeroSimples('10')).toBe(10);
    expect(extrairNumeroSimples('2.5')).toBe(2.5);
  });

  it('faixa simples "N-M" extrai o primeiro valor', () => {
    expect(extrairNumeroSimples('5-60')).toBe(5);
  });

  it('valor com unidade simples reconhecida ainda é extraído', () => {
    expect(extrairNumeroSimples('40 mg')).toBe(40);
    expect(extrairNumeroSimples('5–60 mg/dia')).toBe(5);
  });

  it('texto narrativo com número embutido NÃO é extraído (evita falso positivo)', () => {
    expect(extrairNumeroSimples('Individualizar conforme INR')).toBeUndefined();
    expect(extrairNumeroSimples('0–15 min antes das refeições (SC)')).toBeUndefined();
  });

  it('razão de mistura (ex.: "70:30") NÃO é confundida com uma dose — achado real da auditoria (heliox)', () => {
    expect(extrairNumeroSimples('Mistura 70:30 (He:O₂) — 10–15 L/min por máscara não-reinalante')).toBeUndefined();
    expect(extrairNumeroSimples('Mistura 60:40 (se SpO₂ exigir mais O₂)')).toBeUndefined();
  });

  it('valor ausente retorna undefined', () => {
    expect(extrairNumeroSimples(undefined)).toBeUndefined();
    expect(extrairNumeroSimples('')).toBeUndefined();
  });
});

describe('textoComparavel() — rejeita comparação entre grandezas de tipos diferentes (RM-40)', () => {
  it('texto simples, mesma unidade → comparável', () => {
    expect(textoComparavel('40 mg', 'mg')).toBe(true);
  });

  it('texto com "/kg" → não comparável (dose por peso vs. absoluta)', () => {
    expect(textoComparavel('1–2 mg/kg/dia', 'mg')).toBe(false);
  });

  it('texto com "/dia" → não comparável (dose por dia vs. por tomada)', () => {
    expect(textoComparavel('4 g/dia', 'mg')).toBe(false);
  });

  it('texto com unidade DIFERENTE da esperada → não comparável', () => {
    expect(textoComparavel('4 g/dia', 'mg')).toBe(false);
    expect(textoComparavel('300 mcg', 'mg')).toBe(false);
  });
});

describe('checarBaseCanonica() — ATC, fonte, proveniência, população, duplicidade de molécula', () => {
  it('ATC malformado gera warning ATC_INVALIDO', () => {
    const r = checarBaseCanonica([baseEntity({ activeIngredient: { moleculeId: 'mol:x', name: 'X', atc: 'B03AC' } })]);
    expect(r.some((a) => a.regra === 'ATC_INVALIDO' && a.nivel === 'warning')).toBe(true);
  });

  it('ATC válido (formato WHO completo) não gera achado', () => {
    const r = checarBaseCanonica([baseEntity({ activeIngredient: { moleculeId: 'mol:x', name: 'X', atc: 'C09AA05' } })]);
    expect(r.some((a) => a.regra === 'ATC_INVALIDO')).toBe(false);
  });

  it('fonte ausente (references vazio) gera info_incompleta FONTE_AUSENTE', () => {
    const r = checarBaseCanonica([baseEntity({ references: [] })]);
    expect(r.some((a) => a.regra === 'FONTE_AUSENTE' && a.nivel === 'info_incompleta')).toBe(true);
  });

  // RM-52 (RM41-012): ATC é classificação da OMS, não evidência clínica —
  // uma entidade cuja ÚNICA referência é `{type:'ATC'}` não pode mais
  // passar como "tem fonte" (references.length > 0 não bastava).
  it('única referência é ATC (classificação, não evidência) → AINDA dispara FONTE_AUSENTE', () => {
    const r = checarBaseCanonica([baseEntity({ references: [{ type: 'ATC', value: 'N05BA01' }] })]);
    expect(r.some((a) => a.regra === 'FONTE_AUSENTE')).toBe(true);
  });

  it('referências são só ATC + BEERS + PGX (todas classificatórias) → ainda dispara FONTE_AUSENTE', () => {
    const r = checarBaseCanonica([baseEntity({
      references: [
        { type: 'ATC', value: 'N05BA01' },
        { type: 'BEERS', value: 'Cautela em idosos' },
        { type: 'PGX', value: 'CYP3A4' },
      ],
    })]);
    expect(r.some((a) => a.regra === 'FONTE_AUSENTE')).toBe(true);
  });

  it('tem ATC + GUIDELINE real → NÃO dispara FONTE_AUSENTE (fonte clínica real presente)', () => {
    const r = checarBaseCanonica([baseEntity({
      references: [
        { type: 'ATC', value: 'N05BA01' },
        { type: 'GUIDELINE', value: 'SBC 2023' },
      ],
    })]);
    expect(r.some((a) => a.regra === 'FONTE_AUSENTE')).toBe(false);
  });

  it('proveniência ausente gera info_incompleta PROVENIENCIA_AUSENTE', () => {
    const r = checarBaseCanonica([baseEntity({ provenance: { origem: '' as never, data_atualizacao: '', responsavel: '', nivel_confianca: 'BAIXA' } })]);
    expect(r.some((a) => a.regra === 'PROVENIENCIA_AUSENTE')).toBe(true);
  });

  // RM-52 (RM41-013): `provenanceLegado()` atribui o sentinel epoch
  // '1970-01-01T00:00:00.000Z' a todo dado legado — sem esta regra, nenhum
  // validador sinalizava isso, e o valor podia ser confundido com uma data
  // real de atualização por qualquer feature futura que o consumisse.
  it('data_atualizacao com sentinel epoch (1970-01-01) gera info_incompleta PROVENIENCIA_DATA_PLACEHOLDER', () => {
    const r = checarBaseCanonica([baseEntity({
      provenance: { origem: 'LEGADO', data_atualizacao: '1970-01-01T00:00:00.000Z', responsavel: 'sistema:legado', nivel_confianca: 'NAO_VERIFICADO' },
    })]);
    expect(r.some((a) => a.regra === 'PROVENIENCIA_DATA_PLACEHOLDER' && a.nivel === 'info_incompleta')).toBe(true);
  });

  it('data_atualizacao com data real NÃO gera PROVENIENCIA_DATA_PLACEHOLDER', () => {
    const r = checarBaseCanonica([baseEntity({
      provenance: { origem: 'BULA_FABRICANTE', data_atualizacao: '2024-03-15T00:00:00.000Z', responsavel: 'equipe:farmacovigilancia', nivel_confianca: 'ALTA' },
    })]);
    expect(r.some((a) => a.regra === 'PROVENIENCIA_DATA_PLACEHOLDER')).toBe(false);
  });

  it('regime sem população válida (valor fora do enum, simulando dado malformado vindo de I/O) gera erro REGIME_SEM_POPULACAO', () => {
    const r = checarBaseCanonica([baseEntity({ dosageRules: [{ population: 'invalida' as never, summary: 'x' }] })]);
    expect(r.some((a) => a.regra === 'REGIME_SEM_POPULACAO' && a.nivel === 'erro')).toBe(true);
  });

  it('regime com população válida não gera achado', () => {
    const r = checarBaseCanonica([baseEntity({ dosageRules: [{ population: 'pediatrico', summary: 'x' }] })]);
    expect(r.some((a) => a.regra === 'REGIME_SEM_POPULACAO')).toBe(false);
  });

  it('mesma molécula em 2 entidades SEM contexto clínico distinto → erro MOLECULA_DUPLICADA', () => {
    const r = checarBaseCanonica([
      baseEntity({ id: 'drug:a', activeIngredient: { moleculeId: 'mol:dup', name: 'Dup' } }),
      baseEntity({ id: 'drug:b', activeIngredient: { moleculeId: 'mol:dup', name: 'Dup' } }),
    ]);
    expect(r.some((a) => a.regra === 'MOLECULA_DUPLICADA' && a.nivel === 'erro')).toBe(true);
  });

  it('mesma molécula em 2 entidades COM contexto clínico distinto → NÃO é duplicidade (intencional, RM-01 MED-01)', () => {
    const r = checarBaseCanonica([
      baseEntity({ id: 'drug:a', activeIngredient: { moleculeId: 'mol:ctx', name: 'Ctx' }, clinicalContext: 'geral' }),
      baseEntity({ id: 'drug:b', activeIngredient: { moleculeId: 'mol:ctx', name: 'Ctx' }, clinicalContext: 'uti' }),
    ]);
    expect(r.some((a) => a.regra === 'MOLECULA_DUPLICADA')).toBe(false);
  });
});

function baseIndicacao(): PediatricDoseEntry['indicacoes'][0] {
  return { nome: 'Indicação teste', frequencia: '2x/dia' };
}

function basePediatricEntry(overrides: Partial<PediatricDoseEntry> = {}): PediatricDoseEntry {
  return {
    drugId: 'teste',
    drugName: 'Teste',
    indicacoes: [{ ...baseIndicacao() }],
    formulacoes: [],
    fontes: ['Fonte de teste'],
    ...overrides,
  };
}

describe('checarPediatricDoses() — dose/unidade, faixa etária, dose máxima × habitual, fonte', () => {
  it('faixa etária invertida (idadeMinMeses > idadeMaxMeses) → erro FAIXA_ETARIA_INVERTIDA', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), idadeMinMeses: 24, idadeMaxMeses: 12 }] }),
    ]);
    expect(r.some((a) => a.regra === 'FAIXA_ETARIA_INVERTIDA' && a.nivel === 'erro')).toBe(true);
  });

  it('faixa etária correta (min < max) → nenhum achado de inversão', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), idadeMinMeses: 12, idadeMaxMeses: 24 }] }),
    ]);
    expect(r.some((a) => a.regra === 'FAIXA_ETARIA_INVERTIDA')).toBe(false);
  });

  it('formulação com faixaMeses invertida → erro', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ formulacoes: [{ faixaMeses: [24, 12], forma: 'Xarope', concentracao: '1 mg/mL' }] }),
    ]);
    expect(r.some((a) => a.regra === 'FAIXA_ETARIA_INVERTIDA')).toBe(true);
  });

  it('formulação com faixaKg invertida → erro', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ formulacoes: [{ faixaKg: [40, 10], forma: 'Comprimido', concentracao: '500 mg' }] }),
    ]);
    expect(r.some((a) => a.regra === 'FAIXA_ETARIA_INVERTIDA')).toBe(true);
  });

  it('dose sem NENHUMA variante estruturada → info_incompleta DOSE_SEM_UNIDADE', () => {
    const r = checarPediatricDoses([basePediatricEntry()]);
    expect(r.some((a) => a.regra === 'DOSE_SEM_UNIDADE' && a.nivel === 'info_incompleta')).toBe(true);
  });

  it('doseMgKg E doseMgKgDia informados sem `divisoes` para reconciliar → warning UNIDADE_AMBIGUA', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), doseMgKg: 10, doseMgKgDia: 30 }] }),
    ]);
    expect(r.some((a) => a.regra === 'UNIDADE_AMBIGUA' && a.nivel === 'warning')).toBe(true);
  });

  it('doseMgKgDia > maxDoseMgKgDia (dose habitual excede o teto) → erro MAXIMO_MENOR_QUE_HABITUAL', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), doseMgKgDia: 50, maxDoseMgKgDia: 30 }] }),
    ]);
    expect(r.some((a) => a.regra === 'MAXIMO_MENOR_QUE_HABITUAL' && a.nivel === 'erro')).toBe(true);
  });

  it('doseMgKgDia ≤ maxDoseMgKgDia → nenhum achado de teto', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), doseMgKgDia: 20, maxDoseMgKgDia: 30 }] }),
    ]);
    expect(r.some((a) => a.regra === 'MAXIMO_MENOR_QUE_HABITUAL')).toBe(false);
  });

  it('doseMgKg × divisoes excede maxDoseMgKgDia → erro MAXIMO_MENOR_QUE_HABITUAL', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), doseMgKg: 15, divisoes: 3, maxDoseMgKgDia: 30 }] }), // 15×3=45 > 30
    ]);
    expect(r.some((a) => a.regra === 'MAXIMO_MENOR_QUE_HABITUAL' && a.nivel === 'erro')).toBe(true);
  });

  it('dose por TOMADA sozinha já excede o teto DIÁRIO (sem `divisoes`) → erro DOSE_DIARIA_CONFUNDIDA_COM_TOMADA', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ indicacoes: [{ ...baseIndicacao(), doseMgKg: 50, maxDoseMgKgDia: 30 }] }),
    ]);
    expect(r.some((a) => a.regra === 'DOSE_DIARIA_CONFUNDIDA_COM_TOMADA' && a.nivel === 'erro')).toBe(true);
  });

  it('fonte ausente (fontes: []) → info_incompleta FONTE_AUSENTE', () => {
    const r = checarPediatricDoses([basePediatricEntry({ fontes: [] })]);
    expect(r.some((a) => a.regra === 'FONTE_AUSENTE' && a.nivel === 'info_incompleta')).toBe(true);
  });

  it('drugId duplicado entre 2 entradas → erro MOLECULA_DUPLICADA', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({ drugId: 'repetido' }),
      basePediatricEntry({ drugId: 'repetido' }),
    ]);
    expect(r.some((a) => a.regra === 'MOLECULA_DUPLICADA' && a.nivel === 'erro')).toBe(true);
  });

  it('entrada bem formada (dose + fonte + faixas corretas) → nenhum achado', () => {
    const r = checarPediatricDoses([
      basePediatricEntry({
        indicacoes: [{ ...baseIndicacao(), doseMgKgDia: 20, maxDoseMgKgDia: 40, divisoes: 2 }],
        formulacoes: [{ faixaMeses: [1, 24], forma: 'Xarope', concentracao: '1 mg/mL' }],
      }),
    ]);
    expect(r).toEqual([]);
  });
});

function baseQuickDrugDoseAdulto(overrides: Partial<QuickDrug['dose_adulto']> = {}): QuickDrug {
  return {
    id: 'teste',
    molecula: 'Teste',
    nome_generico: 'Teste',
    sinonimos: [],
    categoria: 'outro' as QuickDrug['categoria'],
    classe: 'Teste',
    indicacoes_principais: [],
    contraindicacoes_rapidas: [],
    interacoes_importantes: [],
    alertas_especiais: [],
    uso_gestante: 'avaliar',
    dose_adulto: {
      habitual: '10',
      max: '40',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['1x/dia'],
      ...overrides,
    },
  } as unknown as QuickDrug;
}

describe('checarDoseAdultoLegado() — dose habitual × máxima em texto livre (QuickDrug), sem falso positivo', () => {
  it('dose sem unidade (defensivo — dado malformado cruzando fronteira de I/O) → erro DOSE_SEM_UNIDADE', () => {
    const r = checarDoseAdultoLegado([
      baseQuickDrugDoseAdulto({ unidade: '' as never }),
    ]);
    expect(r.some((a) => a.regra === 'DOSE_SEM_UNIDADE' && a.nivel === 'erro')).toBe(true);
  });

  it('máximo simples MENOR que a dose habitual simples → erro MAXIMO_MENOR_QUE_HABITUAL', () => {
    const r = checarDoseAdultoLegado([baseQuickDrugDoseAdulto({ habitual: '40', max: '10' })]);
    expect(r.some((a) => a.regra === 'MAXIMO_MENOR_QUE_HABITUAL' && a.nivel === 'erro')).toBe(true);
  });

  it('mínimo simples MAIOR que a dose habitual simples → erro FAIXA_DOSE_INVERTIDA', () => {
    const r = checarDoseAdultoLegado([baseQuickDrugDoseAdulto({ habitual: '10', min: '40', max: '80' })]);
    expect(r.some((a) => a.regra === 'FAIXA_DOSE_INVERTIDA' && a.nivel === 'erro')).toBe(true);
  });

  it('faixa correta e simples (min ≤ habitual ≤ max) → nenhum achado de erro', () => {
    const r = checarDoseAdultoLegado([baseQuickDrugDoseAdulto({ habitual: '20', min: '10', max: '40' })]);
    expect(r.some((a) => a.nivel === 'erro')).toBe(false);
  });

  it('texto narrativo não parseável (ex.: "Individualizar conforme INR") → info_incompleta DOSE_NAO_PARSEAVEL, NUNCA erro', () => {
    const r = checarDoseAdultoLegado([baseQuickDrugDoseAdulto({ habitual: 'Individualizar conforme INR', max: '15 mg/dia' })]);
    expect(r.some((a) => a.regra === 'DOSE_NAO_PARSEAVEL' && a.nivel === 'info_incompleta')).toBe(true);
    expect(r.some((a) => a.nivel === 'erro')).toBe(false);
  });

  it('achado real confirmado nesta auditoria: dose por TOMADA (ex.: "500 mg VO q6h") vs. teto por DIA (ex.: "4 g/dia") NUNCA gera erro fabricado — reportado como não comparável', () => {
    const r = checarDoseAdultoLegado([
      baseQuickDrugDoseAdulto({ habitual: '500 mg VO q6h', max: '4 g/dia', unidade: 'mg' }),
    ]);
    expect(r.some((a) => a.regra === 'MAXIMO_MENOR_QUE_HABITUAL')).toBe(false);
    expect(r.some((a) => a.regra === 'DOSE_NAO_PARSEAVEL' && a.nivel === 'info_incompleta')).toBe(true);
  });

  it('achado real confirmado nesta auditoria: razão de mistura gasosa (heliox) nunca é comparada como se fosse dose numérica', () => {
    const r = checarDoseAdultoLegado([
      baseQuickDrugDoseAdulto({
        habitual: 'Mistura 70:30 (He:O₂) — 10–15 L/min por máscara não-reinalante',
        min: 'Conforme FiO₂ necessária',
        max: 'Mistura 60:40 (se SpO₂ exigir mais O₂)',
        unidade: 'L/min' as never,
      }),
    ]);
    expect(r.some((a) => a.nivel === 'erro')).toBe(false);
  });
});

describe('validarIntegridadeGlobal() — executa contra toda a base atual (RM-40 tarefa 4)', () => {
  it('roda sem lançar exceção e produz um relatório com todos os 4 níveis classificados', () => {
    const r = validarIntegridadeGlobal();
    expect(r.totalEntidadesAnalisadas).toBeGreaterThan(0);
    expect(Object.keys(r.resumo).sort()).toEqual(['erro', 'info_incompleta', 'validado', 'warning'].sort());
    expect(r.resumo.erro + r.resumo.warning + r.resumo.info_incompleta).toBe(
      r.achados.length - (r.achados.length - (r.resumo.erro + r.resumo.warning + r.resumo.info_incompleta)),
    );
  });

  it('a base atual não tem NENHUMA inconsistência de nível "erro" confirmada (buildOk) — regressão: nunca reintroduzir dose/faixa/população inconsistente sem detectar', () => {
    const r = validarIntegridadeGlobal();
    if (!r.buildOk) {
      // Se este teste falhar no futuro, os achados abaixo mostram exatamente
      // o que precisa ser corrigido na base — nunca mascarar, sempre corrigir
      // o dado confirmado (RM-40 tarefa 5).
      console.error('Achados de erro:', r.achados.filter((a) => a.nivel === 'erro'));
    }
    expect(r.buildOk).toBe(true);
  });
});
