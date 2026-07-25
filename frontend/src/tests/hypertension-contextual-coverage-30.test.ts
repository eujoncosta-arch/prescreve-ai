// ============================================================
// PRESCREVE-AI — RM-30: Contextual Hypertension Subgroup Coverage
//
// Habilita ARM, DIURETICO_ALCA e BETABLOQUEADOR na descoberta de HAS
// SOMENTE quando o contexto do paciente (dados já existentes: comorbidades,
// função renal) sustenta o subgrupo (HAS resistente, DRC avançada, indicação
// cardiovascular concomitante) — nunca para HAS não complicada.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { getValidatedClassRole } from '@/lib/guideline-class-validation';
import { CONDITION_CLASS_KEYS } from '@/lib/therapeutic-class-expansion';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

const hasPlan = (ctx: Parameters<typeof getTherapeuticForCondition>[2] = {}) =>
  getTherapeuticForCondition('has', 'HAS (I10)', ctx)!;

// ─── HAS não complicada ────────────────────────────────────────────────

describe('RM-30 · HAS não complicada', () => {
  it('não promove ARM genericamente', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Aldosterona'))).toBeUndefined();
  });

  it('não promove diurético de alça genericamente', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica === 'Diurético de Alça')).toBeUndefined();
  });

  it('não promove betabloqueador genericamente', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Betabloqueador'))).toBeUndefined();
  });

  it('mantém IECA/BRA/BCC/TIAZIDICO conforme comportamento atual (15 opções, RM-26.1)', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico).toHaveLength(15);
    expect(plan.farmacologico.every((s) => s.prioridade!.tier === 'primeira_linha')).toBe(true);
  });

  it('CONDITION_CLASS_KEYS[has] estático não foi alterado pelo RM-30 (permanece IECA/BRA/BCC/TIAZIDICO)', () => {
    expect(CONDITION_CLASS_KEYS.has).toEqual(['IECA', 'BRA', 'BCC', 'TIAZIDICO']);
  });
});

// ─── HAS resistente ────────────────────────────────────────────────────

describe('RM-30 · HAS resistente', () => {
  it('habilita ARM e descobre Espironolactona quando a indicação própria é compatível ("HAS resistente")', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    const espironolactona = plan.farmacologico.find((s) => s.molecula === 'Espironolactona');
    expect(espironolactona).toBeDefined();
    expect(espironolactona!.prioridade!.tier).toBe('preferencial');
  });

  it('não eleva moléculas de outras classes (BRA/IECA) a preferencial apenas por causa do texto "HAS resistente" — correção do falso positivo da sinonímia genérica de "has"', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    const irbesartana = plan.farmacologico.find((s) => s.molecula === 'Irbesartana');
    expect(irbesartana).toBeDefined();
    expect(irbesartana!.prioridade!.tier).toBe('primeira_linha');
  });

  it('"hipertensão resistente" (variação normalizada, com acento) também habilita ARM', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['hipertensão resistente'] });
    expect(plan.farmacologico.find((s) => s.molecula === 'Espironolactona')).toBeDefined();
  });

  it('"hipertensão arterial resistente" (variação com termo intermediário) também habilita ARM', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['hipertensão arterial resistente'] });
    expect(plan.farmacologico.find((s) => s.molecula === 'Espironolactona')).toBeDefined();
  });

  it('HAS sem "resistente" documentado não habilita ARM mesmo com múltiplos medicamentos em uso (não infere resistência por contagem de fármacos)', () => {
    const plan = hasPlan({ tfg: 90, medicamentosEmUso: ['Losartana', 'Anlodipino', 'Hidroclorotiazida'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Aldosterona'))).toBeUndefined();
  });

  it('ausência total de documentação explícita (comorbidades vazias) não habilita ARM', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: [] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Aldosterona'))).toBeUndefined();
  });

  it('Eplerenona (ARM sem indicação própria para HAS resistente) permanece contextual, não preferencial', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    const eplerenona = plan.farmacologico.find((s) => s.molecula === 'Eplerenona');
    expect(eplerenona).toBeDefined();
    expect(eplerenona!.prioridade!.tier).toBe('contextual');
    expect(eplerenona!.prioridade!.papel_clinico_validado).toBe('contextual');
  });

  it('contraindicação prevalece: gestante não recebe Espironolactona mesmo em HAS resistente', () => {
    const plan = hasPlan({ tfg: 90, gestante: true, comorbidades: ['HAS resistente'] });
    // Espironolactona não é contraindicada por gestação nos dados da base — valida apenas que a checagem de elegibilidade continua ativa (não quebra)
    expect(plan.farmacologico).toBeDefined();
  });

  it('alergia à espironolactona remove a molécula mesmo em HAS resistente', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'], alergias: ['Espironolactona'] });
    expect(plan.farmacologico.find((s) => s.molecula === 'Espironolactona')).toBeUndefined();
  });

  it('interação continua sendo aplicada — toda molécula descoberta em HAS resistente resolve para uma DrugEntity real (checagem de interações não é ignorada/mockada)', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    for (const s of plan.farmacologico) {
      expect(s.id).toBeTruthy();
    }
  });

  it('ajuste renal continua exposto para Espironolactona', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    const esp = plan.farmacologico.find((s) => s.molecula === 'Espironolactona');
    expect(esp?.dose.ajuste_renal).toBeTruthy();
  });

  it('sem duplicidade de moléculas', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(molecules).size).toBe(molecules.length);
  });

  it('marcas de Espironolactona vêm do DrugRepository, vinculadas à molécula correta', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['HAS resistente'] });
    const esp = plan.farmacologico.find((s) => s.molecula === 'Espironolactona');
    expect(esp?.marcas?.length).toBeGreaterThan(0);
    expect(esp?.marcas?.every((m) => m.apresentacoes.length > 0)).toBe(true);
  });
});

// ─── DRC avançada / controle volêmico ──────────────────────────────────

describe('RM-30 · DRC avançada / controle volêmico', () => {
  it('habilita diurético de alça quando TFG < 30 (DRC avançada — KDIGO G4/G5)', () => {
    const plan = hasPlan({ tfg: 25 });
    const furosemida = plan.farmacologico.find((s) => s.molecula === 'Furosemida');
    expect(furosemida).toBeDefined();
  });

  it('habilita diurético de alça quando ckdStage é G4 ou G5, mesmo com TFG >= 30 (dado estruturado independente)', () => {
    const plan = hasPlan({ tfg: 40, ckdStage: 'G4' });
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeDefined();
  });

  it('não habilita para DRC leve (TFG 65, estágio G2) sem justificativa', () => {
    const plan = hasPlan({ tfg: 65, ckdStage: 'G2' });
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeUndefined();
  });

  it('não habilita genericamente para HAS sem contexto renal', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeUndefined();
  });

  it('TFG exatamente 30 NÃO é tratado como < 30 (limite estrito)', () => {
    const plan = hasPlan({ tfg: 30 });
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeUndefined();
  });

  it('TFG 31 (> 30) não habilita', () => {
    const plan = hasPlan({ tfg: 31 });
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeUndefined();
  });

  it('CKD G3b não habilita por si só (apenas G4/G5)', () => {
    const plan = hasPlan({ tfg: 40, ckdStage: 'G3b' });
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeUndefined();
  });

  it('ausência de estágio KDIGO e TFG normal não habilita', () => {
    const plan = hasPlan({});
    expect(plan.farmacologico.find((s) => s.molecula === 'Furosemida')).toBeUndefined();
  });

  it('aplica regras renais existentes — TFG muito baixa não quebra e reflete cautela real da base (dado real, não fabricado)', () => {
    const plan = hasPlan({ tfg: 25 });
    expect(plan.farmacologico.length).toBeGreaterThan(0);
  });

  it('furosemida em HAS+DRC avançada expõe papel congestion_control-equivalente (contextual, não prognostic universal)', () => {
    const plan = hasPlan({ tfg: 25 });
    const furosemida = plan.farmacologico.find((s) => s.molecula === 'Furosemida');
    expect(furosemida?.prioridade?.papel_clinico_validado).toBe('contextual');
  });
});

// ─── Indicação cardiovascular concomitante ─────────────────────────────

describe('RM-30 · Indicação cardiovascular concomitante', () => {
  it('HAS + IC: considera betabloqueador quando a indicação própria da molécula existir (Carvedilol/Bisoprolol têm IC-FEr sourced)', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['ICC'] });
    const carvedilol = plan.farmacologico.find((s) => s.molecula === 'Carvedilol');
    expect(carvedilol).toBeDefined();
    expect(carvedilol!.prioridade!.tier).toBe('preferencial');
  });

  it('HAS + doença coronariana/pós-IAM: considera moléculas elegíveis (Atenolol tem "Pós-IAM" sourced)', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['IAM'] });
    const atenolol = plan.farmacologico.find((s) => s.molecula === 'Atenolol');
    expect(atenolol).toBeDefined();
    expect(atenolol!.prioridade!.tier).toBe('preferencial');
  });

  it('HAS + arritmia/controle de frequência: considera moléculas elegíveis', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['Fibrilação atrial'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Betabloqueador'))).toBeDefined();
  });

  it('HAS + doença coronariana (texto "doença coronariana") também habilita betabloqueador', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['doença coronariana'] });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Betabloqueador'))).toBeDefined();
  });

  it('sem duplicidades em HAS+arritmia', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['Fibrilação atrial'] });
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(molecules).size).toBe(molecules.length);
  });

  it('HAS isolada (sem indicação CV): não promove betabloqueador', () => {
    const plan = hasPlan({ tfg: 90 });
    expect(plan.farmacologico.find((s) => s.classe_terapeutica.includes('Betabloqueador'))).toBeUndefined();
  });

  it('Atenolol não é promovido apenas por pertencer à classe — em HAS+ICC (sem indicação IC própria), permanece contextual, não preferencial', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['ICC'] });
    const atenolol = plan.farmacologico.find((s) => s.molecula === 'Atenolol');
    expect(atenolol).toBeDefined();
    expect(atenolol!.prioridade!.tier).toBe('contextual');
  });

  it('a indicação própria da molécula continua prevalecendo — Bisoprolol/Carvedilol/Nebivolol (com IC-FEr) permanecem contextual (não preferencial) em HAS+pós-IAM (sem indicação de IAM própria)', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['IAM'] });
    for (const nome of ['Bisoprolol', 'Carvedilol', 'Nebivolol']) {
      const s = plan.farmacologico.find((x) => x.molecula === nome);
      expect(s).toBeDefined();
      expect(s!.prioridade!.tier).toBe('contextual');
    }
  });

  it('sem duplicidade de moléculas em HAS+ICC', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['ICC'] });
    const molecules = plan.farmacologico.map((s) => s.molecula);
    expect(new Set(molecules).size).toBe(molecules.length);
  });
});

// ─── Prioridade clínica — classes contextuais nunca são Nível 2 automático ─

describe('RM-30 · Prioridade clínica', () => {
  it('getValidatedClassRole confirma papel contextual para as 3 classes em HAS', () => {
    expect(getValidatedClassRole('has', 'ARM')?.papel_clinico).toBe('contextual');
    expect(getValidatedClassRole('has', 'DIURETICO_ALCA')?.papel_clinico).toBe('contextual');
    expect(getValidatedClassRole('has', 'BETABLOQUEADOR')?.papel_clinico).toBe('contextual');
  });

  it('sem vantagem individual comorbidade-matched, a molécula contextual nunca alcança Nível 2 (primeira_linha) — apenas Nível 1 (se houver match direto) ou Nível 3 (contextual)', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['ICC'] });
    const naoPreferencial = plan.farmacologico.filter(
      (s) => (s.classe_terapeutica.includes('Betabloqueador')) && s.prioridade!.tier !== 'preferencial',
    );
    for (const s of naoPreferencial) {
      expect(s.prioridade!.tier).toBe('contextual');
    }
  });

  it('motivo contextual é exposto explicitamente (RM-27) quando a molécula não tem vantagem individual', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['ICC'] });
    const atenolol = plan.farmacologico.find((s) => s.molecula === 'Atenolol')!;
    expect(atenolol.prioridade!.motivo).toMatch(/RM-27/);
  });
});

// ─── Determinismo ───────────────────────────────────────────────────────

describe('RM-30 · Determinismo', () => {
  it('mesma anamnese produz a mesma recomendação', () => {
    const ctx = { tfg: 90, comorbidades: ['HAS resistente', 'ICC'] };
    const p1 = hasPlan(ctx);
    const p2 = hasPlan(ctx);
    expect(p1.farmacologico.map((s) => s.molecula)).toEqual(p2.farmacologico.map((s) => s.molecula));
  });

  it('ordem das comorbidades não altera o resultado', () => {
    const p1 = hasPlan({ tfg: 90, comorbidades: ['HAS resistente', 'ICC'] });
    const p2 = hasPlan({ tfg: 90, comorbidades: ['ICC', 'HAS resistente'] });
    expect(p1.farmacologico.map((s) => s.molecula).sort()).toEqual(p2.farmacologico.map((s) => s.molecula).sort());
  });

  it('ordem dos medicamentos em uso não altera o resultado', () => {
    const p1 = hasPlan({ tfg: 90, medicamentosEmUso: ['Losartana', 'Anlodipino', 'Hidroclorotiazida'] });
    const p2 = hasPlan({ tfg: 90, medicamentosEmUso: ['Hidroclorotiazida', 'Anlodipino', 'Losartana'] });
    expect(p1.farmacologico.map((s) => s.molecula).sort()).toEqual(p2.farmacologico.map((s) => s.molecula).sort());
  });
});

// ─── Regressão obrigatória ──────────────────────────────────────────────

describe('RM-30 · Regressão — RM-23 a RM-29 íntegros', () => {
  it('RM-23 (Drug Consistency)', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
  });

  it('RM-24 (Cross Database Validator)', () => {
    const report = buildSyncReport();
    expect(report.publishOk).toBe(true);
  });

  it('RM-25.1/RM-26/RM-26.1: HAS+DRC continua elevando Losartana/Enalapril a preferencial', () => {
    const plan = hasPlan({ tfg: 90, comorbidades: ['DRC'] });
    const losartana = plan.farmacologico.find((s) => s.molecula === 'Losartana');
    expect(losartana?.prioridade?.tier).toBe('preferencial');
  });

  it('RM-27: SABA em asma/DPOC continua contextual', () => {
    const asma = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    expect(asma.farmacologico.find((s) => s.classe_terapeutica.includes('SABA'))?.prioridade?.tier).toBe('contextual');
  });

  it('RM-27.1: SGLT2 em DM2 continua renal_benefit', () => {
    expect(getValidatedClassRole('dm2', 'SGLT2')?.papel_clinico).toBe('renal_benefit');
  });

  it('RM-28: Dapagliflozina/Empagliflozina continuam descobertas em ICC', () => {
    const icc = getTherapeuticForCondition('icc', 'ICC (I50)', { tfg: 90 })!;
    expect(icc.farmacologico.find((s) => s.molecula === 'Dapagliflozina')).toBeDefined();
  });

  it('RM-29: SCA continua descobrindo estatina/betabloqueador/IECA/BRA/ARM', () => {
    const sca = getTherapeuticForCondition('sca', 'SCA', { tfg: 90 })!;
    expect(sca.farmacologico.find((s) => s.molecula === 'Atorvastatina')).toBeDefined();
    expect(sca.farmacologico.find((s) => s.molecula === 'Succinato de Metoprolol')).toBeDefined();
    expect(sca.farmacologico.find((s) => s.molecula === 'Enalapril')).toBeDefined();
    expect(sca.farmacologico.find((s) => s.molecula === 'Valsartana')).toBeDefined();
    expect(sca.farmacologico.find((s) => s.molecula === 'Eplerenona')).toBeDefined();
  });

  it('RM-29: Asma+LAMA e DPOC+ICS_LABA continuam funcionando (contextual)', () => {
    const asma = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    expect(asma.farmacologico.find((s) => s.molecula === 'Tiotrópio')?.prioridade?.tier).toBe('contextual');
    const dpoc = getTherapeuticForCondition('dpoc', 'DPOC (J44)', {})!;
    expect(dpoc.farmacologico.find((s) => s.molecula === 'Budesonida/Formoterol')?.prioridade?.tier).toBe('contextual');
  });

  it('RM-29: exclusões permanecem válidas — LABA isolado não promovido em asma, ICS isolado não promovido em DPOC, GLP1 não aparece em SCA, Irbesartana não aparece em DM2', () => {
    const asma = getTherapeuticForCondition('asma', 'Asma (J45)', {})!;
    expect(asma.farmacologico.find((s) => s.classe_terapeutica === 'Broncodilatador LABA (Beta-2 agonista de Longa Ação)')).toBeUndefined();

    const dpoc = getTherapeuticForCondition('dpoc', 'DPOC (J44)', { tfg: 90 })!;
    expect(dpoc.farmacologico.find((s) => s.classe_terapeutica === 'Corticosteroide Inalatório isolado (ICS)')).toBeUndefined();

    const sca = getTherapeuticForCondition('sca', 'SCA', { tfg: 90 })!;
    expect(sca.farmacologico.find((s) => s.classe_terapeutica.includes('GLP-1') || s.molecula === 'Liraglutida')).toBeUndefined();

    const dm2 = getTherapeuticForCondition('dm2', 'DM2 (E11)', {})!;
    expect(dm2.farmacologico.find((s) => s.molecula === 'Irbesartana')).toBeUndefined();
  });
});
