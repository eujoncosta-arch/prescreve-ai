// ============================================================
// RM-105.2.1 — Impressão padrão só da receita, transparência de alergias, contexto de idade e recuperação
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runSafetyCheck } from '@/lib/safety-rules';
import { derivarIdoso, avaliarCoberturaContextual, LIMITACAO_IDADE_PEDIATRICA } from '@/lib/safety-context';
import { classifyPopulation } from '@/lib/dose-calculator';
import { describeAlergias, describeSafetyCoverage } from '@/lib/safety-coverage';
import { anexoComoTexto, montarAnexoTecnico } from '@/lib/safety-annex';
import { ROTULO_IDENTIFICACAO_ALERGENO, transparenciaAlergias } from '@/lib/safety-allergy';
import { PrescriptionPrintPreview } from '@/components/modules/PrescriptionPrintPreview';
import { AlergiasNotice } from '@/components/modules/AlergiasNotice';

vi.mock('next/navigation', () => ({
  usePathname: () => '/prescricao-rapida',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => React.createElement('a', { href, ...rest }, children),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }, Toaster: () => null }));

import { AppProvider } from '@/lib/store';
import PrescricaoRapida from '@/app/prescricao-rapida/page';

const CTX = { gestante: false, lactante: false, idade: { valor: 40, unidade: 'anos' as const }, sexo: 'F' as const, crclValue: 90 };
const QUANDO = '2026-11-07T10:00:00.000Z';
const PACIENTE = { nome: 'Maria Teste', idade: '45', diagnostico: 'HAS' };
const ITEM = { id: '1', molecula: 'Varfarina', nome_comercial: 'Marevan', concentracao: '5 mg', forma_farmaceutica: 'Comprimido', dose: '5 mg', via: 'VO', frequencia: '1x/dia', duracao: '30 dias', instrucoes: '', uso_continuo: true };
const MEDICO = { nome: 'Dra. Teste', crm: '12345', especialidade: 'Clínica Médica' };

function alergia(substancia: string, tipo: 'medicamento' | 'alimento' | 'ambiental' | 'outro' = 'medicamento', extra: Record<string, unknown> = {}) {
  return { status: 'informadas' as const, registros: [{ substancia, tipo, ...extra }] };
}
const resultado = (moleculas: string[], ids: Array<string | undefined>, alergias?: ReturnType<typeof alergia> | { status: 'nao_informado' | 'sem_alergias_conhecidas' }) =>
  runSafetyCheck({ moleculas, entidade_ids: ids, ...CTX, ...(alergias ? { alergias } : {}) });

// ─── 1. Impressão: padrão só da receita; anexo só por ação explícita ───

describe('RM-105.2.1 — impressão padrão somente da receita; anexo por ação explícita', () => {
  const rico = resultado(['varfarina', 'ibuprofeno'], ['varfarina', 'ibuprofeno'], alergia('ibuprofeno'));
  let imprimir: ReturnType<typeof vi.spyOn>;
  let capturas: Array<{ modo: string | undefined; anexoNoDom: boolean; receitaNoDom: boolean }>;

  beforeEach(() => {
    capturas = [];
    imprimir = vi.spyOn(window, 'print').mockImplementation(() => {
      const raiz = document.getElementById('print-root')!;
      capturas.push({ modo: raiz.dataset.printMode, anexoNoDom: !!document.querySelector('[data-print-part="anexo"]'), receitaNoDom: !!document.querySelector('[data-print-part="receita"]') });
    });
  });
  afterEach(() => { imprimir.mockRestore(); });

  function montar() {
    return render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={rico} avaliadoEm={QUANDO} />);
  }

  it('por padrão NÃO há anexo no documento e o modo de impressão é "receita"', () => {
    montar();
    expect(document.querySelector('[data-print-part="anexo"]')).toBeNull();
    expect(document.getElementById('print-root')!.dataset.printMode).toBe('receita');
  });

  it('não existe mais a caixa "incluir anexo na impressão" (nenhum checkbox): incluir exige comando explícito', () => {
    montar();
    expect(document.querySelectorAll('#print-root input[type="checkbox"]')).toHaveLength(0);
  });

  it('há comandos independentes e rotulados: imprimir receita, ver anexo, imprimir anexo', () => {
    montar();
    expect(screen.getByTestId('print-receita').textContent).toContain('Imprimir receita do paciente');
    expect(screen.getByTestId('toggle-annex').textContent).toContain('Ver anexo técnico do prescritor');
    expect(screen.getByTestId('print-anexo').textContent).toContain('uso exclusivo do prescritor');
  });

  it('"Imprimir receita do paciente": no momento da impressão só a receita existe, em modo receita', () => {
    montar();
    fireEvent.click(screen.getByTestId('print-receita'));
    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(capturas[0]).toEqual({ modo: 'receita', anexoNoDom: false, receitaNoDom: true });
  });

  it('"Imprimir anexo técnico": no momento da impressão o modo é "anexo" e o anexo está no documento', () => {
    montar();
    fireEvent.click(screen.getByTestId('print-anexo'));
    expect(imprimir).toHaveBeenCalledTimes(1);
    expect(capturas[0]).toMatchObject({ modo: 'anexo', anexoNoDom: true });
  });

  it('depois de imprimir o anexo (afterprint) o modo volta a "receita": o próximo comando padrão não imprime o anexo', () => {
    montar();
    fireEvent.click(screen.getByTestId('print-anexo'));
    act(() => { window.dispatchEvent(new Event('afterprint')); });
    expect(document.getElementById('print-root')!.dataset.printMode).toBe('receita');
    fireEvent.click(screen.getByTestId('print-receita'));
    expect(capturas[1].modo).toBe('receita');
  });

  it('anexo aberto na tela + "imprimir receita": o modo é receita (o CSS impede o anexo no papel)', () => {
    montar();
    fireEvent.click(screen.getByTestId('toggle-annex'));
    expect(document.querySelector('[data-print-part="anexo"]')).not.toBeNull();
    fireEvent.click(screen.getByTestId('print-receita'));
    expect(capturas[0].modo).toBe('receita');
    const css = fs.readFileSync(path.resolve(__dirname, '../app/globals.css'), 'utf8');
    expect(css).toMatch(/\[data-print-mode="receita"\]\s*\[data-print-part="anexo"\]\s*\{\s*display:\s*none\s*!important/);
  });

  it('a receita não contém nenhum termo técnico, com o anexo fechado ou aberto', () => {
    montar();
    const termos = ['ANEXO', 'cobertura', 'Alerta', 'Alergia', 'alergia', 'RM-105', 'parcial', 'não verificad', 'NÃO', 'identificad', 'Avaliação'];
    const receita = () => document.querySelector('[data-print-part="receita"]')!.textContent ?? '';
    for (const t of termos) expect(receita(), t).not.toContain(t);
    fireEvent.click(screen.getByTestId('toggle-annex'));
    for (const t of termos) expect(receita(), t).not.toContain(t);
  });

  it('o aviso de tela e os comandos ficam fora da receita e do anexo (print:hidden)', () => {
    render(<PrescriptionPrintPreview patient={PACIENTE} items={[ITEM]} medico={MEDICO} onClose={() => {}} safetyResult={rico} avaliadoEm={QUANDO} avisoSeguranca="aviso" />);
    fireEvent.click(screen.getByTestId('toggle-annex'));
    for (const id of ['print-safety-warning', 'print-receita', 'toggle-annex', 'print-anexo']) {
      const el = screen.getByTestId(id);
      expect(el.closest('.print\\:hidden'), id).not.toBeNull();
      expect(document.querySelector('[data-print-part="receita"]')!.contains(el), id).toBe(false);
      expect(document.querySelector('[data-print-part="anexo"]')!.contains(el), id).toBe(false);
    }
  });
});

// ─── 2. Transparência de alergias ───

describe('RM-105.2.1 — transparência de alergias (tela e anexo, mesma fonte de texto)', () => {
  it('alérgeno identificado molecularmente é distinguido do não identificado', () => {
    const ident = resultado(['paracetamol'], ['paracetamol'], alergia('ibuprofeno'));
    const naoIdent = resultado(['paracetamol'], ['paracetamol'], alergia('substancia_xyz'));
    const t1 = anexoComoTexto(montarAnexoTecnico(ident, QUANDO));
    const t2 = anexoComoTexto(montarAnexoTecnico(naoIdent, QUANDO));
    expect(t1).toContain(ROTULO_IDENTIFICACAO_ALERGENO.confirmada);
    expect(t2).toContain(ROTULO_IDENTIFICACAO_ALERGENO.desconhecida);
    expect(t2).not.toContain(ROTULO_IDENTIFICACAO_ALERGENO.confirmada);
  });

  it('alergia a CLASSE: informação relevante AINDA NÃO avaliada molecularmente (sem alerta, sem regra de reatividade)', () => {
    const r = resultado(['ibuprofeno'], ['ibuprofeno'], alergia('aine'));
    expect(r.avaliacao_alergias.registros[0].identificacao_molecular).toBe('classe_farmacologica');
    expect(r.alertas.some(a => a.tipo === 'alergia')).toBe(false);
    expect(r.avaliacao_alergias.estado).toBe('parcial');
    expect(r.avaliacao_integral).toBe(false);
    const anexo = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(anexo).toContain('alergia a CLASSE farmacológica — informação relevante AINDA NÃO avaliada molecularmente');
    expect(anexo).toContain('NÃO avaliada(s) molecularmente: aine');
    expect(anexo).toMatch(/a ausência de alerta de alergia não indica ausência de risco/i);
    const tela = describeAlergias(r, 1);
    expect(tela.tone).toBe('warning');
    expect(tela.linhas.join(' ')).toContain('AINDA NÃO avaliada molecularmente');
  });

  it('alergia NÃO medicamentosa: explicitamente fora do escopo do cruzamento molecular atual, com aviso sobre excipientes', () => {
    const r = resultado(['amoxicilina'], ['amoxicilina'], alergia('amendoim', 'alimento'));
    const anexo = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(anexo).toContain('alergia NÃO medicamentosa — fora do escopo do cruzamento molecular atual; excipientes não são avaliados');
    expect(anexo).toContain('a avaliação de excipientes não é realizada');
    const tela = describeAlergias(r, 1);
    expect(tela.tone).toBe('warning');
    expect(tela.linhas.join(' ')).toContain('fora do cruzamento molecular atual');
  });

  it('aviso de excipientes só aparece quando pertinente (há alergia não medicamentosa)', () => {
    const sem = anexoComoTexto(montarAnexoTecnico(resultado(['paracetamol'], ['paracetamol'], alergia('ibuprofeno')), QUANDO));
    expect(sem).not.toContain('a avaliação de excipientes não é realizada');
    expect(transparenciaAlergias(resultado(['paracetamol'], ['paracetamol'], alergia('ibuprofeno')).avaliacao_alergias)).toEqual([]);
  });

  it('ausência de avaliação nunca é apresentada como ausência de risco (não informado, classe, desconhecida, inválida)', () => {
    const cenarios = [
      resultado(['paracetamol'], ['paracetamol']),
      resultado(['paracetamol'], ['paracetamol'], { status: 'nao_informado' }),
      resultado(['paracetamol'], ['paracetamol'], alergia('aine')),
      resultado(['paracetamol'], ['paracetamol'], alergia('xyz')),
      resultado(['paracetamol'], ['paracetamol'], alergia('')),
    ];
    for (const r of cenarios) {
      const v = describeAlergias(r, 1);
      expect(v.visivel).toBe(true);
      expect(['warning', 'danger']).toContain(v.tone);
      expect(r.avaliacao_integral).toBe(false);
      expect(describeSafetyCoverage(r, 1).mostrarSeloNegativo && r.avaliacao_alergias.estado !== 'avaliada').toBe(false);
    }
  });

  it('"sem alergias conhecidas" é apresentado como declaração, não como verificação', () => {
    const r = resultado(['paracetamol'], ['paracetamol'], { status: 'sem_alergias_conhecidas' });
    const v = describeAlergias(r, 1);
    expect(v.titulo).toContain('declaração');
    expect(v.linhas.join(' ')).toContain('não foi verificada de forma independente');
  });

  it('a gravidade dos alertas de alergia NÃO foi alterada (aprovação clínica pendente)', () => {
    const r = resultado(['ibuprofeno'], ['ibuprofeno'], alergia('ibuprofeno'));
    expect(r.alertas.find(a => a.tipo === 'alergia')!.severidade).toBe('critical');
  });

  it('o componente da tela exibe o estado e as ressalvas; some sem medicamentos', () => {
    const r = resultado(['ibuprofeno'], ['ibuprofeno'], alergia('aine'));
    const { container, rerender } = render(<AlergiasNotice result={r} itensNaReceita={1} />);
    const el = within(container).getByTestId('alergias-notice');
    expect(el.getAttribute('data-alergias-estado')).toBe('parcial');
    expect(el.textContent).toContain('AINDA NÃO avaliada molecularmente');
    rerender(<AlergiasNotice result={r} itensNaReceita={0} />);
    expect(container.querySelector('[data-testid="alergias-notice"]')).toBeNull();
  });
});

// ─── 3. Avaliação parcial e ausência de falsa avaliação integral ───

describe('RM-105.2.1 — avaliação parcial e ausência de falsa avaliação integral', () => {
  it('anexo de avaliação parcial: situação, não identificados, combinações, sem afirmar ausência de risco', () => {
    const r = runSafetyCheck({ moleculas: ['varfarina', 'xyz_1', 'xyz_2', 'ieca'], entidade_ids: ['varfarina', undefined, undefined, undefined], ...CTX, alergias: { status: 'sem_alergias_conhecidas' } });
    expect(r.status).toBe('parcial');
    expect(r.avaliacao_integral).toBe(false);
    const t = anexoComoTexto(montarAnexoTecnico(r, QUANDO));
    expect(t).toContain('Avaliação realizada com cobertura parcial');
    expect(t).toContain('xyz_1 — não reconhecido');
    expect(t).toContain('xyz_2 — não reconhecido');
    expect(t).toContain('ieca — termo de classe/indicação/sintoma');
    expect(t).toContain('Existem combinações não avaliadas');
    expect(t).toContain('Avaliação integral: NÃO realizada');
  });

  it('integral só com tudo avaliado; nenhum dos cenários incompletos a declara', () => {
    const completo = resultado(['paracetamol'], ['paracetamol'], { status: 'sem_alergias_conhecidas' });
    expect(completo.avaliacao_integral).toBe(true);
    const incompletos = [
      resultado(['paracetamol'], ['paracetamol']),
      resultado(['paracetamol', 'xyz'], ['paracetamol', undefined], { status: 'sem_alergias_conhecidas' }),
      runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX, idade: undefined, idade_anos: undefined, alergias: { status: 'sem_alergias_conhecidas' } }),
      runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX, alergias: alergia('aine') }),
      runSafetyCheck({ moleculas: null as never }),
    ];
    for (const r of incompletos) expect(r.avaliacao_integral).toBe(false);
  });
});

// ─── 4. Idade ───

describe('RM-105.2.1 — contexto de idade (dias, meses e anos, conforme o suporte atual)', () => {
  const estadoIdade = (idade: unknown) => avaliarCoberturaContextual({ idade: { valor: idade, unidade: 'anos' } }, { usaARM: false }).itens.find(i => i.campo === 'idade_idoso')!.estado;
  const limit = (idade: unknown) => avaliarCoberturaContextual({ idade: { valor: idade, unidade: 'anos' } }, { usaARM: false }).limitacoes;

  it('RM-105.2.2: propriedades soltas idade_dias/idade_meses NÃO são interpretadas (a forma correta é idade: { valor, unidade })', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], idade_dias: 10, idade_meses: 6 } as never);
    expect(r.cobertura_contextual.itens.find(i => i.campo === 'idade_idoso')!.estado).toBe('nao_informado');
  });

  it('anos: adulto, idoso e limiar de 65 anos', () => {
    expect(derivarIdoso({ idade_anos: 30 })).toBe(false);
    expect(derivarIdoso({ idade_anos: 64.9 })).toBe(false);
    expect(derivarIdoso({ idade_anos: 65 })).toBe(true);
    expect(derivarIdoso({ idade_anos: 90 })).toBe(true);
    expect(estadoIdade(30)).toBe('informado');
    expect(limit(30)).toEqual([]);
  });

  it('meses (como fração de ano): aceito, mas com a limitação de precisão pediátrica declarada', () => {
    for (const meses of [1, 6, 18]) {
      const anos = meses / 12;
      expect(estadoIdade(anos), 'meses=' + meses).toBe('informado');
      expect(limit(anos), 'meses=' + meses).toEqual([LIMITACAO_IDADE_PEDIATRICA]);
      expect(derivarIdoso({ idade_anos: anos })).toBe(false);
    }
  });

  it('dias (como fração de ano): aceito, mas com a limitação declarada; não é estratificação neonatal', () => {
    for (const dias of [1, 10, 27, 28, 29]) {
      const anos = dias / 365;
      expect(estadoIdade(anos), 'dias=' + dias).toBe('informado');
      expect(limit(anos), 'dias=' + dias).toEqual([LIMITACAO_IDADE_PEDIATRICA]);
    }
  });

  it('0 anos (recém-nascido/menor de 1 ano) é VÁLIDO com limitação — não mais inválido; idade negativa e > 120 seguem inválidas', () => {
    expect(estadoIdade(0)).toBe('informado');
    expect(limit(0)).toEqual([LIMITACAO_IDADE_PEDIATRICA]);
    expect(derivarIdoso({ idade_anos: 0 })).toBe(false);
    for (const x of [-1, 121, 700, NaN, 'dez']) expect(estadoIdade(x), String(x)).toBe('invalido');
  });

  it('crianças e adolescentes: limitação pediátrica declarada; adultos não a recebem', () => {
    for (const a of [2, 5, 11, 17]) expect(limit(a), String(a)).toEqual([LIMITACAO_IDADE_PEDIATRICA]);
    for (const a of [18, 40, 70]) expect(limit(a), String(a)).toEqual([]);
  });

  it('a limitação aparece no resultado, na tela (verificação completa) e no anexo', () => {
    const r = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], ...CTX, idade: { valor: 0.05, unidade: 'anos' }, alergias: { status: 'sem_alergias_conhecidas' } });
    expect(r.cobertura_contextual.limitacoes).toEqual([LIMITACAO_IDADE_PEDIATRICA]);
    expect(describeSafetyCoverage(r, 1).detalhes.join(' ')).toContain('Faixa etária pediátrica/neonatal sem estratificação específica');
    expect(anexoComoTexto(montarAnexoTecnico(r, QUANDO))).toContain('Faixa etária pediátrica/neonatal sem estratificação específica');
    expect(r.avaliacao_integral).toBe(true); // a limitação NÃO é pendência; ela é declarada (nada foi estratificado)
  });

  it('a regra geriátrica existente continua sendo a única que usa a idade (nenhuma regra nova foi criada)', () => {
    const jovem = runSafetyCheck({ moleculas: ['paracetamol'], entidade_ids: ['paracetamol'], idade: { valor: 0.02, unidade: 'anos' } });
    expect(jovem.alertas.every(a => a.tipo !== 'geriatria')).toBe(true);
  });

  it('o cálculo de dose usa corte neonatal de 28 dias (28/365 ano), representação distinta da verificação de segurança', () => {
    expect(classifyPopulation(27 / 365).population).toBe('neonato');
    expect(classifyPopulation(28 / 365).population).toBe('lactente');
    expect(classifyPopulation(0).population).toBe('neonato');
    // a verificação de segurança NÃO usa essa estratificação (documentado como limitação):
    expect(avaliarCoberturaContextual({ idade: { valor: 27, unidade: 'dias' } }, { usaARM: false }).limitacoes).toEqual([LIMITACAO_IDADE_PEDIATRICA]);
  });
});

// ─── 5. Persistência e recuperação de protocolo antigo ───

describe('RM-105.2.1 — persistência e recuperação de protocolo antigo', () => {
  const CHAVE = 'prescreve-ai-favoritos';
  const itemAntigo = (molecula: string) => ({ id: 'x' + molecula, molecula, nome_comercial: molecula, laboratorio: '', concentracao: '', forma_farmaceutica: 'Comprimido', dose: '1 mg', via: 'VO', frequencia: '1x/dia', duracao: '30 dias', instrucoes: '', uso_continuo: false, tipo_receita: 'simples' });

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'prompt').mockReturnValue('Protocolo de teste');
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  function montarPagina() {
    return render(React.createElement(AppProvider, null, React.createElement(PrescricaoRapida)));
  }

  it('o protocolo salvo guarda SOMENTE itens (com entidade_id): nada de alergias, contexto ou avaliação', async () => {
    const user = userEvent.setup();
    montarPagina();
    await user.type(screen.getByPlaceholderText(/Buscar molécula, marca, classe/i), 'Losartana');
    await user.click(await screen.findByText('Losartana'));
    await user.click(await screen.findByRole('button', { name: /adicionar à prescrição/i }));
    await user.click(await screen.findByRole('button', { name: /salvar protocolo/i }));
    const salvo = JSON.parse(localStorage.getItem(CHAVE)!);
    expect(salvo).toHaveLength(1);
    expect(Object.keys(salvo[0]).sort()).toEqual(['criado_em', 'descricao', 'id', 'itens', 'nome']);
    expect(salvo[0].itens[0].entidade_id).toBe('losartana');
    const bruto = JSON.stringify(salvo);
    for (const termo of ['alergia', 'gestante', 'lactante', 'avaliacao', 'safety', 'rastreio', 'cobertura']) expect(bruto.toLowerCase(), termo).not.toContain(termo);
  }, 20000);

  it('protocolo ANTIGO sem entidade_id é recuperado: itens preservados, identidade não confirmada, aviso visível, sem avaliação herdada', async () => {
    localStorage.setItem(CHAVE, JSON.stringify([{ id: 'old', nome: 'Antigo', descricao: '', criado_em: '2026-01-10T10:00:00.000Z', itens: [itemAntigo('Midazolam'), itemAntigo('Sertralina')] }]));
    const user = userEvent.setup();
    montarPagina();
    await user.click(await screen.findByRole('tab', { name: /favoritos/i }));
    await user.click(await screen.findByRole('button', { name: /carregar/i }));
    // aviso de recuperação (aba Prescrição)
    const aviso = await screen.findByTestId('protocolo-recuperado');
    expect(aviso.textContent).toContain('Apenas os itens da prescrição fazem parte do protocolo');
    expect(aviso.textContent).toContain('Alergias, gestação, lactação, idade, função renal e a avaliação de segurança NÃO são recuperados');
    expect(aviso.textContent).toContain('2 item(ns) sem identificação de entidade');
    // a avaliação é refeita agora: parcial (Midazolam ambíguo), alergias NÃO informadas, nada integral
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    const cobertura = await screen.findByTestId('safety-coverage');
    expect(cobertura.getAttribute('data-coverage-status')).toBe('parcial');
    expect(cobertura.textContent).toContain('sem ID de entidade');
    const alerg = await screen.findByTestId('alergias-notice');
    expect(alerg.getAttribute('data-alergias-estado')).toBe('nao_informado');
    expect(alerg.textContent).toContain('não indica ausência de risco');
  }, 20000);

  it('o aviso de recuperação pode ser dispensado e some com "Limpar tudo"', async () => {
    localStorage.setItem(CHAVE, JSON.stringify([{ id: 'old', nome: 'Antigo', descricao: '', criado_em: '2026-01-10T10:00:00.000Z', itens: [itemAntigo('Sertralina')] }]));
    const user = userEvent.setup();
    montarPagina();
    await user.click(await screen.findByRole('tab', { name: /favoritos/i }));
    await user.click(await screen.findByRole('button', { name: /carregar/i }));
    await user.click(await screen.findByRole('button', { name: /dispensar aviso/i }));
    expect(screen.queryByTestId('protocolo-recuperado')).toBeNull();
  }, 20000);

  it('recarregar outro protocolo não herda a avaliação anterior: o resultado é recalculado a partir dos itens atuais', async () => {
    localStorage.setItem(CHAVE, JSON.stringify([
      { id: 'a', nome: 'A', descricao: '', criado_em: '2026-01-10T10:00:00.000Z', itens: [{ ...itemAntigo('Varfarina'), entidade_id: 'varfarina' }, { ...itemAntigo('Ibuprofeno'), entidade_id: 'ibuprofeno' }] },
      { id: 'b', nome: 'B', descricao: '', criado_em: '2026-01-11T10:00:00.000Z', itens: [{ ...itemAntigo('Paracetamol'), entidade_id: 'paracetamol' }] },
    ]));
    const user = userEvent.setup();
    montarPagina();
    await user.click(await screen.findByRole('tab', { name: /favoritos/i }));
    const carregar = await screen.findAllByRole('button', { name: /carregar/i });
    await user.click(carregar[0]);
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    expect((await screen.findAllByText(/Varfarina \+ AINE/)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: /favoritos/i }));
    await user.click((await screen.findAllByRole('button', { name: /carregar/i }))[1]);
    await user.click(screen.getByRole('tab', { name: /segurança/i }));
    expect(screen.queryByText(/Varfarina \+ AINE/)).toBeNull();
  }, 30000);

  it('a tela documenta o que não é persistido (código-fonte): protocolo guarda apenas `itens`', () => {
    const pagina = fs.readFileSync(path.resolve(__dirname, '../app/prescricao-rapida/page.tsx'), 'utf8');
    expect(pagina).toContain('itens: rxItems,');
    expect(pagina).not.toMatch(/localStorage\.setItem\([^)]*patient/);
    expect(pagina).toContain('setProtocoloRecuperado');
  });
});
