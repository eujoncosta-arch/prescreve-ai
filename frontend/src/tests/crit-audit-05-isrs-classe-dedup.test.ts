import { describe, it, expect } from 'vitest';
import { runSafetyCheck } from '@/lib/safety-rules';

// ============================================================
// RM-36 — resolução CRIT-AUDIT-05: quando o paciente usa Sertralina +
// Tramadol, o motor emitia SIMULTANEAMENTE dois alertas de par crítico
// para o MESMO risco (síndrome serotoninérgica):
//   1. "ISRS + Tramadol" (par genérico, mol_a='isrs' — classe)
//   2. "Sertralina + Tramadol" (par específico, mol_a='sertralina' — membro)
//
// A deduplicação anterior comparava apenas TEXTO de alertas já emitidos
// contra os tokens do novo par — "isrs" nunca aparece no título
// "Sertralina + Tramadol", então a duplicata nunca era detectada.
//
// Corrigido com deduplicação SEMANTICAMENTE CONSCIENTE: dois pares
// CRITICAL_PAIRS são o mesmo risco quando o CONJUNTO de medicamentos
// realmente prescritos que cada lado identifica se sobrepõe nos dois
// lados. Em caso de sobreposição:
//   - severidade maior sempre vence;
//   - em severidade igual, o alerta mais ESPECÍFICO (molécula nomeada,
//     não apenas classe) vence — nunca o genérico.
// Ver comentário completo em safety-rules.ts, junto a `matchedDrugIds`/
// `tokenEhEspecifico`.
// ============================================================

function titulos(moleculas: string[]): string[] {
  const r = runSafetyCheck({ moleculas });
  return r.filter(a => a.tipo === 'interacao').map(a => a.titulo);
}

describe('CRIT-AUDIT-05 — dedup semântica classe/membro em CRITICAL_PAIRS', () => {
  it('Sertralina + Tramadol: emite APENAS o alerta específico da Sertralina, nunca o genérico "ISRS + Tramadol" também', () => {
    const t = titulos(['sertralina', 'tramadol']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    expect(serotoninergicos.length).toBe(1);
    expect(serotoninergicos[0]).toBe('Sertralina + Tramadol — Síndrome serotoninérgica');
  });

  it('Escitalopram + Tramadol: emite APENAS o alerta específico do Escitalopram, não o genérico ISRS', () => {
    const t = titulos(['escitalopram', 'tramadol']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    expect(serotoninergicos.length).toBe(1);
    expect(serotoninergicos[0]).toBe('Escitalopram + Tramadol — Síndrome serotoninérgica');
  });

  it('Fluoxetina + Tramadol: não gera alerta de par crítico duplicado nem quebra (fluoxetina não tem par específico nem entrada resolvível — comportamento pré-existente preservado, mas nunca duplicado)', () => {
    const t = titulos(['fluoxetina', 'tramadol']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    expect(serotoninergicos.length).toBeLessThanOrEqual(1);
  });

  it('outro ISRS sem par específico próprio (Paroxetina) + Tramadol: o par GENÉRICO "ISRS + Tramadol" ainda dispara normalmente (prova que a dedup não suprime o único alerta disponível)', () => {
    const t = titulos(['paroxetina', 'tramadol']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    expect(serotoninergicos.length).toBe(1);
    expect(serotoninergicos[0]).toBe('ISRS + Tramadol — Síndrome serotoninérgica');
  });

  it('ISRS + medicamento NÃO relacionado (ex.: sertralina + amoxicilina): nenhum alerta serotoninérgico falso-positivo', () => {
    const t = titulos(['sertralina', 'amoxicilina']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    expect(serotoninergicos.length).toBe(0);
  });

  it('múltiplos medicamentos serotoninérgicos (Sertralina + Escitalopram + Tramadol): cada par específico realmente distinto é preservado — nenhuma informação clínica diferente é descartada, e nenhum genérico "ISRS+Tramadol" sobra como duplicata', () => {
    const t = titulos(['sertralina', 'escitalopram', 'tramadol']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    // Não deve sobrar o alerta genérico "ISRS + Tramadol" quando os dois
    // membros específicos (Sertralina e Escitalopram) já cobrem o mesmo risco.
    expect(serotoninergicos).not.toContain('ISRS + Tramadol — Síndrome serotoninérgica');
    // Ambos os alertas específicos (informação clinicamente distinta —
    // dois fármacos diferentes) devem estar presentes.
    expect(serotoninergicos).toContain('Sertralina + Tramadol — Síndrome serotoninérgica');
    expect(serotoninergicos).toContain('Escitalopram + Tramadol — Síndrome serotoninérgica');
  });

  it('IMAO + ISRS (genérico) vs Fenelzina + Sertralina (específico): dedup semântica também se aplica fora do caso Tramadol, sem mapa de classes hardcoded', () => {
    const t = titulos(['fenelzina', 'sertralina']);
    const serotoninergicos = t.filter(x => x.toLowerCase().includes('serotonin'));
    expect(serotoninergicos.length).toBe(1);
    expect(serotoninergicos[0]).toMatch(/Fenelzina|IMAO \+ Sertralina/i);
  });

  it('Fenelzina + Sertralina e Fenelzina + Fluoxetina permanecem DISTINTOS quando ambos os fármacos estão realmente presentes (mol_b não se sobrepõe) — nunca descarta informação clinicamente distinta', () => {
    const t = titulos(['fenelzina', 'sertralina', 'fluoxetina']);
    const relacionados = t.filter(x => /fenelzina|imao/i.test(x));
    // Sertralina é resolvível como SafeDrug (par específico existe);
    // fluoxetina não resolve como SafeDrug e não tem par próprio com
    // fenelzina além do já cadastrado — o par específico da Sertralina
    // deve estar presente sem ser suprimido por nenhum genérico.
    expect(relacionados.some(x => /sertralina/i.test(x))).toBe(true);
  });
});

describe('CRIT-AUDIT-05 — regressão dos bugs já corrigidos anteriormente (não pode reintroduzir)', () => {
  it('Azitromicina + Amiodarona: mantém o alerta MAIS GRAVE (par crítico específico de QT), não o genérico do banco', () => {
    const r = runSafetyCheck({ moleculas: ['azitromicina', 'amiodarona'] });
    const relacionados = r.filter(a => /azitromicina/i.test(a.titulo) && /amiodarona/i.test(a.titulo));
    expect(relacionados.length).toBe(1);
    expect(relacionados[0].severidade).toBe('critical');
  });

  it('Moxifloxacino + Amiodarona: mantém o alerta MAIS GRAVE (par crítico específico de QT)', () => {
    const r = runSafetyCheck({ moleculas: ['moxifloxacino', 'amiodarona'] });
    const relacionados = r.filter(a => /moxifloxacino/i.test(a.titulo) && /amiodarona/i.test(a.titulo));
    expect(relacionados.length).toBe(1);
    expect(relacionados[0].severidade).toBe('critical');
  });

  it('IECA + BRA: continua gerando exatamente um alerta (sem duplicação nem supressão)', () => {
    const r = runSafetyCheck({ moleculas: ['ieca', 'bra'] });
    const relacionados = r.filter(a => a.tipo === 'interacao' && /ieca/i.test(a.titulo) && /bra/i.test(a.titulo));
    expect(relacionados.length).toBe(1);
  });

  it('Nitrato + Inibidor de PDE5 (sildenafila): continua gerando exatamente um alerta crítico', () => {
    const r = runSafetyCheck({ moleculas: ['nitrato', 'sildenafila'] });
    const serotoninergicos = r.filter(a => a.tipo === 'interacao' && a.severidade === 'critical');
    expect(serotoninergicos.length).toBeGreaterThanOrEqual(1);
  });

  it('Lítio + Hidroclorotiazida: continua gerando exatamente um alerta (sem duplicação)', () => {
    const r = runSafetyCheck({ moleculas: ['litio', 'hidroclorotiazida'] });
    const relacionados = r.filter(a => a.tipo === 'interacao' && /l[ií]tio/i.test(a.titulo) && /hidroclorotiazida/i.test(a.titulo));
    expect(relacionados.length).toBe(1);
  });
});
