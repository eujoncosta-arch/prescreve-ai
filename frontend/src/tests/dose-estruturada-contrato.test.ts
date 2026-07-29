import { describe, it, expect } from 'vitest';
import { mapFrequenciaParaContrato, mapUnidadeParaContrato } from '@/lib/dose-calculator';

// ============================================================
// RM-36 — resolução da fragilidade do contrato backend de dose
// (backend/src/modules/consulta/dto/consulta.dto.ts): `dose` era texto
// livre, aceitando "500 mg", "500 mL", "20 gotas", "500 mg/kg/dia" ou
// qualquer string arbitrária sem validação semântica, permitindo
// persistir uma dose semanticamente inválida.
//
// O novo contrato estruturado (DoseEstruturadaDto no backend,
// DoseEstruturada em frontend/src/lib/types.ts) exige valor/unidade/
// frequência/via tipados. Estes testes cobrem os mapeadores do lado do
// FRONTEND que traduzem o texto livre ainda produzido pelo motor de
// recomendação terapêutica (`DrugDose`) para o contrato — provando que
// eles NUNCA adivinham quando a tradução é ambígua.
// ============================================================

describe('mapUnidadeParaContrato() — nunca adivinha uma unidade ambígua', () => {
  it('unidades simples e inequívocas são mapeadas corretamente', () => {
    expect(mapUnidadeParaContrato('mg')).toBe('mg');
    expect(mapUnidadeParaContrato('mL')).toBe('mL');
    expect(mapUnidadeParaContrato('ml')).toBe('mL');
    expect(mapUnidadeParaContrato('UI')).toBe('UI');
    expect(mapUnidadeParaContrato('gotas')).toBe('gotas');
    expect(mapUnidadeParaContrato('comprimidos')).toBe('comprimido');
    expect(mapUnidadeParaContrato('cápsulas')).toBe('capsula');
  });

  it('strings compostas descrevendo um REGIME (ex.: "mg/kg/dia", "mcg/kg/min") retornam null — nunca decompostas automaticamente', () => {
    expect(mapUnidadeParaContrato('mg/kg/dia')).toBeNull();
    expect(mapUnidadeParaContrato('mcg/kg/min')).toBeNull();
    expect(mapUnidadeParaContrato('UI/kg')).toBeNull();
    expect(mapUnidadeParaContrato('mg (dose fixa)')).toBeNull();
  });

  it('texto completamente desconhecido retorna null', () => {
    expect(mapUnidadeParaContrato('xyz')).toBeNull();
    expect(mapUnidadeParaContrato('')).toBeNull();
  });
});

describe('mapFrequenciaParaContrato() — traduz texto livre para o enum do contrato, nunca inventa', () => {
  it('frequências fixas simples (1x/2x/3x/4x por dia) são mapeadas diretamente', () => {
    expect(mapFrequenciaParaContrato('1x/dia')).toEqual({ frequencia: '1x/dia' });
    expect(mapFrequenciaParaContrato('2x/dia')).toEqual({ frequencia: '2x/dia' });
    expect(mapFrequenciaParaContrato('3x/dia')).toEqual({ frequencia: '3x/dia' });
    expect(mapFrequenciaParaContrato('4x/dia')).toEqual({ frequencia: '4x/dia' });
  });

  it('intervalos em horas conhecidos (4/6/8/12h) são mapeados para a_cada_Nh', () => {
    expect(mapFrequenciaParaContrato('4/4h')).toEqual({ frequencia: 'a_cada_4h' });
    expect(mapFrequenciaParaContrato('6/6h')).toEqual({ frequencia: 'a_cada_6h' });
    expect(mapFrequenciaParaContrato('8/8h')).toEqual({ frequencia: 'a_cada_8h' });
    expect(mapFrequenciaParaContrato('12/12h')).toEqual({ frequencia: 'a_cada_12h' });
  });

  it('dose única mapeia para dose_unica', () => {
    expect(mapFrequenciaParaContrato('Dose única')).toEqual({ frequencia: 'dose_unica' });
  });

  it('uso contínuo mapeia para uso_continuo', () => {
    expect(mapFrequenciaParaContrato('Infusão contínua')).toEqual({ frequencia: 'uso_continuo' });
  });

  it('PRN/SOS mapeia para sos', () => {
    expect(mapFrequenciaParaContrato('SOS')).toEqual({ frequencia: 'sos' });
  });

  it('periodicidade não diária (semanal/mensal) mapeia para nao_diaria COM o texto original preservado em frequencia_detalhe', () => {
    const r = mapFrequenciaParaContrato('1x/semana');
    expect(r.frequencia).toBe('nao_diaria');
    expect(r.frequencia_detalhe).toBe('1x/semana');
  });

  it('frequência ambígua/variável ("3-4x/dia") NUNCA escolhe um lado silenciosamente — mapeia para outro com o texto original preservado', () => {
    const r = mapFrequenciaParaContrato('3-4x/dia');
    expect(r.frequencia).toBe('outro');
    expect(r.frequencia_detalhe).toBe('3-4x/dia');
  });

  it('texto não reconhecido mapeia para outro, preservando o texto original — nunca descartado', () => {
    const r = mapFrequenciaParaContrato('esquema individualizado pelo médico assistente');
    expect(r.frequencia).toBe('outro');
    expect(r.frequencia_detalhe).toBe('esquema individualizado pelo médico assistente');
  });

  it('intervalo em horas não usual (ex.: 5/5h) mapeia para outro com detalhe — nunca arredondado silenciosamente para um dos valores fixos', () => {
    const r = mapFrequenciaParaContrato('5/5h');
    expect(r.frequencia).toBe('outro');
    expect(r.frequencia_detalhe).toBe('5/5h');
  });

  it('frequência fixa fora do conjunto 1-4x/dia (ex.: 6x/dia) mapeia para outro com detalhe', () => {
    const r = mapFrequenciaParaContrato('6x/dia');
    expect(r.frequencia).toBe('outro');
    expect(r.frequencia_detalhe).toBe('6x/dia');
  });
});
