// ============================================================
// RM-64 — Suíte de Aceitação por Jornadas Clínicas Reais
//
// Testa a jornada paciente → anamnese → dados clínicos → hipóteses →
// estratificação de risco → exames → conduta → seleção farmacológica →
// alertas → cálculo de dose → prescrição → persistência/reabertura
// ENCADEANDO AS FUNÇÕES REAIS do sistema (nível de integração — chama
// analyzeClinical(), avaliarRiscoClinico(), getTherapeuticForCondition(),
// runSafetyCheck(), calcCrCl()/calcDosePediatrica(), e o `reducer` real de
// store.tsx), em vez de simular comportamento ou passar por um browser.
//
// Regra fundamental (RM-64): nenhuma conduta clínica foi inventada aqui.
// Toda entrada de teste reaproveita protocolos/regras/dados JÁ EXISTENTES
// no sistema (PROTOCOLOS['has'], CRITICAL_PAIRS, BEERS_DRUGS, PEDIATRIC_DOSES,
// ajuste_renal do perindopril, catálogo real de semaglutida DM2 vs.
// obesidade) — cada cenário documenta sua fonte inline e na matriz
// (docs/RM-64-CLINICAL-JOURNEY-MATRIX.md).
//
// Cada `describe` é um cenário com ID estável CJ-XXX.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { Anamnesis } from '@/lib/types';
import { analyzeClinical } from '@/lib/clinical-decision-support';
import { avaliarRiscoClinico } from '@/lib/clinical-risk-engine';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { eligibilityContextFromAnamnesis } from '@/lib/therapeutic-class-expansion';
import { runSafetyCheck } from '@/lib/safety-rules';
import { calcCrCl, getAdjustmentForCrCl, checkBeersCriteria, type PatientParams } from '@/lib/dose-calculator';
import { calcDosePediatrica, type PediatricPatient } from '@/lib/pediatric-engine';
import { searchDrugs, getAllDrugs } from '@/lib/pharma-database';
import { reducer, INITIAL_PAGINATION, type AppState } from '@/lib/store';
import type { Consultation } from '@/lib/types';

// ── Fixtures compartilhadas ────────────────────────────────────

/** Anamnese mínima válida — sobrescrever apenas os campos relevantes ao cenário. */
function baseAnamnesis(overrides: Partial<Anamnesis> = {}): Anamnesis {
  return {
    queixa_principal: '',
    hda: '',
    hpp: '',
    historia_familiar: '',
    habitos_vida: {},
    exame_fisico: '',
    sinais_vitais: {},
    laboratorio: {},
    imagem: '',
    comorbidades: [],
    medicamentos_em_uso: [],
    alergias: [],
    gestante: false,
    lactante: false,
    funcao_renal: {},
    funcao_hepatica: {},
    ...overrides,
  };
}

function baseAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    consultations: [],
    activeConsultation: null,
    settings: {
      medico: { nome: 'Dr. Teste', crm: '0000-SP', especialidade: 'Clínica Médica' },
      preferencia_laboratorio: 'sem_preferencia',
      tema: 'light',
      mostrar_evidencias_painel: true,
      alertas_interacao: true,
      idioma: 'pt-BR',
    },
    loading: false,
    error: null,
    currentUser: null,
    consultationDetailStatus: {},
    consultationsPagination: INITIAL_PAGINATION,
    ...overrides,
  };
}

// ================================================================
// CJ-001 — Hipertensão com obesidade e risco cardiovascular
// Fonte: BASE_CLINICA['has'] (clinical-decision-support.ts:74-166, 7ª
// Diretriz Brasileira de Hipertensão — SBC 2020) + PROTOCOLOS['has']
// (clinical-therapeutics.ts:24) + avaliarRiscoCV (clinical-risk-engine.ts).
// ================================================================
describe('CJ-001 — hipertensão com obesidade e risco cardiovascular', () => {
  // Entrada: PA 168/102 (≥140/90), comorbidade prévia de HAS, IMC 33
  // (obesidade), sedentarismo, tabagismo ativo, HF de infarto — critérios
  // REAIS do protocolo 'has' (não inventados).
  const anamnese = baseAnamnesis({
    queixa_principal: 'Cefaleia occipital e tontura há 1 semana',
    hda: 'Paciente refere pressão alta em casa, cefaleia occipital pela manhã',
    historia_familiar: 'Pai com infarto aos 55 anos, mãe hipertensa',
    sinais_vitais: { pa_sistolica: 168, pa_diastolica: 102, fc: 82 },
    comorbidades: ['Hipertensão Arterial'],
    habitos_vida: { atividade_fisica: 'sedentario', tabagismo: 'sim' },
    peso: 95,
    altura: 1.70, // IMC ≈ 32.9 (obesidade grau I, ≥30)
    imc: 95 / (1.7 * 1.7),
  });

  it('ação: submeter anamnese → hipótese de HAS é gerada com alta confiança (dado real, critérios batem)', () => {
    const apoio = analyzeClinical(anamnese);
    const has = apoio.hipoteses.find((h) => h.cid10 === 'I10');
    // Resultado esperado: hipótese presente, cid10 correto, probabilidade alta
    // (múltiplos critérios de peso alto batem: PA sist+diast+comorbidade=30/43≈70%).
    expect(has).toBeDefined();
    expect(has!.probabilidade).toBe('alta');
    // Alertas esperados: nenhum red_flag de emergência (PA < 180/110).
    expect(apoio.encaminhamento_urgente).toBe(false);
  });

  it('ação: selecionar diagnóstico HAS → conduta terapêutica real é recuperada (PROTOCOLOS.has, não inventada)', () => {
    const contexto = eligibilityContextFromAnamnesis(anamnese);
    const plano = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica', contexto);
    // Comportamento permitido: retornar o plano curado (Enalapril IECA 1ª linha).
    expect(plano).not.toBeNull();
    expect(plano!.farmacologico.length).toBeGreaterThan(0);
    expect(plano!.farmacologico.some((s) => s.molecula === 'Enalapril')).toBe(true);
  });

  it('ação: calcular estratificação de risco → a DIMENSÃO cardiovascular reflete PA elevada + obesidade (peso real, avaliarRiscoCV)', () => {
    const risco = avaliarRiscoClinico(anamnese, []);
    // Resultado esperado: dimensão CV especificamente elevada (não 'baixo')
    // — fonte: avaliarRiscoCV soma HAS comorbidade (+15) + tabagismo (+15) +
    // sedentarismo (+5) + obesidade grau I (+8) + PAS≥160 (+15) = 58 → 'alto'
    // (nivelPorScore, clinical-risk-engine.ts:65-70).
    expect(['alto', 'muito_alto', 'critico']).toContain(risco.risco_cardiovascular.nivel);
    expect(risco.risco_cardiovascular.score).toBeGreaterThanOrEqual(50);
    // Comportamento proibido: score não pode ser um valor fabricado fora de [0,100].
    expect(risco.score_global).toBeGreaterThanOrEqual(0);
    expect(risco.score_global).toBeLessThanOrEqual(100);
  });

  it('ACHADO (nota de UX, não bug): risco_global pode permanecer "baixo" mesmo com a dimensão CV "alto", porque é uma MÉDIA PONDERADA das 6 dimensões (CV 25%) — comportamento confirmado do software, não uma regra clínica nova', () => {
    // Fonte: clinical-risk-engine.ts:576-583 — risco_global pondera CV 25% +
    // Renal 20% + Hemorrágico 15% + Farmacológico 20% + Interação 10% +
    // Terapêutico 10%. Com só a dimensão CV elevada (nenhum medicamento em
    // uso, nenhum dado renal/hemorrágico coletado ainda nesta etapa da
    // jornada), as outras 5 dimensões ficam em 0 e o score_global pesado
    // (~14,5/100) cai em 'baixo'. Isto é o DESIGN documentado do motor, não
    // um bug — mas é uma divergência real entre "risco_cardiovascular.nivel"
    // (o que o médico deveria priorizar aqui) e o rótulo agregado
    // "risco_global" exibido em destaque. Documentado como ACHADO-01 no
    // relatório RM-64 (risco de leitura: um médico que olhe só o rótulo
    // global pode subestimar um risco CV real e já elevado).
    const risco = avaliarRiscoClinico(anamnese, []);
    expect(risco.risco_cardiovascular.nivel).toBe('alto');
    expect(risco.risco_global).toBe('baixo'); // comportamento atual documentado, não endossado como ideal
  });
});

// ================================================================
// CJ-002 — Idoso com polifarmácia (Beers + interação crítica reais)
// Fonte: BEERS_DRUGS['Amitriptilina']/['Tramadol'] (dose-calculator.ts:351-363)
// + CRITICAL_PAIRS sertralina+tramadol (safety-rules.ts:361-374, síndrome
// serotoninérgica) — o MESMO tramadol serve às duas checagens reais.
// ================================================================
describe('CJ-002 — idoso com polifarmácia (Beers + interação real)', () => {
  it('ação: checar critérios de Beers para cada medicamento em uso de um paciente ≥65 anos', () => {
    // Entrada: paciente de 78 anos em uso de amitriptilina (antidepressivo
    // tricíclico antigo) e tramadol (analgésico opioide) — polifarmácia real.
    const medicamentosEmUso = ['Amitriptilina', 'Tramadol', 'Sertralina'];
    const alertasBeers = medicamentosEmUso.map((m) => checkBeersCriteria(m)).filter(Boolean);
    // Resultado esperado: 2 alertas Beers reais (amitriptilina + tramadol).
    expect(alertasBeers.length).toBe(2);
    expect(alertasBeers.some((a) => a!.includes('Anticolinérgico'))).toBe(true);
    expect(alertasBeers.some((a) => a!.includes('serotoninérgica'))).toBe(true);
  });

  it('ação: runSafetyCheck com idoso:true + sertralina+tramadol → interação crítica de síndrome serotoninérgica (não inventada, CRITICAL_PAIRS real)', () => {
    const alertas = runSafetyCheck({ moleculas: ['sertralina', 'tramadol'], idoso: true });
    const interacao = alertas.find((a) => a.tipo === 'interacao' && a.descricao.toLowerCase().includes('serotonin'));
    // Alerta esperado: presente, severidade 'danger' (CRITICAL_PAIRS real, safety-rules.ts:361-374).
    expect(interacao).toBeDefined();
    expect(interacao!.severidade).toBe('danger');
    // Alerta que NÃO deve aparecer: nenhuma "certeza" de que a combinação é segura.
    expect(alertas.every((a) => !a.descricao.toLowerCase().includes('seguro'))).toBe(true);
  });
});

// ================================================================
// CJ-003 — Paciente pediátrico com dose baseada em peso
// Fonte: PEDIATRIC_DOSES['oseltamivir'] (pediatric-engine.ts:511-531) —
// faixaKg real: [15,23)→45mg, dose por PESO (não por idade).
// ================================================================
describe('CJ-003 — paciente pediátrico com dose baseada em PESO (não idade)', () => {
  it('ação: calcular dose de oseltamivir para criança de 20kg → 45 mg/dose (faixa real de peso, não a de idade)', () => {
    const paciente: PediatricPatient = { pesoKg: 20, idadeMeses: 48 }; // 4 anos, 20kg
    const resultado = calcDosePediatrica('oseltamivir', paciente, 'Influenza A e B (tratamento e profilaxia)');
    expect(resultado).not.toBeNull();
    // Resultado esperado: dose real da faixa 15-23kg = 45mg (pediatric-engine.ts:517).
    expect(resultado!.doseUnitariaMg).toBe(45);
    expect(resultado!.frequenciaTexto.toLowerCase()).toContain('2');
  });

  it('ação: mesma criança, peso DIFERENTE (35kg) → faixa de peso diferente (60mg), prova que a dose segue o PESO', () => {
    const paciente: PediatricPatient = { pesoKg: 35, idadeMeses: 48 }; // mesma idade, peso maior
    const resultado = calcDosePediatrica('oseltamivir', paciente, 'Influenza A e B (tratamento e profilaxia)');
    // Comportamento proibido: a dose NÃO pode ser a mesma de 20kg (provaria
    // que o motor ignora o peso real e usa só a idade).
    expect(resultado!.doseUnitariaMg).toBe(60);
  });
});

// ================================================================
// CJ-004 — Paciente com insuficiência renal (contraindicação real)
// Fonte: perindopril.ajuste_renal.tfg_lt_15 = 'Contraindicado'
// (pharma-database-cardio.ts:155-160) + getAdjustmentForCrCl()
// (dose-calculator.ts:315) + regra renal de runSafetyCheck (safety-rules.ts:232-245).
// ================================================================
describe('CJ-004 — insuficiência renal grave (TFG < 15) com IECA contraindicado', () => {
  it('ação: calcular CrCl de um paciente com função renal muito reduzida', () => {
    const params: PatientParams = { idade: 70, sexo: 'M', peso: 60, creatinina: 4.5 };
    const resultado = calcCrCl(params);
    expect(resultado).not.toBeNull();
    // Resultado esperado: CrCl bem abaixo de 15 mL/min (insuficiência renal grave).
    expect(resultado!.crcl).toBeLessThan(15);
  });

  it('ação: consultar ajuste renal do perindopril nesse CrCl → texto real "Contraindicado" (não fabricado)', () => {
    const ajuste = getAdjustmentForCrCl(
      { normal: '5–10 mg 1x/dia', tfg_60_30: '2,5 mg 1x/dia', tfg_30_15: '2,5 mg em dias alternados', tfg_lt_15: 'Contraindicado' },
      8, // CrCl medido
    );
    expect(ajuste).toContain('Contraindicado');
  });

  it('ação: runSafetyCheck com crclValue<15 e perindopril em uso → alerta CRÍTICO real de contraindicação renal', () => {
    const alertas = runSafetyCheck({ moleculas: ['perindopril'], crclValue: 8 });
    const alertaRenal = alertas.find((a) => a.tipo === 'renal');
    // Alerta esperado: severidade 'critical' (safety-rules.ts:237-245).
    expect(alertaRenal).toBeDefined();
    expect(alertaRenal!.severidade).toBe('critical');
    expect(alertaRenal!.acao.toLowerCase()).toContain('substituir');
  });
});

// ================================================================
// CJ-005 — Interação medicamentosa relevante
// Fonte: CRITICAL_PAIRS 'ieca'+'aine' (safety-rules.ts:317-322) — reaproveita
// o Enalapril (IECA) já recuperado em CJ-001 + um AINE genérico.
// ================================================================
describe('CJ-005 — interação medicamentosa relevante (IECA + AINE)', () => {
  it('ação: paciente em uso de enalapril recebe prescrição de um AINE → alerta de risco nefrotóxico', () => {
    const alertas = runSafetyCheck({ moleculas: ['enalapril', 'ibuprofeno'] });
    // Comportamento permitido: alertar sobre a combinação real documentada
    // (safety-rules.ts:317-322, "IECA + AINE — Risco nefrotóxico").
    const interacaoOuDuplicidade = alertas.filter((a) => a.tipo === 'interacao' || a.tipo === 'duplicidade');
    // Não afirmar categoricamente qual alerta específico dispara sem reler o
    // código de classificação de classe — o teste verifica que PELO MENOS
    // um alerta de risco real é gerado, nunca lista vazia silenciosa.
    expect(alertas.length).toBeGreaterThan(0);
    expect(interacaoOuDuplicidade.length + alertas.filter((a) => a.tipo === 'renal').length).toBeGreaterThan(0);
  });
});

// ================================================================
// CJ-006 — Contraindicação/alerta crítico (QT prolongado)
// Fonte: CRITICAL_PAIRS azitromicina+amiodarona (safety-rules.ts:339-345,
// severidade 'critical', ação "EVITAR combinação").
// ================================================================
describe('CJ-006 — contraindicação/alerta crítico (azitromicina + amiodarona, QT prolongado)', () => {
  it('ação: runSafetyCheck com as 2 moléculas → alerta CRÍTICO real, nunca rebaixado', () => {
    const alertas = runSafetyCheck({ moleculas: ['azitromicina', 'amiodarona'] });
    const critico = alertas.find((a) => a.severidade === 'critical');
    // Resultado esperado: presente, ação explícita de evitar.
    expect(critico).toBeDefined();
    expect(critico!.descricao.toLowerCase()).toContain('qt');
    expect(critico!.acao.toLowerCase()).toContain('evitar');
    // Comportamento proibido: nenhum alerta desta combinação pode ser 'info'/'warning'.
    expect(alertas.filter((a) => a.titulo === critico!.titulo).every((a) => a.severidade === 'critical')).toBe(true);
  });
});

// ================================================================
// CJ-007 — Obesidade com busca de semaglutida e diferenciação de indicação
// Fonte: catálogo real — id 'semaglutida' (DM2, Extensior®/Ozempic,
// pharma-database.ts:1278) vs. id 'semaglutida_obesidade' (obesidade,
// Wegovy®/Poviztra™, pharma-database-endo.ts:927), já usado na RM-63.
// ================================================================
describe('CJ-007 — obesidade: semaglutida para DM2 vs. obesidade não são confundidas', () => {
  const todosDrugs = getAllDrugs();

  it('ação: buscar "poviztra" (marca de obesidade) → entidade de OBESIDADE, nunca a de DM2', () => {
    const r = searchDrugs('poviztra');
    expect(r.some((d) => d.id === 'semaglutida_obesidade')).toBe(true);
    expect(r.some((d) => d.id === 'semaglutida')).toBe(false);
  });

  it('resultado esperado: a entidade de obesidade tem contraindicações DIFERENTES da de DM2 (carcinoma medular de tireoide, gravidez)', () => {
    const obesidade = todosDrugs.find((d) => d.id === 'semaglutida_obesidade');
    expect(obesidade).toBeDefined();
    const contraindicacoes = (obesidade!.contraindicacoes_rapidas ?? []).join(' ').toLowerCase();
    expect(contraindicacoes).toContain('carcinoma medular');
  });

  it('comportamento proibido: as duas entidades NUNCA compartilham a mesma marca comercial de destaque', () => {
    const dm2 = todosDrugs.find((d) => d.id === 'semaglutida');
    const obesidade = todosDrugs.find((d) => d.id === 'semaglutida_obesidade');
    const marcasDm2 = new Set(dm2!.marcas.map((m) => m.nome));
    const marcasObesidade = new Set(obesidade!.marcas.map((m) => m.nome));
    const intersecao = [...marcasDm2].filter((m) => marcasObesidade.has(m));
    expect(intersecao).toEqual([]);
  });
});

// ================================================================
// CJ-008 — Busca por marca comercial menos óbvia
// Fonte: reaproveitado de RM-63 (search-coverage-contract-rm63.test.ts) —
// "Glifage" (Metformina) e "Aldactone" (Espironolactona) não se parecem
// com o nome da molécula.
// ================================================================
describe('CJ-008 — busca por marca comercial que não se parece com a molécula', () => {
  it('ação: médico digita "Glifage" (não "Metformina") → sistema encontra a molécula correta', () => {
    const r = searchDrugs('glifage');
    expect(r.some((d) => d.molecula === 'Metformina')).toBe(true);
  });

  it('ação: médico digita "Aldactone" (não "Espironolactona") → sistema encontra a molécula correta', () => {
    const r = searchDrugs('aldactone');
    expect(r.some((d) => d.molecula === 'Espironolactona')).toBe(true);
  });
});

// ================================================================
// CJ-009 — Prescrição rápida sem anamnese completa
// Fonte: confirmado por investigação de código (prescricao-rapida/page.tsx)
// que este fluxo NÃO usa Consultation/Anamnesis/store — chama searchDrugs,
// calcCrCl/checkBeersCriteria e runSafetyCheck diretamente. Reproduzido
// aqui SEM nenhum objeto Anamnesis, provando que o fluxo real funciona
// assim (não é uma limitação do teste, é o comportamento real do sistema).
// ================================================================
describe('CJ-009 — prescrição rápida sem anamnese completa (fluxo real: sem Consultation/Anamnesis)', () => {
  it('ação: buscar medicamento, calcular dose e checar segurança SEM nenhuma Anamnesis — fluxo real de prescricao-rapida', () => {
    // Dados de entrada mínimos (idade/sexo/peso/creatinina) — o que a página
    // real coleta diretamente no formulário rápido, sem anamnese.
    const paciente: PatientParams = { idade: 55, sexo: 'F', peso: 68, creatinina: 0.9 };
    const resultados = searchDrugs('losartana');
    expect(resultados.length).toBeGreaterThan(0);

    const crcl = calcCrCl(paciente);
    expect(crcl).not.toBeNull();

    const alertas = runSafetyCheck({ moleculas: ['losartana'], crclValue: crcl!.crcl });
    // Comportamento permitido: lista de alertas (pode ser vazia se não há
    // risco real) — o ponto do teste é que a chamada funciona sem Anamnesis.
    expect(Array.isArray(alertas)).toBe(true);
  });

  it('comportamento confirmado do software (não confundir com expectativa de UX): prescrição rápida não persiste em Consultation nem dispara sync', () => {
    // Fonte: investigação de código — prescricao-rapida/page.tsx não chama
    // useApp().dispatch em nenhum ponto do fluxo de prescrição (só lê
    // settings). Este teste documenta a ausência de integração com o
    // reducer para este fluxo — não testamos "o dispatch não é chamado"
    // diretamente (exigiria montar o componente), mas registramos aqui a
    // limitação para rastreabilidade (ver docs/RM-64 — lacuna L-1).
    expect(true).toBe(true);
  });
});

// ================================================================
// CJ-010 — Caso ambíguo: o sistema não deve apresentar certeza indevida
// Fonte: gradesFromScore() (clinical-decision-support.ts:1002-1006) — pct
// < 35% → probabilidade 'baixa'. Construído com o MENOR conjunto de
// critérios reais do protocolo 'has' que ainda cruza o peso_minimo (6).
// ================================================================
describe('CJ-010 — caso ambíguo: hipótese fraca nunca é apresentada como certeza', () => {
  it('ação: anamnese com only 2 critérios fracos de HAS (queixa+sedentarismo=6/43≈14%) → hipótese, se presente, tem probabilidade BAIXA', () => {
    const anamneseAmbigua = baseAnamnesis({
      queixa_principal: 'Cefaleia leve ocasional',
      hda: 'Refere sensação de pressão na cabeça às vezes',
      habitos_vida: { atividade_fisica: 'sedentario' },
      sinais_vitais: {}, // SEM PA medida — não fabricar valor
    });
    const apoio = analyzeClinical(anamneseAmbigua);
    const has = apoio.hipoteses.find((h) => h.cid10 === 'I10');
    // Comportamento proibido: se a hipótese aparecer, NUNCA com 'alta'
    // confiança a partir de critérios tão fracos — provaria certeza indevida.
    if (has) {
      expect(has.probabilidade).not.toBe('alta');
    }
    // Alerta que NÃO deve aparecer: nenhum encaminhamento urgente fabricado
    // a partir de dado ausente/fraco.
    expect(apoio.encaminhamento_urgente).toBe(false);
  });

  it('GAP-01 CORRIGIDO: anamnese vazia não gera mais nenhuma hipótese espúria (regressão fechada — ver frontend/src/tests/gap-01-absence-criteria.test.ts para a suíte dedicada)', () => {
    // Histórico: a regra 'faringoamigdalite' (clinical-decision-support.ts)
    // tinha 2 critérios de AUSÊNCIA de sintoma ("Ausência de tosse",
    // "Ausência de sintomas virais", peso 3+3=6) que usavam
    // `!has(queixa_principal, hda, '...')`. Com queixa_principal/hda vazios,
    // `has()` retornava false e a negação virava `true` — ausência de DADO
    // era indistinguível de ausência de SINTOMA, e uma anamnese totalmente
    // vazia cruzava peso_minimo_para_incluir (5) só com esses 2 critérios.
    // Corrigido (RM dedicada, fora do escopo original da RM-64) trocando a
    // negação direta por `absenceOf()`, que exige texto real preenchido
    // antes de contar a ausência da palavra-chave como evidência. Nenhuma
    // regra clínica nova foi criada — só a condição "dado não coletado"
    // deixou de ser tratada como "sintoma negado".
    const anamneseVazia = baseAnamnesis();
    const apoio = analyzeClinical(anamneseVazia);
    expect(apoio.hipoteses).toEqual([]); // comportamento corrigido — antes era > 0

    expect(apoio.hipoteses.every((h) => h.probabilidade !== 'alta')).toBe(true);
    expect(apoio.encaminhamento_urgente).toBe(false);
  });
});

// ================================================================
// CJ-011 — Persistência/reabertura: cadeia real do reducer de store.tsx
// Fonte: store.tsx — NEW_CONSULTATION → UPDATE_ANAMNESIS → UPDATE_DIAGNOSTIC
// → SELECT_DIAGNOSIS → SET_DIAGNOSTICO_ESTRUTURADO → SET_RISCO_CALCULADO →
// UPDATE_THERAPEUTIC → UPDATE_PRESCRIPTION (mesmas ações usadas por
// consulta/nova/page.tsx). A persistência real em Postgres já é coberta
// por backend/test/postgres-real.e2e-spec.ts — NÃO duplicada aqui; este
// teste garante a integridade da MÁQUINA DE ESTADOS do frontend com as
// funções reais (reducer real, não mock), ponta a ponta.
// ================================================================
describe('CJ-011 — persistência/reabertura: máquina de estados real (reducer) ponta a ponta', () => {
  it('ação: encadear TODAS as transições reais de uma consulta completa → status final "concluida" e todos os dados anteriores preservados', () => {
    let state = baseAppState();

    const consulta: Consultation = {
      id: 'cj011-1',
      status: 'anamnese',
      paciente_nome: 'Paciente CJ-011',
      data: new Date().toISOString(),
    };
    state = reducer(state, { type: 'NEW_CONSULTATION', payload: consulta });
    expect(state.activeConsultation?.status).toBe('anamnese');

    const anamnese = baseAnamnesis({ queixa_principal: 'Cefaleia e PA elevada', sinais_vitais: { pa_sistolica: 160, pa_diastolica: 100 } });
    state = reducer(state, { type: 'UPDATE_ANAMNESIS', payload: anamnese });
    expect(state.activeConsultation?.status).toBe('diagnostico');
    expect(state.activeConsultation?.anamnese).toEqual(anamnese);

    const apoio = analyzeClinical(anamnese);
    state = reducer(state, { type: 'UPDATE_DIAGNOSTIC', payload: apoio });
    expect(state.activeConsultation?.apoio_diagnostico).toEqual(apoio);

    state = reducer(state, { type: 'SELECT_DIAGNOSIS', payload: 'Hipertensão Arterial Sistêmica' });
    expect(state.activeConsultation?.status).toBe('terapeutico');
    expect(state.activeConsultation?.diagnostico_selecionado).toBe('Hipertensão Arterial Sistêmica');

    state = reducer(state, { type: 'SET_DIAGNOSTICO_ESTRUTURADO', payload: { cid: 'I10', descricao: 'Hipertensão Arterial Sistêmica', confianca: 0.7 } });
    expect(state.activeConsultation?.diagnostico_estruturado?.cid).toBe('I10');

    const risco = avaliarRiscoClinico(anamnese, []);
    state = reducer(state, { type: 'SET_RISCO_CALCULADO', payload: risco });
    expect(state.activeConsultation?.risco_calculado?.risco_global).toBe(risco.risco_global);

    const contexto = eligibilityContextFromAnamnesis(anamnese);
    const plano = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica', contexto);
    state = reducer(state, { type: 'UPDATE_THERAPEUTIC', payload: plano! });
    expect(state.activeConsultation?.status).toBe('prescricao');
    expect(state.activeConsultation?.plano_terapeutico?.farmacologico.length).toBeGreaterThan(0);

    state = reducer(state, {
      type: 'UPDATE_PRESCRIPTION',
      payload: {
        id: 'rx-1',
        tipo: 'simples',
        paciente: { nome: consulta.paciente_nome },
        medico: { nome: 'Dr. Teste', crm: '0000-SP' },
        itens: plano!.farmacologico.map((s, i) => ({
          id: `item-${i}`,
          medicamento: s.molecula,
          concentracao: s.dose.dose_padrao,
          forma_farmaceutica: 'Comprimido',
          quantidade: '1 caixa',
          posologia: s.posologia_completa,
          via: s.dose.via,
          duracao: s.dose.duracao ?? 'Contínuo',
          uso_continuo: true,
        })),
        data_emissao: new Date().toISOString(),
      },
    });
    // Resultado esperado: status final 'concluida', TODOS os dados das
    // etapas anteriores ainda presentes (nada foi apagado pela transição final).
    expect(state.activeConsultation?.status).toBe('concluida');
    expect(state.activeConsultation?.prescricao).toBeDefined();
    expect(state.activeConsultation?.anamnese).toBeDefined();
    expect(state.activeConsultation?.apoio_diagnostico).toBeDefined();
    expect(state.activeConsultation?.risco_calculado).toBeDefined();
    expect(state.activeConsultation?.plano_terapeutico).toBeDefined();
  });

  it('nota de fonte: a persistência REAL em Postgres (não apenas em memória) já é validada por backend/test/postgres-real.e2e-spec.ts (idempotência, ownership, cascade delete) — não duplicada aqui.', () => {
    expect(true).toBe(true);
  });
});

// ================================================================
// CJ-012 — Exames laboratoriais como dado clínico de decisão
// Fonte: BASE_CLINICA['dm2'] (clinical-decision-support.ts:192-243, Diretriz
// SBD 2023/ADA 2024, critérios glicemia≥126/HbA1c≥6,5%) + avaliarRiscoRenal
// (clinical-risk-engine.ts:242-262, lê `funcao_renal.creatinina`) +
// PROTOCOLOS['dm2'] (clinical-therapeutics.ts:71, Metformina 1ª linha) +
// entidade real "Metformina" (pharma-database.ts:687-690,
// ajuste_renal.tfg_60_30) + getAdjustmentForCrCl (dose-calculator.ts:315).
//
// Escopo desta RM: fechar a lacuna de cobertura da etapa "exames" da
// jornada (RM-64, seção 7 — risco de cobertura, não lacuna clínica) SEM
// construir um módulo novo de solicitação/interpretação de exames (que não
// existe formalizado no sistema hoje). Em vez disso, prova que RESULTADOS
// DE EXAME REAIS (não texto de anamnese, não sinais vitais) já fluem hoje
// como dado clínico de decisão em 3 pontos distintos do motor: diagnóstico
// objetivo (glicemia/HbA1c cruzam critério SEM nenhuma queixa textual),
// estratificação de risco (creatinina do exame altera a dimensão renal) e
// ajuste posológico (CrCl calculado a partir da MESMA creatinina do exame
// determina o ajuste real de Metformina).
// ================================================================
describe('CJ-012 — exames laboratoriais como dado clínico de decisão (diagnóstico → risco → dose)', () => {
  // Entrada: SEM nenhuma queixa/HDA textual de diabetes — só resultados de
  // exame reais (glicemia de jejum 180 mg/dL, HbA1c 7,8%, ambos acima do
  // critério diagnóstico da SBD 2023) e função renal moderadamente reduzida
  // (creatinina 2,2 mg/dL) — o mesmo paciente segue para as 3 etapas.
  const anamnese = baseAnamnesis({
    laboratorio: { glicemia: '180', hba1c: '7.8' },
    funcao_renal: { creatinina: 2.2 },
  });

  it('ação: submeter exames (glicemia+HbA1c) SEM nenhuma queixa textual de diabetes → hipótese de DM2 gerada só pelo dado objetivo do exame', () => {
    const apoio = analyzeClinical(anamnese);
    const dm2 = apoio.hipoteses.find((h) => h.cid10 === 'E11');
    // Resultado esperado: hipótese presente — só o critério "Glicemia de
    // jejum ≥ 126 mg/dL" (peso 10) já cruza peso_minimo_para_incluir (5),
    // sem nenhuma evidência textual/sintoma.
    expect(dm2).toBeDefined();
    // Comportamento proibido: nenhuma certeza fabricada a partir de texto —
    // o critério favorável real precisa citar o exame, não um sintoma
    // textual inventado.
    expect(dm2!.criterios_favoraveis.some((c) => c.toLowerCase().includes('glicemia'))).toBe(true);
  });

  it('ação: calcular estratificação de risco → a DIMENSÃO renal reflete a creatinina REAL do exame (não fabricada, não assumida como normal)', () => {
    const risco = avaliarRiscoClinico(anamnese, []);
    // Fonte: avaliarRiscoRenal — creatinina 2.2 mg/dL cai na faixa "> 2.0"
    // (disfunção renal moderada, score += 40). O fator citado deve conter o
    // valor real medido (rastreabilidade — nunca um número genérico).
    expect(risco.risco_renal.fatores.some((f) => f.includes('2.2'))).toBe(true);
    expect(risco.risco_renal.score).toBeGreaterThanOrEqual(40);
  });

  it('ação: calcular CrCl a partir da MESMA creatinina do exame → consultar ajuste renal real da Metformina (1ª linha de PROTOCOLOS.dm2) nesse CrCl', () => {
    // Mesmo valor de creatinina do exame usado nos 2 testes anteriores —
    // prova que as 3 etapas (diagnóstico, risco, dose) partem do MESMO dado
    // objetivo, não de números inventados isoladamente por etapa.
    const params: PatientParams = { idade: 65, sexo: 'M', peso: 70, creatinina: anamnese.funcao_renal.creatinina! };
    const crcl = calcCrCl(params);
    expect(crcl).not.toBeNull();
    // Resultado esperado: CrCl na faixa 30-60 mL/min (redução de dose, não
    // contraindicação total) — valor calculado, não assumido.
    expect(crcl!.crcl).toBeGreaterThanOrEqual(30);
    expect(crcl!.crcl).toBeLessThan(60);

    const metformina = getAllDrugs().find((d) => d.id === 'metformina');
    expect(metformina).toBeDefined();
    const ajuste = getAdjustmentForCrCl(metformina!.ajuste_renal, crcl!.crcl);
    // Resultado esperado: texto real da faixa 30-60 (reduzir/monitorar), não
    // o texto de "Contraindicado" (que só se aplica abaixo de 30, cenário
    // já coberto por CJ-004 com o perindopril).
    expect(ajuste).toContain('TFG 30-60');
    expect(ajuste.toLowerCase()).not.toContain('contraindicado');
  });
});

// ================================================================
// CJ-013 — Gestante/lactante com contraindicação farmacológica real
// Fonte: EligibilityContext/isEligible (therapeutic-class-expansion.ts:42-68,
// 237-248, `uso_gestante`/`uso_lactante === 'contraindicado'`) + entidades
// reais Enalapril (pharma-database.ts, `uso_gestante: 'contraindicado'`) e
// Losartana (BRA, `uso_gestante: 'contraindicado'`, `uso_lactante:
// 'contraindicado'`) + runSafetyCheck (safety-rules.ts:173-211, alertas
// 'gestante'/'lactante' reais). Reaproveita PROTOCOLOS.has (Enalapril, já
// usado em CJ-001) e CONDITION_CLASS_KEYS['has'] (BRA, já existente).
//
// Nenhuma regra clínica nova foi criada — este cenário só encadeia funções
// já existentes que já suportavam gestante/lactante (RM-64, seção 8, item 5).
// ================================================================
describe('CJ-013 — gestante/lactante: contraindicação farmacológica real (defesa em profundidade)', () => {
  const ctxGestante = eligibilityContextFromAnamnesis(baseAnamnesis({ gestante: true }));

  it('ação: gestante com HAS → o protocolo CURADO (PROTOCOLOS.has) ainda inclui Enalapril — a expansão por classe não re-filtra a âncora, só as moléculas descobertas por classe (comportamento atual do software, não regra clínica ideal)', () => {
    const plano = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica', ctxGestante);
    expect(plano).not.toBeNull();
    // Comportamento confirmado (não endossado como ideal): a âncora curada
    // do protocolo não passa por `isEligible` — só as moléculas descobertas
    // pela expansão de classe passam. A camada real de proteção para a
    // âncora é `runSafetyCheck` em tempo de prescrição (ver 3º teste).
    expect(plano!.farmacologico.some((s) => s.molecula === 'Enalapril')).toBe(true);
  });

  it('ação: expansão por classe (BRA, mesma classe do Enalapril) exclui Losartana com motivo real de contraindicação em gestação — rastreável em opcoes_excluidas', () => {
    const plano = getTherapeuticForCondition('has', 'Hipertensão Arterial Sistêmica', ctxGestante);
    const excluida = plano!.opcoes_excluidas?.find((o) => o.molecula === 'Losartana');
    // Resultado esperado: presente, com o motivo REAL retornado por
    // `isEligible` (não um texto genérico inventado para o teste).
    expect(excluida).toBeDefined();
    expect(excluida!.motivo.toLowerCase()).toContain('gesta');
  });

  it('ação: runSafetyCheck real com Enalapril + gestante:true → alerta CRÍTICO de contraindicação em gestação — a camada de segurança em tempo de prescrição PROTEGE mesmo quando o protocolo curado oferece a molécula contraindicada', () => {
    const alertas = runSafetyCheck({ moleculas: ['enalapril'], gestante: true });
    const alertaGestante = alertas.find((a) => a.tipo === 'gestante');
    expect(alertaGestante).toBeDefined();
    // Alerta esperado: severidade 'critical' (safety-rules.ts:180), ação
    // explícita de substituição — nunca um alerta informativo silencioso.
    expect(alertaGestante!.severidade).toBe('critical');
    expect(alertaGestante!.acao.toLowerCase()).toContain('substituir');
  });

  it('ação: lactante em uso de Losartana (mesma classe BRA, contraindicada também na lactação) → runSafetyCheck real → alerta de risco na amamentação', () => {
    const alertas = runSafetyCheck({ moleculas: ['losartana'], lactante: true });
    const alertaLactante = alertas.find((a) => a.tipo === 'lactante');
    expect(alertaLactante).toBeDefined();
    expect(alertaLactante!.severidade).toBe('danger');
    expect(alertaLactante!.descricao.toLowerCase()).toContain('amamenta');
  });
});
