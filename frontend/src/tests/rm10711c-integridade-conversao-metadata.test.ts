// ============================================================
// RM-107.1.1-C — Integridade da conversão DoseResult → DoseEstruturada com metadata de avaliação.
// Dados SINTÉTICOS (medicamento fictício): testam estados e preservação de informação, NÃO correção clínica.
// Nenhuma política de limites foi criada: o cenário "limite excedido sob política alertar" continua convertendo, agora COM o alerta.
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  avaliarDose, paraDoseEstruturada, converterDoseComMetadata, extrairMetadataAvaliacao, normalizarMetadataAvaliacao, serializarConversao, recuperarConversao,
  importarTodosOsMotores, type DoseRequest, type DoseRule, type DoseResult, type Governanca, type FonteDose,
} from '@/lib/dose-contract';
import { getAllDrugs } from '@/lib/pharma-database';

const GOV_SEM_FONTE: Governanca = { status_declarado: 'sem_fonte', fontes: [], limitacoes: [] };
const FONTE: FonteDose = { estado_de_revisao: 'verificada', instituicao: 'I', documento: 'D', url_ou_identificador: 'u', versao: 'v', data: '2026-01-01', secao: 's', trecho: 't', populacao: 'p', indicacao: 'i', via: 'v', limitacoes_da_fonte: [] };
const VALIDADA: Governanca = { status_declarado: 'clinicamente_validada', fontes: [FONTE], aprovacao: { responsavel: 'R', cargo: 'medico', data: '2026-01-01', parecer: 'p' }, limitacoes: [] };
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
const CHAVES_DTO = ['valor', 'unidade', 'frequencia', 'frequencia_detalhe', 'via', 'dose_por_kg_dia', 'dose_por_tomada'];

describe('RM-107.1.1-C — regra sem fonte × regra clinicamente validada', () => {
  it('o DTO é idêntico, mas a METADATA distingue: sem fonte ≠ validada (e homologação clínica é sempre falsa)', () => {
    const a = converterDoseComMetadata(avaliarDose(req(), [regra()]), CTX);
    const b = converterDoseComMetadata(avaliarDose(req(), [regra({ governanca: VALIDADA })]), CTX);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(JSON.stringify(a.dose)).toBe(JSON.stringify(b.dose));
    expect(a.avaliacao.estado_regra).toBe('regra_sem_fonte'); expect(b.avaliacao.estado_regra).toBe('regra_clinicamente_validada');
    expect(a.avaliacao.homologacao_clinica).toBe(false); expect(b.avaliacao.homologacao_clinica).toBe(false);
    expect(a.avaliacao.fonte_utilizada).toHaveLength(0); expect(b.avaliacao.fonte_utilizada).toHaveLength(1);
  });
  it('regra declarada "validada" sem aprovação formal é rebaixada já no resultado e continua rebaixada na metadata', () => {
    const r = avaliarDose(req(), [regra({ governanca: { status_declarado: 'clinicamente_validada', fontes: [FONTE], limitacoes: [] } })]);
    expect(converterDoseComMetadata(r, CTX).avaliacao.estado_regra).toBe('fonte_consultada_aguardando_revisao');
  });
  it('um resultado ADULTERADO/incompleto que afirma "validada" sem fonte verificada NÃO sai como validado (rebaixado e registrado)', () => {
    const r = avaliarDose(req(), [regra()]);
    const forjado = { ...r, estado_regra: 'regra_clinicamente_validada', rotulo_apresentacao: 'calculo_com_regra_validada' } as unknown as DoseResult;
    const m = extrairMetadataAvaliacao(forjado);
    expect(m.estado_regra).toBe('regra_sem_fonte'); expect(m.completude.integral).toBe(false); expect(m.completude.ausentes).toContain('fonte_utilizada_verificada');
    expect(m.limitacoes.join(' ')).toMatch(/rebaixado/);
    const fontesCandidatas = { ...forjado, fonte_utilizada: [{ estado_de_revisao: 'candidata', referencia_original: 'x' }] } as unknown as DoseResult;
    expect(extrairMetadataAvaliacao(fontesCandidatas).estado_regra).toBe('fonte_candidata');
  });
  it('ausência de alertas/pendências NÃO é confirmação de segurança nem aprovação', () => {
    const m = converterDoseComMetadata(avaliarDose(req(), [regra()]), CTX).avaliacao;
    expect(m.ausencia_de_alerta_indica_seguranca).toBe(false); expect(m.homologacao_clinica).toBe(false); expect(m.estado_regra).not.toBe('regra_clinicamente_validada');
  });
});

describe('RM-107.1.1-C — alertas críticos, limite excedido (política "alertar") e limitações', () => {
  const comExcesso = () => avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' }, max_por_dia: { valor: 20, unidade: 'mg' } } })]);
  it('CENÁRIO DA RM-107.1.1-A: limite excedido sob "alertar" continua convertendo, mas o alerta crítico e os limites excedidos ACOMPANHAM o DTO', () => {
    const r = comExcesso();
    expect(r.estado_calculo).toBe('calculo_realizado'); expect(r.limites_excedidos).toHaveLength(2);
    const c = converterDoseComMetadata(r, CTX);
    expect(c.ok).toBe(true);                                      // política atual preservada: não bloqueia novos casos
    expect(c.avaliacao.resumo).toEqual({ possui_alerta_critico: true, possui_limite_excedido: true, possui_bloqueio: false });
    expect(c.avaliacao.limites_excedidos.map(l => l.limite).sort()).toEqual(['max_por_dia', 'max_por_tomada']);
    expect(c.avaliacao.limites_excedidos[0].valor_calculado.valor).toBeGreaterThan(c.avaliacao.limites_excedidos[0].valor_limite.valor);
    expect(c.avaliacao.alertas.some(a => a.codigo === 'excede_limite_cadastrado' && a.severidade === 'critico')).toBe(true);
    if (c.ok) expect(c.dose.valor).toBe(10);                      // a dose NÃO foi reduzida
  });
  it('a conversão LEGADA continua perdendo isso e agora declara explicitamente que não preservou a metadata', () => {
    const c = paraDoseEstruturada(comExcesso(), CTX);
    expect(c.ok).toBe(true); expect(c.metadata_preservada).toBe(false); expect(c.aviso_legado).toMatch(/LEGADO/); expect(c.aviso_legado).toMatch(/converterDoseComMetadata/);
    expect('avaliacao' in c).toBe(false);
  });
  it('política "bloquear" (escolhida pelo chamador): não converte, mas a metadata registra bloqueio e limites excedidos', () => {
    const r = avaliarDose(req(), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })], { politica_limite: 'bloquear' });
    const c = converterDoseComMetadata(r, CTX);
    expect(c.ok).toBe(false); expect(c.avaliacao.estado_calculo).toBe('calculo_bloqueado'); expect(c.avaliacao.resumo.possui_bloqueio).toBe(true); expect(c.avaliacao.limites_excedidos).toHaveLength(1); expect(c.avaliacao.bloqueios.length).toBeGreaterThan(0);
  });
  it('limitação de apresentação: quantidade calculada, não convertida e não avaliada ficam distinguíveis', () => {
    const conc = { massa: 100, unidade_massa: 'mg' as const, por: 5, unidade_por: 'mL' as const };
    const q = converterDoseComMetadata(avaliarDose(req({ contexto: { concentracao: conc } }), [regra({ posologia: { valor: 50 } })]), CTX);
    expect(q.avaliacao.estado_apresentacao).toBe('quantidade_calculada_sem_arredondamento'); expect(q.avaliacao.limitacoes.join(' ')).toMatch(/Nenhum arredondamento/);
    const nc = converterDoseComMetadata(avaliarDose(req({ contexto: { concentracao: conc } }), [regra({ posologia: { valor: 50, unidade_massa: 'UI' } })]), CTX);
    expect(nc.avaliacao.estado_apresentacao).toBe('nao_convertida'); expect(nc.avaliacao.alertas.some(a => a.codigo === 'apresentacao_nao_convertida')).toBe(true);
    expect(converterDoseComMetadata(avaliarDose(req(), [regra()]), CTX).avaliacao.estado_apresentacao).toBe('nao_avaliada');
  });
  it('ajuste renal/hepático apenas informativo: a limitação "NÃO foi aplicado" acompanha a conversão', () => {
    const r = avaliarDose(req({ funcao_renal: { tfg_ml_min: 20 } }), [regra({ ajustes: { renal: { estado: 'texto_informativo', texto: 't' }, hepatico: { estado: 'flag_sem_parametros' } } })]);
    const c = converterDoseComMetadata(r, CTX);
    expect(c.ok).toBe(true); expect(c.avaliacao.limitacoes.join(' ')).toMatch(/NÃO foi aplicado/);
  });
});

describe('RM-107.1.1-C — resultados NÃO convertidos também preservam a metadata', () => {
  it('frequência indeterminada: dados_insuficientes com o dado ausente identificado', () => {
    const c = converterDoseComMetadata(avaliarDose(req(), [regra({ posologia: { frequencia: { tipo: 'variavel', texto: '3–4x/dia', faixa_vezes_dia: [3, 4] } } })]), CTX);
    expect(c.ok).toBe(false); expect(c.avaliacao.estado_calculo).toBe('dados_insuficientes'); expect(c.avaliacao.dados_ausentes.map(d => d.campo)).toContain('frequencia');
    expect(c.avaliacao.estado_regra).toBe('regra_sem_fonte');
  });
  it('regra inexistente: estado_regra = sem_regra_aplicada; origem_regra = null; alerta preservado', () => {
    const c = converterDoseComMetadata(avaliarDose(req({ identidade: { entidade_id: 'OUTRA' } }), [regra()]), CTX);
    expect(c.ok).toBe(false); expect(c.avaliacao.estado_calculo).toBe('regra_inexistente'); expect(c.avaliacao.estado_regra).toBe('sem_regra_aplicada'); expect(c.avaliacao.origem_regra).toBeNull(); expect(c.avaliacao.alertas.length).toBeGreaterThan(0);
  });
  it('múltiplas regras candidatas: todas as candidatas ficam identificadas (nenhuma escolhida)', () => {
    const c = converterDoseComMetadata(avaliarDose(req(), [regra({ regra_id: 'X' }), regra({ regra_id: 'Y' })]), CTX);
    expect(c.ok).toBe(false); expect(c.avaliacao.estado_calculo).toBe('multiplas_regras_candidatas'); expect(c.avaliacao.regras_candidatas.map(x => x.regra_id).sort()).toEqual(['X', 'Y']); expect(c.avaliacao.origem_regra).toBeNull();
  });
  it('regra incompatível, entrada inválida e bloqueio por restrição etária preservam o estado e os alertas', () => {
    expect(converterDoseComMetadata(avaliarDose(req(), [regra({ incompatibilidades: ['x'] })]), CTX).avaliacao.estado_calculo).toBe('regra_incompativel');
    const inv = converterDoseComMetadata(avaliarDose(req({ idade: { valor: -1, unidade: 'dias' } }), [regra()]), CTX);
    expect(inv.avaliacao.estado_calculo).toBe('entrada_invalida'); expect(inv.avaliacao.resumo.possui_alerta_critico).toBe(true);
    const bl = converterDoseComMetadata(avaliarDose(req({ idade: { valor: 30, unidade: 'dias' } }), [regra({ restricoes: [{ tipo: 'idade_minima', mensagem: 'mín', bloqueia: true, idade_dias_exclusivo: 60 }] })]), CTX);
    expect(bl.ok).toBe(false); expect(bl.avaliacao.estado_calculo).toBe('calculo_bloqueado'); expect(bl.avaliacao.bloqueios).toHaveLength(1);
  });
  it('dados reais: cefalexina em criança (A e B aplicáveis) ⇒ ambíguo com as duas regras de origem diferente identificadas', () => {
    const t = importarTodosOsMotores(getAllDrugs());
    const r = avaliarDose(req({ identidade: { entidade_id: 'cefalexina' }, idade: { valor: 4, unidade: 'anos' }, peso_atual_kg: 15 }), t.todas);
    const c = converterDoseComMetadata(r, CTX);
    expect(c.ok).toBe(false); expect(c.avaliacao.estado_calculo).toBe('multiplas_regras_candidatas');
    const vivas = c.avaliacao.regras_candidatas.filter(x => !x.excluida); expect(new Set(vivas.map(x => x.origem.motor)).size).toBeGreaterThan(1);
  });
});

describe('RM-107.1.1-C — metadata ausente ou incompleta (nada é inventado)', () => {
  it('resultado parcial ⇒ "desconhecido", listas vazias SEM serem tomadas como "sem alertas", completude não integral', () => {
    const m = extrairMetadataAvaliacao({ estado_calculo: 'calculo_realizado' });
    expect(m.estado_regra).toBe('desconhecido'); expect(m.estado_apresentacao).toBe('nao_avaliada'); expect(m.completude.integral).toBe(false);
    expect(m.completude.ausentes).toEqual(expect.arrayContaining(['alertas', 'bloqueios', 'limites_excedidos', 'limitacoes', 'fonte_utilizada', 'estado_regra']));
    expect(m.ausencia_de_alerta_indica_seguranca).toBe(false); expect(m.homologacao_clinica).toBe(false);
  });
  it('entrada nula/indefinida/lixo ⇒ tudo desconhecido', () => {
    for (const x of [undefined, null, 42, 'x', []]) { const m = extrairMetadataAvaliacao(x); expect(m.estado_calculo).toBe('desconhecido'); expect(m.completude.integral).toBe(false); }
  });
  it('metadata completa de um resultado real é íntegra', () => {
    expect(converterDoseComMetadata(avaliarDose(req(), [regra()]), CTX).avaliacao.completude).toEqual({ integral: true, ausentes: [] });
  });
});

describe('RM-107.1.1-C — conversões sucessivas e serialização/recuperação sem perda', () => {
  const casos = (): DoseResult[] => [
    avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } }, governanca: VALIDADA })]),
    avaliarDose(req(), [regra()]),
    avaliarDose(req(), [regra({ regra_id: 'X' }), regra({ regra_id: 'Y' })]),
    avaliarDose(req({ identidade: { entidade_id: 'OUTRA' } }), [regra()]),
    avaliarDose(req(), [regra({ ajustes: { renal: { estado: 'texto_informativo', texto: 't' } } })]),
  ];
  it('serializar → recuperar → serializar é idempotente e preserva dose e metadata', () => {
    for (const r of casos()) {
      const c = converterDoseComMetadata(r, CTX);
      const s1 = serializarConversao(c); const rec = recuperarConversao(s1); const s2 = serializarConversao(rec);
      expect(s2).toBe(s1); expect(rec.avaliacao).toEqual(c.avaliacao); expect(rec.ok).toBe(c.ok);
      if (c.ok && rec.ok) expect(rec.dose).toEqual(c.dose);
      const rec2 = recuperarConversao(serializarConversao(recuperarConversao(s1))); expect(rec2.avaliacao).toEqual(c.avaliacao);   // conversões sucessivas
    }
  });
  it('o estado validado só sobrevive à recuperação com fonte verificada completa; metadata adulterada é rebaixada', () => {
    const c = converterDoseComMetadata(avaliarDose(req(), [regra({ governanca: VALIDADA })]), CTX);
    expect(recuperarConversao(serializarConversao(c)).avaliacao.estado_regra).toBe('regra_clinicamente_validada');
    const adulterado = JSON.parse(serializarConversao(converterDoseComMetadata(avaliarDose(req(), [regra()]), CTX))) as { avaliacao: Record<string, unknown> };
    adulterado.avaliacao.estado_regra = 'regra_clinicamente_validada';
    const rec = recuperarConversao(JSON.stringify(adulterado));
    expect(rec.avaliacao.estado_regra).toBe('regra_sem_fonte'); expect(rec.avaliacao.completude.integral).toBe(false);
  });
  it('recuperação de JSON sem metadata, corrompido ou sem dose: nunca inventa; marca como não íntegro', () => {
    const semMeta = recuperarConversao(JSON.stringify({ versao: 'dose-conversao-1', ok: true, dose: { valor: 1, unidade: 'mg', frequencia: '1x/dia', via: 'oral' } }));
    expect(semMeta.ok).toBe(true); expect(semMeta.avaliacao.estado_calculo).toBe('desconhecido'); expect(semMeta.avaliacao.estado_regra).toBe('desconhecido'); expect(semMeta.avaliacao.completude.integral).toBe(false);
    const ruim = recuperarConversao('{não é json'); expect(ruim.ok).toBe(false); expect(ruim.avaliacao.completude.integral).toBe(false);
    expect(recuperarConversao(JSON.stringify({ ok: true, avaliacao: {} })).ok).toBe(false);
  });
  it('a metadata normalizada de um valor "sem_regra_aplicada" volta como sem regra e não como desconhecida', () => {
    const m = normalizarMetadataAvaliacao({ ...converterDoseComMetadata(avaliarDose(req({ identidade: { entidade_id: 'OUTRA' } }), [regra()]), CTX).avaliacao });
    expect(m.estado_regra).toBe('sem_regra_aplicada');
  });
});

describe('RM-107.1.1-C — invariância numérica e contrato', () => {
  it('a metadata NÃO altera nenhum valor: DTO da conversão nova == DTO da conversão legada == valores do resultado (grade de 80 casos)', () => {
    const unidades = ['mg', 'mcg', 'g', 'UI'] as const; const freqs = [{ tipo: 'vezes_dia', vezes: 1 }, { tipo: 'vezes_dia', vezes: 3 }, { tipo: 'intervalo_h', horas: 8 }, { tipo: 'intervalo_h', horas: 12 }, { tipo: 'dose_unica' }] as const;
    let n = 0;
    for (const u of unidades) for (const f of freqs) for (const base of ['por_tomada', 'por_dia'] as const) for (const tipo of ['fixa', 'por_kg'] as const) {
      const r = avaliarDose(req({ peso_atual_kg: 12 }), [regra({ posologia: { unidade_massa: u, frequencia: f, base_temporal: base, tipo_calculo: tipo, valor: 7 } })]);
      const nova = converterDoseComMetadata(r, { via: 'oral', peso_kg: 12 }); const legada = paraDoseEstruturada(r, { via: 'oral', peso_kg: 12 });
      expect(nova.ok).toBe(legada.ok);
      if (nova.ok && legada.ok) { expect(JSON.stringify(nova.dose)).toBe(JSON.stringify(legada.dose)); expect(nova.dose.valor).toBe(r.dose_por_administracao!.valor); expect(nova.dose.unidade).toBe(r.dose_por_administracao!.unidade); expect(nova.dose.via).toBe('oral'); }
      expect(JSON.stringify(Object.keys(nova.ok ? nova.dose : {}).sort())).toBe(JSON.stringify(Object.keys(legada.ok ? legada.dose : {}).sort()));
      if (nova.ok) expect(Object.keys(nova.dose).every(k => CHAVES_DTO.includes(k))).toBe(true);   // a metadata fica FORA do DTO
      n++;
    }
    expect(n).toBe(80);
  });
  it('o resultado de origem não é mutado pela extração/conversão', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })]); const antes = JSON.stringify(r);
    converterDoseComMetadata(r, CTX); extrairMetadataAvaliacao(r); serializarConversao(converterDoseComMetadata(r, CTX));
    expect(JSON.stringify(r)).toBe(antes);
  });
  it('a metadata é cópia profunda (alterar a cópia não altera o resultado)', () => {
    const r = avaliarDose(req({ peso_atual_kg: 10 }), [regra({ limites: { max_por_tomada: { valor: 5, unidade: 'mg' } } })]);
    const m = extrairMetadataAvaliacao(r); m.alertas.length = 0; m.limites_excedidos.length = 0;
    expect(r.alertas.length).toBeGreaterThan(0); expect(r.limites_excedidos.length).toBeGreaterThan(0);
  });
  it('a API de conversão com metadata EXIGE a avaliação (marcador) e não existe consumidor real da API legada', () => {
    const c = converterDoseComMetadata(avaliarDose(req(), [regra()]), CTX);
    expect(c.avaliacao_obrigatoria).toBe(true); expect('avaliacao' in c).toBe(true);
    const raiz = path.join(__dirname, '..');
    const achados: string[] = [];
    const varrer = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'tests' && e.name !== 'dose-contract') varrer(p); } else if (/\.(ts|tsx)$/.test(e.name) && /paraDoseEstruturada/.test(fs.readFileSync(p, 'utf8'))) achados.push(path.relative(raiz, p)); } };
    varrer(raiz);
    expect(achados).toEqual([]);
  });
});
