// ============================================================
// PRESCREVE-AI — RM-40: Validador de Integridade de Dados Clínicos
//
// Read-only sobre a base atual. Compõe (nunca duplica) os engines já
// existentes:
//   - RM-23 checkDrugConsistency (marca→ativo errado, marca→lab
//     divergente, apresentação/concentração/indicação/dose ausente);
// e adiciona as checagens de RM-40 ainda não cobertas por nenhum motor
// existente: ATC malformado, fonte/proveniência ausente, regime sem
// população definida, duplicidade real de molécula, faixa etária
// invertida, dose máxima menor que a dose habitual, dose diária
// confundida com dose por tomada, e dose sem unidade/unidade ambígua —
// tanto na base pediátrica estruturada (`PEDIATRIC_DOSES`) quanto na
// base adulto legada (`QuickDrug.dose_adulto`).
//
// NUNCA corrige silenciosamente: toda inconsistência encontrada vira um
// achado explícito (`erro`/`warning`/`info_incompleta`) — nenhum default
// mascara o problema (RM-40 tarefa 6).
// ============================================================

import { drugRepository } from '@/lib/pharma-core';
import type { DrugEntity } from '@/lib/pharma-core';
import { checkDrugConsistency } from '@/validation/drug-consistency';
import { getAllDrugs, type QuickDrug } from '@/lib/pharma-database';
import { PEDIATRIC_DOSES, type PediatricDoseEntry } from '@/lib/pediatric-engine';
import type { AchadoIntegridade, RelatorioIntegridade, IntegridadeNivel } from './types';

// ── ATC — formato WHO: 1 letra, 2 dígitos, 2 letras, 2 dígitos (ex.: C09AA05) ──
const ATC_REGEX = /^[A-Z]\d{2}[A-Z]{2}\d{2}$/;

// RM-52 (RM41-012): ATC é classificação farmacológica da OMS (a que classe
// o medicamento pertence), NUNCA evidência clínica (o que uma diretriz/bula
// recomenda para ele). O mesmo vale para PGX (farmacogenômica) e
// BEERS/STOPP/START (critérios de adequação em idosos) — são metadados
// clínicos reais, mas não são "fonte" no sentido de FONTE_AUSENTE (uma
// diretriz, bula ou evidência estruturada que sustente a recomendação).
// Sem esta lista, uma entidade cujo ÚNICO `reference` fosse `{type:'ATC'}`
// tinha `references.length === 1` e NUNCA disparava FONTE_AUSENTE — dando
// falsa sensação de dado auditado só por ter uma classificação da OMS.
const TIPOS_REFERENCIA_NAO_SAO_FONTE_CLINICA = new Set(['ATC', 'PGX', 'BEERS', 'STOPP', 'START']);

const POPULACOES_VALIDAS = new Set([
  'adulto', 'pediatrico', 'renal', 'hepatico', 'gestante', 'lactante',
]);

/**
 * Extrai um número de uma string livre — SOMENTE quando o texto, após
 * remover uma unidade/parênteses finais simples, é PURAMENTE numérico
 * (um valor ou uma faixa "N–M"). Retorna `undefined` para qualquer texto
 * narrativo, mesmo que contenha um número em algum lugar.
 *
 * Achado real durante a auditoria (RM-40): a versão ingênua ("pegue o
 * primeiro número da string") extraía "70" de
 * "Mistura 70:30 (He:O₂) — 10–15 L/min por máscara não-reinalante"
 * (heliox) — um número de PROPORÇÃO da mistura gasosa, não a dose real
 * (10–15 L/min). Comparado ao "60" extraído igualmente errado de
 * "Mistura 60:40 (se SpO₂ exigir mais O₂)", isso gerava um falso
 * "dose máxima (60) menor que a habitual (70)" — nem "60" nem "70" são,
 * de fato, doses. Extrair "o primeiro número de qualquer sentença
 * clínica" não é uma operação segura o suficiente para basear uma
 * checagem de nível 'erro'; por isso a extração agora falha
 * (retorna `undefined`) sempre que sobra QUALQUER texto além do próprio
 * número/faixa e uma unidade reconhecida.
 */
export function extrairNumeroSimples(texto: string | undefined): number | undefined {
  if (!texto) return undefined;
  let t = texto.trim();
  // Remove um parênteses final simples sem dígitos dentro (ex.: "(agudo)").
  t = t.replace(/\s*\([^0-9)]*\)\s*$/, '').trim();
  // Remove uma unidade/qualificador reconhecido no final (ex.: "mg", "mg/dia").
  t = t.replace(/\s*(mg|mcg|g|ui|ml|l\/min)\s*(\/\s*(dia|kg|h))?\s*$/i, '').trim();
  // O que sobra deve ser PURAMENTE numérico — um valor ou uma faixa "N–M".
  // Qualquer palavra, dois-pontos (razão de mistura), ou cláusula adicional
  // reprova a extração.
  if (!/^\d+([.,]\d+)?(\s*[-–]\s*\d+([.,]\d+)?)?$/.test(t)) return undefined;
  const m = t.match(/\d+([.,]\d+)?/);
  if (!m) return undefined;
  const n = parseFloat(m[0].replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}

/**
 * `dose_adulto.habitual/min/max` são texto livre — a MESMA grandeza
 * nominal (ex.: "mg") pode, na prática, descrever coisas incomparáveis:
 * dose por TOMADA vs. dose por DIA ("500 mg VO q6h" vs. "4 g/dia" —
 * cefalexina real), ou uma unidade diferente embutida no texto
 * ("1,6 mcg/kg/dia" vs. "200–300 mcg/dia" — levotiroxina real,
 * habitual é por kg, max é absoluto). Comparar o primeiro número
 * extraído desses dois textos, ignorando isso, produziria uma "dose
 * máxima menor que a habitual" FALSA (ex.: 500 < 4, quando na verdade
 * 500 mg/dose × 4 tomadas/dia = 2000 mg/dia < 4000 mg/dia — consistente).
 *
 * Por isso, a comparação numérica só é feita quando NENHUM dos dois
 * textos contém um qualificador que mude o "tipo" da grandeza
 * (/kg, /dia, /h — dose por peso, por dia ou por hora) nem uma unidade
 * diferente da unidade declarada do medicamento — caso contrário, a
 * checagem é honestamente reportada como não comparável
 * (`DOSE_NAO_PARSEAVEL`, info_incompleta) em vez de arriscar um falso
 * positivo classificado como 'erro'.
 */
export function textoComparavel(texto: string, unidadeEsperada: string): boolean {
  const t = texto.toLowerCase();
  if (/\/\s*kg|\/\s*dia|\/\s*h\b|\/\s*hora/.test(t)) return false;
  const outrasUnidades = ['mg', 'mcg', 'g', 'ui', 'ml'].filter(
    (u) => u !== unidadeEsperada.toLowerCase(),
  );
  if (outrasUnidades.some((u) => new RegExp(`\\b${u}\\b`).test(t))) return false;
  return true;
}

// ────────────────────────────────────────────────────────────
// 1) Base canônica (drugRepository) — ATC, fonte, população, duplicidade
// ────────────────────────────────────────────────────────────

export function checarBaseCanonica(entities: DrugEntity[] = drugRepository.getAll()): AchadoIntegridade[] {
  const achados: AchadoIntegridade[] = [];

  const porMolecula = new Map<string, DrugEntity[]>();

  for (const e of entities) {
    // ATC inválido — só verificado quando presente (ausência de ATC é
    // outra checagem, já coberta por RM-06 validateMigration/noAtc).
    if (e.activeIngredient.atc && !ATC_REGEX.test(e.activeIngredient.atc)) {
      achados.push({
        regra: 'ATC_INVALIDO',
        nivel: 'warning',
        entidade: e.id,
        mensagem: `Código ATC "${e.activeIngredient.atc}" não segue o formato WHO (1 letra + 2 dígitos + 2 letras + 2 dígitos, ex.: C09AA05).`,
        correcaoSugerida: 'Verificar o código ATC na fonte oficial (WHOCC) e corrigir o formato.',
      });
    }

    // Fonte/proveniência ausente — references[] vazio.
    if (e.references.length === 0) {
      achados.push({
        regra: 'FONTE_AUSENTE',
        nivel: 'info_incompleta',
        entidade: e.id,
        mensagem: 'Nenhuma referência/fonte (references[]) cadastrada — dado não pode ser rastreado a uma fonte verificável.',
        correcaoSugerida: 'Adicionar ao menos uma referência (bula, diretriz ou evidência) com type/value.',
      });
    } else if (e.references.every((r) => TIPOS_REFERENCIA_NAO_SAO_FONTE_CLINICA.has(r.type))) {
      // RM-52 (RM41-012): `references.length > 0` não é mais suficiente —
      // uma entidade cujas ÚNICAS referências são classificatórias (ATC,
      // PGX, BEERS/STOPP/START) não tem nenhuma fonte clínica REAL
      // (GUIDELINE/BULA/EVIDENCIA) por trás da recomendação.
      achados.push({
        regra: 'FONTE_AUSENTE',
        nivel: 'info_incompleta',
        entidade: e.id,
        mensagem: `Apenas referência(s) classificatória(s) presente(s) (${[...new Set(e.references.map((r) => r.type))].join(', ')}) — nenhuma fonte clínica real (diretriz/bula/evidência) sustenta a recomendação.`,
        correcaoSugerida: 'Adicionar ao menos uma referência do tipo GUIDELINE, BULA ou EVIDENCIA.',
      });
    }
    if (!e.provenance?.origem) {
      achados.push({
        regra: 'PROVENIENCIA_AUSENTE',
        nivel: 'info_incompleta',
        entidade: e.id,
        mensagem: 'Envelope de proveniência (provenance.origem) ausente.',
        correcaoSugerida: 'Preencher a proveniência via camada de governança (RM-00).',
      });
    }
    // RM-52 (RM41-013): `provenanceLegado()`/migrate.ts atribuem o sentinel
    // `1970-01-01T00:00:00.000Z` a `provenance.data_atualizacao` para todo
    // dado legado ainda não auditado — sem esta regra, nenhum validador
    // sinalizava isso, e qualquer feature futura que confiasse nesse campo
    // para responder "o dado está atualizado?" (banner de obsolescência,
    // badge de "última verificação") exibiria uma data falsa sem aviso.
    if (e.provenance?.data_atualizacao === '1970-01-01T00:00:00.000Z') {
      achados.push({
        regra: 'PROVENIENCIA_DATA_PLACEHOLDER',
        nivel: 'info_incompleta',
        entidade: e.id,
        mensagem: 'provenance.data_atualizacao é um sentinel de placeholder (epoch), não uma data real de última atualização/validação.',
        correcaoSugerida: 'Preencher com a data real de validação/atualização do dado, ou tratar como "nunca validado" em qualquer UI que leia este campo.',
      });
    }
    // RM-61: `verificationStatus: 'verified'` é uma afirmação forte — "este
    // dado passou por revisão e é confiável" — que nenhuma UI futura deveria
    // exibir (ex.: selo "verificado") se o resto do envelope não sustenta
    // essa afirmação. Sem esta regra, um `verified` atribuído manualmente de
    // forma incorreta (ou por um bug de migração futuro) nunca seria pego.
    if (e.provenance?.verificationStatus === 'verified' && e.provenance?.nivel_confianca !== 'ALTA') {
      achados.push({
        regra: 'VERIFICATION_STATUS_INCONSISTENTE',
        nivel: 'erro',
        entidade: e.id,
        mensagem: `provenance.verificationStatus é 'verified', mas nivel_confianca é '${e.provenance?.nivel_confianca}' (esperado 'ALTA') — a proveniência é internamente inconsistente.`,
        correcaoSugerida: "Corrigir verificationStatus para 'review' ou elevar nivel_confianca para 'ALTA' com base em fonte formal real.",
      });
    }

    // Regime sem população definida — checagem em tempo de execução
    // (o tipo já exige `population`, mas dados vindos de import/migração
    // podem smugglar um valor fora do enum via `as any` — nunca confiar
    // apenas no tipo estático para dado que atravessa fronteira de I/O).
    for (const regra of e.dosageRules) {
      const pop = regra.population as string;
      if (!pop || !POPULACOES_VALIDAS.has(pop)) {
        achados.push({
          regra: 'REGIME_SEM_POPULACAO',
          nivel: 'erro',
          entidade: e.id,
          mensagem: `Regra de dose sem população válida definida (valor: "${pop || '∅'}").`,
          correcaoSugerida: `population deve ser um de: ${[...POPULACOES_VALIDAS].join(', ')}.`,
        });
      }
    }

    const arr = porMolecula.get(e.activeIngredient.moleculeId);
    if (arr) arr.push(e); else porMolecula.set(e.activeIngredient.moleculeId, [e]);
  }

  // Duplicidade REAL de molécula: mesmo moleculeId em > 1 entidade SEM
  // clinicalContext distinto — variantes de contexto clínico (ex.:
  // midazolam geral vs. UTI vs. paliativo) são intencionais (RM-01
  // MED-01) e não contam como duplicidade.
  for (const [moleculeId, lista] of porMolecula) {
    if (lista.length <= 1) continue;
    const contextos = lista.map((e) => e.clinicalContext ?? '(sem contexto)');
    const contextosUnicos = new Set(contextos);
    if (contextosUnicos.size < lista.length) {
      achados.push({
        regra: 'MOLECULA_DUPLICADA',
        nivel: 'erro',
        entidade: moleculeId,
        mensagem: `Molécula "${moleculeId}" aparece em ${lista.length} registros (${lista.map((e) => e.id).join(', ')}) sem contexto clínico distinto para cada um.`,
        correcaoSugerida: 'Atribuir um clinicalContext único a cada variante ou unificar os registros duplicados.',
      });
    }
  }

  return achados;
}

// ────────────────────────────────────────────────────────────
// 2) Base pediátrica estruturada (PEDIATRIC_DOSES) — dose/unidade,
//    faixa etária, dose máxima × habitual, fonte
// ────────────────────────────────────────────────────────────

export function checarPediatricDoses(
  entradas: PediatricDoseEntry[] = PEDIATRIC_DOSES,
): AchadoIntegridade[] {
  const achados: AchadoIntegridade[] = [];
  const drugIds = new Map<string, number>();

  for (const entry of entradas) {
    drugIds.set(entry.drugId, (drugIds.get(entry.drugId) ?? 0) + 1);

    if (entry.fontes.length === 0) {
      achados.push({
        regra: 'FONTE_AUSENTE',
        nivel: 'info_incompleta',
        entidade: entry.drugId,
        mensagem: 'Entrada pediátrica sem nenhuma fonte (fontes[]) cadastrada.',
        correcaoSugerida: 'Adicionar ao menos uma referência bibliográfica (diretriz/bula/formulário pediátrico).',
      });
    }

    // Faixa etária invertida — formulações (faixaMeses / faixaKg).
    for (const f of entry.formulacoes) {
      if (f.faixaMeses && f.faixaMeses[0] > f.faixaMeses[1]) {
        achados.push({
          regra: 'FAIXA_ETARIA_INVERTIDA',
          nivel: 'erro',
          entidade: entry.drugId,
          mensagem: `Formulação "${f.forma}" com faixaMeses invertida: [${f.faixaMeses[0]}, ${f.faixaMeses[1]}] (mínimo maior que máximo).`,
          correcaoSugerida: 'Corrigir a ordem [mínimo, máximo] de faixaMeses.',
        });
      }
      if (f.faixaKg && f.faixaKg[0] > f.faixaKg[1]) {
        achados.push({
          regra: 'FAIXA_ETARIA_INVERTIDA',
          nivel: 'erro',
          entidade: entry.drugId,
          mensagem: `Formulação "${f.forma}" com faixaKg invertida: [${f.faixaKg[0]}, ${f.faixaKg[1]}] (mínimo maior que máximo).`,
          correcaoSugerida: 'Corrigir a ordem [mínimo, máximo] de faixaKg.',
        });
      }
    }

    for (const ind of entry.indicacoes) {
      const local = `${entry.drugId} / ${ind.nome}`;

      // Faixa etária invertida — idadeMinMeses/idadeMaxMeses da indicação.
      if (
        ind.idadeMinMeses !== undefined &&
        ind.idadeMaxMeses !== undefined &&
        ind.idadeMinMeses > ind.idadeMaxMeses
      ) {
        achados.push({
          regra: 'FAIXA_ETARIA_INVERTIDA',
          nivel: 'erro',
          entidade: local,
          mensagem: `idadeMinMeses (${ind.idadeMinMeses}) maior que idadeMaxMeses (${ind.idadeMaxMeses}).`,
          correcaoSugerida: 'Corrigir a ordem dos limites etários.',
        });
      }

      // Dose sem unidade / unidade ambígua: nenhuma variante de dose
      // informada, OU mais de uma variante POR-KG informada ao mesmo
      // tempo sem forma de reconciliar qual é "a" dose (doseMgKg é
      // por-tomada; doseMgKgDia é por-dia — ter os dois sem `divisoes`
      // torna ambíguo qual usar).
      const variantes = [
        ind.doseMgKg !== undefined,
        ind.doseMgKgDia !== undefined,
        ind.doseMcgKg !== undefined,
        ind.doseMgM2 !== undefined,
        ind.doseFixa !== undefined && ind.doseFixa.length > 0,
      ].filter(Boolean).length;

      if (variantes === 0) {
        achados.push({
          regra: 'DOSE_SEM_UNIDADE',
          nivel: 'info_incompleta',
          entidade: local,
          mensagem: 'Indicação sem nenhuma dose estruturada (doseMgKg/doseMgKgDia/doseMcgKg/doseMgM2/doseFixa) — apenas instrucoes em texto livre, se houver.',
          correcaoSugerida: 'Estruturar a dose num dos campos numéricos tipados.',
        });
      } else if (ind.doseMgKg !== undefined && ind.doseMgKgDia !== undefined && ind.divisoes === undefined) {
        achados.push({
          regra: 'UNIDADE_AMBIGUA',
          nivel: 'warning',
          entidade: local,
          mensagem: 'doseMgKg (por tomada) E doseMgKgDia (por dia) informados simultaneamente, sem `divisoes` para reconciliar — ambíguo qual é a dose autoritativa.',
          correcaoSugerida: 'Manter apenas um dos dois campos, ou informar `divisoes` de forma que doseMgKg × divisoes = doseMgKgDia.',
        });
      }

      // Dose diária confundida com dose por tomada / máximo menor que a
      // dose habitual — comparações numéricas diretas (mesma unidade:
      // mg/kg/dia).
      if (ind.maxDoseMgKgDia !== undefined) {
        if (ind.doseMgKgDia !== undefined && ind.doseMgKgDia > ind.maxDoseMgKgDia) {
          achados.push({
            regra: 'MAXIMO_MENOR_QUE_HABITUAL',
            nivel: 'erro',
            entidade: local,
            mensagem: `doseMgKgDia habitual (${ind.doseMgKgDia}) excede maxDoseMgKgDia (${ind.maxDoseMgKgDia}).`,
            correcaoSugerida: 'Revisar a fonte: o teto deve ser ≥ a dose habitual, nunca menor.',
          });
        }
        if (ind.doseMgKg !== undefined && ind.divisoes !== undefined) {
          const diarioCalculado = ind.doseMgKg * ind.divisoes;
          if (diarioCalculado > ind.maxDoseMgKgDia) {
            achados.push({
              regra: 'MAXIMO_MENOR_QUE_HABITUAL',
              nivel: 'erro',
              entidade: local,
              mensagem: `doseMgKg × divisoes (${ind.doseMgKg} × ${ind.divisoes} = ${diarioCalculado}) excede maxDoseMgKgDia (${ind.maxDoseMgKgDia}).`,
              correcaoSugerida: 'Revisar doseMgKg/divisoes/maxDoseMgKgDia — o teto diário deve acomodar o regime habitual.',
            });
          }
        } else if (ind.doseMgKg !== undefined && ind.doseMgKg > ind.maxDoseMgKgDia) {
          // Possível confusão dose/dia × dose/tomada: uma ÚNICA tomada já
          // excede o teto DIÁRIO — logicamente só é consistente se
          // doseMgKg for na verdade um valor diário mal rotulado.
          achados.push({
            regra: 'DOSE_DIARIA_CONFUNDIDA_COM_TOMADA',
            nivel: 'erro',
            entidade: local,
            mensagem: `doseMgKg (por TOMADA, ${ind.doseMgKg}) sozinho já excede maxDoseMgKgDia (${ind.maxDoseMgKgDia}) — possível confusão entre dose por tomada e dose diária.`,
            correcaoSugerida: 'Confirmar na fonte se doseMgKg é realmente por tomada; se for por dia, mover para doseMgKgDia.',
          });
        }
      }
      if (ind.maxDoseMg !== undefined && ind.doseMgKg !== undefined) {
        // Sem peso do paciente não dá para comparar diretamente
        // (maxDoseMg é absoluto, doseMgKg é por kg) — mas um maxDoseMg
        // implausivelmente baixo (< doseMgKg, ou seja, um paciente de
        // 1 kg já excederia o teto) é um forte indício de erro de dado.
        if (ind.maxDoseMg < ind.doseMgKg) {
          achados.push({
            regra: 'MAXIMO_MENOR_QUE_HABITUAL',
            nivel: 'warning',
            entidade: local,
            mensagem: `maxDoseMg (${ind.maxDoseMg} mg absolutos) é menor que doseMgKg (${ind.doseMgKg} mg/kg) — mesmo um paciente de 1 kg excederia o teto por tomada.`,
            correcaoSugerida: 'Revisar se maxDoseMg está na unidade certa (mg absolutos, não mg/kg).',
          });
        }
      }
    }
  }

  for (const [drugId, count] of drugIds) {
    if (count > 1) {
      achados.push({
        regra: 'MOLECULA_DUPLICADA',
        nivel: 'erro',
        entidade: drugId,
        mensagem: `drugId "${drugId}" aparece ${count} vezes em PEDIATRIC_DOSES — deve ser único.`,
        correcaoSugerida: 'Unificar as entradas duplicadas em uma só (múltiplas indicações vão dentro de indicacoes[]).',
      });
    }
  }

  return achados;
}

// ────────────────────────────────────────────────────────────
// 3) Base adulto legada (QuickDrug) — dose habitual × máximo
// ────────────────────────────────────────────────────────────

export function checarDoseAdultoLegado(
  drugs: QuickDrug[] = getAllDrugs(),
): AchadoIntegridade[] {
  const achados: AchadoIntegridade[] = [];

  for (const d of drugs) {
    const da = d.dose_adulto;
    if (!da) continue;
    const local = `${d.id} (${d.molecula})`;

    if (!da.unidade) {
      achados.push({
        regra: 'DOSE_SEM_UNIDADE',
        nivel: 'erro',
        entidade: local,
        mensagem: 'dose_adulto sem unidade definida.',
        correcaoSugerida: 'Preencher dose_adulto.unidade.',
      });
    }

    const habitual = extrairNumeroSimples(da.habitual);
    const max = extrairNumeroSimples(da.max);
    const min = extrairNumeroSimples(da.min);
    const unidade = da.unidade ?? '';

    if (habitual === undefined || max === undefined) {
      achados.push({
        regra: 'DOSE_NAO_PARSEAVEL',
        nivel: 'info_incompleta',
        entidade: local,
        mensagem: `Dose habitual ("${da.habitual}") ou máxima ("${da.max}") não é um número simples parseável — validação numérica não pôde ser concluída.`,
      });
      continue;
    }

    // Só compara habitual × max quando os dois textos descrevem
    // literalmente a mesma grandeza (nem um nem outro tem "/kg", "/dia",
    // "/h" ou uma unidade diferente embutida) — ver `textoComparavel`.
    if (!textoComparavel(da.habitual, unidade) || !textoComparavel(da.max, unidade)) {
      achados.push({
        regra: 'DOSE_NAO_PARSEAVEL',
        nivel: 'info_incompleta',
        entidade: local,
        mensagem: `Dose habitual ("${da.habitual}") e/ou máxima ("${da.max}") contêm qualificadores (/kg, /dia, /h) ou unidade diferente da declarada ("${unidade}") — os dois números não são diretamente comparáveis sem risco de falso positivo.`,
        correcaoSugerida: 'Revisar manualmente; considerar estruturar habitual/max/unidade separadamente por tipo de grandeza (por tomada vs. por dia vs. por kg).',
      });
      continue;
    }

    if (max < habitual) {
      achados.push({
        regra: 'MAXIMO_MENOR_QUE_HABITUAL',
        nivel: 'erro',
        entidade: local,
        mensagem: `Dose máxima (${max} ${unidade}) menor que a dose habitual (${habitual} ${unidade}).`,
        correcaoSugerida: 'Revisar a fonte — o teto deve ser ≥ à dose habitual.',
      });
    }
    if (min !== undefined && textoComparavel(da.min ?? '', unidade) && min > habitual) {
      achados.push({
        regra: 'FAIXA_DOSE_INVERTIDA',
        nivel: 'erro',
        entidade: local,
        mensagem: `Dose mínima (${min} ${unidade}) maior que a dose habitual (${habitual} ${unidade}).`,
        correcaoSugerida: 'Corrigir a ordem min ≤ habitual ≤ max.',
      });
    }
  }

  return achados;
}

// ────────────────────────────────────────────────────────────
// Composição final
// ────────────────────────────────────────────────────────────

const NIVEIS: IntegridadeNivel[] = ['erro', 'warning', 'info_incompleta', 'validado'];

/** Roda a validação de integridade completa contra a base atual. Read-only. */
export function validarIntegridadeGlobal(): RelatorioIntegridade {
  const entities = drugRepository.getAll();
  const legado = getAllDrugs();

  const achadosCanonicos = checarBaseCanonica(entities);
  const achadosPediatricos = checarPediatricDoses();
  const achadosAdultoLegado = checarDoseAdultoLegado(legado);

  // Reaproveita o RM-23 (marca→ativo errado, marca→lab divergente,
  // apresentação/concentração/indicação/dose ausente) mapeando a
  // gravidade para a classificação de 4 níveis desta auditoria.
  const rm23 = checkDrugConsistency(entities).map((i): AchadoIntegridade => ({
    regra: i.rule,
    nivel: i.gravidade === 'critical' || i.gravidade === 'high' ? 'erro'
      : i.gravidade === 'medium' ? 'warning' : 'info_incompleta',
    entidade: i.local,
    mensagem: i.erro,
    correcaoSugerida: i.correcaoSugerida,
  }));

  const achados = [...achadosCanonicos, ...achadosPediatricos, ...achadosAdultoLegado, ...rm23];

  const totalEntidadesAnalisadas = entities.length + PEDIATRIC_DOSES.length + legado.length;

  const resumo = Object.fromEntries(NIVEIS.map((n) => [n, 0])) as Record<IntegridadeNivel, number>;
  const porRegra: Record<string, number> = {};
  for (const a of achados) {
    resumo[a.nivel]++;
    porRegra[a.regra] = (porRegra[a.regra] ?? 0) + 1;
  }
  // Entidades sem NENHUM achado contam como "validado" para o resumo —
  // sem isso, o resumo só refletiria problemas, nunca o que passou limpo.
  const entidadesComAchado = new Set(achados.map((a) => a.entidade)).size;
  resumo.validado += Math.max(0, totalEntidadesAnalisadas - entidadesComAchado);

  return {
    timestamp: new Date().toISOString(),
    totalEntidadesAnalisadas,
    achados,
    resumo,
    porRegra,
    buildOk: resumo.erro === 0,
  };
}
