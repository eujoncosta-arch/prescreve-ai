// ============================================================
// RM-105.2.2 — Precisão do contrato de avaliação: limitações conhecidas e natureza da avaliação
//
// `avaliacao_integral` (inalterado) significa APENAS: todas as verificações atualmente configuradas
// foram executadas (cobertura molecular completa + todos os contextos exigidos informados e válidos).
// NÃO significa homologação clínica nem ausência de risco. Uma avaliação pode ter cobertura completa
// das regras implementadas e ainda possuir limitações clínicas relevantes — elas são declaradas aqui.
//
// Este módulo só DESCREVE. Não cria regra clínica, não altera gravidade e não corrige limitação
// de arquitetura por inferência.
// ============================================================

import type { AvaliacaoAlergias } from './safety-allergy';
import { LIMITACAO_IDADE_LEGADA, LIMITACAO_IDADE_PEDIATRICA, type CampoContexto, type CoberturaContextual } from './safety-context';

export type SeveridadeLimitacao = 'informativa' | 'relevante';

export interface LimitacaoConhecida {
  codigo: string;
  severidade: SeveridadeLimitacao;
  descricao: string;
}

/** Verificações que NÃO existem nesta versão (descrição factual do que o motor não faz). */
export const VERIFICACOES_FORA_DO_ESCOPO: readonly string[] = Object.freeze([
  'dose e posologia (calculadoras separadas; não fazem parte desta verificação)',
  'função hepática (o Child-Pugh informado na tela não é usado por esta verificação)',
  'contraindicações por diagnóstico ou comorbidade',
  'interações com alimentos, fitoterápicos ou suplementos',
  'regras específicas por faixa etária pediátrica ou neonatal',
  'reatividade cruzada entre alergias, moléculas ou classes',
  // RM-106.1: descrição factual de uma limitação estrutural (nenhuma regra nova): a verificação recebe só a identidade molecular.
  'via de administração, forma farmacêutica, concentração e apresentação do item prescrito (a verificação de interações recebe somente a identidade molecular: uma regra cadastrada para a molécula ou componente é aplicada independentemente da via ou da formulação)',
]);

export interface DetalheAvaliacao {
  natureza: 'cobertura_tecnica_das_verificacoes_configuradas';
  /** SEMPRE false: o contrato descreve cobertura técnica, nunca homologação clínica. */
  homologacao_clinica: false;
  /** Todas as verificações configuradas foram executadas (equivale a `avaliacao_integral`). */
  verificacoes_configuradas_executadas: boolean;
  contextos_nao_informados: CampoContexto[];
  contextos_invalidos: CampoContexto[];
  contextos_nao_avaliados: CampoContexto[];
  /** Quantidade de limitações de severidade `relevante`. */
  limitacoes_relevantes: number;
  /** A idade informada está numa faixa sem regras específicas (pediátrica/neonatal). */
  faixa_etaria_sem_estratificacao: boolean;
  verificacoes_fora_do_escopo: string[];
}

export function montarLimitacoes(contexto: CoberturaContextual, alergias: AvaliacaoAlergias): LimitacaoConhecida[] {
  const l: LimitacaoConhecida[] = [
    { codigo: 'regras_cadastradas_apenas', severidade: 'informativa', descricao: 'A avaliação considera apenas as regras cadastradas no sistema; não substitui o julgamento clínico nem a consulta à bula e a protocolos.' },
  ];
  if (contexto.limitacoes.includes(LIMITACAO_IDADE_PEDIATRICA)) {
    l.push({ codigo: 'faixa_pediatrica_sem_regras_especificas', severidade: 'relevante', descricao: LIMITACAO_IDADE_PEDIATRICA });
  }
  if (contexto.limitacoes.includes(LIMITACAO_IDADE_LEGADA)) {
    l.push({ codigo: 'idade_formato_legado', severidade: 'informativa', descricao: LIMITACAO_IDADE_LEGADA });
  }
  if (alergias.registros.length > 0) {
    l.push({ codigo: 'reatividade_cruzada_nao_avaliada', severidade: 'relevante', descricao: 'Reatividade cruzada entre moléculas ou classes NÃO é avaliada: nenhuma regra com fonte documentada foi cadastrada. O cruzamento de alergias é só por identidade molecular.' });
  }
  if (alergias.registros.some(r => r.valido && r.identificacao_molecular === 'classe_farmacologica')) {
    l.push({ codigo: 'alergia_a_classe_sem_avaliacao_molecular', severidade: 'relevante', descricao: 'Há alergia registrada a uma classe farmacológica: informação relevante AINDA NÃO avaliada molecularmente.' });
  }
  if (alergias.registros.some(r => r.valido && r.identificacao_molecular === 'nao_aplicavel')) {
    l.push({ codigo: 'excipientes_nao_avaliados', severidade: 'relevante', descricao: 'Há alergia não medicamentosa registrada: fora do escopo do cruzamento molecular atual; excipientes não são avaliados.' });
  }
  return l;
}

export function montarDetalheAvaliacao(integral: boolean, contexto: CoberturaContextual, limitacoes: LimitacaoConhecida[]): DetalheAvaliacao {
  const exigidos = contexto.itens.filter(i => i.exigido);
  const por = (estado: string) => exigidos.filter(i => i.estado === estado).map(i => i.campo);
  return {
    natureza: 'cobertura_tecnica_das_verificacoes_configuradas',
    homologacao_clinica: false,
    verificacoes_configuradas_executadas: integral,
    contextos_nao_informados: por('nao_informado'),
    contextos_invalidos: por('invalido'),
    contextos_nao_avaliados: por('nao_avaliado'),
    limitacoes_relevantes: limitacoes.filter(x => x.severidade === 'relevante').length,
    faixa_etaria_sem_estratificacao: limitacoes.some(x => x.codigo === 'faixa_pediatrica_sem_regras_especificas'),
    verificacoes_fora_do_escopo: [...VERIFICACOES_FORA_DO_ESCOPO],
  };
}
