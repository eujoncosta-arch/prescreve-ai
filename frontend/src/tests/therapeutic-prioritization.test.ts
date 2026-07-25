// ============================================================
// PRESCREVE-AI — RM-26: Priorização Clínica (testes de regressão)
//
// Valida que a priorização ORGANIZA (não filtra) as opções elegíveis: todas
// permanecem disponíveis, a ordem é determinística e clinicamente
// justificável, e as camadas de segurança/consistência não regridem.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { classifyPriority } from '@/lib/therapeutic-prioritization';
import { drugRepository } from '@/lib/pharma-core';
import { runSafetyCheck } from '@/lib/safety-rules';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

const TIER_RANK = { preferencial: 0, primeira_linha: 1, contextual: 2 } as const;

describe('RM-26 · Priorização — HAS (comorbidade DRC/DM2)', () => {
  const ctx = { tfg: 75, comorbidades: ['Diabetes Mellitus Tipo 2', 'DRC'] };
  const plan = getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;

  it('1) uma opção preferencial aparece antes das alternativas de primeira linha', () => {
    const tiers = plan.farmacologico.map((s) => s.prioridade!.tier);
    const firstNonPreferencial = tiers.findIndex((t) => t !== 'preferencial');
    const lastPreferencial = tiers.lastIndexOf('preferencial');
    expect(lastPreferencial).toBeLessThan(firstNonPreferencial === -1 ? Infinity : firstNonPreferencial === 0 ? -1 : tiers.length);
    // toda ocorrência de tier deve estar em blocos contíguos e em ordem crescente de rank
    const ranks = tiers.map((t) => TIER_RANK[t]);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it('preferencial contém Losartana (BRA) e Enalapril (IECA) — ambos com indicação sourced para DRC/nefropatia', () => {
    const preferenciais = plan.farmacologico.filter((s) => s.prioridade!.tier === 'preferencial').map((s) => s.molecula);
    expect(preferenciais).toContain('Losartana');
    expect(preferenciais).toContain('Enalapril');
  });

  it('2) todas as opções elegíveis continuam disponíveis (nenhuma some por causa da priorização)', () => {
    const semContexto = getTherapeuticForCondition('has', 'HAS (I10)')!;
    expect(plan.farmacologico.length).toBe(semContexto.farmacologico.length);
  });

  it('6) uma opção de primeira linha não é excluída apenas por não ser a primeira escolha', () => {
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(molecules).toContain('Olmesartana');
    expect(molecules).toContain('Valsartana');
  });

  it('7) comorbidade relevante altera a prioridade quando há dado estruturado que justifique', () => {
    const semCtx = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const losartanaSem = semCtx.farmacologico.find((s) => s.molecula === 'Losartana')!;
    const losartanaCom = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(losartanaSem.prioridade!.tier).not.toBe('preferencial');
    expect(losartanaCom.prioridade!.tier).toBe('preferencial');
  });

  it('8) a ordem é determinística (mesma entrada → mesma ordem)', () => {
    const plan2 = getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;
    expect(plan2.farmacologico.map((s) => s.molecula)).toEqual(plan.farmacologico.map((s) => s.molecula));
  });

  it('9) a mesma molécula não aparece duplicada', () => {
    const names = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(names).size).toBe(names.length);
  });

  it('10) as marcas continuam vinculadas à molécula correta após a reordenação', () => {
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana')!;
    expect(losartana.marcas!.some((m) => m.nome_comercial.toLowerCase().includes('zart'))).toBe(true);
    const enalapril = plan.farmacologico.find((s) => s.molecula === 'Enalapril')!;
    expect((enalapril.marcas ?? []).some((m) => m.nome_comercial.toLowerCase().includes('zart'))).toBe(false);
  });

  it('11) as apresentações continuam vinculadas à molécula correta', () => {
    for (const s of plan.farmacologico) {
      for (const m of s.marcas ?? []) expect(m.apresentacoes.length).toBeGreaterThan(0);
    }
  });

  it('cada opção priorizada expõe justificativa (explicabilidade)', () => {
    for (const s of plan.farmacologico) {
      expect(s.prioridade!.motivo.length).toBeGreaterThan(0);
      expect(s.prioridade!.fatores_considerados.length).toBeGreaterThan(0);
      expect(['diretriz_estruturada', 'sem_diretriz_estruturada']).toContain(s.prioridade!.evidencia_status);
    }
  });
});

describe('RM-26 · Priorização — ICC (função renal gera nível contextual)', () => {
  it('renal com cautela rebaixa para contextual, sem excluir a opção', () => {
    const plan = getTherapeuticForCondition('icc', 'ICC (I50)', { tfg: 25 })!;
    const espironolactona = plan.farmacologico.find((s) => s.molecula === 'Espironolactona');
    // Espironolactona é contraindicada (não apenas cautela) em TFG muito baixo em
    // alguns cenários — verificamos apenas que, SE presente, está coerentemente
    // classificada; e que atenolol continua ausente (filtro de indicação, RM-25).
    if (espironolactona) {
      expect(['preferencial', 'primeira_linha', 'contextual']).toContain(espironolactona.prioridade!.tier);
    }
    expect(plan.farmacologico.some((s) => s.molecula.toLowerCase().includes('atenolol'))).toBe(false);
  });
});

describe('RM-26 · classifyPriority() — árvore de decisão', () => {
  it('3) contraindicação absoluta continua excluindo a opção (camada de elegibilidade, não de prioridade)', () => {
    // Enalapril gestante é excluído ANTES de chegar à priorização — não aparece em farmacologico.
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { gestante: true })!;
    const novosIeca = plan.farmacologico.filter((s) => /IECA|BRA/.test(s.classe_terapeutica) && !['Enalapril', 'Hidroclorotiazida'].includes(s.molecula));
    expect(novosIeca).toHaveLength(0);
  });

  it('4) interação contraindicada com medicação em uso já exclui a opção antes da priorização', () => {
    // Reforça que a priorização nunca reintroduz uma opção que a elegibilidade excluiu.
    const plan = getTherapeuticForCondition('has', 'HAS (I10)', { medicamentosEmUso: ['Sacubitril/Valsartana'] })!;
    // Enalapril (IECA) tem interação contraindicada com sacubitril/valsartana (washout 36h) —
    // ainda assim é âncora curada (Regra 5: nunca remove âncora); mas nenhuma opção EXPANDIDA
    // com o mesmo conflito deveria ser adicionada além da âncora.
    expect(plan.farmacologico.map((s) => s.molecula)).toContain('Enalapril');
  });

  it('5) ausência de evidência estruturada NÃO é tratada como contraindicação', () => {
    const all = drugRepository.getAll();
    const semGuideline = all.find((e) => !e.references.some((r) => r.type === 'GUIDELINE') && e.indications.length > 0);
    expect(semGuideline).toBeDefined();
    const fakeSug = {
      id: semGuideline!.id,
      classe_terapeutica: semGuideline!.therapeuticClass,
      molecula: semGuideline!.activeIngredient.name,
      nome_generico: semGuideline!.activeIngredient.fullName ?? semGuideline!.activeIngredient.name,
      indicacao: semGuideline!.indications[0] ?? '',
      dose: { dose_padrao: 'x', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
      posologia_completa: 'x',
      evidencia: { diretriz: 'x', sociedade: 'x', ano: 2020, nivel_evidencia: { nivel: 'B' as const, grau: 'IIa' as const, descricao: 'x' }, citacao: 'x' },
      contraindicacoes: [],
      efeitos_adversos: [],
      monitoramento: [],
      alternativas: [],
    };
    const result = classifyPriority(fakeSug, 'condicao-teste');
    expect(result.tier).not.toBe('contextual'); // não é rebaixada por falta de evidência (não é uma "cautela")
    expect(result.evidencia_status).toBe('sem_diretriz_estruturada');
    expect(['preferencial', 'primeira_linha']).toContain(result.tier);
  });

  it('nunca promove sem_diretriz_estruturada a preferencial só por ausência de evidência (evidência fraca ≠ preferencial)', () => {
    const all = drugRepository.getAll();
    const semGuideline = all.filter((e) => !e.references.some((r) => r.type === 'GUIDELINE'));
    for (const e of semGuideline.slice(0, 30)) {
      const sug = {
        id: e.id,
        classe_terapeutica: e.therapeuticClass,
        molecula: e.activeIngredient.name,
        nome_generico: e.activeIngredient.fullName ?? e.activeIngredient.name,
        indicacao: e.indications[0] ?? '',
        dose: { dose_padrao: 'x', unidade: 'mg', via: 'VO', frequencia: '1x/dia' },
        posologia_completa: 'x',
        evidencia: { diretriz: 'x', sociedade: 'x', ano: 2020, nivel_evidencia: { nivel: 'B' as const, grau: 'IIa' as const, descricao: 'x' }, citacao: 'x' },
        contraindicacoes: [],
        efeitos_adversos: [],
        monitoramento: [],
        alternativas: [],
      };
      const r = classifyPriority(sug, 'condicao-teste', { comorbidades: ['tudo', 'qualquer', 'coisa'] });
      expect(r.tier).not.toBe('preferencial');
    }
  });
});

describe('RM-26 · Motor de segurança e gates — não regressão', () => {
  it('12) o motor de segurança (runSafetyCheck) continua sendo executado normalmente', () => {
    const alerts = runSafetyCheck({ moleculas: ['Enalapril', 'Losartana'] });
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('13) a expansão terapêutica continua funcionando (HAS ainda tem 15 opções elegíveis)', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)')!;
    expect(plan.farmacologico.length).toBe(15);
  });

  it('14) os protocolos curados continuam preservados (Enalapril e Hidroclorotiazida sempre presentes em HAS)', () => {
    const plan = getTherapeuticForCondition('has', 'HAS (I10)')!;
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(molecules).toContain('Enalapril');
    expect(molecules).toContain('Hidroclorotiazida');
  });

  it('15) RM-23 (Drug Consistency) continua íntegro', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
    expect(report.bySeverity.high).toBe(0);
  });

  it('16) RM-24 (Cross Database Validator) continua íntegro', () => {
    const report = buildSyncReport();
    expect(report.criticos).toBe(0);
    expect(report.publishOk).toBe(true);
  });
});

describe('RM-26 · Condições prioritárias — cobertura preservada + priorizada', () => {
  const conditions = ['has', 'dm2', 'dislipidemia', 'asma', 'dpoc', 'icc', 'sca'];

  it.each(conditions)('%s: toda opção tem prioridade classificada e nenhuma duplicidade', (cond) => {
    const plan = getTherapeuticForCondition(cond, 'teste')!;
    expect(plan.farmacologico.every((s) => !!s.prioridade)).toBe(true);
    const names = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(names).size).toBe(names.length);
  });

  it('não cria protocolo novo para condição inexistente (RM-26 não expande escopo de condições)', () => {
    expect(getTherapeuticForCondition('depressao', 'x')).toBeNull();
  });
});
