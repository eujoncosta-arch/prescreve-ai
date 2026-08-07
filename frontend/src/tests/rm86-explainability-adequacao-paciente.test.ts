// ============================================================
// RM-86 — o componente "Adequação ao Paciente" do Explainability Score
// (explainable-ai-v2.ts) usava `(med as unknown as Record<string,
// unknown>).trust_score`, mas `TherapeuticSuggestion` (types.ts) NUNCA
// definiu esse campo — o valor caía SEMPRE no fallback `?? 70`, para toda
// sugestão, sempre, rotulado como "Trust Score do motor de evidência"
// (texto que sugere um valor calculado por paciente). Achado da varredura
// RM-85 (confiança média), confirmado e corrigido aqui: substituído pela
// prioridade clínica real já calculada por paciente (RM-26,
// `TherapeuticSuggestion.prioridade`) — sinal real, não uma constante.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getTherapeuticForCondition } from '@/lib/clinical-therapeutics';
import { gerarExplainableAIv2 } from '@/lib/explainable-ai-v2';

describe('calcularExplainabilityScore() — "Adequação ao Paciente" reflete prioridade real, não uma constante fixa (RM-86)', () => {
  it('o componente nunca mais é fixo em 70 — varia conforme a prioridade clínica real da sugestão', () => {
    const plano = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    const preferencial = plano.farmacologico.find(s => s.prioridade?.tier === 'preferencial');
    const primeiraLinha = plano.farmacologico.find(s => s.prioridade?.tier === 'primeira_linha');
    expect(primeiraLinha).toBeDefined();

    const resultadoPrimeiraLinha = gerarExplainableAIv2(primeiraLinha!, 'I10');
    const cAdequacaoPrimeiraLinha = resultadoPrimeiraLinha.explainability_score.componentes.find(c => c.nome === 'Adequação ao Paciente')!;
    expect(cAdequacaoPrimeiraLinha.valor).not.toBe(70); // nunca mais a constante fixa antiga
    expect(cAdequacaoPrimeiraLinha.valor).toBe(75); // primeira_linha

    if (preferencial) {
      const resultadoPreferencial = gerarExplainableAIv2(preferencial, 'I10');
      const cAdequacaoPreferencial = resultadoPreferencial.explainability_score.componentes.find(c => c.nome === 'Adequação ao Paciente')!;
      expect(cAdequacaoPreferencial.valor).toBe(100);
      // Duas sugestões com prioridades REAIS diferentes → componentes diferentes (prova de que não é mais uma constante).
      expect(cAdequacaoPreferencial.valor).not.toBe(cAdequacaoPrimeiraLinha.valor);
    }
  });

  it('a descrição cita a prioridade clínica real (motivo do RM-26), nunca mais "Trust Score do motor de evidência"', () => {
    const plano = getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!;
    const sugestao = plano.farmacologico.find(s => s.prioridade)!;
    const resultado = gerarExplainableAIv2(sugestao, 'I10');
    const cAdequacao = resultado.explainability_score.componentes.find(c => c.nome === 'Adequação ao Paciente')!;
    expect(cAdequacao.descricao).not.toMatch(/Trust Score do motor de evidência/);
    expect(cAdequacao.descricao).toMatch(/Prioridade clínica/);
  });

  it('sugestão sem prioridade classificada: score neutro (65), descrição honesta sobre a ausência — nunca finge um valor calculado', () => {
    const semPrioridade = { ...getTherapeuticForCondition('has', 'HAS (I10)', { tfg: 90 })!.farmacologico[0], prioridade: undefined };
    const resultado = gerarExplainableAIv2(semPrioridade, 'I10');
    const cAdequacao = resultado.explainability_score.componentes.find(c => c.nome === 'Adequação ao Paciente')!;
    expect(cAdequacao.valor).toBe(65);
    expect(cAdequacao.descricao).toMatch(/não classificada/);
  });
});
