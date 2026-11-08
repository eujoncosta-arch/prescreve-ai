// ============================================================
// RM-107.1.1-E2.8 — Retenção segura, propriedade e minimização das pendências locais (módulo `pendencias-locais`, api-client e reducer).
// IMPORTANTE: estes testes provam o isolamento PELA APLICAÇÃO. Não provam proteção contra leitura direta do `localStorage` (não há criptografia).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KEY_PENDENTES_V2, KEY_PENDENTES_LEGADO, ROTULO_IDENTIFICACAO_NAO_RETIDA,
  salvarPendencias, carregarPendencias, contarPendenciasDoProprietario, descartarPendenciasDoProprietario,
  contarRegistrosLegadosSemProprietario, descartarRegistrosLegados, reivindicarLegadoVerificado,
  minimizarConsultaParaPersistencia, consultaPertenceAoUsuario, consultaTemPendenciaLocal, __resetarVistosParaTeste,
} from '@/lib/pendencias-locais';
import { reducer, INITIAL_PAGINATION, executarSincronizacaoConsulta, type AppState, type SincronizarConsultaDeps } from '@/lib/store';
import type { Consultation, PrescriptionItem } from '@/lib/types';

const A = 'usuario-A'; const B = 'usuario-B';
const ITEM: PrescriptionItem = {
  id: 'i1', medicamento: 'Amoxicilina', concentracao: '500 mg', forma_farmaceutica: 'Comprimido', quantidade: '21', posologia: 'Amoxicilina 500 mg 8/8h', via: 'VO', duracao: '7 dias', uso_continuo: false,
  dose_estruturada: { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' },
  proveniencia: { v: 'prov-1', original: { conhecida: true, origem: 'recomendacao_texto', versao_registro: 'posologia-1', criado_em: '2026-11-10T00:00:00.000Z' }, recuperacao: [], alteracoes: { total: 1, campos: ['posologia'] }, estrutura_dose: 'consistente_conforme_origem' },
};
function consulta(id: string, over: Partial<Consultation> = {}): Consultation {
  return {
    id, status: 'concluida', paciente_nome: `Paciente ${id}`, data: '2026-11-10T00:00:00.000Z',
    anamnese: { queixa_principal: 'SEGREDO-ANAMNESE', hda: 'hda', hpp: '', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} },
    plano_terapeutico: { diagnostico_selecionado: 'SEGREDO-PLANO', farmacologico: [] } as never,
    prescricao: { tipo: 'simples', paciente: { nome: `Paciente ${id}`, cpf: '123.456.789-00', endereco: 'Rua do Segredo, 1', data_nascimento: '1980-01-01' }, medico: { nome: 'Dr. M', crm: 'CRM 1' }, itens: [ITEM], data_emissao: '2026-11-10T00:00:00.000Z' },
    sync: { consulta: { status: 'synced', attempts: 1, backend_id: `srv-${id}` }, prescricao: { status: 'failed', attempts: 1, error_kind: 'rede' } },
    ...over,
  } as Consultation;
}
const naoSincronizada = (id: string) => consulta(id, { sync: { consulta: { status: 'failed', attempts: 1, error_kind: 'rede' } } as never });
const baseState = (o: Partial<AppState> = {}): AppState => ({
  consultations: [], activeConsultation: null,
  settings: { medico: { nome: 'x', crm: 'x', especialidade: 'x' }, preferencia_laboratorio: 'sem_preferencia', tema: 'light', mostrar_evidencias_painel: true, alertas_interacao: true, idioma: 'pt-BR' },
  loading: false, error: null, currentUser: null, consultationDetailStatus: {}, consultationsPagination: INITIAL_PAGINATION, ...o,
});

beforeEach(() => { __resetarVistosParaTeste(); localStorage.clear(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

// ═══════════ F-1: expiração e logout ═══════════
describe('E2.8 — F-1: expiração de sessão e logout NÃO apagam pendências em silêncio', () => {
  async function apiClientReal() {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development'); vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.exemplo.com'); vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
    vi.resetModules();
    return import('@/lib/api-client');
  }
  const semear = () => {
    salvarPendencias(A, [consulta('c1')]);
    localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify([consulta('legado1')]));
    localStorage.setItem('prescreve-ai-favoritos', '[{"id":"fav"}]'); localStorage.setItem('prescreve_ai_historico', '[1]'); localStorage.setItem('prescreve_theme', 'dark');
    localStorage.setItem('prescreve_ai_access_token', 'a.b.c'); localStorage.setItem('prescreve_ai_refresh_token', 'r');
  };

  it('1. 401 sem refresh (sessão expirada): credenciais e demais dados clínicos locais saem (FE-03), mas as PENDÊNCIAS (v2) e o registro legado PERMANECEM', async () => {
    const { consultaApi, ApiError } = await apiClientReal(); semear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'expired', json: async () => ({}) }));
    await expect(consultaApi.listar()).rejects.toBeInstanceOf(ApiError);
    expect(localStorage.getItem('prescreve_ai_access_token')).toBeNull(); expect(localStorage.getItem('prescreve_ai_refresh_token')).toBeNull();
    expect(localStorage.getItem('prescreve-ai-favoritos')).toBeNull(); expect(localStorage.getItem('prescreve_ai_historico')).toBeNull();   // política FE-03 mantida
    expect(localStorage.getItem('prescreve_theme')).toBe('dark');
    expect(contarPendenciasDoProprietario(A)).toBe(1);                                  // pendência preservada
    expect(carregarPendencias(A)[0].prescricao!.itens[0].proveniencia!.original).toMatchObject({ origem: 'recomendacao_texto' });   // e a proveniência
    expect(contarRegistrosLegadosSemProprietario()).toBe(1);                            // quarentena preservada
  });

  it('8. logout voluntário segue a MESMA política: credenciais saem; pendências e quarentena ficam; descarte é ação separada', async () => {
    const { authApi } = await apiClientReal(); semear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}', json: async () => ({}) }));
    await authApi.logout();
    expect(localStorage.getItem('prescreve_ai_access_token')).toBeNull(); expect(localStorage.getItem('prescreve-ai-favoritos')).toBeNull();
    expect(contarPendenciasDoProprietario(A)).toBe(1); expect(contarRegistrosLegadosSemProprietario()).toBe(1);
    expect(descartarPendenciasDoProprietario(A)).toBe(1); expect(contarPendenciasDoProprietario(A)).toBe(0);   // descarte explícito
  });

  it('10. falha de autenticação NUNCA é lida como sucesso: verificarSessao 401/rede/5xx/demo/sem backend ⇒ ok:false; só 2xx ⇒ ok:true', async () => {
    const { authApi } = await apiClientReal();
    const resp = (status: number) => vi.fn().mockResolvedValue({ ok: status < 400, status, text: async () => '{}', json: async () => ({}) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ id: 'srv-1' }), json: async () => ({ id: 'srv-1' }) })); expect(await authApi.verificarSessao()).toEqual({ ok: true, id: 'srv-1' });
    vi.stubGlobal('fetch', resp(200)); expect(await authApi.verificarSessao()).toEqual({ ok: false, motivo: 'indisponivel' });   // 2xx SEM id ⇒ não confiável
    vi.stubGlobal('fetch', resp(401)); expect(await authApi.verificarSessao()).toEqual({ ok: false, motivo: 'sessao_invalida' });
    vi.stubGlobal('fetch', resp(503)); expect(await authApi.verificarSessao()).toEqual({ ok: false, motivo: 'indisponivel' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))); expect(await authApi.verificarSessao()).toEqual({ ok: false, motivo: 'rede' });
    vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true'); vi.resetModules(); const demo = await import('@/lib/api-client');
    expect((await demo.authApi.verificarSessao()).ok).toBe(false);
  });

  it('10b. erro 401 no envio da prescrição é falha definitiva (rejeitado), nunca "synced"', async () => {
    const st = { atual: baseState({ consultations: [consulta('c1')] }) };
    const deps: SincronizarConsultaDeps = {
      criar: vi.fn().mockResolvedValue({ id: 'srv' }), criarDiagnostico: vi.fn(), salvarRisco: vi.fn(),
      criarPrescricao: vi.fn().mockRejectedValue(Object.assign(new Error('401'), { status: 401 })), dispatch: (a) => { st.atual = reducer(st.atual, a); }, sessaoValida: () => true, isAuthenticated: () => true,
    };
    const c = { ...consulta('c1'), sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv' } } } as Consultation;
    const r = await executarSincronizacaoConsulta(c, deps);
    expect(r.prescricao).toBe('failed');
    expect(st.atual.consultations[0].sync?.prescricao?.status).not.toBe('synced');
  });
});

// ═══════════ F-3: proprietário ═══════════
describe('E2.8 — F-3: escopo de proprietário', () => {
  it('2. usuário B NÃO vê pendências do usuário A (carregar/contar), e o salvamento de B preserva os registros de A intactos', () => {
    salvarPendencias(A, [consulta('cA')]);
    expect(carregarPendencias(B)).toEqual([]); expect(contarPendenciasDoProprietario(B)).toBe(0);
    const antes = JSON.parse(localStorage.getItem(KEY_PENDENTES_V2)!).registros.filter((r: { owner: string }) => r.owner === A);
    salvarPendencias(B, [naoSincronizada('cB')]);
    const depois = JSON.parse(localStorage.getItem(KEY_PENDENTES_V2)!).registros;
    expect(depois.filter((r: { owner: string }) => r.owner === A)).toEqual(antes);       // A intocado
    expect(carregarPendencias(B).map(c => c.id)).toEqual(['cB']); expect(carregarPendencias(A).map(c => c.id)).toEqual(['cA']);
  });

  it('2b. B não consegue descartar as pendências de A (descartar só atua sobre o próprio proprietário)', () => {
    salvarPendencias(A, [consulta('cA')]);
    expect(descartarPendenciasDoProprietario(B)).toBe(0); expect(contarPendenciasDoProprietario(A)).toBe(1);
  });

  it('3. troca de usuário NÃO reassocia: SET_USER remove da memória consultas de outro proprietário (o proprietario_id nunca é reescrito) e a cópia persistida de A segue isolada', () => {
    salvarPendencias(A, [consulta('cA')]);
    const doA = carregarPendencias(A);                                                       // restaurada com proprietario_id = A
    expect(doA[0].proprietario_id).toBe(A);
    let s = baseState({ consultations: doA, activeConsultation: doA[0], currentUser: { id: A, email: 'a@x.com', perfil: 'MEDICO' } });
    s = reducer(s, { type: 'SET_USER', payload: { id: B, email: 'b@x.com', perfil: 'MEDICO' } });
    expect(s.consultations).toEqual([]); expect(s.activeConsultation).toBeNull();
    expect(contarPendenciasDoProprietario(A)).toBe(1);                                       // A segue recuperável
    const mesmo = reducer(baseState({ consultations: doA }), { type: 'SET_USER', payload: { id: A, email: 'a@x.com', perfil: 'MEDICO' } });
    expect(mesmo.consultations).toHaveLength(1);                                             // o próprio proprietário mantém
  });

  it('11/12. caminhos de ação: revisão por outro usuário é RECUSADA; a revisão do proprietário não altera o proprietario_id; consultaPertenceAoUsuario é a regra única', () => {
    const restaurada = carregarPendenciasDe(A, consulta('cA'));
    const nova = { ...restaurada.prescricao!, itens: [{ ...ITEM, posologia: 'alterada' }] };
    let s = baseState({ consultations: [restaurada] });
    const porB = reducer(s, { type: 'REVIEW_PRESCRIPTION', payload: { consultaId: 'cA', prescricao: nova, usuarioId: B } });
    expect(porB.consultations[0].prescricao!.itens[0].posologia).toBe(ITEM.posologia);       // recusada
    const porA = reducer(s, { type: 'REVIEW_PRESCRIPTION', payload: { consultaId: 'cA', prescricao: nova, usuarioId: A } });
    expect(porA.consultations[0].prescricao!.itens[0].posologia).toBe('alterada');
    expect(porA.consultations[0].proprietario_id).toBe(A);                                   // dono imutável
    expect(consultaPertenceAoUsuario({ proprietario_id: A }, A)).toBe(true); expect(consultaPertenceAoUsuario({ proprietario_id: A }, B)).toBe(false);
    expect(consultaPertenceAoUsuario({}, A)).toBe(true);                                      // criada na sessão atual
    expect(consultaPertenceAoUsuario({ proprietario_id: A }, undefined)).toBe(false);         // sem usuário autenticado: ninguém
    s = baseState();
  });

  it('11. toda porta de ação passa pela validação: sincronizarConsulta, restauração e persistência exigem proprietário/identidade verificada (estrutura do código)', async () => {
    const { readFileSync } = await import('fs'); const path = await import('path');
    const store = readFileSync(path.resolve(__dirname, '../lib/store.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(store).toMatch(/const sincronizarConsulta = useCallback\(async \(c: Consultation\) => \{\n\s*\/\/[^\n]*\n\s*if \(!consultaPertenceAoUsuario\(c, getCurrentUser\(\)\?\.id\)\)/);
    expect(store).toMatch(/if \(IS_DEMO_MODE \|\| !identidadeVerificada \|\| identidadeVerificada !== state\.currentUser\?\.id\) return;\n\s*const restauradas = carregarPendencias\(identidadeVerificada\)/);
    expect(store).toMatch(/salvarPendencias\(identidadeVerificada, state\.consultations\)/);
    expect(store).not.toMatch(/restaurarConsultasPendentes\(\);\n\s*if \(restauradas/);           // o mount não restaura mais o formato antigo
    expect(store).not.toMatch(/persistirConsultasPendentes\(state\.consultations\)/);
    const rev = readFileSync(path.resolve(__dirname, '../components/modules/PrescricoesLocaisPendentes.tsx'), 'utf8');
    expect(rev).toContain('usuarioId: auth.currentUser?.id'); expect(rev).toContain('consultaPertenceAoUsuario(c, usuarioId)');
  });
});
function carregarPendenciasDe(owner: string, c: Consultation): Consultation { salvarPendencias(owner, [c]); return carregarPendencias(owner)[0]; }

// ═══════════ legado ═══════════
describe('E2.8 — registros LEGADOS sem proprietário', () => {
  const legado = () => localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify([consulta('L1'), consulta('L2', { sync: { consulta: { status: 'failed', attempts: 1 } } } as never)]));

  it('5. NÃO são carregados nem atribuídos automaticamente ao usuário atual (nem por salvar/carregar/trocar usuário)', () => {
    legado();
    expect(carregarPendencias(A)).toEqual([]); expect(carregarPendencias(B)).toEqual([]);
    salvarPendencias(A, []); expect(localStorage.getItem(KEY_PENDENTES_V2)).toBeNull();     // nada migrado
    expect(contarRegistrosLegadosSemProprietario()).toBe(2);                                // permanecem isolados (só contagem, sem PHI)
  });

  it('5b. verificação de propriedade pelo SERVIDOR: só registros com backend_id e confirmados passam a ser do usuário; negados/erro/sem backend_id ficam em quarentena', async () => {
    legado();
    const verificar = vi.fn(async (id: string) => { if (id === 'srv-L1') return true; throw new Error('404'); });
    const r = await reivindicarLegadoVerificado(A, verificar);
    expect(r).toEqual({ reivindicados: 1, mantidosEmQuarentena: 1 });
    expect(verificar).toHaveBeenCalledTimes(1);                                              // L2 não tem backend_id: nem chega ao servidor
    expect(carregarPendencias(A).map(c => c.id)).toEqual(['L1']); expect(carregarPendencias(B)).toEqual([]);
    expect(contarRegistrosLegadosSemProprietario()).toBe(1);
    // servidor nega tudo ⇒ nada é atribuído
    legado(); const negar = await reivindicarLegadoVerificado(B, async () => false);
    expect(negar.reivindicados).toBe(0); expect(carregarPendencias(B)).toEqual([]);
  });

  it('5c. descarte explícito dos registros sem proprietário; entradas ilegíveis no legado não derrubam as demais', () => {
    localStorage.setItem(KEY_PENDENTES_LEGADO, JSON.stringify([null, 5, consulta('L1')]));
    expect(contarRegistrosLegadosSemProprietario()).toBe(1);
    expect(descartarRegistrosLegados()).toBe(1); expect(contarRegistrosLegadosSemProprietario()).toBe(0);
    localStorage.setItem(KEY_PENDENTES_LEGADO, '{não é json'); expect(contarRegistrosLegadosSemProprietario()).toBe(0);
  });

  it('armazenamento v2 ilegível NÃO é sobrescrito (evita destruir dados que não conseguimos interpretar); entradas inválidas são ignoradas', () => {
    localStorage.setItem(KEY_PENDENTES_V2, '{lixo');
    expect(salvarPendencias(A, [consulta('c1')])).toBe(false); expect(localStorage.getItem(KEY_PENDENTES_V2)).toBe('{lixo');
    localStorage.setItem(KEY_PENDENTES_V2, JSON.stringify({ v: 2, registros: [null, { owner: '', consulta: {} }, { owner: A, salvo_em: 'x', consulta: { id: 'ok' } }] }));
    expect(carregarPendencias(A).map(c => c.id)).toEqual(['ok']);
  });
});

// ═══════════ recuperação autorizada, minimização, sincronizados ═══════════
describe('E2.8 — recuperação autorizada, minimização e dados sincronizados', () => {
  it('6/9. pendência de A é recuperável por A após logout + reautenticação (mesmo sub), com proveniência original e dose estruturada preservadas', () => {
    salvarPendencias(A, [consulta('cA')]);
    localStorage.removeItem('prescreve_ai_access_token');                                    // "logout/expiração": credenciais saem
    const recuperada = carregarPendencias(A)[0];
    expect(recuperada.proprietario_id).toBe(A);
    expect(recuperada.prescricao!.itens[0].proveniencia!.original).toEqual({ conhecida: true, origem: 'recomendacao_texto', versao_registro: 'posologia-1', criado_em: '2026-11-10T00:00:00.000Z' });
    expect(recuperada.prescricao!.itens[0].dose_estruturada).toEqual(ITEM.dose_estruturada);   // nenhuma fabricação/alteração
  });

  it('7. minimização — consulta SINCRONIZADA: persiste só o necessário (sem anamnese, plano, CPF, endereço, nascimento; sem nome do paciente)', () => {
    salvarPendencias(A, [consulta('cA')]);
    const raw = localStorage.getItem(KEY_PENDENTES_V2)!;
    for (const proibido of ['SEGREDO-ANAMNESE', 'SEGREDO-PLANO', '123.456.789-00', 'Rua do Segredo', '1980-01-01', 'Paciente cA', 'hda']) expect(raw, proibido).not.toContain(proibido);
    const c = carregarPendencias(A)[0];
    expect(c.paciente_nome).toBe(ROTULO_IDENTIFICACAO_NAO_RETIDA); expect(c.prescricao!.paciente.nome).toBe(ROTULO_IDENTIFICACAO_NAO_RETIDA);
    expect(c.anamnese).toBeUndefined(); expect(c.plano_terapeutico).toBeUndefined();
    expect(c.prescricao!.itens).toEqual([ITEM]); expect(c.sync?.consulta?.backend_id).toBe('srv-cA'); expect(c.prescricao!.medico).toEqual({ nome: 'Dr. M', crm: 'CRM 1' });
  });

  it('7b. minimização — consulta NÃO sincronizada: mantém anamnese e nome (necessários ao envio) mas NUNCA CPF/endereço/nascimento/plano', () => {
    salvarPendencias(A, [naoSincronizada('cA')]);
    const raw = localStorage.getItem(KEY_PENDENTES_V2)!;
    expect(raw).toContain('SEGREDO-ANAMNESE'); expect(raw).toContain('Paciente cA');
    for (const proibido of ['SEGREDO-PLANO', '123.456.789-00', 'Rua do Segredo', '1980-01-01']) expect(raw, proibido).not.toContain(proibido);
  });

  it('7c. dados sincronizados não permanecem como pendentes: ao confirmar a prescrição o registro SAI do armazenamento (e só o do proprietário)', () => {
    salvarPendencias(A, [consulta('c1'), consulta('c2')]); salvarPendencias(B, [consulta('cB')]);
    expect(contarPendenciasDoProprietario(A)).toBe(2);
    const confirmada = consulta('c1', { sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-c1' }, prescricao: { status: 'synced', attempts: 1, backend_id: 'p1' } } as never });
    expect(consultaTemPendenciaLocal(confirmada)).toBe(false);
    salvarPendencias(A, [confirmada, consulta('c2')]);
    expect(carregarPendencias(A).map(c => c.id)).toEqual(['c2']); expect(contarPendenciasDoProprietario(B)).toBe(1);
    const hidratada = { id: 'h', status: 'concluida', paciente_nome: 'x', data: 'd', sync: { consulta: { status: 'synced', attempts: 0, backend_id: 'h' } }, temPrescricaoNoBackend: true } as Consultation;
    salvarPendencias(A, [hidratada]); expect(JSON.stringify(carregarPendencias(A))).not.toContain('"id":"h"');
  });

  it('merge por id: o salvamento NÃO apaga registros do proprietário ainda não restaurados (estado vazio ≠ "descartar")', () => {
    salvarPendencias(A, [consulta('c1'), consulta('c2')]);
    salvarPendencias(A, []);                                                                  // estado em memória ainda vazio (antes da restauração)
    expect(carregarPendencias(A).map(c => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('retenção: nenhum campo clínico novo; o registro tem só {owner, salvo_em, consulta mínima}', () => {
    salvarPendencias(A, [consulta('cA')]);
    const reg = JSON.parse(localStorage.getItem(KEY_PENDENTES_V2)!);
    expect(reg.v).toBe(2); expect(Object.keys(reg.registros[0]).sort()).toEqual(['consulta', 'owner', 'salvo_em']);
    expect(Object.keys(reg.registros[0].consulta).sort()).toEqual(['data', 'id', 'paciente_nome', 'prescricao', 'status', 'sync']);
    expect(minimizarConsultaParaPersistencia(consulta('x')).prescricao!.paciente).toEqual({ nome: ROTULO_IDENTIFICACAO_NAO_RETIDA });
  });
});
