// ============================================================
// RM-105 — Identidade farmacológica, sinônimos e completude da verificação.
// Classe terapêutica, indicação e sintoma não identificam molécula; variantes e combinações têm
// identidade rastreável; regras fixas têm origem e escopo documentados; cobertura molecular não
// é avaliação clínica integral; nenhum alerta existente é removido em silêncio.
// Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { runSafetyCheck } from '@/lib/safety-rules';
import { categoriaNaoMolecular, normalizarTermo, sinonimoValidado, ESTATISTICAS_GOVERNANCA } from '@/lib/synonym-governance';
import { avaliarCoberturaContextual } from '@/lib/safety-context';
import { describeSafetyCoverage } from '@/lib/safety-coverage';
import { SafetyCoverageNotice } from '@/components/modules/SafetyCoverageNotice';
import { drugRepository } from '@/lib/pharma-core/repository';
import { getAllDrugs } from '@/lib/pharma-database';

const estado = (r: ReturnType<typeof runSafetyCheck>, campo: string) => r.cobertura_contextual.itens.find(i => i.campo === campo)!.estado;

describe('RM-105 — classe terapêutica não é identificada como molécula', () => {
  it.each(['ieca', 'isrs', 'aine', 'estatina', 'nitrato', 'betabloqueador', 'antibiotico'])('"%s" é termo de classe: não verificado, nunca uma molécula', (termo) => {
    const r = runSafetyCheck({ moleculas: [termo, 'varfarina'] });
    expect(r.moleculas_verificadas.map(v => v.entrada)).toEqual(['varfarina']);
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: termo, motivo: 'termo_nao_molecular', categoria_termo: 'classe_terapeutica' }]);
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
    expect(r.mensagem).toContain('termo de classe/indicação/sintoma');
  });

  it('o termo continua cadastrado como sinônimo (nenhum dado foi apagado); só deixa de identificar', () => {
    const enalapril = drugRepository.getAll().find(e => e.id === 'enalapril')!;
    expect((enalapril.activeIngredient.sinonimos ?? []).map(s => s.toLowerCase())).toContain('ieca');
    expect(categoriaNaoMolecular('ieca')).toBe('classe_terapeutica');
  });

  it('o nome de uma molécula nunca é bloqueado por estar em classe: "enalapril" e "sertralina" seguem reconhecidos', () => {
    for (const n of ['enalapril', 'sertralina', 'varfarina']) {
      expect(runSafetyCheck({ moleculas: [n] }).status).toBe('completa');
    }
  });
});

describe('RM-105 — indicação e sintoma não identificam molécula', () => {
  it.each([['diabetes', 'indicacao_clinica'], ['enxaqueca', 'indicacao_clinica'], ['gastrite', 'indicacao_clinica'], ['febre', 'sintoma'], ['vertigem', 'sintoma'], ['diarreia', 'sintoma']] as const)('"%s" → %s', (termo, cat) => {
    const r = runSafetyCheck({ moleculas: [termo] });
    expect(r.status).toBe('molecula_nao_reconhecida');
    expect(r.moleculas_nao_verificadas[0]).toEqual({ entrada: termo, motivo: 'termo_nao_molecular', categoria_termo: cat });
    expect(r.moleculas_verificadas).toEqual([]);
  });

  it('um alerta nunca é emitido a partir de uma indicação tomada como medicamento', () => {
    const a = runSafetyCheck({ moleculas: ['febre', 'varfarina'] });
    const b = runSafetyCheck({ moleculas: ['varfarina'] });
    expect(a.alertas).toEqual(b.alertas); // "febre" não virou paracetamol (antes gerava inter-paracetamol-varfarina)
  });
});

describe('RM-105 — sinônimo farmacológico inequívoco e nome comercial', () => {
  it('DCI/USAN alternativo documentado: "losartan" → losartana, sinônimo validado, identidade confirmada', () => {
    const r = runSafetyCheck({ moleculas: ['losartan', 'varfarina'] });
    const v = r.moleculas_verificadas[0];
    expect(v).toMatchObject({ entrada: 'losartan', id: 'losartana', via: 'sinonimo', identificacao: 'sinonimo_validado', identidade_confirmada: true });
    expect(sinonimoValidado('losartana', 'losartan')).toBe(true);
    expect(r.status).toBe('completa');
  });

  it('sigla inequívoca: "aas" é validada para o próprio princípio ativo', () => {
    const v = runSafetyCheck({ moleculas: ['aas'] }).moleculas_verificadas[0];
    expect(v.identidade_confirmada).toBe(true);
  });

  it('nome comercial NÃO verificado ("augmentin"): reconhecido, mas a identidade fica marcada como não confirmada e a mensagem diz isso', () => {
    const r = runSafetyCheck({ moleculas: ['augmentin', 'varfarina'] });
    expect(r.moleculas_verificadas[0]).toMatchObject({ entrada: 'augmentin', identificacao: 'nome_comercial_nao_verificado', identidade_confirmada: false });
    expect(r.status).toBe('completa');
    expect(r.mensagem).toContain('Identidade não confirmada');
    expect(r.mensagem).toContain('augmentin');
  });

  it('nome comercial verificado ("sinot clav"): identidade confirmada', () => {
    const v = runSafetyCheck({ moleculas: ['sinot clav'] }).moleculas_verificadas[0];
    expect(v).toMatchObject({ identificacao: 'nome_comercial_verificado', identidade_confirmada: true });
  });

  it('sinônimo cadastrado sem validação não é promovido a confirmado', () => {
    const r = runSafetyCheck({ moleculas: ['renitec'] });
    expect(r.moleculas_verificadas).toHaveLength(1);
    expect(r.moleculas_verificadas[0].identificacao).toBe('sinonimo_nao_validado');
    expect(r.moleculas_verificadas[0].identidade_confirmada).toBe(false);
  });

  it('nome ativo: identificação por nome', () => {
    expect(runSafetyCheck({ moleculas: ['varfarina'] }).moleculas_verificadas[0]).toMatchObject({ identificacao: 'nome_ativo', identidade_confirmada: true });
  });
});

describe('RM-105 — combinação farmacológica × monofármaco', () => {
  it('combinação mantém identidade própria (composicao = combinacao) e monofármaco segue monofármaco', () => {
    expect(runSafetyCheck({ moleculas: ['Amoxicilina + Clavulanato'] }).moleculas_verificadas[0].composicao).toBe('combinacao');
    expect(runSafetyCheck({ moleculas: ['losartana'] }).moleculas_verificadas[0].composicao).toBe('monofarmaco');
  });

  it('combinação não é fundida com seus componentes: "desogestrel" casa com a combinação por sinônimo, fica ambíguo e parcial', () => {
    const r = runSafetyCheck({ moleculas: ['desogestrel'] });
    const v = r.moleculas_verificadas[0];
    expect(v.composicao).toBe('combinacao');
    expect(v.ambigua).toBe(true);
    expect(v.candidatos.length).toBeGreaterThan(1);
    expect(r.status).toBe('parcial');
  });
});

describe('RM-105 — variante de contexto (mesma molécula, entidades distintas)', () => {
  it('"midazolam" (RM-105.1): sem ID a primeira entrada NÃO é confirmada (parcial); com ID a escolhida prevalece e as variantes ficam listadas', () => {
    const semId = runSafetyCheck({ moleculas: ['midazolam'] });
    expect(semId.moleculas_verificadas[0].ambigua).toBe(true);
    expect(semId.moleculas_verificadas[0].variantes_mesma_molecula).toEqual(expect.arrayContaining(['midazolam-uti', 'midazolam-paliativo']));
    expect(semId.status).toBe('parcial');
    const comId = runSafetyCheck({ moleculas: ['midazolam'], entidade_ids: ['midazolam-uti'] });
    expect(comId.moleculas_verificadas[0].id).toBe('midazolam-uti');
    expect(comId.moleculas_verificadas[0].variantes_mesma_molecula).toEqual(expect.arrayContaining(['midazolam', 'midazolam-paliativo']));
    expect(comId.status).toBe('completa');
  });

  it('"fentanil": a entidade resolvida e o contexto ficam rastreáveis', () => {
    const v = runSafetyCheck({ moleculas: ['fentanil'] }).moleculas_verificadas[0];
    expect(v.id).toBe('fentanil-uti');
    expect(v.variantes_mesma_molecula).toContain('fentanil-transdermico');
  });

  it('molécula sem variantes: lista vazia', () => {
    expect(runSafetyCheck({ moleculas: ['varfarina'] }).moleculas_verificadas[0].variantes_mesma_molecula).toEqual([]);
  });
});

describe('RM-105 — regras fixas: origem, escopo e entradas avaliadas', () => {
  it('par fixo com entradas desconhecidas: alerta emitido, rastreado como texto bruto, e a cobertura NÃO vira completa', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'aine'] });
    expect(r.alertas.length).toBeGreaterThan(0);
    const rastro = r.rastreio_alertas.find(x => x.alerta_id === 'critical-pair-ieca-aine')!;
    expect(rastro).toMatchObject({ origem: 'regra_fixa_par', texto_bruto: true, envolve_entrada_nao_verificada: true, interacao_confirmada: false, entradas_nao_verificadas: expect.arrayContaining(['aine', 'ieca']) });
    expect(rastro.entradas_avaliadas.sort()).toEqual(['aine', 'ieca']);
    expect(r.verificacao_completa).toBe(false);
    expect(r.status).not.toBe('completa');
  });

  it('alerta da base cadastrada: origem base_cadastrada, entradas efetivamente avaliadas, sem texto bruto', () => {
    const r = runSafetyCheck({ moleculas: ['varfarina', 'ibuprofeno', 'paracetamol'] });
    const inter = r.rastreio_alertas.filter(x => x.origem === 'base_cadastrada' && x.alerta_id.startsWith('inter-'));
    expect(inter.length).toBeGreaterThan(0);
    for (const x of inter) { expect(x.texto_bruto).toBe(false); expect(x.envolve_entrada_nao_verificada).toBe(false); }
    expect(r.rastreio_alertas.some(x => x.entradas_avaliadas.includes('varfarina'))).toBe(true);
  });

  it('ARM e montelucaste: regras fixas com as entradas que as acionaram (RM-105.1: por entidade resolvida, não por texto bruto)', () => {
    const arm = runSafetyCheck({ moleculas: ['espironolactona'] }).rastreio_alertas.find(x => x.alerta_id === 'arm-k-nao-informado')!;
    expect(arm).toMatchObject({ origem: 'regra_fixa_arm', texto_bruto: false, interacao_confirmada: true, entradas_avaliadas: ['espironolactona'] });
    const mont = runSafetyCheck({ moleculas: ['montelucaste'] }).rastreio_alertas.find(x => x.alerta_id === 'montelucaste-saude-mental')!;
    expect(mont).toMatchObject({ origem: 'regra_fixa_montelucaste', texto_bruto: false, interacao_confirmada: true });
  });

  it('há um rastreio para cada alerta, na mesma ordem', () => {
    const r = runSafetyCheck({ moleculas: ['sertralina', 'tramadol', 'varfarina', 'ieca'] });
    expect(r.rastreio_alertas.map(x => x.alerta_id)).toEqual(r.alertas.map(a => a.id));
  });

  it('RM-105.1: fragmentos sem sentido (a, b) NÃO geram mais alerta — a substring nos dois sentidos foi eliminada (achado da RM-105)', () => {
    const r = runSafetyCheck({ moleculas: ['a', 'b'] });
    expect(r.alertas).toEqual([]);
    expect(r.rastreio_alertas).toEqual([]);
    expect(r.verificacao_completa).toBe(false);
    expect(r.status).toBe('molecula_nao_reconhecida');
  });
});

describe('RM-105 — contexto clínico ausente: cobertura contextual independente', () => {
  const r = runSafetyCheck({ moleculas: ['paracetamol'] });

  it('dados não informados têm estado próprio e a regra dependente fica não avaliada', () => {
    for (const c of ['gestacao', 'lactacao', 'idade_idoso', 'funcao_renal']) expect(estado(r, c)).toBe('nao_informado');
    expect(estado(r, 'potassio')).toBe('nao_aplicavel');
    expect(estado(r, 'alergias')).toBe('nao_informado'); // RM-105.2: ausência de informação de alergias = nao_informado (antes: nao_avaliado, sem regra)
    expect(estado(r, 'peso')).toBe('nao_aplicavel');
  });

  it('cobertura molecular completa NÃO é avaliação clínica integral', () => {
    expect(r.status).toBe('completa');
    expect(r.verificacao_completa).toBe(true);
    expect(r.cobertura_contextual.completa).toBe(false);
    expect(r.avaliacao_integral).toBe(false);
    expect(r.mensagem).toContain('NÃO equivale a avaliação clínica integral');
    expect(r.mensagem).toContain('alergias');
  });

  it('o potássio só é exigido com antagonista de aldosterona', () => {
    expect(estado(runSafetyCheck({ moleculas: ['espironolactona'] }), 'potassio')).toBe('nao_informado');
    expect(estado(runSafetyCheck({ moleculas: ['espironolactona'], potassiumLevel: 4.2 }), 'potassio')).toBe('informado');
  });

  it('mesmo com todo o contexto informado, a avaliação não é integral enquanto alergias não forem avaliadas', () => {
    const t = runSafetyCheck({ moleculas: ['paracetamol'], gestante: false, lactante: false, idoso: false, crclValue: 80 });
    for (const c of ['gestacao', 'lactacao', 'idade_idoso', 'funcao_renal']) expect(estado(t, c)).toBe('informado');
    expect(t.cobertura_contextual.pendencias).toEqual(['alergias']);
    expect(t.avaliacao_integral).toBe(false);
  });
});

describe('RM-105 — dados clínicos inválidos', () => {
  it.each([[NaN], [-5], ['80'], [Infinity]])('crclValue=%s é inválido (a regra renal não foi avaliada), sem lançar exceção', (v) => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], crclValue: v as unknown as number });
    expect(estado(r, 'funcao_renal')).toBe('invalido');
    expect(r.cobertura_contextual.pendencias).toContain('funcao_renal');
  });

  it('booleanos com tipo errado são inválidos', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], gestante: 'sim' as unknown as boolean, lactante: 1 as unknown as boolean });
    expect(estado(r, 'gestacao')).toBe('invalido');
    expect(estado(r, 'lactacao')).toBe('invalido');
  });

  it('potássio inválido com antagonista de aldosterona', () => {
    expect(estado(runSafetyCheck({ moleculas: ['espironolactona'], potassiumLevel: -1 }), 'potassio')).toBe('invalido');
    expect(estado(runSafetyCheck({ moleculas: ['espironolactona'], potassiumLevel: NaN }), 'potassio')).toBe('invalido');
  });

  it('o contrato aceita qualquer entrada sem lançar exceção', () => {
    for (const x of [null, undefined, 42, 'texto', [], {}]) {
      expect(() => avaliarCoberturaContextual(x, { usaARM: false })).not.toThrow();
    }
  });

  it('erro de execução: todo o contexto fica não avaliado', () => {
    const r = runSafetyCheck({ moleculas: null as unknown as string[] });
    expect(r.status).toBe('erro');
    expect(r.cobertura_contextual.itens.every(i => i.estado === 'nao_avaliado')).toBe(true);
    expect(r.avaliacao_integral).toBe(false);
  });
});

describe('RM-105 — preservação dos alertas anteriores (baseline do estado RM-104)', () => {
  const baseline = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/rm105-baseline-rm104.json'), 'utf8')) as Record<string, string[]>;
  // Diferenças documentadas: todas ocorrem em entradas que contêm classe/indicação/sintoma, que antes eram
  // tomados como uma molécula (ex.: "febre" → paracetamol). Cada uma está explicada no relatório da RM-105.
  const DOCUMENTADAS: Record<string, { removidos: string[]; adicionados: string[] }> = {
    'ieca||enalapril': { removidos: ['dup-IECA'], adicionados: [] },
    'bra||enalapril': { removidos: ['inter-olmesartana-enalapril'], adicionados: [] },
    'isrs||varfarina': { removidos: ['inter-sertralina-varfarina'], adicionados: [] },
    'isrs||tramadol': { removidos: ['critical-pair-sertralina-tramadol'], adicionados: ['critical-pair-isrs-tramadol'] },
    'isrs||sertralina': { removidos: ['dup-ISRS — Inibidor Seletivo da Recaptação de Serotonina'], adicionados: [] },
    'antibiotico||varfarina': { removidos: ['inter-amoxicilina-varfarina'], adicionados: [] },
    'analgesico||varfarina': { removidos: ['inter-paracetamol-varfarina'], adicionados: [] },
    'febre||varfarina': { removidos: ['inter-paracetamol-varfarina'], adicionados: [] },
    'ansiedade||tramadol': { removidos: ['critical-pair-escitalopram-tramadol'], adicionados: [] },
    'antidepressivo||varfarina': { removidos: ['inter-sertralina-varfarina'], adicionados: [] },
    'antidepressivo||tramadol': { removidos: ['critical-pair-sertralina-tramadol'], adicionados: [] },
    'antidepressivo||sertralina': { removidos: ['dup-ISRS — Inibidor Seletivo da Recaptação de Serotonina'], adicionados: [] },
  };

  it('o baseline cobre as 382 moléculas, 25 pares reais e os termos de classe/indicação com 5 parceiros', () => {
    expect(Object.keys(baseline).length).toBe(539);
  });

  it('nenhum caso SEM termo de classe/indicação/sintoma mudou (única exceção da RM-105.1: Celecoxibe isolado, falso positivo BRA+AINE)', () => {
    // RM-105.1: Celecoxibe disparava BRA + AINE sozinho porque a marca Celebra contém o fragmento bra.
    const DOC_1051: Record<string, string[]> = { Celecoxibe: ['critical-pair-bra-aine'] };
    // RM-106: diferenças DOCUMENTADAS em relação ao baseline (a base passou a reconhecer classes/grupos de forma explícita):
    //  - deduplicação: a regra genérica "ISRS + Tramadol"/"IECA + Espironolactona" não duplica a interação específica já cadastrada;
    //  - base de nível de classe substituída pela regra fixa mais grave ("IECA + BRA", critical > danger);
    //  - gravidade divergente entre as duas direções cadastradas: vale a mais grave (lítio+ibuprofeno e atorvastatina+claritromicina: warning → danger);
    //  - novo: benzodiazepínico + opioide por CLASSE (midazolam + fentanil), antes sem nenhum alerta.
    const DOC_106: Record<string, { removidos: string[]; adicionados: string[] }> = {
      'fluoxetina||tramadol': { removidos: ['critical-pair-isrs-tramadol'], adicionados: [] },
      'enalapril||losartana': { removidos: ['inter-enalapril-losartana'], adicionados: [] },
      'enalapril||espironolactona': { removidos: ['critical-pair-ieca-espironolactona'], adicionados: [] },
      'espironolactona||enalapril': { removidos: ['critical-pair-ieca-espironolactona'], adicionados: [] },
      'atorvastatina||claritromicina': { removidos: ['inter-atorvastatina-claritromicina'], adicionados: ['inter-claritromicina-atorvastatina'] },
      'litio||ibuprofeno': { removidos: ['inter-ibuprofeno-litio'], adicionados: ['inter-litio-ibuprofeno'] },
      'midazolam||fentanil': { removidos: [], adicionados: ['inter-midazolam-fentanil-uti'] },
    };
    const aplicar106 = (k: string, ids: string[]): string[] => { const d = DOC_106[k]; return d ? [...ids.filter(x => !d.removidos.includes(x)), ...d.adicionados].sort() : ids; };
    for (const [k, ids] of Object.entries(baseline)) {
      const entradas = k.split('||');
      if (entradas.some(e => categoriaNaoMolecular(e))) continue;
      const esperado = aplicar106(k, ids.filter(x => !(DOC_1051[k] ?? []).includes(x)));
      const atual = runSafetyCheck({ moleculas: entradas }).alertas.map(a => a.id).sort();
      expect(atual, k).toEqual(esperado);
    }
  });

  it('nos casos com termo de classe/indicação, as únicas diferenças são as documentadas — e todas visíveis no resultado', () => {
    const encontradas: string[] = [];
    for (const [k, ids] of Object.entries(baseline)) {
      const entradas = k.split('||');
      const termos = entradas.filter(e => categoriaNaoMolecular(e));
      if (!termos.length) continue;
      const r = runSafetyCheck({ moleculas: entradas });
      const atual = r.alertas.map(a => a.id).sort();
      const removidos = ids.filter(x => !atual.includes(x)); const adicionados = atual.filter(x => !ids.includes(x));
      if (removidos.length || adicionados.length) {
        encontradas.push(k);
        expect(DOCUMENTADAS[k], 'diferença não documentada: ' + k).toEqual({ removidos, adicionados });
        // não é silencioso: o termo aparece como não verificado, com a categoria, no próprio resultado
        for (const t of termos) expect(r.moleculas_nao_verificadas.some(n => n.entrada === t && n.motivo === 'termo_nao_molecular')).toBe(true);
        expect(r.verificacao_completa).toBe(false);
      }
    }
    expect(encontradas.sort()).toEqual(Object.keys(DOCUMENTADAS).sort());
  });
});

describe('RM-105 — coerência entre status, mensagem e cobertura', () => {
  const entradas: string[][] = [
    ...getAllDrugs().slice(0, 60).map(d => [d.molecula]),
    ['varfarina', 'ibuprofeno'], ['xyz_desconhecida', 'varfarina'], ['desconhecida_a', 'desconhecida_b'], [''], [], ['ieca', 'aine'], ['febre'], ['desogestrel'],
    ['augmentin', 'varfarina'], ['sertralina', 'tramadol', 'varfarina', 'xyz'], ['a', 'b'], ['  ', 'varfarina'], ['espironolactona', 'ieca'],
  ];

  it('invariantes valem para todo resultado', () => {
    for (const moleculas of entradas) {
      const r = runSafetyCheck({ moleculas });
      const rotulo = JSON.stringify(moleculas);
      expect(r.verificacao_completa, rotulo).toBe(r.status === 'completa');
      expect(r.avaliacao_integral && !r.verificacao_completa, rotulo).toBe(false);
      expect(r.rastreio_alertas.map(x => x.alerta_id), rotulo).toEqual(r.alertas.map(a => a.id));
      const naoConfirmaveis = r.moleculas_nao_verificadas.length > 0 || r.moleculas_verificadas.some(v => v.ambigua);
      if (r.status === 'completa') {
        expect(naoConfirmaveis, rotulo).toBe(false);
        expect(r.mensagem, rotulo).toMatch(/^Verificação concluída/);
      } else {
        expect(r.mensagem, rotulo).not.toMatch(/^Verificação concluída/);
      }
      if (r.status === 'parcial') { expect(r.mensagem, rotulo).toContain('PARCIAL'); expect(naoConfirmaveis, rotulo).toBe(true); }
      if (r.status === 'molecula_nao_reconhecida') { expect(r.mensagem, rotulo).toContain('NÃO indica segurança'); expect(r.moleculas_verificadas, rotulo).toEqual([]); }
      if (r.status === 'dados_insuficientes') expect(r.mensagem, rotulo).toContain('Nada foi verificado');
      for (const n of r.moleculas_nao_verificadas) if (n.motivo !== 'entrada_vazia') expect(r.mensagem, rotulo).toContain(n.entrada);
    }
  });

  it('a interface espelha o resultado: nunca mostra selo negativo fora da verificação completa', () => {
    for (const moleculas of entradas) {
      const r = runSafetyCheck({ moleculas });
      const v = describeSafetyCoverage(r, Math.max(1, moleculas.length));
      if (v.mostrarSeloNegativo) expect(r.status === 'completa' && r.alertas.length === 0, JSON.stringify(moleculas)).toBe(true);
    }
  });
});

describe('RM-105 — governança de sinônimos: integridade dos dados', () => {
  it('nenhum termo bloqueado coincide com nome ativo, nome completo ou marca verificada de qualquer entidade', () => {
    for (const e of drugRepository.getAll()) {
      expect(categoriaNaoMolecular(e.activeIngredient.name), e.id).toBeNull();
      if (e.activeIngredient.fullName) expect(categoriaNaoMolecular(e.activeIngredient.fullName), e.id).toBeNull();
      for (const b of e.brands ?? []) if (b.verified) expect(categoriaNaoMolecular(b.name), b.name).toBeNull();
    }
  });

  it('382 moléculas reconhecidas; com ID todas completas; sem ID só as de identidade não confirmada ficam parciais (RM-105.1)', () => {
    expect(getAllDrugs().every(d => runSafetyCheck({ moleculas: [d.molecula] }).moleculas_verificadas.length === 1)).toBe(true);
    expect(getAllDrugs().every(d => runSafetyCheck({ moleculas: [d.molecula], entidade_ids: [d.id] }).status === 'completa')).toBe(true);
    const naoCompletas = getAllDrugs().map(d => ({ d, r: runSafetyCheck({ moleculas: [d.molecula] }) })).filter(x => x.r.status !== 'completa');
    expect(naoCompletas.every(x => x.r.moleculas_verificadas[0].ambigua && x.r.moleculas_verificadas[0].entidades_candidatas.length > 1)).toBe(true);
    expect(naoCompletas.map(x => x.d.id)).toEqual(expect.arrayContaining(['bicarbonato-sodio-pcr', 'desogestrel-75mcg']));
  });

  it('a normalização é a mesma da auditoria e o inventário está registrado', () => {
    expect(normalizarTermo('Ácido Acetilsalicílico®')).toBe('acido acetilsalicilico');
    expect(ESTATISTICAS_GOVERNANCA.termos_nao_moleculares).toBeGreaterThan(500);
    expect(ESTATISTICAS_GOVERNANCA.sinonimos_validados).toBeGreaterThan(300);
  });
});

describe('RM-105 — interface: identidade e contexto na verificação completa', () => {
  it('verificação completa sem alertas: selo com ressalvas de identidade não confirmada e de contexto não avaliado', () => {
    // RM-105.2.1: o selo só aparece com alergias avaliadas (aqui: ausência de alergias informada); sem isso não há selo.
    expect(describeSafetyCoverage(runSafetyCheck({ moleculas: ['augmentin'] }), 1).mostrarSeloNegativo).toBe(false);
    const r = runSafetyCheck({ moleculas: ['augmentin'], alergias: { status: 'sem_alergias_conhecidas' } });
    const v = describeSafetyCoverage(r, 1);
    expect(v.mostrarSeloNegativo).toBe(true);
    const texto = v.detalhes.join(' ');
    expect(texto).toContain('não garante segurança');
    expect(texto).toContain('Identidade não confirmada');
    expect(texto).toContain('Contexto não avaliado');
    expect(texto).toContain('gestação');
  });

  it('o componente exibe as mesmas ressalvas', () => {
    const { container, unmount } = render(<SafetyCoverageNotice result={runSafetyCheck({ moleculas: ['paracetamol'] })} itensNaReceita={1} />);
    expect(container.textContent).toContain('Nenhum alerta nas regras cadastradas');
    expect(container.textContent).toContain('Cobertura molecular completa não é avaliação clínica integral');
    unmount();
    void screen;
  });
});
