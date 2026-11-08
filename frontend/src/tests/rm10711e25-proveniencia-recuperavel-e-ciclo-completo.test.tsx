// ============================================================
// RM-107.1.1-E2.5 — Proveniência recuperável (envelope mínimo) + ciclo completo recuperação × idempotência com fingerprint.
// O servidor aqui é um MODELO em memória que usa a canonicalização REAL do backend (`prescricao-fingerprint.util`) para decidir 200/409;
// a comprovação do servidor/banco real está nos specs do backend (PostgreSQL) — este arquivo NÃO a substitui.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({ ctx: null as null | import('react').Context<Record<string, unknown> | null> }));
vi.mock('@/lib/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/store')>();
  const R = await import('react');
  const useCtx = (): Record<string, unknown> | null => R.useContext(h.ctx as import('react').Context<Record<string, unknown> | null>);
  return { ...actual, useApp: () => useCtx() ?? {} };
});

import {
  reducer, executarSincronizacaoConsulta, podeSincronizar, persistirConsultasPendentes, restaurarConsultasPendentes,
  INITIAL_PAGINATION, type AppState, type Action, type SincronizarConsultaDeps,
} from '@/lib/store';
import type { Consultation, PrescriptionItem, DoseEstruturada } from '@/lib/types';
import { PrescricoesLocaisPendentes } from '@/components/modules/PrescricoesLocaisPendentes';
import { classificarSincronizacaoPrescricao } from '@/lib/sincronizacao-prescricao';
import { avaliarIntegridadeDto } from '@/lib/posologia-consistencia';
import { TimeoutError } from '@/lib/sync-engine';
import { construirProveniencia, normalizarProveniencia, VERSAO_PROVENIENCIA } from '@/lib/proveniencia-persistida';
import {
  itemParaRevisao as itemParaRevisaoOriginal, prepararItemParaStore, registrarEdicaoPosologica, reconfirmarDoseEstruturada, registroDeRecomendacaoTexto,
  registroDeInclusaoComFonteDaDose, registroDeInclusaoComDosePreenchida,
} from '@/lib/prescricao-proveniencia';
import { normalizarRegistro, type PosologiaRegistrada } from '@/lib/dose-contract';
import { fingerprintPrescricao } from '../../../backend/src/modules/consulta/prescricao-fingerprint.util';

/** Tipagem simplificada para os testes (o genérico de produção preserva o tipo do item de entrada). */
const itemParaRevisao = (it: unknown, em?: string) => itemParaRevisaoOriginal(it as never, em) as unknown as { posologia_registrada: PosologiaRegistrada; [k: string]: unknown };
const AppCtx = React.createContext<Record<string, unknown> | null>(null);
h.ctx = AppCtx;
const DTO: DoseEstruturada = { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' };
const KEY = 'prescreve_ai_consultas_pendentes';
const T = (n: number) => `2026-11-10T0${n}:00:00.000Z`;

const itemF2 = (over: Partial<PrescriptionItem> = {}): PrescriptionItem => {
  const base: PrescriptionItem = {
    id: 'i1', medicamento: 'Amoxicilina', concentracao: '500 mg', forma_farmaceutica: 'Comprimido', quantidade: '21 comprimidos',
    posologia: 'Amoxicilina 500 mg 8/8h', via: 'VO', duracao: '7 dias', uso_continuo: false, instrucoes_especiais: 'Tomar após refeição', dose_estruturada: DTO, ...over,
  };
  return { ...base, posologia_registrada: registroDeRecomendacaoTexto({ texto: base.posologia, dose: base.dose_estruturada, criado_em: T(0) }) };
};
const editar = (it: PrescriptionItem, campo: string, valor: string, em = T(1)): PrescriptionItem =>
  ({ ...it, [campo]: valor, posologia_registrada: registrarEdicaoPosologica(it.posologia_registrada, campo, (it as unknown as Record<string, unknown>)[campo], valor, em) });

const baseState = (): AppState => ({
  consultations: [], activeConsultation: null,
  settings: { medico: { nome: 'x', crm: 'x', especialidade: 'x' }, preferencia_laboratorio: 'sem_preferencia', tema: 'light', mostrar_evidencias_painel: true, alertas_interacao: true, idioma: 'pt-BR' },
  loading: false, error: null, currentUser: null, consultationDetailStatus: {}, consultationsPagination: INITIAL_PAGINATION,
});
const novaConsulta = (itens: PrescriptionItem[], id = 'local-1'): Consultation => ({
  id, status: 'concluida', paciente_nome: 'Paciente Teste', data: T(0),
  anamnese: { queixa_principal: 'x', hda: 'x', hpp: 'x', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} },
  prescricao: { tipo: 'simples', paciente: { nome: 'Paciente Teste' }, medico: { nome: 'M', crm: 'C' }, itens: itens.map(prepararItemParaStore) as PrescriptionItem[], data_emissao: T(0) },
} as Consultation);

/** Servidor-modelo: idempotência por chave + fingerprint canônico REAL (200 mesmo conteúdo / 409 conteúdo diferente / resposta perdida opcional). */
function servidor() {
  const porChave = new Map<string, { id: string; fp: string }>();
  const chamadas: Array<{ idempotency_key: string; medicamentos: Array<Record<string, unknown>>; consulta_id: string }> = [];
  let perder = 0; let n = 0;
  return {
    porChave, chamadas, perderRespostaNasProximas: (k: number) => { perder = k; },
    criarPrescricao: async (dados: { idempotency_key: string; medicamentos: Array<Record<string, unknown>>; consulta_id: string }) => {
      chamadas.push(JSON.parse(JSON.stringify(dados)));
      const fp = fingerprintPrescricao({ consulta_id: dados.consulta_id, medicamentos: dados.medicamentos });
      const existente = porChave.get(dados.idempotency_key);
      if (existente && existente.fp !== fp) throw Object.assign(new Error('Conflict'), { status: 409 });
      const r = existente ?? { id: `presc-${++n}`, fp }; porChave.set(dados.idempotency_key, r);
      if (perder > 0) { perder--; throw new TimeoutError(15000); }
      return { id: r.id };
    },
  };
}
function deps(st: { atual: AppState }, srv = servidor(), over: Partial<SincronizarConsultaDeps> = {}) {
  const d: SincronizarConsultaDeps = {
    criar: vi.fn().mockResolvedValue({ id: 'srv-1' }), criarDiagnostico: vi.fn().mockResolvedValue({ id: 'd' }), salvarRisco: vi.fn().mockResolvedValue({ id: 'r' }),
    criarPrescricao: srv.criarPrescricao as never, dispatch: (a: Action) => { st.atual = reducer(st.atual, a); }, sessaoValida: () => true, isAuthenticated: () => true, ...over,
  };
  return { d, srv };
}
const consultaNo = (s: AppState, id = 'local-1') => s.consultations.find(c => c.id === id)!;
const reload = (st: { atual: AppState }) => {
  persistirConsultasPendentes(st.atual.consultations);
  return { atual: reducer(baseState(), { type: 'RESTORE_PENDING_CONSULTATIONS', payload: restaurarConsultasPendentes() }) };
};
async function finalizadaComBloqueio(it: PrescriptionItem = itemF2()) {
  const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: novaConsulta([editar(it, 'posologia', 'Amoxicilina 1 g 8/8h (editada)')]) }) };
  await executarSincronizacaoConsulta(consultaNo(st.atual), deps(st).d);
  return st;
}

function Harness({ srv, inicial }: { srv: ReturnType<typeof servidor>; inicial: AppState }) {
  const [state, dispatch] = React.useReducer(reducer, inicial);
  const ref = React.useRef(state);
  React.useEffect(() => { ref.current = state; });
  const retrySync = React.useCallback(async (id: string) => {
    const c = ref.current.consultations.find(x => x.id === id)!;
    if (!podeSincronizar(c, new Set())) return;
    await executarSincronizacaoConsulta(c, deps({ atual: ref.current }, srv, { dispatch }).d);
  }, [srv]);
  return React.createElement(AppCtx.Provider, { value: { state, dispatch, auth: { backendMode: true, demoMode: false }, retrySync } },
    React.createElement(PrescricoesLocaisPendentes), React.createElement('output', { 'data-testid': 'estado-json' }, JSON.stringify(state.consultations)));
}
const estadoAtual = (): Consultation[] => JSON.parse(screen.getByTestId('estado-json').textContent ?? '[]');

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); cleanup(); });

// ═══════════ envelope ═══════════
describe('E2.5 — envelope mínimo de proveniência', () => {
  const parecerOk = { estado: 'consistente_conforme_origem' as const, motivo: '', transmissivel: true, reconfirmado: false };

  it('construção: original (origem, detalhe, versão do registro, criação), estado atual e contagem de alterações — só enums/nomes de campo/carimbos', () => {
    const reg = registroDeInclusaoComFonteDaDose({ fonte: 'catalogo_dose_habitual', texto: '500 mg', criado_em: T(0) });
    const edit = registrarEdicaoPosologica(reg, 'posologia', 'SEGREDO-ANTIGO', 'SEGREDO-NOVO', T(1))!;
    const prov = construirProveniencia(edit, parecerOk);
    expect(prov).toMatchObject({ v: VERSAO_PROVENIENCIA, original: { conhecida: true, origem: 'pre_preenchida_pelo_sistema', detalhe: 'catalogo_dose_habitual', versao_registro: 'posologia-1', criado_em: T(0) }, recuperacao: [], alteracoes: { total: 1, campos: ['posologia'] }, estrutura_dose: 'consistente_conforme_origem' });
    expect(JSON.stringify(prov)).not.toMatch(/SEGREDO|500 mg|Paciente|Amoxicilina/);   // nenhum valor/texto/pessoal
  });

  it('origem desconhecida do registro vira conhecida:false — NUNCA apresentada como origem original conhecida', () => {
    const prov = construirProveniencia(registroDeInclusaoComDosePreenchida({ texto: 'x' }), parecerOk);
    expect(prov.original).toEqual({ conhecida: false });
  });

  it('a proveniência ORIGINAL do envelope anterior nunca é sobrescrita; recuperações e alterações acumulam', () => {
    const anterior = construirProveniencia(itemF2().posologia_registrada!, parecerOk);
    const rev = itemParaRevisao({ ...itemF2(), proveniencia: anterior, posologia_registrada: undefined }, T(5));
    const novo = construirProveniencia(rev.posologia_registrada, parecerOk, anterior);
    expect(novo.original).toEqual(anterior.original); expect(novo.recuperacao).toEqual([{ em: T(5), tipo: 'revisada' }]);
    const novo2 = construirProveniencia(registrarEdicaoPosologica(rev.posologia_registrada, 'duracao', '7 dias', '10 dias', T(6))!, parecerOk, novo);
    expect(novo2.alteracoes.total).toBe(1); expect(novo2.recuperacao).toHaveLength(1);   // o mesmo evento de recuperação não é contado duas vezes
  });

  it('declaração do prescritor é separada, não é validação e perde a vigência com nova alteração', () => {
    const base = itemParaRevisao({ ...itemF2(), bloqueio_dto: { estado: 'divergente', motivo: 'x' }, posologia_registrada: undefined }, T(5)).posologia_registrada;
    const reutilizado = reconfirmarDoseEstruturada(base, T(6))!;
    const p1 = construirProveniencia(reutilizado, parecerOk);
    expect(p1.declaracao_prescritor).toEqual({ reutilizou_dto: true, em: T(6), campos: ['bloqueio_persistido'], vigente: true });
    const editado = registrarEdicaoPosologica(reutilizado, 'posologia', 'a', 'b', T(7))!;
    const p2 = construirProveniencia(editado, { ...parecerOk, estado: 'divergente', transmissivel: false });
    expect(p2.declaracao_prescritor!.vigente).toBe(false); expect(p2.estrutura_dose).toBe('divergente');
    expect(JSON.stringify(p2)).not.toMatch(/validad|segur|conferid|aprovad/i);
  });

  it('normalização tolerante: versão desconhecida, lixo e campos inválidos ⇒ null/saneado, nunca lança nem inventa origem', () => {
    for (const raw of [null, undefined, 7, 'x', [], {}, { v: 'prov-99' }, { v: 'prov-0', original: { conhecida: true, origem: 'contrato_dose', criado_em: 'x' } }]) expect(normalizarProveniencia(raw)).toBeNull();
    const n = normalizarProveniencia({ v: 'prov-1', original: { conhecida: true, origem: 'desconhecida', criado_em: 'x' }, recuperacao: [null, 3, { em: 'ok' }], alteracoes: { total: -5, campos: [1, 'a', 'a'] }, estrutura_dose: 'inventado' })!;
    expect(n.original).toEqual({ conhecida: false });                         // "desconhecida" declarada como conhecida é recusada
    expect(n.recuperacao).toEqual([{ em: 'ok', tipo: 'revisada' }]); expect(n.alteracoes).toEqual({ total: 0, campos: ['a'] }); expect(n.estrutura_dose).toBe('nao_verificavel');
    const ok = construirProveniencia(itemF2().posologia_registrada!, parecerOk); expect(normalizarProveniencia(JSON.parse(JSON.stringify(ok)))).toEqual(ok);   // idempotente
  });

  it('limites: no máximo 10 recuperações e 12 campos (armazenamento mínimo)', () => {
    let prov = construirProveniencia(itemF2().posologia_registrada!, parecerOk);
    for (let i = 0; i < 15; i++) prov = construirProveniencia(registrarEdicaoPosologica(itemParaRevisao({ ...itemF2(), posologia_registrada: undefined }, `2026-11-10T0${i % 10}:${String(i).padStart(2, '0')}:00.000Z`).posologia_registrada, `campo_${i}`, 'a', 'b', T(2))!, parecerOk, prov);
    expect(prov.recuperacao.length).toBeLessThanOrEqual(10); expect(prov.alteracoes.campos.length).toBeLessThanOrEqual(12); expect(prov.alteracoes.total).toBe(15);
  });
});

// ═══════════ persistência e recuperação ═══════════
describe('E2.5 — a proveniência sobrevive à finalização e à recuperação (e não vai ao backend)', () => {
  it('Panel→finalização: o item guardado traz o envelope; o payload ao servidor NÃO; o registro/trilha completos NÃO são persistidos', async () => {
    const it = itemF2(); const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: novaConsulta([it]) }) }; const { d, srv } = deps(st);
    await executarSincronizacaoConsulta(consultaNo(st.atual), d);
    expect(srv.chamadas[0].medicamentos).toEqual([{ molecula: 'Amoxicilina', dose: DTO, duracao: '7 dias', observacoes: 'Tomar após refeição' }]);
    expect(JSON.stringify(srv.chamadas[0])).not.toMatch(/proveniencia|prov-1|original/);
    persistirConsultasPendentes([{ ...consultaNo(st.atual), sync: { consulta: { status: 'failed', attempts: 1 } } }]);
    const raw = localStorage.getItem(KEY)!;
    expect(raw).toContain('"proveniencia"'); expect(raw).not.toMatch(/posologia_registrada|dose_divergente|reconfirmacoes|trilha|edicoes_manuais/);
    expect(restaurarConsultasPendentes()[0].prescricao!.itens[0].proveniencia).toMatchObject({ original: { conhecida: true, origem: 'recomendacao_texto' } });
  });

  it('item LEGADO (sem envelope) não ganha proveniência fabricada ao ser preparado; envelope ilegível é descartado no registro de revisão, não promovido', () => {
    const legado: PrescriptionItem = { ...itemF2(), posologia_registrada: undefined };
    expect(prepararItemParaStore(legado)).not.toHaveProperty('proveniencia');
    const rev = itemParaRevisao({ ...legado, proveniencia: { v: 'prov-99' } as never });
    expect(rev.posologia_registrada.origem).toBe('desconhecida');
    expect(prepararItemParaStore({ ...rev, posologia_registrada: rev.posologia_registrada }).proveniencia!.original).toEqual({ conhecida: false });
  });

  it('UI: a revisão mostra os QUATRO blocos separados; origem restaurada quando conhecida; "não conhecida" quando não há proveniência', async () => {
    const comEnvelope = await finalizadaComBloqueio(itemF2());
    const semEnvelope = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: (() => { const c = novaConsulta([editar(itemF2(), 'posologia', 'x')]); c.prescricao!.itens = c.prescricao!.itens.map(({ proveniencia, ...r }) => { void proveniencia; return r as PrescriptionItem; }); return c; })() }) };
    await executarSincronizacaoConsulta(consultaNo(semEnvelope.atual), deps(semEnvelope).d);
    for (const [st, esperado] of [[comEnvelope, /texto de recomendação/], [semEnvelope, /não conhecida/]] as const) {
      const novo = reload(st); cleanup(); render(React.createElement(Harness, { srv: servidor(), inicial: novo.atual }));
      const u = userEvent.setup(); await u.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
      const rev = await screen.findByTestId('revisao-prescricao');
      expect(within(rev).getByTestId('prov-original-0').textContent).toMatch(esperado);
      expect(within(rev).getByTestId('prov-recuperacao-0').textContent).toMatch(/nenhuma revisão salva anteriormente/);
      expect(within(rev).getByTestId('prov-declaracao-0').textContent).toBe('nenhuma');
      expect(within(rev).getByTestId('prov-estado-0').textContent).toMatch(/divergente do texto editado/);
      localStorage.clear();
    }
  });
});

// ═══════════ ciclo completo (Fase 5) ═══════════
describe('E2.5 — ciclo completo: finalizar → persistir → reabrir → revisar → reutilizar → salvar → enviar → resposta perdida → reenviar → divergência', () => {
  it('passos 1–13: sem duplicação, divergência recusada, nenhuma alteração numérica, proveniência original preservada', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // 1–2. finalizar localmente (consulta sincroniza, prescrição bloqueada) e persistir
    const st = await finalizadaComBloqueio(itemF2());
    expect(consultaNo(st.atual).sync!.prescricao).toMatchObject({ status: 'failed', error_kind: 'integridade' });
    // 3–4. fechar/reabrir e recuperar
    const novo = reload(st); const srv = servidor();
    cleanup(); render(React.createElement(Harness, { srv, inicial: novo.atual }));
    const u = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTimeAsync(ms) });
    // 5–7. revisar o texto, reutilizar o DTO, salvar
    await u.click(await screen.findByRole('button', { name: 'Revisar prescrição' }));
    const rev = await screen.findByTestId('revisao-prescricao');
    await u.click(within(rev).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    await u.click(within(rev).getByRole('button', { name: 'Salvar revisão neste dispositivo' }));
    await screen.findByTestId('revisao-salva'); expect(srv.chamadas).toHaveLength(0);
    let c = estadoAtual()[0]; const item = c.prescricao!.itens[0];
    expect(item).not.toHaveProperty('bloqueio_dto'); expect(item.dose_estruturada).toEqual(DTO);
    expect(item.proveniencia).toMatchObject({
      original: { conhecida: true, origem: 'recomendacao_texto', criado_em: T(0) },       // origem original preservada (não virou "desconhecida")
      recuperacao: [{ tipo: 'revisada' }], declaracao_prescritor: { reutilizou_dto: true, vigente: true }, estrutura_dose: 'consistente_conforme_origem',
    });
    expect(item.proveniencia!.alteracoes.campos).toContain('posologia');
    // 8–9. enviar; o servidor grava mas a resposta se perde
    srv.perderRespostaNasProximas(3);
    await u.click(within(screen.getByTestId('pendente-local-1')).getByRole('button', { name: 'Reenviar ao servidor' }));
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(estadoAtual()[0].sync!.prescricao!.status).toBe('failed'));
    c = estadoAtual()[0];
    const chave = c.sync!.prescricao!.idempotency_key!; expect(srv.porChave.size).toBe(1);   // o servidor já tem 1
    expect(classificarSincronizacaoPrescricao(c, { backendMode: true }).estado).toBe('falha_de_rede');
    // 10–11. repetir com a MESMA chave: devolve o mesmo registro, sem duplicar
    await u.click(within(screen.getByTestId('pendente-local-1')).getByRole('button', { name: 'Reenviar ao servidor' }));
    await waitFor(() => expect(screen.queryByTestId('pendente-local-1')).toBeNull());
    expect(srv.porChave.size).toBe(1); expect(new Set(srv.chamadas.map(x => x.idempotency_key))).toEqual(new Set([chave]));
    expect(srv.chamadas.every(x => JSON.stringify(x.medicamentos[0].dose) === JSON.stringify(DTO))).toBe(true);   // 13. nenhum valor alterado em nenhuma tentativa
    // 12. mesma chave, payload alterado ⇒ o servidor recusa (409) e o cliente NÃO insiste
    const alterada: Consultation = { ...estadoAtual()[0], sync: { consulta: estadoAtual()[0].sync!.consulta, prescricao: { status: 'failed', attempts: 3, error_kind: 'rede', idempotency_key: chave } } };
    alterada.prescricao = { ...alterada.prescricao!, itens: [{ ...alterada.prescricao!.itens[0], dose_estruturada: { ...DTO, valor: 501 } }] };
    const st2 = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: alterada }) };
    const antes = srv.chamadas.length;
    const r = await executarSincronizacaoConsulta(alterada, deps(st2, srv).d);
    expect(r.prescricao).toBe('failed'); expect(srv.chamadas.length - antes).toBe(1);                    // 409 é definitivo: 1 tentativa, sem retry
    expect(consultaNo(st2.atual).sync!.prescricao).toMatchObject({ status: 'failed', error_kind: 'rejeitado' });
    expect(classificarSincronizacaoPrescricao(consultaNo(st2.atual), { backendMode: true })).toMatchObject({ estado: 'falha_de_servidor', pode_reenviar: false });
    expect(srv.porChave.size).toBe(1);
  }, 60000);

  it('a mesma chave com outro conteúdo é recusada também para variações de dose/duração/ordem (o modelo usa a canonicalização real do backend)', async () => {
    const srv = servidor(); const base = { consulta_id: 'c', idempotency_key: 'K', medicamentos: [{ molecula: 'A', dose: DTO, duracao: '7 dias' }] };
    await srv.criarPrescricao(base);
    await expect(srv.criarPrescricao({ ...base, medicamentos: [{ molecula: 'A', dose: { ...DTO, valor: 501 }, duracao: '7 dias' }] })).rejects.toMatchObject({ status: 409 });
    await expect(srv.criarPrescricao({ ...base, medicamentos: [{ molecula: 'A', dose: DTO, duracao: '8 dias' }] })).rejects.toMatchObject({ status: 409 });
    expect((await srv.criarPrescricao({ ...base, medicamentos: [{ duracao: '7 dias', dose: { via: 'VO', frequencia: '3x/dia', unidade: 'mg', valor: 500.0 }, molecula: 'A' }] })).id).toBe('presc-1');
  });
});

// ═══════════ compatibilidade (Fase 6) ═══════════
describe('E2.5 — compatibilidade: nada é promovido nem descartado', () => {
  it('consulta pendente ANTIGA (sem envelope, sem error_kind, syncing) continua legível; já sincronizada some da lista; parcial não quebra', async () => {
    const antiga = novaConsulta([{ ...itemF2(), posologia_registrada: undefined }], 'old-1'); antiga.sync = { consulta: { status: 'synced', attempts: 1, backend_id: 'b' }, prescricao: { status: 'failed', attempts: 2 } };
    const jaSync = novaConsulta([itemF2()], 'old-2'); jaSync.sync = { consulta: { status: 'synced', attempts: 1, backend_id: 'b2' }, prescricao: { status: 'synced', attempts: 1, backend_id: 'p' } };
    const parcial = { id: 'old-3', paciente_nome: 'P', status: 'concluida', data: T(0), sync: { prescricao: { status: 'failed', attempts: 1 } } } as unknown as Consultation;
    localStorage.setItem(KEY, JSON.stringify([antiga, jaSync, parcial, 'lixo', null]));
    const rest = restaurarConsultasPendentes(); expect(rest.map(c => c.id)).toEqual(['old-1', 'old-2', 'old-3']);
    expect(classificarSincronizacaoPrescricao(rest[0], { backendMode: true }).estado).toBe('desconhecido');   // falha antiga sem classificação ≠ sucesso
    expect(classificarSincronizacaoPrescricao(rest[1], { backendMode: true }).estado).toBe('sincronizada');
    expect(classificarSincronizacaoPrescricao(rest[2], { backendMode: true }).estado).toBe('sem_prescricao_local');
    cleanup(); render(React.createElement(Harness, { srv: servidor(), inicial: reducer(baseState(), { type: 'RESTORE_PENDING_CONSULTATIONS', payload: rest }) }));
    expect(await screen.findByTestId('pendente-old-1')).toBeTruthy(); expect(screen.queryByTestId('pendente-old-2')).toBeNull(); expect(screen.queryByTestId('pendente-old-3')).toBeNull();
  });

  it('prescrição sem fingerprint/sem proveniência: o envelope não é exigido para enviar; item legado com DTO segue como antes (nao_verificavel, transmissível)', async () => {
    const legado: PrescriptionItem = { ...itemF2(), posologia_registrada: undefined };
    expect(avaliarIntegridadeDto(legado).estado).toBe('nao_verificavel');
    const st = { atual: reducer(baseState(), { type: 'NEW_CONSULTATION', payload: novaConsulta([legado]) }) }; const { d, srv } = deps(st);
    expect((await executarSincronizacaoConsulta(consultaNo(st.atual), d)).prescricao).toBe('synced'); expect(srv.chamadas[0].medicamentos[0].dose).toEqual(DTO);
  });

  it('registro com versão desconhecida e envelope de versão desconhecida: tratados como não verificável/origem não conhecida; marcador de bloqueio continua valendo', () => {
    const raw = { versao_registro: 'posologia-99', origem: 'contrato_dose', avaliacao: { tipo: 'avaliada' } };
    const it = { ...itemF2(), posologia_registrada: raw as never, proveniencia: { v: 'prov-99' } as never };
    expect(avaliarIntegridadeDto(it as never).estado).toBe('nao_verificavel');
    expect(normalizarRegistro(raw).avaliacao.tipo).toBe('nao_avaliada');
    expect(avaliarIntegridadeDto({ ...it, bloqueio_dto: { estado: 'divergente', motivo: 'x' } } as never).estado).toBe('divergente');
    const rev = itemParaRevisao(it as never); expect(rev.posologia_registrada.origem).toBe('desconhecida');
  });

  it('nenhum registro é promovido: nem a restauração da origem original nem a recuperação criam avaliação', () => {
    const prov = construirProveniencia(registroDeInclusaoComFonteDaDose({ fonte: 'calculo_peso_simples', criado_em: T(0) }), { estado: 'consistente_conforme_origem', motivo: '', transmissivel: true, reconfirmado: false });
    const rev = itemParaRevisao({ ...itemF2(), proveniencia: prov, posologia_registrada: undefined });
    expect(rev.posologia_registrada.origem).toBe('pre_preenchida_pelo_sistema'); expect(rev.posologia_registrada.origem_detalhe).toBe('calculo_peso_simples');
    expect(rev.posologia_registrada.avaliacao.tipo).toBe('nao_avaliada'); expect(rev.posologia_registrada.criado_em).toBe(T(0));
    expect(rev.posologia_registrada.trilha!.map(e => e.tipo)).toEqual(['criacao', 'recuperacao']);
    expect(JSON.stringify(rev.posologia_registrada)).not.toMatch(/regra_clinicamente_validada/);
  });
});
