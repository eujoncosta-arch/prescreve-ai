// ============================================================
// PRESCREVE-AI — Clinical Risk Engine (CAMADA 4)
// Avaliação multidimensional de risco clínico por paciente
// CV · Renal · Hemorrágico · Farmacológico · Interação · Terapêutico
// ============================================================

'use client';

import type { Anamnesis } from './types';
import type { TherapeuticSuggestion } from './types';

export type NivelRisco = 'baixo' | 'moderado' | 'alto' | 'muito_alto';

export interface DimensaoRisco {
  nivel: NivelRisco;
  score: number;           // 0–100
  fatores: string[];       // fatores que elevaram o risco
  protecoes: string[];     // fatores que reduziram o risco
  acoes: string[];         // recomendações de manejo
}

export interface RiscoCVFramingham {
  nivel: NivelRisco;
  score_10anos_pct: number;
  fatores_majorantes: string[];
  meta_ldl: string;
  intensidade_estatina: 'nenhuma' | 'baixa' | 'moderada' | 'alta';
}

export interface AvaliacaoRiscoClinico {
  paciente_id?: string;
  timestamp: string;

  // Dimensões independentes
  risco_cardiovascular: DimensaoRisco & { framingham?: RiscoCVFramingham };
  risco_renal: DimensaoRisco;
  risco_hemorragico: DimensaoRisco;
  risco_farmacologico: DimensaoRisco;
  risco_interacao: DimensaoRisco;
  risco_terapeutico: DimensaoRisco;

  // Consolidado
  risco_global: NivelRisco;
  score_global: number;    // média ponderada 0–100
  alerta_vermelho: boolean;
  justificativa_global: string;
  recomendacoes_prioritarias: string[];
}

// ──────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────

function nivelPorScore(score: number): NivelRisco {
  if (score >= 75) return 'muito_alto';
  if (score >= 50) return 'alto';
  if (score >= 25) return 'moderado';
  return 'baixo';
}

function temComorbidade(anamnese: Anamnesis, ...termos: string[]): boolean {
  const texto = [
    ...anamnese.comorbidades,
    anamnese.hpp,
    anamnese.hda,
  ].join(' ').toLowerCase();
  return termos.some(t => texto.includes(t.toLowerCase()));
}

function idade(anamnese: Anamnesis): number | undefined {
  // Tenta extrair idade de hpp ou hda com regex simples
  const match = (anamnese.hpp + ' ' + anamnese.hda).match(/(\d{1,3})\s*anos/i);
  return match ? parseInt(match[1]) : undefined;
}

// ──────────────────────────────────────────────────────────────
// RISCO CARDIOVASCULAR
// ──────────────────────────────────────────────────────────────

function avaliarRiscoCV(anamnese: Anamnesis): DimensaoRisco & { framingham?: RiscoCVFramingham } {
  const fatores: string[] = [];
  const protecoes: string[] = [];
  const acoes: string[] = [];
  let score = 0;

  const sv = anamnese.sinais_vitais;
  const lab = anamnese.laboratorio;
  const anos = idade(anamnese);

  // Fatores de risco major
  if (temComorbidade(anamnese, 'diabetes', 'dm2')) { fatores.push('Diabetes mellitus tipo 2'); score += 20; }
  if (temComorbidade(anamnese, 'iam', 'infarto', 'sca', 'síndrome coronariana', 'coronariopatia')) { fatores.push('Doença coronariana estabelecida'); score += 35; }
  if (temComorbidade(anamnese, 'avc', 'acidente vascular', 'ait')) { fatores.push('AVC/AIT prévio'); score += 30; }
  if (temComorbidade(anamnese, 'insuficiência cardíaca', 'icc', 'ic ')) { fatores.push('Insuficiência cardíaca'); score += 25; }
  if (temComorbidade(anamnese, 'hipertensão', 'has')) { fatores.push('Hipertensão arterial sistêmica'); score += 15; }
  if (temComorbidade(anamnese, 'dislipidemia', 'hipercolesterol')) { fatores.push('Dislipidemia'); score += 10; }
  if (temComorbidade(anamnese, 'fibrilação atrial', 'fa ', 'flutter atrial')) { fatores.push('Fibrilação atrial'); score += 20; }

  // Tabagismo
  if (anamnese.habitos_vida.tabagismo === 'sim') { fatores.push('Tabagismo ativo'); score += 15; }
  else if (anamnese.habitos_vida.tabagismo === 'ex') { fatores.push('Ex-tabagista'); score += 5; }

  // Etilismo
  if (anamnese.habitos_vida.etilismo === 'abusivo') { fatores.push('Etilismo abusivo'); score += 10; }

  // Sedentarismo
  if (anamnese.habitos_vida.atividade_fisica === 'sedentario') { fatores.push('Sedentarismo'); score += 5; }
  else if (anamnese.habitos_vida.atividade_fisica === 'moderado' || anamnese.habitos_vida.atividade_fisica === 'intenso') {
    protecoes.push('Atividade física regular'); score = Math.max(0, score - 5);
  }

  // IMC / Obesidade
  const imc = anamnese.imc;
  if (imc !== undefined) {
    if (imc >= 35) { fatores.push(`Obesidade grau II/III (IMC ${imc.toFixed(1)})`); score += 15; }
    else if (imc >= 30) { fatores.push(`Obesidade grau I (IMC ${imc.toFixed(1)})`); score += 8; }
    else if (imc >= 25) { fatores.push(`Sobrepeso (IMC ${imc.toFixed(1)})`); score += 3; }
  }

  // Pressão arterial
  if (sv.pa_sistolica !== undefined) {
    if (sv.pa_sistolica >= 160) { fatores.push(`PAS ${sv.pa_sistolica} mmHg — HAS estágio 2`); score += 15; }
    else if (sv.pa_sistolica >= 140) { fatores.push(`PAS ${sv.pa_sistolica} mmHg — HAS estágio 1`); score += 8; }
    else if (sv.pa_sistolica < 130) { protecoes.push('PA controlada'); }
  }

  // Laboratório
  const ldl = parseFloat(lab['ldl'] ?? lab['ldl_c'] ?? '0');
  if (ldl > 190) { fatores.push(`LDL ${ldl} mg/dL — muito alto`); score += 20; }
  else if (ldl > 130) { fatores.push(`LDL ${ldl} mg/dL — acima da meta`); score += 10; }

  // Idade
  if (anos !== undefined) {
    if (anos >= 75) { fatores.push(`Idade ${anos} anos — idoso de alto risco`); score += 15; }
    else if (anos >= 65) { fatores.push(`Idade ${anos} anos`); score += 8; }
    else if (anos < 45) { protecoes.push(`Idade ${anos} anos — fator protetor relativo`); score = Math.max(0, score - 5); }
  }

  // Ações preventivas
  if (score >= 50) {
    acoes.push('Calcular Escore de Risco Cardiovascular (ERG/Framingham) na consulta');
    acoes.push('Meta LDL: < 70 mg/dL (muito alto risco) ou < 50 mg/dL (DCV estabelecida)');
    acoes.push('Considerar AAS 100 mg/dia em prevenção secundária');
  }
  if (temComorbidade(anamnese, 'fibrilação atrial')) {
    acoes.push('Calcular CHA₂DS₂-VASc para indicação de anticoagulação oral');
  }
  if (score < 25) {
    protecoes.push('Sem fatores de risco CV major identificados');
  }

  // Estimar Framingham simplificado
  const framingham = estimarFramingham(anamnese, score);

  return {
    nivel: nivelPorScore(Math.min(score, 100)),
    score: Math.min(score, 100),
    fatores,
    protecoes,
    acoes,
    framingham,
  };
}

function estimarFramingham(anamnese: Anamnesis, scoreAcumulado: number): RiscoCVFramingham {
  const anos = idade(anamnese);
  const hasDM = temComorbidade(anamnese, 'diabetes', 'dm2');
  const hasDCV = temComorbidade(anamnese, 'iam', 'sca', 'coronario', 'avc');
  const sv = anamnese.sinais_vitais;

  // Estimativa simplificada em 10 anos (não substitui Framingham formal)
  let pct = 0;
  if (hasDCV) pct = 100; // DCV estabelecida = muito alto risco por definição
  else if (hasDM && (anos ?? 0) >= 60) pct = 25;
  else if (hasDM) pct = 15;
  else if ((sv.pa_sistolica ?? 0) >= 160) pct = 20;
  else if (anamnese.habitos_vida.tabagismo === 'sim') pct = 12;
  else pct = scoreAcumulado / 5;

  pct = Math.min(pct, 100);

  let meta_ldl = '< 160 mg/dL';
  let intensidade: RiscoCVFramingham['intensidade_estatina'] = 'nenhuma';

  if (pct >= 20 || hasDCV) {
    meta_ldl = '< 50 mg/dL (DCV estabelecida ou equivalente)';
    intensidade = 'alta';
  } else if (pct >= 10) {
    meta_ldl = '< 70 mg/dL';
    intensidade = 'moderada';
  } else if (pct >= 5) {
    meta_ldl = '< 100 mg/dL';
    intensidade = 'baixa';
  }

  const fatoresMaj: string[] = [];
  if (hasDCV) fatoresMaj.push('DCV aterosclerótica estabelecida');
  if (hasDM) fatoresMaj.push('Diabetes mellitus');
  if ((sv.pa_sistolica ?? 0) >= 160) fatoresMaj.push('HAS estágio 2 não controlada');
  if (anamnese.habitos_vida.tabagismo === 'sim') fatoresMaj.push('Tabagismo ativo');

  return {
    nivel: pct >= 20 ? 'muito_alto' : pct >= 10 ? 'alto' : pct >= 5 ? 'moderado' : 'baixo',
    score_10anos_pct: Math.round(pct),
    fatores_majorantes: fatoresMaj,
    meta_ldl,
    intensidade_estatina: intensidade,
  };
}

// ──────────────────────────────────────────────────────────────
// RISCO RENAL
// ──────────────────────────────────────────────────────────────

function avaliarRiscoRenal(anamnese: Anamnesis, medicamentos: TherapeuticSuggestion[]): DimensaoRisco {
  const fatores: string[] = [];
  const protecoes: string[] = [];
  const acoes: string[] = [];
  let score = 0;

  const fr = anamnese.funcao_renal;
  const tfg = fr.tfg;
  const creatinina = fr.creatinina;

  if (tfg !== undefined) {
    if (tfg < 15) { fatores.push(`TFG ${tfg} mL/min — DRC G5 (falência renal)`); score += 80; }
    else if (tfg < 30) { fatores.push(`TFG ${tfg} mL/min — DRC G4`); score += 60; }
    else if (tfg < 45) { fatores.push(`TFG ${tfg} mL/min — DRC G3b`); score += 40; }
    else if (tfg < 60) { fatores.push(`TFG ${tfg} mL/min — DRC G3a`); score += 20; }
    else { protecoes.push(`TFG ${tfg} mL/min — função renal preservada`); }
  } else if (creatinina !== undefined) {
    if (creatinina > 3.0) { fatores.push(`Creatinina ${creatinina} mg/dL — disfunção renal grave`); score += 60; }
    else if (creatinina > 2.0) { fatores.push(`Creatinina ${creatinina} mg/dL — disfunção renal moderada`); score += 40; }
    else if (creatinina > 1.3) { fatores.push(`Creatinina ${creatinina} mg/dL — função limítrofe`); score += 15; }
  }

  // Comorbidades nefrotóxicas
  if (temComorbidade(anamnese, 'diabetes', 'dm2')) { fatores.push('DM2 — risco de nefropatia diabética'); score += 15; }
  if (temComorbidade(anamnese, 'hipertensão', 'has')) { fatores.push('HAS — causa frequente de DRC'); score += 10; }
  if (temComorbidade(anamnese, 'lúpus', 'nefrite lúpica')) { fatores.push('Lúpus — risco de nefrite'); score += 20; }
  if (temComorbidade(anamnese, 'mieloma', 'amiloidose')) { fatores.push('Nefropatia hematológica'); score += 25; }

  // Medicamentos nefrotóxicos prescritos
  const classesMeds = medicamentos.map(m => m.classe_terapeutica.toLowerCase());
  if (classesMeds.some(c => c.includes('aine') || c.includes('anti-inflamatório'))) {
    fatores.push('AINE prescrito — nefrotóxico em DRC'); score += 20;
    acoes.push('Evitar AINEs em TFG < 30. Usar paracetamol como alternativa analgésica.');
  }
  if (classesMeds.some(c => c.includes('metformina') || c.includes('biguanida'))) {
    if ((tfg ?? 99) < 30) { fatores.push('Metformina com TFG < 30 — risco de acidose lática'); score += 30; acoes.push('Suspender metformina se TFG < 30 mL/min.'); }
  }
  if (classesMeds.some(c => c.includes('isglt2') || c.includes('sglt'))) {
    if ((tfg ?? 99) < 20) { fatores.push('iSGLT2 com TFG < 20 — sem eficácia glicêmica'); score += 10; acoes.push('iSGLT2: não iniciar se TFG < 20 para DM2; manter com cautela em ICC até TFG 20.'); }
  }

  if (score >= 40) {
    acoes.push('Monitorar creatinina e K+ a cada 3 meses');
    acoes.push('Encaminhar a nefrologia se TFG < 30 ou proteinúria > 300 mg/g');
    acoes.push('Revisar todos os fármacos para ajuste renal');
  }

  return { nivel: nivelPorScore(Math.min(score, 100)), score: Math.min(score, 100), fatores, protecoes, acoes };
}

// ──────────────────────────────────────────────────────────────
// RISCO HEMORRÁGICO
// ──────────────────────────────────────────────────────────────

function avaliarRiscoHemorragico(anamnese: Anamnesis, medicamentos: TherapeuticSuggestion[]): DimensaoRisco {
  const fatores: string[] = [];
  const protecoes: string[] = [];
  const acoes: string[] = [];
  let score = 0;

  // Histórico hemorrágico
  if (temComorbidade(anamnese, 'sangramento', 'hemorragia', 'hematoquezia', 'hematêmese', 'melena')) {
    fatores.push('Sangramento ativo ou recente no histórico'); score += 40;
  }
  if (temComorbidade(anamnese, 'úlcera', 'gastropatia', 'gastrite erosiva')) {
    fatores.push('Gastropatia/úlcera — fator de risco hemorrágico'); score += 20;
  }
  if (temComorbidade(anamnese, 'trombocitopenia', 'plaquetas baixas')) {
    fatores.push('Trombocitopenia'); score += 25;
  }
  if (temComorbidade(anamnese, 'hemofilia', 'coagulopatia', 'von willebrand')) {
    fatores.push('Coagulopatia hereditária'); score += 40;
  }

  // Medicamentos antitrombóticos
  const medsNomes = anamnese.medicamentos_em_uso.map(m => m.nome.toLowerCase());
  const classesPrescritas = medicamentos.map(m => m.classe_terapeutica.toLowerCase());

  const temAAS = medsNomes.some(n => n.includes('aas') || n.includes('aspirina') || n.includes('ácido acetilsalicílico'));
  const temAnticoag = medsNomes.some(n => n.includes('varfarina') || n.includes('rivaroxabana') || n.includes('apixabana') || n.includes('dabigatrana'));
  const temAINE = medsNomes.some(n => n.includes('aine') || n.includes('ibuprofeno') || n.includes('diclofenaco') || n.includes('naproxeno')) ||
    classesPrescritas.some(c => c.includes('aine'));

  if (temAnticoag) { fatores.push('Anticoagulação oral em uso'); score += 30; }
  if (temAAS && temAnticoag) { fatores.push('Dupla antitrombótica (AAS + anticoagulante)'); score += 20; }
  if (temAINE && (temAAS || temAnticoag)) { fatores.push('AINE + antitrombótico — interação hemorrágica grave'); score += 30; acoes.push('Contraindicado AINE + anticoagulante/AAS. Usar paracetamol para analgesia.'); }

  // Hepatopatia
  if (anamnese.funcao_hepatica.child_pugh === 'C') {
    fatores.push('Cirrose Child-Pugh C — coagulopatia hepática'); score += 35;
    acoes.push('Avaliar INR/TP antes de qualquer antitrombótico em cirrose avançada.');
  }

  const anos = idade(anamnese);
  if (anos !== undefined && anos >= 75) { fatores.push(`Idade ${anos} anos — maior risco hemorrágico`); score += 10; }

  if (score < 20) protecoes.push('Sem fatores de risco hemorrágico identificados');
  if (score >= 50) acoes.push('Solicitar hemograma + coagulograma antes de iniciar antitrombóticos');

  return { nivel: nivelPorScore(Math.min(score, 100)), score: Math.min(score, 100), fatores, protecoes, acoes };
}

// ──────────────────────────────────────────────────────────────
// RISCO FARMACOLÓGICO (alergias, contraindicações absolutas)
// ──────────────────────────────────────────────────────────────

function avaliarRiscoFarmacologico(anamnese: Anamnesis, medicamentos: TherapeuticSuggestion[]): DimensaoRisco {
  const fatores: string[] = [];
  const protecoes: string[] = [];
  const acoes: string[] = [];
  let score = 0;

  // Gestante / Lactante
  if (anamnese.gestante) {
    fatores.push('Gestação — verificar categoria de risco de todos os fármacos');
    score += 30;
    acoes.push('Revisar categorias de risco na gestação (FDA/ANVISA). Evitar Categoria D/X.');
    medicamentos.forEach(m => {
      if (m.contraindicacoes.some(c => c.toLowerCase().includes('grávid') || c.toLowerCase().includes('gestação') || c.toLowerCase().includes('categoria d'))) {
        fatores.push(`${m.molecula} — contraindicado na gestação`); score += 20;
        acoes.push(`Suspender / substituir ${m.molecula} durante gestação.`);
      }
    });
  }
  if (anamnese.lactante) {
    fatores.push('Amamentação — verificar segurança na lactação');
    score += 15;
  }

  // Alergias
  anamnese.alergias.forEach(a => {
    if (a.tipo === 'medicamento') {
      const alergenoLower = a.substancia.toLowerCase();
      medicamentos.forEach(m => {
        if (m.molecula.toLowerCase().includes(alergenoLower) || m.classe_terapeutica.toLowerCase().includes(alergenoLower)) {
          fatores.push(`Alergia documentada a ${a.substancia} — conflito com ${m.molecula}`);
          score += a.gravidade === 'grave' ? 60 : 30;
          acoes.push(`Substituir ${m.molecula} por alternativa sem reatividade cruzada.`);
        }
      });
    }
  });

  // Contraindicações por comorbidade
  medicamentos.forEach(m => {
    const contras = m.contraindicacoes;
    if (temComorbidade(anamnese, 'asma') && contras.some(c => c.toLowerCase().includes('asma') || c.toLowerCase().includes('broncoespasmo'))) {
      fatores.push(`${m.molecula} — contraindicado em asma`); score += 25;
      acoes.push(`Evitar ${m.molecula} em paciente com asma.`);
    }
    if (temComorbidade(anamnese, 'hipercalemia', 'k+ > 5') && contras.some(c => c.toLowerCase().includes('hipercalemia') || c.toLowerCase().includes('k+'))) {
      fatores.push(`${m.molecula} — risco de hipercalemia`); score += 20;
    }
    if (temComorbidade(anamnese, 'angioedema') && contras.some(c => c.toLowerCase().includes('angioedema'))) {
      fatores.push(`${m.molecula} — histórico de angioedema: contraindicado`); score += 40;
      acoes.push(`Substituir ${m.molecula}. Usar BRA se angioedema por IECA.`);
    }
  });

  if (score === 0) protecoes.push('Sem alergias documentadas, sem contraindicações identificadas');

  return { nivel: nivelPorScore(Math.min(score, 100)), score: Math.min(score, 100), fatores, protecoes, acoes };
}

// ──────────────────────────────────────────────────────────────
// RISCO DE INTERAÇÃO MEDICAMENTOSA
// ──────────────────────────────────────────────────────────────

const PARES_INTERACAO: Array<{
  a: string; b: string;
  gravidade: NivelRisco;
  descricao: string;
  acao: string;
}> = [
  { a: 'ieca', b: 'bra', gravidade: 'alto', descricao: 'Duplo bloqueio do SRAA — hipercalemia e IRA', acao: 'Não combinar IECA + BRA. Usar apenas um.' },
  { a: 'ieca', b: 'aine', gravidade: 'alto', descricao: 'IECA + AINE — redução do efeito anti-hipertensivo e nefrotoxicidade', acao: 'Evitar combinação. Substituir AINE por paracetamol.' },
  { a: 'bra', b: 'aine', gravidade: 'alto', descricao: 'BRA + AINE — mesma interação renal que IECA + AINE', acao: 'Evitar combinação.' },
  { a: 'ieca', b: 'espironolactona', gravidade: 'moderado', descricao: 'IECA + ARM — risco de hipercalemia', acao: 'Monitorar K+ em 1 semana após início.' },
  { a: 'metformina', b: 'contraste', gravidade: 'alto', descricao: 'Metformina + contraste iodado — risco de acidose lática', acao: 'Suspender metformina 48h antes e após contraste se TFG < 60.' },
  { a: 'varfarina', b: 'aine', gravidade: 'muito_alto', descricao: 'Varfarina + AINE — risco hemorrágico grave (TGI)', acao: 'Contraindicado. Substituir AINE por paracetamol.' },
  { a: 'isrs', b: 'tramadol', gravidade: 'alto', descricao: 'ISRS + Tramadol — risco de síndrome serotoninérgica', acao: 'Evitar combinação. Usar opioide alternativo ou analgésico não serotoninérgico.' },
  { a: 'amiodarona', b: 'azitromicina', gravidade: 'muito_alto', descricao: 'Amiodarona + Azitromicina — prolongamento QT, risco de torsades de pointes', acao: 'Contraindicado. Usar azitromicina apenas se ECG normal e sem alternativa.' },
  { a: 'lítio', b: 'diurético', gravidade: 'alto', descricao: 'Lítio + tiazídico/furosemida — risco de toxicidade por lítio', acao: 'Monitorar lítio sérico se diurético necessário.' },
  { a: 'corticoide', b: 'aine', gravidade: 'alto', descricao: 'Corticoide + AINE — risco de úlcera péptica e sangramento TGI', acao: 'Associar IBP se combinação necessária.' },
];

function avaliarRiscoInteracao(anamnese: Anamnesis, medicamentos: TherapeuticSuggestion[]): DimensaoRisco {
  const fatores: string[] = [];
  const protecoes: string[] = [];
  const acoes: string[] = [];
  let score = 0;

  const todosNomes = [
    ...anamnese.medicamentos_em_uso.map(m => m.nome.toLowerCase()),
    ...medicamentos.map(m => `${m.molecula.toLowerCase()} ${m.classe_terapeutica.toLowerCase()}`),
  ];

  const contemTermo = (termo: string) => todosNomes.some(n => n.includes(termo));

  PARES_INTERACAO.forEach(par => {
    if (contemTermo(par.a) && contemTermo(par.b)) {
      const incremento = par.gravidade === 'muito_alto' ? 40 : par.gravidade === 'alto' ? 25 : par.gravidade === 'moderado' ? 15 : 8;
      fatores.push(`Interação ${par.a.toUpperCase()} + ${par.b.toUpperCase()}: ${par.descricao}`);
      acoes.push(par.acao);
      score += incremento;
    }
  });

  if (score === 0) protecoes.push('Sem interações medicamentosas relevantes identificadas');

  return { nivel: nivelPorScore(Math.min(score, 100)), score: Math.min(score, 100), fatores, protecoes, acoes };
}

// ──────────────────────────────────────────────────────────────
// RISCO TERAPÊUTICO (adequação da terapia ao diagnóstico)
// ──────────────────────────────────────────────────────────────

function avaliarRiscoTerapeutico(anamnese: Anamnesis, medicamentos: TherapeuticSuggestion[]): DimensaoRisco {
  const fatores: string[] = [];
  const protecoes: string[] = [];
  const acoes: string[] = [];
  let score = 0;

  // Polifarmácia
  const totalMeds = anamnese.medicamentos_em_uso.length + medicamentos.length;
  if (totalMeds >= 10) {
    fatores.push(`Polifarmácia grave (${totalMeds} medicamentos) — maior risco de interação e não-adesão`); score += 30;
    acoes.push('Realizar revisão farmacoterapêutica (deprescição de medicamentos potencialmente inapropriados — critérios STOPP/START).');
  } else if (totalMeds >= 5) {
    fatores.push(`Polifarmácia moderada (${totalMeds} medicamentos)`); score += 15;
  }

  // Critérios de Beers em idosos
  const anos = idade(anamnese);
  if (anos !== undefined && anos >= 65) {
    const nomesPrescritos = medicamentos.map(m => m.molecula.toLowerCase());
    const beersMeds = ['amiodarona', 'digoxina', 'espironolactona', 'nitrofurantoína', 'haloperidol', 'alprazolam', 'diazepam', 'clonazepam', 'anti-histamínico', 'prometazina'];
    beersMeds.forEach(b => {
      if (nomesPrescritos.some(n => n.includes(b))) {
        fatores.push(`${b} — critério de Beers em ≥ 65 anos`); score += 15;
        acoes.push(`Revisar indicação de ${b} em idoso. Avaliar alternativa mais segura.`);
      }
    });
  }

  // Diagnóstico sem cobertura terapêutica
  const temDM = temComorbidade(anamnese, 'diabetes', 'dm2');
  const temHAS = temComorbidade(anamnese, 'hipertensão', 'has');
  const temIC = temComorbidade(anamnese, 'insuficiência cardíaca', 'icc');

  const classesPrescritas = medicamentos.map(m => m.classe_terapeutica.toLowerCase()).join(' ');

  if (temDM && !classesPrescritas.includes('biguanida') && !classesPrescritas.includes('sglt') && !classesPrescritas.includes('glp') && !classesPrescritas.includes('insulina')) {
    fatores.push('DM2 identificado sem terapia hipoglicemiante prescrita'); score += 25;
    acoes.push('Incluir agente hipoglicemiante (metformina ou iSGLT2/GLP-1 conforme perfil).');
  }
  if (temHAS && !classesPrescritas.includes('ieca') && !classesPrescritas.includes('bra') && !classesPrescritas.includes('bloqueador') && !classesPrescritas.includes('tiazídico') && !classesPrescritas.includes('anlodipino') && !classesPrescritas.includes('calcio')) {
    fatores.push('HAS identificada sem anti-hipertensivo prescrito'); score += 20;
    acoes.push('Incluir anti-hipertensivo (IECA/BRA + diurético como padrão inicial SBC 2020).');
  }
  if (temIC && !classesPrescritas.includes('betabloqueador') && !classesPrescritas.includes('ieca') && !classesPrescritas.includes('bra') && !classesPrescritas.includes('arni')) {
    fatores.push('IC identificada sem pilar farmacológico básico (IECA/BRA + betabloqueador)'); score += 25;
    acoes.push('Revisar esquema de IC: incluir IECA/BRA + betabloqueador + ARM conforme FEVE.');
  }

  if (score === 0) protecoes.push('Cobertura terapêutica adequada para as comorbidades identificadas');

  return { nivel: nivelPorScore(Math.min(score, 100)), score: Math.min(score, 100), fatores, protecoes, acoes };
}

// ──────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ──────────────────────────────────────────────────────────────

export function avaliarRiscoClinico(
  anamnese: Anamnesis,
  medicamentos: TherapeuticSuggestion[] = []
): AvaliacaoRiscoClinico {
  const risco_cardiovascular = avaliarRiscoCV(anamnese);
  const risco_renal = avaliarRiscoRenal(anamnese, medicamentos);
  const risco_hemorragico = avaliarRiscoHemorragico(anamnese, medicamentos);
  const risco_farmacologico = avaliarRiscoFarmacologico(anamnese, medicamentos);
  const risco_interacao = avaliarRiscoInteracao(anamnese, medicamentos);
  const risco_terapeutico = avaliarRiscoTerapeutico(anamnese, medicamentos);

  // Ponderação: CV (25%) + Renal (20%) + Hemo (15%) + Farma (20%) + Interação (10%) + Terapêutico (10%)
  const score_global = Math.round(
    risco_cardiovascular.score * 0.25 +
    risco_renal.score * 0.20 +
    risco_hemorragico.score * 0.15 +
    risco_farmacologico.score * 0.20 +
    risco_interacao.score * 0.10 +
    risco_terapeutico.score * 0.10
  );

  const risco_global = nivelPorScore(score_global);

  const alerta_vermelho =
    risco_farmacologico.nivel === 'muito_alto' ||
    risco_interacao.nivel === 'muito_alto' ||
    (risco_cardiovascular.nivel === 'muito_alto' && risco_renal.nivel === 'alto') ||
    risco_farmacologico.fatores.some(f => f.includes('contraindicado'));

  const todas_acoes = [
    ...risco_cardiovascular.acoes,
    ...risco_renal.acoes,
    ...risco_hemorragico.acoes,
    ...risco_farmacologico.acoes,
    ...risco_interacao.acoes,
    ...risco_terapeutico.acoes,
  ];
  const recomendacoes_prioritarias = [...new Set(todas_acoes)].slice(0, 5);

  return {
    timestamp: new Date().toISOString(),
    risco_cardiovascular,
    risco_renal,
    risco_hemorragico,
    risco_farmacologico,
    risco_interacao,
    risco_terapeutico,
    risco_global,
    score_global,
    alerta_vermelho,
    justificativa_global: `Score global de risco: ${score_global}/100. Dimensão mais crítica: ${
      [
        { d: 'cardiovascular', s: risco_cardiovascular.score },
        { d: 'renal', s: risco_renal.score },
        { d: 'hemorrágico', s: risco_hemorragico.score },
        { d: 'farmacológico', s: risco_farmacologico.score },
        { d: 'interação', s: risco_interacao.score },
        { d: 'terapêutico', s: risco_terapeutico.score },
      ].sort((a, b) => b.s - a.s)[0].d
    }.`,
    recomendacoes_prioritarias,
  };
}
