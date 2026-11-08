// RM-107.1.1-E2.8.1 — concorrência entre abas no armazenamento de pendências: nunca sobrescrever em silêncio o que outra aba gravou.
// Simulação: "outra aba" = escrita direta no localStorage com outro `salvo_em` (o módulo guarda, por aba, o `salvo_em` que leu/gravou).
import { describe, it, expect, beforeEach } from 'vitest';
import { KEY_PENDENTES_V2, salvarPendencias, carregarPendencias, ultimosConflitos, __resetarVistosParaTeste } from '@/lib/pendencias-locais';
import type { Consultation } from '@/lib/types';

const A = 'usuario-A';
const c = (id: string, tentativas = 1): Consultation => ({
  id, status: 'concluida', paciente_nome: 'P', data: '2026-11-10T00:00:00.000Z',
  prescricao: { tipo: 'simples', paciente: { nome: 'P' }, medico: { nome: 'M', crm: 'C' }, itens: [{ id: 'i' }], data_emissao: 'x' },
  sync: { consulta: { status: 'synced', attempts: 1, backend_id: `srv-${id}` }, prescricao: { status: 'failed', attempts: tentativas, error_kind: 'rede' } },
} as unknown as Consultation);
const lerRaw = () => JSON.parse(localStorage.getItem(KEY_PENDENTES_V2)!) as { registros: { owner: string; salvo_em: string; consulta: Consultation }[] };
function outraAbaGrava(id: string, tentativas: number, quando: string) {
  const raw = lerRaw(); const r = raw.registros.find((x) => x.consulta.id === id)!;
  r.salvo_em = quando; r.consulta = { ...r.consulta, sync: { ...r.consulta.sync!, prescricao: { ...r.consulta.sync!.prescricao!, attempts: tentativas } } } as Consultation;
  localStorage.setItem(KEY_PENDENTES_V2, JSON.stringify(raw));
}

beforeEach(() => { localStorage.clear(); __resetarVistosParaTeste(); });

describe('E2.8.1 — multi-aba', () => {
  it('aba 1 grava; outra aba altera o MESMO registro; aba 1 (defasada) NÃO sobrescreve e o conflito é sinalizado', () => {
    salvarPendencias(A, [c('x')], () => 't1');
    outraAbaGrava('x', 7, 't2-outra-aba');
    const ok = salvarPendencias(A, [c('x', 2)], () => 't3');           // aba 1 ainda acredita ter t1
    expect(ok).toBe(true); expect(ultimosConflitos).toEqual(['x']);
    const r = lerRaw().registros[0]; expect(r.salvo_em).toBe('t2-outra-aba'); expect(r.consulta.sync!.prescricao!.attempts).toBe(7);   // versão da outra aba preservada
  });
  it('depois de recarregar (carregarPendencias) a aba vê a versão nova e volta a poder gravar', () => {
    salvarPendencias(A, [c('x')], () => 't1'); outraAbaGrava('x', 7, 't2');
    carregarPendencias(A);
    salvarPendencias(A, [c('x', 9)], () => 't3');
    expect(ultimosConflitos).toEqual([]); expect(lerRaw().registros[0].salvo_em).toBe('t3');
  });
  it('registro descartado por outra aba NÃO é ressuscitado em silêncio pela aba defasada', () => {
    salvarPendencias(A, [c('x')], () => 't1'); localStorage.removeItem(KEY_PENDENTES_V2);   // outra aba descartou
    salvarPendencias(A, [c('x')], () => 't2');
    expect(ultimosConflitos).toEqual(['x']); expect(localStorage.getItem(KEY_PENDENTES_V2)).toBeNull();
  });
  it('registros de ids diferentes criados em abas diferentes coexistem (merge por id, sem perda)', () => {
    salvarPendencias(A, [c('x')], () => 't1');
    __resetarVistosParaTeste();                                          // "aba 2": não leu nada
    carregarPendencias(A); salvarPendencias(A, [c('x'), c('y')], () => 't2');
    expect(ultimosConflitos).toEqual([]); expect(lerRaw().registros.map((r) => r.consulta.id).sort()).toEqual(['x', 'y']);
  });
  it('sincronização concluída (deixou de ser pendente) remove o registro; se outra aba o alterou antes, a remoção é recusada', () => {
    salvarPendencias(A, [c('x')], () => 't1'); outraAbaGrava('x', 5, 't2');
    const sincronizada = { ...c('x'), sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-x' }, prescricao: { status: 'synced', attempts: 1 } } } as unknown as Consultation;
    salvarPendencias(A, [sincronizada], () => 't3');
    expect(ultimosConflitos).toEqual(['x']); expect(lerRaw().registros).toHaveLength(1);
  });
});
