// ============================================================
// RM-104 — Apresentação da cobertura da verificação de segurança
//
// Lógica PURA (sem React) que decide o que a interface pode afirmar sobre o
// resultado de `runSafetyCheck`. Regra central: "nenhum alerta" só vira
// resultado negativo (selo verde) quando a verificação foi COMPLETA. Com
// cobertura parcial, molécula não reconhecida, dados insuficientes ou erro,
// nunca se exibe status de segurança completa.
// ============================================================

import type { SafetyCheckResult } from './safety-rules';
import { ROTULO_CLASSIFICACAO, ROTULO_CORRESPONDENCIA, NOTA_SEM_REGRA } from './interaction-contract';
import { ROTULO_IDENTIFICACAO_ALERGENO, transparenciaAlergias } from './safety-allergy';

export type CoverageTone = 'neutral' | 'ok' | 'warning' | 'danger';

export interface CoverageView {
  tone: CoverageTone;
  titulo: string;
  detalhes: string[];
  /** true SOMENTE para verificação completa sem nenhum alerta. */
  mostrarSeloNegativo: boolean;
  /** true quando há algo que NÃO foi verificado (parcial, não reconhecida, dados insuficientes ou erro). */
  incompleta: boolean;
}

const NAO_VERIFICAVEL = new Set(['parcial', 'molecula_nao_reconhecida', 'dados_insuficientes', 'erro']);

/** Verdadeiro quando existe resultado e ele NÃO é uma verificação completa. */
export function coberturaIncompleta(result: SafetyCheckResult | null | undefined): boolean {
  return !!result && NAO_VERIFICAVEL.has(result.status);
}

function listaNaoVerificadas(result: SafetyCheckResult): string[] {
  return result.moleculas_nao_verificadas.map(n =>
    n.motivo === 'entrada_vazia' ? '(entrada vazia)'
      : n.motivo === 'entrada_invalida' ? `${n.entrada} (entrada inválida)`
        : n.motivo === 'termo_nao_molecular' ? `${n.entrada} (termo de classe/indicação — não identifica uma molécula)`
          : n.motivo === 'id_nao_encontrado' ? `${n.entrada} (ID de entidade inexistente)`
            : `${n.entrada} (não reconhecida)`);
}

const NOME_CAMPO: Record<string, string> = {
  gestacao: 'gestação', lactacao: 'lactação', idade_idoso: 'idade/idoso', funcao_renal: 'função renal', potassio: 'potássio', alergias: 'alergias', peso: 'peso',
};

/** Linhas extras da verificação COMPLETA: identidade não confirmada e contexto não avaliado (RM-105). */
function detalhesDaCompleta(result: SafetyCheckResult): string[] {
  const extra: string[] = [];
  const naoConfirmadas = result.moleculas_verificadas.filter(v => !v.identidade_confirmada);
  if (naoConfirmadas.length) {
    extra.push('Identidade não confirmada (nome comercial não verificado ou sinônimo não validado): ' + naoConfirmadas.map(v => `${v.entrada} → ${v.molecula}`).join('; '));
  }
  for (const l of (result.limitacoes_conhecidas ?? []).filter(x => x.severidade === 'relevante')) extra.push('Limitação: ' + l.descricao);
  extra.push(...descreverParesSemRegra(result));
  if (!result.cobertura_contextual.completa) {
    extra.push('Cobertura molecular completa não é avaliação clínica integral. Contexto não avaliado (não informado, inválido ou não conclusivo): ' + result.cobertura_contextual.pendencias.map(p => NOME_CAMPO[p] ?? p).join(', ') + '.');
  }
  return extra;
}

/**
 * RM-105.1: rótulo para um alerta que depende de entrada NÃO verificada (ex.: sigla de classe digitada, molécula
 * não reconhecida). Nunca deve ser apresentado como interação confirmada entre moléculas identificadas.
 * Devolve null quando o alerta não depende de entrada não verificada.
 */
export function rotuloAlertaNaoConfirmado(result: SafetyCheckResult | null | undefined, alertaId: string): string | null {
  const rz = result?.rastreio_alertas.find(x => x.alerta_id === alertaId);
  if (!rz || rz.interacao_confirmada) return null;
  return 'Acionado por entrada não verificada (' + rz.entradas_nao_verificadas.join(', ') + ') — não é interação confirmada entre moléculas identificadas.';
}

export interface ClassificacaoAlertaView {
  /** Rótulo curto da classificação (RM-106). */
  rotulo: string;
  /** Linhas descritivas: origem da regra, correspondência, validação/fonte. */
  detalhes: string[];
  /** true quando a interação NÃO é confirmada por fonte oficial registrada (pendente, classe ou grupo). */
  pendente: boolean;
}

/** RM-106 — origem, correspondência, evidência e pendência de validação de um alerta (null = alerta sem classificação). */
export function descreverClassificacaoAlerta(result: SafetyCheckResult | null | undefined, alertaId: string): ClassificacaoAlertaView | null {
  const rz = result?.rastreio_alertas.find(x => x.alerta_id === alertaId);
  if (!rz?.classificacao) return null;
  const reg = result!.interacoes_avaliadas.find(r => r.alerta_id === alertaId);
  const detalhes: string[] = [];
  if (reg) {
    detalhes.push(`Regra cadastrada: "${reg.alvo_cadastrado}" — reconhecida como ${ROTULO_CORRESPONDENCIA[reg.tipo_correspondencia]}.`);
    detalhes.push(reg.fonte ? `Fonte registrada: ${reg.fonte.referencia}${reg.fonte.secao ? ' (' + reg.fonte.secao + ')' : ''}.` : 'Sem fonte bibliográfica registrada para esta interação.');
    if (reg.divergencia_de_gravidade) detalhes.push(`Gravidades cadastradas divergentes (${reg.divergencia_de_gravidade.a_para_b} × ${reg.divergencia_de_gravidade.b_para_a}): vale a mais grave.`);
  } else if (rz.origem === 'regra_fixa_par' || rz.origem === 'regra_fixa_arm' || rz.origem === 'regra_fixa_montelucaste') {
    detalhes.push('Regra fixa do sistema (sem fonte bibliográfica registrada por regra).');
  }
  return { rotulo: ROTULO_CLASSIFICACAO[rz.classificacao], detalhes, pendente: rz.classificacao !== 'confirmada' };
}

/** RM-106 — linhas sobre pares de medicamentos identificados SEM regra encontrada (nunca prova de ausência de interação). */
export function descreverParesSemRegra(result: SafetyCheckResult | null | undefined): string[] {
  const pares = result?.resumo_interacoes?.pares_sem_regra_encontrada ?? [];
  if (!pares.length) return [];
  return [
    'Sem regra cadastrada encontrada para: ' + pares.map(p => `${p.a} + ${p.b}${p.interacoes_com_alvo_nao_resolvido ? ` (${p.interacoes_com_alvo_nao_resolvido} interação(ões) cadastrada(s) com alvo não resolvido)` : ''}`).join('; ') + '.',
    NOTA_SEM_REGRA,
  ];
}

export interface AlergiasView {
  visivel: boolean;
  tone: CoverageTone;
  titulo: string;
  linhas: string[];
}

/**
 * RM-105.2.1 — Como a tela comunica o estado das alergias. Nunca sugere ausência de risco quando
 * a alergia não foi avaliada molecularmente. Não cria regra nem altera gravidade de alertas.
 */
export function describeAlergias(result: SafetyCheckResult | null | undefined, itensNaReceita: number): AlergiasView {
  if (!result || itensNaReceita < 1) return { visivel: false, tone: 'neutral', titulo: '', linhas: [] };
  const a = result.avaliacao_alergias;
  const extras = transparenciaAlergias(a);
  const porRegistro = a.registros.map(r => `${r.substancia || '(sem substância)'}: ${r.valido ? ROTULO_IDENTIFICACAO_ALERGENO[r.identificacao_molecular] : 'registro INVÁLIDO (' + r.motivo_invalido + ')'}`);
  switch (a.estado) {
    case 'nao_informado':
      return { visivel: true, tone: 'warning', titulo: 'Alergias não informadas — não avaliadas', linhas: extras };
    case 'ausencia_informada':
      return { visivel: true, tone: 'neutral', titulo: 'Ausência de alergias informada (declaração)', linhas: extras };
    case 'invalida':
      return { visivel: true, tone: 'danger', titulo: 'Informação de alergias inválida — avaliação não confiável', linhas: [...porRegistro, ...extras] };
    case 'parcial':
      return { visivel: true, tone: 'warning', titulo: 'Alergias avaliadas parcialmente', linhas: [...porRegistro, ...extras] };
    case 'avaliada': {
      const ressalva = extras.length > 0;
      return { visivel: true, tone: ressalva ? 'warning' : 'neutral', titulo: ressalva ? 'Alergias avaliadas por identidade molecular, com ressalvas' : 'Alergias avaliadas por identidade molecular', linhas: [...porRegistro, ...extras, 'Reatividade cruzada não é avaliada.'] };
    }
    default:
      return { visivel: true, tone: 'danger', titulo: 'Avaliação de alergias não executada', linhas: ['Nenhuma conclusão sobre alergias é possível.'] };
  }
}

export function describeSafetyCoverage(result: SafetyCheckResult | null | undefined, itensNaReceita: number): CoverageView {
  if (!result || itensNaReceita < 1) {
    return { tone: 'neutral', titulo: 'Adicione medicamentos para verificar interações', detalhes: [], mostrarSeloNegativo: false, incompleta: false };
  }
  switch (result.status) {
    case 'erro':
      return { tone: 'danger', titulo: 'Erro na verificação de segurança — nada deve ser considerado verificado', detalhes: [result.mensagem], mostrarSeloNegativo: false, incompleta: true };
    case 'dados_insuficientes':
      return { tone: 'warning', titulo: 'Dados insuficientes — nada foi verificado', detalhes: [result.mensagem], mostrarSeloNegativo: false, incompleta: true };
    case 'molecula_nao_reconhecida':
      return { tone: 'danger', titulo: 'Nenhuma molécula reconhecida — nada foi verificado', detalhes: ['Não verificadas: ' + listaNaoVerificadas(result).join(', '), 'Isto NÃO indica segurança.'], mostrarSeloNegativo: false, incompleta: true };
    case 'parcial': {
      const detalhes: string[] = [];
      if (result.moleculas_nao_verificadas.length) detalhes.push('Não verificadas: ' + listaNaoVerificadas(result).join(', '));
      const ambiguas = result.moleculas_verificadas.filter(v => v.ambigua);
      if (ambiguas.length) {
        detalhes.push('Identidade ambígua ou não confirmada (alertas calculados só para a primeira correspondência; nenhuma variante foi escolhida): ' + ambiguas.map(v => v.motivo_ambiguidade === 'variantes_sem_id'
          ? `${v.entrada} — sem ID de entidade, casa com ${v.entidades_candidatas.length} variantes: ${v.candidatos.join(' / ')}`
          : v.motivo_ambiguidade === 'id_diverge_do_texto' ? `${v.entrada} — diverge do ID informado (${v.candidatos[0]})`
            : `${v.entrada} → ${v.candidatos.join(' / ')}`).join('; '));
      }
      if (result.combinacoes_nao_avaliadas.length) {
        detalhes.push('Combinações não avaliadas ou sem identidade confirmada: ' + result.combinacoes_nao_avaliadas.map(c => `${c.a} + ${c.b}`).join('; '));
      }
      detalhes.push('Os alertas abaixo (se houver) valem apenas para o que foi verificado.');
      return { tone: 'warning', titulo: 'Verificação PARCIAL — há itens não verificados', detalhes, mostrarSeloNegativo: false, incompleta: true };
    }
    case 'completa':
      if (result.alertas.length === 0 && result.detalhe_avaliacao?.faixa_etaria_sem_estratificacao) {
        // RM-105.2.2: faixa pediátrica/neonatal sem regras específicas: sem selo verde.
        return { tone: 'warning', titulo: 'Nenhum alerta nas regras cadastradas — faixa etária sem regras específicas', detalhes: ['Cobertura técnica das verificações configuradas; NÃO é validação clínica. A ausência de alerta não indica ausência de risco: não há regras pediátricas ou neonatais.', ...detalhesDaCompleta(result)], mostrarSeloNegativo: false, incompleta: false };
      }
      if (result.alertas.length === 0 && !['avaliada', 'ausencia_informada'].includes(result.avaliacao_alergias.estado)) {
        // RM-105.2.1: sem alerta, mas alergias NÃO avaliadas (não informadas, classe, desconhecidas, inválidas): sem selo verde.
        return { tone: 'warning', titulo: 'Nenhum alerta nas regras cadastradas — alergias não avaliadas', detalhes: ['Verificação molecular concluída, mas a ausência de alerta não indica ausência de risco: as alergias não foram avaliadas por completo.', ...detalhesDaCompleta(result)], mostrarSeloNegativo: false, incompleta: false };
      }
      if (result.alertas.length === 0) {
        return { tone: 'ok', titulo: 'Nenhum alerta nas regras cadastradas', detalhes: ['Verificação concluída para todas as moléculas informadas. Cobertura técnica das verificações configuradas; NÃO é validação clínica. A ausência de alerta não garante segurança: consulte bula e protocolo.', ...detalhesDaCompleta(result)], mostrarSeloNegativo: true, incompleta: false };
      }
      return { tone: 'neutral', titulo: 'Verificação concluída para todas as moléculas informadas', detalhes: detalhesDaCompleta(result), mostrarSeloNegativo: false, incompleta: false };
  }
}
