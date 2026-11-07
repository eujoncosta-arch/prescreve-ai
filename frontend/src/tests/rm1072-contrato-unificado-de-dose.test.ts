// RM-107.2 — Contrato unificado de dose e adaptadores.
// Os testes de matemática/estados usam regras SINTÉTICAS (medicamento fictício, números arbitrários): não são evidência de correção clínica.
// Os testes dos adaptadores verificam preservação de valores/origem/estados, NÃO a adequação clínica de nenhuma dose.

import { describe, it, expect } from 'vitest';
import { MEDICAMENTOS_DOSAGEM } from '@/lib/dosing-engine';
import { PEDIATRIC_DOSES } from '@/lib/pediatric-engine';
import { getAllDrugs } from '@/lib/pharma-database';
import { drugRepository } from '@/lib/pharma-core';
import {
  avaliarDose, adaptarMotorA, adaptarMotorB, adaptarMotorC, importarTodosOsMotores, resumirImportacao, estadoDaRegra, camposFaltantesFonte,
  converterMassa, unidadesComparaveis, compararRegras, detectarSobreposicoes, validarRegra, relacaoDeFaixas, paraDoseEstruturada, envelopeLegado, frequenciaParaDto,
  type DoseRequest, type DoseRule, type FonteDose, type Governanca,
} from '@/lib/dose-contract';

const GOV_SEM_FONTE: Governanca = { status_declarado: 'sem_fonte', fontes: [], limitacoes: [] };
type Sobrescrita = Partial<Omit<DoseRule, 'posologia'>> & { posologia?: Partial<DoseRule['posologia']> };
function regra(over: Sobrescrita = {}): DoseRule {
  const { posologia, ...resto } = over;
  return {
    regra_id: 'S1', origem: { motor: 'sintetica', referencia: 'S1' }, entidade_id: 'FIC', vinculo_entidade: 'sintetico', molecula_original: 'Fictício',
    faixa_idade_dias: { min: 0, min_inclusivo: true }, via: 'oral',
    posologia: { tipo_calculo: 'fixa', valor: 10, unidade_massa: 'mg', unidade_original: 'mg', base_temporal: 'por_tomada', frequencia: { tipo: 'vezes_dia', vezes: 3 }, ...posologia },
    limites: {}, ajustes: {}, restricoes: [], governanca: GOV_SEM_FONTE, pendencias: [], incompatibilidades: [], ...resto,
  };
}
const req = (over: Partial<DoseRequest> = {}): DoseRequest => ({ contrato_versao: 'dose-1', identidade: { entidade_id: 'FIC' }, idade: { valor: 30, unidade: 'anos' }, contexto: {}, ...over });
const FONTE_COMPLETA: FonteDose = { estado_de_revisao: 'verificada', instituicao: 'I', documento: 'D', url_ou_identificador: 'u', versao: 'v', data: '2026-01-01', secao: 's', trecho: 't', populacao: 'p', indicacao: 'i', via: 'v', limitacoes_da_fonte: [] };

describe('RM-107.2 — conversão de unidades', () => {
  it('mg ↔ mcg ↔ g', () => {
    expect(converterMassa(1, 'g', 'mg')).toBe(1000); expect(converterMassa(500, 'mcg', 'mg')).toBe(0.5); expect(converterMassa(2, 'mg', 'mcg')).toBe(2000); expect(converterMassa(3, 'mg', 'mg')).toBe(3);
  });
  it('unidade não mássica não é convertida nem comparável com massa', () => {
    expect(() => converterMassa(1, 'UI' as never, 'mg')).toThrow();
    expect(unidadesComparaveis('UI', 'mg')).toBe(false); expect(unidadesComparaveis('UI', 'UI')).toBe(true); expect(unidadesComparaveis('mg', 'g')).toBe(true);
  });
  it('limite em outra unidade mássica é comparado após conversão', () => {
    const r = avaliarDose(req(), [regra({ posologia: { valor: 500, unidade_massa: 'mg' }, limites: { max_por_tomada: { valor: 0.4, unidade: 'g' } } })]);
    expect(r.limites_excedidos).toHaveLength(1);
  });
});

describe('RM-107.2 — idade, unidade e limites de idade', () => {
  it('idade sem unidade, unidade inválida ou valor negativo ⇒ entrada_invalida, sem dose', () => {
    for (const idade of [{ valor: 5 } as never, { valor: 5, unidade: 'semanas' } as never, { valor: -1, unidade: 'dias' as const }, 7 as never]) {
      const r = avaliarDose(req({ idade }), [regra()]);
      expect(r.estado_calculo).toBe('entrada_invalida'); expect(r.dose_por_administracao).toBeUndefined(); expect(r.rotulo_apresentacao).toBe('nao_calculado');
    }
  });
  it('fronteiras da faixa [28, 365) em dias (inclusivo/exclusivo explícitos)', () => {
    const f = regra({ faixa_idade_dias: { min: 28, min_inclusivo: true, max: 365, max_inclusivo: false } });
    const estado = (dias: number) => avaliarDose(req({ idade: { valor: dias, unidade: 'dias' } }), [f]).estado_calculo;
    expect(estado(27)).toBe('regra_inexistente'); expect(estado(28)).toBe('calculo_realizado'); expect(estado(364)).toBe('calculo_realizado'); expect(estado(365)).toBe('regra_inexistente');
  });
  it('unidades de idade equivalentes caem na mesma faixa (365 dias = 12 meses = 1 ano; contrato canônico RM-105.2.2)', () => {
    const f = regra({ faixa_idade_dias: { min: 365, min_inclusivo: true } });
    for (const idade of [{ valor: 365, unidade: 'dias' as const }, { valor: 12, unidade: 'meses' as const }, { valor: 1, unidade: 'anos' as const }]) expect(avaliarDose(req({ idade }), [f]).estado_calculo).toBe('calculo_realizado');
  });
  it('idade ausente com regra que tem escopo etário ⇒ dados_insuficientes (nunca assume)', () => {
    const r = avaliarDose(req({ idade: undefined }), [regra({ faixa_idade_dias: { min: 0, min_inclusivo: true, max: 100, max_inclusivo: false } })]);
    expect(r.estado_calculo).toBe('dados_insuficientes'); expect(r.dados_ausentes.map(d => d.campo)).toContain('idade');
  });
  it('restrição etária bloqueante da regra ⇒ calculo_bloqueado, sem dose', () => {
    const r = avaliarDose(req({ idade: { valor: 30, unidade: 'dias' } }), [regra({ restricoes: [{ tipo: 'idade_minima', mensagem: 'mín.', bloqueia: true, idade_dias_exclusivo: 60 }] })]);
    expect(r.estado_calculo).toBe('calculo_bloqueado'); expect(r.dose_por_administracao).toBeUndefined(); expect(r.bloqueios.length).toBe(1);
    expect(avaliarDose(req({ idade: { valor: 60, unidade: 'dias' } }), [regra({ restricoes: [{ tipo: 'idade_minima', mensagem: 'mín.', bloqueia: true, idade_dias_exclusivo: 60 }] })]).estado_calculo).toBe('calculo_realizado');
  });
  it('dados obrigatórios neonatais ausentes (IG, idade pós-natal) ⇒ dados_insuficientes', () => {
    const rr = regra({ dados_obrigatorios: ['idade_gestacional_semanas', 'idade_pos_natal_dias'] });
    const r = avaliarDose(req({ idade: { valor: 5, unidade: 'dias' } }), [rr]);
    expect(r.estado_calculo).toBe('dados_insuficientes'); expect(r.dados_ausentes.map(d => d.campo)).toEqual(expect.arrayContaining(['idade_gestacional_semanas', 'idade_pos_natal_dias']));
    expect(avaliarDose(req({ idade: { valor: 5, unidade: 'dias' }, idade_gestacional_semanas: 30, idade_pos_natal_dias: 5 }), [rr]).estado_calculo).toBe('calculo_realizado');
  });
});

describe('RM-107.2 — base temporal: por tomada × por dia (aritmética sintética)', () => {
  it('fixa por tomada: 10 × 3 tomadas', () => {
    const r = avaliarDose(req(), [regra()]);
    expect(r.dose_por_administracao).toEqual({ valor: 10, unidade: 'mg' }); expect(r.dose_diaria).toEqual({ valor: 30, unidade: 'mg' }); expect(r.base_temporal).toBe('por_tomada');
  });
  it('fixa por dia: 30 ÷ 3 tomadas', () => {
    const r = avaliarDose(req(), [regra({ posologia: { valor: 30, base_temporal: 'por_dia' } })]);
    expect(r.dose_por_administracao?.valor).toBe(10); expect(r.dose_diaria?.valor).toBe(30);
  });
  it('por kg: tomada × dia coincidem quando valor_dia = 3 × valor_tomada', () => {
    const t = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ posologia: { tipo_calculo: 'por_kg', valor: 2, base_temporal: 'por_tomada' } })]);
    const d = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ posologia: { tipo_calculo: 'por_kg', valor: 6, base_temporal: 'por_dia' } })]);
    expect(t.dose_por_administracao?.valor).toBe(20); expect(t.dose_diaria?.valor).toBe(60); expect(d.dose_por_administracao?.valor).toBe(20); expect(d.dose_diaria?.valor).toBe(60);
  });
  it('base temporal indeterminada ⇒ regra_incompativel (nunca adivinha)', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ posologia: { tipo_calculo: 'por_kg', base_temporal: 'indeterminada' } })]);
    expect(r.estado_calculo).toBe('regra_incompativel'); expect(r.dose_diaria).toBeUndefined();
  });
  it('por kg sem peso ⇒ dados_insuficientes; peso inválido ⇒ entrada_invalida', () => {
    const rr = regra({ posologia: { tipo_calculo: 'por_kg', valor: 2 } });
    expect(avaliarDose(req(), [rr]).estado_calculo).toBe('dados_insuficientes');
    expect(avaliarDose(req({ peso_atual_kg: 0 }), [rr]).estado_calculo).toBe('entrada_invalida'); expect(avaliarDose(req({ peso_atual_kg: NaN }), [rr]).estado_calculo).toBe('entrada_invalida');
  });
  it('por m²: exige altura e fórmula declarada na regra; com Mosteller calcula', () => {
    const rr = regra({ posologia: { tipo_calculo: 'por_m2', valor: 10 } });
    expect(avaliarDose(req({ peso_atual_kg: 16 }), [rr]).dados_ausentes.map(d => d.campo)).toEqual(expect.arrayContaining(['altura_cm', 'formula_bsa']));
    const ok = avaliarDose(req({ peso_atual_kg: 16, altura_cm: 100 }), [regra({ posologia: { tipo_calculo: 'por_m2', valor: 10, formula_bsa: 'mosteller' } })]);
    expect(ok.estado_calculo).toBe('calculo_realizado'); expect(ok.dose_por_administracao!.valor).toBeCloseTo(10 * Math.sqrt(1600 / 3600), 6);
  });
  it('frequência variável/não estruturada exige confirmação explícita do prescritor', () => {
    const rr = regra({ posologia: { frequencia: { tipo: 'variavel', texto: '3–4x/dia', faixa_vezes_dia: [3, 4] } } });
    expect(avaliarDose(req(), [rr]).estado_calculo).toBe('dados_insuficientes');
    expect(avaliarDose(req({ confirmacoes: [{ campo: 'frequencia_vezes_dia', valor: '4' }] }), [rr]).dose_diaria?.valor).toBe(40);
  });
  it('dose única e intervalo em horas', () => {
    expect(avaliarDose(req(), [regra({ posologia: { frequencia: { tipo: 'dose_unica' } } })]).dose_diaria?.valor).toBe(10);
    expect(avaliarDose(req(), [regra({ posologia: { frequencia: { tipo: 'intervalo_h', horas: 8 } } })]).dose_diaria?.valor).toBe(30);
  });
});

describe('RM-107.2 — substância de referência, apresentação e concentração', () => {
  const conc = { massa: 100, unidade_massa: 'mg' as const, por: 5, unidade_por: 'mL' as const };
  it('quantidade por administração sem arredondamento (50 mg com 100 mg/5 mL = 2,5 mL)', () => {
    const r = avaliarDose(req({ contexto: { concentracao: conc } }), [regra({ posologia: { valor: 50 } })]);
    expect(r.quantidade_por_administracao).toEqual({ valor: 2.5, unidade: 'mL', arredondamento_aplicado: null });
  });
  it('conversão mcg → mg na concentração', () => {
    const r = avaliarDose(req({ contexto: { concentracao: conc } }), [regra({ posologia: { valor: 5000, unidade_massa: 'mcg' } })]);
    expect(r.quantidade_por_administracao?.valor).toBeCloseTo(0.25, 9);
  });
  it('concentração inválida ⇒ entrada_invalida', () => {
    expect(avaliarDose(req({ contexto: { concentracao: { ...conc, massa: 0 } } }), [regra()]).estado_calculo).toBe('entrada_invalida');
  });
  it('regra com substância de referência: sem substância informada ⇒ dados_insuficientes; diferente ⇒ regra_incompativel; igual ⇒ calcula', () => {
    const rr = regra({ posologia: { substancia_referencia: 'componente X' } });
    expect(avaliarDose(req({ contexto: { concentracao: conc } }), [rr]).estado_calculo).toBe('dados_insuficientes');
    expect(avaliarDose(req({ contexto: { concentracao: { ...conc, substancia: 'associação' } } }), [rr]).estado_calculo).toBe('regra_incompativel');
    expect(avaliarDose(req({ contexto: { concentracao: { ...conc, substancia: 'Componente X' } } }), [rr]).estado_calculo).toBe('calculo_realizado');
  });
  it('regra presa a apresentação: sem id ⇒ dados_insuficientes; id diferente ⇒ sem regra; id compatível ⇒ calcula', () => {
    const rr = regra({ apresentacoes_compativeis: ['ap-1'] });
    expect(avaliarDose(req(), [rr]).estado_calculo).toBe('dados_insuficientes');
    expect(avaliarDose(req({ identidade: { entidade_id: 'FIC', apresentacao_id: 'ap-2' } }), [rr]).estado_calculo).toBe('regra_inexistente');
    expect(avaliarDose(req({ identidade: { entidade_id: 'FIC', apresentacao_id: 'ap-1' } }), [rr]).estado_calculo).toBe('calculo_realizado');
  });
  it('apresentações diferentes ⇒ regras diferentes sem fusão (duas regras presas a apresentações distintas)', () => {
    const a = regra({ regra_id: 'A1', apresentacoes_compativeis: ['ap-1'], posologia: { valor: 10 } }), b = regra({ regra_id: 'B1', apresentacoes_compativeis: ['ap-2'], posologia: { valor: 20 } });
    expect(avaliarDose(req({ identidade: { entidade_id: 'FIC', apresentacao_id: 'ap-1' } }), [a, b]).regra_aplicada?.regra_id).toBe('A1');
    expect(avaliarDose(req({ identidade: { entidade_id: 'FIC', apresentacao_id: 'ap-2' } }), [a, b]).regra_aplicada?.regra_id).toBe('B1');
  });
});

describe('RM-107.2 — ausência, sobreposição e divergência de regras', () => {
  it('entidade sem regra ⇒ regra_inexistente, sem dose (nenhum fallback para outra entidade/adulto)', () => {
    const r = avaliarDose(req({ identidade: { entidade_id: 'OUTRA' } }), [regra()]);
    expect(r.estado_calculo).toBe('regra_inexistente'); expect(r.dose_por_administracao).toBeUndefined(); expect(r.bloqueios.length + r.alertas.length).toBeGreaterThan(0);
  });
  it('duas regras aplicáveis ⇒ multiplas_regras_candidatas, NENHUMA dose, ambas listadas', () => {
    const r = avaliarDose(req(), [regra({ regra_id: 'X', posologia: { valor: 10 } }), regra({ regra_id: 'Y', posologia: { valor: 99 } })]);
    expect(r.estado_calculo).toBe('multiplas_regras_candidatas'); expect(r.dose_por_administracao).toBeUndefined(); expect(r.regras_candidatas.map(c => c.regra_id).sort()).toEqual(['X', 'Y']);
  });
  it('indicação informada seleciona sem "escolher": só a regra daquela indicação permanece', () => {
    const rs = [regra({ regra_id: 'X', indicacao: 'indicação 1' }), regra({ regra_id: 'Y', indicacao: 'indicação 2' })];
    expect(avaliarDose(req({ contexto: { indicacao: 'Indicação 2' } }), rs).regra_aplicada?.regra_id).toBe('Y');
  });
  it('regra sem escopo etário declarado NUNCA é aplicada (sem fallback adulto) ⇒ regra_incompativel', () => {
    const r = avaliarDose(req({ idade: { valor: 4, unidade: 'anos' } }), [regra({ faixa_idade_dias: undefined })]);
    expect(r.estado_calculo).toBe('regra_incompativel'); expect(r.dose_por_administracao).toBeUndefined();
  });
  it('regra com incompatibilidade declarada ⇒ regra_incompativel', () => {
    expect(avaliarDose(req(), [regra({ incompatibilidades: ['dose_por_kg_nao_positiva'] })]).estado_calculo).toBe('regra_incompativel');
  });
  it('relação de faixas e comparação de regras divergentes (registro, não escolha)', () => {
    expect(relacaoDeFaixas({ min: 0, min_inclusivo: true, max: 10, max_inclusivo: false }, { min: 10, min_inclusivo: true })).toBe('disjuntas');
    expect(relacaoDeFaixas({ min: 0, min_inclusivo: true, max: 10, max_inclusivo: true }, { min: 10, min_inclusivo: true })).toBe('sobrepoe');
    expect(relacaoDeFaixas(undefined, { min: 0 })).toBe('indeterminado');
    const a = regra({ regra_id: 'A', posologia: { valor: 25, base_temporal: 'por_dia' } }), b = regra({ regra_id: 'B', posologia: { valor: 50, base_temporal: 'por_tomada' }, indicacao: 'ind' });
    expect(compararRegras(a, b).map(d => d.campo)).toEqual(expect.arrayContaining(['valor', 'base_temporal', 'indicacao']));
    a.entidade_id = b.entidade_id = 'E'; b.origem = { motor: 'B:pediatric-engine', referencia: 'x' };
    const pares = detectarSobreposicoes([a, b]); expect(pares).toHaveLength(1); expect(pares[0].entre_motores_diferentes).toBe(true); expect(pares[0].idade).toBe('sobrepoe');
  });
  it('regra inválida é detectada (faixa invertida, por kg sem valor positivo, validada sem aprovação)', () => {
    expect(validarRegra(regra({ faixa_idade_dias: { min: 10, min_inclusivo: true, max: 5, max_inclusivo: false } }))).toContain('faixa_idade_invalida');
    expect(validarRegra(regra({ posologia: { tipo_calculo: 'por_kg', valor: 0 } }))).toContain('valor_por_kg_nao_positivo');
    expect(validarRegra(regra({ governanca: { status_declarado: 'clinicamente_validada', fontes: [], limitacoes: [] } }))).toEqual(expect.arrayContaining(['validada_sem_aprovacao_formal', 'validada_sem_fonte_verificada_completa']));
  });
});

describe('RM-107.2 — limites máximos (sem reduzir a dose)', () => {
  it('por tomada, por dia, por kg/dia e absoluto: excedidos são reportados e a dose NÃO é alterada', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' }, max_por_dia: { valor: 20, unidade: 'mg' }, max_por_kg_dia: { valor: 1, unidade: 'mg' }, max_absoluto: { valor: 25, unidade: 'mg' } } })]);
    expect(r.estado_calculo).toBe('calculo_realizado'); expect(r.dose_por_administracao?.valor).toBe(10); expect(r.limites_excedidos.map(l => l.limite).sort()).toEqual(['max_absoluto', 'max_por_dia', 'max_por_kg_dia', 'max_por_tomada']);
    expect(r.alertas.some(a => a.codigo === 'excede_limite_cadastrado' && a.severidade === 'critico')).toBe(true);
  });
  it('dentro dos limites: sem excedidos; política "bloquear" bloqueia só quando excede', () => {
    const lim = { max_por_tomada: { valor: 10, unidade: 'mg' } };
    expect(avaliarDose(req(), [regra({ limites: lim })], { politica_limite: 'bloquear' }).estado_calculo).toBe('calculo_realizado');
    expect(avaliarDose(req(), [regra({ limites: { max_por_tomada: { valor: 9, unidade: 'mg' } } })], { politica_limite: 'bloquear' }).estado_calculo).toBe('calculo_bloqueado');
  });
  it('limite em unidade não comparável não é verificado e é sinalizado; limite por kg sem peso é sinalizado', () => {
    const r = avaliarDose(req(), [regra({ limites: { max_por_dia: { valor: 1, unidade: 'UI' }, max_por_kg_dia: { valor: 1, unidade: 'mg' } } })]);
    expect(r.alertas.map(a => a.codigo)).toEqual(expect.arrayContaining(['limite_unidade_incompativel', 'limite_nao_verificavel']));
  });
});

describe('RM-107.2 — proveniência e estado de validação', () => {
  it('estado da regra é derivado e só chega a "validada" com fonte verificada completa + aprovação formal', () => {
    expect(estadoDaRegra(GOV_SEM_FONTE)).toBe('regra_sem_fonte');
    expect(estadoDaRegra({ status_declarado: 'fonte_candidata', fontes: [{ estado_de_revisao: 'candidata', referencia_original: 'ref' }], limitacoes: [] })).toBe('fonte_candidata');
    expect(estadoDaRegra({ status_declarado: 'fonte_consultada_aguardando_revisao', fontes: [FONTE_COMPLETA], limitacoes: [] })).toBe('fonte_consultada_aguardando_revisao');
    expect(estadoDaRegra({ status_declarado: 'clinicamente_validada', fontes: [FONTE_COMPLETA], limitacoes: [] })).toBe('fonte_consultada_aguardando_revisao'); // sem aprovação: rebaixada
    expect(estadoDaRegra({ status_declarado: 'clinicamente_validada', fontes: [{ ...FONTE_COMPLETA, trecho: '' }], aprovacao: { responsavel: 'R', cargo: 'medico', data: '2026-01-01', parecer: 'p' }, limitacoes: [] })).toBe('fonte_candidata'); // fonte incompleta
    expect(estadoDaRegra({ status_declarado: 'clinicamente_validada', fontes: [FONTE_COMPLETA], aprovacao: { responsavel: 'R', cargo: 'medico', data: '2026-01-01', parecer: 'p' }, limitacoes: [] })).toBe('regra_clinicamente_validada');
    expect(camposFaltantesFonte({ estado_de_revisao: 'candidata' })).toContain('trecho');
  });
  it('cálculo executado ≠ validação: regra sem fonte calcula, mas o rótulo nunca é "validada"', () => {
    const r = avaliarDose(req(), [regra()]);
    expect(r.estado_calculo).toBe('calculo_realizado'); expect(r.estado_regra).toBe('regra_sem_fonte'); expect(r.rotulo_apresentacao).toBe('calculo_com_regra_nao_validada'); expect(r.homologacao_clinica).toBe(false);
    expect(r.alertas.some(a => a.codigo === 'regra_nao_validada')).toBe(true);
  });
  it('somente regra formalmente aprovada produz rótulo de regra validada (e mesmo assim homologacao_clinica = false)', () => {
    const g: Governanca = { status_declarado: 'clinicamente_validada', fontes: [FONTE_COMPLETA], aprovacao: { responsavel: 'R', cargo: 'farmaceutico_clinico', data: '2026-01-01', parecer: 'p' }, limitacoes: [] };
    const r = avaliarDose(req(), [regra({ governanca: g })]);
    expect(r.estado_regra).toBe('regra_clinicamente_validada'); expect(r.rotulo_apresentacao).toBe('calculo_com_regra_validada'); expect(r.homologacao_clinica).toBe(false); expect(r.fonte_utilizada).toHaveLength(1);
  });
  it('ajuste renal/hepático em texto é declarado como NÃO aplicado', () => {
    const r = avaliarDose(req({ funcao_renal: { tfg_ml_min: 20 } }), [regra({ ajustes: { renal: { estado: 'texto_informativo', texto: 't' } } })]);
    expect(r.limitacoes.join(' ')).toMatch(/NÃO foi aplicado/);
  });
});

describe('RM-107.2 — compatibilidade com DoseEstruturada e protocolos antigos', () => {
  it('resultado realizado → DoseEstruturada com unidade/frequência do DTO', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ posologia: { frequencia: { tipo: 'intervalo_h', horas: 8 } } })]);
    const c = paraDoseEstruturada(r, { via: 'oral', peso_kg: 10 });
    expect(c.ok).toBe(true);
    if (c.ok) { expect(c.dose).toMatchObject({ valor: 10, unidade: 'mg', frequencia: 'a_cada_8h', via: 'oral', dose_por_tomada: 10 }); expect(c.dose.dose_por_kg_dia).toBeCloseTo(3, 9); }
  });
  it('não persiste cálculo incompleto/bloqueado/sem regra/ambíguo', () => {
    for (const rs of [[], [regra({ faixa_idade_dias: undefined })], [regra({ regra_id: 'X' }), regra({ regra_id: 'Y' })], [regra({ posologia: { tipo_calculo: 'por_kg' } })]]) {
      const c = paraDoseEstruturada(avaliarDose(req(), rs), { via: 'oral' }); expect(c.ok).toBe(false);
    }
  });
  it('unidade sem equivalente e via ausente são recusadas', () => {
    expect(paraDoseEstruturada(avaliarDose(req(), [regra({ posologia: { unidade_massa: 'jato' } })]), { via: 'oral' }).ok).toBe(false);
    expect(paraDoseEstruturada(avaliarDose(req(), [regra()]), { via: '' }).ok).toBe(false);
  });
  it('mapeamento de frequência para o enum do DTO', () => {
    expect(frequenciaParaDto({ tipo: 'vezes_dia', vezes: 3 }).frequencia).toBe('3x/dia'); expect(frequenciaParaDto({ tipo: 'intervalo_h', horas: 12 }).frequencia).toBe('a_cada_12h');
    expect(frequenciaParaDto({ tipo: 'dose_unica' }).frequencia).toBe('dose_unica');
    expect(frequenciaParaDto({ tipo: 'vezes_dia', vezes: 5 })).toEqual({ frequencia: 'outro', frequencia_detalhe: '5x/dia' });
  });
  it('protocolo antigo é apenas envelopado: mesma referência, sem mutação, marcado como não avaliado', () => {
    const antigo = Object.freeze({ id: '1', molecula: 'X', dose: '500 mg', frequencia: '8/8h', via: 'VO', duracao: '7 dias' });
    const antes = JSON.stringify(antigo);
    const e = envelopeLegado(antigo);
    expect(e.item).toBe(antigo); expect(JSON.stringify(antigo)).toBe(antes); expect(e.origem).toBe('legado'); expect(e.estado_avaliacao).toBe('nao_avaliado_pelo_contrato');
  });
});

describe('RM-107.2 — adaptadores de leitura A, B e C (dados reais; sem afirmar correção clínica)', () => {
  const todas = importarTodosOsMotores(getAllDrugs());
  const estado = (r: DoseRule) => estadoDaRegra(r.governanca);

  it('os IDs do pharma-core usados no vínculo cobrem todo o catálogo C (entidade_id = id canônico)', () => {
    const ids = new Set(drugRepository.getAll().map(e => e.id));
    for (const d of getAllDrugs()) expect(ids.has(d.id), d.id).toBe(true);
    expect(todas.C.every(r => r.vinculo_entidade === 'id_igual')).toBe(true);
  });
  it('importa todas as regras de cada motor (sem descartar nenhuma)', () => {
    expect(todas.A).toHaveLength(MEDICAMENTOS_DOSAGEM.reduce((s, m) => s + m.regras.length, 0));
    expect(todas.B).toHaveLength(PEDIATRIC_DOSES.reduce((s, p) => s + p.indicacoes.length, 0));
    const drugs = getAllDrugs(); expect(todas.C).toHaveLength(drugs.length + drugs.filter(d => d.dose_pediatrica).length);
    expect(todas.todas).toHaveLength(todas.A.length + todas.B.length + todas.C.length);
  });
  it('não modifica os dados dos motores (snapshot antes/depois)', () => {
    const snap = () => JSON.stringify([MEDICAMENTOS_DOSAGEM, PEDIATRIC_DOSES, getAllDrugs()]);
    const antes = snap(); importarTodosOsMotores(getAllDrugs()); adaptarMotorA(); adaptarMotorB(); adaptarMotorC(getAllDrugs());
    expect(snap()).toBe(antes);
  });
  it('preserva origem e identificador únicos', () => {
    expect(new Set(todas.todas.map(r => r.regra_id)).size).toBe(todas.todas.length);
    for (const r of todas.todas) { expect(r.origem.motor).not.toBe('sintetica'); expect(r.origem.referencia.length).toBeGreaterThan(0); }
    expect(todas.A.every(r => r.origem.motor === 'A:dosing-engine') && todas.B.every(r => r.origem.motor === 'B:pediatric-engine') && todas.C.every(r => r.origem.motor === 'C:dose-calculator(catalogo)')).toBe(true);
  });
  it('NENHUMA regra importada é clinicamente validada; regras sem fonte ficam pendentes', () => {
    for (const r of todas.todas) { expect(['regra_sem_fonte', 'fonte_candidata']).toContain(estado(r)); expect(r.governanca.fontes.every(f => f.estado_de_revisao === 'candidata')).toBe(true); expect(validarRegra(r)).not.toContain('validada_sem_aprovacao_formal'); }
    expect(todas.C.every(r => estado(r) === 'regra_sem_fonte')).toBe(true);
    const sem = todas.A.filter(r => estado(r) === 'regra_sem_fonte').length; expect(sem).toBe(todas.A.filter(r => r.pendencias.includes('sem_fonte')).length);
    expect(resumirImportacao('A:dosing-engine', todas.A, estado).validadas).toBe(0);
  });
  it('preserva valores e unidades originais (A, B, C)', () => {
    const a = todas.A.find(r => r.regra_id === 'A:cefalexina:0')!; const mA = MEDICAMENTOS_DOSAGEM.find(m => m.id === 'cefalexina')!.regras[0];
    expect(a.posologia.valor).toBe(mA.dose); expect(a.posologia.unidade_original).toBe(mA.unidade); expect(a.posologia.frequencia).toEqual({ tipo: 'intervalo_h', horas: mA.frequencia_horas });
    const b = todas.B.find(r => r.regra_id.startsWith('B:cefalexina:'))!; expect(b.posologia.valor).toBe(PEDIATRIC_DOSES.find(p => p.drugId === 'cefalexina')!.indicacoes[0].doseMgKgDia);
    const c = todas.C.find(r => r.regra_id === 'C:smz_tmp:adulto')!; expect(c.posologia.valor_original).toBe(getAllDrugs().find(d => d.id === 'smz_tmp')!.dose_adulto.habitual);
  });
  it('divergências ficam SEPARADAS (cefalexina A × B) e comparáveis, sem fusão nem escolha', () => {
    const ids = todas.todas.filter(r => r.entidade_id === 'cefalexina').map(r => r.origem.motor);
    expect(ids).toEqual(expect.arrayContaining(['A:dosing-engine', 'B:pediatric-engine', 'C:dose-calculator(catalogo)']));
    const par = detectarSobreposicoes(todas.todas.filter(r => r.entidade_id === 'cefalexina')).find(p => p.entre_motores_diferentes && p.idade === 'sobrepoe');
    expect(par).toBeDefined(); expect(par!.diferencas.map(d => d.campo)).toEqual(expect.arrayContaining(['valor']));
  });
  it('vínculo de entidade: alias de auditoria e não resolvido são explícitos', () => {
    expect(todas.A.find(r => r.origem.referencia.startsWith('amoxicilina-clavulanato#'))!.vinculo_entidade).toBe('alias_de_auditoria');
    expect(todas.B.find(r => r.origem.referencia.startsWith('smz-tmp#'))!.entidade_id).toBe('smz_tmp');
    const dexa = todas.B.find(r => r.origem.referencia.startsWith('dexametasona#'))!; expect(dexa.entidade_id).toBeNull(); expect(dexa.vinculo_entidade).toBe('nao_resolvido');
  });
  it('detecta regras incompatíveis do catálogo (as 5 regras pediátricas que o motor C não usa) sem corrigi-las', () => {
    for (const id of ['metformina', 'salbutamol', 'budesonida', 'montelucaste', 'vitamina-k1-neonatal']) {
      const r = todas.C.find(x => x.regra_id === `C:${id}:pediatrica`)!; expect(r.incompatibilidades.length, id).toBeGreaterThan(0);
    }
    // conservador: cafeína citrato ("mg/kg (cafeína citrato)") e fenobarbital neonatal ("mg/kg (ataque IV)") têm texto de cálculo com informação extra que o motor C ignora (trata como mg/kg/dia): o contrato NÃO presume
    for (const id of ['cafeina-citrato', 'fenobarbital-neonatal']) { const r = todas.C.find(x => x.regra_id === `C:${id}:pediatrica`)!; expect(r.incompatibilidades.length, id).toBeGreaterThan(0); expect(r.pendencias, id).toContain('C_motor_trata_como_mg_kg_dia_no_ramo_padrao'); }
    expect(todas.C.filter(r => r.regra_id.endsWith(':pediatrica') && r.incompatibilidades.length === 0).length).toBe(13);
  });
  it('detecta incompatibilidade de unidade/base temporal e valores não numéricos (catálogo C)', () => {
    const litio = todas.C.find(r => r.regra_id === 'C:litio:adulto')!; expect(litio.posologia.base_temporal).toBe('por_dia'); expect(litio.pendencias).toContain('C_motor_trata_unidade_com_base_ou_peso_como_por_tomada');
    const iso = todas.C.find(r => r.regra_id === 'C:isotretinoia:adulto')!; expect(iso.incompatibilidades).toContain('valor_nao_numerico_puro'); expect(iso.posologia.valor_original).toBe('0.5-1');
    const vori = todas.C.find(r => r.regra_id === 'C:voriconazol:adulto')!; expect(vori.incompatibilidades).toContain('base_temporal_nao_declarada_na_unidade');
  });
  it('associação sem substância de referência é pendência explícita (SMZ-TMP em A)', () => {
    expect(todas.A.filter(r => r.entidade_id === 'smz_tmp').every(r => r.pendencias.includes('associacao_sem_substancia_de_referencia_declarada'))).toBe(true);
  });
  it('marcador uso_pediatrico = nao_aplicavel é preservado como informação/pendência (não como decisão)', () => {
    const d = getAllDrugs().filter(x => x.uso_pediatrico === 'nao_aplicavel'); expect(d.length).toBe(66);
    for (const x of d) { const r = todas.C.find(y => y.regra_id === `C:${x.id}:adulto`)!; expect(r.pendencias).toContain('uso_pediatrico_nao_aplicavel_no_cadastro'); expect(r.restricoes.some(s => s.bloqueia)).toBe(false); }
  });
  it('o contrato NÃO reproduz o fallback adulto: criança sem regra utilizável não recebe dose', () => {
    // somente regras do catálogo (C) de cefalexina: ramo adulto sem escopo etário ⇒ incompatível
    const soC = todas.C.filter(r => r.entidade_id === 'cefalexina');
    const r1 = avaliarDose(req({ identidade: { entidade_id: 'cefalexina' }, idade: { valor: 4, unidade: 'anos' }, peso_atual_kg: 15 }), soC);
    expect(r1.estado_calculo).toBe('regra_incompativel'); expect(r1.dose_por_administracao).toBeUndefined();
    // todas as regras: A e B aplicáveis divergem ⇒ nenhuma é escolhida
    const r2 = avaliarDose(req({ identidade: { entidade_id: 'cefalexina' }, idade: { valor: 4, unidade: 'anos' }, peso_atual_kg: 15 }), todas.todas);
    expect(r2.estado_calculo).toBe('multiplas_regras_candidatas'); expect(r2.dose_por_administracao).toBeUndefined(); expect(r2.regras_candidatas.filter(c => !c.excluida).length).toBeGreaterThan(1);
    // regras do catálogo de metformina (ped. inutilizável) para criança de 4 anos: sem dose
    const r3 = avaliarDose(req({ identidade: { entidade_id: 'metformina' }, idade: { valor: 4, unidade: 'anos' }, peso_atual_kg: 15 }), todas.C.filter(r => r.entidade_id === 'metformina'));
    expect(r3.dose_por_administracao).toBeUndefined();
  });
  it('resumo de importação por motor (sem validadas)', () => {
    for (const [m, regras] of [['A:dosing-engine', todas.A], ['B:pediatric-engine', todas.B], ['C:dose-calculator(catalogo)', todas.C]] as const) {
      const s = resumirImportacao(m, regras, estado); expect(s.regras).toBe(regras.length); expect(s.validadas).toBe(0); expect(s.sem_fonte + s.fonte_candidata).toBe(regras.length);
    }
  });
});
