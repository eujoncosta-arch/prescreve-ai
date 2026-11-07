// ============================================================
// RM-107.1.1-A — TESTES DE CARACTERIZAÇÃO P-04 e P-06 (executados ANTES de qualquer alteração de código)
//
// Estes testes REGISTRAM o comportamento ATUAL. NÃO afirmam que ele seja correto ou seguro, e NÃO o corrigem:
// as correções (C-04, C-05) dependem das decisões D1/D2 (pendentes). Se o comportamento mudar no futuro, estes testes
// devem ser revistos conscientemente (não enfraquecidos) junto com a decisão aprovada.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAllDrugs, type QuickDrug } from '@/lib/pharma-database';
import { calcFullDose, calcWeightDose, type FullDoseInput, type FullDoseResult } from '@/lib/dose-calculator';
import { DoseCalcCard } from '@/components/modules/DoseCalcCard';

vi.mock('next/navigation', () => ({
  usePathname: () => '/prescricao-rapida',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => React.createElement('a', { href, ...rest }, children) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }, Toaster: () => null }));

import { AppProvider } from '@/lib/store';
import PrescricaoRapida from '@/app/prescricao-rapida/page';

const entrada = (d: QuickDrug): FullDoseInput => ({ molecula: d.molecula, dose_adulto: d.dose_adulto, dose_pediatrica: d.dose_pediatrica, ajuste_renal: d.ajuste_renal, ajuste_hepatico: d.ajuste_hepatico, alertas_especiais: d.alertas_especiais, uso_gestante: d.uso_gestante, uso_lactante: d.uso_lactante });
const conc = (d: QuickDrug) => d.marcas.flatMap(b => b.concentracoes)[0] ?? `${d.dose_adulto.habitual} ${d.dose_adulto.unidade}`;
const temCritico = (r: FullDoseResult) => r.alertas.some(a => a.startsWith('🚨'));

// Pediátrico (4 anos/15 kg), SEM regra pediátrica utilizável e frequência cadastrada em FAIXA reconhecida (confirmação manual possível)
const candidatos = getAllDrugs().filter(d => !d.dose_pediatrica).filter(d => {
  const r = calcFullDose(entrada(d), 4, 15, conc(d), undefined, '', false, false, 1.0);
  return r.frequencia_indeterminada && !!r.tomadas_faixa;
});

describe('P-04 — confirmação manual de frequência em paciente pediátrico SEM regra pediátrica (caracterização)', () => {
  it('existem medicamentos nessa situação no catálogo (premissa da caracterização)', () => {
    expect(candidatos.length).toBeGreaterThan(0);
  });

  it('há ao menos um caso em que a confirmação libera dose total > 0 pelo ramo adulto (confirmado)', () => {
    const liberados = candidatos.filter(d => parseFloat(d.dose_adulto.habitual) > 0);
    expect(liberados.length).toBeGreaterThan(0);
  });

  it('motor: sem confirmação ⇒ bloqueio 🚨 e dose total 0; com confirmação dentro da faixa ⇒ SEM 🚨 e dose total > 0 pelo ramo ADULTO', () => {
    for (const d of candidatos) {
      const sem = calcFullDose(entrada(d), 4, 15, conc(d), undefined, '', false, false, 1.0);
      expect(temCritico(sem), d.id).toBe(true); expect(sem.dose_total_dia, d.id).toBe(0); expect(sem.fonte).toBe('adulto_fixo');
      const n = sem.tomadas_faixa![0];
      const com = calcFullDose(entrada(d), 4, 15, conc(d), undefined, '', false, false, 1.0, n);
      expect(com.fonte, d.id).toBe('adulto_fixo');            // continua o ramo adulto
      expect(com.frequencia_indeterminada, d.id).toBe(false);
      expect(temCritico(com), d.id).toBe(false);               // o bloqueio some
      // a dose total passa a ser calculada SOMENTE quando o `habitual` do cadastro é numérico (parseFloat > 0); caso contrário permanece 0
      expect(com.dose_total_dia > 0, d.id).toBe(parseFloat(d.dose_adulto.habitual) > 0);
      expect(com.population.usar_dose_pediatrica, d.id).toBe(true);   // o paciente é classificado como pediátrico
    }
  });

  it('interface (DoseCalcCard): o botão "Aplicar" está desabilitado antes e HABILITADO depois da confirmação, e aplica a dose do ramo adulto', async () => {
    const d = candidatos.find(x => parseFloat(x.dose_adulto.habitual) > 0)!;
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(React.createElement(DoseCalcCard, { drug: entrada(d), concentracaoSelecionada: conc(d), idadeAnos: 4, pesoKg: 15, alturaM: 1.0, onApply }));
    const antes = screen.getByRole('button', { name: /Contraindicado — verifique alertas|Aplicar esta posologia/ });
    expect(antes).toBeDisabled();
    const confirmar = await screen.findAllByRole('button', { name: /^\d+x\/dia$/ });
    await user.click(confirmar[0]);
    const depois = await screen.findByRole('button', { name: /Aplicar esta posologia/ });
    expect(depois).toBeEnabled();
    await user.click(depois);
    expect(onApply).toHaveBeenCalledTimes(1);
    const aplicado = onApply.mock.calls[0][0] as FullDoseResult;
    expect(aplicado.fonte).toBe('adulto_fixo'); expect(aplicado.population.usar_dose_pediatrica).toBe(true); expect(aplicado.dose_total_dia).toBeGreaterThan(0);
  }, 30000);
});

describe('P-06 — cálculo pediátrico automático sem idade informada (caracterização da tela /prescricao-rapida)', () => {
  const paracetamol = getAllDrugs().find(d => d.id === 'paracetamol')!;

  async function selecionarParacetamolComPeso(peso: string | null, idade: string | null, unidade?: string) {
    const user = userEvent.setup();
    render(React.createElement(AppProvider, null, React.createElement(PrescricaoRapida)));
    if (peso !== null) await user.type(screen.getByPlaceholderText('kg'), peso);
    if (idade !== null) {
      await user.type(screen.getByTestId('idade-valor'), idade);
      if (unidade) { await user.click(screen.getByTestId('idade-unidade')); await user.click(await screen.findByRole('option', { name: unidade })); }
    }
    await user.type(screen.getByPlaceholderText(/Buscar molécula, marca, classe/i), 'Paracetamol');
    await user.click(await screen.findByText('Paracetamol', { selector: 'p' }));
    return user;
  }

  it('SEM peso e SEM idade: a dose padrão do campo é a dose ADULTA habitual do cadastro (P-05, observado)', async () => {
    await selecionarParacetamolComPeso(null, null);
    const campo = (await screen.findByPlaceholderText('dose')) as HTMLInputElement;
    expect(campo.value).toBe(paracetamol.dose_adulto.habitual);
  }, 30000);

  it('SÓ O PESO informado (sem idade): o cálculo pediátrico por kg É executado e preenche a dose (P-06 confirmado)', async () => {
    await selecionarParacetamolComPeso('15', null);
    const campo = (await screen.findByPlaceholderText('dose')) as HTMLInputElement;
    const p = paracetamol.dose_pediatrica!;
    const esperado = calcWeightDose(p.dose_por_kg, 15, p.frequencia_divisoes, p.max_dose_dia, p.unidade).dose_por_tomada;
    expect(campo.value).toBe(String(esperado));
    expect(campo.value).not.toBe(paracetamol.dose_adulto.habitual);
    // a idade não foi testada: o card de cálculo completo NÃO aparece (falta idade), o botão manual aparece
    expect(screen.queryByText('Prescrição Sugerida')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar à prescrição/i })).toBeEnabled();
  }, 30000);

  it('peso + idade SEM unidade (idade inválida, RM-105.2.2): equivale a idade ausente ⇒ o cálculo pediátrico por kg também é executado', async () => {
    await selecionarParacetamolComPeso('15', '4');
    const campo = (await screen.findByPlaceholderText('dose')) as HTMLInputElement;
    expect(campo.value).not.toBe(paracetamol.dose_adulto.habitual);
    expect(screen.queryByText('Prescrição Sugerida')).not.toBeInTheDocument();
  }, 30000);

  it('peso + idade ADULTA com unidade informados: o card de cálculo (ramo adulto) é exibido (a auto-dose pediátrica fica oculta no estado)', async () => {
    await selecionarParacetamolComPeso('70', '40', 'Anos');
    expect(await screen.findByText('Prescrição Sugerida')).toBeInTheDocument();
    const painel = screen.getByText('Prescrição Sugerida').closest('div.rounded-xl') as HTMLElement;
    // o paracetamol adulto tem frequência cadastrada em faixa ("4-6h"): o card existe, mas o botão fica bloqueado até confirmar a frequência
    expect(within(painel).getByRole('button', { name: /Contraindicado — verifique alertas|Aplicar esta posologia/ })).toBeDisabled();
  }, 30000);
});
