// ============================================================
// RM-105.2.2 — Integridade entre pacientes na sessão de prescrição rápida
//
// Os dados clínicos digitados (paciente, contexto, alergias) pertencem a UM paciente e NÃO fazem
// parte de um protocolo. Antes de carregar outro protocolo, a tela precisa saber se há dados
// clínicos preenchidos para pedir confirmação de descarte. Esta função só inspeciona; não altera nada.
// ============================================================

export interface DadosClinicosDaSessao {
  nome: string;
  idade: string;
  sexo: string;
  peso: string;
  altura: string;
  creatinina: string;
  child_pugh: string;
  diagnostico: string;
  observacoes: string;
  gestante: string;
  lactante: string;
  alergias_status: string;
  alergias: ReadonlyArray<unknown>;
}

/** Rótulos legíveis dos campos clínicos preenchidos (vazio = nada a descartar). */
export function dadosClinicosPreenchidos(p: DadosClinicosDaSessao): string[] {
  const campos: Array<[string, boolean]> = [
    ['nome', p.nome.trim() !== ''],
    ['idade', p.idade.trim() !== ''],
    ['sexo', p.sexo !== ''],
    ['peso', p.peso.trim() !== ''],
    ['altura', p.altura.trim() !== ''],
    ['creatinina', p.creatinina.trim() !== ''],
    ['Child-Pugh', p.child_pugh !== ''],
    ['diagnóstico', p.diagnostico.trim() !== ''],
    ['observações', p.observacoes.trim() !== ''],
    ['gestação', p.gestante !== ''],
    ['lactação', p.lactante !== ''],
    ['alergias', p.alergias_status !== 'nao_informado' || p.alergias.length > 0],
  ];
  return campos.filter(([, preenchido]) => preenchido).map(([nome]) => nome);
}
