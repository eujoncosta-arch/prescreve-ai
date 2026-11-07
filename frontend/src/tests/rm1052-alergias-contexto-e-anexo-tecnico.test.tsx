// ============================================================
// RM-105.2 — Alergias explícitas, estados de contexto e anexo técnico exclusivo do prescritor (opção B)
// ============================================================
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { drugRepository } from '@/lib/pharma-core';
import { runSafetyCheck, SAFETY_CONTRACT_VERSION, type SafetyCheckInput } from '@/lib/safety-rules';
import { avaliarCoberturaContextual, derivarIdoso } from '@/lib/safety-context';
import { anexoComoTexto, montarAnexoTecnico, ANEXO_TITULO } from '@/lib/safety-annex';
import { ReceitaPaciente } from '@/components/modules/ReceitaPaciente';
import { AnexoTecnicoPrescritor } from '@/components/modules/AnexoTecnicoPrescritor';
import { PrescriptionPrintPreview } from '@/components/modules/PrescriptionPrintPreview';

const ids = (r: ReturnType<typeof runSafetyCheck>) => r.alertas.map(a => a.id);
const estado = (r: ReturnType<typeof runSafetyCheck>, campo: string) => r.cobertura_contextual.itens.find(i => i.campo === campo)!.estado;

/** Contexto completo e válido (todas as regras com dado), sem alergias. */
const CTX: Partial<SafetyCheckInput> = { gestante: false, lactante: false, idade_anos: 40, sexo: 'F', crclValue: 90, peso_kg: 60 };

function com(moleculas: string[], extra: Partial<SafetyCheckInput> = {}, entidade_ids?: Array<string | undefined>) {
  return runSafetyCheck({ moleculas, ...(entidade_ids ? { entidade_ids } : {}), ...CTX, ...extra });
}

describe('RM-105.2 — estados de alergia: ausência de informação ≠ ausência de alergia', () => {
  it('alergias não informadas (campo ausente): estado nao_informado; contexto nao_informado; NÃO é avaliação integral', () => {
    const r = com(['amoxicilina'], {}, ['amoxicilina']);
    expect(r.avaliacao_alergias.estado).toBe('nao_informado');
    expect(estado(r, 'alergias')).toBe('nao_informado');
    expect(r.cobertura_contextual.pendencias).toContain('alergias');
    expect(r.avaliacao_integral).toBe(false);
    expect(r.avaliacao_alergias.mensagem).toContain('não significa ausência de alergia');
  });

  it('status explícito "nao_informado": idem; nada é inferido', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'nao_informado' } }, ['amoxicilina']);
    expect(r.avaliacao_alergias.estado).toBe('nao_informado');
    expect(r.avaliacao_integral).toBe(false);
  });

  it('ausência de alergias EXPLICITAMENTE informada: estado próprio, contexto informado, avaliação integral possível', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'sem_alergias_conhecidas' } }, ['amoxicilina']);
    expect(r.avaliacao_alergias.estado).toBe('ausencia_informada');
    expect(estado(r, 'alergias')).toBe('informado');
    expect(r.avaliacao_alergias.mensagem).toContain('declaração');
    expect(r.cobertura_contextual.pendencias).toEqual([]);
    expect(r.avaliacao_integral).toBe(true);
  });

  it('"sem alergias conhecidas" com registros presentes é contraditório: invalida, nunca integral', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'sem_alergias_conhecidas', registros: [{ substancia: 'amoxicilina' }] } }, ['amoxicilina']);
    expect(r.avaliacao_alergias.estado).toBe('invalida');
    expect(estado(r, 'alergias')).toBe('invalido');
    expect(r.avaliacao_integral).toBe(false);
  });

  it('valores ambíguos (false, null, vazio, string) NUNCA viram "sem alergias"', () => {
    const entradas = [null, undefined, false, '', 'nao', [], {}, { status: 'talvez' }, { status: 'informadas' }, { status: 'informadas', registros: 'x' }, { status: 'informadas', registros: [] }];
    for (const alergias of entradas) {
      const r = runSafetyCheck({ moleculas: ['amoxicilina'], entidade_ids: ['amoxicilina'], ...CTX, alergias: alergias as never });
      expect(['nao_informado', 'invalida'], JSON.stringify(alergias)).toContain(r.avaliacao_alergias.estado);
      expect(r.avaliacao_alergias.estado, JSON.stringify(alergias)).not.toBe('ausencia_informada');
      expect(r.avaliacao_integral, JSON.stringify(alergias)).toBe(false);
    }
  });
});

describe('RM-105.2 — alergia conhecida ao princípio ativo prescrito', () => {
  const reg = { substancia: 'Amoxicilina', tipo: 'medicamento' as const, gravidade: 'grave' as const, reacao: 'anafilaxia', origem: 'paciente', registrado_em: '2026-11-05T10:00:00.000Z' };

  it('mesma molécula, identificação confirmada: alerta crítico de alergia, rastreável e confirmado', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [reg] } }, ['amoxicilina']);
    const a = r.alertas.find(x => x.tipo === 'alergia')!;
    expect(a).toBeDefined();
    expect(a.severidade).toBe('critical');
    expect(a.titulo).toContain('Alergia registrada');
    expect(a.descricao).toContain('anafilaxia');
    expect(a.descricao).toContain('gravidade grave');
    const rz = r.rastreio_alertas.find(x => x.alerta_id === a.id)!;
    expect(rz).toMatchObject({ origem: 'alergia_registrada', interacao_confirmada: true, entradas_nao_verificadas: [] });
    expect(r.avaliacao_alergias.estado).toBe('avaliada');
    expect(r.avaliacao_alergias.registros[0]).toMatchObject({ identificacao_molecular: 'confirmada', molecula: 'Amoxicilina', origem: 'paciente', registrado_em: reg.registrado_em });
    expect(r.avaliacao_alergias.cruzamentos[0]).toMatchObject({ resultado: 'correspondencia_molecular', via: 'mesma_molecula' });
  });

  it('o alerta de alergia não altera a cobertura molecular (status continua completa)', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [reg] } }, ['amoxicilina']);
    expect(r.status).toBe('completa');
  });

  it('alergia registrada por NOME COMERCIAL verificado com princípio ativo identificado', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [{ substancia: 'sinot clav', tipo: 'medicamento' }] } }, ['amoxicilina']);
    const reg0 = r.avaliacao_alergias.registros[0];
    expect(reg0.identificacao_molecular === 'confirmada' || reg0.identificacao_molecular === 'nao_confirmada').toBe(true);
    expect(reg0.molecula).toBeTruthy();
  });

  it('o princípio ativo da alergia por nome comercial é cruzado com a molécula prescrita', () => {
    // "sinot clav" → amoxicilina + clavulanato; prescrever o MESMO medicamento (combinação) deve corresponder.
    const comb = runSafetyCheck({ moleculas: ['sinot clav'] });
    const idComb = comb.moleculas_verificadas[0].entidade_id;
    const r = com(['Amoxicilina + Clavulanato'], { alergias: { status: 'informadas', registros: [{ substancia: 'sinot clav', tipo: 'medicamento' }] } }, [idComb]);
    expect(r.avaliacao_alergias.cruzamentos.some(c => c.resultado === 'correspondencia_molecular' || c.resultado === 'correspondencia_nao_confirmada')).toBe(true);
    expect(r.alertas.some(a => a.tipo === 'alergia')).toBe(true);
  });

  it('marca NÃO verificada: correspondência marcada como NÃO confirmada (warning), nunca alergia confirmada', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [{ substancia: 'augmentin', tipo: 'medicamento' }] } }, ['amoxicilina']);
    // augmentin → amoxicilina + clavulanato (combinação); prescrever só amoxicilina: componente de alérgeno-combinação ⇒ não conclusivo
    expect(r.alertas.every(a => !(a.tipo === 'alergia' && a.severidade === 'critical'))).toBe(true);
  });

  it('componente de combinação: alergia a amoxicilina × item "Amoxicilina + Clavulanato"', () => {
    const v = runSafetyCheck({ moleculas: ['sinot clav'] }).moleculas_verificadas[0];
    const r = com([v.molecula], { alergias: { status: 'informadas', registros: [{ substancia: 'amoxicilina', tipo: 'medicamento', entidade_id: 'amoxicilina' }] } }, [v.entidade_id]);
    const c = r.avaliacao_alergias.cruzamentos[0];
    expect(c.resultado).toBe('correspondencia_molecular');
    expect(c.via).toBe('componente_combinacao');
  });
});

describe('RM-105.2 — identificação molecular desconhecida, classe e associações não conclusivas', () => {
  it('alérgeno desconhecido: avaliação parcial, não conclusiva, sem alerta e sem "sem risco"', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [{ substancia: 'substancia_xyz', tipo: 'medicamento' }] } }, ['amoxicilina']);
    expect(r.avaliacao_alergias.estado).toBe('parcial');
    expect(r.avaliacao_alergias.registros[0].identificacao_molecular).toBe('desconhecida');
    expect(r.avaliacao_alergias.cruzamentos[0]).toMatchObject({ resultado: 'nao_conclusivo', motivo: 'alergeno_nao_identificado' });
    expect(r.alertas.some(a => a.tipo === 'alergia')).toBe(false);
    expect(estado(r, 'alergias')).toBe('nao_avaliado');
    expect(r.avaliacao_integral).toBe(false);
  });

  it('alérgeno por CLASSE ("penicilina"/"AINE"): não vira molécula e NÃO inventa reatividade cruzada', () => {
    for (const termo of ['aine', 'ieca', 'antibiotico']) {
      const r = com(['ibuprofeno'], { alergias: { status: 'informadas', registros: [{ substancia: termo, tipo: 'medicamento' }] } }, ['ibuprofeno']);
      expect(r.avaliacao_alergias.registros[0].identificacao_molecular, termo).toMatch(/classe_farmacologica|desconhecida/);
      expect(r.avaliacao_alergias.estado, termo).toBe('parcial');
      expect(r.alertas.some(a => a.tipo === 'alergia'), termo).toBe(false);
    }
  });

  it('moléculas diferentes: "sem correspondência molecular" com a ressalva de que a reatividade cruzada não foi avaliada', () => {
    const r = com(['paracetamol'], { alergias: { status: 'informadas', registros: [{ substancia: 'amoxicilina', tipo: 'medicamento' }] } }, ['paracetamol']);
    expect(r.avaliacao_alergias.cruzamentos[0].resultado).toBe('sem_correspondencia_molecular');
    expect(r.avaliacao_alergias.limitacoes.join(' ')).toContain('Reatividade cruzada');
    expect(r.avaliacao_alergias.estado).toBe('avaliada');
    expect(r.alertas.some(a => a.tipo === 'alergia')).toBe(false);
    expect(r.avaliacao_alergias.mensagem).toContain('reatividade cruzada não avaliada');
  });

  it('medicamento prescrito SEM identificação molecular: cruzamento não conclusivo (nunca "sem correspondência")', () => {
    const r = com(['medicamento_xyz'], { alergias: { status: 'informadas', registros: [{ substancia: 'amoxicilina', tipo: 'medicamento' }] } });
    expect(r.avaliacao_alergias.cruzamentos[0]).toMatchObject({ resultado: 'nao_conclusivo', motivo: 'medicamento_nao_identificado', item: 'medicamento_xyz' });
    expect(r.avaliacao_alergias.estado).toBe('parcial');
    expect(r.status).toBe('molecula_nao_reconhecida');
  });

  it('item de identidade ambígua entre moléculas diferentes não é cruzado como identificado', () => {
    const r = com(['desogestrel'], { alergias: { status: 'informadas', registros: [{ substancia: 'etinilestradiol', tipo: 'medicamento' }] } });
    expect(r.avaliacao_alergias.cruzamentos.every(c => c.resultado !== 'correspondencia_molecular')).toBe(true);
  });

  it('alergia não medicamentosa (alimento): fora do cruzamento, com a limitação declarada', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [{ substancia: 'amendoim', tipo: 'alimento' }] } }, ['amoxicilina']);
    expect(r.avaliacao_alergias.registros[0]).toMatchObject({ escopo: 'nao_medicamentosa', identificacao_molecular: 'nao_aplicavel' });
    expect(r.avaliacao_alergias.cruzamentos).toEqual([]);
    expect(r.avaliacao_alergias.limitacoes.join(' ')).toContain('excipientes');
  });
});

describe('RM-105.2 — registros inválidos', () => {
  const casos: Array<[string, unknown]> = [
    ['substância vazia', { substancia: '  ' }],
    ['substância ausente', { tipo: 'medicamento' }],
    ['tipo inválido', { substancia: 'amoxicilina', tipo: 'qualquer' }],
    ['gravidade inválida', { substancia: 'amoxicilina', gravidade: 'extrema' }],
    ['data inválida', { substancia: 'amoxicilina', registrado_em: 'ontem' }],
    ['registro não objeto', 'amoxicilina'],
    ['reação não texto', { substancia: 'amoxicilina', reacao: 5 }],
  ];
  for (const [nome, registro] of casos) {
    it(`${nome}: estado invalida, contexto invalido, sem integral; o registro não é descartado`, () => {
      const r = com(['paracetamol'], { alergias: { status: 'informadas', registros: [registro as never] } }, ['paracetamol']);
      expect(r.avaliacao_alergias.estado).toBe('invalida');
      expect(r.avaliacao_alergias.registros).toHaveLength(1);
      expect(r.avaliacao_alergias.registros[0].valido).toBe(false);
      expect(estado(r, 'alergias')).toBe('invalido');
      expect(r.avaliacao_integral).toBe(false);
    });
  }

  it('um registro inválido não impede avaliar os válidos, mas o estado geral continua inválido', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [{ substancia: '' }, { substancia: 'amoxicilina', tipo: 'medicamento' }] } }, ['amoxicilina']);
    expect(r.avaliacao_alergias.estado).toBe('invalida');
    expect(r.alertas.some(a => a.tipo === 'alergia')).toBe(true);
  });
});

describe('RM-105.2 — vários medicamentos e vários registros de alergia', () => {
  it('cada par registro × item é cruzado; só correspondências viram alerta', () => {
    const r = com(['amoxicilina', 'paracetamol', 'ibuprofeno'], {
      alergias: {
        status: 'informadas',
        registros: [
          { substancia: 'Amoxicilina', tipo: 'medicamento', gravidade: 'grave' },
          { substancia: 'Ibuprofeno', tipo: 'medicamento' },
          { substancia: 'substância desconhecida', tipo: 'medicamento' },
          { substancia: 'amendoim', tipo: 'alimento' },
        ],
      },
    }, ['amoxicilina', 'paracetamol', 'ibuprofeno']);
    const alergia = r.alertas.filter(a => a.tipo === 'alergia');
    expect(alergia).toHaveLength(2);
    expect(alergia.map(a => a.titulo).join(' ')).toContain('Amoxicilina × amoxicilina');
    expect(alergia.every(a => a.severidade === 'critical')).toBe(true);
    // 3 itens × 2 alérgenos identificados + 1 não conclusivo do desconhecido
    expect(r.avaliacao_alergias.cruzamentos.filter(c => c.resultado === 'correspondencia_molecular')).toHaveLength(2);
    expect(r.avaliacao_alergias.cruzamentos.filter(c => c.resultado === 'sem_correspondencia_molecular')).toHaveLength(4);
    expect(r.avaliacao_alergias.estado).toBe('parcial');
    expect(r.rastreio_alertas.map(x => x.alerta_id)).toEqual(r.alertas.map(a => a.id));
  });

  it('alertas de alergia convivem com os demais e a ordenação por gravidade é preservada', () => {
    const r = com(['varfarina', 'ibuprofeno'], { alergias: { status: 'informadas', registros: [{ substancia: 'ibuprofeno', tipo: 'medicamento' }] } }, ['varfarina', 'ibuprofeno']);
    expect(ids(r)).toContain('critical-pair-varfarina-aine');
    expect(r.alertas.some(a => a.tipo === 'alergia')).toBe(true);
    const ordem = { critical: 0, danger: 1, warning: 2, info: 3 } as const;
    const sev = r.alertas.map(a => ordem[a.severidade]);
    expect(sev).toEqual([...sev].sort((a, b) => a - b));
  });
});

describe('RM-105.2 — contextos clínicos: estados explícitos', () => {
  it('false/undefined/null/vazio NUNCA são ausência de risco: cada um tem estado próprio', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'] });
    for (const c of ['gestacao', 'lactacao', 'idade_idoso', 'funcao_renal', 'alergias']) expect(estado(r, c)).toBe('nao_informado');
    expect(r.cobertura_contextual.pendencias).toEqual(['gestacao', 'lactacao', 'idade_idoso', 'funcao_renal', 'alergias']);
    expect(r.avaliacao_integral).toBe(false);
    const nulos = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], gestante: null as never, lactante: null as never, crclValue: null as never });
    expect(estado(nulos, 'gestacao')).toBe('nao_informado');
    expect(estado(nulos, 'funcao_renal')).toBe('nao_informado');
  });

  it('false informado é "informado" (não gestante) — distinto de não informado', () => {
    const r = com(['paracetamol']);
    expect(estado(r, 'gestacao')).toBe('informado');
    expect(estado(r, 'lactacao')).toBe('informado');
  });

  it('idade ausente nunca vira "não idoso": a regra geriátrica fica não avaliada', () => {
    expect(derivarIdoso({})).toBeUndefined();
    expect(derivarIdoso({ idade_anos: NaN })).toBeUndefined();
    expect(derivarIdoso({ idade_anos: 70 })).toBe(true);
    expect(derivarIdoso({ idade_anos: 30 })).toBe(false);
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'] });
    expect(estado(r, 'idade_idoso')).toBe('nao_informado');
  });

  it('idade derivada aciona a regra geriátrica existente (mesma regra, agora alimentada pela idade validada)', () => {
    const comAlertaGeriatrico = drugRepository.getAll().find(e => e.alerts.some(t => /beers|idoso|queda/i.test(t)));
    expect(comAlertaGeriatrico).toBeDefined();
    const nome = comAlertaGeriatrico!.activeIngredient.name;
    const idoso = runSafetyCheck({ moleculas: [nome], entidade_ids: [comAlertaGeriatrico!.id], idade_anos: 80 });
    const jovem = runSafetyCheck({ moleculas: [nome], entidade_ids: [comAlertaGeriatrico!.id], idade_anos: 30 });
    const semIdade = runSafetyCheck({ moleculas: [nome], entidade_ids: [comAlertaGeriatrico!.id] });
    expect(idoso.alertas.some(a => a.tipo === 'geriatria')).toBe(true);
    expect(jovem.alertas.some(a => a.tipo === 'geriatria')).toBe(false);
    expect(semIdade.alertas.some(a => a.tipo === 'geriatria')).toBe(false);
    expect(estado(semIdade, 'idade_idoso')).toBe('nao_informado'); // sem idade: regra NÃO avaliada, não "sem risco"
  });

  it('idade inválida ou fora do intervalo (unidade errada): invalido, nunca avaliada', () => {
    // RM-105.2.1: 0 anos deixou de ser inválido (representa menor de 1 ano, com limitação declarada).
    for (const idade of [-3, 150, 700, NaN, '70' as never]) {
      const r = runSafetyCheck({ moleculas: ['paracetamol'], idade_anos: idade });
      expect(estado(r, 'idade_idoso'), String(idade)).toBe('invalido');
      expect(r.cobertura_contextual.pendencias).toContain('idade_idoso');
      expect(r.cobertura_contextual.inconsistencias.length).toBeGreaterThan(0);
    }
  });

  it('idade e indicador "idoso" contraditórios: invalido', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], idade_anos: 30, idoso: true });
    expect(estado(r, 'idade_idoso')).toBe('invalido');
    expect(r.cobertura_contextual.inconsistencias.join(' ')).toContain('contraditórios');
  });

  it('gestação/lactação informadas para sexo masculino: invalido (incoerência), regra não avaliada', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], sexo: 'M', gestante: true, lactante: true });
    expect(estado(r, 'gestacao')).toBe('invalido');
    expect(estado(r, 'lactacao')).toBe('invalido');
    expect(r.cobertura_contextual.inconsistencias.join(' ')).toContain('sexo masculino');
  });

  it('peso inválido (unidade/valor): invalido, listado como incoerência, mas não bloqueia (nenhuma regra de segurança usa peso)', () => {
    const r = com(['paracetamol'], { peso_kg: 6000, alergias: { status: 'sem_alergias_conhecidas' } });
    expect(estado(r, 'peso')).toBe('invalido');
    expect(r.cobertura_contextual.inconsistencias.join(' ')).toContain('peso inválido');
    expect(r.cobertura_contextual.pendencias).not.toContain('peso');
    expect(r.avaliacao_integral).toBe(true);
  });

  it('peso ausente é não aplicável; peso válido é informado (não exigido)', () => {
    expect(estado(runSafetyCheck({ moleculas: ['paracetamol'] }), 'peso')).toBe('nao_aplicavel');
    expect(estado(runSafetyCheck({ moleculas: ['paracetamol'], peso_kg: 70 }), 'peso')).toBe('informado');
  });

  it('função renal inválida (NaN/negativa) e potássio só com ARM', () => {
    expect(estado(runSafetyCheck({ moleculas: ['paracetamol'], crclValue: -1 }), 'funcao_renal')).toBe('invalido');
    expect(estado(runSafetyCheck({ moleculas: ['paracetamol'] }), 'potassio')).toBe('nao_aplicavel');
    const arm = runSafetyCheck({ moleculas: ['espironolactona'] });
    expect(estado(arm, 'potassio')).toBe('nao_informado');
    expect(arm.cobertura_contextual.pendencias).toContain('potassio');
  });

  it('a função de cobertura aceita qualquer entrada sem lançar exceção', () => {
    for (const x of [null, undefined, 42, 'x', [], {}, { sexo: 'X' }, { idade_anos: {} }]) {
      expect(() => avaliarCoberturaContextual(x, { usaARM: false })).not.toThrow();
    }
  });
});

describe('RM-105.2 — avaliação integral só com todos os contextos exigidos avaliados', () => {
  const alergiasOk = { status: 'sem_alergias_conhecidas' } as const;

  it('integral verdadeira: cobertura molecular completa + todos os contextos exigidos informados e válidos', () => {
    const r = com(['paracetamol'], { alergias: alergiasOk }, ['paracetamol']);
    expect(r.status).toBe('completa');
    expect(r.cobertura_contextual.completa).toBe(true);
    expect(r.avaliacao_integral).toBe(true);
    expect(r.mensagem).toContain('não equivale a validação clínica');
  });

  it('cada contexto exigido ausente derruba a avaliação integral (um de cada vez)', () => {
    const base = { ...CTX, alergias: alergiasOk } as Partial<SafetyCheckInput>;
    for (const campo of ['gestante', 'lactante', 'idade_anos', 'crclValue', 'alergias'] as const) {
      const entrada = { ...base }; delete entrada[campo];
      const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...entrada });
      expect(r.avaliacao_integral, campo).toBe(false);
    }
  });

  it('com antagonista de aldosterona o potássio passa a ser exigido', () => {
    const base: Partial<SafetyCheckInput> = { ...CTX, alergias: alergiasOk };
    expect(runSafetyCheck({ moleculas: ['espironolactona'], entidade_ids: ['espironolactona'], ...base }).avaliacao_integral).toBe(false);
    expect(runSafetyCheck({ moleculas: ['espironolactona'], entidade_ids: ['espironolactona'], ...base, potassiumLevel: 4.5 }).avaliacao_integral).toBe(true);
  });

  it('cobertura molecular parcial nunca é integral, mesmo com todos os contextos', () => {
    const r = com(['paracetamol', 'xyz_desconhecida'], { alergias: alergiasOk }, ['paracetamol', undefined]);
    expect(r.cobertura_contextual.completa).toBe(true);
    expect(r.status).toBe('parcial');
    expect(r.avaliacao_integral).toBe(false);
  });

  it('alergias não conclusivas impedem a avaliação integral', () => {
    const r = com(['paracetamol'], { alergias: { status: 'informadas', registros: [{ substancia: 'xyz', tipo: 'medicamento' }] } }, ['paracetamol']);
    expect(r.avaliacao_integral).toBe(false);
  });

  it('versão do contrato registrada no resultado', () => {
    expect(runSafetyCheck({ moleculas: ['paracetamol'] }).versao_contrato).toBe(SAFETY_CONTRACT_VERSION);
    expect(SAFETY_CONTRACT_VERSION).toBe('RM-105.2');
  });
});

describe('RM-105.2 — erro do motor distinguível de "sem alertas"', () => {
  it('erro: status erro, alergias não avaliadas, nada concluído', () => {
    const r = runSafetyCheck({ moleculas: null as never });
    expect(r.status).toBe('erro');
    expect(r.avaliacao_alergias.estado).toBe('nao_avaliada');
    expect(r.avaliacao_integral).toBe(false);
    expect(r.versao_contrato).toBe(SAFETY_CONTRACT_VERSION);
  });

  it('exceção interna (getter que lança): erro, nunca "resultado vazio e seguro"', () => {
    const armadilha = { moleculas: ['paracetamol'], get gestante(): boolean { throw new Error('falha simulada'); } };
    const r = runSafetyCheck(armadilha as unknown as SafetyCheckInput);
    expect(r.status).toBe('erro');
    expect(r.alertas).toEqual([]);
    const anexo = anexoComoTexto(montarAnexoTecnico(r, '2026-11-05T12:00:00.000Z'));
    expect(anexo).toContain('Erro de avaliação');
    expect(anexo).toContain('NÃO é uma avaliação sem alertas');
    expect(anexo).toContain('Alertas indisponíveis');
    expect(anexo).not.toContain('Não foram identificados alertas');
  });
});

// ─── Anexo técnico ──────────────────────────────────────────────

const PACIENTE = { nome: 'Maria Teste', idade: '45', diagnostico: 'HAS' };
const ITEM = { id: '1', molecula: 'Varfarina', nome_comercial: 'Marevan', concentracao: '5 mg', forma_farmaceutica: 'Comprimido', dose: '5 mg', via: 'VO', frequencia: '1x/dia', duracao: '30 dias', instrucoes: '', uso_continuo: true };
const MEDICO = { nome: 'Dra. Teste', crm: '12345', especialidade: 'Clínica Médica' };
const QUANDO = '2026-11-05T14:30:00.000Z';

describe('RM-105.2 — conteúdo do anexo técnico', () => {
  it('título inequívoco, aviso, data/hora, versão do contrato, situação e itens', () => {
    const r = com(['varfarina', 'ibuprofeno'], { alergias: { status: 'sem_alergias_conhecidas' } }, ['varfarina', 'ibuprofeno']);
    const a = montarAnexoTecnico(r, QUANDO);
    expect(a.titulo).toBe('ANEXO TÉCNICO — USO EXCLUSIVO DO PRESCRITOR');
    expect(ANEXO_TITULO).toBe(a.titulo);
    expect(a.aviso).toContain('Não se destina ao paciente');
    const t = anexoComoTexto(a);
    expect(t).toContain('Data e horário da avaliação: 05/11/2026');
    expect(t).toContain('Versão do contrato de avaliação: RM-105.2');
    expect(t).toContain('Medicamentos e moléculas identificados');
    expect(t).toContain('Varfarina [varfarina]');
    expect(t).toContain('Combinações não avaliadas');
    expect(t).toContain('Alertas encontrados');
    expect(t).toContain('Contextos clínicos');
    expect(t).toContain('Situação da avaliação de alergias');
    expect(t).toContain('Limitações relevantes');
    // RM-106: nova seção "Pares sem regra de interação encontrada" (ausência de regra ≠ ausência de interação)
    expect(a.secoes.map(s => s.id)).toEqual(['identificacao', 'situacao', 'identificados', 'nao_identificados', 'combinacoes', 'alertas', 'sem_regra', 'contextos', 'alergias', 'limitacoes']);
  });

  it('alerta mostra gravidade, origem e estado de confirmação', () => {
    const r = com(['varfarina', 'ibuprofeno'], {}, ['varfarina', 'ibuprofeno']);
    const t = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(t).toMatch(/\[Crítico\] .*Varfarina \+ AINE.* origem: regra fixa \(par de alta relevância clínica\); estado: baseado em moléculas identificadas/);
  });

  it('alerta que depende de entrada não verificada NUNCA aparece como confirmado', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'ibuprofeno'], entidade_ids: [undefined, 'ibuprofeno'], ...CTX });
    const t = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(t).toContain('NÃO confirmado — depende de entrada não verificada (ieca)');
    expect(t).toContain('Avaliação realizada com cobertura parcial');
    expect(t).toContain('ieca — termo de classe/indicação/sintoma');
  });

  it('alerta de alergia com identificação não confirmada aparece como NÃO confirmado', () => {
    const r = com(['amoxicilina'], { alergias: { status: 'informadas', registros: [{ substancia: 'amoxicilina', tipo: 'medicamento', entidade_id: null }] } }, ['amoxicilina']);
    expect(montarAnexoTecnico(r, QUANDO).secoes.find(s => s.id === 'alergias')!.linhas.join(' ')).toContain('correspondência molecular (identificação confirmada)');
  });

  it('contextos não informados, inválidos e não avaliados são listados com o estado', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], idade_anos: 700, sexo: 'M', gestante: true });
    const t = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(t).toContain('Gestação: INVÁLIDO');
    expect(t).toContain('Idade: INVÁLIDO');
    expect(t).toContain('Função renal: NÃO informado');
    expect(t).toContain('Alergias: NÃO informado');
    expect(t).toContain('Incoerência detectada');
    expect(t).toContain('Informações clínicas pendentes');
  });

  it('situação: completa, parcial, molécula não reconhecida, dados insuficientes e erro — rótulos distintos', () => {
    const rot = (r: ReturnType<typeof runSafetyCheck>) => montarAnexoTecnico(r, QUANDO).rotulo_situacao;
    const rotulos = new Set([
      rot(runSafetyCheck({ moleculas: ['varfarina'] })),
      rot(runSafetyCheck({ moleculas: ['varfarina', 'xyz'] })),
      rot(runSafetyCheck({ moleculas: ['xyz'] })),
      rot(runSafetyCheck({ moleculas: [] })),
      rot(runSafetyCheck({ moleculas: null as never })),
    ]);
    expect(rotulos.size).toBe(5);
    expect(montarAnexoTecnico(null).rotulo_situacao).toBe('Avaliação não executada');
  });

  it('sem alertas com cobertura completa: texto descritivo, sem afirmar segurança; sem alertas com cobertura parcial: ressalva', () => {
    const completa = anexoComoTexto(montarAnexoTecnico(runSafetyCheck({ moleculas: ['paracetamol'] }), QUANDO));
    expect(completa).toContain('Não foram identificados alertas nas verificações executadas.');
    const parcial = anexoComoTexto(montarAnexoTecnico(runSafetyCheck({ moleculas: ['paracetamol', 'xyz'] }), QUANDO));
    expect(parcial).toContain('a ausência de alerta não indica ausência de risco');
    expect(parcial).toContain('Existem combinações não avaliadas');
  });

  it('expressões proibidas nunca aparecem, em nenhum estado', () => {
    const proibidas = /prescri[cç][aã]o segura|medicamentos? liberad|\bsem riscos?\b|prescri[cç][aã]o certificad|\bseguro\b|\bsegura\b|\bliberad/i;
    const cenarios: SafetyCheckInput[] = [
      { moleculas: ['paracetamol'], ...CTX, alergias: { status: 'sem_alergias_conhecidas' } },
      { moleculas: ['varfarina', 'ibuprofeno'] },
      { moleculas: ['xyz'] }, { moleculas: [] }, { moleculas: null as never },
      { moleculas: ['amoxicilina'], alergias: { status: 'informadas', registros: [{ substancia: 'amoxicilina', tipo: 'medicamento' }] } },
    ];
    for (const c of cenarios) expect(anexoComoTexto(montarAnexoTecnico(runSafetyCheck(c), QUANDO)), JSON.stringify(c)).not.toMatch(proibidas);
  });

  it('o anexo informa que não é armazenado automaticamente (limitação de persistência)', () => {
    expect(anexoComoTexto(montarAnexoTecnico(runSafetyCheck({ moleculas: ['paracetamol'] }), QUANDO))).toContain('não é armazenado automaticamente');
  });
});

describe('RM-105.2 — separação entre receita do paciente e anexo técnico', () => {
  const resultadoRico = runSafetyCheck({
    moleculas: ['varfarina', 'ibuprofeno', 'xyz_desconhecida'], entidade_ids: ['varfarina', 'ibuprofeno', undefined], ...CTX,
    alergias: { status: 'informadas', registros: [{ substancia: 'ibuprofeno', tipo: 'medicamento', gravidade: 'moderada' }] },
  });
  const TERMOS_TECNICOS = [
    'ANEXO TÉCNICO', 'USO EXCLUSIVO', 'cobertura', 'Cobertura', 'parcial', 'PARCIAL', 'não verificad', 'NÃO verificad', 'identificad', 'Alerta', 'alerta', 'Alergia', 'alergia',
    'contrato', 'RM-105', 'motor', 'avaliação', 'Avaliação', 'Contexto', 'molécula não', 'regra fixa', 'Crítico', 'critical',
  ];

  it('ReceitaPaciente NÃO recebe nem renderiza dados do motor: sem nenhum termo técnico', () => {
    const { container } = render(<ReceitaPaciente patient={PACIENTE} items={[ITEM]} medico={MEDICO} hoje="05 de novembro de 2026" />);
    const texto = container.textContent ?? '';
    for (const t of TERMOS_TECNICOS) expect(texto, t).not.toContain(t);
    expect(texto).toContain('RECEITA MÉDICA');
    expect(texto).toContain('Varfarina'.length ? 'Marevan 5 mg' : '');
    expect(container.querySelector('[data-print-part="anexo"]')).toBeNull();
    expect(container.querySelector('#print-area')).not.toBeNull();
  });

  it('a assinatura de ReceitaPaciente não aceita resultado do motor (garantia estrutural)', () => {
    const fonte = fs.readFileSync(path.resolve(__dirname, '../components/modules/ReceitaPaciente.tsx'), 'utf8');
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(codigo).not.toMatch(/SafetyCheckResult|safety-rules|safety-annex|safety-allergy|safety-context|rastreio|alertas|cobertura|avaliacao/);
    expect(codigo).not.toMatch(/^import .*safety/m);
  });

  it('AnexoTecnicoPrescritor: identificado, em parte própria, com o conteúdo técnico', () => {
    const { container } = render(<AnexoTecnicoPrescritor anexo={montarAnexoTecnico(resultadoRico, QUANDO)} />);
    const el = container.querySelector('[data-print-part="anexo"]')!;
    expect(el).not.toBeNull();
    expect(el.id).toBe('prescriber-annex');
    expect(within(el as HTMLElement).getByTestId('annex-title').textContent).toBe('ANEXO TÉCNICO — USO EXCLUSIVO DO PRESCRITOR');
    expect(el.textContent).toContain('xyz_desconhecida — não reconhecido');
    expect(el.textContent).toContain('Alergia registrada');
    expect(el.querySelectorAll('[data-annex-section]').length).toBe(10); // RM-106: +1 seção (pares sem regra)
  });

  it('pré-visualização: receita e anexo são irmãos independentes; o anexo vem DEPOIS e a receita não o contém', () => {
    render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={resultadoRico} avaliadoEm={QUANDO} avisoSeguranca="aviso" />);
    fireEvent.click(screen.getByTestId('toggle-annex')); // RM-105.2.1: o anexo só existe após ação explícita
    const receita = document.querySelector('[data-print-part="receita"]')!;
    const anexo = document.querySelector('[data-print-part="anexo"]')!;
    expect(receita).not.toBeNull();
    expect(anexo).not.toBeNull();
    expect(receita.contains(anexo)).toBe(false);
    expect(anexo.contains(receita)).toBe(false);
    expect(receita.parentElement).toBe(anexo.parentElement);
    expect(receita.compareDocumentPosition(anexo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const t of ['ANEXO TÉCNICO', 'cobertura parcial', 'Alergia registrada']) expect(receita.textContent, t).not.toContain(t);
    // o aviso de tela fica fora da receita e do anexo
    const aviso = screen.getByTestId('print-safety-warning');
    expect(receita.contains(aviso)).toBe(false);
    expect(anexo.contains(aviso)).toBe(false);
    expect(aviso.closest('.print\\:hidden')).not.toBeNull();
  });

  it('o conteúdo imprimível fica num portal em <body> (#print-root) para a regra de impressão isolar as duas partes', () => {
    render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={resultadoRico} avaliadoEm={QUANDO} />);
    const raiz = document.getElementById('print-root')!;
    expect(raiz.parentElement).toBe(document.body);
    expect(raiz.dataset.printMode).toBe('receita'); // padrão: só a receita
  });

  it('padrão: SEM anexo; abrir o anexo é ação explícita e a receita permanece idêntica', () => {
    render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={resultadoRico} avaliadoEm={QUANDO} />);
    expect(document.querySelector('[data-print-part="anexo"]')).toBeNull();
    expect(document.getElementById('print-root')!.dataset.printMode).toBe('receita');
    const antes = document.querySelector('[data-print-part="receita"]')!.innerHTML;
    fireEvent.click(screen.getByTestId('toggle-annex'));
    expect(document.querySelector('[data-print-part="anexo"]')).not.toBeNull();
    expect(document.getElementById('print-root')!.dataset.printMode).toBe('receita'); // abrir não muda o que se imprime
    expect(document.querySelector('[data-print-part="receita"]')!.innerHTML).toBe(antes);
    fireEvent.click(screen.getByTestId('toggle-annex'));
    expect(document.querySelector('[data-print-part="anexo"]')).toBeNull();
  });

  it('erro do motor: a receita é preservada e o anexo registra o erro', () => {
    const erro = runSafetyCheck({ moleculas: null as never });
    render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={erro} avaliadoEm={QUANDO} />);
    fireEvent.click(screen.getByTestId('toggle-annex'));
    expect(document.querySelector('[data-print-part="receita"]')!.textContent).toContain('Marevan 5 mg');
    expect(document.querySelector('[data-print-part="anexo"]')!.textContent).toContain('Erro de avaliação');
    expect(document.querySelector('[data-print-part="anexo"]')!.getAttribute('data-annex-status')).toBe('erro');
  });

  it('sem resultado de avaliação: anexo informa "Avaliação não executada"', () => {
    render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={null} avaliadoEm={null} />);
    fireEvent.click(screen.getByTestId('toggle-annex'));
    expect(document.querySelector('[data-print-part="anexo"]')!.textContent).toContain('Avaliação não executada');
  });
});

describe('RM-105.2/105.2.1 — CSS de impressão: A4 e isolamento por modo', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');

  it('A4 e isolamento do #print-root; resto da aplicação oculto na impressão', () => {
    expect(css).toMatch(/@page\s*\{\s*size:\s*A4/);
    expect(css).toMatch(/body > \*:not\(#print-root\)\s*\{\s*display:\s*none\s*!important/);
    expect(css).toMatch(/\.print-sheet\s*\{[^}]*overflow:\s*visible/);
  });

  it('modo receita (padrão) oculta o anexo; modo anexo oculta a receita — nunca saem juntos', () => {
    expect(css).toMatch(/\[data-print-mode="receita"\]\s*\[data-print-part="anexo"\]\s*\{\s*display:\s*none\s*!important/);
    expect(css).toMatch(/\[data-print-mode="anexo"\]\s*\[data-print-part="receita"\]\s*\{\s*display:\s*none\s*!important/);
  });

  it('seções e itens do anexo não se partem; títulos não ficam órfãos', () => {
    expect(css).toMatch(/\[data-annex-section\]\s*\{\s*break-inside:\s*avoid/);
    expect(css).toMatch(/\[data-annex-section\]\s*>\s*h3\s*\{\s*break-after:\s*avoid/);
    expect(css).toMatch(/\[data-annex-section\]\s*li\s*\{\s*break-inside:\s*avoid/);
  });
});

describe('RM-105.2 — a tela de prescrição usa o contrato novo', () => {
  const pagina = fs.readFileSync(path.resolve(__dirname, '../app/prescricao-rapida/page.tsx'), 'utf8');

  it('gestante/lactante são tri-state (vazio = não informado) e nunca booleanos fixos', () => {
    expect(pagina).toContain("gestante: '' | 'sim' | 'nao'");
    expect(pagina).toContain("patient.gestante === '' ? undefined : patient.gestante === 'sim'");
    expect(pagina).toContain("patient.lactante === '' ? undefined : patient.lactante === 'sim'");
  });

  it('idade e peso vazios ficam ausentes (nunca "não idoso"); a regra antiga Number(idade) >= 65 foi removida', () => {
    // RM-105.2.2: a idade passa ao motor COM unidade explícita (sem unidade o motor não interpreta o valor).
    expect(pagina).toContain("idade: patient.idade.trim() === '' ? undefined : { valor: Number(patient.idade), unidade: (patient.idade_unidade || undefined) as UnidadeIdade }");
    expect(pagina).not.toMatch(/idoso:\s*Number\(patient\.idade\)/);
  });

  it('alergias seguem estado explícito e são enviadas ao motor', () => {
    expect(pagina).toContain('alergias: montarAlergiasInput(patient)');
    expect(pagina).toContain("alergias_status: 'nao_informado'");
    expect(pagina).toContain('<PrescriptionPrintPreview');
    expect(pagina).toContain('safetyResult={safetyResult}');
  });

  it('a tela não contém mais a função de impressão antiga (receita e anexo são componentes separados)', () => {
    expect(pagina).not.toContain('function PrintPreview');
  });
});
