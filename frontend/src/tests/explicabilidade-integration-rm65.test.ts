// ============================================================
// RM-65 — Integração Clínica Real da Página Prioritária (/explicabilidade)
//
// Testa a camada de dados extraída em `explicabilidade-context.ts`
// (`resolverContextoExplicabilidade` + `computarExplicabilidade`), que é
// exatamente a parte nova desta RM: QUAL anamnese/CID/plano terapêutico
// alimenta o motor `explainable-ai-v2.ts` (já existente, não alterado).
//
// Nível de integração (não E2E/componente): chama as funções REAIS —
// `getTherapeuticForCondition` (PROTOCOLOS reais), `gerarExplainableAIv2`
// (motor real) — nunca mocks. O projeto não usa `@testing-library/react`
// (ver `demo-data-notice-rm59.test.ts`), então os estados de UI puramente
// visuais (spinner de carregamento, badge de fonte) não são montados aqui;
// a lógica por trás deles (o próprio `contexto`/`computado`) é testada
// diretamente — ver limitação declarada no relatório RM-65.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Anamnesis, Consultation, TherapeuticPlan, TherapeuticSuggestion } from '@/lib/types';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import {
  resolverContextoExplicabilidade,
  computarExplicabilidade,
  CID_CONDITION_MAP,
} from '@/lib/explicabilidade-context';

function baseAnamnesis(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: '', hda: '', hpp: '', historia_familiar: '',
    habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {},
    imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [],
    gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {},
    ...overrides,
  };
}

const DEMO_ANAMNESE: Anamnesis = baseAnamnesis({
  queixa_principal: 'Controle de PA + DM2 (perfil de demonstração)',
  comorbidades: ['Hipertensão Arterial Sistêmica', 'Diabetes Mellitus Tipo 2'],
});

function baseConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'rm65-c1',
    status: 'terapeutico',
    paciente_nome: 'Paciente RM-65',
    data: new Date().toISOString(),
    ...overrides,
  };
}

describe('RM-65 — resolverContextoExplicabilidade', () => {
  // ── 1. Paciente com dados suficientes: consulta ativa completa ────────
  it('consulta ativa com diagnóstico + plano terapêutico real → usa a MESMA molécula e anamnese da consulta, fonte "consulta_ativa"', () => {
    const anamnese = baseAnamnesis({ comorbidades: ['Diabetes Mellitus Tipo 2'], laboratorio: { hba1c: '9.1' } });
    const planoReal = getTherapeuticForCondition('dm2', 'Diabetes Mellitus Tipo 2')!;
    expect(planoReal).not.toBeNull();

    const consulta = baseConsultation({
      anamnese,
      diagnostico_estruturado: { cid: 'E11', descricao: 'Diabetes Mellitus Tipo 2', confianca: 0.8 },
      plano_terapeutico: planoReal,
    });

    const contexto = resolverContextoExplicabilidade({
      activeConsultation: consulta,
      anamneseLocalStorage: null,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: null,
    });

    expect(contexto.fonte).toBe('consulta_ativa');
    expect(contexto.cid).toBe('E11');
    expect(contexto.anamnese).toBe(anamnese); // a mesma referência da consulta, não a demo
    expect(contexto.medicamento?.molecula).toBe(planoReal.farmacologico[0].molecula);
    expect(contexto.planoIndisponivel).toBe(false);
  });

  // ── 2. Paciente com dados incompletos: diagnóstico sem plano ainda ────
  it('consulta ativa com diagnóstico mas SEM plano terapêutico ainda → planoIndisponivel=true, nunca cai silenciosamente em demonstração', () => {
    const consulta = baseConsultation({
      anamnese: baseAnamnesis({ comorbidades: ['Hipertensão Arterial Sistêmica'] }),
      diagnostico_estruturado: { cid: 'I10', descricao: 'Hipertensão Arterial Sistêmica', confianca: 0.7 },
      // plano_terapeutico ainda não definido — etapa terapêutica não alcançada
    });

    const contexto = resolverContextoExplicabilidade({
      activeConsultation: consulta,
      anamneseLocalStorage: null,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: null,
    });

    expect(contexto.fonte).toBe('consulta_ativa');
    expect(contexto.medicamento).toBeNull();
    expect(contexto.planoIndisponivel).toBe(true);

    const computado = computarExplicabilidade(contexto);
    expect(computado.status).toBe('sem_plano');
  });

  // ── 3. Ausência de consulta ──────────────────────────────────────────
  it('sem consulta ativa e sem anamnese salva → fonte "demonstracao", usa anamneseDemo', () => {
    const contexto = resolverContextoExplicabilidade({
      activeConsultation: null,
      anamneseLocalStorage: null,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: null,
    });
    expect(contexto.fonte).toBe('demonstracao');
    expect(contexto.anamnese).toBe(DEMO_ANAMNESE);
    expect(contexto.cid).toBe('I10');
  });

  it('sem consulta ativa mas COM anamnese salva no navegador → fonte "anamnese_salva" (comportamento híbrido preservado)', () => {
    const anamneseSalva = baseAnamnesis({ queixa_principal: 'Anamnese salva no navegador' });
    const contexto = resolverContextoExplicabilidade({
      activeConsultation: null,
      anamneseLocalStorage: anamneseSalva,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: null,
    });
    expect(contexto.fonte).toBe('anamnese_salva');
    expect(contexto.anamnese).toBe(anamneseSalva);
  });

  // ── 4. Ausência de diagnóstico (consulta existe, mas sem CID) ────────
  it('consulta ativa existe mas sem diagnostico_estruturado.cid → não usa modo consulta_ativa, cai para anamnese salva/demo', () => {
    const consulta = baseConsultation({ anamnese: baseAnamnesis({ queixa_principal: 'Ainda na anamnese' }) });
    const contexto = resolverContextoExplicabilidade({
      activeConsultation: consulta,
      anamneseLocalStorage: null,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: null,
    });
    expect(contexto.fonte).not.toBe('consulta_ativa');
    expect(contexto.fonte).toBe('demonstracao');
  });

  // ── override manual desliga o modo consulta ativa ─────────────────────
  it('override manual de CID desliga o modo consulta_ativa mesmo com consulta e diagnóstico presentes (critério de aceite RM-60 §6.1)', () => {
    const planoReal = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica')!;
    const consulta = baseConsultation({
      anamnese: baseAnamnesis({ comorbidades: ['Hipertensão Arterial Sistêmica'] }),
      diagnostico_estruturado: { cid: 'I10', descricao: 'Hipertensão Arterial Sistêmica', confianca: 0.7 },
      plano_terapeutico: planoReal,
    });
    const contexto = resolverContextoExplicabilidade({
      activeConsultation: consulta,
      anamneseLocalStorage: null,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: 'J45', // médico escolhe manualmente outro CID
    });
    expect(contexto.fonte).not.toBe('consulta_ativa');
    expect(contexto.cid).toBe('J45');
  });

  // ── 5. Dados contraditórios / comportamento de segurança ─────────────
  it('anamnese com gestante=true + medicamento com contraindicação de gravidez real (Enalapril) → WHY NOT sinaliza contraindicação absoluta, nunca omitida', () => {
    const anamnese = baseAnamnesis({ gestante: true, comorbidades: ['Hipertensão Arterial Sistêmica'] });
    const planoReal = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica')!;
    const consulta = baseConsultation({
      anamnese,
      diagnostico_estruturado: { cid: 'I10', descricao: 'Hipertensão Arterial Sistêmica', confianca: 0.7 },
      plano_terapeutico: planoReal,
    });
    const contexto = resolverContextoExplicabilidade({
      activeConsultation: consulta,
      anamneseLocalStorage: null,
      anamneseDemo: DEMO_ANAMNESE,
      cidOverride: null,
    });
    const computado = computarExplicabilidade(contexto);
    expect(computado.status).toBe('ok');
    if (computado.status !== 'ok') throw new Error('unreachable');
    expect(computado.result.why_not.tem_contraindicacao_absoluta).toBe(true);
    expect(computado.result.why_not.restricoes.some(r => r.gravidade === 'absoluta')).toBe(true);
    // Comportamento proibido: não apresentar hipótese/recomendação com confiança de prescrição quando há CI absoluta.
    expect(computado.result.explainability_score.confiavel_para_prescricao).toBe(false);
  });

  // ── Resultado real diferente do "seed" anterior ───────────────────────
  it('resultado muda quando o contexto clínico real muda: consulta de DM2 produz a molécula real do plano de DM2, consulta de HAS produz a do plano de HAS (não mais sempre o mesmo CID/molécula fixos do código antigo)', () => {
    const planoHas = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica')!;
    const planoDm2 = getTherapeuticForCondition('dm2', 'Diabetes Mellitus Tipo 2')!;
    // Ambos os protocolos reais têm ao menos 1 molécula e representam
    // classes terapêuticas diferentes — não fixamos o nome exato porque
    // `getTherapeuticForCondition` expande/prioriza o plano curado com
    // moléculas elegíveis adicionais (RM-24/RM-26); o que importa aqui é
    // que a consulta ativa usa o plano REAL de cada condição, não um CID
    // fixo recalculado do zero.
    expect(planoHas.farmacologico.length).toBeGreaterThan(0);
    expect(planoDm2.farmacologico.length).toBeGreaterThan(0);

    const consultaHas = baseConsultation({
      anamnese: baseAnamnesis({ comorbidades: ['Hipertensão Arterial Sistêmica'] }),
      diagnostico_estruturado: { cid: 'I10', descricao: 'HAS', confianca: 0.7 },
      plano_terapeutico: planoHas,
    });
    const consultaDm2 = baseConsultation({
      id: 'rm65-c2',
      anamnese: baseAnamnesis({ comorbidades: ['Diabetes Mellitus Tipo 2'] }),
      diagnostico_estruturado: { cid: 'E11', descricao: 'DM2', confianca: 0.7 },
      plano_terapeutico: planoDm2,
    });

    const ctxHas = resolverContextoExplicabilidade({ activeConsultation: consultaHas, anamneseLocalStorage: null, anamneseDemo: DEMO_ANAMNESE, cidOverride: null });
    const ctxDm2 = resolverContextoExplicabilidade({ activeConsultation: consultaDm2, anamneseLocalStorage: null, anamneseDemo: DEMO_ANAMNESE, cidOverride: null });

    expect(ctxHas.medicamento?.molecula).toBe(planoHas.farmacologico[0].molecula);
    expect(ctxDm2.medicamento?.molecula).toBe(planoDm2.farmacologico[0].molecula);
    expect(ctxHas.medicamento?.molecula).not.toBe(ctxDm2.medicamento?.molecula);

    const resHas = computarExplicabilidade(ctxHas);
    const resDm2 = computarExplicabilidade(ctxDm2);
    expect(resHas.status).toBe('ok');
    expect(resDm2.status).toBe('ok');
    if (resHas.status === 'ok' && resDm2.status === 'ok') {
      expect(resHas.result.why.indicacao_principal).not.toBe(resDm2.result.why.indicacao_principal);
    }
  });

  // ── Prova de que a consulta real usa a molécula REAL escolhida, não o ─
  // primeiro item genérico do protocolo estático da condição ────────────
  it('usa a molécula REALMENTE presente no plano_terapeutico da consulta, mesmo quando não é a primeira do protocolo padrão (prova que não recalcula do zero por CID)', () => {
    const planoIcc = getTherapeuticForCondition('icc', 'Insuficiência Cardíaca')!;
    expect(planoIcc.farmacologico.length).toBeGreaterThan(1);
    const segundaMolecula = planoIcc.farmacologico[1].molecula;
    const reordenado: TherapeuticPlan = {
      ...planoIcc,
      farmacologico: [planoIcc.farmacologico[1], planoIcc.farmacologico[0], ...planoIcc.farmacologico.slice(2)],
    };
    expect(reordenado.farmacologico[0].molecula).toBe(segundaMolecula);

    const consulta = baseConsultation({
      anamnese: baseAnamnesis({ comorbidades: ['Insuficiência Cardíaca'] }),
      diagnostico_estruturado: { cid: 'I50', descricao: 'Insuficiência Cardíaca', confianca: 0.8 },
      plano_terapeutico: reordenado,
    });
    const contexto = resolverContextoExplicabilidade({ activeConsultation: consulta, anamneseLocalStorage: null, anamneseDemo: DEMO_ANAMNESE, cidOverride: null });
    // Prova o ponto do teste: o resolver usa a molécula REALMENTE na posição
    // 0 do plano da consulta (aqui deliberadamente reordenado), não sempre
    // "a primeira do protocolo padrão" nem recalcula do zero por CID.
    expect(contexto.medicamento?.molecula).toBe(segundaMolecula);
    expect(contexto.medicamento?.molecula).not.toBe(planoIcc.farmacologico[0].molecula);
  });

  // ── 9. Ausência de vazamento de dados entre pacientes ─────────────────
  it('duas resoluções sucessivas para pacientes diferentes não vazam dados entre si (função pura, sem estado compartilhado)', () => {
    const pacienteA = baseAnamnesis({ queixa_principal: 'Paciente A', comorbidades: ['Hipertensão Arterial Sistêmica'] });
    const pacienteB = baseAnamnesis({ queixa_principal: 'Paciente B', gestante: true, comorbidades: ['Diabetes Mellitus Tipo 2'] });
    const planoHas = getTherapeuticForCondition('has', 'HAS')!;
    const planoDm2 = getTherapeuticForCondition('dm2', 'DM2')!;

    const consultaA = baseConsultation({ id: 'pac-a', anamnese: pacienteA, diagnostico_estruturado: { cid: 'I10', descricao: 'HAS' }, plano_terapeutico: planoHas });
    const consultaB = baseConsultation({ id: 'pac-b', anamnese: pacienteB, diagnostico_estruturado: { cid: 'E11', descricao: 'DM2' }, plano_terapeutico: planoDm2 });

    const ctxA = resolverContextoExplicabilidade({ activeConsultation: consultaA, anamneseLocalStorage: null, anamneseDemo: DEMO_ANAMNESE, cidOverride: null });
    const ctxB = resolverContextoExplicabilidade({ activeConsultation: consultaB, anamneseLocalStorage: null, anamneseDemo: DEMO_ANAMNESE, cidOverride: null });

    expect(ctxA.anamnese.queixa_principal).toBe('Paciente A');
    expect(ctxB.anamnese.queixa_principal).toBe('Paciente B');
    expect(ctxA.anamnese.gestante).toBe(false);
    expect(ctxB.anamnese.gestante).toBe(true);
    // Recalcular A DEPOIS de B prova que não há cache/estado global vazando entre pacientes.
    const ctxA2 = resolverContextoExplicabilidade({ activeConsultation: consultaA, anamneseLocalStorage: null, anamneseDemo: DEMO_ANAMNESE, cidOverride: null });
    expect(ctxA2.anamnese.queixa_principal).toBe('Paciente A');
    expect(ctxA2.anamnese.gestante).toBe(false);
    expect(ctxA2.medicamento?.molecula).toBe(planoHas.farmacologico[0].molecula);
  });

  // ── Correção de bug descoberto na investigação: I50 apontava para 'ic' ─
  // (inexistente), não 'icc' — selecionar HAS/ICC manualmente sempre caía
  // em "sem recomendação" silenciosamente. I25 apontava para 'dac'
  // (também inexistente) e foi removido do mapa em vez de inventado.
  it('CID_CONDITION_MAP: I50 mapeia para a chave real "icc" (não a antiga "ic", que nunca existiu em PROTOCOLOS)', () => {
    expect(CID_CONDITION_MAP.I50).toBe('icc');
    const plano = getTherapeuticForCondition(CID_CONDITION_MAP.I50, 'Insuficiência Cardíaca');
    expect(plano).not.toBeNull();
    expect(plano!.farmacologico.length).toBeGreaterThan(0);
  });

  it('CID_CONDITION_MAP não contém mais a entrada morta I25→"dac" (protocolo que nunca existiu)', () => {
    expect(CID_CONDITION_MAP.I25).toBeUndefined();
  });
});

describe('RM-65 — computarExplicabilidade: estado de erro (dado malformado)', () => {
  it('medicamento malformado (sem `molecula`) faz o motor lançar exceção real → status "erro", nunca uma tela em branco silenciosa', () => {
    const medicamentoQuebrado = { classe_terapeutica: 'X' } as unknown as TherapeuticSuggestion;
    const contexto = {
      anamnese: baseAnamnesis(),
      cid: 'I10',
      fonte: 'demonstracao' as const,
      medicamento: medicamentoQuebrado,
      planoIndisponivel: false,
    };
    const computado = computarExplicabilidade(contexto);
    expect(computado.status).toBe('erro');
    if (computado.status === 'erro') {
      expect(computado.mensagem.length).toBeGreaterThan(0);
    }
  });

  it('sem medicamento → status "sem_plano", nunca confundido com "erro"', () => {
    const contexto = {
      anamnese: baseAnamnesis(),
      cid: 'I10',
      fonte: 'demonstracao' as const,
      medicamento: null,
      planoIndisponivel: true,
    };
    expect(computarExplicabilidade(contexto).status).toBe('sem_plano');
  });
});
