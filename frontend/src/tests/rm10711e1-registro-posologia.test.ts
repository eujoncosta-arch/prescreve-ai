// ============================================================
// RM-107.1.1-E1 — Registro tipado de posologia e proveniência (módulo isolado `dose-contract/registro`).
// Dados sintéticos para estados/regras; dados reais do motor C apenas para provar PRESERVAÇÃO (nunca correção clínica).
// ============================================================

import { describe, it, expect } from 'vitest';
import { getAllDrugs, type QuickDrug } from '@/lib/pharma-database';
import { calcFullDose, mapUnidadeParaContrato, type FullDoseInput, type FullDoseResult } from '@/lib/dose-calculator';
import { ROTULO_ESTADO_AVALIACAO, type EstadoAvaliacaoDose } from '@/lib/dose-estados';
import {
  avaliarDose, converterDoseComMetadata, estadoDaRegra, extrairMetadataAvaliacao,
  registroNaoAvaliado, registroDeDoseResult, registroDeFullDoseResult, somenteDtoNumerico, estadosDoRegistro, comEdicaoManual, normalizarRegistro,
  MAPEAMENTO_ESTADOS_MOTOR_C, ORIGENS_DA_POSOLOGIA, MOTIVOS_NAO_AVALIADA, VERSAO_REGISTRO,
  type DoseRequest, type DoseRule, type DoseResult, type Governanca, type FonteDose, type AprovacaoFormal, type PosologiaRegistrada,
} from '@/lib/dose-contract';

// ── fixtures ────────────────────────────────────────────────────
const GOV_SEM_FONTE: Governanca = { status_declarado: 'sem_fonte', fontes: [], limitacoes: [] };
const FONTE: FonteDose = { estado_de_revisao: 'verificada', instituicao: 'I', documento: 'D', url_ou_identificador: 'u', versao: 'v', data: '2026-01-01', secao: 's', trecho: 't', populacao: 'p', indicacao: 'i', via: 'v', limitacoes_da_fonte: [] };
const APROVACAO: AprovacaoFormal = { responsavel: 'R', cargo: 'medico', data: '2026-01-01', parecer: 'p' };
const VALIDADA: Governanca = { status_declarado: 'clinicamente_validada', fontes: [FONTE], aprovacao: APROVACAO, limitacoes: [] };
type Sobrescrita = Partial<Omit<DoseRule, 'posologia'>> & { posologia?: Partial<DoseRule['posologia']> };
function regra(over: Sobrescrita = {}): DoseRule {
  const { posologia, ...resto } = over;
  return {
    regra_id: 'S1', origem: { motor: 'sintetica', referencia: 'S1' }, entidade_id: 'FIC', vinculo_entidade: 'sintetico', molecula_original: 'Fictício', faixa_idade_dias: { min: 0, min_inclusivo: true }, via: 'oral',
    posologia: { tipo_calculo: 'fixa', valor: 10, unidade_massa: 'mg', unidade_original: 'mg', base_temporal: 'por_tomada', frequencia: { tipo: 'vezes_dia', vezes: 3 }, ...posologia },
    limites: {}, ajustes: {}, restricoes: [], governanca: GOV_SEM_FONTE, pendencias: [], incompatibilidades: [], ...resto,
  };
}
const req = (over: Partial<DoseRequest> = {}): DoseRequest => ({ contrato_versao: 'dose-1', identidade: { entidade_id: 'FIC' }, idade: { valor: 30, unidade: 'anos' }, contexto: {}, ...over });
const CTX = { via: 'oral' };
const CRIADO = '2026-11-07T00:00:00.000Z';

const todos = getAllDrugs();
const porId = (id: string) => todos.find(d => d.id === id)!;
const entrada = (d: QuickDrug): FullDoseInput => ({ molecula: d.molecula, dose_adulto: d.dose_adulto, dose_pediatrica: d.dose_pediatrica, ajuste_renal: d.ajuste_renal, ajuste_hepatico: d.ajuste_hepatico, alertas_especiais: d.alertas_especiais, uso_gestante: d.uso_gestante, uso_lactante: d.uso_lactante });
const conc = (d: QuickDrug) => d.marcas.flatMap(b => b.concentracoes)[0] ?? `${d.dose_adulto.habitual} ${d.dose_adulto.unidade}`;
const calc = (d: QuickDrug, anos: number, kg: number, alt = 1.7, c: string = conc(d), gest = false, freq?: number): FullDoseResult => calcFullDose(entrada(d), anos, kg, c, undefined, '', gest, false, alt, freq);
const adultoNormal = () => todos.find(x => !x.dose_pediatrica && !calc(x, 40, 70).frequencia_indeterminada && !calc(x, 40, 70).alertas.some(a => a.startsWith('🚨')) && mapUnidadeParaContrato(calc(x, 40, 70).dose_unidade) !== null && calc(x, 40, 70).dose_por_tomada > 0)!;

describe('E1 — origens permitidas e registro não avaliado (legado)', () => {
  it('cada origem declarada é aceita; origem ou motivo inválidos são recusados (erro de programação)', () => {
    expect(ORIGENS_DA_POSOLOGIA).toEqual(['contrato_dose', 'dose_calculator', 'recomendacao_texto', 'digitada_pelo_prescritor', 'protocolo_texto', 'backend_legado', 'importacao_localstorage', 'desconhecida']);
    for (const origem of ORIGENS_DA_POSOLOGIA) { const r = registroNaoAvaliado({ origem, motivo: 'legado_sem_metadata', criado_em: CRIADO }); expect(r.origem).toBe(origem); }
    expect(() => registroNaoAvaliado({ origem: 'inventada' as never, motivo: 'texto_livre' })).toThrow(TypeError);
    expect(() => registroNaoAvaliado({ origem: 'protocolo_texto', motivo: 'qualquer' as never })).toThrow(TypeError);
    expect(MOTIVOS_NAO_AVALIADA).toHaveLength(4);
  });
  it('legado/texto/digitada/protocolo/backend/importação ⇒ SEMPRE nao_avaliada, sem fonte, sem aprovação, sem validação', () => {
    for (const origem of ['recomendacao_texto', 'digitada_pelo_prescritor', 'protocolo_texto', 'backend_legado', 'importacao_localstorage'] as const) {
      const r = registroNaoAvaliado({ origem, motivo: origem === 'recomendacao_texto' ? 'texto_livre' : 'legado_sem_metadata', texto_original: '500 mg 8/8h', criado_em: CRIADO, campos_padrao: ['duracao'] });
      expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.homologacao_clinica).toBe(false); expect(r.versao_registro).toBe(VERSAO_REGISTRO);
      if (r.avaliacao.tipo === 'nao_avaliada') { expect(r.avaliacao.homologacao_clinica).toBe(false); expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false); }
      expect(JSON.stringify(r)).not.toMatch(/regra_clinicamente_validada|aprovacao|fonte_utilizada/);
      expect(estadosDoRegistro(r)).toEqual({ nivel: 'nao_avaliada', estado_calculo: 'desconhecido', estado_regra: 'desconhecido', estado_apresentacao: 'nao_avaliada' });
    }
  });
  it('dose opcional: sem dose ⇒ null com motivo explícito; com dose ⇒ cópia idêntica', () => {
    const sem = registroNaoAvaliado({ origem: 'protocolo_texto', motivo: 'texto_livre', criado_em: CRIADO }); expect(sem.dose).toBeNull(); expect(sem.motivo_sem_dose).toBeTruthy();
    const dto = { valor: 10, unidade: 'mg' as const, frequencia: '3x/dia' as const, via: 'oral' };
    const com = registroNaoAvaliado({ origem: 'recomendacao_texto', motivo: 'texto_livre', dose: dto, criado_em: CRIADO }); expect(com.dose).toEqual(dto); expect(com.dose).not.toBe(dto);
  });
  it('campos obrigatórios do registro: versão, origem, avaliação, padrões, histórico, criação, motor (quando conhecido), homologação falsa', () => {
    const r = registroNaoAvaliado({ origem: 'digitada_pelo_prescritor', motivo: 'texto_livre', criado_em: CRIADO, motor_versao: 'motor-X', campos_padrao: ['forma_farmaceutica', 'duracao'] });
    expect(Object.keys(r).sort()).toEqual(['avaliacao', 'campos_padrao', 'criado_em', 'dose', 'edicoes_manuais', 'homologacao_clinica', 'motivo_sem_dose', 'motor_versao', 'origem', 'versao_registro'].sort());
    expect(r.campos_padrao).toEqual(['forma_farmaceutica', 'duracao']); expect(r.edicoes_manuais).toEqual([]); expect(r.criado_em).toBe(CRIADO);
    expect(registroNaoAvaliado({ origem: 'backend_legado', motivo: 'legado_sem_metadata' }).motor_versao).toBeUndefined();   // nunca presumida
  });
});

describe('E1 — DoseResult → registro', () => {
  it('preserva DTO e metadata (alertas, limite excedido, limitações) e a origem é contrato_dose', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })]);
    const reg = registroDeDoseResult(r, CTX, { criado_em: CRIADO });
    const c = converterDoseComMetadata(r, CTX);
    expect(reg.origem).toBe('contrato_dose'); expect(c.ok).toBe(true); if (c.ok) expect(reg.dose).toEqual(c.dose);
    expect(reg.avaliacao.tipo).toBe('avaliada');
    if (reg.avaliacao.tipo === 'avaliada') { const m = reg.avaliacao.metadata; expect(m.resumo.possui_alerta_critico).toBe(true); expect(m.limites_excedidos).toHaveLength(1); expect(m.limitacoes.length).toBeGreaterThan(0); expect(m.alertas.some(a => a.codigo === 'excede_limite_cadastrado')).toBe(true); }
  });
  it('resultado não convertível (bloqueado/ambíguo/sem regra): dose null, motivo registrado e metadata preservada', () => {
    for (const rs of [[regra({ regra_id: 'X' }), regra({ regra_id: 'Y' })], []]) {
      const reg = registroDeDoseResult(avaliarDose(req(), rs), CTX, { criado_em: CRIADO });
      expect(reg.dose).toBeNull(); expect(reg.motivo_sem_dose).toBeTruthy(); expect(reg.avaliacao.tipo).toBe('avaliada');
    }
    const bl = registroDeDoseResult(avaliarDose(req(), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })], { politica_limite: 'bloquear' }), CTX);
    expect(bl.dose).toBeNull(); expect(estadosDoRegistro(bl).estado_calculo).toBe('calculo_bloqueado');
  });
  it('o resultado de origem não é mutado', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })]); const antes = JSON.stringify(r);
    registroDeDoseResult(r, CTX); somenteDtoNumerico(registroDeDoseResult(r, CTX)); expect(JSON.stringify(r)).toBe(antes);
  });
});

describe('E1 — FullDoseResult (motor C) → registro', () => {
  it('cálculo normal: estado, limitações e alertas originais preservados; dose = valores do motor, sem recálculo', () => {
    const d = adultoNormal(); const r = calc(d, 40, 70); const antes = JSON.stringify(r);
    const reg = registroDeFullDoseResult(r, { via: d.dose_adulto.via }, { criado_em: CRIADO });
    expect(JSON.stringify(r)).toBe(antes);                                          // imutabilidade da origem
    expect(reg.origem).toBe('dose_calculator'); expect(reg.avaliacao.tipo).toBe('avaliada_motor_c');
    if (reg.avaliacao.tipo === 'avaliada_motor_c') {
      expect(reg.avaliacao.estado).toBe(r.estado_avaliacao); expect(reg.avaliacao.estados_adicionais).toEqual(r.estados_adicionais); expect(reg.avaliacao.limitacoes).toEqual(r.limitacoes); expect(reg.avaliacao.alertas).toEqual(r.alertas);
      expect(reg.avaliacao.fonte_clinica_registrada).toBe(false); expect(reg.avaliacao.homologacao_clinica).toBe(false);
    }
    expect(reg.dose!.valor).toBe(r.dose_por_tomada); expect(reg.dose!.unidade).toBe(mapUnidadeParaContrato(r.dose_unidade)); expect(reg.dose!.dose_por_tomada).toBe(r.dose_por_tomada);
    expect(reg.texto_original).toBe(r.posologia_sugerida);
  });
  it('bloqueio 🚨 existente ⇒ sem DTO e alerta crítico preservado (mesma conduta do botão atual; nenhuma política nova)', () => {
    const d = todos.find(x => x.uso_gestante === 'contraindicado')!; const r = calc(d, 30, 60, 1.6, conc(d), true);
    const reg = registroDeFullDoseResult(r, { via: d.dose_adulto.via });
    expect(reg.dose).toBeNull(); expect(reg.motivo_sem_dose).toMatch(/bloqueio de segurança/);
    expect(reg.avaliacao.tipo === 'avaliada_motor_c' && reg.avaliacao.possui_alerta_critico).toBe(true); expect(reg.avaliacao.tipo === 'avaliada_motor_c' && reg.avaliacao.alertas.some(a => a.startsWith('🚨 GESTAÇÃO'))).toBe(true);
  });
  it('frequência indeterminada ⇒ sem DTO; estado dados_insuficientes e limitação preservados', () => {
    const d = todos.find(x => { const r = calc(x, 4, 15, 1.0); return !x.dose_pediatrica && r.frequencia_indeterminada && !!r.tomadas_faixa; })!;
    const r = calc(d, 4, 15, 1.0); const reg = registroDeFullDoseResult(r, { via: d.dose_adulto.via });
    expect(reg.dose).toBeNull(); expect(reg.motivo_sem_dose).toMatch(/frequência indeterminada/);
    expect(reg.avaliacao.tipo === 'avaliada_motor_c' && reg.avaliacao.estado).toBe('dados_insuficientes'); expect(reg.avaliacao.tipo === 'avaliada_motor_c' && reg.avaliacao.limitacoes.map(l => l.codigo)).toContain('frequencia_indeterminada');
  });
  it('estados do motor C preservados nos cenários reais (regra inexistente, incompatível, adolescente, apresentação, dados inválidos)', () => {
    const cenarios: Array<[string, FullDoseResult, string]> = [
      ['regra_inexistente', calc(porId('cefalexina'), 4, 15, 1.0), 'cefalexina'],
      ['regra_incompativel', calc(porId('metformina'), 4, 15, 1.0), 'metformina'],
      ['avaliacao_especifica_necessaria', calc(porId('paracetamol'), 14, 50, 1.6), 'paracetamol'],
      ['apresentacao_nao_interpretada', calc(adultoNormal(), 40, 70, 1.7, '??? sem número'), adultoNormal().id],
      ['dados_invalidos', calc(adultoNormal(), Number.NaN, 70), adultoNormal().id],
    ];
    for (const [esperado, r, id] of cenarios) {
      const reg = registroDeFullDoseResult(r, { via: porId(id).dose_adulto.via });
      expect(reg.avaliacao.tipo).toBe('avaliada_motor_c');
      const todosEstados = reg.avaliacao.tipo === 'avaliada_motor_c' ? [reg.avaliacao.estado, ...reg.avaliacao.estados_adicionais] : [];
      expect(todosEstados, esperado).toContain(esperado as EstadoAvaliacaoDose);
      if (reg.avaliacao.tipo === 'avaliada_motor_c') { expect(reg.avaliacao.limitacoes).toEqual(r.limitacoes); expect(reg.avaliacao.estado).toBe(r.estado_avaliacao); }
    }
  });
  it('unidade sem equivalente (ex.: rótulo "mg/kg/dose" do ibuprofeno pediátrico) ⇒ sem DTO, com motivo — o valor do motor não é reinterpretado', () => {
    const r = calc(porId('ibuprofeno'), 4, 15, 1.0); expect(r.dose_unidade).toBe('mg/kg/dose');
    const reg = registroDeFullDoseResult(r, { via: 'VO' }); expect(reg.dose).toBeNull(); expect(reg.motivo_sem_dose).toMatch(/sem equivalente em UnidadeDose/);
  });
  it('resultado sem estado reconhecível NÃO é tratado como avaliado', () => {
    const reg = registroDeFullDoseResult({ dose_por_tomada: 10, dose_unidade: 'mg', tomadas_dia: 3 } as unknown as FullDoseResult, { via: 'VO' });
    expect(reg.avaliacao.tipo).toBe('nao_avaliada'); expect(reg.dose).toBeNull(); expect(reg.origem).toBe('dose_calculator');
  });
  it('DTO numérico idêntico ao valor do motor em TODO o catálogo (382 medicamentos, adulto 40 a/70 kg); a origem nunca é alterada', () => {
    let comDose = 0;
    for (const d of todos) {
      const r = calc(d, 40, 70); const antes = JSON.stringify(r);
      const reg = registroDeFullDoseResult(r, { via: d.dose_adulto.via });
      expect(JSON.stringify(r), d.id).toBe(antes);
      if (reg.dose) { comDose++; expect(reg.dose.valor, d.id).toBe(r.dose_por_tomada); expect(reg.dose.dose_por_tomada, d.id).toBe(r.dose_por_tomada); expect(reg.dose.via, d.id).toBe(d.dose_adulto.via); }
      expect(reg.avaliacao.tipo === 'avaliada_motor_c' && reg.avaliacao.estado, d.id).toBe(r.estado_avaliacao);
    }
    expect(comDose).toBeGreaterThan(50);
  }, 120000);
});

describe('E1 — mapeamento central de estados (motor C ↔ contrato ↔ registro)', () => {
  it('cobre exatamente os 8 estados do motor C, sem lacuna', () => {
    expect(Object.keys(MAPEAMENTO_ESTADOS_MOTOR_C).sort()).toEqual(Object.keys(ROTULO_ESTADO_AVALIACAO).sort());
    expect(Object.keys(MAPEAMENTO_ESTADOS_MOTOR_C)).toHaveLength(8);
  });
  it('equivalências declaradas: exatas só onde a semântica coincide; o resto fica "desconhecido" (nunca forçado)', () => {
    const M = MAPEAMENTO_ESTADOS_MOTOR_C;
    expect(M.calculo_realizado_regra_nao_validada).toMatchObject({ estado_calculo: 'calculo_realizado', equivalencia: 'exata' });
    expect(M.dados_insuficientes).toMatchObject({ estado_calculo: 'dados_insuficientes', equivalencia: 'exata' });
    expect(M.dados_invalidos).toMatchObject({ estado_calculo: 'entrada_invalida', equivalencia: 'exata' });
    expect(M.bloqueado_por_seguranca).toMatchObject({ estado_calculo: 'calculo_bloqueado', equivalencia: 'parcial' });
    expect(M.apresentacao_nao_interpretada).toMatchObject({ estado_calculo: 'desconhecido', estado_apresentacao: 'nao_convertida', equivalencia: 'parcial' });
    for (const e of ['regra_inexistente', 'regra_incompativel', 'avaliacao_especifica_necessaria'] as const) expect(M[e]).toMatchObject({ estado_calculo: 'desconhecido', equivalencia: 'sem_equivalente_exato' });
  });
  it('nenhum estado do motor C mapeia para "validada" nem afirma fonte: o estado da regra é sempre "regra_sem_fonte"', () => {
    for (const v of Object.values(MAPEAMENTO_ESTADOS_MOTOR_C)) { expect(v.estado_regra).toBe('regra_sem_fonte'); expect(v.estado_regra).not.toBe('regra_clinicamente_validada'); }
  });
  it('estadosDoRegistro: contrato usa a metadata; motor C usa a tabela; não avaliado ⇒ tudo desconhecido', () => {
    const c = registroDeDoseResult(avaliarDose(req(), [regra()]), CTX); expect(estadosDoRegistro(c)).toMatchObject({ nivel: 'avaliada_contrato', estado_calculo: 'calculo_realizado', estado_regra: 'regra_sem_fonte' });
    const m = registroDeFullDoseResult(calc(porId('cefalexina'), 4, 15, 1.0), { via: 'VO' }); expect(estadosDoRegistro(m)).toMatchObject({ nivel: 'avaliada_motor_c', estado_calculo: 'desconhecido', estado_regra: 'regra_sem_fonte' });
  });
});

describe('E1 — nenhuma promoção indevida a validada', () => {
  const resultadoValidado = () => avaliarDose(req(), [regra({ governanca: VALIDADA })]);
  it('sem aprovação formal demonstrável no registro, "validada" é REBAIXADA (e a causa é registrada); com aprovação completa permanece', () => {
    const r = resultadoValidado(); expect(r.estado_regra).toBe('regra_clinicamente_validada');
    const sem = registroDeDoseResult(r, CTX); expect(estadosDoRegistro(sem).estado_regra).toBe('fonte_consultada_aguardando_revisao');
    if (sem.avaliacao.tipo === 'avaliada') { expect(sem.avaliacao.metadata.completude.ausentes).toContain('aprovacao_formal_demonstravel'); expect(sem.avaliacao.metadata.limitacoes.join(' ')).toMatch(/rebaixado/); }
    expect(estadosDoRegistro(registroDeDoseResult(r, CTX, { aprovacao_formal: APROVACAO })).estado_regra).toBe('regra_clinicamente_validada');
    expect(estadosDoRegistro(registroDeDoseResult(r, CTX, { aprovacao_formal: { ...APROVACAO, parecer: '' } })).estado_regra).toBe('fonte_consultada_aguardando_revisao');
    expect(r.homologacao_clinica).toBe(false); expect(registroDeDoseResult(r, CTX, { aprovacao_formal: APROVACAO }).homologacao_clinica).toBe(false);
  });
  it('resultado FORJADO afirmando validação sem fonte verificada nunca sai como validada', () => {
    const forjado = { ...avaliarDose(req(), [regra()]), estado_regra: 'regra_clinicamente_validada' } as unknown as DoseResult;
    expect(estadosDoRegistro(registroDeDoseResult(forjado, CTX, { aprovacao_formal: APROVACAO })).estado_regra).toBe('regra_sem_fonte');
  });
  it('registro persistido ADULTERADO (estado validado sem prova) é rebaixado ao normalizar', () => {
    const reg = JSON.parse(JSON.stringify(registroDeDoseResult(avaliarDose(req(), [regra()]), CTX))) as { avaliacao: { metadata: Record<string, unknown> } };
    reg.avaliacao.metadata.estado_regra = 'regra_clinicamente_validada';
    expect(estadosDoRegistro(normalizarRegistro(reg)).estado_regra).toBe('regra_sem_fonte');
    const ok = JSON.parse(JSON.stringify(registroDeDoseResult(resultadoValidado(), CTX, { aprovacao_formal: APROVACAO })));
    expect(estadosDoRegistro(normalizarRegistro(ok)).estado_regra).toBe('regra_clinicamente_validada');
    delete ok.avaliacao.aprovacao_formal; expect(estadosDoRegistro(normalizarRegistro(ok)).estado_regra).toBe('fonte_consultada_aguardando_revisao');
  });
  it('nenhum adaptador produz validação para o motor C nem para registros não avaliados', () => {
    expect(JSON.stringify(registroDeFullDoseResult(calc(adultoNormal(), 40, 70), { via: 'VO' }))).not.toMatch(/regra_clinicamente_validada/);
    expect(estadoDaRegra(GOV_SEM_FONTE)).toBe('regra_sem_fonte');
  });
});

describe('E1 — somenteDtoNumerico: a metadata acompanha', () => {
  it('devolve a marca explícita e a avaliação; não há como obter a dose sem a avaliação', () => {
    const reg = registroDeDoseResult(avaliarDose(req(), [regra()]), CTX, { criado_em: CRIADO });
    const x = somenteDtoNumerico(reg);
    expect(x.metadata_necessaria).toBe(true); expect(x.avaliacao).toEqual(reg.avaliacao); expect(x.origem).toBe('contrato_dose'); expect(x.aviso).toMatch(/Ausência de alerta não indica segurança/);
    expect(x.dose).toEqual(reg.dose); expect(x.dose).not.toBe(reg.dose);
    const leg = somenteDtoNumerico(registroNaoAvaliado({ origem: 'backend_legado', motivo: 'legado_sem_metadata', dose: { valor: 1, unidade: 'mg', frequencia: '1x/dia', via: 'oral' } }));
    expect(leg.metadata_necessaria).toBe(true); expect(leg.avaliacao.tipo).toBe('nao_avaliada');
  });
  it('DTO numérico idêntico antes e depois (grade sintética de 40 casos)', () => {
    let n = 0;
    for (const u of ['mg', 'mcg', 'g', 'UI'] as const) for (const f of [{ tipo: 'vezes_dia', vezes: 2 }, { tipo: 'intervalo_h', horas: 8 }, { tipo: 'dose_unica' }, { tipo: 'vezes_dia', vezes: 4 }, { tipo: 'intervalo_h', horas: 12 }] as const) for (const base of ['por_tomada', 'por_dia'] as const) {
      const r = avaliarDose(req({ peso_atual_kg: 12 }), [regra({ posologia: { unidade_massa: u, frequencia: f, base_temporal: base, valor: 9 } })]);
      const c = converterDoseComMetadata(r, { via: 'oral' }); const x = somenteDtoNumerico(registroDeDoseResult(r, { via: 'oral' }));
      expect(JSON.stringify(x.dose)).toBe(JSON.stringify(c.ok ? c.dose : null)); n++;
    }
    expect(n).toBe(40);
  });
});

describe('E1 — estado desconhecido, dados ausentes e edição', () => {
  it('estado desconhecido é preservado (nunca promovido a conhecido)', () => {
    const r = normalizarRegistro({ versao_registro: VERSAO_REGISTRO, origem: 'dose_calculator', dose: null, avaliacao: { tipo: 'avaliada_motor_c', estado: 'estado_que_nao_existe' } });
    expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(estadosDoRegistro(r).estado_calculo).toBe('desconhecido');
    const meta = normalizarRegistro({ versao_registro: VERSAO_REGISTRO, origem: 'contrato_dose', avaliacao: { tipo: 'avaliada', metadata: {} } });
    expect(estadosDoRegistro(meta)).toMatchObject({ estado_calculo: 'desconhecido', estado_regra: 'desconhecido' });
    if (meta.avaliacao.tipo === 'avaliada') expect(meta.avaliacao.metadata.completude.integral).toBe(false);
  });
  it('dados ausentes NÃO são interpretados como negativos: sem metadata ≠ sem alertas ≠ sem limitações ≠ segurança', () => {
    for (const lixo of [undefined, null, 7, 'x', [], {}]) {
      const r = normalizarRegistro(lixo);
      expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.origem).toBe('desconhecida'); expect(r.homologacao_clinica).toBe(false);
      if (r.avaliacao.tipo === 'nao_avaliada') expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false);
      expect(JSON.stringify(r)).not.toMatch(/"alertas":\[\]/);   // não fabrica "lista vazia de alertas" como se fosse confirmação
    }
    const meta = extrairMetadataAvaliacao({ estado_calculo: 'calculo_realizado' }); expect(meta.completude.integral).toBe(false); expect(meta.ausencia_de_alerta_indica_seguranca).toBe(false);
  });
  it('edição manual (função pura, não conectada a telas): anota a trilha, invalida a avaliação e guarda a anterior; não altera a dose nem a origem', () => {
    const reg = registroDeDoseResult(avaliarDose(req(), [regra()]), CTX, { criado_em: CRIADO }); const antes = JSON.stringify(reg);
    const ed = comEdicaoManual(reg, { campo: 'dose', de: '10 mg', para: '20 mg', em: CRIADO });
    expect(JSON.stringify(reg)).toBe(antes);                       // imutável
    expect(ed.edicoes_manuais).toHaveLength(1); expect(ed.avaliacao.tipo).toBe('nao_avaliada');
    if (ed.avaliacao.tipo === 'nao_avaliada') { expect(ed.avaliacao.motivo).toBe('editada_apos_calculo'); expect(ed.avaliacao.avaliacao_anterior?.tipo).toBe('avaliada'); }
    expect(ed.dose).toEqual(reg.dose); expect(ed.origem).toBe(reg.origem);
    const ed2 = comEdicaoManual(ed, { campo: 'frequencia', de: '3x/dia', para: '2x/dia', em: CRIADO });
    expect(ed2.edicoes_manuais).toHaveLength(2); if (ed2.avaliacao.tipo === 'nao_avaliada') expect(ed2.avaliacao.avaliacao_anterior?.tipo).toBe('avaliada');   // a avaliação original é preservada, não substituída por "não avaliada"
  });
});

describe('E1 — versionamento e compatibilidade', () => {
  it('serialização → normalização é idempotente e preserva tudo (contrato e motor C)', () => {
    const regs: PosologiaRegistrada[] = [
      registroDeDoseResult(avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })]), CTX, { criado_em: CRIADO, texto_original: 't', campos_padrao: ['duracao'], motor_versao: 'v1' }),
      registroDeFullDoseResult(calc(adultoNormal(), 40, 70), { via: 'VO' }, { criado_em: CRIADO }),
      registroNaoAvaliado({ origem: 'protocolo_texto', motivo: 'texto_livre', criado_em: CRIADO }),
      comEdicaoManual(registroDeDoseResult(avaliarDose(req(), [regra()]), CTX, { criado_em: CRIADO }), { campo: 'dose', de: '1', para: '2', em: CRIADO }),
    ];
    for (const r of regs) { const n = normalizarRegistro(JSON.parse(JSON.stringify(r))); expect(n).toEqual(r); expect(normalizarRegistro(JSON.parse(JSON.stringify(n)))).toEqual(n); }
  });
  it('versão de registro desconhecida ⇒ nao_avaliada (não se reaproveita metadata de versão que não se conhece)', () => {
    const reg = JSON.parse(JSON.stringify(registroDeDoseResult(avaliarDose(req(), [regra()]), CTX))); reg.versao_registro = 'posologia-99';
    const n = normalizarRegistro(reg); expect(n.versao_registro).toBe(VERSAO_REGISTRO); expect(n.avaliacao.tipo).toBe('nao_avaliada');
  });
  it('compatibilidade: o registro contém o DoseEstruturada EXISTENTE sem alterá-lo e é serializável', () => {
    const reg = registroDeDoseResult(avaliarDose(req(), [regra()]), CTX);
    expect(Object.keys(reg.dose!).every(k => ['valor', 'unidade', 'frequencia', 'frequencia_detalhe', 'via', 'dose_por_kg_dia', 'dose_por_tomada'].includes(k))).toBe(true);
    expect(() => JSON.stringify(reg)).not.toThrow();
  });
});
