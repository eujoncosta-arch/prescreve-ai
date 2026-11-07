// ============================================================
// PRESCREVE-AI — Motor de Verificação de Segurança Rápida
// Interações, duplicidade, contraindicações, limites de dose
// ============================================================

// RM-06: consome exclusivamente a Single Source of Truth (Drug Repository Layer),
// sem importar as bases legadas. A forma `SafeDrug` adapta a DrugEntity canônica
// aos campos usados por este motor, preservando o algoritmo original 1:1.
import { drugRepository } from './pharma-core';
import type { DrugEntity, InteractionSeverity } from './pharma-core';
import { categoriaNaoMolecular, normalizarTermo, sinonimoValidado, type CategoriaTermoNaoMolecular } from './synonym-governance';
import { avaliarCoberturaContextual, coberturaContextualNaoAvaliada, derivarIdoso, ROTULO_CAMPO, type CoberturaContextual } from './safety-context';
import { alergiasNaoAvaliadas, avaliarAlergias, estadoContextoDeAlergias, type AlergiasInput, type AlertaAlergia, type AvaliacaoAlergias, type ItemPrescritoAlergia, type SubstanciaResolvida } from './safety-allergy';
import { alvoDe, entradaAciona, normalizarAlvo } from './safety-targets';
import { montarDetalheAvaliacao, montarLimitacoes, type DetalheAvaliacao, type LimitacaoConhecida } from './safety-limitations';
import { correspondenciaDoAlvo, PRIORIDADE_CORRESPONDENCIA, resolverAlvoInteracao, type TipoCorrespondencia } from './interaction-targets';
import { classificarInteracao, metadadosDaInteracao, resumoVazio, type ClassificacaoInteracao, type RegistroInteracaoAvaliada, type ResumoInteracoes, type StatusValidacaoInteracao } from './interaction-contract';

export type AlertSeverityFast = 'info' | 'warning' | 'danger' | 'critical';

/** Versão do contrato de avaliação de segurança (registrada no resultado e no anexo técnico). */
export const SAFETY_CONTRACT_VERSION = 'RM-105.2';

/** Antagonistas de aldosterona: exigem K+ (regra 7a). Compartilhado com a cobertura contextual. */
export const ARM_MOLECULES = ['espironolactona', 'eplerenona', 'finerenona'];

/** Projeção mínima da DrugEntity usada pelo motor de segurança. */
interface SafeDrug {
  id: string;
  molecula: string;
  classe: string;
  sinonimos: string[];
  interacoes_importantes: { com: string; severidade: InteractionSeverity; descricao: string }[];
  uso_gestante: string;
  uso_lactante: string;
  alertas_especiais: string[];
  ajuste_renal?: { tfg_lt_15: string; tfg_30_15: string };
}

function toSafeDrug(e: DrugEntity): SafeDrug {
  const renal = e.dosageRules.find((r) => r.population === 'renal');
  return {
    id: e.id,
    molecula: e.activeIngredient.name,
    classe: e.therapeuticClass,
    sinonimos: e.activeIngredient.sinonimos ?? [],
    interacoes_importantes: e.interactions.map((i) => ({
      com: i.with,
      severidade: i.severity,
      descricao: i.description,
    })),
    uso_gestante: e.pregnancy,
    uso_lactante: e.lactation,
    alertas_especiais: e.alerts,
    ajuste_renal: renal?.detail
      ? {
          tfg_lt_15: String(renal.detail.tfg_lt_15 ?? ''),
          tfg_30_15: String(renal.detail.tfg_30_15 ?? ''),
        }
      : undefined,
  };
}

/**
 * Remove acentos/diacríticos para comparação tolerante a variação de
 * digitação (ex.: "litio" vs "lítio"). Nunca usado para exibição — só para
 * decidir se dois tokens se referem à mesma substância.
 */
const COMBINING_DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g');
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(COMBINING_DIACRITICS_RE, '');
}

export type IdentificacaoMolecula =
  | 'id_explicito'                    // entidade escolhida por ID na prescrição (RM-105.1)
  | 'nome_ativo'                      // igual ao nome ativo (ou nome completo) cadastrado
  | 'sinonimo_validado'               // sinônimo farmacológico/sigla inequívoca (auditoria RM-105)
  | 'nome_comercial_verificado'       // marca cadastrada com dados de fonte oficial
  | 'nome_comercial_nao_verificado'   // marca cadastrada SEM verificação de fonte
  | 'sinonimo_nao_validado';          // sinônimo cadastrado, sem validação (pode ser sigla, marca ou contexto)

/** Como a entidade foi selecionada: pelo ID da prescrição, por nome que casa com UMA só entidade, ou pela primeira de várias (não confirmada). */
export type SelecaoEntidade = 'id_explicito' | 'nome_unico' | 'primeira_correspondencia_sem_id';

/** Por que a identidade não está confirmada (só quando `ambigua`). */
export type MotivoAmbiguidade = 'moleculas_diferentes' | 'variantes_sem_id' | 'id_diverge_do_texto';

type ResolucaoEntrada =
  | {
      tipo: 'molecula';
      /** Entidade usada: a do ID explícito; sem ID, a única correspondência ou (não confirmada) a primeira. */
      drug: SafeDrug;
      via: 'nome' | 'sinonimo';
      /** Identidade NÃO confirmada: moléculas diferentes, variantes sem ID ou ID que diverge do texto. */
      ambigua: boolean;
      motivo_ambiguidade?: MotivoAmbiguidade;
      candidatos: string[];
      /** IDs de todas as entidades que o texto casa (sem ID) ou só a do ID. */
      entidades_candidatas: string[];
      selecao: SelecaoEntidade;
      identificacao: IdentificacaoMolecula;
      composicao: 'monofarmaco' | 'combinacao';
      contexto?: string;
      /** Outras entidades com o MESMO nome ativo (variantes de contexto/apresentação) — nunca substituem a escolhida. */
      variantes: string[];
    }
  | { tipo: 'termo_nao_molecular'; categoria: CategoriaTermoNaoMolecular }
  | { tipo: 'id_nao_encontrado' }
  | { tipo: 'nao_reconhecida' };

function ehCombinacao(nome: string): boolean {
  return /\+/.test(nome) || /\s\/\s/.test(nome);
}

function rotuloEntidade(x: DrugEntity): string {
  return x.clinicalContext ? x.activeIngredient.name + ' (' + x.clinicalContext + ') [' + x.id + ']' : x.activeIngredient.name + ' [' + x.id + ']';
}

/**
 * Resolve uma entrada via repositório canônico. Correspondência EXATA (sem aproximação).
 * RM-105.1: com `entidadeId`, o ID PREVALECE — nunca troca por outra variante do mesmo princípio ativo
 * e nunca volta a resolver pelo nome (ID inexistente = não verificado). Sem ID, só uma correspondência
 * única confirma a identidade; várias entidades (variantes ou moléculas diferentes) = identidade NÃO
 * confirmada, sem escolher silenciosamente a primeira. Classe/indicação/sintoma não identificam molécula.
 */
function resolverEntrada(m: string, entidadeId?: string | null): ResolucaoEntrada {
  const target = m.toLowerCase().trim();
  const todos = drugRepository.getAll();
  const nomeNorm = (x: DrugEntity) => stripAccents(x.activeIngredient.name.toLowerCase().trim());

  if (typeof entidadeId === 'string' && entidadeId !== '') {
    const x = todos.find((e) => e.id === entidadeId);
    if (!x) return { tipo: 'id_nao_encontrado' };
    const porNome = x.activeIngredient.name.toLowerCase() === target || x.activeIngredient.fullName?.toLowerCase() === target;
    const termo = normalizarTermo(m);
    const confere =
      porNome ||
      (x.activeIngredient.sinonimos ?? []).some((sn) => sn.toLowerCase() === target) ||
      (x.brands ?? []).some((b) => normalizarTermo(b.name) === termo);
    return {
      tipo: 'molecula',
      drug: toSafeDrug(x),
      via: porNome ? 'nome' : 'sinonimo',
      ambigua: !confere,
      motivo_ambiguidade: confere ? undefined : 'id_diverge_do_texto',
      candidatos: confere ? [] : [rotuloEntidade(x), m],
      entidades_candidatas: [x.id],
      selecao: 'id_explicito',
      identificacao: 'id_explicito',
      composicao: ehCombinacao(x.activeIngredient.name) ? 'combinacao' : 'monofarmaco',
      contexto: x.clinicalContext,
      variantes: todos.filter((e) => e.id !== x.id && nomeNorm(e) === nomeNorm(x)).map((e) => e.id),
    };
  }

  const categoria = categoriaNaoMolecular(m);
  if (categoria) {
    const ehNomeDeMolecula = todos.some(
      (x) => x.activeIngredient.name.toLowerCase() === target || x.activeIngredient.fullName?.toLowerCase() === target,
    );
    if (!ehNomeDeMolecula) return { tipo: 'termo_nao_molecular', categoria };
  }

  const casam = todos.filter(
    (x) =>
      x.activeIngredient.name.toLowerCase() === target ||
      x.activeIngredient.fullName?.toLowerCase() === target ||
      (x.activeIngredient.sinonimos ?? []).some((sn) => sn.toLowerCase() === target),
  );
  if (casam.length === 0) return { tipo: 'nao_reconhecida' };

  const primeira = casam[0];
  const nomes = new Map<string, string>();
  for (const x of casam) nomes.set(nomeNorm(x), x.activeIngredient.name);
  const porNome = primeira.activeIngredient.name.toLowerCase() === target || primeira.activeIngredient.fullName?.toLowerCase() === target;

  let identificacao: IdentificacaoMolecula;
  if (porNome) {
    identificacao = 'nome_ativo';
  } else if (casam.some((x) => sinonimoValidado(x.id, m))) {
    identificacao = 'sinonimo_validado';
  } else {
    const termo = normalizarTermo(m);
    const marca = casam.flatMap((x) => x.brands ?? []).find((b) => normalizarTermo(b.name) === termo);
    identificacao = marca ? (marca.verified ? 'nome_comercial_verificado' : 'nome_comercial_nao_verificado') : 'sinonimo_nao_validado';
  }

  const moleculasDiferentes = nomes.size > 1;
  const variantesSemId = !moleculasDiferentes && casam.length > 1;
  return {
    tipo: 'molecula',
    drug: toSafeDrug(primeira),
    via: porNome ? 'nome' : 'sinonimo',
    ambigua: moleculasDiferentes || variantesSemId,
    motivo_ambiguidade: moleculasDiferentes ? 'moleculas_diferentes' : variantesSemId ? 'variantes_sem_id' : undefined,
    candidatos: moleculasDiferentes ? [...nomes.values()] : variantesSemId ? casam.map(rotuloEntidade) : [],
    entidades_candidatas: casam.map((x) => x.id),
    selecao: casam.length === 1 ? 'nome_unico' : 'primeira_correspondencia_sem_id',
    identificacao,
    composicao: ehCombinacao(primeira.activeIngredient.name) ? 'combinacao' : 'monofarmaco',
    contexto: primeira.clinicalContext,
    variantes: casam.slice(1).filter((x) => nomeNorm(x) === nomeNorm(primeira)).map((x) => x.id),
  };
}

export interface QuickSafetyAlert {
  id: string;
  tipo: 'interacao' | 'duplicidade' | 'contraind' | 'gestante' | 'lactante' | 'geriatria' | 'dose' | 'renal' | 'alergia';
  severidade: AlertSeverityFast;
  titulo: string;
  descricao: string;
  acao: string;
}

export interface SafetyCheckInput {
  moleculas: string[];
  /**
   * RM-105.1: ID da entidade farmacológica de cada item (mesma ordem de `moleculas`). Prevalece sobre o nome.
   * Item sem ID (undefined/null) = prescrição antiga: identidade só confirmada se o nome casar com UMA entidade.
   */
  entidade_ids?: Array<string | null | undefined>;
  gestante?: boolean;
  lactante?: boolean;
  idoso?: boolean; // > 65 anos
  crclValue?: number;
  potassiumLevel?: number; // K+ sérico em mEq/L — necessário para verificar risco ARM
  /**
   * RM-105.2: alergias com estado explícito. Ausente/undefined = NÃO informado (nunca "sem alergias").
   */
  alergias?: AlergiasInput;
  /** RM-105.2.2: idade com UNIDADE explícita (dias | meses | anos). Valor sem unidade NÃO é interpretado. Tem prioridade sobre `idade_anos`. */
  idade?: { valor: number; unidade: 'dias' | 'meses' | 'anos' };
  /** Formato legado (RM-105.2): idade em anos como número. Mantido por compatibilidade; prefira `idade`. */
  idade_anos?: number;
  /** RM-105.2: peso em kg (só validação de coerência; não usado pelas regras de segurança). */
  peso_kg?: number;
  /** RM-105.2: sexo, só para validar coerência com gestação/lactação. */
  sexo?: 'M' | 'F';
}

/** Entrada da prescrição após a resolução: o texto informado e, se reconhecida, a entidade (por ID ou nome). */
interface EntradaResolvida {
  texto: string;
  drug?: SafeDrug;
}

/**
 * RM-104: corpo original de `runSafetyCheck`, preservado 1:1. Recebe as moléculas
 * JÁ resolvidas (`drugs`, só as reconhecidas) e os textos de entrada válidos
 * (`moleculas`, incluindo os não reconhecidos — as regras fixas por texto bruto
 * continuam valendo para eles). Nunca decide sozinho se a verificação foi completa:
 * isso é responsabilidade de `runSafetyCheck`.
 */
interface MetaInteracao {
  a_id: string; b_id: string; alvo: string; tipo: TipoCorrespondencia; gravidade: 'leve' | 'moderada' | 'grave' | 'contraindicado';
  divergencia?: { a_para_b: string; b_para_a: string };
}

const SEV_RANK = { contraindicado: 3, grave: 2, moderada: 1, leve: 0 } as const;

/**
 * RM-106: interação cadastrada de `de` cujo ALVO (campo `with`) reconhece `para` por critério EXPLÍCITO
 * (molécula, componente, sinônimo, classe/grupo controlado — nunca por fragmento de texto). Entre várias
 * interações que reconhecem o mesmo medicamento vale a MAIS GRAVE; empate: a correspondência mais forte.
 */
function melhorInteracao(de: SafeDrug, para: SafeDrug): { inter: SafeDrug['interacoes_importantes'][number]; tipo: TipoCorrespondencia } | null {
  let melhor: { inter: SafeDrug['interacoes_importantes'][number]; tipo: TipoCorrespondencia } | null = null;
  for (const inter of de.interacoes_importantes) {
    const tipo = correspondenciaDoAlvo(resolverAlvoInteracao(inter.com), para.id);
    if (!tipo) continue;
    if (!melhor || SEV_RANK[inter.severidade] > SEV_RANK[melhor.inter.severidade]
      || (SEV_RANK[inter.severidade] === SEV_RANK[melhor.inter.severidade] && PRIORIDADE_CORRESPONDENCIA[tipo] < PRIORIDADE_CORRESPONDENCIA[melhor.tipo])) melhor = { inter, tipo };
  }
  return melhor;
}

function coletarAlertas(input: SafetyCheckInput, entradas: EntradaResolvida[]): { alerts: QuickSafetyAlert[]; interMeta: Map<string, MetaInteracao> } {
  const alerts: QuickSafetyAlert[] = [];
  const drugs: SafeDrug[] = entradas.flatMap((e) => (e.drug ? [e.drug] : []));
  /** alerta de interação da base -> ids das duas entidades (para deduplicar sem comparar texto). */
  const interPares = new Map<string, [string, string]>();
  const interMeta = new Map<string, MetaInteracao>();
  const { gestante, lactante, idoso, crclValue, potassiumLevel } = input;

  // ── 1. Interações medicamentosas (RM-106: alvo resolvido de forma explícita; sem substring) ──
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const a = drugs[i];
      const b = drugs[j];
      const ab = melhorInteracao(a, b);
      const ba = melhorInteracao(b, a);
      if (!ab && !ba) continue;
      // uma alerta por par: a direção mais grave (empate: A→B); a divergência entre as direções fica registrada
      const usarBA = !!ba && (!ab
        || SEV_RANK[ba.inter.severidade] > SEV_RANK[ab.inter.severidade]
        || (SEV_RANK[ba.inter.severidade] === SEV_RANK[ab.inter.severidade] && PRIORIDADE_CORRESPONDENCIA[ba.tipo] < PRIORIDADE_CORRESPONDENCIA[ab.tipo]));
      const de = usarBA ? b : a;
      const para = usarBA ? a : b;
      const sel = (usarBA ? ba : ab)!;
      const sev: AlertSeverityFast =
        sel.inter.severidade === 'contraindicado' ? 'critical' :
        sel.inter.severidade === 'grave' ? 'danger' :
        sel.inter.severidade === 'moderada' ? 'warning' : 'info';
      const id = `inter-${de.id}-${para.id}`;
      interPares.set(id, [de.id, para.id]);
      interMeta.set(id, {
        a_id: de.id, b_id: para.id, alvo: sel.inter.com, tipo: sel.tipo, gravidade: sel.inter.severidade,
        ...(ab && ba && ab.inter.severidade !== ba.inter.severidade ? { divergencia: { a_para_b: ab.inter.severidade, b_para_a: ba.inter.severidade } } : {}),
      });
      alerts.push({
        id,
        tipo: 'interacao',
        severidade: sev,
        titulo: `Interação: ${de.molecula} + ${para.molecula}`,
        descricao: sel.inter.descricao,
        acao: !usarBA
          ? (sel.inter.severidade === 'contraindicado'
            ? 'Combinação CONTRAINDICADA — substituir um dos medicamentos'
            : sel.inter.severidade === 'grave'
            ? 'Avaliar necessidade de substituição ou monitoramento rigoroso'
            : 'Monitorar clinicamente e laboratorialmente')
          : (sel.inter.severidade === 'contraindicado' ? 'Combinação CONTRAINDICADA' : 'Monitorar'),
      });
    }
  }

  // ── 2. Duplicidade de classe terapêutica ─────────────────
  const classCounts: Record<string, string[]> = {};
  for (const d of drugs) {
    const key = d.classe;
    if (!classCounts[key]) classCounts[key] = [];
    classCounts[key].push(d.molecula);
  }
  for (const [classe, mols] of Object.entries(classCounts)) {
    if (mols.length > 1) {
      alerts.push({
        id: `dup-${classe}`,
        tipo: 'duplicidade',
        severidade: 'warning',
        titulo: `Duplicidade terapêutica: ${classe}`,
        descricao: `${mols.join(' e ')} pertencem à mesma classe (${classe}).`,
        acao: 'Verificar se duplicidade é intencional. Geralmente apenas uma molécula da mesma classe deve ser prescrita.',
      });
    }
  }

  // ── 3. Contraindicações em gestante ──────────────────────
  if (gestante) {
    for (const d of drugs) {
      if (d.uso_gestante === 'contraindicado') {
        alerts.push({
          id: `gest-${d.id}`,
          tipo: 'gestante',
          severidade: 'critical',
          titulo: `Contraindicado na gestação: ${d.molecula}`,
          descricao: `${d.molecula} está contraindicado durante a gestação.`,
          acao: 'Substituir por alternativa segura na gestação. Consultar obstetra.',
        });
      } else if (d.uso_gestante === 'risco') {
        alerts.push({
          id: `gest-risco-${d.id}`,
          tipo: 'gestante',
          severidade: 'danger',
          titulo: `Risco na gestação: ${d.molecula}`,
          descricao: `${d.molecula} apresenta risco potencial na gestação.`,
          acao: 'Usar apenas se benefício superar o risco. Documentar decisão.',
        });
      }
    }
  }

  // ── 4. Contraindicações em lactante ──────────────────────
  if (lactante) {
    for (const d of drugs) {
      if (d.uso_lactante === 'contraindicado') {
        alerts.push({
          id: `lact-${d.id}`,
          tipo: 'lactante',
          severidade: 'danger',
          titulo: `Risco na amamentação: ${d.molecula}`,
          descricao: `${d.molecula} não é recomendado durante a amamentação.`,
          acao: 'Considerar suspender amamentação ou substituir o medicamento.',
        });
      }
    }
  }

  // ── 5. Alertas geriátricos ────────────────────────────────
  if (idoso) {
    for (const d of drugs) {
      const beerAlert = d.alertas_especiais.find(a =>
        a.toLowerCase().includes('beers') || a.toLowerCase().includes('idoso') || a.toLowerCase().includes('queda')
      );
      if (beerAlert) {
        alerts.push({
          id: `geri-${d.id}`,
          tipo: 'geriatria',
          severidade: 'warning',
          titulo: `Alerta geriátrico: ${d.molecula}`,
          descricao: beerAlert,
          acao: 'Avaliar necessidade. Se mantido, iniciar com doses menores e monitorar.',
        });
      }
    }
  }

  // ── 6. Alertas renais ─────────────────────────────────────
  if (crclValue !== undefined) {
    for (const d of drugs) {
      if (!d.ajuste_renal) continue;
      const { tfg_lt_15, tfg_30_15 } = d.ajuste_renal;

      if (crclValue < 15 && tfg_lt_15.toLowerCase().includes('contraindicad')) {
        alerts.push({
          id: `renal-${d.id}`,
          tipo: 'renal',
          severidade: 'critical',
          titulo: `Contraindicado na insuficiência renal grave: ${d.molecula}`,
          descricao: `TFG estimada: ${crclValue} mL/min. ${d.molecula}: ${tfg_lt_15}`,
          acao: 'Substituir medicamento ou aguardar melhora da função renal.',
        });
      } else if (crclValue < 30 && (tfg_30_15.toLowerCase().includes('contraindicad') || tfg_30_15.toLowerCase().includes('evitar'))) {
        alerts.push({
          id: `renal-${d.id}`,
          tipo: 'renal',
          severidade: 'danger',
          titulo: `Ajuste renal necessário: ${d.molecula}`,
          descricao: `TFG estimada: ${crclValue} mL/min. Recomendação: ${tfg_30_15}`,
          acao: 'Ajustar dose ou frequência conforme função renal.',
        });
      }
    }
  }

  // ── 7a. K+ pré-requisito ARM (KDIGO 2024 / ESC 2023) ─────────
  // Espironolactona/eplerenona exigem K+ ≤ 5,0 mEq/L antes do início
  const usaARM = entradas.some(e => entradaAciona(alvoDe('arm'), e));
  if (usaARM) {
    if (potassiumLevel === undefined) {
      alerts.push({
        id: 'arm-k-nao-informado',
        tipo: 'contraind',
        severidade: 'warning',
        titulo: 'ARM prescrito — verificar K+ sérico antes do início',
        descricao: 'Antagonistas do receptor mineralocorticoide (ARM) requerem K+ sérico ≤ 5,0 mEq/L antes do início (KDIGO 2024 / ESC 2023). Hipercalemia é a principal complicação.',
        acao: 'Solicitar K+ sérico e creatinina antes de iniciar ARM. Suspender se K+ > 5,5 mEq/L.',
      });
    } else if (potassiumLevel > 5.0 && crclValue !== undefined && crclValue < 45) {
      alerts.push({
        id: 'arm-hipercalemia-tfg-baixa',
        tipo: 'contraind',
        severidade: 'critical',
        titulo: `ARM CONTRAINDICADO — K+ ${potassiumLevel} mEq/L + TFG < 45 mL/min`,
        descricao: `K+ sérico elevado (${potassiumLevel} mEq/L) associado a TFG reduzida (${crclValue} mL/min). ARM nessa combinação apresenta risco elevado de hipercalemia grave e arritmia fatal (RALES/EMPHASIS-HF excluíram TFG < 30 e K+ > 5,0).`,
        acao: 'CONTRAINDICADO. Corrigir hipercalemia antes de iniciar ARM. Considerar patirômer ou resina de troca. Reavalie quando K+ < 5,0 mEq/L.',
      });
    } else if (potassiumLevel > 5.0) {
      alerts.push({
        id: 'arm-hipercalemia',
        tipo: 'contraind',
        severidade: 'danger',
        titulo: `ARM com K+ elevado — ${potassiumLevel} mEq/L`,
        descricao: `K+ > 5,0 mEq/L contraindica início de ARM (espironolactona/eplerenona). Risco de hipercalemia grave e arritmia ventricular.`,
        acao: 'Suspender ou não iniciar ARM. Corrigir hipercalemia. Reavalie quando K+ ≤ 5,0 mEq/L.',
      });
    }
  }

  // ── 7b. Montelucaste — alerta FDA 2020 (depressão/ideação suicida) ─
  const usaMontelucaste = entradas.some(e => entradaAciona(alvoDe('montelucaste'), e));
  if (usaMontelucaste) {
    alerts.push({
      id: 'montelucaste-saude-mental',
      tipo: 'contraind',
      severidade: 'warning',
      titulo: 'Montelucaste — Alerta FDA 2020: Risco neuropsiquiátrico (Black Box)',
      descricao: 'FDA adicionou Black Box Warning em março/2020: montelucaste associado a agitação, agressividade, pesadelos, depressão, ideação suicida e suicídio consumado em adultos, adolescentes e crianças. Risco persiste mesmo após descontinuação.',
      acao: 'Informar paciente/responsável sobre sintomas neuropsiquiátricos. Reservar montelucaste para pacientes sem resposta ou contraindicação a ICS. Descontinuar imediatamente se sintomas psiquiátricos aparecerem.',
    });
  }

  // ── 7. Interações críticas conhecidas (pares hardcoded de alta relevância clínica) ──
  const CRITICAL_PAIRS: Array<{
    mol_a: string; mol_b: string;
    severidade: AlertSeverityFast;
    titulo: string; descricao: string; acao: string;
  }> = [
    // Nefrotoxicidade triple whammy
    {
      mol_a: 'ieca', mol_b: 'aine',
      severidade: 'danger',
      titulo: 'IECA + AINE — Risco nefrotóxico',
      descricao: 'Combinação reduz TFG e aumenta risco de IRA, especialmente em idosos ou desidratados.',
      acao: 'Monitorar creatinina e pressão. Preferir paracetamol como analgésico.',
    },
    {
      mol_a: 'bra', mol_b: 'aine',
      severidade: 'danger',
      titulo: 'BRA + AINE — Risco nefrotóxico',
      descricao: 'BRA + AINE reduz TFG e aumenta potássio sérico.',
      acao: 'Monitorar função renal e eletrólitos. Preferir paracetamol.',
    },
    // Hipercalemia
    {
      mol_a: 'ieca', mol_b: 'espironolactona',
      severidade: 'warning',
      titulo: 'IECA + Espironolactona — Hipercalemia',
      descricao: 'Associação aumenta potássio. Indicada na IC-FEr com monitoramento.',
      acao: 'Monitorar K+ e creatinina a cada 1-3 meses. Suspender se K+ > 5,5 mEq/L.',
    },
    // QT prolongamento
    {
      mol_a: 'azitromicina', mol_b: 'amiodarona',
      severidade: 'critical',
      titulo: 'Azitromicina + Amiodarona — QT prolongado',
      descricao: 'Combinação prolonga intervalo QT com risco de torsades de pointes.',
      acao: 'EVITAR combinação. Substituir azitromicina por amoxicilina ou doxiciclina.',
    },
    {
      mol_a: 'azitromicina', mol_b: 'haloperidol',
      severidade: 'danger',
      titulo: 'Azitromicina + Haloperidol — QT prolongado',
      descricao: 'Ambos prolongam QT — risco aditivo de arritmia.',
      acao: 'Monitorar ECG. Preferir alternativa ao macrolídeo.',
    },
    {
      mol_a: 'hidroxicloroquina', mol_b: 'azitromicina',
      severidade: 'danger',
      titulo: 'Hidroxicloroquina + Azitromicina — QT prolongado',
      descricao: 'Associação de dois agentes que prolongam QT. Risco de arritmia grave.',
      acao: 'Monitorar ECG. Considerar alternativa ao macrolídeo.',
    },
    // Síndrome serotoninérgica
    {
      mol_a: 'isrs', mol_b: 'tramadol',
      severidade: 'danger',
      titulo: 'ISRS + Tramadol — Síndrome serotoninérgica',
      descricao: 'Tramadol inibe recaptação de serotonina — risco de síndrome serotoninérgica com ISRS.',
      acao: 'Evitar associação. Preferir dipirona, paracetamol ou opioides sem atividade serotoninérgica.',
    },
    {
      mol_a: 'sertralina', mol_b: 'tramadol',
      severidade: 'danger',
      titulo: 'Sertralina + Tramadol — Síndrome serotoninérgica',
      descricao: 'Combinação aumenta serotonina sináptica — risco de síndrome serotoninérgica.',
      acao: 'Evitar. Usar paracetamol ou dipirona para analgesia.',
    },
    {
      mol_a: 'escitalopram', mol_b: 'tramadol',
      severidade: 'danger',
      titulo: 'Escitalopram + Tramadol — Síndrome serotoninérgica',
      descricao: 'Risco de síndrome serotoninérgica por mecanismo aditivo.',
      acao: 'Evitar. Usar analgésico sem atividade serotoninérgica.',
    },
    // Metformina + contraste
    {
      mol_a: 'metformina', mol_b: 'contraste',
      severidade: 'warning',
      titulo: 'Metformina + Contraste iodado — Risco de acidose lática',
      descricao: 'Contraste iodado pode causar IRA transitória acumulando metformina e risco de acidose lática.',
      acao: 'Suspender metformina 48h antes de procedimentos com contraste e reiniciar após confirmação de função renal normal.',
    },
    // Lítio + tiazídico
    {
      mol_a: 'litio', mol_b: 'hidroclorotiazida',
      severidade: 'critical',
      titulo: 'Lítio + Hidroclorotiazida — Toxicidade por lítio',
      descricao: 'Tiazídicos reduzem excreção renal de lítio, elevando litemia a níveis tóxicos.',
      acao: 'CONTRAINDICADO. Substituir diurético tiazídico por alternativa (furosemida com cautela).',
    },
    // Varfarina + AINEs
    {
      mol_a: 'varfarina', mol_b: 'aine',
      severidade: 'critical',
      titulo: 'Varfarina + AINE — Risco hemorrágico grave',
      descricao: 'AINEs inibem plaquetas e deslocam varfarina da albumina — potencializa anticoagulação e risco GI.',
      acao: 'EVITAR. Usar paracetamol como analgésico. Monitorar INR se necessário.',
    },
    // Corticoide + AINEs
    {
      mol_a: 'prednisolona', mol_b: 'aine',
      severidade: 'warning',
      titulo: 'Corticoide + AINE — Risco gastrointestinal',
      descricao: 'Associação aumenta risco de úlcera péptica e sangramento GI.',
      acao: 'Adicionar proteção gástrica (IBP). Evitar combinação quando possível.',
    },
    // Fluoroquinolona + QT
    {
      mol_a: 'moxifloxacino', mol_b: 'amiodarona',
      severidade: 'critical',
      titulo: 'Moxifloxacino + Amiodarona — QT crítico',
      descricao: 'Moxifloxacino já prolonga QT sozinho — combinação com amiodarona é de alto risco.',
      acao: 'CONTRAINDICADO. Substituir moxifloxacino por levofloxacino ou outro antibiótico.',
    },
    // Duplo bloqueio SRAA
    {
      mol_a: 'ieca', mol_b: 'bra',
      severidade: 'critical',
      titulo: 'IECA + BRA — Duplo bloqueio SRAA contraindicado',
      descricao: 'Combinação aumenta risco de hipercalemia, hipotensão e IRA sem benefício adicional.',
      acao: 'CONTRAINDICADO conforme diretrizes. Usar apenas um dos dois.',
    },
    // IMAO + ISRS — Síndrome serotoninérgica fatal
    {
      mol_a: 'imao', mol_b: 'isrs',
      severidade: 'critical',
      titulo: 'IMAO + ISRS — Síndrome serotoninérgica potencialmente fatal',
      descricao: 'A combinação de inibidores da MAO com ISRS provoca acúmulo maciço de serotonina — hipertermia, rigidez, crises autonômicas e morte. Período de washout obrigatório: 14 dias após IMAO; 5 dias após ISRS (exceto fluoxetina: 5 semanas).',
      acao: 'CONTRAINDICADO ABSOLUTO. Respeitar washout de 14 dias. Fluoxetina requer 5 semanas de washout antes de iniciar IMAO.',
    },
    {
      mol_a: 'fenelzina', mol_b: 'sertralina',
      severidade: 'critical',
      titulo: 'IMAO + Sertralina — Síndrome serotoninérgica fatal',
      descricao: 'Mesmo mecanismo IMAO+ISRS. Washout: 14 dias após IMAO, 5 dias após sertralina.',
      acao: 'CONTRAINDICADO ABSOLUTO.',
    },
    {
      mol_a: 'fenelzina', mol_b: 'fluoxetina',
      severidade: 'critical',
      titulo: 'IMAO + Fluoxetina — Síndrome serotoninérgica (washout 5 semanas)',
      descricao: 'Fluoxetina tem meia-vida de ~5 semanas — washout prolongado obrigatório antes de IMAO.',
      acao: 'CONTRAINDICADO. Aguardar 5 semanas após última dose de fluoxetina antes de iniciar IMAO.',
    },
    // Nitrato + inibidor PDE5 — hipotensão grave
    {
      mol_a: 'nitrato', mol_b: 'tadalafila',
      severidade: 'critical',
      titulo: 'Nitrato + Tadalafila — Hipotensão grave potencialmente fatal',
      descricao: 'Sinergismo vasodilatador aditivo — queda brusca de PA com risco de síncope, IAM e morte. Tadalafila tem meia-vida de ~36h; nitrato de resgate também é contraindicado.',
      acao: 'CONTRAINDICADO ABSOLUTO. Intervalo mínimo: 48h após tadalafila antes de nitrato. Em emergência coronariana usar nitroprussiato IV com cautela.',
    },
    {
      mol_a: 'nitrato', mol_b: 'sildenafila',
      severidade: 'critical',
      titulo: 'Nitrato + Sildenafila — Hipotensão grave potencialmente fatal',
      descricao: 'Mesma interação nitrato+iPDE5. Sildenafila meia-vida ~4h; contraindicado nitrato nas 24h seguintes.',
      acao: 'CONTRAINDICADO ABSOLUTO. Intervalo mínimo: 24h após sildenafila antes de nitrato.',
    },
    {
      mol_a: 'nitrato', mol_b: 'vardenafila',
      severidade: 'critical',
      titulo: 'Nitrato + Vardenafila — Hipotensão grave',
      descricao: 'Mesma classe iPDE5. Contraindicado nitrato nas 24h após vardenafila.',
      acao: 'CONTRAINDICADO ABSOLUTO. Intervalo mínimo: 24h.',
    },
    // ARNI + IECA
    {
      mol_a: 'sacubitril', mol_b: 'ieca',
      severidade: 'critical',
      titulo: 'ARNI (Sacubitril/Valsartana) + IECA — Angioedema fatal',
      descricao: 'Sacubitril inibe neprilisina (que degrada bradicinina). Combinação com IECA eleva bradicinina a níveis tóxicos — angioedema de vias aéreas potencialmente fatal.',
      acao: 'CONTRAINDICADO. Washout de 36h após IECA antes de iniciar sacubitril/valsartana. Monitorar via aérea nas primeiras 24h.',
    },
  ];

  const order: Record<AlertSeverityFast, number> = { critical: 0, danger: 1, warning: 2, info: 3 };

  /**
   * BUG REAL CORRIGIDO (auditoria RM-36 — varredura exaustiva de unidades):
   * a checagem original de presença de `pair.mol_a`/`mol_b` só testava o
   * texto bruto digitado (`moleculas`) e o campo `classe` da DrugEntity
   * resolvida — nunca `molecula` (nome canônico) nem `sinonimos`, e sem
   * normalização de acento. Duas consequências reais:
   *   1) "lítio" (nome canônico real, com acento) nunca batia com o token
   *      `mol_a: 'litio'` (sem acento) — o par lítio+hidroclorotiazida
   *      (CONTRAINDICADO, toxicidade por lítio) NUNCA disparava para uma
   *      prescrição real de "Carbonato de Lítio".
   *   2) o token `mol_a: 'nitrato'` não aparece nem no `molecula`
   *      ("Nitroglicerina", "Isossorbida Mononitrato") nem sempre no
   *      `classe` de todo nitrato real — só no `sinonimos`, nunca
   *      consultado. Os 3 pares nitrato+iPDE5 (hipotensão fatal) nunca
   *      disparavam para prescrições reais.
   * Corrigido para normalizar acentos e checar também `molecula`/`sinonimos`.
   */
  /**
   * Resolução CRIT-AUDIT-05 (auditoria RM-36): quando o paciente usa
   * Sertralina + Tramadol, TANTO o par genérico `isrs+tramadol` QUANTO o
   * par específico `sertralina+tramadol` batiam — "isrs" e "sertralina"
   * nunca eram reconhecidos como o MESMO risco clínico (mesma classe
   * terapêutica, uma é o membro da outra), gerando dois alertas para a
   * mesma informação. A checagem anterior de duplicata só comparava texto
   * de alertas já emitidos contra os tokens do NOVO par — "isrs" nunca
   * aparece no título "Sertralina + Tramadol", então nunca era detectado.
   *
   * Corrigido com uma checagem SEMANTICAMENTE CONSCIENTE de classe/membro:
   * para cada token de um par (`mol_a`/`mol_b`), calculamos o CONJUNTO de
   * medicamentos REALMENTE PRESCRITOS que o token identifica (via classe,
   * molécula ou sinônimo — reaproveitando `matchedDrugIds`/`drugs` já
   * resolvidos). Dois pares representam o MESMO risco clínico quando os
   * conjuntos de medicamentos que cada lado identifica SE SOBREPÕEM dos
   * dois lados (ex.: "isrs" e "sertralina" ambos identificam o mesmo
   * Sertralina prescrito; "tramadol" e "tramadol" identificam o mesmo
   * Tramadol) — não por comparação de texto do alerta.
   */
  /**
   * RM-105.1: conjunto de entradas que um alvo declarado reconhece — por IGUALDADE (nome ativo, componente de
   * combinação, classe cadastrada com fronteira) para entidades resolvidas, ou texto exato aprovado para
   * entradas não resolvidas (chave sintética `literal:`). Nenhuma correspondência por trecho de palavra.
   */
  function matchedDrugIds(chave: string): Set<string> {
    const alvo = alvoDe(chave);
    const ids = new Set<string>();
    for (const e of entradas) {
      if (!entradaAciona(alvo, e)) continue;
      ids.add(e.drug ? e.drug.id : `literal:${normalizarAlvo(e.texto)}`);
    }
    return ids;
  }

  /**
   * Um alvo é ESPECÍFICO (molécula nomeada, não classe) quando é do tipo molécula e reconhece ao menos uma
   * entidade resolvida. Alvo de classe, ou reconhecido só por texto não resolvido, nunca é específico.
   */
  function tokenEhEspecifico(chave: string, ids: Set<string>): boolean {
    return alvoDe(chave).tipo === 'molecula' && [...ids].some(id => !id.startsWith('literal:'));
  }

  function intersecta(a: Set<string>, b: Set<string>): boolean {
    for (const x of a) if (b.has(x)) return true;
    return false;
  }

  // Pares CRITICAL_PAIRS já aceitos nesta execução — usado para a
  // deduplicação semântica classe/membro entre pares (CRIT-AUDIT-05).
  // Cada entrada permanece sincronizada com o alerta correspondente em
  // `alerts` (mesmo id) enquanto ele não for substituído/removido.
  const paresAceitos: Array<{
    alertaId: string;
    idsA: Set<string>;
    idsB: Set<string>;
    severidade: AlertSeverityFast;
    especificidade: number; // 0, 1 ou 2 lados específicos (molécula nomeada)
  }> = [];

  for (const pair of CRITICAL_PAIRS) {
    const idsA = matchedDrugIds(pair.mol_a);
    const idsB = matchedDrugIds(pair.mol_b);
    const hasA = idsA.size > 0;
    const hasB = idsB.size > 0;
    if (hasA && hasB) {
      const dupKey = `${pair.mol_a}-${pair.mol_b}`;
      const alertaId = `critical-pair-${dupKey}`;

      // Camada 1 (inalterada): evita duplicatas com interações já
      // encontradas pelo BANCO DE DADOS (seção 1, texto do alerta).
      //
      // BUG REAL CORRIGIDO (auditoria RM-36): a versão anterior, ao achar
      // uma correspondência, simplesmente DESCARTAVA o novo alerta — mesmo
      // quando ele era MAIS GRAVE e mais específico que o já existente.
      // Caso real: azitromicina tem, no banco, uma interação genérica com
      // amiodarona classificada como `grave` (severidade 'danger'); esse
      // alerta nasce PRIMEIRO (seção 1 roda antes da seção 7). Quando o par
      // crítico "Azitromicina + Amiodarona — QT prolongado" (severidade
      // 'critical', ação específica "EVITAR combinação...") era avaliado
      // depois, a checagem de duplicata o via como "já coberto" e o
      // descartava — o médico via só o alerta mais fraco e genérico.
      // Mesma falha para moxifloxacino+amiodarona. Corrigido para
      // SUBSTITUIR o(s) alerta(s) mais fraco(s) pelo mais grave, nunca
      // manter só o mais fraco.
      // RM-105.1/106: por IDs das entidades do alerta da base (não por trecho do id/título). Desde a RM-106 a
      // base também reconhece classes e grupos de forma explícita: o mesmo risco não deve aparecer duas vezes
      // (ex.: "Varfarina + AINE" como regra fixa e como interação cadastrada com a classe AINEs).
      const existentesTexto = alerts.filter(a => {
        const par = interPares.get(a.id);
        if (!par) return false;
        return (idsA.has(par[0]) && idsB.has(par[1])) || (idsA.has(par[1]) && idsB.has(par[0]));
      });

      // Camada 2 (nova — CRIT-AUDIT-05): evita duplicatas com outro par
      // CRITICAL_PAIRS já aceito que identifica o MESMO risco clínico
      // (sobreposição real de medicamentos prescritos nos dois lados —
      // classe vs. membro específico, ex.: isrs+tramadol vs.
      // sertralina+tramadol).
      const existentesSemanticos = paresAceitos.filter(p =>
        (intersecta(p.idsA, idsA) && intersecta(p.idsB, idsB)) ||
        (intersecta(p.idsA, idsB) && intersecta(p.idsB, idsA)),
      );
      const alertasSemanticos = existentesSemanticos
        .map(p => alerts.find(a => a.id === p.alertaId))
        .filter((a): a is QuickSafetyAlert => a !== undefined);

      const existentes = [...existentesTexto, ...alertasSemanticos.filter(a => !existentesTexto.includes(a))];

      const novaEspecificidade = (tokenEhEspecifico(pair.mol_a, idsA) ? 1 : 0) + (tokenEhEspecifico(pair.mol_b, idsB) ? 1 : 0);
      const novoAlerta: QuickSafetyAlert = {
        id: alertaId,
        tipo: 'interacao',
        severidade: pair.severidade,
        titulo: pair.titulo,
        descricao: pair.descricao,
        acao: pair.acao,
      };

      if (existentes.length === 0) {
        alerts.push(novoAlerta);
        paresAceitos.push({ alertaId, idsA, idsB, severidade: pair.severidade, especificidade: novaEspecificidade });
      } else {
        const severidadeMaisGraveExistente = Math.min(...existentes.map(a => order[a.severidade]));
        // Requisito CRIT-AUDIT-05: em severidade IGUAL, o alerta mais
        // ESPECÍFICO (molécula nomeada) prevalece sobre o genérico
        // (classe terapêutica) — nunca o contrário, e nunca um alerta
        // crítico é substituído por um genérico de mesma severidade.
        // RM-106: um alerta da base cujo alvo é molecular (molécula, componente, sinônimo, enumeração) é tão
        // específico quanto um par de moléculas nomeadas (2); com alvo de classe, grupo ou enumeração de grupo, vale 1. Assim a regra
        // genérica (ex.: "ISRS + Tramadol") não substitui nem duplica uma interação específica já cadastrada.
        const especificidadeBase = (alertaId: string): number => {
          const m = interMeta.get(alertaId);
          return m ? (m.tipo === 'classe_farmacologica' || m.tipo === 'grupo_aprovado' || m.tipo === 'enumeracao_explicita' ? 1 : 2) : 0;
        };
        const especificidadePares = Math.max(
          0,
          ...existentesSemanticos.filter(p => alerts.some(a => a.id === p.alertaId)).map(p => p.especificidade),
        );
        const especificidadeDaBase = Math.max(0, ...existentesTexto.filter(a => alerts.includes(a)).map(a => especificidadeBase(a.id)));
        const maisGrave = order[pair.severidade] < severidadeMaisGraveExistente;
        const mesmaGraviadeMaisEspecifico =
          // regra fixa curada vs. outra regra fixa: precisa ser MAIS específica; vs. interação da base: basta ser IGUALMENTE
          // específica (a regra curada, com conduta explícita, prevalece no empate; nunca substitui uma base mais específica)
          order[pair.severidade] === severidadeMaisGraveExistente && novaEspecificidade > especificidadePares && novaEspecificidade >= especificidadeDaBase;

        if (maisGrave || mesmaGraviadeMaisEspecifico) {
          for (const e of existentes) {
            const idx = alerts.indexOf(e);
            if (idx !== -1) alerts.splice(idx, 1);
          }
          // Remove das listas de pares aceitos qualquer entrada cujo
          // alerta acabou de ser removido, para não referenciar um
          // alerta que não existe mais.
          for (let i = paresAceitos.length - 1; i >= 0; i--) {
            if (existentes.some(e => e.id === paresAceitos[i].alertaId)) paresAceitos.splice(i, 1);
          }
          alerts.push(novoAlerta);
          paresAceitos.push({ alertaId, idsA, idsB, severidade: pair.severidade, especificidade: novaEspecificidade });
        }
        // Caso contrário: já existe alerta igual/mais grave OU igualmente
        // (ou mais) específico cobrindo o mesmo risco — não duplica nem
        // enfraquece o que já está lá.
      }
    }
  }

  // Ordenar por severidade
  return { alerts: alerts.sort((a, b) => order[a.severidade] - order[b.severidade]), interMeta };
}

// ─── RM-104/105: CONTRATO DE COBERTURA DA VERIFICAÇÃO ──────────
// Antes, moléculas não reconhecidas eram descartadas em silêncio (`.filter(Boolean)`):
// "molécula_inexistente + varfarina" devolvia lista vazia, que a interface lia como "nenhum
// alerta de segurança". Agora o resultado diz explicitamente o que foi e o que NÃO foi verificado.
// Lista vazia de alertas NUNCA significa "seguro" sozinha: só é um resultado negativo quando
// `verificacao_completa === true`. E cobertura molecular completa NÃO é avaliação clínica integral
// (`avaliacao_integral`): o contexto do paciente tem cobertura própria (`cobertura_contextual`).

export type SafetyCoverageStatus =
  | 'completa'                 // todas as entradas foram reconhecidas e verificadas
  | 'parcial'                  // há entradas verificadas e entradas NÃO verificadas ou de identidade ambígua
  | 'molecula_nao_reconhecida' // nenhuma entrada foi reconhecida — nada foi verificado na base
  | 'dados_insuficientes'      // nenhuma entrada utilizável (lista vazia, vazios ou inválidos)
  | 'erro';                    // a verificação falhou ou a entrada é inválida

export type MotivoNaoVerificada = 'nao_reconhecida' | 'entrada_vazia' | 'entrada_invalida' | 'termo_nao_molecular' | 'id_nao_encontrado';

export interface MoleculaVerificada {
  /** Texto exatamente como informado. */
  entrada: string;
  id: string;
  molecula: string;
  /** Reconhecida pelo nome ativo cadastrado ou por um sinônimo cadastrado. */
  via: 'nome' | 'sinonimo';
  /** true quando a identidade NÃO está confirmada (moléculas diferentes, variantes sem ID ou ID que diverge do texto): cobertura incompleta. */
  ambigua: boolean;
  motivo_ambiguidade?: MotivoAmbiguidade;
  /** Candidatos (nomes ativos ou entidades com contexto) — só relevante quando `ambigua`. */
  candidatos: string[];
  /** ID da entidade efetivamente usada pela verificação. */
  entidade_id: string;
  /** IDs de todas as entidades que o texto casa (uma só quando o ID foi informado). */
  entidades_candidatas: string[];
  /** Como a entidade foi selecionada (ID explícito, nome único ou primeira correspondência sem ID). */
  selecao: SelecaoEntidade;
  /** Como a identidade foi estabelecida (RM-105). */
  identificacao: IdentificacaoMolecula;
  /** false para marca não verificada ou sinônimo não validado (não muda o status; fica rastreável). */
  identidade_confirmada: boolean;
  /** Combinação farmacológica × monofármaco (derivado do nome ativo cadastrado). */
  composicao: 'monofarmaco' | 'combinacao';
  /** Contexto clínico da entidade quando é uma variante (ex.: paliativo, UTI, PCR). */
  contexto?: string;
  /** Outras entidades com o MESMO nome ativo — NUNCA substituem a entidade usada. */
  variantes_mesma_molecula: string[];
}

export interface MoleculaNaoVerificada {
  /** Texto exatamente como informado (nunca reescrito nem descartado). */
  entrada: string;
  motivo: MotivoNaoVerificada;
  /** Só para `termo_nao_molecular`: classe terapêutica, indicação, sintoma ou termo genérico. */
  categoria_termo?: CategoriaTermoNaoMolecular;
}

export interface CombinacaoNaoAvaliada {
  a: string;
  b: string;
  /** `identidade_ambigua`: avaliada só para a primeira correspondência, sem confirmação de identidade. */
  motivo: 'molecula_nao_verificada' | 'identidade_ambigua';
}

export type OrigemAlerta = 'base_cadastrada' | 'regra_fixa_par' | 'regra_fixa_arm' | 'regra_fixa_montelucaste' | 'alergia_registrada';

/** De onde veio cada alerta e quais entradas ele efetivamente avaliou. */
export interface RastreioAlerta {
  alerta_id: string;
  origem: OrigemAlerta;
  entradas_avaliadas: string[];
  /** true quando o alerta foi acionado, ao menos em parte, por TEXTO EXATO de entrada não resolvida (sigla/alias aprovado de regra fixa). */
  texto_bruto: boolean;
  /** true quando alguma entrada avaliada NÃO foi verificada contra a base (não reconhecida, ambígua ou termo não molecular). */
  envolve_entrada_nao_verificada: boolean;
  /** Entradas avaliadas que NÃO foram verificadas (subconjunto de `entradas_avaliadas`). */
  entradas_nao_verificadas: string[];
  /**
   * false quando o alerta depende de entrada não verificada: NÃO é interação confirmada entre moléculas identificadas.
   * ATENÇÃO (RM-106.1): o nome é legado (RM-105). `true` significa SOMENTE "identidade molecular das entradas confirmada";
   * NÃO significa interação validada clinicamente nem com fonte. A validação da interação está em `classificacao`
   * (`confirmada` exige fonte oficial registrada) e em `interacoes_avaliadas[].status_validacao`.
   */
  interacao_confirmada: boolean;
  /** RM-106: classificação do alerta (7 situações) — só para alertas de interação. */
  classificacao?: ClassificacaoInteracao;
  /** RM-106: como o alvo cadastrado reconheceu o medicamento (molécula, componente, classe, grupo…). */
  tipo_correspondencia?: TipoCorrespondencia;
  status_validacao?: StatusValidacaoInteracao;
  /** Texto do campo `with` cadastrado que gerou o alerta. */
  alvo_cadastrado?: string;
}

export interface SafetyCheckResult {
  status: SafetyCoverageStatus;
  /** Alertas válidos das moléculas reconhecidas e das regras fixas por texto. Pode estar vazio mesmo com cobertura incompleta. */
  alertas: QuickSafetyAlert[];
  moleculas_verificadas: MoleculaVerificada[];
  moleculas_nao_verificadas: MoleculaNaoVerificada[];
  /** Pares de entradas válidas em que ao menos uma não foi verificada contra a base. */
  combinacoes_nao_avaliadas: CombinacaoNaoAvaliada[];
  /** true SOMENTE quando status === 'completa'. Nunca inferir "seguro" a partir de alertas.length === 0. */
  verificacao_completa: boolean;
  /** Origem e entradas avaliadas de cada alerta (RM-105). */
  rastreio_alertas: RastreioAlerta[];
  /** Cobertura do contexto do paciente, independente da cobertura molecular (RM-105). */
  cobertura_contextual: CoberturaContextual;
  /** verificacao_completa E contexto completo. Hoje é sempre false (alergias não são avaliadas). */
  avaliacao_integral: boolean;
  /**
   * RM-105.2.2: limitações CONHECIDAS desta avaliação (ex.: faixa pediátrica sem regras específicas, reatividade
   * cruzada não avaliada). Uma avaliação pode ter cobertura completa das regras implementadas e ainda possuir
   * limitações clínicas relevantes. Campo aditivo: os contratos anteriores não mudam.
   */
  limitacoes_conhecidas: LimitacaoConhecida[];
  /** RM-106: uma entrada por alerta de interação da base, com correspondência, classificação, validação e fonte. */
  interacoes_avaliadas: RegistroInteracaoAvaliada[];
  /** RM-106: o que foi e o que NÃO foi encontrado entre as regras cadastradas (ausência de regra ≠ ausência de interação). */
  resumo_interacoes: ResumoInteracoes;
  /** RM-105.2.2: natureza da avaliação (cobertura técnica, NUNCA homologação clínica) e o que ficou pendente/fora do escopo. */
  detalhe_avaliacao: DetalheAvaliacao;
  /** Avaliação explícita de alergias (RM-105.2): estado, registros, cruzamentos e pendências. */
  avaliacao_alergias: AvaliacaoAlergias;
  /** Versão do contrato de avaliação (RM-105.2). */
  versao_contrato: string;
  mensagem: string;
  /** Presente só quando status === 'erro'. */
  erro?: string;
}

function representar(x: unknown): string {
  if (typeof x === 'string') return x;
  try { return JSON.stringify(x) ?? String(x); } catch { return String(x); }
}

function resultadoSemVerificacao(status: SafetyCoverageStatus, mensagem: string, extra: Partial<SafetyCheckResult> = {}): SafetyCheckResult {
  return {
    status, alertas: [], moleculas_verificadas: [], moleculas_nao_verificadas: [], combinacoes_nao_avaliadas: [],
    verificacao_completa: false, rastreio_alertas: [], cobertura_contextual: coberturaContextualNaoAvaliada(),
    avaliacao_integral: false, avaliacao_alergias: alergiasNaoAvaliadas(status === 'erro' ? 'a verificação falhou' : 'nenhuma entrada utilizável'),
    limitacoes_conhecidas: montarLimitacoes(coberturaContextualNaoAvaliada(), alergiasNaoAvaliadas('avaliação não executada')),
    interacoes_avaliadas: [], resumo_interacoes: resumoVazio(),
    detalhe_avaliacao: montarDetalheAvaliacao(false, coberturaContextualNaoAvaliada(), []),
    versao_contrato: SAFETY_CONTRACT_VERSION, mensagem, ...extra,
  };
}

function descreverNaoVerificada(n: MoleculaNaoVerificada): string {
  switch (n.motivo) {
    case 'entrada_vazia': return '(entrada vazia)';
    case 'entrada_invalida': return '"' + n.entrada + '" (entrada inválida)';
    case 'termo_nao_molecular': return '"' + n.entrada + '" (termo de classe/indicação/sintoma — não identifica uma molécula)';
    case 'id_nao_encontrado': return '"' + n.entrada + '" (ID de entidade informado não existe no repositório)';
    default: return '"' + n.entrada + '"';
  }
}

/**
 * Origem de cada alerta e entradas efetivamente avaliadas (RM-105, revisto na RM-105.1). Derivado dos ids:
 * - base cadastrada: `inter-`, `dup-`, `gest-`, `gest-risco-`, `lact-`, `geri-`, `renal-` (ids de moléculas resolvidas);
 * - regras fixas: `critical-pair-<a>-<b>` (chaves sem hífen), `arm-*`, `montelucaste-saude-mental`.
 * As regras fixas reconhecem entradas pelos alvos declarados em `safety-targets.ts` (igualdade/classe cadastrada
 * para entidades resolvidas; texto exato aprovado para não resolvidas) — o mesmo critério de `coletarAlertas`.
 */
function rastrearAlertas(
  alertas: QuickSafetyAlert[],
  entradas: EntradaResolvida[],
  naoVerificadas: Set<string>,
  alertasAlergia: AlertaAlergia[] = [],
): RastreioAlerta[] {
  const drugs = entradas.flatMap((e) => (e.drug ? [e.drug] : []));
  const doAlvo = (chave: string): EntradaResolvida[] => entradas.filter((e) => entradaAciona(alvoDe(chave), e));
  const porId = (id: string): EntradaResolvida[] => entradas.filter((e) => e.drug?.id === id);

  return alertas.map((a): RastreioAlerta => {
    let origem: OrigemAlerta = 'base_cadastrada';
    let avaliadas: EntradaResolvida[] = [];
    let fixa = false;
    let confirmadaAlergia = true;
    if (a.id.startsWith('alergia-')) {
      origem = 'alergia_registrada';
      const aa = alertasAlergia.find((x) => x.id === a.id);
      if (aa) { avaliadas = entradas.filter((e) => e.texto === aa.item); confirmadaAlergia = aa.confirmada; }
    } else if (a.id.startsWith('critical-pair-')) {
      origem = 'regra_fixa_par'; fixa = true;
      const [ta, tb] = a.id.slice('critical-pair-'.length).split('-');
      avaliadas = [...doAlvo(ta), ...doAlvo(tb)];
    } else if (a.id.startsWith('arm-')) {
      origem = 'regra_fixa_arm'; fixa = true; avaliadas = doAlvo('arm');
    } else if (a.id === 'montelucaste-saude-mental') {
      origem = 'regra_fixa_montelucaste'; fixa = true; avaliadas = doAlvo('montelucaste');
    } else if (a.id.startsWith('inter-')) {
      for (const x of drugs) for (const y of drugs) {
        if (x !== y && a.id === `inter-${x.id}-${y.id}`) avaliadas.push(...porId(x.id), ...porId(y.id));
      }
    } else if (a.id.startsWith('dup-')) {
      const classe = a.id.slice('dup-'.length);
      avaliadas = entradas.filter((e) => e.drug?.classe === classe);
    } else {
      const m = /^(?:gest-risco-|gest-|lact-|geri-|renal-)(.+)$/.exec(a.id);
      if (m) avaliadas = porId(m[1]);
    }
    const unicas = [...new Set(avaliadas.map((e) => e.texto))];
    const naoVerif = unicas.filter((t) => naoVerificadas.has(t));
    return {
      alerta_id: a.id, origem, entradas_avaliadas: unicas,
      texto_bruto: fixa && avaliadas.some((e) => !e.drug),
      envolve_entrada_nao_verificada: naoVerif.length > 0,
      entradas_nao_verificadas: naoVerif,
      interacao_confirmada: naoVerif.length === 0 && confirmadaAlergia,
    };
  });
}

function descreverAmbigua(v: MoleculaVerificada): string {
  switch (v.motivo_ambiguidade) {
    case 'variantes_sem_id':
      return '"' + v.entrada + '" sem ID de entidade: casa com ' + v.entidades_candidatas.length + ' variantes (' + v.candidatos.join(' / ') + ')';
    case 'id_diverge_do_texto':
      return '"' + v.entrada + '" diverge do ID informado (' + v.candidatos[0] + ')';
    default:
      return '"' + v.entrada + '" (' + v.candidatos.join(' / ') + ')';
  }
}

const IDENTIFICACOES_CONFIRMADAS: ReadonlySet<IdentificacaoMolecula> = new Set<IdentificacaoMolecula>(['id_explicito', 'nome_ativo', 'sinonimo_validado', 'nome_comercial_verificado']);

/** Resolve o alérgeno registrado a uma molécula (identidade, nunca reatividade cruzada). Variantes da MESMA molécula não são ambíguas aqui. */
function resolverSubstancia(texto: string, entidadeId?: string | null): SubstanciaResolvida {
  const res = resolverEntrada(texto, entidadeId);
  if (res.tipo === 'molecula') {
    const ambigua = res.motivo_ambiguidade === 'moleculas_diferentes' || res.motivo_ambiguidade === 'id_diverge_do_texto';
    return { tipo: 'molecula', entidade_id: res.drug.id, molecula: res.drug.molecula, confirmada: !ambigua && IDENTIFICACOES_CONFIRMADAS.has(res.identificacao), ambigua };
  }
  if (res.tipo === 'termo_nao_molecular') return res.categoria === 'classe_terapeutica' ? { tipo: 'classe' } : { tipo: 'desconhecida' };
  return { tipo: 'desconhecida' };
}

/**
 * Verificação de segurança com cobertura explícita (RM-104/105).
 *
 * - Cada entrada é classificada como verificada ou não verificada; nenhuma desaparece.
 * - Identidade só por correspondência exata de nome/nome completo/sinônimo cadastrado (sem
 *   aproximação). Classe terapêutica, indicação, sintoma e termo genérico NÃO identificam molécula.
 * - Entradas não reconhecidas ainda passam pelas regras fixas por texto bruto (CRITICAL_PAIRS, ARM,
 *   montelucaste), exatamente como antes; as verificações que dependem da base (interação
 *   cadastrada, duplicidade, gestação, lactação, geriatria, renal) NÃO ocorrem para elas.
 *   `rastreio_alertas` informa a origem de cada alerta e as entradas que ele avaliou.
 */
export function runSafetyCheck(input: SafetyCheckInput): SafetyCheckResult {
  try {
    if (!input || typeof input !== 'object' || !Array.isArray(input.moleculas)) {
      return resultadoSemVerificacao('erro', 'Entrada inválida: "moleculas" deve ser uma lista de textos. Nada foi verificado — não considere a prescrição verificada.', { erro: 'entrada_invalida' });
    }
    const ids = input.entidade_ids;
    if (ids !== undefined && (!Array.isArray(ids) || ids.length !== input.moleculas.length)) {
      return resultadoSemVerificacao('erro', 'Entrada inválida: "entidade_ids" deve ter o mesmo tamanho de "moleculas". Nada foi verificado — não considere a prescrição verificada.', { erro: 'entidade_ids_invalido' });
    }

    const verificadas: MoleculaVerificada[] = [];
    const naoVerificadas: MoleculaNaoVerificada[] = [];
    const entradas: EntradaResolvida[] = [];
    const itensAlergia: ItemPrescritoAlergia[] = [];
    /** Entradas utilizáveis, na ordem informada, com o resultado da resolução (para montar as combinações). */
    const utilizaveis: Array<{ entrada: string; reconhecida: boolean; ambigua: boolean }> = [];

    for (let idx = 0; idx < input.moleculas.length; idx++) {
      const item = (input.moleculas as unknown[])[idx];
      if (typeof item !== 'string') {
        naoVerificadas.push({ entrada: representar(item), motivo: 'entrada_invalida' });
        continue;
      }
      if (item.trim() === '') {
        naoVerificadas.push({ entrada: item, motivo: 'entrada_vazia' });
        continue;
      }
      const res = resolverEntrada(item, ids?.[idx]);
      if (res.tipo === 'molecula') {
        entradas.push({ texto: item, drug: res.drug });
        itensAlergia.push({ texto: item, entidade_id: res.drug.id, molecula: res.drug.molecula, identificado: res.motivo_ambiguidade !== 'moleculas_diferentes' && res.motivo_ambiguidade !== 'id_diverge_do_texto' });
        verificadas.push({
          entrada: item, id: res.drug.id, molecula: res.drug.molecula, via: res.via, ambigua: res.ambigua,
          motivo_ambiguidade: res.motivo_ambiguidade, candidatos: res.candidatos,
          entidade_id: res.drug.id, entidades_candidatas: res.entidades_candidatas, selecao: res.selecao,
          identificacao: res.identificacao,
          identidade_confirmada: !res.ambigua && (res.identificacao === 'id_explicito' || res.identificacao === 'nome_ativo' || res.identificacao === 'sinonimo_validado' || res.identificacao === 'nome_comercial_verificado'),
          composicao: res.composicao, contexto: res.contexto, variantes_mesma_molecula: res.variantes,
        });
        utilizaveis.push({ entrada: item, reconhecida: true, ambigua: res.ambigua });
      } else if (res.tipo === 'termo_nao_molecular') {
        entradas.push({ texto: item });
        itensAlergia.push({ texto: item, identificado: false });
        naoVerificadas.push({ entrada: item, motivo: 'termo_nao_molecular', categoria_termo: res.categoria });
        utilizaveis.push({ entrada: item, reconhecida: false, ambigua: false });
      } else if (res.tipo === 'id_nao_encontrado') {
        entradas.push({ texto: item });
        itensAlergia.push({ texto: item, identificado: false });
        naoVerificadas.push({ entrada: item, motivo: 'id_nao_encontrado' });
        utilizaveis.push({ entrada: item, reconhecida: false, ambigua: false });
      } else {
        entradas.push({ texto: item });
        itensAlergia.push({ texto: item, identificado: false });
        naoVerificadas.push({ entrada: item, motivo: 'nao_reconhecida' });
        utilizaveis.push({ entrada: item, reconhecida: false, ambigua: false });
      }
    }

    const combinacoes: CombinacaoNaoAvaliada[] = [];
    for (let i = 0; i < utilizaveis.length; i++) {
      for (let j = i + 1; j < utilizaveis.length; j++) {
        if (!utilizaveis[i].reconhecida || !utilizaveis[j].reconhecida) {
          combinacoes.push({ a: utilizaveis[i].entrada, b: utilizaveis[j].entrada, motivo: 'molecula_nao_verificada' });
        } else if (utilizaveis[i].ambigua || utilizaveis[j].ambigua) {
          combinacoes.push({ a: utilizaveis[i].entrada, b: utilizaveis[j].entrada, motivo: 'identidade_ambigua' });
        }
      }
    }

    // RM-105.2: a regra geriátrica usa a idade validada; idade ausente/inválida NUNCA vira "não idoso".
    const inputRegras: SafetyCheckInput = { ...input, idoso: derivarIdoso(input) };
    const { alerts: alertasBase, interMeta } = coletarAlertas(inputRegras, entradas);
    const avalAlergias = avaliarAlergias(input.alergias, itensAlergia, resolverSubstancia);
    const ORDEM: Record<AlertSeverityFast, number> = { critical: 0, danger: 1, warning: 2, info: 3 };
    const alertas = [...alertasBase, ...avalAlergias.alertas.map(({ confirmada: _c, registro_indice: _r, item: _i, ...a }) => a)].sort((x, y) => ORDEM[x.severidade] - ORDEM[y.severidade]);
    const entradasNaoVerificadas = new Set<string>([
      ...naoVerificadas.map(n => n.entrada),
      ...verificadas.filter(v => v.ambigua).map(v => v.entrada),
    ]);
    const rastreioBase = rastrearAlertas(alertas, entradas, entradasNaoVerificadas, avalAlergias.alertas);
    // RM-106: registro por alerta de interação da base + classificação de todos os alertas de interação
    const interacoesAvaliadas: RegistroInteracaoAvaliada[] = [];
    for (const al of alertas) {
      const m = interMeta.get(al.id);
      if (!m) continue;
      const meta = metadadosDaInteracao(m.a_id, m.alvo);
      interacoesAvaliadas.push({
        alerta_id: al.id, entidade_a: m.a_id, entidade_b: m.b_id, alvo_cadastrado: m.alvo, tipo_correspondencia: m.tipo,
        classificacao: classificarInteracao(m.tipo, meta), gravidade_cadastrada: m.gravidade,
        status_validacao: meta.status_validacao, fonte: meta.fonte ?? null, limitacoes: meta.limitacoes,
        ...(m.divergencia ? { divergencia_de_gravidade: m.divergencia } : {}),
      });
    }
    const rastreio = rastreioBase.map((rz) => {
      const reg = interacoesAvaliadas.find((r) => r.alerta_id === rz.alerta_id);
      if (reg) return { ...rz, classificacao: reg.classificacao, tipo_correspondencia: reg.tipo_correspondencia, status_validacao: reg.status_validacao, alvo_cadastrado: reg.alvo_cadastrado };
      if (rz.origem === 'regra_fixa_par') {
        const [ta, tb] = rz.alerta_id.slice('critical-pair-'.length).split('-');
        const classe = alvoDe(ta).tipo === 'classe' || alvoDe(tb).tipo === 'classe';
        const classificacao: ClassificacaoInteracao = rz.envolve_entrada_nao_verificada ? 'medicamento_nao_identificado' : classe ? 'por_classe' : 'pendente_validacao';
        return { ...rz, classificacao, status_validacao: 'pendente_validacao_clinica' as StatusValidacaoInteracao };
      }
      if (rz.origem === 'regra_fixa_arm' || rz.origem === 'regra_fixa_montelucaste') return { ...rz, classificacao: 'pendente_validacao' as ClassificacaoInteracao, status_validacao: 'pendente_validacao_clinica' as StatusValidacaoInteracao };
      return rz;
    });
    // RM-106: resumo — pares de medicamentos IDENTIFICADOS sem regra encontrada (nunca prova de ausência de interação)
    const resumo = resumoVazio();
    const identificadas = entradas.filter((e, idx) => !!e.drug && itensAlergia[idx]?.identificado !== false);
    for (let x = 0; x < identificadas.length; x++) {
      for (let y = x + 1; y < identificadas.length; y++) {
        resumo.pares_avaliados++;
        const tx = identificadas[x].texto; const ty = identificadas[y].texto;
        const tem = rastreio.some((rz) => (rz.alerta_id.startsWith('inter-') || rz.alerta_id.startsWith('critical-pair-')) && rz.entradas_avaliadas.includes(tx) && rz.entradas_avaliadas.includes(ty));
        if (!tem) {
          const dx = identificadas[x].drug!; const dy = identificadas[y].drug!;
          const naoRes = [...dx.interacoes_importantes, ...dy.interacoes_importantes].filter((i) => { const a = resolverAlvoInteracao(i.com); return a.descritores_nao_resolvidos.length > 0 || a.grupo_aberto; }).length;
          resumo.pares_sem_regra_encontrada.push({ a: tx, b: ty, interacoes_com_alvo_nao_resolvido: naoRes });
        }
      }
    }
    for (const rz of rastreio) { if (rz.classificacao) resumo.por_classificacao[rz.classificacao]++; }
    resumo.por_classificacao.nao_encontrada = resumo.pares_sem_regra_encontrada.length;
    resumo.combinacoes_nao_avaliadas = combinacoes.length;
    resumo.por_classificacao.combinacao_nao_avaliada = combinacoes.length;
    resumo.medicamentos_nao_identificados = naoVerificadas.length;
    resumo.por_classificacao.medicamento_nao_identificado += naoVerificadas.length;
    const usaARM = entradas.some(e => entradaAciona(alvoDe('arm'), e));
    const contexto = avaliarCoberturaContextual(input, { usaARM, alergias: estadoContextoDeAlergias(avalAlergias) });

    const limitacoesConhecidas = montarLimitacoes(contexto, avalAlergias);
    const lista = naoVerificadas.map(descreverNaoVerificada).join(', ');
    const ambiguas = verificadas.filter(v => v.ambigua);
    const listaAmbiguas = ambiguas.map(descreverAmbigua).join(', ');
    const base = {
      alertas, moleculas_verificadas: verificadas, moleculas_nao_verificadas: naoVerificadas, combinacoes_nao_avaliadas: combinacoes,
      rastreio_alertas: rastreio, cobertura_contextual: contexto, avaliacao_alergias: avalAlergias, versao_contrato: SAFETY_CONTRACT_VERSION,
      interacoes_avaliadas: interacoesAvaliadas, resumo_interacoes: resumo,
      limitacoes_conhecidas: limitacoesConhecidas,
    };
    const integral = (completa: boolean) => completa && contexto.completa;
    const detalheDe = (completa: boolean): DetalheAvaliacao => montarDetalheAvaliacao(integral(completa), contexto, limitacoesConhecidas);

    if (entradas.length === 0) {
      return { ...base, status: 'dados_insuficientes', verificacao_completa: false, avaliacao_integral: false, detalhe_avaliacao: detalheDe(false),
        mensagem: naoVerificadas.length
          ? 'Nenhuma entrada utilizável (' + lista + '). Nada foi verificado — informe ao menos um medicamento.'
          : 'Nenhum medicamento informado. Nada foi verificado.' };
    }
    if (verificadas.length === 0) {
      return { ...base, status: 'molecula_nao_reconhecida', verificacao_completa: false, avaliacao_integral: false, detalhe_avaliacao: detalheDe(false),
        mensagem: 'Nenhuma molécula informada foi reconhecida (' + lista + '). Nada foi verificado na base — isto NÃO indica segurança.' };
    }
    if (naoVerificadas.length > 0 || ambiguas.length > 0) {
      return { ...base, status: 'parcial', verificacao_completa: false, avaliacao_integral: false, detalhe_avaliacao: detalheDe(false),
        mensagem: 'Verificação PARCIAL: ' + (naoVerificadas.length ? 'não foi possível verificar ' + lista + '. ' : '')
          + (ambiguas.length ? 'Identidade AMBÍGUA / não confirmada (alertas calculados só para a primeira correspondência, nunca para uma variante escolhida): ' + listaAmbiguas + '. ' : '')
          + (combinacoes.length ? 'Combinações não avaliadas ou sem identidade confirmada: ' + combinacoes.map(c => c.a + ' + ' + c.b).join('; ') + '. ' : '')
          + 'Nenhuma conclusão de segurança é possível para o que não foi verificado.' };
    }
    const naoConfirmadas = verificadas.filter(v => !v.identidade_confirmada);
    return { ...base, status: 'completa', verificacao_completa: true, avaliacao_integral: integral(true), detalhe_avaliacao: detalheDe(true),
      mensagem: 'Verificação concluída para todas as moléculas informadas (' + verificadas.length + '). Ausência de alerta indica apenas que nenhuma regra cadastrada foi acionada.'
        + (naoConfirmadas.length ? ' Identidade não confirmada (nome comercial não verificado ou sinônimo não validado): ' + naoConfirmadas.map(v => '"' + v.entrada + '" → ' + v.molecula).join(', ') + '.' : '')
        + (contexto.completa ? ' Todos os contextos exigidos foram informados e avaliados; isso não equivale a validação clínica.' : ' Cobertura molecular completa NÃO equivale a avaliação clínica integral — contexto não informado, inválido ou não avaliado: ' + contexto.pendencias.map(p => ROTULO_CAMPO[p]).join(', ') + '.') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return resultadoSemVerificacao('erro', 'A verificação de segurança falhou (' + msg + '). Não considere a prescrição verificada.', { erro: msg });
  }
}

export const SEVERITY_CONFIG: Record<AlertSeverityFast, { color: string; icon: string; label: string }> = {
  critical: { color: 'border-red-200 bg-red-50', icon: 'text-red-600', label: 'Crítico' },
  danger: { color: 'border-orange-200 bg-orange-50', icon: 'text-orange-500', label: 'Alerta' },
  warning: { color: 'border-yellow-200 bg-yellow-50', icon: 'text-yellow-500', label: 'Atenção' },
  info: { color: 'border-blue-200 bg-blue-50', icon: 'text-blue-500', label: 'Info' },
};
