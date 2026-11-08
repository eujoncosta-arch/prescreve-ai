// ============================================================
// RM-107.1.1-E2.3 — Governança integral da posologia: origem, integridade DTO×texto, reconfirmação consciente,
// finalização/sincronização, trilha em memória e legado conservador. Fluxos A–N + interface (Panel e status final).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { readFileSync } from 'fs';
import path from 'path';
import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const h = vi.hoisted(() => ({
  dispatch: vi.fn(),
  app: {} as Record<string, unknown>,
}));

vi.mock('@/lib/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/store')>();
  return { ...actual, useApp: () => h.app };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { toast } from 'sonner';
import { executarSincronizacaoConsulta, type SincronizarConsultaDeps, type Action } from '@/lib/store';
import type { Consultation, PrescriptionItem, DoseEstruturada, Prescription } from '@/lib/types';
import { PrescriptionPanel } from '@/components/modules/PrescriptionPanel';
import { StatusRegistroPrescricao } from '@/components/modules/StatusRegistroPrescricao';
import { normalizarRegistro, estadosDoRegistro, ORIGENS_DA_POSOLOGIA, registroNaoAvaliado } from '@/lib/dose-contract';
import { avaliarIntegridadeDto, CAMPOS_QUE_DIVERGEM_DO_DTO } from '@/lib/posologia-consistencia';
import {
  registroDeRecomendacaoTexto, registroDeInclusaoManual, registroDeInclusaoComFonteDaDose, registroDeInclusaoComDosePreenchida, registrarEdicaoPosologica,
  reconfirmarDoseEstruturada, prepararItemParaStore, doseEstruturadaDesatualizada, registroEfetivo, registroDeResultadoMotorC,
} from '@/lib/prescricao-proveniencia';
import { eventosDaSessao, limparTrilhaDaSessao } from '@/lib/trilha-sessao-posologia';
import { getAllDrugs } from '@/lib/pharma-database';
import { calcFullDose } from '@/lib/dose-calculator';

const SRC = (p: string) => readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');
const PAGE_RAPIDA = SRC('../app/prescricao-rapida/page.tsx');
const PAGE_NOVA = SRC('../app/consulta/nova/page.tsx');
const STORE = SRC('../lib/store.tsx');
const DTO: DoseEstruturada = { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' };
const T = (n: number) => `2026-11-08T0${n}:00:00.000Z`;

// ── helpers ─────────────────────────────────────────────────────────────────
const itemF2 = (over: Partial<PrescriptionItem> = {}): PrescriptionItem => ({
  id: 'i1', medicamento: 'Amoxicilina', concentracao: '500 mg', forma_farmaceutica: 'Comprimido', quantidade: '21 comprimidos',
  posologia: 'Amoxicilina 500 mg 8/8h', via: 'VO', duracao: '7 dias', uso_continuo: false, instrucoes_especiais: 'Tomar após refeição', dose_estruturada: DTO,
  posologia_registrada: registroDeRecomendacaoTexto({ texto: 'Amoxicilina 500 mg 8/8h', dose: DTO, criado_em: T(0) }), ...over,
});
const editar = (item: PrescriptionItem, campo: string, valor: string | boolean, em = T(1)): PrescriptionItem =>
  ({ ...item, [campo]: valor, posologia_registrada: registrarEdicaoPosologica(item.posologia_registrada, campo, (item as unknown as Record<string, unknown>)[campo], valor, em) });
const reconf = (item: PrescriptionItem, em = T(2)): PrescriptionItem => ({ ...item, posologia_registrada: reconfirmarDoseEstruturada(item.posologia_registrada, em) });

function consulta(itens: PrescriptionItem[], extra: Partial<Consultation> = {}): Consultation {
  return {
    id: 'local-1', status: 'concluida', paciente_nome: 'P', data: T(0),
    anamnese: { queixa_principal: 'x', hda: 'x', hpp: 'x', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} },
    prescricao: { tipo: 'simples', paciente: { nome: 'P' }, medico: { nome: 'M', crm: 'C' }, itens: itens.map(prepararItemParaStore) as PrescriptionItem[], data_emissao: T(0) },
    ...extra,
  } as Consultation;
}
function depsSync(over: Partial<SincronizarConsultaDeps> = {}) {
  const acoes: Action[] = [];
  const criarPrescricao = vi.fn().mockResolvedValue({ id: 'presc-1' });
  const deps: SincronizarConsultaDeps = {
    criar: vi.fn().mockResolvedValue({ id: 'srv-1' }), criarDiagnostico: vi.fn().mockResolvedValue({ id: 'd' }), salvarRisco: vi.fn().mockResolvedValue({ id: 'r' }),
    criarPrescricao, dispatch: (a: Action) => { acoes.push(a); }, sessaoValida: () => true, isAuthenticated: () => true, ...over,
  };
  return { deps, acoes, criarPrescricao };
}
const sincronizar = async (itens: PrescriptionItem[], over: Partial<SincronizarConsultaDeps> = {}) => {
  const d = depsSync(over); const resultado = await executarSincronizacaoConsulta(consulta(itens), d.deps); return { ...d, resultado };
};
const dosesEnviadas = (criarPrescricao: ReturnType<typeof vi.fn>) => (criarPrescricao.mock.calls[0][0] as { medicamentos: Array<Record<string, unknown>> }).medicamentos;

beforeEach(() => { limparTrilhaDaSessao(); h.dispatch.mockReset(); vi.mocked(toast.success).mockClear(); vi.mocked(toast.warning).mockClear(); });

// ═══════════ ORIGEM E PROVENIÊNCIA ═══════════
describe('E2.3 — origem e proveniência', () => {
  it('as 8 categorias originais permanecem; a única adição é pre_preenchida_pelo_sistema (com origem_detalhe)', () => {
    expect(ORIGENS_DA_POSOLOGIA.slice(0, 8)).toEqual(['contrato_dose', 'dose_calculator', 'recomendacao_texto', 'digitada_pelo_prescritor', 'protocolo_texto', 'backend_legado', 'importacao_localstorage', 'desconhecida']);
    expect(ORIGENS_DA_POSOLOGIA[8]).toBe('pre_preenchida_pelo_sistema'); expect(ORIGENS_DA_POSOLOGIA).toHaveLength(9);
  });
  it.each(['catalogo_dose_habitual', 'calculo_peso_simples', 'sincronizada_com_concentracao'] as const)('dose pré-preenchida (%s) e não editada ⇒ pre_preenchida_pelo_sistema, nunca "digitada", nunca confirmada', (fonte) => {
    const r = registroDeInclusaoComFonteDaDose({ fonte, texto: '500 mg', campos_padrao: ['via'], criado_em: T(0) });
    expect(r.origem).toBe('pre_preenchida_pelo_sistema'); expect(r.origem_detalhe).toBe(fonte); expect(r.origem).not.toBe('digitada_pelo_prescritor');
    expect(r.campos_padrao).toContain('dose'); expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.dose).toBeNull();
    expect(JSON.stringify(r)).not.toMatch(/validad|confirmad|aprovad/);
    expect(r.trilha?.[0]).toMatchObject({ tipo: 'criacao', detalhe: `origem=pre_preenchida_pelo_sistema/${fonte}` });
  });
  it('dose alterada no campo pelo prescritor ⇒ digitada_pelo_prescritor; sem fonte rastreável ⇒ desconhecida', () => {
    expect(registroDeInclusaoComFonteDaDose({ fonte: 'digitada', texto: '40 mg' }).origem).toBe('digitada_pelo_prescritor');
    expect(registroDeInclusaoComDosePreenchida({ texto: '40 mg' }).origem).toBe('desconhecida');
    expect(registroDeInclusaoManual({ texto: '' }).origem).toBe('digitada_pelo_prescritor');
  });
  it('a fonte é rastreada no código da tela (catálogo, peso, concentração, digitação) e lida em addToRx', () => {
    expect(PAGE_RAPIDA).toContain("setCustomDoseFonte('catalogo_dose_habitual')");
    expect(PAGE_RAPIDA).toContain("setCustomDoseFonte('calculo_peso_simples')");
    expect(PAGE_RAPIDA).toContain("setCustomDoseFonte('sincronizada_com_concentracao')");
    expect(PAGE_RAPIDA).toMatch(/onChange=\{e => \{ setCustomDose\(e\.target\.value\); setCustomDoseFonte\('digitada'\); \}\}/);
    expect(PAGE_RAPIDA).toMatch(/registroDeInclusaoComFonteDaDose\(\{ fonte: customDoseFonte,/);
  });
  it('origem desconhecida/adulterada na normalização permanece desconhecida; origem_detalhe só vale com pre_preenchida', () => {
    const r = normalizarRegistro({ versao_registro: 'posologia-1', origem: 'inventada', origem_detalhe: 'catalogo_dose_habitual', avaliacao: { tipo: 'nao_avaliada', motivo: 'texto_livre' } });
    expect(r.origem).toBe('desconhecida'); expect(r.origem_detalhe).toBeUndefined();
    const ok = registroDeInclusaoComFonteDaDose({ fonte: 'calculo_peso_simples' });
    expect(normalizarRegistro(JSON.parse(JSON.stringify(ok)))).toEqual(ok);
  });
});

// ═══════════ POLÍTICA CENTRAL DE INTEGRIDADE ═══════════
describe('E2.3 — política central de integridade DTO × texto', () => {
  it('estados: consistente_conforme_origem / divergente / nao_verificavel / estrutura_indisponivel', () => {
    expect(avaliarIntegridadeDto(itemF2())).toMatchObject({ estado: 'consistente_conforme_origem', transmissivel: true });
    expect(avaliarIntegridadeDto(editar(itemF2(), 'posologia', 'x'))).toMatchObject({ estado: 'divergente', transmissivel: false });
    expect(avaliarIntegridadeDto({ dose_estruturada: DTO })).toMatchObject({ estado: 'nao_verificavel', transmissivel: true });
    expect(avaliarIntegridadeDto({})).toMatchObject({ estado: 'estrutura_indisponivel', transmissivel: false });
    expect(avaliarIntegridadeDto({ posologia_registrada: registroDeInclusaoManual({ texto: 'x' }) })).toMatchObject({ estado: 'estrutura_indisponivel', transmissivel: false });
  });
  it('"consistente" não afirma verificação do texto: o motivo diz que o sistema não verificou a correspondência', () => {
    expect(avaliarIntegridadeDto(itemF2()).motivo).toMatch(/não verificou a correspondência/);
  });
  it('não assume correspondência por campos preenchidos: DTO do item diferente do registrado, ou DTO sem registro de dose ⇒ divergente', () => {
    expect(avaliarIntegridadeDto(itemF2({ dose_estruturada: { ...DTO, valor: 1000 } }))).toMatchObject({ estado: 'divergente' });
    expect(avaliarIntegridadeDto(itemF2({ posologia_registrada: registroDeInclusaoManual({ texto: 'x' }) }))).toMatchObject({ estado: 'divergente' });
  });
  it('registro adulterado/ilegível/de versão desconhecida ⇒ não verificável (não promove); nunca quebra', () => {
    for (const raw of ['x', 7, [], {}, { versao_registro: 'posologia-99' }]) {
      const p = avaliarIntegridadeDto({ dose_estruturada: DTO, posologia_registrada: raw });
      expect(p.estado).toBe('nao_verificavel');
    }
    expect(registroEfetivo({ posologia_registrada: { versao_registro: 'posologia-99', avaliacao: { tipo: 'avaliada' } } }).avaliacao.tipo).toBe('nao_avaliada');
  });
  it('todos os campos do DTO divergem; a política é única (Panel, store e testes usam o mesmo módulo)', () => {
    for (const c of CAMPOS_QUE_DIVERGEM_DO_DTO) expect(avaliarIntegridadeDto(editar(itemF2(), c, 'novo')).estado, c).toBe('divergente');
    expect(SRC('../components/modules/PrescriptionPanel.tsx')).toContain("from '@/lib/posologia-consistencia'");
    expect(SRC('../lib/prescricao-proveniencia.ts')).toContain("from './posologia-consistencia'");
    expect(SRC('../lib/prescricao-proveniencia.ts')).not.toMatch(/export const CAMPOS_QUE_DIVERGEM_DO_DTO: readonly/);   // definição única
  });
  it('não interpreta nem reconstrói texto: nenhum DTO nasce de texto livre', () => {
    const r = registroDeInclusaoManual({ texto: 'Amoxicilina 500 mg 8/8h' }); expect(r.dose).toBeNull();
    const e = registrarEdicaoPosologica(r, 'posologia', 'a', 'Amoxicilina 500 mg 8/8h por 7 dias')!; expect(e.dose).toBeNull(); expect(e.dose_divergente).toBeUndefined();
    expect(avaliarIntegridadeDto({ posologia_registrada: e }).estado).toBe('estrutura_indisponivel');
  });
});

// ═══════════ TRILHA ═══════════
describe('E2.3 — trilha de eventos (em memória, distinguíveis, por registro)', () => {
  it('criação → edição → invalidação do DTO → reconfirmação → invalidação da reconfirmação', () => {
    let it = itemF2(); expect(it.posologia_registrada!.trilha!.map(e => e.tipo)).toEqual(['criacao']);
    it = editar(it, 'posologia', 'novo', T(1)); expect(it.posologia_registrada!.trilha!.map(e => e.tipo)).toEqual(['criacao', 'edicao', 'dto_invalidado']);
    it = reconf(it, T(2)); expect(it.posologia_registrada!.trilha!.map(e => e.tipo)).toEqual(['criacao', 'edicao', 'dto_invalidado', 'reconfirmacao']);
    it = editar(it, 'duracao', '10 dias', T(3));
    expect(it.posologia_registrada!.trilha!.map(e => e.tipo)).toEqual(['criacao', 'edicao', 'dto_invalidado', 'reconfirmacao', 'edicao', 'reconfirmacao_invalidada', 'dto_invalidado']);
    for (const e of it.posologia_registrada!.trilha!) expect(e.em).toMatch(/^2026-11-08/);
  });
  it('a trilha não contém dados pessoais e sobrevive à normalização; eventos inválidos são descartados', () => {
    const r = reconf(editar(itemF2(), 'posologia', 'novo')).posologia_registrada!;
    expect(JSON.stringify(r.trilha)).not.toMatch(/Amoxicilina|"P"|CRM/);
    expect(normalizarRegistro(JSON.parse(JSON.stringify(r))).trilha).toEqual(r.trilha);
    const lixo = JSON.parse(JSON.stringify(r)); lixo.trilha = [{ tipo: 'inventado', em: 'x' }, null, 4, { tipo: 'edicao', em: 'e', campo: 'dose' }];
    expect(normalizarRegistro(lixo).trilha).toEqual([{ tipo: 'edicao', em: 'e', campo: 'dose' }]);
  });
  it('a trilha é só memória: nenhum uso de storage/rede nos módulos novos', () => {
    for (const f of ['../lib/trilha-sessao-posologia.ts', '../lib/posologia-consistencia.ts', '../lib/prescricao-proveniencia.ts']) {
      const s = SRC(f).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(s, f).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest/);
    }
  });
});

// ═══════════ FLUXOS A–N (sincronização real do store) ═══════════
describe('E2.3 — fluxos A–N', () => {
  it('A. inclusão manual → edição → finalização: sem DTO ⇒ bloqueio existente; nenhuma validação; nada enviado', async () => {
    const manual: PrescriptionItem = { id: 'm1', medicamento: '', concentracao: '', forma_farmaceutica: 'Comprimido', quantidade: '', posologia: '', via: 'Oral', duracao: '', uso_continuo: false, posologia_registrada: registroDeInclusaoManual({ texto: '', campos_padrao: ['forma_farmaceutica', 'via'] }) };
    const ed = editar(editar(manual, 'medicamento', 'Dipirona'), 'posologia', '1 g 6/6h');
    expect(ed.posologia_registrada!.avaliacao.tipo).toBe('nao_avaliada'); expect(ed.dose_estruturada).toBeUndefined();
    const { resultado, criarPrescricao } = await sincronizar([ed]);
    expect(resultado.prescricao).toBe('sem_dose_estruturada'); expect(criarPrescricao).not.toHaveBeenCalled();
    expect(JSON.stringify(ed.posologia_registrada)).not.toMatch(/regra_clinicamente_validada/);
  });
  it('B. motor C → aplicação → edição do texto → bloqueio (DTO do motor C divergente não é enviado)', async () => {
    const d = getAllDrugs().find(x => !x.dose_pediatrica && (() => { const r = calcFullDose({ molecula: x.molecula, dose_adulto: x.dose_adulto, dose_pediatrica: x.dose_pediatrica, ajuste_renal: x.ajuste_renal, ajuste_hepatico: x.ajuste_hepatico, alertas_especiais: x.alertas_especiais, uso_gestante: x.uso_gestante, uso_lactante: x.uso_lactante }, 40, 70, `${x.dose_adulto.habitual} ${x.dose_adulto.unidade}`, undefined, '', false, false, 1.7); return !r.frequencia_indeterminada && !r.alertas.some(a => a.startsWith('🚨')) && r.dose_por_tomada > 0; })())!;
    const r = calcFullDose({ molecula: d.molecula, dose_adulto: d.dose_adulto, dose_pediatrica: d.dose_pediatrica, ajuste_renal: d.ajuste_renal, ajuste_hepatico: d.ajuste_hepatico, alertas_especiais: d.alertas_especiais, uso_gestante: d.uso_gestante, uso_lactante: d.uso_lactante }, 40, 70, `${d.dose_adulto.habitual} ${d.dose_adulto.unidade}`, undefined, '', false, false, 1.7);
    const reg = registroDeResultadoMotorC(r, { via: d.dose_adulto.via }, { criado_em: T(0) });
    if (!reg.dose) throw new Error('premissa: o catálogo escolhido deve gerar DTO');
    const aplicado: PrescriptionItem = { ...itemF2({ medicamento: d.molecula, dose_estruturada: reg.dose, posologia_registrada: reg }) };
    expect(avaliarIntegridadeDto(aplicado).estado).toBe('consistente_conforme_origem');
    const editado = editar(aplicado, 'posologia', 'texto alterado pelo prescritor');
    expect(editado.posologia_registrada!.avaliacao.tipo).toBe('nao_avaliada');
    if (editado.posologia_registrada!.avaliacao.tipo === 'nao_avaliada') expect(editado.posologia_registrada!.avaliacao.avaliacao_anterior?.tipo).toBe('avaliada_motor_c');
    const { resultado, criarPrescricao } = await sincronizar([editado]);
    expect(resultado.prescricao).toBe('dose_estruturada_bloqueada'); expect(criarPrescricao).not.toHaveBeenCalled();
  });
  it('C. motor C → aplicação → reutilização explícita → sincronização com o DTO do motor, sem validação', async () => {
    const editado = editar(itemF2(), 'posologia', 'Amoxicilina 500 mg de 8 em 8 horas'); const ok = reconf(editado);
    const { resultado, criarPrescricao } = await sincronizar([ok]);
    expect(resultado.prescricao).toBe('synced'); expect(dosesEnviadas(criarPrescricao)).toEqual([{ molecula: 'Amoxicilina', dose: DTO, duracao: '7 dias', observacoes: 'Tomar após refeição' }]);
    expect(estadosDoRegistro(ok.posologia_registrada!).estado_regra).not.toBe('regra_clinicamente_validada');
  });
  it('D. reutilização → nova edição → nova invalidação (inclusive de campo fora do DTO)', async () => {
    for (const campo of ['posologia', 'duracao', 'quantidade']) {
      const it = editar(reconf(editar(itemF2(), 'posologia', 'a')), campo, 'b', T(3));
      expect(avaliarIntegridadeDto(it).estado, campo).toBe('divergente');
      expect((await sincronizar([it])).criarPrescricao).not.toHaveBeenCalled();
    }
  });
  it('E. favorito legado → recuperação → edição → finalização: sem registro, nada é promovido; comportamento anterior', async () => {
    const { posologia_registrada, ...legado } = itemF2(); void posologia_registrada;
    const recuperado = { ...legado, posologia: 'editado depois de recuperar' } as PrescriptionItem;   // edição sem registro não cria registro
    expect(registrarEdicaoPosologica(undefined, 'posologia', 'a', 'b')).toBeUndefined();
    expect(registroEfetivo(recuperado).avaliacao.tipo).toBe('nao_avaliada');
    expect(avaliarIntegridadeDto(recuperado).estado).toBe('nao_verificavel');
    expect(prepararItemParaStore(recuperado)).toEqual(recuperado);
    expect((await sincronizar([recuperado])).resultado.prescricao).toBe('synced');   // inalterado: legado segue o comportamento anterior
  });
  it('F. protocolo legado (item RxItem-like sem metadata) → recuperação → finalização: nao_avaliada, sem exceção', () => {
    const rx = { id: 'r1', molecula: 'X', dose: '10 mg', frequencia: '1x/dia', via: 'VO', duracao: '30 dias' };
    expect(() => registroEfetivo(rx as never)).not.toThrow(); expect(registroEfetivo(rx as never).avaliacao.tipo).toBe('nao_avaliada');
    expect(prepararItemParaStore(rx as never)).toEqual(rx);
  });
  it('G. DTO ausente ⇒ bloqueio sem envio', async () => {
    const it = itemF2({ dose_estruturada: undefined });
    const { resultado, criarPrescricao } = await sincronizar([it]);
    expect(resultado.prescricao).toBe('sem_dose_estruturada'); expect(criarPrescricao).not.toHaveBeenCalled();
  });
  it('H. falha de sincronização → estado local preservado → nova tentativa reutiliza a MESMA idempotency_key, sem duplicar', async () => {
    const it = itemF2();
    const erro = Object.assign(new Error('HTTP 400'), { status: 400 });
    const a = depsSync({ criarPrescricao: vi.fn().mockRejectedValue(erro) as never });
    const c1 = consulta([it]);
    const r1 = await executarSincronizacaoConsulta(c1, a.deps);
    expect(r1.prescricao).toBe('failed');                              // falha NÃO é apresentada como sucesso
    const estado = [...a.acoes].reverse().find(x => x.type === 'SET_SYNC_STATE' && (x.payload as { resource: string }).resource === 'prescricao') as Extract<Action, { type: 'SET_SYNC_STATE' }>;
    expect(estado.payload.state.status).toBe('failed');
    const chave = estado.payload.state.idempotency_key; expect(chave).toBeTruthy();
    expect(c1.prescricao!.itens[0].dose_estruturada).toEqual(DTO);    // preservação local: o item e a dose continuam no estado
    const b = depsSync();
    const r2 = await executarSincronizacaoConsulta({ ...c1, sync: { consulta: { status: 'synced', attempts: 1, backend_id: 'srv-1' }, prescricao: estado.payload.state } }, b.deps);
    expect(r2.prescricao).toBe('synced');
    expect((b.criarPrescricao.mock.calls[0][0] as { idempotency_key: string }).idempotency_key).toBe(chave);
    expect(b.criarPrescricao).toHaveBeenCalledTimes(1);
  });
  it('I. alterações administrativas mantêm a integridade posológica e o envio', async () => {
    let it = itemF2(); for (const [c, v] of [['instrucoes_especiais', 'outra'], ['tipo_receita', 'simples'], ['nome_comercial', 'X'], ['laboratorio', 'Y']] as const) it = editar(it, c, v);
    expect(avaliarIntegridadeDto(it).estado).toBe('consistente_conforme_origem'); expect(it.posologia_registrada!.avaliacao).toEqual(itemF2().posologia_registrada!.avaliacao);
    expect((await sincronizar([it])).resultado.prescricao).toBe('synced');
  });
  it('J. alterações em campos desconhecidos ⇒ conservador (invalida avaliação e bloqueia o DTO)', () => {
    const it = editar(itemF2(), 'campo_inedito', 'x');
    expect(it.posologia_registrada!.trilha!.map(e => e.tipo)).toContain('edicao');
    expect(it.posologia_registrada!.edicoes_manuais).toHaveLength(1);
  });
  it('K. dois ou mais itens, um desatualizado ⇒ bloqueio INTEGRAL (nada parcial)', async () => {
    const ok1 = itemF2({ id: 'a' }); const ruim = editar(itemF2({ id: 'b' }), 'frequencia', '2x/dia'); const ok2 = itemF2({ id: 'c' });
    const { resultado, criarPrescricao } = await sincronizar([ok1, ruim, ok2]);
    expect(resultado.prescricao).toBe('dose_estruturada_bloqueada'); expect(criarPrescricao).not.toHaveBeenCalled();
  });
  it('L. ausência de metadata nunca é lida como ausência de alertas', () => {
    for (const raw of [undefined, null, {}, 'x']) {
      const r = registroEfetivo({ posologia_registrada: raw });
      expect(r.avaliacao.tipo).toBe('nao_avaliada');
      if (r.avaliacao.tipo === 'nao_avaliada') expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false);
      expect(JSON.stringify(r)).not.toMatch(/"alertas":\[\]/);
    }
  });
  it('M. reutilização do DTO nunca promove validação clínica', () => {
    const r = reconf(editar(itemF2(), 'posologia', 'novo')).posologia_registrada!;
    expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.homologacao_clinica).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/regra_clinicamente_validada|aprovacao_formal/);
    expect(estadosDoRegistro(r)).toMatchObject({ nivel: 'nao_avaliada', estado_regra: 'desconhecido' });
  });
  it('N. valores numéricos: nenhuma alteração ou reconstrução automática em todo o ciclo', () => {
    let it = itemF2(); const antes = JSON.stringify(it.dose_estruturada);
    it = reconf(editar(editar(it, 'posologia', 'x'), 'frequencia', 'y')); it = editar(it, 'dose', '999');
    expect(JSON.stringify(it.dose_estruturada)).toBe(antes);           // o DTO do item nunca é tocado
    expect(JSON.stringify(reconf(editar(itemF2(), 'posologia', 'x')).posologia_registrada!.dose)).toBe(antes);   // restaurado idêntico, não recalculado
    expect(JSON.stringify(prepararItemParaStore(it)) ).toContain(antes);
  });
});

// ═══════════ CONTRATO DO BACKEND / PAYLOAD ═══════════
describe('E2.3 — payload efetivamente enviado e compatibilidade', () => {
  it('payload = apenas {molecula, dose, duracao, observacoes}; sem registro, trilha nem bloqueio_dto', async () => {
    const { criarPrescricao } = await sincronizar([reconf(editar(itemF2(), 'posologia', 'x'))]);
    const med = dosesEnviadas(criarPrescricao)[0]; expect(Object.keys(med).sort()).toEqual(['dose', 'duracao', 'molecula', 'observacoes']);
    expect(JSON.stringify(criarPrescricao.mock.calls[0][0])).not.toMatch(/posologia_registrada|bloqueio_dto|trilha|dose_divergente|reconfirmacoes/);
  });
  it('nenhum DTO divergente é transmitido sem reutilização explícita: varredura de todas as combinações de edição', async () => {
    let transmitidos = 0, bloqueados = 0;
    for (const campo of [...CAMPOS_QUE_DIVERGEM_DO_DTO, 'duracao', 'quantidade', 'forma_farmaceutica', 'uso_continuo']) {
      for (const reconfirma of [false, true]) {
        for (const depois of [false, true]) {
          let it = editar(itemF2(), campo, campo === 'uso_continuo' ? true : 'novo');
          if (reconfirma) it = reconf(it);
          if (depois) it = editar(it, 'posologia', 'mais uma', T(4));
          const { criarPrescricao } = await sincronizar([it]);
          const divergia = avaliarIntegridadeDto(it).estado === 'divergente';
          if (divergia) { expect(criarPrescricao).not.toHaveBeenCalled(); bloqueados++; } else { transmitidos++; }
          if (criarPrescricao.mock.calls.length) expect(dosesEnviadas(criarPrescricao)[0].dose).toEqual(DTO);
        }
      }
    }
    expect(bloqueados).toBeGreaterThan(20); expect(transmitidos).toBeGreaterThan(5);
  }, 30000);
  it('o store não referencia o registro; o gate de bloqueio de DTO precede o envio; o backend não ganhou campos', () => {
    expect(STORE).not.toMatch(/posologia_registrada|dose_divergente|reconfirmacoes_dose/);
    expect(STORE.indexOf('i.bloqueio_dto')).toBeGreaterThan(0);
    expect(STORE.indexOf('i.bloqueio_dto')).toBeLessThan(STORE.indexOf('criarPrescricao({'));
    const dto = readFileSync(path.resolve(__dirname, '../../../backend/src/modules/consulta/dto/consulta.dto.ts'), 'utf8');
    expect(dto).not.toMatch(/bloqueio_dto|posologia_registrada|dose_divergente|trilha/);
    expect(STORE).toMatch(/molecula: i\.medicamento,\s*dose: i\.dose_estruturada!,\s*duracao: i\.duracao,\s*observacoes: i\.instrucoes_especiais,/);
  });
  it('o resultado de sincronização é registrado na trilha da sessão (tentativa e resultado) sem dados pessoais', () => {
    expect(STORE).toContain("registrarEventoSessao({ tipo: 'tentativa_sync'"); expect(STORE).toContain("registrarEventoSessao({ tipo: 'resultado_sync'");
    expect(STORE).toContain('limparTrilhaDaSessao()');
  });
  it('a página final usa o componente de status e não afirma mais "emitida com sucesso" incondicionalmente', () => {
    expect(PAGE_NOVA).not.toContain('foi emitida com sucesso'); expect(PAGE_NOVA).toContain('<StatusRegistroPrescricao />');
  });
});

// ═══════════ INTERFACE (Panel) ═══════════
function montarPanel(opcoes: { duracao?: string } = {}) {
  const onComplete = vi.fn();
  h.app = {
    state: {
      activeConsultation: {
        id: 'local-1', paciente_nome: 'Paciente Teste',
        plano_terapeutico: { diagnostico_selecionado: 'Teste', farmacologico: [{
          id: 'm1', molecula: 'Amoxicilina', posologia_completa: 'Amoxicilina 500 mg 3x/dia por 7 dias',
          dose: { dose_padrao: '500', unidade: 'mg', via: 'VO', frequencia: '3x/dia', duracao: opcoes.duracao ?? '7 dias' },
        }] },
      },
    },
    dispatch: h.dispatch, auth: { backendMode: false, demoMode: false }, retrySync: vi.fn(),
  };
  const r = render(React.createElement(PrescriptionPanel, { onComplete }));
  return { onComplete, ...r };
}
const posologiaBox = () => document.querySelectorAll('textarea')[0] as HTMLTextAreaElement;   // 1º textarea = "Posologia completa" do item (o 2º são as orientações gerais)
const prescricaoDespachada = (): Prescription => (h.dispatch.mock.calls[0][0] as { payload: Prescription }).payload;

describe('E2.3 — interface do Panel (bloqueio, reutilização, finalização)', () => {
  beforeEach(() => cleanup());

  it('sem edição: não há aviso e finalizar despacha como antes (registro removido, DTO íntegro, toast de sincronização)', async () => {
    const { onComplete } = montarPanel(); const u = userEvent.setup();
    expect(screen.queryByTestId('aviso-dto-divergente')).toBeNull();
    await u.click(screen.getByRole('button', { name: /Finalizar e Emitir/ }));
    await waitFor(() => expect(h.dispatch).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const p = prescricaoDespachada(); expect(p.itens[0].dose_estruturada).toMatchObject({ valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' });
    expect(p.itens[0]).not.toHaveProperty('posologia_registrada'); expect(p.itens[0]).not.toHaveProperty('bloqueio_dto');
    expect(onComplete).toHaveBeenCalled(); expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Sincronizando'));
  });

  it('editar o texto exibe o aviso com o TEXTO ATUAL e o DTO ANTERIOR, e a ressalva de que o sistema não verificou a correspondência', async () => {
    montarPanel(); const u = userEvent.setup();
    await u.clear(posologiaBox()); await u.type(posologiaBox(), 'Amoxicilina 1 g de 8/8h');
    const aviso = await screen.findByTestId('aviso-dto-divergente');
    expect(within(aviso).getByTestId('dto-texto-atual').textContent).toBe('Amoxicilina 1 g de 8/8h');
    expect(within(aviso).getByTestId('dto-anterior').textContent).toMatch(/500 mg · 3x\/dia · via VO/);
    expect(aviso.textContent).toMatch(/não verificou/); expect(aviso.textContent).toMatch(/não será enviada ao servidor/); expect(aviso.textContent).toMatch(/não equivale a validar clinicamente/);
    expect(aviso.textContent).not.toMatch(/dose (validada|conferida|segura)|reconfirm/i);
    expect(within(aviso).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' })).toBeTruthy();
  });

  it('com divergência, "Finalizar" NÃO despacha: exibe a decisão; "Voltar e revisar" preserva tudo; nada foi enviado', async () => {
    const { onComplete } = montarPanel(); const u = userEvent.setup();
    await u.type(posologiaBox(), ' (editado)');
    await u.click(screen.getByRole('button', { name: /Finalizar e Emitir/ }));
    const dialogo = await screen.findByTestId('confirmacao-finalizacao-local');
    expect(dialogo.textContent).toMatch(/somente neste dispositivo/); expect(dialogo.textContent).toMatch(/não será enviada ao servidor/); expect(dialogo.textContent).toMatch(/dados continuam preservados/);
    expect(h.dispatch).not.toHaveBeenCalled(); expect(onComplete).not.toHaveBeenCalled();
    await u.click(within(dialogo).getByRole('button', { name: 'Voltar e revisar' }));
    expect(screen.queryByTestId('confirmacao-finalizacao-local')).toBeNull();
    expect(posologiaBox().value).toContain('(editado)');   // texto preservado
    expect(h.dispatch).not.toHaveBeenCalled();
  });

  it('reutilizar a dose anterior remove o aviso, não valida, e permite finalizar normalmente com o DTO original; nova edição o invalida de novo', async () => {
    const { onComplete } = montarPanel(); const u = userEvent.setup();
    await u.type(posologiaBox(), ' extra');
    await u.click(within(await screen.findByTestId('aviso-dto-divergente')).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    expect(screen.queryByTestId('aviso-dto-divergente')).toBeNull();
    await u.type(posologiaBox(), '!');                                   // nova alteração posológica ⇒ reutilização invalidada
    expect(await screen.findByTestId('aviso-dto-divergente')).toBeTruthy();
    await u.click(within(screen.getByTestId('aviso-dto-divergente')).getByRole('button', { name: 'Reutilizar a dose estruturada anterior' }));
    await u.click(screen.getByRole('button', { name: /Finalizar e Emitir/ }));
    await waitFor(() => expect(h.dispatch).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const item = prescricaoDespachada().itens[0];
    expect(item.dose_estruturada).toMatchObject({ valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' }); expect(item).not.toHaveProperty('bloqueio_dto'); expect(item).not.toHaveProperty('posologia_registrada');
    expect(item.posologia).toContain('extra!'); expect(onComplete).toHaveBeenCalled();
  }, 20000);

  it('finalizar SOMENTE neste dispositivo: despacha com a dose preservada e marcada (bloqueio_dto), avisa que NÃO foi registrada e registra a trilha da sessão', async () => {
    const { onComplete } = montarPanel(); const u = userEvent.setup();
    await u.type(posologiaBox(), ' alterado');
    await u.click(screen.getByRole('button', { name: /Finalizar e Emitir/ }));
    await u.click(await screen.findByRole('button', { name: 'Finalizar somente neste dispositivo' }));
    await waitFor(() => expect(h.dispatch).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const item = prescricaoDespachada().itens[0];
    expect(item.dose_estruturada).toMatchObject({ valor: 500 });                       // sem perda silenciosa
    expect(item.bloqueio_dto).toMatchObject({ estado: 'divergente' }); expect(item.posologia).toContain('alterado'); expect(item).not.toHaveProperty('posologia_registrada');
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('SOMENTE neste dispositivo'), expect.anything());
    expect(toast.success).not.toHaveBeenCalled();                                    // nunca "registrada" quando não foi enviada
    expect(onComplete).toHaveBeenCalled();
    expect(eventosDaSessao().map(e => e.tipo)).toEqual(['finalizacao_local', 'bloqueio_dto']);
    expect(JSON.stringify(eventosDaSessao())).not.toMatch(/Paciente Teste|Amoxicilina/);
  });

  it('qualquer edição depois de abrir a decisão a cancela (não finaliza com decisão obsoleta)', async () => {
    montarPanel(); const u = userEvent.setup();
    await u.type(posologiaBox(), ' x'); await u.click(screen.getByRole('button', { name: /Finalizar e Emitir/ }));
    expect(await screen.findByTestId('confirmacao-finalizacao-local')).toBeTruthy();
    await u.type(posologiaBox(), 'y');
    expect(screen.queryByTestId('confirmacao-finalizacao-local')).toBeNull();
  });

  it('edição de campo administrativo (nenhuma no Panel) ou de duração não cria aviso de DTO', async () => {
    montarPanel(); const u = userEvent.setup();
    const duracao = screen.getByDisplayValue('7 dias'); await u.clear(duracao); await u.type(duracao, '10 dias');
    expect(screen.queryByTestId('aviso-dto-divergente')).toBeNull();
  });
});

describe('E2.3 — interface do status final da consulta (renderização real)', () => {
  const montar = (backendMode: boolean, sync?: { status: string; error?: string }) => {
    h.app = { state: { activeConsultation: { id: 'l', paciente_nome: 'Paciente Teste', sync: sync ? { prescricao: { attempts: 1, ...sync } } : undefined } }, auth: { backendMode, demoMode: !backendMode } };
    cleanup(); render(React.createElement(StatusRegistroPrescricao));
    return screen.getByTestId('status-registro-prescricao').textContent ?? '';
  };
  it('modo local/demonstração: finalizada SOMENTE neste dispositivo, nunca "registrada"', () => {
    const t = montar(false); expect(t).toMatch(/SOMENTE neste dispositivo/); expect(t).toMatch(/não foi enviada a nenhum servidor/);
  });
  it('backend: confirmada só quando synced; failed NÃO é apresentado como sucesso e mostra a causa', () => {
    expect(montar(true, { status: 'synced' })).toMatch(/confirmada pelo servidor/);
    const f = montar(true, { status: 'failed', error: 'Medicamento X bloqueado' });
    expect(f).toMatch(/NÃO foi confirmada pelo servidor/); expect(f).toMatch(/Medicamento X bloqueado/); expect(f).not.toMatch(/foi finalizada e confirmada/);
  });
  it('syncing/local/indefinido: finalizada neste dispositivo, ainda NÃO confirmada', () => {
    expect(montar(true, { status: 'syncing' })).toMatch(/em andamento e ainda não foi confirmado/);
    expect(montar(true, { status: 'local' })).toMatch(/ainda não foi confirmada pelo servidor/);
    expect(montar(true)).toMatch(/ainda não foi confirmada pelo servidor/);
  });
});

describe('E2.3 — legado e registros inválidos', () => {
  it('registroNaoAvaliado continua rejeitando origens inválidas; as novas funções não aceitam fonte inventada como pré-preenchida', () => {
    expect(() => registroNaoAvaliado({ origem: 'x' as never, motivo: 'texto_livre' })).toThrow(TypeError);
    const r = registroDeInclusaoComFonteDaDose({ fonte: 'qualquer' as never }); const n = normalizarRegistro(JSON.parse(JSON.stringify(r)));
    expect(n.origem_detalhe).toBeUndefined();   // detalhe inválido não sobrevive à normalização
  });
  it('um item cuja avaliação foi adulterada para "avaliada" continua não promovido a validado', () => {
    const forjado = itemF2({ posologia_registrada: { versao_registro: 'posologia-1', origem: 'contrato_dose', dose: DTO, avaliacao: { tipo: 'avaliada', metadata: { estado_regra: 'regra_clinicamente_validada' } } } as never });
    expect(estadosDoRegistro(normalizarRegistro(forjado.posologia_registrada)).estado_regra).not.toBe('regra_clinicamente_validada');
    expect(doseEstruturadaDesatualizada(forjado)).toBe(false);
  });
});
