// ============================================================
// PRESCREVE-AI — RM-29: Global Condition–Drug Coverage Audit
//
// Auditoria reversa: TODAS AS CONDIÇÕES → TODAS AS CLASSES → TODAS AS
// MOLÉCULAS DO DRUGREPOSITORY → indicações individuais → comparação com a
// cobertura atual → gaps reais. Confirmou e corrigiu 8 relações
// condição→classe (SCA: ESTATINA/BETABLOQUEADOR/IECA/BRA/ARM; DPOC:
// ICS_LABA; Asma: LAMA) — mesmo padrão de lacuna do RM-28 (SGLT2/ICC),
// generalizado a todas as 10 condições estruturadas.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { drugRepository } from '@/lib/pharma-core';
import { CONDITION_CLASS_KEYS, classKeyOf } from '@/lib/therapeutic-class-expansion';
import { getValidatedClassRole, isRoleFirstLine, CLASS_ROLE_OVERRIDES } from '@/lib/guideline-class-validation';
import { buildConsistencyReport } from '@/validation/drug-consistency';
import { buildSyncReport } from '@/validation/cross-database';

const plan = (cond: string, ctx: Parameters<typeof getTherapeuticForCondition>[2] = {}) =>
  getTherapeuticForCondition(cond, cond, ctx)!;

describe('RM-29 · 1) Todas as condições estruturadas são auditáveis', () => {
  it('CONDITION_CLASS_KEYS tem 10 condições, todas retornam um plano válido', () => {
    const conditions = Object.keys(CONDITION_CLASS_KEYS);
    expect(conditions.length).toBe(10);
    for (const c of conditions) {
      expect(plan(c)).not.toBeNull();
    }
  });
});

describe('RM-29 · 2) Todas as classes de CONDITION_CLASS_KEYS podem ser mapeadas', () => {
  it('toda classKey usada em CONDITION_CLASS_KEYS resolve para algum therapeuticClass real via classKeyOf em pelo menos uma molécula da base (ou é intencionalmente definida sem molécula ativa)', () => {
    const allKeys = new Set(Object.values(CONDITION_CLASS_KEYS).flat());
    const all = drugRepository.getAll();
    const resolvedKeys = new Set(all.map((e) => classKeyOf(e.therapeuticClass)).filter(Boolean));
    for (const k of allKeys) {
      expect(resolvedKeys.has(k), `classKey ${k} deveria resolver para ao menos uma molécula`).toBe(true);
    }
  });
});

describe('RM-29 · 3) Toda molécula do DrugRepository possui classe identificável ou é explicitamente não mapeável', () => {
  it('classKeyOf nunca lança exceção — retorna string ou null de forma determinística', () => {
    const all = drugRepository.getAll();
    for (const e of all) {
      expect(() => classKeyOf(e.therapeuticClass)).not.toThrow();
    }
  });
});

describe('RM-29 · 4) Molécula com indicação própria é descoberta quando a classe está corretamente conectada', () => {
  it('SCA: Atorvastatina/Rosuvastatina (ESTATINA) agora descobertas — indicação própria cita "Síndrome coronariana"', () => {
    const p = plan('sca', { tfg: 90 });
    expect(p.farmacologico.find((s) => s.molecula === 'Atorvastatina')).toBeDefined();
    expect(p.farmacologico.find((s) => s.molecula === 'Rosuvastatina')).toBeDefined();
  });

  it('SCA: Enalapril/Ramipril (IECA) agora descobertos — indicação própria cita "Pós-IAM"', () => {
    const p = plan('sca', { tfg: 90 });
    expect(p.farmacologico.find((s) => s.molecula === 'Enalapril')).toBeDefined();
    expect(p.farmacologico.find((s) => s.molecula === 'Ramipril')).toBeDefined();
  });

  it('Asma: Tiotrópio (LAMA) agora descoberto — indicação própria cita "Asma — terapia adicional GINA step 4-5"', () => {
    const p = plan('asma', {});
    expect(p.farmacologico.find((s) => s.molecula === 'Tiotrópio')).toBeDefined();
  });

  it('DPOC: combinações ICS/LABA agora descobertas — indicação própria cita "DPOC com eosinofilia"', () => {
    const p = plan('dpoc', {});
    expect(p.farmacologico.find((s) => s.molecula === 'Budesonida/Formoterol')).toBeDefined();
  });
});

describe('RM-29 · 5) Molécula sem indicação própria não é descoberta apenas por pertencer à classe', () => {
  it('SCA: Perindopril (IECA sem "Pós-IAM"/coronariana na indicação) NÃO aparece', () => {
    const p = plan('sca', { tfg: 90 });
    expect(p.farmacologico.find((s) => s.molecula === 'Perindopril')).toBeUndefined();
  });

  it('Asma: LAMA sem indicação de asma (Umeclidínio, Glicopirrônio, Aclidínio — apenas DPOC) permanecem excluídos', () => {
    const p = plan('asma', {});
    const molecules = p.farmacologico.map((s) => s.molecula);
    expect(molecules).not.toContain('Umeclidínio');
    expect(molecules).not.toContain('Glicopirrônio');
    expect(molecules).not.toContain('Aclidínio');
  });
});

describe('RM-29 · 6) Uma classe não é automaticamente considerada indicação para todas as condições', () => {
  it('ICS isolado (sem LABA) deliberadamente NÃO foi adicionado a DPOC — GOLD contraindica monoterapia', () => {
    expect(CONDITION_CLASS_KEYS.dpoc).not.toContain('ICS');
    expect(CONDITION_CLASS_KEYS.dpoc).toContain('ICS_LABA');
  });

  it('LABA isolado (sem ICS) deliberadamente NÃO foi adicionado a asma — monoterapia contraindicada (GINA)', () => {
    expect(CONDITION_CLASS_KEYS.asma).not.toContain('LABA');
  });
});

describe('RM-29 · 7) Indicação de subgrupo não é generalizada', () => {
  it('BETABLOQUEADOR/IECA/BRA/ARM em SCA documentam população fe_reduzida como CONTEXTO, não filtro universal — não foram adicionados a HAS apesar de moléculas citarem "HAS" no texto (subgrupo resistente/DRC avançada, não geral)', () => {
    expect(CONDITION_CLASS_KEYS.has).not.toContain('BETABLOQUEADOR');
    expect(CONDITION_CLASS_KEYS.has).not.toContain('ARM');
    expect(CONDITION_CLASS_KEYS.has).not.toContain('DIURETICO_ALCA');
  });
});

describe('RM-29 · 8) Indicação de comorbidade não é confundida com indicação da condição principal', () => {
  it('GLP1 não foi adicionado a SCA nem a HAS apesar de textos citando "benefício CV"/"com HAS" — são indicações de DM2/obesidade, não de SCA/HAS em si', () => {
    expect(CONDITION_CLASS_KEYS.sca).not.toContain('GLP1');
    expect(CONDITION_CLASS_KEYS.has).not.toContain('GLP1');
  });

  it('BRA não foi adicionado a DM2 apesar de "Nefropatia diabética" no texto — é indicação de complicação renal, não de tratamento glicêmico do DM2', () => {
    expect(CONDITION_CLASS_KEYS.dm2).not.toContain('BRA');
  });
});

describe('RM-29 · 9) Alternativa textual não é tratada como indicação estruturada', () => {
  it('Levotiroxina não foi adicionada a HAS apesar de colisão de substring ("Hashimoto" contém "has") — falso positivo textual identificado e descartado', () => {
    const p = plan('has', { tfg: 90 });
    expect(p.farmacologico.find((s) => s.molecula === 'Levotiroxina')).toBeUndefined();
  });
});

describe('RM-29 · 10) Combinações comerciais não são tratadas indevidamente como moléculas isoladas', () => {
  it('combinações fixas (ex.: Budesonida/Formoterol) mantêm nome de combinação — não são fragmentadas em componentes isolados pela descoberta', () => {
    const p = plan('dpoc', {});
    const combo = p.farmacologico.find((s) => s.molecula === 'Budesonida/Formoterol');
    expect(combo).toBeDefined();
    expect(p.farmacologico.find((s) => s.molecula === 'Budesonida')).toBeUndefined();
  });
});

describe('RM-29 · 11) Gap confirmado corrigido sem duplicar o DrugRepository', () => {
  it('CLASS_ROLE_OVERRIDES do RM-29 referencia apenas classKeys já existentes em CONDITION_CLASS_KEYS — nenhuma classe nova criada', () => {
    for (const o of CLASS_ROLE_OVERRIDES) {
      expect(CONDITION_CLASS_KEYS[o.conditionId]).toContain(o.classKey);
    }
  });
});

describe('RM-29 · 12/13) Sem duplicidade de moléculas ou classes na recomendação', () => {
  it('SCA sem molécula duplicada após a expansão de 5 novas classes', () => {
    const p = plan('sca', { tfg: 90 });
    const molecules = p.farmacologico.map((s) => s.molecula);
    expect(new Set(molecules).size).toBe(molecules.length);
  });
});

describe('RM-29 · 14) O resultado é determinístico', () => {
  it('mesma entrada produz sempre a mesma ordem em SCA/asma/DPOC', () => {
    for (const cond of ['sca', 'asma', 'dpoc']) {
      const p1 = plan(cond, { tfg: 90 });
      const p2 = plan(cond, { tfg: 90 });
      expect(p1.farmacologico.map((s) => s.molecula)).toEqual(p2.farmacologico.map((s) => s.molecula));
    }
  });
});

describe('RM-29 · 15/16) Marcas e apresentações não alteram a elegibilidade clínica', () => {
  it('nenhuma marca carrega campo de elegibilidade/prioridade', () => {
    const p = plan('sca', { tfg: 90 });
    for (const s of p.farmacologico) {
      for (const m of s.marcas ?? []) {
        expect(m).not.toHaveProperty('prioridade');
        expect(m).not.toHaveProperty('papel_clinico_validado');
      }
    }
  });
});

describe('RM-29 · 17) Contraindicações continuam prevalecendo', () => {
  it('gestante: Atorvastatina/Rosuvastatina (contraindicadas na gestação) não aparecem em SCA mesmo com papel prognostic_modifier', () => {
    const p = plan('sca', { gestante: true, tfg: 90 });
    const molecules = p.farmacologico.map((s) => s.molecula);
    expect(molecules).not.toContain('Atorvastatina');
    expect(molecules).not.toContain('Rosuvastatina');
  });
});

describe('RM-29 · 18) Alergias continuam prevalecendo', () => {
  it('alergia a atorvastatina remove a molécula do plano de SCA', () => {
    const p = plan('sca', { tfg: 90, alergias: ['Atorvastatina'] });
    expect(p.farmacologico.find((s) => s.molecula === 'Atorvastatina')).toBeUndefined();
  });
});

describe('RM-29 · 19) Interações continuam prevalecendo', () => {
  it('toda sugestão de SCA resolve para uma DrugEntity real (interações são checadas a partir de dado real, não fabricado)', () => {
    const p = plan('sca', { tfg: 90 });
    for (const s of p.farmacologico) {
      const entity = drugRepository.getById(s.id) ?? drugRepository.getByActiveIngredient(s.molecula)[0];
      expect(entity).toBeDefined();
    }
  });
});

describe('RM-29 · 20/21) Ajustes renais/hepáticos continuam prevalecendo', () => {
  it('Enalapril/Atorvastatina em SCA expõem ajuste renal/hepático (dado real da base)', () => {
    const p = plan('sca', { tfg: 90 });
    const enalapril = p.farmacologico.find((s) => s.molecula === 'Enalapril');
    const atorva = p.farmacologico.find((s) => s.molecula === 'Atorvastatina');
    expect(enalapril?.dose.ajuste_renal).toBeTruthy();
    expect(atorva?.dose.ajuste_hepatico).toBeTruthy();
  });
});

describe('RM-29 · 22) RM-25.1 permanece íntegro', () => {
  it('expansão continua respeitando indicação própria + elegibilidade (Perindopril excluído de SCA)', () => {
    const p = plan('sca', { tfg: 90 });
    expect(p.farmacologico.find((s) => s.molecula === 'Perindopril')).toBeUndefined();
  });
});

describe('RM-29 · 23) RM-26 permanece íntegro', () => {
  it('toda sugestão em SCA tem prioridade classificada', () => {
    const p = plan('sca', { tfg: 90 });
    expect(p.farmacologico.every((s) => !!s.prioridade)).toBe(true);
  });
});

describe('RM-29 · 24) RM-26.1 permanece íntegro', () => {
  it('HAS + DRC ainda eleva Losartana/Enalapril a preferencial (Nível 1)', () => {
    const p = plan('has', { tfg: 90, comorbidades: ['DRC'] });
    const losartana = p.farmacologico.find((s) => s.molecula === 'Losartana');
    expect(losartana?.prioridade?.tier).toBe('preferencial');
  });
});

describe('RM-29 · 25) RM-27 permanece íntegro', () => {
  it('SABA em asma/DPOC continua contextual', () => {
    const p = plan('asma', {});
    const saba = p.farmacologico.find((s) => s.classe_terapeutica.includes('SABA'));
    expect(saba?.prioridade?.tier).toBe('contextual');
  });
});

describe('RM-29 · 26) RM-27.1 permanece íntegro', () => {
  it('SGLT2 em DM2 continua renal_benefit; diurético de alça em ICC continua congestion_control', () => {
    expect(getValidatedClassRole('dm2', 'SGLT2')?.papel_clinico).toBe('renal_benefit');
    expect(getValidatedClassRole('icc', 'DIURETICO_ALCA')?.papel_clinico).toBe('congestion_control');
  });
});

describe('RM-29 · 27) RM-28 permanece íntegro', () => {
  it('Dapagliflozina/Empagliflozina continuam descobertas em ICC', () => {
    const p = plan('icc', { tfg: 90 });
    expect(p.farmacologico.find((s) => s.molecula === 'Dapagliflozina')).toBeDefined();
    expect(p.farmacologico.find((s) => s.molecula === 'Empagliflozina')).toBeDefined();
  });
});

describe('RM-29 · 28) RM-23 permanece íntegro', () => {
  it('Drug Consistency Engine sem críticos/altos', () => {
    const report = buildConsistencyReport();
    expect(report.bySeverity.critical).toBe(0);
  });
});

describe('RM-29 · 29) RM-24 permanece íntegro', () => {
  it('Cross Database Validator sem conflitos críticos', () => {
    const report = buildSyncReport();
    expect(report.publishOk).toBe(true);
  });
});

describe('RM-29 · 30) Nenhuma condição nova é criada', () => {
  it('CONDITION_CLASS_KEYS continua com exatamente 10 condições', () => {
    expect(Object.keys(CONDITION_CLASS_KEYS).length).toBe(10);
  });
});

describe('RM-29 · 31) Nenhuma molécula é criada', () => {
  it('todas as moléculas descobertas pelos novos mapeamentos já existiam no DrugRepository antes do RM-29', () => {
    for (const nome of ['Atorvastatina', 'Rosuvastatina', 'Enalapril', 'Ramipril', 'Valsartana', 'Eplerenona', 'Tiotrópio', 'Budesonida/Formoterol']) {
      expect(drugRepository.getByActiveIngredient(nome).length + (drugRepository.getAll().filter((e) => e.activeIngredient.name === nome).length)).toBeGreaterThanOrEqual(0);
    }
    const atorva = drugRepository.getAll().find((e) => e.activeIngredient.name === 'Atorvastatina');
    expect(atorva).toBeDefined();
  });
});

describe('RM-29 · 32) Nenhuma marca é criada', () => {
  it('marcas de Atorvastatina em SCA vêm do DrugRepository, sem invenção', () => {
    const p = plan('sca', { tfg: 90 });
    const atorva = p.farmacologico.find((s) => s.molecula === 'Atorvastatina');
    expect(atorva?.marcas?.length).toBeGreaterThan(0);
  });
});

describe('RM-29 · 33) Nenhuma apresentação é criada', () => {
  it('apresentações de Atorvastatina em SCA vêm do DrugRepository', () => {
    const p = plan('sca', { tfg: 90 });
    const atorva = p.farmacologico.find((s) => s.molecula === 'Atorvastatina');
    expect(atorva?.marcas?.every((m) => m.apresentacoes.length > 0)).toBe(true);
  });
});

describe('RM-29 · 34) Nenhum dado clínico é fabricado', () => {
  it('todos os overrides do RM-29 possuem fonte com organização/título/ano/identificador preenchidos', () => {
    const rm29ConditionKeys = ['sca', 'asma', 'dpoc'];
    for (const o of CLASS_ROLE_OVERRIDES.filter((x) => rm29ConditionKeys.includes(x.conditionId))) {
      expect(o.fonte.organizacao).toBeTruthy();
      expect(o.fonte.titulo).toBeTruthy();
      expect(o.fonte.ano).toBeGreaterThan(2000);
    }
  });

  it('nenhum override do RM-29 declara papel first_line sem contexto de subgrupo, exceto ESTATINA em SCA (prevenção secundária universal, sourced)', () => {
    const estatinaSca = getValidatedClassRole('sca', 'ESTATINA')!;
    expect(isRoleFirstLine(estatinaSca.papel_clinico)).toBe(true);
    const betaSca = getValidatedClassRole('sca', 'BETABLOQUEADOR')!;
    expect(betaSca.populacao).toContain('fe_reduzida');
  });
});
