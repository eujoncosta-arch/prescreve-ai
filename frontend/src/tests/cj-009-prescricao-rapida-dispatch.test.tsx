// ============================================================
// CJ-009 — Prescrição Rápida nunca chama `dispatch` do store real
//
// Achado original: RM-64 (docs/RM-64-CLINICAL-JOURNEY-ACCEPTANCE.md, seção 5
// e 6) — confirmado por investigação de CÓDIGO (não por teste de componente)
// que `prescricao-rapida/page.tsx` opera inteiramente fora de
// `Consultation`/`Anamnesis`/`dispatch`: é intencional (uso rápido sem
// anamnese completa é o próprio requisito do cenário), mas significa que
// nenhuma prescrição emitida por esse caminho é persistida via o reducer
// real do app. A RM-64 declarou isso como "limitação de cobertura" — sem
// @testing-library/react no projeto, não dava para provar isso montando o
// componente de fato.
//
// Esta RM adiciona @testing-library/react (nova dependência de teste, sem
// impacto em runtime/produção) e monta `PrescricaoRapida` dentro do
// `AppProvider` real (mesmo reducer, mesmo Context — nada mockado da lógica
// de store), percorrendo o fluxo real de uso (buscar → selecionar
// medicamento → preencher dados do paciente incl. gestante/lactante →
// adicionar à prescrição → remover item → salvar favorito → gerar receita)
// e provando por instrumentação real (não por leitura de código) que o
// `dispatch` do `AppProvider` nunca é invocado em nenhum desses passos.
//
// Técnica de instrumentação: `vi.mock('react', ...)` envolve `useReducer`
// para interceptar SOMENTE a chamada cujo reducer é o `reducer` real
// exportado por `@/lib/store` (comparação por referência de função,
// importada do mesmo módulo usado pelo `AppProvider`) — nunca outras
// chamadas de `useReducer` que possam existir em bibliotecas de terceiros
// (Radix UI etc.), evitando falsos positivos.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reducer as appReducer } from '@/lib/store';

const dispatchSpy = vi.fn();

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useReducer: (...args: unknown[]) => {
      const [state, dispatch] = (actual.useReducer as (...a: unknown[]) => [unknown, (a: unknown) => void])(...args);
      if (args[0] !== appReducer) return [state, dispatch];
      const wrapped = (action: unknown) => { dispatchSpy(action); return dispatch(action); };
      return [state, wrapped];
    },
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/prescricao-rapida',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

// Importados DEPOIS dos mocks acima (hoisted pelo Vitest de qualquer forma,
// mas mantido nesta ordem por legibilidade do fluxo de dependências).
import { AppProvider } from '@/lib/store';
import PrescricaoRapida from '@/app/prescricao-rapida/page';

function renderPrescricaoRapida() {
  return render(
    React.createElement(AppProvider, null, React.createElement(PrescricaoRapida)),
  );
}

describe('CJ-009 — prescrição rápida opera inteiramente fora do dispatch real do store', () => {
  beforeEach(() => {
    dispatchSpy.mockClear();
    vi.spyOn(window, 'prompt').mockReturnValue('Protocolo de teste');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('monta o painel sem disparar nenhuma ação no reducer real', async () => {
    renderPrescricaoRapida();
    expect(screen.getByRole('heading', { name: 'Prescrição Rápida' })).toBeInTheDocument();
    // Aguarda os efeitos de montagem (favoritos do localStorage, busca vazia)
    // resolverem antes do teardown, evitando setState fora de act() no final.
    await Promise.resolve();
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  // Timeout maior (padrão é 5s) nos 3 testes abaixo: interação real via
  // user-event (digitação char-a-char, múltiplos cliques) sob a suíte
  // completa rodando em paralelo (contenção de CPU) pode facilmente
  // ultrapassar 5s sem indicar problema real no teste — mesma folga já
  // usada nesta suíte para outros testes sensíveis a contenção (ex.:
  // text-integrity-rm49.test.ts).

  it('buscar → selecionar medicamento → adicionar à prescrição → remover item — nenhum dispatch', async () => {
    const user = userEvent.setup();
    renderPrescricaoRapida();

    const busca = screen.getByPlaceholderText(/Buscar molécula, marca, classe/i);
    await user.type(busca, 'Losartana');

    const resultado = await screen.findByText('Losartana');
    await user.click(resultado);

    const addBtn = await screen.findByRole('button', { name: /adicionar à prescrição/i });
    await user.click(addBtn);

    // Item adicionado com sucesso (prova de que o fluxo real avançou, não
    // que travou antes de qualquer chance de disparar dispatch).
    expect(await screen.findByText('Losartana', { selector: 'p' })).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash2'));
    expect(removeButtons.length).toBeGreaterThan(0);
    await user.click(removeButtons[removeButtons.length - 1]);

    expect(dispatchSpy).not.toHaveBeenCalled();
  }, 15000);

  it('preencher dados do paciente (incl. gestante/lactante) — nenhum dispatch', async () => {
    const user = userEvent.setup();
    renderPrescricaoRapida();

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Paciente Teste CJ-009');
    await user.type(screen.getByPlaceholderText('anos'), '68');
    await user.type(screen.getByPlaceholderText('kg'), '70');
    await user.type(screen.getByPlaceholderText('0.0'), '1.4');

    const switches = screen.getAllByRole('switch');
    for (const sw of switches) {
      await user.click(sw);
    }

    expect(dispatchSpy).not.toHaveBeenCalled();
  }, 15000);

  it('salvar favorito e gerar receita (modal de impressão) — nenhum dispatch', async () => {
    const user = userEvent.setup();
    renderPrescricaoRapida();

    const busca = screen.getByPlaceholderText(/Buscar molécula, marca, classe/i);
    await user.type(busca, 'Losartana');
    const resultado = await screen.findByText('Losartana');
    await user.click(resultado);
    const addBtn = await screen.findByRole('button', { name: /adicionar à prescrição/i });
    await user.click(addBtn);

    const salvarBtn = await screen.findByRole('button', { name: /salvar protocolo/i });
    await user.click(salvarBtn);

    const gerarBtns = screen.getAllByRole('button', { name: /gerar receita/i });
    await user.click(gerarBtns[0]);
    expect(await screen.findByText('Pré-visualização da Receita')).toBeInTheDocument();

    const modalHeading = screen.getByText('Pré-visualização da Receita');
    const modal = modalHeading.closest('div.fixed') as HTMLElement;
    await user.click(within(modal).getByRole('button', { name: '' }));

    expect(dispatchSpy).not.toHaveBeenCalled();
  }, 15000);
});
