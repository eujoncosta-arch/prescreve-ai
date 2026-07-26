import { describe, it, expect } from 'vitest';
import { runSafetyCheck } from '@/lib/safety-rules';

// ============================================================
// RM-36 — Auditoria exaustiva de CRITICAL_PAIRS
//
// Cobertura obrigatória: TODO par de CRITICAL_PAIRS tem pelo menos um teste
// comportamental isolado (não apenas "a função existe"). Complementado por
// testes de regressão para os bugs reais encontrados nesta auditoria:
//   - CRIT-AUDIT-01: lítio (nome canônico acentuado) nunca batia com o
//     token 'litio' — o par mais perigoso da lista nunca disparava.
//   - CRIT-AUDIT-02: 'nitrato' não aparece em molecula/classe dos nitratos
//     reais, só em sinonimos (nunca consultado) — os 3 pares nitrato+iPDE5
//     nunca disparavam para uma prescrição real.
//   - CRIT-AUDIT-03: quando o banco de dados já emitia um alerta mais fraco
//     (severidade 'danger') para o mesmo par, o alerta crítico mais grave
//     era descartado em vez de substituir o mais fraco.
// ============================================================

describe('runSafetyCheck() — cobertura isolada de TODOS os 22 pares de CRITICAL_PAIRS', () => {
  const pares: Array<{ id: string; moleculas: string[]; tituloSubstr: string; severidade: string }> = [
    { id: 'ieca+aine', moleculas: ['ieca', 'aine'], tituloSubstr: 'IECA + AINE', severidade: 'danger' },
    { id: 'bra+aine', moleculas: ['bra', 'aine'], tituloSubstr: 'BRA + AINE', severidade: 'danger' },
    { id: 'ieca+espironolactona', moleculas: ['ieca', 'espironolactona'], tituloSubstr: 'IECA + Espironolactona', severidade: 'warning' },
    { id: 'azitromicina+amiodarona (tokens)', moleculas: ['azitromicina', 'amiodarona'], tituloSubstr: 'Amiodarona', severidade: 'critical' },
    { id: 'azitromicina+haloperidol', moleculas: ['azitromicina', 'haloperidol'], tituloSubstr: 'Azitromicina + Haloperidol', severidade: 'danger' },
    { id: 'hidroxicloroquina+azitromicina', moleculas: ['hidroxicloroquina', 'azitromicina'], tituloSubstr: 'Hidroxicloroquina + Azitromicina', severidade: 'danger' },
    // CRIT-AUDIT-05: o literal 'isrs' é, ele mesmo, um sinônimo cadastrado
    // de Sertralina no banco (`resolveSafeDrug('isrs')` resolve para
    // Sertralina) — então este input SEMPRE identifica um membro
    // específico da classe, nunca "só a classe" de forma pura. Pela regra
    // de dedup semântica (alerta mais específico com mesma/maior
    // severidade prevalece), o alerta correto e esperado é o específico
    // da Sertralina, não o genérico "ISRS + Tramadol" — a cobertura do
    // par GENÉRICO puro (sem membro específico próprio) é feita à parte,
    // com Paroxetina, em crit-audit-05-isrs-classe-dedup.test.ts.
    { id: 'isrs+tramadol', moleculas: ['isrs', 'tramadol'], tituloSubstr: 'Sertralina + Tramadol', severidade: 'danger' },
    { id: 'sertralina+tramadol', moleculas: ['sertralina', 'tramadol'], tituloSubstr: 'Sertralina + Tramadol', severidade: 'danger' },
    { id: 'escitalopram+tramadol', moleculas: ['escitalopram', 'tramadol'], tituloSubstr: 'Escitalopram + Tramadol', severidade: 'danger' },
    { id: 'metformina+contraste', moleculas: ['metformina', 'contraste'], tituloSubstr: 'Metformina + Contraste', severidade: 'warning' },
    { id: 'litio+hidroclorotiazida (tokens)', moleculas: ['litio', 'hidroclorotiazida'], tituloSubstr: 'Lítio + Hidroclorotiazida', severidade: 'critical' },
    { id: 'varfarina+aine', moleculas: ['varfarina', 'aine'], tituloSubstr: 'Varfarina + AINE', severidade: 'critical' },
    { id: 'prednisolona+aine', moleculas: ['prednisolona', 'aine'], tituloSubstr: 'Corticoide + AINE', severidade: 'warning' },
    { id: 'moxifloxacino+amiodarona (tokens)', moleculas: ['moxifloxacino', 'amiodarona'], tituloSubstr: 'Amiodarona', severidade: 'critical' },
    { id: 'ieca+bra', moleculas: ['ieca', 'bra'], tituloSubstr: 'IECA + BRA', severidade: 'critical' },
    { id: 'imao+isrs', moleculas: ['imao', 'isrs'], tituloSubstr: 'IMAO + ISRS', severidade: 'critical' },
    { id: 'fenelzina+sertralina', moleculas: ['fenelzina', 'sertralina'], tituloSubstr: 'IMAO + Sertralina', severidade: 'critical' },
    { id: 'fenelzina+fluoxetina', moleculas: ['fenelzina', 'fluoxetina'], tituloSubstr: 'IMAO + Fluoxetina', severidade: 'critical' },
    { id: 'nitrato+tadalafila (tokens)', moleculas: ['nitrato', 'tadalafila'], tituloSubstr: 'Nitrato + Tadalafila', severidade: 'critical' },
    { id: 'nitrato+sildenafila (tokens)', moleculas: ['nitrato', 'sildenafila'], tituloSubstr: 'Nitrato + Sildenafila', severidade: 'critical' },
    { id: 'nitrato+vardenafila (tokens)', moleculas: ['nitrato', 'vardenafila'], tituloSubstr: 'Nitrato + Vardenafila', severidade: 'critical' },
    { id: 'sacubitril+ieca', moleculas: ['sacubitril', 'ieca'], tituloSubstr: 'Angioedema fatal', severidade: 'critical' },
  ];

  it.each(pares)('$id — dispara isoladamente com a severidade correta', ({ moleculas, tituloSubstr, severidade }) => {
    const alerts = runSafetyCheck({ moleculas });
    const alerta = alerts.find((a) => a.titulo.includes(tituloSubstr));
    expect(alerta, `esperava um alerta contendo "${tituloSubstr}" para ${moleculas.join('+')}`).toBeDefined();
    expect(alerta?.severidade).toBe(severidade);
  });

  it('a ordem dos medicamentos não importa (simetria) — ieca+bra dispara igual em qualquer ordem', () => {
    const ordemA = runSafetyCheck({ moleculas: ['ieca', 'bra'] });
    const ordemB = runSafetyCheck({ moleculas: ['bra', 'ieca'] });
    const acharDuploBloqueio = (alerts: typeof ordemA) => alerts.find((a) => a.titulo.includes('Duplo bloqueio SRAA'));
    expect(acharDuploBloqueio(ordemA)).toBeDefined();
    expect(acharDuploBloqueio(ordemB)).toBeDefined();
  });

  it('adicionar um medicamento não crítico não remove um alerta crítico já detectado', () => {
    const semExtra = runSafetyCheck({ moleculas: ['ieca', 'bra'] });
    const comExtra = runSafetyCheck({ moleculas: ['ieca', 'bra', 'metformina'] });
    expect(semExtra.find((a) => a.titulo.includes('Duplo bloqueio SRAA'))).toBeDefined();
    expect(comExtra.find((a) => a.titulo.includes('Duplo bloqueio SRAA'))).toBeDefined();
  });
});

describe('runSafetyCheck() — regressão CRIT-AUDIT-01: lítio (acento) nunca disparava para nome canônico real', () => {
  it('Carbonato de Lítio + Hidroclorotiazida (nomes reais, com acento) dispara o alerta crítico de toxicidade por lítio', () => {
    const alerts = runSafetyCheck({ moleculas: ['Carbonato de Lítio', 'Hidroclorotiazida'] });
    const alerta = alerts.find((a) => a.titulo.includes('Lítio + Hidroclorotiazida'));
    expect(alerta, 'o par lítio+hidroclorotiazida deve disparar com nomes canônicos reais, não só com tokens sem acento').toBeDefined();
    expect(alerta?.severidade).toBe('critical');
  });
});

describe('runSafetyCheck() — regressão CRIT-AUDIT-02: pares de nitrato nunca disparavam para moléculas reais', () => {
  it('Nitroglicerina (nome real) + Tadalafila dispara o alerta crítico de hipotensão fatal', () => {
    const alerts = runSafetyCheck({ moleculas: ['Nitroglicerina', 'Tadalafila'] });
    const alerta = alerts.find((a) => a.titulo.includes('Nitrato + Tadalafila'));
    expect(alerta, 'nitroglicerina tem "nitrato" apenas em sinonimos — precisa ser consultado').toBeDefined();
    expect(alerta?.severidade).toBe('critical');
  });

  it('Isossorbida Mononitrato (nome real) + Tadalafila também dispara — "mononitrato" não deve ser tratado como coincidência de substring não intencional', () => {
    const alerts = runSafetyCheck({ moleculas: ['Isossorbida Mononitrato', 'Tadalafila'] });
    const alerta = alerts.find((a) => a.titulo.includes('Nitrato + Tadalafila'));
    expect(alerta).toBeDefined();
    expect(alerta?.severidade).toBe('critical');
  });
});

describe('runSafetyCheck() — regressão CRIT-AUDIT-03: alerta crítico substitui alerta mais fraco do banco de dados, nunca é descartado por ele', () => {
  it('Azitromicina + Amiodarona (nomes reais): o alerta CRÍTICO de QT aparece, o alerta genérico "danger" do banco não permanece como duplicata mais fraca', () => {
    const alerts = runSafetyCheck({ moleculas: ['Azitromicina', 'Amiodarona'] });
    const alertaCritico = alerts.find((a) => a.titulo.includes('Azitromicina + Amiodarona') && a.severidade === 'critical');
    const alertasQTAmiodarona = alerts.filter((a) => a.titulo.toLowerCase().includes('azitromicina') && a.titulo.toLowerCase().includes('amiodarona'));

    expect(alertaCritico, 'o alerta crítico específico (CRITICAL_PAIRS) deve estar presente, não apenas o genérico do banco').toBeDefined();
    // Não deve haver DUAS entradas cobrindo o mesmo par — a mais fraca deve
    // ter sido substituída, não deve coexistir com a mais grave.
    expect(alertasQTAmiodarona.length).toBe(1);
    expect(alertasQTAmiodarona[0].severidade).toBe('critical');
  });

  it('Moxifloxacino + Amiodarona (nomes reais): mesmo comportamento — crítico substitui o alerta mais fraco, sem duplicata', () => {
    const alerts = runSafetyCheck({ moleculas: ['Moxifloxacino', 'Amiodarona'] });
    const alertasQT = alerts.filter((a) => a.titulo.toLowerCase().includes('moxifloxacino') && a.titulo.toLowerCase().includes('amiodarona'));
    expect(alertasQT.length).toBe(1);
    expect(alertasQT[0].severidade).toBe('critical');
  });
});

describe('runSafetyCheck() — CRITICAL_PAIRS não suprime pares críticos não relacionados', () => {
  it('IECA+Espironolactona (warning) seguido de IECA+BRA (critical) — ambos os alertas aparecem, sem supressão cruzada pela mol_a compartilhada', () => {
    const alerts = runSafetyCheck({
      moleculas: ['ieca', 'espironolactona', 'bra'],
    });

    const alertaHipercalemia = alerts.find((a) => a.titulo.includes('Espironolactona'));
    const alertaDuploBloqueio = alerts.find((a) => a.titulo.includes('Duplo bloqueio SRAA'));

    expect(alertaHipercalemia).toBeDefined();
    expect(alertaHipercalemia?.severidade).toBe('warning');

    // Regressão do bug real: antes da correção, o alerta crítico de duplo
    // bloqueio SRAA (IECA+BRA) era silenciosamente suprimido porque um
    // alerta anterior (IECA+Espironolactona) já continha "ieca" no título,
    // e a checagem de duplicata comparava apenas mol_a, não o par completo.
    expect(alertaDuploBloqueio).toBeDefined();
    expect(alertaDuploBloqueio?.severidade).toBe('critical');
  });

  it('ARNI (Sacubitril) + IECA — angioedema fatal — não é suprimido mesmo com outro alerta ieca+X já presente', () => {
    const alerts = runSafetyCheck({
      moleculas: ['ieca', 'aine', 'sacubitril'],
    });

    const alertaNefrotoxico = alerts.find((a) => a.titulo.includes('AINE'));
    const alertaAngioedema = alerts.find((a) => a.titulo.includes('Angioedema fatal'));

    expect(alertaNefrotoxico).toBeDefined();
    expect(alertaAngioedema).toBeDefined();
    expect(alertaAngioedema?.severidade).toBe('critical');
  });

  it('mesmo par nunca é duplicado (dedup real, não apenas ausência de supressão cruzada)', () => {
    const alerts = runSafetyCheck({
      moleculas: ['ieca', 'bra'],
    });
    const paresDuploBloqueio = alerts.filter((a) => a.titulo.includes('Duplo bloqueio SRAA'));
    expect(paresDuploBloqueio.length).toBe(1);
  });
});
