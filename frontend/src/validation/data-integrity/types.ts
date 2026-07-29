// ============================================================
// PRESCREVE-AI — RM-40: Validador de Integridade de Dados Clínicos
//
// Garante que dados clínicos não entram/permanecem no sistema em estado
// semanticamente inconsistente — molécula, marca, classe, ATC, dose,
// unidade, frequência, indicação, população, idade, peso, dose máxima,
// fonte, proveniência, nível de evidência.
//
// Classificação de cada achado (4 níveis, nunca "corrigido
// silenciosamente" — RM-40 tarefa 6: nenhum default mascara a
// inconsistência encontrada):
//   - 'erro'            — inconsistência que torna o dado clinicamente
//                          perigoso ou logicamente impossível (ex.: dose
//                          máxima menor que a dose habitual, faixa etária
//                          invertida). Bloqueia o build (buildOk=false).
//   - 'warning'          — inconsistência que não é logicamente impossível
//                          mas exige revisão humana (ex.: ATC malformado,
//                          unidade ambígua).
//   - 'info_incompleta'  — dado ausente que impede uma validação mais
//                          profunda (ex.: fonte ausente) — não é um erro
//                          em si, mas marca o registro como não totalmente
//                          verificável.
//   - 'validado'         — nenhuma inconsistência encontrada nesta
//                          entidade para as regras aplicáveis.
// ============================================================

export type IntegridadeNivel = 'erro' | 'warning' | 'info_incompleta' | 'validado';

export interface AchadoIntegridade {
  /** Identificador estável da regra que disparou. */
  regra: string;
  nivel: IntegridadeNivel;
  /** Entidade afetada — drugId/moleculeId/id canônico. */
  entidade: string;
  mensagem: string;
  correcaoSugerida?: string;
}

export interface RelatorioIntegridade {
  timestamp: string;
  totalEntidadesAnalisadas: number;
  achados: AchadoIntegridade[];
  resumo: Record<IntegridadeNivel, number>;
  porRegra: Record<string, number>;
  /** true quando não há nenhum achado de nível 'erro'. */
  buildOk: boolean;
}
