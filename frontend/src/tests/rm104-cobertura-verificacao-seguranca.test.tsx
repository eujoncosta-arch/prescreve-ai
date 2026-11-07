// ============================================================
// RM-104 — Cobertura explícita da verificação de segurança (achado C1).
// Antes: `.filter(Boolean)` descartava moléculas não reconhecidas em silêncio e
// "molecula_inexistente + varfarina" devolvia lista vazia, lida pela interface
// como "nenhum alerta de segurança". Agora o resultado declara o que foi e o que
// NÃO foi verificado, e a interface nunca mostra status de segurança completa
// quando a cobertura é incompleta. Teste offline.
// ============================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { runSafetyCheck, type SafetyCheckResult } from '@/lib/safety-rules';
import { describeSafetyCoverage, coberturaIncompleta } from '@/lib/safety-coverage';
import { SafetyCoverageNotice } from '@/components/modules/SafetyCoverageNotice';
import { drugRepository } from '@/lib/pharma-core/repository';
import { getAllDrugs } from '@/lib/pharma-database';
import { safetyResult, expectNoAlertCompleto } from '@/clinical-tests/framework';

const DESCONHECIDA = 'molecula_inexistente_xyz';

describe('RM-104 — 1. molécula conhecida + molécula conhecida: verificação completa', () => {
  const r = runSafetyCheck({ moleculas: ['varfarina', 'ibuprofeno'] });

  it('status completa, sem itens não verificados', () => {
    expect(r.status).toBe('completa');
    expect(r.verificacao_completa).toBe(true);
    expect(r.moleculas_verificadas.map(m => m.entrada)).toEqual(['varfarina', 'ibuprofeno']);
    expect(r.moleculas_nao_verificadas).toEqual([]);
    expect(r.combinacoes_nao_avaliadas).toEqual([]);
  });

  it('os alertas existentes continuam funcionando (varfarina + AINE = crítico)', () => {
    expect(r.alertas.some(a => a.tipo === 'interacao' && a.severidade === 'critical')).toBe(true);
  });
});

describe('RM-104 — 2. molécula desconhecida + molécula conhecida: o caso do achado C1', () => {
  const r = runSafetyCheck({ moleculas: [DESCONHECIDA, 'varfarina'] });

  it('não é completa nem "segura": status parcial e verificacao_completa=false', () => {
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
  });

  it('a desconhecida NÃO desaparece: fica listada com a identificação original', () => {
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: DESCONHECIDA, motivo: 'nao_reconhecida' }]);
    expect(r.moleculas_verificadas.map(m => m.entrada)).toEqual(['varfarina']);
  });

  it('informa qual combinação não pôde ser avaliada', () => {
    expect(r.combinacoes_nao_avaliadas).toEqual([{ a: DESCONHECIDA, b: 'varfarina', motivo: 'molecula_nao_verificada' }]);
    expect(r.mensagem).toContain('PARCIAL');
    expect(r.mensagem).toContain(DESCONHECIDA);
  });

  it('preserva a grafia exata digitada (caixa e espaços), sem reescrever', () => {
    const x = runSafetyCheck({ moleculas: ['  Molecula_Inexistente_XYZ ', 'varfarina'] });
    expect(x.moleculas_nao_verificadas[0].entrada).toBe('  Molecula_Inexistente_XYZ ');
  });

  it('não remove nem inventa alertas: os alertas são os mesmos de "varfarina" sozinha', () => {
    const sozinha = runSafetyCheck({ moleculas: ['varfarina'] });
    expect(r.alertas).toEqual(sozinha.alertas);
  });
});

describe('RM-104 — 3. duas moléculas desconhecidas', () => {
  const r = runSafetyCheck({ moleculas: ['desconhecida_a', 'desconhecida_b'] });

  it('nada foi verificado: status molecula_nao_reconhecida, ambas listadas, par não avaliado', () => {
    expect(r.status).toBe('molecula_nao_reconhecida');
    expect(r.verificacao_completa).toBe(false);
    expect(r.moleculas_verificadas).toEqual([]);
    expect(r.moleculas_nao_verificadas.map(m => m.entrada)).toEqual(['desconhecida_a', 'desconhecida_b']);
    expect(r.combinacoes_nao_avaliadas).toEqual([{ a: 'desconhecida_a', b: 'desconhecida_b', motivo: 'molecula_nao_verificada' }]);
    expect(r.mensagem).toContain('NÃO indica segurança');
  });
});

describe('RM-104 — 4. nome comercial não reconhecido', () => {
  it('marca fora dos sinônimos cadastrados NÃO é aceita por aproximação: não verificada', () => {
    const r = runSafetyCheck({ moleculas: ['MarcaComercialInexistente123', 'varfarina'] });
    expect(r.status).toBe('parcial');
    expect(r.moleculas_nao_verificadas[0]).toEqual({ entrada: 'MarcaComercialInexistente123', motivo: 'nao_reconhecida' });
  });

  it('nome parecido (prefixo/typo) de molécula real também não é confirmado por aproximação', () => {
    for (const quase of ['varfarinaa', 'warfarina', 'varfarina2']) {
      const r = runSafetyCheck({ moleculas: [quase, 'ibuprofeno'] });
      expect(r.status).toBe('parcial');
      expect(r.moleculas_nao_verificadas[0].entrada).toBe(quase);
    }
  });
});

describe('RM-104 — 5. sinônimo validado (cadastrado no repositório)', () => {
  it('um sinônimo realmente cadastrado é reconhecido e verificado', () => {
    const entidade = drugRepository.getAll().find(e => (e.activeIngredient.sinonimos ?? []).some(s => s.toLowerCase() === 'augmentin'));
    expect(entidade).toBeDefined();
    const r = runSafetyCheck({ moleculas: ['augmentin', 'varfarina'] });
    expect(r.status).toBe('completa');
    expect(r.moleculas_verificadas[0]).toMatchObject({ entrada: 'augmentin', id: entidade!.id, molecula: entidade!.activeIngredient.name, via: 'sinonimo', ambigua: false });
  });
});

describe('RM-104 — 6. nome vazio', () => {
  it('só vazio: dados insuficientes, nada verificado', () => {
    const r = runSafetyCheck({ moleculas: [''] });
    expect(r.status).toBe('dados_insuficientes');
    expect(r.verificacao_completa).toBe(false);
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: '', motivo: 'entrada_vazia' }]);
  });

  it('lista vazia: dados insuficientes (nunca "completa")', () => {
    const r = runSafetyCheck({ moleculas: [] });
    expect(r.status).toBe('dados_insuficientes');
    expect(r.verificacao_completa).toBe(false);
  });

  it('vazio junto de uma molécula real: parcial, com a entrada vazia registrada', () => {
    const r = runSafetyCheck({ moleculas: ['   ', 'varfarina'] });
    expect(r.status).toBe('parcial');
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: '   ', motivo: 'entrada_vazia' }]);
  });
});

describe('RM-104 — 7. entrada inválida', () => {
  it('"moleculas" que não é lista: estado de erro explícito, sem exceção', () => {
    for (const ruim of [null, undefined, 'varfarina', 42, {}]) {
      const r = runSafetyCheck({ moleculas: ruim as unknown as string[] });
      expect(r.status).toBe('erro');
      expect(r.erro).toBe('entrada_invalida');
      expect(r.verificacao_completa).toBe(false);
      expect(r.alertas).toEqual([]);
    }
  });

  it('o próprio input nulo/indefinido: erro', () => {
    expect(runSafetyCheck(null as unknown as { moleculas: string[] }).status).toBe('erro');
    expect(runSafetyCheck(undefined as unknown as { moleculas: string[] }).status).toBe('erro');
  });

  it('itens que não são texto: registrados como entrada inválida, sem lançar exceção', () => {
    const r = runSafetyCheck({ moleculas: [123, null, { a: 1 }, 'varfarina'] as unknown as string[] });
    expect(r.status).toBe('parcial');
    expect(r.moleculas_nao_verificadas.map(m => m.motivo)).toEqual(['entrada_invalida', 'entrada_invalida', 'entrada_invalida']);
    expect(r.moleculas_nao_verificadas[0].entrada).toBe('123');
    expect(r.moleculas_verificadas.map(m => m.entrada)).toEqual(['varfarina']);
  });

  it('só itens inválidos: dados insuficientes', () => {
    expect(runSafetyCheck({ moleculas: [123, null] as unknown as string[] }).status).toBe('dados_insuficientes');
  });

  it('exceção interna vira estado de erro, nunca resultado "vazio e seguro"', () => {
    const armadilha = { moleculas: ['varfarina'], get gestante(): boolean { throw new Error('falha simulada'); } };
    const r = runSafetyCheck(armadilha as unknown as { moleculas: string[] });
    expect(r.status).toBe('erro');
    expect(r.erro).toBe('falha simulada');
    expect(r.verificacao_completa).toBe(false);
    expect(r.mensagem).toContain('Não considere a prescrição verificada');
  });
});

describe('RM-104 — 8 e 9. prescrição com vários medicamentos, um não reconhecido: alertas válidos + itens não verificados', () => {
  // RM-105.1: 'tramadol' casa com mais de uma entidade (geral e paliativo); com os IDs a identidade é confirmada
  // e o caso continua isolando o efeito da molécula desconhecida.
  const r = runSafetyCheck({ moleculas: ['sertralina', 'tramadol', 'varfarina', DESCONHECIDA], entidade_ids: ['sertralina', 'tramadol', 'varfarina', undefined] });

  it('mantém os alertas válidos das reconhecidas (sertralina + tramadol)', () => {
    expect(r.alertas.some(a => /sertralina/i.test(a.titulo) && /tramadol/i.test(a.titulo))).toBe(true);
  });

  it('e, ao mesmo tempo, declara o item não verificado e a cobertura parcial', () => {
    expect(r.alertas.length).toBeGreaterThan(0);
    expect(r.moleculas_nao_verificadas.map(m => m.entrada)).toEqual([DESCONHECIDA]);
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
  });

  it('lista exatamente as combinações com a desconhecida (3 pares), e nenhuma outra', () => {
    expect(r.combinacoes_nao_avaliadas).toHaveLength(3);
    expect(r.combinacoes_nao_avaliadas.every(c => c.a === DESCONHECIDA || c.b === DESCONHECIDA)).toBe(true);
  });
});

describe('RM-104 — identidade: rótulos de classe NÃO confirmam uma molécula (governança de sinônimos: RM-105)', () => {
  it('"ieca" é termo de classe: não verificado, status parcial, sem escolher enalapril/ramipril/perindopril', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'varfarina'] });
    expect(r.moleculas_verificadas.map(v => v.entrada)).toEqual(['varfarina']);
    expect(r.moleculas_nao_verificadas).toEqual([{ entrada: 'ieca', motivo: 'termo_nao_molecular', categoria_termo: 'classe_terapeutica' }]);
    expect(r.status).toBe('parcial');
    expect(r.verificacao_completa).toBe(false);
    expect(r.combinacoes_nao_avaliadas).toEqual([{ a: 'ieca', b: 'varfarina', motivo: 'molecula_nao_verificada' }]);
  });

  it('as regras fixas por texto continuam gerando o alerta do par, mas a cobertura é parcial', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'aine'] });
    expect(r.alertas.some(a => a.tipo === 'interacao')).toBe(true);
    expect(r.status).toBe('molecula_nao_reconhecida');
    expect(r.verificacao_completa).toBe(false);
  });

  it('na interface: o termo de classe aparece como não verificado, nunca com selo negativo', () => {
    const r = runSafetyCheck({ moleculas: ['isrs', 'paracetamol'] });
    const v = describeSafetyCoverage(r, 2);
    expect(v.incompleta).toBe(true);
    expect(v.mostrarSeloNegativo).toBe(false);
    expect(v.detalhes.join(' ')).toContain('termo de classe/indicação');
  });

  it('RM-105.1: variantes da MESMA molécula SEM ID não confirmam identidade (parcial); COM ID são confirmadas', () => {
    const semId = runSafetyCheck({ moleculas: ['azitromicina'] });
    expect(semId.status).toBe('parcial');
    expect(semId.moleculas_verificadas[0].ambigua).toBe(true);
    expect(semId.moleculas_verificadas[0].motivo_ambiguidade).toBe('variantes_sem_id');
    const comId = runSafetyCheck({ moleculas: ['azitromicina'], entidade_ids: ['azitromicina'] });
    expect(comId.status).toBe('completa');
    expect(comId.moleculas_verificadas[0].ambigua).toBe(false);
  });

  it('moléculas diferentes que dividem o nome (desogestrel isolado × combinação com etinilestradiol) ficam parciais', () => {
    const r = runSafetyCheck({ moleculas: ['desogestrel'] });
    expect(r.moleculas_verificadas[0].ambigua).toBe(true);
    expect(r.status).toBe('parcial');
  });

  it('as 382 moléculas continuam reconhecidas; com ID todas são confirmadas; só nome-sem-ID ambíguo fica parcial (RM-105.1)', () => {
    expect(getAllDrugs().every(d => runSafetyCheck({ moleculas: [d.molecula] }).moleculas_verificadas.length === 1)).toBe(true);
    expect(getAllDrugs().every(d => runSafetyCheck({ moleculas: [d.molecula], entidade_ids: [d.id] }).status === 'completa')).toBe(true);
    const naoCompletas = getAllDrugs()
      .map(d => ({ d, r: runSafetyCheck({ moleculas: [d.molecula] }) }))
      .filter(x => x.r.status !== 'completa');
    expect(naoCompletas.every(x => x.r.moleculas_verificadas[0].ambigua)).toBe(true);
    expect(naoCompletas.length).toBeGreaterThan(0);
  });
});

describe('RM-104 — regras fixas por texto continuam valendo para entradas não reconhecidas', () => {
  it('a regra fixa ARM (espironolactona sem K+) dispara mesmo ao lado de uma molécula desconhecida', () => {
    const r = runSafetyCheck({ moleculas: ['espironolactona', DESCONHECIDA] });
    expect(r.alertas.some(a => a.id === 'arm-k-nao-informado')).toBe(true);
    expect(r.status).toBe('parcial');
  });
});

describe('RM-104 — 10. a interface nunca apresenta segurança completa quando a cobertura é parcial', () => {
  const parcial: SafetyCheckResult = runSafetyCheck({ moleculas: [DESCONHECIDA, 'varfarina'] });
  const completaSemAlerta: SafetyCheckResult = runSafetyCheck({ moleculas: ['paracetamol'] });

  it('premissa do teste: parcial sem alertas × completa sem alertas', () => {
    expect(runSafetyCheck({ moleculas: [DESCONHECIDA, 'paracetamol'] }).alertas).toEqual([]);
    expect(completaSemAlerta.status).toBe('completa');
    expect(completaSemAlerta.alertas).toEqual([]);
  });

  it('parcial SEM nenhum alerta: aviso PARCIAL, sem selo "nenhum alerta"', () => {
    const semAlerta = runSafetyCheck({ moleculas: [DESCONHECIDA, 'paracetamol'] });
    render(<SafetyCoverageNotice result={semAlerta} itensNaReceita={2} />);
    const el = screen.getByTestId('safety-coverage');
    expect(el.getAttribute('data-coverage-status')).toBe('parcial');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('PARCIAL');
    expect(el.textContent).toContain(DESCONHECIDA);
    expect(el.textContent).not.toMatch(/Nenhum alerta/i);
  });

  it.each([
    ['molecula_nao_reconhecida', runSafetyCheck({ moleculas: ['desconhecida_a', 'desconhecida_b'] })],
    ['dados_insuficientes', runSafetyCheck({ moleculas: [''] })],
    ['erro', runSafetyCheck({ moleculas: null as unknown as string[] })],
    ['parcial', parcial],
  ])('status %s: nunca mostra "Nenhum alerta" nem o selo negativo', (_nome, resultado) => {
    const v = describeSafetyCoverage(resultado, 1);
    expect(v.mostrarSeloNegativo).toBe(false);
    expect(v.incompleta).toBe(true);
    expect(coberturaIncompleta(resultado)).toBe(true);
    const { container, unmount } = render(<SafetyCoverageNotice result={resultado} itensNaReceita={1} />);
    expect(container.textContent).not.toMatch(/Nenhum alerta/i);
    unmount();
  });

  it('só a verificação COMPLETA sem alertas mostra o selo, e com ressalva de que não garante segurança', () => {
    // RM-105.2.1: com alergias NÃO informadas o selo não aparece; com a ausência de alergias informada, aparece com ressalva.
    const semAlergias = describeSafetyCoverage(completaSemAlerta, 1);
    expect(semAlergias.mostrarSeloNegativo).toBe(false);
    expect(semAlergias.titulo).toContain('alergias não avaliadas');
    const v = describeSafetyCoverage(runSafetyCheck({ moleculas: ['paracetamol'], alergias: { status: 'sem_alergias_conhecidas' } }), 1);
    expect(v.mostrarSeloNegativo).toBe(true);
    expect(v.incompleta).toBe(false);
    expect(v.detalhes.join(' ')).toContain('não garante segurança');
  });

  it('completa COM alertas: sem selo negativo', () => {
    const v = describeSafetyCoverage(runSafetyCheck({ moleculas: ['varfarina', 'ibuprofeno'] }), 2);
    expect(v.mostrarSeloNegativo).toBe(false);
  });

  it('sem medicamentos na receita: neutro, sem afirmar verificação', () => {
    const v = describeSafetyCoverage(null, 0);
    expect(v.tone).toBe('neutral');
    expect(v.mostrarSeloNegativo).toBe(false);
  });
});

describe('RM-104 — telas consumidoras interpretam o novo contrato', () => {
  const pagina = fs.readFileSync(path.resolve(__dirname, '../app/prescricao-rapida/page.tsx'), 'utf8');

  it('a tela de prescrição guarda o RESULTADO (com cobertura), não só a lista de alertas', () => {
    expect(pagina).toContain('useState<SafetyCheckResult | null>');
    expect(pagina).toContain('<SafetyCoverageNotice result={safetyResult}');
  });

  it('a regra antiga "lista vazia = nenhum alerta de segurança / prescrição verificada" foi removida', () => {
    expect(pagina).not.toContain('Nenhum alerta de segurança');
    expect(pagina).not.toContain("'Prescrição verificada'");
    expect(pagina).not.toMatch(/safetyAlerts\.length === 0 \?/);
  });

  it('a aba de segurança sinaliza cobertura incompleta e a receita exibe o aviso apenas na tela (fora da área impressa)', () => {
    expect(pagina).toContain('coberturaIncompleta(safetyResult)');
    // RM-105.2: a pré-visualização foi extraída para componentes próprios (receita do paciente × anexo do prescritor).
    const preview = fs.readFileSync(path.resolve(__dirname, '../components/modules/PrescriptionPrintPreview.tsx'), 'utf8');
    const receita = fs.readFileSync(path.resolve(__dirname, '../components/modules/ReceitaPaciente.tsx'), 'utf8');
    expect(pagina).toContain('<PrescriptionPrintPreview');
    const iAviso = preview.indexOf('data-testid="print-safety-warning"');
    const iReceita = preview.indexOf('<ReceitaPaciente');
    expect(iAviso).toBeGreaterThan(-1);
    expect(iAviso).toBeLessThan(iReceita); // fica no cabeçalho de controles (print:hidden), antes da receita
    expect(preview).toContain('print:hidden');
    expect(receita).toContain('id="print-area"');
    expect(receita).not.toContain('print-safety-warning'); // a receita do paciente nunca recebe o aviso
  });

  it('framework de casos clínicos: ausência esperada só passa com verificação completa', () => {
    const parcial = safetyResult({ moleculas: [DESCONHECIDA, 'paracetamol'] });
    expect(parcial.alertas).toEqual([]);
    expect(expectNoAlertCompleto(parcial, { tipo: 'interacao' }).status).toBe('FAIL');
    const completa = safetyResult({ moleculas: ['paracetamol'] });
    expect(expectNoAlertCompleto(completa, { tipo: 'interacao' }).status).toBe('PASS');
  });
});
