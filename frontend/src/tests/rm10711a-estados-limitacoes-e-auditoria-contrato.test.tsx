// ============================================================
// RM-107.1.1-A — C-01 (estados), C-06 (apresentação não interpretada), C-08 (adolescentes), invariância numérica
// e auditoria de `paraDoseEstruturada()`. Os campos novos são INFORMATIVOS: nenhum valor/dose/frequência/limite mudou.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen } from '@testing-library/react';
import { getAllDrugs, type QuickDrug } from '@/lib/pharma-database';
import { calcFullDose, parseConcentration, type FullDoseInput, type FullDoseResult } from '@/lib/dose-calculator';
import { derivarAvaliacaoDose, ROTULO_ESTADO_AVALIACAO, type EstadoAvaliacaoDose } from '@/lib/dose-estados';
import { DoseCalcCard } from '@/components/modules/DoseCalcCard';
import { avaliarDose, paraDoseEstruturada, type DoseRequest, type DoseRule, type Governanca, type FonteDose } from '@/lib/dose-contract';

const todos = getAllDrugs();
const porId = (id: string) => todos.find(d => d.id === id)!;
const entrada = (d: QuickDrug): FullDoseInput => ({ molecula: d.molecula, dose_adulto: d.dose_adulto, dose_pediatrica: d.dose_pediatrica, ajuste_renal: d.ajuste_renal, ajuste_hepatico: d.ajuste_hepatico, alertas_especiais: d.alertas_especiais, uso_gestante: d.uso_gestante, uso_lactante: d.uso_lactante });
const conc = (d: QuickDrug) => d.marcas.flatMap(b => b.concentracoes)[0] ?? `${d.dose_adulto.habitual} ${d.dose_adulto.unidade}`;
const calc = (d: QuickDrug, anos: number, kg: number, alt = 1.7, c: string = conc(d), gest = false, freq?: number) => calcFullDose(entrada(d), anos, kg, c, undefined, '', gest, false, alt, freq);
const criticos = (r: FullDoseResult) => r.alertas.filter(a => a.startsWith('🚨')).length;

describe('RM-107.1.1-A — invariância: NENHUM valor do motor mudou (382 medicamentos × 5 pacientes vs linha de base da RM-107.1)', () => {
  const base = path.join(__dirname, '..', '..', '..', 'docs', 'auditorias', 'RM-107.1', 'evidencias', 'catalogo-dose-calculator-por-paciente.json');
  const PAC: Array<[string, number, number, number]> = [['neonato_14d_3.5kg', 14 / 365, 3.5, 0.5], ['lactente_6m_8kg', 0.5, 8, 0.68], ['crianca_4a_15kg', 4, 15, 1.0], ['adolescente_14a_50kg', 14, 50, 1.6], ['adulto_40a_70kg', 40, 70, 1.7]];
  it('tomada, unidade, dia, fonte, população, nº de bloqueios 🚨 e frequência indeterminada idênticos à linha de base', () => {
    expect(fs.existsSync(base)).toBe(true);
    const linhas = JSON.parse(fs.readFileSync(base, 'utf8')) as Array<Record<string, unknown>>;
    expect(linhas).toHaveLength(382);
    let comparados = 0;
    for (const l of linhas) {
      const d = porId(String(l.id));
      for (const [k, anos, kg, alt] of PAC) {
        const r = calc(d, anos, kg, alt);
        expect(r.dose_por_tomada, `${d.id}/${k}`).toBe(l[`${k}_tomada`]); expect(r.dose_unidade, `${d.id}/${k}`).toBe(l[`${k}_unid`]); expect(r.dose_total_dia, `${d.id}/${k}`).toBe(l[`${k}_dia`]);
        expect(r.fonte, `${d.id}/${k}`).toBe(l[`${k}_fonte`]); expect(r.population.population, `${d.id}/${k}`).toBe(l[`${k}_pop`]);
        expect(criticos(r), `${d.id}/${k}`).toBe(l[`${k}_bloqueio`]); expect(r.frequencia_indeterminada, `${d.id}/${k}`).toBe(l[`${k}_freq_indet`]);
        comparados++;
      }
    }
    expect(comparados).toBe(382 * 5);
  }, 120000);

  it('os campos pré-existentes continuam presentes (compatibilidade dos consumidores) e os novos são aditivos', () => {
    const r = calc(porId('losartana'), 50, 70);
    for (const k of ['population', 'dose_por_tomada', 'dose_unidade', 'volume_por_tomada', 'gotas_por_tomada', 'bsa_m2', 'frequencia', 'tomadas_dia', 'tomadas_faixa', 'dose_total_dia', 'posologia_sugerida', 'passo_a_passo', 'alertas', 'ajuste_renal_texto', 'ajuste_hepatico_texto', 'limitado_por_dose_max', 'frequencia_indeterminada', 'fonte']) expect(k in r || k === 'volume_por_tomada' || k === 'gotas_por_tomada' || k === 'bsa_m2' || k === 'tomadas_faixa' || k === 'ajuste_renal_texto' || k === 'ajuste_hepatico_texto', k).toBe(true);
    expect(typeof r.estado_avaliacao).toBe('string'); expect(Array.isArray(r.estados_adicionais)).toBe(true); expect(Array.isArray(r.limitacoes)).toBe(true);
  });
});

describe('RM-107.1.1-A — C-01: estados de avaliação (informativos; nenhum estado de aprovação/segurança)', () => {
  it('conjunto fechado de estados; nenhum rótulo afirma validação/segurança sem negação explícita', () => {
    const estados = Object.keys(ROTULO_ESTADO_AVALIACAO).sort();
    expect(estados).toEqual(['apresentacao_nao_interpretada', 'avaliacao_especifica_necessaria', 'bloqueado_por_seguranca', 'calculo_realizado_regra_nao_validada', 'dados_insuficientes', 'dados_invalidos', 'regra_incompativel', 'regra_inexistente']);
    for (const [e, rot] of Object.entries(ROTULO_ESTADO_AVALIACAO)) {
      expect(e).not.toMatch(/aprovad|seguro|recomend|sugerid/);
      if (/valid/i.test(rot)) expect(rot).toMatch(/NÃO/);
      expect(rot).not.toMatch(/segur[ao]\b(?! já)|recomendad|sugerid/i);
    }
  });

  it('cálculo normal de adulto ⇒ "cálculo realizado com regra NÃO validada" + limitação de regra não validada', () => {
    const d = todos.find(x => !x.dose_pediatrica && !criticos(calc(x, 40, 70)) && !calc(x, 40, 70).frequencia_indeterminada && parseConcentration(conc(x)).tipo !== 'desconhecido')!;
    const r = calc(d, 40, 70);
    expect(r.estado_avaliacao).toBe('calculo_realizado_regra_nao_validada'); expect(r.estados_adicionais).toEqual([]);
    expect(r.limitacoes.map(l => l.codigo)).toContain('regra_nao_validada');
  });

  it('frequência indeterminada ⇒ dados_insuficientes (bloqueio existente preservado); com confirmação, o estado muda e a dose NÃO é alterada pelo estado', () => {
    const d = todos.find(x => { const r = calc(x, 4, 15, 1.0); return !x.dose_pediatrica && r.frequencia_indeterminada && !!r.tomadas_faixa; })!;
    const sem = calc(d, 4, 15, 1.0);
    expect(sem.estado_avaliacao).toBe('dados_insuficientes'); expect(sem.limitacoes.map(l => l.codigo)).toContain('frequencia_indeterminada'); expect(criticos(sem)).toBeGreaterThan(0);
    const com = calc(d, 4, 15, 1.0, conc(d), false, sem.tomadas_faixa![0]);
    expect(com.estado_avaliacao).not.toBe('dados_insuficientes');
  });

  it('dados inválidos (idade/peso/altura) ⇒ dados_invalidos, SEM lançar erro e SEM alterar o valor calculado', () => {
    const d = todos.find(x => !x.dose_pediatrica && !calc(x, 40, 70).frequencia_indeterminada && !criticos(calc(x, 40, 70)))!;
    const normal = calc(d, 40, 70);
    for (const [anos, kg] of [[Number.NaN, 70], [-3, 70], [40, 0], [40, -5], [40, Number.NaN]] as const) {
      const r = calc(d, anos, kg);
      expect(r.estado_avaliacao).toBe('dados_invalidos');
      if (anos === 40) expect(r.dose_por_tomada).toBe(normal.dose_por_tomada); // adulto: o peso não entra no valor ⇒ valor idêntico, apenas sinalizado
    }
    expect(calc(d, 40, 70, 0).estados_adicionais.concat(calc(d, 40, 70, 0).estado_avaliacao)).toContain('dados_invalidos');
  });

  it('regra pediátrica inexistente (identificável) ⇒ regra_inexistente; o valor segue sendo o do ramo adulto, inalterado', () => {
    const cef = porId('cefalexina'); const r = calc(cef, 4, 15, 1.0);
    expect(cef.dose_pediatrica).toBeUndefined();
    expect(r.estado_avaliacao).toBe('regra_inexistente'); expect(r.fonte).toBe('adulto_fixo'); expect(r.dose_por_tomada).toBe(500);
    expect(r.limitacoes.map(l => l.codigo)).toContain('regra_pediatrica_nao_cadastrada');
    expect(r.limitacoes.find(l => l.codigo === 'regra_pediatrica_nao_cadastrada')!.mensagem).toMatch(/não indica que o uso pediátrico seja apropriado ou não/i);
  });

  it('regra pediátrica incompatível (dose por kg ≤ 0) ⇒ regra_incompativel; valor adulto inalterado (metformina)', () => {
    const met = porId('metformina'); const r = calc(met, 4, 15, 1.0);
    expect(met.dose_pediatrica!.dose_por_kg).toBe(0);
    expect(r.estado_avaliacao).toBe('regra_incompativel'); expect(r.fonte).toBe('adulto_fixo'); expect(r.dose_por_tomada).toBe(850);
  });

  it('regra pediátrica válida e utilizada ⇒ sem estado de regra inexistente/incompatível/específica', () => {
    const r = calc(porId('amoxicilina'), 4, 15, 1.0);
    expect(r.fonte.startsWith('pediatrica')).toBe(true);
    expect([r.estado_avaliacao, ...r.estados_adicionais]).not.toEqual(expect.arrayContaining(['regra_inexistente']));
    expect([r.estado_avaliacao, ...r.estados_adicionais]).not.toContain('regra_incompativel'); expect([r.estado_avaliacao, ...r.estados_adicionais]).not.toContain('avaliacao_especifica_necessaria');
  });

  it('bloqueio de segurança já existente (🚨 de gestação) ⇒ bloqueado_por_seguranca; o alerta original é preservado', () => {
    const d = todos.find(x => x.uso_gestante === 'contraindicado')!;
    const r = calc(d, 30, 60, 1.6, conc(d), true);
    expect(criticos(r)).toBeGreaterThan(0); expect(r.estado_avaliacao).toBe('bloqueado_por_seguranca'); expect(r.alertas.some(a => a.startsWith('🚨 GESTAÇÃO'))).toBe(true);
  });

  it('derivação pura: precedência e nenhum estado oculto', () => {
    const a = derivarAvaliacaoDose({ idadeAnos: 4, pesoKg: 15, concentracao: 'x', concentracaoTipo: 'desconhecido', usarDosePediatricaPorIdade: true, adolescente: false, temRegraPediatrica: false, doseKgPediatricaPositiva: false, regraPediatricaUsada: false, frequenciaIndeterminada: true, bloqueadoPorAlturaAusente: false, criticosDeSeguranca: 0 });
    expect(a.estado_avaliacao).toBe('dados_insuficientes'); expect(a.estados_adicionais).toEqual(['regra_inexistente', 'apresentacao_nao_interpretada']);
    const todosEstados = new Set<EstadoAvaliacaoDose>([a.estado_avaliacao, ...a.estados_adicionais]); expect(todosEstados.size).toBe(3);
  });
});

describe('RM-107.1.1-A — C-06: apresentação não interpretada e dose não ajustada à apresentação', () => {
  it('concentração não interpretada ⇒ estado + limitação; volume e gotas NÃO são apresentados; dose inalterada', () => {
    const d = todos.find(x => !x.dose_pediatrica && !calc(x, 40, 70).frequencia_indeterminada && !criticos(calc(x, 40, 70)))!;
    expect(parseConcentration('??? sem número').tipo).toBe('desconhecido');
    const ok = calc(d, 40, 70); const ruim = calc(d, 40, 70, 1.7, '??? sem número');
    expect([ruim.estado_avaliacao, ...ruim.estados_adicionais]).toContain('apresentacao_nao_interpretada');
    expect(ruim.limitacoes.map(l => l.codigo)).toContain('apresentacao_nao_interpretada');
    expect(ruim.volume_por_tomada).toBeUndefined(); expect(ruim.gotas_por_tomada).toBeUndefined();
    expect(ruim.dose_por_tomada).toBe(ok.dose_por_tomada); expect(ruim.dose_total_dia).toBe(ok.dose_total_dia);
  });

  it('a concentração NÃO participa da dose: limitação registrada em TODO cálculo com apresentação; mudar a concentração não muda a dose (266 medicamentos, caracterização)', () => {
    let n = 0;
    for (const d of todos) {
      const cs = [...new Set(d.marcas.flatMap(b => b.concentracoes))];
      if (cs.length < 2) continue;
      const rs = cs.map(c => calc(d, 40, 70, 1.7, c));
      expect(new Set(rs.map(r => `${r.dose_por_tomada}|${r.tomadas_dia}`)).size, d.id).toBe(1);
      for (const r of rs) expect(r.limitacoes.map(l => l.codigo), d.id).toContain('dose_nao_ajustada_a_apresentacao');
      n++;
    }
    expect(n).toBe(266);
  });

  it('a limitação não decide dependência clínica: cita D10 como pendente', () => {
    const r = calc(porId('amoxicilina'), 40, 70, 1.7, '500 mg');
    expect(r.limitacoes.find(l => l.codigo === 'dose_nao_ajustada_a_apresentacao')!.mensagem).toMatch(/D10/);
  });
});

describe('RM-107.1.1-A — C-08: limitação informativa para adolescentes (classificação e cálculo inalterados)', () => {
  it('adolescente + regra pediátrica cadastrada não utilizada ⇒ limitação e estado informativo; população e dose inalteradas', () => {
    const p = porId('paracetamol'); const r = calc(p, 14, 50, 1.6);
    expect(r.population.population).toBe('adolescente'); expect(r.population.usar_dose_pediatrica).toBe(false); expect(r.fonte).toBe('adulto_fixo');
    const l = r.limitacoes.find(x => x.codigo === 'regra_pediatrica_nao_utilizada_adolescente')!;
    expect(l).toBeDefined(); expect(l.mensagem).toMatch(/NÃO foi utilizada/); expect(l.mensagem).toMatch(/não existe critério de transição clinicamente validado/);
    expect([r.estado_avaliacao, ...r.estados_adicionais]).toContain('avaliacao_especifica_necessaria');
  });
  it('não se aplica a criança (regra usada), a adulto nem a adolescente sem regra pediátrica cadastrada', () => {
    expect(calc(porId('paracetamol'), 4, 15, 1.0).limitacoes.map(l => l.codigo)).not.toContain('regra_pediatrica_nao_utilizada_adolescente');
    expect(calc(porId('paracetamol'), 40, 70).limitacoes.map(l => l.codigo)).not.toContain('regra_pediatrica_nao_utilizada_adolescente');
    expect(calc(porId('cefalexina'), 14, 50, 1.6).limitacoes.map(l => l.codigo)).not.toContain('regra_pediatrica_nao_utilizada_adolescente');
  });
  it('limites exatos de idade: 11,99 a (pediátrico), 12 a e 17,99 a (adolescente), 18 a (adulto)', () => {
    const cod = (anos: number) => calc(porId('paracetamol'), anos, 50, 1.6).limitacoes.map(l => l.codigo).includes('regra_pediatrica_nao_utilizada_adolescente');
    expect(cod(11.99)).toBe(false); expect(cod(12)).toBe(true); expect(cod(17.99)).toBe(true); expect(cod(18)).toBe(false);
  });
});

describe('RM-107.1.1-A — interface informativa (DoseCalcCard): neutra, sem selo de aprovação/segurança, rótulos existentes preservados', () => {
  it('exibe estado e limitações em bloco neutro; mantém os rótulos atuais (D13 pendente)', () => {
    const d = porId('cefalexina');
    render(React.createElement(DoseCalcCard, { drug: entrada(d), concentracaoSelecionada: conc(d), idadeAnos: 4, pesoKg: 15, alturaM: 1.0, onApply: vi.fn() }));
    const bloco = screen.getByTestId('dose-estado-avaliacao');
    expect(bloco.dataset.estado).toBe('regra_inexistente'); expect(bloco.textContent).toMatch(/Regra pediátrica não cadastrada/); expect(bloco.textContent).toMatch(/NÃO validada clinicamente|sem validação clínica/);
    expect(bloco.className).not.toMatch(/emerald|green|lime|teal/); expect(bloco.innerHTML).not.toMatch(/emerald|green|lime|teal|CheckCircle/);
    expect(screen.getByText('Prescrição Sugerida')).toBeInTheDocument();           // rótulo existente NÃO alterado (D13)
    expect(screen.getAllByTestId('dose-limitacao').length).toBeGreaterThanOrEqual(2);
  });
});

// ── Auditoria de `paraDoseEstruturada()` (RM-107.2) ─────────────────────────
describe('RM-107.1.1-A — auditoria de paraDoseEstruturada(): o que a conversão preserva e o que PERDE (caracterização; correção proposta à parte)', () => {
  const GOV: Governanca = { status_declarado: 'sem_fonte', fontes: [], limitacoes: [] };
  const FONTE: FonteDose = { estado_de_revisao: 'verificada', instituicao: 'I', documento: 'D', url_ou_identificador: 'u', versao: 'v', data: '2026-01-01', secao: 's', trecho: 't', populacao: 'p', indicacao: 'i', via: 'v', limitacoes_da_fonte: [] };
  const regra = (over: Partial<DoseRule> = {}): DoseRule => ({ regra_id: 'S', origem: { motor: 'sintetica', referencia: 'S' }, entidade_id: 'FIC', vinculo_entidade: 'sintetico', molecula_original: 'F', faixa_idade_dias: { min: 0, min_inclusivo: true }, via: 'oral', posologia: { tipo_calculo: 'fixa', valor: 10, unidade_massa: 'mg', unidade_original: 'mg', base_temporal: 'por_tomada', frequencia: { tipo: 'vezes_dia', vezes: 3 } }, limites: {}, ajustes: {}, restricoes: [], governanca: GOV, pendencias: [], incompatibilidades: [], ...over });
  const req = (): DoseRequest => ({ contrato_versao: 'dose-1', identidade: { entidade_id: 'FIC' }, idade: { valor: 30, unidade: 'anos' }, contexto: {} });
  const CHAVES_DTO = ['valor', 'unidade', 'frequencia', 'frequencia_detalhe', 'via', 'dose_por_kg_dia', 'dose_por_tomada'];

  it('resultado com LIMITE EXCEDIDO (política padrão "alertar") É convertido em dose estruturada persistível — e o excesso/alerta crítico NÃO acompanha a conversão (LACUNA)', () => {
    const r = avaliarDose(req(), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })]);
    expect(r.estado_calculo).toBe('calculo_realizado'); expect(r.limites_excedidos).toHaveLength(1); expect(r.alertas.some(a => a.severidade === 'critico')).toBe(true);
    const c = paraDoseEstruturada(r, { via: 'oral' });
    expect(c.ok).toBe(true);                                             // convertido, apesar do alerta crítico
    if (c.ok) { expect(Object.keys(c.dose).every(k => CHAVES_DTO.includes(k))).toBe(true); expect(JSON.stringify(c.dose)).not.toMatch(/excede|limite|alerta|critico|valida/i); }
  });

  it('com política "bloquear" o mesmo caso NÃO é convertido (comportamento existente do contrato; a política de limites continua pendente — D7)', () => {
    const r = avaliarDose(req(), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })], { politica_limite: 'bloquear' });
    expect(r.estado_calculo).toBe('calculo_bloqueado'); expect(paraDoseEstruturada(r, { via: 'oral' }).ok).toBe(false);
  });

  it('o estado de validação da regra NÃO é preservado: regra sem fonte e regra formalmente validada geram DoseEstruturada idêntica (LACUNA: não confundível, mas indistinguível)', () => {
    const validada: Governanca = { status_declarado: 'clinicamente_validada', fontes: [FONTE], aprovacao: { responsavel: 'R', cargo: 'medico', data: '2026-01-01', parecer: 'p' }, limitacoes: [] };
    const a = avaliarDose(req(), [regra()]), b = avaliarDose(req(), [regra({ governanca: validada })]);
    expect(a.estado_regra).toBe('regra_sem_fonte'); expect(b.estado_regra).toBe('regra_clinicamente_validada');
    const ca = paraDoseEstruturada(a, { via: 'oral' }), cb = paraDoseEstruturada(b, { via: 'oral' });
    expect(ca.ok && cb.ok).toBe(true);
    if (ca.ok && cb.ok) expect(JSON.stringify(ca.dose)).toBe(JSON.stringify(cb.dose));
  });

  it('limitações (arredondamento não aplicado, ajuste renal só textual, regra não validada) NÃO acompanham a conversão (LACUNA)', () => {
    const r = avaliarDose(req(), [regra({ ajustes: { renal: { estado: 'texto_informativo', texto: 't' } } })]);
    expect(r.limitacoes.length).toBeGreaterThan(0);
    const c = paraDoseEstruturada(r, { via: 'oral' });
    expect(c.ok).toBe(true);
    if (c.ok) expect(JSON.stringify(c.dose)).not.toMatch(/limita|arredond|NÃO foi aplicado/i);
  });

  it('resultado não validado NÃO é rotulado como validado antes da conversão (rótulo do resultado) — e a conversão não adiciona nenhum rótulo de aprovação', () => {
    const r = avaliarDose(req(), [regra()]);
    expect(r.rotulo_apresentacao).toBe('calculo_com_regra_nao_validada'); expect(r.homologacao_clinica).toBe(false);
    const c = paraDoseEstruturada(r, { via: 'oral' });
    if (c.ok) expect(Object.keys(c.dose)).not.toEqual(expect.arrayContaining(['validada', 'aprovada', 'estado_regra']));
  });

  it('incompleto, sem regra, ambíguo e inválido NÃO são convertidos', () => {
    for (const rs of [[], [regra({ regra_id: 'X' }), regra({ regra_id: 'Y' })], [regra({ faixa_idade_dias: undefined })], [regra({ posologia: { tipo_calculo: 'por_kg', valor: 2, unidade_massa: 'mg', unidade_original: 'mg/kg', base_temporal: 'por_tomada', frequencia: { tipo: 'vezes_dia', vezes: 3 } } })]]) expect(paraDoseEstruturada(avaliarDose(req(), rs), { via: 'oral' }).ok).toBe(false);
  });
});
