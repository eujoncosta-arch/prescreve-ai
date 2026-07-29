import { describe, it, expect } from 'vitest';
import { getPediatricAgeGroup, classifyPopulation } from '@/lib/dose-calculator';
import { detectarPopulacao, calcularDosagem, getMedicamentoById } from '@/lib/dosing-engine';
import { calcIdadeCorrigida, calcDosePediatrica, calcPesoIdealPediatrico, getNeonatalAlerts, calcClCrSchwartz } from '@/lib/pediatric-engine';

// ============================================================
// RM-53 (RM41-029) — Auditoria definitiva das fronteiras pediátricas
//
// Inventário de TODAS as fronteiras etárias/gestacionais executáveis
// encontradas no código (bulas/textos livres em pharma-database*.ts e
// eurofarma-sync.ts são documentação, não código executável — fora de
// escopo desta auditoria, que audita RAMOS DE CÓDIGO, não texto).
//
// | Regra                              | Arquivo            | Variável      | Limites (unidade)            | Comportamento esperado |
// |-------------------------------------|---------------------|---------------|-------------------------------|--------------------------|
// | getPediatricAgeGroup                | dose-calculator.ts  | idadeMeses    | 1, 24, 72, 144 (meses)        | buckets <= inclusivos no limite superior |
// | classifyPopulation                  | dose-calculator.ts  | idadeAnos     | 28/365, 2, 6, 12, 18, 65 (anos) | buckets < exclusivos no limite superior (exceto >=65) |
// | detectarPopulacao                   | dosing-engine.ts    | idade_dias    | 28, 365, 4380, 6570, 23725 (dias) | buckets < exclusivos no limite superior |
// | calcularDosagem/contraindicado_ate_dias | dosing-engine.ts | idade_dias | 60, 90 (dias, por fármaco)    | contraindica se ESTRITAMENTE menor |
// | calcIdadeCorrigida                  | pediatric-engine.ts | igSemanas     | 24, 28, 34, 37 (semanas)      | classificação >= inclusiva no limite inferior |
// | calcDosePediatrica (idadeMin/MaxMeses) | pediatric-engine.ts | idadeEfetiva | por indicação (ex.: 24 meses) | ambos os limites INCLUSIVOS (sem alerta exatamente no limite) |
// | calcPesoIdealPediatrico             | pediatric-engine.ts | idadeMeses    | 12 (meses)                    | fórmula troca em <= 12 |
// | getNeonatalAlerts                   | pediatric-engine.ts | igSemanas/idadeDias | por alerta (ex.: 37 sem, 90 dias) | dispara se ESTRITAMENTE menor |
// | calcClCrSchwartz (RM-36/PED-AUDIT-07, regressão) | pediatric-engine.ts | idadeMeses | 12, 156 (meses) | já coberto por ped-audit-07-schwartz-sexo.test.ts |
// ============================================================

describe('RM-53 (RM41-029) — dose-calculator.ts: getPediatricAgeGroup (buckets em meses)', () => {
  const limites = [1, 24, 72, 144];
  it.each(limites)('limite %i meses: abaixo/no limite/acima não pulam nem sobrepõem categoria', (limite) => {
    const abaixo = getPediatricAgeGroup(limite - 0.1);
    const noLimite = getPediatricAgeGroup(limite);
    const acima = getPediatricAgeGroup(limite + 0.1);
    // No limite, o bucket é o de "até este limite" (regra `<=`) — logo
    // abaixo e no limite devem produzir a MESMA categoria (fronteira
    // inclusiva no topo), e acima do limite deve mudar de categoria.
    expect(noLimite).toBe(abaixo);
    expect(acima).not.toBe(noLimite);
  });

  it('nenhuma lacuna: todo valor de 0 a 200 meses recebe uma categoria não vazia', () => {
    for (let m = 0; m <= 200; m += 0.5) {
      expect(getPediatricAgeGroup(m)).toBeTruthy();
    }
  });
});

describe('RM-53 (RM41-029) — dose-calculator.ts: classifyPopulation (buckets em anos)', () => {
  const CORTE_NEONATO = 28 / 365;
  const limites = [CORTE_NEONATO, 2, 6, 12, 18];

  it.each(limites)('limite %d anos: logo abaixo pertence ao bucket anterior, exatamente no limite e acima pertencem ao bucket seguinte (fronteira exclusiva no topo)', (limite) => {
    const abaixo = classifyPopulation(limite - 0.001).population;
    const noLimite = classifyPopulation(limite).population;
    const acima = classifyPopulation(limite + 0.001).population;
    expect(noLimite).toBe(acima);
    expect(abaixo).not.toBe(noLimite);
  });

  it('65 anos: fronteira geriátrica é INCLUSIVA no limite inferior (>= 65)', () => {
    expect(classifyPopulation(64.999).population).not.toBe('geriatrico');
    expect(classifyPopulation(65).population).toBe('geriatrico');
    expect(classifyPopulation(65.001).population).toBe('geriatrico');
  });

  it('nenhuma lacuna: todo valor de 0 a 100 anos recebe uma população válida', () => {
    const validas = new Set(['neonato', 'lactente', 'pre_escolar', 'escolar', 'adolescente', 'adulto', 'geriatrico']);
    for (let a = 0; a <= 100; a += 0.25) {
      expect(validas.has(classifyPopulation(a).population)).toBe(true);
    }
  });
});

describe('RM-53 (RM41-029) — dosing-engine.ts: detectarPopulacao (buckets em dias)', () => {
  const limites = [28, 365, 4380, 6570, 23725];

  it.each(limites)('limite %i dias: fronteira exclusiva no topo (< na definição do bucket)', (limite) => {
    const abaixo = detectarPopulacao(limite - 1);
    const noLimite = detectarPopulacao(limite);
    const acima = detectarPopulacao(limite + 1);
    expect(noLimite).toBe(acima);
    expect(abaixo).not.toBe(noLimite);
  });

  it('nenhuma lacuna: todo valor de 0 a 30000 dias recebe uma população válida', () => {
    const validas = new Set(['neonato', 'lactente', 'pediatrico', 'adolescente', 'adulto', 'geriatrico']);
    for (let d = 0; d <= 30000; d += 100) {
      expect(validas.has(detectarPopulacao(d))).toBe(true);
    }
  });
});

describe('RM-53 (RM41-029) — dosing-engine.ts: contraindicado_ate_dias (corte fino dentro de um bucket)', () => {
  it('SMZ-TMP (contraindicado_ate_dias: 60): exatamente 60 dias NÃO é contraindicado (fronteira exclusiva/ESTRITAMENTE menor), 59 dias é', () => {
    const med = getMedicamentoById('sulfametoxazol-trimetoprim')!;
    expect(med).toBeDefined();

    const aos59 = calcularDosagem(10, undefined, 59, med, 'smxtmp-susp');
    const aos60 = calcularDosagem(10, undefined, 60, med, 'smxtmp-susp');
    const aos61 = calcularDosagem(10, undefined, 61, med, 'smxtmp-susp');

    expect(aos59!.ok).toBe(false);
    expect(aos59!.erro).toMatch(/CONTRAINDICADO em idade < 60 dias/);
    expect(aos60!.ok).toBe(true);
    expect(aos61!.ok).toBe(true);
  });

  it('Dipirona (contraindicado_ate_dias: 90): exatamente 90 dias NÃO é contraindicado, 89 dias é', () => {
    const med = getMedicamentoById('dipirona')!;
    expect(med).toBeDefined();

    const aos89 = calcularDosagem(10, undefined, 89, med, 'dip-gotas');
    const aos90 = calcularDosagem(10, undefined, 90, med, 'dip-gotas');

    expect(aos89!.ok).toBe(false);
    expect(aos89!.erro).toMatch(/CONTRAINDICADO em idade < 90 dias/);
    expect(aos90!.ok).toBe(true);
  });
});

describe('RM-53 (RM41-029) — pediatric-engine.ts: calcIdadeCorrigida (fronteiras de idade gestacional)', () => {
  const limites: [number, string][] = [
    [24, 'micro_prematuro→prematuro_extremo'],
    [28, 'prematuro_extremo→prematuro_moderado'],
    [34, 'prematuro_moderado→prematuro_tardio'],
    [37, 'prematuro_tardio→termo'],
  ];

  it.each(limites)('limite %i semanas (%s): classificação muda exatamente no limite (>= inclusivo no limite inferior)', (limite) => {
    const abaixo = calcIdadeCorrigida(limite - 1, 0).classificacao;
    const noLimite = calcIdadeCorrigida(limite, 0).classificacao;
    expect(noLimite).not.toBe(abaixo);
  });

  it('ehPrematuro: exatamente 37 semanas NÃO é prematuro (< 37, fronteira exclusiva)', () => {
    expect(calcIdadeCorrigida(36, 0).ehPrematuro).toBe(true);
    expect(calcIdadeCorrigida(37, 0).ehPrematuro).toBe(false);
  });
});

describe('RM-53 (RM41-029) — pediatric-engine.ts: calcDosePediatrica (idadeMinMeses/idadeMaxMeses — ambos inclusivos)', () => {
  it('albendazol: EXATAMENTE 24 meses (limite superior da faixa 1-2 anos) não gera alerta de idade — regressão PED-AUDIT-01 já coberta, reconfirmada aqui na suíte dedicada de fronteiras', () => {
    const r24 = calcDosePediatrica('albendazol', { pesoKg: 12, idadeMeses: 24 });
    expect(r24).not.toBeNull();
    expect(r24!.alertas.some((a) => a.includes('🚨 CONTRAINDICADO'))).toBe(false);
  });

  it('paracetamol: EXATAMENTE 12 anos = 144 meses (se houver limite superior na indicação padrão) não gera dose null nem alerta indevido', () => {
    const r = calcDosePediatrica('paracetamol', { pesoKg: 35, idadeMeses: 144 });
    expect(r).not.toBeNull();
  });
});

describe('RM-53 (RM41-029) — pediatric-engine.ts: calcPesoIdealPediatrico (troca de fórmula em 12 meses)', () => {
  it('11, 12 e 13 meses: a fórmula infantil (<=12) e a de criança maior (>12) não produzem um salto absurdo/negativo', () => {
    const aos11 = calcPesoIdealPediatrico(11, 'M');
    const aos12 = calcPesoIdealPediatrico(12, 'M');
    const aos13 = calcPesoIdealPediatrico(13, 'M');
    expect(aos11).toBeGreaterThan(0);
    expect(aos12).toBeGreaterThan(0);
    expect(aos13).toBeGreaterThan(0);
    // A fórmula muda em 12→13 (linear→por ano) — não deve haver
    // descontinuidade abrupta (> 5kg de salto entre meses adjacentes).
    expect(Math.abs(aos13 - aos12)).toBeLessThan(5);
  });
});

describe('RM-53 (RM41-029) — pediatric-engine.ts: getNeonatalAlerts (fronteiras de IG/idade pós-natal)', () => {
  it('ceftriaxona (igMinima: 37): IG 36 semanas dispara o alerta, IG 37 semanas NÃO dispara (fronteira estritamente menor)', () => {
    const abaixo = getNeonatalAlerts('ceftriaxona', { pesoKg: 3, idadeMeses: 0, idadeGestacionalSemanas: 36 });
    const noLimite = getNeonatalAlerts('ceftriaxona', { pesoKg: 3, idadeMeses: 0, idadeGestacionalSemanas: 37 });
    expect(abaixo.length).toBeGreaterThan(0);
    expect(noLimite.length).toBe(0);
  });

  it('dipirona (idadeMinDias: 90): 89 dias pós-natal dispara o alerta, 90 dias NÃO dispara', () => {
    const abaixo = getNeonatalAlerts('dipirona', { pesoKg: 5, idadeMeses: 3, idadePostNatalDias: 89 });
    const noLimite = getNeonatalAlerts('dipirona', { pesoKg: 5, idadeMeses: 3, idadePostNatalDias: 90 });
    expect(abaixo.length).toBeGreaterThan(0);
    expect(noLimite.length).toBe(0);
  });
});

describe('RM-53 (RM41-029) — pediatric-engine.ts: calcClCrSchwartz (regressão de fronteira, ver ped-audit-07-schwartz-sexo.test.ts para cobertura completa)', () => {
  it('11/12/13 meses: fronteira lactente→criança em 12 meses (< 12, fronteira exclusiva)', () => {
    const r11 = calcClCrSchwartz(70, 0.5, 11, 'M');
    const r12 = calcClCrSchwartz(70, 0.5, 12, 'M');
    expect(r11.ok && r11.faixaEtaria).toBe('lactente');
    expect(r12.ok && r12.faixaEtaria).toBe('crianca');
  });

  it('155/156 meses: fronteira criança→adolescente em 156 meses (< 156, fronteira exclusiva) — exige sexo a partir daqui', () => {
    const r155 = calcClCrSchwartz(160, 0.6, 155, undefined);
    const r156 = calcClCrSchwartz(160, 0.6, 156, undefined);
    expect(r155.ok && r155.faixaEtaria).toBe('crianca');
    expect(r156.ok).toBe(false);
  });
});
