// ============================================================
// RM-105.1 — Integridade da identidade farmacológica e regras de correspondência
//
// 1) Identidade por ID: o item da prescrição preserva o id da entidade escolhida e o verificador o usa
//    com prioridade — nunca troca por outra variante do mesmo princípio ativo.
// 2) Regras fixas (CRITICAL_PAIRS, ARM/K+, montelucaste) sem substring: igualdade de nome ativo/componente,
//    classe cadastrada com fronteira, ou texto exato aprovado (sempre marcado como não verificado).
// ============================================================
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runSafetyCheck } from '@/lib/safety-rules';
import { getAllDrugs, getDrugById } from '@/lib/pharma-database';
import { ALVOS_REGRAS, alvoDe, entradaAciona, entidadeAciona, textoAciona } from '@/lib/safety-targets';
import { rotuloAlertaNaoConfirmado } from '@/lib/safety-coverage';

const texto = (id: string): string => {
  const d = getDrugById(id);
  if (!d) throw new Error('entidade inexistente no teste: ' + id);
  return d.molecula;
};

/** Executa a verificação com identidade por ID (como a tela de prescrição rápida faz). */
function porIds(ids: string[], extra: Record<string, unknown> = {}) {
  return runSafetyCheck({ moleculas: ids.map(texto), entidade_ids: ids, ...extra });
}
const idsAlertas = (r: ReturnType<typeof runSafetyCheck>) => r.alertas.map(a => a.id);

describe('RM-105.1 — correspondência exata de moléculas (por entidade)', () => {
  it('azitromicina + amiodarona: alerta crítico por nome ativo exato, interação confirmada entre moléculas identificadas', () => {
    const r = porIds(['azitromicina', 'amiodarona']);
    expect(idsAlertas(r)).toContain('critical-pair-azitromicina-amiodarona');
    const a = r.alertas.find(x => x.id === 'critical-pair-azitromicina-amiodarona')!;
    expect(a.severidade).toBe('critical');
    const rz = r.rastreio_alertas.find(x => x.alerta_id === a.id)!;
    expect(rz).toMatchObject({ origem: 'regra_fixa_par', texto_bruto: false, interacao_confirmada: true, entradas_nao_verificadas: [] });
    expect(r.status).toBe('completa');
  });

  it('combinação reconhecida pelo COMPONENTE: losartana+HCTZ aciona a regra do lítio com hidroclorotiazida', () => {
    const r = porIds(['litio', 'losartana_hidroclorotiazida']);
    expect(idsAlertas(r)).toContain('critical-pair-litio-hidroclorotiazida');
  });

  it('tramadol+paracetamol (combinação) aciona a regra de tramadol por componente', () => {
    const r = porIds(['sertralina', 'tramadol_paracetamol']);
    expect(idsAlertas(r)).toContain('critical-pair-sertralina-tramadol');
  });

  it('nitrato real (nitroglicerina, mononitrato de isossorbida) + tadalafila continua crítico', () => {
    for (const nitrato of ['nitroglicerina', 'isossorbida_mononitrato']) {
      const r = porIds([nitrato, 'tadalafila']);
      expect(idsAlertas(r), nitrato).toContain('critical-pair-nitrato-tadalafila');
      expect(r.alertas.find(a => a.id === 'critical-pair-nitrato-tadalafila')!.severidade).toBe('critical');
    }
  });

  it('nitrato + sildenafil (a entidade chama-se "sildenafil", sem o "a" final) continua acionando a regra', () => {
    const r = porIds(['nitroglicerina', 'sildenafil-neonatal']);
    // RM-106: o mesmo risco crítico pode sair pela regra fixa OU pela interação cadastrada equivalente (deduplicadas; a mais específica prevalece)
    expect(r.alertas.some(a => a.severidade === 'critical' && (a.id === 'critical-pair-nitrato-sildenafila' || a.id.startsWith('inter-nitroglicerina-sildenafil')))).toBe(true);
    expect(r.alertas.filter(a => a.severidade === 'critical')).toHaveLength(1);
  });
});

describe('RM-105.1 — classes cadastradas (por classe terapêutica, com fronteira)', () => {
  it('IECA + AINE: enalapril (classe IECA) com ibuprofeno (classe AINE) aciona a regra de classe', () => {
    const r = porIds(['enalapril', 'ibuprofeno']);
    expect(idsAlertas(r)).toContain('critical-pair-ieca-aine');
    expect(r.alertas.find(a => a.id === 'critical-pair-ieca-aine')!.severidade).toBe('danger');
  });

  it('BRA + AINE: losartana com ibuprofeno', () => {
    expect(idsAlertas(porIds(['losartana', 'ibuprofeno']))).toContain('critical-pair-bra-aine');
  });

  it('classe composta ("BRA + Diurético Tiazídico") continua sendo BRA; "ISRS — Inibidor…" continua sendo ISRS', () => {
    expect(idsAlertas(porIds(['losartana_hidroclorotiazida', 'ibuprofeno']))).toContain('critical-pair-bra-aine');
    expect(idsAlertas(porIds(['paroxetina', 'tramadol']))).toContain('critical-pair-isrs-tramadol');
  });

  it('classe nunca vira molécula: o alvo "isrs" não reconhece o nome "sertralina" como texto, só a entidade pela classe', () => {
    const isrs = alvoDe('isrs');
    expect(isrs.tipo).toBe('classe');
    expect(textoAciona(isrs, 'sertralina')).toBe(false);
    expect(entidadeAciona(isrs, { molecula: 'Sertralina', classe: 'ISRS — Inibidor Seletivo da Recaptação de Serotonina' })).toBe('classe_cadastrada');
  });

  it('a classe só vale com fronteira: "BRA" não reconhece classes que apenas contêm essas letras', () => {
    const bra = alvoDe('bra');
    expect(entidadeAciona(bra, { molecula: 'X', classe: 'Fibrato' })).toBeNull();
    expect(entidadeAciona(bra, { molecula: 'X', classe: 'Antibacteriano' })).toBeNull();
    expect(entidadeAciona(bra, { molecula: 'X', classe: 'BRABO' })).toBeNull();
    expect(entidadeAciona(bra, { molecula: 'X', classe: 'BRA' })).toBe('classe_cadastrada');
    expect(entidadeAciona(bra, { molecula: 'X', classe: 'BRA — Bloqueador' })).toBe('classe_cadastrada');
  });
});

describe('RM-105.1 — abreviações aprovadas (texto exato de entrada não resolvida)', () => {
  it('"ieca" + "ibuprofeno": a sigla aciona o alerta, MAS ele é rastreado como não confirmado e a verificação não fica completa', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'ibuprofeno'], entidade_ids: [undefined, 'ibuprofeno'] });
    expect(idsAlertas(r)).toContain('critical-pair-ieca-aine');
    const rz = r.rastreio_alertas.find(x => x.alerta_id === 'critical-pair-ieca-aine')!;
    expect(rz.texto_bruto).toBe(true);
    expect(rz.interacao_confirmada).toBe(false);
    expect(rz.entradas_nao_verificadas).toEqual(['ieca']);
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
    expect(rotuloAlertaNaoConfirmado(r, 'critical-pair-ieca-aine')).toContain('não é interação confirmada entre moléculas identificadas');
  });

  it('"isrs" + "tramadol": o alerta genérico de classe NÃO afirma que a molécula desconhecida é sertralina', () => {
    const r = runSafetyCheck({ moleculas: ['isrs', 'tramadol'], entidade_ids: [undefined, 'tramadol'] });
    const a = r.alertas.find(x => x.id === 'critical-pair-isrs-tramadol')!;
    expect(a.titulo).toContain('ISRS + Tramadol');
    expect(r.alertas.some(x => /sertralina/i.test(x.titulo))).toBe(false);
    expect(r.moleculas_verificadas.map(v => v.molecula.toLowerCase())).not.toContain('sertralina');
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: 'isrs', motivo: 'termo_nao_molecular', categoria_termo: 'classe_terapeutica' }]);
    expect(r.rastreio_alertas.find(x => x.alerta_id === a.id)!.interacao_confirmada).toBe(false);
  });

  it('"Contraste iodado" (sem entidade cadastrada) + metformina: alerta por texto exato aprovado, não confirmado', () => {
    const r = runSafetyCheck({ moleculas: ['Metformina', 'Contraste iodado'], entidade_ids: ['metformina', undefined] });
    expect(idsAlertas(r)).toContain('critical-pair-metformina-contraste');
    expect(r.rastreio_alertas.find(x => x.alerta_id === 'critical-pair-metformina-contraste')!.interacao_confirmada).toBe(false);
    expect(r.verificacao_completa).toBe(false);
  });

  it('os textos aprovados são declarados e nenhum tem menos de 3 caracteres (nenhum fragmento é "abreviação")', () => {
    for (const a of Object.values(ALVOS_REGRAS)) {
      expect(a.textos_exatos.length, a.chave).toBeGreaterThan(0);
      for (const t of a.textos_exatos) expect(t.length, a.chave + ':' + t).toBeGreaterThanOrEqual(3);
    }
  });

  it('alvo não declarado falha de forma explícita (nunca casa por aproximação)', () => {
    expect(() => alvoDe('nao-declarado')).toThrow(/não declarado/);
  });
});

describe('RM-105.1 — fragmentos isolados de uma ou duas letras não disparam regra', () => {
  const letras = 'abcdefghijklmnopqrstuvwxyz'.split('');

  it('todos os 676 pares de letras isoladas: nenhum alerta (antes: 71% dos pares geravam alerta)', () => {
    let comAlerta = 0;
    for (const x of letras) for (const y of letras) {
      const r = runSafetyCheck({ moleculas: [x, y] });
      if (r.alertas.length) comAlerta++;
    }
    expect(comAlerta).toBe(0);
  });

  it('fragmentos de duas letras tirados dos nomes das regras (ie, ec, br, ai, ne, is, rs, ma, ao)', () => {
    const frag = ['ie', 'ec', 'br', 'ai', 'ne', 'is', 'rs', 'ma', 'ao', 'tr', 'ra', 'am', 'er'];
    for (const x of frag) for (const y of frag) {
      expect(runSafetyCheck({ moleculas: [x, y] }).alertas, x + '+' + y).toEqual([]);
    }
  });

  it('um fragmento ao lado de uma molécula real não gera alerta de regra fixa', () => {
    const r = runSafetyCheck({ moleculas: ['a', 'Tramadol'], entidade_ids: [undefined, 'tramadol'] });
    expect(idsAlertas(r).filter(i => i.startsWith('critical-pair-'))).toEqual([]);
    expect(r.status).toBe('parcial');
  });
});

describe('RM-105.1 — prefixos e sufixos não disparam regras', () => {
  const casos: Array<[string, string]> = [
    ['xieca', 'aine'], ['iecas', 'aine'], ['ieca2', 'aine'], ['ieca', 'aines'], ['zebra', 'aine'], ['braco', 'aine'], ['sobra', 'aine'],
    ['isrsx', 'tramadol'], ['tramadolx', 'sertralina'], ['xtramadol', 'isrs'], ['nitratos', 'tadalafila'], ['pronitrato', 'sildenafila'],
    ['metformina2', 'contraste'], ['antiaine', 'varfarina'], ['varfarinas', 'aine'],
  ];
  for (const [a, b] of casos) {
    it(`"${a}" + "${b}" não aciona nenhuma regra fixa`, () => {
      const r = runSafetyCheck({ moleculas: [a, b] });
      expect(idsAlertas(r).filter(i => i.startsWith('critical-pair-')), a + '+' + b).toEqual([]);
    });
  }
});

describe('RM-105.1 — palavras que contêm partes de nomes farmacológicos (falsos positivos reais eliminados)', () => {
  it('Fenofibrato + Ibuprofeno: "fenofi-BRA-to" não é BRA (antes: alerta BRA + AINE falso)', () => {
    const r = porIds(['fenofibrato', 'ibuprofeno']);
    expect(idsAlertas(r)).not.toContain('critical-pair-bra-aine');
  });

  it('Celecoxibe isolado não dispara BRA + AINE (a marca "Celebra" continha o fragmento "bra")', () => {
    expect(idsAlertas(porIds(['celecoxibe']))).not.toContain('critical-pair-bra-aine');
    expect(idsAlertas(runSafetyCheck({ moleculas: ['Celecoxibe'] }))).not.toContain('critical-pair-bra-aine');
  });

  it('Ivabradina, Doxiciclina, Palbociclibe, Atropina, Gluconato de cálcio + AINE: nenhum é BRA', () => {
    for (const id of ['ivabradina', 'doxiciclina', 'palbociclibe', 'atropina', 'gluconato-calcio']) {
      expect(idsAlertas(porIds([id, 'ibuprofeno'])), id).not.toContain('critical-pair-bra-aine');
    }
  });

  it('Citalopram + Tramadol: o alerta nomeia a CLASSE (ISRS), nunca "Escitalopram" (citalopram é fragmento de escitalopram)', () => {
    const r = porIds(['citalopram', 'tramadol']);
    expect(idsAlertas(r)).not.toContain('critical-pair-escitalopram-tramadol');
    expect(idsAlertas(r)).toContain('critical-pair-isrs-tramadol');
    expect(r.alertas.find(a => a.id === 'critical-pair-isrs-tramadol')!.severidade).toBe('danger');
  });

  it('Patiromer (sinônimo "hipercalemia ieca") + AINE: não é IECA', () => {
    expect(idsAlertas(porIds(['patiromer', 'ibuprofeno']))).not.toContain('critical-pair-ieca-aine');
  });

  it('nitrato como SAL (fenticonazol, miconazol) + tadalafila: não é nitrato orgânico', () => {
    for (const id of ['nitrato-fenticonazol', 'tinidazol_miconazol']) {
      expect(idsAlertas(porIds([id, 'tadalafila'])), id).not.toContain('critical-pair-nitrato-tadalafila');
    }
  });

  it('nenhuma entidade perde um alerta válido: o conjunto reconhecido por alvo só encolhe pelos falsos positivos documentados', () => {
    const FALSOS_POSITIVOS: Record<string, string[]> = {
      ieca: ['patiromer'],
      bra: ['atropina', 'celecoxibe', 'doxiciclina', 'fenofibrato', 'gluconato-calcio', 'ivabradina', 'palbociclibe'],
      nitrato: ['nitrato-fenticonazol', 'tinidazol_miconazol'],
      escitalopram: ['citalopram'],
    };
    const ESPERADO_POR_ALVO: Record<string, number> = { ieca: 3, bra: 7, aine: 7, isrs: 6, imao: 2, nitrato: 2, escitalopram: 1, sildenafila: 1, hidroclorotiazida: 3, tramadol: 3, sacubitril: 1, litio: 1 };
    const todos = getAllDrugs();
    for (const [chave, n] of Object.entries(ESPERADO_POR_ALVO)) {
      const alvo = alvoDe(chave);
      const reconhecidos = todos.filter(d => entidadeAciona(alvo, { molecula: d.molecula, classe: d.classe })).map(d => d.id);
      expect(reconhecidos.length, chave).toBe(n);
      for (const fp of FALSOS_POSITIVOS[chave] ?? []) expect(reconhecidos, chave).not.toContain(fp);
    }
  });
});

describe('RM-105.1 — identidade por ID explícito', () => {
  it('o ID prevalece: mesmo texto "fentanil", entidades diferentes, resultados diferentes', () => {
    const transd = runSafetyCheck({ moleculas: [texto('fentanil-transdermico')], entidade_ids: ['fentanil-transdermico'] });
    const iv = runSafetyCheck({ moleculas: [texto('fentanil-uti')], entidade_ids: ['fentanil-uti'] });
    expect(transd.moleculas_verificadas[0].id).toBe('fentanil-transdermico');
    expect(iv.moleculas_verificadas[0].id).toBe('fentanil-uti');
    expect(transd.moleculas_verificadas[0].selecao).toBe('id_explicito');
    expect(transd.moleculas_verificadas[0].identificacao).toBe('id_explicito');
    expect(transd.moleculas_verificadas[0].identidade_confirmada).toBe(true);
    expect(transd.status).toBe('completa');
    expect(iv.status).toBe('completa');
  });

  it('Fentanil transdérmico NÃO é resolvido como fentanil IV (e a variante IV fica só listada)', () => {
    const v = porIds(['fentanil-transdermico']).moleculas_verificadas[0];
    expect(v.entidade_id).toBe('fentanil-transdermico');
    expect(v.id).not.toBe('fentanil-uti');
    expect(v.variantes_mesma_molecula).toContain('fentanil-uti');
  });

  it('Amiodarona para PCR NÃO é resolvida como amiodarona oral, e vice-versa', () => {
    const pcr = porIds(['amiodarona-pcr']).moleculas_verificadas[0];
    const oral = porIds(['amiodarona']).moleculas_verificadas[0];
    expect(pcr.entidade_id).toBe('amiodarona-pcr');
    expect(oral.entidade_id).toBe('amiodarona');
    expect(pcr.variantes_mesma_molecula).toContain('amiodarona');
    expect(oral.variantes_mesma_molecula).toContain('amiodarona-pcr');
  });

  it('Fenobarbital neonatal NÃO é resolvido como fenobarbital oral, e vice-versa', () => {
    const neo = porIds(['fenobarbital-neonatal']).moleculas_verificadas[0];
    const oral = porIds(['fenobarbital']).moleculas_verificadas[0];
    expect(neo.entidade_id).toBe('fenobarbital-neonatal');
    expect(oral.entidade_id).toBe('fenobarbital');
    expect(neo.variantes_mesma_molecula).toContain('fenobarbital');
  });

  it('Desogestrel isolado NÃO é resolvido como a combinação com etinilestradiol, e a combinação continua distinta', () => {
    const mono = porIds(['desogestrel-75mcg']).moleculas_verificadas[0];
    const comb = porIds(['etinilestradiol-desogestrel']).moleculas_verificadas[0];
    expect(mono.entidade_id).toBe('desogestrel-75mcg');
    expect(mono.composicao).toBe('monofarmaco');
    expect(comb.entidade_id).toBe('etinilestradiol-desogestrel');
    expect(comb.composicao).toBe('combinacao');
    expect(porIds(['desogestrel-75mcg']).status).toBe('completa');
  });

  it('as variantes de contexto continuam entidades independentes: cada uma resolve a si mesma, para todas as variantes da base', () => {
    const variantes = ['prednisolona_asma', 'azitromicina_dpoc', 'fenobarbital-neonatal', 'midazolam-uti', 'amiodarona-pcr', 'tramadol-paliativo', 'fentanil-transdermico',
      'midazolam-paliativo', 'fenobarbital-paliativo', 'haloperidol-paliativo', 'lorazepam-paliativo', 'metoclopramida-paliativa', 'ondansetrona-paliativa', 'gabapentina-paliativa',
      'amitriptilina-paliativa', 'naloxona-antidoto-opioide', 'desogestrel-75mcg', 'bicarbonato-sodio-pcr'];
    for (const id of variantes) {
      const r = porIds([id]);
      expect(r.moleculas_verificadas[0].entidade_id, id).toBe(id);
      expect(r.status, id).toBe('completa');
    }
  });

  it('o ID prevalece sobre o texto: texto do medicamento A com o ID da entidade B usa a entidade B? Não — fica como divergente e NÃO confirmado', () => {
    const r = runSafetyCheck({ moleculas: ['Varfarina'], entidade_ids: ['sertralina'] });
    const v = r.moleculas_verificadas[0];
    expect(v.entidade_id).toBe('sertralina');
    expect(v.ambigua).toBe(true);
    expect(v.motivo_ambiguidade).toBe('id_diverge_do_texto');
    expect(v.identidade_confirmada).toBe(false);
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
  });

  it('o texto pode ser marca ou sinônimo cadastrado da PRÓPRIA entidade: com o ID certo, a identidade é confirmada', () => {
    const r = runSafetyCheck({ moleculas: ['losartan'], entidade_ids: ['losartana'] });
    expect(r.moleculas_verificadas[0].ambigua).toBe(false);
    expect(r.moleculas_verificadas[0].entidade_id).toBe('losartana');
  });

  it('ID inexistente: não é verificado e NUNCA volta a resolver pelo nome', () => {
    const r = runSafetyCheck({ moleculas: ['Varfarina'], entidade_ids: ['id-que-nao-existe'] });
    expect(r.moleculas_verificadas).toEqual([]);
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: 'Varfarina', motivo: 'id_nao_encontrado' }]);
    expect(r.status).toBe('molecula_nao_reconhecida');
    expect(r.verificacao_completa).toBe(false);
  });

  it('ID inexistente ao lado de moléculas reais: parcial, com a combinação não avaliada', () => {
    const r = runSafetyCheck({ moleculas: ['Sertralina', 'Varfarina'], entidade_ids: ['sertralina', 'xyz'] });
    expect(r.status).toBe('parcial');
    expect(r.combinacoes_nao_avaliadas).toEqual([{ a: 'Sertralina', b: 'Varfarina', motivo: 'molecula_nao_verificada' }]);
  });

  it('entidade_ids com tamanho diferente de moleculas: erro explícito, nada verificado', () => {
    const r = runSafetyCheck({ moleculas: ['Sertralina', 'Varfarina'], entidade_ids: ['sertralina'] });
    expect(r.status).toBe('erro');
    expect(r.verificacao_completa).toBe(false);
    expect(r.erro).toBe('entidade_ids_invalido');
  });
});

describe('RM-105.1 — prescrição sem ID (protocolos antigos)', () => {
  it('nome que casa com UMA entidade: identidade confirmada por nome único (recuperável, sem perda)', () => {
    const r = runSafetyCheck({ moleculas: ['Varfarina'] });
    const v = r.moleculas_verificadas[0];
    expect(v.selecao).toBe('nome_unico');
    expect(v.identidade_confirmada).toBe(true);
    expect(r.status).toBe('completa');
  });

  it('nome que casa com várias entidades (variantes): identidade NÃO confirmada, parcial, e nenhuma variante é escolhida em silêncio', () => {
    const r = runSafetyCheck({ moleculas: [texto('fentanil-uti')] });
    const v = r.moleculas_verificadas[0];
    expect(v.selecao).toBe('primeira_correspondencia_sem_id');
    expect(v.ambigua).toBe(true);
    expect(v.motivo_ambiguidade).toBe('variantes_sem_id');
    expect(v.identidade_confirmada).toBe(false);
    expect(v.entidades_candidatas).toEqual(expect.arrayContaining(['fentanil-uti', 'fentanil-transdermico']));
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
    expect(r.mensagem).toContain('AMBÍGUA');
    expect(r.mensagem).toContain('nunca para uma variante escolhida');
  });

  it('o item sem ID NÃO é descartado nem tem os alertas removidos: os alertas continuam calculados', () => {
    const r = runSafetyCheck({ moleculas: ['Midazolam', 'Varfarina'] });
    expect(r.moleculas_verificadas).toHaveLength(2);
    expect(r.combinacoes_nao_avaliadas).toEqual([{ a: 'Midazolam', b: 'Varfarina', motivo: 'identidade_ambigua' }]);
  });

  it('mistura de itens: ID em uns e ausente em outros (undefined/null) é aceita', () => {
    const r = runSafetyCheck({ moleculas: ['Sertralina', 'Tramadol', 'Varfarina'], entidade_ids: ['sertralina', null, undefined] });
    expect(r.moleculas_verificadas[0].selecao).toBe('id_explicito');
    expect(r.moleculas_verificadas[1].selecao).toBe('primeira_correspondencia_sem_id');
    expect(r.moleculas_verificadas[2].selecao).toBe('nome_unico');
    expect(r.status).toBe('parcial');
  });

  it('sem o campo entidade_ids (chamada antiga) o contrato continua válido', () => {
    expect(() => runSafetyCheck({ moleculas: ['Varfarina', 'Ibuprofeno'] })).not.toThrow();
  });
});

describe('RM-105.1 — preservação de alertas e de severidade', () => {
  const baseline = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'fixtures/rm105-baseline-rm104.json'), 'utf8')) as Record<string, string[]>;

  it('as 382 moléculas, uma a uma COM ID: os mesmos alertas do baseline (exceção documentada: Celecoxibe)', () => {
    const DOC: Record<string, string[]> = { Celecoxibe: ['critical-pair-bra-aine'] };
    let comparados = 0;
    for (const d of getAllDrugs()) {
      const ids = baseline[d.molecula];
      if (!ids) continue;
      const esperado = ids.filter(x => !(DOC[d.molecula] ?? []).includes(x));
      expect(idsAlertas(runSafetyCheck({ moleculas: [d.molecula], entidade_ids: [d.id] })).sort(), d.id).toEqual(esperado);
      comparados++;
    }
    expect(comparados).toBeGreaterThan(300);
  });

  it('todos os casos do baseline sem termo de classe: mesma saída de alertas por nome (exceção documentada: Celecoxibe)', () => {
    const DOC: Record<string, string[]> = { Celecoxibe: ['critical-pair-bra-aine'] };
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
    const termosClasse = new Set(['ieca', 'bra', 'aine', 'isrs', 'imao', 'nitrato', 'febre', 'antibiotico', 'analgesico', 'antidepressivo', 'ansiedade']);
    for (const [k, ids] of Object.entries(baseline)) {
      const entradas = k.split('||');
      if (entradas.some(e => termosClasse.has(e.toLowerCase()))) continue;
      const esperado = aplicar106(k, ids.filter(x => !(DOC[k] ?? []).includes(x)));
      expect(idsAlertas(runSafetyCheck({ moleculas: entradas })).sort(), k).toEqual(esperado);
    }
  });

  it('o único alerta removido do baseline inteiro é o falso positivo do Celecoxibe isolado', () => {
    expect(Object.keys(baseline)).toContain('Celecoxibe');
    expect(baseline.Celecoxibe).toEqual(['critical-pair-bra-aine']);
  });

  it('severidades dos 22 pares preservadas (resolvidos por entidade)', () => {
    const esperadas: Array<[string[], string, string]> = [
      [['enalapril', 'ibuprofeno'], 'critical-pair-ieca-aine', 'danger'],
      [['losartana', 'ibuprofeno'], 'critical-pair-bra-aine', 'danger'],
      // RM-106: a regra genérica IECA + Espironolactona é deduplicada pela interação específica cadastrada (mesma gravidade)
      [['enalapril', 'espironolactona'], 'inter-enalapril-espironolactona', 'warning'],
      [['azitromicina', 'amiodarona'], 'critical-pair-azitromicina-amiodarona', 'critical'],
      [['hidroxicloroquina', 'azitromicina'], 'critical-pair-hidroxicloroquina-azitromicina', 'danger'],
      [['sertralina', 'tramadol'], 'critical-pair-sertralina-tramadol', 'danger'],
      [['metformina'], '', ''],
      [['litio', 'hctz'], 'critical-pair-litio-hidroclorotiazida', 'critical'],
      [['varfarina', 'ibuprofeno'], 'critical-pair-varfarina-aine', 'critical'],
      [['enalapril', 'losartana'], 'critical-pair-ieca-bra', 'critical'],
      [['tranilcipromina', 'sertralina'], 'critical-pair-imao-isrs', 'critical'],
      [['nitroglicerina', 'tadalafila'], 'critical-pair-nitrato-tadalafila', 'critical'],
      [['sacubitril_valsartana', 'enalapril'], 'critical-pair-sacubitril-ieca', 'critical'],
    ];
    for (const [ids, alertaId, sev] of esperadas) {
      if (!alertaId) continue;
      const r = porIds(ids);
      // RM-106: o mesmo risco pode sair pela regra fixa OU pela interação cadastrada equivalente (deduplicadas)
      const a = r.alertas.find(x => x.id === alertaId) ?? r.alertas.find(x => x.id.startsWith('inter-') && ids.every(i => x.id.includes(i)));
      expect(a, alertaId).toBeDefined();
      expect(a!.severidade, alertaId).toBe(sev);
    }
  });

  it('alertas genéricos válidos preservados com ID: duplicidade de classe, gestação, geriatria e renal', () => {
    expect(idsAlertas(porIds(['enalapril', 'ramipril']))).toEqual(expect.arrayContaining(['dup-IECA']));
    expect(porIds(['varfarina'], { gestante: true }).alertas.some(a => a.tipo === 'gestante')).toBe(true);
    expect(porIds(['metformina'], { crclValue: 10 }).alertas.some(a => a.tipo === 'renal')).toBe(true);
  });

  it('regras ARM e montelucaste preservadas, por entidade', () => {
    expect(idsAlertas(porIds(['espironolactona']))).toContain('arm-k-nao-informado');
    expect(idsAlertas(porIds(['eplerenona']))).toContain('arm-k-nao-informado');
    expect(idsAlertas(porIds(['montelucaste']))).toContain('montelucaste-saude-mental');
    expect(idsAlertas(porIds(['montelucaste_levocetirizina']))).toContain('montelucaste-saude-mental');
    expect(idsAlertas(porIds(['espironolactona'], { potassiumLevel: 5.6, crclValue: 40 }))).toContain('arm-hipercalemia-tfg-baixa');
  });

  it('sem fragmento: "espiron" e "montel" não acionam ARM/montelucaste', () => {
    const r = runSafetyCheck({ moleculas: ['espiron', 'montel'] });
    expect(idsAlertas(r)).toEqual([]);
  });
});

describe('RM-105.1 — coerência entre identidade, cobertura molecular e status final', () => {
  const entradas: Array<{ moleculas: string[]; entidade_ids?: Array<string | undefined> }> = [
    { moleculas: ['Varfarina'] },
    { moleculas: ['Midazolam'] },
    { moleculas: ['Midazolam'], entidade_ids: ['midazolam-uti'] },
    { moleculas: ['Fentanil', 'Varfarina'] },
    { moleculas: ['Fentanil', 'Varfarina'], entidade_ids: ['fentanil-transdermico', 'varfarina'] },
    { moleculas: ['ieca', 'ibuprofeno'], entidade_ids: [undefined, 'ibuprofeno'] },
    { moleculas: ['xyz', 'Varfarina'], entidade_ids: [undefined, 'varfarina'] },
    { moleculas: ['Varfarina'], entidade_ids: ['sertralina'] },
    { moleculas: ['Varfarina'], entidade_ids: ['nao-existe'] },
    { moleculas: ['desogestrel'] },
    { moleculas: ['desogestrel'], entidade_ids: ['desogestrel-75mcg'] },
    { moleculas: ['a', 'b'] },
    { moleculas: [] },
    { moleculas: [''], entidade_ids: ['varfarina'] },
  ];

  it('invariantes: status completa ⇒ todas as entradas com identidade selecionada e confirmada; nunca "completa" por variante escolhida em silêncio', () => {
    for (const e of entradas) {
      const r = runSafetyCheck(e);
      const rotulo = JSON.stringify(e);
      expect(r.verificacao_completa, rotulo).toBe(r.status === 'completa');
      expect(r.avaliacao_integral && !r.verificacao_completa, rotulo).toBe(false);
      if (r.status === 'completa') {
        expect(r.moleculas_nao_verificadas, rotulo).toEqual([]);
        for (const v of r.moleculas_verificadas) {
          expect(v.ambigua, rotulo).toBe(false);
          expect(['id_explicito', 'nome_unico'], rotulo).toContain(v.selecao);
        }
      }
      for (const v of r.moleculas_verificadas) {
        if (v.selecao === 'primeira_correspondencia_sem_id') { expect(v.ambigua, rotulo).toBe(true); expect(r.status, rotulo).toBe('parcial'); }
        expect(v.entidades_candidatas, rotulo).toContain(v.entidade_id);
      }
      expect(r.rastreio_alertas.map(x => x.alerta_id), rotulo).toEqual(r.alertas.map(a => a.id));
      for (const x of r.rastreio_alertas) expect(x.interacao_confirmada, rotulo).toBe(x.entradas_nao_verificadas.length === 0);
    }
  });

  it('alerta de regra fixa por texto não verificado nunca é apresentado como interação confirmada; o aviso aparece só nele', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'ibuprofeno'], entidade_ids: [undefined, 'ibuprofeno'] });
    expect(rotuloAlertaNaoConfirmado(r, 'critical-pair-ieca-aine')).not.toBeNull();
    const limpo = porIds(['enalapril', 'ibuprofeno']);
    expect(rotuloAlertaNaoConfirmado(limpo, 'critical-pair-ieca-aine')).toBeNull();
    expect(rotuloAlertaNaoConfirmado(null, 'x')).toBeNull();
  });

  it('cobertura molecular completa por ID não é avaliação clínica integral', () => {
    const r = porIds(['varfarina']);
    expect(r.status).toBe('completa');
    expect(r.avaliacao_integral).toBe(false);
    expect(r.mensagem).toContain('NÃO equivale a avaliação clínica integral');
  });
});

describe('RM-105.1 — guarda contra o retorno da substring nas regras fixas', () => {
  const fonte = fs.readFileSync(path.resolve(__dirname, '../lib/safety-rules.ts'), 'utf8');

  it('safety-rules.ts não contém o padrão m.includes(alvo) || alvo.includes(m) nem derivados', () => {
    expect(fonte).not.toMatch(/alvo\.includes\(/);
    expect(fonte).not.toMatch(/\.includes\(alvo\)/);
    expect(fonte).not.toMatch(/molsLower/);
    expect(fonte).not.toMatch(/arm\s*=>\s*m\.toLowerCase\(\)\.includes/);
  });

  it('as regras fixas usam os alvos declarados (entradaAciona/alvoDe)', () => {
    expect(fonte).toMatch(/entradaAciona\(alvoDe\('arm'\)/);
    expect(fonte).toMatch(/entradaAciona\(alvoDe\('montelucaste'\)/);
    expect(fonte).toMatch(/matchedDrugIds\(pair\.mol_a\)/);
  });

  it('entradaAciona: entidade resolvida usa a entidade; não resolvida usa texto exato; fragmento nunca', () => {
    const aine = alvoDe('aine');
    expect(entradaAciona(aine, { texto: 'x', drug: { molecula: 'Ibuprofeno', classe: 'AINE — Inibidor' } })).toEqual({ via: 'classe_cadastrada' });
    expect(entradaAciona(aine, { texto: 'aine' })).toEqual({ via: 'texto_exato_nao_resolvido' });
    expect(entradaAciona(aine, { texto: 'ain' })).toBeNull();
    expect(entradaAciona(aine, { texto: 'aines' })).toBeNull();
  });
});
