// ============================================================
// RM-107.1.1-E2.2 — Contenção de DTO posológico desatualizado: texto editado ⇒ DTO antigo NÃO é enviado ao backend
// sem reconfirmação explícita; reconfirmação não promove a avaliação; contrato do backend intacto.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { executarSincronizacaoConsulta, type SincronizarConsultaDeps, type Action } from '@/lib/store';
import type { Consultation, PrescriptionItem, DoseEstruturada } from '@/lib/types';
import { normalizarRegistro, estadosDoRegistro } from '@/lib/dose-contract';
import {
  registroDeRecomendacaoTexto, registrarEdicaoPosologica, reconfirmarDoseEstruturada, doseEstruturadaDesatualizada,
  prepararItemParaStore, leituraDoseEstruturada,
} from '@/lib/prescricao-proveniencia';

const SRC = (p: string) => readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');
const PANEL = SRC('../components/modules/PrescriptionPanel.tsx');
const STORE = SRC('../lib/store.tsx');
const DTO: DoseEstruturada = { valor: 500, unidade: 'mg', frequencia: '3x/dia', via: 'VO' };
const T0 = '2026-11-08T00:00:00.000Z', T1 = '2026-11-08T01:00:00.000Z', T2 = '2026-11-08T02:00:00.000Z', T3 = '2026-11-08T03:00:00.000Z';

const itemF2 = (): PrescriptionItem => ({
  id: 'i1', medicamento: 'Amoxicilina', concentracao: '500 mg', forma_farmaceutica: 'Comprimido', quantidade: '21 comprimidos',
  posologia: 'Amoxicilina 500 mg 8/8h', via: 'VO', duracao: '7 dias', uso_continuo: false, instrucoes_especiais: 'Tomar após refeição', dose_estruturada: DTO,
  posologia_registrada: registroDeRecomendacaoTexto({ texto: 'Amoxicilina 500 mg 8/8h', dose: DTO, criado_em: T0 }),
});
/** Mesma regra de `PrescriptionPanel.updateItem` (verificada por inspeção de código-fonte abaixo). */
const editar = (item: PrescriptionItem, campo: string, valor: string | boolean, em = T1): PrescriptionItem =>
  ({ ...item, [campo]: valor, posologia_registrada: registrarEdicaoPosologica(item.posologia_registrada, campo, (item as unknown as Record<string, unknown>)[campo], valor, em) });

function consulta(itens: PrescriptionItem[]): Consultation {
  return {
    id: 'local-1', status: 'concluida', paciente_nome: 'P', data: T0,
    anamnese: { queixa_principal: 'x', hda: 'x', hpp: 'x', historia_familiar: '', habitos_vida: {}, exame_fisico: '', sinais_vitais: {}, laboratorio: {}, imagem: '', comorbidades: [], medicamentos_em_uso: [], alergias: [], gestante: false, lactante: false, funcao_renal: {}, funcao_hepatica: {} },
    prescricao: { tipo: 'simples', paciente: { nome: 'P' }, medico: { nome: 'M', crm: 'C' }, itens: itens.map(prepararItemParaStore) as PrescriptionItem[], data_emissao: T0 },
  } as Consultation;
}
async function sincronizar(itens: PrescriptionItem[]) {
  const acoes: Action[] = [];
  const criarPrescricao = vi.fn().mockResolvedValue({ id: 'presc-1' });
  const deps: SincronizarConsultaDeps = {
    criar: vi.fn().mockResolvedValue({ id: 'srv-1' }), criarDiagnostico: vi.fn().mockResolvedValue({ id: 'd' }), salvarRisco: vi.fn().mockResolvedValue({ id: 'r' }),
    criarPrescricao, dispatch: (a: Action) => { acoes.push(a); }, sessaoValida: () => true, isAuthenticated: () => true,
  };
  const resultado = await executarSincronizacaoConsulta(consulta(itens), deps);
  return { resultado, criarPrescricao, acoes };
}

describe('E2.2 — texto alterado e DTO antigo: DTO não enviado', () => {
  it('editar o texto da posologia marca o DTO como desatualizado e o gate de sincronização impede o envio', async () => {
    const editado = editar(itemF2(), 'posologia', 'Amoxicilina 1 g 8/8h');
    expect(doseEstruturadaDesatualizada(editado)).toBe(true);
    expect(leituraDoseEstruturada(editado)).toEqual({ dose: null, estado: 'divergente_do_texto' });
    const { resultado, criarPrescricao } = await sincronizar([editado]);
    expect(resultado.prescricao).toBe('dose_estruturada_bloqueada');   // E2.3: bloqueio explícito (a dose estruturada é preservada, não omitida)
    expect(criarPrescricao).not.toHaveBeenCalled();                  // nada (nem o DTO antigo) vai ao backend
  });
  it.each(['dose', 'unidade', 'frequencia', 'via', 'concentracao', 'medicamento', 'molecula'] as const)('edição do campo %s também bloqueia o DTO antigo', (campo) => {
    const editado = editar(itemF2(), campo, 'novo');
    expect(doseEstruturadaDesatualizada(editado)).toBe(true);
    const pronto = prepararItemParaStore(editado);
    expect(pronto.bloqueio_dto?.estado).toBe('divergente');   // E2.3: marcado como bloqueado…
    expect((pronto as { dose_estruturada?: unknown }).dose_estruturada).toEqual(DTO);   // …e PRESERVADO (nenhuma perda silenciosa)
  });
  it('invalida a avaliação anterior, preserva texto original e histórico, e não recalcula/reconstrói o DTO', () => {
    const editado = editar(itemF2(), 'posologia', 'novo texto');
    const r = normalizarRegistro(editado.posologia_registrada);
    expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.texto_original).toBe('Amoxicilina 500 mg 8/8h');
    expect(r.edicoes_manuais).toEqual([{ campo: 'posologia', de: 'Amoxicilina 500 mg 8/8h', para: 'novo texto', em: T1 }]);
    expect(r.dose).toBeNull(); expect(r.dose_divergente?.dose_anterior).toEqual(DTO);
    expect(editado.dose_estruturada).toEqual(DTO);                   // local: o DTO não foi alterado nem recalculado
    expect(editado.posologia).toBe('novo texto');
  });
  it('o item enviado ao store preserva TODOS os dados legados (texto, quantidade, duração, instruções E a dose estruturada); só acrescenta o marcador de bloqueio', () => {
    const editado = editar(itemF2(), 'posologia', 'novo texto');
    const { posologia_registrada, ...esperado } = editado; void posologia_registrada;
    expect(prepararItemParaStore(editado)).toEqual({ ...esperado, bloqueio_dto: { estado: 'divergente', motivo: expect.stringContaining('posologia') }, proveniencia: expect.objectContaining({ v: 'prov-1', estrutura_dose: 'divergente' }) });   // E2.5: + envelope mínimo de proveniência (nada mais)
    expect(prepararItemParaStore(editado).posologia).toBe('novo texto');
  });
});

describe('E2.2 — texto inalterado e DTO consistente: comportamento anterior preservado', () => {
  it('sem edição o item sai idêntico e o DTO é enviado com o contrato de sempre', async () => {
    const item = itemF2(); const { dose_estruturada, posologia_registrada, ...esperado } = item; void posologia_registrada;
    expect(doseEstruturadaDesatualizada(item)).toBe(false);
    expect(prepararItemParaStore(item)).toEqual({ ...esperado, dose_estruturada, proveniencia: expect.objectContaining({ v: 'prov-1', estrutura_dose: 'consistente_conforme_origem' }) });   // E2.5: + envelope mínimo de proveniência (nada mais)
    const { resultado, criarPrescricao } = await sincronizar([item]);
    expect(resultado.prescricao).toBe('synced');
    const payload = criarPrescricao.mock.calls[0][0] as { medicamentos: Array<Record<string, unknown>> };
    expect(payload.medicamentos).toEqual([{ molecula: 'Amoxicilina', dose: DTO, duracao: '7 dias', observacoes: 'Tomar após refeição' }]);
  });
  it('edições que não tocam o DTO (duração, quantidade, instruções) não o tornam desatualizado', async () => {
    let item = itemF2();
    item = editar(item, 'duracao', '10 dias'); item = editar(item, 'quantidade', '30 comprimidos'); item = editar(item, 'instrucoes_especiais', 'outra');
    expect(doseEstruturadaDesatualizada(item)).toBe(false);
    const { resultado } = await sincronizar([item]); expect(resultado.prescricao).toBe('synced');
    expect(normalizarRegistro(item.posologia_registrada).avaliacao.tipo).toBe('nao_avaliada');   // avaliação invalidada por duração/quantidade (E2), sem afetar o DTO
  });
  it('valor igual ao anterior não conta como edição', () => {
    const item = editar(itemF2(), 'posologia', 'Amoxicilina 500 mg 8/8h'); expect(doseEstruturadaDesatualizada(item)).toBe(false);
  });
});

describe('E2.2 — ausência de reconfirmação e reconfirmação explícita', () => {
  it('ausência de reconfirmação: o DTO antigo nunca é enviado, mesmo após várias edições ou re-sincronizações', async () => {
    let item = editar(itemF2(), 'posologia', 'a'); item = editar(item, 'frequencia', '2x/dia', T2);
    for (let i = 0; i < 2; i++) { const { criarPrescricao } = await sincronizar([item]); expect(criarPrescricao).not.toHaveBeenCalled(); }
  });
  it('reconfirmação explícita: o MESMO DTO pode ser reutilizado e é enviado; avaliação NÃO é promovida e nada vira "validado"', async () => {
    const editado = editar(itemF2(), 'posologia', 'Amoxicilina 1 g 8/8h');
    const reconf = { ...editado, posologia_registrada: reconfirmarDoseEstruturada(editado.posologia_registrada, T2) };
    expect(doseEstruturadaDesatualizada(reconf)).toBe(false);
    const r = normalizarRegistro(reconf.posologia_registrada);
    expect(r.dose).toEqual(DTO); expect(r.dose_divergente).toBeUndefined(); expect(r.motivo_sem_dose).toBeUndefined();
    expect(r.reconfirmacoes_dose).toEqual([{ em: T2, dose: DTO, campos_reconfirmados: ['posologia'] }]);
    expect(r.avaliacao.tipo).toBe('nao_avaliada'); expect(r.homologacao_clinica).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/regra_clinicamente_validada/); expect(estadosDoRegistro(r).estado_regra).toBe('desconhecido');
    if (r.avaliacao.tipo === 'nao_avaliada') { expect(r.avaliacao.motivo).toBe('texto_livre'); /* F2 nunca foi calculada: o motivo original é mantido (não finge cálculo anterior) */ expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false); }
    expect(r.edicoes_manuais.map(e => e.campo)).toEqual(['posologia', 'dose_estruturada']);   // histórico preservado
    const { resultado, criarPrescricao } = await sincronizar([reconf]);
    expect(resultado.prescricao).toBe('synced'); expect((criarPrescricao.mock.calls[0][0] as { medicamentos: Array<{ dose: unknown }> }).medicamentos[0].dose).toEqual(DTO);
  });
  it('reconfirmar sem divergência não faz nada (mesmo objeto); reconfirmação não altera o DTO', () => {
    const reg = itemF2().posologia_registrada; expect(reconfirmarDoseEstruturada(reg, T2)).toBe(reg); expect(reconfirmarDoseEstruturada(undefined)).toBeUndefined();
  });
  it('edição posterior à reconfirmação: o DTO volta a ser desatualizado e deixa de ser enviado', async () => {
    let item = editar(itemF2(), 'posologia', 'a');
    item = { ...item, posologia_registrada: reconfirmarDoseEstruturada(item.posologia_registrada, T2) };
    expect(doseEstruturadaDesatualizada(item)).toBe(false);
    item = editar(item, 'posologia', 'b', T3);
    expect(doseEstruturadaDesatualizada(item)).toBe(true);
    const r = normalizarRegistro(item.posologia_registrada);
    expect(r.dose).toBeNull(); expect(r.dose_divergente).toEqual({ dose_anterior: DTO, campos: ['posologia'], em: T3 });
    expect(r.reconfirmacoes_dose).toHaveLength(1);                   // a reconfirmação anterior permanece só como histórico
    const { criarPrescricao } = await sincronizar([item]); expect(criarPrescricao).not.toHaveBeenCalled();
  });
});

describe('E2.2 — dados legados e compatibilidade com o backend', () => {
  it('item legado sem registro: comportamento anterior (nenhum DTO é retido nem inventado)', async () => {
    const { posologia_registrada, ...legado } = itemF2(); void posologia_registrada;
    expect(doseEstruturadaDesatualizada(legado)).toBe(false);
    expect(prepararItemParaStore(legado)).toEqual(legado);
    const { resultado } = await sincronizar([legado as PrescriptionItem]); expect(resultado.prescricao).toBe('synced');
    const semDto = { ...legado, dose_estruturada: undefined } as PrescriptionItem;
    expect((await sincronizar([semDto])).resultado.prescricao).toBe('sem_dose_estruturada');   // inalterado
  });
  it('um item desatualizado não impede os demais itens de seguirem o fluxo normal; a prescrição fica bloqueada como um todo (nunca parcial)', async () => {
    const ok = itemF2(); const ruim = { ...editar({ ...itemF2(), id: 'i2' }, 'posologia', 'x') };
    const { resultado, criarPrescricao } = await sincronizar([ok, ruim]);
    expect(resultado.prescricao).toBe('dose_estruturada_bloqueada'); expect(criarPrescricao).not.toHaveBeenCalled();
  });
  it('contrato do backend intacto: payload montado campo a campo, nenhum campo novo enviado', () => {
    expect(STORE).toMatch(/molecula: i\.medicamento,\s*dose: i\.dose_estruturada!,\s*duracao: i\.duracao,\s*observacoes: i\.instrucoes_especiais,/);
    expect(STORE).not.toMatch(/posologia_registrada|dose_divergente|reconfirmacoes_dose/);
    for (const f of ['../lib/api-client.ts', '../components/modules/PrescriptionPrintPreview.tsx']) expect(SRC(f)).not.toMatch(/posologia_registrada|dose_divergente|reconfirmacoes_dose/);
    const dto = readFileSync(path.resolve(__dirname, '../../../backend/src/modules/consulta/dto/consulta.dto.ts'), 'utf8');
    expect(dto).toMatch(/export class ItemMedicamentoDto[\s\S]*molecula[\s\S]*dose: DoseEstruturadaDto[\s\S]*duracao[\s\S]*observacoes\?/);
    expect(dto).not.toMatch(/dose_divergente|posologia_registrada/);
  });
  it('o Panel usa as mesmas funções que os testes: updateItem → registrarEdicaoPosologica; finalizar → prepararItemParaStore; reconfirmar → reconfirmarDoseEstruturada', () => {
    expect(PANEL).toMatch(/\[field\]: value, posologia_registrada: registrarEdicaoPosologica\(item\.posologia_registrada, field/);
    expect(PANEL).toContain('itens: prescricao.itens.map(prepararItemParaStore)');
    expect(PANEL).toMatch(/posologia_registrada: reconfirmarDoseEstruturada\(item\.posologia_registrada\)/);
    expect(PANEL).toContain('Reutilizar a dose estruturada anterior');
    expect(PANEL).not.toMatch(/dose_estruturada:\s*(undefined|null)/);   // o Panel nunca apaga/zera o DTO local
  });
  it('o aviso ao prescritor é explícito e não promete validação', () => {
    expect(PANEL).toContain('não será enviada ao servidor</strong> enquanto você não decidir reutilizá-la');
    expect(PANEL).toContain('não equivale a validar clinicamente a dose');
    expect(PANEL).not.toMatch(/reconfirm[^\n]*(validada|segura|aprovada)/i);
  });
  it('normalização: registro persistido com reconfirmação inválida é descartado; idempotente', () => {
    const editado = editar(itemF2(), 'posologia', 'a');
    const reconf = reconfirmarDoseEstruturada(editado.posologia_registrada, T2)!;
    expect(normalizarRegistro(JSON.parse(JSON.stringify(reconf)))).toEqual(reconf);
    const lixo = JSON.parse(JSON.stringify(reconf)); lixo.reconfirmacoes_dose = [{ em: T2, dose: { valor: 'x' } }, null, 3];
    expect(normalizarRegistro(lixo).reconfirmacoes_dose).toBeUndefined();
  });
});
