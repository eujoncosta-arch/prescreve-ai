// ============================================================
// RM-107.1.1-E2 — Integração local (em memória) da proveniência da posologia nos itens da prescrição.
// Prova: F2/F3/F3b/F3c, legado ⇒ nao_avaliada, sem persistência, sem alteração de valores posológicos.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { getAllDrugs, type QuickDrug } from '@/lib/pharma-database';
import { calcFullDose, mapUnidadeParaContrato, type FullDoseInput, type FullDoseResult } from '@/lib/dose-calculator';
import { avaliarDose, registroDeDoseResult, registroDeFullDoseResult, estadosDoRegistro, type DoseRule, type DoseRequest, type AprovacaoFormal, type Governanca, type FonteDose } from '@/lib/dose-contract';
import {
  registroDeRecomendacaoTexto, registroDeInclusaoManual, registrarEdicaoPosologica, registroEfetivo, semRegistroParaPersistir,
  campoAlteraPosologia, CAMPOS_POSOLOGICOS, CAMPOS_ADMINISTRATIVOS,
} from '@/lib/prescricao-proveniencia';

const todos = getAllDrugs();
const porId = (id: string) => todos.find(d => d.id === id)!;
const entrada = (d: QuickDrug): FullDoseInput => ({ molecula: d.molecula, dose_adulto: d.dose_adulto, dose_pediatrica: d.dose_pediatrica, ajuste_renal: d.ajuste_renal, ajuste_hepatico: d.ajuste_hepatico, alertas_especiais: d.alertas_especiais, uso_gestante: d.uso_gestante, uso_lactante: d.uso_lactante });
const conc = (d: QuickDrug) => d.marcas.flatMap(b => b.concentracoes)[0] ?? `${d.dose_adulto.habitual} ${d.dose_adulto.unidade}`;
const calc = (d: QuickDrug, anos: number, kg: number, alt = 1.7): FullDoseResult => calcFullDose(entrada(d), anos, kg, conc(d), undefined, '', false, false, alt);
const adultoNormal = () => todos.find(x => !x.dose_pediatrica && !calc(x, 40, 70).frequencia_indeterminada && !calc(x, 40, 70).alertas.some(a => a.startsWith('🚨')) && mapUnidadeParaContrato(calc(x, 40, 70).dose_unidade) !== null && calc(x, 40, 70).dose_por_tomada > 0)!;

const SRC = (p: string) => readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');
const PAGE = SRC('../app/prescricao-rapida/page.tsx');
const PANEL = SRC('../components/modules/PrescriptionPanel.tsx');
const STORE = SRC('../lib/store.tsx');

describe('E2 — F2: recomendação textual', () => {
  it('texto de recomendação permanece nao_avaliada, com origem e texto preservados e nada confirmado', () => {
    const dto = { valor: 500, unidade: 'mg' as const, frequencia: '3x/dia' as const, via: 'VO' };
    const r = registroDeRecomendacaoTexto({ texto: 'Amoxicilina 500 mg 8/8h por 7 dias', dose: dto, campos_padrao: ['forma_farmaceutica', 'quantidade'], criado_em: '2026-11-07T00:00:00.000Z' });
    expect(r.origem).toBe('recomendacao_texto'); expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.texto_original).toBe('Amoxicilina 500 mg 8/8h por 7 dias');
    expect(r.dose).toEqual(dto);                                    // cópia do DTO legado, sem alteração
    expect(r.campos_padrao).toEqual(['forma_farmaceutica', 'quantidade']);   // apresentação/quantidade não são dados confirmados
    expect(estadosDoRegistro(r).estado_regra).toBe('desconhecido'); expect(JSON.stringify(r)).not.toMatch(/regra_clinicamente_validada/);
  });
  it('sem dose estruturada legível, o texto não vira dose numérica', () => {
    const r = registroDeRecomendacaoTexto({ texto: 'infusão 0,1 mg/kg/min' }); expect(r.dose).toBeNull(); expect(r.motivo_sem_dose).toBeTruthy(); expect(r.avaliacao.tipo).toBe('nao_avaliada');
  });
  it('PrescriptionPanel registra F2 com registroDeRecomendacaoTexto sobre o texto original da recomendação', () => {
    expect(PANEL).toMatch(/registroDeRecomendacaoTexto\(\{\s*texto: m\.posologia_completa/);
  });
});

describe('E2 — F3: motor C', () => {
  it('registro preserva estado, alertas e limitações do resultado; resultado e texto legado intactos', () => {
    const d = adultoNormal(); const r = calc(d, 40, 70); const antes = JSON.stringify(r);
    const reg = registroDeFullDoseResult(r, { via: d.dose_adulto.via }, { campos_padrao: ['via', 'duracao'] });
    expect(JSON.stringify(r)).toBe(antes);
    expect(reg.origem).toBe('dose_calculator');
    if (reg.avaliacao.tipo !== 'avaliada_motor_c') throw new Error('esperado avaliada_motor_c');
    expect(reg.avaliacao.estado).toBe(r.estado_avaliacao); expect(reg.avaliacao.alertas).toEqual(r.alertas); expect(reg.avaliacao.limitacoes).toEqual(r.limitacoes);
    expect(reg.avaliacao.fonte_clinica_registrada).toBe(false); expect(reg.avaliacao.homologacao_clinica).toBe(false);
    expect(reg.texto_original).toBe(r.posologia_sugerida);
  });
  it('dose numérica do registro = valores do motor (todo o catálogo); texto legado montado pela tela não depende do registro', () => {
    for (const d of todos) {
      const r = calc(d, 40, 70); const reg = registroDeFullDoseResult(r, { via: d.dose_adulto.via });
      if (reg.dose) { expect(reg.dose.valor, d.id).toBe(r.dose_por_tomada); expect(reg.dose.unidade, d.id).toBe(mapUnidadeParaContrato(r.dose_unidade)); }
    }
    // a linha legada que monta o texto da dose segue literal na tela
    expect(PAGE).toContain('`${result.volume_por_tomada} mL (${result.dose_por_tomada} ${result.dose_unidade})`');
    expect(PAGE).toContain('`${result.dose_por_tomada} ${result.dose_unidade}`');
    expect(PAGE).toContain("frequencia: freqMap[result.tomadas_dia] ?? `${result.tomadas_dia}x/dia`");
    expect(PAGE).toContain('via: selectedDrug.dose_adulto.via,');
  });
  it('unidade incompatível não gera dose estruturada artificial; o motivo é registrado', () => {
    const r = calc(porId('ibuprofeno'), 4, 15, 1.0); expect(r.dose_unidade).toBe('mg/kg/dose');
    const reg = registroDeFullDoseResult(r, { via: 'VO' });
    expect(reg.dose).toBeNull(); expect(reg.motivo_sem_dose).toMatch(/sem equivalente em UnidadeDose/); expect(reg.texto_original).toBe(r.posologia_sugerida);
  });
  it('a tela aplica o registro do motor C SEM alterar os campos legados do item', () => {
    const trecho = PAGE.slice(PAGE.indexOf('const applyDoseCalc'), PAGE.indexOf('// ── Remove item'));
    expect(trecho).toMatch(/item\.posologia_registrada = registroDeResultadoMotorC\(result, \{ via: selectedDrug\.dose_adulto\.via \}/);
    // nenhuma leitura do registro altera dose/frequência/via/duração do item
    expect(trecho).not.toMatch(/posologia_registrada\.(dose|avaliacao)/);
    expect(trecho).toContain('dose: doseTexto,');
  });
});

describe('E2 — F3b: inclusão manual', () => {
  it('nunca gera avaliação validada nem dose estruturada; origem digitada; defaults marcados', () => {
    const r = registroDeInclusaoManual({ texto: '40 mg', campos_padrao: ['via', 'frequencia', 'duracao'] });
    expect(r.origem).toBe('digitada_pelo_prescritor'); expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.dose).toBeNull(); expect(r.campos_padrao).toEqual(['via', 'frequencia', 'duracao']);
    expect(JSON.stringify(r)).not.toMatch(/validad|aprova|fonte_utilizada/);
    if (r.avaliacao.tipo === 'nao_avaliada') expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false);
  });
  it('addItem (Panel, item em branco) usa registroDeInclusaoManual; addToRx (page, dose pré-preenchida) usa origem desconhecida (E2.1)', () => {
    expect(PANEL).toMatch(/posologia_registrada: registroDeInclusaoManual\(/);
    expect(PAGE).toMatch(/registroDeInclusaoComFonteDaDose\(/); expect(PAGE).toMatch(/registroDeInclusaoComDosePreenchida\(/);   /* E2.3: fonte comprovada; sem fonte ⇒ desconhecida */
    expect(PAGE).not.toMatch(/registroDeInclusaoManual\(/);
  });
});

describe('E2 — F3c: edição', () => {
  const avaliado = () => registroDeFullDoseResult(calc(adultoNormal(), 40, 70), { via: 'VO' }, { criado_em: '2026-11-07T00:00:00.000Z' });
  it('alteração de campo posológico invalida a avaliação anterior e o histórico permanece disponível', () => {
    const base = avaliado(); expect(base.avaliacao.tipo).toBe('avaliada_motor_c');
    for (const campo of ['dose', 'frequencia', 'via', 'concentracao', 'forma_farmaceutica', 'duracao', 'quantidade', 'posologia', 'uso_continuo']) {
      const ed = registrarEdicaoPosologica(base, campo, 'antes', 'depois', '2026-11-07T01:00:00.000Z')!;
      expect(ed.avaliacao.tipo, campo).toBe('nao_avaliada');
      if (ed.avaliacao.tipo === 'nao_avaliada') { expect(ed.avaliacao.motivo).toBe('editada_apos_calculo'); expect(ed.avaliacao.avaliacao_anterior).toEqual(base.avaliacao); }
      expect(ed.edicoes_manuais).toEqual([{ campo, de: 'antes', para: 'depois', em: '2026-11-07T01:00:00.000Z' }]);
    }
    expect(base.avaliacao.tipo).toBe('avaliada_motor_c');    // original imutável
  });
  it('edições sucessivas preservam a avaliação ORIGINAL (não a substituem por "não avaliada")', () => {
    const base = avaliado(); const e1 = registrarEdicaoPosologica(base, 'dose', '1', '2')!; const e2 = registrarEdicaoPosologica(e1, 'frequencia', 'a', 'b')!;
    expect(e2.edicoes_manuais).toHaveLength(2);
    if (e2.avaliacao.tipo === 'nao_avaliada') expect(e2.avaliacao.avaliacao_anterior).toEqual(base.avaliacao);
  });
  it('alteração exclusivamente administrativa, ou sem mudança de valor, NÃO invalida a avaliação', () => {
    const base = avaliado();
    for (const campo of ['instrucoes', 'instrucoes_especiais', 'tipo_receita', 'nome_comercial', 'laboratorio', 'produto_id']) expect(registrarEdicaoPosologica(base, campo, 'a', 'b'), campo).toBe(base);
    expect(registrarEdicaoPosologica(base, 'dose', '10 mg', '10 mg')).toBe(base);
    expect(registrarEdicaoPosologica(base, 'uso_continuo', false, false)).toBe(base);
  });
  it('registro já não avaliado: só acrescenta a trilha (não finge cálculo anterior)', () => {
    const m = registroDeInclusaoManual({ texto: 'x' }); const ed = registrarEdicaoPosologica(m, 'dose', '1', '2')!;
    expect(ed.avaliacao).toEqual(m.avaliacao); expect(ed.edicoes_manuais).toHaveLength(1);
    const f2 = registroDeRecomendacaoTexto({ texto: 't' }); const e2 = registrarEdicaoPosologica(f2, 'posologia', 'a', 'b')!;
    if (e2.avaliacao.tipo === 'nao_avaliada') { expect(e2.avaliacao.motivo).toBe('texto_livre'); expect(e2.avaliacao.avaliacao_anterior).toBeUndefined(); }
  });
  it('classificação de campos: posológicos invalidam, administrativos não; desconhecido invalida (conservador)', () => {
    for (const c of CAMPOS_POSOLOGICOS) expect(campoAlteraPosologia(c), c).toBe(true);
    for (const c of CAMPOS_ADMINISTRATIVOS) expect(campoAlteraPosologia(c), c).toBe(false);
    expect(campoAlteraPosologia('campo_novo_qualquer')).toBe(true);
  });
  it('edição de campo fora do DTO (duração) não altera dose estruturada nem origem do registro', () => {
    const base = avaliado(); const ed = registrarEdicaoPosologica(base, 'duracao', '7 dias', '10 dias')!;
    expect(ed.dose).toEqual(base.dose); expect(ed.origem).toBe(base.origem); expect(ed.texto_original).toBe(base.texto_original);
  });
  it('as duas telas roteiam updateItem por registrarEdicaoPosologica, mantendo o valor gravado', () => {
    expect(PAGE).toMatch(/\[field\]: value, posologia_registrada: registrarEdicaoPosologica\(i\.posologia_registrada, field, i\[field\], value\)/);
    expect(PANEL).toMatch(/\[field\]: value, posologia_registrada: registrarEdicaoPosologica\(item\.posologia_registrada, field/);
  });
});

describe('E2 — legado e ausência de metadata', () => {
  it('item sem registro (legado, protocolo/favorito antigo, estruturas recebidas) é nao_avaliada; ausência nunca vira "sem alertas"', () => {
    for (const item of [{}, { posologia_registrada: undefined }, { posologia_registrada: null }, { posologia_registrada: {} }, { posologia_registrada: 'x' }, null, undefined]) {
      const r = registroEfetivo(item as never);
      expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.homologacao_clinica).toBe(false);
      if (r.avaliacao.tipo === 'nao_avaliada') expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false);
      expect(JSON.stringify(r)).not.toMatch(/"alertas":\[\]|"limitacoes":\[\]/);
      expect(estadosDoRegistro(r).estado_calculo).toBe('desconhecido');
    }
  });
  it('registro legado "forjado" como avaliado sem prova não é promovido', () => {
    const r = registroEfetivo({ posologia_registrada: { versao_registro: 'posologia-1', origem: 'backend_legado', avaliacao: { tipo: 'avaliada', metadata: {} } } });
    expect(estadosDoRegistro(r).estado_regra).not.toBe('regra_clinicamente_validada');
  });
  it('item sem registro editado continua sem registro (interpretado como nao_avaliada)', () => {
    expect(registrarEdicaoPosologica(undefined, 'dose', '1', '2')).toBeUndefined();
  });
});

describe('E2 — nenhum fluxo cria validação sem fonte e aprovação', () => {
  const FONTE: FonteDose = { estado_de_revisao: 'verificada', instituicao: 'I', documento: 'D', url_ou_identificador: 'u', versao: 'v', data: '2026-01-01', secao: 's', trecho: 't', populacao: 'p', indicacao: 'i', via: 'v', limitacoes_da_fonte: [] };
  const APROV: AprovacaoFormal = { responsavel: 'R', cargo: 'medico', data: '2026-01-01', parecer: 'p' };
  const GOV: Governanca = { status_declarado: 'clinicamente_validada', fontes: [FONTE], aprovacao: APROV, limitacoes: [] };
  const regra: DoseRule = { regra_id: 'S', origem: { motor: 'sintetica', referencia: 's' }, entidade_id: 'F', vinculo_entidade: 'sintetico', molecula_original: 'F', faixa_idade_dias: { min: 0, min_inclusivo: true }, via: 'oral', posologia: { tipo_calculo: 'fixa', valor: 10, unidade_massa: 'mg', unidade_original: 'mg', base_temporal: 'por_tomada', frequencia: { tipo: 'vezes_dia', vezes: 3 } }, limites: {}, ajustes: {}, restricoes: [], governanca: GOV, pendencias: [], incompatibilidades: [] };
  const req: DoseRequest = { contrato_versao: 'dose-1', identidade: { entidade_id: 'F' }, idade: { valor: 30, unidade: 'anos' }, contexto: {} };
  it('nenhum construtor de F2/F3/F3b/F3c produz regra_clinicamente_validada', () => {
    const d = adultoNormal();
    const regs = [
      registroDeRecomendacaoTexto({ texto: 't' }), registroDeInclusaoManual({ texto: 't' }),
      registroDeFullDoseResult(calc(d, 40, 70), { via: 'VO' }), registrarEdicaoPosologica(registroDeFullDoseResult(calc(d, 40, 70), { via: 'VO' }), 'dose', '1', '2')!,
    ];
    for (const r of regs) expect(JSON.stringify(r)).not.toMatch(/regra_clinicamente_validada/);
  });
  it('mesmo uma regra com fonte+aprovação só aparece validada no registro com aprovação formal explícita (nenhuma tela a passa)', () => {
    const r = avaliarDose(req, [regra]);
    expect(estadosDoRegistro(registroDeDoseResult(r, { via: 'oral' })).estado_regra).toBe('fonte_consultada_aguardando_revisao');
    expect(PAGE).not.toMatch(/aprovacao_formal/); expect(PANEL).not.toMatch(/aprovacao_formal/);
    expect(SRC('../lib/prescricao-proveniencia.ts')).not.toMatch(/regra_clinicamente_validada|clinicamente_validada/);
  });
});

describe('E2 — sem persistência e valores posológicos idênticos', () => {
  it('semRegistroParaPersistir remove só o registro e preserva todos os valores posológicos', () => {
    const item = { id: '1', molecula: 'X', dose: '10 mg', frequencia: '3x/dia (8/8h)', via: 'VO', duracao: '7 dias', concentracao: '10 mg', forma_farmaceutica: 'Comprimido', instrucoes: '', uso_continuo: false, posologia_registrada: registroDeInclusaoManual({ texto: '10 mg' }) };
    const { posologia_registrada, ...legado } = item; void posologia_registrada;
    expect(semRegistroParaPersistir(item)).toEqual(legado); expect('posologia_registrada' in semRegistroParaPersistir(item)).toBe(false);
  });
  it('favoritos: o registro é removido antes do localStorage; protocolos/impressão/store não referenciam o registro', () => {
    expect(PAGE).toContain('itens: fav.itens.map(semRegistroParaPersistir)');
    expect(PAGE).toContain('itens: rxItems,');   // literal exigido pela RM-105.2.1 permanece
    // E2.2: o Panel usa `prepararItemParaStore`, que remove o registro (via semRegistroParaPersistir) e ainda contém DTO desatualizado
    expect(PANEL).toContain('itens: prescricao.itens.map(prepararItemParaStore)');
    expect(STORE).not.toMatch(/posologia_registrada/);
    expect(SRC('../components/modules/PrescriptionPrintPreview.tsx')).not.toMatch(/posologia_registrada/);
    expect(SRC('../lib/api-client.ts')).not.toMatch(/posologia_registrada/);
    // nenhum setItem novo na integração
    const semComentarios = SRC('../lib/prescricao-proveniencia.ts').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(semComentarios).not.toMatch(/localStorage|sessionStorage|fetch\(/);
  });
  it('a sincronização com o backend continua montando o payload campo a campo (extras não vazam)', () => {
    expect(STORE).toMatch(/molecula: i\.medicamento,\s*dose: i\.dose_estruturada!,\s*duracao: i\.duracao,\s*observacoes: i\.instrucoes_especiais,/);
  });
  it('motores, regras e DTO existente intactos: DoseEstruturada não ganhou campos', () => {
    const tipos = SRC('../lib/types.ts'); const bloco = tipos.slice(tipos.indexOf('export interface DoseEstruturada'), tipos.indexOf('export interface DoseEstruturada') + 900);
    expect(bloco).not.toMatch(/posologia_registrada|avaliacao|origem/);
  });
});
