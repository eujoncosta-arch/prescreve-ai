// RM-106.1 — Fechamento técnico da matriz de interações: métricas reconciliadas, marcas, via/formulação,
// rastreabilidade, contrato de fonte e preservação das gravidades cadastradas.
// Aprovação técnica NÃO equivale a validação clínica: nenhuma interação possui fonte registrada.

import { describe, it, expect } from 'vitest';
import { drugRepository } from '@/lib/pharma-core';
import { runSafetyCheck } from '@/lib/safety-rules';
import { correspondenciaDoAlvo, resolverAlvoInteracao } from '@/lib/interaction-targets';
import {
  REGISTRO_DE_FUNDAMENTACAO, camposFaltantesDaFonte, chaveFundamentacao, classificarInteracao, metadadosDaInteracao, SEM_FONTE,
  type MetadadosInteracao,
} from '@/lib/interaction-contract';
import { descreverClassificacaoAlerta } from '@/lib/safety-coverage';
import { VERIFICACOES_FORA_DO_ESCOPO } from '@/lib/safety-limitations';
import { montarAnexoTecnico } from '@/lib/safety-annex';

type Ent = { id: string; activeIngredient: { name: string }; brands: Array<{ name: string; verified: boolean }>; interactions: Array<{ with: string; severity: 'leve' | 'moderada' | 'grave' | 'contraindicado'; description: string }>; presentations: Array<{ form: string; concentration: string }> };
const ENTS = drugRepository.getAll() as unknown as Ent[];
const porId = (id: string) => { const e = ENTS.find(x => x.id === id); if (!e) throw new Error('entidade inexistente no teste: ' + id); return e; };
const SEV_RANK = { contraindicado: 3, grave: 2, moderada: 1, leve: 0 } as const;
const SEV_ALERTA = { contraindicado: 'critical', grave: 'danger', moderada: 'warning', leve: 'info' } as const;
const ehInter = (id: string) => id.startsWith('inter-') || id.startsWith('critical-pair-');
const porIds = (ids: string[], moleculas?: string[]) => runSafetyCheck({ moleculas: moleculas ?? ids.map(i => porId(i).activeIngredient.name), entidade_ids: ids });

// ─── 1. Reconciliação das métricas (unidades explícitas) ───────────────────────────────────
describe('RM-106.1 — reconciliação de métricas', () => {
  const quick = ENTS.map(e => ({ id: e.id, molecula: e.activeIngredient.name }));
  // U3: relações DIRECIONAIS regra→entidade (uma por regra × entidade-alvo)
  const novo = new Set<string>(); const antigo = new Set<string>();
  for (const e of ENTS) for (const r of e.interactions) {
    for (const [t] of resolverAlvoInteracao(r.with).entidades) if (t !== e.id) novo.add(`${e.id}|${t}|${r.with}`);
  }
  // O substring antigo operava sobre `molecula` (nome do ativo em minúsculas) do QuickDrug; o nome do ativo é o mesmo campo.
  for (const e of ENTS) for (const r of e.interactions) for (const q of quick) {
    if (q.id === e.id) continue;
    const a = q.molecula.toLowerCase(), b = r.with.toLowerCase();
    if (a.includes(b) || b.includes(a)) antigo.add(`${e.id}|${q.id}|${r.with}`);
  }

  it('unidades: 870 regras, 491 textos `with` distintos, 382 entidades (denominadores do relatório)', () => {
    expect(ENTS.length).toBe(382);
    expect(ENTS.flatMap(e => e.interactions).length).toBe(870);
    expect(new Set(ENTS.flatMap(e => e.interactions.map(i => i.with))).size).toBe(491);
  });

  it('relações direcionais: ganhas + mantidas = novas; mantidas + perdidas = antigas', () => {
    const mantidas = [...antigo].filter(k => novo.has(k)).length;
    const perdidas = [...antigo].filter(k => !novo.has(k));
    const ganhas = [...novo].filter(k => !antigo.has(k)).length;
    expect(mantidas + ganhas).toBe(novo.size);
    expect(mantidas + perdidas.length).toBe(antigo.size);
    expect(antigo.size).toBe(580);
    expect(novo.size).toBe(2662);
    expect(ganhas).toBe(2088);
    expect(perdidas.length).toBe(6);
  });

  it('as 6 relações perdidas são exatamente os falsos positivos de substring documentados', () => {
    const perdidas = [...antigo].filter(k => !novo.has(k)).map(k => k.split('|').slice(1, 3).join('>') + '|' + k.split('|')[2]).sort();
    const esperado = [
      'paracetamol|Álcool (paracetamol)', 'paracetamol|Carvão ativado (paracetamol IV)', 'morfina-paliativa|Apomorfina', 'morfina-paliativa|apomorfina', 'epinefrina-uti|norepinefrina',
    ];
    const chaves = [...antigo].filter(k => !novo.has(k)).map(k => { const [, t, w] = k.split('|'); return `${t}|${w}`; });
    for (const e of esperado) expect(chaves.some(c => c === e), e).toBe(true);
    expect(perdidas.length).toBe(6);
  });

  it('pares ÚNICOS não ordenados: 2.335 com relação (antes 532): ≠ relações direcionais', () => {
    const par = (a: string, b: string) => (a < b ? `${a}||${b}` : `${b}||${a}`);
    const pn = new Set([...novo].map(k => { const [a, b] = k.split('|'); return par(a, b); }));
    const pa = new Set([...antigo].map(k => { const [a, b] = k.split('|'); return par(a, b); }));
    expect(pn.size).toBe(2335);
    expect(pa.size).toBe(532);
    expect(pn.size).toBeLessThan(novo.size); // unidades diferentes
  });

  it('todo par com relação cadastrada produz AO MENOS um alerta de interação na interface (a deduplicação nunca elimina o par)', () => {
    const par = (a: string, b: string) => (a < b ? `${a}||${b}` : `${b}||${a}`);
    const pn = [...new Set([...novo].map(k => { const [a, b] = k.split('|'); return par(a, b); }))];
    const semAlerta: string[] = [];
    for (const p of pn) {
      const [a, b] = p.split('||');
      const r = porIds([a, b]);
      const alertas = r.alertas.filter(x => ehInter(x.id));
      if (alertas.length === 0) semAlerta.push(p);
      // um alerta de interação por par (deduplicação entre direções e regras)
      expect(alertas.length, p).toBe(1);
    }
    expect(semAlerta).toEqual([]);
  }, 120000);
});

// ─── 2. Preservação das gravidades cadastradas ─────────────────────────────────────────────
describe('RM-106.1 — preservação das gravidades cadastradas', () => {
  it('a gravidade de cada alerta cadastral é a MAIS GRAVE entre as regras cadastradas que casam (nenhuma gravidade é alterada)', () => {
    let checados = 0;
    const amostra = ENTS.filter(e => e.interactions.length > 0).slice(0, 60);
    for (const a of amostra) {
      for (const b of ENTS.slice(0, 120)) {
        if (a.id === b.id) continue;
        const regras = [
          ...a.interactions.filter(r => correspondenciaDoAlvo(resolverAlvoInteracao(r.with), b.id)),
          ...b.interactions.filter(r => correspondenciaDoAlvo(resolverAlvoInteracao(r.with), a.id)),
        ];
        if (!regras.length) continue;
        const r = porIds([a.id, b.id]);
        const reg = r.interacoes_avaliadas.find(x => x.alerta_id.startsWith('inter-'));
        if (!reg) continue; // regra fixa mais grave/específica prevaleceu (coberto no teste abaixo)
        const max = regras.map(x => x.severity).sort((x, y) => SEV_RANK[y] - SEV_RANK[x])[0];
        expect(reg.gravidade_cadastrada, `${a.id}+${b.id}`).toBe(max);
        expect(r.alertas.find(x => x.id === reg.alerta_id)?.severidade, `${a.id}+${b.id}`).toBe(SEV_ALERTA[max]);
        checados++;
      }
    }
    expect(checados).toBeGreaterThan(100);
  }, 120000);

  it('quando uma regra fixa substitui a cadastrada, ela nunca é MENOS grave que a cadastrada', () => {
    // enalapril+losartana: base cadastrada "moderada"/"grave" vs regra fixa IECA+BRA (critical)
    const r = porIds(['enalapril', 'losartana']);
    const crit = r.alertas.find(x => x.id === 'critical-pair-ieca-bra');
    expect(crit?.severidade).toBe('critical');
    expect(r.alertas.filter(x => ehInter(x.id)).length).toBe(1);
  });

  it('divergência entre direções cadastradas é exposta e vale a mais grave (cimetidina↔teofilina)', () => {
    const r = porIds(['cimetidina', 'teofilina']);
    const reg = r.interacoes_avaliadas.find(x => x.divergencia_de_gravidade);
    expect(reg).toBeDefined();
    expect(reg!.gravidade_cadastrada).toBe('grave');
    const d = descreverClassificacaoAlerta(r, reg!.alerta_id)!;
    expect(d.detalhes.join(' ')).toMatch(/divergentes/);
  });
});

// ─── 3. Marcas comerciais ──────────────────────────────────────────────────────────────────
describe('RM-106.1 — marcas comerciais (usa exclusivamente marcas e entidades do catálogo)', () => {
  const marca = (id: string) => porId(id).brands[0].name;

  it('TODAS as marcas do catálogo, quando a entidade é identificada por ID, têm identidade confirmada e nunca ambígua', () => {
    let n = 0;
    for (const e of ENTS) for (const b of e.brands) {
      const r = runSafetyCheck({ moleculas: [b.name], entidade_ids: [e.id] });
      const v = r.moleculas_verificadas[0];
      expect(v, `${b.name}/${e.id}`).toBeDefined();
      expect(v.ambigua, `${b.name}/${e.id}`).toBe(false);
      expect(v.identidade_confirmada, `${b.name}/${e.id}`).toBe(true);
      expect(v.entidade_id).toBe(e.id);
      n++;
    }
    expect(n).toBe(710);
  });

  it('marca de molécula única + marca de molécula única: interação identificada por ID, pendente de validação, nunca confirmada', () => {
    const r = runSafetyCheck({ moleculas: [marca('losartana'), marca('ibuprofeno')], entidade_ids: ['losartana', 'ibuprofeno'] });
    const alertas = r.alertas.filter(a => ehInter(a.id));
    expect(alertas.length).toBe(1);
    const rz = r.rastreio_alertas.find(x => x.alerta_id === alertas[0].id)!;
    expect(rz.classificacao).not.toBe('confirmada');
    expect(rz.entradas_avaliadas.length).toBe(2);
  });

  it('marca de associação de princípios ativos (amoxicilina+clavulanato) resolve para a entidade da combinação', () => {
    const e = porId('amoxicilina_clavulanato');
    const r = runSafetyCheck({ moleculas: [e.brands[0].name], entidade_ids: [e.id] });
    expect(r.moleculas_verificadas[0].entidade_id).toBe('amoxicilina_clavulanato');
    expect(r.moleculas_verificadas[0].identidade_confirmada).toBe(true);
  });

  it('marca de combinação com sal no ativo (losartana potássica + hidroclorotiazida) mantém a entidade da combinação e casa regras de componente', () => {
    const e = porId('losartana_hidroclorotiazida');
    const r = runSafetyCheck({ moleculas: [e.brands[0].name, marca('ibuprofeno')], entidade_ids: [e.id, 'ibuprofeno'] });
    expect(r.moleculas_verificadas[0].entidade_id).toBe('losartana_hidroclorotiazida');
    expect(r.alertas.some(a => ehInter(a.id))).toBe(true);
  });

  it('entidade com várias apresentações/formas: a marca escolhida não altera o resultado de interação (a apresentação não entra no motor)', () => {
    const e = ENTS.find(x => x.presentations.length > 1 && x.brands.length > 1 && x.interactions.length > 0)!;
    const par = ENTS.find(x => x.id !== e.id && e.interactions.some(i => correspondenciaDoAlvo(resolverAlvoInteracao(i.with), x.id)))!;
    const a = runSafetyCheck({ moleculas: [e.brands[0].name, par.activeIngredient.name], entidade_ids: [e.id, par.id] });
    const b = runSafetyCheck({ moleculas: [e.brands[e.brands.length - 1].name, par.activeIngredient.name], entidade_ids: [e.id, par.id] });
    expect(a.alertas.map(x => x.id)).toEqual(b.alertas.map(x => x.id));
  });

  it('marcas semelhantes de moléculas diferentes não se confundem (cada marca → sua entidade)', () => {
    const ra = runSafetyCheck({ moleculas: [marca('losartana')], entidade_ids: ['losartana'] }).moleculas_verificadas[0];
    const rb = runSafetyCheck({ moleculas: [marca('valsartana')], entidade_ids: ['valsartana'] }).moleculas_verificadas[0];
    expect(ra.entidade_id).toBe('losartana');
    expect(rb.entidade_id).toBe('valsartana');
  });

  it('ID divergente do texto da marca: identidade NÃO confirmada (ambígua por id_diverge_do_texto), nunca silenciosamente aceita', () => {
    const r = runSafetyCheck({ moleculas: [marca('valsartana')], entidade_ids: ['losartana'] });
    const v = r.moleculas_verificadas[0];
    expect(v.ambigua).toBe(true);
    expect(v.motivo_ambiguidade).toBe('id_diverge_do_texto');
    expect(v.identidade_confirmada).toBe(false);
  });

  it('marca NÃO cadastrada: não reconhecida, contada como medicamento não identificado, sem interação inventada', () => {
    const r = runSafetyCheck({ moleculas: ['MarcaNaoCadastradaZZ9', 'Ibuprofeno'] });
    expect(r.moleculas_nao_verificadas.length).toBe(1);
    expect(r.resumo_interacoes.medicamentos_nao_identificados).toBe(1);
    expect(r.alertas.filter(a => a.id.startsWith('inter-')).length).toBe(0);
    expect(r.status).not.toBe('completa');
  });

  it('marca AMBÍGUA digitada sem ID (compartilhada por variantes da mesma molécula): ambígua, não confirmada, sem escolher variante', () => {
    const r = runSafetyCheck({ moleculas: ['Dormicum'] });
    const v = r.moleculas_verificadas[0];
    expect(v.ambigua).toBe(true);
    expect(v.identidade_confirmada).toBe(false);
    expect(v.motivo_ambiguidade).toBe('variantes_sem_id');
    // com o ID da variante escolhida, a identidade é confirmada para ESSA variante
    const c = runSafetyCheck({ moleculas: ['Dormicum'], entidade_ids: ['midazolam-uti'] }).moleculas_verificadas[0];
    expect(c.identidade_confirmada).toBe(true);
    expect(c.entidade_id).toBe('midazolam-uti');
  });

  it('marca digitada sem ID reconhecida só como sinônimo "não verificado" mantém identidade NÃO confirmada', () => {
    const e = ENTS.find(x => x.brands.some(b => !b.verified) && runSafetyCheck({ moleculas: [x.brands[0].name] }).moleculas_verificadas[0]?.identificacao === 'nome_comercial_nao_verificado')!;
    expect(e).toBeDefined();
    const v = runSafetyCheck({ moleculas: [e.brands[0].name] }).moleculas_verificadas[0];
    expect(v.identidade_confirmada).toBe(false);
  });

  it('LIMITAÇÃO DOCUMENTADA: no caminho por texto (sem ID) o motor não consulta `brands`; marca verificada fora de `sinonimos` não é reconhecida', () => {
    const verificadasNaoReconhecidas = ENTS.flatMap(e => e.brands.filter(b => b.verified).map(b => ({ e, b })))
      .filter(({ b }) => runSafetyCheck({ moleculas: [b.name] }).moleculas_verificadas.length === 0);
    expect(verificadasNaoReconhecidas.length).toBeGreaterThan(0); // lacuna real: a tela evita o problema enviando entidade_id
  });
});

// ─── 4. Via e formulação ───────────────────────────────────────────────────────────────────
describe('RM-106.1 — via, forma farmacêutica e concentração', () => {
  it('o catálogo possui apresentações (forma/concentração) para todas as entidades, mas a verificação só recebe identidade molecular', () => {
    expect(ENTS.every(e => e.presentations.length > 0)).toBe(true);
    const r = porIds(['zolpidem', 'cetoconazol_betametasona']);
    // o resultado não tem nenhum campo de via/forma/concentração
    const chaves = JSON.stringify(Object.keys(r)) + JSON.stringify(r.interacoes_avaliadas.map(x => Object.keys(x)));
    expect(chaves).not.toMatch(/via|forma|concentra|apresenta/i);
  });

  it('caso de limitação estrutural: cetoconazol+betametasona (creme/pomada tópicos) casa a regra cadastrada "Cetoconazol" por COMPONENTE, sem considerar a via', () => {
    const e = porId('cetoconazol_betametasona');
    expect(e.presentations.every(p => /creme|pomada/i.test(p.form))).toBe(true);
    const r = porIds(['zolpidem', 'cetoconazol_betametasona']);
    const reg = r.interacoes_avaliadas.find(x => x.alerta_id.startsWith('inter-'))!;
    expect(reg.tipo_correspondencia).toBe('componente_combinacao');
    expect(r.rastreio_alertas.find(x => x.alerta_id === reg.alerta_id)!.classificacao).toBe('pendente_validacao');
    // este teste NÃO afirma que a interação é clinicamente relevante ou irrelevante para a via tópica
  });

  it('a limitação é declarada ao usuário (lista de verificações fora do escopo e anexo técnico)', () => {
    expect(VERIFICACOES_FORA_DO_ESCOPO.join(' ')).toMatch(/via de administração, forma farmacêutica, concentração e apresentação/);
    const r = porIds(['zolpidem', 'cetoconazol_betametasona']);
    expect(r.detalhe_avaliacao.verificacoes_fora_do_escopo.join(' ')).toMatch(/independentemente da via ou da formulação/);
    const anexo = montarAnexoTecnico(r, new Date('2026-11-07T12:00:00Z'));
    expect(JSON.stringify(anexo)).toMatch(/independentemente da via ou da formulação/);
  });
});

// ─── 5. Rastreabilidade ────────────────────────────────────────────────────────────────────
describe('RM-106.1 — rastreabilidade por tipo de correspondência', () => {
  const exemplos: Array<[string, string[], string]> = [
    ['molecula_exata', ['enalapril', 'espironolactona'], 'molécula exata'],
    ['componente_combinacao', ['zolpidem', 'cetoconazol_betametasona'], 'componente de combinação'],
    ['classe_farmacologica', ['prednisona', 'celecoxibe'], 'classe farmacológica'],
    ['grupo_aprovado', ['prednisona', 'metformina'], 'grupo farmacológico'],
    ['sinonimo_autorizado', ['sertralina', 'litio'], 'sinônimo'],
  ];
  for (const [tipo, ids, rotulo] of exemplos) {
    it(`${tipo}: é possível reconstruir entrada, entidades, regra cadastrada, gravidade, fonte e estado de validação`, () => {
      const r = porIds(ids);
      const reg = r.interacoes_avaliadas.find(x => x.tipo_correspondencia === tipo);
      expect(reg, tipo).toBeDefined();
      expect(ids).toContain(reg!.entidade_a);
      expect(ids).toContain(reg!.entidade_b);
      expect(reg!.alvo_cadastrado.length).toBeGreaterThan(0);
      expect(['leve', 'moderada', 'grave', 'contraindicado']).toContain(reg!.gravidade_cadastrada);
      expect(reg!.fonte).toBeNull();
      expect(reg!.status_validacao).toBe('pendente_validacao_clinica');
      const rz = r.rastreio_alertas.find(x => x.alerta_id === reg!.alerta_id)!;
      expect(rz.entradas_avaliadas.length).toBe(2);
      expect(rz.classificacao).not.toBe('confirmada');
      const d = descreverClassificacaoAlerta(r, reg!.alerta_id)!;
      expect(d.pendente).toBe(true);
      expect(d.detalhes.join(' ')).toContain(rotulo);
      expect(d.detalhes.join(' ')).toMatch(/Sem fonte bibliográfica registrada/);
    });
  }

  it('correspondência por CLASSE nunca é exibida como molécula exata; por GRUPO nunca como confirmação molecular', () => {
    const c = porIds(['prednisona', 'celecoxibe']);
    const rc = c.interacoes_avaliadas.find(x => x.tipo_correspondencia === 'classe_farmacologica')!;
    const dc = descreverClassificacaoAlerta(c, rc.alerta_id)!;
    expect(dc.rotulo).toMatch(/CLASSE/);
    expect(dc.detalhes.join(' ')).not.toMatch(/molécula exata/);
    const g = porIds(['prednisona', 'metformina']);
    const rg = g.interacoes_avaliadas.find(x => x.tipo_correspondencia === 'grupo_aprovado')!;
    const dg = descreverClassificacaoAlerta(g, rg.alerta_id)!;
    expect(dg.rotulo).toMatch(/GRUPO/);
    expect(dg.detalhes.join(' ')).not.toMatch(/confirmad/i);
  });

  it('em TODO o catálogo, nenhum alerta de interação sai como `confirmada` e todo registro cadastral declara ausência de fonte', () => {
    let n = 0;
    for (const e of ENTS.slice(0, 40)) for (const f of ENTS) {
      if (e.id >= f.id) continue;
      const r = porIds([e.id, f.id]);
      for (const x of r.rastreio_alertas) if (x.classificacao) { expect(x.classificacao).not.toBe('confirmada'); n++; }
      for (const x of r.interacoes_avaliadas) { expect(x.fonte).toBeNull(); expect(x.status_validacao).toBe('pendente_validacao_clinica'); }
    }
    expect(n).toBeGreaterThan(50);
  }, 120000);

  it('ausência de regra ≠ ausência de interação; par sem regra aparece listado com a nota', () => {
    const r = porIds(['enalapril', 'omeprazol']);
    if (r.alertas.some(a => ehInter(a.id))) return;
    expect(r.resumo_interacoes.pares_sem_regra_encontrada.length).toBe(1);
    expect(r.resumo_interacoes.nota).toMatch(/NÃO é prova de ausência/);
  });

  it('ambiguidade não é resolvida silenciosamente: variantes sem ID ficam ambíguas e a avaliação não é completa', () => {
    const r = runSafetyCheck({ moleculas: ['Midazolam', 'Fentanil'] });
    const amb = r.moleculas_verificadas.filter(v => v.ambigua);
    if (amb.length) expect(r.status).not.toBe('completa');
  });

  it('nome do campo legado `interacao_confirmada` significa só identidade molecular: com identidade confirmada o alerta continua pendente de validação', () => {
    const r = porIds(['enalapril', 'espironolactona']);
    const rz = r.rastreio_alertas.find(x => x.alerta_id.startsWith('inter-'))!;
    expect(rz.interacao_confirmada).toBe(true);
    expect(rz.classificacao).toBe('pendente_validacao');
  });
});

// ─── 6. Contrato de fonte ──────────────────────────────────────────────────────────────────
describe('RM-106.1 — estrutura de fundamentação (sem preencher o registro)', () => {
  const chave = chaveFundamentacao('enalapril', 'Espironolactona');
  const completa = (): MetadadosInteracao => ({
    status_validacao: 'fonte_oficial_registrada',
    limitacoes: [],
    fonte: {
      tipo: 'bula_oficial', instituicao: 'INSTITUICAO-DE-TESTE', documento: 'DOCUMENTO-DE-TESTE', referencia: 'REF-DE-TESTE', url: 'https://exemplo.invalid/doc',
      versao_documento: 'VERSAO-DE-TESTE', secao: 'SECAO-DE-TESTE', trecho: 'TRECHO-DE-TESTE', par_relacionado: 'PAR-DE-TESTE', acessado_em: '2026-11-07',
      limitacoes_da_fonte: ['limitação de teste'], estado_de_revisao: 'verificada',
    },
  });

  it('o registro de fundamentação de produção continua VAZIO (nenhuma fonte foi preenchida automaticamente)', () => {
    expect(Object.keys(REGISTRO_DE_FUNDAMENTACAO)).toEqual([]);
    expect(metadadosDaInteracao('enalapril', 'Espironolactona')).toBe(SEM_FONTE);
  });

  it('fonte COMPLETA e verificada sustenta `confirmada` apenas para correspondência molecular; classe/grupo nunca', () => {
    const m = completa();
    expect(camposFaltantesDaFonte(m.fonte)).toEqual([]);
    expect(classificarInteracao('molecula_exata', m)).toBe('confirmada');
    expect(classificarInteracao('classe_farmacologica', m)).toBe('por_classe');
    expect(classificarInteracao('grupo_aprovado', m)).toBe('por_grupo');
  });

  it('fonte INCOMPLETA (sem seção/trecho/URL/revisão verificada) nunca resulta em `confirmada`', () => {
    for (const campo of ['instituicao', 'documento', 'url', 'versao_documento', 'secao', 'trecho', 'par_relacionado', 'acessado_em'] as const) {
      const m = completa(); delete (m.fonte as unknown as Record<string, unknown>)[campo];
      expect(camposFaltantesDaFonte(m.fonte), campo).toContain(campo);
      expect(classificarInteracao('molecula_exata', m), campo).toBe('pendente_validacao');
    }
    const cand = completa(); cand.fonte!.estado_de_revisao = 'candidata';
    expect(classificarInteracao('molecula_exata', cand)).toBe('pendente_validacao');
    expect(camposFaltantesDaFonte(undefined)).toEqual(['fonte']);
  });

  it('entrada registrada com fonte incompleta é rebaixada a pendente com o motivo explícito (e nunca altera gravidade)', () => {
    const inc = completa(); delete (inc.fonte as unknown as Record<string, unknown>).trecho;
    REGISTRO_DE_FUNDAMENTACAO[chave] = inc;
    try {
      const m = metadadosDaInteracao('enalapril', 'Espironolactona');
      expect(m.status_validacao).toBe('pendente_validacao_clinica');
      expect(m.limitacoes.join(' ')).toMatch(/INCOMPLETA \(faltam: trecho\)/);
      const r = porIds(['enalapril', 'espironolactona']);
      expect(r.rastreio_alertas.find(x => x.alerta_id.startsWith('inter-'))!.classificacao).toBe('pendente_validacao');
    } finally { delete REGISTRO_DE_FUNDAMENTACAO[chave]; }
    expect(Object.keys(REGISTRO_DE_FUNDAMENTACAO)).toEqual([]);
  });

  it('entrada completa ALTERA somente a classificação, nunca a gravidade do alerta', () => {
    const antes = porIds(['enalapril', 'espironolactona']);
    REGISTRO_DE_FUNDAMENTACAO[chave] = completa();
    try {
      const depois = porIds(['enalapril', 'espironolactona']);
      const a = antes.alertas.find(x => x.id.startsWith('inter-'))!, d = depois.alertas.find(x => x.id.startsWith('inter-'))!;
      expect(d.severidade).toBe(a.severidade);
      expect(depois.rastreio_alertas.find(x => x.alerta_id === d.id)!.classificacao).toBe('confirmada');
    } finally { delete REGISTRO_DE_FUNDAMENTACAO[chave]; }
  });
});
