// ============================================================
// RM-107.1.1-E2.1 — origem de addToRx e consistência entre texto editado e DTO numérico.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import {
  registroDeInclusaoComDosePreenchida, registroDeInclusaoManual, registroDeRecomendacaoTexto, registrarEdicaoPosologica,
  leituraDoseEstruturada, campoDivergeDoDto, CAMPOS_QUE_DIVERGEM_DO_DTO, semRegistroParaPersistir,
} from '@/lib/prescricao-proveniencia';
import { normalizarRegistro, estadosDoRegistro, registroNaoAvaliado, ORIGENS_DA_POSOLOGIA } from '@/lib/dose-contract';

const SRC = (p: string) => readFileSync(path.resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');
const PAGE = SRC('../app/prescricao-rapida/page.tsx');
const PANEL = SRC('../components/modules/PrescriptionPanel.tsx');
const DTO = { valor: 500, unidade: 'mg' as const, frequencia: '3x/dia' as const, via: 'VO' };
const T0 = '2026-11-07T00:00:00.000Z', T1 = '2026-11-07T01:00:00.000Z';

describe('E2.1 — origem do fluxo addToRx', () => {
  it('a dose de addToRx vem do sistema (catálogo/calcWeightDose) e é editável: código-fonte confirma que a origem não é determinável', () => {
    expect(PAGE).toContain('setCustomDose(drug.dose_adulto.habitual);');                  // pré-preenchida pelo catálogo
    expect(PAGE).toContain('setCustomDose(String(result.dose_por_tomada));');             // pré-preenchida por calcWeightDose
    expect(PAGE).toMatch(/onChange=\{e => \{ setCustomDose\(e\.target\.value\); setCustomDoseFonte\('digitada'\); \}\}/);   // …e editável pelo prescritor (E2.3: a edição é registrada como fonte "digitada")
  });
  it('dose pré-preenchida NÃO é classificada como digitada pelo prescritor; origem fica desconhecida', () => {
    const r = registroDeInclusaoComDosePreenchida({ texto: '500 mg', campos_padrao: ['via', 'frequencia', 'duracao'], criado_em: T0 });
    expect(r.origem).toBe('desconhecida'); expect(r.origem).not.toBe('digitada_pelo_prescritor');
    expect(r.avaliacao.tipo).toBe('nao_avaliada'); if (r.avaliacao.tipo === 'nao_avaliada') expect(r.avaliacao.motivo).toBe('origem_desconhecida');
    expect(r.dose).toBeNull(); expect(r.texto_original).toBe('500 mg'); expect(r.campos_padrao).toEqual(['via', 'frequencia', 'duracao']);
    /* E2.3: com fonte comprovada usa registroDeInclusaoComFonteDaDose; sem fonte rastreável, permanece desconhecida */
    expect(PAGE).toMatch(/registroDeInclusaoComFonteDaDose\(\{ fonte: customDoseFonte, texto: item\.dose/);
    expect(PAGE).toMatch(/: registroDeInclusaoComDosePreenchida\(\{ texto: item\.dose, campos_padrao: \['via', 'frequencia', 'duracao'\] \}\)/);
    expect(PAGE).not.toMatch(/registroDeInclusaoManual/);
  });
  it('as 8 categorias originais permanecem; a única adição (E2.3) é pre_preenchida_pelo_sistema, com fonte comprovada', () => {
    expect(ORIGENS_DA_POSOLOGIA.slice(0, 8)).toEqual(['contrato_dose', 'dose_calculator', 'recomendacao_texto', 'digitada_pelo_prescritor', 'protocolo_texto', 'backend_legado', 'importacao_localstorage', 'desconhecida']);
    expect(ORIGENS_DA_POSOLOGIA).toHaveLength(9);
  });
  it('origem desconhecida permanece desconhecida: edição, normalização e serialização não a "promovem"', () => {
    const r = registroDeInclusaoComDosePreenchida({ texto: '1 mg', criado_em: T0 });
    const ed = registrarEdicaoPosologica(r, 'dose', '1 mg', '2 mg', T1)!;
    expect(ed.origem).toBe('desconhecida');
    expect(normalizarRegistro(JSON.parse(JSON.stringify(ed))).origem).toBe('desconhecida');
    expect(estadosDoRegistro(ed).estado_calculo).toBe('desconhecido');
  });
  it('o item em branco do Panel (nada pré-preenchido) continua sendo digitada_pelo_prescritor', () => {
    expect(registroDeInclusaoManual({ texto: '' }).origem).toBe('digitada_pelo_prescritor');
  });
});

describe('E2.1 — texto editado × DTO numérico anterior', () => {
  const comDto = () => registroDeRecomendacaoTexto({ texto: 'Amoxicilina 500 mg 8/8h', dose: DTO, criado_em: T0 });

  it('edição do texto da posologia invalida a avaliação (já não avaliada: segue não avaliada; avaliada: passa a não avaliada)', () => {
    const ed = registrarEdicaoPosologica(comDto(), 'posologia', 'Amoxicilina 500 mg 8/8h', 'Amoxicilina 1 g 8/8h', T1)!;
    expect(ed.avaliacao.tipo).toBe('nao_avaliada'); expect(ed.edicoes_manuais).toHaveLength(1);
  });
  it('DTO divergente NÃO é tratado como representação atual: dose=null, motivo registrado, anterior só como histórico', () => {
    const base = comDto(); const antes = JSON.stringify(base);
    const ed = registrarEdicaoPosologica(base, 'posologia', 'a', 'b', T1)!;
    expect(JSON.stringify(base)).toBe(antes);                                           // original imutável
    expect(ed.dose).toBeNull(); expect(ed.motivo_sem_dose).toMatch(/não representa a posologia atual/);
    expect(ed.dose_divergente).toEqual({ dose_anterior: DTO, campos: ['posologia'], em: T1 });
    expect(ed.dose_divergente!.dose_anterior).not.toBe(base.dose);                      // cópia
    expect(ed.texto_original).toBe(base.texto_original);                                // texto original preservado
  });
  it('cada campo do DTO ou do texto da dose gera divergência; duração/quantidade/forma/administrativos não', () => {
    for (const c of CAMPOS_QUE_DIVERGEM_DO_DTO) { const ed = registrarEdicaoPosologica(comDto(), c, 'x', 'y', T1)!; expect(ed.dose, c).toBeNull(); expect(ed.dose_divergente?.campos, c).toEqual([c]); }
    for (const c of ['duracao', 'quantidade', 'forma_farmaceutica', 'uso_continuo']) { const ed = registrarEdicaoPosologica(comDto(), c, 'x', 'y', T1)!; expect(ed.dose, c).toEqual(DTO); expect(ed.dose_divergente, c).toBeUndefined(); expect(campoDivergeDoDto(c)).toBe(false); }
    for (const c of ['instrucoes', 'tipo_receita', 'nome_comercial', 'laboratorio']) { const b = comDto(); expect(registrarEdicaoPosologica(b, c, 'x', 'y', T1), c).toBe(b); }
  });
  it('edições sucessivas acumulam campos e mantêm o DTO ORIGINAL como histórico (nada é reconstruído, mesmo editando de volta)', () => {
    let r = registrarEdicaoPosologica(comDto(), 'posologia', 'a', 'b', T1)!;
    r = registrarEdicaoPosologica(r, 'frequencia', '3x', '2x', T1)!;
    r = registrarEdicaoPosologica(r, 'posologia', 'b', 'a', T1)!;                       // "voltou" ao texto original: continua divergente
    expect(r.dose).toBeNull(); expect(r.dose_divergente!.dose_anterior).toEqual(DTO); expect(r.dose_divergente!.campos.sort()).toEqual(['frequencia', 'posologia']);
    expect(r.edicoes_manuais).toHaveLength(3);
  });
  it('registro persistido/forjado com dose preenchida E divergência: a normalização NÃO reaproveita o DTO divergente', () => {
    const ed = registrarEdicaoPosologica(comDto(), 'posologia', 'a', 'b', T1)!;
    const forjado = JSON.parse(JSON.stringify(ed)); forjado.dose = DTO;
    const n = normalizarRegistro(forjado); expect(n.dose).toBeNull(); expect(n.dose_divergente?.dose_anterior).toEqual(DTO);
    expect(normalizarRegistro(JSON.parse(JSON.stringify(ed)))).toEqual(ed);               // idempotente
  });
  it('a avaliação anterior permanece só como histórico e a nova nunca é promovida', () => {
    const r = registrarEdicaoPosologica(comDto(), 'dose', '500 mg', '1 g', T1)!;
    expect(JSON.stringify(r)).not.toMatch(/regra_clinicamente_validada/); expect(r.homologacao_clinica).toBe(false);
    if (r.avaliacao.tipo === 'nao_avaliada') expect(r.avaliacao.ausencia_de_alerta_indica_seguranca).toBe(false);
  });
});

describe('E2.1 — leitura segura da dose estruturada do item', () => {
  const item = () => ({ id: '1', posologia: 'Amoxicilina 500 mg 8/8h', dose_estruturada: DTO, posologia_registrada: registroDeRecomendacaoTexto({ texto: 'Amoxicilina 500 mg 8/8h', dose: DTO, criado_em: T0 }) });
  it('consistente: devolve o DTO sem afirmar validação', () => {
    expect(leituraDoseEstruturada(item())).toEqual({ dose: DTO, estado: 'consistente' });
  });
  it('divergente: nunca devolve o DTO anterior como dose atual', () => {
    const it0 = item(); const editado = { ...it0, posologia: 'outro', posologia_registrada: registrarEdicaoPosologica(it0.posologia_registrada, 'posologia', it0.posologia, 'outro', T1) };
    expect(leituraDoseEstruturada(editado)).toEqual({ dose: null, estado: 'divergente_do_texto' });
    expect(editado.dose_estruturada).toEqual(DTO);   // o campo legado NÃO foi alterado (E2.1 não muda sync/backend)
  });
  it('sem registro (legado): devolve o DTO existente como estava e sinaliza "sem_registro"; sem DTO ⇒ null, nunca dose artificial', () => {
    expect(leituraDoseEstruturada({ dose_estruturada: DTO })).toEqual({ dose: DTO, estado: 'sem_registro' });
    expect(leituraDoseEstruturada({})).toEqual({ dose: null, estado: 'sem_registro' });
    expect(leituraDoseEstruturada(null)).toEqual({ dose: null, estado: 'sem_registro' });
    expect(leituraDoseEstruturada({ posologia_registrada: registroDeInclusaoManual({ texto: 'x' }) })).toEqual({ dose: null, estado: 'consistente' });
  });
});

describe('E2.1 — ausência de dados e valores legados', () => {
  it('ausência de dados não produz dose artificial: sem DTO registrado, editar não cria nem reconstrói DTO', () => {
    for (const r of [registroDeInclusaoManual({ texto: '' }), registroDeInclusaoComDosePreenchida({ texto: '10 mg' }), registroNaoAvaliado({ origem: 'backend_legado', motivo: 'legado_sem_metadata' })]) {
      const ed = registrarEdicaoPosologica(r, 'posologia', 'a', 'b', T1)!;
      expect(ed.dose).toBeNull(); expect(ed.dose_divergente).toBeUndefined();            // nada a marcar: nunca nasce um DTO
    }
    expect(registrarEdicaoPosologica(undefined, 'posologia', 'a', 'b')).toBeUndefined();
  });
  it('valores legados do item não são alterados: o registro só adiciona/atualiza `posologia_registrada`', () => {
    expect(PANEL).toMatch(/\{ \.\.\.item, \[field\]: value, posologia_registrada: registrarEdicaoPosologica\(/);
    expect(PANEL).not.toMatch(/dose_estruturada: (undefined|null)/);                       // o campo legado não é apagado nem recalculado
    expect(PANEL).toContain('dose_estruturada: doseEstruturada,');
    const it0 = { id: '1', posologia: 'x', dose_estruturada: DTO, posologia_registrada: registroDeRecomendacaoTexto({ texto: 'x', dose: DTO }) };
    const { posologia_registrada, ...legado } = it0; void posologia_registrada;
    expect(semRegistroParaPersistir(it0)).toEqual(legado);
  });
  it('E2.1 não toca backend/store/impressão/favoritos', () => {
    for (const f of ['../lib/store.tsx', '../lib/api-client.ts', '../components/modules/PrescriptionPrintPreview.tsx']) expect(SRC(f)).not.toMatch(/posologia_registrada|dose_divergente/);
    expect(PAGE).toContain('itens: rxItems,'); expect(PAGE).toContain('itens: fav.itens.map(semRegistroParaPersistir)');
  });
});
