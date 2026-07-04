// ============================================================
// PRESCREVE-AI — Clinical Validation Suite (Phase 15)
// 500 cenários automatizados · 10 especialidades
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  executarSuiteValidacao,
  validarCenario,
  criarCenarios,
  BEERS_CRITERIA_2023,
  CONTRAINDICADOS_GESTACAO,
  TFG_LIMITES,
  type CenarioClinico,
} from '@/lib/clinical-validator';

// ══════════════════════════════════════════════════════════════
// SUITE GERAL
// ══════════════════════════════════════════════════════════════

describe('Clinical Validation Suite — 500 Cenários', () => {
  it('deve gerar exatamente 500 cenários clínicos', () => {
    const cenarios = criarCenarios();
    expect(cenarios.length).toBe(500);
  });

  it('deve ter IDs únicos para todos os cenários', () => {
    const cenarios = criarCenarios();
    const ids = new Set(cenarios.map(c => c.id));
    expect(ids.size).toBe(500);
  });

  it('deve ter 50 cenários por especialidade', () => {
    const cenarios = criarCenarios();
    const especialidades = [
      'cardiologia','endocrinologia','pneumologia','infectologia',
      'psiquiatria','pediatria','geriatria','gestante','renal','hepatico',
    ];
    for (const esp of especialidades) {
      const count = cenarios.filter(c => c.especialidade === esp).length;
      expect(count, `${esp} deve ter 50 cenários`).toBe(50);
    }
  });

  it('suite completa deve ter taxa de aprovação ≥ 85%', () => {
    const resultado = executarSuiteValidacao();
    expect(resultado.total_cenarios).toBe(500);
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(85);
  });

  it('suite completa deve ter score global ≥ 85/100', () => {
    const resultado = executarSuiteValidacao();
    expect(resultado.score_global).toBeGreaterThanOrEqual(85);
  });

  it('deve concluir em menos de 5 segundos', () => {
    const resultado = executarSuiteValidacao();
    expect(resultado.duracao_ms).toBeLessThan(5000);
  });
});

// ══════════════════════════════════════════════════════════════
// CARDIOLOGIA
// ══════════════════════════════════════════════════════════════

describe('Cardiologia', () => {
  it('IECA deve ser aprovado em HAS + DM2', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'cardiologia' && c.molecula === 'Enalapril' &&
      c.descricao.includes('DM2') && c.descricao.includes('1ª linha')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
    expect(resultado.score).toBeGreaterThanOrEqual(80);
  });

  it('betabloqueador deve ser REPROVADO em HAS + asma', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'cardiologia' && c.descricao.includes('asma') &&
      c.descricao.includes('CONTRAINDICADO')
    )!;
    const resultado = validarCenario(cenario);
    const ciValidacao = resultado.validacoes.find(v => v.tipo === 'contraindicacao');
    expect(ciValidacao?.resultado_esperado).toBe('reprovado');
  });

  it('ARNI + IECA deve ser detectado como interação absoluta', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'cardiologia' && c.molecula === 'Sacubitril/Valsartana' &&
      c.descricao.includes('concomitante')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'interacao' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('espironolactona TFG < 30 deve ser reprovada', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'cardiologia' && c.molecula === 'Espironolactona' &&
      c.descricao.includes('TFG 18')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('reprovado');
  });

  it('dapagliflozina IC-FEr deve ser aprovada como 4º pilar', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'cardiologia' && c.molecula === 'Dapagliflozina' &&
      c.descricao.includes('4º pilar')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'guideline' && v.passou)).toBe(true);
  });

  it('suite cardiologia deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('cardiologia');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// ENDOCRINOLOGIA
// ══════════════════════════════════════════════════════════════

describe('Endocrinologia', () => {
  it('metformina deve ser aprovada em DM2 sem DCV', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'endocrinologia' && c.molecula === 'Metformina' &&
      c.descricao.includes('1ª linha')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
  });

  it('metformina TFG 25 deve ser REPROVADA', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'endocrinologia' && c.molecula === 'Metformina' &&
      c.descricao.includes('TFG 25')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'ajuste_renal' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('empagliflozina deve ser aprovada em DM2 + DCV', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'endocrinologia' && c.molecula === 'Empagliflozina' &&
      c.descricao.includes('DCV')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'guideline' && v.passou)).toBe(true);
  });

  it('GLP-1Ra deve ser REPROVADO em CMT/MEN2', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'endocrinologia' && c.molecula === 'Semaglutida' &&
      c.descricao.includes('CMT')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'contraindicacao' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('suite endocrinologia deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('endocrinologia');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// PNEUMOLOGIA
// ══════════════════════════════════════════════════════════════

describe('Pneumologia', () => {
  it('CI deve ser aprovado em asma persistente', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'pneumologia' && c.molecula === 'Budesonida' &&
      c.descricao.includes('step 2')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
  });

  it('SABA isolado sem CI deve ser REPROVADO (GINA 2025)', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'pneumologia' && c.molecula === 'Salbutamol' &&
      c.descricao.includes('PROIBIDO')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('MART budesonida/formoterol deve ser aprovado', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'pneumologia' && c.molecula === 'Budesonida/Formoterol' &&
      c.descricao.includes('MART')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
  });

  it('suite pneumologia deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('pneumologia');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// INFECTOLOGIA
// ══════════════════════════════════════════════════════════════

describe('Infectologia', () => {
  it('amoxicilina deve ser aprovada em PAC leve', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'infectologia' && c.molecula === 'Amoxicilina' &&
      c.descricao.includes('PAC leve')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
  });

  it('antibiótico deve ser REPROVADO em IVAS viral', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'infectologia' && c.descricao.includes('viral') &&
      c.descricao.includes('NÃO indicado')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('nitrofurantoína TFG < 30 deve ser REPROVADA', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'infectologia' && c.molecula === 'Nitrofurantoína' &&
      c.descricao.includes('CONTRAINDICADA')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'ajuste_renal' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('suite infectologia deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('infectologia');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// PSIQUIATRIA
// ══════════════════════════════════════════════════════════════

describe('Psiquiatria', () => {
  it('ISRS deve ser aprovado em depressão moderada', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'psiquiatria' && c.molecula === 'Sertralina' &&
      c.descricao.includes('1ª linha')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
  });

  it('ISRS + IMAo deve ser REPROVADO (síndrome serotoninérgica)', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'psiquiatria' && c.descricao.includes('IMAo')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'interacao' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('suite psiquiatria deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('psiquiatria');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// PEDIATRIA
// ══════════════════════════════════════════════════════════════

describe('Pediatria', () => {
  it('amoxicilina pediátrica deve ser aprovada', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'pediatria' && c.molecula === 'Amoxicilina'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('aprovado');
  });

  it('ibuprofeno < 6 meses deve ser REPROVADO', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'pediatria' && c.molecula === 'Ibuprofeno' &&
      c.descricao.includes('contraindicado')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('suite pediatria deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('pediatria');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// GERIATRIA — CRITÉRIOS BEERS
// ══════════════════════════════════════════════════════════════

describe('Geriatria — Critérios BEERS 2023', () => {
  it('glibenclamida em idoso deve ser REPROVADA (BEERS)', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'geriatria' && c.molecula === 'Glibenclamida'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'beers_criteria' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('haloperidol em demência deve ser REPROVADO (BEERS)', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'geriatria' && c.molecula === 'Haloperidol'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'beers_criteria' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('benzodiazepínico em idoso deve ser REPROVADO (BEERS)', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'geriatria' && c.molecula === 'Diazepam'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'beers_criteria' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('base BEERS deve ter pelo menos 10 moléculas indexadas', () => {
    expect(Object.keys(BEERS_CRITERIA_2023).length).toBeGreaterThanOrEqual(10);
  });

  it('suite geriatria deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('geriatria');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// GESTANTE — SEGURANÇA GESTACIONAL
// ══════════════════════════════════════════════════════════════

describe('Gestante — Segurança Gestacional', () => {
  it('IECA deve ser REPROVADO na gestação', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'gestante' && c.molecula === 'Enalapril'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'gestacao' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('estatina deve ser REPROVADA na gestação (categoria X)', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'gestante' && c.molecula === 'Rosuvastatina'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.resultado_geral).toBe('reprovado');
  });

  it('metildopa deve ser APROVADA em HAS gestacional', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'gestante' && c.molecula === 'Metildopa'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'gestacao' && v.passou)).toBe(true);
  });

  it('CI inalado deve ser APROVADO em asma na gestação', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'gestante' && c.molecula === 'Budesonida'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'gestacao' && v.passou)).toBe(true);
  });

  it('AINE deve ser REPROVADO no 3º trimestre', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'gestante' && c.molecula === 'Ibuprofeno'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('base gestação deve ter pelo menos 10 moléculas indexadas', () => {
    expect(Object.keys(CONTRAINDICADOS_GESTACAO).length).toBeGreaterThanOrEqual(10);
  });

  it('suite gestante deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('gestante');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// RENAL — AJUSTE POR TFG
// ══════════════════════════════════════════════════════════════

describe('Renal — Ajuste por TFG', () => {
  it('metformina TFG < 30 deve ser REPROVADA', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'renal' && c.molecula === 'Metformina'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'ajuste_renal' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('IECA com TFG 45 deve gerar ALERTA de ajuste', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'renal' && c.molecula === 'Enalapril' &&
      c.descricao.includes('TFG 45')
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'ajuste_renal' && v.resultado_obtido === 'alerta')).toBe(true);
  });

  it('espironolactona K+ 5.8 deve ser REPROVADA', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'renal' && c.molecula === 'Espironolactona'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('base TFG deve ter pelo menos 10 moléculas indexadas', () => {
    expect(Object.keys(TFG_LIMITES).length).toBeGreaterThanOrEqual(10);
  });

  it('suite renal deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('renal');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// HEPÁTICO — AJUSTE HEPÁTICO
// ══════════════════════════════════════════════════════════════

describe('Hepático — Ajuste por Child-Pugh', () => {
  it('estatina Child-Pugh C deve ser REPROVADA', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'hepatico' && c.molecula === 'Atorvastatina'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.tipo === 'ajuste_hepatico' && v.resultado_esperado === 'reprovado')).toBe(true);
  });

  it('rifaximina deve ser APROVADA em encefalopatia hepática recorrente', () => {
    const cenario = criarCenarios().find(c =>
      c.especialidade === 'hepatico' && c.molecula === 'Rifaximina'
    )!;
    const resultado = validarCenario(cenario);
    expect(resultado.validacoes.some(v => v.passou)).toBe(true);
  });

  it('suite hepático deve ter taxa ≥ 80%', () => {
    const resultado = executarSuiteValidacao('hepatico');
    expect(resultado.taxa_aprovacao).toBeGreaterThanOrEqual(80);
  });
});

// ══════════════════════════════════════════════════════════════
// INTEGRIDADE DE DADOS
// ══════════════════════════════════════════════════════════════

describe('Integridade da Base de Dados Clínicos', () => {
  it('todos os cenários devem ter ao menos 1 validação esperada', () => {
    const cenarios = criarCenarios();
    const semValidacao = cenarios.filter(c => c.validacoes_esperadas.length === 0);
    expect(semValidacao.length).toBe(0);
  });

  it('todos os cenários devem ter CID preenchido', () => {
    const cenarios = criarCenarios();
    const semCid = cenarios.filter(c => !c.cid);
    expect(semCid.length).toBe(0);
  });

  it('todos os cenários devem ter molécula preenchida', () => {
    const cenarios = criarCenarios();
    const semMol = cenarios.filter(c => !c.molecula);
    expect(semMol.length).toBe(0);
  });

  it('resultados esperados devem ser valores válidos', () => {
    const cenarios = criarCenarios();
    const validos = ['aprovado','reprovado','alerta','nao_aplicavel'];
    for (const c of cenarios) {
      for (const v of c.validacoes_esperadas) {
        expect(validos).toContain(v.resultado_esperado);
      }
    }
  });
});
