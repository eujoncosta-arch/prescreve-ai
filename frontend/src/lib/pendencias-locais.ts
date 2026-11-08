// RM-107.1.1-E2.8 — Retenção segura, propriedade e minimização das prescrições/consultas locais PENDENTES.
//
// MODELO DE AMEAÇA (limites — leia antes de confiar):
//  - O armazenamento é o `localStorage` do navegador. QUALQUER pessoa/script com acesso ao perfil do navegador consegue LER esses dados (DevTools);
//    isolamento por proprietário aqui impede que a APLICAÇÃO apresente, revise ou reenvie dados de outro usuário — NÃO é proteção criptográfica
//    e NÃO impede leitura direta do armazenamento. Nenhuma criptografia própria é implementada nem afirmada.
//  - A principal proteção é a MINIMIZAÇÃO: persiste-se apenas o necessário para recuperar/sincronizar (ver `minimizarConsultaParaPersistencia`).
//  - O proprietário é o `sub` do token, usado SOMENTE depois de a sessão ser verificada pelo servidor (ver AppProvider). A mera presença de um
//    `owner` no JSON não autoriza nada: a restauração, a revisão e o envio comparam com a identidade verificada da sessão atual.
//  - Registros LEGADOS (formato v1, sem proprietário) ficam em QUARENTENA: nunca são carregados nem atribuídos ao usuário atual automaticamente.
//    Só há dois caminhos explícitos: descarte confirmado, ou verificação de propriedade pelo SERVIDOR (apenas para registros com `backend_id`).
//  - Expiração de sessão e logout NÃO apagam pendências (apenas credenciais e demais dados clínicos locais); o descarte é sempre uma ação explícita.
// Este módulo não faz chamadas de rede e não toca motores, doses ou regras clínicas.

import type { Consultation, Prescription } from './types';

export const KEY_PENDENTES_V2 = 'prescreve_ai_pendentes_v2';
/** Formato v1 (RM-45/E2.4): sem proprietário. Tratado como quarentena. */
export const KEY_PENDENTES_LEGADO = 'prescreve_ai_consultas_pendentes';
export const ROTULO_IDENTIFICACAO_NAO_RETIDA = 'Identificação não retida neste dispositivo';

export interface RegistroPendente { owner: string; salvo_em: string; consulta: Consultation }
interface ArmazenamentoV2 { v: 2; registros: RegistroPendente[] }

/** Consulta com algo ainda NÃO confirmado pelo servidor que só existe neste dispositivo. */
export function consultaTemPendenciaLocal(c: Consultation): boolean {
  const status = c.sync?.consulta?.status;
  if (status && status !== 'synced') return true;
  const p = c.sync?.prescricao;
  return !!c.prescricao?.itens?.length && !!p && p.status !== 'synced';
}

const consultaSincronizada = (c: Consultation): boolean => c.sync?.consulta?.status === 'synced' && !!c.sync.consulta.backend_id;

/**
 * Minimização (matriz campo × necessidade no relatório E2.8).
 * Sempre removidos: CPF, endereço, data de nascimento e demais dados cadastrais do paciente; apoio diagnóstico, plano terapêutico, segurança,
 * prognóstico e detalhes recuperados do backend (não são necessários para recuperar nem sincronizar).
 * Consulta já sincronizada: também saem `anamnese`, diagnóstico/risco e o nome do paciente (o servidor já os tem).
 * Consulta não sincronizada: mantém `anamnese`, `diagnostico_estruturado` e `risco_calculado` (necessários para o envio) e o nome.
 */
export function minimizarConsultaParaPersistencia(c: Consultation): Consultation {
  const sync = consultaSincronizada(c);
  const p = c.prescricao;
  const prescricao: Prescription | undefined = p ? {
    ...(p.id ? { id: p.id } : {}), tipo: p.tipo,
    paciente: { nome: sync ? ROTULO_IDENTIFICACAO_NAO_RETIDA : (p.paciente?.nome ?? '') },
    medico: { nome: p.medico?.nome ?? '', crm: p.medico?.crm ?? '' },
    itens: p.itens, ...(p.orientacoes_gerais ? { orientacoes_gerais: p.orientacoes_gerais } : {}), ...(p.retorno ? { retorno: p.retorno } : {}),
    data_emissao: p.data_emissao,
  } : undefined;
  return {
    id: c.id, status: c.status, data: c.data,
    paciente_nome: sync ? ROTULO_IDENTIFICACAO_NAO_RETIDA : c.paciente_nome,
    ...(sync ? {} : {
      ...(c.anamnese ? { anamnese: c.anamnese } : {}),
      ...(c.diagnostico_estruturado ? { diagnostico_estruturado: c.diagnostico_estruturado } : {}),
      ...(c.risco_calculado ? { risco_calculado: c.risco_calculado } : {}),
    }),
    ...(prescricao ? { prescricao } : {}),
    ...(c.sync ? { sync: c.sync } : {}),
    ...(c.temPrescricaoNoBackend !== undefined ? { temPrescricaoNoBackend: c.temPrescricaoNoBackend } : {}),
  } as Consultation;
}

/** Um `syncing` persistido seria uma mentira após o reload (não há requisição em voo). */
export function normalizarConsultaRestaurada(c: Consultation): Consultation {
  let r = c;
  if (r.sync?.consulta?.status === 'syncing') {
    r = { ...r, sync: { ...r.sync, consulta: { ...r.sync.consulta, status: 'failed', error: 'Sincronização interrompida (recarregamento da página) — tentando novamente' } } };
  }
  if (r.sync?.prescricao?.status === 'syncing') {
    r = { ...r, sync: { ...r.sync, prescricao: { ...r.sync.prescricao, status: 'failed', error_kind: 'interrompida', error: 'Envio da prescrição interrompido (recarregamento da página) — não confirmado pelo servidor' } } };
  }
  return r;
}

// ── leitura/escrita tolerantes ───────────────────────────────────────────────
type Leitura = { estado: 'ausente' } | { estado: 'ilegivel' } | { estado: 'ok'; registros: RegistroPendente[] };

const registroValido = (r: unknown): r is RegistroPendente =>
  !!r && typeof r === 'object' && typeof (r as RegistroPendente).owner === 'string' && (r as RegistroPendente).owner.length > 0
  && !!(r as RegistroPendente).consulta && typeof (r as RegistroPendente).consulta === 'object' && typeof (r as RegistroPendente).consulta.id === 'string';

function ler(): Leitura {
  if (typeof window === 'undefined') return { estado: 'ausente' };
  try {
    const raw = localStorage.getItem(KEY_PENDENTES_V2);
    if (raw === null) return { estado: 'ausente' };
    const parsed = JSON.parse(raw) as Partial<ArmazenamentoV2>;
    if (!parsed || parsed.v !== 2 || !Array.isArray(parsed.registros)) return { estado: 'ilegivel' };
    return { estado: 'ok', registros: parsed.registros.filter(registroValido) };
  } catch { return { estado: 'ilegivel' }; }
}

function escrever(registros: RegistroPendente[]): boolean {
  try {
    if (registros.length === 0) localStorage.removeItem(KEY_PENDENTES_V2);
    else localStorage.setItem(KEY_PENDENTES_V2, JSON.stringify({ v: 2, registros } satisfies ArmazenamentoV2));
    return true;
  } catch { return false; }   // quota/modo privado: a perda de recuperação é aceita; nunca trava a UI
}

/**
 * Salva as pendências do PROPRIETÁRIO. Registros de OUTROS proprietários são preservados intactos (nunca lidos para a memória nem alterados).
 * Semântica por id (nunca apaga o que ainda não foi restaurado): para cada consulta em memória, substitui o registro do proprietário (ou o remove,
 * se deixou de ser pendente — ex.: sincronizada com sucesso); registros do proprietário ausentes da memória são MANTIDOS.
 * Armazenamento ilegível NÃO é sobrescrito (evita destruir dados que não conseguimos interpretar).
 */
// E2.8.1 — concorrência entre abas: cada aba lembra o `salvo_em` que LEU/ESCREVEU de cada registro. Se o armazenamento tem outro `salvo_em` (outra aba
// gravou depois), a gravação DESTE registro é RECUSADA (nunca sobrescreve em silêncio) e o id é devolvido em `ultimosConflitos` para a UI avisar/recarregar.
const vistos = new Map<string, string>();
const chaveVisto = (owner: string, id: string) => `${owner}::${id}`;
export let ultimosConflitos: string[] = [];
/** Apenas para testes: simula uma aba nova (sem memória do que leu). */
export function __resetarVistosParaTeste(): void { vistos.clear(); ultimosConflitos = []; }

export function salvarPendencias(owner: string, consultas: Consultation[], agora: () => string = () => new Date().toISOString()): boolean {
  ultimosConflitos = [];
  if (!owner) return false;
  const lido = ler();
  if (lido.estado === 'ilegivel') return false;
  const atuais = lido.estado === 'ok' ? lido.registros : [];
  const emMemoria = new Map(consultas.map(c => [c.id, c] as const));
  const resultado: RegistroPendente[] = [];
  for (const r of atuais) {
    if (r.owner !== owner) { resultado.push(r); continue; }              // outro proprietário: intocado
    const c = emMemoria.get(r.consulta.id);
    if (!c) { resultado.push(r); continue; }                             // ainda não restaurado/visível: mantido
    emMemoria.delete(r.consulta.id);
    if (vistos.get(chaveVisto(owner, r.consulta.id)) !== r.salvo_em) {   // outra aba gravou depois do que esta aba viu ⇒ NÃO sobrescreve
      resultado.push(r); ultimosConflitos.push(r.consulta.id); continue;
    }
    if (!consultaTemPendenciaLocal(c)) vistos.delete(chaveVisto(owner, r.consulta.id));
    else {
      const salvo_em = agora(); resultado.push({ owner, salvo_em, consulta: minimizarConsultaParaPersistencia(c) });
    }
  }
  for (const c of emMemoria.values()) {
    if (!consultaTemPendenciaLocal(c)) { vistos.delete(chaveVisto(owner, c.id)); continue; }
    if (vistos.has(chaveVisto(owner, c.id))) { ultimosConflitos.push(c.id); continue; }   // removida por outra aba (descarte): não ressuscita em silêncio
    resultado.push({ owner, salvo_em: agora(), consulta: minimizarConsultaParaPersistencia(c) });
  }
  const ok = escrever(resultado);
  if (ok) for (const r of resultado) if (r.owner === owner && !ultimosConflitos.includes(r.consulta.id)) vistos.set(chaveVisto(owner, r.consulta.id), r.salvo_em);
  return ok;
}

/** Pendências do proprietário VERIFICADO (nunca de outro). Cada consulta recebe `proprietario_id` em memória. */
export function carregarPendencias(owner: string): Consultation[] {
  const lido = ler();
  if (!owner || lido.estado !== 'ok') return [];
  return lido.registros.filter(r => r.owner === owner).map(r => { vistos.set(chaveVisto(owner, r.consulta.id), r.salvo_em); return { ...normalizarConsultaRestaurada(r.consulta), proprietario_id: owner }; });
}

/** Somente contagem (sem PHI). */
export function contarPendenciasDoProprietario(owner: string): number {
  const lido = ler();
  return owner && lido.estado === 'ok' ? lido.registros.filter(r => r.owner === owner).length : 0;
}

/** Descarte EXPLÍCITO das pendências do próprio proprietário (nunca de outros). Retorna quantas foram descartadas. */
export function descartarPendenciasDoProprietario(owner: string): number {
  const lido = ler();
  if (!owner || lido.estado !== 'ok') return 0;
  const restantes = lido.registros.filter(r => r.owner !== owner);
  for (const k of [...vistos.keys()]) if (k.startsWith(`${owner}::`)) vistos.delete(k);   // descarte PRÓPRIO: esta aba não trata a ausência como conflito
  const n = lido.registros.length - restantes.length;
  escrever(restantes);
  return n;
}

// ── quarentena do formato legado (sem proprietário) ──────────────────────────
function lerLegado(): Consultation[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY_PENDENTES_LEGADO) ?? 'null') as unknown;
    return Array.isArray(parsed) ? (parsed as unknown[]).filter((c): c is Consultation => !!c && typeof c === 'object' && typeof (c as Consultation).id === 'string') : [];
  } catch { return []; }
}
/** Somente contagem (sem PHI). */
export const contarRegistrosLegadosSemProprietario = (): number => lerLegado().length;
/** Descarte EXPLÍCITO dos registros sem proprietário. */
export function descartarRegistrosLegados(): number {
  const n = lerLegado().length;
  try { localStorage.removeItem(KEY_PENDENTES_LEGADO); } catch { /* melhor esforço */ }
  return n;
}
/**
 * Recuperação explícita de registros legados COM `backend_id`: só passam a pertencer ao usuário se o SERVIDOR confirmar a propriedade
 * (`verificar(backendId)` ⇒ true, p.ex. `GET /api/consulta/:id` bem-sucedido para este usuário). Falha/negação/erro de rede ⇒ permanece em quarentena.
 * Registros sem `backend_id` (nunca sincronizados) NÃO podem ser verificados e permanecem em quarentena.
 */
export async function reivindicarLegadoVerificado(owner: string, verificar: (backendId: string) => Promise<boolean>): Promise<{ reivindicados: number; mantidosEmQuarentena: number }> {
  const legado = lerLegado();
  const restantes: Consultation[] = []; const aceitos: Consultation[] = [];
  for (const c of legado) {
    const backendId = c.sync?.consulta?.backend_id;
    let ok = false;
    if (owner && backendId) { try { ok = await verificar(backendId); } catch { ok = false; } }
    (ok ? aceitos : restantes).push(c);
  }
  if (aceitos.length > 0) {
    const lido = ler();
    if (lido.estado === 'ilegivel') return { reivindicados: 0, mantidosEmQuarentena: legado.length };
    const base = lido.estado === 'ok' ? lido.registros : [];
    const novos = aceitos.filter(c => !base.some(r => r.owner === owner && r.consulta.id === c.id)).map(c => ({ owner, salvo_em: new Date().toISOString(), consulta: minimizarConsultaParaPersistencia(c) }));
    if (!escrever([...base, ...novos])) return { reivindicados: 0, mantidosEmQuarentena: legado.length };
  }
  try { if (restantes.length === 0) localStorage.removeItem(KEY_PENDENTES_LEGADO); else localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify(restantes)); } catch { /* melhor esforço */ }
  return { reivindicados: aceitos.length, mantidosEmQuarentena: restantes.length };
}

/** O usuário atual pode agir (ver/revisar/reenviar) sobre esta consulta? Consulta criada na sessão (sem marcador) é do usuário atual; com marcador, só o proprietário. */
export function consultaPertenceAoUsuario(c: Pick<Consultation, 'proprietario_id'>, usuarioId: string | null | undefined): boolean {
  if (!usuarioId) return false;
  return !c.proprietario_id || c.proprietario_id === usuarioId;
}
