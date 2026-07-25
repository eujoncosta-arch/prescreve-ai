// ============================================================
// PRESCREVE-AI — Expansão de Cobertura da Conduta Farmacológica
//
// PROBLEMA: `PROTOCOLOS` (clinical-therapeutics.ts) contém, por condição,
// uma lista FIXA e curta de sugestões (ex.: HAS = [enalapril, hctz]),
// mesmo quando outras moléculas da MESMA classe terapêutica já elegível
// existem na base canônica — hoje citadas apenas como texto livre no
// campo `alternativas` de cada sugestão, nunca estruturadas.
//
// ESTE MÓDULO NÃO É UMA SEGUNDA BASE DE DADOS. Ele:
//   - reutiliza o Drug Repository (drugRepository / pharma-core) como
//     única fonte de descoberta de moléculas, marcas e apresentações;
//   - reutiliza o modelo TherapeuticSuggestion já existente (nenhum
//     campo novo);
//   - só expande DENTRO das classes terapêuticas JÁ citadas pelo time
//     clínico nos protocolos existentes (campo `alternativas` — texto
//     que já estava no código, nunca inventado aqui);
//   - filtra por elegibilidade real (indicação própria da molécula,
//     gestação/lactação, função renal/hepática, alergia, interação
//     contraindicada com medicação em uso) antes de sugerir.
//
// O motor de segurança (safety-rules.ts / runSafetyCheck) continua
// sendo a camada de checagem em tempo de prescrição — este módulo atua
// ANTES, na geração de candidatos, e não o substitui.
// ============================================================

import { drugRepository } from './pharma-core';
import type { DrugEntity } from './pharma-core';
import { toMoleculeId } from './governance/data-governance';
import type {
  TherapeuticSuggestion,
  TherapeuticPlan,
  DrugDose,
  DrugBrand,
  ScientificReference,
  Anamnesis,
  ExcludedTherapeuticOption,
} from './types';

// ─── Contexto de elegibilidade (reaproveita os campos já existentes em Anamnesis) ─

export interface EligibilityContext {
  gestante?: boolean;
  lactante?: boolean;
  tfg?: number; // mL/min/1,73 m² — de Anamnesis.funcao_renal.tfg
  childPugh?: 'A' | 'B' | 'C'; // de Anamnesis.funcao_hepatica.child_pugh
  alergias?: string[]; // substâncias, de Anamnesis.alergias[].substancia
  medicamentosEmUso?: string[]; // nomes, de Anamnesis.medicamentos_em_uso[].nome
  /** RM-26: comorbidades da anamnese — usadas para priorização (não afeta elegibilidade). */
  comorbidades?: string[]; // de Anamnesis.comorbidades
}

/** Constrói o contexto de elegibilidade/priorização a partir da Anamnese já coletada (reuso — nenhum dado novo). */
export function eligibilityContextFromAnamnesis(a?: Anamnesis): EligibilityContext | undefined {
  if (!a) return undefined;
  return {
    gestante: a.gestante,
    lactante: a.lactante,
    tfg: a.funcao_renal?.tfg,
    childPugh: a.funcao_hepatica?.child_pugh,
    alergias: (a.alergias ?? []).map((x) => x.substancia),
    medicamentosEmUso: (a.medicamentos_em_uso ?? []).filter((m) => m.em_uso).map((m) => m.nome),
    comorbidades: a.comorbidades ?? [],
  };
}

/** @deprecated use `ExcludedTherapeuticOption` (types.ts) — mantido como alias para compatibilidade. */
export type ExcludedOption = ExcludedTherapeuticOption;

// ─── 1) Classe terapêutica elegível — normalização ───────────────────────────
//
// Mapa de string bruta de classe (QuickDrug.classe / DrugEntity.therapeuticClass,
// tal como existe na base canônica hoje) → chave canônica de classe. Cada
// variante listada abaixo foi conferida por auditoria direta da base — nenhuma
// classe nova é inventada, apenas normalizamos grafias divergentes da MESMA
// classe (ex.: "Beta-bloqueador" vs "Betabloqueador").

const CLASS_KEY_MAP: Record<string, string> = {
  'IECA': 'IECA',
  'BRA': 'BRA',
  'BRA — Bloqueador do Receptor de Angiotensina II (AT1)': 'BRA',
  'BCC': 'BCC',
  'Diurético Tiazídico': 'TIAZIDICO',
  'Diurético': 'TIAZIDICO',
  'Biguanida': 'BIGUANIDA',
  'SGLT-2': 'SGLT2',
  'iSGLT2': 'SGLT2',
  'DPP-4': 'DPP4',
  'AR-GLP-1': 'GLP1',
  'Estatina (Inibidor da HMG-CoA Redutase)': 'ESTATINA',
  'Hipolipemiante': 'HIPOLIPEMIANTE',
  'ICS/LABA': 'ICS_LABA',
  'SABA (Beta-2 agonista de curta ação)': 'SABA',
  'SABA': 'SABA',
  'ICS': 'ICS',
  'Antagonista de Receptor de Leucotrieno': 'ANTAGONISTA_LEUCOTRIENO',
  'LAMA': 'LAMA',
  'LABA': 'LABA',
  'LABA/LAMA': 'LABA_LAMA',
  'SAMA': 'SAMA',
  'Beta-bloqueador': 'BETABLOQUEADOR',
  'Betabloqueador': 'BETABLOQUEADOR',
  'Betabloqueador Cardiosseletivo (β1) — Ação Prolongada': 'BETABLOQUEADOR',
  'ARM — Antagonista da Aldosterona': 'ARM',
  'ARM': 'ARM',
  'Diurético de Alça': 'DIURETICO_ALCA',
  'ARNI': 'ARNI',
  'Antiagregante Plaquetário — Inibidor COX Irreversível': 'ANTIAGREGANTE',
  'Antiplaquetário': 'ANTIAGREGANTE',
  'Hormônio Tireoidiano': 'HORMONIO_TIREOIDIANO',
  'Hormônio Tireoidiano Sintético (T4)': 'HORMONIO_TIREOIDIANO',
  'Penicilina de Amplo Espectro': 'AMINOPENICILINA',
  'Aminopenicilina': 'AMINOPENICILINA',
};

const CLASS_LABELS: Record<string, string> = {
  IECA: 'Inibidor da Enzima Conversora de Angiotensina (IECA)',
  BRA: 'Bloqueador do Receptor de Angiotensina II (BRA)',
  BCC: 'Bloqueador de Canal de Cálcio (BCC)',
  TIAZIDICO: 'Diurético Tiazídico / Tiazídico-símile',
  BIGUANIDA: 'Biguanida',
  SGLT2: 'Inibidor do SGLT-2 (iSGLT2)',
  DPP4: 'Inibidor da DPP-4 (iDPP-4)',
  GLP1: 'Agonista do Receptor de GLP-1 (AR-GLP-1)',
  ESTATINA: 'Estatina (Inibidor da HMG-CoA Redutase)',
  HIPOLIPEMIANTE: 'Hipolipemiante (não-estatina)',
  ICS_LABA: 'Corticosteroide Inalatório + LABA (ICS/LABA)',
  SABA: 'Beta-2 agonista de curta ação (SABA)',
  ICS: 'Corticosteroide Inalatório isolado (ICS)',
  ANTAGONISTA_LEUCOTRIENO: 'Antagonista de Receptor de Leucotrieno',
  LAMA: 'Broncodilatador LAMA (Anticolinérgico de Longa Ação)',
  LABA: 'Broncodilatador LABA (Beta-2 agonista de Longa Ação)',
  LABA_LAMA: 'Broncodilatador Duplo LABA/LAMA',
  SAMA: 'Broncodilatador SAMA (Anticolinérgico de Curta Ação)',
  BETABLOQUEADOR: 'Betabloqueador',
  ARM: 'Antagonista da Aldosterona (ARM)',
  DIURETICO_ALCA: 'Diurético de Alça',
  ARNI: 'Inibidor da Neprilisina e do Receptor de Angiotensina (ARNI)',
  ANTIAGREGANTE: 'Antiagregante Plaquetário',
  HORMONIO_TIREOIDIANO: 'Hormônio Tireoidiano Sintético',
  AMINOPENICILINA: 'Aminopenicilina',
};

function classKeyOf(rawClasse: string): string | null {
  return CLASS_KEY_MAP[rawClasse] ?? null;
}

// ─── 2) Classes elegíveis por condição ────────────────────────────────────────
//
// Fonte: campo `alternativas` das sugestões JÁ curadas em PROTOCOLOS
// (clinical-therapeutics.ts) — cada classe abaixo corresponde a um texto que
// já existia ali (ex.: HAS/enalapril.alternativas cita "(BRA)" e "(BCC)").
// Não é uma lista nova de classes clínicas — é a promoção do texto livre já
// escrito pelo time clínico para chaves estruturadas e pesquisáveis.

const CONDITION_CLASS_KEYS: Record<string, string[]> = {
  has: ['IECA', 'BRA', 'BCC', 'TIAZIDICO'],
  dm2: ['BIGUANIDA', 'SGLT2', 'DPP4', 'GLP1'],
  dislipidemia: ['ESTATINA', 'HIPOLIPEMIANTE'],
  asma: ['ICS_LABA', 'SABA', 'ICS', 'ANTAGONISTA_LEUCOTRIENO'],
  dpoc: ['LAMA', 'SABA', 'LABA_LAMA', 'LABA', 'SAMA'],
  icc: ['IECA', 'BETABLOQUEADOR', 'ARM', 'DIURETICO_ALCA', 'BRA', 'ARNI'],
  sca: ['ANTIAGREGANTE'],
  hipotireoidismo: ['HORMONIO_TIREOIDIANO'],
  faringoamigdalite: ['AMINOPENICILINA'],
  pac: ['AMINOPENICILINA'],
};

// ─── 3) Filtro de indicação própria (evita "mesma classe ≠ mesma indicação") ──
//
// Ex.: atenolol é Betabloqueador mas sua bula (indications, dado real da base
// canônica) não cita IC — não deve aparecer como alternativa em ICC mesmo
// pertencendo à mesma classe de carvedilol/bisoprolol/metoprolol.

const CONDITION_INDICATION_TOKENS: Record<string, string[]> = {
  has: ['has', 'hipertens'],
  dm2: ['dm2', 'diabetes'],
  dislipidemia: ['dislipidemia', 'ldl', 'colesterol', 'aterosclerose'],
  asma: ['asma'],
  dpoc: ['dpoc'],
  icc: ['ic-fer', 'insuficiência cardíaca', 'insuficiencia cardiaca', ' ic ', 'icc'],
  sca: ['sca', 'iam', 'coronari', 'infarto'],
  hipotireoidismo: ['hipotireoidismo', 'tireoidiano', 'tireoide'],
  faringoamigdalite: ['faringoamigdalite', 'faringite', 'amigdalite'],
  pac: ['pac', 'pneumonia'],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function entityCoversCondition(entity: DrugEntity, conditionId: string): boolean {
  const tokens = CONDITION_INDICATION_TOKENS[conditionId];
  if (!tokens || tokens.length === 0) return true; // sem token definido: não bloquear
  const haystack = normalize(entity.indications.join(' | '));
  return tokens.some((t) => haystack.includes(normalize(t)));
}

// ─── 4) Elegibilidade clínica (dados reais da própria molécula) ──────────────

export function isEligible(
  entity: DrugEntity,
  ctx?: EligibilityContext,
): { eligible: boolean; reason?: string } {
  if (!ctx) return { eligible: true };

  if (ctx.gestante && entity.pregnancy === 'contraindicado') {
    return { eligible: false, reason: 'Contraindicado na gestação' };
  }
  if (ctx.lactante && entity.lactation === 'contraindicado') {
    return { eligible: false, reason: 'Contraindicado na lactação' };
  }

  if (ctx.alergias?.length) {
    const nomes = [entity.activeIngredient.name, ...(entity.activeIngredient.sinonimos ?? [])].map(normalize);
    const alergico = ctx.alergias.some((a) => nomes.some((n) => n.includes(normalize(a)) || normalize(a).includes(n)));
    if (alergico) return { eligible: false, reason: 'Alergia registrada na anamnese' };
  }

  if (ctx.tfg !== undefined) {
    const renal = entity.dosageRules.find((r) => r.population === 'renal');
    const detail = renal?.detail as Record<string, string> | undefined;
    const check = (v?: string) => !!v && normalize(v).includes('contraindicad');
    if (ctx.tfg < 15 && check(detail?.tfg_lt_15)) {
      return { eligible: false, reason: `Contraindicado com TFG < 15 (${detail!.tfg_lt_15})` };
    }
    if (ctx.tfg < 30 && check(detail?.tfg_30_15)) {
      return { eligible: false, reason: `Contraindicado com TFG < 30 (${detail!.tfg_30_15})` };
    }
  }

  if (ctx.childPugh) {
    const hep = entity.dosageRules.find((r) => r.population === 'hepatico');
    const detail = hep?.detail as Record<string, string> | undefined;
    const key = ctx.childPugh === 'A' ? 'child_a' : ctx.childPugh === 'B' ? 'child_b' : 'child_c';
    const v = detail?.[key];
    if (v && normalize(v).includes('contraindicad')) {
      return { eligible: false, reason: `Contraindicado em Child-Pugh ${ctx.childPugh} (${v})` };
    }
  }

  if (ctx.medicamentosEmUso?.length) {
    const emUso = ctx.medicamentosEmUso.map(normalize);
    const conflito = entity.interactions.find(
      (i) => i.severity === 'contraindicado' && emUso.some((m) => m.includes(normalize(i.with)) || normalize(i.with).includes(m)),
    );
    if (conflito) {
      return { eligible: false, reason: `Interação contraindicada com "${conflito.with}" (em uso)` };
    }
  }

  return { eligible: true };
}

// ─── 5) Construção da sugestão a partir da DrugEntity canônica ───────────────

function buildDose(entity: DrugEntity): DrugDose {
  const adulto = entity.dosageRules.find((r) => r.population === 'adulto');
  const renal = entity.dosageRules.find((r) => r.population === 'renal');
  const hepatico = entity.dosageRules.find((r) => r.population === 'hepatico');
  const detail = (adulto?.detail ?? {}) as Record<string, string>;
  const unidade = adulto?.unit || '';
  const withUnit = (v?: string) => (v ? `${v} ${unidade}`.trim() : undefined);
  return {
    dose_padrao: withUnit(adulto?.summary) || 'Conforme bula',
    dose_min: withUnit(detail.min),
    dose_max: withUnit(detail.max),
    unidade,
    via: adulto?.route || 'Oral',
    frequencia: detail.frequencias || '',
    duracao: 'Contínuo',
    ajuste_renal: renal?.summary,
    ajuste_hepatico: hepatico?.summary,
  };
}

/** Texto de posologia completa — prioriza `instrucoes` (texto sourced completo já na base). */
function buildPosologiaCompleta(entity: DrugEntity): string {
  const adulto = entity.dosageRules.find((r) => r.population === 'adulto');
  const detail = (adulto?.detail ?? {}) as Record<string, string>;
  if (detail.instrucoes) return detail.instrucoes;
  const dose = buildDose(entity);
  const freq = dose.frequencia || 'conforme prescrição';
  return `${entity.activeIngredient.name} ${dose.dose_padrao} — ${freq} (${dose.via}).`;
}

function buildBrands(entity: DrugEntity): DrugBrand[] {
  return entity.brands.map((b) => {
    const pres = entity.presentations.filter((p) => p.brandId === b.brandId);
    const lab = entity.laboratories.find((l) => l.laboratoryId === b.laboratoryId);
    return {
      laboratorio: lab?.name ?? b.laboratoryId,
      nome_comercial: b.name,
      apresentacoes: pres.length ? pres.map((p) => `${p.concentration} — ${p.form}`) : entity.concentrations,
      anvisa: pres.find((p) => p.registroAnvisa)?.registroAnvisa,
    };
  });
}

/** Deriva a evidência científica: prioriza a diretriz sourced da própria molécula (RM-25 references[]); usa a diretriz da classe (âncora) como atribuição de fallback — a mesma diretriz recomenda a classe como um todo, não apenas a molécula-exemplo. */
function buildEvidencia(entity: DrugEntity, fallback: ScientificReference): ScientificReference {
  const guidelines = entity.references.filter((r) => r.type === 'GUIDELINE').map((r) => r.value);
  const evidenciaRef = entity.references.find((r) => r.type === 'EVIDENCIA');
  if (guidelines.length === 0) return fallback;

  let nivel: 'A' | 'B' | 'C' | 'D' = fallback.nivel_evidencia.nivel;
  let grau: 'I' | 'IIa' | 'IIb' | 'III' = fallback.nivel_evidencia.grau;
  if (evidenciaRef) {
    const m = evidenciaRef.value.match(/Nível\s*([ABCD])/i);
    const g = evidenciaRef.value.match(/Classe\s*(I{1,3}a?|IIb)/i);
    if (m) nivel = m[1].toUpperCase() as typeof nivel;
    if (g) grau = g[1] as typeof grau;
  }
  const anoMatch = guidelines[0].match(/\b(19|20)\d{2}\b/);
  const ano = anoMatch ? Number(anoMatch[0]) : fallback.ano;
  return {
    diretriz: guidelines.join(' · '),
    sociedade: fallback.sociedade,
    ano,
    nivel_evidencia: { nivel, grau, descricao: evidenciaRef?.value ?? fallback.nivel_evidencia.descricao },
    citacao: guidelines[0],
  };
}

function buildSuggestion(
  entity: DrugEntity,
  classKey: string,
  anchor: TherapeuticSuggestion,
  siblingNames: string[],
): TherapeuticSuggestion {
  const label = CLASS_LABELS[classKey] ?? classKey;
  return {
    id: entity.legacyId,
    classe_terapeutica: label,
    molecula: entity.activeIngredient.name,
    nome_generico: entity.activeIngredient.fullName ?? entity.activeIngredient.name,
    indicacao:
      entity.indications[0]
        ? `${entity.indications[0]} — alternativa de mesma classe (${label}) a ${anchor.molecula}`
        : `Molécula da classe ${label}, elegível conforme diretriz — alternativa a ${anchor.molecula}`,
    dose: buildDose(entity),
    posologia_completa: buildPosologiaCompleta(entity),
    evidencia: buildEvidencia(entity, anchor.evidencia),
    contraindicacoes: entity.contraindications,
    efeitos_adversos: entity.alerts,
    monitoramento: [],
    alternativas: siblingNames.filter((n) => n !== entity.activeIngredient.name),
    marcas: buildBrands(entity),
  };
}

// ─── 6) Função principal — expande o plano sem remover nada ──────────────────

export interface ExpansionResult {
  plan: TherapeuticPlan;
  added: string[];
  excluded: ExcludedOption[];
}

/**
 * Expande `plan.farmacologico` com moléculas elegíveis adicionais das MESMAS
 * classes terapêuticas já citadas no protocolo da condição — sem remover
 * nenhuma sugestão existente (âncoras permanecem primeiro, por prioridade
 * clínica curada).
 */
export function expandTherapeuticPlan(
  plan: TherapeuticPlan,
  conditionId: string,
  ctx?: EligibilityContext,
): ExpansionResult {
  const classKeys = CONDITION_CLASS_KEYS[conditionId];
  if (!classKeys || classKeys.length === 0) {
    return { plan, added: [], excluded: [] };
  }

  // Dedup por molecule_id canônico (RM-00, salt-agnóstico) — evita duplicar a
  // mesma molécula quando a âncora e a base canônica usam grafias/sais
  // diferentes (ex.: "Levotiroxina Sódica" vs "Levotiroxina").
  const already = new Set(plan.farmacologico.map((s) => toMoleculeId(s.molecula)));
  const anchorByClass = new Map<string, TherapeuticSuggestion>();
  for (const sug of plan.farmacologico) {
    const key = classKeyOf(sug.classe_terapeutica) ?? classKeys.find((k) => normalize(sug.classe_terapeutica).includes(normalize(CLASS_LABELS[k] ?? k)));
    if (key && !anchorByClass.has(key)) anchorByClass.set(key, sug);
  }
  // Âncora de evidência padrão (primeira sugestão do protocolo) para classes sem âncora própria.
  const defaultAnchor = plan.farmacologico[0];

  const added: TherapeuticSuggestion[] = [];
  const excluded: ExcludedOption[] = [];
  const all = drugRepository.getAll();

  for (const classKey of classKeys) {
    const candidates = all.filter((e) => classKeyOf(e.therapeuticClass) === classKey);
    const siblingNames = candidates.map((c) => c.activeIngredient.name);
    for (const entity of candidates) {
      const molId = toMoleculeId(entity.activeIngredient.name);
      if (already.has(molId)) continue; // já é uma sugestão existente (âncora)
      already.add(molId);

      if (!entityCoversCondition(entity, conditionId)) {
        excluded.push({
          molecula: entity.activeIngredient.name,
          classe_terapeutica: CLASS_LABELS[classKey] ?? classKey,
          motivo: 'Indicação própria da molécula (base canônica) não cobre esta condição',
        });
        continue;
      }

      const elig = isEligible(entity, ctx);
      if (!elig.eligible) {
        excluded.push({ molecula: entity.activeIngredient.name, classe_terapeutica: CLASS_LABELS[classKey] ?? classKey, motivo: elig.reason! });
        continue;
      }

      const anchor = anchorByClass.get(classKey) ?? defaultAnchor;
      added.push(buildSuggestion(entity, classKey, anchor, siblingNames));
    }
  }

  return {
    plan: { ...plan, farmacologico: [...plan.farmacologico, ...added] },
    added: added.map((s) => s.molecula),
    excluded,
  };
}
