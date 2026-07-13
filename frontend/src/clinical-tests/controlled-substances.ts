// ============================================================
// PRESCREVE-AI — RM-22: Referência de medicamentos controlados
//
// Lista curada (Portaria SVS/MS 344/1998) de princípios ativos sob controle
// especial presentes na base. Usada como invariante de regressão: se um destes
// deixar de ser reconhecido/existir, a suíte clínica falha.
// ============================================================

/** Princípios ativos controlados (slug em minúsculas, sem acento). */
export const CONTROLLED_SUBSTANCES: Record<string, { lista: string; receita: string }> = {
  // A1/A2/A3 — entorpecentes e psicotrópicos (notificação A, amarela)
  morfina: { lista: 'A1', receita: 'Notificação A (amarela)' },
  metadona: { lista: 'A1', receita: 'Notificação A (amarela)' },
  oxicodona: { lista: 'A1', receita: 'Notificação A (amarela)' },
  hidromorfona: { lista: 'A1', receita: 'Notificação A (amarela)' },
  fentanil: { lista: 'A1', receita: 'Notificação A (amarela)' },
  fentanila: { lista: 'A1', receita: 'Notificação A (amarela)' },
  remifentanil: { lista: 'A1', receita: 'Notificação A (amarela)' },
  metilfenidato: { lista: 'A3', receita: 'Notificação A (amarela)' },
  // B1/B2 — psicotrópicos (notificação B, azul)
  clonazepam: { lista: 'B1', receita: 'Notificação B (azul)' },
  diazepam: { lista: 'B1', receita: 'Notificação B (azul)' },
  lorazepam: { lista: 'B1', receita: 'Notificação B (azul)' },
  alprazolam: { lista: 'B1', receita: 'Notificação B (azul)' },
  midazolam: { lista: 'B1', receita: 'Notificação B (azul)' },
  zolpidem: { lista: 'B1', receita: 'Notificação B (azul)' },
  fenobarbital: { lista: 'B1', receita: 'Notificação B (azul)' },
  buprenorfina: { lista: 'B1', receita: 'Notificação B (azul)' },
  // C1 — outras substâncias sob controle especial (receita de controle especial, 2 vias)
  tramadol: { lista: 'A2', receita: 'Notificação A (amarela)' },
  codeina: { lista: 'A2', receita: 'Notificação A (amarela)' },
  amitriptilina: { lista: 'C1', receita: 'Controle especial (2 vias)' },
  clomipramina: { lista: 'C1', receita: 'Controle especial (2 vias)' },
  carbamazepina: { lista: 'C1', receita: 'Controle especial (2 vias)' },
  fenitoina: { lista: 'C1', receita: 'Controle especial (2 vias)' },
  acido_valproico: { lista: 'C1', receita: 'Controle especial (2 vias)' },
  gabapentina: { lista: 'C1', receita: 'Controle especial (2 vias)' },
  pregabalina: { lista: 'C1', receita: 'Controle especial (2 vias)' },
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Retorna true se a molécula é substância controlada (Portaria 344). */
export function isControlled(molecula: string): boolean {
  const key = norm(molecula);
  if (CONTROLLED_SUBSTANCES[key]) return true;
  // tolera sufixos de contexto/sal (ex.: "fentanil-uti", "morfina-paliativa")
  return Object.keys(CONTROLLED_SUBSTANCES).some((k) => key === k || key.startsWith(k + '_'));
}

/** Retorna os metadados de controle (lista/receita) ou null. */
export function controlledInfo(molecula: string): { lista: string; receita: string } | null {
  const key = norm(molecula);
  if (CONTROLLED_SUBSTANCES[key]) return CONTROLLED_SUBSTANCES[key];
  const k = Object.keys(CONTROLLED_SUBSTANCES).find((x) => key === x || key.startsWith(x + '_'));
  return k ? CONTROLLED_SUBSTANCES[k] : null;
}
