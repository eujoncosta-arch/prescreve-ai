// ============================================================
// RM-105.2.2 — Integridade entre pacientes, contrato de idade (valor + unidade) e precisão do contrato de avaliação
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runSafetyCheck } from '@/lib/safety-rules';
import { drugRepository } from '@/lib/pharma-core';
import { detectarPopulacao } from '@/lib/dosing-engine';
import { classifyPopulation } from '@/lib/dose-calculator';
import { DIVERGENCIAS_ENTRE_MOTORES, formatarIdade, normalizarIdade, DIAS_POR_ANO } from '@/lib/age-contract';
import { avaliarCoberturaContextual, derivarIdoso, LIMITACAO_IDADE_LEGADA, LIMITACAO_IDADE_PEDIATRICA } from '@/lib/safety-context';
import { describeSafetyCoverage } from '@/lib/safety-coverage';
import { anexoComoTexto, montarAnexoTecnico } from '@/lib/safety-annex';
import { VERIFICACOES_FORA_DO_ESCOPO } from '@/lib/safety-limitations';
import { dadosClinicosPreenchidos } from '@/lib/patient-session';

vi.mock('next/navigation', () => ({
  usePathname: () => '/prescricao-rapida',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => React.createElement('a', { href, ...rest }, children),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }, Toaster: () => null }));

import { AppProvider } from '@/lib/store';
import PrescricaoRapida from '@/app/prescricao-rapida/page';

const QUANDO = '2026-11-07T10:00:00.000Z';
const idade = (valor: unknown, unidade: unknown) => ({ valor, unidade }) as never;
const estadoIdade = (entrada: unknown) => avaliarCoberturaContextual(entrada, { usaARM: false }).itens.find(i => i.campo === 'idade_idoso')!.estado;
const CTX_OK = { gestante: false, lactante: false, sexo: 'F' as const, crclValue: 90, alergias: { status: 'sem_alergias_conhecidas' as const } };

// ─── 1. Contrato de idade: valor + unidade ───

describe('RM-105.2.2 — contrato de idade (valor + unidade explícita, normalização em dias)', () => {
  it('unidade obrigatória: valor sem unidade NÃO é interpretado (número solto, texto, objeto sem unidade, unidade vazia)', () => {
    for (const x of [28, '28', { valor: 28 }, { valor: 28, unidade: '' }, { valor: 28, unidade: null }, []]) {
      const r = normalizarIdade(x);
      expect(r.estado, JSON.stringify(x)).toBe('invalida');
      if (r.estado === 'invalida') expect(r.motivo, JSON.stringify(x)).toBe('sem_unidade');
    }
    expect(normalizarIdade(undefined).estado).toBe('nao_informada');
    expect(normalizarIdade(null).estado).toBe('nao_informada');
  });

  it('unidade inválida e valores inválidos', () => {
    for (const u of ['semanas', 'ANOS', 'Dias', 'y', 5, {}]) {
      const r = normalizarIdade(idade(10, u));
      expect(r.estado, String(u)).toBe('invalida');
      if (r.estado === 'invalida') expect(r.motivo).toBe('unidade_invalida');
    }
    for (const v of [-1, -0.001, NaN, Infinity, -Infinity, '10', null, undefined, {}]) {
      const r = normalizarIdade(idade(v, 'anos'));
      expect(r.estado, String(v)).toBe('invalida');
      if (r.estado === 'invalida') expect(r.motivo).toBe('valor_invalido');
    }
  });

  it('limite de validade (120 anos) em cada unidade: aceita o limite, recusa acima', () => {
    expect(normalizarIdade(idade(120, 'anos')).estado).toBe('informada');
    expect(normalizarIdade(idade(120.0001, 'anos')).estado).toBe('invalida');
    expect(normalizarIdade(idade(120 * DIAS_POR_ANO, 'dias')).estado).toBe('informada');
    expect(normalizarIdade(idade(120 * DIAS_POR_ANO + 1, 'dias')).estado).toBe('invalida');
    expect(normalizarIdade(idade(1440, 'meses')).estado).toBe('informada');
    expect(normalizarIdade(idade(1441, 'meses')).estado).toBe('invalida');
    const r = normalizarIdade(idade(500, 'anos'));
    if (r.estado === 'invalida') { expect(r.motivo).toBe('fora_do_intervalo'); expect(r.detalhe).toContain('verifique o valor e a unidade'); }
  });

  it('zero é válido em qualquer unidade (recém-nascido no dia 0)', () => {
    for (const u of ['dias', 'meses', 'anos']) {
      const r = normalizarIdade(idade(0, u));
      expect(r.estado, u).toBe('informada');
      if (r.estado === 'informada') { expect(r.idade.dias).toBe(0); expect(r.idade.faixa).toBe('neonato'); expect(r.idade.idoso).toBe(false); }
    }
  });

  it('RECÉM-NASCIDOS: corte de 28 dias exato (27 → neonato; 28 → lactente), nas três unidades', () => {
    const faixa = (v: number, u: string) => { const r = normalizarIdade(idade(v, u)); return r.estado === 'informada' ? r.idade.faixa : r.estado; };
    expect(faixa(27, 'dias')).toBe('neonato');
    expect(faixa(27.999, 'dias')).toBe('neonato');
    expect(faixa(28, 'dias')).toBe('lactente');
    expect(faixa(0.9, 'meses')).toBe('neonato'); // 0,9 mês = 27,375 dias
    expect(faixa(28 / (365 / 12), 'meses')).toBe('lactente'); // exatamente 28 dias em meses
    expect(faixa(28 / 365, 'anos')).toBe('lactente');
    expect(faixa(27 / 365, 'anos')).toBe('neonato');
  });

  it('LACTENTES, CRIANÇAS, ADOLESCENTES, ADULTOS e IDOSOS: limites exatos nas três unidades', () => {
    const faixa = (v: number, u: string) => { const r = normalizarIdade(idade(v, u)); return r.estado === 'informada' ? r.idade.faixa : r.estado; };
    // lactente < 2 anos
    expect(faixa(1, 'meses')).toBe('lactente');
    expect(faixa(23.99, 'meses')).toBe('lactente');
    expect(faixa(24, 'meses')).toBe('pre_escolar');
    expect(faixa(729, 'dias')).toBe('lactente');
    expect(faixa(730, 'dias')).toBe('pre_escolar');
    // criança
    expect(faixa(5.99, 'anos')).toBe('pre_escolar');
    expect(faixa(6, 'anos')).toBe('escolar');
    expect(faixa(11.99, 'anos')).toBe('escolar');
    expect(faixa(12, 'anos')).toBe('adolescente');
    expect(faixa(4380, 'dias')).toBe('adolescente'); // 12 anos
    // adolescente → adulto
    expect(faixa(17.99, 'anos')).toBe('adolescente');
    expect(faixa(216, 'meses')).toBe('adulto'); // 18 anos
    expect(faixa(6570, 'dias')).toBe('adulto'); // 18 anos
    expect(faixa(64.99, 'anos')).toBe('adulto');
    // idoso ≥ 65
    expect(faixa(65, 'anos')).toBe('geriatrico');
    expect(faixa(780, 'meses')).toBe('geriatrico'); // 65 anos
    expect(faixa(23725, 'dias')).toBe('geriatrico'); // 65 anos
    expect(faixa(23724, 'dias')).toBe('adulto');
  });

  it('o mesmo instante em unidades diferentes dá o mesmo resultado (sem erro de arredondamento nas fronteiras)', () => {
    const igual = (a: [number, string], b: [number, string]) => {
      const x = normalizarIdade(idade(...a)); const y = normalizarIdade(idade(...b));
      expect(x.estado).toBe('informada'); expect(y.estado).toBe('informada');
      if (x.estado === 'informada' && y.estado === 'informada') {
        expect(x.idade.faixa, JSON.stringify([a, b])).toBe(y.idade.faixa);
        expect(x.idade.idoso).toBe(y.idade.idoso);
        expect(Math.abs(x.idade.dias - y.idade.dias)).toBeLessThan(1e-6);
        expect(Math.abs(x.idade.anos - y.idade.anos)).toBeLessThan(1e-9);
      }
    };
    igual([65, 'anos'], [780, 'meses']); igual([65, 'anos'], [23725, 'dias']);
    igual([18, 'anos'], [216, 'meses']); igual([18, 'anos'], [6570, 'dias']);
    igual([2, 'anos'], [24, 'meses']); igual([2, 'anos'], [730, 'dias']);
    igual([1, 'anos'], [12, 'meses']); igual([1, 'anos'], [365, 'dias']);
    igual([12, 'anos'], [144, 'meses']); igual([12, 'anos'], [4380, 'dias']);
  });

  it('varredura 0–800 dias: conversão sempre consistente (dias → anos → meses → dias) e faixa monotônica', () => {
    const ordem = ['neonato', 'lactente', 'pre_escolar', 'escolar', 'adolescente', 'adulto', 'geriatrico'];
    let anterior = 0;
    for (let d = 0; d <= 800; d++) {
      const r = normalizarIdade(idade(d, 'dias'));
      expect(r.estado).toBe('informada');
      if (r.estado !== 'informada') continue;
      expect(Math.abs(r.idade.anos * DIAS_POR_ANO - d)).toBeLessThan(1e-9);
      expect(Math.abs(r.idade.meses / 12 * DIAS_POR_ANO - d)).toBeLessThan(1e-9);
      const pos = ordem.indexOf(r.idade.faixa);
      expect(pos).toBeGreaterThanOrEqual(anterior); anterior = pos;
      expect(r.idade.faixa).toBe(classifyPopulation(d / DIAS_POR_ANO).population);
    }
  });

  it('conversões rastreáveis e texto inequívoco', () => {
    const r = normalizarIdade(idade(28, 'dias'));
    if (r.estado !== 'informada') throw new Error('esperado informada');
    expect(r.idade.conversoes.join(' ')).toContain('28 dias → 0.0767 anos (÷ 365)');
    expect(r.idade.faixa_fonte).toBe('dose-calculator.classifyPopulation');
    expect(r.idade.valor).toBe(28); expect(r.idade.unidade).toBe('dias');
    expect(formatarIdade({ valor: 1, unidade: 'dias' })).toBe('1 dia');
    expect(formatarIdade({ valor: 28, unidade: 'dias' })).toBe('28 dias');
    expect(formatarIdade({ valor: 1, unidade: 'meses' })).toBe('1 mês');
    expect(formatarIdade({ valor: 6, unidade: 'meses' })).toBe('6 meses');
    expect(formatarIdade({ valor: 1, unidade: 'anos' })).toBe('1 ano');
    expect(formatarIdade({ valor: 0.5, unidade: 'anos' })).toBe('0.5 anos');
  });

  it('28 DIAS não é lido como 28 ANOS (e vice-versa): resultados completamente distintos', () => {
    const dias = normalizarIdade(idade(28, 'dias')); const anos = normalizarIdade(idade(28, 'anos'));
    if (dias.estado !== 'informada' || anos.estado !== 'informada') throw new Error('esperado informada');
    expect(dias.idade.faixa).toBe('lactente'); expect(dias.idade.anos).toBeCloseTo(28 / 365, 10);
    expect(anos.idade.faixa).toBe('adulto'); expect(anos.idade.dias).toBe(28 * 365);
  });

  it('a divergência entre os motores é DOCUMENTADA e não foi silenciosamente resolvida', () => {
    expect(DIVERGENCIAS_ENTRE_MOTORES.join(' ')).toContain('divergem na fronteira do lactente');
    // dosing-engine (dias): 400 dias = pediátrico; dose-calculator/contrato: lactente (< 2 anos)
    expect(detectarPopulacao(400)).not.toBe('lactente');
    const r = normalizarIdade(idade(400, 'dias'));
    if (r.estado === 'informada') expect(r.idade.faixa).toBe('lactente');
    // concordam no corte neonatal e nos limites de 18 e 65 anos
    expect(detectarPopulacao(27)).toBe('neonato'); expect(detectarPopulacao(28)).toBe('lactente');
    expect(detectarPopulacao(6569)).toBe('adolescente'); expect(detectarPopulacao(6570)).toBe('adulto');
  });
});

// ─── 2. Idade no motor de segurança ───

describe('RM-105.2.2 — idade no motor de segurança (contexto)', () => {
  const comAlertaGeriatrico = drugRepository.getAll().find(e => e.alerts.some(t => /beers|idoso|queda/i.test(t)))!;
  const geri = (i: unknown) => runSafetyCheck({ moleculas: [comAlertaGeriatrico.activeIngredient.name], entidade_ids: [comAlertaGeriatrico.id], idade: i as never });

  it('a regra geriátrica existente usa a idade normalizada, em qualquer unidade', () => {
    expect(geri({ valor: 80, unidade: 'anos' }).alertas.some(a => a.tipo === 'geriatria')).toBe(true);
    expect(geri({ valor: 960, unidade: 'meses' }).alertas.some(a => a.tipo === 'geriatria')).toBe(true);
    expect(geri({ valor: 29200, unidade: 'dias' }).alertas.some(a => a.tipo === 'geriatria')).toBe(true);
    expect(geri({ valor: 28, unidade: 'dias' }).alertas.some(a => a.tipo === 'geriatria')).toBe(false);
    expect(geri({ valor: 30, unidade: 'anos' }).alertas.some(a => a.tipo === 'geriatria')).toBe(false);
  });

  it('SEM unidade: idade inválida, regra geriátrica NÃO avaliada (nunca "não idoso"), avaliação nunca integral', () => {
    for (const x of [28, '28', { valor: 28 }, { valor: 28, unidade: '' }]) {
      const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX_OK, idade: x as never });
      expect(estadoIdade({ idade: x }), JSON.stringify(x)).toBe('invalido');
      expect(r.cobertura_contextual.pendencias, JSON.stringify(x)).toContain('idade_idoso');
      expect(r.cobertura_contextual.inconsistencias.join(' ')).toContain('sem unidade');
      expect(r.cobertura_contextual.idade).toBeUndefined();
      expect(r.avaliacao_integral).toBe(false);
      expect(derivarIdoso({ idade: x })).toBeUndefined();
    }
    expect(geri({ valor: 80 }).alertas.some(a => a.tipo === 'geriatria')).toBe(false);
  });

  it('valores inválidos: negativo, NaN, texto, infinito, unidade desconhecida, acima de 120 anos em qualquer unidade', () => {
    const invalidas = [idade(-1, 'anos'), idade(NaN, 'dias'), idade('abc', 'meses'), idade(Infinity, 'anos'), idade(5, 'semanas'), idade(121, 'anos'), idade(50000, 'dias'), idade(1500, 'meses')];
    for (const x of invalidas) {
      expect(estadoIdade({ idade: x }), JSON.stringify(x)).toBe('invalido');
      expect(runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX_OK, idade: x }).avaliacao_integral).toBe(false);
    }
  });

  it('idade informada traz resumo normalizado e conversões rastreáveis (28 dias)', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX_OK, idade: { valor: 28, unidade: 'dias' } });
    expect(r.cobertura_contextual.idade).toMatchObject({ texto: '28 dias', unidade_informada: 'dias', faixa: 'lactente', formato_legado: false });
    expect(r.cobertura_contextual.idade!.dias).toBe(28);
    expect(r.cobertura_contextual.idade!.conversoes.length).toBeGreaterThan(0);
    const anexo = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(anexo).toContain('Idade normalizada: 28 dias (faixa lactente)');
    expect(anexo).toContain('÷ 365');
  });

  it('idade e indicador "idoso" contraditórios; idade e idade_anos contraditórios', () => {
    expect(estadoIdade({ idade: idade(30, 'anos'), idoso: true })).toBe('invalido');
    expect(estadoIdade({ idade: idade(30, 'anos'), idade_anos: 80 })).toBe('invalido');
    expect(estadoIdade({ idade: idade(30, 'anos'), idade_anos: 30 })).toBe('informado'); // consistentes
  });

  it('formato legado idade_anos continua funcionando (compatibilidade) e fica marcado como legado', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX_OK, idade_anos: 45 });
    expect(estadoIdade({ idade_anos: 45 })).toBe('informado');
    expect(r.cobertura_contextual.idade!.formato_legado).toBe(true);
    expect(r.cobertura_contextual.limitacoes).toContain(LIMITACAO_IDADE_LEGADA);
    expect(r.limitacoes_conhecidas.some(l => l.codigo === 'idade_formato_legado')).toBe(true);
    expect(derivarIdoso({ idade_anos: 70 })).toBe(true);
  });

  it('nenhuma regra nova: a idade continua alimentando só a regra geriátrica (mesmos alertas para a mesma idade em unidades diferentes)', () => {
    const a = geri({ valor: 70, unidade: 'anos' }).alertas.map(x => x.id);
    expect(geri({ valor: 840, unidade: 'meses' }).alertas.map(x => x.id)).toEqual(a);
    expect(geri({ valor: 25550, unidade: 'dias' }).alertas.map(x => x.id)).toEqual(a);
  });
});

// ─── 3. Contrato de avaliação: limitações, natureza e integral ───

describe('RM-105.2.2 — precisão do contrato de avaliação (cobertura técnica ≠ homologação clínica)', () => {
  const base = (idadeEntrada: unknown, extra: Record<string, unknown> = {}) =>
    runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX_OK, idade: idadeEntrada as never, ...extra });

  it('campos aditivos presentes; os campos anteriores continuam existindo (compatibilidade)', () => {
    const r = base(idade(45, 'anos'));
    for (const k of ['status', 'alertas', 'moleculas_verificadas', 'moleculas_nao_verificadas', 'combinacoes_nao_avaliadas', 'verificacao_completa', 'rastreio_alertas', 'cobertura_contextual', 'avaliacao_integral', 'avaliacao_alergias', 'versao_contrato', 'mensagem']) expect(r, k).toHaveProperty(k);
    expect(r).toHaveProperty('limitacoes_conhecidas'); expect(r).toHaveProperty('detalhe_avaliacao');
    expect(Array.isArray(r.limitacoes_conhecidas)).toBe(true);
  });

  it('avaliação integral COM limitações conhecidas: integral verdadeira, limitações visíveis, nunca homologação', () => {
    const r = base(idade(5, 'anos'));
    expect(r.avaliacao_integral).toBe(true);
    expect(r.detalhe_avaliacao.verificacoes_configuradas_executadas).toBe(true);
    expect(r.detalhe_avaliacao.homologacao_clinica).toBe(false);
    expect(r.detalhe_avaliacao.natureza).toBe('cobertura_tecnica_das_verificacoes_configuradas');
    expect(r.detalhe_avaliacao.faixa_etaria_sem_estratificacao).toBe(true);
    expect(r.detalhe_avaliacao.limitacoes_relevantes).toBeGreaterThan(0);
    const l = r.limitacoes_conhecidas.find(x => x.codigo === 'faixa_pediatrica_sem_regras_especificas')!;
    expect(l.severidade).toBe('relevante');
    expect(l.descricao).toBe(LIMITACAO_IDADE_PEDIATRICA);
  });

  it('adulto sem alergias a registrar: integral sem limitação relevante; ainda "regras cadastradas apenas" (informativa)', () => {
    const r = base(idade(45, 'anos'));
    expect(r.avaliacao_integral).toBe(true);
    expect(r.detalhe_avaliacao.faixa_etaria_sem_estratificacao).toBe(false);
    expect(r.limitacoes_conhecidas.map(l => l.codigo)).toEqual(['regras_cadastradas_apenas']);
    expect(r.detalhe_avaliacao.limitacoes_relevantes).toBe(0);
    expect(r.detalhe_avaliacao.homologacao_clinica).toBe(false);
  });

  it('pediátrica em dias, meses e anos: a limitação aparece nas três unidades; não aparece em adultos', () => {
    for (const i of [idade(10, 'dias'), idade(6, 'meses'), idade(10, 'anos'), idade(17.9, 'anos')]) expect(base(i).detalhe_avaliacao.faixa_etaria_sem_estratificacao, JSON.stringify(i)).toBe(true);
    for (const i of [idade(18, 'anos'), idade(216, 'meses'), idade(30000, 'dias'), idade(80, 'anos')]) expect(base(i).detalhe_avaliacao.faixa_etaria_sem_estratificacao, JSON.stringify(i)).toBe(false);
  });

  it('o detalhe separa contextos não informados, inválidos e não avaliados', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], sexo: 'M', gestante: true, idade: idade(28, '') });
    expect(r.detalhe_avaliacao.contextos_invalidos).toEqual(expect.arrayContaining(['gestacao', 'idade_idoso']));
    expect(r.detalhe_avaliacao.contextos_nao_informados).toEqual(expect.arrayContaining(['lactacao', 'funcao_renal', 'alergias']));
    expect(r.detalhe_avaliacao.verificacoes_configuradas_executadas).toBe(false);
    const parcial = base(idade(45, 'anos'), { alergias: { status: 'informadas', registros: [{ substancia: 'xyz', tipo: 'medicamento' }] } });
    expect(parcial.detalhe_avaliacao.contextos_nao_avaliados).toContain('alergias');
  });

  it('verificações fora do escopo atual são listadas (dose, hepática, comorbidade, alimentos, pediatria, reatividade cruzada)', () => {
    const r = base(idade(45, 'anos'));
    expect(r.detalhe_avaliacao.verificacoes_fora_do_escopo).toEqual([...VERIFICACOES_FORA_DO_ESCOPO]);
    const t = r.detalhe_avaliacao.verificacoes_fora_do_escopo.join(' ');
    for (const x of ['dose e posologia', 'função hepática', 'diagnóstico ou comorbidade', 'alimentos', 'pediátrica ou neonatal', 'reatividade cruzada']) expect(t, x).toContain(x);
  });

  it('o resultado de erro também traz o contrato novo, sem integral e sem homologação', () => {
    const e = runSafetyCheck({ moleculas: null as never });
    expect(e.status).toBe('erro'); expect(e.avaliacao_integral).toBe(false);
    expect(e.detalhe_avaliacao.homologacao_clinica).toBe(false);
    expect(e.detalhe_avaliacao.verificacoes_configuradas_executadas).toBe(false);
    expect(e.limitacoes_conhecidas.length).toBeGreaterThan(0);
  });

  it('alergias: limitações de reatividade cruzada e excipientes aparecem como limitações conhecidas relevantes', () => {
    const r = base(idade(45, 'anos'), { alergias: { status: 'informadas', registros: [{ substancia: 'ibuprofeno', tipo: 'medicamento' }, { substancia: 'amendoim', tipo: 'alimento' }, { substancia: 'aine', tipo: 'medicamento' }] } });
    const codigos = r.limitacoes_conhecidas.map(l => l.codigo);
    expect(codigos).toEqual(expect.arrayContaining(['reatividade_cruzada_nao_avaliada', 'excipientes_nao_avaliados', 'alergia_a_classe_sem_avaliacao_molecular']));
  });

  it('SELO VERDE: não transmite segurança absoluta (natureza + ressalvas) e some na faixa pediátrica', () => {
    const adulto = describeSafetyCoverage(base(idade(45, 'anos')), 1);
    expect(adulto.mostrarSeloNegativo).toBe(true);
    expect(adulto.detalhes.join(' ')).toContain('NÃO é validação clínica');
    expect(adulto.detalhes.join(' ')).toContain('não garante segurança');
    expect(`${adulto.titulo} ${adulto.detalhes.join(' ')}`).not.toMatch(/\b(segura|seguro|liberad|sem riscos?)\b/i);
    const crianca = describeSafetyCoverage(base(idade(5, 'anos')), 1);
    expect(crianca.mostrarSeloNegativo).toBe(false);
    expect(crianca.tone).toBe('warning');
    expect(crianca.titulo).toContain('faixa etária sem regras específicas');
    expect(crianca.detalhes.join(' ')).toContain('não há regras pediátricas ou neonatais');
  });

  it('a ausência de regras pediátricas fica visível na tela mesmo com alertas (limitação listada)', () => {
    const r = runSafetyCheck({ moleculas: ['varfarina', 'ibuprofeno'], entidade_ids: ['varfarina', 'ibuprofeno'], ...CTX_OK, idade: idade(10, 'anos') });
    expect(r.alertas.length).toBeGreaterThan(0);
    expect(describeSafetyCoverage(r, 2).detalhes.join(' ')).toContain('Faixa etária pediátrica/neonatal sem estratificação específica');
  });

  it('o ANEXO apresenta natureza, limitações relevantes, escopo e idade; nunca homologação', () => {
    const r = base(idade(10, 'dias'), { alergias: { status: 'informadas', registros: [{ substancia: 'amendoim', tipo: 'alimento' }] } });
    const t = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(t).toContain('Natureza da avaliação: cobertura técnica das verificações configuradas — NÃO é homologação clínica.');
    expect(t).toContain('É cobertura técnica, NÃO é homologação clínica.');
    expect(t).toMatch(/Há \d+ limitação\(ões\) relevante\(s\) conhecida\(s\)/);
    expect(t).toContain('RELEVANTE: Faixa etária pediátrica/neonatal sem estratificação específica');
    expect(t).toContain('RELEVANTE: Há alergia não medicamentosa registrada');
    expect(t).toContain('Verificações fora do escopo atual:');
    expect(t).toContain('Idade normalizada: 10 dias');
    expect(t).not.toMatch(/prescri[cç][aã]o segura|medicamentos? liberad|\bsem riscos?\b|certificad/i);
  });

  it('avaliação não integral não é apresentada como integral no anexo', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'] });
    const a = montarAnexoTecnico(r, QUANDO);
    expect(a.avaliacao_integral).toBe(false);
    expect(a.rotulo_integral).toContain('NÃO realizada');
  });
});

// ─── 4. Sessão do paciente: detecção de dados clínicos ───

describe('RM-105.2.2 — detecção de dados clínicos na sessão', () => {
  const VAZIO = { nome: '', idade: '', sexo: '', peso: '', altura: '', creatinina: '', child_pugh: '', diagnostico: '', observacoes: '', gestante: '', lactante: '', alergias_status: 'nao_informado', alergias: [] as unknown[] };

  it('sessão em branco: nada a descartar', () => {
    expect(dadosClinicosPreenchidos(VAZIO)).toEqual([]);
  });

  it('cada campo isolado é detectado (com o rótulo correspondente); espaços não contam como preenchido', () => {
    const casos: Array<[Partial<typeof VAZIO>, string]> = [
      [{ nome: 'A' }, 'nome'], [{ idade: '5' }, 'idade'], [{ sexo: 'F' }, 'sexo'], [{ peso: '60' }, 'peso'], [{ altura: '170' }, 'altura'],
      [{ creatinina: '1' }, 'creatinina'], [{ child_pugh: 'A' }, 'Child-Pugh'], [{ diagnostico: 'HAS' }, 'diagnóstico'], [{ observacoes: 'x' }, 'observações'],
      [{ gestante: 'nao' }, 'gestação'], [{ lactante: 'sim' }, 'lactação'], [{ alergias_status: 'sem_alergias_conhecidas' }, 'alergias'], [{ alergias: [{}] }, 'alergias'],
    ];
    for (const [parcial, rotulo] of casos) expect(dadosClinicosPreenchidos({ ...VAZIO, ...parcial }), rotulo).toEqual([rotulo]);
    expect(dadosClinicosPreenchidos({ ...VAZIO, nome: '   ', peso: ' ' })).toEqual([]);
  });
});

// ─── 5. Tela: idade com unidade ───

const CHAVE = 'prescreve-ai-favoritos';
const item = (molecula: string, entidade_id?: string) => ({ id: 'i-' + molecula, molecula, ...(entidade_id ? { entidade_id } : {}), nome_comercial: molecula, laboratorio: '', concentracao: '', forma_farmaceutica: 'Comprimido', dose: '1 comprimido', via: 'VO', frequencia: '1x/dia', duracao: '30 dias', instrucoes: '', uso_continuo: false, tipo_receita: 'simples' });
const protocolo = (id: string, nome: string, itens: ReturnType<typeof item>[]) => ({ id, nome, descricao: '', criado_em: '2026-01-10T10:00:00.000Z', itens });

function montarPagina() {
  return render(React.createElement(AppProvider, null, React.createElement(PrescricaoRapida)));
}
async function escolher(user: ReturnType<typeof userEvent.setup>, testId: string, opcao: RegExp | string) {
  await user.click(screen.getByTestId(testId));
  await user.click(await screen.findByRole('option', { name: opcao }));
}
async function adicionarMedicamento(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await user.type(screen.getByPlaceholderText(/Buscar molécula, marca, classe/i), nome);
  await user.click(await screen.findByText(nome));
  await user.click(await screen.findByRole('button', { name: /adicionar à prescrição/i }));
}
const valor = (placeholder: string) => (screen.getByPlaceholderText(placeholder) as HTMLInputElement).value;

describe('RM-105.2.2 — tela: idade com unidade explícita', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { localStorage.clear(); });

  it('o campo tem valor + unidade; sem unidade escolhida o valor NÃO é interpretado e o aviso diz isso', async () => {
    const user = userEvent.setup();
    montarPagina();
    expect(screen.getByTestId('idade-unidade').textContent).toContain('unidade');
    expect(screen.queryByPlaceholderText('anos')).toBeNull(); // o campo antigo "anos" não existe mais
    await user.type(screen.getByTestId('idade-valor'), '28');
    const msg = await screen.findByTestId('idade-interpretacao');
    expect(msg.getAttribute('data-idade-estado')).toBe('invalida');
    expect(msg.textContent).toContain('sem unidade');
    expect(msg.textContent).toContain('não foi interpretado');
  }, 20000);

  it('28 + Dias → "28 dias" (lactente); trocar para Anos → "28 anos" (adulto): a interpretação é exibida', async () => {
    const user = userEvent.setup();
    montarPagina();
    await user.type(screen.getByTestId('idade-valor'), '28');
    await escolher(user, 'idade-unidade', 'Dias');
    let msg = await screen.findByTestId('idade-interpretacao');
    expect(msg.textContent).toContain('Interpretada como 28 dias');
    expect(msg.textContent).toContain('faixa lactente');
    await escolher(user, 'idade-unidade', 'Anos');
    msg = await screen.findByTestId('idade-interpretacao');
    expect(msg.textContent).toContain('Interpretada como 28 anos');
    expect(msg.textContent).toContain('faixa adulto');
    await escolher(user, 'idade-unidade', 'Meses');
    expect((await screen.findByTestId('idade-interpretacao')).textContent).toContain('Interpretada como 28 meses');
  }, 30000);

  it('valor inválido ou acima do limite: aviso de erro; o motor recebe idade inválida (nunca avaliada)', async () => {
    const user = userEvent.setup();
    montarPagina();
    await escolher(user, 'idade-unidade', 'Anos');
    await user.type(screen.getByTestId('idade-valor'), '500');
    const msg = await screen.findByTestId('idade-interpretacao');
    expect(msg.getAttribute('data-idade-estado')).toBe('invalida');
    expect(msg.textContent).toContain('verifique o valor e a unidade');
  }, 20000);

  it('receita impressa mostra a idade COM a unidade escolhida', async () => {
    const user = userEvent.setup();
    montarPagina();
    await user.type(screen.getByPlaceholderText('Nome completo'), 'Bebê Teste');
    await user.type(screen.getByTestId('idade-valor'), '10');
    await escolher(user, 'idade-unidade', 'Dias');
    await adicionarMedicamento(user, 'Losartana');
    await user.click(screen.getAllByRole('button', { name: /gerar receita/i })[0]);
    const receita = await waitFor(() => { const el = document.querySelector('[data-print-part="receita"]'); if (!el) throw new Error('sem receita'); return el as HTMLElement; });
    expect(receita.textContent).toContain('Idade:10 dias');
    expect(receita.textContent).not.toContain('10 anos');
  }, 30000);

  it('a faixa pediátrica aparece como limitação na aba de segurança (sem selo verde)', async () => {
    const user = userEvent.setup();
    montarPagina();
    await user.type(screen.getByTestId('idade-valor'), '6');
    await escolher(user, 'idade-unidade', 'Meses');
    await adicionarMedicamento(user, 'Losartana');
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    const cobertura = await screen.findByTestId('safety-coverage');
    expect(cobertura.textContent).toContain('Faixa etária pediátrica/neonatal sem estratificação específica');
    expect(cobertura.getAttribute('data-coverage-status')).toBe('completa');
    expect(cobertura.textContent).toContain('faixa etária sem regras específicas');
  }, 30000);
});

// ─── 6. Tela: troca de paciente ao carregar protocolo ───

async function preencherPacienteA(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('Nome completo'), 'Paciente A');
  await user.type(screen.getByTestId('idade-valor'), '45');
  await escolher(user, 'idade-unidade', 'Anos');
  await user.type(screen.getByPlaceholderText('kg'), '70');
  await user.type(screen.getByPlaceholderText('cm'), '170');
  await user.type(screen.getByPlaceholderText('0.0'), '1.1');
  await escolher(user, 'gestante-select', /^Não$/);
  await escolher(user, 'lactante-select', /^Não$/);
  await escolher(user, 'alergias-status', /Alergias informadas/);
  await user.click(screen.getByTestId('alergia-adicionar'));
  await user.type(screen.getByPlaceholderText('Substância / medicamento'), 'Losartana');
}
async function abrirFavoritos(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('tab', { name: /favoritos/i }));
}
async function carregarProtocolo(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await abrirFavoritos(user);
  const cartao = (await screen.findAllByText(nome, { selector: 'p' })).map(p => p.closest('.bg-yellow-50') as HTMLElement).find(Boolean)!;
  await user.click(within(cartao).getByRole('button', { name: /carregar/i }));
}
const nomeAtual = () => (screen.getByPlaceholderText('Nome completo') as HTMLInputElement).value;

describe('RM-105.2.2 — integridade entre pacientes ao carregar protocolo', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(CHAVE, JSON.stringify([
      protocolo('B', 'Protocolo B', [item('Paracetamol', 'paracetamol')]),
      protocolo('C', 'Protocolo C (3 itens)', [item('Varfarina', 'varfarina'), item('ibuprofeno', 'ibuprofeno'), item('Sertralina', 'sertralina')]),
      protocolo('ANT', 'Protocolo antigo', [item('Midazolam'), item('Sertralina')]),
    ]));
  });
  afterEach(() => { localStorage.clear(); });

  it('troca com dados preenchidos: pede confirmação ANTES de carregar e lista o que será descartado; nada muda ainda', async () => {
    const user = userEvent.setup();
    montarPagina();
    // o medicamento entra ANTES do paciente completo (com idade+peso a tela abre a calculadora de dose, sem o botão de adicionar)
    await adicionarMedicamento(user, 'Losartana');
    await preencherPacienteA(user);
    await carregarProtocolo(user, 'Protocolo B');
    const banner = await screen.findByTestId('troca-paciente');
    expect(banner.textContent).toContain('Há dados clínicos preenchidos nesta sessão');
    for (const campo of ['nome', 'idade', 'peso', 'altura', 'creatinina', 'gestação', 'lactação', 'alergias']) expect(banner.textContent, campo).toContain(campo);
    expect(banner.textContent).toContain('vai DESCARTAR esses dados');
    // ainda nada foi alterado
    expect(nomeAtual()).toBe('Paciente A');
    expect(screen.queryByTestId('protocolo-recuperado')).toBeNull();
  }, 60000);

  it('CANCELAR a troca preserva INTEGRALMENTE a sessão atual (paciente, contexto, alergias, itens, avaliação)', async () => {
    const user = userEvent.setup();
    montarPagina();
    // o medicamento entra ANTES do paciente completo (com idade+peso a tela abre a calculadora de dose, sem o botão de adicionar)
    await adicionarMedicamento(user, 'Losartana');
    await preencherPacienteA(user);
    await carregarProtocolo(user, 'Protocolo B');
    await user.click(await screen.findByTestId('cancelar-troca'));
    expect(screen.queryByTestId('troca-paciente')).toBeNull();
    expect(nomeAtual()).toBe('Paciente A');
    expect(valor('kg')).toBe('70');
    expect(valor('cm')).toBe('170');
    expect(valor('0.0')).toBe('1.1');
    expect((screen.getByTestId('idade-valor') as HTMLInputElement).value).toBe('45');
    expect(screen.getByTestId('idade-unidade').textContent).toContain('Anos');
    expect(screen.getByTestId('gestante-select').textContent).toContain('Não');
    expect(screen.getByTestId('alergias-status').textContent).toContain('Alergias informadas');
    expect((screen.getByPlaceholderText('Substância / medicamento') as HTMLInputElement).value).toBe('Losartana');
    expect(screen.queryByTestId('protocolo-recuperado')).toBeNull();
    await user.click(screen.getByRole('tab', { name: /prescrição/i }));
    expect(await screen.findByText('Losartana', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('Paracetamol', { selector: 'p' })).toBeNull();
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    expect((await screen.findAllByText(/Alergia registrada: Losartana/)).length).toBeGreaterThan(0); // avaliação do paciente A intacta
  }, 90000);

  it('CONFIRMAR a troca: limpa paciente, contexto, alergias e avaliação; carrega SÓ os itens do protocolo; diz o que preencher de novo', async () => {
    const user = userEvent.setup();
    montarPagina();
    // o medicamento entra ANTES do paciente completo (com idade+peso a tela abre a calculadora de dose, sem o botão de adicionar)
    await adicionarMedicamento(user, 'Losartana');
    await preencherPacienteA(user);
    await carregarProtocolo(user, 'Protocolo B');
    await user.click(await screen.findByTestId('confirmar-troca'));

    // paciente, contexto e alergias do paciente A descartados
    expect(screen.queryByTestId('troca-paciente')).toBeNull();
    expect(nomeAtual()).toBe('');
    expect((screen.getByTestId('idade-valor') as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('idade-unidade').textContent).toContain('unidade');
    expect(valor('kg')).toBe('');
    expect(valor('cm')).toBe('');
    expect(valor('0.0')).toBe('');
    expect(screen.getByTestId('gestante-select').textContent).toContain('Não informado');
    expect(screen.getByTestId('lactante-select').textContent).toContain('Não informado');
    expect(screen.getByTestId('alergias-status').textContent).toContain('Não informado');
    expect(screen.queryAllByTestId('alergia-linha')).toHaveLength(0);

    // aviso: o que foi descartado e o que preencher de novo
    const aviso = await screen.findByTestId('protocolo-recuperado');
    expect(within(aviso).getByTestId('dados-descartados').textContent).toContain('foram descartados');
    const aPreencher = await within(aviso).findByTestId('a-preencher');
    for (const campo of ['gestação', 'lactação', 'idade', 'função renal', 'alergias']) expect(aPreencher.textContent, campo).toContain(campo);

    // só os itens do protocolo B
    expect(screen.queryAllByText('Paracetamol', { selector: 'p' }).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Losartana', { selector: 'p' })).toHaveLength(0);

    // avaliação recalculada para o novo contexto: nada do paciente A
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    expect(screen.queryAllByText(/Alergia registrada/)).toHaveLength(0);
    const alergias = await screen.findByTestId('alergias-notice');
    expect(alergias.getAttribute('data-alergias-estado')).toBe('nao_informado');
    const cobertura = await screen.findByTestId('safety-coverage');
    expect(cobertura.textContent).toContain('gestação');
  }, 120000);

  it('protocolo SEM dados clínicos na sessão: carrega direto, sem confirmação e sem alegar descarte', async () => {
    const user = userEvent.setup();
    montarPagina();
    await carregarProtocolo(user, 'Protocolo B');
    expect(screen.queryByTestId('troca-paciente')).toBeNull();
    const aviso = await screen.findByTestId('protocolo-recuperado');
    expect(within(aviso).queryByTestId('dados-descartados')).toBeNull();
    expect(screen.queryAllByText('Paracetamol', { selector: 'p' }).length).toBeGreaterThan(0);
    expect(within(aviso).getByTestId('a-preencher').textContent).toContain('alergias');
  }, 60000);

  it('dois protocolos CONSECUTIVOS: o segundo substitui o primeiro; com dados digitados no meio, a confirmação volta a ser exigida', async () => {
    const user = userEvent.setup();
    montarPagina();
    await carregarProtocolo(user, 'Protocolo B');
    expect(screen.queryAllByText('Paracetamol', { selector: 'p' }).length).toBeGreaterThan(0);
    await carregarProtocolo(user, 'Protocolo C (3 itens)'); // ainda sem dados clínicos: sem confirmação
    expect(screen.queryByTestId('troca-paciente')).toBeNull();
    expect(screen.queryAllByText('Paracetamol', { selector: 'p' })).toHaveLength(0);
    for (const m of ['Varfarina', 'ibuprofeno', 'Sertralina']) expect(screen.queryAllByText(m, { selector: 'p' }).length, m).toBeGreaterThan(0);

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Paciente C');
    await carregarProtocolo(user, 'Protocolo B');
    const banner = await screen.findByTestId('troca-paciente');
    expect(banner.textContent).toContain('nome');
    await user.click(screen.getByTestId('confirmar-troca'));
    expect(nomeAtual()).toBe('');
    expect(screen.queryAllByText('Varfarina', { selector: 'p' })).toHaveLength(0);
    expect(screen.queryAllByText('Paracetamol', { selector: 'p' }).length).toBeGreaterThan(0);
  }, 120000);

  it('protocolo ANTIGO sem entidade_id: itens recuperados, identidade não confirmada, dados anteriores descartados após confirmação', async () => {
    const user = userEvent.setup();
    montarPagina();
    await user.type(screen.getByPlaceholderText('Nome completo'), 'Paciente A');
    await carregarProtocolo(user, 'Protocolo antigo');
    await user.click(await screen.findByTestId('confirmar-troca'));
    expect(nomeAtual()).toBe('');
    const aviso = await screen.findByTestId('protocolo-recuperado');
    expect(aviso.textContent).toContain('2 item(ns) sem identificação de entidade');
    expect(screen.queryAllByText('Midazolam', { selector: 'p' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    const cobertura = await screen.findByTestId('safety-coverage');
    expect(cobertura.getAttribute('data-coverage-status')).toBe('parcial');
    expect(cobertura.textContent).toContain('sem ID de entidade');
  }, 90000);

  it('alternar entre protocolos com quantidades diferentes de medicamentos (3 → 1 → 2): sempre só os itens do protocolo atual', async () => {
    const user = userEvent.setup();
    montarPagina();
    const nItens = () => Number((screen.getByRole('tab', { name: /prescrição/i }).textContent ?? '').replace(/\D/g, ''));
    await carregarProtocolo(user, 'Protocolo C (3 itens)');
    expect(nItens()).toBe(3);
    await carregarProtocolo(user, 'Protocolo B');
    expect(nItens()).toBe(1);
    expect(screen.queryAllByText('Varfarina', { selector: 'p' })).toHaveLength(0);
    await carregarProtocolo(user, 'Protocolo antigo');
    expect(nItens()).toBe(2);
    expect(screen.queryAllByText('Paracetamol', { selector: 'p' })).toHaveLength(0);
    // a avaliação acompanha: o alerta Varfarina + AINE do protocolo C não sobrevive à troca
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    expect(screen.queryAllByText(/Varfarina \+ AINE/)).toHaveLength(0);
  }, 150000);

  it('o protocolo salvo continua guardando só itens (nenhum dado do paciente é persistido pela troca)', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt').mockReturnValue('Novo');
    montarPagina();
    // o medicamento entra ANTES do paciente completo (com idade+peso a tela abre a calculadora de dose, sem o botão de adicionar)
    await adicionarMedicamento(user, 'Losartana');
    await preencherPacienteA(user);
    await user.click(await screen.findByRole('button', { name: /salvar protocolo/i }));
    const salvos = JSON.parse(localStorage.getItem(CHAVE)!);
    const novo = salvos.find((p: { nome: string }) => p.nome === 'Novo');
    expect(Object.keys(novo).sort()).toEqual(['criado_em', 'descricao', 'id', 'itens', 'nome']);
    expect(JSON.stringify(novo)).not.toMatch(/Paciente A|alergia|gestante|lactante|peso/i);
    vi.restoreAllMocks();
  }, 90000);
});
