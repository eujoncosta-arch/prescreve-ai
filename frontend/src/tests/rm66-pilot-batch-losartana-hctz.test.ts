// ============================================================
// RM-66 — Framework de Expansão Clínica Controlada
// Lote piloto: Losartana Potássica + Hidroclorotiazida (Zart H®)
//
// Cobre as etapas 7–10 do pipeline obrigatório (cobertura de busca, testes
// de dose, testes de segurança, jornada clínica relevante) para o lote
// piloto descrito em docs/RM-66-PILOT-BATCH-LOSARTANA-HCTZ.md. As etapas
// 1–6 (cadastro estruturado, proveniência, validação de tipo, RM-23,
// RM-24, gate de integridade comercial) são gates de script/tsc já
// executados e reportados no relatório de fechamento — não duplicados
// como testes de vitest.
//
// Nenhum dado clínico novo foi inventado: contraindicações, ajuste renal e
// apresentações reaproveitam 1:1 a entrada já curada `euro-zart-h` em
// `eurofarma-sync.ts` (bula real Eurofarma), verificada nesta sessão contra
// fontes externas adicionais (bulas de genéricos Medley/Geolab).
// ============================================================

import { describe, it, expect } from 'vitest';
import { searchDrugs, getAllDrugs } from '@/lib/pharma-database';
import { EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';
import { getAdjustmentForCrCl, calcCrCl, type PatientParams } from '@/lib/dose-calculator';
import { runSafetyCheck } from '@/lib/safety-rules';
import { drugRepository } from '@/lib/pharma-core';

const MOLECULA = 'Losartana Potássica + Hidroclorotiazida';

describe('RM-66 — lote piloto: cadastro estruturado e proveniência', () => {
  it('a entidade existe em getAllDrugs() (cadastro estruturado, etapa 1 do pipeline)', () => {
    const entidade = getAllDrugs().find((d) => d.molecula === MOLECULA);
    expect(entidade).toBeDefined();
    expect(entidade!.marcas.length).toBeGreaterThanOrEqual(2);
  });

  it('proveniência (etapa 2): as concentrações da marca Zart H® no PHARMA_DB são IDÊNTICAS às já curadas em eurofarma-sync.ts (não divergem da fonte já verificada)', () => {
    const entidade = getAllDrugs().find((d) => d.molecula === MOLECULA)!;
    const zartHNoPharma = entidade.marcas.find((m) => m.nome === 'Zart H®');
    const zartHNoEurofarma = EUROFARMA_CATALOG.find((p) => p.nome_comercial === 'Zart H®');

    expect(zartHNoPharma).toBeDefined();
    expect(zartHNoEurofarma).toBeDefined();
    const concentracoesEurofarma = zartHNoEurofarma!.apresentacoes.map((a) => a.concentracao);
    expect(zartHNoPharma!.concentracoes).toEqual(concentracoesEurofarma);
  });

  it('a molécula do PHARMA_DB é textualmente idêntica à do catálogo Eurofarma (mesma DCB, sem divergência de nome entre fontes)', () => {
    const entidade = getAllDrugs().find((d) => d.molecula === MOLECULA)!;
    const euro = EUROFARMA_CATALOG.find((p) => p.molecula === MOLECULA);
    expect(euro).toBeDefined();
    expect(entidade.molecula).toBe(euro!.molecula);
  });
});

describe('RM-66 — lote piloto: cobertura de busca (etapa 7)', () => {
  it('busca por marca (Zart H) encontra a entidade', () => {
    const r = searchDrugs('zart h');
    expect(r.some((d) => d.molecula === MOLECULA)).toBe(true);
  });

  it('busca por nome genérico completo encontra a entidade', () => {
    const r = searchDrugs('losartana hidroclorotiazida');
    expect(r.some((d) => d.molecula === MOLECULA)).toBe(true);
  });

  it('busca pela marca do laboratório genérico (Medley) encontra a entidade', () => {
    const r = searchDrugs('losartana + hidroclorotiazida medley');
    expect(r.some((d) => d.molecula === MOLECULA)).toBe(true);
  });

  it('busca por "losartana" isolada retorna AMBAS as entidades reais (combinação e monoterapia) sem colapsar uma na outra', () => {
    const r = searchDrugs('losartana');
    const nomes = r.map((d) => d.molecula);
    expect(nomes).toContain(MOLECULA);
    expect(nomes).toContain('Losartana');
    // Comportamento proibido: a combinação e a monoterapia são produtos
    // farmacologicamente distintos (dose/contraindicações diferentes) —
    // nunca podem ser resolvidas como se fossem a mesma entidade.
    const combinacao = r.find((d) => d.molecula === MOLECULA);
    const monoterapia = r.find((d) => d.molecula === 'Losartana');
    expect(combinacao!.id).not.toBe(monoterapia!.id);
  });
});

describe('RM-66 — lote piloto: testes de dose (etapa 8)', () => {
  it('ajuste renal do próprio cadastro: TFG 30-60 → "cautela"; TFG < 30 → "evitar" (bula real, não fabricado)', () => {
    const entidade = getAllDrugs().find((d) => d.molecula === MOLECULA)!;
    expect(entidade.ajuste_renal).toBeDefined();

    const ajusteModerado = getAdjustmentForCrCl(entidade.ajuste_renal!, 45);
    expect(ajusteModerado.toLowerCase()).toContain('cautela');

    const ajusteGrave = getAdjustmentForCrCl(entidade.ajuste_renal!, 20);
    expect(ajusteGrave.toLowerCase()).toContain('evitar');
  });

  it('cadeia real: calcCrCl (paciente com função renal reduzida) → getAdjustmentForCrCl do medicamento real → resultado condizente', () => {
    const paciente: PatientParams = { idade: 72, sexo: 'F', peso: 58, creatinina: 2.1 };
    const crcl = calcCrCl(paciente);
    expect(crcl).not.toBeNull();
    expect(crcl!.crcl).toBeLessThan(45);

    const entidade = getAllDrugs().find((d) => d.molecula === MOLECULA)!;
    const ajuste = getAdjustmentForCrCl(entidade.ajuste_renal!, crcl!.crcl);
    expect(ajuste.length).toBeGreaterThan(0);
  });
});

describe('RM-66 — lote piloto: testes de segurança (etapa 9)', () => {
  it('resolvível via pharma-core/drugRepository (a mesma Single Source of Truth usada por runSafetyCheck) — prova que o cadastro chega à camada canônica, não fica isolado no PHARMA_DB bruto', () => {
    const resolvido = drugRepository.getAll().find(
      (e) => e.activeIngredient.name.toLowerCase() === MOLECULA.toLowerCase(),
    );
    expect(resolvido).toBeDefined();
  });

  it('runSafetyCheck com crclValue < 30 → alerta renal real "danger" (texto da bula real: "Evitar")', () => {
    const alertas = runSafetyCheck({ moleculas: [MOLECULA], crclValue: 20 });
    const alertaRenal = alertas.find((a) => a.tipo === 'renal');
    expect(alertaRenal).toBeDefined();
    expect(alertaRenal!.severidade).toBe('danger');
  });

  it('runSafetyCheck com gestante:true → contraindicação absoluta real (bula: "Gravidez" nas contraindicações)', () => {
    const alertas = runSafetyCheck({ moleculas: [MOLECULA], gestante: true });
    const alertaGestante = alertas.find((a) => a.tipo === 'gestante');
    expect(alertaGestante).toBeDefined();
    expect(alertaGestante!.severidade).toBe('critical');
  });

  it('runSafetyCheck com crclValue normal (> 60) e sem gestante → nenhum alerta renal/gestante fabricado', () => {
    const alertas = runSafetyCheck({ moleculas: [MOLECULA], crclValue: 80 });
    expect(alertas.some((a) => a.tipo === 'renal')).toBe(false);
    expect(alertas.some((a) => a.tipo === 'gestante')).toBe(false);
  });

  it('resolução por sinônimo (marca/variante de busca) funciona igual à resolução pela DCB completa', () => {
    const porDcb = runSafetyCheck({ moleculas: [MOLECULA], crclValue: 20 });
    const porSinonimo = runSafetyCheck({ moleculas: ['losartana + hidroclorotiazida'], crclValue: 20 });
    expect(porSinonimo.some((a) => a.tipo === 'renal')).toBe(true);
    expect(porSinonimo.length).toBe(porDcb.length);
  });
});

describe('RM-66 — lote piloto: jornada clínica relevante (etapa 10)', () => {
  it('jornada real: médico busca a combinação → avalia função renal do paciente → recebe ajuste de dose real → checagem de segurança condizente — ponta a ponta, sem simular nenhuma etapa', () => {
    // 1. Busca (o médico digita a marca que reconhece, não a DCB completa)
    const resultadoBusca = searchDrugs('zart h');
    expect(resultadoBusca.length).toBeGreaterThan(0);
    const medicamento = resultadoBusca.find((d) => d.molecula === MOLECULA)!;
    expect(medicamento).toBeDefined();

    // 2. Avaliação de função renal do paciente (idoso, creatinina elevada)
    const paciente: PatientParams = { idade: 78, sexo: 'M', peso: 70, creatinina: 2.8 };
    const crcl = calcCrCl(paciente);
    expect(crcl).not.toBeNull();

    // 3. Ajuste de dose real a partir do CrCl calculado
    const ajuste = getAdjustmentForCrCl(medicamento.ajuste_renal!, crcl!.crcl);
    expect(ajuste.toLowerCase()).toMatch(/evitar|cautela/);

    // 4. Checagem de segurança real, com o mesmo paciente (idoso + CrCl calculado)
    const alertas = runSafetyCheck({ moleculas: [medicamento.molecula], idoso: true, crclValue: crcl!.crcl });
    // Comportamento permitido: alerta renal presente (CrCl reduzido real).
    expect(alertas.some((a) => a.tipo === 'renal')).toBe(true);
    // Comportamento proibido: nenhuma "certeza" fabricada de segurança
    // quando a função renal real do paciente está comprometida.
    expect(alertas.every((a) => !a.descricao.toLowerCase().includes('seguro'))).toBe(true);
  });
});
