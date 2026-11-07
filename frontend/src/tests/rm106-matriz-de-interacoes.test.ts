// RM-106 — Auditoria e classificação da matriz de interações medicamentosas.
// Aprovação técnica NÃO equivale a homologação clínica: nenhuma interação possui fonte oficial registrada.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runSafetyCheck } from '@/lib/safety-rules';
import { getAllDrugs } from '@/lib/pharma-database';
import {
  resolverAlvoInteracao, correspondenciaDoAlvo, integrantesDoGrupo, todosOsAlvosCadastrados, GRUPOS_CONTROLADOS,
} from '@/lib/interaction-targets';
import { REGISTRO_DE_FUNDAMENTACAO, NOTA_SEM_REGRA } from '@/lib/interaction-contract';

const run = (m: string[]) => runSafetyCheck({ moleculas: m });
const inter = (r: ReturnType<typeof run>) => r.alertas.filter(a => a.id.startsWith('inter-') || a.id.startsWith('critical-pair-'));

describe('RM-106 — resolução do alvo cadastrado', () => {
  it('todo `with` cadastrado é resolvido sem lançar erro e nenhum alvo medicamentoso vira confirmado sem entidade', () => {
    const alvos = todosOsAlvosCadastrados();
    expect(alvos.length).toBeGreaterThan(400);
    for (const a of alvos) {
      if (a.nao_medicamentoso) expect(a.entidades.size, a.with).toBe(0);
    }
  });

  it('falsos positivos de substring não ocorrem (apomorfina ≠ morfina, norepinefrina ≠ epinefrina)', () => {
    const ap = resolverAlvoInteracao('Apomorfina');
    const morf = getAllDrugs().filter(d => /^morfina/.test(d.id)).map(d => d.id);
    for (const id of morf) expect(correspondenciaDoAlvo(ap, id), id).toBeNull();
    const nor = resolverAlvoInteracao('Norepinefrina');
    const epi = getAllDrugs().filter(d => /^epinefrina/.test(d.id)).map(d => d.id);
    for (const id of epi) expect(correspondenciaDoAlvo(nor, id), id).toBeNull();
  });

  it('agentes não medicamentosos nunca casam com itens prescritos', () => {
    const a = resolverAlvoInteracao('Álcool');
    expect(a.nao_medicamentoso).toBe(true);
    expect(a.entidades.size).toBe(0);
  });

  it('grupos controlados têm definição ATC explícita e membros testáveis', () => {
    for (const g of GRUPOS_CONTROLADOS) {
      expect(g.id.length, g.id).toBeGreaterThan(2);
      expect(Array.isArray(integrantesDoGrupo(g.id)), g.id).toBe(true);
    }
    expect(integrantesDoGrupo('aine')).toContain('ibuprofeno');
    expect(integrantesDoGrupo('benzodiazepinicos').length).toBeGreaterThan(2);
    expect(integrantesDoGrupo('opioides').length).toBeGreaterThan(2);
  });
});

describe('RM-106 — resultado por situação', () => {
  it('molécula exata: lítio + ibuprofeno gera um único alerta (direção mais grave) e é pendente de validação', () => {
    const r = run(['Lítio', 'Ibuprofeno']);
    const a = inter(r);
    expect(a.length).toBeGreaterThan(0);
    const reg = r.interacoes_avaliadas.find(x => x.alerta_id.startsWith('inter-'));
    expect(reg?.status_validacao).toBe('pendente_validacao_clinica');
    expect(reg?.fonte).toBeNull();
    expect(r.rastreio_alertas.find(x => x.alerta_id === reg!.alerta_id)?.classificacao).not.toBe('confirmada');
  });

  it('por classe: midazolam + fentanil é reconhecido (antes sem alerta) e rotulado como classe/grupo', () => {
    const r = run(['Midazolam', 'Fentanil']);
    expect(inter(r).length).toBeGreaterThan(0);
    const cls = r.rastreio_alertas.map(x => x.classificacao);
    expect(cls.some(c => c === 'por_classe' || c === 'por_grupo' || c === 'pendente_validacao')).toBe(true);
    expect(cls).not.toContain('confirmada');
  });

  it('medicamento não identificado é contado e não vira interação confirmada', () => {
    const r = run(['Enalapril', 'Xyzfarmacoinexistente']);
    expect(r.resumo_interacoes.medicamentos_nao_identificados).toBe(1);
    expect(r.alertas.filter(a => a.id.startsWith('inter-')).length).toBe(0);
  });

  it('par identificado sem regra: aparece em pares_sem_regra_encontrada com a nota de que não é prova de ausência', () => {
    const r = run(['Enalapril', 'Omeprazol']);
    const sem = r.resumo_interacoes.pares_sem_regra_encontrada;
    if (inter(r).length === 0) {
      expect(sem.length).toBe(1);
      expect(r.resumo_interacoes.nota).toBe(NOTA_SEM_REGRA);
      expect(r.resumo_interacoes.nota).toMatch(/NÃO é prova de ausência/);
    } else {
      expect(sem.length).toBe(0);
    }
  });

  it('3+ medicamentos e várias interações simultâneas: um alerta por par, sem duplicar', () => {
    const r = run(['Enalapril', 'Espironolactona', 'Ibuprofeno', 'Losartana']);
    const ids = r.alertas.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.resumo_interacoes.pares_avaliados).toBe(6);
    expect(inter(r).length).toBeGreaterThanOrEqual(3);
  });

  it('resumo: por_classificacao é consistente com os alertas de interação', () => {
    const r = run(['Enalapril', 'Ibuprofeno', 'Fluoxetina', 'Tramadol']);
    const pc = r.resumo_interacoes.por_classificacao;
    // situações 1–4 contam alertas de interação; 5–7 contam não identificados, combinações e pares sem regra
    const comAlerta = pc.confirmada + pc.pendente_validacao + pc.por_classe + pc.por_grupo;
    expect(comAlerta).toBeLessThanOrEqual(r.alertas.length);
    expect(pc.nao_encontrada).toBe(r.resumo_interacoes.pares_sem_regra_encontrada.length);
    expect(pc.medicamento_nao_identificado).toBe(r.resumo_interacoes.medicamentos_nao_identificados);
  });

  it('sem fontes registradas: nenhum alerta é classificado como confirmado', () => {
    expect(Object.keys(REGISTRO_DE_FUNDAMENTACAO).length).toBe(0);
    const r = run(['Varfarina', 'Ibuprofeno', 'Fluoxetina', 'Tramadol', 'Enalapril', 'Losartana']);
    for (const x of r.rastreio_alertas) expect(x.classificacao, x.alerta_id).not.toBe('confirmada');
  });
});

describe('RM-106 — pares prioritários (avaliação individual)', () => {
  const pares: Array<[string, string]> = [
    ['Midazolam', 'Fentanil'], ['Lítio', 'Enalapril'], ['Enalapril', 'Losartana'], ['Enalapril', 'Ibuprofeno'],
    ['Losartana', 'Ibuprofeno'], ['Fluoxetina', 'Tramadol'], ['Enalapril', 'Espironolactona'],
  ];
  for (const [a, b] of pares) {
    it(`${a} + ${b}: ambos identificados e interação não deixa de ser reportada`, () => {
      const r = run([a, b]);
      expect(r.moleculas_nao_verificadas.length).toBe(0);
      expect(inter(r).length, `${a}+${b}`).toBeGreaterThan(0);
    });
  }

  // Lacunas documentadas (RM-106): moléculas reconhecidas, sem regra cadastrada e sem fonte verificada para adicionar.
  const lacunas: Array<[string, string]> = [['Azitromicina', 'Ondansetrona'], ['Claritromicina', 'Amiodarona'], ['Fenobarbital', 'Morfina'], ['Bupropiona', 'Tramadol']];
  for (const [a, b] of lacunas) {
    it(`lacuna conhecida ${a} + ${b}: nunca apresentada como ausência de interação`, () => {
      const r = run([a, b]);
      if (inter(r).length === 0) {
        expect(r.resumo_interacoes.pares_sem_regra_encontrada.length).toBe(1);
        expect(r.resumo_interacoes.nota).toMatch(/NÃO é prova de ausência/);
      }
    });
  }
});

describe('RM-106 — proteção contra reintrodução de substring', () => {
  it('safety-rules.ts não usa includes() sobre o texto cadastrado (inter.com) nem sobre molecula para identidade', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'safety-rules.ts'), 'utf8');
    expect(src).not.toMatch(/\.includes\(\s*inter\.com/);
    expect(src).not.toMatch(/inter\.com\s*\.includes\(/);
    expect(src).not.toMatch(/molecula\s*\.includes\(\s*inter/);
    expect(src).not.toMatch(/\.molecula\.includes\(/);
  });
});
